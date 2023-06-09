import type { Web5Crypto } from '../../types-new.js';
import { checkPropertyExists, checkRequiredProperty } from '../../utils.js';

import { EllipticCurveAlgorithm } from './base.js';

export abstract class EcdsaAlgorithm extends EllipticCurveAlgorithm {

  public readonly name: string = 'ECDSA';

  public abstract hashAlgorithms: string[];

  public usages: Web5Crypto.KeyPairUsage = {
    privateKey : ['sign'],
    publicKey  : ['verify'],
  };

  public checkAlgorithmParams(algorithm: Web5Crypto.EcdsaParams) {
    checkRequiredProperty('hash', algorithm);
    checkPropertyExists(algorithm.hash as string, this.hashAlgorithms);
  }
}