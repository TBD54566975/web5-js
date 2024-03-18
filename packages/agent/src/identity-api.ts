import type { RequireOnly } from '@web5/common';

import type { AgentDataStore } from './store-data.js';
import type { Web5PlatformAgent } from './types/agent.js';
import type { DidMethodCreateOptions } from './did-api.js';
import type { AgentKeyManager } from './types/key-manager.js';
import type { IdentityMetadata, PortableIdentity } from './types/identity.js';

import { BearerIdentity } from './bearer-identity.js';
import { isPortableDid } from './prototyping/dids/utils.js';
import { InMemoryIdentityStore } from './store-identity.js';

export interface IdentityApiParams<TKeyManager extends AgentKeyManager> {
  agent?: Web5PlatformAgent<TKeyManager>;

  store?: AgentDataStore<IdentityMetadata>;
}

export interface IdentityCreateParams<
  TKeyManager = AgentKeyManager,
  TMethod extends keyof DidMethodCreateOptions<TKeyManager> = keyof DidMethodCreateOptions<TKeyManager>
> {
  metadata: RequireOnly<IdentityMetadata, 'name'>;
  didMethod?: TMethod;
  didOptions?: DidMethodCreateOptions<TKeyManager>[TMethod];
  tenant?: string;
  store?: boolean;
}

export function isPortableIdentity(obj: unknown): obj is PortableIdentity {
  // Validate that the given value is an object that has the necessary properties of PortableIdentity.
  return !(!obj || typeof obj !== 'object' || obj === null)
    && 'did' in obj
    && 'metadata' in obj
    && isPortableDid(obj.did);
}

export class AgentIdentityApi<TKeyManager extends AgentKeyManager = AgentKeyManager> {
  /**
   * Holds the instance of a `Web5PlatformAgent` that represents the current execution context for
   * the `AgentIdentityApi`. This agent is used to interact with other Web5 agent components. It's
   * vital to ensure this instance is set to correctly contextualize operations within the broader
   * Web5 Agent framework.
   */
  private _agent?: Web5PlatformAgent<TKeyManager>;

  private _store: AgentDataStore<IdentityMetadata>;

  constructor({ agent, store }: IdentityApiParams<TKeyManager> = {}) {
    this._agent = agent;

    // If `store` is not given, use an in-memory store by default.
    this._store = store ?? new InMemoryIdentityStore();
  }

  /**
   * Retrieves the `Web5PlatformAgent` execution context.
   *
   * @returns The `Web5PlatformAgent` instance that represents the current execution context.
   * @throws Will throw an error if the `agent` instance property is undefined.
   */
  get agent(): Web5PlatformAgent<TKeyManager> {
    if (this._agent === undefined) {
      throw new Error('AgentIdentityApi: Unable to determine agent execution context.');
    }

    return this._agent;
  }

  set agent(agent: Web5PlatformAgent<TKeyManager>) {
    this._agent = agent;
  }

  public async create({ metadata, didMethod = 'dht', didOptions, store, tenant }:
    IdentityCreateParams<TKeyManager>
  ): Promise<BearerIdentity> {
    // Unless an existing `tenant` is specified, a record that includes the DID's URI, document,
    // and metadata will be stored under a new tenant controlled by the newly created DID.
    const bearerDid = await this.agent.did.create({
      method  : didMethod,
      options : didOptions,
      store,
      tenant
    });

    // Create the BearerIdentity object.
    const identity = new BearerIdentity({
      did      : bearerDid,
      metadata : { ...metadata, uri: bearerDid.uri, tenant: tenant ?? bearerDid.uri }
    });

    // Persist the Identity to the store, by default, unless the `store` option is set to false.
    if (store ?? true) {
      await this._store.set({
        id                : identity.did.uri,
        data              : identity.metadata,
        agent             : this.agent,
        tenant            : identity.metadata.tenant,
        preventDuplicates : false,
        useCache          : true
      });
    }

    return identity;
  }

