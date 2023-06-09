import type { KeyManagementSystem, ManagedKey, ManagedKeyPair, Web5Crypto } from '../../types-new.js';
import type { AlgorithmSpecs, AlgorithmSpecDefinition } from './types.js';
import type { DefaultAlgorithms } from './supported-algorithms.js';

import { isCryptoKeyPair } from '../../utils.js';
import { defaultAlgorithms } from './supported-algorithms.js';
import { NotSupportedError } from '../../algorithms-api/index.js';
import { KmsKeyStore, KmsPrivateKeyStore } from './key-stores.js';

export type KmsCreateKeyOptions = {
  additionalOptions?: Web5Crypto.KeyGenParams
  extractable: boolean,
  spec: DefaultAlgorithms,
  usages: Web5Crypto.KeyUsage[],
}

export type KmsOptions = {
  cryptoAlgorithms?: AlgorithmSpecs;
}

export class DefaultKms implements KeyManagementSystem {
  #keyStore: KmsKeyStore;
  #privateKeyStore: KmsPrivateKeyStore;
  #specLookup: Map<string, string> = new Map();
  #supportedAlgorithms: Map<string, AlgorithmSpecDefinition> = new Map();

  constructor(keyStore: KmsKeyStore, privateKeyStore: KmsPrivateKeyStore, options: KmsOptions = {}) {
    this.#keyStore = keyStore;
    this.#privateKeyStore = privateKeyStore;

    // Merge the default and custom algorithms and register with the KMS.
    const cryptoAlgorithms = {...defaultAlgorithms, ...options.cryptoAlgorithms};
    this.#registerSupportedAlgorithms(cryptoAlgorithms);
  }

  async createKey(options: KmsCreateKeyOptions): Promise<ManagedKey | ManagedKeyPair> {
    const { spec: specOrAlias, extractable, usages: keyUsages, additionalOptions } = options;

    // Get crypto algorithm implementation and use it to generate the key.
    const specName = this.#getSpec(specOrAlias);
    const { implementation, generateKeyParams: params } = this.#getAlgorithm(specName);
    const algorithm = implementation.create();
    const cryptoKey = await algorithm.generateKey({ name: algorithm.name, ...params }, extractable, keyUsages, additionalOptions);

    // Create a ManagedKey or ManagedKeyPair using the generated key and store the private key material.
    let managedKeyOrKeyPair: ManagedKey | ManagedKeyPair;
    if (isCryptoKeyPair(cryptoKey)) {
      const privateKeyType = cryptoKey.privateKey.type as Web5Crypto.PrivateKeyType;
      const id = await this.#privateKeyStore.importKey({ key: { material: cryptoKey.privateKey.handle, type: privateKeyType} });
      const privateKey = this.#asManagedKey(cryptoKey.privateKey, id, specName);
      const publicKey = this.#asManagedKey(cryptoKey.publicKey, id, specName);
      managedKeyOrKeyPair = { privateKey, publicKey };
    } else {
      const keyType = cryptoKey.type as Web5Crypto.PrivateKeyType;
      const id = await this.#privateKeyStore.importKey({ key: { material: cryptoKey.handle, type: keyType } });
      managedKeyOrKeyPair = this.#asManagedKey(cryptoKey, id, specName);
    }

    // Store the ManagedKey or ManagedKeyPair in the KMS key store.
    await this.#keyStore.importKey({ key: managedKeyOrKeyPair });

    return managedKeyOrKeyPair;
  }

  #asManagedKey(cryptoKey: Web5Crypto.CryptoKey, id: string, specName: string): ManagedKey {
    const managedKey: ManagedKey = {
      id        : id,
      algorithm : cryptoKey.algorithm,
      material  : (cryptoKey.type === 'public') ? cryptoKey.handle : undefined,
      spec      : specName,
      state     : 'Enabled',
      type      : cryptoKey.type,
      usages    : cryptoKey.usages
    };

    return managedKey;
  }

  #getAlgorithm(specName: string): AlgorithmSpecDefinition {
    const algorithm = this.#supportedAlgorithms.get(specName);

    if (algorithm === undefined) {
      throw new NotSupportedError(`The algorithm '${specName}' is not supported`);
    }

    return algorithm;
  }

  #getSpec(specNameorAlias: string): string {
    const specName = this.#specLookup.get(specNameorAlias.toUpperCase());

    if (specName === undefined) {
      throw new NotSupportedError(`The algorithm '${specNameorAlias}' is not supported`);
    }

    return specName;
  }

  #registerSupportedAlgorithms(cryptoAlgorithms: AlgorithmSpecs): void {
    for (const [specName, definition] of Object.entries(cryptoAlgorithms)) {
      // Add the primary algorithm specification name to the supported algorithms map.
      this.#supportedAlgorithms.set(specName, definition);

      // Add entry to the spec lookup map that is upper-cased to allow for case-insensitive matching.
      this.#specLookup.set(specName.toUpperCase(), specName);

      // If present, add any aliases.
      if (definition.aliases) {
        definition.aliases.forEach(alias => {
          this.#supportedAlgorithms.set(alias, definition);
          this.#specLookup.set(alias.toUpperCase(), specName);
        });
      }
    }
  }
}