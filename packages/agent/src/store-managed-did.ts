import type { RecordsWriteMessage } from '@tbd54566975/dwn-sdk-js';

import { Convert } from '@web5/common';

import type { Web5ManagedAgent } from './types/agent.js';
import type { ManagedDid } from './did-manager.js';

export interface ManagedDidStore {
  deleteDid(options: { did: string, agent?: Web5ManagedAgent, context?: string }): Promise<boolean>
  getDid(options: { did: string, agent?: Web5ManagedAgent, context?: string }): Promise<ManagedDid | undefined>
  findDid(options: { did: string, agent?: Web5ManagedAgent, context?: string }): Promise<ManagedDid | undefined>
  findDid(options: { alias: string, agent?: Web5ManagedAgent, context?: string }): Promise<ManagedDid | undefined>
  importDid(options: { did: ManagedDid, agent?: Web5ManagedAgent, context?: string }): Promise<void>
  listDids(options?: { agent?: Web5ManagedAgent, context?: string }): Promise<ManagedDid[]>
}

/**
 *
 */
export class DidStoreDwn implements ManagedDidStore {
  private _didRecordProperties = {
    dataFormat : 'application/json',
    schema     : 'https://identity.foundation/schemas/web5/managed-did'
  };

  async deleteDid(options: {
    agent: Web5ManagedAgent,
    context?: string,
    did: string
  }): Promise<boolean> {
    const { agent, context, did } = options;

    // Determine which DID to use to author DWN messages.
    const authorDid = await this.getAuthor({ agent, context, did });

    // Query the DWN for all stored DID objects.
    const { reply: queryReply} = await agent.dwnManager.processRequest({
      author         : authorDid,
      target         : authorDid,
      messageType    : 'RecordsQuery',
      messageOptions : {
        filter: { ...this._didRecordProperties }
      }
    });

    // Loop through all of the entries and try to find a match.
    let matchingRecordId: string | undefined;
    for (const record of queryReply.entries ?? []) {
      if (record.encodedData) {
        const storedDid = Convert.base64Url(record.encodedData).toObject() as ManagedDid;
        if (storedDid && storedDid.did === did) {
          matchingRecordId = (record as RecordsWriteMessage).recordId ;
          break;
        }
      }
    }

    // Return undefined if the specified DID was not found in the store.
    if (!matchingRecordId) return false;

    // If a record for the specified DID was found, attempt to delete it.
    const { reply: { status } } = await agent.dwnManager.processRequest({
      author         : authorDid,
      target         : authorDid,
      messageType    : 'RecordsDelete',
      messageOptions : {
        recordId: matchingRecordId
      }
    });

    // If the DID was successfully deleted, return true;
    if (status.code === 202) return true;

    // If the DID could not be deleted, return false;
    return false;
  }

  async findDid(options: { agent: Web5ManagedAgent, context?: string, did: string }): Promise<ManagedDid | undefined>;
  async findDid(options: { agent: Web5ManagedAgent, context?: string, alias: string }): Promise<ManagedDid | undefined>;
  async findDid(options: { agent: Web5ManagedAgent, alias: string, context?: string, did: string }): Promise<ManagedDid | undefined> {
    const { agent, alias, context, did } = options;

    // Determine which DID to use to author DWN messages.
    const authorDid = await this.getAuthor({ agent, context, did });

    // Query the DWN for all stored DID objects.
    const { reply: queryReply} = await agent.dwnManager.processRequest({
      author         : authorDid,
      target         : authorDid,
      messageType    : 'RecordsQuery',
      messageOptions : {
        filter: { ...this._didRecordProperties }
      }
    });

    // Loop through all of the entries and return a match, if found.
    for (const record of queryReply.entries ?? []) {
      if (record.encodedData) {
        const storedDid = Convert.base64Url(record.encodedData).toObject() as ManagedDid;
        if (storedDid && storedDid.did === did) return storedDid;
        if (storedDid && storedDid.alias === alias) return storedDid;
      }
    }

    // Return undefined if no matches were found.
    return undefined;
  }

  async getDid(options: {
    agent: Web5ManagedAgent,
    context?: string,
    did: string
  }): Promise<ManagedDid | undefined> {
    const { agent, context, did } = options;

    // Determine which DID to use to author DWN messages.
    const authorDid = await this.getAuthor({ agent, context, did });

    // Query the DWN for all stored DID objects.
    const { reply: queryReply} = await agent.dwnManager.processRequest({
      author         : authorDid,
      target         : authorDid,
      messageType    : 'RecordsQuery',
      messageOptions : { filter: { ...this._didRecordProperties } }
    });

    // Loop through all of the entries and return a match, if found.
    for (const record of queryReply.entries ?? []) {
      if (record.encodedData) {
        const storedDid = Convert.base64Url(record.encodedData).toObject() as ManagedDid;
        if (storedDid && storedDid.did === did) return storedDid;
      }
    }

    // Return undefined if no matches were found.
    return undefined;
  }

