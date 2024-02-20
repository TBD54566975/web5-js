import type { Jwk } from '@web5/crypto';

import { KEY_URI_PREFIX_JWK, isPrivateJwk } from '@web5/crypto';
import { Convert } from '@web5/common';

import type { Web5PlatformAgent } from './types/agent.js';

import { TENANT_SEPARATOR } from './utils-internal.js';
import { DwnInterface } from './types/dwn.js';
import { AgentDataStore, DataStoreDeleteParams, DataStoreGetParams, DataStoreListParams, DataStoreSetParams, DwnDataStore, InMemoryDataStore } from './store-data.js';

export class DwnKeyStore extends DwnDataStore<Jwk> implements AgentDataStore<Jwk> {
  protected name = 'DwnKeyStore';

  /**
   * Properties to use when writing and querying Private Key records with the DWN store.
   */
  protected _recordProperties = {
    dataFormat : 'application/json',
    schema     : 'https://identity.foundation/schemas/web5/private-jwk'
  };

  public async delete(params: DataStoreDeleteParams): Promise<boolean> {
    return await super.delete(params);
  }

  public async get(params: DataStoreGetParams): Promise<Jwk | undefined> {
    return await super.get(params);
  }

  public async set(params: DataStoreSetParams<Jwk>): Promise<void> {
    await super.set(params);
  }

  public async list(params: DataStoreListParams): Promise<Jwk[]> {
    return await super.list(params);
  }

  protected async getAllRecords({ agent, tenantDid }: {
    agent: Web5PlatformAgent;
    tenantDid: string;
  }): Promise<Jwk[]> {
    // Clear the index since it will be rebuilt from the query results.
    this._index.clear();

    // Query the DWN for all stored Jwk objects.
    const { reply: queryReply } = await agent.dwn.processRequest({
      author        : tenantDid,
      target        : tenantDid,
      messageType   : DwnInterface.RecordsQuery,
      messageParams : { filter: { ...this._recordProperties } }
    });

    // Loop through all of the stored Jwk records and accumulate the objects.
    let storedKeys: Jwk[] = [];
    for (const record of queryReply.entries ?? []) {
      // All Jwk records are expected to be small enough such that the data is returned
      // with the query results. If a record is returned without `encodedData` this is unexpected so
      // throw an error.
      if (!record.encodedData) {
        throw new Error(`${this.name}: Expected 'encodedData' to be present in the DWN query result entry`);
      }

      const storedKey = Convert.base64Url(record.encodedData).toObject() as Jwk;
      if (isPrivateJwk(storedKey)) {
        // Update the index with the matching record ID.
        const indexKey = `${tenantDid}${TENANT_SEPARATOR}${KEY_URI_PREFIX_JWK}${storedKey.kid}`;
        this._index.set(indexKey, record.recordId);

        // Add the stored key to the cache.
        this._cache.set(record.recordId, storedKey);

        storedKeys.push(storedKey);
      }
    }

    return storedKeys;
  }
}

export class InMemoryKeyStore extends InMemoryDataStore<Jwk> implements AgentDataStore<Jwk> {
  protected name = 'InMemoryKeyStore';

  public async delete(params: DataStoreDeleteParams): Promise<boolean> {
    return await super.delete(params);
  }

  public async get(params: DataStoreGetParams): Promise<Jwk | undefined> {
    return await super.get(params);
  }

  public async list(params: DataStoreListParams): Promise<Jwk[]> {
    return await super.list(params);
  }

  public async set(params: DataStoreSetParams<Jwk>): Promise<void> {
    return await super.set(params);
  }
}