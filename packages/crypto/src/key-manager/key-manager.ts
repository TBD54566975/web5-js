import type {
  ManagedKey,
  SignOptions,
  CryptoManager,
  ImportableKey,
  VerifyOptions,
  DecryptOptions,
  EncryptOptions,
  ManagedKeyPair,
  GenerateKeyType,
  ImportKeyOptions,
  DeriveBitsOptions,
  ImportableKeyPair,
  ManagedPrivateKey,
  GenerateKeyOptions,
  KeyManagementSystem,
  GenerateKeyOptionTypes,
} from '../types/index.js';

import { MemoryStore } from '@tbd54566975/common';

import { KeyManagerStore } from './key-store.js';
import { LocalKms, KmsKeyStore, KmsPrivateKeyStore } from '../kms-local/index.js';
import { checkRequiredProperty, isManagedKey, isManagedKeyPair } from '../utils-new.js';

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

    options.kms ??= this.#useLocalKms();
    this.#kms = new Map(Object.entries(options.kms)) ;
  }

  async decrypt(options: DecryptOptions): Promise<ArrayBuffer> {
    let { keyRef, ...decryptOptions } = options;

    const key = await this.getKey({ keyRef });

    if (!isManagedKey(key)) {
      throw new Error(`Key not found: '${keyRef}'.`);
    }

    const kmsName = key.kms;
    const kms = this.#getKms(kmsName);

    const keyId = key.id;
    const plaintext = await kms.decrypt({ keyRef: keyId, ...decryptOptions });

    return plaintext;
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

  async encrypt(options: EncryptOptions): Promise<ArrayBuffer> {
    let { keyRef, ...encryptOptions } = options;

    const key = await this.getKey({ keyRef });

    if (!isManagedKey(key)) {
      throw new Error(`Key not found: '${keyRef}'.`);
    }

    const kmsName = key.kms;
    const kms = this.#getKms(kmsName);

    const keyId = key.id;
    const ciphertext = await kms.encrypt({ keyRef: keyId, ...encryptOptions });

    return ciphertext;
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

  async importKey(options: ImportableKeyPair): Promise<ManagedKeyPair>;
  async importKey(options: ImportableKey): Promise<ManagedKey>;
  async importKey(options: ImportKeyOptions): Promise<ManagedKey | ManagedKeyPair> {
    const kmsName = ('privateKey' in options) ? options.privateKey.kms : options.kms;
    const kms = this.#getKms(kmsName);

    const importedKeyOrKeyPair = await kms.importKey(options);

    // Store the ManagedKey or ManagedKeyPair in KeyManager's key store.
    await this.#keyStore.importKey({ key: importedKeyOrKeyPair });

    return importedKeyOrKeyPair;
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

  #useLocalKms(): KmsMap {
    // Instantiate local in-memory store for KMS key metadata and public keys.
    const kmsMemoryStore = new MemoryStore<string, ManagedKey | ManagedKeyPair>();
    const kmsKeyStore = new KmsKeyStore(kmsMemoryStore);

    // Instantiate local in-memory store for KMS private keys.
    const kmsPrivateMemoryStore = new MemoryStore<string, ManagedPrivateKey>();
    const kmsPrivateKeyStore = new KmsPrivateKeyStore(kmsPrivateMemoryStore);

    // Instantiate local KMS using key stores.
    const kms = new LocalKms('local', kmsKeyStore, kmsPrivateKeyStore);

    return { local: kms };
  }
}