  async importDid(options: {
    agent: Web5ManagedAgent,
    context?: string,
    did: ManagedDid
  }) {
    const { agent, context, did: importDid } = options;

    // Determine which DID to use to author DWN messages.
    const authorDid = await this.getAuthor({ agent, context, did: importDid.did });

    // Check if the DID being imported is already present in the store.
    const duplicateFound = await this.getDid({ agent, context, did: importDid.did });
    if (duplicateFound) {
      throw new Error(`DidStoreDwn: DID with ID already exists: '${importDid.did}'`);
    }

    // Encode the ManagedDid as bytes.
    const importDidU8A = Convert.object(importDid).toUint8Array();

    const { reply: { status } } = await agent.dwnManager.processRequest({
      author         : authorDid,
      target         : authorDid,
      messageType    : 'RecordsWrite',
      messageOptions : { ...this._didRecordProperties },
      dataStream     : new Blob([importDidU8A])
    });

    // If the write fails, throw an error.
    if (status.code !== 202) {
      throw new Error('DidStoreDwn: Failed to write imported DID to store.');
    }
  }

  async listDids(options: {
    agent: Web5ManagedAgent,
    context?: string
  }): Promise<ManagedDid[]> {
    const { agent, context } = options;

    // Determine which DID to use to author DWN messages.
    const authorDid = await this.getAuthor({ agent, context });

    // Query the DWN for all stored DID objects.
    const { reply: queryReply} = await agent.dwnManager.processRequest({
      author         : authorDid,
      target         : authorDid,
      messageType    : 'RecordsQuery',
      messageOptions : {
        filter: { ...this._didRecordProperties }
      }
    });

    // Loop through all of the entries and accumulate the DID objects.
    let storedDids: ManagedDid[] = [];
    for (const record of queryReply.entries ?? []) {
      if (record.encodedData) {
        const storedDid = Convert.base64Url(record.encodedData).toObject() as ManagedDid;
        storedDids.push(storedDid);
      }
    }

    return storedDids;
  }

  private async getAuthor(options: {
    context?: string,
    did?: string,
    agent: Web5ManagedAgent
  }): Promise<string> {
    const { context, did, agent } = options;

    // If `context` is specified, DWN messages will be signed by this DID.
    if (context) return context;

    // If Agent has an agentDid, use it to sign DWN messages.
    if (agent.agentDid) return agent.agentDid;

    // If `context`, `agent.agentDid`, and `did` are undefined, throw error.
    if (!did) {
      throw new Error(`DidStoreDwn: Agent property 'agentDid' is undefined.`);
    }

    /** Lacking a context and agentDid DID, check whether KeyManager has
     * a key pair for the given `did` value.*/
    const signingKeyId = await agent.didManager.getDefaultSigningKey({ did });
    const keyPair = (signingKeyId)
      ? await agent.keyManager.getKey({ keyRef: signingKeyId })
      : undefined;

    // If a key pair is found, use the `did` to sign messages.
    if (keyPair) return did;

    // If all else fails, throw an error.
    throw new Error(`DidStoreDwn: Agent property 'agentDid' is undefined and no keys were found for: '${did}'`);
  }
}

/**
 *
 */
export class DidStoreMemory implements ManagedDidStore {
  /**
   * A private field that contains the Map used as the in-memory key-value store.
   */
  private store: Map<string, ManagedDid> = new Map();

  async deleteDid({ did }: { did: string; }): Promise<boolean> {
    if (this.store.has(did)) {
      // DID with given identifier exists so proceed with delete.
      this.store.delete(did);
      return true;
    }

    // DID with given identifier not present so delete operation not possible.
    return false;
  }

  async getDid({ did }: { did: string; }): Promise<ManagedDid | undefined> {
    return this.store.get(did);
  }

  async findDid(options: { did: string }): Promise<ManagedDid | undefined>;
  async findDid(options: { alias: string }): Promise<ManagedDid | undefined>;
  async findDid(options: { alias?: string, did?: string}): Promise<ManagedDid | undefined> {
    let { alias, did } = options;

    // Get DID by identifier.
    if (did) return this.store.get(did);

    if (alias) {
      // Search through the store to find a matching entry
      for (const did of this.store.values()) {
        if (did.alias === alias) return did;
      }
    }

    return undefined;
  }

  async importDid(options: { did: ManagedDid }) {
    const { did: importDid } = options;

    if (this.store.has(importDid.did)) {
      // DID with given identifier already exists so import operation cannot proceed.
      throw new Error(`DidStoreMemory: DID with ID already exists: '${importDid.did}'`);
    }

    // Make a deep copy of the DID so that the object stored does not share the same references as the input.
    const clonedDid = structuredClone(importDid);
    this.store.set(importDid.did, clonedDid);
  }

  async listDids(): Promise<ManagedDid[]> {
    return Array.from(this.store.values());
  }
}