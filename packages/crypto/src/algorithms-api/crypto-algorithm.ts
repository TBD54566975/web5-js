import type { Web5Crypto } from '../types-key-manager.js';

import { InvalidAccessError, NotSupportedError } from './errors.js';

export abstract class CryptoAlgorithm {

  /**
   * Name of the algorithm
   */
  public abstract readonly name: string;

  /**
   * Indicates which cryptographic operations are permissible to be used with this algorithm.
   */
  public abstract readonly keyUsages: Web5Crypto.KeyUsage[] | Web5Crypto.KeyPairUsage;

  public checkAlgorithmName(options: {
    algorithmName: string
  }): void {
    const { algorithmName } = options;
    if (algorithmName === undefined) {
      throw new TypeError(`Required argument missing: 'algorithmName'`);
    }
    if (algorithmName !== this.name) {
      throw new NotSupportedError(`Algorithm not supported: '${algorithmName}'`);
    }
  }

  public checkCryptoKey(options: {
    key: Web5Crypto.CryptoKey
  }): void {
    const { key } = options;
    if (!('algorithm' in key && 'extractable' in key && 'type' in key && 'usages' in key)) {
      throw new TypeError('Object is not a CryptoKey');
    }
  }

  public checkKeyAlgorithm(options: {
    keyAlgorithmName: string
  }): void {
    const { keyAlgorithmName } = options;
    if (keyAlgorithmName === undefined) {
      throw new TypeError(`Required argument missing: 'keyAlgorithmName'`);
    }
    if (keyAlgorithmName && keyAlgorithmName !== this.name) {
      throw new InvalidAccessError(`Algorithm '${this.name}' does not match the provided '${keyAlgorithmName}' key.`);
    }
  }

  public checkKeyType(options: {
    keyType: Web5Crypto.KeyType,
    allowedKeyType: Web5Crypto.KeyType
  }): void {
    const { keyType, allowedKeyType } = options;
    if (keyType === undefined || allowedKeyType === undefined) {
      throw new TypeError(`One or more required arguments missing: 'keyType, allowedKeyType'`);
    }
    if (keyType && keyType !== allowedKeyType) {
      throw new InvalidAccessError(`Requested operation is not valid for the provided '${keyType}' key.`);
    }
  }

  public checkKeyUsages(options: {
    keyUsages: Web5Crypto.KeyUsage[],
    allowedKeyUsages: Web5Crypto.KeyUsage[] | Web5Crypto.KeyPairUsage
  }): void {
    const { keyUsages, allowedKeyUsages } = options;
    if (!(keyUsages && keyUsages.length > 0)) {
      throw new TypeError(`required parameter was missing or empty: 'keyUsages'`);
    }
    const allowedUsages = (Array.isArray(allowedKeyUsages)) ? allowedKeyUsages : [...allowedKeyUsages.privateKey, ...allowedKeyUsages.publicKey];
    if (!keyUsages.every(usage => allowedUsages.includes(usage))) {
      throw new InvalidAccessError(`Requested operation(s) '${allowedUsages.join(', ')}' is not valid for the provided key.`);
    }
  }

  /**
   * Creates an instance of the class on which it is called.
   *
   * This is a generic factory method that creates an instance of any
   * crypto algorithm that extends this abstract class.
   *
   * @template T The type of the instance to be created.
   * @returns An instance of the class it is called on.
   * @throws {TypeError} If the class it is called on cannot be constructed.
   */
  static create<T extends CryptoAlgorithm>(this: new () => T): T {
    return new this();
  }

  public abstract deriveBits(options: {
    algorithm: Web5Crypto.AlgorithmIdentifier | Web5Crypto.EcdhDeriveKeyOptions,
    baseKey: Web5Crypto.CryptoKey,
    length: number | null
  }): Promise<ArrayBuffer>;

  public abstract generateKey(options: {
    algorithm: Partial<Web5Crypto.KeyGenParams>,
    extractable: boolean,
    keyUsages: Web5Crypto.KeyUsage[],
  }): Promise<Web5Crypto.CryptoKey | Web5Crypto.CryptoKeyPair>;

  public abstract sign(options: {
    algorithm: Web5Crypto.AlgorithmIdentifier | Web5Crypto.EcdsaOptions | Web5Crypto.EdDsaOptions,
    key: Web5Crypto.CryptoKey,
    data: BufferSource
  }): Promise<ArrayBuffer>;

  public abstract verify(options: {
    algorithm: Web5Crypto.AlgorithmIdentifier | Web5Crypto.EcdsaOptions | Web5Crypto.EdDsaOptions,
    key: Web5Crypto.CryptoKey,
    signature: ArrayBuffer,
    data: BufferSource
  }): Promise<boolean>;
}