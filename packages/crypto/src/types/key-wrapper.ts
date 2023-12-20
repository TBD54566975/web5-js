import type { Jwk } from '../jose/jwk.js';

export interface KeyWrapper<
  WrapKeyInput,
  UnwrapKeyInput
> {
  wrapKey(params: WrapKeyInput): Promise<Uint8Array>;
  unwrapKey(params: UnwrapKeyInput): Promise<Jwk>;
}