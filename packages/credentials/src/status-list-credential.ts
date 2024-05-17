import pako from 'pako';
import { getCurrentXmlSchema112Timestamp } from './utils.js';
import { VerifiableCredential, DEFAULT_VC_CONTEXT, DEFAULT_VC_TYPE, VcDataModel } from './verifiable-credential.js';
import { Convert } from '@web5/common';

export const DEFAULT_STATUS_LIST_VC_CONTEXT = 'https://w3id.org/vc/status-list/2021/v1';
export const DEFAULT_STATUS_LIST_VC_TYPE = 'StatusList2021Credential';

/**
 * The status purpose dictated by Status List 2021 spec.
 * @see {@link https://www.w3.org/community/reports/credentials/CG-FINAL-vc-status-list-2021-20230102/#statuslist2021entry | Status List 2021 Entry}
 */
export enum StatusPurpose {
  revocation = 'revocation',
  suspension = 'suspension',
}

/**
 * The size of the bitstring in bits.
 * The bitstring is 16KB in size.
 */
const BITSTRING_SIZE = 16 * 1024 * 8; // 16KiB in bits

/**
 * StatusListCredentialCreateOptions for creating a status list credential.
 *
 * @param statusListCredentialId The id used for the resolvable path to the status list credential [String].
 * @param issuer The issuer URI of the credential, as a [String].
 * @param statusPurpose The status purpose of the status list cred, eg: revocation, as a [StatusPurpose].
 * @param credentialsToDisable The credentials to be included in the status list credential, eg: revoked credentials, list of type [VerifiableCredential].
 */
export type StatusListCredentialCreateOptions = {
  statusListCredentialId: string,
  issuer: string,
  statusPurpose: StatusPurpose,
  credentialsToDisable: VerifiableCredential[]
};

/**
 * Credential status lookup information included in a Verifiable Credential that supports status lookup.
 * Data model dictated by the Status List 2021 spec.
 *
 * @see {@link https://www.w3.org/community/reports/credentials/CG-FINAL-vc-status-list-2021-20230102/#example-example-statuslist2021credential | Status List 2021 Entry}
 */
export interface StatusList2021Entry {
  /* The id of the status list entry. */
  id: string,
  /* The type of the status list entry. */
  type: string,
  /* The status purpose of the status list entry. */
  statusPurpose: string,
  /** The index of the status entry in the status list. Poorly named by spec, should really be `entryIndex`. */
  statusListIndex: string,
  /** URL to the status list. */
  statusListCredential: string
}

/**
 * `StatusListCredential` represents a digitally verifiable status list credential according to the
 * [W3C Verifiable Credentials Status List v2021](https://www.w3.org/community/reports/credentials/CG-FINAL-vc-status-list-2021-20230102/).
 *
 * When a status list is published, the result is a verifiable credential that encapsulates the status list.
 *
 */
export class StatusListCredential {
  /**
   * Create a [StatusListCredential] with a specific purpose, e.g., for revocation.
   *
   * @param statusListCredentialId The id used for the resolvable path to the status list credential [String].
   * @param issuer The issuer URI of the credential, as a [String].
   * @param statusPurpose The status purpose of the status list cred, eg: revocation, as a [StatusPurpose].
   * @param credentialsToDisable The credentials to be marked as revoked/suspended (status bit set to 1) in the status list.
   * @returns A special [VerifiableCredential] instance that is a StatusListCredential.
   * @throws Error If the status list credential cannot be created.
   *
   * Example:
   * ```
      StatusListCredential.create({
        statusListCredentialId : 'https://statuslistcred.com/123',
        issuer                 : issuerDid.uri,
        statusPurpose          : StatusPurpose.revocation,
        credentialsToDisable      : [credWithCredStatus]
      })
   * ```
   */
  public static create(options: StatusListCredentialCreateOptions): VerifiableCredential {
    const { statusListCredentialId, issuer, statusPurpose, credentialsToDisable } = options;
    const indexesOfCredentialsToRevoke: number[] = this.validateStatusListEntryIndexesAreAllUnique(statusPurpose, credentialsToDisable);
    const bitString = this.generateBitString(indexesOfCredentialsToRevoke);

    const credentialSubject = {
      id            : statusListCredentialId,
      type          : 'StatusList2021',
      statusPurpose : statusPurpose,
      encodedList   : bitString,
    };

    const vcDataModel: VcDataModel = {
      '@context'        : [DEFAULT_VC_CONTEXT, DEFAULT_STATUS_LIST_VC_CONTEXT],
      type              : [DEFAULT_VC_TYPE, DEFAULT_STATUS_LIST_VC_TYPE],
      id                : statusListCredentialId,
      issuer            : issuer,
      issuanceDate      : getCurrentXmlSchema112Timestamp(),
      credentialSubject : credentialSubject,
    };

    return new VerifiableCredential(vcDataModel);
  }

