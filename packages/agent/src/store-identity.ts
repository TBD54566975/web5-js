import { Convert, TtlCache } from '@web5/common';

import type { Web5ManagedAgent } from './types/agent.js';
import type { IdentityMetadata, PortableIdentity } from './types/identity.js';
import type { DidStore, DidStoreDeleteParams, DidStoreGetParams, DidStoreListParams, DidStoreSetParams, DidStoreTenantParams } from './types/did.js';

import { TENANT_SEPARATOR } from './internal.js';
import { DwnInterface } from './types/agent-dwn.js';
import { isPortableDid } from './temp/add-to-dids.js';
import { DwnDidStore, InMemoryDidStore } from './store-did.js';

export type IdentityStoreSetParams<TStoreObject> = DidStoreTenantParams & {
  identity: TStoreObject;
}

export function isPortableIdentity(obj: unknown): obj is PortableIdentity {
  // Validate that the given value is an object that has the necessary properties of PortableIdentity.
  return !(!obj || typeof obj !== 'object' || obj === null)
    && 'did' in obj
    && 'metadata' in obj
    && isPortableDid(obj.did);
}

export function isIdentityMetadata(obj: unknown): obj is IdentityMetadata {
  // Validate that the given value is an object that has the necessary properties of IdentityMetadata.
  return !(!obj || typeof obj !== 'object' || obj === null)
    && 'name' in obj;
}

export class DwnIdentityStore extends DwnDidStore<IdentityMetadata> implements DidStore<IdentityMetadata> {
  /**
   * Index for mappings from DID URI to DWN record ID.
   *
   * Entries expire after 2 hours.
   */
  protected _index = new TtlCache<string, string>({ ttl: 60000 * 60 * 2 });

  /**
   * Properties to use when writing and querying Identity records with the DWN store.
   */
  protected _recordProperties = {
    dataFormat : 'application/json',
    schema     : 'https://identity.foundation/schemas/web5/identity-metadata'
  };

  public async delete({ didUri, agent, tenant }: DidStoreDeleteParams): Promise<boolean> {
    return await super.delete({ didUri, agent, tenant });
  }

  public async get({ didUri, agent, tenant }: DidStoreGetParams): Promise<IdentityMetadata | undefined> {
    return await super.get({ didUri, agent, tenant });
  }

  public async set({ didUri, value, tenant, agent }: DidStoreSetParams<IdentityMetadata>): Promise<void> {
    return await super.set({ didUri, value, tenant, agent });
  }

  public async list({ agent, tenant }: DidStoreListParams): Promise<IdentityMetadata[]> {
    return await super.list({ agent, tenant });
  }

  protected async findAll({ agent, tenantDid }: {
    agent: Web5ManagedAgent;
    tenantDid: string;
  }): Promise<IdentityMetadata[]> {
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
        throw new Error(`DwnIdentityStore: Expected 'encodedData' to be present in the DWN query result entry`);
      }

      const storedIdentity = Convert.base64Url(record.encodedData).toObject() as IdentityMetadata;
      if (isIdentityMetadata(storedIdentity)) {
      // Update the index with the matching record ID.
        this._index.set(`${tenantDid}${TENANT_SEPARATOR}${storedIdentity.uri}`, record.recordId);
        storedIdentities.push(storedIdentity);
      }
    }

    return storedIdentities;
  }
}

export class InMemoryIdentityStore extends InMemoryDidStore<IdentityMetadata> implements DidStore<IdentityMetadata> {
  public async delete({ didUri, agent, tenant }: DidStoreDeleteParams): Promise<boolean> {
    return await super.delete({ didUri, agent, tenant });
  }

  public async get({ didUri, agent, tenant }: DidStoreGetParams): Promise<IdentityMetadata | undefined> {
    return await super.get({ didUri, agent, tenant });
  }

  public async list({ agent, tenant}: DidStoreListParams): Promise<IdentityMetadata[]> {
    return await super.list({ agent, tenant });
  }

  public async set({ didUri, value, tenant, agent }: DidStoreSetParams<IdentityMetadata>): Promise<void> {
    return await super.set({ didUri, value, tenant, agent });
  }
}