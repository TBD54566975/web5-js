import { universalTypeOf } from '@web5/common';

import type { JwkOperation, PrivateKeyJwk } from '../../jose.js';
import type { Web5Crypto } from '../../types/web5-crypto.js';

import { CryptoAlgorithm } from '../crypto-algorithm.js';
import { InvalidAccessError, OperationError } from '../errors.js';
import { checkRequiredProperty, checkValidProperty } from '../../utils.js';

export abstract class BasePbkdf2Algorithm extends CryptoAlgorithm {

  public readonly abstract hashAlgorithms: ReadonlyArray<string>;

  public readonly keyOperations: JwkOperation[] = ['deriveBits', 'deriveKey'];

  public checkAlgorithmOptions(options: {
    algorithm: Web5Crypto.Pbkdf2Options,
    baseKey: PrivateKeyJwk
  }): void {
    const { algorithm, baseKey } = options;
    // Algorithm specified in the operation must match the algorithm implementation processing the operation.
    this.checkAlgorithmName({ algorithmName: algorithm.name });
    // The algorithm object must contain a hash property.
    checkRequiredProperty({ property: 'hash', inObject: algorithm });
    // The hash algorithm specified must be supported by the algorithm implementation processing the operation.
    checkValidProperty({ property: algorithm.hash, allowedProperties: this.hashAlgorithms });
    // The algorithm object must contain a iterations property.
    checkRequiredProperty({ property: 'iterations', inObject: algorithm });
    // The iterations value must a number.
    if (!(universalTypeOf(algorithm.iterations) === 'Number')) {
      throw new TypeError(`Algorithm 'iterations' is not of type: Number.`);
    }
    // The iterations value must be greater than 0.
    if (algorithm.iterations < 1) {
      throw new OperationError(`Algorithm 'iterations' must be > 0.`);
    }
    // The algorithm object must contain a salt property.
    checkRequiredProperty({ property: 'salt', inObject: algorithm });
    // The salt must a Uint8Array.
    if (!(universalTypeOf(algorithm.salt) === 'Uint8Array')) {
      throw new TypeError(`Algorithm 'salt' is not of type: Uint8Array.`);
    }
    // The options object must contain a baseKey property.
    checkRequiredProperty({ property: 'baseKey', inObject: options });
    // The baseKey object must be a JSON Web Key (JWK).
    this.checkJwk({ key: baseKey });
    // The baseKey must be of type 'oct' (octet sequence).
    this.checkKeyType({ keyType: baseKey.kty, allowedKeyTypes: ['oct'] });
  }

  public override async decrypt(): Promise<Uint8Array> {
    throw new InvalidAccessError(`Requested operation 'decrypt' is not valid for '${this.names.join(', ')}' keys.`);
  }

  public override async encrypt(): Promise<Uint8Array> {
    throw new InvalidAccessError(`Requested operation 'encrypt' is not valid for '${this.names.join(', ')}' keys.`);
  }

  public override async generateKey(): Promise<PrivateKeyJwk> {
    throw new InvalidAccessError(`Requested operation 'generateKey' is not valid for '${this.names.join(', ')}' keys.`);
  }

  public override async sign(): Promise<Uint8Array> {
    throw new InvalidAccessError(`Requested operation 'sign' is not valid for '${this.names.join(', ')}' keys.`);
  }

  public override async verify(): Promise<boolean> {
    throw new InvalidAccessError(`Requested operation 'verify' is not valid for '${this.names.join(', ')}' keys.`);
  }
}