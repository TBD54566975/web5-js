export type KeyPair = {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export type KeyPairJwk = {
  publicKeyJwk: PublicKeyJwk;
  privateKeyJwk: PrivateKeyJwk;
};

export type Jwk = {
  /** The "alg" (algorithm) parameter identifies the algorithm intended for use with the key. */
  alg?: string;
  /** The "alg" (algorithm) parameter identifies the algorithm intended for use with the key. */
  kid?: string;
  /** identifies the cryptographic algorithm family used with the key, such "EC". */
  kty: string;

  crv: string;
};

export type PublicKeyJwk = Jwk & {
  /** The "crv" (curve) parameter identifies the cryptographic curve used with the key.
   * MUST be present for all EC public keys
   */
  crv: string;
  /**
   * the x coordinate for the Elliptic Curve point.
   * Represented as the base64url encoding of the octet string representation of the coordinate.
   * MUST be present for all EC public keys
   */
  x: string;
  /**
   * the y coordinate for the Elliptic Curve point.
   * Represented as the base64url encoding of the octet string representation of the coordinate.
   */
  y?: string;
};

export type PrivateKeyJwk = PublicKeyJwk & {
  /**
   * the Elliptic Curve private key value.
   * It is represented as the base64url encoding of the octet string representation of the private key value
   * MUST be present to represent Elliptic Curve private keys.
   */
  d: string;
};