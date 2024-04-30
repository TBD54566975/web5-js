import type { MulticodecCode, MulticodecDefinition, RequireOnly } from '@web5/common';
import type {
  Jwk,
  CryptoApi,
  KeyCompressor,
  KeyIdentifier,
  KmsExportKeyParams,
  KmsImportKeyParams,
  KeyImporterExporter,
  AsymmetricKeyConverter,
  InferKeyGeneratorAlgorithm,
} from '@web5/crypto';

import { Multicodec, universalTypeOf } from '@web5/common';
import {
  X25519,
  Ed25519,
  Secp256k1,
  Secp256r1,
  LocalKeyManager,
} from '@web5/crypto';

import type { PortableDid } from '../types/portable-did.js';
import type { DidCreateOptions, DidCreateVerificationMethod } from './did-method.js';
import type {
  DidDocument,
  DidResolutionOptions,
  DidResolutionResult,
  DidVerificationMethod,
} from '../types/did-core.js';

import { Did } from '../did.js';
import { DidMethod } from './did-method.js';
import { BearerDid } from '../bearer-did.js';
import { DidError, DidErrorCode } from '../did-error.js';
import { KeyWithMulticodec } from '../types/multibase.js';
import { EMPTY_DID_RESOLUTION_RESULT } from '../types/did-resolution.js';
import { getVerificationMethodTypes, keyBytesToMultibaseId, multibaseIdToKeyBytes } from '../utils.js';

/**
 * Defines the set of options available when creating a new Decentralized Identifier (DID) with the
 * 'did:key' method.
 *
 * Either the `algorithm` or `verificationMethods` option can be specified, but not both.
 * - A new key will be generated using the algorithm identifier specified in either the `algorithm`
 *   property or the `verificationMethods` object's `algorithm` property.
 * - If `verificationMethods` is given, it must contain exactly one entry since DID Key only
 *   supports a single verification method.
 * - If neither is given, the default is to generate a new Ed25519 key.
 *
 * @example
 * ```ts
  * // By default, when no options are given, a new Ed25519 key will be generated.
 * const did = await DidKey.create();
 *
 * // The algorithm to use for key generation can be specified as a top-level option.
 * const did = await DidKey.create({
 *   options: { algorithm = 'secp256k1' }
 * });
 *
 * // Or, alternatively as a property of the verification method.
 * const did = await DidKey.create({
 *   options: {
 *     verificationMethods: [{ algorithm = 'secp256k1' }]
 *   }
 * });
 *
 * // DID Creation with a KMS
 * const keyManager = new LocalKeyManager();
 * const did = await DidKey.create({ keyManager });
 *
 * // DID Resolution
 * const resolutionResult = await DidKey.resolve({ did: did.uri });
 *
 * // Signature Operations
 * const signer = await did.getSigner();
 * const signature = await signer.sign({ data: new TextEncoder().encode('Message') });
 * const isValid = await signer.verify({ data: new TextEncoder().encode('Message'), signature });
 *
 * // Import / Export
 *
 * // Export a BearerDid object to the PortableDid format.
 * const portableDid = await did.export();
 *
 * // Reconstruct a BearerDid object from a PortableDid
 * const did = await DidKey.import(portableDid);
 * ```
 */
export interface DidKeyCreateOptions<TKms> extends DidCreateOptions<TKms> {
  /**
   * Optionally specify the algorithm to be used for key generation.
   */
  algorithm?: TKms extends CryptoApi
    ? InferKeyGeneratorAlgorithm<TKms>
    : InferKeyGeneratorAlgorithm<LocalKeyManager>;

  /**
   * Optionally specify an array of JSON-LD context links for the @context property of the DID
   * document.
   *
   * The @context property provides a JSON-LD processor with the information necessary to interpret
   * the DID document JSON. The default context URL is 'https://www.w3.org/ns/did/v1'.
   */
  defaultContext?: string;

  /**
   * Optionally enable encryption key derivation during DID creation.
   *
   * By default, this option is set to `false`, which means encryption key derivation is not
   * performed unless explicitly enabled.
   *
   * When set to `true`, an `X25519` key will be derived from the `Ed25519` public key used to
   * create the DID. This feature enables the same DID to be used for encrypted communication, in
   * addition to signature verification.
   *
   * Notes:
   * - This option is ONLY applicable when the `algorithm` of the DID's public key is `Ed25519`.
   * - Enabling this introduces specific cryptographic considerations that should be understood
   *   before using the same key pair for digital signatures and encrypted communication. See the following for more information:
   */
  enableEncryptionKeyDerivation?: boolean;

  /**
   * Optionally enable experimental public key types during DID creation.
   * By default, this option is set to `false`, which means experimental public key types are not
   * supported.
   *
   * Note: This implementation of the DID Key method does not support any experimental public key
   * types.
   */
  enableExperimentalPublicKeyTypes?: boolean;

  /**
   * Optionally specify the format of the public key to be used for DID creation.
   */
  publicKeyFormat?: keyof typeof DidKeyVerificationMethodType;

  /**
   * Alternatively, specify the algorithm to be used for key generation of the single verification
   * method in the DID Document.
   */
  verificationMethods?: DidCreateVerificationMethod<TKms>[];
}

/**
 * Enumerates the types of keys that can be used in a DID Key document.
 *
 * The DID Key method supports various cryptographic key types. These key types are essential for
 * the creation and management of DIDs and their associated cryptographic operations like signing
 * and encryption.
 */
export enum DidKeyRegisteredKeyType {
  /**
   * Ed25519: A public-key signature system using the EdDSA (Edwards-curve Digital Signature
   * Algorithm) and Curve25519.
   */
  Ed25519 = 'Ed25519',

  /**
   * secp256k1: A cryptographic curve used for digital signatures in a range of decentralized
   * systems.
   */
  secp256k1 = 'secp256k1',

  /**
   * secp256r1: Also known as P-256 or prime256v1, this curve is used for cryptographic operations
   * and is widely supported in various cryptographic libraries and standards.
   */
  secp256r1 = 'secp256r1',

  /**
   * X25519: A Diffie-Hellman key exchange algorithm using Curve25519.
   */
  X25519 = 'X25519'
}

