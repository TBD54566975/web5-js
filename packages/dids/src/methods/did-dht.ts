import type { Packet } from 'dns-packet';
import type { Jwk, KeyIdentifier, KeyImporterExporter, KmsExportKeyParams, KmsImportKeyParams } from '@web5/crypto';

import { Convert } from '@web5/common';
import { AUTHORITATIVE_ANSWER } from 'dns-packet';
import { CryptoApi, Ed25519, LocalKmsCrypto, Secp256k1, computeJwkThumbprint } from '@web5/crypto';

import type { Did, DidCreateOptions, DidCreateVerificationMethod, DidKeySet, DidMetadata } from './did-method.js';
import type { DidDocument, DidResolutionOptions, DidResolutionResult, DidService, DidVerificationMethod } from '../types/did-core.js';

import { DidUri } from '../did-uri.js';
import { DidMethod } from './did-method.js';

/**
 * The default TTL for DNS records published to the DHT network.
 */
const DNS_RECORD_TTL = 60 * 60 * 2; // 7200 seconds or 2 hours

/**
 * Character used to separate distinct elements or entries in the DNS packet representation
 * of a DID Document.
 *
 * For example, verification methods, verification relationships, and services are separated by
 * semicolons (`;`) in the root record:
 * ```
 * vm=k1;auth=k1;asm=k2;inv=k3;del=k3;srv=s1
 * ```
 */
const PROPERTY_SEPARATOR = ';';

/**
 * Character used to separate distinct values within a single element or entry in the DNS packet
 * representation of a DID Document.
 *
 * For example, multiple key references for the `authentication` verification relationships are
 * separated by commas (`,`):
 * ```
 * auth=0,1,2
 * ```
 */
const VALUE_SEPARATOR = ',';

/**
 * Options for creating a Decentralized Identifier (DID) using the DID DHT method.
 */
export interface DidDhtCreateOptions<TKms> extends DidCreateOptions<TKms> {
  /**
   * Optionally specify that the DID Subject is also identified by one or more other DIDs or URIs.
   *
   * A DID subject can have multiple identifiers for different purposes, or at different times.
   * The assertion that two or more DIDs (or other types of URI) refer to the same DID subject can
   * be made using the `alsoKnownAs` property.
   *
   * @see {@link https://www.w3.org/TR/did-core/#also-known-as | DID Core Specification, § Also Known As}
   *
   * @example
   * ```ts
   * const did = await DidDht.create({
   *  options: {
   *   alsoKnownAs: 'did:example:123'
   * };
   * ```
   */
  alsoKnownAs?: string[];

  /**
   * Optionally specify which DID (or DIDs) is authorized to make changes to the DID document.
   *
   * A DID controller is an entity that is authorized to make changes to a DID document. Typically,
   * only the DID Subject (i.e., the value of `id` property in the DID document) is authoritative.
   * However, another DID (or DIDs) can be specified as the DID controller, and when doing so, any
   * verification methods contained in the DID document for the other DID should be accepted as
   * authoritative. In other words, proofs created by the controller DID should be considered
   * equivalent to proofs created by the DID Subject.
   *
   * @see {@link https://www.w3.org/TR/did-core/#did-controller | DID Core Specification, § DID Controller}
   *
   * @example
   * ```ts
   * const did = await DidDht.create({
   *  options: {
   *   controller: 'did:example:123'
   * };
   * ```
   */
  controllers?: string | string[];

  /**
   * Optionally specify one or more registered DID DHT types to make the DID discovereable.
   *
   * Type indexing is an OPTIONAL feature that enables DIDs to become discoverable. DIDs that wish
   * to be discoverable and resolveable by type can include one or more types when publishing their
   * DID document to a DID DHT Gateway.
   *
   * The registered DID types are published in the {@link https://did-dht.com/registry/index.html#indexed-types | DID DHT Registry}.
   */
  didTypes?: (DidDhtRegisteredDidType | keyof typeof DidDhtRegisteredDidType)[];

