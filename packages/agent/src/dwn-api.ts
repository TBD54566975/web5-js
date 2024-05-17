import type { Readable } from '@web5/common';
import type { DwnConfig, GenericMessage, UnionMessageReply } from '@tbd54566975/dwn-sdk-js';

import { Convert, NodeStream } from '@web5/common';
import { utils as cryptoUtils } from '@web5/crypto';
import { DidDht, DidJwk, DidResolverCacheLevel, UniversalResolver } from '@web5/dids';
import { Cid, DataStoreLevel, Dwn, DwnMethodName, EventLogLevel, Message, MessageStoreLevel } from '@tbd54566975/dwn-sdk-js';

import type { Web5PlatformAgent } from './types/agent.js';
import type { DwnMessage, DwnMessageInstance, DwnMessageParams, DwnMessageReply, DwnMessageWithData, DwnResponse, DwnSigner, MessageHandler, ProcessDwnRequest, SendDwnRequest } from './types/dwn.js';

import { DwnInterface, dwnMessageConstructors } from './types/dwn.js';
import { blobToIsomorphicNodeReadable, getDwnServiceEndpointUrls, isRecordsWrite, webReadableToIsomorphicNodeReadable } from './utils.js';

export type DwnMessageWithBlob<T extends DwnInterface> = {
  message: DwnMessage[T];
  data?: Blob;
}

export type DwnApiParams = {
  agent?: Web5PlatformAgent;
  dwn: Dwn;
}

export interface DwnApiCreateDwnParams extends Partial<DwnConfig> {
  dataPath?: string;
}

export function isDwnRequest<T extends DwnInterface>(
  dwnRequest: ProcessDwnRequest<DwnInterface>, messageType: T
): dwnRequest is ProcessDwnRequest<T> {
  return dwnRequest.messageType === messageType;
}

export function isDwnMessage<T extends DwnInterface>(
  messageType: T, message: GenericMessage
): message is DwnMessage[T] {
  const incomingMessageInterfaceName = message.descriptor.interface + message.descriptor.method;
  return incomingMessageInterfaceName === messageType;
}

export class AgentDwnApi {
  /**
   * Holds the instance of a `Web5PlatformAgent` that represents the current execution context for
   * the `AgentDwnApi`. This agent is used to interact with other Web5 agent components. It's vital
   * to ensure this instance is set to correctly contextualize operations within the broader Web5
   * Agent framework.
   */
  private _agent?: Web5PlatformAgent;

  /**
   * The DWN instance to use for this API.
   */
  private _dwn: Dwn;

  constructor({ agent, dwn }: DwnApiParams) {
    // If an agent is provided, set it as the execution context for this API.
    this._agent = agent;

    // Set the DWN instance for this API.
    this._dwn = dwn;
  }

  /**
   * Retrieves the `Web5PlatformAgent` execution context.
   *
   * @returns The `Web5PlatformAgent` instance that represents the current execution context.
   * @throws Will throw an error if the `agent` instance property is undefined.
   */
  get agent(): Web5PlatformAgent {
    if (this._agent === undefined) {
      throw new Error('AgentDwnApi: Unable to determine agent execution context.');
    }

    return this._agent;
  }

  set agent(agent: Web5PlatformAgent) {
    this._agent = agent;
  }

  /**
   * Public getter for the DWN instance used by this API.
   *
   * Notes:
   * - This getter is public to allow advanced developers to access the DWN instance directly.
   *   However, it is recommended to use the `processRequest` method to interact with the DWN
   *   instance to ensure that the DWN message is constructed correctly.
   * - The getter is named `node` to avoid confusion with the `dwn` property of the
   *   `Web5PlatformAgent`. In other words, so that a developer can call `agent.dwn.node` to access
   *   the DWN instance and not `agent.dwn.dwn`.
   */
  get node(): Dwn {
    return this._dwn;
  }