/**
 * Enumerates the verification method types supported by the DID Key method.
 *
 * This enum defines the URIs associated with common verification methods used in DID Documents.
 * These URIs represent cryptographic suites or key types standardized for use across decentralized
 * identifiers (DIDs).
 */
export const DidKeyVerificationMethodType = {
  /** Represents an Ed25519 public key used for digital signatures. */
  Ed25519VerificationKey2020: 'https://w3id.org/security/suites/ed25519-2020/v1',

  /** Represents a JSON Web Key (JWK) used for digital signatures and key agreement protocols. */
  JsonWebKey2020: 'https://w3id.org/security/suites/jws-2020/v1',

  /** Represents an X25519 public key used for key agreement protocols. */
  X25519KeyAgreementKey2020: 'https://w3id.org/security/suites/x25519-2020/v1',
} as const;

/**
 * Private helper that maps algorithm identifiers to their corresponding DID Key
 * {@link DidKeyRegisteredKeyType | registered key type}.
 */
const AlgorithmToKeyTypeMap = {
  Ed25519   : DidKeyRegisteredKeyType.Ed25519,
  ES256K    : DidKeyRegisteredKeyType.secp256k1,
  ES256     : DidKeyRegisteredKeyType.secp256r1,
  'P-256'   : DidKeyRegisteredKeyType.secp256r1,
  secp256k1 : DidKeyRegisteredKeyType.secp256k1,
  secp256r1 : DidKeyRegisteredKeyType.secp256r1,
  X25519    : DidKeyRegisteredKeyType.X25519
} as const;

/**
 * The `DidKey` class provides an implementation of the 'did:key' DID method.
 *
 * Features:
 * - DID Creation: Create new `did:key` DIDs.
 * - DID Key Management: Instantiate a DID object from an existing verification method key set or
 *                       or a key in a Key Management System (KMS). If supported by the KMS, a DID's
 *                       key can be exported to a portable DID format.
 * - DID Resolution: Resolve a `did:key` to its corresponding DID Document.
 * - Signature Operations: Sign and verify messages using keys associated with a DID.
 *
 * @remarks
 * The `did:key` DID method uses a single public key to generate a DID and does not rely
 * on any external system such as a blockchain or centralized database. This characteristic makes
 * it suitable for use cases where a assertions about a DID Subject can be self-verifiable by
 * third parties.
 *
 * The method-specific identifier is formed by
 * {@link https://datatracker.ietf.org/doc/html/draft-multiformats-multibase#name-base-58-bitcoin-encoding | Multibase base58-btc}
 * encoding the concatenation of the
 * {@link https://github.com/multiformats/multicodec/blob/master/README.md | Multicodec} identifier
 * for the public key type and the raw public key bytes. To form the DID URI, the method-specific
 * identifier is prefixed with the string 'did:key:'.
 *
 * This method can optionally derive an encryption key from the public key used to create the DID
 * if and only if the public key algorithm is `Ed25519`. This feature enables the same DID to be
 * used for encrypted communication, in addition to signature verification. To enable this
 * feature when calling {@link DidKey.create | `DidKey.create()`}, first specify an `algorithm` of
 * `Ed25519` or provide a `keySet` referencing an `Ed25519` key and then set the
 * `enableEncryptionKeyDerivation` option to `true`.
 *
 * Note:
 * - The authors of the DID Key specification have indicated that use of this method for long-lived
 *   use cases is only recommended when accompanied with high confidence that private keys are
 *   securely protected by software or hardware isolation.
 *
 * @see {@link https://w3c-ccg.github.io/did-method-key/ | DID Key Specification}
 *
* @example
 * ```ts
 * // DID Creation
 * const did = await DidKey.create();
 *
 * // DID Creation with a KMS
 * const keyManager = new LocalKeyManager();
 * const did = await DidKey.create({ keyManager });
 *
 * // DID Resolution
 * const resolutionResult = await DidKey.resolve({ did: did.uri });
 *
 * // Signature Operations
 * const signer = await did.getSigner();
 * const signature = await signer.sign({ data: new TextEncoder().encode('Message') });
 * const isValid = await signer.verify({ data: new TextEncoder().encode('Message'), signature });
 *
 * // Key Management
 *
 * // Instantiate a DID object from an existing key in a KMS
 * const did = await DidKey.fromKeyManager({
 *  didUri: 'did:key:z6MkpUzNmYVTGpqhStxK8yRKXWCRNm1bGYz8geAg2zmjYHKX',
 *  keyManager
 * });
 *
 * // Instantiate a DID object from an existing verification method key
 * const did = await DidKey.fromKeys({
 *   verificationMethods: [{
 *     publicKeyJwk: {
 *       kty: 'OKP',
 *       crv: 'Ed25519',
 *       x: 'cHs7YMLQ3gCWjkacMURBsnEJBcEsvlsE5DfnsfTNDP4'
 *     },
 *     privateKeyJwk: {
 *       kty: 'OKP',
 *       crv: 'Ed25519',
 *       x: 'cHs7YMLQ3gCWjkacMURBsnEJBcEsvlsE5DfnsfTNDP4',
 *       d: 'bdcGE4KzEaekOwoa-ee3gAm1a991WvNj_Eq3WKyqTnE'
 *     }
 *   }]
 * });
 *
 * // Convert a DID object to a portable format
 * const portableDid = await DidKey.toKeys({ did });
 *
 * // Reconstruct a DID object from a portable format
 * const did = await DidKey.fromKeys(portableDid);
 * ```
 */
export class DidKey extends DidMethod {

  /**
   * Name of the DID method, as defined in the DID Key specification.
   */
  public static methodName = 'key';

