import type { DwnServiceEndpoint } from '@tbd54566975/dids';
import {
  DataStream,
  SignatureInput,
  MessagesGetReply,
  RecordsReadReply,
  UnionMessageReply,
  RecordsWriteMessage,
  RecordsWriteOptions,
  PrivateJwk as DwnPrivateKeyJwk,
} from '@tbd54566975/dwn-sdk-js';

import { Readable } from 'readable-stream';
import {
  DwnRpc,
  Web5Agent,
  DwnResponse,
  DwnRpcRequest,
  SendDwnRequest,
  ProcessDwnRequest,
  SendVcRequest,
  ProcessVcRequest,
  VcResponse,
} from '@tbd54566975/web5-agent';

import {
  Cid,
  Encoder,
  Message,
} from '@tbd54566975/dwn-sdk-js';

import type { SyncManager } from './sync-manager.js';
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
import { blobToIsomorphicNodeReadable, webReadableToIsomorphicNodeReadable } from './utils.js';

import { KeyManager, ManagedKeyPair } from '@tbd54566975/crypto';
import { VerifiableCredential } from '@tbd54566975/credentials';

import { Convert } from '@tbd54566975/common';

// TODO: allow user to provide optional array of DwnRpc implementations once DwnRpc has been moved out of this package
export type Web5UserAgentOptions = {
  dwn: Dwn;
  profileManager: ProfileManager;
  didResolver: DidResolver;
  syncManager?: SyncManager;
  keyManager?: KeyManager;
};

