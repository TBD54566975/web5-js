import type { CryptoApi, KeyIdentifier, Signer } from '@web5/crypto';

import type { DidDocument, DidResolutionOptions, DidResolutionResult, DidVerificationRelationship } from '../types/did-core.js';

/**
 * Represents a Decentralized Identifier (DID) along with its convenience functions.
 */
export interface Did {
  /**
   * The DID document associated with this DID.
   */
  didDocument: DidDocument;

  /**
   * Returns a {@link @web5/crypto#Signer} that can be used to sign messages, credentials, or
   * arbitrary data.
   *
   * If given, the `keyUri` parameter is used to select a key from the verification methods present
   * in the DID Document. If `keyUri` is not given, each DID method implementation will select a
   * default verification method key from the DID Document.
   *
   * @param params - The parameters for the `getSigner` operation.
   * @param params.keyUri - Key URI of the key that will be used for sign and verify operations. Optional.
   * @returns An instantiated {@link Signer} that can be used to sign and verify data.
   */
  getSigner: (params?: { keyUri?: string }) => Promise<Signer>;

  /**
   * Key Management System (KMS) used to manage a DIDs keys and sign data.
   *
   * Each DID method requires at least one key be present in the provided `keyManager`.
   */
  keyManager: CryptoApi;

  /**
   * @inheritdoc DidMetadata
   */
  metadata: DidMetadata;

  /**
   * @inheritdoc DidUri#uri
   */
  uri: string;
}

/**
 * Represents options during the creation of a Decentralized Identifier (DID).
 *
 * Implementations of this interface may contain properties and methods that provide specific
 * options or metadata during the DID creation processes following specific DID method
 * specifications.
 */
export interface DidCreateOptions {}

/**
 * Represents metadata about a DID resulting from create, update, or deactivate operations.
 */
export type DidMetadata = {
  /**
   * The key set associated with the DID.
   */
  keySet: DidKeySet;

  // Additional properties of any type.
  [key: string]: any;
}

/**
 * Defines the API for a specific DID method. It includes functionalities for creating and resolving DIDs.
 *
 * @typeparam T - The type of the DID instance associated with this method.
 * @typeparam O - The type of the options used for creating the DID.
 */
export interface DidMethodApi<T extends Did, O extends DidCreateOptions> extends DidMethodResolver {
  /**
   * The name of the DID method.
   *
   * For example, in the DID `did:example:123456`, "example" would be the method name.
   */
  methodName: string;

  new (): DidMethod;

  /**
   * Creates a new DID.
   *
   * This function should generate a new DID in accordance with the DID method specification being
   * implemented, using the provided `keyManager`, and optionally, any provided `options`.
   *
   * @param params - The parameters used to create the DID.
   * @param params.keyManager - The cryptographic API used for key management.
   * @param params.options - Optional. The options used for creating the DID.
   * @returns A promise that resolves to the newly created DID instance.
   */
  create(params: { keyManager: CryptoApi, options?: O }): Promise<T>;
}

/**
 * Defines the interface for resolving a DID using a specific DID method.
 *
 * A DID resolver takes a DID URI as input and returns a {@link DidResolutionResult} object.
 *
 * @property {string} methodName - The name of the DID method.
 * @method resolve - Asynchronous method to resolve a DID URI. Takes the DID URI and optional resolution options.
 */
export interface DidMethodResolver {
  /**
   * The name of the DID method.
   *
   * For example, in the DID `did:example:123456`, "example" would be the method name.
   */
  methodName: string;

  new (): DidMethod;

  /**
   * Resolves a DID URI.
   *
   * This function should resolve the DID URI in accordance with the DID method specification being
   * implemented, using the provided `options`.
   *
   * @param didUri - The DID URI to be resolved.
   * @param options - Optional. The options used for resolving the DID.
   * @returns A {@link DidResolutionResult} object containing the DID document and metadata or an error.
   */
  resolve(didUri: string, options?: DidResolutionOptions): Promise<DidResolutionResult>;
}

/**
 * A set of keys associated with a DID.
 *
 * The keys in this set are expected to be managed by a Key Management System (KMS) which
 * implements the {@link @web5/crypto#CryptoApi | CryptoApi} interface. Examples of such KMS
 * implementations include {@link @web5/crypto#LocalKmsCrypto | LocalKmsCrypto} and
 * {@link @web5/crypto-aws-kms#AwsKmsCrypto | AwsKmsCrypto}.
 */
export interface DidKeySet {
  /**
   * An optional array of keys that are managed by a Key Management System (KMS).
   */
  keys?: DidKmsKey[];
}

/**
 * Represents a key managed by a Key Management System (KMS) within the context of a Decentralized
 * Identifier (DID).
 *
 * This interface describes a cryptographic key used in conjunction with DID operations. The key is
 * identified by a `keyUri`, and is associated with one or more verification relationship purposes
 * within the DID document.
 *
 * The key referred to by the `keyUri` is expected to be managed by a Key Management System (KMS)
 * which implements the {@link @web5/crypto#CryptoApi | CryptoApi} interface. Examples of such KMS
 * implementations include {@link @web5/crypto#LocalKmsCrypto | LocalKmsCrypto} and
 * {@link @web5/crypto-aws-kms#AwsKmsCrypto | AwsKmsCrypto}.
 *
 * @example
 * ```ts
 * const didKmsKey: DidKmsKey = {
 *   keyUri: 'urn:jwk:vO8jHDKD8dynDvVp8Ea2szjIRz2V-hCMhtmJYOxO4oY',
 *   purposes: ['assertionMethod', 'authentication']
 * };
 * ```
 *
 * @see {@link DidVerificationRelationship} for the list of possible verification relationships that
 * can be used to specify the purpose(s) of a key.
 */
export interface DidKmsKey {
  /**
   * A unique identifier for the key within the KMS. This URI is used to reference and manage the
   * key in operations such as signing or encryption.
   */
  keyUri: KeyIdentifier;

  /**
   * An array of {@link DidVerificationRelationship | Verification Relationships} that the key is
   * intended to be used for. Each relationship type specifies how the key can be used in the
   * context of the DID, such as for authentication, assertion, key agreement, etc.
   */
  purposes: DidVerificationRelationship[];
}

/**
 * Base abstraction for all Decentralized Identifier (DID) method implementations.
 *
 * This abstract class serves as a foundational structure upon which specific DID methods
 * can be implemented. Subclasses should furnish particular method and data models adherent
 * to various DID methods. taking care to adhere to the
 * {@link https://www.w3.org/TR/did-core/ | W3C DID Core specification} and the
 * respective DID method specifications.
 */
export abstract class DidMethod {}