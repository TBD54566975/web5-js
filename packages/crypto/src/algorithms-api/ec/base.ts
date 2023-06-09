import type { Web5Crypto } from '../../types-new.js';
import { checkPropertyExists, checkRequiredProperty } from '../../utils.js';

import { CryptoAlgorithm } from '../crypto-algorithm.js';

export abstract class EllipticCurveAlgorithm extends CryptoAlgorithm {

  public abstract namedCurves: string[];

  public checkGenerateKey(algorithm: Web5Crypto.EcKeyGenParams, keyUsages: Web5Crypto.KeyUsage[]) {
    this.checkAlgorithmName(algorithm.name);
    checkRequiredProperty('namedCurve', algorithm);
    checkPropertyExists(algorithm.namedCurve, this.namedCurves);
    this.checkKeyUsages(keyUsages);
  }

  public abstract generateKey(algorithm: Web5Crypto.EcKeyGenParams, extractable: boolean, keyUsages: KeyUsage[], ...args: any[]): Promise<Web5Crypto.CryptoKeyPair>;
}