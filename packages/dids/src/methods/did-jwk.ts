import type{ AlgorithmIdentifier, CryptoApi, EnclosedSignParams, EnclosedVerifyParams, Jwk, Signer } from '@web5/crypto';

import { Convert } from '@web5/common';

import type{ Did, DidCreateOptions, DidKeySet, DidMetadata } from './did-method.js';
import type { DidDocument, DidResolutionOptions, DidResolutionResult, DidVerificationMethod } from '../types/did-core.js';

import { DidUri } from '../did-uri.js';
import { DidMethod } from './did-method.js';
import { getVerificationMethodByKey } from '../utils.js';
import { EMPTY_DID_RESOLUTION_RESULT } from '../did-resolver.js';

/**
 * Defines the set of options available when creating a new Decentralized Identifier (DID) with the
 * 'did:jwk' method.
 *
 * Either the `algorithm` or `keySet` option must be specified. If both are specified, the `keySet`
 * option takes precedence.
 *
 * If given, the `algorithm` must be a valid algorithm identifier supported by the `keyManager`
 * provided.
 *
 * @example
 * ```ts
 * const keyManager = new LocalKmsCrypto();
 * const did = await DidJwk.create({
 *   keyManager,
 *   options: { algorithm = 'Ed25519' }
 * });
 * ```
 */
export interface DidJwkCreateOptions extends DidCreateOptions {
  /**
   * Optionally specify the algorithm to be used for key creation.
   */
  algorithm?: AlgorithmIdentifier;

  /**
   * Optionally specify the key set to be used for DID creation.
   */
  keySet?: DidKeySet;
}

/**
 * The `DidJwk` class provides an implementation of the `did:jwk` DID method.
*
* Features:
* - DID Generation: Create new `did:jwk` DIDs.
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
 * // DID Generation
 * const did = await DidJwk.create({ keyManager });
 *
 * // DID Resolution
 * const resolutionResult = await DidJwk.resolve({ did: did.uri });
 *
 * // Signature Operations
 * const signer = await did.getSigner();
 * const signature = await signer.sign({ data: new TextEncoder().encode('Message') });
 * const isValid = await signer.verify({ data: new TextEncoder().encode('Message'), signature });
 * ```
 */
export class DidJwk extends DidMethod {

  /**
   * Name of the DID method, as defined in the DID JWK specification.
   */
  public static methodName = 'jwk';

  /**
   * Creates a new DID using the `did:jwk` method.
   *
   * @param params - The parameters for the create operation.
   * @param params.keyManager - Key Management System (KMS) used to generate keys and sign data.
   * @param params.options - Options that can be specified when creating a new DID.
   * @returns A Promise resolving to a {@link Did} object representing the new DID.
   */
  public static async create({ keyManager, options = {} }: {
    keyManager: CryptoApi;
    options: DidJwkCreateOptions;
  }): Promise<Did> {
    // Default to using ES256K for key generation if an algorithm is not given.
    let { algorithm = 'ES256K', keySet } = options;

    // The public key used to create the DID.
    let publicKey: Jwk;

    // If a key set is not given, generate a new key using the specified `algorithm`.
    if (!keySet) {
      const keyUri = await keyManager.generateKey({ algorithm });
      publicKey = await keyManager.getPublicKey({ keyUri });
      // Include the generated key in the key set that is returned in DID metadata.
      keySet = {
        keys: [{
          keyUri,
          // Since a custom key set was not given, the key is assumed to used for all purposes.
          purposes: ['assertionMethod', 'authentication', 'capabilityDelegation', 'capabilityInvocation', 'keyAgreement']
        }]
      };

    } else {
      // If a key set is given, it must contain exactly one key.
      if (!keySet.keys || keySet.keys.length !== 1) {
        throw new Error(`DidJwk: This DID method requires a key set with exactly one key`);
      }

      // Retrieve the public key specified in the key set.
      const publicKeyUri = keySet.keys[0].keyUri;
      publicKey = await keyManager.getPublicKey({ keyUri: publicKeyUri });
    }

    // Serialize the public key JWK to a UTF-8 string and encode to Base64URL format.
    const base64UrlEncoded = Convert.object(publicKey).toBase64Url();

    // Attach the prefix `did:jwk` to form the complete DID URI.
    const didUri = `did:${DidJwk.methodName}:${base64UrlEncoded}`;

    // Expand the DID URI string to a DID didDocument.
    const didResolutionResult = await DidJwk.resolve(didUri);
    const didDocument = didResolutionResult.didDocument as DidDocument;

    // DID Metadata contains only the key set for this DID method.
    const metadata: DidMetadata = { keySet };

    // Define a function that returns a signer for the DID.
    const getSigner = async (params?: { keyUri?: string }) => await DidJwk.getSigner({
      didDocument,
      keyManager,
      keyUri: params?.keyUri
    });

    return { didDocument, getSigner, keyManager, metadata, uri: didUri };
  }

