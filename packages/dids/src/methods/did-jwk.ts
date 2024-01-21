import type { CryptoApi, EnclosedSignParams, EnclosedVerifyParams, Jwk, Signer, InferKeyGeneratorAlgorithm, KeyImporterExporter, KmsImportKeyParams, KeyIdentifier, KmsExportKeyParams } from '@web5/crypto';

import { Convert } from '@web5/common';
import { LocalKmsCrypto } from '@web5/crypto';

import type { Did, DidCreateOptions, DidCreateVerificationMethod, DidKeySet, DidMetadata } from './did-method.js';
import { DidVerificationRelationship, type DidDocument, type DidResolutionOptions, type DidResolutionResult, type DidVerificationMethod } from '../types/did-core.js';

import { DidUri } from '../did-uri.js';
import { DidMethod } from './did-method.js';
import { getVerificationMethodByKey } from '../utils.js';
import { EMPTY_DID_RESOLUTION_RESULT } from '../did-resolver.js';

/**
 * Defines the set of options available when creating a new Decentralized Identifier (DID) with the
 * 'did:jwk' method.
 *
 * Either the `algorithm` or `verificationMethods` option can be specified, but not both.
 * - A new key will be generated using the algorithm identifier specified in either the `algorithm`
 *   property or the `verificationMethods` object's `algorithm` property.
 * - If `verificationMethods` is given, it must contain exactly one entry since DID JWK only
 *   supports a single verification method.
 * - If neither is given, the default is to generate a new Ed25519 key.
 *
 * @example
 * ```ts
  * // By default, when no options are given, a new Ed25519 key will be generated.
 * const did = await DidJwk.create();
 *
 * // The algorithm to use for key generation can be specified as a top-level option.
 * const did = await DidJwk.create({
 *   options: { algorithm = 'ES256K' }
 * });
 *
 * // Or, alternatively as a property of the verification method.
 * const did = await DidJwk.create({
 *   options: {
 *     verificationMethods: [{ algorithm = 'ES256K' }]
 *   }
 * });
 * ```
 */
export interface DidJwkCreateOptions<TKms> extends DidCreateOptions<TKms> {
  /**
   * Optionally specify the algorithm to be used for key generation.
   */
  algorithm?: TKms extends CryptoApi
    ? InferKeyGeneratorAlgorithm<TKms>
    : InferKeyGeneratorAlgorithm<LocalKmsCrypto>;

  /**
   * Alternatively, specify the algorithm to be used for key generation of the single verification
   * method in the DID Document.
   */
  verificationMethods?: [DidCreateVerificationMethod<TKms>];
}

/**
 * The `DidJwk` class provides an implementation of the `did:jwk` DID method.
 *
 * Features:
 * - DID Creation: Create new `did:jwk` DIDs.
 * - DID Key Management: Instantiate a DID object from an existing verification method key set or
 *                       or a key in a Key Management System (KMS). If supported by the KMS, a DID's
 *                       key can be exported to a key set.
 * - DID Resolution: Resolve a `did:jwk` to its corresponding DID Document.
 * - Signature Operations: Sign and verify messages using keys associated with a DID.
 *
 * @remarks
 * The `did:jwk` DID method uses a single JSON Web Key (JWK) to generate a DID and does not rely
 * on any external system such as a blockchain or centralized database. This characteristic makes
 * it suitable for use cases where a assertions about a DID Subject can be self-verifiable by
 * third parties.
 *
 * The DID URI is formed by Base64URL-encoding the JWK and prefixing with `did:jwk:`. The DID
 * Document of a `did:jwk` DID contains a single verification method, which is the JWK used
 * to generate the DID. The verification method is identified by the key ID `#0`.
 *
 * @see {@link https://github.com/quartzjer/did-jwk/blob/main/spec.md | DID JWK Specification}
 *
 * @example
 * ```ts
 * // DID Creation
 * const did = await DidJwk.create();
 *
 * // DID Creation with a KMS
 * const keyManager = new LocalKmsCrypto();
 * const did = await DidJwk.create({ keyManager });
 *
 * // DID Resolution
 * const resolutionResult = await DidJwk.resolve({ did: did.uri });
 *
 * // Signature Operations
 * const signer = await did.getSigner();
 * const signature = await signer.sign({ data: new TextEncoder().encode('Message') });
 * const isValid = await signer.verify({ data: new TextEncoder().encode('Message'), signature });
 *
 * // Key Management
*
 * // Instantiate a DID object from an existing key in a KMS
 * const did = await DidJwk.fromKeyManager({
 *  didUri: 'did:jwk:eyJrIjoiT0tQIiwidCI6IkV1c2UyNTYifQ',
 *  keyManager
 * });
 *
 * // Instantiate a DID object from an existing verification method key
 * const did = await DidJwk.fromKeys({
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
 * // Export a DID's key to a key set
 * const keySet = await DidJwk.toKeys({ did});
 * ```
 */
