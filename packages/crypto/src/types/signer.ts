import type { EnclosedSignParams, EnclosedVerifyParams } from './enclosed-params.js';

export interface Signer<
  SignInput = EnclosedSignParams,
  VerifyInput = EnclosedVerifyParams
> {
  sign(params: SignInput): Promise<Uint8Array>;

  verify(params: VerifyInput): Promise<boolean>;
}