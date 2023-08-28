import type {
  GenericMessage,
  SignatureInput,
  MessagesGetReply,
  RecordsReadReply,
  UnionMessageReply,
  EncryptionProperty,
  RecordsWriteMessage,
  RecordsWriteOptions,
  PrivateJwk as DwnPrivateKeyJwk,
} from '@tbd54566975/dwn-sdk-js';

import { Jose } from '@web5/crypto';
import { DidResolver } from '@web5/dids';
import { Readable } from 'readable-stream';
import * as didUtils from '@web5/dids/utils';
import { Convert, removeUndefinedProperties } from '@web5/common';

import {
  EventLogLevel,
  DataStoreLevel,
  MessageStoreLevel,
} from '@tbd54566975/dwn-sdk-js/stores';
import {
  Cid,
  Dwn,
  Message,
  EventsGet,
  DataStream,
  RecordsRead,
  MessagesGet,
  RecordsWrite,
  RecordsQuery,
  DwnMethodName,
  RecordsDelete,
  ProtocolsQuery,
  DwnInterfaceName,
  ProtocolsConfigure,
} from '@tbd54566975/dwn-sdk-js';

import type { DwnRpcRequest, DwnResponse,ProcessDwnRequest, SendDwnRequest, Web5ManagedAgent } from './types/agent.js';

import { isManagedKeyPair } from './utils.js';
import { blobToIsomorphicNodeReadable, webReadableToIsomorphicNodeReadable } from './utils.js';

export type GeneralJws = {
  payload: string
  signatures: SignatureEntry[]
};

export type SignatureEntry = {
  protected: string
  signature: string
};

