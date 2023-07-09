import type { CryptoAlgorithm } from '../algorithms-api/index.js';

import {
  EcdhAlgorithm,
  EcdsaAlgorithm,
  EdDsaAlgorithm,
  AesCtrAlgorithm,
} from '../crypto-algorithms/index.js';

export type AlgorithmImplementation = typeof CryptoAlgorithm & { new(): CryptoAlgorithm; };

export type AlgorithmImplementations = {
  [algorithmName: string]: AlgorithmImplementation;
};

// Map key operations to algorithm specs to implementations.
export const defaultAlgorithms: AlgorithmImplementations = {
  'AES-CTR' : AesCtrAlgorithm,
  ECDH      : EcdhAlgorithm,
  ECDSA     : EcdsaAlgorithm,
  EdDSA     : EdDsaAlgorithm,
};