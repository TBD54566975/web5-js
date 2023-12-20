export interface KeyDeriver<
  DeriveBitsInput,
  DeriveKeyInput,
  DeriveKeyResult
> {
  deriveBits(params: DeriveBitsInput): Promise<Uint8Array>;

  deriveKey(params: DeriveKeyInput): Promise<DeriveKeyResult>;
}