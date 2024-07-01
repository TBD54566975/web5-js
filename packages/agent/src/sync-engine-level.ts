import type { ULIDFactory } from 'ulidx';
import type { AbstractBatchOperation, AbstractLevel } from 'abstract-level';
import type {
  GenericMessage,
  MessagesQueryReply,
  MessagesReadReply,
  PaginationCursor,
} from '@tbd54566975/dwn-sdk-js';

import ms from 'ms';
import { Level } from 'level';
import { monotonicFactory } from 'ulidx';
import { NodeStream } from '@web5/common';

import type { SyncEngine } from './types/sync.js';
import type { Web5PlatformAgent } from './types/agent.js';

import { DwnInterface } from './types/dwn.js';
import { getDwnServiceEndpointUrls, isRecordsWrite, webReadableToIsomorphicNodeReadable } from './utils.js';

export type SyncEngineLevelParams = {
  agent?: Web5PlatformAgent;
  dataPath?: string;
  db?: AbstractLevel<string | Buffer | Uint8Array>;
}

type LevelBatchOperation = AbstractBatchOperation<AbstractLevel<string | Buffer | Uint8Array>, string, string>;

type SyncDirection = 'push' | 'pull';

type SyncState = {
  did: string;
  dwnUrl: string;
  cursor?: PaginationCursor,
}

export class SyncEngineLevel implements SyncEngine {
  /**
   * Holds the instance of a `Web5PlatformAgent` that represents the current execution context for
   * the `SyncEngineLevel`. This agent is used to interact with other Web5 agent components. It's
   * vital to ensure this instance is set to correctly contextualize operations within the broader
   * Web5 Agent framework.
   */
  private _agent?: Web5PlatformAgent;

  private _db: AbstractLevel<string | Buffer | Uint8Array>;
  private _syncIntervalId?: ReturnType<typeof setInterval>;
  private _ulidFactory: ULIDFactory;

  constructor({ agent, dataPath, db }: SyncEngineLevelParams) {
    this._agent = agent;
    this._db = (db) ? db : new Level<string, string>(dataPath ?? 'DATA/AGENT/SYNC_STORE');
    this._ulidFactory = monotonicFactory();
  }

  /**
   * Retrieves the `Web5PlatformAgent` execution context.
   *
   * @returns The `Web5PlatformAgent` instance that represents the current execution context.
   * @throws Will throw an error if the `agent` instance property is undefined.
   */
  get agent(): Web5PlatformAgent {
    if (this._agent === undefined) {
      throw new Error('SyncEngineLevel: Unable to determine agent execution context.');
    }

    return this._agent;
  }

  set agent(agent: Web5PlatformAgent) {
    this._agent = agent;
  }

  public async clear(): Promise<void> {
    await this._db.clear();
  }

  public async close(): Promise<void> {
    await this._db.close();
  }

  public async pull(): Promise<void> {
    const syncPeerState = await this.getSyncPeerState({ syncDirection: 'pull' });
    await this.enqueueOperations({ syncDirection: 'pull', syncPeerState });

    const pullQueue = this.getPullQueue();
    const pullJobs = await pullQueue.iterator().all();

    const deleteOperations: LevelBatchOperation[] = [];
    const errored: Set<string> = new Set();

    for (let job of pullJobs) {
      const [key] = job;
      const [did, dwnUrl, _, messageCid] = key.split('~');

      // If a particular DWN service endpoint is unreachable, skip subsequent pull operations.
      if (errored.has(dwnUrl)) {
        continue;
      }

      const messageExists = await this.messageExists(did, messageCid);
      if (messageExists) {
        deleteOperations.push({ type: 'del', key: key });
        continue;
      }

      const messagesRead = await this.agent.dwn.createMessage({
        author        : did,
        messageType   : DwnInterface.MessagesRead,
        messageParams : {
          messageCid: messageCid
        }
      });

      let reply: MessagesReadReply;

      try {
        reply = await this.agent.rpc.sendDwnRequest({
          dwnUrl,
          targetDid : did,
          message   : messagesRead,
        }) as MessagesReadReply;
      } catch(e) {
        errored.add(dwnUrl);
        continue;
      }

      if (!reply.entry?.message) {
        await this.addMessage(did, messageCid);
        deleteOperations.push({ type: 'del', key: key });
        continue;
      }

      const replyEntry = reply.entry;

      if (isRecordsWrite(replyEntry) && replyEntry.data) {
        const message = replyEntry.message;
        let dataStream;
        if (replyEntry.data instanceof ReadableStream) {
          dataStream = webReadableToIsomorphicNodeReadable(replyEntry.data);
        }

        const pullReply = await this.agent.dwn.processMessage({
          targetDid: did,
          message,
          dataStream,
        });

        if (pullReply.status.code === 202 || pullReply.status.code === 409) {
          await this.addMessage(did, messageCid);
          deleteOperations.push({ type: 'del', key: key });
        }
      }
    }

    await pullQueue.batch(deleteOperations as any);
  }
  public async push(): Promise<void> {
    const syncPeerState = await this.getSyncPeerState({ syncDirection: 'push' });
    await this.enqueueOperations({ syncDirection: 'push', syncPeerState });

    const pushQueue = this.getPushQueue();
    const pushJobs = await pushQueue.iterator().all();

    const deleteOperations: LevelBatchOperation[] = [];
    const errored: Set<string> = new Set();

    for (let job of pushJobs) {
      const [key] = job;
      const [did, dwnUrl, _, messageCid] = key.split('~');

      // If a particular DWN service endpoint is unreachable, skip subsequent push operations.
      if (errored.has(dwnUrl)) {
        continue;
      }

      // Attempt to retrieve the message from the local DWN.
      const dwnMessage = await this.getDwnMessage({ author: did, messageCid });

      // If the message does not exist on the local DWN, remove the sync operation from the
      // push queue, update the push watermark for this DID/DWN endpoint combination, add the
      // message to the local message store, and continue to the next job.
      if (!dwnMessage) {
        deleteOperations.push({ type: 'del', key: key });
        await this.addMessage(did, messageCid);

        continue;
      }

      try {
        const reply = await this.agent.rpc.sendDwnRequest({
          dwnUrl,
          targetDid : did,
          data      : dwnMessage.data,
          message   : dwnMessage.message
        });

        // Update the watermark and add the messageCid to the Sync Message Store if either:
        // - 202: message was successfully written to the remote DWN
        // - 409: message was already present on the remote DWN
        if (reply.status.code === 202 || reply.status.code === 409) {
          await this.addMessage(did, messageCid);
          deleteOperations.push({ type: 'del', key: key });
        }
      } catch {
        // Error is intentionally ignored; 'errored' set is updated with 'dwnUrl'.
        errored.add(dwnUrl);
      }
    }

    await pushQueue.batch(deleteOperations as any);
  }