  /**
   * Creates a new DID using the `did:key` method formed from a newly generated key.
   *
   * @remarks
   * The DID URI is formed by
   * {@link https://datatracker.ietf.org/doc/html/draft-multiformats-multibase#name-base-58-bitcoin-encoding | Multibase base58-btc}
   * encoding the
   * {@link https://github.com/multiformats/multicodec/blob/master/README.md | Multicodec}-encoded
   * public key and prefixing with `did:key:`.
   *
   * This method can optionally derive an encryption key from the public key used to create the DID
   * if and only if the public key algorithm is `Ed25519`. This feature enables the same DID to be
   * used for encrypted communication, in addition to signature verification. To enable this
   * feature, specify an `algorithm` of `Ed25519` as either a top-level option or in a
   * `verificationMethod` and set the `enableEncryptionKeyDerivation` option to `true`.
   *
   * Notes:
   * - If no `options` are given, by default a new Ed25519 key will be generated.
   * - The `algorithm` and `verificationMethods` options are mutually exclusive. If both are given,
   *   an error will be thrown.
   *
   * @example
   * ```ts
   * // DID Creation
   * const did = await DidKey.create();
   *
   * // DID Creation with a KMS
   * const keyManager = new LocalKeyManager();
   * const did = await DidKey.create({ keyManager });
   * ```
   *
   * @param params - The parameters for the create operation.
   * @param params.keyManager - Key Management System (KMS) used to generate keys and sign data.
   * @param params.options - Optional parameters that can be specified when creating a new DID.
   * @returns A Promise resolving to a {@link BearerDid} object representing the new DID.
   */
  public static async create<TKms extends CryptoApi | undefined = undefined>({
    keyManager = new LocalKeyManager(),
    options = {}
  }: {
    keyManager?: TKms;
    options?: DidKeyCreateOptions<TKms>;
  } = {}): Promise<BearerDid> {
    // Before processing the create operation, validate DID-method-specific requirements to prevent
    // keys from being generated unnecessarily.

    // Check 1: Validate that `algorithm` or `verificationMethods` options are not both given.
    if (options.algorithm && options.verificationMethods) {
      throw new Error(`The 'algorithm' and 'verificationMethods' options are mutually exclusive`);
    }

    // Check 2: If `verificationMethods` is given, it must contain exactly one entry since DID Key
    // only supports a single verification method.
    if (options.verificationMethods && options.verificationMethods.length !== 1) {
      throw new Error(`The 'verificationMethods' option must contain exactly one entry`);
    }

    // Default to Ed25519 key generation if an algorithm is not given.
    const algorithm = options.algorithm ?? options.verificationMethods?.[0]?.algorithm ?? 'Ed25519';

    // Generate a new key using the specified `algorithm`.
    const keyUri = await keyManager.generateKey({ algorithm });
    const publicKey = await keyManager.getPublicKey({ keyUri });

    // Compute the DID identifier from the public key by converting the JWK to a multibase-encoded
    // multicodec value.
    const identifier = await DidKeyUtils.publicKeyToMultibaseId({ publicKey });

    // Attach the prefix `did:key` to form the complete DID URI.
    const didUri = `did:${DidKey.methodName}:${identifier}`;

    // Expand the DID URI string to a DID document.
    const didResolutionResult = await DidKey.resolve(didUri, options);
    const document = didResolutionResult.didDocument as DidDocument;

    // Create the BearerDid object from the generated key material.
    const did = new BearerDid({
      uri      : didUri,
      document,
      metadata : {},
      keyManager
    });

    return did;
  }

  /**
   * Given the W3C DID Document of a `did:key` DID, return the verification method that will be used
   * for signing messages and credentials. With DID Key, the first verification method in the
   * authentication property in the DID Document is used.
   *
   * Note that for DID Key, only one verification method intended for signing can exist so
   * specifying `methodId` could be considered redundant or unnecessary. The option is provided for
   * consistency with other DID method implementations.
   *
   * @param params - The parameters for the `getSigningMethod` operation.
   * @param params.didDocument - DID Document to get the verification method from.
   * @param params.methodId - ID of the verification method to use for signing.
   * @returns Verification method to use for signing.
   */
  public static async getSigningMethod({ didDocument }: {
    didDocument: DidDocument;
    methodId?: string;
  }): Promise<DidVerificationMethod> {
    // Verify the DID method is supported.
    const parsedDid = Did.parse(didDocument.id);
    if (parsedDid && parsedDid.method !== this.methodName) {
      throw new DidError(DidErrorCode.MethodNotSupported, `Method not supported: ${parsedDid.method}`);
    }

    // Attempt to ge the first verification method intended for signing claims.
    const [ methodId ] = didDocument.assertionMethod || [];
    const verificationMethod = didDocument.verificationMethod?.find(vm => vm.id === methodId);

    if (!(verificationMethod && verificationMethod.publicKeyJwk)) {
      throw new DidError(DidErrorCode.InternalError, 'A verification method intended for signing could not be determined from the DID Document');
    }

    return verificationMethod;
  }

  /**
   * Instantiates a {@link BearerDid} object for the DID Key method from a given {@link PortableDid}.
   *
   * This method allows for the creation of a `BearerDid` object using a previously created DID's
   * key material, DID document, and metadata.
   *
   * @remarks
   * The `verificationMethod` array of the DID document must contain exactly one key since the
   * `did:key` method only supports a single verification method.
   *
   * @example
   * ```ts
   * // Export an existing BearerDid to PortableDid format.
   * const portableDid = await did.export();
   * // Reconstruct a BearerDid object from the PortableDid.
   * const did = await DidKey.import({ portableDid });
   * ```
   *
   * @param params - The parameters for the import operation.
   * @param params.portableDid - The PortableDid object to import.
   * @param params.keyManager - Optionally specify an external Key Management System (KMS) used to
   *                            generate keys and sign data. If not given, a new
   *                            {@link LocalKeyManager} instance will be created and
   *                            used.
   * @returns A Promise resolving to a `BearerDid` object representing the DID formed from the provided keys.
   * @throws An error if the DID document does not contain exactly one verification method.
   */
  public static async import({ portableDid, keyManager = new LocalKeyManager() }: {
    keyManager?: CryptoApi & KeyImporterExporter<KmsImportKeyParams, KeyIdentifier, KmsExportKeyParams>;
    portableDid: PortableDid;
  }): Promise<BearerDid> {
    // Verify the DID method is supported.
    const parsedDid = Did.parse(portableDid.uri);
    if (parsedDid?.method !== DidKey.methodName) {
      throw new DidError(DidErrorCode.MethodNotSupported, `Method not supported`);
    }

    // Use the given PortableDid to construct the BearerDid object.
    const did = await BearerDid.import({ portableDid, keyManager });

    // Validate that the given DID document contains exactly one verification method.
    // Note: The non-undefined assertion is necessary because the type system cannot infer that
    // the `verificationMethod` property is defined -- which is checked by `BearerDid.import()`.
    if (did.document.verificationMethod!.length !== 1) {
      throw new DidError(DidErrorCode.InvalidDidDocument, `DID document must contain exactly one verification method`);
    }

    return did;
  }

