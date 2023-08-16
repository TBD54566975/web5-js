import { Convert } from '@web5/common';

import type { Web5ManagedAgent } from './types/agent.js';
import type { ManagedIdentity } from './identity-manager.js';
import type { RecordsWriteMessage } from '@tbd54566975/dwn-sdk-js';

export interface ManagedIdentityStore {
  deleteIdentity(options: { did: string, agent?: Web5ManagedAgent, context?: string }): Promise<boolean>
  getIdentity(options: { did: string, agent?: Web5ManagedAgent, context?: string }): Promise<ManagedIdentity | undefined>
  importIdentity(options: { identity: ManagedIdentity, agent?: Web5ManagedAgent, context?: string }): Promise<void>
  listIdentities(options?: { agent?: Web5ManagedAgent, context?: string }): Promise<ManagedIdentity[]>
}

/**
 *
 */
export class IdentityStoreDwn implements ManagedIdentityStore {
  private _identityRecordProperties = {
    dataFormat : 'application/json',
    schema     : 'https://identity.foundation/schemas/web5/managed-identity'
  };

  async deleteIdentity(options: {
    agent: Web5ManagedAgent,
    context?: string,
    did: string
  }): Promise<boolean> {
    const { agent, context, did } = options;

    // Determine which DID to use to author DWN messages.
    const authorDid = await this.getAuthor({ agent, context, did });

    // Query the DWN for all stored Identity objects.
    const { reply: queryReply} = await agent.dwnManager.processRequest({
      author         : authorDid,
      target         : authorDid,
      messageType    : 'RecordsQuery',
      messageOptions : {
        filter: { ...this._identityRecordProperties }
      }
    });

    // Loop through all of the entries and try to find a match.
    let matchingRecordId: string | undefined;
    for (const record of queryReply.entries ?? []) {
      if (record.encodedData) {
        const storedIdentity = Convert.base64Url(record.encodedData).toObject() as ManagedIdentity;
        if (storedIdentity && storedIdentity.did === did) {
          matchingRecordId = (record as RecordsWriteMessage).recordId ;
          break;
        }
      }
    }

    // Return undefined if the specified Identity was not found in the store.
    if (!matchingRecordId) return false;

    // If a record for the specified Identity was found, attempt to delete it.
    const { reply: { status } } = await agent.dwnManager.processRequest({
      author         : authorDid,
      target         : authorDid,
      messageType    : 'RecordsDelete',
      messageOptions : {
        recordId: matchingRecordId
      }
    });

    // If the Identity was successfully deleted, return true;
    if (status.code === 202) return true;

    // If the Identity could not be deleted, return false;
    return false;
  }

  async getIdentity(options: {
    agent: Web5ManagedAgent,
    context?: string,
    did: string
  }): Promise<ManagedIdentity | undefined> {
    const { agent, context, did } = options;

    // Determine which DID to use to author DWN messages.
    const authorDid = await this.getAuthor({ agent, context, did });

    // Query the DWN for all stored Identity objects.
    const { reply: queryReply} = await agent.dwnManager.processRequest({
      author         : authorDid,
      target         : authorDid,
      messageType    : 'RecordsQuery',
      messageOptions : { filter: { ...this._identityRecordProperties } }
    });

    // Loop through all of the entries and return a match, if found.
    for (const record of queryReply.entries ?? []) {
      if (record.encodedData) {
        const storedIdentity = Convert.base64Url(record.encodedData).toObject() as ManagedIdentity;
        if (storedIdentity && storedIdentity.did === did) return storedIdentity;
      }
    }

    // Return undefined if no matches were found.
    return undefined;
  }

  async importIdentity(options: {
    agent: Web5ManagedAgent,
    context?: string,
    identity: ManagedIdentity
  }) {
    const { agent, context, identity } = options;

    // Determine which DID to use to author DWN messages.
    const authorDid = await this.getAuthor({ agent, context, did: identity.did });

    // Check if the Identity being imported is already present in the store.
    const duplicateFound = await this.getIdentity({ agent, context, did: identity.did });
    if (duplicateFound) {
      throw new Error(`IdentityStoreDwn: Identity with DID already exists: '${identity.did}'`);
    }

    // Encode the ManagedIdentity as bytes.
    const identityU8A = Convert.object(identity).toUint8Array();

    const { reply: { status } } = await agent.dwnManager.processRequest({
      author         : authorDid,
      target         : authorDid,
      messageType    : 'RecordsWrite',
      messageOptions : { ...this._identityRecordProperties },
      dataStream     : new Blob([identityU8A])
    });

    // If the write fails, throw an error.
    if (status.code !== 202) {
      throw new Error('IdentityStoreDwn: Failed to write imported identity to store.');
    }
  }

  async listIdentities(options: {
    agent: Web5ManagedAgent,
    context?: string
  }): Promise<ManagedIdentity[]> {
    const { agent, context } = options;

    // Determine which DID to use to author DWN messages.
    const authorDid = await this.getAuthor({ agent, context });

    // Query the DWN for all stored Identity objects.
    const { reply: queryReply} = await agent.dwnManager.processRequest({
      author         : authorDid,
      target         : authorDid,
      messageType    : 'RecordsQuery',
      messageOptions : {
        filter: { ...this._identityRecordProperties }
      }
    });

    // Loop through all of the entries and accumulate the Identity objects.
    let storedIdentities: ManagedIdentity[] = [];
    for (const record of queryReply.entries ?? []) {
      if (record.encodedData) {
        const storedIdentity = Convert.base64Url(record.encodedData).toObject() as ManagedIdentity;
        storedIdentities.push(storedIdentity);
      }
    }

    return storedIdentities;
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
    throw new Error(`IdentityStoreDwn: Agent property 'agentDid' is undefined and no keys were found for: '${did}'`);
  }
}

/**
 *
 */
export class IdentityStoreMemory implements ManagedIdentityStore {
  /**
   * A private field that contains the Map used as the in-memory key-value store.
   */
  private store: Map<string, ManagedIdentity> = new Map();

  async deleteIdentity({ did }: { did: string; }): Promise<boolean> {
    if (this.store.has(did)) {
      // Identity with given DID exists so proceed with delete.
      this.store.delete(did);
      return true;
    }

    // Identity with given DID not present so delete operation not possible.
    return false;
  }

  async getIdentity({ did }: { did: string; }): Promise<ManagedIdentity | undefined> {
    return this.store.get(did);
  }

  async importIdentity(options: { identity: ManagedIdentity }) {
    const { identity } = options;

    if (this.store.has(identity.did)) {
      // Identity with given identifier already exists so import operation cannot proceed.
      throw new Error(`IdentityStoreMemory: Identity with DID already exists: '${identity.did}'`);
    }

    // Make a deep copy of the Identity so that the object stored does not share the same references as the input.
    const clonedIdentity = structuredClone(identity);
    this.store.set(identity.did, clonedIdentity);
  }

  async listIdentities(): Promise<ManagedIdentity[]> {
    return Array.from(this.store.values());
  }
}