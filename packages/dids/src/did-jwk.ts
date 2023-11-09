import type { JwkUse, PrivateKeyJwk,PublicKeyJwk, Web5Crypto } from '@web5/crypto';

import { Convert } from '@web5/common';
import { EcdhAlgorithm, EcdsaAlgorithm, EdDsaAlgorithm, Jose } from '@web5/crypto';

import type {
  DidMethod,
  DidDocument,
  PortableDid,
  DidResolutionResult,
  DidResolutionOptions,
  VerificationRelationship,
  DidKeySetVerificationMethodKey,
} from './types.js';

import { parseDid } from './utils.js';

const SupportedCryptoAlgorithms = [
  'Ed25519',
  'secp256k1',
  'X25519'
] as const;

export type DidJwkCreateOptions = {
  keyAlgorithm?: typeof SupportedCryptoAlgorithms[number];
  keySet?: DidJwkKeySet;
}

export type DidJwkCreateDocumentOptions = {
  publicKeyJwk: PublicKeyJwk;
}

export type DidJwkKeySet = {
  verificationMethodKeys?: DidKeySetVerificationMethodKey[];
}

/**
 * The `DidJwkMethod` class provides an implementation of a Decentralized Identifier (DID) method
 * based on JSON Web Keys (JWK) that deterministically transforms a JWK into a DID Document. This
 * class supports the generation, encoding, decoding, and resolution of DIDs and DID Documents
 * using the `did:jwk` method.
 *
 * See the {@link https://github.com/quartzjer/did-jwk/blob/main/spec.md | did:jwk} spec for more
 * information.
 *
 * Example usage:
 *
 * ```ts
 * const portableDid = await DidJwkMethod.create({ keyAlgorithm: 'Ed25519' });
 * const didDocument = await DidJwkMethod.createDocument({ publicKeyJwk: portableDid.keySet.verificationMethodKeys[0].publicKeyJwk });
 * const resolvedDid = await DidJwkMethod.resolve({ didUrl: portableDid.did });
 * ```
 */
export class DidJwkMethod implements DidMethod {

  /**
   * Name of the DID method
  */
  public static methodName = 'jwk';

  /**
   * Creates a new DID using the `did:jwk` method.
   *
   * @param options - Optional parameters for creating the DID.
   * @returns A Promise resolving to a `PortableDid` object representing the new DID.
   */
  public static async create(options?: DidJwkCreateOptions): Promise<PortableDid> {
    let { keyAlgorithm, keySet } = options ?? {};

    // Begin constructing a PortableDid.
    const portableDid: Partial<PortableDid> = {};

    // If keySet not given, generate a default key set.
    portableDid.keySet = keySet ?? await DidJwkMethod.generateKeySet({ keyAlgorithm });

    // Verify that the key set contains one public key.
    const publicKeyJwk = portableDid.keySet.verificationMethodKeys?.[0]?.publicKeyJwk;
    if (!publicKeyJwk) {
      throw new Error('DidJwkMethod: Failed to create DID with given input.');
    }

    // Encode the public key JWK to a DID string.
    portableDid.did = await DidJwkMethod.encodeJwk({ publicKeyJwk });

    // Expand the DID string to a DID document.
    portableDid.document = await DidJwkMethod.createDocument({ publicKeyJwk });

    return portableDid as PortableDid;
  }

  /**
   * Expands a did:jwk identifier to a DID Document.
   *
   * @param options
   * @returns - A DID document.
   */
  public static async createDocument(options: DidJwkCreateDocumentOptions): Promise<DidDocument> {
    const { publicKeyJwk } = options;

    // Initialize document to an empty object.
    const document: Partial<DidDocument> = {};

    // Set the @context property.
    document['@context'] = [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/jws-2020/v1'
    ];

    // Encode the public key JWK to a DID string and set as the document identifier.
    document.id = await DidJwkMethod.encodeJwk({ publicKeyJwk });

    const keyId = `${document.id}#0`;

    // Set the verificationMethod property.
    document.verificationMethod = [{
      id           : keyId,
      type         : 'JsonWebKey2020',
      controller   : document.id,
      publicKeyJwk : publicKeyJwk
    }];

    document.authentication = [keyId];
    document.assertionMethod = [keyId];
    document.capabilityInvocation = [keyId];
    document.capabilityDelegation = [keyId];
    document.keyAgreement = [keyId];

    /** If the JWK contains a `use` property with the value "sig" then the `keyAgreement` property
     * is not included in the DID Document. If the `use` value is "enc" then only the `keyAgreement`
     * property is included in the DID Document. */
    switch (publicKeyJwk.use) {
      case 'sig': {
        delete document.keyAgreement;
        break;
      }

      case 'enc': {
        delete document.authentication;
        delete document.assertionMethod;
        delete document.capabilityInvocation;
        delete document.capabilityDelegation;
        break;
      }
    }

    return document as DidDocument;
  }

  /**
   * Decodes a `did:jwk` identifier to a public key in JWK format.
   *
   * @param options - The options for the operation.
   * @returns A Promise resolving to a `PublicKeyJwk` object representing the public key.
   */
  public static async decodeJwk(options: {
    didUrl: string
  }): Promise<PublicKeyJwk> {
    const { didUrl } = options;

    let publicKeyJwk: PublicKeyJwk;

    try {
      const parsedDid = parseDid({ didUrl });
      if (parsedDid?.method !== 'jwk') throw new Error('Failed to parse DID.');

      publicKeyJwk = Convert.base64Url(parsedDid.id).toObject() as PublicKeyJwk;

    } catch (error: any) {
      throw new Error(`DidJwkMethod: Unable to decode DID: ${didUrl}.`);
    }

    return publicKeyJwk;
  }

