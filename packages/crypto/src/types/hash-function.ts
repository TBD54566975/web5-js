export interface HashFunction<DigestInput> {
  digest(params: DigestInput): Promise<Uint8Array>;
}