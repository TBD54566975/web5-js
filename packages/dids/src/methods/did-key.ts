import type { MulticodecCode, MulticodecDefinition, RequireOnly } from '@web5/common';
import type { AsymmetricKeyConverter, CryptoApi, InferKeyGeneratorAlgorithm, Jwk } from '@web5/crypto';

import { Convert, Multicodec, universalTypeOf } from '@web5/common';
import {
  X25519,
  Ed25519,
  Secp256k1,
  Secp256r1,
  LocalKeyManager,
} from '@web5/crypto';

import type { Did, DidCreateOptions, DidCreateVerificationMethod, DidMetadata, PortableDid } from './did-method.js';
import type { DidDocument, DidResolutionOptions, DidResolutionResult, DidVerificationMethod } from '../types/did-core.js';

import { DidUri } from '../did-uri.js';
import { DidMethod } from './did-method.js';
import { DidError, DidErrorCode } from '../did-error.js';
import { getVerificationMethodTypes } from '../utils.js';
import { EMPTY_DID_RESOLUTION_RESULT } from '../resolver/did-resolver.js';

/**
 * Represents a cryptographic key with associated multicodec metadata.
 *
 * The `KeyWithMulticodec` type encapsulates a cryptographic key along with optional multicodec
 * information. It is primarily used in functions that convert between cryptographic keys and their
 * string representations, ensuring that the key's format and encoding are preserved and understood
 * across different systems and applications.
 */
export type KeyWithMulticodec = {
  /**
   * A `Uint8Array` representing the raw bytes of the cryptographic key. This is the primary data of
   * the type and is essential for cryptographic operations.
   */
  keyBytes: Uint8Array,

  /**
   * An optional number representing the multicodec code. This code uniquely identifies the encoding
   * format or protocol associated with the key. The presence of this code is crucial for decoding
   * the key correctly in different contexts.
   */
  multicodecCode?: number,

  /**
   * An optional string representing the human-readable name of the multicodec. This name provides
   * an easier way to identify the encoding format or protocol of the key, especially when the
   * numerical code is not immediately recognizable.
   */
  multicodecName?: string
};

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
  verificationMethods?: [DidCreateVerificationMethod<TKms>];
}

/**
 * Enumerates the types of keys that can be used in a DID DHT document.
 *
 * The DID DHT method supports various cryptographic key types. These key types are essential for
 * the creation and management of DIDs and their associated cryptographic operations like signing
 * and encryption. The registered key types are published in the DID DHT Registry and each is
 * assigned a unique numerical value for use by client and gateway implementations.
 *
 * The registered key types are published in the {@link https://did-dht.com/registry/index.html#key-type-index | DID DHT Registry}.
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

export const DidKeyVerificationMethodType: Record<string, string> = {
  Ed25519VerificationKey2020 : 'https://w3id.org/security/suites/ed25519-2020/v1',
  JsonWebKey2020             : 'https://w3id.org/security/suites/jws-2020/v1',
  X25519KeyAgreementKey2020  : 'https://w3id.org/security/suites/x25519-2020/v1',
};

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
 * !TODO: Add the rest of the class documentation.
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
 * !TODO: Add examples.
 */
export class DidKey extends DidMethod {

  /**
   * Name of the DID method, as defined in the DID Key specification.
   */
  public static methodName = 'key';

  /**
   * Creates a new DID using the `did:key` method formed from either a newly generated key or an
   * existing key set.
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
   * feature, first specify an `algorithm` of `Ed25519` or provide a `keySet` referencing an
   * `Ed25519` key and then set the `enableEncryptionKeyDerivation` option to `true`.
   *
   * Notes:
   * - If no `options` are given, by default a new Ed25519 key will be generated.
   * - The `algorithm` and `keySet` options are mutually exclusive. If both are given, an
   *   error will be thrown.
   * - If a `keySet` is given, it must contain exactly one key.
   *
   * @param params - The parameters for the create operation.
   * @param params.keyManager - Key Management System (KMS) used to generate keys and sign data.
   * @param params.options - Optional parameters that can be specified when creating a new DID.
   * @returns A Promise resolving to a {@link Did} object representing the new DID.
   * @throws `TypeError` if both `algorithm` and `keySet` options are provided, as they
   *         are mutually exclusive.
   */
  public static async create<TKms extends CryptoApi | undefined = undefined>({
    keyManager = new LocalKeyManager(),
    options = {}
  }: {
    keyManager?: TKms;
    options?: DidKeyCreateOptions<TKms>;
  } = {}): Promise<Did> {
    if (options.algorithm && options.verificationMethods) {
      throw new Error(`The 'algorithm' and 'verificationMethods' options are mutually exclusive`);
    }

    // Default to Ed25519 key generation if an algorithm is not given.
    const algorithm = options.algorithm ?? options.verificationMethods?.[0]?.algorithm ?? 'Ed25519';

    // Generate a new key using the specified `algorithm`.
    const keyUri = await keyManager.generateKey({ algorithm });
    const publicKey = await keyManager.getPublicKey({ keyUri });

    // Create the DID object from the generated key material, including DID document, metadata,
    // signer convenience function, and URI.
    const did = await DidKey.fromPublicKey({ keyManager, publicKey, options });

    return did;
  }

