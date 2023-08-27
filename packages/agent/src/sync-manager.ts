import type { BatchOperation } from 'level';
import type {
  EventsGetReply,
  SignatureInput,
  MessagesGetReply,
  RecordsReadReply,
  RecordsWriteMessage,
  PrivateJwk as DwnPrivateKeyJwk,
} from '@tbd54566975/dwn-sdk-js';

import { Level } from 'level';
import { Convert } from '@web5/common';
import { utils as didUtils } from '@web5/dids';
import { DataStream } from '@tbd54566975/dwn-sdk-js';

import type { Web5ManagedAgent } from './types/agent.js';

export interface SyncManager {
  registerIdentity(options: { did: string }): Promise<void>;
  push(): Promise<void>;
  pull(): Promise<void>;
}

export type SyncManagerOptions = {
  agent: Web5ManagedAgent;
  dataPath?: string;
};

type SyncDirection = 'push' | 'pull';

type SyncState = {
  did: string;
  dwnUrl: string;
  watermark: string | undefined;
}

type DwnMessage = {
  message: any;
  data?: Blob;
}

type DbBatchOperation = BatchOperation<Level, string, string>;

const is2xx = (code: number) => code >= 200 && code <= 299;
const is4xx = (code: number) => code >= 400 && code <= 499;
// const is5xx = (code: number) => code >= 500 && code <= 599;

export class SyncManagerLevel implements SyncManager {
  /**
   * Holds the instance of a `Web5ManagedAgent` that represents the current
   * execution context for the `KeyManager`. This agent is utilized
   * to interact with other Web5 agent components. It's vital
   * to ensure this instance is set to correctly contextualize
   * operations within the broader Web5 agent framework.
   */
  private _agent?: Web5ManagedAgent;
  private _db: Level;

