import type { PortableDid } from '@web5/dids';

import { Convert, NodeStream, TtlCache } from '@web5/common';

import type { Web5ManagedAgent } from './types/agent.js';

import { DwnInterface } from './types/agent-dwn.js';
import { isPortableDid } from './temp/add-to-dids.js';

export interface DidStore {
  delete(params: { didUri: string, agent?: Web5ManagedAgent, context?: string }): Promise<boolean>;

  get(params: { didUri: string, agent?: Web5ManagedAgent, context?: string }): Promise<PortableDid | undefined>;

  list(options?: { agent?: Web5ManagedAgent, context?: string }): Promise<PortableDid[]>;

  set(params: { did: PortableDid, agent?: Web5ManagedAgent, context?: string }): Promise<void>;
}

async function getAuthor({ agent, context, didUri }: {
  agent: Web5ManagedAgent;
  context?: string;
  didUri?: string;
}): Promise<string> {
  // If `context` is specified, DWN messages will be signed by this DID.
  if (context) return context;

  // If Agent has an agentDid, use it to sign DWN messages.
  if (agent.agentDid) return agent.agentDid.uri;

  // If `context`, `agent.agentDid`, and `didUri` are undefined, throw error.
  if (!didUri) {
    throw new Error(`DidStore: Failed to determine author: 'agent.agentDid', 'context', and 'didUri' are undefined`);
  }

  // If both `context` and `agent.agentDid` are undefined but `did` is given, assume the
  // Agent's KeyManager contains a private key for the given `did` and use it to sign DWN
  // messages.
  //
  // Note: The KeyManager is NOT checked for performance reasons. The KeyManager will throw an
  // error if the private key is not found, so we can avoid the extra lookup.
  return didUri;
}

export class DwnDidStore implements DidStore {
  /**
   * Index for mappings from DID URI to DWN record ID.
   *
   * Entries expire after 2 hours.
   */
  private _index = new TtlCache<string, string>({ ttl: 60000 * 60 * 2 });

  /**
   * Properties to use when writing and querying DID records with the DWN store.
   */
  private _didRecordProperties = {
    dataFormat : 'application/json',
    schema     : 'https://identity.foundation/schemas/web5/portable-did'
  };

  public async delete({ didUri, agent, context }: {
    didUri: string;
    agent: Web5ManagedAgent;
    context?: string;
  }): Promise<boolean> {
    // Determine which DID to use to sign DWN messages.
    const authorDid = await getAuthor({ agent, context, didUri });

    // Attempt to find the DID in the store.
    let matchingRecordId = await this.findByDidUri({ didUri, authorDid, agent });

    // Return false if the given DID was not found in the store.
    if (!matchingRecordId) return false;

    // If a record for the given DID was found, attempt to delete it.
    const { reply: { status } } = await agent.dwn.processRequest({
      author        : authorDid,
      target        : authorDid,
      messageType   : DwnInterface.RecordsDelete,
      messageParams : {
        recordId : matchingRecordId,
        signer   : null as any // Signer will be set by the Agent's DWN API.
      }
    });

    // If the DID was successfully deleted, return true;
    if (status.code === 202) return true;

    // If the Delete operation failed, throw an error.
    throw new Error(`DwnDidStore: Failed to delete '${didUri}' from store: (${status.code}) ${status.detail}`);
  }

  public async get({ didUri, agent, context }: {
    didUri: string;
    agent: Web5ManagedAgent;
    context?: string;
  }): Promise<PortableDid | undefined> {
    // Determine which DID to use to sign DWN messages.
    const authorDid = await getAuthor({ agent, context, didUri });

    // Attempt to find the DID in the store.
    let recordId = await this.findByDidUri({ didUri, authorDid, agent });

    // If a matching record was found, read and return the DID object.
    if (recordId) {
      // Read the DID object from the store.
      const { reply: readReply } = await agent.dwn.processRequest({
        author        : authorDid,
        target        : authorDid,
        messageType   : DwnInterface.RecordsRead,
        messageParams : { filter: { recordId } }
      });

      // If the record was found, return it.
      if (readReply.record?.data) {
        const storedDid = await NodeStream.consumeToJson({ readable: readReply.record.data });
        if (isPortableDid(storedDid) && storedDid.uri === didUri) return storedDid;
      }
    }

    // Return undefined if no matches were found.
    return undefined;
  }

  public async list({ agent, context}: {
    agent: Web5ManagedAgent;
    context?: string;
  }): Promise<PortableDid[]> {
    // Determine which DID to use to sign DWN messages.
    const authorDid = await getAuthor({ context, agent });

    // Query the DWN for all stored DID objects.
    const storedDids = await this.findAll({ agent, authorDid });

    return storedDids;
  }

