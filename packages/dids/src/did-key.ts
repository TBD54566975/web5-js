import type { PrivateKeyJwk, PublicKeyJwk, Web5Crypto } from '@web5/crypto';

import { universalTypeOf } from '@web5/common';
import {
  Jose,
  Ed25519,
  Secp256k1,
  EcdsaAlgorithm,
  EdDsaAlgorithm,
  utils as cryptoUtils,
} from '@web5/crypto';

import type {
  DidMethod,
  DidDocument,
  PortableDid,
  VerificationMethod,
  DidResolutionResult,
  DidResolutionOptions,
  DidKeySetVerificationMethodKey,
} from './types.js';

import { getVerificationMethodTypes, parseDid } from './utils.js';

const SupportedCryptoAlgorithms = [
  'Ed25519',
  'secp256k1'
] as const;

const SupportedPublicKeyFormats = [
  'Ed25519VerificationKey2020',
  'JsonWebKey2020',
  'X25519KeyAgreementKey2020'
];

const VERIFICATION_METHOD_TYPES: Record<string, string> = {
  'Ed25519VerificationKey2020' : 'https://w3id.org/security/suites/ed25519-2020/v1',
  'JsonWebKey2020'             : 'https://w3id.org/security/suites/jws-2020/v1',
  'X25519KeyAgreementKey2020'  : 'https://w3id.org/security/suites/x25519-2020/v1',
} as const;

export type DidVerificationMethodType = keyof typeof VERIFICATION_METHOD_TYPES;

const MULTICODEC_PUBLIC_KEY_LENGTH: Record<number, number> = {
  // secp256k1-pub - Secp256k1 public key (compressed) - 33 bytes
  0xe7: 33,

  // x25519-pub - Curve25519 public key - 32 bytes
  0xec: 32,

  // ed25519-pub - Ed25519 public key - 32 bytes
  0xed: 32
};

export type DidKeyCreateOptions = {
  enableEncryptionKeyDerivation?: boolean;
  keyAlgorithm?: typeof SupportedCryptoAlgorithms[number];
  keySet?: DidKeyKeySet;
  publicKeyFormat?: DidVerificationMethodType;
}

export type DidKeyCreateDocumentOptions = {
  defaultContext?: string;
  did: string;
  enableEncryptionKeyDerivation?: boolean;
  enableExperimentalPublicKeyTypes?: boolean;
  publicKeyFormat?: DidVerificationMethodType;
}

export type DidKeyDeriveEncryptionKeyResult = {
  key: Uint8Array;
  multicodecCode: number;
}

export type DidKeyIdentifier = {
  fragment: string;
  method: string;
  multibaseValue: string;
  scheme: string;
  version: string;
}

export type DidKeyKeySet = {
  verificationMethodKeys?: DidKeySetVerificationMethodKey[];
}

export class DidKeyMethod implements DidMethod {
  /**
   * Name of the DID method
  */
  public static methodName = 'key';

  public static async create(options?: DidKeyCreateOptions): Promise<PortableDid> {
    let {
      enableEncryptionKeyDerivation = false,
      keyAlgorithm,
      keySet,
      publicKeyFormat = 'JsonWebKey2020'
    } = options ?? { };

    // If keySet not given, generate a default key set.
    if (keySet === undefined) {
      keySet = await DidKeyMethod.generateKeySet({ keyAlgorithm });
    }

    const portableDid: Partial<PortableDid> = {};
    let multibaseId = '';

    if (keySet.verificationMethodKeys?.[0]?.publicKeyJwk) {
      // Compute the multibase identifier based on the JSON Web Key.
      const publicKeyJwk = keySet.verificationMethodKeys[0].publicKeyJwk;
      multibaseId = await Jose.jwkToMultibaseId({ key: publicKeyJwk });
    }

    if (!multibaseId) {
      throw new Error('DidKeyMethod: Failed to create DID with given input.');
    }

    // Concatenate the DID identifier.
    portableDid.did = `did:key:${multibaseId}`;

    // Expand the DID identifier to a DID document.
    portableDid.document = await DidKeyMethod.createDocument({
      did: portableDid.did,
      publicKeyFormat,
      enableEncryptionKeyDerivation
    });

    // Return the given or generated key set.
    portableDid.keySet = keySet;

    return portableDid as PortableDid;
  }

