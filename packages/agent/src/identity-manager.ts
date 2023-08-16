import type { PortableDid } from '@web5/dids';
import type { Web5ManagedAgent } from './types/agent.js';
import type { CreateDidMethodOptions, ManagedDid } from './did-manager.js';
import type { ManagedIdentityStore } from './store-managed-identity.js';

import { IdentityStoreMemory } from './store-managed-identity.js';

type CreateWithDid = Required<Pick<CreateIdentityOptions, 'did'>>
  & Pick<CreateIdentityOptions, 'context' | 'name' | 'kms'>

type CreateWithDidMethod<M extends DidMethod> = Pick<CreateIdentityOptions, 'context' | 'kms' | 'name'> & {
  didMethod: M;
  didOptions?: CreateDidMethodOptions[M];
}

type DidMethod = keyof CreateDidMethodOptions;

export type CreateIdentityOptions = {
  did?: PortableDid;
  didMethod?: any;
  didOptions?: any;
  context?: string;
  kms?: string;
  name: string;
}

export type IdentityManagerOptions = {
  agent?: Web5ManagedAgent;
  store?: ManagedIdentityStore;
}

export type ImportIdentityOptions = {
  context?: string;
  did?: PortableDid;
  identity: ManagedIdentity;
  kms?: string;
}

export interface ManagedIdentity {
  did: string;
  name: string;
}

export class IdentityManager {
  /**
   * Holds the instance of a `Web5ManagedAgent` that represents the current
   * execution context for the `KeyManager`. This agent is utilized
   * to interact with other Web5 agent components. It's vital
   * to ensure this instance is set to correctly contextualize
   * operations within the broader Web5 agent framework.
   */
  private _agent?: Web5ManagedAgent;
  private _store: ManagedIdentityStore;

  constructor(options?: IdentityManagerOptions) {
    const { agent, store } = options ?? {};
    this._agent = agent;
    this._store = store ?? new IdentityStoreMemory();
  }

  /**
   * Retrieves the `Web5ManagedAgent` execution context.
   * If the `agent` instance proprety is undefined, it will throw an error.
   *
   * @returns The `Web5ManagedAgent` instance that represents the current execution
   * context.
   *
   * @throws Will throw an error if the `agent` instance property is undefined.
   */
  get agent(): Web5ManagedAgent {
    if (this._agent === undefined) {
      throw new Error('IdentityManager: Unable to determine agent execution context.');
    }

    return this._agent;
  }

  set agent(agent: Web5ManagedAgent) {
    this._agent = agent;
  }

  async create<M extends DidMethod>(options: CreateWithDidMethod<M>): Promise<ManagedIdentity>;
  async create(options: CreateWithDid): Promise<ManagedIdentity>;
  async create(options: CreateIdentityOptions): Promise<ManagedIdentity> {
    let { context, did, didMethod, didOptions, kms, name } = options;

    if (!(didMethod ? !did : did)) {
      throw new Error(`Either 'did' or 'didMethod' must be defined, but not both.`);
    }

    let managedDid: ManagedDid | undefined;

    // Get the agent instance.
    const agent = this.agent;

    if (didMethod) {
      // Create new DID and generate key set.
      managedDid = await agent.didManager.create({ method: didMethod, context, kms, ...didOptions });

    } else if (did) {
      // Import given DID and key set.
      managedDid = await agent.didManager.import({ did, context, kms });
    }

    if (managedDid === undefined) {
      throw new Error('IdentityManager: Unable to generate or import DID.');
    }

    // Create a ManagedIdentity.
    const identity: ManagedIdentity = {
      did  : managedDid.did,
      name : name
    };

    /** If context is undefined, then the Identity will be stored under the
     * tenant of the created DID. Otherwise, the Identity records will
     * be stored under the tenant of the specified context. */
    context ??= identity.did;

    // Store the ManagedIdentity in the store.
    await this._store.importIdentity({ identity, agent, context });

    return identity;
  }

  async get(options: {
    did: string,
    context?: string
  }): Promise<ManagedIdentity | undefined> {
    const { context, did } = options;

    const identity = this._store.getIdentity({ did, agent: this.agent, context });

    return identity;
  }

  async import(options: ImportIdentityOptions): Promise<ManagedIdentity> {
    let { context, did, identity, kms } = options;

    // Get the agent instance.
    const agent = this.agent;

    // If provided, import the given DID and key set.
    if (did) {
      await agent.didManager.import({ did, context, kms });
    }

    /** If context is undefined, then the Identity will be stored under the
     * tenant of the imported DID. Otherwise, the Identity record will
     * be stored under the tenant of the specified context. */
    context ??= identity.did;

    // Store the ManagedIdentity in the store.
    await this._store.importIdentity({ identity, agent, context });

    return identity;
  }

  async list(options?: { context?: string }): Promise<ManagedIdentity[]> {
    const { context } = options ?? {};
    const identities = this._store.listIdentities({ agent: this.agent, context });

    return identities;
  }
}