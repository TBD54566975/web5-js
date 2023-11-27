import { universalTypeOf } from '@web5/common';

import type { Web5Crypto } from '../../types/web5-crypto.js';
import type { JwkOperation, PrivateKeyJwk, PublicKeyJwk } from '../../jose.js';

import { Jose } from '../../jose.js';
import { InvalidAccessError } from '../errors.js';
import { checkValidProperty } from '../../utils.js';
import { BaseEllipticCurveAlgorithm } from './base.js';

export abstract class BaseEcdsaAlgorithm extends BaseEllipticCurveAlgorithm {

  public readonly keyOperations: JwkOperation[] = ['sign', 'verify'];

  public checkSignOptions(options: {
    algorithm: Web5Crypto.EcdsaOptions,
    key: PrivateKeyJwk,
    data: Uint8Array
  }): void {
    const { algorithm, data, key } = options;

    // Algorithm specified in the operation must match the algorithm implementation processing the operation.
    this.checkAlgorithmName({ algorithmName: algorithm.name });

    // The key object must be an Elliptic Curve (EC) private key in JWK format.
    if (!Jose.isEcPrivateKeyJwk(key)) {
      throw new InvalidAccessError('Requested operation is only valid for private keys.');
    }

    // The key's curve must be supported by the algorithm implementation processing the operation.
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

    // The key object must be an Elliptic Curve (EC) public key in JWK format.
    if (!(Jose.isEcPublicKeyJwk(key))) {
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

  public override async deriveBits(): Promise<Uint8Array> {
    throw new InvalidAccessError(`Requested operation 'deriveBits' is not valid for '${this.names.join(', ')}' keys.`);
  }

  public abstract sign(options: { algorithm: Web5Crypto.EcdsaOptions; key: PrivateKeyJwk; data: Uint8Array; }): Promise<Uint8Array>;

  public abstract verify(options: { algorithm: Web5Crypto.EcdsaOptions; key: PublicKeyJwk; signature: Uint8Array; data: Uint8Array; }): Promise<boolean>;
}