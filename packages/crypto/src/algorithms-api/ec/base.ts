import { universalTypeOf } from '@web5/common';

import type { Web5Crypto } from '../../types/web5-crypto.js';
import type { JwkOperation, PrivateKeyJwk, PublicKeyJwk } from '../../jose.js';

import { Jose } from '../../jose.js';
import { InvalidAccessError } from '../errors.js';
import { CryptoAlgorithm } from '../crypto-algorithm.js';
import { checkValidProperty, checkRequiredProperty } from '../../utils.js';

export abstract class BaseEllipticCurveAlgorithm extends CryptoAlgorithm {

  public abstract readonly curves: ReadonlyArray<string>;

  public checkGenerateKeyOptions(options: {
    algorithm: Web5Crypto.EcGenerateKeyOptions,
    keyOperations?: JwkOperation[]
  }): void {
    const { algorithm, keyOperations } = options;

    // Algorithm specified in the operation must match the algorithm implementation processing the operation.
    this.checkAlgorithmName({ algorithmName: algorithm.name });

    // The algorithm object must contain a curve property.
    checkRequiredProperty({ property: 'curve', inObject: algorithm });

    // The curve specified must be supported by the algorithm implementation processing the operation.
    checkValidProperty({ property: algorithm.curve, allowedProperties: this.curves });

    // If specified, key operations must be permitted by the algorithm implementation processing the operation.
    if (keyOperations) {
      this.checkKeyOperations({ keyOperations, allowedKeyOperations: this.keyOperations });
    }
  }

  public checkSignOptions(options: {
    algorithm: Web5Crypto.EcdsaOptions,
    key: PrivateKeyJwk,
    data: Uint8Array
  }): void {
    const { algorithm, data, key } = options;

    // Algorithm specified in the operation must match the algorithm implementation processing the operation.
    this.checkAlgorithmName({ algorithmName: algorithm.name });

    // The key object must be an Elliptic Curve (EC) or Octet Key Pair (OKP) private key in JWK format.
    if (!(Jose.isEcPrivateKeyJwk(key) || Jose.isOkpPrivateKeyJwk(key))) {
      throw new InvalidAccessError('Requested operation is only valid for private keys.');
    }

    // The curve specified must be supported by the algorithm implementation processing the operation.
    checkValidProperty({ property: key.crv, allowedProperties: this.curves });

    // The data must be a Uint8Array.
    if (universalTypeOf(data) !== 'Uint8Array') {
      throw new TypeError('The data must be of type Uint8Array.');
    }

    // If specified, the key's algorithm must match the algorithm implementation processing the operation.
    if (key.alg) {
      this.checkKeyAlgorithm({ keyAlgorithmName: key.alg });
    }

    // If specified, the key's `key_ops` must include the 'sign' operation.
    if (key.key_ops) {
      this.checkKeyOperations({ keyOperations: ['sign'], allowedKeyOperations: key.key_ops });
    }
  }

  public checkVerifyOptions(options: {
    algorithm: Web5Crypto.EcdsaOptions;
    key: PublicKeyJwk;
    signature: Uint8Array;
    data: Uint8Array;
  }): void {
    const { algorithm, key, signature, data } = options;

    // Algorithm specified in the operation must match the algorithm implementation processing the operation.
    this.checkAlgorithmName({ algorithmName: algorithm.name });

    // The key object must be an Elliptic Curve (EC) or Octet Key Pair (OKP) public key in JWK format.
    if (!(Jose.isEcPublicKeyJwk(key) || Jose.isOkpPublicKeyJwk(key))) {
      throw new InvalidAccessError('Requested operation is only valid for public keys.');
    }

    // The curve specified must be supported by the algorithm implementation processing the operation.
    checkValidProperty({ property: key.crv, allowedProperties: this.curves });

    // The signature must be a Uint8Array.
    if (universalTypeOf(signature) !== 'Uint8Array') {
      throw new TypeError('The signature must be of type Uint8Array.');
    }

    // The data must be a Uint8Array.
    if (universalTypeOf(data) !== 'Uint8Array') {
      throw new TypeError('The data must be of type Uint8Array.');
    }

    // If specified, the key's algorithm must match the algorithm implementation processing the operation.
    if (key.alg) {
      this.checkKeyAlgorithm({ keyAlgorithmName: key.alg });
    }

    // If specified, the key's `key_ops` must include the 'verify' operation.
    if (key.key_ops) {
      this.checkKeyOperations({ keyOperations: ['verify'], allowedKeyOperations: key.key_ops });
    }
  }

  public override async decrypt(): Promise<Uint8Array> {
    throw new InvalidAccessError(`Requested operation 'decrypt' is not valid for Elliptic Curve algorithms.`);
  }

  public override async encrypt(): Promise<Uint8Array> {
    throw new InvalidAccessError(`Requested operation 'encrypt' is not valid for Elliptic Curve algorithms.`);
  }

  public abstract generateKey(options: {
    algorithm: Web5Crypto.EcGenerateKeyOptions,
    keyOperations?: JwkOperation[]
  }): Promise<PrivateKeyJwk>;
}