  /**
   * Resolves a `did:key` identifier to a DID Document.
   *
   * @param didUri - The DID to be resolved.
   * @param options - Optional parameters for resolving the DID.
   * @returns A Promise resolving to a {@link DidResolutionResult} object representing the result of the resolution.
   */
  public static async resolve(didUri: string, options?: DidResolutionOptions): Promise<DidResolutionResult> {
    try {
      // Attempt to expand the DID URI string to a DID document.
      const didDocument = await DidKey.createDocument({ didUri, options });

      // If the DID document was created successfully, return it.
      return {
        ...EMPTY_DID_RESOLUTION_RESULT,
        didDocument,
      };

    } catch (error: any) {
      // Rethrow any unexpected errors that are not a `DidError`.
      if (!(error instanceof DidError)) throw new Error(error);

      // Return a DID Resolution Result with the appropriate error code.
      return {
        ...EMPTY_DID_RESOLUTION_RESULT,
        didResolutionMetadata: {
          error: error.code,
          ...error.message && { errorMessage: error.message }
        }
      };
    }
  }

  /**
   * Expands a did:key identifier to a DID Document.
   *
   * Reference: https://w3c-ccg.github.io/did-method-key/#document-creation-algorithm
   *
   * @param options
   * @returns - A DID dodcument.
   */
  private static async createDocument({ didUri, options = {}}: {
    didUri: string;
    options?: Exclude<DidKeyCreateOptions<CryptoApi>, 'algorithm' | 'verificationMethods'> | DidResolutionOptions;
  }): Promise<DidDocument> {
    const {
      defaultContext = 'https://www.w3.org/ns/did/v1',
      enableEncryptionKeyDerivation = false,
      enableExperimentalPublicKeyTypes = false,
      publicKeyFormat = 'JsonWebKey2020'
    } = options;

    /**
     * 1. Initialize document to an empty object.
     */
    const didDocument: DidDocument = { id: '' };

    /**
     * 2. Using a colon (:) as the delimiter, split the identifier into its
     * components: a scheme, a method, a version, and a multibaseValue.
     * If there are only three components set the version to the string
     * value 1 and use the last value as the multibaseValue.
     */
    const parsedDid = Did.parse(didUri);
    if (!parsedDid) {
      throw new DidError(DidErrorCode.InvalidDid, `Invalid DID URI: ${didUri}`);
    }
    const multibaseValue = parsedDid.id;

    /**
     * 3. Check the validity of the input identifier.
     * The scheme MUST be the value did. The method MUST be the value key.
     * The version MUST be convertible to a positive integer value. The
     * multibaseValue MUST be a string and begin with the letter z. If any
     * of these requirements fail, an invalidDid error MUST be raised.
     */
    if (parsedDid.method !== DidKey.methodName) {
      throw new DidError(DidErrorCode.MethodNotSupported, `Method not supported: ${parsedDid.method}`);
    }
    if (!DidKey.validateIdentifier(parsedDid)) {
      throw new DidError(DidErrorCode.InvalidDid, `Invalid DID URI: ${didUri}`);
    }

    /**
     * 4. Initialize the signatureVerificationMethod to the result of passing
     * identifier, multibaseValue, and options to a
     *  {@link https://w3c-ccg.github.io/did-method-key/#signature-method-creation-algorithm | Signature Method Creation Algorithm}.
     */
    const signatureVerificationMethod = await DidKey.createSignatureMethod({
      didUri,
      multibaseValue,
      options: { enableExperimentalPublicKeyTypes, publicKeyFormat }
    });

    /**
     * 5. Set document.id to identifier. If document.id is not a valid DID,
     * an invalidDid error MUST be raised.
     *
     * Note: Identifier was already confirmed to be valid in Step 3, so
     *       skipping the redundant validation.
     */
    didDocument.id = parsedDid.uri;

    /**
     * 6. Initialize the verificationMethod property in document to an array
     * where the first value is the signatureVerificationMethod.
     */
    didDocument.verificationMethod = [signatureVerificationMethod];

    /**
     * 7. Initialize the authentication, assertionMethod, capabilityInvocation,
     * and the capabilityDelegation properties in document to an array where
     * the first item is the value of the id property in
     * signatureVerificationMethod.
     */
    didDocument.authentication = [signatureVerificationMethod.id];
    didDocument.assertionMethod = [signatureVerificationMethod.id];
    didDocument.capabilityInvocation = [signatureVerificationMethod.id];
    didDocument.capabilityDelegation = [signatureVerificationMethod.id];

    /**
     * 8. If options.enableEncryptionKeyDerivation is set to true:
     * Add the encryptionVerificationMethod value to the verificationMethod
     * array. Initialize the keyAgreement property in document to an array
     * where the first item is the value of the id property in
     * encryptionVerificationMethod.
     */
    if (enableEncryptionKeyDerivation === true) {
      /**
       * Although not covered by the did:key method specification, a sensible
       * default will be taken to use the 'X25519KeyAgreementKey2020'
       * verification method type if the given publicKeyFormat is
       * 'Ed25519VerificationKey2020' and 'JsonWebKey2020' otherwise.
       */
      const encryptionPublicKeyFormat =
        (publicKeyFormat === 'Ed25519VerificationKey2020')
          ? 'X25519KeyAgreementKey2020'
          : 'JsonWebKey2020';

      /**
       * 8.1 Initialize the encryptionVerificationMethod to the result of
       * passing identifier, multibaseValue, and options to an
     * {@link https://w3c-ccg.github.io/did-method-key/#encryption-method-creation-algorithm | Encryption Method Creation Algorithm}.
       */
      const encryptionVerificationMethod = await this.createEncryptionMethod({
        didUri,
        multibaseValue,
        options: { enableExperimentalPublicKeyTypes, publicKeyFormat: encryptionPublicKeyFormat }
      });

      /**
       * 8.2 Add the encryptionVerificationMethod value to the
       * verificationMethod array.
       */
      didDocument.verificationMethod.push(encryptionVerificationMethod);

      /**
       * 8.3. Initialize the keyAgreement property in document to an array
       * where the first item is the value of the id property in
       * encryptionVerificationMethod.
       */
      didDocument.keyAgreement = [encryptionVerificationMethod.id];
    }

    /**
     * 9. Initialize the @context property in document to the result of passing document and options to the Context
     * Creation algorithm.
     */
    // Set contextArray to an array that is initialized to options.defaultContext.
    const contextArray = [ defaultContext ];

    // For every object in every verification relationship listed in document,
    // add a string value to the contextArray based on the object type value,
    // if it doesn't already exist, according to the following table:
    // {@link https://w3c-ccg.github.io/did-method-key/#context-creation-algorithm | Context Type URL}
    const verificationMethodTypes = getVerificationMethodTypes({ didDocument });
    verificationMethodTypes.forEach((typeName: string) => {
      const typeUrl = DidKeyVerificationMethodType[typeName as keyof typeof DidKeyVerificationMethodType];
      contextArray.push(typeUrl);
    });
    didDocument['@context'] = contextArray;

    /**
     * 10. Return document.
     */
    return didDocument;
  }

