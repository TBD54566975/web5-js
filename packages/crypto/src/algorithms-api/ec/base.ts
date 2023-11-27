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

  public checkPrivateKey(options: {
    key: PrivateKeyJwk
  }) {
    const { key } = options;
    // Verify key is an Elliptic Curve (EC) or Octet Key Pair (OKP) private key in JWK format.
    if (!(Jose.isEcPrivateKeyJwk(key) || Jose.isOkpPrivateKeyJwk(key))) {
      throw new InvalidAccessError('Requested operation is only valid for private keys.');
    }
  }

  public checkPublicKey(options: {
    key: PublicKeyJwk
  }) {
    const { key } = options;
    // Verify key is an Elliptic Curve (EC) or Octet Key Pair (OKP) public key in JWK format.
    if (!(Jose.isEcPublicKeyJwk(key) || Jose.isOkpPublicKeyJwk(key))) {
      throw new InvalidAccessError(`Requested operation is only valid for public keys.`);
    }
  }

  public override async decrypt(): Promise<Uint8Array> {
    throw new InvalidAccessError(`Requested operation 'decrypt' is not valid for '${this.names.join(', ')}' keys.`);
  }

  public override async encrypt(): Promise<Uint8Array> {
    throw new InvalidAccessError(`Requested operation 'encrypt' is not valid for '${this.names.join(', ')}' keys.`);
  }

  public abstract generateKey(options: {
    algorithm: Web5Crypto.EcGenerateKeyOptions,
    keyOperations?: JwkOperation[]
  }): Promise<PrivateKeyJwk>;
}