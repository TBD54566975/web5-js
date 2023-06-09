import type { AlgorithmSpecs } from './types.js';

import { DefaultEcdsaAlgorithm, DefaultEdDsaAlgorithm } from './algorithms/index.js';

// Map key operations to algorithm specs to implementations.
export const defaultAlgorithms: AlgorithmSpecs = {
  /**
   * ECDSA using secp256k1 curve and SHA-256
   *
   * "ECDSA_K-256": Algorithm Name + Curve
   * "ES256K": From https://www.iana.org/assignments/jose/jose.xhtml#web-signature-encryption-algorithms
   */
  'ECDSA_K-256': {
    implementation    : DefaultEcdsaAlgorithm,
    aliases           : ['ES256K', 'secp256k1'],
    generateKeyParams : { namedCurve: 'K-256'}
  },

  /**
   * EdDSA using Ed25519 curve
   */
  'EdDSA_Ed25519': {
    implementation    : DefaultEdDsaAlgorithm,
    generateKeyParams : { namedCurve: 'Ed25519'}
  },
};

/**
 * Concatenated list of all of the algorithm specs and their aliases.
 */
export type DefaultAlgorithms =
  | 'ECDSA_K-256' | 'ES256K' | 'secp256k1'
  | 'EdDSA_Ed25519';