export class DidJwk extends DidMethod {

  /**
   * Name of the DID method, as defined in the DID JWK specification.
   */
  public static methodName = 'jwk';

  /**
   * Creates a new DID using the `did:jwk` method formed from a newly generated key.
   *
   * @remarks
   * The DID URI is formed by Base64URL-encoding the JWK and prefixing with `did:jwk:`.
   *
   * Notes:
   * - If no `options` are given, by default a new Ed25519 key will be generated.
   * - The `algorithm` and `verificationMethods` options are mutually exclusive. If both are given,
   *   an error will be thrown.
   *
   * @param params - The parameters for the create operation.
   * @param params.keyManager - Optionally specify a Key Management System (KMS) used to generate
   *                            keys and sign data.
   * @param params.options - Optional parameters that can be specified when creating a new DID.
   * @returns A Promise resolving to a {@link Did} object representing the new DID.
   */
  public static async create<TKms extends CryptoApi | undefined = undefined>({
    keyManager = new LocalKmsCrypto(),
    options = {}
  }: {
    keyManager?: TKms;
    options?: DidJwkCreateOptions<TKms>;
  } = {}): Promise<Did> {
    if (options.algorithm && options.verificationMethods) {
      throw new Error(`DidJwk: The 'algorithm' and 'verificationMethods' options are mutually exclusive`);
    }

    // Default to Ed25519 key generation if an algorithm is not given.
    const algorithm = options.algorithm ?? options.verificationMethods?.[0]?.algorithm ?? 'Ed25519';

    // Generate a new key using the specified `algorithm`.
    const keyUri = await keyManager.generateKey({ algorithm });
    const publicKey = await keyManager.getPublicKey({ keyUri });

    // Serialize the public key JWK to a UTF-8 string and encode to Base64URL format.
    const base64UrlEncoded = Convert.object(publicKey).toBase64Url();

    // Attach the prefix `did:jwk` to form the complete DID URI.
    const didUri = `did:${DidJwk.methodName}:${base64UrlEncoded}`;

    // Expand the DID URI string to a DID didDocument.
    const didResolutionResult = await DidJwk.resolve(didUri);
    const didDocument = didResolutionResult.didDocument as DidDocument;

    // DID Metadata is initially empty for this DID method.
    const metadata: DidMetadata = {};

    // Define a function that returns a signer for the DID.
    const getSigner = async (params?: { keyUri?: string }) => await DidJwk.getSigner({
      didDocument,
      keyManager,
      keyUri: params?.keyUri
    });

    return { didDocument, getSigner, keyManager, metadata, uri: didUri };
  }

