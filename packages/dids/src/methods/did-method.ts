import type {
  Jwk,
  Signer,
  CryptoApi,
  LocalKeyManager,
  EnclosedSignParams,
  EnclosedVerifyParams,
  InferKeyGeneratorAlgorithm,
} from '@web5/crypto';

import type { BearerDid } from '../bearer-did.js';
import type { DidMetadata, PortableDid } from '../portable-did.js';
import type {
  DidDocument,
  DidResolutionResult,
  DidResolutionOptions,
  DidVerificationMethod,
} from '../types/did-core.js';

import { getVerificationMethodByKey } from '../utils.js';
import { DidError, DidErrorCode } from '../did-error.js';
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
    TDid extends BearerDid,
    TOptions extends DidCreateOptions<TKms>,
    TKms extends CryptoApi | undefined = undefined
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
  create(params: { keyManager?: TKms, options?: TOptions }): Promise<TDid>;
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
   * Instantiates a `BearerDid` object from an existing DID using keys in an external Key Management
   * System (KMS).
   *
   * This method returns a `BearerDid` object by resolving an existing DID URI and verifying that
   * all associated keys are present in the provided key manager.
   *
   * @remarks
   * The method verifies the presence of key material for every verification method in the DID
   * document within the given KMS. If any key is missing, an error is thrown.
   *
   * This approach ensures that the resulting `BearerDid` object is fully operational with the
   * provided key manager and that all cryptographic operations related to the DID can be performed.
   *
   * @param params - The parameters for the `fromKeyManager` operation.
   * @param params.didUri - The URI of the DID to be instantiated.
   * @param params.keyManager - The Key Management System to be used for key management operations.
   * @returns A Promise resolving to the instantiated `BearerDid` object.
   * @throws An error if any key in the DID document is not present in the provided KMS.
   *
   * @example
   * ```ts
   * // Assuming keyManager already contains the key material for the DID.
   * const didUri = 'did:method:example';
   * const did = await DidMethod.fromKeyManager({ didUri, keyManager });
   * // The 'did' is now an instance of BearerDid, linked with the provided keyManager.
   * ```
   */
  public static async fromKeyManager({ didUri, keyManager }: {
    didUri: string;
    keyManager: CryptoApi;
  }): Promise<BearerDid> {
    // Resolve the DID URI to a DID document and document metadata.
    const { didDocument, didDocumentMetadata, didResolutionMetadata } = await this.resolve(didUri);

    // Verify the DID method is supported.
    if (didResolutionMetadata.error === DidErrorCode.MethodNotSupported) {
      throw new DidError(DidErrorCode.MethodNotSupported, `Method not supported`);
    }

    // Verify the DID Resolution Result includes a DID document containing verification methods.
    if (!(didDocument && Array.isArray(didDocument.verificationMethod) && didDocument.verificationMethod.length > 0)) {
      throw new Error(`DID document for '${didUri}' is missing verification methods`);
    }

    // Validate that the key material for every verification method in the DID document is present
    // in the provided key manager.
    for (let vm of didDocument.verificationMethod) {
      if (!vm.publicKeyJwk) {
        throw new Error(`Verification method '${vm.id}' does not contain a public key in JWK format`);
      }

      // Compute the key URI of the verification method's public key.
      const keyUri = await keyManager.getKeyUri({ key: vm.publicKeyJwk });

      // Verify that the key is present in the key manager. If not, an error is thrown.
      await keyManager.getPublicKey({ keyUri });
    }

    const metadata: DidMetadata = didDocumentMetadata;

    // Define a function that returns a signer for the DID.
    const getSigner = async (params?: { keyUri?: string }) => await this.getSigner({
      didDocument,
      keyManager,
      keyUri: params?.keyUri
    });

    return { didDocument, getSigner, keyManager, metadata, uri: didUri };
  }

  /**
   * Given a W3C DID Document, return a {@link Signer} that can be used to sign messages,
   * credentials, or arbitrary data.
   *
   * If given, the `keyUri` parameter is used to select a key from the verification methods present
   * in the DID Document.
   *
   * If `keyUri` is not given, the first (or DID method specific default) verification method in the
   * DID document is used.
   *
   * @param params - The parameters for the `getSigner` operation.
   * @param params.didDocument - DID Document of the DID whose keys will be used to construct the {@link Signer}.
   * @param params.keyManager - Web5 Crypto API used to sign and verify data.
   * @param params.keyUri - Key URI of the key that will be used for sign and verify operations. Optional.
   * @returns An instantiated {@link Signer} that can be used to sign and verify data.
   */
  public static async getSigner({ didDocument, keyManager, keyUri }: {
    didDocument: DidDocument;
    keyManager: CryptoApi;
    keyUri?: string;
  }): Promise<Signer> {
    let publicKey: Jwk | undefined;

    // If a key URI is given use the referenced key for sign and verify operations.
    if (keyUri) {
      // Get the public key from the key store, which also verifies that the key is present.
      publicKey = await keyManager.getPublicKey({ keyUri });
      // Verify the public key exists in the DID Document.
      if (!(await getVerificationMethodByKey({ didDocument, publicKeyJwk: publicKey }))) {
        throw new Error(`Key referenced by '${keyUri}' is not present in the provided DID Document for '${didDocument.id}'`);
      }

    } else {
      // If a key URI is not given, use the key associated with the verification method that is used
      // by default for sign and verify operations. The default verification method is determined by
      // the DID method implementation.
      ({ publicKeyJwk: publicKey } = await this.getSigningMethod({ didDocument }) ?? {});
      if (publicKey === undefined) {
        throw new Error(`No verification methods found in the provided DID Document for '${didDocument.id}'`);
      }
      // Compute the expected key URI of the signing key.
      keyUri = await keyManager.getKeyUri({ key: publicKey });
    }

    // Both the `keyUri` and `publicKey` must be known before returning a signer.
    if (!(keyUri && publicKey)) {
      throw new Error(`Failed to determine the keys needed to create a signer`);
    }

    return {
      async sign({ data }: EnclosedSignParams): Promise<Uint8Array> {
        const signature = await keyManager.sign({ data, keyUri: keyUri! }); // `keyUri` is guaranteed to be defined at this point.
        return signature;
      },

      async verify({ data, signature }: EnclosedVerifyParams): Promise<boolean> {
        const isValid = await keyManager.verify({ data, key: publicKey!, signature }); // `publicKey` is guaranteed to be defined at this point.
        return isValid;
      }
    };
  }

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

  /**
   * Converts a `BearerDid` object to a portable format containing the URI and verification methods
   * associated with the DID.
   *
   * This method is useful when you need to represent the key material and metadata associated with
   * a DID in format that can be used independently of the specific DID method implementation. It
   * extracts both public and private keys from the DID's key manager and organizes them into a
   * `PortableDid` structure.
   *
   * @remarks
   * This method requires that the DID's key manager supports the `exportKey` operation. If the DID
   * document does not contain any verification methods, or if the key manager does not support key
   * export, an error is thrown.
   *
   * The resulting `PortableDid` will contain the same number of verification methods as the DID
   * document, each with its associated public and private keys and the purposes for which the key
   * can be used.
   *
   * @example
   * ```ts
   * // Assuming `did` is an instance of BearerDid
   * const portableDid = await DidMethod.toKeys({ did });
   * // portableDid now contains the verification methods and their associated keys.
   * ```
   *
   * @param params - The parameters for the convert operation.
   * @param params.did - The `BearerDid` object to convert to a portable format.
   * @returns A `PortableDid` containing the URI and verification methods associated with the DID.
   * @throws An error if the key manager does not support key export or if the DID document
   *         is missing verification methods.
   */
  public static async toKeys({ did }: { did: BearerDid }): Promise<PortableDid> {
    // First, confirm that the DID's key manager supports exporting keys.
    if (!('exportKey' in did.keyManager && typeof did.keyManager.exportKey === 'function')) {
      throw new Error(`The key manager of the given DID does not support exporting keys`);
    }

    // Verify the DID document contains at least one verification method.
    if (!(Array.isArray(did.didDocument.verificationMethod) && did.didDocument.verificationMethod.length > 0)) {
      throw new Error(`DID document for '${did.uri}' is missing verification methods`);
    }

    let portableDid: PortableDid = {
      uri                 : did.uri,
      verificationMethods : []
    };

    // Retrieve the key material for every verification method in the DID document from the key
    // manager.
    for (let vm of did.didDocument.verificationMethod) {
      if (!vm.publicKeyJwk) {
        throw new Error(`Verification method '${vm.id}' does not contain a public key in JWK format`);
      }

      // Compute the key URI of the verification method's public key.
      const keyUri = await did.keyManager.getKeyUri({ key: vm.publicKeyJwk });

      // Retrieve the public and private keys from the key manager.
      const privateKey = await did.keyManager.exportKey({ keyUri });

      // Collect the purposes associated with this verification method from the DID document.
      const purposes = Object
        .keys(DidVerificationRelationship)
        .filter((purpose) => (did.didDocument[purpose as keyof DidDocument] as any[])?.includes(vm.id)) as DidVerificationRelationship[];

      // Add the verification method to the key set.
      portableDid.verificationMethods.push({
        ...vm,
        privateKeyJwk: privateKey,
        purposes
      });
    }

    return portableDid;
  }
}