import type {
  DidDocument,
  DidMetadata,
  PortableDid,
  DidMethodApi,
  DidResolverCache,
  DidDhtCreateOptions,
  DidJwkCreateOptions,
  DidResolutionResult,
  DidResolutionOptions,
  DidVerificationMethod,
} from '@web5/dids';

import { BearerDid, Did, UniversalResolver } from '@web5/dids';

import type { AgentDataStore } from './store-data.js';
import type { AgentKeyManager } from './types/key-manager.js';
import type { ResponseStatus, Web5PlatformAgent } from './types/agent.js';

import { InMemoryDidStore } from './store-did.js';
import { DidResolverCacheMemory } from './prototyping/dids/resolver-cache-memory.js';

export enum DidInterface {
  Create  = 'Create',
  // Deactivate = 'Deactivate',
  Resolve = 'Resolve',
  // Update  = 'Update'
}

export interface DidMessageParams {
  [DidInterface.Create]: DidCreateParams;
  // [DidInterface.Deactivate]: DidDeactivateParams;
  [DidInterface.Resolve]: DidResolveParams;
  // [DidInterface.Update]: DidUpdateParams;
}

export interface DidMessageResult {
  [DidInterface.Create]: DidCreateResult;
  // [DidInterface.Deactivate]: DidDeactivateResult;
  [DidInterface.Resolve]: DidResolveResult;
  // [DidInterface.Update]: DidUpdateResult;
}

export type DidCreateResult = {
  uri: string;
  document: DidDocument;
  metadata: DidMetadata;
}

export type DidResolveResult = DidResolutionResult

export type DidRequest<T extends DidInterface> = {
  messageType: T;
  messageParams: DidMessageParams[T];
}

export type DidResolveParams = {
  didUri: string;
  options?: DidResolutionOptions;
}

export type DidResponse<T extends DidInterface> = ResponseStatus & {
  result?: DidMessageResult[T];
};

export interface DidCreateParams<
  TKeyManager = AgentKeyManager,
  TMethod extends keyof DidMethodCreateOptions<TKeyManager> = keyof DidMethodCreateOptions<TKeyManager>
> {
  method: TMethod;
  options?: DidMethodCreateOptions<TKeyManager>[TMethod];
  store?: boolean;
  tenant?: string;
}

export interface DidMethodCreateOptions<TKeyManager> {
  dht: DidDhtCreateOptions<TKeyManager>;
  jwk: DidJwkCreateOptions<TKeyManager>;
}

export interface DidApiParams {
  didMethods: DidMethodApi[];

  agent?: Web5PlatformAgent;

  /**
   * An optional `DidResolverCache` instance used for caching resolved DID documents.
   *
   * Providing a cache implementation can significantly enhance resolution performance by avoiding
   * redundant resolutions for previously resolved DIDs. If omitted, a no-operation cache is used,
   * which effectively disables caching.
   */
  resolverCache?: DidResolverCache;

  store?: AgentDataStore<PortableDid>;
}

export function isDidRequest<T extends DidInterface>(
  didRequest: DidRequest<DidInterface>, messageType: T
): didRequest is DidRequest<T> {
  return didRequest.messageType === messageType;
}

export class AgentDidApi<TKeyManager extends AgentKeyManager = AgentKeyManager> extends UniversalResolver {
  /**
   * Holds the instance of a `Web5PlatformAgent` that represents the current execution context for
   * the `AgentDidApi`. This agent is used to interact with other Web5 agent components. It's vital
   * to ensure this instance is set to correctly contextualize operations within the broader Web5
   * Agent framework.
   */
  private _agent?: Web5PlatformAgent;

  private _didMethods: Map<string, DidMethodApi> = new Map();

  private _store: AgentDataStore<PortableDid>;

  constructor({ agent, didMethods, resolverCache, store }: DidApiParams) {
    if (!didMethods) {
      throw new TypeError(`AgentDidApi: Required parameter missing: 'didMethods'`);
    }

    // Initialize the DID resolver with the given DID methods and resolver cache, or use a default
    // in-memory cache if none is provided.
    super({
      didResolvers : didMethods,
      cache        : resolverCache ?? new DidResolverCacheMemory()
    });

    this._agent = agent;

    // If `store` is not given, use an in-memory store by default.
    this._store = store ?? new InMemoryDidStore();

    for (const didMethod of didMethods) {
      this._didMethods.set(didMethod.methodName, didMethod);
    }
  }

  /**
   * Retrieves the `Web5PlatformAgent` execution context.
   *
   * @returns The `Web5PlatformAgent` instance that represents the current execution context.
   * @throws Will throw an error if the `agent` instance property is undefined.
   */
  get agent(): Web5PlatformAgent {
    if (this._agent === undefined) {
      throw new Error('AgentDidApi: Unable to determine agent execution context.');
    }

    return this._agent;
  }

  set agent(agent: Web5PlatformAgent) {
    this._agent = agent;
  }

