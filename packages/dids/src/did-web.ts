import type { PrivateKeyJwk, PublicKeyJwk, Web5Crypto } from '@web5/crypto';

import {
  Jose,
  EcdsaAlgorithm,
  EdDsaAlgorithm,
} from '@web5/crypto';

import type {
  DidMethod,
  DidDocument,
  PortableDid,
  DidResolutionResult,
  DidResolutionOptions,
  DidKeySetVerificationMethodKey,
} from './types.js';

import { getVerificationMethodTypes, parseDid } from './utils.js';
import { DidKeyKeySet, DidVerificationMethodType } from './did-key.js';

const WELL_KNOWN = '/.well-known';
const DID_JSON = '/did.json';

const SupportedCryptoAlgorithms = [
  'Ed25519',
  'secp256k1'
] as const;

const VERIFICATION_METHOD_TYPES: Record<string, string> = {
  'Ed25519VerificationKey2020' : 'https://w3id.org/security/suites/ed25519-2020/v1',
  'JsonWebKey2020'             : 'https://w3id.org/security/suites/jws-2020/v1',
  'X25519KeyAgreementKey2020'  : 'https://w3id.org/security/suites/x25519-2020/v1',
} as const;

export type DidWebCreateDocumentOptions = {
  did: string;
  keySet: DidWebKeySet;
  defaultContext?: string;
  publicKeyFormat?: DidVerificationMethodType;
}

export type DidWebKeySet = {
  verificationMethodKeys?: DidKeySetVerificationMethodKey[];
}

export type DidWebCreateOptions = {
  didWebId: string;
  keyAlgorithm?: typeof SupportedCryptoAlgorithms[number];
  keySet?: DidKeyKeySet;
  publicKeyFormat?: DidVerificationMethodType;
}

export class DidWebMethod implements DidMethod {

  /**
   * Name of the DID method
  */
  public static methodName = 'web';

  /**
   * DID method specific identifier
   */
  public static kid = '#key-0';

  /**
   * Creates a DID Web identifier and associated key set.
   *
   * @param options - Configuration for creating a DID Web identifier.
   * @param options.didWebId - The DID identifier to create.
   * @param options.keyAlgorithm - Optional. The key algorithm to use for the key set.
   * @param options.keySet - Optional. The key set to use for the DID.
   * @param options.publicKeyFormat - Optional. The format of the public key.
   * @returns A Promise that resolves to a `PortableDid`, containing the DID identifier, DID Document, and associated key set.
   */
  public static async create(options: DidWebCreateOptions): Promise<PortableDid> {
    let {
      didWebId,
      keyAlgorithm,
      keySet,
      publicKeyFormat = 'JsonWebKey2020'
    } = options ?? { };

    // Validate the DID identifier
    if (!DidWebMethod.validateIdentifier({ did: didWebId })) {
      throw new Error(`invalidDid: Invalid DID format for did:web: ${didWebId}`);
    }

    // If keySet not given, generate a default key set.
    if (keySet === undefined) {
      keySet = await DidWebMethod.generateKeySet({ keyAlgorithm });
    }

    const portableDid: Partial<PortableDid> = {};

    portableDid.did = didWebId;

    portableDid.document = await DidWebMethod.createDocument({
      did: portableDid.did,
      publicKeyFormat,
      keySet,
    });

    portableDid.keySet = keySet;

    return portableDid as PortableDid;
  }