  public static async createDwn({
    dataPath, dataStore, didResolver, eventLog, eventStream, messageStore, tenantGate
  }: DwnApiCreateDwnParams): Promise<Dwn> {
    dataStore ??= new DataStoreLevel({ blockstoreLocation: `${dataPath}/DWN_DATASTORE` });

    didResolver ??= new UniversalResolver({
      didResolvers : [DidDht, DidJwk],
      cache        : new DidResolverCacheLevel({ location: `${dataPath}/DID_RESOLVERCACHE` }),
    });

    eventLog ??= new EventLogLevel({ location: `${dataPath}/DWN_EVENTLOG` });

    messageStore ??= new MessageStoreLevel(({
      blockstoreLocation : `${dataPath}/DWN_MESSAGESTORE`,
      indexLocation      : `${dataPath}/DWN_MESSAGEINDEX`
    }));

    return await Dwn.create({ dataStore, didResolver, eventLog, eventStream, messageStore, tenantGate });
  }

  public async processRequest<T extends DwnInterface>(
    request: ProcessDwnRequest<T>
  ): Promise<DwnResponse<T>> {
    // Constructs a DWN message. and if there is a data payload, transforms the data to a Node
    // Readable stream.
    const { message, dataStream } = await this.constructDwnMessage({ request });

    // Extracts the optional subscription handler from the request to pass into `processMessage.
    const { subscriptionHandler } = request;

    // Conditionally processes the message with the DWN instance:
    // - If `store` is not explicitly set to false, it sends the message to the DWN node for
    //   processing, passing along the target DID, the message, and any associated data stream.
    // - If `store` is set to false, it immediately returns a simulated 'accepted' status without
    //   storing the message/data in the DWN node.
    const reply: DwnMessageReply[T] = (request.store !== false)
      ? await this._dwn.processMessage(request.target, message, { dataStream, subscriptionHandler })
      : { status: { code: 202, detail: 'Accepted' } };

    // Returns an object containing the reply from processing the message, the original message,
    // and the content identifier (CID) of the message.
    return {
      reply,
      message,
      messageCid: await Message.getCid(message),
    };
  }

  public async sendRequest<T extends DwnInterface>(
    request: SendDwnRequest<T>
  ): Promise<DwnResponse<T>> {
    // First, confirm the target DID can be dereferenced and extract the DWN service endpoint URLs.
    const dwnEndpointUrls = await getDwnServiceEndpointUrls(request.target, this.agent.did);
    if (dwnEndpointUrls.length === 0) {
      throw new Error(`AgentDwnApi: DID Service is missing or malformed: ${request.target}#dwn`);
    }

    let messageCid: string | undefined;
    let message: DwnMessage[T];
    let data: Blob | undefined;
    let subscriptionHandler: MessageHandler[T] | undefined;

    // If `messageCid` is given, retrieve message and data, if any.
    if ('messageCid' in request) {
      ({ message, data } = await this.getDwnMessage({
        author      : request.author,
        messageCid  : request.messageCid,
        messageType : request.messageType
      }));
      messageCid = request.messageCid;

    } else {
      // Otherwise, construct a new message.
      ({ message } = await this.constructDwnMessage({ request }));
      if (request.dataStream && !(request.dataStream instanceof Blob)) {
        throw new Error('AgentDwnApi: DataStream must be provided as a Blob');
      }
      data = request.dataStream;
      subscriptionHandler = request.subscriptionHandler;
    }

    // Send the RPC request to the target DID's DWN service endpoint using the Agent's RPC client.
    const reply = await this.sendDwnRpcRequest({
      targetDid: request.target,
      dwnEndpointUrls,
      message,
      data,
      subscriptionHandler
    });

    // If the message CID was not given in the `request`, compute it.
    messageCid ??= await Message.getCid(message);

    // Returns an object containing the reply from processing the message, the original message,
    // and the content identifier (CID) of the message.
    return { reply, message, messageCid };
  }

