import type { Web5ManagedAgent } from './agent.js';

export type DidStoreContextParams = {
  agent: Web5ManagedAgent;
  context?: string;
}

export type DidStoreListParas = DidStoreContextParams;

export type DidStoreGetParams = DidStoreContextParams & {
  didUri: string;
}

export type DidStoreSetParams<TStoreObject> = DidStoreContextParams & {
  didUri: string;
  value: TStoreObject;
}

export type DidStoreDeleteParams = DidStoreContextParams & {
  didUri: string;
}

export interface DidStore<TStoreObject> {
  delete(params: DidStoreDeleteParams): Promise<boolean>;

  get(params: DidStoreGetParams): Promise<TStoreObject | undefined>;

  list(params: DidStoreContextParams): Promise<TStoreObject[]>;

  set(params: DidStoreSetParams<TStoreObject>): Promise<void>;
}