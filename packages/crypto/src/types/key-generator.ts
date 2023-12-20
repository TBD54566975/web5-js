import type { Jwk } from '../jose/jwk.js';

export interface KeyGenerator<
  GenerateKeyInput,
  GenerateKeyResult
> {
  generateKey(params?: GenerateKeyInput): Promise<GenerateKeyResult>;
}

export interface AsymmetricKeyGenerator<
  GenerateKeyInput,
  GenerateKeyResult,
  ComputePublicKeyInput
> extends KeyGenerator<GenerateKeyInput, GenerateKeyResult> {
  computePublicKey(params: ComputePublicKeyInput): Promise<Jwk>;
}