import type { Jwk } from '@web5/crypto';

import { Convert, NodeStream, TtlCache } from '@web5/common';

import type { Web5ManagedAgent } from './types/agent.js';

import { TENANT_SEPARATOR } from './internal.js';
import { getDwnStoreTenant } from './internal.js';
import { DwnInterface } from './types/agent-dwn.js';

export type DataStoreTenantParams = {
  agent: Web5ManagedAgent;
  tenant?: string;
}

export type DataStoreListParams = DataStoreTenantParams;

export type DataStoreGetParams = DataStoreTenantParams & {
  id: string;
  useCache?: boolean;
}

export type DataStoreSetParams<TStoreObject> = DataStoreTenantParams & {
  id: string;
  data: TStoreObject;
  preventDuplicates?: boolean;
  useCache?: boolean;
}

export type DataStoreDeleteParams = DataStoreTenantParams & {
  id: string;
}

export interface DataStore<TStoreObject> {
  delete(params: DataStoreDeleteParams): Promise<boolean>;

  get(params: DataStoreGetParams): Promise<TStoreObject | undefined>;

  list(params: DataStoreTenantParams): Promise<TStoreObject[]>;

  set(params: DataStoreSetParams<TStoreObject>): Promise<void>;
}


export class DwnDataStore<TStoreObject extends Record<string, any> = Jwk> implements DataStore<TStoreObject> {
  protected name = 'DataStore';

  /**
   * Index for mappings from Store Identifier to DWN record ID.
   *
   * Up to 1,000 entries are retained for 2 hours.
   */
  protected _index = new TtlCache<string, string>({ ttl: 60000 * 60 * 2, max: 1000 });

  /**
   * Index for mappings from DWN record ID to Store Objects.
   *
   * Up to 100 entries are retained for 2 hours.
   */
  private _cache = new TtlCache<string, TStoreObject>({ ttl: 60000 * 60 * 2, max: 100 });

  /**
   * Properties to use when writing and querying records with the DWN store.
   */
  protected _recordProperties = {
    dataFormat : 'application/json',
    schema     : 'https://identity.foundation/schemas/web5/private-jwk'
  };

  public async delete({ id, agent, tenant }: DataStoreDeleteParams): Promise<boolean> {
    // Determine which DID to use to sign DWN messages.
    const tenantDid = await getDwnStoreTenant({ agent, tenant, didUri: id });

    // Look up the DWN record ID of the object in the store with the given `id`.
    let matchingRecordId = await this.lookupRecordId({ id, tenantDid, agent });

    // Return false if the given ID was not found in the store.
    if (!matchingRecordId) return false;

    // If a record for the given ID was found, attempt to delete it.
    const { reply: { status } } = await agent.dwn.processRequest({
      author        : tenantDid,
      target        : tenantDid,
      messageType   : DwnInterface.RecordsDelete,
      messageParams : { recordId: matchingRecordId }
    });

    // If the record was successfully deleted, update the index/cache and return true;
    if (status.code === 202) {
      this._index.delete(`${tenantDid}${TENANT_SEPARATOR}${id}`);
      this._cache.delete(matchingRecordId);
      return true;
    }

    // If the Delete operation failed, throw an error.
    throw new Error(`${this.name}: Failed to delete '${id}' from store: (${status.code}) ${status.detail}`);
  }

  public async get({ id, agent, tenant, useCache = false }:
    DataStoreGetParams
  ): Promise<TStoreObject | undefined> {
    // Determine which DID to use to sign DWN messages.
    const tenantDid = await getDwnStoreTenant({ agent, tenant, didUri: id });

    // Look up the DWN record ID of the object in the store with the given `id`.
    let matchingRecordId = await this.lookupRecordId({ id, tenantDid, agent });

    // Return undefined if no matches were found.
    if (!matchingRecordId) return undefined;

    // Retrieve and return the stored object.
    return await this.getRecord({ recordId: matchingRecordId, tenantDid, agent, useCache });
  }

  public async list({ agent, tenant}: DataStoreListParams): Promise<TStoreObject[]> {
    // Determine which DID to use to sign DWN messages.
    const tenantDid = await getDwnStoreTenant({ tenant, agent });

    // Query the DWN for all stored record objects.
    const storedRecords = await this.getAllRecords({ agent, tenantDid });

    return storedRecords;
  }

  public async set({ id, data, tenant, agent, preventDuplicates = true, useCache = false }:
    DataStoreSetParams<TStoreObject>
  ): Promise<void> {
    // Determine which DID to use to sign DWN messages.
    const tenantDid = await getDwnStoreTenant({ agent, tenant, didUri: id });

    // If enabled, check if a record with the given `id` is already present in the store.
    if (preventDuplicates) {
      // Look up the DWN record ID of the object in the store with the given `id`.
      const matchingRecordId = await this.lookupRecordId({ id, tenantDid, agent });
      if (matchingRecordId) {
        throw new Error(`${this.name}: Import failed due to duplicate entry for: ${id}`);
      }
    }

    // Convert the record object to store to a byte array.
    const dataBytes = Convert.object(data).toUint8Array();

    // Store the record in the DWN.
    const { message, reply: { status } } = await agent.dwn.processRequest({
      author        : tenantDid,
      target        : tenantDid,
      messageType   : DwnInterface.RecordsWrite,
      messageParams : { ...this._recordProperties },
      dataStream    : new Blob([dataBytes], { type: 'application/json' })
    });

    // If the write fails, throw an error.
    if (!(message && status.code === 202)) {
      throw new Error(`${this.name}: Failed to write data to store for: ${id}`);
    }

    // Add the newly created record to the index.
    this._index.set(`${tenantDid}${TENANT_SEPARATOR}${id}`, message.recordId);

    // If caching is enabled, add the record to the cache.
    if (useCache) {
      this._cache.set(message.recordId, data);
    }
  }