  /**
   * Expands a did:key identifier to a DID Document.
   *
   * Reference: https://w3c-ccg.github.io/did-method-key/#document-creation-algorithm
   *
   * @param options
   * @returns - A DID dodcument.
   */
  public static async createDocument(options: DidKeyCreateDocumentOptions): Promise<DidDocument> {
    const {
      defaultContext = 'https://www.w3.org/ns/did/v1',
      did,
      enableEncryptionKeyDerivation = false,
      enableExperimentalPublicKeyTypes = false,
      publicKeyFormat = 'JsonWebKey2020'
    } = options;

    /**
     * 1. Initialize document to an empty object.
     */
    const document: Partial<DidDocument> = {};

    /**
     * 2. Using a colon (:) as the delimiter, split the identifier into its
     * components: a scheme, a method, a version, and a multibaseValue.
     * If there are only three components set the version to the string
     * value 1 and use the last value as the multibaseValue.
     *
     * Note: The W3C DID specification makes no mention of a version value
     *       being part of the DID syntax.  Additionally, there does not
     *       appear to be any real-world usage of the version number.
     *       Consequently, this implementation will ignore the version
     *       related guidance in the did:key specification.
     */
    let multibaseValue: string;
    try {
      ({ id: multibaseValue } = parseDid({ didUrl: did }));
    } catch (error: any) {
      throw new Error(`invalidDid: Unknown format: ${did}`);
    }

    /**
     * 3. Check the validity of the input identifier.
     * The scheme MUST be the value did. The method MUST be the value key.
     * The version MUST be convertible to a positive integer value. The
     * multibaseValue MUST be a string and begin with the letter z. If any
     * of these requirements fail, an invalidDid error MUST be raised.
     */
    if (!DidKeyMethod.validateIdentifier({ did })) {
      throw new Error(`invalidDid: Invalid identifier format: ${did}`);
    }

    /**
     * 4. Initialize the signatureVerificationMethod to the result of passing
     * identifier, multibaseValue, and options to a
     *  {@link https://w3c-ccg.github.io/did-method-key/#signature-method-creation-algorithm | Signature Method Creation Algorithm}.
     */
    const signatureVerificationMethod = await DidKeyMethod.createSignatureMethod({
      did,
      enableExperimentalPublicKeyTypes,
      multibaseValue,
      publicKeyFormat
    });

    /**
     * 5. Set document.id to identifier. If document.id is not a valid DID,
     * an invalidDid error MUST be raised.
     *
     * Note: Identifier was already confirmed to be valid in Step 3, so
     *       skipping the redundant validation.
     */
    document.id = did;

    /**
     * 6. Initialize the verificationMethod property in document to an array
     * where the first value is the signatureVerificationMethod.
     */
    document.verificationMethod = [signatureVerificationMethod];

    /**
     * 7. Initialize the authentication, assertionMethod, capabilityInvocation,
     * and the capabilityDelegation properties in document to an array where
     * the first item is the value of the id property in
     * signatureVerificationMethod.
     */
    document.authentication = [signatureVerificationMethod.id];
    document.assertionMethod = [signatureVerificationMethod.id];
    document.capabilityInvocation = [signatureVerificationMethod.id];
    document.capabilityDelegation = [signatureVerificationMethod.id];

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
        did,
        enableExperimentalPublicKeyTypes,
        multibaseValue,
        publicKeyFormat: encryptionPublicKeyFormat
      });

      /**
       * 8.2 Add the encryptionVerificationMethod value to the
       * verificationMethod array.
       */
      document.verificationMethod.push(encryptionVerificationMethod);

      /**
       * 8.3. Initialize the keyAgreement property in document to an array
       * where the first item is the value of the id property in
       * encryptionVerificationMethod.
       */
      document.keyAgreement = [encryptionVerificationMethod.id];
    }

    /**
     * 9. Initialize the @context property in document to the result of passing
     * document and options to the Context Creation algorithm.
     */
    // Set contextArray to an array that is initialized to
    // options.defaultContext.
    const contextArray = [defaultContext];

    // For every object in every verification relationship listed in document,
    // add a string value to the contextArray based on the object type value,
    // if it doesn't already exist, according to the following table:
    // {@link https://w3c-ccg.github.io/did-method-key/#context-creation-algorithm | Context Type URL}
    const verificationMethodTypes = getVerificationMethodTypes({ didDocument: document });
    verificationMethodTypes.forEach((typeName: string) => {
      const typeUrl = VERIFICATION_METHOD_TYPES[typeName];
      contextArray.push(typeUrl);
    });
    document['@context'] = contextArray;

    /**
     * 10. Return document.
     */
    return document as DidDocument;
  }

  /**
   * Decoding a multibase-encoded multicodec value into a verification method
   * that is suitable for verifying that encrypted information will be
   * received by the intended recipient.
   */
  public static async createEncryptionMethod(options: {
    did: string,
    enableExperimentalPublicKeyTypes: boolean,
    multibaseValue: string,
    publicKeyFormat: DidVerificationMethodType
  }): Promise<VerificationMethod> {
    const { did, enableExperimentalPublicKeyTypes, multibaseValue, publicKeyFormat } = options;

    /**
     * 1. Initialize verificationMethod to an empty object.
     */
    const verificationMethod: Partial<VerificationMethod> = {};

    /**
     * 2. Set multicodecValue and rawPublicKeyBytes to the result of passing
     * multibaseValue and options to a Derive Encryption Key algorithm.
     */
    const {
      key: rawPublicKeyBytes,
      multicodecCode: multicodecValue,
    } = await DidKeyMethod.deriveEncryptionKey({ multibaseValue });

    /**
     * 3. Ensure the proper key length of rawPublicKeyBytes based on the
     * multicodecValue table provided below:
     *
     * Multicodec hexadecimal value: 0xec
     *
     * If the byte length of rawPublicKeyBytes
     * does not match the expected public key length for the associated
     * multicodecValue, an invalidPublicKeyLength error MUST be raised.
     */
    const actualLength = rawPublicKeyBytes.byteLength;
    const expectedLength = MULTICODEC_PUBLIC_KEY_LENGTH[multicodecValue];
    if (actualLength !== expectedLength) {
      throw new Error(`invalidPublicKeyLength: Expected ${actualLength} bytes. Actual ${expectedLength} bytes.`);
    }

    /**
     * 4. Create the multibaseValue by concatenating the letter 'z' and the
     * base58-btc encoding of the concatenation of the multicodecValue and
     * the rawPublicKeyBytes.
     */
    const kemMultibaseValue = cryptoUtils.keyToMultibaseId({
      key            : rawPublicKeyBytes,
      multicodecCode : multicodecValue
    });

    /**
     * 5. Set the verificationMethod.id value by concatenating identifier,
     * a hash character (#), and the multibaseValue. If verificationMethod.id
     * is not a valid DID URL, an invalidDidUrl error MUST be raised.
     */
    verificationMethod.id = `${did}#${kemMultibaseValue}`;
    try {
      new URL(verificationMethod.id);
    } catch (error: any) {
      throw new Error('invalidDidUrl: Verification Method ID is not a valid DID URL.');
    }

    /**
     * 6. Set the publicKeyFormat value to the options.publicKeyFormat value.
     * 7. If publicKeyFormat is not known to the implementation, an
     * unsupportedPublicKeyType error MUST be raised.
     */
    if (!(SupportedPublicKeyFormats.includes(publicKeyFormat))) {
      throw new Error(`unsupportedPublicKeyType: Unsupported format: ${publicKeyFormat}`);
    }

    /**
     * 8. If options.enableExperimentalPublicKeyTypes is set to false and
     * publicKeyFormat is not Multikey, JsonWebKey2020, or
     * X25519KeyAgreementKey2020, an invalidPublicKeyType error MUST be
     * raised.
     */
    const StandardPublicKeyTypes = ['Multikey', 'JsonWebKey2020', 'X25519KeyAgreementKey2020'];
    if (enableExperimentalPublicKeyTypes === false
      && !(StandardPublicKeyTypes.includes(publicKeyFormat))) {
      throw new Error(`invalidPublicKeyType: Specified '${publicKeyFormat}' without setting enableExperimentalPublicKeyTypes to true.`);
    }

    /**
     * 9. Set verificationMethod.type to the publicKeyFormat value.
     */
    verificationMethod.type = publicKeyFormat;

    /**
     * 10. Set verificationMethod.controller to the identifier value.
     * If verificationMethod.controller is not a valid DID, an invalidDid
     * error MUST be raised.
     */
    verificationMethod.controller = did;
    if (!DidKeyMethod.validateIdentifier({ did })) {
      throw new Error(`invalidDid: Invalid identifier format: ${did}`);
    }

    /**
     * 11. If publicKeyFormat is Multikey or X25519KeyAgreementKey2020,
     * set the verificationMethod.publicKeyMultibase value to multibaseValue.
     *
     * Note: This implementation does not currently support the Multikey
     *       format.
     */
    if (publicKeyFormat === 'X25519KeyAgreementKey2020') {
      verificationMethod.publicKeyMultibase = kemMultibaseValue;
    }

    /**
     * 12. If publicKeyFormat is JsonWebKey2020, set the
     * verificationMethod.publicKeyJwk value to the result of passing
     * multicodecValue and rawPublicKeyBytes to a JWK encoding algorithm.
     */
    if (publicKeyFormat === 'JsonWebKey2020') {
      const jwkParams = await Jose.multicodecToJose({ code: multicodecValue });
      const jsonWebKey = await Jose.keyToJwk({
        keyMaterial : rawPublicKeyBytes,
        keyType     : 'public',
        ...jwkParams
      });
      // Ensure that "d" is NOT present.
      if ('x' in jsonWebKey && !('d' in jsonWebKey)) {
        verificationMethod.publicKeyJwk = jsonWebKey;
      }
    }

    /**
     * 13. Return verificationMethod.
     */
    return verificationMethod as VerificationMethod;
  }

  /**
   * Transform a multibase-encoded multicodec value to public encryption key
   * components that are suitable for encrypting messages to a receiver. A
   * mathematical proof elaborating on the safety of performing this operation
   * is available in:
   * {@link https://eprint.iacr.org/2021/509.pdf | On using the same key pair for Ed25519 and an X25519 based KEM}
   */
  public static async deriveEncryptionKey(options: {
    multibaseValue: string
  }): Promise<DidKeyDeriveEncryptionKeyResult> {
    const { multibaseValue } = options;

    /**
     * 1. Set publicEncryptionKey to an empty object.
     */
    let publicEncryptionKey: Partial<DidKeyDeriveEncryptionKeyResult> = {};

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
      key: rawPublicKeyBytes,
      multicodecCode: multicodecValue
    } = cryptoUtils.multibaseIdToKey({ multibaseKeyId: multibaseValue });

    /**
     * 4. If the multicodecValue is 0xed, derive a public X25519 encryption key
     * by using the rawPublicKeyBytes and the algorithm defined in
     * {@link https://datatracker.ietf.org/doc/html/draft-ietf-core-oscore-groupcomm | Group OSCORE - Secure Group Communication for CoAP}
     * for Curve25519 in Section 2.4.2: ECDH with Montgomery Coordinates and
     * set generatedPublicEncryptionKeyBytes to the result.
     */
    if (multicodecValue === 0xed) {
      const generatedPublicEncryptionKeyBytes = await Ed25519.convertPublicKeyToX25519({
        publicKey: rawPublicKeyBytes
      });

      /**
       * 5. Set multicodecValue in publicEncryptionKey to 0xec.
       *
       * 6. Set rawPublicKeyBytes in publicEncryptionKey to
       * generatedPublicEncryptionKeyBytes.
       */
      publicEncryptionKey = {
        key            : generatedPublicEncryptionKeyBytes,
        multicodecCode : 0xec
      };
    }

    /**
     * 7. Return publicEncryptionKey.
     */
    return publicEncryptionKey as DidKeyDeriveEncryptionKeyResult;
  }

  /**
   * Decodes a multibase-encoded multicodec value into a verification method
   * that is suitable for verifying digital signatures.
   * @param options - Signature method creation algorithm inputs.
   * @returns - A verification method.
   */
  public static async createSignatureMethod(options: {
    did: string,
    enableExperimentalPublicKeyTypes: boolean,
    multibaseValue: string,
    publicKeyFormat: DidVerificationMethodType
  }): Promise<VerificationMethod> {
    const { did, enableExperimentalPublicKeyTypes, multibaseValue, publicKeyFormat } = options;

    /**
     * 1. Initialize verificationMethod to an empty object.
     */
    const verificationMethod: Partial<VerificationMethod> = {};

    /**
     * 2. Set multicodecValue and rawPublicKeyBytes to the result of passing
     * multibaseValue and options to a Decode Public Key algorithm.
     */
    const {
      key: rawPublicKeyBytes,
      multicodecCode: multicodecValue,
      multicodecName
    } = cryptoUtils.multibaseIdToKey({ multibaseKeyId: multibaseValue });

    /**
     * 3. Ensure the proper key length of rawPublicKeyBytes based on the
     * multicodecValue {@link https://w3c-ccg.github.io/did-method-key/#signature-method-creation-algorithm | table provided}.
     * If the byte length of rawPublicKeyBytes does not match the expected
     * public key length for the associated multicodecValue, an
     * invalidPublicKeyLength error MUST be raised.
     */
    const actualLength = rawPublicKeyBytes.byteLength;
    const expectedLength = MULTICODEC_PUBLIC_KEY_LENGTH[multicodecValue];
    if (actualLength !== expectedLength) {
      throw new Error(`invalidPublicKeyLength: Expected ${actualLength} bytes. Actual ${expectedLength} bytes.`);
    }

    /**
     * 4. Ensure the rawPublicKeyBytes are a proper encoding of the public
     * key type as specified by the multicodecValue. This validation is often
     * done by a cryptographic library when importing the public key by,
     * for example, ensuring that an Elliptic Curve public key is a specific
     * coordinate that exists on the elliptic curve. If an invalid public key
     * value is detected, an invalidPublicKey error MUST be raised.
     */
    let isValid = false;
    switch (multicodecName) {
      case 'secp256k1-pub':
        isValid = await Secp256k1.validatePublicKey({ key: rawPublicKeyBytes });
        break;
      case 'ed25519-pub':
        isValid = await Ed25519.validatePublicKey({ key: rawPublicKeyBytes });
        break;
      case 'x25519-pub':
        // TODO: Validate key once/if X25519.validatePublicKey() is implemented.
        // isValid = X25519.validatePublicKey({ key: rawPublicKeyBytes})
        isValid = true;
        break;
    }
    if (!isValid) {
      throw new Error('invalidPublicKey: Invalid public key detected.');
    }

    /**
     * 5. Set the verificationMethod.id value by concatenating identifier,
     * a hash character (#), and the multibaseValue. If verificationMethod.id
     * is not a valid DID URL, an invalidDidUrl error MUST be raised.
     */
    verificationMethod.id = `${did}#${multibaseValue}`;
    try {
      new URL(verificationMethod.id);
    } catch (error: any) {
      throw new Error('invalidDidUrl: Verification Method ID is not a valid DID URL.');
    }

    /**
     * 6. Set the publicKeyFormat value to the options.publicKeyFormat value.
     * 7. If publicKeyFormat is not known to the implementation, an
     * unsupportedPublicKeyType error MUST be raised.
     */
    if (!(SupportedPublicKeyFormats.includes(publicKeyFormat))) {
      throw new Error(`unsupportedPublicKeyType: Unsupported format: ${publicKeyFormat}`);
    }

    /**
     * 8. If options.enableExperimentalPublicKeyTypes is set to false and
     * publicKeyFormat is not Multikey, JsonWebKey2020, or
     * Ed25519VerificationKey2020, an invalidPublicKeyType error MUST be
     * raised.
     */
    const StandardPublicKeyTypes = ['Multikey', 'JsonWebKey2020', 'Ed25519VerificationKey2020'];
    if (enableExperimentalPublicKeyTypes === false
      && !(StandardPublicKeyTypes.includes(publicKeyFormat))) {
      throw new Error(`invalidPublicKeyType: Specified '${publicKeyFormat}' without setting enableExperimentalPublicKeyTypes to true.`);
    }

    /**
     * 9. Set verificationMethod.type to the publicKeyFormat value.
     */
    verificationMethod.type = publicKeyFormat;

    /**
     * 10. Set verificationMethod.controller to the identifier value.
     * If verificationMethod.controller is not a valid DID, an invalidDid
     * error MUST be raised.
     */
    verificationMethod.controller = did;
    if (!DidKeyMethod.validateIdentifier({ did })) {
      throw new Error(`invalidDid: Invalid identifier format: ${did}`);
    }

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
     * 12. If publicKeyFormat is JsonWebKey2020, set the
     * verificationMethod.publicKeyJwk value to the result of passing
     * multicodecValue and rawPublicKeyBytes to a JWK encoding algorithm.
     */
    if (publicKeyFormat === 'JsonWebKey2020') {
      const jwkParams = await Jose.multicodecToJose({ code: multicodecValue });
      const jsonWebKey = await Jose.keyToJwk({
        keyMaterial : rawPublicKeyBytes,
        keyType     : 'public',
        ...jwkParams
      });
      // Ensure that "d" is NOT present.
      if ('x' in jsonWebKey && !('d' in jsonWebKey)) {
        verificationMethod.publicKeyJwk = jsonWebKey;
      }
    }

    /**
     * 13. Return verificationMethod.
     */
    return verificationMethod as VerificationMethod;
  }

  public static async generateKeySet(options?: {
    keyAlgorithm?: typeof SupportedCryptoAlgorithms[number]
  }): Promise<DidKeyKeySet> {
    // Generate Ed25519 keys, by default.
    const { keyAlgorithm = 'Ed25519' } = options ?? {};

    let keyPair: Web5Crypto.CryptoKeyPair;

    switch (keyAlgorithm) {
      case 'Ed25519': {
        keyPair = await new EdDsaAlgorithm().generateKey({
          algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
          extractable : true,
          keyUsages   : ['sign', 'verify']
        });
        break;
      }

      case 'secp256k1': {
        keyPair = await new EcdsaAlgorithm().generateKey({
          algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
          extractable : true,
          keyUsages   : ['sign', 'verify']
        });
        break;
      }

      default: {
        throw new Error(`Unsupported crypto algorithm: '${keyAlgorithm}'`);
      }
    }

    const publicKeyJwk = await Jose.cryptoKeyToJwk({ key: keyPair.publicKey }) as PublicKeyJwk;
    const privateKeyJwk = await Jose.cryptoKeyToJwk({ key: keyPair.privateKey }) as PrivateKeyJwk;

    const keySet: DidKeyKeySet = {
      verificationMethodKeys: [{
        publicKeyJwk,
        privateKeyJwk,
        relationships: ['authentication']
      }]
    };

    return keySet;
  }

  /**
   * Given the W3C DID Document of a `did:key` DID, return the identifier of
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

    if (didDocument.authentication
      && Array.isArray(didDocument.authentication)
      && didDocument.authentication.length > 0
      && typeof didDocument.authentication[0] === 'string') {

      const [verificationMethodId] = didDocument.authentication;
      const signingKeyId = verificationMethodId;

      return signingKeyId;
    }
  }

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

    if (parsedDid.method !== 'key') {
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

    const didDocument = await DidKeyMethod.createDocument({ did: parsedDid.did });

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

  public static validateIdentifier(options: {
    did: string
  }): boolean {
    const { did } = options;

    const { method, id: multibaseValue } = parseDid({ didUrl: did });
    const [scheme] = did.split(':', 1);

    /**
     * Note: The W3C DID specification makes no mention of a version value
     *       being part of the DID syntax.  Additionally, there does not
     *       appear to be any real-world usage of the version number.
     *       Consequently, this implementation will ignore the version
     *       related guidance in the did:key specification.
     */
    const version = '1';

    return (
      scheme !== 'did' ||
      method !== 'key' ||
      parseInt(version) > 0 ||
      universalTypeOf(multibaseValue) !== 'String' ||
      !multibaseValue.startsWith('z')
    );
  }
}