import type { KeyIdentifier } from './identifier.js';

export interface DeriveBitsParams {
  keyUri: KeyIdentifier;
  length: number;
}

export interface DeriveKeyParams {
  keyUri: KeyIdentifier;
  derivedKeyParams: unknown
}

export interface KeyDeriver {
  deriveBits(params: DeriveBitsParams): Promise<Uint8Array>;

  deriveKey(params: DeriveKeyParams): Promise<KeyIdentifier>;
}