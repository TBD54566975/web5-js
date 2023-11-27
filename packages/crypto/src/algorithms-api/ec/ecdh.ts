import type { Web5Crypto } from '../../types/web5-crypto.js';
import { Jose, type JwkOperation, type PrivateKeyJwk } from '../../jose.js';

import { InvalidAccessError } from '../errors.js';
import { BaseEllipticCurveAlgorithm } from './base.js';
import { checkRequiredProperty } from '../../utils.js';

export abstract class BaseEcdhAlgorithm extends BaseEllipticCurveAlgorithm {

  public readonly keyOperations: JwkOperation[] = ['deriveBits', 'deriveKey'];

  public checkDeriveBitsOptions(options: {
    algorithm: Web5Crypto.EcdhDeriveKeyOptions,
    baseKey: PrivateKeyJwk
  }): void {
    const { algorithm, baseKey } = options;
    // Algorithm specified in the operation must match the algorithm implementation processing the operation.
    this.checkAlgorithmName({ algorithmName: algorithm.name });

    // The algorithm object must contain a publicKey property.
    checkRequiredProperty({ property: 'publicKey', inObject: algorithm });
    // The publicKey object must be a JSON Web key (JWK).
    this.checkJwk({ key: algorithm.publicKey });
    // The publicKey object must be of key type EC or OKP.
    this.checkKeyType({ keyType: algorithm.publicKey.kty, allowedKeyTypes: ['EC', 'OKP'] });
    // The publicKey object must be an Elliptic Curve (EC) or Octet Key Pair (OKP) public key in JWK format.
    if (!(Jose.isEcPublicKeyJwk(algorithm.publicKey) || Jose.isOkpPublicKeyJwk(algorithm.publicKey))) {
      throw new InvalidAccessError(`Requested operation is only valid for public keys.`);
    }
    // If specified, the public key's `key_ops` must include the 'deriveBits' operation.
    if (algorithm.publicKey.key_ops) {
      this.checkKeyOperations({ keyOperations: ['deriveBits'], allowedKeyOperations: algorithm.publicKey.key_ops });
    }

    // The options object must contain a baseKey property.
    checkRequiredProperty({ property: 'baseKey', inObject: options });
    // The baseKey object must be a JSON Web Key (JWK).
    this.checkJwk({ key: baseKey });
    // The baseKey object must be of key type EC or OKP.
    this.checkKeyType({ keyType: baseKey.kty, allowedKeyTypes: ['EC', 'OKP'] });
    // The baseKey object must be an Elliptic Curve (EC) or Octet Key Pair (OKP) private key in JWK format.
    if (!(Jose.isEcPrivateKeyJwk(baseKey) || Jose.isOkpPrivateKeyJwk(baseKey))) {
      throw new InvalidAccessError(`Requested operation is only valid for private keys.`);
    }
    // If specified, the base key's `key_ops` must include the 'deriveBits' operation.
    if (baseKey.key_ops) {
      this.checkKeyOperations({ keyOperations: ['deriveBits'], allowedKeyOperations: baseKey.key_ops });
    }

    // The public and base key types must match.
    if ((algorithm.publicKey.kty !== baseKey.kty)) {
      throw new InvalidAccessError('The key type of the publicKey and baseKey must match.');
    }
    // The public and base key curves must match.
    if (('crv' in algorithm.publicKey) && ('crv' in baseKey)
      && (algorithm.publicKey.crv !== baseKey.crv)) {
      throw new InvalidAccessError('The curve of the publicKey and baseKey must match.');
    }
  }

  public override async sign(): Promise<Uint8Array> {
    throw new InvalidAccessError(`Requested operation 'sign' is not valid for ECDH algorithm.`);
  }

  public override async verify(): Promise<boolean> {
    throw new InvalidAccessError(`Requested operation 'verify' is not valid for ECDH algorithm.`);
  }
}