  /**
   * Decoding a multibase-encoded multicodec value into a verification method
   * that is suitable for verifying that encrypted information will be
   * received by the intended recipient.
   */
  private static async createEncryptionMethod({ didUri, multibaseValue, options }: {
    didUri: string;
    multibaseValue: string;
    options: Required<Pick<DidKeyCreateOptions<CryptoApi>, 'enableExperimentalPublicKeyTypes' | 'publicKeyFormat'>>;
  }): Promise<DidVerificationMethod> {
    const { enableExperimentalPublicKeyTypes, publicKeyFormat } = options;

    /**
     * 1. Initialize verificationMethod to an empty object.
     */
    const verificationMethod: DidVerificationMethod = { id: '', type: '', controller: '' };

    /**
     * 2. Set multicodecValue and raw publicKeyBytes to the result of passing multibaseValue and
     * options to a Derive Encryption Key algorithm.
     */
    const {
      keyBytes: publicKeyBytes,
      multicodecCode: multicodecValue,
    } = await DidKey.deriveEncryptionKey({ multibaseValue });

    /**
     * 3. Ensure the proper key length of raw publicKeyBytes based on the multicodecValue table
     * provided below:
     *
     * Multicodec hexadecimal value: 0xec
     *
     * If the byte length of raw publicKeyBytes does not match the expected public key length for
     * the associated multicodecValue, an invalidPublicKeyLength error MUST be raised.
     */
    const actualLength = publicKeyBytes.byteLength;
    const expectedLength = DidKeyUtils.MULTICODEC_PUBLIC_KEY_LENGTH[multicodecValue];
    if (actualLength !== expectedLength) {
      throw new DidError(DidErrorCode.InvalidPublicKeyLength, `Expected ${actualLength} bytes. Actual: ${expectedLength}`);
    }

    /**
     * 4. Create the multibaseValue by concatenating the letter 'z' and the
     * base58-btc encoding of the concatenation of the multicodecValue and
     * the raw publicKeyBytes.
     */
    const kemMultibaseValue = keyBytesToMultibaseId({
      keyBytes       : publicKeyBytes,
      multicodecCode : multicodecValue
    });

    /**
     * 5. Set the verificationMethod.id value by concatenating identifier,
     * a hash character (#), and the multibaseValue. If verificationMethod.id
     * is not a valid DID URL, an invalidDidUrl error MUST be raised.
     */
    verificationMethod.id = `${didUri}#${kemMultibaseValue}`;
    try {
      new URL(verificationMethod.id);
    } catch (error: any) {
      throw new DidError(DidErrorCode.InvalidDidUrl, 'Verification Method ID is not a valid DID URL.');
    }

    /**
     * 6. Set the publicKeyFormat value to the options.publicKeyFormat value.
     * 7. If publicKeyFormat is not known to the implementation, an
     * unsupportedPublicKeyType error MUST be raised.
     */
    if (!(publicKeyFormat in DidKeyVerificationMethodType)) {
      throw new DidError(DidErrorCode.UnsupportedPublicKeyType, `Unsupported format: ${publicKeyFormat}`);
    }

    /**
     * 8. If options.enableExperimentalPublicKeyTypes is set to false and publicKeyFormat is not
     * Multikey, JsonWebKey2020, or X25519KeyAgreementKey2020, an invalidPublicKeyType error MUST be
     * raised.
     */
    const StandardPublicKeyTypes = ['Multikey', 'JsonWebKey2020', 'X25519KeyAgreementKey2020'];
    if (enableExperimentalPublicKeyTypes === false
      && !(StandardPublicKeyTypes.includes(publicKeyFormat))) {
      throw new DidError(DidErrorCode.InvalidPublicKeyType, `Specified '${publicKeyFormat}' without setting enableExperimentalPublicKeyTypes to true.`);
    }

    /**
     * 9. Set verificationMethod.type to the publicKeyFormat value.
     */
    verificationMethod.type = publicKeyFormat;

    /**
     * 10. Set verificationMethod.controller to the identifier value.
     */
    verificationMethod.controller = didUri;

    /**
     * 11. If publicKeyFormat is Multikey or X25519KeyAgreementKey2020, set the verificationMethod.publicKeyMultibase
     * value to multibaseValue.
     *
     * Note: This implementation does not currently support the Multikey
     *       format.
     */
    if (publicKeyFormat === 'X25519KeyAgreementKey2020') {
      verificationMethod.publicKeyMultibase = kemMultibaseValue;
    }

    /**
     * 12. If publicKeyFormat is JsonWebKey2020, set the verificationMethod.publicKeyJwk value to
     * the result of passing multicodecValue and rawPublicKeyBytes to a JWK encoding algorithm.
     */
    if (publicKeyFormat === 'JsonWebKey2020') {
      const { crv } = await DidKeyUtils.multicodecToJwk({ code: multicodecValue });
      verificationMethod.publicKeyJwk = await DidKeyUtils.keyConverter(crv!).bytesToPublicKey({ publicKeyBytes });
    }

    /**
     * 13. Return verificationMethod.
     */
    return verificationMethod;
  }

