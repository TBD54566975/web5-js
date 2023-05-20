import type { DwnRpc } from '@tbd54566975/web5-agent';
import type { BatchOperation } from 'level';
import type { DwnServiceEndpoint, DidResolver } from '@tbd54566975/dids';
import type {
  Dwn,
  EventsGetReply,
  MessagesGetReply,
  SignatureInput,
  RecordsWriteMessage,
  RecordsReadReply,
  PrivateJwk as DwnPrivateKeyJwk,
  Event,
} from '@tbd54566975/dwn-sdk-js';

import type { ProfileManager } from './profile-manager.js';

import { Level } from 'level';
import { utils as didUtils } from '@tbd54566975/dids';
import { DataStream, EventsGet, MessagesGet, Encoder, RecordsRead } from '@tbd54566975/dwn-sdk-js';


import { SyncManager } from './sync-manager.js';
import { DwnRpcClient } from './dwn-rpc-client.js';
import { webReadableToIsomorphicNodeReadable } from './utils.js';

export type SyncApiOptions = {
  dwn: Dwn;
  didResolver: DidResolver;
  profileManager: ProfileManager;
  storeLocation?: string;
};

type Direction = 'push' | 'pull';

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

export class SyncApi implements SyncManager {
  #db: Level;
  #dwn: Dwn;
  #didResolver: DidResolver;
  #profileManager: ProfileManager;
  #dwnRpcClient: DwnRpc;

