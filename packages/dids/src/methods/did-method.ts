import type {
  Jwk,
  Signer,
  CryptoApi,
  LocalKmsCrypto,
  EnclosedSignParams,
  EnclosedVerifyParams,
  InferKeyGeneratorAlgorithm,
} from '@web5/crypto';

import type {
  DidDocument,
  DidResolutionResult,
  DidResolutionOptions,
  DidVerificationMethod,
} from '../types/did-core.js';

import { getVerificationMethodByKey } from '../utils.js';
import { DidVerificationRelationship } from '../types/did-core.js';

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

  /** {@inheritDoc DidMetadata} */
  metadata: DidMetadata;

  /** {@inheritDoc DidUri#uri} */
  uri: string;
}

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
    : InferKeyGeneratorAlgorithm<LocalKmsCrypto>;

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
 * Represents metadata about a DID resulting from create, update, or deactivate operations.
 */
export type DidMetadata = {
  // Additional properties of any type.
  [key: string]: any;
}

/**
 * Defines the API for a specific DID method. It includes functionalities for creating and resolving DIDs.
 *
 * @typeparam T - The type of the DID instance associated with this method.
 * @typeparam O - The type of the options used for creating the DID.
 */
export interface DidMethodApi<
    TDid extends Did,
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
 * Format to document a DID identifier, along with its associated data,
 * which can be exported, saved to a file, or imported. The intent is
 * bundle all of the necessary metadata to enable usage of the DID in
 * different contexts.
 */
/**
 * Format that documents the metadata of a Decentralized Identifier (DID) to enable usage of the DID
 * in different contexts.
 *
 * @remarks
 * This format is useful for exporting, saving to a file, or importing a DID.
 *
 * @example
 * ```ts
 * // Generate a new DID.
 * const did = await DidExample.create();
 *
 * // Export the DID to a PortableDid.
 * const portableDid = await DidExample.toKeys({ did });
 *
 * // Instantiate a `Did` object from the PortableDid metadata.
 * const didFromKeys = await DidExample.fromKeys({ ...portableDid });
 * // The `didFromKeys` object should be equivalent to the original `did` object.
 * ```
 */
export interface PortableDid {
  /** {@inheritDoc DidUri#uri} */
  uri?: string;

  /**
   * An array of verification methods, including the key material and key purpose, which are
   * included in the DID document.
   *
   * @see {@link https://www.w3.org/TR/did-core/#verification-methods | DID Core Specification, § Verification Methods}
   */
  verificationMethods: PortableDidVerificationMethod[];
}

/**
 * Represents a verification method within a DID Key Set, including both public and private key
 * components, and specifies the purposes for which the verification method can be used.
 *
 * This interface extends {@link DidVerificationMethod}, providing a structure for a cryptographic
 * key pair (public and private keys) with optional purposes. It is used in the context of
 * Decentralized Identifiers (DIDs) where key pairs are associated with specific verification
 * relationships.
 */
export interface PortableDidVerificationMethod extends Partial<DidVerificationMethod> {
  /**
   * Express the private key in JWK format.
   *
   * (Optional) A JSON Web Key that conforms to {@link https://datatracker.ietf.org/doc/html/rfc7517 | RFC 7517}.
   */
  privateKeyJwk?: Jwk;

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
   * const verificationMethod: PortableDidVerificationMethod = {
   *   publicKeyJwk: {
   *     kty: "OKP",
   *     crv: "X25519",
   *     x: "7XdJtNmJ9pV_O_3mxWdn6YjiHJ-HhNkdYQARzVU_mwY",
   *     kid: "xtsuKULPh6VN9fuJMRwj66cDfQyLaxuXHkMlmAe_v6I"
   *   },
   *   privateKeyJwk: {
   *     kty: "OKP",
   *     crv: "X25519",
   *     d: "qM1E646TMZwFcLwRAFwOAYnTT_AvbBd3NBGtGRKTyU8",
   *     x: "7XdJtNmJ9pV_O_3mxWdn6YjiHJ-HhNkdYQARzVU_mwY",
   *     kid: "xtsuKULPh6VN9fuJMRwj66cDfQyLaxuXHkMlmAe_v6I"
   *   },
   *   purposes: ['authentication', 'assertionMethod']
   * };
   * ```
   */
  purposes?: (DidVerificationRelationship | keyof typeof DidVerificationRelationship)[];
}

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
   * @param params - The parameters for the `getSigningMethod` operation.
   * @param params.didDocument - DID Document to get the verification method from.
   * @param params.methodId - ID of the verification method to use for signing.
   * @returns Verification method to use for signing.
   */
  public static async getSigningMethod(_params: {
    didDocument: DidDocument;
    methodId?: string;
  }): Promise<DidVerificationMethod | undefined> {
    throw new Error(`Not implemented: Classes extending DidMethod must implement getSigningMethod()`);
  }

  /**
   * Converts a `Did` object to a portable format containing the URI and verification methods
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
   * // Assuming `did` is an instance of Did
   * const portableDid = await DidJwk.toKeys({ did });
   * // portableDid now contains the verification methods and their associated keys.
   * ```
   *
   * @param params - The parameters for the convert operation.
   * @param params.did - The `Did` object to convert to a portable format.
   * @returns A `PortableDid` containing the URI and verification methods associated with the DID.
   * @throws An error if the key manager does not support key export or if the DID document
   *         is missing verification methods.
   */
  public static async toKeys({ did }: { did: Did }): Promise<PortableDid> {
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