  /**
   * Optional. Determines whether the created DID should be published to the DHT network.
   *
   * If set to `true` or omitted, the DID is publicly discoverable. If `false`, the DID is not
   * published and cannot be resolved by others. By default, newly created DIDs are published.
   *
   * @see {@link https://did-dht.com | DID DHT Method Specification}
   *
   * @example
   * ```ts
   * const did = await DidDht.create({
   *  options: {
   *   publish: false
   * };
   * ```
   */
  publish?: boolean;

  /**
   * Optional. An array of service endpoints associated with the DID.
   *
   * Services are used in DID documents to express ways of communicating with the DID subject or
   * associated entities. A service can be any type of service the DID subject wants to advertise,
   * including decentralized identity management services for further discovery, authentication,
   * authorization, or interaction.
   *
   * @see {@link https://www.w3.org/TR/did-core/#services | DID Core Specification, § Services}
   *
   * @example
   * ```ts
   * const did = await DidDht.create({
   *  options: {
   *   services: [
   *     {
   *       id: 'did:dht:i9xkp8ddcbcg8jwq54ox699wuzxyifsqx4jru45zodqu453ksz6y#dwn',
   *       type: 'DecentralizedWebNode',
   *       serviceEndpoint: ['https://example.com/dwn1', 'https://example/dwn2']
   *     }
   *   ]
   * };
   * ```
   */
  services?: DidService[];

  /**
   * Optional. An array of verification methods to be included in the DID document.
   *
   * By default, a newly created DID DHT document will contain a single Ed25519 verification method,
   * also known as the {@link https://did-dht.com/#term:identity-key | Identity Key}. Additional
   * verification methods can be added to the DID document using the `verificationMethods` property.
   *
   * @see {@link https://www.w3.org/TR/did-core/#verification-methods | DID Core Specification, § Verification Methods}
   *
   * @example
   * ```ts
   * const did = await DidDht.create({
   *  options: {
   *   verificationMethods: [
   *     {
   *       algorithm: 'Ed25519',
   *       purposes: ['authentication', 'assertionMethod']
   *     },
   *     {
   *       algorithm: 'Ed25519',
   *       id: 'dwn-sig',
   *       purposes: ['authentication', 'assertionMethod']
   *     }
   *   ]
   * };
   * ```
   */
  verificationMethods?: DidCreateVerificationMethod<TKms>[];
}

/**
 * Represents an optional extension to a DID Document’s DNS packet representation exposed as a
 * type index.
 *
 * Type indexing is an OPTIONAL feature that enables DIDs to become discoverable. DIDs that wish to
 * be discoverable and resolveable by type can include one or more types when publishing their DID
 * document to a DID DHT Gateway.
 *
 * The registered DID types are published in the {@link https://did-dht.com/registry/index.html#indexed-types | DID DHT Registry}.
 */
export enum DidDhtRegisteredDidType {
  Discoverable = 0,
  Organization = 1,
  Government = 2,
  Corporation = 3,
  LocalBusiness = 4,
  SoftwarePackage = 5,
  WebApp = 6,
  FinancialInstitution = 7
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
export const DidDhtRegisteredKeyType: Record<string, number> = {
  Ed25519   : 0,
  secp256k1 : 1,
  secp256r1 : 2
};

/**
 * Private helper that maps algorithm identifiers to their corresponding DID DHT
 * {@link DidDhtRegisteredKeyType | registered key type}.
 */
const AlgorithmToKeyTypeMap = {
  Ed25519 : DidDhtRegisteredKeyType.Ed25519,
  ES256K  : DidDhtRegisteredKeyType.secp256k1,
  ES256   : DidDhtRegisteredKeyType.secp256r1
} as const;

export class DidDht extends DidMethod {

  /**
   * Name of the DID method, as defined in the DID DHT specification.
   */
  public static methodName = 'dht';

