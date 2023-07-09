import type { RequireOnly } from '@tbd54566975/common';
import type { AlgorithmImplementation, AlgorithmImplementations } from './supported-algorithms.js';
import type {
  ManagedKey,
  Web5Crypto,
  SignOptions,
  VerifyOptions,
  ImportableKey,
  DecryptOptions,
  EncryptOptions,
  ManagedKeyPair,
  GenerateKeyType,
  ImportKeyOptions,
  DeriveBitsOptions,
  ImportableKeyPair,
  GenerateKeyOptions,
  KeyManagementSystem,
  GenerateKeyOptionTypes,
} from '../types/index.js';

import { Convert } from '@tbd54566975/common';

import { CryptoAlgorithm } from '../algorithms-api/index.js';
import { defaultAlgorithms } from './supported-algorithms.js';
import { KmsKeyStore, KmsPrivateKeyStore } from './key-store.js';
import { checkRequiredProperty, isCryptoKeyPair, isManagedKey, isManagedKeyPair } from '../utils-new.js';


export type KmsOptions = {
  cryptoAlgorithms?: AlgorithmImplementations;
}

export class LocalKms implements KeyManagementSystem {
  #name: string;
  #keyStore: KmsKeyStore;
  #privateKeyStore: KmsPrivateKeyStore;
  #supportedAlgorithms: Map<string, AlgorithmImplementation> = new Map();

  constructor(kmsName: string, keyStore: KmsKeyStore, privateKeyStore: KmsPrivateKeyStore, options: KmsOptions = {}) {
    this.#name = kmsName;
    this.#keyStore = keyStore;
    this.#privateKeyStore = privateKeyStore;

    // Merge the default and custom algorithms and register with the KMS.
    const cryptoAlgorithms = {...defaultAlgorithms, ...options.cryptoAlgorithms};
    this.#registerSupportedAlgorithms(cryptoAlgorithms);
  }

  async decrypt(options: DecryptOptions): Promise<ArrayBuffer> {
    const { algorithm, data, keyRef } = options;

    // Retrieve the ManagedKey from the KMS key metadata store.
    const key = await this.getKey({ keyRef });

    if (isManagedKey(key)) {
      const privateManagedKey = await this.#privateKeyStore.getKey({ id: key.id });

      if (privateManagedKey !== undefined) {
        // Construct a CryptoKey object from the key metadata and private key material.
        const privateCryptoKey = this.#toCryptoKey({ ...key, material: privateManagedKey.material });

        // Decrypt the data.
        const cryptoAlgorithm = this.#getAlgorithm(algorithm);
        const plaintext = cryptoAlgorithm.decrypt({ algorithm, key: privateCryptoKey, data });

        return plaintext;
      }
    }

    throw new Error(`Operation failed: 'decrypt'. Key not found: ${keyRef}`);
  }

  async deriveBits(options: DeriveBitsOptions): Promise<ArrayBuffer> {
    let { algorithm, baseKeyRef, length } = options;

    // Retrieve the ManagedKeyPair from the KMS key metadata store.
    const ownKeyPair = await this.getKey({ keyRef: baseKeyRef });

    if (isManagedKeyPair(ownKeyPair)) {
      const privateManagedKey = await this.#privateKeyStore.getKey({ id: ownKeyPair.privateKey.id });

      if (privateManagedKey !== undefined) {
        // Construct a CryptoKey object from the key metadata and private key material.
        const privateCryptoKey = this.#toCryptoKey({ ...ownKeyPair.privateKey, material: privateManagedKey.material });

        // Derive the shared secret.
        const cryptoAlgorithm = this.#getAlgorithm(algorithm);
        const sharedSecret = cryptoAlgorithm.deriveBits({ algorithm, baseKey: privateCryptoKey, length: length ?? null });

        return sharedSecret;
      }
    }

    throw new Error(`Operation failed: 'deriveBits'. Key not found: ${baseKeyRef}`);
  }

  async encrypt(options: EncryptOptions): Promise<ArrayBuffer> {
    const { algorithm, data, keyRef } = options;

    // Retrieve the ManagedKey from the KMS key metadata store.
    const key = await this.getKey({ keyRef });

    if (isManagedKey(key)) {
      const privateManagedKey = await this.#privateKeyStore.getKey({ id: key.id });

      if (privateManagedKey !== undefined) {
        // Construct a CryptoKey object from the key metadata and private key material.
        const privateCryptoKey = this.#toCryptoKey({ ...key, material: privateManagedKey.material });

        // Encrypt the data.
        const cryptoAlgorithm = this.#getAlgorithm(algorithm);
        const ciphertext = cryptoAlgorithm.encrypt({ algorithm, key: privateCryptoKey, data });

        return ciphertext;
      }
    }

    throw new Error(`Operation failed: 'encrypt'. Key not found: ${keyRef}`);
  }

