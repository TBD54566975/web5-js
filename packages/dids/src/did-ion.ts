import type { JwkKeyPair, PrivateKeyJwk, PublicKeyJwk, Web5Crypto } from '@web5/crypto';
import type { IonDocumentModel, IonPublicKeyModel, JwkEd25519, JwkEs256k } from '@decentralized-identity/ion-sdk';

import { Convert, universalTypeOf } from '@web5/common';
import IonProofOfWork from '@decentralized-identity/ion-pow-sdk';
// import { IonProofOfWork } from '@decentralized-identity/ion-pow-sdk';
import { EcdsaAlgorithm, EdDsaAlgorithm, Jose } from '@web5/crypto';
import { IonDid, IonPublicKeyPurpose, IonRequest } from '@decentralized-identity/ion-sdk';

import type { DidDocument, DidKeySetVerificationMethodKey, DidMethod, DidResolutionOptions, DidResolutionResult, DidService, DwnServiceEndpoint, PortableDid } from './types.js';

import { getServices, isDwnServiceEndpoint, parseDid } from './utils.js';

export type DidIonAnchorOptions = {
  challengeEnabled?: boolean;
  challengeEndpoint?: string;
  operationsEndpoint?: string;
  keySet: DidIonKeySet;
  services: DidService[];
}

export type DidIonCreateOptions = {
  anchor?: boolean;
  keyAlgorithm?: typeof SupportedCryptoAlgorithms[number];
  keySet?: DidIonKeySet;
  services?: DidService[];
}

export type DidIonKeySet = {
  recoveryKey?: JwkKeyPair;
  updateKey?: JwkKeyPair;
  verificationMethodKeys?: DidKeySetVerificationMethodKey[];
}

enum OperationType {
  Create = 'create',
  Update = 'update',
  Deactivate = 'deactivate',
  Recover = 'recover'
}

/**
 * Data model representing a public key in the DID Document.
 */
export interface IonCreateRequestModel {
  type: OperationType;
  suffixData: {
    deltaHash: string;
    recoveryCommitment: string;
  };
  delta: {
    updateCommitment: string;
    patches: {
      action: string;
      document: IonDocumentModel;
    }[];
  }
}

const SupportedCryptoAlgorithms = [
  'Ed25519',
  'secp256k1'
] as const;

const VerificationRelationshipToIonPublicKeyPurpose = {
  assertionMethod      : IonPublicKeyPurpose.AssertionMethod,
  authentication       : IonPublicKeyPurpose.Authentication,
  capabilityDelegation : IonPublicKeyPurpose.CapabilityDelegation,
  capabilityInvocation : IonPublicKeyPurpose.CapabilityInvocation,
  keyAgreement         : IonPublicKeyPurpose.KeyAgreement
};

export class DidIonMethod implements DidMethod {
  /**
   * Name of the DID method
  */
  public static methodName = 'ion';