  public async export({ didUri, tenant }: {
    didUri: string;
    tenant?: string;
  }): Promise<PortableIdentity> {
    // Attempt to retrieve the Identity from the Agent's Identity store.
    const bearerIdentity = await this.get({ didUri, tenant });

    if (!bearerIdentity) {
      throw new Error(`AgentIdentityApi: Failed to export due to Identity not found: ${didUri}`);
    }

    // If the Identity was found, return the Identity in a portable format, and if supported by the
    // Agent's key manager, the private key material.
    const portableIdentity = await bearerIdentity.export();

    return portableIdentity;
  }

  public async get({ didUri, tenant }: {
    didUri: string;
    tenant?: string;
  }): Promise<BearerIdentity | undefined> {
    // Attempt to retrieve the Identity from the Agent's Identity store.
    const storedIdentity = await this._store.get({ id: didUri, agent: this.agent, tenant, useCache: true });

    // If the Identity is not found in the store, return undefined.
    if (!storedIdentity) return undefined;

    // Retrieve the DID from the Agent's DID store using the tenant value from the stored
    // Identity's metadata.
    const storedDid = await this.agent.did.get({ didUri, tenant: storedIdentity.tenant });

    // If the Identity is present but the DID is not found, throw an error.
    if (!storedDid) {
      throw new Error(`AgentIdentityApi: Identity is present in the store but DID is missing: ${didUri}`);
    }

    // Create the BearerIdentity object.
    const identity = new BearerIdentity({ did: storedDid, metadata: storedIdentity });

    return identity;
  }

  public async import({ portableIdentity }: {
    portableIdentity: PortableIdentity;
  }): Promise<BearerIdentity> {
    // Import the PortableDid to the Agent's DID store.
    const storedDid = await this.agent.did.import({
      portableDid : portableIdentity.portableDid,
      tenant      : portableIdentity.metadata.tenant
    });

    // Verify the DID is present in the Agent's DID store.
    if (!storedDid) {
      throw new Error(`AgentIdentityApi: Failed to import Identity: ${portableIdentity.metadata.uri}`);
    }

    // Create the BearerIdentity object.
    const identity = new BearerIdentity({ did: storedDid, metadata: portableIdentity.metadata });

    // Store the Identity metadata in the Agent's Identity store.
    await this._store.set({
      id                : identity.did.uri,
      data              : identity.metadata,
      agent             : this.agent,
      tenant            : identity.metadata.tenant,
      preventDuplicates : true,
      useCache          : true
    });

    return identity;
  }

  public async list({ tenant }: {
    tenant?: string;
  } = {}): Promise<BearerIdentity[]> {
    // Retrieve the list of Identities from the Agent's Identity store.
    const storedIdentities = await this._store.list({ agent: this.agent, tenant });

    const identities: BearerIdentity[] = [];

    for (const metadata of storedIdentities) {
      const identity = await this.get({ didUri: metadata.uri, tenant: metadata.tenant });
      identities.push(identity!);
    }

    return identities;
  }

  public async manage({ portableIdentity }: {
    portableIdentity: PortableIdentity;
  }): Promise<BearerIdentity> {
    // Retrieve the DID using the `tenant` stored in the given Identity's metadata.
    const storedDid = await this.agent.did.get({
      didUri : portableIdentity.metadata.uri,
      tenant : portableIdentity.metadata.tenant
    });

    // Verify the DID is present in the DID store.
    if (!storedDid) {
      throw new Error(`AgentIdentityApi: Failed to manage Identity: ${portableIdentity.metadata.uri}`);
    }

    // Create the BearerIdentity object.
    const identity = new BearerIdentity({ did: storedDid, metadata: portableIdentity.metadata });

    // Store the Identity metadata in the Agent's Identity store.
    await this._store.set({
      id                : identity.did.uri,
      data              : identity.metadata,
      agent             : this.agent,
      preventDuplicates : true,
      useCache          : true
    });

    return identity;
  }
}