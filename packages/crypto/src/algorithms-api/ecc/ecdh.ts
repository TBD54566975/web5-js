import type { Web5Crypto } from '../../types-key-manager.js';

import { EllipticCurveAlgorithm } from './base.js';
import { checkRequiredProperty } from '../../utils-key-manager.js';

export abstract class EcdhAlgorithm extends EllipticCurveAlgorithm {

  public readonly name: string = 'ECDH';

  public keyUsages: Web5Crypto.KeyPairUsage = {
    privateKey : ['deriveBits', 'deriveKey'],
    publicKey  : ['deriveBits', 'deriveKey'],
  };

  public checkAlgorithmOptions(options: {
    algorithm: Web5Crypto.EcdhDeriveKeyOptions
  }): void {
    const { algorithm } = options;
    this.checkAlgorithmName({ algorithmName: algorithm.name });
    checkRequiredProperty({ property: 'publicKey', inObject: algorithm });
    this.checkCryptoKey({ key: algorithm.publicKey });
    this.checkKeyType({ keyType: algorithm.publicKey.type, allowedKeyType: 'public' });
    this.checkKeyAlgorithm({ keyAlgorithmName: algorithm.publicKey.algorithm.name });
  }
}