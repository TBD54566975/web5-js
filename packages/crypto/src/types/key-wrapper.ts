import type { Jwk } from '../jose/jwk.js';

/**
 * The `KeyWrapper` interface provides methods for wrapping and unwrapping cryptographic keys.
 * It includes `wrapKey()` for securely encapsulating a key within another key, and `unwrapKey()`
 * for extracting the original key from its wrapped state.
 *
 * This interface is crucial in scenarios where secure key management and exchange are required,
 * ensuring that keys remain protected during transit or storage.
 */
export interface KeyWrapper<
  WrapKeyInput,
  UnwrapKeyInput
> {
  /**
   * Wraps a cryptographic key using another key, typically for secure key transmission or storage.
   *
   * @remarks
   * The `wrapKey()` method of the {@link KeyWrapper | `KeyWrapper`} interface secures a
   * cryptographic key by encapsulating it within another key, producing a wrapped key represented
   * as a `Uint8Array`.
   *
   * @param params - The parameters for the key wrapping operation.
   *
   * @returns A Promise resolving to the wrapped key as a `Uint8Array`.
   */
  wrapKey(params: WrapKeyInput): Promise<Uint8Array>;

  /**
   * Unwraps a previously wrapped cryptographic key, restoring it to its original form.
   *
   * @remarks
   * The `unwrapKey()` method of the {@link KeyWrapper | `KeyWrapper`} interface reverses the
   * wrapping process, extracting the original key from its wrapped state, typically for use in
   * cryptographic operations.
   *
   * @param params - The parameters for the key unwrapping operation.
   *
   * @returns A Promise resolving to the unwrapped key in a cryptographic format, usually JWK.
   */
  unwrapKey(params: UnwrapKeyInput): Promise<Jwk>;
}