import type { Web5Crypto } from '../../types-key-manager.js';

import { EllipticCurveAlgorithm } from './base.js';
import { checkValidProperty, checkRequiredProperty } from '../../utils-key-manager.js';

export abstract class EcdsaAlgorithm extends EllipticCurveAlgorithm {

  public readonly name: string = 'ECDSA';

  public readonly abstract hashAlgorithms: string[];

  public readonly keyUsages: Web5Crypto.KeyPairUsage = {
    privateKey : ['sign'],
    publicKey  : ['verify'],
  };

  public checkAlgorithmOptions(options: {
    algorithm: Web5Crypto.EcdsaOptions
  }): void {
    const { algorithm } = options;
    this.checkAlgorithmName({ algorithmName: algorithm.name });
    checkRequiredProperty({ property: 'hash', inObject: algorithm });
    checkValidProperty({ property: algorithm.hash, allowedProperties: this.hashAlgorithms });
  }

  public abstract sign(options: { algorithm: Web5Crypto.EcdsaOptions; key: Web5Crypto.CryptoKey; data: BufferSource; }): Promise<ArrayBuffer>;

  public abstract verify(options: { algorithm: Web5Crypto.EcdsaOptions; key: Web5Crypto.CryptoKey; signature: ArrayBuffer; data: BufferSource; }): Promise<boolean>;
}