  public async set({ did, context, agent }: {
    did: PortableDid;
    agent: Web5ManagedAgent;
    context?: string;
  }): Promise<void> {
    // Determine which DID to use to sign DWN messages.
    const authorDid = await getAuthor({ didUri: did.uri, context, agent });

    // Check if the DID being added is already present in the store.
    const duplicateFound = await this.findByDidUri({ didUri: did.uri, authorDid, agent });
    if (duplicateFound) {
      throw new Error(`DwnDidStore: Import failed due to duplicate DID for: ${did.uri}`);
    }

    // Convert the PortableDid object to a byte array.
    const didBytes = Convert.object(did).toUint8Array();

    // Store the DID in the DWN.
    const { reply: { status } } = await agent.dwn.processRequest({
      author        : authorDid,
      target        : authorDid,
      messageType   : DwnInterface.RecordsWrite,
      messageParams : { ...this._didRecordProperties },
      dataStream    : new Blob([didBytes], { type: 'application/json' })
    });

    // If the write fails, throw an error.
    if (status.code !== 202) {
      throw new Error(`DwnDidStore: Failed to write DID to store: ${did.uri}`);
    }
  }

  private async findByDidUri({ didUri, authorDid, agent }: {
    didUri: string;
    authorDid: string;
    agent: Web5ManagedAgent;
  }): Promise<string | undefined> {
    // Check the index for a matching DID and extend the index TTL.
    let recordId = this._index.get(didUri, { updateAgeOnGet: true });

    // If no matching record ID was found in the index...
    if (!recordId) {
      // Query the DWN for all stored DID objects to rebuild the index.
      await this.findAll({ agent, authorDid });

      // Check the index again for a matching DID.
      recordId = this._index.get(didUri);
    }

    return recordId;
  }

  private async findAll({ agent, authorDid }: {
    agent: Web5ManagedAgent;
    authorDid: string;
  }): Promise<PortableDid[]> {
    // Query the DWN for all stored DID objects.
    const { reply: queryReply } = await agent.dwn.processRequest({
      author        : authorDid,
      target        : authorDid,
      messageType   : DwnInterface.RecordsQuery,
      messageParams : { filter: { ...this._didRecordProperties } }
    });

    // Loop through all of the stored DID records and accumulate the DID objects.
    let storedDids: PortableDid[] = [];
    for (const record of queryReply.entries ?? []) {
      // All DID records are expected to be small enough such that the data is returned with the
      // query results. If a record is returned without `encodedData` this is unexpected so throw
      // an error.
      if (!record.encodedData) {
        throw new Error(`DwnDidStore: Expected 'encodedData' to be present in the DWN query result entry`);
      }

      const storedDid = Convert.base64Url(record.encodedData).toObject();
      if (isPortableDid(storedDid)) {
        // Update the index with the matching record ID.
        this._index.set(storedDid.uri, record.recordId);
        storedDids.push(storedDid);
      }
    }

    return storedDids;
  }
}

export class InMemoryDidStore implements DidStore {
  /**
   * A private field that contains the separator used to join the tenant DID and the DID URI.
   */
  private separator: string = '^';

  /**
   * A private field that contains the Map used as the in-memory key-value store.
   */
  private store: Map<string, PortableDid> = new Map();

  public async delete({ didUri, agent, context }: {
    didUri: string;
    agent: Web5ManagedAgent;
    context?: string;
  }): Promise<boolean> {
    // Determine which DID to use as the tenant.
    const authorDid = await getAuthor({ agent, context, didUri });

    // Construct the tenant-prefix that will be prepended to lookups in the store.
    const tenant = `${authorDid}${this.separator}`;

    if (this.store.has(tenant + didUri)) {
      // DID with given identifier exists so proceed with delete.
      this.store.delete(tenant + didUri);
      return true;
    }

    // DID with given identifier not present so delete operation not possible.
    return false;
  }

  public async get({ didUri, agent, context }: {
    didUri: string;
    agent: Web5ManagedAgent;
    context?: string;
  }): Promise<PortableDid | undefined> {
    // Determine which DID to use to sign DWN messages.
    const authorDid = await getAuthor({ agent, context, didUri });

    // Construct the tenant-prefix that will be prepended to lookups in the store.
    const tenant = `${authorDid}${this.separator}`;

    return this.store.get(tenant + didUri);
  }

  public async set({ did, context, agent }: {
    did: PortableDid;
    agent: Web5ManagedAgent;
    context?: string;
  }): Promise<void> {
    // Determine which DID to use to sign DWN messages.
    const authorDid = await getAuthor({ didUri: did.uri, context, agent });

    // Construct the tenant-prefix that will be prepended to lookups in the store.
    const tenant = `${authorDid}${this.separator}`;

    const duplicateFound = this.store.has(tenant + did.uri);
    if (duplicateFound) {
      throw new Error(`InMemoryDidStore: Import failed due to duplicate DID entry for: ${did.uri}`);
    }

    // Make a deep copy of the DID so that the object stored does not share the same references as
    // the input.
    const clonedDid = structuredClone(did);
    this.store.set(tenant + did.uri, clonedDid);
  }

  public async list({ agent, context}: {
    agent: Web5ManagedAgent;
    context?: string;
  }): Promise<PortableDid[]> {
    // Determine which DID to use to sign DWN messages.
    const authorDid = await getAuthor({ context, agent });

    // Construct the tenant-prefix that will be prepended to lookups in the store.
    const tenant = `${authorDid}${this.separator}`;

    const result: PortableDid[] = [];
    for (const [key, storedDid] of this.store.entries()) {
      if (key.startsWith(tenant)) {
        result.push(storedDid);
      }
    }
    return result;
  }
}