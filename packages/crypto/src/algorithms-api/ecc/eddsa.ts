import type { Web5Crypto } from '../../types-key-manager.js';

import { EllipticCurveAlgorithm } from './base.js';

export abstract class EdDsaAlgorithm extends EllipticCurveAlgorithm {

  public readonly name: string = 'EdDSA';

  public readonly keyUsages: Web5Crypto.KeyPairUsage = {
    privateKey : ['sign'],
    publicKey  : ['verify'],
  };

  public checkAlgorithmOptions(options: { algorithm: Web5Crypto.EdDsaOptions }) {
    const { algorithm } = options;
    this.checkAlgorithmName({ algorithmName: algorithm.name });
  }

  public abstract sign(options: { algorithm: Web5Crypto.EdDsaOptions; key: Web5Crypto.CryptoKey; data: BufferSource; }): Promise<ArrayBuffer>;

  public abstract verify(options: { algorithm: Web5Crypto.EdDsaOptions; key: Web5Crypto.CryptoKey; signature: ArrayBuffer; data: BufferSource; }): Promise<boolean>;
}