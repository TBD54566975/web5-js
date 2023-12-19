import type { Jwk } from '../jose/jwk.js';
import type { KeyIdentifier } from './identifier.js';

export interface GenerateKeyParams {
  algorithm: AlgorithmIdentifier;
}

export interface GetKeyUriInput {
  publicKey: Jwk;
}

export interface ComputePublicKeyParams {
  keyUri: KeyIdentifier;
}

export interface KeyGenerator<
  GenerateKeyInput = GenerateKeyParams,
  GenerateKeyResult = KeyIdentifier
> {
  generateKey(params?: GenerateKeyInput): Promise<GenerateKeyResult>;

  getKeyUri(params: GetKeyUriInput): Promise<KeyIdentifier>;
}

export interface AsymmetricKeyGenerator<
  GenerateKeyInput = GenerateKeyParams,
  GenerateKeyResult = KeyIdentifier,
  ComputePublicKeyInput = ComputePublicKeyParams
> extends KeyGenerator<GenerateKeyInput, GenerateKeyResult> {
  computePublicKey(params: ComputePublicKeyInput): Promise<Jwk>;
}