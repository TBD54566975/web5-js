import type { Web5Crypto } from '@web5/crypto';
import type { RequireOnly } from '@web5/common';

import { utils as cryptoUtils } from '@web5/crypto';
import {
  EcdhAlgorithm,
  EcdsaAlgorithm,
  EdDsaAlgorithm,
  AesCtrAlgorithm,
  CryptoAlgorithm,
} from '@web5/crypto';

import {
  ManagedKey,
  PortableKey,
  SignOptions,
  VerifyOptions,
  DecryptOptions,
  EncryptOptions,
  ManagedKeyPair,
  ManagedKeyStore,
  GenerateKeyType,
  PortableKeyPair,
  ImportKeyOptions,
  UpdateKeyOptions,
  DeriveBitsOptions,
  ManagedPrivateKey,
  GenerateKeyOptions,
  KeyManagementSystem,
  GenerateKeyOptionTypes,
} from './types/managed-key.js';

import { isManagedKey, isManagedKeyPair } from './utils.js';
import { KeyStoreMemory, PrivateKeyStoreMemory } from './store-managed-key.js';
import { Web5ManagedAgent } from './types/agent.js';

export type AlgorithmImplementation = typeof CryptoAlgorithm & { new(): CryptoAlgorithm; };

export type AlgorithmImplementations = {
  [algorithmName: string]: AlgorithmImplementation;
};

export type KmsOptions = {
  agent?: Web5ManagedAgent;
  cryptoAlgorithms?: AlgorithmImplementations;
  keyStore?: ManagedKeyStore<string, ManagedKey | ManagedKeyPair>;
  kmsName: string;
  privateKeyStore?: ManagedKeyStore<string, ManagedPrivateKey>;
}

// Map key operations to algorithm specs to implementations.
export const defaultAlgorithms: AlgorithmImplementations = {
  'AES-CTR' : AesCtrAlgorithm,
  ECDH      : EcdhAlgorithm,
  ECDSA     : EcdsaAlgorithm,
  EdDSA     : EdDsaAlgorithm,
};

export class LocalKms implements KeyManagementSystem {
  /**
   * Holds the instance of a `Web5ManagedAgent` that represents the current
   * execution context for the `KeyManager`. This agent is utilized
   * to interact with other Web5 agent components. It's vital
   * to ensure this instance is set to correctly contextualize
   * operations within the broader Web5 agent framework.
   */
  private _agent?: Web5ManagedAgent;
  private _name: string;
  private _keyStore: ManagedKeyStore<string, ManagedKey | ManagedKeyPair>;
  private _privateKeyStore: ManagedKeyStore<string, ManagedPrivateKey>;
  private _supportedAlgorithms: Map<string, AlgorithmImplementation> = new Map();

  constructor(options: KmsOptions) {
    const { agent, kmsName, keyStore, privateKeyStore } = options;
    this._agent = agent;
    this._name = kmsName;
    this._keyStore = keyStore ?? new KeyStoreMemory();
    this._privateKeyStore = privateKeyStore ?? new PrivateKeyStoreMemory();

    // Merge the default and custom algorithms and register with the KMS.
    const cryptoAlgorithms = {...defaultAlgorithms, ...options.cryptoAlgorithms};
    this.registerSupportedAlgorithms(cryptoAlgorithms);
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
  }

  async decrypt(options: DecryptOptions): Promise<Uint8Array> {
    const { algorithm, data, keyRef } = options;

    // Retrieve the ManagedKey from the KMS key metadata store.
    const key = await this.getKey({ keyRef });

    if (isManagedKey(key)) {
      const privateManagedKey = await this._privateKeyStore.getKey({
        id    : key.id,
        agent : this.agent
      });

      if (privateManagedKey !== undefined) {
        // Construct a CryptoKey object from the key metadata and private key material.
        const privateCryptoKey = this.toCryptoKey({ ...key, material: privateManagedKey.material });

        // Decrypt the data.
        const cryptoAlgorithm = this.getAlgorithm(algorithm);
        const plaintext = cryptoAlgorithm.decrypt({ algorithm, key: privateCryptoKey, data });

        return plaintext;
      }
    }

    throw new Error(`Operation failed: 'decrypt'. Key not found: ${keyRef}`);
  }

  async deriveBits(options: DeriveBitsOptions): Promise<Uint8Array> {
    let { algorithm, baseKeyRef, length } = options;

    // Retrieve the ManagedKeyPair from the KMS key metadata store.
    const ownKeyPair = await this.getKey({ keyRef: baseKeyRef });

    if (isManagedKeyPair(ownKeyPair)) {
      const privateManagedKey = await this._privateKeyStore.getKey({
        id    : ownKeyPair.privateKey.id,
        agent : this.agent
      });

      if (privateManagedKey !== undefined) {
        // Construct a CryptoKey object from the key metadata and private key material.
        const privateCryptoKey = this.toCryptoKey({ ...ownKeyPair.privateKey, material: privateManagedKey.material });

        // Derive the shared secret.
        const cryptoAlgorithm = this.getAlgorithm(algorithm);
        const sharedSecret = cryptoAlgorithm.deriveBits({ algorithm, baseKey: privateCryptoKey, length: length ?? null });

        return sharedSecret;
      }
    }

    throw new Error(`Operation failed: 'deriveBits'. Key not found: ${baseKeyRef}`);
  }

