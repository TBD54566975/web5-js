import type { Web5Crypto } from '../../types/web5-crypto.js';

import { InvalidAccessError } from '../errors.js';
import { CryptoAlgorithm } from '../crypto-algorithm.js';
import { checkValidProperty, checkRequiredProperty } from '../../utils.js';

export abstract class BaseEllipticCurveAlgorithm extends CryptoAlgorithm {

  public abstract namedCurves: string[];

  public checkGenerateKey(options: {
    algorithm: Web5Crypto.EcGenerateKeyOptions,
    keyUsages: Web5Crypto.KeyUsage[]
  }): void {
    const { algorithm, keyUsages } = options;
    // Algorithm specified in the operation must match the algorithm implementation processing the operation.
    this.checkAlgorithmName({ algorithmName: algorithm.name });
    // The algorithm object must contain a namedCurve property.
    checkRequiredProperty({ property: 'namedCurve', inObject: algorithm });
    // The named curve specified must be supported by the algorithm implementation processing the operation.
    checkValidProperty({ property: algorithm.namedCurve, allowedProperties: this.namedCurves });
    // The key usages specified must be permitted by the algorithm implementation processing the operation.
    this.checkKeyUsages({ keyUsages, allowedKeyUsages: this.keyUsages });
  }

  public override async decrypt(): Promise<Uint8Array> {
    throw new InvalidAccessError(`Requested operation 'decrypt' is not valid for ${this.name} keys.`);
  }

  public override async encrypt(): Promise<Uint8Array> {
    throw new InvalidAccessError(`Requested operation 'encrypt' is not valid for ${this.name} keys.`);
  }

  public abstract generateKey(options: {
    algorithm: Web5Crypto.EcGenerateKeyOptions,
    extractable: boolean,
    keyUsages: Web5Crypto.KeyUsage[]
  }): Promise<Web5Crypto.CryptoKeyPair>;
}