  /**
   * Decodes a multibase-encoded multicodec value into a verification method
   * that is suitable for verifying digital signatures.
   * @param options - Signature method creation algorithm inputs.
   * @returns - A verification method.
   */
  private static async createSignatureMethod({ didUri, multibaseValue, options }: {
    didUri: string;
    multibaseValue: string;
    options: Required<Pick<DidKeyCreateOptions<CryptoApi>, 'enableExperimentalPublicKeyTypes' | 'publicKeyFormat'>>
  }): Promise<DidVerificationMethod> {
    const { enableExperimentalPublicKeyTypes, publicKeyFormat } = options;

    /**
     * 1. Initialize verificationMethod to an empty object.
     */
    const verificationMethod: DidVerificationMethod = { id: '', type: '', controller: '' };

    /**
     * 2. Set multicodecValue and publicKeyBytes to the result of passing
     * multibaseValue and options to a Decode Public Key algorithm.
     */
    const {
      keyBytes: publicKeyBytes,
      multicodecCode: multicodecValue,
      multicodecName
    } = multibaseIdToKeyBytes({ multibaseKeyId: multibaseValue });

    /**
     * 3. Ensure the proper key length of publicKeyBytes based on the multicodecValue
     * {@link https://w3c-ccg.github.io/did-method-key/#signature-method-creation-algorithm | table provided}.
     * If the byte length of rawPublicKeyBytes does not match the expected public key length for the
     * associated multicodecValue, an invalidPublicKeyLength error MUST be raised.
     */
    const actualLength = publicKeyBytes.byteLength;
    const expectedLength = DidKeyUtils.MULTICODEC_PUBLIC_KEY_LENGTH[multicodecValue];
    if (actualLength !== expectedLength) {
      throw new DidError(DidErrorCode.InvalidPublicKeyLength, `Expected ${actualLength} bytes. Actual: ${expectedLength}`);
    }

    /**
     * 4. Ensure the publicKeyBytes are a proper encoding of the public key type as specified by
     * the multicodecValue. If an invalid public key value is detected, an invalidPublicKey error
     * MUST be raised.
     */
    let isValid = false;
    switch (multicodecName) {
      case 'secp256k1-pub':
        isValid = await Secp256k1.validatePublicKey({ publicKeyBytes });
        break;
      case 'ed25519-pub':
        isValid = await Ed25519.validatePublicKey({ publicKeyBytes });
        break;
      case 'x25519-pub':
        // TODO: Validate key once/if X25519.validatePublicKey() is implemented.
        // isValid = X25519.validatePublicKey({ key: rawPublicKeyBytes})
        isValid = true;
        break;
    }
    if (!isValid) {
      throw new DidError(DidErrorCode.InvalidPublicKey, 'Invalid public key detected.');
    }

    /**
     * 5. Set the verificationMethod.id value by concatenating identifier, a hash character (#), and
     * the multibaseValue. If verificationMethod.id is not a valid DID URL, an invalidDidUrl error
     * MUST be raised.
     */
    verificationMethod.id = `${didUri}#${multibaseValue}`;
    try {
      new URL(verificationMethod.id);
    } catch (error: any) {
      throw new DidError(DidErrorCode.InvalidDidUrl, 'Verification Method ID is not a valid DID URL.');
    }

    /**
     * 6. Set the publicKeyFormat value to the options.publicKeyFormat value.
     * 7. If publicKeyFormat is not known to the implementation, an unsupportedPublicKeyType error
     * MUST be raised.
     */
    if (!(publicKeyFormat in DidKeyVerificationMethodType)) {
      throw new DidError(DidErrorCode.UnsupportedPublicKeyType, `Unsupported format: ${publicKeyFormat}`);
    }

    /**
     * 8. If options.enableExperimentalPublicKeyTypes is set to false and publicKeyFormat is not
     * Multikey, JsonWebKey2020, or Ed25519VerificationKey2020, an invalidPublicKeyType error MUST
     * be raised.
     */
    const StandardPublicKeyTypes = ['Multikey', 'JsonWebKey2020', 'Ed25519VerificationKey2020'];
    if (enableExperimentalPublicKeyTypes === false
      && !(StandardPublicKeyTypes.includes(publicKeyFormat))) {
      throw new DidError(DidErrorCode.InvalidPublicKeyType, `Specified '${publicKeyFormat}' without setting enableExperimentalPublicKeyTypes to true.`);
    }

    /**
     * 9. Set verificationMethod.type to the publicKeyFormat value.
     */
    verificationMethod.type = publicKeyFormat;

    /**
     * 10. Set verificationMethod.controller to the identifier value.
     */
    verificationMethod.controller = didUri;

    /**
     * 11. If publicKeyFormat is Multikey or Ed25519VerificationKey2020,
     * set the verificationMethod.publicKeyMultibase value to multibaseValue.
     *
     * Note: This implementation does not currently support the Multikey
     *       format.
     */
    if (publicKeyFormat === 'Ed25519VerificationKey2020') {
      verificationMethod.publicKeyMultibase = multibaseValue;
    }

    /**
     * 12. If publicKeyFormat is JsonWebKey2020, set the verificationMethod.publicKeyJwk value to
     * the result of passing multicodecValue and rawPublicKeyBytes to a JWK encoding algorithm.
     */
    if (publicKeyFormat === 'JsonWebKey2020') {
      const { crv } = await DidKeyUtils.multicodecToJwk({ code: multicodecValue });
      verificationMethod.publicKeyJwk = await DidKeyUtils.keyConverter(crv!).bytesToPublicKey({ publicKeyBytes});
    }

    /**
     * 13. Return verificationMethod.
     */
    return verificationMethod;
  }


