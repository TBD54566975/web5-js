import type { KeyManagementSystem, ManagedKey, ManagedKeyPair, ManagedPrivateKey } from './types-new.js';

import { checkRequiredProperty } from './utils.js';
import { MemoryKeyStore } from './key-store-memory.js';
import { KeyManagerStore } from './key-manager-store.js';
import { DefaultKms, KmsKeyStore, KmsPrivateKeyStore } from './kms/default/index.js';

export type KmsMap = {
  [name: string]: KeyManagementSystem;
}

export type KeyManagerCreateOptions = Pick<ManagedKey, 'alias' | 'extractable' | 'kms' | 'metadata' | 'spec' | 'usages'>

export type KeyManagerOptions = {
  store: KeyManagerStore;
  kms?: KmsMap;
}

/**
 * KeyManager
 *
 * This class orchestrates implementations of {@link KeyManagementSystem},
 * using a ManagedKeyStore to remember the link between a key reference,
 * its metadata, and the respective key management system that provides the
 * actual cryptographic capabilities.
 *
 * The methods of this class are used automatically by other Web5 Agent
 * components, such as
 * {@link @tbd54566975/web5#DidApi | DidApi} or
 * {@link @tbd54566975/web5-user-agent#ProfileApi | ProfileApi} to
 * perform their required cryptographic operations using the managed keys.
 *
 * @public
 */
export class KeyManager {
  // KMS name to KeyManagementSystem mapping
  #kms: Map<string, KeyManagementSystem>;
  // Store for managed key metadata.
  #store: KeyManagerStore;

  constructor(options: KeyManagerOptions) {
    checkRequiredProperty('store', options);
    this.#store = options.store;

    options.kms ??= this.#useDefaultKms();
    this.#kms = new Map(Object.entries(options.kms)) ;
  }

  async createKey(options: KeyManagerCreateOptions): Promise<ManagedKey | ManagedKeyPair> {
    let { extractable, kms: kmsName, spec, usages, ...additionalOptions } = options;

    const kms = this.#getKms(kmsName);

    extractable ??= false; // Default to non-extractable keys, if not specified.
    const keyOrKeyPair = await kms.createKey({ spec, extractable, usages, additionalOptions });

    // Store the ManagedKey or ManagedKeyPair in KeyManager's key store.
    await this.#store.importKey({ key: keyOrKeyPair });

    return keyOrKeyPair;
  }

  listKms() {
    return Array.from(this.#kms.keys());
  }

  #getKms(name: string | undefined): KeyManagementSystem {
    // For developer convenience, if a KMS name isn't specified and KeyManager only has
    // one KMS defined, use it.  Otherwise, an exception will be thrown.
    name ??= (this.#kms.size === 1) ? this.#kms.keys().next().value : '';

    const kms = this.#kms.get(name!);

    if (!kms) {
      throw Error(`Unknown key management system: '${name}'`);
    }

    return kms;
  }

  #useDefaultKms(): KmsMap {
    // Instantiate default in-memory store for KMS key metadata and public keys.
    const kmsMemoryKeyStore = new MemoryKeyStore<string, ManagedKey | ManagedKeyPair>();
    const kmsKeyStore = new KmsKeyStore(kmsMemoryKeyStore);

    // Instantiate default in-memory store for KMS private keys.
    const memoryPrivateKeyStore = new MemoryKeyStore<string, ManagedPrivateKey>();
    const kmsPrivateKeyStore = new KmsPrivateKeyStore(memoryPrivateKeyStore);

    // Instantiate default KMS using key stores.
    const kms = new DefaultKms(kmsKeyStore, kmsPrivateKeyStore);

    return { default: kms };
  }
}