  /**
   * Encodes a public key in JWK format to a `did:jwk` identifier.
   *
   * @param options - The options for the operation.
   * @returns A Promise resolving to a string representing the `did:jwk` identifier.
   */
  public static async encodeJwk(options: {
    publicKeyJwk: PublicKeyJwk
  }): Promise<string> {
    const { publicKeyJwk } = options;

    let did: string;

    try {
    // Serialize the public key JWK to a UTF-8 string.
      const publicKeyJwkString = Jose.canonicalize(publicKeyJwk);

      // Encode to Base64Url format.
      const publicKeyJwkBase64Url = Convert.string(publicKeyJwkString).toBase64Url();

      // Attach the prefix `did:jwk`.
      did = `did:jwk:${publicKeyJwkBase64Url}`;

    } catch (error: any) {
      throw new Error(`DidJwkMethod: Unable to encode JWK.`);
    }

    return did;
  }

  /**
   * Generates a key set for use with the `did:jwk` method.
   *
   * @param options - Optional parameters for generating the key set.
   * @returns A Promise resolving to a `DidJwkKeySet` object representing the key set.
   */
  public static async generateKeySet(options?: {
    keyAlgorithm?: typeof SupportedCryptoAlgorithms[number]
  }): Promise<DidJwkKeySet> {
    // Generate Ed25519 keys, by default.
    const { keyAlgorithm = 'Ed25519' } = options ?? {};

    let keyUse: JwkUse;
    let keyPair: Web5Crypto.CryptoKeyPair;
    let verificationRelationships: VerificationRelationship[];

    switch (keyAlgorithm) {
      case 'Ed25519': {
        keyPair = await new EdDsaAlgorithm().generateKey({
          algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
          extractable : true,
          keyUsages   : ['sign', 'verify']
        });
        keyUse = 'sig';
        verificationRelationships = ['authentication', 'assertionMethod', 'capabilityInvocation', 'capabilityDelegation'];
        break;
      }

      case 'secp256k1': {
        keyPair = await new EcdsaAlgorithm().generateKey({
          algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
          extractable : true,
          keyUsages   : ['sign', 'verify']
        });
        keyUse = 'sig';
        verificationRelationships = ['authentication', 'assertionMethod', 'capabilityInvocation', 'capabilityDelegation'];
        break;
      }

      case 'X25519': {
        keyPair = await new EcdhAlgorithm().generateKey({
          algorithm   : { name: 'ECDH', namedCurve: 'X25519' },
          extractable : true,
          keyUsages   : ['deriveBits', 'deriveKey']
        });
        keyUse = 'enc';
        verificationRelationships = ['keyAgreement'];
        break;
      }

      default: {
        throw new Error(`Unsupported crypto algorithm: '${keyAlgorithm}'`);
      }
    }

    // Convert the key pair to JWK format.
    const publicKeyJwk = await Jose.cryptoKeyToJwk({ key: keyPair.publicKey }) as PublicKeyJwk;
    const privateKeyJwk = await Jose.cryptoKeyToJwk({ key: keyPair.privateKey }) as PrivateKeyJwk;

    // Add the `use` property to each JWK.
    publicKeyJwk.use = keyUse;
    privateKeyJwk.use = keyUse;

    // Create the key set.
    const keySet: DidJwkKeySet = {
      verificationMethodKeys: [{
        publicKeyJwk,
        privateKeyJwk,
        relationships: verificationRelationships
      }]
    };

    return keySet;
  }

  /**
   * Given the W3C DID Document of a `did:jwk` DID, return the identifier of
   * the verification method key that will be used for signing messages and
   * credentials, by default.
   *
   * @param document = DID Document to get the default signing key from.
   * @returns Verification method identifier for the default signing key.
   */
  public static async getDefaultSigningKey(options: {
      didDocument: DidDocument
    }): Promise<string | undefined> {
    const { didDocument } = options;

    const signingKeyId = `${didDocument.id}#0`;

    return signingKeyId;
  }

  /**
   * Resolves a `did:jwk` identifier to a DID Document.
   *
   * @param options - The options for the operation.
   * @returns A Promise resolving to a `DidResolutionResult` object representing the result of the resolution.
   */
  public static async resolve(options: {
    didUrl: string,
    resolutionOptions?: DidResolutionOptions
  }): Promise<DidResolutionResult> {
    const { didUrl, resolutionOptions: _ } = options;
    // TODO: Implement resolutionOptions as defined in https://www.w3.org/TR/did-core/#did-resolution

    const parsedDid = parseDid({ didUrl });
    if (!parsedDid) {
      return {
        '@context'            : 'https://w3id.org/did-resolution/v1',
        didDocument           : undefined,
        didDocumentMetadata   : {},
        didResolutionMetadata : {
          contentType  : 'application/did+ld+json',
          error        : 'invalidDid',
          errorMessage : `Cannot parse DID: ${didUrl}`
        }
      };
    }

    if (parsedDid.method !== 'jwk') {
      return {
        '@context'            : 'https://w3id.org/did-resolution/v1',
        didDocument           : undefined,
        didDocumentMetadata   : {},
        didResolutionMetadata : {
          contentType  : 'application/did+ld+json',
          error        : 'methodNotSupported',
          errorMessage : `Method not supported: ${parsedDid.method}`
        }
      };
    }

    const publicKeyJwk = await DidJwkMethod.decodeJwk({ didUrl });
    const didDocument = await DidJwkMethod.createDocument({ publicKeyJwk });

    return {
      '@context'            : 'https://w3id.org/did-resolution/v1',
      didDocument,
      didDocumentMetadata   : {},
      didResolutionMetadata : {
        contentType : 'application/did+ld+json',
        did         : {
          didString        : parsedDid.did,
          methodSpecificId : parsedDid.id,
          method           : parsedDid.method
        }
      }
    };
  }
}