  public static async create<TKms extends CryptoApi | undefined = undefined>({
    keyManager = new LocalKmsCrypto(),
    options = {}
  }: {
    keyManager?: TKms;
    options?: DidDhtCreateOptions<TKms>;
  } = {}): Promise<Did> {
    // Before processing the create operation, validate DID-method-specific requirements to prevent
    // keys from being generated unnecessarily.

    // Check 1: Validate that the algorithm for any given verification method is supported by the
    // DID DHT specification.
    if (options.verificationMethods?.some(vm => !(vm.algorithm in AlgorithmToKeyTypeMap))) {
      throw new Error('DidDht: One or more verification method algorithms are not supported');
    }

    // Check 2: Validate that the required properties for any given services are present.
    if (options.services?.some(s => !s.id || !s.type || !s.serviceEndpoint)) {
      throw new Error('DidDht: One or more services are missing required properties');
    }

    // Generate random key material for the Identity Key and any additional verification methods.
    const keySet = await DidDht.generateKeySet({
      keyManager,
      verificationMethods: options.verificationMethods ?? []
    });

    // Create the DID object from the generated key material, including DID document, metadata,
    // signer convenience function, and URI.
    return await DidDht.fromPublicKeys({
      keyManager,
      options,
      ...keySet,
    });
  }

  public static async fromKeyManager({ didUri, keyManager }: {
    didUri: string;
    keyManager: CryptoApi;
  }): Promise<Did> {
    // Resolve the DID URI to a DID Document.
    const { didDocument } = await DidDht.resolve(didUri);

    // Verify the DID Resolution Result includes a DID document containing verification methods.
    if (!(didDocument && Array.isArray(didDocument.verificationMethod) && didDocument.verificationMethod.length > 0)) {
      throw new Error(`${this.name}: DID document for '${didUri}' is missing verification methods`);
    }

    // Validate that the key material for every verification method in the DID document is present
    // in the provided key manager.
    for (let vm of didDocument.verificationMethod) {
      if (!vm.publicKeyJwk) {
        throw new Error(`${this.name}: Verification method '${vm.id}' does not contain a public key in JWK format`);
      }

      // Compute the key URI of the verification method's public key.
      const keyUri = await keyManager.getKeyUri({ key: vm.publicKeyJwk });

      // Verify that the key is present in the key manager. If not, an error is thrown.
      await keyManager.getPublicKey({ keyUri });
    }

    // DID Metadata is initially empty for this DID method.
    const metadata: DidMetadata = {};

    // Define a function that returns a signer for the DID.
    const getSigner = async (params?: { keyUri?: string }) => await DidDht.getSigner({
      didDocument,
      keyManager,
      keyUri: params?.keyUri
    });

    return { didDocument, getSigner, keyManager, metadata, uri: didUri };
  }

  public static async fromKeys<TKms extends CryptoApi | undefined = undefined>({
    keyManager = new LocalKmsCrypto(),
    verificationMethods,
    options = {}
  }: {
    keyManager?: CryptoApi & KeyImporterExporter<KmsImportKeyParams, KeyIdentifier, KmsExportKeyParams>;
    options?: DidDhtCreateOptions<TKms>;
  } & DidKeySet): Promise<Did> {
    if (!(verificationMethods && Array.isArray(verificationMethods) && verificationMethods.length > 0)) {
      throw new Error(`${this.name}: At least one verification method is required but 0 were given`);
    }

    if (!verificationMethods?.some(vm => vm.id?.split('#').pop() === '0')) {
      throw new Error(`${this.name}: Given verification methods are missing an Identity Key`);
    }

    if (!verificationMethods?.some(vm => vm.privateKeyJwk && vm.publicKeyJwk)) {
      throw new Error(`${this.name}: All verification methods must contain a public and private key in JWK format`);
    }

    // Import the private key material for every verification method into the key manager.
    for (let vm of verificationMethods) {
      await keyManager.importKey({ key: vm.privateKeyJwk! });
    }

    // Create the DID object from the given key material, including DID document, metadata,
    // signer convenience function, and URI.
    return await DidDht.fromPublicKeys({
      keyManager,
      options,
      verificationMethods
    });
  }

  public static async getSigningMethod({ didDocument, methodId = '#0' }: {
    didDocument: DidDocument;
    methodId?: string;
  }): Promise<DidVerificationMethod | undefined> {

    const parsedDid = DidUri.parse(didDocument.id);
    if (parsedDid && parsedDid.method !== this.methodName) {
      throw new Error(`DidDht: Method not supported: ${parsedDid.method}`);
    }

    const verificationMethod = didDocument.verificationMethod?.find(vm => vm.id.includes(methodId));

    return verificationMethod;
  }

