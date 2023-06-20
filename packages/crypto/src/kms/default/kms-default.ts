import type { AlgorithmImplementation, AlgorithmImplementations } from './supported-algorithms.js';
import type {
  ManagedKey,
  Web5Crypto,
  KeyMetadata,
  SignOptions,
  VerifyOptions,
  ManagedKeyPair,
  GenerateKeyType,
  GenerateKeyOptions,
  KeyManagementSystem,
  GenerateKeyOptionTypes,
} from '../../types-key-manager.js';

import { defaultAlgorithms } from './supported-algorithms.js';
import { KmsKeyStore, KmsPrivateKeyStore } from './key-stores.js';
import { CryptoAlgorithm, NotSupportedError } from '../../algorithms-api/index.js';
import { checkRequiredProperty, isCryptoKeyPair, isManagedKeyPair } from '../../utils-key-manager.js';


export type KmsOptions = {
  cryptoAlgorithms?: AlgorithmImplementations;
}

export class DefaultKms implements KeyManagementSystem {
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
      const privateKey = this.#toManagedKey(cryptoKey.privateKey, id, alias, metadata);
      const publicKey = this.#toManagedKey(cryptoKey.publicKey, id, alias, metadata);
      managedKeyOrKeyPair = { privateKey, publicKey } as GenerateKeyType<T>;
    } else {
      const keyType = cryptoKey.type as Web5Crypto.PrivateKeyType;
      const id = await this.#privateKeyStore.importKey({ key: { material: cryptoKey.handle, type: keyType } });
      managedKeyOrKeyPair = this.#toManagedKey(cryptoKey, id, alias, metadata) as GenerateKeyType<T>;
    }

    // Store the ManagedKey or ManagedKeyPair in the KMS key store.
    await this.#keyStore.importKey({ key: managedKeyOrKeyPair });

    return managedKeyOrKeyPair;
  }

  async getKey(options: { keyRef: string }): Promise<ManagedKey | ManagedKeyPair | undefined> {
    const keyOrKeyPair = this.#keyStore.getKey({ id: options.keyRef });
    return keyOrKeyPair;
  }

  async sign(options: SignOptions): Promise<ArrayBuffer> {
    const { algorithm, keyRef, data } = options;

    // Assemble the private CryptoKey from the KMS key metadata and private key stores.
    const keyPair = await this.getKey({ keyRef });
    if (isManagedKeyPair(keyPair)) {
      const privateManagedKey = await this.#privateKeyStore.getKey({ id: keyPair.privateKey.id });
      if (privateManagedKey !== undefined) {
        const privateCryptoKey = this.#toCryptoKey({ ...keyPair.privateKey, material: privateManagedKey.material });

        // Sign the data.
        const cryptoAlgorithm = this.#getAlgorithm(algorithm);
        const signature = cryptoAlgorithm.sign({ algorithm, key: privateCryptoKey, data });

        return signature;
      }
    }

    throw new Error(`Sign operation failed. Key not found: ${keyRef}`);
  }

  async verify(options: VerifyOptions): Promise<boolean> {
    const { algorithm, data, keyRef, signature } = options;

    // Retrieve the ManagedKeyPair from the KMS key metadata store.
    const keyPair = await this.getKey({ keyRef });

    if (isManagedKeyPair(keyPair)) {
      const publicCryptoKey = this.#toCryptoKey({ ...keyPair.publicKey });

      // Verify the signature and data.
      const cryptoAlgorithm = this.#getAlgorithm(algorithm);
      const isValid = cryptoAlgorithm.verify({ algorithm, key: publicCryptoKey, signature, data });

      return isValid;
    }

    throw new Error(`Verify operation failed. Key not found: ${keyRef}`);
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

  #toManagedKey(cryptoKey: Web5Crypto.CryptoKey, id: string, alias?: string, metadata?: KeyMetadata): ManagedKey {
    const managedKey: ManagedKey = {
      id          : id,
      algorithm   : cryptoKey.algorithm,
      alias       : alias,
      extractable : cryptoKey.extractable,
      kms         : this.#name,
      material    : (cryptoKey.type === 'public') ? cryptoKey.handle : undefined,
      metadata    : metadata,
      state       : 'Enabled',
      type        : cryptoKey.type,
      usages      : cryptoKey.usages
    };

    return managedKey;
  }

  #getAlgorithm(algorithmIdentifier: Web5Crypto.AlgorithmIdentifier): CryptoAlgorithm {
    checkRequiredProperty({ property: 'name', inObject: algorithmIdentifier });
    const algorithm = this.#supportedAlgorithms.get(algorithmIdentifier.name.toUpperCase());

    if (algorithm === undefined) {
      throw new NotSupportedError(`The algorithm '${algorithmIdentifier.name}' is not supported`);
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
}