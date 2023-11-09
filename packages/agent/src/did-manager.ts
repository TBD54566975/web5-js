import type { PublicKeyJwk, Web5Crypto } from '@web5/crypto';
import type {
  DidKeySet,
  DidDocument,
  DidMetadata,
  PortableDid,
  DidMethodApi,
  DidIonCreateOptions,
  DidKeyCreateOptions,
} from '@web5/dids';

import { Jose} from '@web5/crypto';
import { utils } from '@web5/dids';

import type { ManagedDidStore } from './store-managed-did.js';
import type { DidRequest, DidResponse, Web5ManagedAgent } from './types/agent.js';

import { DidStoreMemory } from './store-managed-did.js';

export type CreateDidMethodOptions = {
  ion: DidIonCreateOptions;
  key: DidKeyCreateOptions;
};

export type CreateDidOptions<M extends keyof CreateDidMethodOptions> = CreateDidMethodOptions[M] & {
  method: M;
  alias?: string;
  context?: string;
  kms?: string;
  metadata?: DidMetadata;
}

export enum DidMessage {
  Create  = 'Create',
  Resolve = 'Resolve',
}

export type ImportDidOptions = {
  alias?: string;
  context?: string;
  did: PortableDid;
  kms?: string;
}

export interface ManagedDid extends PortableDid {
  /**
   * An alternate identifier used to identify the DID.
   * This property can be used to associate a DID with an external identifier.
   */
  alias?: string;

  /**
   * DID Method name.
   */
  method: string;
}

export type DidManagerOptions = {
  agent?: Web5ManagedAgent;
  didMethods: DidMethodApi[];
  store?: ManagedDidStore;
}

export type DidIonGenerateKeySetOptions = { /* empty */ }
export type DidKeyGenerateKeySetOptions = { /* empty */ }

export type GenerateKeySetOptions = {
  ion: DidIonGenerateKeySetOptions;
  key: DidKeyGenerateKeySetOptions;
};

export class DidManager {
  /**
   * Holds the instance of a `Web5ManagedAgent` that represents the current
   * execution context for the `KeyManager`. This agent is utilized
   * to interact with other Web5 agent components. It's vital
   * to ensure this instance is set to correctly contextualize
   * operations within the broader Web5 agent framework.
   */
  private _agent?: Web5ManagedAgent;
  private _didMethods: Map<string, DidMethodApi> = new Map();
  private _store: ManagedDidStore;

  constructor(options: DidManagerOptions) {
    const { agent, didMethods, store } = options;
    this._agent = agent;
    this._store = store ?? new DidStoreMemory();

    if (!didMethods) {
      throw new TypeError(`DidManager: Required parameter missing: 'didMethods'`);
    }

    for (const didMethod of didMethods) {
      this._didMethods.set(didMethod.methodName, didMethod);
    }
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
      throw new Error('DidManager: Unable to determine agent execution context.');
    }

