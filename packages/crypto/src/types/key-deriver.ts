export interface KeyDeriver<
  DeriveBitsInput,
  DeriveKeyInput,
  DeriveKeyOutput
> {
  deriveBits(params: DeriveBitsInput): Promise<Uint8Array>;

  deriveKey(params: DeriveKeyInput): Promise<DeriveKeyOutput>;
}