  public async registerIdentity({ did }: { did: string; }): Promise<void> {
    // Get a reference to the `registeredIdentities` sublevel.
    const registeredIdentities = this._db.sublevel('registeredIdentities');

    // Add (or overwrite, if present) the Identity's DID as a registered identity.
    await registeredIdentities.put(did, '');
  }

  public startSync({ interval }: {
    interval: string
  }): Promise<void> {
    // Convert the interval string to milliseconds.
    const intervalMilliseconds = ms(interval);

    return new Promise((resolve, reject) => {

      const intervalSync = async () => {
        if (this._syncIntervalId) {
          clearInterval(this._syncIntervalId);
        }

        try {
          await this.push();
          await this.pull();
        } catch (error: any) {
          this.stopSync();
          reject(error);
        }

        // then we start sync again
        this._syncIntervalId = setInterval(intervalSync, intervalMilliseconds);
      };

      this._syncIntervalId = setInterval(intervalSync, intervalMilliseconds);
    });
  }

  public stopSync(): void {
    if (this._syncIntervalId) {
      clearInterval(this._syncIntervalId);
      this._syncIntervalId = undefined;
    }
  }

  private async enqueueOperations({ syncDirection, syncPeerState }: {
    syncDirection: SyncDirection,
    syncPeerState: SyncState[]
  }) {
    for (let syncState of syncPeerState) {
      // Get the event log from the remote DWN if pull sync, or local DWN if push sync.
      const eventLog = await this.getDwnEventLog({
        did    : syncState.did,
        dwnUrl : syncState.dwnUrl,
        cursor : syncState.cursor,
        syncDirection
      });

      const syncOperations: LevelBatchOperation[] = [];

      for (let messageCid of eventLog) {
        const watermark = this._ulidFactory();
        // Use "did~dwnUrl~watermark~messageCid" as the key in the sync queue.
        // Note: It is critical that `watermark` precedes `messageCid` to ensure that when the sync
        //       jobs are pulled off the queue, they are lexographically sorted oldest to newest.
        const operationKey = [
          syncState.did,
          syncState.dwnUrl,
          watermark,
          messageCid
        ].join('~');

        syncOperations.push({ type: 'put', key: operationKey, value: '' });
      }

      if (syncOperations.length > 0) {
        const syncQueue = (syncDirection === 'pull')
          ? this.getPullQueue()
          : this.getPushQueue();
        await syncQueue.batch(syncOperations as any);
      }
    }
  }

  private async getDwnEventLog({ did, dwnUrl, syncDirection, cursor }: {
    did: string,
    dwnUrl: string,
    syncDirection: SyncDirection,
    cursor?: PaginationCursor
  }) {
    let messagesReply = {} as MessagesQueryReply;

    if (syncDirection === 'pull') {
      // When sync is a pull, get the event log from the remote DWN.
      const messagesReadMessage = await this.agent.dwn.createMessage({
        author        : did,
        messageType   : DwnInterface.MessagesQuery,
        messageParams : { filters: [], cursor }
      });

      try {
        messagesReply = await this.agent.rpc.sendDwnRequest({
          dwnUrl    : dwnUrl,
          targetDid : did,
          message   : messagesReadMessage
        }) as MessagesQueryReply;
      } catch {
        // If a particular DWN service endpoint is unreachable, silently ignore.
      }

    } else if (syncDirection === 'push') {
      // When sync is a push, get the event log from the local DWN.
      const messagesReadDwnResponse = await this.agent.dwn.processRequest({
        author        : did,
        target        : did,
        messageType   : DwnInterface.MessagesQuery,
        messageParams : { filters: [], cursor }
      });
      messagesReply = messagesReadDwnResponse.reply as MessagesQueryReply;
    }

    const eventLog = messagesReply.entries ?? [];
    if (messagesReply.cursor) {
      this.setCursor(did, dwnUrl, syncDirection, messagesReply.cursor);
    }

    return eventLog;
  }

