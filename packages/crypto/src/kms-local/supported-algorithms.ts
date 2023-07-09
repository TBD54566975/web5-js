import type { CryptoAlgorithm } from '../algorithms-api/index.js';

import {
  DefaultEcdhAlgorithm,
  DefaultEcdsaAlgorithm,
  DefaultEdDsaAlgorithm,
  DefaultAesCtrAlgorithm,
} from '../crypto-algorithms/index.js';

export type AlgorithmImplementation = typeof CryptoAlgorithm & { new(): CryptoAlgorithm; };

export type AlgorithmImplementations = {
  [algorithmName: string]: AlgorithmImplementation;
};

// Map key operations to algorithm specs to implementations.
export const defaultAlgorithms: AlgorithmImplementations = {
  'AES-CTR' : DefaultAesCtrAlgorithm,
  ECDH      : DefaultEcdhAlgorithm,
  ECDSA     : DefaultEcdsaAlgorithm,
  EdDSA     : DefaultEdDsaAlgorithm,
};