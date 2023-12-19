import { AlgorithmIdentifier } from './identifier.js';

export interface DigestParams {
  algorithm: AlgorithmIdentifier;
  data: Uint8Array;
}

export interface HashFunction {
  digest(params: DigestParams): Promise<Uint8Array>;
}