  async generateKey<T extends GenerateKeyOptionTypes>(options: GenerateKeyOptions<T>): Promise<GenerateKeyType<T>> {
    let { algorithm, alias, extractable, keyUsages, metadata } = options;

    // Get crypto algorithm implementation.
    const cryptoAlgorithm = this.#getAlgorithm(algorithm);

    // Generate the key.
    extractable ??= true; // Default to extractable if not specified.
    const cryptoKey = await cryptoAlgorithm.generateKey({ algorithm, extractable, keyUsages });

    // Create a ManagedKey or ManagedKeyPair using the generated key and store the private key material.
    let managedKeyOrKeyPair: GenerateKeyType<T>;
    if (isCryptoKeyPair(cryptoKey)) {
      const privateKeyType = cryptoKey.privateKey.type as Web5Crypto.PrivateKeyType;
      const id = await this.#privateKeyStore.importKey({ key: { material: cryptoKey.privateKey.handle, type: privateKeyType} });
      const privateKey = this.#toManagedKey({ ...cryptoKey.privateKey, id, alias, metadata });
      const publicKey = this.#toManagedKey({ ...cryptoKey.publicKey, material: cryptoKey.publicKey.handle, id, alias, metadata });
      managedKeyOrKeyPair = { privateKey, publicKey } as GenerateKeyType<T>;
    } else {
      const keyType = cryptoKey.type as Web5Crypto.PrivateKeyType;
      const id = await this.#privateKeyStore.importKey({ key: { material: cryptoKey.handle, type: keyType } });
      managedKeyOrKeyPair = this.#toManagedKey({ ...cryptoKey, id, alias, metadata }) as GenerateKeyType<T>;
    }

    // Store the ManagedKey or ManagedKeyPair in the KMS key store.
    await this.#keyStore.importKey({ key: managedKeyOrKeyPair });

    return managedKeyOrKeyPair;
  }

  async getKey(options: { keyRef: string }): Promise<ManagedKey | ManagedKeyPair | undefined> {
    const keyOrKeyPair = this.#keyStore.getKey({ id: options.keyRef });
    return keyOrKeyPair;
  }

  async importKey(options: ImportableKeyPair): Promise<ManagedKeyPair>;
  async importKey(options: ImportableKey): Promise<ManagedKey>;
  async importKey(options: ImportKeyOptions): Promise<ManagedKey | ManagedKeyPair> {

    if ('privateKey' in options) {
      // Asymmetric key pair import.
      const { privateKey, publicKey } = options;
      if (privateKey.type === 'public' && publicKey.type === 'private')
        throw new Error(`Import failed due to private and public key mismatch`);
      if (!(privateKey.type === 'private' && publicKey.type === 'public'))
        throw new TypeError(`Out of range: '${privateKey.type}, ${publicKey.type}'. Must be 'private, public'`);
      privateKey.material = Convert.bufferSource(privateKey.material).toArrayBuffer();
      publicKey.material = Convert.bufferSource(publicKey.material).toArrayBuffer();
      const id = await this.#privateKeyStore.importKey({ key: { material: privateKey.material, type: privateKey.type } });
      const managedKeyPair = {
        privateKey : this.#toManagedKey({ ...privateKey, material: undefined, id }),
        publicKey  : this.#toManagedKey({ ...publicKey, material: publicKey.material, id })
      };
      await this.#keyStore.importKey({ key: managedKeyPair });
      return managedKeyPair;
    }

    const keyType = options.type;
    switch (keyType) {
      case 'private': {
        // Asymmetric private key import.
        let { material } = options;
        material = Convert.bufferSource(material).toArrayBuffer();
        const id = await this.#privateKeyStore.importKey({ key: { material, type: keyType } });
        const privateManagedKey = this.#toManagedKey({ ...options, material: undefined, id });
        await this.#keyStore.importKey({ key: privateManagedKey });
        return privateManagedKey;
      }

      case 'public': {
        // Asymmetric public key import.
        let { material } = options;
        material = Convert.bufferSource(material).toArrayBuffer();
        const privateManagedKey = this.#toManagedKey({ ...options, material, id: 'placeholder' });
        privateManagedKey.id = await this.#keyStore.importKey({ key: privateManagedKey });
        return privateManagedKey;
      }

      case 'secret': {
        // Symmetric secret key import.
        let { material } = options;
        material = Convert.bufferSource(material).toArrayBuffer();
        const id = await this.#privateKeyStore.importKey({ key: { material, type: keyType } });
        const secretManagedKey = this.#toManagedKey({ ...options, material: undefined, id });
        await this.#keyStore.importKey({ key: secretManagedKey });
        return secretManagedKey;
      }

      default:
        throw new TypeError(`Out of range: '${keyType}'. Must be one of 'private, public, secret'`);
    }
  }

