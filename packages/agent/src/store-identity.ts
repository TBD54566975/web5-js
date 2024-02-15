import { Convert, TtlCache } from '@web5/common';

import type { Web5ManagedAgent } from './types/agent.js';
import type { PortableIdentity } from './types/identity.js';
import type { DidStore, DidStoreContextParams, DidStoreDeleteParams, DidStoreGetParams, DidStoreListParas, DidStoreSetParams } from './types/did.js';

import { DwnDidStore, InMemoryDidStore } from './store-did.js';
import { DwnInterface } from './types/agent-dwn.js';
import { isPortableDid } from './temp/add-to-dids.js';

export type IdentityStoreSetParams<TStoreObject> = DidStoreContextParams & {
  identity: TStoreObject;
}

export function isPortableIdentity(obj: unknown): obj is PortableIdentity {
  // Validate that the given value is an object that has the necessary properties of PortableIdentity.
  return !(!obj || typeof obj !== 'object' || obj === null)
    && 'did' in obj
    && 'metadata' in obj
    && isPortableDid(obj.did);
}

export class DwnIdentityStore extends DwnDidStore<PortableIdentity> implements DidStore<PortableIdentity> {
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
    schema     : 'https://identity.foundation/schemas/web5/portable-identity'
  };

  public async delete({ didUri, agent, context }: DidStoreDeleteParams): Promise<boolean> {
    return await super.delete({ didUri, agent, context });
  }

  public async get({ didUri, agent, context }: DidStoreGetParams): Promise<PortableIdentity | undefined> {
    return await super.get({ didUri, agent, context });
  }

  public async set({ didUri, value, context, agent }: DidStoreSetParams<PortableIdentity>): Promise<void> {
    return await super.set({ didUri, value, context, agent });
  }

  public async list({ agent, context }: DidStoreListParas): Promise<PortableIdentity[]> {
    return await super.list({ agent, context });
  }

  protected async findAll({ agent, authorDid }: {
    agent: Web5ManagedAgent;
    authorDid: string;
  }): Promise<PortableIdentity[]> {
    // Query the DWN for all stored DID objects.
    const { reply: queryReply } = await agent.dwn.processRequest({
      author        : authorDid,
      target        : authorDid,
      messageType   : DwnInterface.RecordsQuery,
      messageParams : { filter: { ...this._recordProperties } }
    });

    // Loop through all of the stored DID records and accumulate the DID objects.
    let storedIdentities: PortableIdentity[] = [];
    for (const record of queryReply.entries ?? []) {
      // All DID records are expected to be small enough such that the data is returned with the
      // query results. If a record is returned without `encodedData` this is unexpected so throw
      // an error.
      if (!record.encodedData) {
        throw new Error(`DwnDidStore: Expected 'encodedData' to be present in the DWN query result entry`);
      }

      const storedIdentity = Convert.base64Url(record.encodedData).toObject() as PortableIdentity;
      if (isPortableIdentity(storedIdentity)) {
      // Update the index with the matching record ID.
        this._index.set(storedIdentity.did.uri, record.recordId);
        storedIdentities.push(storedIdentity);
      }
    }

    return storedIdentities;
  }
}

export class InMemoryIdentityStore extends InMemoryDidStore<PortableIdentity> implements DidStore<PortableIdentity> {
  public async delete({ didUri, agent, context }: DidStoreDeleteParams): Promise<boolean> {
    return await super.delete({ didUri, agent, context });
  }

  public async get({ didUri, agent, context }: DidStoreGetParams): Promise<PortableIdentity | undefined> {
    return await super.get({ didUri, agent, context });
  }

  public async list({ agent, context}: DidStoreContextParams): Promise<PortableIdentity[]> {
    return await super.list({ agent, context });
  }

  public async set({ didUri, value, context, agent }: DidStoreSetParams<PortableIdentity>): Promise<void> {
    return await super.set({ didUri, value, context, agent });
  }
}