  constructor(options?: SyncManagerOptions) {
    let { agent, dataPath = 'DATA/AGENT/SYNC_STORE' } = options ?? {};

    this._agent = agent;
    this._db = new Level(dataPath);
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

  public async clear(): Promise<void> {
    await this._db.clear();
  }

  public async enqueuePush(): Promise<void> {
    const registeredIdentities = await this._db.sublevel('registeredIdentities').keys().all();
    const syncStates: SyncState[] = [];

    for (let did of registeredIdentities) {
      const { didDocument, didResolutionMetadata } = await this.agent.didResolver.resolve(did);
      if (!didDocument) {
        const errorCode = `${didResolutionMetadata?.error}: ` ?? '';
        const defaultMessage = `Unable to resolve DID: ${did}`;
        const errorMessage = didResolutionMetadata?.errorMessage ?? defaultMessage;
        throw new Error(`SyncManager: ${errorCode}${errorMessage}`);
      }

      const [ service ] = didUtils.getServices({ didDocument, id: '#dwn' });

      /** Silently ignore and do not try to perform Sync for any DID that does not have a DWN
       * service endpoint published in its DID document. **/
      if (!service) {
        continue;
      }

      if (!didUtils.isDwnServiceEndpoint(service.serviceEndpoint)) {
        throw new Error(`SyncManager: Malformed '#dwn' service endpoint. Expected array of node addresses.`);
      }

      const dwnEndpointUrls = service.serviceEndpoint.nodes;

      for (let dwnUrl of dwnEndpointUrls) {
        const watermark = await this.getWatermark(did, dwnUrl, 'push');
        syncStates.push({ did, dwnUrl, watermark });
      }
    }

    for (let syncState of syncStates) {
      let agentResponse = await this.agent.dwnManager.processRequest({
        author         : syncState.did,
        target         : syncState.did,
        messageType    : 'EventsGet',
        messageOptions : {
          watermark: syncState.watermark
        }
      });

      const eventsReply = agentResponse.reply as EventsGetReply;
      const putOps: DbBatchOperation[] = [];

      for (let event of eventsReply.events ?? []) {
        const pushKey = `${syncState.did}~${syncState.dwnUrl}~${event.messageCid}`;
        const putOp: DbBatchOperation = { type: 'put', key: pushKey, value: event.watermark };

        putOps.push(putOp);
      }

      const pushQueue = this.getPushQueue();
      await pushQueue.batch(putOps as any);
    }
  }

  // async getEvents(did: string, watermark: string | undefined, dwnUrl: string) {
  //   const signatureInput = await this.getAuthorSignatureInput(did);
  //   const eventsGet = await EventsGet.create({
  //     watermark                   : watermark,
  //     authorizationSignatureInput : signatureInput
  //   });

  //   let events: Event[];
  //   if (dwnUrl === 'local') {
  //     const reply = await this.dwn.processMessage(did, eventsGet.toJSON()) as EventsGetReply;
  //     ({ events } = reply);
  //   } else {
  //     const reply = await this.dwnRpcClient.sendDwnRequest({
  //       dwnUrl,
  //       targetDid : did,
  //       message   : eventsGet
  //     }) as EventsGetReply;

  //     ({ events } = reply);
  //   }

  //   return events;
  // }

  public async push(): Promise<void> {
    await this.enqueuePush();

    const pushQueue = this.getPushQueue();
    const pushJobs = await pushQueue.iterator().all();
    const errored: Set<string> = new Set();

    const delOps: DbBatchOperation[] = [];

    for (let job of pushJobs) {
      const [key, watermark] = job;
      const [did, dwnUrl, messageCid] = key.split('~');

      if (errored.has(dwnUrl)) {
        continue;
      }

      const dwnMessage = await this.getDwnMessage(did, messageCid);
      if (!dwnMessage) {
        delOps.push({ type: 'del', key: key });
        await this.setWatermark(did, dwnUrl, 'push', watermark);
        await this.addMessage(did, messageCid);

        continue;
      }

      try {
        const reply = await this.agent.rpcClient.sendDwnRequest({
          dwnUrl,
          targetDid : did,
          data      : dwnMessage.data,
          message   : dwnMessage.message
        });

        if (reply.status.code === 202 || reply.status.code === 409) {
          delOps.push({ type: 'del', key: key });
          await this.setWatermark(did, dwnUrl, 'push', watermark);
          await this.addMessage(did, messageCid);
        }
      } catch {
        // Error is intentionally ignored; 'errored' set is updated with 'dwnUrl'.
        errored.add(dwnUrl);
      }
    }

    await pushQueue.batch(delOps as any);
  }

  // async enqueuePull() {
  //   const registeredIdentities = await this._db.sublevel('registeredIdentities').keys().all();
  //   const syncStates: SyncState[] = [];

  //   for (let did of registeredIdentities) {
  //     // TODO: try/catch
  //     const { didDocument } = await this.didResolver.resolve(did);
  //     const [ service ] = didUtils.getServices(didDocument, { id: '#dwn', type: 'DecentralizedWebNode' });

  //     if (!didUtils.isDwnServiceEndpoint(didDwnService.serviceEndpoint)) throw Error('Type guard');

  //     // did has no dwn service endpoints listed in DID Doc. ignore
  //     if (!service) {
  //       continue;
  //     }

  //     const { nodes } = <DwnServiceEndpoint>service.serviceEndpoint;
  //     for (let node of nodes) {
  //       const watermark = await this.getWatermark(did, node, 'pull');
  //       syncStates.push({ did, dwnUrl: node, watermark });
  //     }
  //   }

  //   const pullOps: DbBatchOperation[] = [];

  //   for (let syncState of syncStates) {
  //     const signatureInput = await this.getAuthorSignatureInput(syncState.did);
  //     const eventsGet = await EventsGet.create({
  //       watermark                   : syncState.watermark,
  //       authorizationSignatureInput : signatureInput
  //     });

  //     let reply: EventsGetReply;

  //     try {
  //       reply = await this.dwnRpcClient.sendDwnRequest({
  //         dwnUrl    : syncState.dwnUrl,
  //         targetDid : syncState.did,
  //         message   : eventsGet
  //       }) as EventsGetReply;
  //     } catch(e) {
  //       continue;
  //     }

  //     for (let event of reply.events) {
  //       const pullKey = `${syncState.did}~${syncState.dwnUrl}~${event.messageCid}`;
  //       const pullOp: DbBatchOperation = { type: 'put', key: pullKey, value: event.watermark };

  //       pullOps.push(pullOp);
  //     }

  //     if (pullOps.length > 0) {
  //       const pullQueue = this.getPullQueue();
  //       pullQueue.batch(pullOps as any);
  //     }
  //   }
  // }

  async pull() {
  //   await this.enqueuePull();

    //   const pullQueue = this.getPullQueue();
    //   const pullJobs = await pullQueue.iterator().all();
    //   const delOps: DbBatchOperation[] = [];
    //   const errored: Set<string> = new Set();

    //   for (let job of pullJobs) {
    //     const [key, watermark] = job;
    //     const [did, dwnUrl, messageCid] = key.split('~');

    //     if (errored.has(dwnUrl)) {
    //       continue;
    //     }

    //     const messageExists = await this.messageExists(did, messageCid);
    //     if (messageExists) {
    //       await this.setWatermark(did, dwnUrl, 'pull', watermark);
    //       delOps.push({ type: 'del', key });

    //       continue;
    //     }

    //     const signatureInput = await this.getAuthorSignatureInput(did);
    //     const messagesGet = await MessagesGet.create({
    //       messageCids                 : [messageCid],
    //       authorizationSignatureInput : signatureInput
    //     });

    //     let reply: MessagesGetReply;

    //     try {
    //       reply = await this.dwnRpcClient.sendDwnRequest({
    //         dwnUrl,
    //         targetDid : did,
    //         message   : messagesGet
    //       }) as MessagesGetReply;
    //     } catch(e) {
    //       errored.add(dwnUrl);
    //       continue;
    //     }

    //     for (let entry of reply.messages) {
    //       if (entry.error || !entry.message) {
    //         console.warn(`message ${messageCid} not found. entry: ${JSON.stringify(entry, null, 2)} ignoring..`);

    //         await this.setWatermark(did, dwnUrl, 'pull', watermark);
    //         await this.addMessage(did, messageCid);
    //         delOps.push({ type: 'del', key });

    //         continue;
    //       }

    //       const messageType = this.getDwnMessageType(entry.message);
    //       let dataStream;

    //       if (messageType === 'RecordsWrite') {
    //         const { encodedData } = entry;
    //         const message = entry.message as RecordsWriteMessage;

    //         if (encodedData) {
    //           const dataBytes = Encoder.base64UrlToBytes(encodedData);
    //           dataStream = DataStream.fromBytes(dataBytes);
    //         } else {
    //           const recordsRead = await RecordsRead.create({
    //             authorizationSignatureInput : signatureInput,
    //             recordId                    : message['recordId']
    //           });

    //           const recordsReadReply = await this.dwnRpcClient.sendDwnRequest({
    //             targetDid : did,
    //             dwnUrl,
    //             message   : recordsRead
    //           }) as RecordsReadReply;

    //           if (recordsReadReply.status.code >= 400) {
    //             const pruneReply = await this.dwn.synchronizePrunedInitialRecordsWrite(did, message);

    //             if (pruneReply.status.code === 202 || pruneReply.status.code === 409) {
    //               await this.setWatermark(did, dwnUrl, 'pull', watermark);
    //               await this.addMessage(did, messageCid);
    //               delOps.push({ type: 'del', key });

    //               continue;
    //             } else {
    //               throw new Error(`Failed to sync tombstone. message cid: ${messageCid}`);
    //             }
    //           } else {
    //             dataStream = webReadableToIsomorphicNodeReadable(recordsReadReply.record.data as any);
    //           }
    //         }
    //       }

    //       const pullReply = await this.dwn.processMessage(did, entry.message, dataStream);

    //       if (pullReply.status.code === 202 || pullReply.status.code === 409) {
    //         await this.setWatermark(did, dwnUrl, 'pull', watermark);
    //         await this.addMessage(did, messageCid);
    //         delOps.push({ type: 'del', key });
    //       }
    //     }
    //   }

  //   await pullQueue.batch(delOps as any);
  }

  public async registerIdentity(options: {
    did: string
  }): Promise<void> {
    const { did } = options;

    const registeredIdentities = this._db.sublevel('registeredIdentities');

    await registeredIdentities.put(did, '');
  }

  private async getDwnMessage(
    author: string,
    messageCid: string
  ): Promise<DwnMessage | undefined> {
    let messagesGetResponse = await this.agent.dwnManager.processRequest({
      author         : author,
      target         : author,
      messageType    : 'MessagesGet',
      messageOptions : {
        messageCids: [messageCid]
      }
    });

    const reply: MessagesGetReply = messagesGetResponse.reply;

    /** Absence of a messageEntry or message within messageEntry can happen because updating a
     * Record creates another RecordsWrite with the same recordId. Only the first and
     * most recent RecordsWrite messages are kept for a given recordId. Any RecordsWrite messages
     * that aren't the first or most recent are discarded by the DWN. */
    if (!(reply.messages && reply.messages.length === 1)) {
      return undefined;
    }

    const [ messageEntry ] = reply.messages;

    let { message } = messageEntry;
    if (!message) {
      return undefined;
    }

    let dwnMessage: DwnMessage = { message };
    const messageType = `${message.descriptor.interface}${message.descriptor.method}`;

    // if the message is a RecordsWrite, either data will be present, OR we have to get it using a RecordsRead
    if (messageType === 'RecordsWrite') {
      const { encodedData } = messageEntry;
      const writeMessage = message as RecordsWriteMessage;

      if (encodedData) {
        const dataBytes = Convert.base64Url(encodedData).toUint8Array();
        dwnMessage.data = new Blob([dataBytes]);
      } else {
        let readResponse = await this.agent.dwnManager.processRequest({
          author         : author,
          target         : author,
          messageType    : 'RecordsRead',
          messageOptions : {
            recordId: writeMessage.recordId
          }
        });
        const reply = readResponse.reply as RecordsReadReply;

        if (is2xx(reply.status.code) && reply.record) {
          // If status code is 200-299, return the data.
          const dataBytes = await DataStream.toBytes(reply.record.data);
          dwnMessage.data = new Blob([dataBytes]);

        } else if (is4xx(reply.status.code)) {
          /** If status code is 400-499, typically 404 indicating the data no longer exists, it is
           * likely that a `RecordsDelete` took place. `RecordsDelete` keeps a `RecordsWrite` and
           * deletes the associated data, effectively acting as a "tombstone."  Sync still needs to
           * _push_ this tombstone so that the `RecordsDelete` can be processed successfully. */

        } else {
          // If status code is anything else (likely 5xx), throw an error.
          const { status } = reply;
          throw new Error(`SyncManager: Failed to read data associated with record ${writeMessage.recordId}. (${status.code}) ${status.detail}}`);
        }
      }
    }

    return dwnMessage;
  }

  // /**
  //  * constructs signature input required to sign DWeb Messages
  //  * @param authorDid
  //  * @returns {SignatureInput}
  //  */
  // async getAuthorSignatureInput(authorDid: string): Promise<SignatureInput> {
  //   const profile = await this.profileManager.getProfile(authorDid);

  //   if (!profile) {
  //     throw new Error('profile not found for author.');
  //   }

  //   const { keys } = profile.did;
  //   const [ key ] = keys;
  //   const { privateKeyJwk } = key;

  //   // TODO: make far less naive
  //   const kidFragment = privateKeyJwk.kid || key.id;
  //   const kid = `${profile.did.id}#${kidFragment}`;

  //   const dwnSignatureInput: SignatureInput = {
  //     privateJwk      : <DwnPrivateKeyJwk>privateKeyJwk,
  //     protectedHeader : { alg: privateKeyJwk.crv, kid }
  //   };

  //   return dwnSignatureInput;
  // }

  private async getWatermark(did: string, dwnUrl: string, direction: SyncDirection) {
    const wmKey = `${did}~${dwnUrl}~${direction}`;
    const watermarkStore = this.getWatermarkStore();

    try {
      return await watermarkStore.get(wmKey);
    } catch(error: any) {
      // Don't throw when a key wasn't found.
      if (error.code === 'LEVEL_NOT_FOUND') {
        return undefined;
      }
    }
  }

  private async setWatermark(did: string, dwnUrl: string, direction: SyncDirection, watermark: string) {
    const wmKey = `${did}~${dwnUrl}~${direction}`;
    const watermarkStore = this.getWatermarkStore();

    return watermarkStore.put(wmKey, watermark);
  }

  private async messageExists(did: string, messageCid: string) {
    const messageStore = this.getMessageStore(did);
    const hashedKey = new Set([messageCid]);

    const itr = messageStore.keys({ lte: messageCid, limit: 1 });
    for await (let key of itr) {
      if (hashedKey.has(key)) {
        return true;
      } else {
        return false;
      }
    }
  }

  private async addMessage(did: string, messageCid: string) {
    const messageStore = this.getMessageStore(did);

    return messageStore.put(messageCid, '');
  }

  private getMessageStore(did: string) {
    return this._db.sublevel('history').sublevel(did).sublevel('messages');
  }

  private getWatermarkStore() {
    return this._db.sublevel('watermarks');
  }

  private getPushQueue() {
    return this._db.sublevel('pushQueue');
  }

  private getPullQueue() {
    return this._db.sublevel('pullQueue');
  }

  // TODO: export BaseMessage from dwn-sdk.
  private getDwnMessageType(message: any) {
    return `${message.descriptor.interface}${message.descriptor.method}`;
  }














  /**
   * TEMPORARY
   * REMOVE ONCE SYNC MANAGER IS REFACTORED TO USE DWNMANAGER
   */
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
}