import type {
  CryptoApi,
  LocalKeyManager,
  InferKeyGeneratorAlgorithm,
} from '@web5/crypto';

import type { BearerDid } from '../bearer-did.js';
import type { DidMetadata } from '../types/portable-did.js';
import type {
  DidDocument,
  DidResolutionResult,
  DidResolutionOptions,
  DidVerificationMethod,
} from '../types/did-core.js';

import { DidVerificationRelationship } from '../types/did-core.js';

/**
 * Represents options during the creation of a Decentralized Identifier (DID).
 *
 * Implementations of this interface may contain properties and methods that provide specific
 * options or metadata during the DID creation processes following specific DID method
 * specifications.
 */
export interface DidCreateOptions<TKms> {
  /**
   * Optional. An array of verification methods to be included in the DID document.
   */
  verificationMethods?: DidCreateVerificationMethod<TKms>[];
}

/**
 * Options for additional verification methods added to the DID Document during the creation of a
 * new Decentralized Identifier (DID).
 */
export interface DidCreateVerificationMethod<TKms> extends Pick<Partial<DidVerificationMethod>, 'controller' | 'id' | 'type'> {
  /**
   * The name of the cryptographic algorithm to be used for key generation.
   *
   * Examples might include `Ed25519` and `ES256K` but will vary depending on the DID method
   * specification and the key management system in use.
   *
   * @example
   * ```ts
   * const verificationMethod: DidCreateVerificationMethod = {
   *   algorithm: 'Ed25519'
   * };
   * ```
   */
  algorithm: TKms extends CryptoApi
    ? InferKeyGeneratorAlgorithm<TKms>
    : InferKeyGeneratorAlgorithm<LocalKeyManager>;

  /**
   * Optionally specify the purposes for which a verification method is intended to be used in a DID
   * document.
   *
   * The `purposes` property defines the specific
   * {@link DidVerificationRelationship | verification relationships} between the DID subject and
   * the verification method. This enables the verification method to be utilized for distinct
   * actions such as authentication, assertion, key agreement, capability delegation, and others. It
   * is important for verifiers to recognize that a verification method must be associated with the
   * relevant purpose in the DID document to be valid for that specific use case.
   *
   * @example
   * ```ts
   * const verificationMethod: DidCreateVerificationMethod = {
   *   algorithm: 'Ed25519',
   *   controller: 'did:example:1234',
   *   purposes: ['authentication', 'assertionMethod']
   * };
   * ```
   */
  purposes?: (DidVerificationRelationship | keyof typeof DidVerificationRelationship)[];
}

/**
 * Defines the API for a specific DID method. It includes functionalities for creating and resolving
 * DIDs.
 *
 * @typeparam T - The type of the DID instance associated with this method.
 * @typeparam O - The type of the options used for creating the DID.
 */