  /**
   * Instantiates a `Did` object for the `did:jwk` method from a given key set.
   *
   * This method allows for the creation of a `Did` object using pre-existing key material,
   * encapsulated within the `verificationMethods` array of the `DidKeySet`. This is particularly
   * useful when the key material is already available and you want to construct a `Did` object
   * based on these keys, instead of generating new keys.
   *
   * @remarks
   * The `verificationMethods` array must contain exactly one key since the `did:jwk` method only
   * supports a single verification method.
   *
   * The key material (both public and private keys) should be provided in JWK format. The method
   * handles the inclusion of these keys in the DID Document and sets up the necessary verification
   * relationships.
   *
   * @param params - The parameters for the `fromKeys` operation.
   * @param params.keyManager - Optionally specify an external Key Management System (KMS) used to
   *                            generate keys and sign data. If not given, a new
   *                            {@link LocalKmsCrypto} instance will be created and used.
   * @param params.verificationMethods - An array containing the key material in JWK format.
   * @returns A Promise resolving to a `Did` object representing the DID formed from the provided keys.
   * @throws An error if the `verificationMethods` array does not contain exactly one entry.
   *
   * @example
   * ```ts
   * // Example with an existing key in JWK format.
   * const verificationMethods = [{
   *   publicKeyJwk: { // public key in JWK format },
   *   privateKeyJwk: { // private key in JWK format }
   * }];
   * const did = await DidJwk.fromKeys({ verificationMethods });
   * ```
   */
  public static async fromKeys({
    keyManager = new LocalKmsCrypto(),
    verificationMethods
  }: {
    keyManager?: CryptoApi & KeyImporterExporter<KmsImportKeyParams, KeyIdentifier, KmsExportKeyParams>;
  } & DidKeySet): Promise<Did> {
    if (!verificationMethods || verificationMethods.length !== 1) {
      throw new Error(`DidJwk: Only one verification method can be specified but ${verificationMethods?.length ?? 0} were given`);
    }

    if (!(verificationMethods[0].privateKeyJwk && verificationMethods[0].publicKeyJwk)) {
      throw new Error(`DidJwk: Verification method does not contain a public and private key in JWK format`);
    }

    // Store the private key in the key manager.
    await keyManager.importKey({ key: verificationMethods[0].privateKeyJwk });

    // Serialize the public key JWK to a UTF-8 string and encode to Base64URL format.
    const base64UrlEncoded = Convert.object(verificationMethods[0].publicKeyJwk).toBase64Url();

    // Attach the prefix `did:jwk` to form the complete DID URI.
    const didUri = `did:${DidJwk.methodName}:${base64UrlEncoded}`;

    // Expand the DID URI string to a DID didDocument.
    const didResolutionResult = await DidJwk.resolve(didUri);
    const didDocument = didResolutionResult.didDocument as DidDocument;

    // DID Metadata is initially empty for this DID method.
    const metadata: DidMetadata = {};

    // Define a function that returns a signer for the DID.
    const getSigner = async (params?: { keyUri?: string }) => await DidJwk.getSigner({
      didDocument,
      keyManager,
      keyUri: params?.keyUri
    });

    return { didDocument, getSigner, keyManager, metadata, uri: didUri };
  }

  /**
   * Instantiates a `Did` object from an existing DID using keys in an external Key Management
   * System (KMS).
   *
   * This method returns a `Did` object by resolving an existing `did:jwk` DID URI and verifying
   * that all associated keys are present in the provided key manager.
   *
   * @remarks
   * The method verifies the presence of key material for every verification method in the DID
   * document within the given KMS. If any key is missing, an error is thrown.
   *
   * This approach ensures that the resulting `Did` object is fully operational with the provided
   * key manager and that all cryptographic operations related to the DID can be performed.
   *
   * @param params - The parameters for the `fromKeyManager` operation.
   * @param params.didUri - The URI of the DID to be instantiated.
   * @param params.keyManager - The Key Management System to be used for key management operations.
   * @returns A Promise resolving to the instantiated `Did` object.
   * @throws An error if any key in the DID document is not present in the provided KMS.
   *
   * @example
   * ```ts
   * // Assuming keyManager is an instance of a KMS implementation
   * const didUri = 'did:jwk:example';
   * const did = await DidJwk.fromKeyManager({ didUri, keyManager });
   * // The 'did' is now an instance of Did, linked with the provided keyManager.
   * ```
   */
  public static async fromKeyManager({ didUri, keyManager }: {
    didUri: string;
    keyManager: CryptoApi;
  }): Promise<Did> {
    // Resolve the DID URI to a DID Document.
    const { didDocument } = await DidJwk.resolve(didUri);

    // Verify the DID Resolution Result includes a DID document containing verification methods.
    if (!(didDocument && Array.isArray(didDocument.verificationMethod) && didDocument.verificationMethod.length > 0)) {
      throw new Error(`DidJwk: DID document for '${didUri}' is missing verification methods`);
    }

    // Validate that the key material for every verification method in the DID document is present
    // in the provided key manager.
    for (let vm of didDocument.verificationMethod) {
      if (!vm.publicKeyJwk) {
        throw new Error(`DidJwk: Verification method '${vm.id}' does not contain a public key in JWK format`);
      }

      // Compute the key URI of the verification method's public key.
      const keyUri = await keyManager.getKeyUri({ key: vm.publicKeyJwk });

      // Verify that the key is present in the key manager. If not, an error is thrown.
      await keyManager.getPublicKey({ keyUri });
    }

    // DID Metadata is initially empty for this DID method.
    const metadata: DidMetadata = {};

    // Define a function that returns a signer for the DID.
    const getSigner = async (params?: { keyUri?: string }) => await DidJwk.getSigner({
      didDocument,
      keyManager,
      keyUri: params?.keyUri
    });

    return { didDocument, getSigner, keyManager, metadata, uri: didUri };
  }

