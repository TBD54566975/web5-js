import type { ULIDFactory } from 'ulidx';
import type { AbstractBatchOperation, AbstractLevel } from 'abstract-level';
import type {
  GenericMessage,
  MessagesQueryReply,
  MessagesReadReply,
  PaginationCursor,
  UnionMessageReply,
} from '@tbd54566975/dwn-sdk-js';

import ms from 'ms';
import { Level } from 'level';
import { monotonicFactory } from 'ulidx';
import { NodeStream } from '@web5/common';
import {
  DwnInterfaceName,
  DwnMethodName,
} from '@tbd54566975/dwn-sdk-js';

import type { SyncEngine, SyncIdentityOptions } from './types/sync.js';
import type { Web5PlatformAgent } from './types/agent.js';

import { DwnInterface, DwnMessagesPermissionScope } from './types/dwn.js';
import { getDwnServiceEndpointUrls, isRecordsWrite } from './utils.js';
import { AgentPermissionsApi } from './permissions-api.js';

export type SyncEngineLevelParams = {
  agent?: Web5PlatformAgent;
  dataPath?: string;
  db?: AbstractLevel<string | Buffer | Uint8Array>;
}

type LevelBatchOperation = AbstractBatchOperation<AbstractLevel<string | Buffer | Uint8Array>, string, string>;

type SyncDirection = 'push' | 'pull';

type SyncState = {
  did: string;
  delegateDid?: string;
  dwnUrl: string;
  cursor?: PaginationCursor,
  protocol?: string;
}

type SyncMessageParams = {
  did: string;
  messageCid: string;
  watermark: string;
  dwnUrl: string;
  delegateDid?: string;
  cursor?: PaginationCursor,
  protocol?: string;
}

export class SyncEngineLevel implements SyncEngine {
  /**
   * Holds the instance of a `Web5PlatformAgent` that represents the current execution context for
   * the `SyncEngineLevel`. This agent is used to interact with other Web5 agent components. It's
   * vital to ensure this instance is set to correctly contextualize operations within the broader
   * Web5 Agent framework.
   */
  private _agent?: Web5PlatformAgent;

  /**
   * An instance of the `AgentPermissionsApi` that is used to interact with permissions grants used during sync
   */
  private _permissionsApi: AgentPermissionsApi;

  private _db: AbstractLevel<string | Buffer | Uint8Array>;
  private _syncIntervalId?: ReturnType<typeof setInterval>;
  private _ulidFactory: ULIDFactory;

  constructor({ agent, dataPath, db }: SyncEngineLevelParams) {
    this._agent = agent;
    this._permissionsApi = new AgentPermissionsApi({ agent });
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
    this._permissionsApi = new AgentPermissionsApi({ agent });
  }

