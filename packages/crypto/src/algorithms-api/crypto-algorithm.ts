import type { Web5Crypto } from '../types-new.js';

import { InvalidAccessError, NotSupportedError, SyntaxError } from '../errors.js';

export abstract class CryptoAlgorithm {

  /**
   * Name of the algorithm
   */
  public abstract readonly name: string;

  /**
   * Indicates which cryptographic operations are permissible to be used with this algorithm.
   */
  public abstract usages: Web5Crypto.KeyUsage[] | Web5Crypto.KeyPairUsage;

  public checkAlgorithmName(algorithmName: string): void {
    if (algorithmName !== this.name) {
      throw new NotSupportedError(`Algorithm not supported: '${algorithmName}'`);
    }
  }

  public checkKeyUsages(keyUsages: Web5Crypto.KeyUsage[]): void {
    if (!(keyUsages && keyUsages.length > 0)) {
      throw new SyntaxError(`required parameter was missing or empty: 'keyUsages'`);
    }
    const allowedUsages = (Array.isArray(this.usages)) ? this.usages : [...this.usages.privateKey, ...this.usages.publicKey];
    if (!keyUsages.every(usage => allowedUsages.includes(usage))) {
      throw new InvalidAccessError(`Requested operation(s) '${keyUsages.join(', ')}' is not valid for the provided key.`);
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

  public abstract generateKey(algorithm: Partial<Web5Crypto.KeyGenParams>, extractable: boolean, keyUsages: Web5Crypto.KeyUsage[], ...args: any[]): Promise<Web5Crypto.CryptoKey | Web5Crypto.CryptoKeyPair>;
}