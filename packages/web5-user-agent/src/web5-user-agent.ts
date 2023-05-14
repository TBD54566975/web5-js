import type { DwnServiceEndpoint } from '@tbd54566975/dids';

import { Readable } from 'readable-stream';
import {
  DwnRpc,
  Web5Agent,
  DwnRpcRequest,
  DwnRpcResponse,
  JsonRpcErrorCodes,
  ProcessDwnRequest,
  ProcessDwnResponse,
} from '@tbd54566975/web5-agent';

import {
  Cid,
  DataStream,
  SignatureInput,
  RecordsWriteOptions,
  PrivateJwk as DwnPrivateKeyJwk,
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
} from '@tbd54566975/dwn-sdk-js';

import { ProfileApi } from './profile-api.js';
import { DwnRpcClient } from './dwn-rpc-client.js';
import { blobToIsomorphicNodeReadable } from './utils.js';

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

    let dataStream = request.dataStream;
    if (request?.dataStream instanceof Blob) {
      dataStream = blobToIsomorphicNodeReadable(request.dataStream);
    }

    const reply = await this.dwn.processMessage(request.target, dwnMessage.toJSON(), dataStream as any);

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

    const [ service ] = didUtils.getServices(didResolution.didDocument, { id: '#dwn' });
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
      } else {
        break;
      }
    }

    //! (Moe -> Frank) i think we're going to have to go back and change dwn-server to only return an error
    //! if the server errored.
    // was the error an error returned by dwn.processMessage or did the error happen at the server level?
    if (lastDwnRpcResponse.error) {
      const { error } = lastDwnRpcResponse;
      if (error.data?.status) {
        return { status: error.data!.status };
      } else {
        throw new Error(`(${error.code}) - ${error.message}`);
      }
    }

    // TODO: (Moe -> Frank): Chat with frank about what to return
    return lastDwnRpcResponse.result;
  }

  // async getDwnMessage(request: SendDwnRequest): Promise<any> {
  //   const dwnSignatureInput = await this.#getAuthorSignatureInput(request.author);
  //   const messagesGet = await MessagesGet.create({
  //     authorizationSignatureInput : dwnSignatureInput,
  //     messageCids                 : [request.messageCid]
  //   });

  //   const result: MessagesGetReply = await this.dwn.processMessage(request.author, messagesGet.toJSON());
  //   const [ messageEntry ] = result.messages;

  //   if (!messageEntry) {
  //     throw new Error('TODO: figure out error message');
  //   }

  //   const { messageType } = request;
  //   let { message } = messageEntry;

  //   if (!message) {
  //     throw new Error('TODO: message not found');
  //   }

  //   const dwnRpcRequest: Partial<DwnRpcRequest> = {
  //     targetDid: request.author,
  //     message
  //   };
  //   // if the message is a RecordsWrite, either data will be present, OR we have to fetch it using a RecordsRead
  //   if (messageType === 'RecordsWrite') {
  //     const { encodedData } = messageEntry;
  //     message = message as RecordsWriteMessage;

  //     if (encodedData) {
  //       const dataBytes = Encoder.base64UrlToBytes(encodedData);
  //       dwnRpcRequest.data = new Blob([dataBytes]);
  //     } else {
  //       const recordsRead = await RecordsRead.create({
  //         authorizationSignatureInput : dwnSignatureInput,
  //         recordId                    : message['recordId']
  //       });

  //       // TODO: set reply type to RecordsReadReply once it is exported from dwn-sdk-js
  //       const reply = await this.dwn.processMessage(request.author, recordsRead.toJSON());
  //       dwnRpcRequest.data = reply.data;
  //     }
  //   }

  //   const { didDocument } = await this.didResolver.resolve(request.author);
  //   if (!didDocument) {
  //     throw new Error('TODO: figure out error message <Did Resolution failure>');
  //   }

  //   const [ service ] = didUtils.getServices(didDocument, { id: '#dwn' });

  //   if (!service) {
  //     throw new Error(`${request.author} has no dwn service endpoints`);
  //   }

  //   const { serviceEndpoint } = service;
  //   if (!serviceEndpoint['nodes']) {
  //     throw new Error('malformed dwn service endpoint. expected nodes array');
  //   }

  //   const { nodes } = serviceEndpoint as DwnServiceEndpoint;
  //   let lastDwnRpcResponse: DwnRpcResponse;

  //   // try sending to author's publicly addressable dwn's until first request succeeds.
  //   for (let node of nodes) {
  //     dwnRpcRequest.dwnUrl = node;
  //     // TODO: check for presence of error in dwnResponse.jsonRpcResponse. no point in blindly trying other nodes
  //     //       if request is malformed. going to have to decide based on error code

  //     // TODO: collect all responses
  //     const lastDwnRpcResponse = await this.dwnRpcClient.sendDwnRequest(dwnRpcRequest as DwnRpcRequest);
  //     if (lastDwnRpcResponse.error) {
  //       const { error } = lastDwnRpcResponse;
  //       if (sendRetryCodes.has(error.code)) {
  //         continue;
  //       } else {
  //         break;
  //       }
  //     }
  //   }

  //   // if sending to the author's dwn(s) failed don't try the target's dwn
  //   if (lastDwnRpcResponse.error) {
  //     // TODO: figure out what SendDwnResponse looks like
  //   }
  // }

  async #constructDwnMessage(request: ProcessDwnRequest) {
    const dwnSignatureInput = await this.#getAuthorSignatureInput(request.author);

    if (request.messageType === 'RecordsWrite') {
      const messageOptions = request.messageOptions as RecordsWriteOptions;

      if (request.dataStream && !messageOptions.data) {
        const { dataStream } = request;

        if (dataStream instanceof Blob) {
          messageOptions.dataSize = dataStream.size;

          //! Note: this _won't_ work with nodejs because a blob's stream can only be consumed once
          const isomorphicNodeReadable = blobToIsomorphicNodeReadable(dataStream);
          messageOptions.dataCid = await Cid.computeDagPbCidFromStream(isomorphicNodeReadable);
        } else if (dataStream instanceof Readable) {
          // TODO: handle this?
        }
      }
    }

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