  private get permissionsApi() {
    if (!this._permissionsApi) {
      throw new Error('SyncEngineLevel: Permissions API not initialized.');
    }

    return this._permissionsApi;
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
      const { did, dwnUrl, messageCid, delegateDid, protocol } = SyncEngineLevel.parseSyncMessageParamsKey(key);
      // If a particular DWN service endpoint is unreachable, skip subsequent pull operations.
      if (errored.has(dwnUrl)) {
        continue;
      }

      const messageExists = await this.messageExists(did, messageCid);
      if (messageExists) {
        deleteOperations.push({ type: 'del', key: key });
        continue;
      }

      let permissionGrantId: string | undefined;
      let granteeDid: string | undefined;
      if (delegateDid) {
        const grants = await this.permissionsApi.fetchGrants({
          author  : delegateDid,
          target  : delegateDid,
          grantor : did,
          protocol
        });

        const messagesReadGrant = grants
          .filter(({ grant }) => grant.scope.interface === DwnInterfaceName.Messages && grant.scope.method === DwnMethodName.Read)
          .find(({ grant: { scope } }) => (scope as DwnMessagesPermissionScope).protocol === protocol);

        permissionGrantId = messagesReadGrant?.grant.id;
        granteeDid = delegateDid;
      }

      const messagesRead = await this.agent.processDwnRequest({
        store         : false,
        author        : did,
        target        : did,
        messageType   : DwnInterface.MessagesRead,
        granteeDid,
        messageParams : {
          messageCid,
          permissionGrantId
        }
      });

      let reply: MessagesReadReply;

      try {
        reply = await this.agent.rpc.sendDwnRequest({
          dwnUrl,          targetDid : did,
          message   : messagesRead.message,
        }) as MessagesReadReply;
      } catch(e) {
        errored.add(dwnUrl);
        continue;
      }

      if (reply.status.code !== 200 || !reply.entry?.message) {
        await this.addMessage(did, messageCid);
        deleteOperations.push({ type: 'del', key: key });
        continue;
      }

      const replyEntry = reply.entry;
      const message = replyEntry.message;
      // if the message includes data we convert it to a Node readable stream
      // otherwise we set it as undefined, as the message does not include data
      // this occurs when the message is a RecordsWrite message that has been updated
      const dataStream = isRecordsWrite(replyEntry) && replyEntry.data ?
        NodeStream.fromWebReadable({ readableStream: replyEntry.data as unknown as ReadableStream })
        : undefined;

      const pullReply = await this.agent.dwn.node.processMessage(did, message, { dataStream });
      if (SyncEngineLevel.syncMessageReplyIsSuccessful(pullReply)) {
        await this.addMessage(did, messageCid);
        deleteOperations.push({ type: 'del', key: key });
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
      const { did, delegateDid, protocol, dwnUrl, messageCid } = SyncEngineLevel.parseSyncMessageParamsKey(key);
      // If a particular DWN service endpoint is unreachable, skip subsequent push operations.
      if (errored.has(dwnUrl)) {
        continue;
      }

      // Attempt to retrieve the message from the local DWN.
      const dwnMessage = await this.getDwnMessage({ author: did, messageCid, delegateDid, protocol });

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
        if (SyncEngineLevel.syncMessageReplyIsSuccessful(reply)) {
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

  public async registerIdentity({ did, options }: { did: string; options: SyncIdentityOptions }): Promise<void> {
    // Get a reference to the `registeredIdentities` sublevel.
    const registeredIdentities = this._db.sublevel('registeredIdentities');

    // Add (or overwrite, if present) the Identity's DID as a registered identity.
    await registeredIdentities.put(did, JSON.stringify(options));
  }

  public async sync(direction?: 'push' | 'pull'): Promise<void> {
    if (this._syncIntervalId) {
      throw new Error('SyncEngineLevel: Cannot call sync while a sync interval is active. Call `stopSync()` first.');
    }

    if (!direction || direction === 'push') {
      await this.push();
    }
    if (!direction || direction === 'pull') {
      await this.pull();
    }
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
          await this.sync();
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

  /**
   * 202: message was successfully written to the remote DWN
   * 204: an initial write message was written without any data, cannot yet be read until a subsequent message is written with data
   * 409: message was already present on the remote DWN
   * RecordsDelete and the status code is 404: the initial write message was not found or the message was already deleted
   */
  private static syncMessageReplyIsSuccessful(reply: UnionMessageReply): boolean {
    return reply.status.code === 202 ||
      // a 204 status code is returned when the message was accepted without any data.
      // This is the case for an initial RecordsWrite messages for records that have been updated.
      // For context: https://github.com/TBD54566975/dwn-sdk-js/issues/695
      reply.status.code === 204 || 
      reply.status.code === 409 ||
      (
        // If the message is a RecordsDelete and the status code is 404, the initial write message was not found or the message was already deleted
        reply.entry?.message.descriptor.interface === DwnInterfaceName.Records &&
        reply.entry?.message.descriptor.method === DwnMethodName.Delete &&
        reply.status.code === 404
      );
  }

  private async enqueueOperations({ syncDirection, syncPeerState }: {
    syncDirection: SyncDirection,
    syncPeerState: SyncState[]
  }) {
    for (let syncState of syncPeerState) {
      // Get the event log from the remote DWN if pull sync, or local DWN if push sync.
      const eventLog = await this.getDwnEventLog({
        did         : syncState.did,
        delegateDid : syncState.delegateDid,
        dwnUrl      : syncState.dwnUrl,
        cursor      : syncState.cursor,
        protocol    : syncState.protocol,
        syncDirection
      });

      const syncOperations: LevelBatchOperation[] = [];

      for (let messageCid of eventLog) {
        const watermark = this._ulidFactory();
        const operationKey = SyncEngineLevel.generateSyncMessageParamsKey({
          ...syncState,
          watermark,
          messageCid
        });

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

  private static generateSyncMessageParamsKey({ did, delegateDid, dwnUrl, protocol, watermark, messageCid }:SyncMessageParams): string {
    // Use "did~dwnUrl~watermark~messageCid" as the key in the sync queue.
    // Note: It is critical that `watermark` precedes `messageCid` to ensure that when the sync
    //       jobs are pulled off the queue, they are lexographically sorted oldest to newest.
    //
    //        `protocol` and `delegateDid` may be undefined, which is fine, its part of the key will be stored as the string undefined.
    //        Later, when parsing the key, we will handle this case and return an actual undefined.
    //        This is information useful for subset and delegated sync.
    return [did, delegateDid, dwnUrl, protocol, watermark, messageCid ].join('~');
  }

  private static parseSyncMessageParamsKey(key: string): SyncMessageParams {
    // The order is import here, see `generateKey` for more information.
    const [did, delegateDidString, dwnUrl, protocolString, watermark, messageCid] = key.split('~');

    // `protocol` or `delegateDid` may be parsed as an undefined string, so we need to handle that case and returned an actual undefined.
    const protocol = protocolString === 'undefined' ? undefined : protocolString;
    const delegateDid = delegateDidString === 'undefined' ? undefined : delegateDidString;
    return { did, delegateDid, dwnUrl, watermark, messageCid, protocol };
  }

  private async getDwnEventLog({ did, delegateDid, dwnUrl, syncDirection, cursor, protocol }: {
    did: string,
    delegateDid?: string,
    dwnUrl: string,
    syncDirection: SyncDirection,
    cursor?: PaginationCursor
    protocol?: string
  }) {
    let messagesReply = {} as MessagesQueryReply;

    let permissionGrantId: string | undefined;
    let granteeDid: string | undefined;
    if (delegateDid) {
      // fetch the grants for the delegate DID
      const grants = await this.permissionsApi.fetchGrants({
        author  : delegateDid,
        target  : delegateDid,
        grantor : did,
        protocol
      });

      // find the grant for the MessagesQuery and the protocol
      const messagesReadGrant = grants
        .filter(({ grant }) => grant.scope.interface === DwnInterfaceName.Messages && grant.scope.method === DwnMethodName.Query)
        .find(({ grant: { scope } }) => (scope as DwnMessagesPermissionScope).protocol === protocol);

      permissionGrantId = messagesReadGrant?.grant.id;
      granteeDid = delegateDid;
    }

    if (syncDirection === 'pull') {
      // filter for a specific protocol if one is provided
      const filters = protocol ? [{ protocol }] : [];
      // When sync is a pull, get the event log from the remote DWN.
      const messagesQueryMessage = await this.agent.dwn.processRequest({
        store         : false,
        target        : did,
        author        : did,
        messageType   : DwnInterface.MessagesQuery,
        granteeDid,
        messageParams : { filters, cursor, permissionGrantId }
      });

      try {
        messagesReply = await this.agent.rpc.sendDwnRequest({
          dwnUrl    : dwnUrl,
          targetDid : did,
          message   : messagesQueryMessage.message,
        }) as MessagesQueryReply;
      } catch {
        // If a particular DWN service endpoint is unreachable, silently ignore.
      }

    } else if (syncDirection === 'push') {
      const filters = protocol ? [{ protocol }] : [];
      // When sync is a push, get the event log from the local DWN.
      const messagesQueryDwnResponse = await this.agent.dwn.processRequest({
        author        : did,
        target        : did,
        messageType   : DwnInterface.MessagesQuery,
        granteeDid,
        messageParams : { filters, cursor, permissionGrantId }
      });
      messagesReply = messagesQueryDwnResponse.reply as MessagesQueryReply;
    }

    const eventLog = messagesReply.entries ?? [];
    if (messagesReply.cursor) {
      this.setCursor(did, dwnUrl, syncDirection, messagesReply.cursor, protocol);
    }

    return eventLog;
  }

  private async getDwnMessage({ author, delegateDid, protocol, messageCid }: {
    author: string;
    delegateDid?: string;
    protocol?: string;
    messageCid: string;
  }): Promise<{ message: GenericMessage, data?: Blob } | undefined> {

    let permissionGrantId: string | undefined;
    let granteeDid: string | undefined;

    if (delegateDid) {
      const grants = await this.permissionsApi.fetchGrants({
        author   : delegateDid,
        target   : delegateDid,
        grantor  : author,
        protocol : protocol
      });

      const messagesReadGrant = grants
        .filter(({ grant}) => grant.scope.interface === DwnInterfaceName.Messages && grant.scope.method === DwnMethodName.Read)
        .find(({ grant: { scope } }) => (scope as DwnMessagesPermissionScope).protocol === protocol);

      permissionGrantId = messagesReadGrant?.grant.id;
      granteeDid = delegateDid;
    }

    let { reply } = await this.agent.dwn.processRequest({
      author        : author,
      target        : author,
      messageType   : DwnInterface.MessagesRead,
      granteeDid,
      messageParams : { messageCid, permissionGrantId }
    });


    // Absence of a messageEntry or message within messageEntry can happen because updating a
    // Record creates another RecordsWrite with the same recordId. Only the first and
    // most recent RecordsWrite messages are kept for a given recordId. Any RecordsWrite messages
    // that aren't the first or most recent are discarded by the DWN.
    if (reply.status.code !== 200 || !reply.entry) {
      return undefined;
    }
    const messageEntry = reply.entry!;

    let dwnMessageWithBlob: { message: GenericMessage, data?: Blob } = { message: messageEntry.message };

    // If the message is a RecordsWrite, either data will be present,
    // OR we have to fetch it using a RecordsRead.
    if (isRecordsWrite(messageEntry) && messageEntry.data) {
      const dataBytes = await NodeStream.consumeToBytes({ readable: messageEntry.data });
      dwnMessageWithBlob.data = new Blob([ dataBytes ], { type: messageEntry.message.descriptor.dataFormat });
    }

    return dwnMessageWithBlob;
  }

  private async getSyncPeerState({ syncDirection }: {
    syncDirection: SyncDirection;
  }): Promise<SyncState[]> {

    // Array to accumulate the list of sync peers for each DID.
    const syncPeerState: SyncState[] = [];

    // iterate over all registered identities
    for await (const [ did, options ] of this._db.sublevel('registeredIdentities').iterator()) {
      const { protocols, delegateDid } = JSON.parse(options) as SyncIdentityOptions;
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
        if (protocols.length === 0) {
          const cursor = await this.getCursor(did, dwnUrl, syncDirection);
          syncPeerState.push({ did, delegateDid, dwnUrl, cursor });
        } else {
          for (const protocol of protocols) {
            const cursor = await this.getCursor(did, dwnUrl, syncDirection, protocol);
            syncPeerState.push({ did, delegateDid, dwnUrl, cursor, protocol });
          }
        }
      }
    }

    return syncPeerState;
  }

  private async getCursor(did: string, dwnUrl: string, direction: SyncDirection, protocol?: string): Promise<PaginationCursor | undefined> {

    // if a protocol is provided, we append it to the key
    const cursorKey = protocol ? `${did}~${dwnUrl}~${direction}-${protocol}` :
      `${did}~${dwnUrl}~${direction}`;

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

  private async setCursor(did: string, dwnUrl: string, direction: SyncDirection, cursor: PaginationCursor, protocol?: string) {
    const cursorKey = protocol ? `${did}~${dwnUrl}~${direction}-${protocol}` :
      `${did}~${dwnUrl}~${direction}`;
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