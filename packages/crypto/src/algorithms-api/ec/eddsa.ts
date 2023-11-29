import type { Web5Crypto } from '../../types/web5-crypto.js';
import type { JwkOperation, PrivateKeyJwk, PublicKeyJwk } from '../../jose.js';

import { Jose } from '../../jose.js';
import { InvalidAccessError } from '../errors.js';
import { BaseEllipticCurveAlgorithm } from './base.js';

export abstract class BaseEdDsaAlgorithm extends BaseEllipticCurveAlgorithm {

  public readonly keyOperations: JwkOperation[] = ['sign', 'verify'];

  public checkSignOptions(options: {
    algorithm: Web5Crypto.EcdsaOptions,
    key: PrivateKeyJwk,
    data: Uint8Array
  }): void {
    const { key } = options;

    // Input parameter validation that is specified to EdDSA.
    if (!Jose.isOkpPrivateKeyJwk(key)) {
      throw new InvalidAccessError('Requested operation is only valid for OKP private keys.');
    }

    // Input parameter validation that is common to all Elliptic Curve (EC) signature algorithms.
    super.checkSignOptions(options);
  }

  public checkVerifyOptions(options: {
    algorithm: Web5Crypto.EcdsaOptions;
    key: PublicKeyJwk;
    signature: Uint8Array;
    data: Uint8Array;
  }): void {
    const { key } = options;

    // Input parameter validation that is specified to EdDSA.
    if (!Jose.isOkpPublicKeyJwk(key)) {
      throw new InvalidAccessError('Requested operation is only valid for OKP public keys.');
    }

    // Input parameter validation that is common to all Elliptic Curve (EC) signature algorithms.
    super.checkVerifyOptions(options);
  }

  public override async deriveBits(): Promise<Uint8Array> {
    throw new InvalidAccessError(`Requested operation 'deriveBits' is not valid for EdDSA algorithm.`);
  }

  public abstract sign(options: { algorithm: Web5Crypto.EdDsaOptions; key: PrivateKeyJwk; data: Uint8Array; }): Promise<Uint8Array>;

  public abstract verify(options: { algorithm: Web5Crypto.EdDsaOptions; key: PublicKeyJwk; signature: Uint8Array; data: Uint8Array; }): Promise<boolean>;
}