  static #defaultOptions = {
    storeLocation: 'data/agent/sync-store',
  };

  constructor(options: SyncApiOptions) {
    options = { ...SyncApi.#defaultOptions, ...options };
    this.#dwn = options.dwn;
    this.#didResolver = options.didResolver;
    this.#profileManager = options.profileManager;

    this.#db = new Level(options.storeLocation);
    this.#dwnRpcClient = new DwnRpcClient();
  }

  async clear() {
    return this.#db.clear();
  }

  async registerProfile(did: string): Promise<void> {
    const registeredProfiles = this.#db.sublevel('registeredProfiles');

    await registeredProfiles.put(did, '');
  }

  async enqueuePush() {
    const profileDids = await this.#db.sublevel('registeredProfiles').keys().all();
    const syncStates: SyncState[] = [];

    for (let did of profileDids) {
      // TODO: try/catch
      const { didDocument } = await this.#didResolver.resolve(did);
      const [ service ] = didUtils.getServices(didDocument, { id: '#dwn', type: 'DecentralizedWebNode' });

      // did has no dwn service endpoints listed in DID Doc. ignore
      if (!service) {
        continue;
      }

      const { nodes } = <DwnServiceEndpoint>service.serviceEndpoint;

      for (let node of nodes) {
        const watermark = await this.getWatermark(did, node, 'push');
        syncStates.push({ did, dwnUrl: node, watermark });
      }
    }

    for (let syncState of syncStates) {
      const signatureInput = await this.#getAuthorSignatureInput(syncState.did);
      const eventsGet = await EventsGet.create({
        watermark                   : syncState.watermark,
        authorizationSignatureInput : signatureInput
      });

      const eventsReply = await this.#dwn.processMessage(syncState.did, eventsGet.toJSON()) as EventsGetReply;
      const putOps: DbBatchOperation[] = [];

      for (let event of eventsReply.events) {
        const pushKey = `${syncState.did}~${syncState.dwnUrl}~${event.messageCid}`;
        const putOp: DbBatchOperation = { type: 'put', key: pushKey, value: event.watermark };

        putOps.push(putOp);
      }

      const pushQueue = this.#getPushQueue();
      await pushQueue.batch(putOps as any);
    }
  }

  async getEvents(did: string, watermark: string | undefined, dwnUrl: string) {
    const signatureInput = await this.#getAuthorSignatureInput(did);
    const eventsGet = await EventsGet.create({
      watermark                   : watermark,
      authorizationSignatureInput : signatureInput
    });

    let events: Event[];
    if (dwnUrl === 'local') {
      const reply = await this.#dwn.processMessage(did, eventsGet.toJSON()) as EventsGetReply;
      ({ events } = reply);
    } else {
      const reply = await this.#dwnRpcClient.sendDwnRequest({
        dwnUrl,
        targetDid : did,
        message   : eventsGet
      }) as EventsGetReply;

      ({ events } = reply);
    }

    return events;
  }

  async push() {
    await this.enqueuePush();

    const pushQueue = this.#getPushQueue();
    const pushJobs = await pushQueue.iterator().all();

    const delOps: DbBatchOperation[] = [];

    for (let job of pushJobs) {
      const [key, watermark] = job;
      const [did, dwnUrl, messageCid] = key.split('~');

      const dwnMessage = await this.#getDwnMessage(did, messageCid);
      const reply = await this.#dwnRpcClient.sendDwnRequest({
        dwnUrl,
        targetDid : did,
        data      : dwnMessage.data,
        message   : dwnMessage.message
      });

      if (reply.status.code === 202) {
        delOps.push({ type: 'del', key: key });
        await this.setWatermark(did, dwnUrl, 'push', watermark);
        await this.#addMessage(did, messageCid);
      }
    }

    await pushQueue.batch(delOps as any);
  }

  async enqueuePull() {
    await this.enqueuePull();

    const profileDids = await this.#db.sublevel('registeredProfiles').keys().all();
    const syncStates: SyncState[] = [];

    for (let did of profileDids) {
      // TODO: try/catch
      const { didDocument } = await this.#didResolver.resolve(did);
      const [ service ] = didUtils.getServices(didDocument, { id: '#dwn', type: 'DecentralizedWebNode' });

      // did has no dwn service endpoints listed in DID Doc. ignore
      if (!service) {
        continue;
      }

      const { nodes } = <DwnServiceEndpoint>service.serviceEndpoint;
      for (let node of nodes) {
        const watermark = await this.getWatermark(did, node, 'pull');
        syncStates.push({ did, dwnUrl: node, watermark });
      }
    }

    const pullOps: DbBatchOperation[] = [];

    for (let syncState of syncStates) {
      const signatureInput = await this.#getAuthorSignatureInput(syncState.did);
      const eventsGet = await EventsGet.create({
        watermark                   : syncState.watermark,
        authorizationSignatureInput : signatureInput
      });

      let reply: EventsGetReply;

      try {
        reply = await this.#dwnRpcClient.sendDwnRequest({
          dwnUrl    : syncState.dwnUrl,
          targetDid : syncState.did,
          message   : eventsGet
        }) as EventsGetReply;
      } catch(e) {
        continue;
      }

      for (let event of reply.events) {
        const pullKey = `${syncState.did}~${syncState.dwnUrl}~${event.messageCid}`;
        const pullOp: DbBatchOperation = { type: 'put', key: pullKey, value: event.watermark };

        pullOps.push(pullOp);
      }

      if (pullOps.length > 0) {
        const pullQueue = this.#getPullQueue();
        pullQueue.batch(pullOps as any);
      }
    }
  }

  async pull() {
    const pullQueue = this.#getPullQueue();
    const pullJobs = await pullQueue.iterator().all();
    const delOps: DbBatchOperation[] = [];

    for (let job of pullJobs) {
      const [key, watermark] = job;
      const [did, dwnUrl, messageCid] = key.split('~');

      const messageExists = await this.#messageExists(did, messageCid);
      if (messageExists) {
        await this.setWatermark(did, dwnUrl, 'pull', watermark);
        delOps.push({ type: 'del', key });

        continue;
      }

      const signatureInput = await this.#getAuthorSignatureInput(did);
      const messagesGet = await MessagesGet.create({
        messageCids                 : [messageCid],
        authorizationSignatureInput : signatureInput
      });

      const reply = await this.#dwnRpcClient.sendDwnRequest({
        dwnUrl,
        targetDid : did,
        message   : messagesGet
      }) as MessagesGetReply;

      for (let entry of reply.messages) {
        // TODO: check entry.error
        const messageType = this.#getDwnMessageType(entry.message);
        let dataStream;

        if (messageType === 'RecordsWrite') {
          const { encodedData } = entry;
          const message = entry.message as RecordsWriteMessage;

          if (encodedData) {
            const dataBytes = Encoder.base64UrlToBytes(encodedData);
            dataStream = DataStream.fromBytes(dataBytes);
          } else {
            const recordsRead = await RecordsRead.create({
              authorizationSignatureInput : signatureInput,
              recordId                    : message['recordId']
            });

            const recordsReadReply = await this.#dwnRpcClient.sendDwnRequest({
              targetDid : did,
              dwnUrl,
              message   : recordsRead
            }) as RecordsReadReply;

            if (reply.status.code >= 400) {
              // TODO: handle reply
              const pruneReply = await this.#dwn.synchronizePrunedInitialRecordsWrite(did, message);
            } else {
              dataStream = webReadableToIsomorphicNodeReadable(recordsReadReply.record.data as any);
            }
          }
        }

        const pullReply = await this.#dwn.processMessage(did, entry.message, dataStream);

        if (pullReply.status.code === 202) {
          await this.setWatermark(did, dwnUrl, 'pull', watermark);
          await this.#addMessage(did, messageCid);
          delOps.push({ type: 'del', key });
        }
      }
    }

    await pullQueue.batch(delOps as any);
  }

  async #getDwnMessage(author: string, messageCid: string): Promise<DwnMessage> {
    const dwnSignatureInput = await this.#getAuthorSignatureInput(author);
    const messagesGet = await MessagesGet.create({
      authorizationSignatureInput : dwnSignatureInput,
      messageCids                 : [messageCid]
    });

    const result: MessagesGetReply = await this.#dwn.processMessage(author, messagesGet.toJSON());
    const [ messageEntry ] = result.messages;

    if (!messageEntry) {
      throw new Error('TODO: figure out error message');
    }

    let { message } = messageEntry;
    if (!message) {
      throw new Error('TODO: message not found');
    }

    let dwnMessage: DwnMessage = { message };
    const messageType = `${message.descriptor.interface}${message.descriptor.method}`;

    // if the message is a RecordsWrite, either data will be present, OR we have to get it using a RecordsRead
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

        const reply = await this.#dwn.processMessage(author, recordsRead.toJSON()) as RecordsReadReply;

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

  /**
   * constructs signature input required to sign DWeb Messages
   * @param authorDid
   * @returns {SignatureInput}
   */
  async #getAuthorSignatureInput(authorDid: string): Promise<SignatureInput> {
    const profile = await this.#profileManager.getProfile(authorDid);

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

  async getWatermark(did: string, dwnUrl: string, direction: Direction) {
    const wmKey = `${did}~${dwnUrl}~${direction}`;
    const watermarkStore = this.#getWatermarkStore();

    try {
      return await watermarkStore.get(wmKey);
    } catch (e) {
      if (e.code === 'LEVEL_NOT_FOUND') {
        return undefined;
      }
    }
  }

  async setWatermark(did: string, dwnUrl: string, direction: Direction, watermark: string) {
    const wmKey = `${did}~${dwnUrl}~${direction}`;
    const watermarkStore = this.#getWatermarkStore();

    return watermarkStore.put(wmKey, watermark);
  }

  async #messageExists(did: string, messageCid: string) {
    const messageStore = this.#getMessageStore(did);
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

  async #addMessage(did: string, messageCid: string) {
    const messageStore = this.#getMessageStore(did);

    return messageStore.put(messageCid, '');
  }

  #getMessageStore(did: string) {
    return this.#db.sublevel('history').sublevel(did).sublevel('messages');
  }

  #getWatermarkStore() {
    return this.#db.sublevel('watermarks');
  }

  #getPushQueue() {
    return this.#db.sublevel('pushQueue');
  }

  #getPullQueue() {
    return this.#db.sublevel('pullQueue');
  }

  // TODO: export BaseMessage from dwn-sdk.
  #getDwnMessageType(message: any) {
    return `${message.descriptor.interface}${message.descriptor.method}`;
  }
}