    return this._agent;
  }

  set agent(agent: Web5ManagedAgent) {
    this._agent = agent;
  }

  async create<M extends keyof CreateDidMethodOptions>(options: CreateDidOptions<M>): Promise<ManagedDid> {
    let { alias, keySet, kms, metadata, method, context, ...methodOptions } = options;

    // Get the DID method implementation.
    const didMethod = this.getMethod(method);

    // If keySet not given, generate a DID method specific key set.
    if (keySet?.verificationMethodKeys === undefined) {
      keySet = await didMethod.generateKeySet();
    }

    /** Import key set to KeyManager, or if already in KeyManager, retrieve the
     * public key. */
    keySet = await this.importOrGetKeySet({ keySet, kms });

    // Create a DID.
    const did = await didMethod.create({ ...methodOptions, keySet });

    // Set the KeyManager alias for each key to the DID Document primary ID.
    await this.updateKeySet({
      canonicalId : did.canonicalId,
      didDocument : did.document,
      keySet
    });

    // Merged given metadata and format as a ManagedDid.
    const mergedMetadata = { ...metadata, ...did.metadata };
    const managedDid = { alias, method, ...did, metadata: mergedMetadata };

    /** If context is undefined, then the DID will be stored under the
     * tenant of the created DID. Otherwise, the DID record will
     * be stored under the tenant of the specified context. */
    context ??= managedDid.did;

    // Store the ManagedDid in the store.
    await this._store.importDid({ did: managedDid, agent: this.agent, context });

    return managedDid;
  }

  async getDefaultSigningKey(options: {
    did: string
  }): Promise<string | undefined> {
    const { did } = options;

    // Resolve the DID to a DID Document.
    const { didDocument } = await this.agent.didResolver.resolve(did);

    // Get the DID method implementation.
    const parsedDid = utils.parseDid({ didUrl: did });

    if (!(didDocument && parsedDid)) {
      throw new Error(`DidManager: Unable to resolve: ${did}`);
    }

    const didMethod = this.getMethod(parsedDid.method);

    // Retrieve the DID method specific default signing key.
    const verificationMethodId = await didMethod.getDefaultSigningKey({ didDocument });

    return verificationMethodId;
  }

  async get(options: {
    didRef: string,
    context?: string
  }): Promise<ManagedDid | undefined> {
    let did: ManagedDid | undefined;
    const { context, didRef } = options;

    // Try to get DID by ID.
    did = await this._store.getDid({ did: didRef, agent: this.agent, context });
    if (did) return did;

    // Try to find DID by alias.
    did = await this._store.findDid({ alias: didRef, agent: this.agent, context });
    if (did) return did;

    return undefined;
  }

  async import(options: ImportDidOptions): Promise<ManagedDid> {
    let { alias, context, did, kms } = options;

    if (did.keySet === undefined) {
      throw new Error(`Portable DID is missing required property: 'keySet'`);
    }

    // Verify the DID method is supported.
    const parsedDid = utils.parseDid({ didUrl: did.did });
    if (!parsedDid) {
      throw new Error(`DidManager: Unable to resolve: ${did}`);
    }
    const { method } = parsedDid;
    this.getMethod(method);

    /** Import key set to KeyManager, or if already in KeyManager, retrieve the
     * public key. */
    const keySet = await this.importOrGetKeySet({ keySet: did.keySet, kms });

    // Set the KeyManager alias for each key to the DID Document primary ID.
    await this.updateKeySet({
      canonicalId : did.canonicalId,
      didDocument : did.document,
      keySet
    });

    // Format the PortableDid and given input as a ManagedDid.
    const managedDid = { alias, method, ...did, keySet };

    /** If context is undefined, then the DID will be stored under the
     * tenant of the imported DID. Otherwise, the DID record will
     * be stored under the tenant of the specified context. */
    context ??= managedDid.did;

    // Store the ManagedDid in the store.
    await this._store.importDid({ did: managedDid, agent: this.agent, context });

    return managedDid;
  }

  /**
   * Retrieves a `DidMethodApi` instance associated with a specific method
   * name. This method uses the method name to access the `didMethods` map
   * and returns the corresponding `DidMethodApi` instance. If a method
   * name is provided that does not exist within the `didMethods` map, it
   * will throw an error.
   *
   * @param methodName - A string representing the name of the method for
   * which the corresponding `DidMethodApi` instance is to be retrieved.
   *
   * @returns The `DidMethodApi` instance that corresponds to the provided
   * method name. If no `DidMethodApi` instance corresponds to the provided
   * method name, an error is thrown.
   *
   * @throws Will throw an error if the provided method name does not
   * correspond to any `DidMethodApi` instance within the `didMethods` map.
   */
  private getMethod(methodName: string): DidMethodApi {
    const didMethod = this._didMethods.get(methodName);

    if (didMethod === undefined) {
      throw new Error(`The DID method '${methodName}' is not supported`);
    }

    return didMethod;
  }

  private async importOrGetKeySet(options: {
    keySet: DidKeySet,
    kms: string | undefined
  }): Promise<DidKeySet> {
    const { kms } = options;

    // Get the agent instance.
    const agent = this.agent;

    // Make a deep copy of the key set to prevent side effects.
    const keySet = structuredClone(options.keySet);

    for (let key of keySet.verificationMethodKeys!) {
      /**
       * The key has no `keyManagerId` value, indicating it is not present in
       * the KeyManager store. Import each key into KeyManager.
       */
      if (key.keyManagerId === undefined) {
        if ('publicKeyJwk' in key && 'privateKeyJwk' in key
            && key.publicKeyJwk && key.privateKeyJwk) {
          // Import key pair to KeyManager.
          const publicKey = await Jose.jwkToCryptoKey({ key: key.publicKeyJwk });
          const privateKey = await Jose.jwkToCryptoKey({ key: key.privateKeyJwk! });
          const importedKeyPair = await agent.keyManager.importKey({
            privateKey : { kms: kms, ...privateKey, material: privateKey.material },
            publicKey  : { kms: kms, ...publicKey, material: publicKey.material }
          });
          // Store the UUID assigned by KeyManager.
          key.keyManagerId = importedKeyPair.privateKey.id;
          // Delete the private key.
          delete key.privateKeyJwk;

        } else if ('publicKeyJwk' in key && key.publicKeyJwk) {
          // Import only public key.
          const publicKey = await Jose.jwkToCryptoKey({ key: key.publicKeyJwk });
          const importedPublicKey = await agent.keyManager.importKey({
            kms: kms, ...publicKey, material: publicKey.material
          });
          // Store the UUID assigned by KeyManager.
          key.keyManagerId = importedPublicKey.id;

        } else {
          throw new Error(`Required parameter(s) missing: 'publicKeyJwk', and optionally, 'privateKeyJwk`);
        }

      /**
       * The key does have a `keyManagerId` value so retrieve the public key
       * from the KeyManager store.
       */
      } else {
        const keyOrKeyPair = await agent.keyManager.getKey({ keyRef: key.keyManagerId });
        if (!keyOrKeyPair) throw new Error(`Key with ID '${key.keyManagerId} not found.`);
        const publicKey = 'publicKey' in keyOrKeyPair ? keyOrKeyPair.publicKey : keyOrKeyPair;
        // Convert public key from CryptoKey to JWK format.
        key.publicKeyJwk = await Jose.cryptoKeyToJwk({ key: publicKey as Web5Crypto.CryptoKey }) as PublicKeyJwk;
      }
    }

    return keySet;
  }

  public async processRequest(request: DidRequest): Promise<DidResponse> {
    const { messageOptions, messageType, store: _ } = request;

    switch (messageType) {
      case DidMessage.Create: {
        const result = await this.create(messageOptions);
        return { result };
        break;
      }
      default: {
        throw new Error(`DidManager: Unsupported request type: ${messageType}`);
      }
    }
  }

  /**
   * Set the KeyManager alias for each key to the DID primary ID.
   *
   * If defined, use the `canonicalId` as the primary ID for the
   * DID subject. Otherwise, use the `id` property from the topmost
   * map of the DID document.
   *
   * @see {@link https://www.w3.org/TR/did-core/#did-subject | DID Subject}
   * @see {@link https://www.w3.org/TR/did-core/#dfn-canonicalid | DID Document Metadata}
   */
  private async updateKeySet(options: {
    canonicalId?: string,
    didDocument: DidDocument,
    keySet: DidKeySet
  }) {
    const { canonicalId, didDocument, keySet, } = options;

    // Get the agent instance.
    const agent = this.agent;

    // DID primary ID is the canonicalId, if present, or the DID document `id`.
    const didPrimaryId = canonicalId ?? didDocument.id;

    for (let keyPair of keySet.verificationMethodKeys!) {
      /** Compute the multibase ID for the JWK in case the DID method uses
           * publicKeyMultibase format. */
      const publicKeyMultibase = await Jose.jwkToMultibaseId({ key: keyPair.publicKeyJwk! });

      // Find the verification method ID of the key in the DID document.
      const methodId = utils.getVerificationMethodIds({
        didDocument,
        publicKeyJwk: keyPair.publicKeyJwk,
        publicKeyMultibase
      });

      if (!(methodId && methodId.includes('#'))) {
        throw new Error('DidManager: Unable to update key set due to malformed verification method ID');
      }

      /** Construct the key alias given the DID's primary ID and the key's
       * verification method ID. */
      const [, fragment] = methodId.split('#');
      const keyAlias = `${didPrimaryId}#${fragment}`;

      // Set the KeyManager alias to the method ID.
      await agent.keyManager.updateKey({ keyRef: keyPair.keyManagerId!, alias: keyAlias });
    }
  }
}