  public static async publish({ keyManager, didDocument, didTypes }: {
    keyManager: CryptoApi;
    didDocument: DidDocument;
    didTypes?: (DidDhtRegisteredDidType | keyof typeof DidDhtRegisteredDidType)[];
  }): Promise<boolean> {
    const isPublished = DidDhtDocument.publish({ keyManager, didDocument, didTypes });

    return isPublished;
  }

  public static async resolve(didUri: string, _options?: DidResolutionOptions): Promise<DidResolutionResult> {
    // Attempt to parse the DID URI.
    const parsedDid = DidUri.parse(didUri);

    return null as any;
  }

  private static async fromPublicKeys({
    keyManager,
    verificationMethods,
    options
  }: {
    keyManager: CryptoApi;
    options: DidDhtCreateOptions<CryptoApi | undefined>;
  } & DidKeySet): Promise<Did> {
    // Validate that the given verification methods contain an Identity Key.
    const identityKey = verificationMethods?.find(vm => vm.id?.split('#').pop() === '0')?.publicKeyJwk;
    if (!identityKey) {
      throw new Error('DidDht: Identity Key not found in verification methods');
    }

    // Compute the DID identifier from the Identity Key.
    const id = await DidDht.encodeIdentifier({ identityKey });

    // Begin constructing the DID Document.
    const didDocument: DidDocument = {
      id,
      ...options.alsoKnownAs && { alsoKnownAs: options.alsoKnownAs },
      ...options.controllers && { controller: options.controllers }
    };

    // Add verification methods to the DID document.
    for (const vm of verificationMethods) {
      if (!vm.publicKeyJwk) {
        throw new Error(`DidJwk: Verification method '${vm.id}' does not contain a public key in JWK format`);
      }

      // Use the given ID, the key's ID, or the key's thumbprint as the verification method ID.
      let methodId = vm.id ?? vm.publicKeyJwk.kid ?? await computeJwkThumbprint({ jwk: vm.publicKeyJwk });
      methodId = `${id}#${methodId.split('#').pop()}`; // Remove fragment prefix, if any.

      // Initialize the `verificationMethod` array if it does not already exist.
      didDocument.verificationMethod ??= [];

      // Add the verification method to the DID document.
      didDocument.verificationMethod.push({
        id           : methodId,
        type         : 'JsonWebKey',
        controller   : vm.controller ?? id,
        publicKeyJwk : vm.publicKeyJwk,
      });

      // Add the verification method to the specified purpose properties of the DID document.
      for (const purpose of vm.purposes ?? []) {
        // Initialize the purpose property if it does not already exist.
        if (!didDocument[purpose]) didDocument[purpose] = [];
        // Add the verification method to the purpose property.
        didDocument[purpose]!.push(methodId);
      }
    }

    // Add services, if any, to the DID document.
    options.services?.forEach(service => {
      didDocument.service ??= [];
      service.id = `${id}#${service.id.split('#').pop()}`; // Remove fragment prefix, if any.
      didDocument.service.push(service);
    });

    // By default, publish the DID document to a DHT Gateway unless explicitly disabled.
    if (options.publish ?? true) {
      await this.publish({ keyManager, didDocument, didTypes: options.didTypes });
    }

    // DID Metadata is initially empty for this DID method.
    const metadata: DidMetadata = {};

    // Define a function that returns a signer for the DID.
    const getSigner = async (params?: { keyUri?: string }) => await DidDht.getSigner({
      didDocument,
      keyManager,
      keyUri: params?.keyUri
    });

    return { didDocument, getSigner, keyManager, metadata, uri: id };
  }