  async sign(options: SignOptions): Promise<ArrayBuffer> {
    const { algorithm, data, keyRef } = options;

    // Retrieve the ManagedKeyPair from the KMS key metadata store.
    const keyPair = await this.getKey({ keyRef });

    if (isManagedKeyPair(keyPair)) {
      const privateManagedKey = await this.#privateKeyStore.getKey({ id: keyPair.privateKey.id });

      if (privateManagedKey !== undefined) {
        // Construct a CryptoKey object from the key metadata and private key material.
        const privateCryptoKey = this.#toCryptoKey({ ...keyPair.privateKey, material: privateManagedKey.material });

        // Sign the data.
        const cryptoAlgorithm = this.#getAlgorithm(algorithm);
        const signature = cryptoAlgorithm.sign({ algorithm, key: privateCryptoKey, data });

        return signature;
      }
    }

    throw new Error(`Operation failed: 'sign'. Key not found: ${keyRef}`);
  }

  async verify(options: VerifyOptions): Promise<boolean> {
    const { algorithm, data, keyRef, signature } = options;

    // Retrieve the ManagedKeyPair from the KMS key metadata store.
    const keyPair = await this.getKey({ keyRef });

    if (isManagedKeyPair(keyPair)) {
      // Construct a CryptoKey object from the key metadata and private key material.
      const publicCryptoKey = this.#toCryptoKey({ ...keyPair.publicKey });

      // Verify the signature and data.
      const cryptoAlgorithm = this.#getAlgorithm(algorithm);
      const isValid = cryptoAlgorithm.verify({ algorithm, key: publicCryptoKey, signature, data });

      return isValid;
    }

    throw new Error(`Operation failed: 'verify'. Key not found: ${keyRef}`);
  }

  #getAlgorithm(algorithmIdentifier: Web5Crypto.AlgorithmIdentifier): CryptoAlgorithm {
    checkRequiredProperty({ property: 'name', inObject: algorithmIdentifier });
    const algorithm = this.#supportedAlgorithms.get(algorithmIdentifier.name.toUpperCase());

    if (algorithm === undefined) {
      throw new Error(`The algorithm '${algorithmIdentifier.name}' is not supported`);
    }

    return algorithm.create();
  }

  #registerSupportedAlgorithms(cryptoAlgorithms: AlgorithmImplementations): void {
    for (const [name, implementation] of Object.entries(cryptoAlgorithms)) {
      // Add the algorithm name and its implementation to the supported algorithms map,
      // upper-cased to allow for case-insensitive.
      this.#supportedAlgorithms.set(name.toUpperCase(), implementation);
    }
  }

  #toCryptoKey(managedKey: ManagedKey): Web5Crypto.CryptoKey {
    if (!managedKey.material) {
      throw new Error(`Required property missing: 'material'`);
    }

    const cryptoKey: Web5Crypto.CryptoKey = {
      algorithm   : managedKey.algorithm,
      extractable : managedKey.extractable,
      handle      : managedKey.material,
      type        : managedKey.type,
      usages      : managedKey.usages
    };

    return cryptoKey;
  }

  #toManagedKey(options: Omit<Web5Crypto.CryptoKey, 'handle'> & RequireOnly<ManagedKey, 'id'>): ManagedKey {
    const managedKey: ManagedKey = {
      id          : options.id,
      algorithm   : options.algorithm,
      alias       : options.alias,
      extractable : options.extractable,
      kms         : this.#name,
      material    : (options.type === 'public') ? options.material : undefined,
      metadata    : options.metadata,
      state       : 'Enabled',
      type        : options.type,
      usages      : options.usages
    };

    return managedKey;
  }
}