  public async create({
    method, tenant, options, store
  }: DidCreateParams<TKeyManager>): Promise<BearerDid> {
    // Get the DID method implementation, which also verifies the method is supported.
    const didMethod = this.getMethod(method);

    // Create the DID and store the generated keys in the Agent's key manager.
    const bearerDid = await didMethod.create({ keyManager: this.agent.keyManager, options });

    // Persist the DID to the store, by default, unless the `store` option is set to false.
    if (store ?? true) {
      // Data stored in the Agent's DID store must be in PortableDid format.
      const { uri, document, metadata } = bearerDid;
      const portableDid: PortableDid = { uri, document, metadata };

      // Unless an existing `tenant` is specified, a record that includes the DID's URI, document,
      // and metadata will be stored under a new tenant controlled by the newly created DID.
      await this._store.set({
        id                : portableDid.uri,
        data              : portableDid,
        agent             : this.agent,
        tenant            : tenant ?? portableDid.uri,
        preventDuplicates : false,
        useCache          : true
      });
    }

    return bearerDid;
  }

  public async export({ didUri, tenant }: {
    didUri: string;
    tenant?: string;
  }): Promise<PortableDid> {
    // Attempt to retrieve the DID from the agent's DID store.
    const bearerDid = await this.get({ didUri, tenant });

    if (!bearerDid) {
      throw new Error(`AgentDidApi: Failed to export due to DID not found: ${didUri}`);
    }

    // If the DID was found, return the DID in a portable format, and if supported by the Agent's
    // key manager, the private key material.
    const portableDid = await bearerDid.export();

    return portableDid;
  }

  public async get({ didUri, tenant }: {
    didUri: string,
    tenant?: string
  }): Promise<BearerDid | undefined> {
    const portableDid = await this._store.get({ id: didUri, agent: this.agent, tenant, useCache: true });

    if (!portableDid) return undefined;

    const bearerDid = await BearerDid.import({ portableDid, keyManager: this.agent.keyManager });

    return bearerDid;
  }

  public async getSigningMethod({ didUri, methodId }: {
    didUri: string;
    methodId?: string;
  }): Promise<DidVerificationMethod> {
    // Verify the DID method is supported.
    const parsedDid = Did.parse(didUri);
    if (!parsedDid) {
      throw new Error(`Invalid DID URI: ${didUri}`);
    }

    // Get the DID method implementation, which also verifies the method is supported.
    const didMethod = this.getMethod(parsedDid.method);

    // Resolve the DID document.
    const { didDocument, didResolutionMetadata } = await this.resolve(didUri);
    if (!didDocument) {
      throw new Error(`DID resolution failed for '${didUri}': ${JSON.stringify(didResolutionMetadata)}`);
    }

    // Retrieve the method-specific verification method to be used for signing operations.
    const verificationMethod = await didMethod.getSigningMethod({ didDocument, methodId });

    return verificationMethod;
  }

  public async import({ portableDid, tenant }: {
    portableDid: PortableDid;
    tenant?: string;
  }): Promise<BearerDid> {
    // If private keys are present in the PortableDid, import the key material into the Agent's key
    // manager. Validate that the key material for every verification method in the DID document is
    // present in the key manager.
    const bearerDid = await BearerDid.import({ keyManager: this.agent.keyManager, portableDid });

    // Only the DID URI, document, and metadata are stored in the Agent's DID store.
    const { uri, document, metadata } = bearerDid;
    const portableDidWithoutKeys: PortableDid = { uri, document, metadata };

    // Store the DID in the agent's DID store.
    // Unless an existing `tenant` is specified, a record that includes the DID's URI, document,
    // and metadata will be stored under a new tenant controlled by the imported DID.
    await this._store.set({
      id                : portableDidWithoutKeys.uri,
      data              : portableDidWithoutKeys,
      agent             : this.agent,
      tenant            : tenant ?? portableDidWithoutKeys.uri,
      preventDuplicates : true,
      useCache          : true
    });

    return bearerDid;
  }

  public async processRequest<T extends DidInterface>(
    request: DidRequest<T>
  ): Promise<DidResponse<T>> {
    // Process Create DID request.
    if (isDidRequest(request, DidInterface.Create)) {
      try {
        const bearerDid = await this.create({ ...request.messageParams });
        const response: DidResponse<typeof request.messageType> = {
          result: {
            uri      : bearerDid.uri,
            document : bearerDid.document,
            metadata : bearerDid.metadata,
          },
          ok     : true,
          status : { code: 201, message: 'Created' }
        };
        return response;

      } catch (error: any) {
        return {
          ok     : false,
          status : { code: 500, message: error.message ?? 'Unknown error occurred' }
        };
      }
    }

    // Process Resolve DID request.
    if (isDidRequest(request, DidInterface.Resolve)) {
      const { didUri, options } = request.messageParams;
      const resolutionResult = await this.resolve(didUri, options);
      const response: DidResponse<typeof request.messageType> = {
        result : resolutionResult,
        ok     : true,
        status : { code: 200, message: 'OK' }
      };
      return response;
    }

    throw new Error(`AgentDidApi: Unsupported request type: ${request.messageType}`);
  }

  private getMethod(methodName: string): DidMethodApi {
    const didMethodApi = this._didMethods.get(methodName);

    if (didMethodApi === undefined) {
      throw new Error(`DID Method not supported: ${methodName}`);
    }

    return didMethodApi;
  }
}