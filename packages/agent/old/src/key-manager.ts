import type {
  ManagedKey,
  PortableKey,
  SignOptions,
  CryptoManager,
  VerifyOptions,
  DecryptOptions,
  EncryptOptions,
  ManagedKeyPair,
  GenerateKeyType,
  ManagedKeyStore,
  ImportKeyOptions,
  UpdateKeyOptions,
  DeriveBitsOptions,
  PortableKeyPair,
  GenerateKeyOptions,
  KeyManagementSystem,
  GenerateKeyOptionTypes,
} from './types/managed-key.js';

import { Web5ManagedAgent } from './types/agent.js';
import { LocalKms } from './kms-local.js';
import { isManagedKey, isManagedKeyPair } from './utils.js';
import { KeyStoreMemory, PrivateKeyStoreMemory } from './store-managed-key.js';

export type KmsMap = {
  [name: string]: KeyManagementSystem;
}

export type KeyManagerOptions = {
  agent?: Web5ManagedAgent;
  kms?: KmsMap;
  store?: ManagedKeyStore<string, ManagedKey | ManagedKeyPair>;
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
 * components to perform their required cryptographic operations using
 * the managed keys.
 *
 * @public
 */
export class KeyManager implements CryptoManager {
  /**
   * Holds the instance of a `Web5ManagedAgent` that represents the current
   * execution context for the `KeyManager`. This agent is utilized
   * to interact with other Web5 agent components. It's vital
   * to ensure this instance is set to correctly contextualize
   * operations within the broader Web5 agent framework.
   */
  private _agent?: Web5ManagedAgent;
  // ManagedKey to use for signing DWN messages with DWN-backed store.
  private _defaultSigningKey?: ManagedKeyPair;
  // KMS name to KeyManagementSystem mapping.
  private _kms: Map<string, KeyManagementSystem>;
  // Store for managed key metadata.
  private _store: ManagedKeyStore<string, ManagedKey | ManagedKeyPair>;

  constructor(options?: KeyManagerOptions) {
    let { agent, kms, store } = options ?? { };
    this._agent = agent;
    this._store = store ?? new KeyStoreMemory();

    kms ??= this.useMemoryKms();
    this._kms = new Map(Object.entries(kms)) ;
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
      throw new Error('KeyManager: Unable to determine agent execution context.');
    }

    return this._agent;
  }

  set agent(agent: Web5ManagedAgent) {
    this._agent = agent;
    this._kms.forEach((kms) => {
      kms.agent = agent;
    });
  }

  async decrypt(options: DecryptOptions): Promise<Uint8Array> {
    let { keyRef, ...decryptOptions } = options;

    const key = await this.getKey({ keyRef });

    if (!isManagedKey(key)) {
      throw new Error(`Key not found: '${keyRef}'`);
    }

    const kmsName = key.kms;
    const kms = this.getKms(kmsName);

    const keyId = key.id;
    const plaintext = await kms.decrypt({ keyRef: keyId, ...decryptOptions });

    return plaintext;
  }

  async deriveBits(options: DeriveBitsOptions): Promise<Uint8Array> {
    const { baseKeyRef, ...deriveBitsOptions } = options;

    const ownKeyPair = await this.getKey({ keyRef: baseKeyRef });

    if (!isManagedKeyPair(ownKeyPair)) {
      throw new Error(`Key not found: '${baseKeyRef}'`);
    }

    const kmsName = ownKeyPair.privateKey.kms;
    const kms = this.getKms(kmsName);

    const ownKeyId = ownKeyPair.privateKey.id;
    const sharedSecret = kms.deriveBits({ baseKeyRef: ownKeyId, ...deriveBitsOptions });

    return sharedSecret;
  }

  async encrypt(options: EncryptOptions): Promise<Uint8Array> {
    let { keyRef, ...encryptOptions } = options;

    const key = await this.getKey({ keyRef });

    if (!isManagedKey(key)) {
      throw new Error(`Key not found: '${keyRef}'`);
    }

    const kmsName = key.kms;
    const kms = this.getKms(kmsName);

    const keyId = key.id;
    const ciphertext = await kms.encrypt({ keyRef: keyId, ...encryptOptions });

    return ciphertext;
  }

  async generateKey<T extends GenerateKeyOptionTypes>(options: GenerateKeyOptions<T> & { kms?: string }): Promise<GenerateKeyType<T>> {
    const { kms: kmsName, ...generateKeyOptions } = options;

    const kms = this.getKms(kmsName);

    const keyOrKeyPair = await kms.generateKey(generateKeyOptions);

    // Store the ManagedKey or ManagedKeyPair in KeyManager's key store.
    await this._store.importKey({ key: keyOrKeyPair, agent: this.agent });

    return keyOrKeyPair;
  }

  async getKey({ keyRef }: { keyRef: string }): Promise<ManagedKey | ManagedKeyPair | undefined> {
    let keyOrKeyPair: ManagedKey | ManagedKeyPair | undefined;

    // First, check to see if the requested key is the default signing key.
    const defaultSigningKeyId = this._defaultSigningKey?.publicKey.id;
    const defaultSigningKeyAlias = this._defaultSigningKey?.publicKey.alias;
    if (keyRef === defaultSigningKeyId || keyRef === defaultSigningKeyAlias) {
      return this._defaultSigningKey;
    }

    // Try to get key by ID.
    keyOrKeyPair = await this._store.getKey({ id: keyRef, agent: this.agent });
    if (keyOrKeyPair) return keyOrKeyPair;

    // Try to find key by alias.
    keyOrKeyPair = await this._store.findKey({ alias: keyRef, agent: this.agent });
    if (keyOrKeyPair) return keyOrKeyPair;

    return undefined;
  }

  async importKey(options: PortableKeyPair): Promise<ManagedKeyPair>;
  async importKey(options: PortableKey): Promise<ManagedKey>;
  async importKey(options: ImportKeyOptions): Promise<ManagedKey | ManagedKeyPair> {
    const kmsName = ('privateKey' in options) ? options.privateKey.kms : options.kms;
    const kms = this.getKms(kmsName);

    // Store the ManagedKey or ManagedKeyPair in the given KMS.
    const importedKeyOrKeyPair = await kms.importKey(options);

    // Store the ManagedKey or ManagedKeyPair in KeyManager's key store.
    await this._store.importKey({ key: importedKeyOrKeyPair, agent: this.agent });

    return importedKeyOrKeyPair;
  }

  listKms() {
    return Array.from(this._kms.keys());
  }

  async setDefaultSigningKey({ key }: { key: PortableKeyPair }) {
    const kmsName = key.privateKey.kms;
    const kms = this.getKms(kmsName);

    // Store the default signing key pair in an in-memory KMS.
    const importedDefaultSigningKey = await kms.importKey(key);

    // Set the in-memory key to be KeyManager's default signing key.
    this._defaultSigningKey = importedDefaultSigningKey;
  }

  async sign(options: SignOptions): Promise<Uint8Array> {
    const { keyRef, ...signOptions } = options;

    const keyPair = await this.getKey({ keyRef });

    if (!isManagedKeyPair(keyPair)) {
      throw new Error(`Key not found: '${keyRef}'`);
    }

    const kmsName = keyPair.privateKey.kms;
    const kms = this.getKms(kmsName);

    const keyId = keyPair.privateKey.id;
    const signature = await kms.sign({ keyRef: keyId, ...signOptions });

    return signature;
  }

  async updateKey(options: UpdateKeyOptions): Promise<boolean> {
    const { keyRef, alias, metadata } = options;

    const keyOrKeyPair = await this.getKey({ keyRef });

    if (!keyOrKeyPair) {
      throw new Error(`Key not found: '${keyRef}'`);
    }

    const { id: keyId, kms: kmsName } = (isManagedKeyPair(keyOrKeyPair))
      ? { ...keyOrKeyPair.publicKey }
      : { ...keyOrKeyPair };

    // Update the ManagedKey or ManagedKeyPair in the given KMS.
    const kms = this.getKms(kmsName);
    const kmsUpdated = await kms.updateKey(options);

    if (!kmsUpdated) return false;

    // Since the KMS was successfully updated, update the KeyManager store.
    return await this._store.updateKey({ id: keyId, alias, metadata, agent: this.agent });
  }

  async verify(options: VerifyOptions): Promise<boolean> {
    let { keyRef, ...verifyOptions } = options;

    const keyPair = await this.getKey({ keyRef });

    if (!isManagedKeyPair(keyPair)) {
      throw new Error(`Key not found: '${keyRef}'`);
    }

    const kmsName = keyPair.publicKey.kms;
    const kms = this.getKms(kmsName);

    const keyId = keyPair.publicKey.id;
    const isValid = await kms.verify({ keyRef: keyId, ...verifyOptions });

    return isValid;
  }

  private getKms(name: string | undefined): KeyManagementSystem {
    // For developer convenience, if a KMS name isn't specified and KeyManager only has
    // one KMS defined, use it.  Otherwise, an exception will be thrown.
    name ??= (this._kms.size === 1) ? this._kms.keys().next().value : '';

    const kms = this._kms.get(name!);

    if (!kms) {
      throw Error(`Unknown key management system: '${name}'`);
    }

    return kms;
  }

  private useMemoryKms(): KmsMap {
    // Instantiate in-memory store for KMS key metadata and public keys.
    const keyStore = new KeyStoreMemory();

    // Instantiate in-memory store for KMS private keys.
    const privateKeyStore = new PrivateKeyStoreMemory();

    // Instantiate local KMS using in-memory key stores.
    const kms = new LocalKms({ kmsName: 'memory', keyStore, privateKeyStore });

    return { memory: kms };
  }
}