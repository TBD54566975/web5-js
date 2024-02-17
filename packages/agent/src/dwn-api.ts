import { Convert, type Readable } from '@web5/common';
import type { Signer as DwnSigner, RecordsWrite } from '@tbd54566975/dwn-sdk-js';

import { DidResolver, utils as didUtils } from '@web5/dids';
import { Cid, DataStream, Dwn, DwnInterfaceName, DwnMethodName, Message } from '@tbd54566975/dwn-sdk-js';

import type { DwnRpcRequest } from './rpc-client.js';
import type { Web5ManagedAgent } from './types/agent.js';
import type { DwnMessage, DwnMessageReply, DwnMessageWithData, DwnResponse, ProcessDwnRequest, SendDwnRequest } from './types/agent-dwn.js';

import { getSigningAlgorithmFromPublicKey } from './temp/add-to-crypto.js';
import { DwnInterface, dwnMessageConstructors } from './types/agent-dwn.js';
import { blobToIsomorphicNodeReadable, webReadableToIsomorphicNodeReadable } from './utils.js';

export type DwnApiParams = {
  agent?: Web5ManagedAgent;
  dwn: Dwn;
}

export type DwnApiCreateParams = {
  agent?: Web5ManagedAgent;
  dataPath?: string;
  didResolver?: DidResolver;
  dwn?: Dwn;
}

export function isDwnRequest<T extends DwnInterface>(
  dwnRequest: ProcessDwnRequest<DwnInterface>, messageType: T
): dwnRequest is ProcessDwnRequest<T> {
  return dwnRequest.messageType === messageType;
}

export function isRecordsWrite(obj: unknown): obj is RecordsWrite {
  // Validate that the given value is an object.
  if (!obj || typeof obj !== 'object' || obj === null) return false;

  // Validate that the object has the necessary properties of RecordsWrite.
  return (
    'message' in obj && typeof obj.message === 'object' && obj.message !== null &&
    'descriptor' in obj.message && typeof obj.message.descriptor === 'object' && obj.message.descriptor !== null &&
    'interface' in obj.message.descriptor && obj.message.descriptor.interface === DwnInterfaceName.Records &&
    'method' in obj.message.descriptor && obj.message.descriptor.method === DwnMethodName.Write
  );
}

export class AgentDwnApi {

  /**
   * Holds the instance of a `Web5ManagedAgent` that represents the current execution context for
   * the `AgentDidApi`. This agent is used to interact with other Web5 agent components. It's vital
   * to ensure this instance is set to correctly contextualize operations within the broader Web5
   * Agent framework.
   */
  private _agent?: Web5ManagedAgent;

  /**
   * The DWN instance to use for this API.
   */
  private _dwn: Dwn;

  constructor({ agent, dwn }: DwnApiParams) {
    // Set the DWN instance for this API.
    this._dwn = dwn;

    this._agent = agent;
  }

  /**
   * Retrieves the `Web5ManagedAgent` execution context.
   *
   * @returns The `Web5ManagedAgent` instance that represents the current execution context.
   * @throws Will throw an error if the `agent` instance property is undefined.
   */
  get agent(): Web5ManagedAgent {
    if (this._agent === undefined) {
      throw new Error('AgentDidApi: Unable to determine agent execution context.');
    }

    return this._agent;
  }

