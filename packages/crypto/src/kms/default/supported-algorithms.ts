import type { CryptoAlgorithm } from '../../algorithms-api/index.js';

import { DefaultEcdsaAlgorithm, DefaultEdDsaAlgorithm } from './algorithms/index.js';

export type AlgorithmImplementation = typeof CryptoAlgorithm & { new(): CryptoAlgorithm; };

export type AlgorithmImplementations = {
  [algorithmName: string]: AlgorithmImplementation;
};

// Map key operations to algorithm specs to implementations.
export const defaultAlgorithms: AlgorithmImplementations = {
  ECDSA : DefaultEcdsaAlgorithm,
  EdDSA : DefaultEdDsaAlgorithm,
};