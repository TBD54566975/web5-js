import type { Web5Crypto } from '../../types/index.js';

import { InvalidAccessError } from '../errors.js';
import { BaseEllipticCurveAlgorithm } from './base.js';
import { checkValidProperty, checkRequiredProperty } from '../../utils-new.js';

export abstract class BaseEcdsaAlgorithm extends BaseEllipticCurveAlgorithm {

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
    // Algorithm specified in the operation must match the algorithm implementation processing the operation.
    this.checkAlgorithmName({ algorithmName: algorithm.name });
    // The algorithm object must contain a hash property.
    checkRequiredProperty({ property: 'hash', inObject: algorithm });
    // The hash algorithm specified must be supported by the algorithm implementation processing the operation.
    checkValidProperty({ property: algorithm.hash, allowedProperties: this.hashAlgorithms });
  }

  public override async deriveBits(): Promise<ArrayBuffer> {
    throw new InvalidAccessError(`Requested operation 'deriveBits' is not valid for ${this.name} keys.`);
  }

  public abstract sign(options: { algorithm: Web5Crypto.EcdsaOptions; key: Web5Crypto.CryptoKey; data: BufferSource; }): Promise<ArrayBuffer>;

  public abstract verify(options: { algorithm: Web5Crypto.EcdsaOptions; key: Web5Crypto.CryptoKey; signature: ArrayBuffer; data: BufferSource; }): Promise<boolean>;
}