  /**
   * Given the W3C DID Document of a `did:key` DID, return the verification method that will be used
   * for signing messages and credentials. With DID Key, the first verification method in the DID
   * Document is always used.
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
  }): Promise<DidVerificationMethod | undefined> {
    // Verify the DID method is supported.
    const parsedDid = DidUri.parse(didDocument.id);
    if (parsedDid && parsedDid.method !== this.methodName) {
      throw new DidError(DidErrorCode.MethodNotSupported, `Method not supported: ${parsedDid.method}`);
    }

    // Get the ID of the first verification method intended for signing.
    const [ methodId ] = didDocument.authentication ?? [];

    // Get the verification method with the specified ID.
    const verificationMethod = didDocument.verificationMethod?.find(vm => vm.id === methodId);

    return verificationMethod;
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
    const parsedDid = DidUri.parse(didUri);
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
      const typeUrl = DidKeyVerificationMethodType[typeName];
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
    const kemMultibaseValue = DidKeyUtils.keyBytesToMultibaseId({
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
    } = DidKeyUtils.multibaseIdToKeyBytes({ multibaseKeyId: multibaseValue });

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
    } = DidKeyUtils.multibaseIdToKeyBytes({ multibaseKeyId: multibaseValue });

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
   * Creates a new DID using the `did:key` method formed from a public key.
   *
   */
  private static async fromPublicKey({ keyManager, publicKey, options }: {
    keyManager: CryptoApi;
    publicKey: Jwk;
    options: DidKeyCreateOptions<CryptoApi | undefined>;
  }): Promise<Did> {
    // Convert the public key to a byte array and encode to Base64URL format.
    const multibaseId = await DidKeyUtils.publicKeyToMultibaseId({ publicKey });

    // Attach the prefix `did:jwk` to form the complete DID URI.
    const didUri = `did:${DidKey.methodName}:${multibaseId}`;

    // Expand the DID URI string to a DID didDocument.
    const didResolutionResult = await DidKey.resolve(didUri, options);
    const didDocument = didResolutionResult.didDocument as DidDocument;

    // DID Metadata is initially empty for this DID method.
    const metadata: DidMetadata = {};

    // Define a function that returns a signer for the DID.
    const getSigner = async (params?: { keyUri?: string }) => await DidKey.getSigner({
      didDocument,
      keyManager,
      keyUri: params?.keyUri
    });

    return { didDocument, getSigner, keyManager, metadata, uri: didUri };
  }

  private static validateIdentifier(parsedDid: DidUri): boolean {
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
      scheme !== 'did' ||
      method !== 'key' ||
      Number(version) > 0 ||
      universalTypeOf(multibaseValue) !== 'String' ||
      !multibaseValue.startsWith('z')
    );
  }
}

export class DidKeyUtils {

