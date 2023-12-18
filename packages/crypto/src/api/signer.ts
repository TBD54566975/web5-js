import type { Jwk } from '../jose/jwk.js';
import type { KeyIdentifier } from './identifier.js';

export interface EnclosedSignParams {
  data: Uint8Array;
}

export interface EnclosedVerifyParams {
  data: Uint8Array;
  signature: Uint8Array;
}

export interface SignParams extends EnclosedSignParams {
  keyUri: KeyIdentifier;
}

export interface VerifyParams extends EnclosedVerifyParams {
  publicKey: Jwk;
}

export interface Signer<SignInput = EnclosedSignParams, VerifyInput = EnclosedVerifyParams> {
  sign(params: SignInput): Promise<Uint8Array>;

  verify(params: VerifyInput): Promise<boolean>;
}