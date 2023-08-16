import type { Web5Crypto } from '../../types/web5-crypto.js';

import { InvalidAccessError } from '../errors.js';
import { BaseEllipticCurveAlgorithm } from './base.js';

export abstract class BaseEdDsaAlgorithm extends BaseEllipticCurveAlgorithm {

  public readonly name: string = 'EdDSA';

  public readonly keyUsages: Web5Crypto.KeyPairUsage = {
    privateKey : ['sign'],
    publicKey  : ['verify'],
  };

  public checkAlgorithmOptions(options: {
    algorithm: Web5Crypto.EdDsaOptions
  }): void {
    const { algorithm } = options;
    // Algorithm specified in the operation must match the algorithm implementation processing the operation.
    this.checkAlgorithmName({ algorithmName: algorithm.name });
  }

  public override async deriveBits(): Promise<Uint8Array> {
    throw new InvalidAccessError(`Requested operation 'deriveBits' is not valid for ${this.name} keys.`);
  }

  public abstract sign(options: { algorithm: Web5Crypto.EdDsaOptions; key: Web5Crypto.CryptoKey; data: Uint8Array; }): Promise<Uint8Array>;

  public abstract verify(options: { algorithm: Web5Crypto.EdDsaOptions; key: Web5Crypto.CryptoKey; signature: Uint8Array; data: Uint8Array; }): Promise<boolean>;
}