  /**
   * Validates if a given credential is part of the status list represented by a [VerifiableCredential].
   *
   * @param credentialToValidate The [VerifiableCredential] to be validated against the status list.
   * @param statusListCredential The [VerifiableCredential] representing the status list.
   * @returns A [Boolean] indicating whether the `credentialToValidate` is part of the status list.
   *
   * This function checks if the given `credentialToValidate`'s status list index is present in the expanded status list derived from the `statusListCredential`.
   *
   * Example:
   * ```
   * const isRevoked = StatusListCredential.validateCredentialInStatusList(credentialToCheck, statusListCred);
   * ```
   */
  public static validateCredentialInStatusList(
    credentialToValidate: VerifiableCredential,
    statusListCredential: VerifiableCredential
  ): boolean {
    const statusListEntryValue = credentialToValidate.vcDataModel.credentialStatus! as StatusList2021Entry;
    const credentialSubject = statusListCredential.vcDataModel.credentialSubject as any;
    const statusListCredStatusPurpose = credentialSubject['statusPurpose'] as StatusPurpose;
    const encodedListCompressedBitString = credentialSubject['encodedList'] as string;

    if (!statusListEntryValue.statusPurpose) {
      throw new Error('status purpose in the credential to validate is undefined');
    }

    if (!statusListCredStatusPurpose) {
      throw new Error('status purpose in the status list credential is undefined');
    }

    if (statusListEntryValue.statusPurpose !== statusListCredStatusPurpose) {
      throw new Error('status purposes do not match between the credentials');
    }

    if (!encodedListCompressedBitString) {
      throw new Error('compressed bitstring is null or empty');
    }

    return this.getBit(encodedListCompressedBitString, parseInt(statusListEntryValue.statusListIndex));
  }

  /**
   * Validates that the status list entry index in all the given credentials are unique,
   * and returns the unique index values.
   *
   * @param statusPurpose - The status purpose that all given credentials must match to.
   * @param credentials - An array of VerifiableCredential objects each contain a status list entry index.
   * @returns {number[]} An array of unique statusListIndex values.
   * @throws {Error} If any validation fails.
   */
  private static validateStatusListEntryIndexesAreAllUnique(
    statusPurpose: StatusPurpose,
    credentials: VerifiableCredential[]
  ): number[] {
    const uniqueIndexes = new Set<string>();
    for (const vc of credentials) {
      if (!vc.vcDataModel.credentialStatus) {
        throw new Error('no credential status found in credential');
      }

      const statusList2021Entry: StatusList2021Entry = vc.vcDataModel.credentialStatus as StatusList2021Entry;

      if (statusList2021Entry.statusPurpose !== statusPurpose) {
        throw new Error('status purpose mismatch');
      }

      if (uniqueIndexes.has(statusList2021Entry.statusListIndex)) {
        throw new Error(`duplicate entry found with index: ${statusList2021Entry.statusListIndex}`);
      }

      if(parseInt(statusList2021Entry.statusListIndex) < 0) {
        throw new Error('status list index cannot be negative');
      }

      if(parseInt(statusList2021Entry.statusListIndex) >= BITSTRING_SIZE) {
        throw new Error('status list index is larger than the bitset size');
      }

      uniqueIndexes.add(statusList2021Entry.statusListIndex);
    }

    return Array.from(uniqueIndexes).map(index => parseInt(index));
  }

  /**
   * Generates a Base64URL encoded, GZIP compressed bit string.
   *
   * @param indexOfBitsToTurnOn - The indexes of the bits to turn on (set to 1) in the bit string.
   * @returns {string} The compressed bit string as a base64-encoded string.
   */
  private static generateBitString(indexOfBitsToTurnOn: number[]): string {
    // Initialize a Buffer with 16KB filled with zeros
    const bitArray = new Uint8Array(BITSTRING_SIZE / 8);

    // set specified bits to 1
    indexOfBitsToTurnOn.forEach(index => {
      const byteIndex = Math.floor(index / 8);
      const bitIndex = index % 8;

      bitArray[byteIndex] = bitArray[byteIndex] | (1 << (7 - bitIndex)); // Set bit to 1
    });

    // Compress the bit array with GZIP using pako
    const compressed = pako.gzip(bitArray);

    // Return the base64-encoded string
    const base64EncodedString = Convert.uint8Array(compressed).toBase64Url();

    return base64EncodedString;
  }

  /**
   * Retrieves the value of a specific bit from a compressed base64 URL-encoded bitstring
   * by decoding and decompressing a bitstring, then extracting a bit's value by its index.
   *
   * @param compressedBitstring A base64 URL-encoded string representing the compressed bitstring.
   * @param bitIndex The zero-based index of the bit to retrieve from the decompressed bitstream.
   * @returns {boolean} True if the bit at the specified index is 1, false if it is 0.
   */
  private static getBit(compressedBitstring: string, bitIndex: number): boolean {
    // Base64-decode the compressed bitstring
    const compressedData = Convert.base64Url(compressedBitstring).toUint8Array();

    // Decompress the data using pako
    const decompressedData = pako.inflate(compressedData);

    // Find the byte index, and bit index within the byte.
    const byteIndex = Math.floor(bitIndex / 8);
    const bitIndexWithinByte = bitIndex % 8;

    const byte = decompressedData[byteIndex];

    // Extracts the targeted bit by adjusting for bit's position from left to right.
    const bitInteger = (byte >> (7 - bitIndexWithinByte)) & 1;

    return (bitInteger === 1);
  }
}