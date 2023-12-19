import type { KeyIdentifier } from './identifier.js';

export interface DeriveBitsParams {
  keyUri: KeyIdentifier;
  length: number;
}

export interface DeriveKeyParams {
  keyUri: KeyIdentifier;
  derivedKeyParams: unknown
}

export interface KeyDeriver<
  DeriveBitsInput = DeriveBitsParams,
  DeriveKeyInput = DeriveKeyParams,
  DeriveKeyResult = KeyIdentifier
> {
  deriveBits(params: DeriveBitsInput): Promise<Uint8Array>;

  deriveKey(params: DeriveKeyInput): Promise<DeriveKeyResult>;
}