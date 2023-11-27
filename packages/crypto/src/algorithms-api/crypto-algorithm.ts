import type { Web5Crypto } from '../types/web5-crypto.js';
import type { JsonWebKey, JwkOperation, JwkType, PrivateKeyJwk, PublicKeyJwk } from '../jose.js';

import { InvalidAccessError, NotSupportedError } from './errors.js';

export abstract class CryptoAlgorithm {

  /**
   * Name(s) of the algorithm supported by the implementation.
   */
  public abstract readonly names: ReadonlyArray<string>;

  /**
   * Indicates which cryptographic operations are permissible to be used with this algorithm.
   */
  public abstract readonly keyOperations: JwkOperation[];

  public checkAlgorithmName(options: {
    algorithmName: string
  }): void {
    const { algorithmName } = options;
    if (algorithmName === undefined) {
      throw new TypeError(`Required parameter missing: 'algorithmName'`);
    }
    if (!this.names.includes(algorithmName)) {
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

  public checkJwk(options: {
    key: JsonWebKey
  }): void {
    const { key } = options;
    if (!('kty' in key)) {
      throw new TypeError('Object is not a JSON Web Key (JWK)');
    }
  }

  public checkKeyAlgorithm(options: {
    keyAlgorithmName: string
  }): void {
    const { keyAlgorithmName } = options;
    if (keyAlgorithmName === undefined) {
      throw new TypeError(`Required parameter missing: 'keyAlgorithmName'`);
    }
    if (keyAlgorithmName && !this.names.includes(keyAlgorithmName)) {
      throw new InvalidAccessError(`Algorithm '${this.names.join(', ')}' does not match the provided '${keyAlgorithmName}' key.`);
    }
  }

  public checkKeyType(options: {
    keyType: JwkType,
    allowedKeyTypes: JwkType[]
  }): void {
    const { keyType, allowedKeyTypes } = options;
    if (keyType === undefined || allowedKeyTypes === undefined) {
      throw new TypeError(`One or more required parameters missing: 'keyType, allowedKeyTypes'`);
    }
    if (!Array.isArray(allowedKeyTypes)) {
      throw new TypeError(`The provided 'allowedKeyTypes' is not of type Array.`);
    }
    if (keyType && !allowedKeyTypes.includes(keyType)) {
      throw new InvalidAccessError(`Key type of the provided key must be '${allowedKeyTypes.join(', ')}' but '${keyType}' was specified.`);
    }
  }

  public checkKeyOperations(options: {
    keyOperations: JwkOperation[],
    allowedKeyOperations: JwkOperation[]
  }): void {
    const { keyOperations, allowedKeyOperations } = options;
    if (!(keyOperations && keyOperations.length > 0)) {
      throw new TypeError(`Required parameter missing or empty: 'keyOperations'`);
    }
    if (!Array.isArray(allowedKeyOperations)) {
      throw new TypeError(`The provided 'allowedKeyOperations' is not of type Array.`);
    }
    if (!keyOperations.every(operation => allowedKeyOperations.includes(operation))) {
      throw new InvalidAccessError(`Requested operation(s) '${keyOperations.join(', ')}' is not valid for the provided key.`);
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

  public abstract decrypt(options: {
    algorithm: Web5Crypto.AlgorithmIdentifier | Web5Crypto.AesCtrOptions | Web5Crypto.AesGcmOptions,
    key: Web5Crypto.CryptoKey,
    data: Uint8Array
  }): Promise<Uint8Array>;

  public abstract deriveBits(options: {
    algorithm: Web5Crypto.AlgorithmIdentifier | Web5Crypto.EcdhDeriveKeyOptions | Web5Crypto.Pbkdf2Options,
    baseKey: JsonWebKey,
    length?: number
  }): Promise<Uint8Array>;

  public abstract encrypt(options: {
    algorithm: Web5Crypto.AlgorithmIdentifier | Web5Crypto.AesCtrOptions | Web5Crypto.AesGcmOptions,
    key: Web5Crypto.CryptoKey,
    data: Uint8Array
  }): Promise<Uint8Array>;

  public abstract generateKey(options: {
    algorithm: Partial<Web5Crypto.GenerateKeyOptions>,
    keyOperations?: JwkOperation[],
  }): Promise<PrivateKeyJwk>;

  public abstract sign(options: {
    algorithm: Web5Crypto.AlgorithmIdentifier | Web5Crypto.EcdsaOptions | Web5Crypto.EdDsaOptions,
    key: PrivateKeyJwk,
    data: Uint8Array
  }): Promise<Uint8Array>;

  public abstract verify(options: {
    algorithm: Web5Crypto.AlgorithmIdentifier | Web5Crypto.EcdsaOptions | Web5Crypto.EdDsaOptions,
    key: PublicKeyJwk,
    signature: Uint8Array,
    data: Uint8Array
  }): Promise<boolean>;
}