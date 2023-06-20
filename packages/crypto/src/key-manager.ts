import type {
  ManagedKey,
  SignOptions,
  CryptoManager,
  ManagedKeyPair,
  GenerateKeyType,
  ManagedPrivateKey,
  GenerateKeyOptions,
  KeyManagementSystem,
  GenerateKeyOptionTypes,
} from './types-key-manager.js';

import { checkRequiredProperty, isManagedKeyPair } from './utils-key-manager.js';
import { MemoryKeyStore } from './key-store-memory.js';
import { KeyManagerStore } from './key-manager-store.js';
import { DefaultKms, KmsKeyStore, KmsPrivateKeyStore } from './kms/default/index.js';

export type KmsMap = {
  [name: string]: KeyManagementSystem;
}

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
export class KeyManager implements CryptoManager {
  // KMS name to KeyManagementSystem mapping
  #kms: Map<string, KeyManagementSystem>;
  // Store for managed key metadata.
  #keyStore: KeyManagerStore;

  constructor(options: KeyManagerOptions) {
    checkRequiredProperty({ property: 'store', inObject: options });
    this.#keyStore = options.store;

    options.kms ??= this.#useDefaultKms();
    this.#kms = new Map(Object.entries(options.kms)) ;
  }

  async generateKey<T extends GenerateKeyOptionTypes>(options: GenerateKeyOptions<T> & { kms?: string }): Promise<GenerateKeyType<T>> {
    const { kms: kmsName, ...generateKeyOptions } = options;

    const kms = this.#getKms(kmsName);

    const keyOrKeyPair = await kms.generateKey(generateKeyOptions);

    // Store the ManagedKey or ManagedKeyPair in KeyManager's key store.
    await this.#keyStore.importKey({ key: keyOrKeyPair });

    return keyOrKeyPair;
  }

  async getKey(options: { keyRef: string; }): Promise<ManagedKey | ManagedKeyPair> {
    const keyOrKeyPair = this.#keyStore.getKey({ id: options.keyRef });
    return keyOrKeyPair;
  }

  listKms() {
    return Array.from(this.#kms.keys());
  }

  async sign(options: SignOptions): Promise<ArrayBuffer> {
    let { key, keyRef, ...signOptions } = options;

    let keyPair;
    if (key) {
      keyPair = key;
    } else if (!key && keyRef) {
      keyPair = await this.getKey({ keyRef });
    } else {
      throw new TypeError(`Required parameter was missing: 'key' or 'keyRef'.`);
    }

    if (!isManagedKeyPair(keyPair)) {
      throw new TypeError(`'key' or 'keyRef' must refer to a valid key pair.`);
    }

    const kmsName = keyPair.privateKey.kms;
    const kms = this.#getKms(kmsName);

    const keyId = keyPair.privateKey.id;
    const signature = await kms.sign({ keyRef: keyId, ...signOptions });

    return signature;
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
    const kms = new DefaultKms('default', kmsKeyStore, kmsPrivateKeyStore);

    return { default: kms };
  }
}