import type { JwkKeyPair, PublicKeyJwk, Web5Crypto } from '@web5/crypto';

import z32 from 'z32';
import { EcdsaAlgorithm, EdDsaAlgorithm, Jose } from '@web5/crypto';

import type {
  DidMethod,
  DidService,
  DidDocument,
  PortableDid,
  DidResolutionResult,
  DidResolutionOptions,
  VerificationRelationship,
  DidKeySetVerificationMethodKey,
} from './types.js';

import { DidDht } from './dht.js';
import { parseDid } from './utils.js';

const SupportedCryptoKeyTypes = [
  'Ed25519',
  'secp256k1'
] as const;

export type DidDhtCreateOptions = {
  publish?: boolean;
  keySet?: DidDhtKeySet;
  services?: DidService[];
}

export type DidDhtKeySet = {
  identityKey?: JwkKeyPair;
  verificationMethodKeys?: DidKeySetVerificationMethodKey[];
}

export class DidDhtMethod implements DidMethod {

  public static methodName = 'dht';

  /**
   * Creates a new DID Document according to the did:dht spec.
   * @param options The options to use when creating the DID Document, including whether to publish it.
   * @returns A promise that resolves to a PortableDid object.
   */
  public static async create(options?: DidDhtCreateOptions): Promise<PortableDid> {
    const { publish, keySet: initialKeySet, services } = options ?? {};

    // Generate missing keys, if not provided in the options.
    const keySet = await this.generateKeySet({ keySet: initialKeySet });

    // Get the identifier and set it.
    const id = await this.getDidIdentifier({ key: keySet.identityKey.publicKeyJwk });

    // Add all other keys to the verificationMethod and relationship arrays.
    const relationshipsMap: Partial<Record<VerificationRelationship, string[]>> = {};
    const verificationMethods = keySet.verificationMethodKeys.map(key => {
      for (const relationship of key.relationships) {
        if (relationshipsMap[relationship]) {
          relationshipsMap[relationship].push(`#${key.publicKeyJwk.kid}`);
        } else {
          relationshipsMap[relationship] = [`#${key.publicKeyJwk.kid}`];
        }
      }

      return {
        id           : `${id}#${key.publicKeyJwk.kid}`,
        type         : 'JsonWebKey2020',
        controller   : id,
        publicKeyJwk : key.publicKeyJwk
      };
    });

    // Add DID identifier to the service IDs.
    services?.map(service => {
      service.id = `${id}#${service.id}`;
    });
    const document: DidDocument = {
      id,
      verificationMethod: [...verificationMethods],
      ...relationshipsMap,
      ...services && {service: services}
    };

    if (publish) {
      await this.publish({ keySet, didDocument: document });
    }
    return {
      did      : document.id,
      document : document,
      keySet   : keySet
    };
  }


