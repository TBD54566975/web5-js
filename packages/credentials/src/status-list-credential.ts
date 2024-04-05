import pako from 'pako';
import { getCurrentXmlSchema112Timestamp } from './utils.js';
import { VerifiableCredential, DEFAULT_VC_CONTEXT, DEFAULT_VC_TYPE, VcDataModel } from './verifiable-credential.js';
import type { ICredentialStatus} from '@sphereon/ssi-types';
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
 * @param issuedCredentials The credentials to be included in the status list credential, eg: revoked credentials, list of type [VerifiableCredential].
 */
export type StatusListCredentialCreateOptions = {
  statusListCredentialId: string,
  issuer: string,
  statusPurpose: StatusPurpose,
  issuedCredentials: VerifiableCredential[]
};

/**
 * Credential status lookup information included in a Verifiable Credential that supports status lookup.
 * Data model dictated by the Status List 2021 spec.
 *
 * @see {@link https://www.w3.org/community/reports/credentials/CG-FINAL-vc-status-list-2021-20230102/#example-example-statuslist2021credential | Status List 2021 Entry}
 */
export interface StatusList2021Entry {
  id: string
  type: string
  statusPurpose: string,

  /** The index of the status entry in the status list. Poorly named by spec, should really be `entryIndex`. */
  statusListIndex: string,

  /** URL to the status list */
  statusListCredential: string,
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
   * @param issuedCredentials The credentials to be included in the status list credential, eg: revoked credentials, list of type [VerifiableCredential].
   * @returns A special [VerifiableCredential] instance that is a StatusListCredential.
   * @throws Error If the status list credential cannot be created.
   *
   * Example:
   * ```
      StatusListCredential.create({
        statusListCredentialId : 'https://statuslistcred.com/123',
        issuer                 : issuerDid.uri,
        statusPurpose          : StatusPurpose.revocation,
        issuedCredentials      : [credWithCredStatus]
      })
   * ```
   */
  public static create(options: StatusListCredentialCreateOptions): VerifiableCredential {
    const { statusListCredentialId, issuer, statusPurpose, issuedCredentials } = options;
    const statusListIndexes: string[] = this.prepareCredentialsForStatusList(statusPurpose, issuedCredentials);
    const bitString = this.bitstringGeneration(statusListIndexes);

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

    const expandedValues = this.bitstringExpansion(encodedListCompressedBitString);

    const credentialIndex = statusListEntryValue.statusListIndex;
    return expandedValues[parseInt(credentialIndex)] == 1;
  }

  /**
   * Validates and extracts unique statusListIndex values from VerifiableCredential objects.
   *
   * @param statusPurpose - The status purpose
   * @param credentials - An array of VerifiableCredential objects.
   * @returns {string[]} An array of unique statusListIndex values.
   * @throws {Error} If any validation fails.
   */
  private static prepareCredentialsForStatusList(
    statusPurpose: StatusPurpose,
    credentials: VerifiableCredential[]
  ): string[] {
    const duplicateSet = new Set<string>();
    for (const vc of credentials) {
      if (!vc.vcDataModel.credentialStatus) {
        throw new Error('no credential status found in credential');
      }

      const statusListEntry: StatusList2021Entry = vc.vcDataModel.credentialStatus as StatusList2021Entry;

      if (statusListEntry.statusPurpose !== statusPurpose) {
        throw new Error('status purpose mismatch');
      }

      if (duplicateSet.has(statusListEntry.statusListIndex)) {
        throw new Error(`duplicate entry found with index: ${statusListEntry.statusListIndex}`);
      }

      if(parseInt(statusListEntry.statusListIndex) < 0) {
        throw new Error('status list index cannot be negative');
      }

      if(parseInt(statusListEntry.statusListIndex) >= BITSTRING_SIZE) {
        throw new Error('status list index is larger than the bitset size');
      }

      duplicateSet.add(statusListEntry.statusListIndex);
    }

    return Array.from(duplicateSet);
  }

  /**
   * Generates a compressed bitstring from an array of statusListIndex values.
   *
   * @param statusListIndexes - An array of statusListIndex values.
   * @returns {string} The compressed bitstring as a base64-encoded string.
   */
  private static bitstringGeneration(statusListIndexes: string[]): string {
    // Initialize a Buffer with 16KB filled with zeros
    const bitstring = new Uint8Array(BITSTRING_SIZE / 8);

    // Set bits for revoked credentials
    statusListIndexes.forEach(index => {
      const statusListIndex = parseInt(index);
      const byteIndex = Math.floor(statusListIndex / 8);
      const bitIndex = statusListIndex % 8;

      bitstring[byteIndex] = bitstring[byteIndex] | (1 << (7 - bitIndex)); // Set bit to 1
    });

    // Compress the bitstring with GZIP using pako
    const compressed = pako.gzip(bitstring);

    // Return the base64-encoded string
    const base64EncodedString = Convert.uint8Array(compressed).toBase64Url();

    return base64EncodedString;
  }

  /**
   * Expands a compressed bitstring into an array of 0s and 1s.
   *
   * @param compressedBitstring - The compressed bitstring as a base64-encoded string.
   * @returns {number[]} An array of 0s and 1s representing the bitstring.
   */
  private static bitstringExpansion(compressedBitstring: string): number[] {
    // Base64-decode the compressed bitstring
    const compressedData = Convert.base64Url(compressedBitstring).toUint8Array();

    // Decompress the data using pako
    const decompressedData = pako.inflate(compressedData);

    // Convert the decompressed data into an array of "0" or "1" strings
    const bitstringArray: number[] = [];
    decompressedData.forEach(byte => {
      for (let i = 7; i >= 0; i--) {
        const bit = (byte >> i) & 1;
        bitstringArray.push(bit);
      }
    });

    return bitstringArray;
  }
}