  private async sendDwnRpcRequest<T extends DwnInterface>({
    targetDid, dwnEndpointUrls, message, data, subscriptionHandler
  }: {
      targetDid: string;
      dwnEndpointUrls: string[];
      message: DwnMessage[T];
      data?: Blob;
      subscriptionHandler?: MessageHandler[T];
    }
  ): Promise<DwnMessageReply[T]> {
    const errorMessages: { url: string, message: string }[] = [];

    if (message.descriptor.method === DwnMethodName.Subscribe && subscriptionHandler === undefined) {
      throw new Error('AgentDwnApi: Subscription handler is required for subscription requests.');
    }

    // Try sending to author's publicly addressable DWNs until the first request succeeds.
    for (let dwnUrl of dwnEndpointUrls) {
      try {
        if (subscriptionHandler !== undefined) {
          // we get the server info to check if the server supports WebSocket for subscription requests
          const serverInfo = await this.agent.rpc.getServerInfo(dwnUrl);
          if (!serverInfo.webSocketSupport) {
            // If the server does not support WebSocket, add an error message and continue to the next URL.
            errorMessages.push({
              url     : dwnUrl,
              message : 'WebSocket support is not enabled on the server.'
            });
            continue;
          }

          // If the server supports WebSocket, replace the subscription URL with a socket transport.
          // For `http` we use the unsecured `ws` protocol, and for `https` we use the secured `wss` protocol.
          const parsedUrl = new URL(dwnUrl);
          parsedUrl.protocol = parsedUrl.protocol === 'http:' ? 'ws:' : 'wss:';
          dwnUrl = parsedUrl.toString();
        }

        const dwnReply = await this.agent.rpc.sendDwnRequest({
          dwnUrl,
          targetDid,
          message,
          data,
          subscriptionHandler
        });

        return dwnReply;
      } catch(error: any) {
        errorMessages.push({
          url     : dwnUrl,
          message : (error instanceof Error) ? error.message : 'Unknown error',
        });
      }
    }

    throw new Error(`Failed to send DWN RPC request: ${JSON.stringify(errorMessages)}`);
  }

  private async constructDwnMessage<T extends DwnInterface>({ request }: {
    request: ProcessDwnRequest<T>
  }): Promise<DwnMessageWithData<T>> {
    const rawMessage = request.rawMessage;
    let readableStream: Readable | undefined;

    // TODO: Consider refactoring to move data transformations imposed by fetch() limitations to the HTTP transport-related methods.
    if (isDwnRequest(request, DwnInterface.RecordsWrite)) {
      const messageParams = request.messageParams;

      if (request.dataStream && !messageParams?.data) {
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

        if (!rawMessage) {
          // @ts-ignore
          messageParams.dataCid = await Cid.computeDagPbCidFromStream(isomorphicNodeReadable);
          // @ts-ignore
          messageParams.dataSize ??= isomorphicNodeReadable['bytesRead'];
        }
      }
    }

    // Determine the signer for the message.
    const signer = await this.getSigner(request.author);

    const dwnMessageConstructor = dwnMessageConstructors[request.messageType];
    const dwnMessage = rawMessage ? await dwnMessageConstructor.parse(rawMessage) : await dwnMessageConstructor.create({
      // TODO: Implement alternative to type assertion.
      ...request.messageParams!,
      signer
    });

    if (isRecordsWrite(dwnMessage) && request.signAsOwner) {
      await dwnMessage.signAsOwner(signer);
    }

    return { message: dwnMessage.message as DwnMessage[T], dataStream: readableStream };
  }

  private async getSigner(author: string): Promise<DwnSigner> {
    // If the author is the Agent's DID, use the Agent's signer.
    if (author === this.agent.agentDid.uri) {
      const signer = await this.agent.agentDid.getSigner();

      return {
        algorithm : signer.algorithm,
        keyId     : signer.keyId,
        sign      : async (data: Uint8Array) => {
          return await signer.sign({ data });
        }
      };

    } else {
      // Otherwise, use the author's DID to determine the signing method.
      try {
        const signingMethod = await this.agent.did.getSigningMethod({ didUri: author });

        if (!signingMethod.publicKeyJwk) {
          throw new Error(`Verification method '${signingMethod.id}' does not contain a public key in JWK format`);
        }

        // Compute the key URI of the verification method's public key.
        const keyUri = await this.agent.keyManager.getKeyUri({ key: signingMethod.publicKeyJwk });

        // Verify that the key is present in the key manager. If not, an error is thrown.
        const publicKey = await this.agent.keyManager.getPublicKey({ keyUri });

        // Bind the Agent's Key Manager to the signer.
        const keyManager = this.agent.keyManager;

        return {
          algorithm : cryptoUtils.getJoseSignatureAlgorithmFromPublicKey(publicKey),
          keyId     : signingMethod.id,
          sign      : async (data: Uint8Array) => {
            return await keyManager.sign({ data, keyUri: keyUri! });
          }
        };
      } catch (error: any) {
        throw new Error(`AgentDwnApi: Unable to get signer for author '${author}': ${error.message}`);
      }
    }
  }