  async encrypt(options: EncryptOptions): Promise<Uint8Array> {
    const { algorithm, data, keyRef } = options;

    // Retrieve the ManagedKey from the KMS key metadata store.
    const key = await this.getKey({ keyRef });

    if (isManagedKey(key)) {
      const privateManagedKey = await this._privateKeyStore.getKey({
        id    : key.id,
        agent : this.agent
      });

      if (privateManagedKey !== undefined) {
        // Construct a CryptoKey object from the key metadata and private key material.
        const privateCryptoKey = this.toCryptoKey({ ...key, material: privateManagedKey.material });

        // Encrypt the data.
        const cryptoAlgorithm = this.getAlgorithm(algorithm);
        const ciphertext = cryptoAlgorithm.encrypt({ algorithm, key: privateCryptoKey, data });

        return ciphertext;
      }
    }

    throw new Error(`Operation failed: 'encrypt'. Key not found: ${keyRef}`);
  }

  async generateKey<T extends GenerateKeyOptionTypes>(options: GenerateKeyOptions<T>): Promise<GenerateKeyType<T>> {
    let { algorithm, alias, extractable, keyUsages, metadata } = options;

    // Get crypto algorithm implementation.
    const cryptoAlgorithm = this.getAlgorithm(algorithm);

    // Generate the key.
    extractable ??= true; // Default to extractable if not specified.
    const cryptoKey = await cryptoAlgorithm.generateKey({ algorithm, extractable, keyUsages });

    // Create a ManagedKey or ManagedKeyPair using the generated key and store the private key material.
    let managedKeyOrKeyPair: GenerateKeyType<T>;
    if (cryptoUtils.isCryptoKeyPair(cryptoKey)) {
      const privateKeyType = cryptoKey.privateKey.type as Web5Crypto.PrivateKeyType;
      const id = await this._privateKeyStore.importKey({
        key   : { material: cryptoKey.privateKey.material, type: privateKeyType},
        agent : this.agent
      });
      const managedKeyPair: ManagedKeyPair = {
        privateKey : this.toManagedKey({ ...cryptoKey.privateKey, id, alias, metadata }),
        publicKey  : this.toManagedKey({ ...cryptoKey.publicKey, material: cryptoKey.publicKey.material, id, alias, metadata })
      };
      managedKeyOrKeyPair = managedKeyPair as GenerateKeyType<T>;
    } else {
      const keyType = cryptoKey.type as Web5Crypto.PrivateKeyType;
      const id = await this._privateKeyStore.importKey({
        key   : { material: cryptoKey.material, type: keyType },
        agent : this.agent
      });
      managedKeyOrKeyPair = this.toManagedKey({ ...cryptoKey, id, alias, metadata }) as GenerateKeyType<T>;
    }

    // Store the ManagedKey or ManagedKeyPair in the KMS key store.
    await this._keyStore.importKey({ key: managedKeyOrKeyPair, agent: this.agent });

    return managedKeyOrKeyPair;
  }

  async getKey(options: { keyRef: string }): Promise<ManagedKey | ManagedKeyPair | undefined> {
    const keyOrKeyPair = this._keyStore.getKey({ id: options.keyRef, agent: this.agent });
    return keyOrKeyPair;
  }

  async importKey(options: PortableKeyPair): Promise<ManagedKeyPair>;
  async importKey(options: PortableKey): Promise<ManagedKey>;
  async importKey(options: ImportKeyOptions): Promise<ManagedKey | ManagedKeyPair> {

    if ('privateKey' in options) {
      // Asymmetric key pair import.
      const { privateKey, publicKey } = options;
      if (privateKey.type === 'public' && publicKey.type === 'private')
        throw new Error(`Import failed due to private and public key mismatch`);
      if (!(privateKey.type === 'private' && publicKey.type === 'public'))
        throw new TypeError(`Out of range: '${privateKey.type}, ${publicKey.type}'. Must be 'private, public'`);
      const id = await this._privateKeyStore.importKey({
        key   : { material: privateKey.material, type: privateKey.type },
        agent : this.agent
      });
      const managedKeyPair = {
        privateKey : this.toManagedKey({ ...privateKey, id, material: undefined }),
        publicKey  : this.toManagedKey({ ...publicKey, material: publicKey.material, id })
      };
      await this._keyStore.importKey({ key: managedKeyPair, agent: this.agent });
      return managedKeyPair;
    }

    const keyType = options.type;
    switch (keyType) {
      case 'private': {
        // Asymmetric private key import.
        const material = options.material;
        const id = await this._privateKeyStore.importKey({
          key   : { material, type: keyType },
          agent : this.agent
        });
        const privateManagedKey = this.toManagedKey({ ...options, material: undefined, id });
        await this._keyStore.importKey({ key: privateManagedKey, agent: this.agent });
        return privateManagedKey;
      }

      case 'public': {
        // Asymmetric public key import.
        const material = options.material;
        const publicManagedKey = this.toManagedKey({ ...options, material, id: '' });
        publicManagedKey.id = await this._keyStore.importKey({ key: publicManagedKey, agent: this.agent });
        return publicManagedKey;
      }

      case 'secret': {
        // Symmetric secret key import.
        const material = options.material;
        const id = await this._privateKeyStore.importKey({
          key   : { material, type: keyType },
          agent : this.agent
        });
        const secretManagedKey = this.toManagedKey({ ...options, material: undefined, id });
        await this._keyStore.importKey({ key: secretManagedKey, agent: this.agent });
        return secretManagedKey;
      }

      default:
        throw new TypeError(`Out of range: '${keyType}'. Must be one of 'private, public, secret'`);
    }
  }