  private static async generateKeySet({
    keyManager,
    verificationMethods
  }: {
    keyManager: CryptoApi;
    verificationMethods?: DidCreateVerificationMethod<CryptoApi | undefined>[];
  }): Promise<DidKeySet> {
    let keySet: DidKeySet = {};
    // If `verificationMethodKeys` was not provided, create one.
    if (!verificationMethods) verificationMethods = [];

    // If the given verification methods do not contain an Identity Key, add one.
    if (!verificationMethods?.some(vm => vm.id?.split('#').pop() === '0')) {
      // Add the Identity Key to the key set.
      verificationMethods.push({
        algorithm : 'Ed25519' as any,
        id        : '0',
        purposes  : ['authentication', 'assertionMethod', 'capabilityDelegation', 'capabilityInvocation']
      });
    }

    // Generate keys and add verification methods to the key set.
    for (const vm of verificationMethods) {
      // Generate a new random key for the verification method.
      const keyUri = await keyManager.generateKey({ algorithm: vm.algorithm });
      const publicKey = await keyManager.getPublicKey({ keyUri });

      // Initialize the verification methods array if it does not already exist.
      keySet.verificationMethods ??= [];

      // Add the verification method to the key set.
      keySet.verificationMethods.push({
        id           : vm.id,
        type         : 'JsonWebKey',
        controller   : vm.controller,
        publicKeyJwk : publicKey,
        purposes     : vm.purposes
      });
    }

    return keySet;
  }

  private static async decodeIdentifier({ didUri }: {
    didUri: string
  }): Promise<Jwk> {
    // Parse the DID URI.
    const parsedDid = DidUri.parse(didUri);

    // Verify that the DID URI is valid.
    if (!(parsedDid && parsedDid.method === this.methodName)) {
      throw new Error(`${this.name}: Invalid DID URI: ${didUri}`);
    }

    // Decode the method-specific identifier from Base32Z to a byte array.
    let identityKeyBytes: Uint8Array | undefined;
    try {
      identityKeyBytes = Convert.base32Z(parsedDid.id).toUint8Array();
    } catch { /* Capture error */ }

    if (!identityKeyBytes || identityKeyBytes.length !== 32) {
      throw new Error(`${this.name}: Failed to decode method-specific identifier`);
    }

    // Convert the key from a byte array to JWK format.
    const publicKey = await Ed25519.bytesToPublicKey({ publicKeyBytes: identityKeyBytes });

    return publicKey;
  }

  /**
   * Encodes a DID DHT Identity Key into a DID identifier.
   *
   * This method first z-base-32 encodes the Identity Key. The resulting string is prefixed with
   * `did:dht:` to form the DID identifier.
   *
   * @param params The parameters to use when computing the DID identifier.
   * @param params.identityKey The Identity Key from which the DID identifier is computed.
   * @returns A promise that resolves to a string containing the DID identifier.
   */
  private static async encodeIdentifier({ identityKey }: {
    identityKey: Jwk
  }): Promise<string> {
    // Convert the key from JWK format to a byte array.
    const publicKeyBytes = await Ed25519.publicKeyToBytes({ publicKey: identityKey });

    // Encode the byte array as a Base32Z string.
    const identifier = Convert.uint8Array(publicKeyBytes).toBase32Z();

    return `did:${DidDht.methodName}:${identifier}`;
  }
}

class DidDhtDocument {
  public static async publish({ keyManager, didDocument, didTypes }: {
    keyManager: CryptoApi;
    didDocument: DidDocument;
    didTypes?: (DidDhtRegisteredDidType | keyof typeof DidDhtRegisteredDidType)[];
  }): Promise<boolean> {
    const dnsPacket = await DidDhtDocument.toDnsPacket({ didDocument, didTypes });

    return null as any;
  }

  private static async fromDnsPacket({ didUri, dnsPacket }: {
    didUri: string;
    dnsPacket: Packet;
  }): Promise<DidDocument> {
    // Begin constructing the DID Document.
    const didDocument: DidDocument = { id: didUri };

    const __ = dnsPacket;
    return null as any;
  }

