import type { Web5ManagedAgent } from './agent.js';

export type DidStoreTenantParams = {
  agent: Web5ManagedAgent;
  tenant?: string;
}

export type DidStoreListParams = DidStoreTenantParams;

export type DidStoreGetParams = DidStoreTenantParams & {
  didUri: string;
}

export type DidStoreSetParams<TStoreObject> = DidStoreTenantParams & {
  didUri: string;
  value: TStoreObject;
}

export type DidStoreDeleteParams = DidStoreTenantParams & {
  didUri: string;
}

export interface DidStore<TStoreObject> {
  delete(params: DidStoreDeleteParams): Promise<boolean>;

  get(params: DidStoreGetParams): Promise<TStoreObject | undefined>;

  list(params: DidStoreTenantParams): Promise<TStoreObject[]>;

  set(params: DidStoreSetParams<TStoreObject>): Promise<void>;
}