  /**
   * Transform a multibase-encoded multicodec value to public encryption key
   * components that are suitable for encrypting messages to a receiver. A
   * mathematical proof elaborating on the safety of performing this operation
   * is available in:
   * {@link https://eprint.iacr.org/2021/509.pdf | On using the same key pair for Ed25519 and an X25519 based KEM}
   */
  private static async deriveEncryptionKey({ multibaseValue }: {
    multibaseValue: string
  }): Promise<RequireOnly<KeyWithMulticodec, 'keyBytes' | 'multicodecCode'>> {
    /**
     * 1. Set publicEncryptionKey to an empty object.
     */
    let publicEncryptionKey: RequireOnly<KeyWithMulticodec, 'keyBytes' | 'multicodecCode'> = {
      keyBytes       : new Uint8Array(),
      multicodecCode : 0
    };

    /**
     * 2. Decode multibaseValue using the base58-btc multibase alphabet and
     * set multicodecValue to the multicodec header for the decoded value.
     * Implementers are cautioned to ensure that the multicodecValue is set
     * to the result after performing varint decoding.
     *
     * 3. Set the rawPublicKeyBytes to the bytes remaining after the multicodec
     * header.
     */
    const {
      keyBytes: publicKeyBytes,
      multicodecCode: multicodecValue
    } = multibaseIdToKeyBytes({ multibaseKeyId: multibaseValue });

    /**
     * 4. If the multicodecValue is 0xed (Ed25519 public key), derive a public X25519 encryption key
     * by using the raw publicKeyBytes and the algorithm defined in
     * {@link https://datatracker.ietf.org/doc/html/draft-ietf-core-oscore-groupcomm | Group OSCORE - Secure Group Communication for CoAP}
     * for Curve25519 in Section 2.4.2: ECDH with Montgomery Coordinates and set
     * generatedPublicEncryptionKeyBytes to the result.
     */
    if (multicodecValue === 0xed) {
      const ed25519PublicKey = await DidKeyUtils.keyConverter('Ed25519').bytesToPublicKey({
        publicKeyBytes
      });
      const generatedPublicEncryptionKey = await Ed25519.convertPublicKeyToX25519({
        publicKey: ed25519PublicKey
      });
      const generatedPublicEncryptionKeyBytes = await DidKeyUtils.keyConverter('Ed25519').publicKeyToBytes({
        publicKey: generatedPublicEncryptionKey
      });

      /**
       * 5. Set multicodecValue to 0xec.
       * 6. Set raw public keyBytes to generatedPublicEncryptionKeyBytes.
       */
      publicEncryptionKey = {
        keyBytes       : generatedPublicEncryptionKeyBytes,
        multicodecCode : 0xec
      };
    }

    /**
     * 7. Return publicEncryptionKey.
     */
    return publicEncryptionKey;
  }

  /**
   * Validates the structure and components of a DID URI against the `did:key` method specification.
   *
   * @param parsedDid - An object representing the parsed components of a DID URI, including the
   *                    scheme, method, and method-specific identifier.
   * @returns `true` if the DID URI meets the `did:key` method's structural requirements, `false` otherwise.
   *
   */
  private static validateIdentifier(parsedDid: Did): boolean {
    const { method, id: multibaseValue } = parsedDid;
    const [ scheme ] = parsedDid.uri.split(':', 1);

    /**
     * Note: The W3C DID specification makes no mention of a version value being part of the DID
     *       syntax.  Additionally, there does not appear to be any real-world usage of the version
     *       number. Consequently, this implementation will ignore the version related guidance in
     *       the did:key specification.
     */
    const version = '1';

    return (
      scheme === 'did' &&
      method === 'key' &&
      Number(version) > 0 &&
      universalTypeOf(multibaseValue) === 'String' &&
      multibaseValue.startsWith('z')
    );
  }
}

/**
 * The `DidKeyUtils` class provides utility functions to support operations in the DID Key method.
 */
export class DidKeyUtils {
  /**
   * A mapping from JSON Web Key (JWK) property descriptors to multicodec names.
   *
   * This mapping is used to convert keys in JWK (JSON Web Key) format to multicodec format.
   *
   * @remarks
   * The keys of this object are strings that describe the JOSE key type and usage,
   * such as 'Ed25519:public', 'Ed25519:private', etc. The values are the corresponding multicodec
   * names used to represent these key types.
   *
   * @example
   * ```ts
   * const multicodecName = JWK_TO_MULTICODEC['Ed25519:public'];
   * // Returns 'ed25519-pub', the multicodec name for an Ed25519 public key
   * ```
   */
  private static JWK_TO_MULTICODEC: { [key: string]: string } = {
    'Ed25519:public'    : 'ed25519-pub',
    'Ed25519:private'   : 'ed25519-priv',
    'secp256k1:public'  : 'secp256k1-pub',
    'secp256k1:private' : 'secp256k1-priv',
    'X25519:public'     : 'x25519-pub',
    'X25519:private'    : 'x25519-priv',
  };

  /**
   * Defines the expected byte lengths for public keys associated with different cryptographic
   * algorithms, indexed by their multicodec code values.
   */
  public static MULTICODEC_PUBLIC_KEY_LENGTH: Record<number, number> = {
    // secp256k1-pub - Secp256k1 public key (compressed) - 33 bytes
    0xe7: 33,

    // x25519-pub - Curve25519 public key - 32 bytes
    0xec: 32,

    // ed25519-pub - Ed25519 public key - 32 bytes
    0xed: 32
  };

  /**
   * A mapping from multicodec names to their corresponding JOSE (JSON Object Signing and Encryption)
   * representations. This mapping facilitates the conversion of multicodec key formats to
   * JWK (JSON Web Key) formats.
   *
   * @remarks
   * The keys of this object are multicodec names, such as 'ed25519-pub', 'ed25519-priv', etc.
   * The values are objects representing the corresponding JWK properties for that key type.
   *
   * @example
   * ```ts
   * const joseKey = MULTICODEC_TO_JWK['ed25519-pub'];
   * // Returns a partial JWK for an Ed25519 public key
   * ```
   */
  private static MULTICODEC_TO_JWK: { [key: string]: Jwk } = {
    'ed25519-pub'    : { crv: 'Ed25519',   kty: 'OKP', x: '' },
    'ed25519-priv'   : { crv: 'Ed25519',   kty: 'OKP', x: '',        d: '' },
    'secp256k1-pub'  : { crv: 'secp256k1', kty: 'EC',  x: '', y: ''},
    'secp256k1-priv' : { crv: 'secp256k1', kty: 'EC',  x: '', y: '', d: '' },
    'x25519-pub'     : { crv: 'X25519',    kty: 'OKP', x: '' },
    'x25519-priv'    : { crv: 'X25519',    kty: 'OKP', x: '',        d: '' },
  };

