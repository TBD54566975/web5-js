import type { KeyIdentifier, PrivateKeyJwk, PublicKeyJwk } from '@web5/crypto';

import type { PortableDid } from '../methods/did-method.js';

export interface DidIonKeySet extends PortableDid {
  recoveryKeyUri?: KeyIdentifier;
  updateKeyUri?: KeyIdentifier;
}

/** Object representing an asymmetric key pair in JWK format. */
export type JwkKeyPair = {
  publicKeyJwk: PublicKeyJwk;
  privateKeyJwk: PrivateKeyJwk;
}