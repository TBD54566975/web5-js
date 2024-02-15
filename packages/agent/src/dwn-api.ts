import type { Readable } from '@web5/common';
import type { Signer as DwnSigner, RecordsWrite } from '@tbd54566975/dwn-sdk-js';

import { DidResolver } from '@web5/dids';
import { Cid, Dwn, DwnInterfaceName, DwnMethodName, Message } from '@tbd54566975/dwn-sdk-js';

import type { Web5ManagedAgent } from './types/agent.js';
import type { DwnMessage, DwnMessageReply, DwnMessageWithData, DwnResponse, ProcessDwnRequest } from './types/agent-dwn.js';

import { DwnInterface, dwnMessageConstructors } from './types/agent-dwn.js';
import { blobToIsomorphicNodeReadable, webReadableToIsomorphicNodeReadable } from './utils.js';
import { getSigningAlgorithmFromPublicKey } from './temp/add-to-crypto.js';

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
    if (this.agent.agentDid && author === this.agent.agentDid.uri) {
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
}