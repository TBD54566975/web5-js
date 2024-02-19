import type { PortableDid } from '@web5/dids';

import { Convert, TtlCache } from '@web5/common';

import type { Web5ManagedAgent } from './types/agent.js';
import type { AgentDataStore, DataStoreDeleteParams, DataStoreGetParams, DataStoreListParams, DataStoreSetParams } from './store-data.js';

import { TENANT_SEPARATOR } from './internal.js';
import { DwnInterface } from './types/agent-dwn.js';
import { isPortableDid } from './temp/add-to-dids.js';
import { DwnDataStore, InMemoryDataStore } from './store-data.js';

export class DwnDidStore extends DwnDataStore<PortableDid> implements AgentDataStore<PortableDid> {
  protected name = 'DwnDidStore';

  /**
   * Index for mappings from DID URI to DWN record ID.
   *
   * Entries expire after 2 hours.
   */
  protected _index = new TtlCache<string, string>({ ttl: 60000 * 60 * 2 });

  /**
   * Properties to use when writing and querying DID records with the DWN store.
   */
  protected _recordProperties = {
    dataFormat : 'application/json',
    schema     : 'https://identity.foundation/schemas/web5/portable-did'
  };

  public async delete(params: DataStoreDeleteParams): Promise<boolean> {
    return await super.delete(params);
  }

  public async get(params: DataStoreGetParams): Promise<PortableDid | undefined> {
    return await super.get(params);
  }

  public async list(params: DataStoreListParams): Promise<PortableDid[]> {
    return await super.list(params);
  }

  public async set(params: DataStoreSetParams<PortableDid>): Promise<void> {
    return await super.set(params);
  }

  protected async getAllRecords({ agent, tenantDid }: {
    agent: Web5ManagedAgent;
    tenantDid: string;
  }): Promise<PortableDid[]> {
    // Clear the index since it will be rebuilt from the query results.
    this._index.clear();

    // Query the DWN for all stored PortableDid objects.
    const { reply: queryReply } = await agent.dwn.processRequest({
      author        : tenantDid,
      target        : tenantDid,
      messageType   : DwnInterface.RecordsQuery,
      messageParams : { filter: { ...this._recordProperties } }
    });

    // Loop through all of the stored DID records and accumulate the DID objects.
    let storedDids: PortableDid[] = [];
    for (const record of queryReply.entries ?? []) {
      // All DID records are expected to be small enough such that the data is returned with the
      // query results. If a record is returned without `encodedData` this is unexpected so throw
      // an error.
      if (!record.encodedData) {
        throw new Error(`${this.name}: Expected 'encodedData' to be present in the DWN query result entry`);
      }

      const storedDid = Convert.base64Url(record.encodedData).toObject() as PortableDid;
      if (isPortableDid(storedDid)) {
        // Update the index with the matching record ID.
        const indexKey = `${tenantDid}${TENANT_SEPARATOR}${storedDid.uri}`;
        this._index.set(indexKey, record.recordId);

        // Add the stored DID to the cache.
        this._cache.set(record.recordId, storedDid);

        storedDids.push(storedDid);
      }
    }

    return storedDids;
  }
}

export class InMemoryDidStore extends InMemoryDataStore<PortableDid> implements AgentDataStore<PortableDid> {
  protected name = 'InMemoryDidStore';

  public async delete(params: DataStoreDeleteParams): Promise<boolean> {
    return await super.delete(params);
  }

  public async get(params: DataStoreGetParams): Promise<PortableDid | undefined> {
    return await super.get(params);
  }

  public async list(params: DataStoreListParams): Promise<PortableDid[]> {
    return await super.list(params);
  }

  public async set(params: DataStoreSetParams<PortableDid>): Promise<void> {
    return await super.set(params);
  }
}