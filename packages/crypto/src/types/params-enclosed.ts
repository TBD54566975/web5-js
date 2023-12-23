export interface EnclosedDecryptParams {
  data: Uint8Array;
}

export interface EnclosedEncryptParams {
  data: Uint8Array;
}

export interface EnclosedSignParams {
  data: Uint8Array;
}

export interface EnclosedVerifyParams {
  data: Uint8Array;
  signature: Uint8Array;
}