type DwnMessage = {
  message: any;
  data?: Blob;
}

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
  private syncManager: SyncManager;
  private keyManager: KeyManager;

  constructor(options: Web5UserAgentOptions) {
    this.dwn = options.dwn;
    this.didResolver = options.didResolver;
    this.profileManager = options.profileManager;
    this.dwnRpcClient = new DwnRpcClient();

    if (options.syncManager) {
      this.syncManager = options.syncManager;
    }

    if (options.keyManager) {
      this.keyManager = options.keyManager;
    }
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
  async processDwnRequest(request: ProcessDwnRequest): Promise<DwnResponse> {
    const { message, dataStream }= await this.#constructDwnMessage(request);

    let reply: UnionMessageReply;
    if (request.store !== false) {
      reply = await this.dwn.processMessage(request.target, message, dataStream as any);
    } else {
      reply = { status: { code: 202, detail: 'Accepted' }};
    }

    return {
      reply,
      message    : message,
      messageCid : await Message.getCid(message)
    };
  }

  async sendDwnRequest(request: SendDwnRequest): Promise<DwnResponse> {
    const dwnRpcRequest: Partial<DwnRpcRequest> = { targetDid: request.target };
    let messageData;

    if ('messageCid' in request) {
      const { message, data } =  await this.#getDwnMessage(request.author, request.messageType, request.messageCid);

      dwnRpcRequest.message = message;
      messageData = data;
    } else {
      const { message } = await this.#constructDwnMessage(request);
      dwnRpcRequest.message = message;
      messageData = request.dataStream;
    }

    if (messageData) {
      dwnRpcRequest.data = messageData;
    }

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
      throw new Error(`${request.target} has no '#dwn' service endpoints`);
    }

    const { serviceEndpoint } = service;
    if (!serviceEndpoint['nodes']) {
      throw new Error(`malformed '#dwn' service endpoint. expected nodes array`);
    }

    const { nodes } = serviceEndpoint as DwnServiceEndpoint;
    let dwnReply;
    let errorMessages = [];

    // try sending to author's publicly addressable dwn's until first request succeeds.
    for (let node of nodes) {
      dwnRpcRequest.dwnUrl = node;

      try {
        dwnReply = await this.dwnRpcClient.sendDwnRequest(dwnRpcRequest as DwnRpcRequest);
        break;
      } catch(e) {
        errorMessages.push({ url: node, message: e.message });
      }
    }

    if (!dwnReply) {
      throw new Error(JSON.stringify(errorMessages));
    }

    return {
      message    : dwnRpcRequest.message,
      messageCid : await Message.getCid(dwnRpcRequest.message),
      reply      : dwnReply,
    };
  }

  async processVcRequest(request: ProcessVcRequest): Promise<VcResponse> {
    if (!request.vc) {
      throw new Error(`must have vc to process vc request`);
    }

    let kid = request.kid;

    if (!kid) {
      const didResolution = await this.didResolver.resolve(request.author);

      if (!didResolution.didDocument) {
        if (didResolution.didResolutionMetadata?.error) {
          throw new Error(`DID resolution error: ${didResolution.didResolutionMetadata.error}`);
        } else {
          throw new Error('DID resolution error: other');
        }
      }

      const [ service ] = didUtils.getServices(didResolution.didDocument, { id: '#dwn' });
      if (!service) {
        throw new Error(`${request.target} has no '#dwn' service endpoints`);
      }

      const serviceEndpoint = service.serviceEndpoint as DwnServiceEndpoint;
      kid = serviceEndpoint.messageAuthorizationKeys[0];
    }

    const vcJwt = await this.#sign(request.vc as VerifiableCredential, kid);

    let schema;

    if (request.vc.credentialSchema) {
      let credentialSchema = request.vc.credentialSchema;
      if (typeof credentialSchema === 'string') {
        schema = credentialSchema;
      } else if (Array.isArray(credentialSchema)) {
        for (let item of credentialSchema) {
          if (typeof item !== 'string' && item.id) {
            schema = item.id;
            break;
          }
        }
      } else if (typeof credentialSchema === 'object' && credentialSchema.id) {
        schema = credentialSchema.id;
      }
    } else if (!schema  && request.vc['@context']) {
      let context = request.vc['@context'];

      if (typeof context === 'string' && context !== 'https://www.w3.org/2018/credentials/v1') {
        schema = context;
      } else if (Array.isArray(context)) {
        let filteredContext = context.filter(e => typeof e === 'string' && e !== 'https://www.w3.org/2018/credentials/v1');
        if (filteredContext.length > 0) {
          schema = filteredContext[0];
        }
      } else if (typeof context === 'object' && context.name && context.name !== 'https://www.w3.org/2018/credentials/v1') {
        schema = context.name;
      }
    }

    const messageOptions: Partial<RecordsWriteOptions> = { ...{ schema, dataFormat: 'application/vc+jwt' } };
    const dataBlob = new Blob([vcJwt], { type: 'application/vc+jwt' });

    const dwnResponse = await this.processDwnRequest({
      author      : request.author,
      dataStream  : dataBlob,
      messageOptions,
      messageType : DwnInterfaceName.Records + DwnMethodName.Write,
      store       : true,
      target      : request.target
    });

    const vcResponse: VcResponse = {
      vcJwt: vcJwt,
      ...dwnResponse,
    };

    return vcResponse;
  }

  async sendVcRequest(_request: SendVcRequest): Promise<VcResponse> {
    throw new Error('Method not implemented.');
  }

  async #getDwnMessage(author: string, messageType: string, messageCid: string): Promise<DwnMessage> {
    const dwnSignatureInput = await this.#getAuthorSignatureInput(author);
    const messagesGet = await MessagesGet.create({
      authorizationSignatureInput : dwnSignatureInput,
      messageCids                 : [messageCid]
    });

    const result: MessagesGetReply = await this.dwn.processMessage(author, messagesGet.toJSON());
    const [ messageEntry ] = result.messages;

    if (!messageEntry) {
      throw new Error('TODO: figure out error message');
    }

    let { message } = messageEntry;
    if (!message) {
      throw new Error('TODO: message not found');
    }

    let dwnMessage: DwnMessage = { message };

    // if the message is a RecordsWrite, either data will be present, OR we have to fetch it using a RecordsRead
    if (messageType === 'RecordsWrite') {
      const { encodedData } = messageEntry;
      message = message as RecordsWriteMessage;

      if (encodedData) {
        const dataBytes = Encoder.base64UrlToBytes(encodedData);
        dwnMessage.data = new Blob([dataBytes]);
      } else {
        const recordsRead = await RecordsRead.create({
          authorizationSignatureInput : dwnSignatureInput,
          recordId                    : message['recordId']
        });

        const reply = await this.dwn.processMessage(author, recordsRead.toJSON()) as RecordsReadReply;

        if (reply.status.code >= 400) {
          const { status: { code, detail } } = reply;
          throw new Error(`(${code}) Failed to read data associated with record ${message['recordId']}. ${detail}}`);
        } else {
          const dataBytes = await DataStream.toBytes(reply.record.data);
          dwnMessage.data = new Blob([dataBytes]);
        }
      }
    }

    return dwnMessage;
  }

  async #constructDwnMessage(request: ProcessDwnRequest) {
    const dwnSignatureInput = await this.#getAuthorSignatureInput(request.author);
    let readableStream: Readable;

    // TODO: Consider refactoring to move data transformations imposed by fetch() limitations to the HTTP transport-related methods.
    if (request.messageType === 'RecordsWrite') {
      const messageOptions = request.messageOptions as RecordsWriteOptions;

      if (request.dataStream && !messageOptions.data) {
        const { dataStream } = request;
        let isomorphicNodeReadable: Readable;

        if (dataStream instanceof Blob) {
          isomorphicNodeReadable = blobToIsomorphicNodeReadable(dataStream);

          readableStream = blobToIsomorphicNodeReadable(dataStream);
        } else if (dataStream instanceof ReadableStream) {
          const [ forCid, forProcessMessage ] = dataStream.tee();

          isomorphicNodeReadable = webReadableToIsomorphicNodeReadable(forCid);
          readableStream = webReadableToIsomorphicNodeReadable(forProcessMessage);
        }

        messageOptions.dataCid = await Cid.computeDagPbCidFromStream(isomorphicNodeReadable);
        messageOptions.dataSize ??= isomorphicNodeReadable['bytesRead'];
      }
    }

    // TODO: Figure out how to narrow this type. may have figured something out in `web5.DidInterface`
    const messageCreateInput = {
      ...<any>request.messageOptions,
      authorizationSignatureInput: dwnSignatureInput
    };

    const messageCreator = dwnMessageCreators[request.messageType];
    const dwnMessage = await messageCreator.create(messageCreateInput as any);

    return { message: dwnMessage.toJSON(), dataStream: readableStream };
  }

  async #sign(vc: VerifiableCredential, kid: string): Promise<string> {
    const keyPair = await this.keyManager.getKey({keyRef: kid}) as ManagedKeyPair;

    const now = Math.floor(Date.now() / 1000);

    const jwtPayload = {
      iat : now,
      iss : vc.issuer,
      jti : vc.id,
      nbf : now,
      sub : vc.issuer,
      vc  : vc,
    };

    const payloadBytes = Encoder.objectToBytes(jwtPayload);
    const payloadBase64url = Encoder.bytesToBase64Url(payloadBytes);

    const protectedHeader = {alg: 'ECDSA', kid: keyPair.privateKey.id, typ: 'JWT'};
    const headerBytes = Encoder.objectToBytes(protectedHeader);
    const headerBase64url = Encoder.bytesToBase64Url(headerBytes);

    const signatureInput = `${headerBase64url}.${payloadBase64url}`;
    const signatureInputBytes = Encoder.stringToBytes(signatureInput);

    const signatureArrayBuffer = await this.keyManager.sign({
      algorithm : { name: 'ECDSA', hash: 'SHA-256' },
      keyRef    : keyPair.privateKey.id,
      data      : signatureInputBytes,
    });

    const signatureBase64url = Convert.arrayBuffer(signatureArrayBuffer).toBase64Url();

    return `${headerBase64url}.${payloadBase64url}.${signatureBase64url}`;
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