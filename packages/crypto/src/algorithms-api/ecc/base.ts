import type { Web5Crypto } from '../../types-key-manager.js';
import { checkPropertyExists, checkRequiredProperty } from '../../utils.js';

import { CryptoAlgorithm } from '../crypto-algorithm.js';

export abstract class EllipticCurveAlgorithm extends CryptoAlgorithm {

  public abstract namedCurves: string[];

  public checkGenerateKey(options: {
    algorithm: Web5Crypto.EcGenerateKeyOptions,
    keyUsages: Web5Crypto.KeyUsage[]
  }): void {
    const { algorithm, keyUsages } = options;
    this.checkAlgorithmName(algorithm.name);
    checkRequiredProperty('namedCurve', algorithm);
    checkPropertyExists(algorithm.namedCurve, this.namedCurves);
    this.checkKeyUsages(keyUsages, this.keyUsages);
  }

  public abstract generateKey(options: {
    algorithm: Web5Crypto.EcGenerateKeyOptions,
    extractable: boolean,
    keyUsages: Web5Crypto.KeyUsage[]
  }): Promise<Web5Crypto.CryptoKeyPair>;
}