  public static async generateKeySet(options?: {
    keyAlgorithm?: typeof SupportedCryptoAlgorithms[number]
  }): Promise<DidWebKeySet> {
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
   * Expands a did:web identifier to a DID Document.
   *
   * Reference: https://w3c-ccg.github.io/did-method-web/
   *
   * @param options
   * @returns - A DID dodcument.
   */
  public static async createDocument(options: DidWebCreateDocumentOptions): Promise<DidDocument> {
    const {
      defaultContext = 'https://www.w3.org/ns/did/v1',
      did,
      keySet,
      publicKeyFormat = 'JsonWebKey2020'
    } = options;

    const document: Partial<DidDocument> = {};

    if (!DidWebMethod.validateIdentifier({did})) {
      throw new Error(`invalidDid: Invalid DID format for did:web: ${did}`);
    }

    document.id = did;

    document.verificationMethod = [{
      id           : `${did}${DidWebMethod.kid}`,
      type         : publicKeyFormat,
      controller   : did,
      publicKeyJwk : keySet.verificationMethodKeys[0].publicKeyJwk
    }];

    document.authentication = [`${did}${DidWebMethod.kid}`];
    document.assertionMethod = [`${did}${DidWebMethod.kid}`];
    document.capabilityInvocation = [`${did}${DidWebMethod.kid}`];
    document.capabilityDelegation = [`${did}${DidWebMethod.kid}`];

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

    return document as DidDocument;
  }

  /**
   * Resolves a DID Document based on the specified options.
   *
   * @param options - Configuration for resolving a DID Document.
   * @param options.didUrl - The DID URL to resolve.
   * @param options.resolutionOptions - Optional settings for the DID resolution process as defined in the DID Core specification.
   * @returns A Promise that resolves to a `DidResolutionResult`, containing the resolved DID Document and associated metadata.
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
        didDocument           : null,
        didDocumentMetadata   : {},
        didResolutionMetadata : {
          error        : 'invalidDid',
          errorMessage : `Cannot parse DID: ${didUrl}`
        }
      };
    }

    if (parsedDid.method !== 'web') {
      return {
        '@context'            : 'https://w3id.org/did-resolution/v1',
        didDocument           : null,
        didDocumentMetadata   : {},
        didResolutionMetadata : {
          error        : 'methodNotSupported',
          errorMessage : `Method not supported: ${parsedDid.method}`
        }
      };
    }

    let didDocument: DidDocument;

    try {
      const url = DidWebMethod.getDocURL(parsedDid.did);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch DID Document: ${response.statusText}`);
      }

      didDocument = await response.json() as DidDocument;
    } catch (error: any) {
      return {
        '@context'            : 'https://w3id.org/did-resolution/v1',
        didDocument           : null,
        didDocumentMetadata   : {},
        didResolutionMetadata : {
          error        : 'notFound',
          errorMessage : `An unexpected error occurred while resolving DID: ${parsedDid.did}`
        }
      };
    }

    return {
      '@context'            : 'https://w3id.org/did-resolution/v1',
      didDocument,
      didDocumentMetadata   : {},
      didResolutionMetadata : {
        did: {
          didString        : parsedDid.did,
          methodSpecificId : parsedDid.id,
          method           : parsedDid.method
        }
      }
    };
  }

  /**
   * Constructs the URL for a DID Document based on the specified DID identifier. 
   * Specifics can be found here https://w3c-ccg.github.io/did-method-web/#read-resolve
   *
   * @param did - The DID identifier to construct a URL for.
   * @returns The URL for the DID Document.
   */
  public static getDocURL(did: string): string {
    // Step 1: Replace ":" with "/" in the method specific identifier
    const parts = did.split(':');
    if (parts.length < 3) {
      throw new Error('Invalid DID format');
    }
    let path = parts.slice(2).join('/');

    // Step 2: Percent decode the colon if the domain contains a port
    const domainAndPath = path.split('/');
    domainAndPath[0] = decodeURIComponent(domainAndPath[0]);
    path = domainAndPath.join('/');

    // Step 3: Generate an HTTPS URL
    let url = `https://${path}`;

    // Step 4: If no path has been specified, append /.well-known
    if (!domainAndPath[1]) {
      url += WELL_KNOWN;
    }

    // Step 5: Append /did.json to complete the URL
    url += DID_JSON;

    // URL validation
    try {
      new URL(url); // Validate the URL
    } catch (error) {
      throw new Error(`Invalid URL: ${url}`);
    }

    return url;
  }

  /**
   * Validates a DID identifier.
   *
   * @param options - Configuration for validating a DID identifier.
   * @param options.did - The DID identifier to validate.
   * @returns - A boolean indicating whether the DID identifier is valid.
   */
  public static validateIdentifier(options: {
    did: string
  }): boolean {
    // Split the DID into its components
    const parts = options.did.split(':');

    // Check if the DID has three parts and starts with 'did:web'
    if (parts.length !== 3 || parts[0] !== 'did' || parts[1] !== 'web') {
      return false;
    }

    // Validate the domain part
    const domainParts = parts[2].split('.');
    if (domainParts.length < 2) {
      return false; // Not a valid domain (requires at least one dot)
    }

    // Ensure each part of the domain is non-empty and uses valid characters
    for (let part of domainParts) {
      if (part.length === 0 || !/^[a-zA-Z0-9-]+$/.test(part)) {
        return false;
      }
    }

    // Check for valid TLD
    const tld = domainParts[domainParts.length - 1];
    if (tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) {
      return false; // TLDs are at least two characters and alphabetic
    }

    return true;
  }

}