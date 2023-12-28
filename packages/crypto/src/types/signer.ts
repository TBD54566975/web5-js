import type { EnclosedSignParams, EnclosedVerifyParams } from './params-enclosed.js';

/**
 * The `Signer` interface provides methods for signing data and verifying signatures.
 *
 * It includes `sign()` for creating signatures and `verify()` for confirming the validity of
 * signatures. The interface is designed to be flexible, accommodating various signing algorithms
 * and their unique parameters.
 *
 * It defaults to using {@link EnclosedSignParams | `EnclosedSignParams`} and
 * {@link EnclosedVerifyParams | `EnclosedVerifyParams`}, which are intended to be used with a
 * closure that captures the key and algorithm-specific parameters so that arbitrary data can be
 * signed and verified without exposing the key or parameters to the caller. However, the
 * interface can be extended to support other parameter types, such as {@link SignParams |
* `SignParams`} and {@link VerifyParams | `VerifyParams`}, which are intended to be used when
* the key and algorithm-specific parameters are known to the caller.
 */
export interface Signer<
  SignInput = EnclosedSignParams,
  VerifyInput = EnclosedVerifyParams
> {
  /**
   * Signs the provided data.
   *
   * @remarks
   * The `sign()` method of the {@link Signer | `Signer`} interface generates a digital signature
   * for the given data using a cryptographic key. This signature can be used to verify the data's
   * authenticity and integrity.
   *
   * @param params - The parameters for the signing operation.
   *
   * @returns A Promise resolving to the digital signature as a `Uint8Array`.
   */
  sign(params: SignInput): Promise<Uint8Array>;

  /**
   * Verifies a digital signature associated the provided data.
   *
   * @remarks
   * The `verify()` method of the {@link Signer | `Signer`} interface checks the validity of a
   * digital signature against the original data and a cryptographic key. It confirms whether the
   * signature was created by the holder of the corresponding private key and that the data has not
   * been tampered with.
   *
   * @param params - The parameters for the verification operation.
   *
   * @returns A Promise resolving to a boolean indicating whether the signature is valid.
   */
  verify(params: VerifyInput): Promise<boolean>;
}