  set agent(agent: Web5ManagedAgent) {
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
   *   `Web5ManagedAgent`. In other words, so that a developer can call `agent.dwn.node` to access
   *   the DWN instance and not `agent.dwn.dwn`.
   */
  get node(): Dwn {
    return this._dwn;
  }

  public async processRequest<T extends DwnInterface>(
    request: ProcessDwnRequest<T>
  ): Promise<DwnResponse<T>> {
    const { message, dataStream } = await this.constructDwnMessage({ request });

    let reply: DwnMessageReply[T];
    if (request.store !== false) {
      // Assuming _dwn.processMessage can handle the request appropriately
      // You might need to adjust this part based on your actual implementation
      reply = await this._dwn.processMessage(request.target, message, { dataStream });
    } else {
      // This else block may need adjustment to fit the generic approach
      reply = { status: { code: 202, detail: 'Accepted' } } as DwnMessageReply[T];
    }

    return {
      reply,
      message    : message,
      messageCid : await Message.getCid(message),
    };
  }

  public async sendRequest<T extends DwnInterface>(
    request: SendDwnRequest<T>
  ): Promise<DwnResponse<T>> {
    // First, confirm the target DID can be dereferenced and extract the DWN service endpoint URLs.
    const dwnEndpointUrls = await getDwnServiceEndpointUrls(request.target, this.agent.did);

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

    let dwnReply;
    let errorMessages: { url: string, message: string }[] = [];

    // Try sending to author's publicly addressable DWNs until the first request succeeds.
    for (let dwnUrl of dwnEndpointUrls) {
      dwnRpcRequest.dwnUrl = dwnUrl;

      try {
        dwnReply = await this.agent.rpc.sendDwnRequest(dwnRpcRequest as DwnRpcRequest);
        break;
      } catch(error: unknown) {
        const message = (error instanceof Error) ? error.message : 'Unknown error';
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
      // ! TODO: Explore whether 'messageParams' should be required in the ProcessDwnRequest type.
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
        const keyUri = await this.agent.crypto.getKeyUri({ key: signingMethod.publicKeyJwk });

        // Verify that the key is present in the key manager. If not, an error is thrown.
        const publicKey = await this.agent.crypto.getPublicKey({ keyUri });

        // Bind the Agent's Crypto API to the signer.
        const crypto = this.agent.crypto;

        return {
          algorithm : getSigningAlgorithmFromPublicKey(publicKey),
          keyId     : signingMethod.id,
          sign      : async (data: Uint8Array) => {
            return await crypto.sign({ data, keyUri: keyUri! });
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
        // ! TODO: test adding the messageEntry.message.descriptor.dataFormat to the Blob constructor.
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
          throw new Error(`(${code}) Failed to read data associated with record ${messageEntry.message.recordId}. ${detail}}`);
        } else if (reply.record) {
          // ! TODO: Switch this to use the @web5/common utility once confirmed working.
          const dataBytes = await DataStream.toBytes(reply.record.data);
          dwnMessageWithBlob.data = new Blob([dataBytes]);
        }
      }
    }

    return dwnMessageWithBlob;
  }
}


export type DwnMessageWithBlob<T extends DwnInterface> = {
  message: DwnMessage[T];
  data?: Blob;
}


export async function getDwnServiceEndpointUrls(didUri: string, resolver: DidResolver): Promise<string[]> {
  // Attempt to dereference the DID service with ID fragment #dwn.
  const dereferencingResult = await resolver.dereference(`${didUri}#dwn`);

  if (dereferencingResult.dereferencingMetadata.error) {
    throw new Error(`Failed to dereference '${didUri}#dwn': ${dereferencingResult.dereferencingMetadata.error}`);
  }

  if (didUtils.isDwnDidService(dereferencingResult.contentStream)) {
    const { serviceEndpoint } = dereferencingResult.contentStream;
    const serviceEndpointUrls = typeof serviceEndpoint === 'string'
    // If the service endpoint is a string, format it as a single-element array.
      ? [serviceEndpoint]
      : Array.isArray(serviceEndpoint) && serviceEndpoint.every(endpoint => typeof endpoint === 'string')
      // If the service endpoint is an array of strings, use it as is.
        ? serviceEndpoint as string[]
        // If the service endpoint is neither a string nor an array of strings, return an empty array.
        : [];

    if (serviceEndpointUrls.length > 0) {
      return serviceEndpointUrls;
    }
  }

  throw new Error(`DID Service is missing or malformed: ${didUri}#dwn`);
}