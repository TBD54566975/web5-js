import type { DwnServiceEndpoint } from '@tbd54566975/dids';
import {
  Web5Agent,
  SendDwnRequest,
  ProcessDwnRequest,
  ProcessDwnResponse,
  JsonRpcErrorCodes,
  DwnRpcRequest,
  DwnRpcResponse,
  DwnRpc
} from '@tbd54566975/web5-agent';

import type {
  SignatureInput,
  PrivateJwk as DwnPrivateKeyJwk,
  MessagesGetReply,
  RecordsWriteMessage
} from '@tbd54566975/dwn-sdk-js';

import type { ProfileManager } from './profile-manager.js';

import { DidResolver, DidIonApi, DidKeyApi, utils as didUtils } from '@tbd54566975/dids';
import {
  Dwn,
  EventsGet,
  RecordsRead,
  MessagesGet,
  RecordsWrite,
  RecordsQuery,
  RecordsDelete,
  DwnMethodName,
  ProtocolsQuery,
  DwnInterfaceName,
  ProtocolsConfigure,
  Encoder,
} from '@tbd54566975/dwn-sdk-js';

import { ProfileApi } from './profile-api.js';
import { DwnRpcClient } from './dwn-rpc-client.js';

// TODO: allow user to provide optional array of DwnRpc implementations once DwnRpc has been moved out of this package
export type Web5UserAgentOptions = {
  dwn: Dwn;
  profileManager: ProfileManager;
  didResolver: DidResolver;
};

const dwnMessageCreators = {
  [DwnInterfaceName.Events + DwnMethodName.Get]          : EventsGet,
  [DwnInterfaceName.Messages + DwnMethodName.Get]        : MessagesGet,
  [DwnInterfaceName.Records + DwnMethodName.Read]        : RecordsRead,
  [DwnInterfaceName.Records + DwnMethodName.Query]       : RecordsQuery,
  [DwnInterfaceName.Records + DwnMethodName.Write]       : RecordsWrite,
  [DwnInterfaceName.Records + DwnMethodName.Delete]      : RecordsDelete,
  [DwnInterfaceName.Protocols + DwnMethodName.Query]     : ProtocolsQuery,
  [DwnInterfaceName.Protocols + DwnMethodName.Configure] : ProtocolsConfigure,
};

const sendRetryCodes = new Set([JsonRpcErrorCodes.InternalError, JsonRpcErrorCodes.TransportError]);

export class Web5UserAgent implements Web5Agent {
  private dwn: Dwn;
  private profileManager: ProfileManager;
  private didResolver: DidResolver;
  private dwnRpcClient: DwnRpc;

  constructor(options: Web5UserAgentOptions) {
    this.dwn = options.dwn;
    this.didResolver = options.didResolver;
    this.profileManager = options.profileManager;

    this.dwnRpcClient = new DwnRpcClient();
  }

  /**
   * TODO: add jsdoc
   * @param options
   * @returns
   */
  static async create(options: Partial<Web5UserAgentOptions>) {
    options.dwn ||= await Dwn.create();
    options.profileManager ||= new ProfileApi();
    options.didResolver ||= new DidResolver({ methodResolvers: [new DidIonApi(), new DidKeyApi()] });

    return new Web5UserAgent(options as Web5UserAgentOptions);
  }

  /**
   * TODO: add jsdoc
   * @param message
   * @returns
   */
  async processDwnRequest(request: ProcessDwnRequest): Promise<ProcessDwnResponse> {
    const dwnMessage = await this.#constructDwnMessage(request);

    const reply = await this.dwn.processMessage(request.target, dwnMessage.toJSON(), request.dataStream as any);

    return {
      reply,
      message: dwnMessage.toJSON()
    };
  }

  async sendDwnRequest(request: ProcessDwnRequest): Promise<any> {
    const dwnMessage = await this.#constructDwnMessage(request);
    const dwnRpcRequest: Partial<DwnRpcRequest> = {
      targetDid : request.target,
      message   : dwnMessage
    };

    const didResolution = await this.didResolver.resolve(request.target);

    if (!didResolution.didDocument) {
      if (didResolution.didResolutionMetadata?.error) {
        throw new Error(`DID resolution error: ${didResolution.didResolutionMetadata.error}`);

      } else {
        throw new Error('DID resolution error: figure out error message');
      }
    }

    const { didDocument } = didResolution;

    const [ service ] = didUtils.getServices(didDocument, { id: '#dwn' });

    if (!service) {
      throw new Error(`${request.target} has no dwn service endpoints`);
    }

    const { serviceEndpoint } = service;
    if (!serviceEndpoint['nodes']) {
      throw new Error('malformed dwn service endpoint. expected nodes array');
    }

    const { nodes } = serviceEndpoint as DwnServiceEndpoint;
    let lastDwnRpcResponse: DwnRpcResponse;

    // try sending to author's publicly addressable dwn's until first request succeeds.
    for (let node of nodes) {
      dwnRpcRequest.dwnUrl = node;
      lastDwnRpcResponse = await this.dwnRpcClient.sendDwnRequest(dwnRpcRequest as DwnRpcRequest);

      if (lastDwnRpcResponse.error) {
        const { error } = lastDwnRpcResponse;
        if (sendRetryCodes.has(error.code)) {
          continue;
        } else {
          break;
        }
      }
    }

    // TODO: (Moe -> Frank): Chat with frank about what to return
    return lastDwnRpcResponse;
  }

  async #constructDwnMessage(request) {
    const dwnSignatureInput = await this.#getAuthorSignatureInput(request.author);

    // TODO: if we ever find time, figure out how to narrow this type. may have figured something out in `web5.DidInterface`
    const messageCreateInput = {
      ...<any>request.messageOptions,
      authorizationSignatureInput: dwnSignatureInput
    };

    const messageCreator = dwnMessageCreators[request.messageType];
    const dwnMessage = await messageCreator.create(messageCreateInput as any);

    return dwnMessage;
  }

  /**
   * constructs signature input required to sign DWeb Messages
   * @param authorDid
   * @returns {SignatureInput}
   */
  async #getAuthorSignatureInput(authorDid: string): Promise<SignatureInput> {
    const profile = await this.profileManager.getProfile(authorDid);

    if (!profile) {
      throw new Error('profile not found for author.');
    }

    const { keys } = profile.did;
    const [ key ] = keys;
    const { privateKeyJwk } = key;

    // TODO: make far less naive
    const kidFragment = privateKeyJwk.kid || key.id;
    const kid = `${profile.did.id}#${kidFragment}`;

    const dwnSignatureInput: SignatureInput = {
      privateJwk      : <DwnPrivateKeyJwk>privateKeyJwk,
      protectedHeader : { alg: privateKeyJwk.crv, kid }
    };

    return dwnSignatureInput;
  }
}