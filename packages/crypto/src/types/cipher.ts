import type { EnclosedEncryptParams, EnclosedDecryptParams } from './enclosed-params.js';

export interface Cipher<
  EncryptInput = EnclosedEncryptParams,
  DecryptInput = EnclosedDecryptParams
> {
  encrypt(params: EncryptInput): Promise<Uint8Array>;

  decrypt(params: DecryptInput): Promise<Uint8Array>;
}