import type { DwnServiceEndpoint } from '@tbd54566975/dids';
import type { Web5Agent, SendDwnRequest, ProcessDwnRequest, ProcessDwnResponse } from '@tbd54566975/web5-agent';
import type {
  SignatureInput,
  PrivateJwk as DwnPrivateKeyJwk,
  MessagesGetReply,
  RecordsWriteMessage
} from '@tbd54566975/dwn-sdk-js';

import type { DwnRpcRequest, DwnRpc } from './dwn-rpc-client.js';
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

  static async create(options: Partial<Web5UserAgentOptions>) {
    options.dwn ||= await Dwn.create();
    options.profileManager ||= new ProfileApi();
    options.didResolver ||= new DidResolver({ methodResolvers: [new DidIonApi(), new DidKeyApi()] });

    return new Web5UserAgent(options as Web5UserAgentOptions);
  }

  async processDwnRequest(message: ProcessDwnRequest): Promise<ProcessDwnResponse> {

    const dwnSignatureInput = await this.#getAuthorSignatureInput(message.author);

    // TODO: if we ever find time, figure out how to narrow this type. may have figured something out in `web5.DidInterface`
    const messageCreateInput = {
      ...<any>message.messageOptions,
      authorizationSignatureInput: dwnSignatureInput
    };

    const messageCreator = dwnMessageCreators[message.messageType];
    const dwnMessage = await messageCreator.create(messageCreateInput as any);

    const reply = await this.dwn.processMessage(message.target, dwnMessage.toJSON(), message.dataStream);

    return {
      reply,
      message: dwnMessage.toJSON()
    };
  }

  async sendDwnRequest(request: SendDwnRequest): Promise<any> {
    const dwnSignatureInput = await this.#getAuthorSignatureInput(request.author);
    const messagesGet = await MessagesGet.create({
      authorizationSignatureInput : dwnSignatureInput,
      messageCids                 : [request.messageCid]
    });

    const result: MessagesGetReply = await this.dwn.processMessage(request.author, messagesGet.toJSON());
    const [ messageEntry ] = result.messages;

    if (!messageEntry) {
      throw new Error('TODO: figure out error message');
    }

    const { messageType } = request;
    let { message } = messageEntry;

    if (!message) {
      throw new Error('TODO: message not found');
    }

    const dwnRpcRequest: Partial<DwnRpcRequest> = {
      targetDid: request.author,
      message
    };
    // if the message is a RecordsWrite, either data will be present, OR we have to fetch it using a RecordsRead
    if (messageType === 'RecordsWrite') {
      const { encodedData } = messageEntry;
      message = message as RecordsWriteMessage;

      if (encodedData) {
        const dataBytes = Encoder.base64UrlToBytes(encodedData);
        dwnRpcRequest.data = new Blob([dataBytes]);
      } else {
        const recordsRead = await RecordsRead.create({
          authorizationSignatureInput : dwnSignatureInput,
          recordId                    : message['recordId']
        });

        // TODO: set reply type to RecordsReadReply once it is exported from dwn-sdk-js
        const reply = await this.dwn.processMessage(request.author, recordsRead.toJSON());
        dwnRpcRequest.data = reply.data;
      }
    }

    const { didDocument } = await this.didResolver.resolve(request.author);
    if (!didDocument) {
      throw new Error('TODO: figure out error message <Did Resolution failure>');
    }

    // TODO: is it true that there would only be 1 service that matches id '#dwn'?
    const [ service ] = didUtils.getServices(didDocument, { id: '#dwn' });

    if (!service) {
      // TODO: return silently or throw error?
      throw new Error(`${request.author} has no dwn service endpoints`);
    }

    const { serviceEndpoint } = service;
    if (!serviceEndpoint['nodes']) {
      throw new Error('malformed dwn service endpoint. expected nodes array');
    }

    const { nodes } = serviceEndpoint as DwnServiceEndpoint;

    // try sending to author's publicly addressable dwn's until first request succeeds.
    for (let node of nodes) {
      dwnRpcRequest.dwnUrl = node;
      // TODO: check for presence of error in dwnResponse.jsonRpcResponse. no point in blindly trying other nodes
      //       if request is malformed. going to have to decide based on error code

      // TODO: collect all responses
      const _dwnResponse = await this.dwnRpcClient.sendDwnRequest(dwnRpcRequest as DwnRpcRequest);
    }

    // TODO: resume here. decision fatigue (Moe - 05-11-2022)
    // TODO: if sending to author's DWN failed, bail
    // TODO: if request.target, attempt to send to target's DWN
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