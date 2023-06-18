import type { AlgorithmImplementation, AlgorithmImplementations } from './supported-algorithms.js';
import type {
  ManagedKey,
  Web5Crypto,
  KeyMetadata,
  SignOptions,
  ManagedKeyPair,
  GenerateKeyType,
  ManagedPrivateKey,
  GenerateKeyOptions,
  KeyManagementSystem,
  GenerateKeyOptionTypes,
} from '../../types-key-manager.js';

import { isDefined } from '../../common/type-utils.js';
import { defaultAlgorithms } from './supported-algorithms.js';
import { KmsKeyStore, KmsPrivateKeyStore } from './key-stores.js';
import { checkRequiredProperty, isCryptoKeyPair } from '../../utils.js';
import { CryptoAlgorithm, NotSupportedError } from '../../algorithms-api/index.js';


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

  async getKey(options: { keyRef: string }): Promise<ManagedKey | ManagedKeyPair> {
    const keyOrKeyPair = this.#keyStore.getKey({ id: options.keyRef });
    return keyOrKeyPair;
  }

  async sign(options: SignOptions): Promise<ArrayBuffer> {
    const { algorithm, keyRef, data } = options;

    if (!isDefined(keyRef)) {
      throw new TypeError(`Required property missing: ${keyRef}`);
    }

    // Assemble the CryptoKey from the KMS key info and private key stores.
    const keyPair = await this.getKey({ keyRef }) as ManagedKeyPair;
    const privateManagedKey = await this.#privateKeyStore.getKey({ id: keyPair.privateKey.id });
    const privateCryptoKey = this.#toCryptoKey(keyPair.privateKey, privateManagedKey);

    // Sign the data.
    const cryptoAlgorithm = this.#getAlgorithm(algorithm);
    const signature = cryptoAlgorithm.sign({ algorithm, key: privateCryptoKey, data });

    return signature;
  }

  #toCryptoKey(privateKeyInfo: ManagedKey, privateKey: ManagedPrivateKey): Web5Crypto.CryptoKey {
    const cryptoKey: Web5Crypto.CryptoKey = {
      algorithm   : privateKeyInfo.algorithm,
      extractable : privateKeyInfo.extractable,
      handle      : privateKey.material,
      type        : privateKeyInfo.type,
      usages      : privateKeyInfo.usages
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
    checkRequiredProperty('name', algorithmIdentifier);
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