import { sha256 } from '@noble/hashes/sha256';
import { Convert, universalTypeOf } from '@web5/common';
import { TypedArray, concatBytes } from '@noble/hashes/utils';

import { NotSupportedError } from '../algorithms-api/errors.js';

export type ConcatKdfOtherInfo = {
  /**
   * The algorithm the derived secret keying material will be used with.
   */
  algorithmId: string;

  /**
   * Information related to party U (initiator) involved in the key agreement
   * transaction. It could be a public key, identifier, or any other data.
   */
  partyUInfo: string | TypedArray;

  /**
   * Information related to party V (receiver) involved in the key
   * agreement transaction. Similar to partyUInfo, it could be a
   * public key, identifier, etc.
   */
  partyVInfo: string | TypedArray;

  /**
   * Optional field. It is usually used to ensure the uniqueness of the
   * derived keying material when the input keying material is used in
   * multiple key-derivation key-agreement transactions. It is usually
   * a public value such as the keyDataLen.
   */
  suppPubInfo?: number;

  /**
   * Optional field. It is used when it is desired to secretively
   * bind additional information into the derived keying material.
   * It is a secret value agreed upon by the entities who are party
   * to the key agreement.
   */
  suppPrivInfo?: string | TypedArray;
}

/**
 * An implementation of the Concatenation Key Derivation Function (ConcatKDF)
 * as specified in NIST.800-56A, a single-step key-derivation function (SSKDF).
 * ConcatKDF produces a derived key from a secret key (like a shared secret
 * from ECDH), and other optional public information. This implementation
 * specifically uses SHA-256 as the pseudorandom function (PRF).
 *
 * @see {@link https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-56Ar3.pdf | NIST.800-56A}
 * @see {@link https://datatracker.ietf.org/doc/html/rfc7518#section-4.6.2 | RFC 7518 Section 4.6.2}
 *
 * Note: This implementation allows for only a single round / repetition
 * using the function K(1) = H(counter || Z || OtherInfo), where:
 *   K(1) is the derived key material after one round
 *   H is the SHA-256 hashing function
 *   counter is a 32-bit, big-endian bit string counter set to 0x00000001
 *   Z is the shared secret value obtained from a key agreement protocol
 *   OtherInfo is a bit string used to ensure that the derived keying
 *     material is adequately "bound" to the key-agreement transaction.
 *
 * Additional Information:
 *
 * Z, or "shared secret":
 *   The shared secret value obtained from a key agreement protocol, such as
 *   Diffie-Hellman, ECDH (Elliptic Curve Diffie-Hellman). Importantly, this
 *   shared secret is not directly used as the encryption or authentication
 *   key, but as an input to a key derivation function (KDF), such as Concat
 *   KDF, to generate the actual key. This adds an extra layer of security, as
 *   even if the shared secret gets compromised, the actual  encryption or
 *   authentication key stays safe. This shared secret 'Z' value is kept
 *   confidential between the two parties in the key agreement protocol.
 */
export class ConcatKdf {
  /**
   * Derives a key of a specified length from the input parameters.
   *
   * @param options - Input parameters for key derivation.
   * @param options.keyDataLen - The desired length of the derived key in bits.
   * @param options.sharedSecret - The shared secret key to derive from.
   * @param options.otherInfo - Additional public information to use in key derivation.
   * @returns The derived key as a Uint8Array.
   *
   * @throws {NotSupportedError} If the keyDataLen would require multiple rounds.
   */
  public static async deriveKey(options: {
    keyDataLen: number;
    otherInfo: ConcatKdfOtherInfo,
    sharedSecret: Uint8Array,
  }): Promise<Uint8Array> {
    const { keyDataLen, sharedSecret } = options;

    // RFC 7518 Section 4.6.2 specifies using SHA-256 for ECDH key agreement:
    // "Key derivation is performed using the Concat KDF, as defined in
    // Section 5.8.1 of [NIST.800-56A], where the Digest Method is SHA-256."
    // Reference: https://tools.ietf.org/html/rfc7518#section-4.6.2
    const hashLen = 256;

    // This implementation only supports single round Concat KDF.
    const roundCount = Math.ceil(keyDataLen / hashLen);
    if (roundCount !== 1) {
      throw new NotSupportedError(`Concat KDF with ${roundCount} rounds not supported.`);
    }

    // Initialize a 32-bit, big-endian bit string counter as 0x00000001.
    const counter = new Uint8Array(4);
    new DataView(counter.buffer).setUint32(0, roundCount);

    // Compute the OtherInfo bit-string.
    const otherInfo = ConcatKdf.computeOtherInfo(options.otherInfo);

    // Compute K(i) = H(counter || Z || OtherInfo)
    // return concatBytes(counter, sharedSecretZ, otherInfo);
    const derivedKeyingMaterial = sha256(concatBytes(counter, sharedSecret, otherInfo));

    // Return the bit string of derived keying material of length keyDataLen bits.
    return derivedKeyingMaterial.slice(0, keyDataLen / 8);
  }