  /**
   * Given the W3C DID Document of a `did:jwk` DID, return the verification method that will be used
   * for signing messages and credentials. If given, the `methodId` parameter is used to select the
   * verification method. If not given, the first verification method in the DID Document is used.
   *
   * Note that for DID JWK, only one verification method can exist so specifying `methodId` could be
   * considered redundant or unnecessary. The option is provided for consistency with other DID
   * method implementations.
   *
   * @param params - The parameters for the `getSigningMethod` operation.
   * @param params.didDocument - DID Document to get the verification method from.
   * @param params.methodId - ID of the verification method to use for signing.
   * @returns Verification method to use for signing.
   */
  public static async getSigningMethod({ didDocument, methodId = '#0' }: {
    didDocument: DidDocument;
    methodId?: string;
  }): Promise<DidVerificationMethod | undefined> {
    // Verify the DID method is supported.
    const parsedDid = DidUri.parse(didDocument.id);
    if (parsedDid && parsedDid.method !== this.methodName) {
      throw new Error(`DidJwk: Method not supported: ${parsedDid.method}`);
    }

    // Attempt to find the verification method in the DID Document.
    const verificationMethod = didDocument.verificationMethod?.find(vm => vm.id.endsWith(methodId));

    return verificationMethod;
  }

  /**
   * Resolves a `did:jwk` identifier to a DID Document.
   *
   * @param didUri - The DID to be resolved.
   * @param _options - Optional parameters for resolving the DID. Unused by this DID method.
   * @returns A Promise resolving to a {@link DidResolutionResult} object representing the result of the resolution.
   */
  public static async resolve(didUri: string, _options?: DidResolutionOptions): Promise<DidResolutionResult> {
    // Attempt to parse the DID URI.
    const parsedDid = DidUri.parse(didUri);

    // Attempt to decode the Base64URL-encoded JWK.
    let publicKeyJwk: Jwk | undefined;
    try {
      publicKeyJwk = Convert.base64Url(parsedDid!.id).toObject() as Jwk;
    } catch { /* Consume the error so that a DID resolution error can be returned later. */ }

    // If parsing or decoding failed, the DID is invalid.
    if (!parsedDid || !publicKeyJwk) {
      return {
        ...EMPTY_DID_RESOLUTION_RESULT,
        didResolutionMetadata: { error: 'invalidDid' }
      };
    }

    // If the DID method is not "jwk", return an error.
    if (parsedDid.method !== DidJwk.methodName) {
      return {
        ...EMPTY_DID_RESOLUTION_RESULT,
        didResolutionMetadata: { error: 'methodNotSupported' }
      };
    }

    const didDocument: DidDocument = {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/jws-2020/v1'
      ],
      id: parsedDid.uri
    };

    const keyUri = `${didDocument.id}#0`;

    // Set the Verification Method property.
    didDocument.verificationMethod = [{
      id           : keyUri,
      type         : 'JsonWebKey2020',
      controller   : didDocument.id,
      publicKeyJwk : publicKeyJwk
    }];

    // Set the Verification Relationship properties.
    didDocument.authentication = [keyUri];
    didDocument.assertionMethod = [keyUri];
    didDocument.capabilityInvocation = [keyUri];
    didDocument.capabilityDelegation = [keyUri];
    didDocument.keyAgreement = [keyUri];

    // If the JWK contains a `use` property with the value "sig" then the `keyAgreement` property
    // is not included in the DID Document. If the `use` value is "enc" then only the `keyAgreement`
    // property is included in the DID Document.
    switch (publicKeyJwk.use) {
      case 'sig': {
        delete didDocument.keyAgreement;
        break;
      }

      case 'enc': {
        delete didDocument.authentication;
        delete didDocument.assertionMethod;
        delete didDocument.capabilityInvocation;
        delete didDocument.capabilityDelegation;
        break;
      }
    }

    return {
      ...EMPTY_DID_RESOLUTION_RESULT,
      didDocument,
    };
  }
}