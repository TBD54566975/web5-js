import type { Jwk } from '../jose/jwk.js';

export interface KeyWrapper<
  WrapKeyInput,
  UnwrapKeyInput
> {
  wrapKey(options: WrapKeyInput): Promise<Uint8Array>;
  unwrapKey(options: UnwrapKeyInput): Promise<Jwk>;
}