  /**
   * Converts a JWK (JSON Web Key) to a Multicodec code and name.
   *
   * @example
   * ```ts
   * const jwk: Jwk = { crv: 'Ed25519', kty: 'OKP', x: '...' };
   * const { code, name } = await DidKeyUtils.jwkToMulticodec({ jwk });
   * ```
   *
   * @param params - The parameters for the conversion.
   * @param params.jwk - The JSON Web Key to be converted.
   * @returns A promise that resolves to a Multicodec definition.
   */
  public static async jwkToMulticodec({ jwk }: {
    jwk: Jwk
  }): Promise<MulticodecDefinition<MulticodecCode>> {
    const params: string[] = [];

    if (jwk.crv) {
      params.push(jwk.crv);
      if (jwk.d) {
        params.push('private');
      } else {
        params.push('public');
      }
    }

    const lookupKey = params.join(':');
    const name = DidKeyUtils.JWK_TO_MULTICODEC[lookupKey];

    if (name === undefined) {
      throw new Error(`Unsupported JWK to Multicodec conversion: '${lookupKey}'`);
    }

    const code = Multicodec.getCodeFromName({ name });

    return { code, name };
  }

  /**
   * Returns the appropriate public key compressor for the specified cryptographic curve.
   *
   * @param curve - The cryptographic curve to use for the key conversion.
   * @returns A public key compressor for the specified curve.
   */
  public static keyCompressor(
    curve: string
  ): KeyCompressor['compressPublicKey'] {
  // ): ({ publicKeyBytes }: { publicKeyBytes: Uint8Array }) => Promise<Uint8Array> {
    const compressors = {
      'P-256'     : Secp256r1.compressPublicKey,
      'secp256k1' : Secp256k1.compressPublicKey
    } as Record<string, KeyCompressor['compressPublicKey']>;

    const compressor = compressors[curve];

    if (!compressor) throw new DidError(DidErrorCode.InvalidPublicKeyType, `Unsupported curve: ${curve}`);

    return compressor;
  }

  /**
   * Returns the appropriate key converter for the specified cryptographic curve.
   *
   * @param curve - The cryptographic curve to use for the key conversion.
   * @returns An `AsymmetricKeyConverter` for the specified curve.
   */
  public static keyConverter(curve: string): AsymmetricKeyConverter {
    const converters: Record<string, AsymmetricKeyConverter> = {
      'Ed25519'   : Ed25519,
      'P-256'     : Secp256r1,
      'secp256k1' : Secp256k1,
      'X25519'    : X25519
    };

    const converter = converters[curve];

    if (!converter) throw new DidError(DidErrorCode.InvalidPublicKeyType, `Unsupported curve: ${curve}`);

    return converter;
  }

  /**
   * Converts a Multicodec code or name to parial JWK (JSON Web Key).
   *
   * @example
   * ```ts
   * const partialJwk = await DidKeyUtils.multicodecToJwk({ name: 'ed25519-pub' });
   * ```
   *
   * @param params - The parameters for the conversion.
   * @param params.code - Optional Multicodec code to convert.
   * @param params.name - Optional Multicodec name to convert.
   * @returns A promise that resolves to a JOSE format key.
   */
  public static async multicodecToJwk({ code, name }: {
    code?: MulticodecCode,
    name?: string
  }): Promise<Jwk> {
    // Either code or name must be specified, but not both.
    if (!(name ? !code : code)) {
      throw new Error(`Either 'name' or 'code' must be defined, but not both.`);
    }

    // If name is undefined, lookup by code.
    name = (name === undefined ) ? Multicodec.getNameFromCode({ code: code! }) : name;

    const lookupKey = name;
    const jose = DidKeyUtils.MULTICODEC_TO_JWK[lookupKey];

    if (jose === undefined) {
      throw new Error(`Unsupported Multicodec to JWK conversion`);
    }

    return { ...jose };
  }

  /**
   * Converts a public key in JWK (JSON Web Key) format to a multibase identifier.
   *
   * @remarks
   * Note: All secp public keys are converted to compressed point encoding
   *       before the multibase identifier is computed.
   *
   * Per {@link https://github.com/multiformats/multicodec/blob/master/table.csv | Multicodec table}:
   *    Public keys for Elliptic Curve cryptography algorithms (e.g., secp256k1,
   *    secp256k1r1, secp384r1, etc.) are always represented with compressed point
   *    encoding (e.g., secp256k1-pub, p256-pub, p384-pub, etc.).
   *
   * Per {@link https://datatracker.ietf.org/doc/html/rfc8812#name-jose-and-cose-secp256k1-cur | RFC 8812}:
   *    "As a compressed point encoding representation is not defined for JWK
   *    elliptic curve points, the uncompressed point encoding defined there
   *    MUST be used. The x and y values represented MUST both be exactly
   *    256 bits, with any leading zeros preserved."
   *
   * @example
   * ```ts
   * const publicKey = { crv: 'Ed25519', kty: 'OKP', x: '...' };
   * const multibaseId = await DidKeyUtils.publicKeyToMultibaseId({ publicKey });
   * ```
   *
   * @param params - The parameters for the conversion.
   * @param params.publicKey - The public key in JWK format.
   * @returns A promise that resolves to the multibase identifier.
   */
  public static async publicKeyToMultibaseId({ publicKey }: {
    publicKey: Jwk
  }): Promise<string> {
    if (!(publicKey?.crv && publicKey.crv in AlgorithmToKeyTypeMap)) {
      throw new DidError(DidErrorCode.InvalidPublicKeyType, `Public key contains an unsupported key type: ${publicKey?.crv ?? 'undefined'}`);
    }

    // Convert the public key from JWK format to a byte array.
    let publicKeyBytes = await DidKeyUtils.keyConverter(publicKey.crv).publicKeyToBytes({ publicKey });

    // Compress the public key if it is an elliptic curve key.
    if (/^(secp256k1|P-256|P-384|P-521)$/.test(publicKey.crv)) {
      publicKeyBytes = await DidKeyUtils.keyCompressor(publicKey.crv)({ publicKeyBytes });
    }

    // Convert the JSON Web Key (JWK) parameters to a Multicodec name.
    const { name: multicodecName } = await DidKeyUtils.jwkToMulticodec({ jwk: publicKey });

    // Compute the multibase identifier based on the provided key.
    const multibaseId = keyBytesToMultibaseId({
      keyBytes: publicKeyBytes,
      multicodecName
    });

    return multibaseId;
  }
}