  /**
   * Given the W3C DID Document of a `did:jwk` DID, return a {@link Signer} that can be used to
   * sign messages, credentials, or arbitrary data.
   *
   * If given, the `keyUri` parameter is used to select a key from the verification methods present
   * in the DID Document. For DID JWK, only one verification method can exist so the specified
   * `keyUri` must refer to the same key.
   *
   * If `keyUri` is not given, the first (and only) verification method in the DID Document is used.
   *
   * @param params - The parameters for the `getSigner` operation.
   * @param params.didDocument - DID Document of the DID whose keys will be used to construct the {@link Signer}.
   * @param params.keyManager - Crypto API used to sign and verify data.
   * @param params.keyUri - Key URI of the key that will be used for sign and verify operations. Optional.
   * @returns An instantiated {@link Signer} that can be used to sign and verify data.
   */
  public static async getSigner({ didDocument, keyManager, keyUri }: {
    didDocument: DidDocument;
    keyManager: CryptoApi;
    keyUri?: string;
  }): Promise<Signer> {
    let publicKey: Jwk | undefined;

    // If a key URI is given, get the public key, which is needed for verify operations.
    if (keyUri) {
      // Get the public key from the key store, which also verifies that the key is present.
      publicKey = await keyManager.getPublicKey({ keyUri });
      // Verify the public key exists in the DID Document.
      if (!(await getVerificationMethodByKey({ didDocument, publicKeyJwk: publicKey }))) {
        throw new Error(`DidJwk: Key referenced by '${keyUri}' is not present in the provided DID Document for '${didDocument.id}'`);
      }

    } else {
      // If a key URI is not given, assume the signing key is the DID's only verification method.
      ({ publicKeyJwk: publicKey } = await DidJwk.getSigningMethod({ didDocument }) ?? {});
      if (publicKey === undefined) {
        throw new Error(`DidJwk: No verification methods found in the provided DID Document for '${didDocument.id}'`);
      }
      // Compute the expected key URI of the signing key.
      keyUri = await keyManager.getKeyUri({ key: publicKey });
    }

    // Both the `keyUri` and `publicKey` must be known before returning a signer.
    if (!(keyUri && publicKey)) {
      throw new Error(`DidJwk: Failed to determine the keys needed to create a signer`);
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
   * Given the W3C DID Document of a `did:jwk` DID, return the verification method that will be used
   * for signing messages and credentials. If given, the `methodId` parameter is used to select the
   * verification method. If not given, the first verification method in the DID Document is used.
   *
   * Note that for DID JWK, only one verification method can exist so specifying `methodId` could be
   * considered redundant or unnecessar. The option is provided for consistency with other DID
   * method implementations.
   *
   * @param params - The parameters for the `getSigningMethod` operation.
   * @param params.didDocument - DID Document to get the verification method from.
   * @param params.methodId - ID of the verification method to use for signing.
   * @returns Verification method to use for signing.
   */
  public static async getSigningMethod({ didDocument, methodId = '#0' }: {
      didDocument: DidDocument,
      methodId?: string
    }): Promise<DidVerificationMethod | undefined> {

    const [, method] = didDocument.id.split(':');
    if (method !== 'jwk') {
      throw new Error(`DidJwk: Method not supported: ${method}`);
    }

    let didResource: DidVerificationMethod | undefined;
    for (let vm of didDocument.verificationMethod ?? []) {
      if (vm.id.includes(methodId)) {
        didResource = vm;
        break;
      }
    }

    return didResource;
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