  public static async anchor(options: {
    services: DidService[],
    keySet: DidIonKeySet,
    challengeEnabled?: boolean,
    challengeEndpoint?: string,
    operationsEndpoint?: string
  }): Promise<DidResolutionResult | undefined> {
    const {
      challengeEnabled = false,
      challengeEndpoint = 'https://beta.ion.msidentity.com/api/v1.0/proof-of-work-challenge',
      keySet,
      services,
      operationsEndpoint = 'https://ion.tbd.engineering/operations'
    } = options;

    // Create ION Document.
    const ionDocument = await DidIonMethod.createIonDocument({
      keySet: keySet,
      services
    });

    const createRequest = await DidIonMethod.getIonCreateRequest({
      ionDocument,
      recoveryPublicKeyJwk : keySet.recoveryKey.publicKeyJwk,
      updatePublicKeyJwk   : keySet.updateKey.publicKeyJwk
    });

    let resolutionResult: DidResolutionResult;

    if (challengeEnabled) {
      const response = await IonProofOfWork.submitIonRequest(
        challengeEndpoint,
        operationsEndpoint,
        JSON.stringify(createRequest)
      );

      if (response !== undefined && universalTypeOf(response) === 'String') {
        resolutionResult = JSON.parse(response);
      }

    } else {
      const response = await fetch(operationsEndpoint, {
        method  : 'POST',
        mode    : 'cors',
        body    : JSON.stringify(createRequest),
        headers : {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        resolutionResult = await response.json();
      }
    }

    return resolutionResult;
  }

  public static async create(options?: DidIonCreateOptions): Promise<PortableDid> {
    let { anchor, keyAlgorithm, keySet, services } = options ?? { };

    // Begin constructing a PortableDid.
    const did: Partial<PortableDid> = {};

    // If any member of the key set is missing, generate the keys.
    did.keySet = await DidIonMethod.generateKeySet({ keyAlgorithm, keySet });

    // Generate Long Form DID URI.
    did.did = await DidIonMethod.getLongFormDid({
      keySet: did.keySet,
      services
    });

    // Get short form DID.
    did.canonicalId = await DidIonMethod.getShortFormDid({ didUrl: did.did });

    let didResolutionResult: DidResolutionResult | undefined;
    if (anchor) {
      // Attempt to anchor the DID.
      didResolutionResult = await DidIonMethod.anchor({
        keySet: did.keySet,
        services
      });

    } else {
      // If anchoring was not requested, then resolve the long form DID.
      didResolutionResult = await DidIonMethod.resolve({ didUrl: did.did });
    }

    // Store the DID Document.
    did.document = didResolutionResult.didDocument;

    return did as PortableDid;
  }

  public static async decodeLongFormDid(options: {
    didUrl: string
  }): Promise<IonCreateRequestModel> {
    const { didUrl } = options;

    const parsedDid = parseDid({ didUrl });

    if (!parsedDid) {
      throw new Error(`DidIonMethod: Unable to parse DID: ${didUrl}`);
    }

    const decodedLongFormDid = Convert.base64Url(
      parsedDid.id.split(':').pop()
    ).toObject() as Pick<IonCreateRequestModel, 'delta' | 'suffixData'>;

    const createRequest: IonCreateRequestModel = {
      ...decodedLongFormDid,
      type: OperationType.Create
    };

    return createRequest;
  }

  /**
   * Generates two key pairs used for authorization and encryption purposes
   * when interfacing with DWNs. The IDs of these keys are referenced in the
   * service object that includes the dwnUrls provided.
   */
  public static async generateDwnOptions(options: {
    encryptionKeyId?: string,
    serviceEndpointNodes: string[],
    serviceId?: string,
    signingKeyAlgorithm?: typeof SupportedCryptoAlgorithms[number]
    signingKeyId?: string,
  }): Promise<DidIonCreateOptions> {
    const {
      signingKeyAlgorithm = 'Ed25519', // Generate Ed25519 key pairs, by default.
      serviceId = '#dwn', // Use default ID value, unless overridden.
      signingKeyId = '#dwn-sig', // Use default key ID value, unless overridden.
      encryptionKeyId = '#dwn-enc', // Use default key ID value, unless overridden.
      serviceEndpointNodes } = options;

    const signingKeyPair = await DidIonMethod.generateJwkKeyPair({
      keyAlgorithm : signingKeyAlgorithm,
      keyId        : signingKeyId
    });

    /** Currently, `dwn-sdk-js` has only implemented support for record
     * encryption using the `ECIES-ES256K` crypto algorithm. Until the
     * DWN SDK supports ECIES with EdDSA, the encryption key pair must
     * use secp256k1. */
    const encryptionKeyPair = await DidIonMethod.generateJwkKeyPair({
      keyAlgorithm : 'secp256k1',
      keyId        : encryptionKeyId
    });

    const keySet: DidIonKeySet = {
      verificationMethodKeys: [
        { ...signingKeyPair, relationships: ['authentication'] },
        { ...encryptionKeyPair, relationships: ['keyAgreement'] }
      ]
    };

    const serviceEndpoint: DwnServiceEndpoint = {
      encryptionKeys : [encryptionKeyId],
      nodes          : serviceEndpointNodes,
      signingKeys    : [signingKeyId]
    };

    const services: DidService[] = [{
      id   : serviceId,
      serviceEndpoint,
      type : 'DecentralizedWebNode',
    }];

    return { keySet, services };
  }

  public static async generateJwkKeyPair(options: {
    keyAlgorithm: typeof SupportedCryptoAlgorithms[number],
    keyId?: string
  }): Promise<JwkKeyPair> {
    const { keyAlgorithm, keyId } = options;

    let cryptoKeyPair: Web5Crypto.CryptoKeyPair;

    switch (keyAlgorithm) {
      case 'Ed25519': {
        cryptoKeyPair = await new EdDsaAlgorithm().generateKey({
          algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
          extractable : true,
          keyUsages   : ['sign', 'verify']
        });
        break;
      }

      case 'secp256k1': {
        cryptoKeyPair = await new EcdsaAlgorithm().generateKey({
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

    // Convert the CryptoKeyPair to JwkKeyPair.
    const jwkKeyPair = await Jose.cryptoKeyToJwkPair({ keyPair: cryptoKeyPair });

    // Set kid values.
    if (keyId) {
      jwkKeyPair.privateKeyJwk.kid = keyId;
      jwkKeyPair.publicKeyJwk.kid = keyId;
    } else {
      // If a key ID is not specified, generate RFC 7638 JWK thumbprint.
      const jwkThumbprint = await Jose.jwkThumbprint({ key: jwkKeyPair.publicKeyJwk });
      jwkKeyPair.privateKeyJwk.kid = jwkThumbprint;
      jwkKeyPair.publicKeyJwk.kid = jwkThumbprint;
    }

    return jwkKeyPair;
  }

  public static async generateKeySet(options?: {
    keyAlgorithm?: typeof SupportedCryptoAlgorithms[number],
    keySet?: DidIonKeySet
  }): Promise<DidIonKeySet> {
    // Generate Ed25519 authentication key pair, by default.
    let { keyAlgorithm = 'Ed25519', keySet = {} } = options ?? {};

    // If keySet lacks verification method keys, generate one.
    if (keySet.verificationMethodKeys === undefined) {
      const authenticationkeyPair = await DidIonMethod.generateJwkKeyPair({
        keyAlgorithm,
        keyId: 'dwn-sig'
      });
      keySet.verificationMethodKeys = [{
        ...authenticationkeyPair,
        relationships: ['authentication', 'assertionMethod']
      }];
    }

    // If keySet lacks recovery key, generate one.
    if (keySet.recoveryKey === undefined) {
      // Note: ION/Sidetree only supports secp256k1 recovery keys.
      keySet.recoveryKey = await DidIonMethod.generateJwkKeyPair({
        keyAlgorithm : 'secp256k1',
        keyId        : 'ion-recovery-1'
      });
    }

    // If keySet lacks update key, generate one.
    if (keySet.updateKey === undefined) {
      // Note: ION/Sidetree only supports secp256k1 update keys.
      keySet.updateKey = await DidIonMethod.generateJwkKeyPair({
        keyAlgorithm : 'secp256k1',
        keyId        : 'ion-update-1'
      });
    }

    // Generate RFC 7638 JWK thumbprints if `kid` is missing from any key.
    for (const key of [...keySet.verificationMethodKeys, keySet.recoveryKey, keySet.updateKey]) {
      if ('publicKeyJwk' in key) key.publicKeyJwk.kid ??= await Jose.jwkThumbprint({ key: key.publicKeyJwk });
      if ('privateKeyJwk' in key) key.privateKeyJwk.kid ??= await Jose.jwkThumbprint({ key: key.privateKeyJwk });
    }

    return keySet;
  }

  /**
   * Given the W3C DID Document of a `did:ion` DID, return the identifier of
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

    if (!didDocument.id) {
      throw new Error(`DidIonMethod: DID document is missing 'id' property`);
    }

    /** If the DID document contains a DWN service endpoint in the expected
     * format, return the first entry in the `signingKeys` array. */
    const [dwnService] = getServices({ didDocument, type: 'DecentralizedWebNode' });
    if (isDwnServiceEndpoint(dwnService?.serviceEndpoint)) {
      const [verificationMethodId] = dwnService.serviceEndpoint.signingKeys;
      const did = didDocument.id;
      const signingKeyId = `${did}${verificationMethodId}`;
      return signingKeyId;
    }

    /** Otherwise, fallback to a naive approach of returning the first key ID
     * in the `authentication` verification relationships array. */
    if (didDocument.authentication
        && Array.isArray(didDocument.authentication)
        && didDocument.authentication.length > 0
        && typeof didDocument.authentication[0] === 'string') {
      const [verificationMethodId] = didDocument.authentication;
      const did = didDocument.id;
      const signingKeyId = `${did}${verificationMethodId}`;
      return signingKeyId;
    }
  }

  public static async getLongFormDid(options: {
    services: DidService[],
    keySet: DidIonKeySet
  }): Promise<string> {
    const { services = [], keySet } = options;

    // Create ION Document.
    const ionDocument = await DidIonMethod.createIonDocument({
      keySet: keySet,
      services
    });

    // Filter JWK to only those properties expected by ION/Sidetree.
    const recoveryKey = DidIonMethod.jwkToIonJwk({ key: keySet.recoveryKey.publicKeyJwk }) as JwkEs256k;
    const updateKey = DidIonMethod.jwkToIonJwk({ key: keySet.updateKey.publicKeyJwk }) as JwkEs256k;

    // Create an ION DID create request operation.
    const did = await IonDid.createLongFormDid({
      document: ionDocument,
      recoveryKey,
      updateKey
    });

    return did;
  }

  public static async getShortFormDid(options: {
    didUrl: string
  }): Promise<string> {
    const { didUrl } = options;

    const parsedDid = parseDid({ didUrl });

    if (!parsedDid) {
      throw new Error(`DidIonMethod: Unable to parse DID: ${didUrl}`);
    }

    const shortFormDid = parsedDid.did.split(':', 3).join(':');

    return shortFormDid;
  }

  public static async resolve(options: {
    didUrl: string,
    resolutionOptions?: DidResolutionOptions
  }): Promise<DidResolutionResult> {
    // TODO: Implement resolutionOptions as defined in https://www.w3.org/TR/did-core/#did-resolution
    const { didUrl, resolutionOptions = {} } = options;

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

    if (parsedDid.method !== 'ion') {
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

    const { resolutionEndpoint = 'https://ion.tbd.engineering/identifiers/' } = resolutionOptions;
    const normalizeUrl = (url: string): string => url.endsWith('/') ? url : url + '/';
    const resolutionUrl = `${normalizeUrl(resolutionEndpoint)}${parsedDid.did}`;

    const response = await fetch(resolutionUrl);

    let resolutionResult: DidResolutionResult | object;
    try {
      resolutionResult = await response.json();
    } catch (error) {
      resolutionResult = {};
    }

    if (response.ok) {
      return resolutionResult as DidResolutionResult;
    }

    // Response was not "OK" (HTTP 4xx-5xx status code)

    // Return result if it contains DID resolution metadata.
    if ('didResolutionMetadata' in resolutionResult) {
      return resolutionResult;
    }

    // Set default error code and message.
    let error = 'internalError';
    let errorMessage = `DID resolver responded with HTTP status code: ${response.status}`;

    /** The Microsoft resolution endpoint does not return a valid DidResolutionResult
       * when an ION DID is "not found" so normalization is needed. */
    if ('error' in resolutionResult &&
        typeof resolutionResult.error === 'object' &&
        'code' in resolutionResult.error &&
        typeof resolutionResult.error.code === 'string' &&
        'message' in resolutionResult.error &&
        typeof resolutionResult.error.message === 'string') {
      error = resolutionResult.error.code.includes('not_found') ? 'notFound' : error;
      errorMessage = resolutionResult.error.message ?? errorMessage;
    }

    return {
      '@context'            : 'https://w3id.org/did-resolution/v1',
      didDocument           : undefined,
      didDocumentMetadata   : {},
      didResolutionMetadata : {
        contentType: 'application/did+ld+json',
        error,
        errorMessage
      }
    };
  }

  private static async createIonDocument(options: {
    keySet: DidIonKeySet,
    services?: DidService[]
  }): Promise<IonDocumentModel> {
    const { services = [], keySet } = options;

    /**
     * STEP 1: Convert key set verification method keys to ION SDK format.
     */

    const ionPublicKeys: IonPublicKeyModel[] = [];

    for (const key of keySet.verificationMethodKeys) {
      // Map W3C DID verification relationship names to ION public key purposes.
      const ionPurposes: IonPublicKeyPurpose[] = [];
      for (const relationship of key.relationships) {
        ionPurposes.push(
          VerificationRelationshipToIonPublicKeyPurpose[relationship]
        );
      }

      /** During certain ION operations, JWK validation will throw an error
       * if key IDs provided as input are prefixed with `#`. ION operation
       * outputs and DID document resolution always include the `#` prefix
       * for key IDs resulting in a confusing mismatch between inputs and
       * outputs.  To improve the developer experience, this inconsistency
       * is addressed by normalizing input key IDs before being passed
       * to ION SDK methods. */
      const publicKeyId = (key.publicKeyJwk.kid.startsWith('#'))
        ? key.publicKeyJwk.kid.substring(1)
        : key.publicKeyJwk.kid;

      // Convert public key JWK to ION format.
      const publicKey: IonPublicKeyModel = {
        id           : publicKeyId,
        publicKeyJwk : DidIonMethod.jwkToIonJwk({ key: key.publicKeyJwk }),
        purposes     : ionPurposes,
        type         : 'JsonWebKey2020'
      };

      ionPublicKeys.push(publicKey);
    }

    /**
     * STEP 2: Convert service entries, if any, to ION SDK format.
     */
    const ionServices = services.map(service => ({
      ...service,
      id: service.id.startsWith('#') ? service.id.substring(1) : service.id
    }));

    /**
     * STEP 3: Format as ION document.
     */

    const ionDocumentModel: IonDocumentModel = {
      publicKeys : ionPublicKeys,
      services   : ionServices
    };

    return ionDocumentModel;
  }

  private static async getIonCreateRequest(options: {
    ionDocument: IonDocumentModel,
    recoveryPublicKeyJwk: PublicKeyJwk,
    updatePublicKeyJwk: PublicKeyJwk
  }): Promise<IonCreateRequestModel> {
    const { ionDocument, recoveryPublicKeyJwk, updatePublicKeyJwk } = options;

    // Create an ION DID create request operation.
    const createRequest = await IonRequest.createCreateRequest({
      document    : ionDocument,
      recoveryKey : DidIonMethod.jwkToIonJwk({ key: recoveryPublicKeyJwk }) as JwkEs256k,
      updateKey   : DidIonMethod.jwkToIonJwk({ key: updatePublicKeyJwk }) as JwkEs256k
    });

    return createRequest;
  }

  private static jwkToIonJwk({ key }: { key: PrivateKeyJwk | PublicKeyJwk }): JwkEd25519 | JwkEs256k {
    let ionJwk: Partial<JwkEd25519 | JwkEs256k> = { };

    if ('crv' in key) {
      ionJwk.crv = key.crv;
      ionJwk.kty = key.kty;
      ionJwk.x = key.x;
      if ('d' in key) ionJwk.d = key.d;

      if ('y' in key && key.y) {
        // secp256k1 JWK.
        return { ...ionJwk, y: key.y} as JwkEs256k;
      }
      // Ed25519 JWK.
      return { ...ionJwk } as JwkEd25519;
    }

    throw new Error(`jwkToIonJwk: Unsupported key algorithm.`);
  }
}