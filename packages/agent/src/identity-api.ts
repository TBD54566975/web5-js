import type { CryptoApi } from '@web5/crypto';

import type { Web5ManagedAgent } from './types/agent.js';
import type { IdentityMetadata, IdentityStore, PortableIdentity } from './types/identity.js';

import { BearerDid } from '@web5/dids';
import { InMemoryIdentityStore } from './store-identity.js';
import { DidMethodCreateOptions } from './did-api.js';
import { AgentCryptoApi } from './crypto-api.js';

export interface BearerIdentity {
  did: BearerDid;
  metadata: IdentityMetadata;
}

export interface IdentityApiParams {
  agent?: Web5ManagedAgent;

  store?: IdentityStore;
}

export interface IdentityCreateParams<
  TKeyManager = CryptoApi,
  TMethod extends keyof DidMethodCreateOptions<TKeyManager> = keyof DidMethodCreateOptions<TKeyManager>
> {
  metadata: IdentityMetadata;
  didMethod?: TMethod;
  didOptions?: DidMethodCreateOptions<TKeyManager>[TMethod];
  context?: string;
  store?: boolean;
}

export class AgentIdentityApi<TKeyManager extends AgentCryptoApi = AgentCryptoApi> {
  /**
   * Holds the instance of a `Web5ManagedAgent` that represents the current execution context for
   * the `AgentDidApi`. This agent is used to interact with other Web5 agent components. It's vital
   * to ensure this instance is set to correctly contextualize operations within the broader Web5
   * Agent framework.
   */
  private _agent?: Web5ManagedAgent;

  private _store: IdentityStore;

  constructor({ agent, store }: IdentityApiParams = {}) {
    this._agent = agent;

    // If `store` is not given, use an in-memory store by default.
    this._store = store ?? new InMemoryIdentityStore();
  }

  /**
   * Retrieves the `Web5ManagedAgent` execution context.
   *
   * @returns The `Web5ManagedAgent` instance that represents the current execution context.
   * @throws Will throw an error if the `agent` instance property is undefined.
   */
  get agent(): Web5ManagedAgent {
    if (this._agent === undefined) {
      throw new Error('AgentIdentityApi: Unable to determine agent execution context.');
    }

    return this._agent;
  }

  set agent(agent: Web5ManagedAgent) {
    this._agent = agent;
  }

  public async create({
    metadata, didMethod = 'dht', didOptions, context, store
  }: IdentityCreateParams<TKeyManager>): Promise<BearerIdentity> {
    // Create the DID.
    const did = await this.agent.did.create({ method: didMethod, context, options: didOptions, store });

    // Create the Identity.
    const identity: BearerIdentity = { did, metadata };

    // If context is undefined, then the Identity will be stored under the tenant of the created Identity.
    // Otherwise, the Identity record will be stored under the tenant of the specified context.
    context ??= identity.did.uri;

    // Persist the Identity to the store, by default, unless the `store` option is set to false.
    if (store ?? true) {
      const portableIdentity: PortableIdentity = { did: await identity.did.export(), metadata: identity.metadata };
      await this._store.set({ didUri: identity.did.uri, value: portableIdentity, agent: this.agent, context });
    }

    return identity;
  }
}