  /**
   * Computes the OtherInfo parameter as specified in NIST.800-56A.
   * OtherInfo binds the derived key material to the context of the
   * key agreement transaction.
   *
   * This implementation follows the recommended format for OtherInfo
   * specified in section 5.8.1.2.1 of the NIST.800-56A publication.
   *
   * OtherInfo is a bit string equal to the following concatenation:
   * AlgorithmID || PartyUInfo || PartyVInfo {|| SuppPubInfo }{|| SuppPrivInfo }
   *
   * SuppPubInfo is the key length in bits, big endian encoded as a
   * 32-bit number. For example, 128 would be [0, 0, 0, 128] and
   * 256 would be [0, 0, 1, 0].
   *
   * @param options - Input data to construct OtherInfo.

  * @returns OtherInfo as a Uint8Array.
   */
  private static computeOtherInfo(options:
    ConcatKdfOtherInfo
  ): Uint8Array {
    // Required sub-fields.
    const algorithmId = ConcatKdf.toDataLenData({ data: options.algorithmId });
    const partyUInfo = ConcatKdf.toDataLenData({ data: options.partyUInfo });
    const partyVInfo = ConcatKdf.toDataLenData({ data: options.partyVInfo });
    // Optional sub-fields.
    const suppPubInfo = ConcatKdf.toDataLenData({ data: options.suppPubInfo, variableLength: false });
    const suppPrivInfo = ConcatKdf.toDataLenData({ data: options.suppPrivInfo });

    // Concatenate AlgorithmID || PartyUInfo || PartyVInfo || SuppPubInfo || SuppPrivInfo.
    const otherInfo = concatBytes(algorithmId, partyUInfo, partyVInfo, suppPubInfo, suppPrivInfo);

    return otherInfo;
  }

  /**
   * Encodes input data as a length-prefixed byte string, or
   * as a fixed-length bit string if specified.
   *
   * If variableLength = true, return the data in the form Datalen || Data,
   * where Data is a variable-length string of zero or more (eight-bit)
   * bytes, and Datalen is a fixed-length, big-endian counter that
   * indicates the length (in bytes) of Data.
   *
   * If variableLength = false, return the data formatted as a
   * fixed-length bit string.
   *
   * @param options - Input data and options for the conversion.
   * @param options.data - The input data to encode. Must be a type convertible to Uint8Array by the Convert class.
   * @param options.variableLength - Whether to output the data as variable length. Default is true.
   * @returns The input data encoded as a Uint8Array.
   *
   * @throws {TypeError} If fixed-length data is not a number.
   */
  private static toDataLenData(options: {
    data: unknown,
    variableLength?: boolean
  }): Uint8Array {
    const { data, variableLength = true } = options;
    let encodedData: Uint8Array;
    const dataType = universalTypeOf(data);

    // Return an emtpy octet sequence if data is not specified.
    if (dataType === 'Undefined') {
      return new Uint8Array(0);
    }

    if (variableLength) {
      const dataU8A = (dataType === 'Uint8Array')
        ? data as Uint8Array
        : new Convert(data, dataType).toUint8Array();
      const bufferLength = dataU8A.length;
      encodedData = new Uint8Array(4 + bufferLength);
      new DataView(encodedData.buffer).setUint32(0, bufferLength);
      encodedData.set(dataU8A, 4);

    } else {
      if (typeof data !== 'number') {
        throw TypeError('Fixed length input must be a number.');
      }
      encodedData = new Uint8Array(4);
      new DataView(encodedData.buffer).setUint32(0, data);
    }

    return encodedData;
  }
}