  /**
   * Generates a JWK key pair.
   * @param options The key algorithm and key ID to use.
   * @returns A promise that resolves to a JwkKeyPair object.
   */
  public static async generateJwkKeyPair(options: {
    keyAlgorithm: typeof SupportedCryptoKeyTypes[number],
    keyId?: string
  }): Promise<JwkKeyPair> {
    const {keyAlgorithm, keyId} = options;

    let cryptoKeyPair: Web5Crypto.CryptoKeyPair;

    switch (keyAlgorithm) {
      case 'Ed25519': {
        cryptoKeyPair = await new EdDsaAlgorithm().generateKey({
          algorithm   : {name: 'EdDSA', namedCurve: 'Ed25519'},
          extractable : true,
          keyUsages   : ['sign', 'verify']
        });
        break;
      }

      case 'secp256k1': {
        cryptoKeyPair = await new EcdsaAlgorithm().generateKey({
          algorithm   : {name: 'ECDSA', namedCurve: 'secp256k1'},
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
    const jwkKeyPair = await Jose.cryptoKeyToJwkPair({keyPair: cryptoKeyPair});

    // Set kid values.
    if (keyId) {
      jwkKeyPair.privateKeyJwk.kid = keyId;
      jwkKeyPair.publicKeyJwk.kid = keyId;
    } else {
    // If a key ID is not specified, generate RFC 7638 JWK thumbprint.
      const jwkThumbprint = await Jose.jwkThumbprint({key: jwkKeyPair.publicKeyJwk});
      jwkKeyPair.privateKeyJwk.kid = jwkThumbprint;
      jwkKeyPair.publicKeyJwk.kid = jwkThumbprint;
    }

    return jwkKeyPair;
  }

  /**
   * Generates a key set for a DID Document.
   * @param options The key set to use when generating the key set.
   * @returns A promise that resolves to a DidDhtKeySet object.
   */
  public static async generateKeySet(options?: {
    keySet?: DidDhtKeySet
  }): Promise<DidDhtKeySet> {
    let { keySet = {} } = options ?? {};

    if (!keySet.identityKey) {
      keySet.identityKey = await this.generateJwkKeyPair({
        keyAlgorithm : 'Ed25519',
        keyId        : '0'
      });


    } else if (keySet.identityKey.publicKeyJwk.kid !== '0') {
      throw new Error('The identity key must have a kid of 0');
    }

    // add verificationMethodKeys for the identity key
    const identityKeySetVerificationMethod: DidKeySetVerificationMethodKey = {
      ...keySet.identityKey,
      relationships: ['authentication', 'assertionMethod', 'capabilityInvocation', 'capabilityDelegation']
    };

    if (!keySet.verificationMethodKeys) {
      keySet.verificationMethodKeys = [identityKeySetVerificationMethod];
    } else if (keySet.verificationMethodKeys.filter(key => key.publicKeyJwk.kid === '0').length === 0) {
      keySet.verificationMethodKeys.push(identityKeySetVerificationMethod);
    }

    // Generate RFC 7638 JWK thumbprints if `kid` is missing from any key.
    if (keySet.verificationMethodKeys) {
      for (const key of keySet.verificationMethodKeys) {
        if (key.publicKeyJwk) key.publicKeyJwk.kid ??= await Jose.jwkThumbprint({key: key.publicKeyJwk});
        if (key.privateKeyJwk) key.privateKeyJwk.kid ??= await Jose.jwkThumbprint({key: key.privateKeyJwk});
      }
    }

    return keySet;
  }

  /**
   * Gets the identifier fragment from a DID.
   * @param options The key to get the identifier fragment from.
   * @returns A promise that resolves to a string containing the identifier.
   */
  public static async getDidIdentifier(options: {
    key: PublicKeyJwk
  }): Promise<string> {
    const {key} = options;

    const cryptoKey = await Jose.jwkToCryptoKey({key});
    const identifier = z32.encode(cryptoKey.material);
    return 'did:dht:' + identifier;
  }

  /**
   * Gets the identifier fragment from a DID.
   * @param options The key to get the identifier fragment from.
   * @returns A promise that resolves to a string containing the identifier fragment.
   */
  public static async getDidIdentifierFragment(options: {
    key: PublicKeyJwk
  }): Promise<string> {
    const {key} = options;
    const cryptoKey = await Jose.jwkToCryptoKey({key});
    return z32.encode(cryptoKey.material);
  }

  /**
   * Publishes a DID Document to the DHT.
   * @param keySet The key set to use to sign the DHT payload.
   * @param didDocument The DID Document to publish.
   * @returns A boolean indicating the success of the publishing operation.
   */
  public static async publish({ didDocument, keySet }: {
    didDocument: DidDocument,
    keySet: DidDhtKeySet
  }): Promise<boolean> {
    const publicCryptoKey = await Jose.jwkToCryptoKey({key: keySet.identityKey.publicKeyJwk});
    const privateCryptoKey = await Jose.jwkToCryptoKey({key: keySet.identityKey.privateKeyJwk});

    const isPublished = await DidDht.publishDidDocument({
      keyPair: {
        publicKey  : publicCryptoKey,
        privateKey : privateCryptoKey
      },
      didDocument
    });

    return isPublished;
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
        didDocument           : undefined,
        didDocumentMetadata   : {},
        didResolutionMetadata : {
          contentType  : 'application/did+ld+json',
          error        : 'invalidDid',
          errorMessage : `Cannot parse DID: ${didUrl}`
        }
      };
    }

    if (parsedDid.method !== 'dht') {
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

    const didDocument = await DidDht.getDidDocument({ did: parsedDid.did });

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