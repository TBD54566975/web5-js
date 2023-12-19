import type { Jwk } from '../jose/jwk.js';
import type { KeyIdentifier } from './identifier.js';

export interface WrapKeyParams {
  key: Jwk;
  wrappingKeyId: KeyIdentifier;
  wrapAlgorithm: AlgorithmIdentifier;
}

export interface UnwrapKeyParams {
  wrappedKey: Uint8Array;
  unwrappingKeyId: KeyIdentifier;
  unwrapAlgorithm: AlgorithmIdentifier;
}

export interface KeyWrapper<
  WrapKeyInput = WrapKeyParams,
  UnwrapKeyInput = UnwrapKeyParams,
  UnwrapKeyResult = Jwk
> {
  wrapKey(options: WrapKeyInput): Promise<Uint8Array>;
  unwrapKey(options: UnwrapKeyInput): Promise<UnwrapKeyResult>;
}