import type { Jwk } from '@web5/crypto';

import ms from 'ms';
import { Convert, NodeStream, TtlCache } from '@web5/common';

import type { Web5PlatformAgent } from './types/agent.js';

import { TENANT_SEPARATOR } from './utils-internal.js';
import { getDataStoreTenant } from './utils-internal.js';
import { DwnInterface } from './types/dwn.js';

export type DataStoreTenantParams = {
  agent: Web5PlatformAgent;
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

export interface AgentDataStore<TStoreObject> {
  delete(params: DataStoreDeleteParams): Promise<boolean>;

  get(params: DataStoreGetParams): Promise<TStoreObject | undefined>;

  list(params: DataStoreTenantParams): Promise<TStoreObject[]>;

  set(params: DataStoreSetParams<TStoreObject>): Promise<void>;
}

export class DwnDataStore<TStoreObject extends Record<string, any> = Jwk> implements AgentDataStore<TStoreObject> {
  protected name = 'DwnDataStore';

  /**
     * Cache of Store Objects referenced by DWN record ID to Store Objects.
     *
     * Up to 100 entries are retained for 15 minutes.
     */
  protected _cache = new TtlCache<string, TStoreObject>({ ttl: ms('15 minutes'), max: 100 });

  /**
   * Index for mappings from Store Identifier to DWN record ID.
   *
   * Up to 1,000 entries are retained for 2 hours.
   */
  protected _index = new TtlCache<string, string>({ ttl: ms('2 hours'), max: 1000 });

  /**
   * Properties to use when writing and querying records with the DWN store.
   */
  protected _recordProperties = {
    dataFormat : 'application/json',
    schema     : 'https://identity.foundation/schemas/web5/private-jwk'
  };

  public async delete({ id, agent, tenant }: DataStoreDeleteParams): Promise<boolean> {
    // Determine the tenant identifier (DID) for the delete operation.
    const tenantDid = await getDataStoreTenant({ agent, tenant, didUri: id });

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
    // Determine the tenant identifier (DID) for the list operation.
    const tenantDid = await getDataStoreTenant({ agent, tenant, didUri: id });

    // Look up the DWN record ID of the object in the store with the given `id`.
    let matchingRecordId = await this.lookupRecordId({ id, tenantDid, agent });

    // Return undefined if no matches were found.
    if (!matchingRecordId) return undefined;

    // Retrieve and return the stored object.
    return await this.getRecord({ recordId: matchingRecordId, tenantDid, agent, useCache });
  }

  public async list({ agent, tenant}: DataStoreListParams): Promise<TStoreObject[]> {
    // Determine the tenant identifier (DID) for the list operation.
    const tenantDid = await getDataStoreTenant({ tenant, agent });

    // Query the DWN for all stored record objects.
    const storedRecords = await this.getAllRecords({ agent, tenantDid });

    return storedRecords;
  }

  public async set({ id, data, tenant, agent, preventDuplicates = true, useCache = false }:
    DataStoreSetParams<TStoreObject>
  ): Promise<void> {
    // Determine the tenant identifier (DID) for the set operation.
    const tenantDid = await getDataStoreTenant({ agent, tenant, didUri: id });

    // If enabled, check if a record with the given `id` is already present in the store.
    if (preventDuplicates) {
      // Look up the DWN record ID of the object in the store with the given `id`.
      const matchingRecordId = await this.lookupRecordId({ id, tenantDid, agent });
      if (matchingRecordId) {
        throw new Error(`${this.name}: Import failed due to duplicate entry for: ${id}`);
      }
    }

    // Convert the store object to a byte array, which will be the data payload of the DWN record.
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

    // Add the ID of the newly created record to the index.
    this._index.set(`${tenantDid}${TENANT_SEPARATOR}${id}`, message.recordId);

    // If caching is enabled, add the store object to the cache.
    if (useCache) {
      this._cache.set(message.recordId, data);
    }
  }

  protected async getAllRecords(_params: {
    agent: Web5PlatformAgent;
    tenantDid: string;
  }): Promise<TStoreObject[]> {
    throw new Error('Not implemented: Classes extending DwnDataStore must implement getAllRecords()');
  }

  private async getRecord({ recordId, tenantDid, agent, useCache }: {
    recordId: string;
    tenantDid: string;
    agent: Web5PlatformAgent;
    useCache: boolean;
  }): Promise<TStoreObject | undefined> {
    // If caching is enabled, check the cache for the record ID.
    if (useCache) {
      const record = this._cache.get(recordId);
      // If the record ID was present in the cache, return the associated store object.
      if (record) return record;
      // Otherwise, continue to read from the store.
    }

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

    // If the record was found, convert back to store object format.
    const storeObject = await NodeStream.consumeToJson({ readable: readReply.record.data }) as TStoreObject;

    // If caching is enabled, add the store object to the cache.
    if (useCache) {
      this._cache.set(recordId, storeObject);
    }

    return storeObject;
  }

  private async lookupRecordId({ id, tenantDid, agent }: {
    id: string;
    tenantDid: string;
    agent: Web5PlatformAgent;
  }): Promise<string | undefined> {
    // Check the index for a matching ID and extend the index TTL.
    let recordId = this._index.get(`${tenantDid}${TENANT_SEPARATOR}${id}`, { updateAgeOnGet: true });

    // If no matching record ID was found in the index...
    if (!recordId) {
      // Query the DWN for all stored objects, which rebuilds the index.
      await this.getAllRecords({ agent, tenantDid });

      // Check the index again for a matching ID.
      recordId = this._index.get(`${tenantDid}${TENANT_SEPARATOR}${id}`);
    }

    return recordId;
  }
}

export class InMemoryDataStore<TStoreObject extends Record<string, any> = Jwk> implements AgentDataStore<TStoreObject> {
  protected name = 'InMemoryDataStore';

  /**
   * A private field that contains the Map used as the in-memory data store.
   */
  private store: Map<string, TStoreObject> = new Map();

  public async delete({ id, agent, tenant }: DataStoreDeleteParams): Promise<boolean> {
    // Determine the tenant identifier (DID) for the delete operation.
    const tenantDid = await getDataStoreTenant({ agent, tenant, didUri: id });

    if (this.store.has(`${tenantDid}${TENANT_SEPARATOR}${id}`)) {
      // Record with given identifier exists so proceed with delete.
      this.store.delete(`${tenantDid}${TENANT_SEPARATOR}${id}`);
      return true;
    }

    // Record with given identifier not present so delete operation not possible.
    return false;
  }

  public async get({ id, agent, tenant }: DataStoreGetParams): Promise<TStoreObject | undefined> {
    // Determine the tenant identifier (DID) for the get operation.
    const tenantDid = await getDataStoreTenant({ agent, tenant, didUri: id });

    return this.store.get(`${tenantDid}${TENANT_SEPARATOR}${id}`);
  }

  public async list({ agent, tenant}: DataStoreListParams): Promise<TStoreObject[]> {
    // Determine the tenant identifier (DID) for the list operation.
    const tenantDid = await getDataStoreTenant({ tenant, agent });

    const result: TStoreObject[] = [];
    for (const [key, storedRecord] of this.store.entries()) {
      if (key.startsWith(`${tenantDid}${TENANT_SEPARATOR}`)) {
        result.push(storedRecord);
      }
    }

    return result;
  }

  public async set({ id, data, tenant, agent, preventDuplicates }: DataStoreSetParams<TStoreObject>): Promise<void> {
    // Determine the tenant identifier (DID) for the set operation.
    const tenantDid = await getDataStoreTenant({ agent, tenant, didUri: id });

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