  /**
   * FURTHER REFACTORING NEEDED BELOW THIS LINE
   */

  private async getDwnMessage<T extends DwnInterface>({ author, messageCid }: {
    author: string;
    messageType: T;
    messageCid: string;
  }): Promise<DwnMessageWithBlob<T>> {
    const signer = await this.getSigner(author);

    // Construct a MessagesGet message to fetch the message.
    const messagesGet = await dwnMessageConstructors[DwnInterface.MessagesGet].create({
      messageCids: [messageCid],
      signer
    });

    const result = await this._dwn.processMessage(author, messagesGet.message);

    if (!(result.entries && result.entries.length === 1)) {
      throw new Error('AgentDwnApi: Expected 1 message entry in the MessagesGet response but received none or more than one.');
    }

    const [ messageEntry ] = result.entries;

    const message = messageEntry.message as DwnMessage[T];
    if (!message) {
      throw new Error(`AgentDwnApi: Message not found with CID: ${messageCid}`);
    }

    let dwnMessageWithBlob: DwnMessageWithBlob<T> = { message };
    // isRecordsWrite(message) && (dwnMessage.data = await this.getDataForRecordsWrite({ author, message, messageEntry, messageType, signer }));

    // If the message is a RecordsWrite, either data will be present,
    // OR we have to fetch it using a RecordsRead.
    if (isRecordsWrite(messageEntry)) {
      if (messageEntry.encodedData) {
        const dataBytes = Convert.base64Url(messageEntry.encodedData).toUint8Array();
        // TODO: test adding the messageEntry.message.descriptor.dataFormat to the Blob constructor.
        dwnMessageWithBlob.data = new Blob([dataBytes]);

      } else {
        const recordsRead = await dwnMessageConstructors[DwnInterface.RecordsRead].create({
          filter: {
            recordId: messageEntry.message.recordId
          },
          signer
        });

        const reply = await this._dwn.processMessage(author, recordsRead.message);

        if (reply.status.code >= 400) {
          const { status: { code, detail } } = reply;
          throw new Error(`AgentDwnApi: (${code}) Failed to read data associated with record ${messageEntry.message.recordId}. ${detail}}`);
        } else if (reply.record) {
          const dataBytes = await NodeStream.consumeToBytes({ readable: reply.record.data });
          dwnMessageWithBlob.data = new Blob([dataBytes]);
        }
      }
    }

    return dwnMessageWithBlob;
  }

  /**
   * TODO: Refactor this to consolidate logic in AgentDwnApi and SyncEngineLevel.
   * ADDED TO GET SYNC WORKING
   * - createMessage()
   * - processMessage()
   */

  public async createMessage<T extends DwnInterface>({ author, messageParams, messageType }: {
    author: string;
    messageType: T;
    messageParams?: DwnMessageParams[T];
  }): Promise<DwnMessageInstance[T]> {
    // Determine the signer for the message.
    const signer = await this.getSigner(author);

    const dwnMessageConstructor = dwnMessageConstructors[messageType];
    const dwnMessage = await dwnMessageConstructor.create({
      // TODO: Explore whether 'messageParams' should be required in the ProcessDwnRequest type.
      ...messageParams!,
      signer
    });

    return dwnMessage;
  }

  public async processMessage({ dataStream, message, targetDid }: {
    targetDid: string;
    message: GenericMessage;
    dataStream?: Readable;
  }): Promise<UnionMessageReply> {
    return await this._dwn.processMessage(targetDid, message, { dataStream });
  }
}