import type { PortableDid } from '@web5/dids';

import { Convert, NodeStream, TtlCache } from '@web5/common';

import type { DidStore, DidStoreDeleteParams, DidStoreGetParams, DidStoreListParams, DidStoreSetParams } from './types/did.js';
import type { Web5ManagedAgent } from './types/agent.js';

import { TENANT_SEPARATOR } from './internal.js';
import { getDwnStoreTenant } from './internal.js';
import { DwnInterface } from './types/agent-dwn.js';
import { isPortableDid } from './temp/add-to-dids.js';

export class DwnDidStore<TStoreObject extends Record<string, any> = PortableDid> implements DidStore<TStoreObject> {
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

  public async delete({ didUri, agent, tenant }: DidStoreDeleteParams): Promise<boolean> {
    // Determine which DID to use to sign DWN messages.
    const tenantDid = await getDwnStoreTenant({ agent, tenant, didUri });

    // Attempt to find the DID in the store.
    let matchingRecordId = await this.findByDidUri({ didUri, tenantDid, agent });

    // Return false if the given DID was not found in the store.
    if (!matchingRecordId) return false;

    // If a record for the given DID was found, attempt to delete it.
    const { reply: { status } } = await agent.dwn.processRequest({
      author        : tenantDid,
      target        : tenantDid,
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

  public async get({ didUri, agent, tenant }: DidStoreGetParams): Promise<TStoreObject | undefined> {
    // Determine which DID to use to sign DWN messages.
    const tenantDid = await getDwnStoreTenant({ agent, tenant, didUri });

    // Attempt to find the DID in the store.
    let recordId = await this.findByDidUri({ didUri, tenantDid, agent });

    // If a matching record was found, read and return the DID object.
    if (recordId) {
      // Read the DID object from the store.
      const { reply: readReply } = await agent.dwn.processRequest({
        author        : tenantDid,
        target        : tenantDid,
        messageType   : DwnInterface.RecordsRead,
        messageParams : { filter: { recordId } }
      });

      // If the record was found, return it.
      if (readReply.record?.data) {
        return await NodeStream.consumeToJson({ readable: readReply.record.data });
      }
    }

    // Return undefined if no matches were found.
    return undefined;
  }

  public async list({ agent, tenant}: DidStoreListParams): Promise<TStoreObject[]> {
    // Determine which DID to use to sign DWN messages.
    const tenantDid = await getDwnStoreTenant({ tenant, agent });

    // Query the DWN for all stored DID objects.
    const storedDids = await this.findAll({ agent, tenantDid });

    return storedDids;
  }

  public async set({ didUri, value, tenant, agent }: DidStoreSetParams<TStoreObject>): Promise<void> {
    // Determine which DID to use to sign DWN messages.
    const tenantDid = await getDwnStoreTenant({ didUri, tenant, agent });

    // Check if the DID being added is already present in the store.
    const duplicateFound = await this.findByDidUri({ didUri, tenantDid, agent });
    if (duplicateFound) {
      throw new Error(`DwnDidStore: Import failed due to duplicate DID for: ${didUri}`);
    }

    // Convert the PortableDid object to a byte array.
    const didBytes = Convert.object(value).toUint8Array();

    // Store the DID in the DWN.
    const { reply: { status } } = await agent.dwn.processRequest({
      author        : tenantDid,
      target        : tenantDid,
      messageType   : DwnInterface.RecordsWrite,
      messageParams : { ...this._recordProperties },
      dataStream    : new Blob([didBytes], { type: 'application/json' })
    });

    // If the write fails, throw an error.
    if (status.code !== 202) {
      throw new Error(`${this.name}: Failed to write DID to store: ${didUri}`);
    }
  }

  private async findByDidUri({ didUri, tenantDid, agent }: {
    didUri: string;
    tenantDid: string;
    agent: Web5ManagedAgent;
  }): Promise<string | undefined> {
    // Check the index for a matching DID and extend the index TTL.
    let recordId = this._index.get(`${tenantDid}$${TENANT_SEPARATOR}{didUri}`, { updateAgeOnGet: true });

    // If no matching record ID was found in the index...
    if (!recordId) {
      // Query the DWN for all stored DID objects to rebuild the index.
      await this.findAll({ agent, tenantDid });

      // Check the index again for a matching DID.
      recordId = this._index.get(`${tenantDid}${TENANT_SEPARATOR}${didUri}`);
    }

    return recordId;
  }

  protected async findAll({ agent, tenantDid }: {
    agent: Web5ManagedAgent;
    tenantDid: string;
  }): Promise<TStoreObject[]> {
    // Query the DWN for all stored DID objects.
    const { reply: queryReply } = await agent.dwn.processRequest({
      author        : tenantDid,
      target        : tenantDid,
      messageType   : DwnInterface.RecordsQuery,
      messageParams : { filter: { ...this._recordProperties } }
    });

    // Loop through all of the stored DID records and accumulate the DID objects.
    let storedDids: TStoreObject[] = [];
    for (const record of queryReply.entries ?? []) {
      // All DID records are expected to be small enough such that the data is returned with the
      // query results. If a record is returned without `encodedData` this is unexpected so throw
      // an error.
      if (!record.encodedData) {
        throw new Error(`DwnDidStore: Expected 'encodedData' to be present in the DWN query result entry`);
      }

      const storedDid = Convert.base64Url(record.encodedData).toObject() as TStoreObject;
      if (isPortableDid(storedDid)) {
      // Update the index with the matching record ID.
        this._index.set(`${tenantDid}${TENANT_SEPARATOR}${storedDid.uri}`, record.recordId);
        storedDids.push(storedDid);
      }
    }

    return storedDids;
  }
}

export class InMemoryDidStore<TStoreObject extends Record<string, any> = PortableDid> implements DidStore<TStoreObject> {
  /**
   * A private field that contains the Map used as the in-memory key-value store.
   */
  private store: Map<string, TStoreObject> = new Map();

  public async delete({ didUri, agent, tenant }: DidStoreDeleteParams): Promise<boolean> {
    // Determine which DID to use as the tenant.
    const tenantDid = await getDwnStoreTenant({ agent, tenant, didUri });

    if (this.store.has(`${tenantDid}${TENANT_SEPARATOR}${didUri}`)) {
      // DID with given identifier exists so proceed with delete.
      this.store.delete(`${tenantDid}${TENANT_SEPARATOR}${didUri}`);
      return true;
    }

    // DID with given identifier not present so delete operation not possible.
    return false;
  }

  public async get({ didUri, agent, tenant }: DidStoreGetParams): Promise<TStoreObject | undefined> {
    // Determine which DID to use to sign DWN messages.
    const tenantDid = await getDwnStoreTenant({ agent, tenant, didUri });

    return this.store.get(`${tenantDid}${TENANT_SEPARATOR}${didUri}`);
  }

  public async list({ agent, tenant}: DidStoreListParams): Promise<TStoreObject[]> {
    // Determine which DID to use to sign DWN messages.
    const tenantDid = await getDwnStoreTenant({ tenant, agent });

    const result: TStoreObject[] = [];
    for (const [key, storedDid] of this.store.entries()) {
      if (key.startsWith(`${tenantDid}${TENANT_SEPARATOR}`)) {
        result.push(storedDid);
      }
    }
    return result;
  }

  public async set({ didUri, value, tenant, agent }: DidStoreSetParams<TStoreObject>): Promise<void> {
    // Determine which DID to use to sign DWN messages.
    const tenantDid = await getDwnStoreTenant({ didUri, tenant, agent });

    const duplicateFound = this.store.has(`${tenantDid}${TENANT_SEPARATOR}${didUri}`);
    if (duplicateFound) {
      throw new Error(`InMemoryDidStore: Import failed due to duplicate DID entry for: ${didUri}`);
    }

    // Make a deep copy of the DID so that the object stored does not share the same references as
    // the input.
    const clonedDid = structuredClone(value);
    this.store.set(`${tenantDid}${TENANT_SEPARATOR}${didUri}`, clonedDid);
  }
}