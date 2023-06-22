import type {
  ManagedKey,
  SignOptions,
  CryptoManager,
  VerifyOptions,
  ManagedKeyPair,
  GenerateKeyType,
  ManagedPrivateKey,
  GenerateKeyOptions,
  KeyManagementSystem,
  GenerateKeyOptionTypes,
  DeriveBitsOptions,
  ImportKeyOptions,
} from './types-key-manager.js';

import { MemoryKeyStore } from './key-store-memory.js';
import { KeyManagerStore } from './key-manager-store.js';
import { checkRequiredProperty, isManagedKeyPair } from './utils-key-manager.js';
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

  async deriveBits(options: DeriveBitsOptions): Promise<ArrayBuffer> {
    const { baseKeyRef, ...deriveBitsOptions } = options;

    const ownKeyPair = await this.getKey({ keyRef: baseKeyRef });

    if (!isManagedKeyPair(ownKeyPair)) {
      throw new Error(`Key not found: '${baseKeyRef}'.`);
    }

    const kmsName = ownKeyPair.privateKey.kms;
    const kms = this.#getKms(kmsName);

    const ownKeyId = ownKeyPair.privateKey.id;
    const sharedSecret = kms.deriveBits({ baseKeyRef: ownKeyId, ...deriveBitsOptions });

    return sharedSecret;
  }

  async generateKey<T extends GenerateKeyOptionTypes>(options: GenerateKeyOptions<T> & { kms?: string }): Promise<GenerateKeyType<T>> {
    const { kms: kmsName, ...generateKeyOptions } = options;

    const kms = this.#getKms(kmsName);

    const keyOrKeyPair = await kms.generateKey(generateKeyOptions);

    // Store the ManagedKey or ManagedKeyPair in KeyManager's key store.
    await this.#keyStore.importKey({ key: keyOrKeyPair });

    return keyOrKeyPair;
  }

  async getKey(options: { keyRef: string; }): Promise<ManagedKey | ManagedKeyPair | undefined> {
    const keyOrKeyPair = this.#keyStore.getKey({ id: options.keyRef });
    return keyOrKeyPair;
  }

  async importKey(options: ImportKeyOptions): Promise<ManagedKey | ManagedKeyPair> {
    console.log(options);
    return null as any;
  }

  listKms() {
    return Array.from(this.#kms.keys());
  }

  async sign(options: SignOptions): Promise<ArrayBuffer> {
    let { keyRef, ...signOptions } = options;

    const keyPair = await this.getKey({ keyRef });

    if (!isManagedKeyPair(keyPair)) {
      throw new Error(`Key not found: '${keyRef}'.`);
    }

    const kmsName = keyPair.privateKey.kms;
    const kms = this.#getKms(kmsName);

    const keyId = keyPair.privateKey.id;
    const signature = await kms.sign({ keyRef: keyId, ...signOptions });

    return signature;
  }

  async verify(options: VerifyOptions): Promise<boolean> {
    let { keyRef, ...verifyOptions } = options;

    const keyPair = await this.getKey({ keyRef });

    if (!isManagedKeyPair(keyPair)) {
      throw new Error(`Key not found: '${keyRef}'.`);
    }

    const kmsName = keyPair.publicKey.kms;
    const kms = this.#getKms(kmsName);

    const keyId = keyPair.publicKey.id;
    const isValid = await kms.verify({ keyRef: keyId, ...verifyOptions });

    return isValid;
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