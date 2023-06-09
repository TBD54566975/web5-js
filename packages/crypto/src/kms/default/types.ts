import { CryptoAlgorithm } from '../../algorithms-api/crypto-algorithm.js';

export type AlgorithmSpecs = {
  [algorithmName: string]: AlgorithmSpecDefinition;
};

export type AlgorithmSpecDefinition = {
  implementation: typeof CryptoAlgorithm & { new(): CryptoAlgorithm; };
  aliases?: string[];
  generateKeyParams: { [param: string]: string };
};