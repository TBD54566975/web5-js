import { Convert } from '@web5/common';

import type { Web5PlatformAgent } from './types/agent.js';
import type { IdentityMetadata } from './types/identity.js';
import type { AgentDataStore, DataStoreDeleteParams, DataStoreGetParams, DataStoreListParams, DataStoreSetParams } from './store-data.js';

import { TENANT_SEPARATOR } from './utils-internal.js';
import { DwnInterface } from './types/dwn.js';
import { DwnDataStore, InMemoryDataStore } from './store-data.js';

export function isIdentityMetadata(obj: unknown): obj is IdentityMetadata {
  // Validate that the given value is an object that has the necessary properties of IdentityMetadata.
  return !(!obj || typeof obj !== 'object' || obj === null)
    && 'name' in obj;
}

export class DwnIdentityStore extends DwnDataStore<IdentityMetadata> implements AgentDataStore<IdentityMetadata> {
  protected name = 'DwnIdentityStore';

  /**
   * Properties to use when writing and querying Identity records with the DWN store.
   */
  protected _recordProperties = {
    dataFormat : 'application/json',
    schema     : 'https://identity.foundation/schemas/web5/identity-metadata'
  };

  public async delete(params: DataStoreDeleteParams): Promise<boolean> {
    return await super.delete(params);
  }

  public async get(params: DataStoreGetParams): Promise<IdentityMetadata | undefined> {
    return await super.get(params);
  }

  public async set(params: DataStoreSetParams<IdentityMetadata>): Promise<void> {
    return await super.set(params);
  }

  public async list(params: DataStoreListParams): Promise<IdentityMetadata[]> {
    return await super.list(params);
  }

  protected async getAllRecords({ agent, tenantDid }: {
    agent: Web5PlatformAgent;
    tenantDid: string;
  }): Promise<IdentityMetadata[]> {
    // Clear the index since it will be rebuilt from the query results.
    this._index.clear();

    // Query the DWN for all stored IdentityMetadata objects.
    const { reply: queryReply } = await agent.dwn.processRequest({
      author        : tenantDid,
      target        : tenantDid,
      messageType   : DwnInterface.RecordsQuery,
      messageParams : { filter: { ...this._recordProperties } }
    });

    // Loop through all of the stored IdentityMetadata records and accumulate the objects.
    let storedIdentities: IdentityMetadata[] = [];
    for (const record of queryReply.entries ?? []) {
      // All IdentityMetadata records are expected to be small enough such that the data is returned
      // with the query results. If a record is returned without `encodedData` this is unexpected so
      // throw an error.
      if (!record.encodedData) {
        throw new Error(`${this.name}: Expected 'encodedData' to be present in the DWN query result entry`);
      }

      const storedIdentity = Convert.base64Url(record.encodedData).toObject() as IdentityMetadata;
      if (isIdentityMetadata(storedIdentity)) {
        // Update the index with the matching record ID.
        const indexKey = `${tenantDid}${TENANT_SEPARATOR}${storedIdentity.uri}`;
        this._index.set(indexKey, record.recordId);

        // Add the stored Identity to the cache.
        this._cache.set(record.recordId, storedIdentity);

        storedIdentities.push(storedIdentity);
      }
    }

    return storedIdentities;
  }
}

export class InMemoryIdentityStore extends InMemoryDataStore<IdentityMetadata> implements AgentDataStore<IdentityMetadata> {
  protected name = 'InMemoryIdentityStore';

  public async delete(params: DataStoreDeleteParams): Promise<boolean> {
    return await super.delete(params);
  }

  public async get(params: DataStoreGetParams): Promise<IdentityMetadata | undefined> {
    return await super.get(params);
  }

  public async list(params: DataStoreListParams): Promise<IdentityMetadata[]> {
    return await super.list(params);
  }

  public async set(params: DataStoreSetParams<IdentityMetadata>): Promise<void> {
    return await super.set(params);
  }
}