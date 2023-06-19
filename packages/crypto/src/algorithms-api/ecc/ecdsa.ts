import type { Web5Crypto } from '../../types-key-manager.js';

import { EllipticCurveAlgorithm } from './base.js';
import { checkPropertyExists, checkRequiredProperty } from '../../utils.js';

export abstract class EcdsaAlgorithm extends EllipticCurveAlgorithm {

  public readonly name: string = 'ECDSA';

  public abstract hashAlgorithms: string[];

  public readonly keyUsages: Web5Crypto.KeyPairUsage = {
    privateKey : ['sign'],
    publicKey  : ['verify'],
  };

  public checkAlgorithmOptions(algorithm: Web5Crypto.EcdsaOptions) {
    this.checkAlgorithmName(algorithm.name);
    checkRequiredProperty('hash', algorithm);
    checkPropertyExists(algorithm.hash, this.hashAlgorithms);
  }

  public abstract sign(options: { algorithm: Web5Crypto.EcdsaOptions; key: Web5Crypto.CryptoKey; data: BufferSource; }): Promise<ArrayBuffer>;

  public abstract verify(options: { algorithm: Web5Crypto.EcdsaOptions; key: Web5Crypto.CryptoKey; signature: ArrayBuffer; data: BufferSource; }): Promise<boolean>;
}