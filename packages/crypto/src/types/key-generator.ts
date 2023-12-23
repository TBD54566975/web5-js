import type { Jwk } from '../jose/jwk.js';

export interface KeyGenerator<
  GenerateKeyInput,
  GenerateKeyOutput
> {
  generateKey(params?: GenerateKeyInput): Promise<GenerateKeyOutput>;
}

export interface AsymmetricKeyGenerator<
  GenerateKeyInput,
  GenerateKeyOutput,
  GetPublicKeyInput
> extends KeyGenerator<GenerateKeyInput, GenerateKeyOutput> {
  computePublicKey?(params: GetPublicKeyInput): Promise<Jwk>;

  getPublicKey(params: GetPublicKeyInput): Promise<Jwk>;
}