  private static async toDnsPacket({ didDocument, didTypes }: {
    didDocument: DidDocument;
    didTypes?: (DidDhtRegisteredDidType | keyof typeof DidDhtRegisteredDidType)[];
  }): Promise<Packet> {
    // Initialize the DNS response packet, with the authoritative answer flag set.
    const dnsPacket: Packet = {
      type  : 'response',
      id    : 0,
      flags : AUTHORITATIVE_ANSWER,
    };

    // Initialize the DNS packet's answer array.
    dnsPacket.answers = [];

    const verificationMethodIds: string[] = [];
    const serviceIds: string[] = [];
    const rootRecord: string[] = [];
    const keyLookup = new Map<string, string>();

    // Add key records for each verification method
    didDocument.verificationMethod?.forEach(async (vm, index) => {
      const dnsRecordId = `k${index}`;
      let methodId = vm.id.split('#').pop()!; // Remove fragment prefix, if any.
      keyLookup.set(methodId, dnsRecordId);

      const publicKey = vm.publicKeyJwk;

      if (!(publicKey?.crv && publicKey.crv in DidDhtRegisteredKeyType)) {
        throw new Error(`DidDht: Verification method '${vm.id}' contains an unsupported key type: ${publicKey?.crv ?? 'undefined'}`);
      }

      // Use the public key's `crv` property to get the DID DHT key type.
      const keyType = DidDhtRegisteredKeyType[publicKey.crv];

      // Convert the public key from JWK format to a byte array.
      let publicKeyBytes;
      switch (publicKey.crv) {
        case 'Ed25519':
          publicKeyBytes = await Ed25519.publicKeyToBytes({ publicKey});
          break;
        case 'secp256k1':
          publicKeyBytes = await Secp256k1.publicKeyToBytes({ publicKey});
          break;
        case 'secp256r1':
          publicKeyBytes = Secp256r1PublicKeyToBytes(vm.publicKeyJwk.x);
          break;
      }

      // const keyRecord: TxtAnswer = {
      //   type : 'TXT',
      //   name : `_${dnsRecordId}._did`,
      //   ttl  : TTL,
      //   data : `id=${vmId},t=${keyType},k=${keyBase64Url}`
      // };

      // packet.answers.push(keyRecord);
      // vmIds.push(dnsRecordId);
    });

    const results = didDocument.verificationMethod.map(async vm => {
      // Get the crv value
      const crv = vm.publicKeyJwk.crv;

      // Use the crv value to get the keyType from the DidDhtRegisteredKeyType mapping
      const keyType = DidDhtRegisteredKeyType[crv as keyof typeof DidDhtRegisteredKeyType];

      // Depending on the crv value, call the appropriate publicKeyToBytes() function and get the public key in bytes
      let publicKeyBytes;
      switch (crv) {
        case 'Ed25519':
          publicKeyBytes = await Ed25519.publicKeyToBytes(vm.publicKeyJw);
          break;
        case 'secp256k1':
          publicKeyBytes = Secp256k1PublicKeyToBytes(vm.publicKeyJwk.x);
          break;
        case 'secp256r1':
          publicKeyBytes = Secp256r1PublicKeyToBytes(vm.publicKeyJwk.x);
          break;
      }

      // Return an object that contains the keyType and the public key in bytes
      return { keyType, publicKeyBytes };
    });

    return null as any;
  }
}

const processVerificationMethods = async (didDocument: DidDocument) => {
  return didDocument.verificationMethod?.map(async (vm, index) => {
    const dnsRecordId = `k${index}`;
    let methodId = vm.id.split('#').pop()!; // Remove fragment prefix, if any.

    if (!(vm.publicKeyJwk?.crv && vm.publicKeyJwk.crv in DidDhtRegisteredKeyType)) {
      throw new Error(`DidDht: Verification method '${vm.id}' contains unsupported key type: ${vm.publicKeyJwk?.crv ?? 'undefined'}`);
    }

    const keyType = DidDhtRegisteredKeyType[vm.publicKeyJwk.crv];

    switch(vm.publicKeyJwk.crv) {
      case 'Ed25519':
        return { keyType, publicKeyBytes: await Ed25519.publicKeyToBytes({ publicKey: vm.publicKeyJwk }) };
      case 'secp256k1':
        return { keyType, publicKeyBytes: await Secp256k1.publicKeyToBytes({ publicKey: vm.publicKeyJwk }) };
      default:
        throw new Error(`Unsupported curve type: ${vm.publicKeyJwk.crv}`);
    }
  });
};