  /**
   * A mapping from JSON Web Key (JWK) property descriptors to multicodec names.
   *
   * This mapping is used to convert keys in JWK (JSON Web Key) format to multicodec format.
   *
   * @example
   * ```ts
   * const multicodecName = JWK_TO_MULTICODEC['Ed25519:public'];
   * // Returns 'ed25519-pub', the multicodec name for an Ed25519 public key
   * ```
   *
   * @remarks
   * The keys of this object are strings that describe the JOSE key type and usage,
   * such as 'Ed25519:public', 'Ed25519:private', etc.
   * The values are the corresponding multicodec names used to represent these key types.
   */
  private static JWK_TO_MULTICODEC: { [key: string]: string } = {
    'Ed25519:public'    : 'ed25519-pub',
    'Ed25519:private'   : 'ed25519-priv',
    'secp256k1:public'  : 'secp256k1-pub',
    'secp256k1:private' : 'secp256k1-priv',
    'X25519:public'     : 'x25519-pub',
    'X25519:private'    : 'x25519-priv',
  };

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
   * @example
   * ```ts
   * const joseKey = MULTICODEC_TO_JWK['ed25519-pub'];
   * // Returns a partial JWK for an Ed25519 public key
   * ```
   *
   * @remarks
   * The keys of this object are multicodec names, such as 'ed25519-pub', 'ed25519-priv', etc.
   * The values are objects representing the corresponding JWK properties for that key type.
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
   * const { code, name } = await Jose.jwkToMulticodec({ jwk });
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
   * Converts a cryptographic key to a multibase identifier.
   *
   * @remarks
   * This method provides a way to represent a cryptographic key as a multibase identifier.
   * It takes a `Uint8Array` representing the key, and either the multicodec code or multicodec name
   * as input. The method first adds the multicodec prefix to the key, then encodes it into Base58
   * format. Finally, it converts the Base58 encoded key into a multibase identifier.
   *
   * @example
   * ```ts
   * const key = new Uint8Array([...]); // Cryptographic key as Uint8Array
   * const multibaseId = keyBytesToMultibaseId({ key, multicodecName: 'ed25519-pub' });
   * ```
   *
   * @param params - The parameters for the conversion.
   * @param params.key - The cryptographic key as a Uint8Array.
   * @param params.multicodecCode - Optional multicodec code to prefix the key with.
   * @param params.multicodecName - Optional multicodec name corresponding to the code.
   * @returns The multibase identifier as a string.
   */
  public static keyBytesToMultibaseId({ keyBytes, multicodecCode, multicodecName }:
    RequireOnly<KeyWithMulticodec, 'keyBytes'>
  ): string {
    const prefixedKey = Multicodec.addPrefix({
      code : multicodecCode,
      data : keyBytes,
      name : multicodecName
    });
    const prefixedKeyB58 = Convert.uint8Array(prefixedKey).toBase58Btc();
    const multibaseKeyId = Convert.base58Btc(prefixedKeyB58).toMultibase();

    return multibaseKeyId;
  }

  /**
   * Returns the appropriate public key compressor for the specified cryptographic curve.
   *
   * @param curve - The cryptographic curve to use for the key conversion.
   * @returns A public key compressor for the specified curve.
   */
  public static keyCompressor(
    curve: string
  ): ({ publicKeyBytes }: { publicKeyBytes: Uint8Array }) => Promise<Uint8Array> {
    const compressors = {
      'P-256'     : Secp256r1.compressPublicKey,
      'secp256k1' : Secp256k1.compressPublicKey
    } as Record<string, ({ publicKeyBytes }: { publicKeyBytes: Uint8Array }) => Promise<Uint8Array>>;

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
   * Converts a multibase identifier to a cryptographic key.
   *
   * @remarks
   * This function decodes a multibase identifier back into a cryptographic key. It first decodes the
   * identifier from multibase format into Base58 format, and then converts it into a `Uint8Array`.
   * Afterward, it removes the multicodec prefix, extracting the raw key data along with the
   * multicodec code and name.
   *
   * @example
   * ```ts
   * const multibaseKeyId = '...'; // Multibase identifier of the key
   * const { key, multicodecCode, multicodecName } = multibaseIdToKey({ multibaseKeyId });
   * ```
   *
   * @param params - The parameters for the conversion.
   * @param params.multibaseKeyId - The multibase identifier string of the key.
   * @returns An object containing the key as a `Uint8Array` and its multicodec code and name.
   */
  public static multibaseIdToKeyBytes({ multibaseKeyId }: {
    multibaseKeyId: string
  }): Required<KeyWithMulticodec> {
    const prefixedKeyB58 = Convert.multibase(multibaseKeyId).toBase58Btc();
    const prefixedKey = Convert.base58Btc(prefixedKeyB58).toUint8Array();
    const { code, data, name } = Multicodec.removePrefix({ prefixedData: prefixedKey });

    return { keyBytes: data, multicodecCode: code, multicodecName: name };
  }

  /**
   * Converts a Multicodec code or name to parial JWK (JSON Web Key).
   *
   * @example
   * ```ts
   * const partialJwk = await Jose.multicodecToJwk({ name: 'ed25519-pub' });
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
   * const multibaseId = await Jose.publicKeyToMultibaseId({ publicKey });
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
    const multibaseId = DidKeyUtils.keyBytesToMultibaseId({
      keyBytes: publicKeyBytes,
      multicodecName
    });

    return multibaseId;
  }
}