  async sign(options: SignOptions): Promise<Uint8Array> {
    const { algorithm, data, keyRef } = options;

    // Retrieve the ManagedKeyPair from the KMS key metadata store.
    const keyPair = await this.getKey({ keyRef });

    if (isManagedKeyPair(keyPair)) {
      const privateManagedKey = await this._privateKeyStore.getKey({
        id    : keyPair.privateKey.id,
        agent : this.agent
      });

      if (privateManagedKey !== undefined) {
        // Construct a CryptoKey object from the key metadata and private key material.
        const privateCryptoKey = this.toCryptoKey({ ...keyPair.privateKey, material: privateManagedKey.material });

        // Sign the data.
        const cryptoAlgorithm = this.getAlgorithm(algorithm);
        const signature = cryptoAlgorithm.sign({ algorithm, key: privateCryptoKey, data });

        return signature;
      }
    }

    throw new Error(`Operation failed: 'sign'. Key not found: ${keyRef}`);
  }

  async updateKey(options: UpdateKeyOptions): Promise<boolean> {
    const { keyRef, alias, metadata } = options;

    const keyOrKeyPair = await this.getKey({ keyRef });

    if (!keyOrKeyPair) {
      throw new Error(`Key not found: '${keyRef}'`);
    }

    const keyId = (isManagedKeyPair(keyOrKeyPair))
      ? keyOrKeyPair.publicKey.id
      : keyOrKeyPair.id;

    // Update the KMS key metadata store.
    return this._keyStore.updateKey({ id: keyId, alias, metadata, agent: this.agent });
  }

  async verify(options: VerifyOptions): Promise<boolean> {
    const { algorithm, data, keyRef, signature } = options;

    // Retrieve the ManagedKeyPair from the KMS key metadata store.
    const keyPair = await this.getKey({ keyRef });

    if (isManagedKeyPair(keyPair)) {
      if (keyPair.publicKey.material === undefined) {
        throw new Error(`Required property missing: 'material'`);
      }
      // Construct a CryptoKey object from the key metadata and private key material.
      const publicCryptoKey = this.toCryptoKey({
        ...keyPair.publicKey,
        material: keyPair.publicKey.material
      });

      // Verify the signature and data.
      const cryptoAlgorithm = this.getAlgorithm(algorithm);
      const isValid = cryptoAlgorithm.verify({ algorithm, key: publicCryptoKey, signature, data });

      return isValid;
    }

    throw new Error(`Operation failed: 'verify'. Key not found: ${keyRef}`);
  }

  private getAlgorithm(algorithmIdentifier: Web5Crypto.AlgorithmIdentifier): CryptoAlgorithm {
    cryptoUtils.checkRequiredProperty({ property: 'name', inObject: algorithmIdentifier });
    const algorithm = this._supportedAlgorithms.get(algorithmIdentifier.name.toUpperCase());

    if (algorithm === undefined) {
      throw new Error(`The algorithm '${algorithmIdentifier.name}' is not supported`);
    }

    return algorithm.create();
  }

  private registerSupportedAlgorithms(cryptoAlgorithms: AlgorithmImplementations): void {
    for (const [name, implementation] of Object.entries(cryptoAlgorithms)) {
      // Add the algorithm name and its implementation to the supported algorithms map,
      // upper-cased to allow for case-insensitive.
      this._supportedAlgorithms.set(name.toUpperCase(), implementation);
    }
  }

  private toCryptoKey(managedKey:
    RequireOnly<ManagedKey, 'algorithm' | 'extractable' | 'material' | 'type' | 'usages'>
  ): Web5Crypto.CryptoKey {

    const cryptoKey: Web5Crypto.CryptoKey = {
      algorithm   : managedKey.algorithm,
      extractable : managedKey.extractable,
      material    : managedKey.material,
      type        : managedKey.type,
      usages      : managedKey.usages
    };

    return cryptoKey;
  }

  private toManagedKey(options: Omit<Web5Crypto.CryptoKey, 'material'> & RequireOnly<ManagedKey, 'id'>): ManagedKey {
    const managedKey: ManagedKey = {
      id          : options.id,
      algorithm   : options.algorithm,
      alias       : options.alias,
      extractable : options.extractable,
      kms         : this._name,
      material    : (options.type === 'public') ? options.material : undefined,
      metadata    : options.metadata,
      state       : 'Enabled',
      type        : options.type,
      usages      : options.usages
    };

    return managedKey;
  }
}