export type RecordsWriteAuthorizationPayload = {
  recordId: string;
  contextId?: string;
  descriptorCid: string;
  attestationCid?: string;
  encryptionCid?: string;
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

export type DwnManagerOptions = {
  agent?: Web5ManagedAgent;
  dwn: Dwn;
}

export type DwnManagerCreateOptions = {
  agent?: Web5ManagedAgent;
  dataPath?: string;
  didResolver?: DidResolver;
  dwn?: Dwn;
}

export class DwnManager {
  /**
   * Holds the instance of a `Web5ManagedAgent` that represents the current
   * execution context for the `KeyManager`. This agent is utilized
   * to interact with other Web5 agent components. It's vital
   * to ensure this instance is set to correctly contextualize
   * operations within the broader Web5 agent framework.
   */
  private _agent?: Web5ManagedAgent;
  private _dwn: Dwn;

  constructor(options: DwnManagerOptions) {
    this._agent = options.agent;
    this._dwn = options.dwn;
  }

  /**
   * Retrieves the `Web5ManagedAgent` execution context.
   * If the `agent` instance proprety is undefined, it will throw an error.
   *
   * @returns The `Web5ManagedAgent` instance that represents the current execution
   * context.
   *
   * @throws Will throw an error if the `agent` instance property is undefined.
   */
  get agent(): Web5ManagedAgent {
    if (this._agent === undefined) {
      throw new Error('DidManager: Unable to determine agent execution context.');
    }

    return this._agent;
  }

  set agent(agent: Web5ManagedAgent) {
    this._agent = agent;
  }

  get dwn(): Dwn {
    return this._dwn;
  }

  public static async create(options?: DwnManagerCreateOptions) {
    let { agent, dataPath, didResolver, dwn } = options ?? { };

    dataPath ??= 'DATA/AGENT';

    if (dwn === undefined) {
      const dataStore = new DataStoreLevel({
        blockstoreLocation: `${dataPath}/DWN_DATASTORE`
      });
      const eventLog = new EventLogLevel({
        location: `${dataPath}/DWN_EVENTLOG`
      });
      const messageStore = new MessageStoreLevel(({
        blockstoreLocation : `${dataPath}/DWN_MESSAGESTORE`,
        indexLocation      : `${dataPath}/DWN_MESSAGEINDEX`
      }));

      dwn = await Dwn.create({
        dataStore,
        // @ts-expect-error because `dwn-sdk-js` expects its internal DidResolver implementation.
        didResolver,
        eventLog,
        messageStore,
      });
    }

    return new DwnManager({ agent, dwn });
  }

  public async processRequest(request: ProcessDwnRequest): Promise<DwnResponse> {
    const { message, dataStream } = await this.constructDwnMessage({ request });

    let reply: UnionMessageReply;
    if (request.store !== false) {
      reply = await this._dwn.processMessage(request.target, message, dataStream);
    } else {
      reply = { status: { code: 202, detail: 'Accepted' }};
    }

    return {
      reply,
      message    : message,
      messageCid : await Message.getCid(message)
    };
  }

  public async sendRequest(request: SendDwnRequest): Promise<DwnResponse> {
    const dwnRpcRequest: Partial<DwnRpcRequest> = { targetDid: request.target };
    let messageData: Blob | Readable | ReadableStream | undefined;

    if ('messageCid' in request) {
      const { message, data } =  await this.getDwnMessage({
        author      : request.author,
        messageCid  : request.messageCid,
        messageType : request.messageType
      });
      dwnRpcRequest.message = message;
      messageData = data;

    } else {
      const { message } = await this.constructDwnMessage({ request });
      dwnRpcRequest.message = message;
      messageData = request.dataStream;
    }

    if (messageData) {
      dwnRpcRequest.data = messageData;
    }

    const { didDocument, didResolutionMetadata } = await this.agent.didResolver.resolve(request.target);
    if (!didDocument) {
      const errorCode = `${didResolutionMetadata?.error}: ` ?? '';
      const defaultMessage = `Unable to resolve target DID: ${request.target}`;
      const errorMessage = didResolutionMetadata?.errorMessage ?? defaultMessage;
      throw new Error(`DwnManager: ${errorCode}${errorMessage}`);
    }

    const [ service ] = didUtils.getServices({ didDocument, id: '#dwn' });
    if (!service) {
      throw new Error(`DwnManager: DID Document of '${request.target}' has no service endpoints with ID '#dwn'`);
    }

    if (!didUtils.isDwnServiceEndpoint(service.serviceEndpoint)) {
      throw new Error(`DwnManager: Malformed '#dwn' service endpoint. Expected array of node addresses.`);
    }
    const dwnEndpointUrls = service.serviceEndpoint.nodes;

    let dwnReply;
    let errorMessages = [];

    // try sending to author's publicly addressable dwn's until first request succeeds.
    for (let dwnUrl of dwnEndpointUrls) {
      dwnRpcRequest.dwnUrl = dwnUrl;

      try {
        dwnReply = await this.agent.rpcClient.sendDwnRequest(dwnRpcRequest as DwnRpcRequest);
        break;
      } catch(error: unknown) {
        const message = (error instanceof Error) ? error.message : 'Uknown error';
        errorMessages.push({ url: dwnUrl, message });
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

  private async constructDwnMessage(options: {
    request: ProcessDwnRequest
  }) {
    const { request } = options;

    let readableStream: Readable | undefined;

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

        // @ts-ignore
        messageOptions.dataCid = await Cid.computeDagPbCidFromStream(isomorphicNodeReadable);
        // @ts-ignore
        messageOptions.dataSize ??= isomorphicNodeReadable['bytesRead'];
      }
    }

    const signingKeyId = await this.getAuthorSigningKeyId({ did: request.author });

    // ! TODO: Remove this once DWN SDK supports external signers.
    const dwnSignatureInput = this.getTempSignatureInput({ signingKeyId });

    // TODO: Figure out how to narrow this type.
    const messageCreateInput = {
      ...<any>request.messageOptions,
      authorizationSignatureInput: dwnSignatureInput
    };

    const messageCreator = dwnMessageCreators[request.messageType];

    // ! TODO: START Remove this monkey patch (MP) as soon as the DWN SDK supports external signers.
    // MP Step 1: Store the original methods.
    const originalCreateAuthorization = RecordsWrite.createAuthorization;
    const originalSignAsAuthorization = Message.signAsAuthorization;
    // MP Step 2: Replace the methods.
    RecordsWrite.createAuthorization = (
      recordId: string,
      contextId: string | undefined,
      descriptorCid: string,
      attestation: GeneralJws | undefined,
      encryption: EncryptionProperty | undefined,
    ) => this.createAuthorization(recordId, contextId, descriptorCid, attestation, encryption, signingKeyId);
    Message.signAsAuthorization = (
      descriptor: GenericMessage['descriptor'],
      signatureInput: SignatureInput,
      permissionsGrantId?: string,
    ) => this.signAsAuthorization(descriptor, signingKeyId, permissionsGrantId);
    // MP Step 3: Call the method that required monkey patching.
    const dwnMessage = await messageCreator.create(messageCreateInput as any);
    // MP Step 4: Restore the original methods.
    RecordsWrite.createAuthorization = originalCreateAuthorization;
    Message.signAsAuthorization = originalSignAsAuthorization;
    // ! TODO: END Remove this monkey patch (MP) as soon as the DWN SDK supports external signers.

    return { message: dwnMessage.toJSON(), dataStream: readableStream };
  }

  private async getAuthorSigningKeyId(options: {
    did: string
  }): Promise<string> {
    const { did } = options;

    // Get the agent instance.
    const agent = this.agent;

    // Get the method-specific default signing key.
    const signingKeyId = await agent.didManager.getDefaultSigningKey({ did });

    if (!signingKeyId) {
      throw new Error (`DwnManager: Unable to determine signing key for author: '${did}'`);
    }

    return signingKeyId;
  }

  private async getDwnMessage(options: {
    author: string,
    messageType: string,
    messageCid: string
  }): Promise<DwnMessage> {
    const { author, messageType, messageCid } = options;

    const signingKeyId = await this.getAuthorSigningKeyId({ did: author });

    // ! TODO: START Remove this monkey patch (MP) as soon as the DWN SDK supports external signers.
    const dwnSignatureInput = this.getTempSignatureInput({ signingKeyId });
    // MP Step 1: Store the original methods.
    const originalSignAsAuthorization = Message.signAsAuthorization;
    // MP Step 2: Replace the methods.
    Message.signAsAuthorization = (
      descriptor: GenericMessage['descriptor'],
      signatureInput: SignatureInput,
      permissionsGrantId?: string,
    ) => this.signAsAuthorization(descriptor, signingKeyId, permissionsGrantId);
    // MP Step 3: Call the method that required monkey patching.
    const messagesGet = await MessagesGet.create({
      authorizationSignatureInput : dwnSignatureInput,
      messageCids                 : [messageCid]
    });
    // MP Step 4: Restore the original methods.
    Message.signAsAuthorization = originalSignAsAuthorization;
    // ! TODO: END Remove this monkey patch (MP) as soon as the DWN SDK supports external signers.

    const result: MessagesGetReply = await this._dwn.processMessage(author, messagesGet.toJSON());

    if (!(result.messages && result.messages.length === 1)) {
      throw new Error('TODO: figure out error message');
    }

    const [ messageEntry ] = result.messages;

    let { message } = messageEntry;
    if (!message) {
      throw new Error('TODO: message not found');
    }

    let dwnMessage: DwnMessage = { message };

    /** If the message is a RecordsWrite, either data will be present, OR
     * we have to fetch it using a RecordsRead. */
    if (messageType === 'RecordsWrite') {
      const { encodedData } = messageEntry;
      const writeMessage = message as RecordsWriteMessage;

      if (encodedData) {
        const dataBytes = Convert.base64Url(encodedData).toUint8Array();
        dwnMessage.data = new Blob([dataBytes]);
      } else {
        const recordsRead = await RecordsRead.create({
          authorizationSignatureInput : dwnSignatureInput,
          recordId                    : writeMessage.recordId
        });

        const reply = await this._dwn.processMessage(author, recordsRead.toJSON()) as RecordsReadReply;

        if (reply.status.code >= 400) {
          const { status: { code, detail } } = reply;
          throw new Error(`(${code}) Failed to read data associated with record ${writeMessage.recordId}. ${detail}}`);
        } else if (reply.record) {
          const dataBytes = await DataStream.toBytes(reply.record.data);
          dwnMessage.data = new Blob([dataBytes]);
        }
      }
    }

    return dwnMessage;
  }

  /**
   * The following methods are a temporary workaround that should be removed
   * once DWN SDK implements support for an external signer.
   *
   * - createAuthorization()
   * - createJws()
   * - getTempSignatureInput()
   * - signAsAuthorization()
   */

  private async createAuthorization(
    recordId: string,
    contextId: string | undefined,
    descriptorCid: string,
    attestation: GeneralJws | undefined,
    encryption: EncryptionProperty | undefined,
    signingKeyId: string,
  ): Promise<GeneralJws> {
    const authorizationPayload: RecordsWriteAuthorizationPayload = {
      recordId,
      descriptorCid
    };

    const attestationCid = attestation ? await Cid.computeCid(attestation) : undefined;
    const encryptionCid = encryption ? await Cid.computeCid(encryption) : undefined;

    if (contextId !== undefined) { authorizationPayload.contextId = contextId; } // assign `contextId` only if it is defined
    if (attestationCid !== undefined) { authorizationPayload.attestationCid = attestationCid; } // assign `attestationCid` only if it is defined
    if (encryptionCid !== undefined) { authorizationPayload.encryptionCid = encryptionCid; } // assign `encryptionCid` only if it is defined

    const authorizationPayloadU8A = Convert.object(authorizationPayload).toUint8Array();

    const jws = await this.createJws(authorizationPayloadU8A, [signingKeyId]);

    return jws;
  }

  private async createJws(payload: Uint8Array, signingKeyIds: string[] = []): Promise<GeneralJws> {
    // Get the agent instance.
    const agent = this.agent;

    // Begin constructing a JWS.
    const jws: GeneralJws = {
      payload    : Convert.uint8Array(payload).toBase64Url(),
      signatures : []
    };

    for (const signingKeyId of signingKeyIds) {

      /** DID keys stored in KeyManager use the canonicalId as an alias, so
       * normalize the signing key ID before attempting to retrieve the key. **/
      const parsedDid = didUtils.parseDid({ didUrl: signingKeyId });
      if (!parsedDid) throw new Error(`DidIonMethod: Unable to parse DID: ${signingKeyId}`);
      const normalizedDid = parsedDid.did.split(':', 3).join(':');
      const normalizedSigningKeyId = `${normalizedDid}#${parsedDid.fragment}`;

      // Attempt to retrieve the signing key.
      const signingKey = await agent.keyManager.getKey({ keyRef: normalizedSigningKeyId });

      if (!isManagedKeyPair(signingKey)) {
        throw new Error (`DwnManager: Signing key not found for author: '${normalizedDid}'`);
      }

      // Get the JWS alg parameter given the key pair.
      const { alg } = Jose.webCryptoToJose(signingKey.privateKey.algorithm);

      // Construct the JWS protected header.
      const protectedHeader = Convert.object(
        { alg, kid: signingKeyId }
      ).toBase64Url();

      // Concatenate the dot-separated header and payload and convert to bytes.
      const headerAndPayload = Convert.string(
        `${protectedHeader}.${jws.payload}`
      ).toUint8Array();

      // Sign the JWS.
      const signatureBytes = await agent.keyManager.sign({
        algorithm : signingKey.privateKey.algorithm,
        data      : headerAndPayload,
        keyRef    : signingKey.privateKey.id
      });
      const signature = Convert.uint8Array(signatureBytes).toBase64Url();

      jws.signatures.push({ protected: protectedHeader, signature });
    }

    return jws;
  }

  private getTempSignatureInput({ signingKeyId }: { signingKeyId: string }): SignatureInput {
    const privateJwk: DwnPrivateKeyJwk = {
      alg : 'placeholder',
      d   : 'placeholder',
      crv : 'Ed25519',
      kty : 'placeholder',
      x   : 'placeholder'
    };

    const protectedHeader = {
      alg : 'placeholder',
      kid : signingKeyId
    };

    const dwnSignatureInput: SignatureInput = { privateJwk, protectedHeader };

    return dwnSignatureInput;
  }

  private async signAsAuthorization(
    descriptor: GenericMessage['descriptor'],
    signingKeyId: string,
    permissionsGrantId?: string
  ): Promise<GeneralJws> {
    const descriptorCid = await Cid.computeCid(descriptor);

    const authorizationPayload = { descriptorCid, permissionsGrantId };
    removeUndefinedProperties(authorizationPayload);

    const authorizationPayloadU8A = Convert.object(authorizationPayload).toUint8Array();

    const jws = await this.createJws(authorizationPayloadU8A, [signingKeyId]);

    return jws;
  }


























  /**
   * ADDED TO GET SYNC WORKING
   * - createMessage()
   * - processMessage()
   * - writePrunedRecord()
   */

  public async createMessage(options: {
    author: string,
    messageOptions: unknown,
    messageType: string
  }): Promise<EventsGet | MessagesGet | RecordsRead | RecordsQuery | RecordsWrite | RecordsDelete | ProtocolsQuery | ProtocolsConfigure> {
    const { author, messageOptions, messageType } = options;

    const signingKeyId = await this.getAuthorSigningKeyId({ did: author });

    // ! TODO: Remove this once DWN SDK supports external signers.
    const dwnSignatureInput = this.getTempSignatureInput({ signingKeyId });

    // TODO: Figure out how to narrow this type.
    const messageCreateInput = {
      ...<any>messageOptions,
      authorizationSignatureInput: dwnSignatureInput
    };

    const messageCreator = dwnMessageCreators[messageType];

    // ! TODO: START Remove this monkey patch (MP) as soon as the DWN SDK supports external signers.
    // MP Step 1: Store the original methods.
    const originalCreateAuthorization = RecordsWrite.createAuthorization;
    const originalSignAsAuthorization = Message.signAsAuthorization;
    // MP Step 2: Replace the methods.
    RecordsWrite.createAuthorization = (
      recordId: string,
      contextId: string | undefined,
      descriptorCid: string,
      attestation: GeneralJws | undefined,
      encryption: EncryptionProperty | undefined,
    ) => this.createAuthorization(recordId, contextId, descriptorCid, attestation, encryption, signingKeyId);
    Message.signAsAuthorization = (
      descriptor: GenericMessage['descriptor'],
      signatureInput: SignatureInput,
      permissionsGrantId?: string,
    ) => this.signAsAuthorization(descriptor, signingKeyId, permissionsGrantId);
    // MP Step 3: Call the method that required monkey patching.
    const dwnMessage = await messageCreator.create(messageCreateInput as any);
    // MP Step 4: Restore the original methods.
    RecordsWrite.createAuthorization = originalCreateAuthorization;
    Message.signAsAuthorization = originalSignAsAuthorization;
    // ! TODO: END Remove this monkey patch (MP) as soon as the DWN SDK supports external signers.

    return dwnMessage;
  }

  /**
   * Writes a pruned initial `RecordsWrite` to a DWN without needing to supply associated data.
   * Note: This method should ONLY be used by a {@link SyncManager} implementation.
   *
   * @param options.targetDid - DID of the DWN tenant to write the pruned RecordsWrite to.
   * @returns DWN reply containing the status of processing request.
   */
  public async writePrunedRecord(options: {
    targetDid: string,
    message: RecordsWriteMessage
  }): Promise<GenericMessageReply> {
    const { targetDid, message } = options;

    return await this._dwn.synchronizePrunedInitialRecordsWrite(targetDid, message);
  }

  public async processMessage(options: {
    targetDid: string,
    message: GenericMessage,
    dataStream?: Readable
  }): Promise<UnionMessageReply> {
    const { dataStream, message, targetDid } = options;

    return await this._dwn.processMessage(targetDid, message, dataStream);
  }
}

type GenericMessageReply = {
  status: Status;
};

type Status = {
  code: number
  detail: string
};