  protected async getAllRecords(_params: {
    agent: Web5ManagedAgent;
    tenantDid: string;
  }): Promise<TStoreObject[]> {
    throw new Error(`Not implemented: Classes extending DwnDataStore must implement getAllRecords()`);
  }

  private async getRecord({ recordId, tenantDid, agent, useCache }: {
    recordId: string;
    tenantDid: string;
    agent: Web5ManagedAgent;
    useCache: boolean;
  }): Promise<TStoreObject> {
    let data: TStoreObject | undefined;

    if (useCache) {
      data = this._cache.get(recordId, { updateAgeOnGet: true });

      if (!data) {
        throw new Error(`${this.name}: Failed to read data from cache for: ${recordId}`);
      }

    } else {
      // Read the record from the store.
      const { reply: readReply } = await agent.dwn.processRequest({
        author        : tenantDid,
        target        : tenantDid,
        messageType   : DwnInterface.RecordsRead,
        messageParams : { filter: { recordId } }
      });

      if (!readReply.record?.data) {
        throw new Error(`${this.name}: Failed to read data from DWN for: ${recordId}`);
      }

      // If the record was found, convert back to store object format, and return it.
      data = await NodeStream.consumeToJson({ readable: readReply.record.data }) as TStoreObject;
    }

    return data;
  }

  private async lookupRecordId({ id, tenantDid, agent }: {
    id: string;
    tenantDid: string;
    agent: Web5ManagedAgent;
  }): Promise<string | undefined> {
    // Check the index for a matching ID and extend the index TTL.
    let recordId = this._index.get(`${tenantDid}${TENANT_SEPARATOR}${id}`, { updateAgeOnGet: true });

    // If no matching record ID was found in the index...
    if (!recordId) {
      // Query the DWN for all stored objects to rebuild the index.
      await this.getAllRecords({ agent, tenantDid });

      // Check the index again for a matching ID.
      recordId = this._index.get(`${tenantDid}${TENANT_SEPARATOR}${id}`);
    }

    return recordId;
  }
}

export class InMemoryDataStore<TStoreObject extends Record<string, any> = Jwk> implements DataStore<TStoreObject> {
  protected name = 'InMemoryDataStore';

  /**
   * A private field that contains the Map used as the in-memory data store.
   */
  private store: Map<string, TStoreObject> = new Map();

  public async delete({ id, agent, tenant }: DataStoreDeleteParams): Promise<boolean> {
    // Determine which DID to use as the tenant.
    const tenantDid = await getDwnStoreTenant({ agent, tenant, didUri: id });

    if (this.store.has(`${tenantDid}${TENANT_SEPARATOR}${id}`)) {
      // Record with given identifier exists so proceed with delete.
      this.store.delete(`${tenantDid}${TENANT_SEPARATOR}${id}`);
      return true;
    }

    // Record with given identifier not present so delete operation not possible.
    return false;
  }

  public async get({ id, agent, tenant }: DataStoreGetParams): Promise<TStoreObject | undefined> {
    // Determine which DID to use to sign DWN messages.
    const tenantDid = await getDwnStoreTenant({ agent, tenant, didUri: id });

    return this.store.get(`${tenantDid}${TENANT_SEPARATOR}${id}`);
  }

  public async list({ agent, tenant}: DataStoreListParams): Promise<TStoreObject[]> {
    // Determine which DID to use to sign DWN messages.
    const tenantDid = await getDwnStoreTenant({ tenant, agent });

    const result: TStoreObject[] = [];
    for (const [key, storedRecord] of this.store.entries()) {
      if (key.startsWith(`${tenantDid}${TENANT_SEPARATOR}`)) {
        result.push(storedRecord);
      }
    }

    return result;
  }

  public async set({ id, data, tenant, agent, preventDuplicates }: DataStoreSetParams<TStoreObject>): Promise<void> {
    // Determine which DID to use to sign DWN messages.
    const tenantDid = await getDwnStoreTenant({ agent, tenant, didUri: id });

    // If enabled, check if a record with the given `id` is already present in the store.
    if (preventDuplicates) {
      const duplicateFound = this.store.has(`${tenantDid}${TENANT_SEPARATOR}${id}`);
      if (duplicateFound) {
        throw new Error(`${this.name}: Import failed due to duplicate entry for: ${id}`);
      }
    }

    // Make a deep copy so that the object stored does not share the same references as the input.
    const clonedData = structuredClone(data);
    this.store.set(`${tenantDid}${TENANT_SEPARATOR}${id}`, clonedData);
  }
}