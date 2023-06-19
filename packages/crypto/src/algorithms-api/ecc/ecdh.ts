import type { Web5Crypto } from '../../types-key-manager.js';

import { EllipticCurveAlgorithm } from './base.js';
import { checkRequiredProperty } from '../../utils.js';

export abstract class EcdhAlgorithm extends EllipticCurveAlgorithm {

  public readonly name: string = 'ECDH';

  public keyUsages: Web5Crypto.KeyPairUsage = {
    privateKey : ['deriveBits', 'deriveKey'],
    publicKey  : ['deriveBits', 'deriveKey'],
  };

  public checkAlgorithmOptions(options: { algorithm: Web5Crypto.EcdhDeriveKeyOptions }) {
    const { algorithm } = options;
    this.checkAlgorithmName({ algorithmName: algorithm.name });
    checkRequiredProperty({ property: 'publicKey', inObject: algorithm });
    /**
    if (!(algorithm.public instanceof CryptoKey)) {
      throw new TypeError("public: Is not a CryptoKey");
    }
    if (algorithm.public.type !== "public") {
      throw new OperationError("public: Is not a public key");
    }
    if (algorithm.public.algorithm.name !== this.name) {
      throw new OperationError(`public: Is not ${this.name} key`);
    }
     */
  }
}