import type { KeyIdentifier } from './identifier.js';

export interface EnclosedDecryptParams {
  data: Uint8Array;
}

export interface EnclosedEncryptParams {
  data: Uint8Array;
}

export interface DecryptParams {
  keyUri: KeyIdentifier;
  data: Uint8Array;
}

export interface EncryptParams {
  keyUri: KeyIdentifier;
  data: Uint8Array;
}
export interface Cipher<EncryptInput = EnclosedEncryptParams, DecryptInput = EnclosedDecryptParams> {
  encrypt(params: EncryptInput): Promise<Uint8Array>;

  decrypt(params: DecryptInput): Promise<Uint8Array>;
}