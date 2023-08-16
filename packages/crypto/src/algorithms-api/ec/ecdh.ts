import type { Web5Crypto } from '../../types/web5-crypto.js';

import { InvalidAccessError } from '../errors.js';
import { BaseEllipticCurveAlgorithm } from './base.js';
import { checkRequiredProperty } from '../../utils.js';

export abstract class BaseEcdhAlgorithm extends BaseEllipticCurveAlgorithm {

  public readonly name: string = 'ECDH';

  public keyUsages: Web5Crypto.KeyPairUsage = {
    privateKey : ['deriveBits', 'deriveKey'],
    publicKey  : ['deriveBits', 'deriveKey'],
  };

  public checkAlgorithmOptions(options: {
    algorithm: Web5Crypto.EcdhDeriveKeyOptions,
    baseKey: Web5Crypto.CryptoKey
  }): void {
    const { algorithm, baseKey } = options;
    // Algorithm specified in the operation must match the algorithm implementation processing the operation.
    this.checkAlgorithmName({ algorithmName: algorithm.name });
    // The algorithm object must contain a publicKey property.
    checkRequiredProperty({ property: 'publicKey', inObject: algorithm });
    // The publicKey object must be a CryptoKey.
    this.checkCryptoKey({ key: algorithm.publicKey });
    // The CryptoKey object must be a public key.
    this.checkKeyType({ keyType: algorithm.publicKey.type, allowedKeyType: 'public' });
    // The publicKey algorithm must match the algorithm implementation processing the operation.
    this.checkKeyAlgorithm({ keyAlgorithmName: algorithm.publicKey.algorithm.name });
    // The options object must contain a baseKey property.
    checkRequiredProperty({ property: 'baseKey', inObject: options });
    // The baseKey object must be a CryptoKey.
    this.checkCryptoKey({ key: baseKey });
    // The baseKey algorithm must match the algorithm implementation processing the operation.
    this.checkKeyAlgorithm({ keyAlgorithmName: baseKey.algorithm.name });
    // The CryptoKey object must be a private key.
    this.checkKeyType({ keyType: baseKey.type, allowedKeyType: 'private' });
    // The public and base key named curves must match.
    if (('namedCurve' in algorithm.publicKey.algorithm) && ('namedCurve' in baseKey.algorithm)
      && (algorithm.publicKey.algorithm.namedCurve !== baseKey.algorithm.namedCurve)) {
      throw new InvalidAccessError('The named curve of the publicKey and baseKey must match.');
    }
  }

  public override async sign(): Promise<Uint8Array> {
    throw new InvalidAccessError(`Requested operation 'sign' is not valid for ${this.name} keys.`);
  }

  public override async verify(): Promise<boolean> {
    throw new InvalidAccessError(`Requested operation 'verify' is not valid for ${this.name} keys.`);
  }
}