  private async getDwnMessage({ author, messageCid }: {
    author: string;
    messageCid: string;
  }): Promise<{ message: GenericMessage, data?: Blob } | undefined> {
    let { reply } = await this.agent.dwn.processRequest({
      author        : author,
      target        : author,
      messageType   : DwnInterface.MessagesRead,
      messageParams : {
        messageCid: messageCid
      }
    });



    // Absence of a messageEntry or message within messageEntry can happen because updating a
    // Record creates another RecordsWrite with the same recordId. Only the first and
    // most recent RecordsWrite messages are kept for a given recordId. Any RecordsWrite messages
    // that aren't the first or most recent are discarded by the DWN.
    if (reply.status.code !== 200 || !reply.entry) {
      return undefined;
    }
    const messageEntry = reply.entry;
    if (!messageEntry) {
      return undefined;
    }

    let dwnMessageWithBlob: { message: GenericMessage, data?: Blob } = { message: messageEntry.message };

    // If the message is a RecordsWrite, either data will be present,
    // OR we have to fetch it using a RecordsRead.
    if (isRecordsWrite(messageEntry) && messageEntry.data) {
      dwnMessageWithBlob.data = new Blob([await NodeStream.consumeToBytes({ readable: messageEntry.data })], { type: messageEntry.message.descriptor.dataFormat });
    }

    return dwnMessageWithBlob;
  }

  private async getSyncPeerState({ syncDirection }: {
    syncDirection: SyncDirection
  }): Promise<SyncState[]> {
    // Get a list of the DIDs of all registered identities.
    const registeredIdentities = await this._db.sublevel('registeredIdentities').keys().all();

    // Array to accumulate the list of sync peers for each DID.
    const syncPeerState: SyncState[] = [];

    for (let did of registeredIdentities) {
      // First, confirm the DID can be resolved and extract the DWN service endpoint URLs.
      const dwnEndpointUrls = await getDwnServiceEndpointUrls(did, this.agent.did);
      if (dwnEndpointUrls.length === 0) {
        // Silently ignore and do not try to perform Sync for any DID that does not have a DWN
        // service endpoint published in its DID document.
        continue;
      }

      // Get the cursor (or undefined) for each (DID, DWN service endpoint, sync direction)
      // combination and add it to the sync peer state array.
      for (let dwnUrl of dwnEndpointUrls) {
        const cursor = await this.getCursor(did, dwnUrl, syncDirection);
        syncPeerState.push({ did, dwnUrl, cursor});
      }
    }

    return syncPeerState;
  }

  private async getCursor(did: string, dwnUrl: string, direction: SyncDirection): Promise<PaginationCursor | undefined> {
    const cursorKey = `${did}~${dwnUrl}~${direction}`;
    const cursorsStore = this.getCursorStore();
    try {
      const cursorValue = await cursorsStore.get(cursorKey);
      if (cursorValue) {
        return JSON.parse(cursorValue) as PaginationCursor;
      }
    } catch(error: any) {
      // Don't throw when a key wasn't found.
      if (error.notFound) {
        return undefined;
      }
    }
  }

  private async setCursor(did: string, dwnUrl: string, direction: SyncDirection, cursor: PaginationCursor) {
    const cursorKey = `${did}~${dwnUrl}~${direction}`;
    const cursorsStore = this.getCursorStore();
    await cursorsStore.put(cursorKey, JSON.stringify(cursor));
  }

  /**
   * The message store is used to prevent "echoes" that occur during a sync pull operation.
   * After a message is confirmed to already be synchronized on the local DWN, its CID is added
   * to the message store to ensure that any subsequent pull attempts are skipped.
   */
  private async messageExists(did: string, messageCid: string) {
    const messageStore = this.getMessageStore(did);

    // If the `messageCid` exists in this DID's store, return true. Otherwise, return false.
    try {
      await messageStore.get(messageCid);
      return true;
    } catch (error: any) {
      if (error.notFound) {
        return false;
      }
      throw error;
    }
  }

  private async addMessage(did: string, messageCid: string) {
    const messageStore = this.getMessageStore(did);

    return await messageStore.put(messageCid, '');
  }

  private getMessageStore(did: string) {
    return this._db.sublevel('history').sublevel(did).sublevel('messages');
  }

  private getCursorStore() {
    return this._db.sublevel('cursors');
  }

  private getPushQueue() {
    return this._db.sublevel('pushQueue');
  }

  private getPullQueue() {
    return this._db.sublevel('pullQueue');
  }
}