export interface DidMethodApi<
    TKms extends CryptoApi | undefined = CryptoApi,
    TDid extends BearerDid = BearerDid,
    TOptions extends DidCreateOptions<TKms> = DidCreateOptions<TKms>
  > extends DidMethodResolver {
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
   * @param params.keyManager - Optional. The cryptographic API used for key management.
   * @param params.options - Optional. The options used for creating the DID.
   * @returns A promise that resolves to the newly created DID instance.
   */
  create(params: {
    keyManager?: TKms;
    options?: TOptions;
  }): Promise<TDid>;

  /**
   * Given a DID Document, return the verification method that will be used for signing messages and
   * credentials.
   *
   * If given, the `methodId` parameter is used to select the verification method. If not given, a
   * DID method specific approach is taken to selecting the verification method to return.
   *
   * @param params - The parameters for the `getSigningMethod` operation.
   * @param params.didDocument - DID Document to get the verification method from.
   * @param params.methodId - ID of the verification method to use for signing.
   * @returns A promise that resolves to the erification method to use for signing.
   */
  getSigningMethod(params: {
    didDocument: DidDocument;
    methodId?: string;
  }): Promise<DidVerificationMethod>;
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
 * Represents the result of a Decentralized Identifier (DID) registration operation.
 *
 * This type encapsulates the complete outcome of registering a DID, including the registration
 * metadata, the DID document (if registration is successful), and metadata about the DID document.
 */
export interface DidRegistrationResult {
  /**
   * The DID document resulting from the registration process, if successful.
   *
   * If the registration operation was successful, this MUST contain a DID document
   * corresponding to the DID. If the registration is unsuccessful, this value MUST be empty.
   *
   * @see {@link https://www.w3.org/TR/did-core/#dfn-diddocument | DID Core Specification, § DID Document}
   */
  didDocument: DidDocument | null;

  /**
   * Metadata about the DID Document.
   *
   * This structure contains information about the DID Document like creation and update timestamps,
   * deactivation status, versioning information, and other details relevant to the DID Document.
   *
   * @see {@link https://www.w3.org/TR/did-core/#dfn-diddocumentmetadata | DID Core Specification, § DID Document Metadata}
   */
  didDocumentMetadata: DidMetadata;

  /**
   * A metadata structure consisting of values relating to the results of the DID registration
   * process.
   *
   * This structure is REQUIRED, and in the case of an error in the registration process,
   * this MUST NOT be empty. If the registration is not successful, this structure MUST contain an
   * `error` property describing the error.
   */
  didRegistrationMetadata: DidRegistrationMetadata;
}

/**
 * Represents metadata related to the result of a DID registration operation.
 *
 * This type includes fields that provide information about the outcome of a DID registration
 * process (e.g., create, update, deactivate), including any errors that occurred.
 *
 * This metadata typically changes between invocations of the `create`, `update`, and `deactivate`
 * functions, as it represents data about the registration process itself.
 */
export type DidRegistrationMetadata = {
  /**
   * An error code indicating issues encountered during the DID registration process.
   *
   * While the DID Core specification does not define a specific set of error codes for the result
   * returned by the `create`, `update`, or `deactivate` functions, it is recommended to use the
   * error codes defined in the DID Specification Registries for
   * {@link https://www.w3.org/TR/did-spec-registries/#error | DID Resolution Metadata }.
   *
   * Recommended error codes include:
   *   - `internalError`: An unexpected error occurred during DID registration process.
   *   - `invalidDid`: The provided DID is invalid.
   *   - `invalidDidDocument`: The provided DID document does not conform to valid syntax.
   *   - `invalidDidDocumentLength`: The byte length of the provided DID document does not match the expected value.
   *   - `invalidSignature`: Verification of a signature failed.
   *   - `methodNotSupported`: The DID method specified is not supported.
   *   - Custom error codes can also be provided as strings.
   */
  error?: string;

  // Additional output metadata generated during DID registration.
  [key: string]: any;
};

/**
 * Base abstraction for all Decentralized Identifier (DID) method implementations.
 *
 * This base class serves as a foundational structure upon which specific DID methods
 * can be implemented. Subclasses should furnish particular method and data models adherent
 * to various DID methods, taking care to adhere to the
 * {@link https://www.w3.org/TR/did-core/ | W3C DID Core specification} and the
 * respective DID method specifications.
 */
export class DidMethod {
  /**
   * MUST be implemented by all DID method implementations that extend {@link DidMethod}.
   *
   * Given the W3C DID Document of a DID, return the verification method that will be used for
   * signing messages and credentials. If given, the `methodId` parameter is used to select the
   * verification method. If not given, each DID method implementation will select a default
   * verification method from the DID Document.
   *
   * @param _params - The parameters for the `getSigningMethod` operation.
   * @param _params.didDocument - DID Document to get the verification method from.
   * @param _params.methodId - ID of the verification method to use for signing.
   * @returns Verification method to use for signing.
   */
  public static async getSigningMethod(_params: {
    didDocument: DidDocument;
    methodId?: string;
  }): Promise<DidVerificationMethod | undefined> {
    throw new Error(`Not implemented: Classes extending DidMethod must implement getSigningMethod()`);
  }

  /**
   * MUST be implemented by all DID method implementations that extend {@link DidMethod}.
   *
   * Resolves a DID URI to a DID Document.
   *
   * @param _didUri - The DID to be resolved.
   * @param _options - Optional parameters for resolving the DID.
   * @returns A Promise resolving to a {@link DidResolutionResult} object representing the result of the resolution.
   */
  public static async resolve(_didUri: string, _options?: DidResolutionOptions): Promise<DidResolutionResult> {
    throw new Error(`Not implemented: Classes extending DidMethod must implement resolve()`);
  }
}