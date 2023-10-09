import z32 from 'z32';
import { sha1 } from '@noble/hashes/sha1';
import {EcdsaAlgorithm, EdDsaAlgorithm, Jose, JwkKeyPair, PublicKeyJwk, Web5Crypto} from '@web5/crypto';
import {
  DidDocument,
  DidKeySetVerificationMethodKey,
  DidMethod,
  DidResolutionResult,
  DidService, PortableDid,
  VerificationRelationship
} from './types.js';
import {DidDht} from './dht.js';

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

  public static async create(options?: DidDhtCreateOptions): Promise<PortableDid> {
    const {publish, keySet: initialKeySet, services} = options ?? {};

    // Generate missing keys if not provided in the options
    const keySet = await this.generateKeySet({keySet: initialKeySet});

    // Get the identifier and set it
    const id = await this.getDidIdentifier({key: keySet.identityKey.publicKeyJwk});

    // add all other keys to the verificationMethod and relationship arrays
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

    // add did identifier to the service ids
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
      await this.publish(keySet, document);
    }
    return {
      did      : document.id,
      document : document,
      keySet   : keySet
    };
  }

  public static async publish(keySet: DidDhtKeySet, didDocument: DidDocument): Promise<DidResolutionResult> {
    const dht = new DidDht();
    const publicCryptoKey = await Jose.jwkToCryptoKey({key: keySet.identityKey.publicKeyJwk});
    const privateCryptoKey = await Jose.jwkToCryptoKey({key: keySet.identityKey.privateKeyJwk});

    const request = await dht.createPutDidRequest({
      publicKey  : publicCryptoKey,
      privateKey : privateCryptoKey
    }, didDocument);

    const hash = await dht.put(request);
    if (hash) {
      return {
        didDocumentMetadata   : undefined,
        didDocument,
        didResolutionMetadata : {
          contentType: 'application/json'
        }
      };
    } else {
      throw new Error('Failed to publish to DHT');
    }
  }

  public static async resolve(did: string): Promise<DidDocument> {
    const dht = new DidDht();
    const hash = did.replace('did:dht:', '');
    const decoded = z32.decode(hash);
    const identifier = this.hash(decoded);
    const retrievedValue = await dht.get(Buffer.from(identifier).toString('hex'));
    return await dht.parseGetDidResponse(did, retrievedValue).finally(() => dht.destroy());
  }

  private static hash(input: Uint8Array) {
    return sha1(input);
  }

  public static async getDidIdentifier(options: {
        key: PublicKeyJwk
    }): Promise<string> {
    const {key} = options;

    const cryptoKey = await Jose.jwkToCryptoKey({key});
    const identifier = z32.encode(cryptoKey.material);
    return 'did:dht:' + identifier;
  }

  public static async getDidIdentifierFragment(options: {
    key: PublicKeyJwk
  }): Promise<string> {
    const {key} = options;
    const cryptoKey = await Jose.jwkToCryptoKey({key});
    return z32.encode(cryptoKey.material);
  }

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

  public static async generateKeySet(options?: {
        keySet?: DidDhtKeySet
    }): Promise<DidDhtKeySet> {
    let {keySet = {}} = options ?? {};

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
}
