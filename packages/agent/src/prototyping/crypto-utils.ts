// TODO : Add this function to the `@web5/crypto` package and refactor `BearerDid` to use it.
// TODO PENDING: WIP https://github.com/TBD54566975/web5-js/pull/430

import type { Jwk } from '@web5/crypto';

/**
 * Determines the JOSE algorithm identifier of the digital signature algorithm based on the `alg` or
 * `crv` property of a {@link Jwk | JWK}.
 *
 * If the `alg` property is present, its value takes precedence and is returned. Otherwise, the
 * `crv` property is used to determine the algorithm.
 *
 * @see {@link https://www.iana.org/assignments/jose/jose.xhtml#web-signature-encryption-algorithms | JOSE Algorithms}
 * @see {@link https://datatracker.ietf.org/doc/draft-ietf-jose-fully-specified-algorithms/ | Fully-Specified Algorithms for JOSE and COSE}
 *
 * @example
 * ```ts
 * const publicKey: Jwk = {
 *   "kty": "OKP",
 *   "crv": "Ed25519",
 *   "x": "FEJG7OakZi500EydXxuE8uMc8uaAzEJkmQeG8khXANw"
 * }
 * const algorithm = getJoseSignatureAlgorithmFromPublicKey(publicKey);
 * console.log(algorithm); // Output: "EdDSA"
 * ```
 *
 * @param publicKey - A JWK containing the `alg` and/or `crv` properties.
 * @returns The name of the algorithm associated with the key.
 * @throws Error if the algorithm cannot be determined from the provided input.
 */
export function getJoseSignatureAlgorithmFromPublicKey(publicKey: Jwk): string {
  const curveToJoseAlgorithm: Record<string, string> = {
    'Ed25519'   : 'EdDSA',
    'P-256'     : 'ES256',
    'P-384'     : 'ES384',
    'P-521'     : 'ES512',
    'secp256k1' : 'ES256K',
  };

  // If the key contains an `alg` property that matches a JOSE registered algorithm identifier,
  // return its value.
  if (publicKey.alg && Object.values(curveToJoseAlgorithm).includes(publicKey.alg)) {
    return publicKey.alg;
  }

  // If the key contains a `crv` property, return the corresponding algorithm.
  if (publicKey.crv && Object.keys(curveToJoseAlgorithm).includes(publicKey.crv)) {
    return curveToJoseAlgorithm[publicKey.crv];
  }

  throw new Error(`Unable to determine algorithm based on provided input: alg=${publicKey.alg}, crv=${publicKey.crv}`);
}