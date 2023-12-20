import type { Jwk } from '../jose/jwk.js';
import type { AlgorithmIdentifier } from './identifier.js';

export interface ComputePublicKeyParams {
  key: Jwk;
}

export interface DecryptParams {
  key: Jwk;
  data: Uint8Array;
}

export interface DeriveBitsParams {
  key: Jwk;
  length: number;
}

export interface DeriveKeyParams {
  key: Jwk;
  derivedKeyParams: unknown
}

export interface DigestParams {
  algorithm: AlgorithmIdentifier;
  data: Uint8Array;
}

export interface EncryptParams {
  key: Jwk;
  data: Uint8Array;
}

export interface GenerateKeyParams {
  algorithm: AlgorithmIdentifier;
}

export interface SignParams {
  key: Jwk;
  data: Uint8Array;
}

export interface VerifyParams {
  key: Jwk;
  signature: Uint8Array;
  data: Uint8Array;
}