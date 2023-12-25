export interface Hasher<DigestInput> {
  digest(params: DigestInput): Promise<Uint8Array>;
}