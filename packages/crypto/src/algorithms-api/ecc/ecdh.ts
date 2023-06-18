import type { Web5Crypto } from '../../types-key-manager.js';
import { checkRequiredProperty } from '../../utils.js';

import { EllipticCurveAlgorithm } from './base.js';

export abstract class EcdhAlgorithm extends EllipticCurveAlgorithm {

  public readonly name: string = 'ECDH';

  public keyUsages: Web5Crypto.KeyPairUsage = {
    privateKey : ['deriveBits', 'deriveKey'],
    publicKey  : [],
  };

  public checkAlgorithmOptions(algorithm: Web5Crypto.EcdsaOptions) {
    checkRequiredProperty('public', algorithm);
  }
}