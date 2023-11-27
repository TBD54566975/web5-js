import { universalTypeOf } from '@web5/common';

import type { Web5Crypto } from '../../types/web5-crypto.js';
import type { JwkOperation, PrivateKeyJwk } from '../../../src/jose.js';

import { Jose } from '../../../src/jose.js';
import { checkRequiredProperty } from '../../utils.js';
import { CryptoAlgorithm } from '../crypto-algorithm.js';
import { InvalidAccessError, OperationError } from '../errors.js';

export abstract class BaseAesAlgorithm extends CryptoAlgorithm {

  public checkGenerateKeyOptions(options: {
    algorithm: Web5Crypto.AesGenerateKeyOptions,
    keyOperations: JwkOperation[]
  }): void {
    const { algorithm, keyOperations } = options;

    // Algorithm specified in the operation must match the algorithm implementation processing the operation.
    this.checkAlgorithmName({ algorithmName: algorithm.name });

    // The algorithm object must contain a length property.
    checkRequiredProperty({ property: 'length', inObject: algorithm });

    // The length specified must be a number.
    if (universalTypeOf(algorithm.length) !== 'Number') {
      throw new TypeError(`Algorithm 'length' is not of type: Number.`);
    }

    // The length specified must be one of the allowed bit lengths for AES.
    if (![128, 192, 256].includes(algorithm.length)) {
      throw new OperationError(`Algorithm 'length' must be 128, 192, or 256.`);
    }

    // If specified, key operations must be permitted by the algorithm implementation processing the operation.
    if (keyOperations) {
      this.checkKeyOperations({ keyOperations, allowedKeyOperations: this.keyOperations });
    }
  }

  public checkSecretKey(options: {
    key: PrivateKeyJwk
  }): void {
    const { key } = options;

    // The options object must contain a key property.
    checkRequiredProperty({ property: 'key', inObject: options });

    // The key object must be a JSON Web key (JWK).
    this.checkJwk({ key });

    // The key object must be an octet sequence (oct) private key in JWK format.
    if (!Jose.isOctPrivateKeyJwk(key)) {
      throw new InvalidAccessError('Requested operation is only valid for oct private keys.');
    }

    // If specified, the key's algorithm must match the algorithm implementation processing the operation.
    if (key.alg) {
      this.checkKeyAlgorithm({ keyAlgorithmName: key.alg });
    }
  }

  public abstract generateKey(options: {
    algorithm: Web5Crypto.AesGenerateKeyOptions,
    keyOperations: JwkOperation[]
  }): Promise<PrivateKeyJwk>;

  public override async deriveBits(): Promise<Uint8Array> {
    throw new InvalidAccessError(`Requested operation 'deriveBits' is not valid for AES algorithm.`);
  }

  public override async sign(): Promise<Uint8Array> {
    throw new InvalidAccessError(`Requested operation 'sign' is not valid for AES algorithm.`);
  }

  public override async verify(): Promise<boolean> {
    throw new InvalidAccessError(`Requested operation 'verify' is not valid for AES algorithm.`);
  }
}