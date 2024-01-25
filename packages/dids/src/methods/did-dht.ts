import type { Packet, TxtAnswer, TxtData } from '@dnsquery/dns-packet';
import type {
  Jwk,
  Signer,
  KeyIdentifier,
  KmsExportKeyParams,
  KmsImportKeyParams,
  KeyImporterExporter,
  AsymmetricKeyConverter,
} from '@web5/crypto';

import bencode from 'bencode';
import { Convert } from '@web5/common';
import { CryptoApi, Ed25519, LocalKmsCrypto, P256, Secp256k1, computeJwkThumbprint } from '@web5/crypto';
import { AUTHORITATIVE_ANSWER, decode as dnsPacketDecode, encode as dnsPacketEncode } from '@dnsquery/dns-packet';

import type { Did, DidCreateOptions, DidCreateVerificationMethod, DidMetadata, PortableDid } from './did-method.js';
import type {
  DidService,
  DidDocument,
  DidResolutionResult,
  DidResolutionOptions,
  DidVerificationMethod,
} from '../types/did-core.js';

import { DidUri } from '../did-uri.js';
import { DidMethod } from './did-method.js';
import { DidError, DidErrorCode } from '../did-error.js';
import { DidVerificationRelationship } from '../types/did-core.js';
import { EMPTY_DID_RESOLUTION_RESULT } from '../resolver/did-resolver.js';

interface Bep44Message {
  k: Uint8Array;
  seq: number;
  sig: Uint8Array;
  v: Uint8Array;
}

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
  types?: (DidDhtRegisteredDidType | keyof typeof DidDhtRegisteredDidType)[];

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

const DEFAULT_PKARR_RELAY = 'https://diddht.tbddev.org';

/**
 * The version of the DID DHT specification that is implemented by this library.
 *
 * When a DID DHT document is published to the DHT network, the version of the specification that
 * was used to create the document is included in the DNS TXT record for the root record. This
 * allows clients to determine whether the DID DHT document is compatible with the client's
 * implementation of the DID DHT specification. The version number is not present in the
 * corresponding DID document.
 *
 * @see {@link https://did-dht.com | DID DHT Method Specification}
 */
const DID_DHT_SPECIFICATION_VERSION = 0;

/**
 * The default TTL for DNS records published to the DHT network.
 *
 * The recommended TTL value is 7200 seconds (2 hours) since it matches the default TTL for
 * Mainline DHT records.
 */
const DNS_RECORD_TTL = 7200;

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
  Discoverable         = 0,
  Organization         = 1,
  Government           = 2,
  Corporation          = 3,
  LocalBusiness        = 4,
  SoftwarePackage      = 5,
  WebApp               = 6,
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
export enum DidDhtRegisteredKeyType {
  Ed25519   = 0,
  secp256k1 = 1,
  secp256r1 = 2
}

export enum DidDhtVerificationRelationship {
  authentication       = 'auth',
  assertionMethod      = 'asm',
  capabilityDelegation = 'del',
  capabilityInvocation = 'inv',
  keyAgreement         = 'agm'
}

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
      throw new Error('One or more verification method algorithms are not supported');
    }

    // Check 2: Validate that the required properties for any given services are present.
    if (options.services?.some(s => !s.id || !s.type || !s.serviceEndpoint)) {
      throw new Error('One or more services are missing required properties');
    }

    // Generate random key material for the Identity Key and any additional verification methods.
    const keySet = await DidDht.generateKeys({
      keyManager,
      verificationMethods: options.verificationMethods ?? []
    });

    // Create the DID object from the generated key material, including DID document, metadata,
    // signer convenience function, and URI.
    const did = await DidDht.fromPublicKeys({ keyManager, options, ...keySet });

    // By default, publish the DID document to a DHT Gateway unless explicitly disabled.
    if (options.publish ?? true) {
      const isPublished = await this.publish({ did });
      did.metadata.published = isPublished;
    }

    return did;
  }

  public static async fromKeyManager({ didUri, keyManager }: {
    didUri: string;
    keyManager: CryptoApi;
  }): Promise<Did> {
    // Resolve the DID URI to a DID document and document metadata.
    const { didDocument, didDocumentMetadata, didResolutionMetadata } = await DidDht.resolve(didUri);

    // If the given DID isn't "did:dht", throw an error.
    if (didResolutionMetadata.error === DidErrorCode.MethodNotSupported) {
      throw new DidError(DidErrorCode.MethodNotSupported, `Method not supported`);
    }

    // Verify the DID Resolution Result includes a DID document containing verification methods.
    if (!(didDocument && Array.isArray(didDocument.verificationMethod) && didDocument.verificationMethod.length > 0)) {
      throw new Error(`DID document for '${didUri}' is missing verification methods`);
    }

    // Validate that the key material for every verification method in the DID document is present
    // in the provided key manager.
    for (let vm of didDocument.verificationMethod) {
      if (!vm.publicKeyJwk) {
        throw new Error(`Verification method '${vm.id}' does not contain a public key in JWK format`);
      }

      // Compute the key URI of the verification method's public key.
      const keyUri = await keyManager.getKeyUri({ key: vm.publicKeyJwk });

      // Verify that the key is present in the key manager. If not, an error is thrown.
      await keyManager.getPublicKey({ keyUri });
    }

    // Define DID Metadata, including the registered DID types and published state.
    const metadata: DidMetadata = {
      ...didDocumentMetadata?.published && { published: didDocumentMetadata.published },
      ...didDocumentMetadata?.types && { types: didDocumentMetadata.types }
    };

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
    uri,
    verificationMethods,
    options = {}
  }: {
    keyManager?: CryptoApi & KeyImporterExporter<KmsImportKeyParams, KeyIdentifier, KmsExportKeyParams>;
    options?: DidDhtCreateOptions<TKms>;
  } & PortableDid): Promise<Did> {
    if (!(verificationMethods && Array.isArray(verificationMethods) && verificationMethods.length > 0)) {
      throw new Error(`At least one verification method is required but 0 were given`);
    }

    if (!verificationMethods?.some(vm => vm.id?.split('#').pop() === '0')) {
      throw new Error(`Given verification methods are missing an Identity Key`);
    }

    if (!verificationMethods?.some(vm => vm.privateKeyJwk && vm.publicKeyJwk)) {
      throw new Error(`All verification methods must contain a public and private key in JWK format`);
    }

    // Import the private key material for every verification method into the key manager.
    for (let vm of verificationMethods) {
      await keyManager.importKey({ key: vm.privateKeyJwk! });
    }

    // If the DID URI is provided, resolve the DID document and metadata from the DHT network and
    // use it to construct the DID object.
    if (uri) {
      return await DidDht.fromKeyManager({ didUri: uri, keyManager });
    } else {
      // Otherwise, use the given key material and options to construct the DID object.
      const did = await DidDht.fromPublicKeys({ keyManager, verificationMethods, options });

      // By default, the DID document will NOT be published unless explicitly enabled.
      did.metadata.published = options.publish ? await this.publish({ did }) : false;

      return did;
    }
  }

  public static async getSigningMethod({ didDocument, methodId = '#0' }: {
    didDocument: DidDocument;
    methodId?: string;
  }): Promise<DidVerificationMethod | undefined> {

    const parsedDid = DidUri.parse(didDocument.id);
    if (parsedDid && parsedDid.method !== this.methodName) {
      throw new Error(`Method not supported: ${parsedDid.method}`);
    }

    const verificationMethod = didDocument.verificationMethod?.find(vm => vm.id.endsWith(methodId));

    return verificationMethod;
  }

  public static async publish({ did, relay = DEFAULT_PKARR_RELAY }: {
    did: Did;
    relay?: string;
  }): Promise<boolean> {
    const isPublished = await DidDhtDocument.put({ did, relay });

    return isPublished;
  }

  public static async resolve(didUri: string, options: DidResolutionOptions = {}): Promise<DidResolutionResult> {
    // Use the given Pkarr relay or the default.
    const relay = options?.pkarrRelay ?? DEFAULT_PKARR_RELAY;

    try {
      // Attempt to decode the z-base-32-encoded identifier.
      await DidDhtUtils.identifierToIdentityKey({ didUri });

      // Attempt to retrieve the DID document and metadata from the DHT network.
      const { didDocument, didMetadata } = await DidDhtDocument.get({ didUri, relay });

      // If the DID document was retrieved successfully, return it.
      return {
        ...EMPTY_DID_RESOLUTION_RESULT,
        didDocument,
        didDocumentMetadata: { published: true, ...didMetadata }
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

  private static async fromPublicKeys({
    keyManager,
    verificationMethods,
    options
  }: {
    keyManager: CryptoApi;
    options: DidDhtCreateOptions<CryptoApi | undefined>;
  } & PortableDid): Promise<Did> {
    // Validate that the given verification methods contain an Identity Key.
    const identityKey = verificationMethods?.find(vm => vm.id?.split('#').pop() === '0')?.publicKeyJwk;
    if (!identityKey) {
      throw new Error('Identity Key not found in verification methods');
    }

    // Compute the DID identifier from the Identity Key.
    const id = await DidDhtUtils.identityKeyToIdentifier({ identityKey });

    // Begin constructing the DID Document.
    const didDocument: DidDocument = {
      id,
      ...options.alsoKnownAs && { alsoKnownAs: options.alsoKnownAs },
      ...options.controllers && { controller: options.controllers }
    };

    // Add verification methods to the DID document.
    for (const vm of verificationMethods) {
      if (!vm.publicKeyJwk) {
        throw new Error(`Verification method '${vm.id}' does not contain a public key in JWK format`);
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

    // Define DID Metadata, including the registered DID types (if any).
    const metadata: DidMetadata = {
      ...options.types && { types: options.types }
    };

    // Define a function that returns a signer for the DID.
    const getSigner = async (params?: { keyUri?: string }) => await DidDht.getSigner({
      didDocument,
      keyManager,
      keyUri: params?.keyUri
    });

    return { didDocument, getSigner, keyManager, metadata, uri: id };
  }

  private static async generateKeys({
    keyManager,
    verificationMethods
  }: {
    keyManager: CryptoApi;
    verificationMethods?: DidCreateVerificationMethod<CryptoApi | undefined>[];
  }): Promise<PortableDid> {
    let portableDid: PortableDid = {
      verificationMethods: []
    };

    // If `verificationMethodKeys` was not provided, initialize it as an empty array.
    verificationMethods ??= [];

    // If the given verification methods do not contain an Identity Key, add one.
    if (!verificationMethods?.some(vm => vm.id?.split('#').pop() === '0')) {
      // Add the Identity Key to the beginning of the key set.
      verificationMethods.unshift({
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

      // Add the verification method to the `PortableDid`.
      portableDid.verificationMethods.push({
        id           : vm.id,
        type         : 'JsonWebKey',
        controller   : vm.controller,
        publicKeyJwk : publicKey,
        purposes     : vm.purposes
      });
    }

    return portableDid;
  }
}

class DidDhtDocument {
  public static async get({ didUri, relay }: {
    didUri: string;
    relay: string;
  }): Promise<{ didDocument: DidDocument, didMetadata: DidMetadata }> {
    // Decode the z-base-32 DID identifier to public key as a byte array.
    const publicKeyBytes = DidDhtUtils.identifierToIdentityKeyBytes({ didUri });

    // Retrieve the signed BEP44 message from a Pkarr relay.
    const bep44Message = await DidDhtDocument.pkarrGet({ relay, publicKeyBytes });

    // Verify the signature of the BEP44 message and parse the value to a DNS packet.
    const dnsPacket = await DidDhtUtils.parseBep44GetMessage({ bep44Message });

    // Convert the DNS packet to a DID document and DID metadata.
    const { didDocument, didMetadata } = await DidDhtDocument.fromDnsPacket({ didUri, dnsPacket });

    return { didDocument, didMetadata };
  }

  /**
   *
   * @param params - The parameters to use when publishing the DID document to the DHT network.
   * @param params.did - The DID object to publish.
   * @param params.relay - The Pkarr relay to use when publishing the DID document.
   * @returns A promise that resolves to `true` if the DID document was published successfully.
   *          If publishing fails, `false` is returned.
   */
  public static async put({ did, relay }: {
    did: Did;
    relay: string;
  }): Promise<boolean> {
    // Convert the DID document and DID metadata (such as DID types) to a DNS packet.
    const dnsPacket = await DidDhtDocument.toDnsPacket({
      didDocument : did.didDocument,
      didMetadata : did.metadata
    });

    // Create a signed BEP44 put message from the DNS packet.
    const bep44Message = await DidDhtUtils.createBep44PutMessage({
      dnsPacket,
      publicKeyBytes : DidDhtUtils.identifierToIdentityKeyBytes({ didUri: did.uri }),
      signer         : await did.getSigner()
    });

    // Publish the DNS packet to the DHT network.
    const putResult = await DidDhtDocument.pkarrPut({ relay, bep44Message });

    return putResult;
  }

  private static async pkarrGet({ relay, publicKeyBytes }: {
    publicKeyBytes: Uint8Array;
    relay: string;
  }): Promise<Bep44Message> {
    // The identifier (key in the DHT) is the z-base-32 encoding of the Identity Key.
    const identifier = Convert.uint8Array(publicKeyBytes).toBase32Z();

    // Concatenate the Pkarr relay URL with the identifier to form the full URL.
    const url = new URL(identifier, relay).href;

    // Transmit the Get request to the Pkarr relay and get the response.
    let response: Response;
    try {
      response = await fetch(url, { method: 'GET' });

      if (!response.ok) {
        throw new DidError(DidErrorCode.NotFound, `Pkarr record not found for: ${identifier}`);
      }

    } catch (error: any) {
      if (error instanceof DidError) throw error;
      throw new DidError(DidErrorCode.InternalError, `Failed to fetch Pkarr record: ${error.message}`);
    }

    // Read the Fetch Response stream into a byte array.
    const messageBytes = await response.arrayBuffer();

    if (messageBytes.byteLength < 72) {
      throw new DidError(DidErrorCode.InvalidDidDocumentLength, `Pkarr response must be at least 72 bytes but got: ${messageBytes.byteLength}`);
    }

    if (messageBytes.byteLength > 1072) {
      throw new DidError(DidErrorCode.InvalidDidDocumentLength, `Pkarr response exceeds 1000 byte limit: ${messageBytes.byteLength}`);
    }

    // Decode the BEP44 message from the byte array.
    const bep44Message: Bep44Message = {
      k   : publicKeyBytes,
      seq : Number(new DataView(messageBytes).getBigUint64(64)),
      sig : new Uint8Array(messageBytes, 0, 64),
      v   : new Uint8Array(messageBytes, 72)
    };

    return bep44Message;
  }

  private static async pkarrPut({ relay, bep44Message }: {
    bep44Message: Bep44Message;
    relay: string;
  }): Promise<boolean> {
    // The identifier (key in the DHT) is the z-base-32 encoding of the Identity Key.
    const identifier = Convert.uint8Array(bep44Message.k).toBase32Z();

    // Concatenate the Pkarr relay URL with the identifier to form the full URL.
    const url = new URL(identifier, relay).href;

    // Construct the body of the request according to the Pkarr relay specification.
    const body = new Uint8Array(bep44Message.v.length + 72);
    body.set(bep44Message.sig, 0);
    new DataView(body.buffer).setBigUint64(bep44Message.sig.length, BigInt(bep44Message.seq));
    body.set(bep44Message.v, bep44Message.sig.length + 8);

    // Transmit the Put request to the Pkarr relay and get the response.
    let response: Response;
    try {
      response = await fetch(url, {
        method  : 'PUT',
        headers : { 'Content-Type': 'application/octet-stream' },
        body
      });

    } catch (error: any) {
      throw new DidError(DidErrorCode.InternalError, `Failed to put Pkarr record: ${error.message}`);
    }

    // Return `true` if the DHT request was successful, otherwise return `false`.
    return response.ok;
  }

  /**
   * Converts a DNS packet to a DID document according to the DID DHT specification.
   *
   * @see {@link https://did-dht.com/#dids-as-dns-records | DID DHT Specification, § DIDs as DNS Records}
   *
   * @param params - The parameters to use when converting a DNS packet to a DID document.
   * @param params.didUri - The DID URI of the DID document.
   * @param params.dnsPacket - The DNS packet to convert to a DID document.
   * @returns A promise that resolves to a DID document.
   */
  private static async fromDnsPacket({ didUri, dnsPacket }: {
    didUri: string;
    dnsPacket: Packet;
  }): Promise<{ didDocument: DidDocument, didMetadata: DidMetadata }> {
    // Begin constructing the DID Document.
    const didDocument: DidDocument = { id: didUri };
    const didMetadata: DidMetadata = {};

    const idLookup = new Map<string, string>();

    for (const answer of dnsPacket?.answers ?? []) {
      // DID DHT properties are ONLY present in DNS TXT records.
      if (answer.type !== 'TXT') continue;

      // Get the DID DHT record identifier (e.g., k0, aka, did, etc.) from the DNS resource name.
      const dnsRecordId = answer.name.split('.')[0].substring(1);

      switch (true) {
        // Process an also known as record.
        case dnsRecordId.startsWith('aka'): {
          // Decode the DNS TXT record data value to a string.
          const data = DidDhtUtils.parseTxtDataToString(answer.data);

          // Add the 'alsoKnownAs' property to the DID document.
          didDocument.alsoKnownAs = data.split(VALUE_SEPARATOR);

          break;
        }

        // Process a controller record.
        case dnsRecordId.startsWith('cnt'): {
          // Decode the DNS TXT record data value to a string.
          const data = DidDhtUtils.parseTxtDataToString(answer.data);

          // Add the 'controller' property to the DID document.
          didDocument.controller = data.includes(VALUE_SEPARATOR) ? data.split(VALUE_SEPARATOR) : data;

          break;
        }

        // Process verification methods.
        case dnsRecordId.startsWith('k'): {
          // Get the method ID fragment (id), key type (t), Base64URL-encoded public key (k), and
          // optionally, controller (c) from the decoded TXT record data.
          const { id, t, k, c } = DidDhtUtils.parseTxtDataToObject(answer.data);

          // Convert the public key from Base64URL format to a byte array.
          const publicKeyBytes = Convert.base64Url(k).toUint8Array();

          // Use the key type integer to look up the cryptographic curve name.
          const namedCurve = DidDhtRegisteredKeyType[Number(t)];

          // Convert the public key from a byte array to JWK format.
          let publicKey = await DidDhtUtils.keyConverter(namedCurve).bytesToPublicKey({ publicKeyBytes });

          // Initialize the `verificationMethod` array if it does not already exist.
          didDocument.verificationMethod ??= [];

          // Prepend the DID URI to the ID fragment to form the full verification method ID.
          const methodId = `${didUri}#${id}`;

          // Add the verification method to the DID document.
          didDocument.verificationMethod.push({
            id           : methodId,
            type         : 'JsonWebKey',
            controller   : c ?? didUri,
            publicKeyJwk : publicKey,
          });

          // Add a mapping from the DNS record ID (e.g., 'k0', 'k1', etc.) to the verification
          // method ID (e.g., 'did:dht:...#0', etc.).
          idLookup.set(dnsRecordId, methodId);

          break;
        }

        // Process services.
        case dnsRecordId.startsWith('s'): {
          // Get the service ID fragment (id), type (t), service endpoint (se), and optionally,
          // other properties from the decoded TXT record data.
          const { id, t, se, ...customProperties } = DidDhtUtils.parseTxtDataToObject(answer.data);

          // The service endpoint can either be a string or an array of strings.
          const serviceEndpoint = se.includes(VALUE_SEPARATOR) ? se.split(VALUE_SEPARATOR) : se;

          // Initialize the `service` array if it does not already exist.
          didDocument.service ??= [];

          didDocument.service.push({
            ...customProperties,
            id   : `${didUri}#${id}`,
            type : t,
            serviceEndpoint
          });

          break;
        }

        // Process DID DHT types.
        case dnsRecordId.startsWith('typ'): {
          // Decode the DNS TXT record data value to an object.
          const { id: types } = DidDhtUtils.parseTxtDataToObject(answer.data);

          // Add the DID DHT Registered DID Types represented as numbers to DID metadata.
          didMetadata.types = types.split(VALUE_SEPARATOR).map(typeInteger => Number(typeInteger));

          break;
        }

        // Process root record.
        case dnsRecordId.startsWith('did'): {
          // Helper function that maps verification relationship values to verification method IDs.
          const recordIdsToMethodIds = (data: string): string[] => data
            .split(VALUE_SEPARATOR)
            .map(dnsRecordId => idLookup.get(dnsRecordId))
            .filter((id): id is string => typeof id === 'string');

          // Decode the DNS TXT record data and destructure verification relationship properties.
          const { auth, asm, del, inv, agm } = DidDhtUtils.parseTxtDataToObject(answer.data);

          // Add the verification relationships, if any, to the DID document.
          if (auth) didDocument.authentication = recordIdsToMethodIds(auth);
          if (asm) didDocument.assertionMethod = recordIdsToMethodIds(asm);
          if (del) didDocument.capabilityDelegation = recordIdsToMethodIds(del);
          if (inv) didDocument.capabilityInvocation = recordIdsToMethodIds(inv);
          if (agm) didDocument.keyAgreement = recordIdsToMethodIds(agm);

          break;
        }
      }
    }

    return { didDocument, didMetadata };
  }

  /**
   * Converts a DID document to a DNS packet according to the DID DHT specification.
   *
   * @see {@link https://did-dht.com/#dids-as-dns-records | DID DHT Specification, § DIDs as DNS Records}
   *
   * @param params - The parameters to use when converting a DID document to a DNS packet.
   * @param params.didDocument - The DID document to convert to a DNS packet.
   * @param params.didMetadata - The DID metadata to include in the DNS packet.
   * @returns A promise that resolves to a DNS packet.
   */
  private static async toDnsPacket({ didDocument, didMetadata }: {
    didDocument: DidDocument;
    didMetadata: DidMetadata;
  }): Promise<Packet> {
    const dnsAnswerRecords: TxtAnswer[] = [];
    const idLookup = new Map<string, string>();
    const serviceIds: string[] = [];
    const verificationMethodIds: string[] = [];

    // Add DNS TXT records if the DID document contains an `alsoKnownAs` property.
    if (didDocument.alsoKnownAs) {
      dnsAnswerRecords.push({
        type : 'TXT',
        name : '_aka.did.',
        ttl  : DNS_RECORD_TTL,
        data : didDocument.alsoKnownAs.join(VALUE_SEPARATOR)
      });
    }

    // Add DNS TXT records if the DID document contains a `controller` property.
    if (didDocument.controller) {
      const controller = Array.isArray(didDocument.controller)
        ? didDocument.controller.join(VALUE_SEPARATOR)
        : didDocument.controller;
      dnsAnswerRecords.push({
        type : 'TXT',
        name : '_cnt.did.',
        ttl  : DNS_RECORD_TTL,
        data : controller
      });
    }

    // Add DNS TXT records for each verification method.
    for (const [index, vm] of didDocument.verificationMethod?.entries() ?? []) {
      const dnsRecordId = `k${index}`;
      verificationMethodIds.push(dnsRecordId);
      let methodId = vm.id.split('#').pop()!; // Remove fragment prefix, if any.
      idLookup.set(methodId, dnsRecordId);

      const publicKey = vm.publicKeyJwk;

      if (!(publicKey?.crv && publicKey.crv in DidDhtRegisteredKeyType)) {
        throw new DidError(DidErrorCode.InvalidPublicKeyType, `Verification method '${vm.id}' contains an unsupported key type: ${publicKey?.crv ?? 'undefined'}`);
      }

      // Use the public key's `crv` property to get the DID DHT key type.
      const keyType = DidDhtRegisteredKeyType[publicKey.crv as keyof typeof DidDhtRegisteredKeyType];

      // Convert the public key from JWK format to a byte array.
      const publicKeyBytes = await DidDhtUtils.keyConverter(publicKey.crv).publicKeyToBytes({ publicKey });

      // Convert the public key from a byte array to Base64URL format.
      const publicKeyBase64Url = Convert.uint8Array(publicKeyBytes).toBase64Url();

      // Define the data for the DNS TXT record.
      const txtData = [`id=${methodId}`, `t=${keyType}`, `k=${publicKeyBase64Url}`];

      // Add the controller property, if set to a value other than the Identity Key (DID Subject).
      if (vm.controller !== didDocument.id) txtData.push(`c=${vm.controller}`);

      // Add a TXT record for the verification method.
      dnsAnswerRecords.push({
        type : 'TXT',
        name : `_${dnsRecordId}._did.`,
        ttl  : DNS_RECORD_TTL,
        data : txtData.join(PROPERTY_SEPARATOR)
      });
    }

    // Add DNS TXT records for each service.
    didDocument.service?.forEach((service, index) => {
      const dnsRecordId = `s${index}`;
      serviceIds.push(dnsRecordId);
      const serviceId = service.id.split('#').pop()!; // Remove fragment prefix, if any.
      const serviceEndpoint = Array.isArray(service.serviceEndpoint)
        ? service.serviceEndpoint.join(',')
        : service.serviceEndpoint;

      // Define the data for the DNS TXT record.
      const txtData = [`id=${serviceId}`, `t=${service.type}`, `se=${serviceEndpoint}`];

      // Add a TXT record for the verification method.
      dnsAnswerRecords.push({
        type : 'TXT',
        name : `_${dnsRecordId}._did.`,
        ttl  : DNS_RECORD_TTL,
        data : txtData.join(PROPERTY_SEPARATOR)
      });
    });

    // Initialize the root DNS TXT record with the DID DHT specification version.
    const rootRecord: string[] = [`v=${DID_DHT_SPECIFICATION_VERSION}`];

    // Add verification methods to the root record.
    if (verificationMethodIds.length) {
      rootRecord.push(`vm=${verificationMethodIds.join(VALUE_SEPARATOR)}`);
    }

    // Add verification relationships to the root record.
    Object.keys(DidVerificationRelationship).forEach(relationship => {
      // Collect the verification method IDs for the given relationship.
      const dnsRecordIds = (didDocument[relationship as keyof DidDocument] as any[])
        ?.map(id => idLookup.get(id.split('#').pop()));

      // If the relationship includes verification methods, add them to the root record.
      if (dnsRecordIds) {
        const recordName = DidDhtVerificationRelationship[relationship as keyof typeof DidDhtVerificationRelationship];
        rootRecord.push(`${recordName}=${dnsRecordIds.join(VALUE_SEPARATOR)}`);
      }
    });

    // Add services to the root record.
    if (serviceIds.length) {
      rootRecord.push(`svc=${serviceIds.join(VALUE_SEPARATOR)}`);
    }

    // If defined, add a DNS TXT record for each registered DID type.
    if (didMetadata.types?.length) {
      // DID types can be specified as either a string or a number, so we need to normalize the
      // values to integers.
      const types = didMetadata.types as (DidDhtRegisteredDidType | keyof typeof DidDhtRegisteredDidType)[];
      const typeIntegers = types.map(type => typeof type === 'string' ? DidDhtRegisteredDidType[type] : type);

      dnsAnswerRecords.push({
        type : 'TXT',
        name : '_typ._did.',
        ttl  : DNS_RECORD_TTL,
        data : `id=${typeIntegers.join(VALUE_SEPARATOR)}`
      });
    }

    // Add a DNS TXT record for the root record.
    dnsAnswerRecords.push({
      type : 'TXT',
      name : '_did.',
      ttl  : DNS_RECORD_TTL,
      data : rootRecord.join(PROPERTY_SEPARATOR)
    });

    // Per the DID DHT specification, the method-specific identifier must be appended as the
    // Origin of all records.
    const [, , identifier] = didDocument.id.split(':');
    dnsAnswerRecords.forEach(record => record.name += identifier);

    // Create a DNS response packet with the authoritative answer flag set.
    const dnsPacket: Packet = {
      id      : 0,
      type    : 'response',
      flags   : AUTHORITATIVE_ANSWER,
      answers : dnsAnswerRecords
    };

    return dnsPacket;
  }
}

class DidDhtUtils {
  /**
   *
   * @param params - The parameters to use when creating the BEP44 put message
   * @param params.dnsPacket - The DNS packet to encode in the BEP44 message.
   * @param params.publicKeyBytes - The public key bytes of the Identity Key.
   * @param params.signer - Signer that can sign and verify data using the Identity Key.
   * @returns A promise that resolves to a BEP44 put message.
   */
  public static async createBep44PutMessage({ dnsPacket, publicKeyBytes, signer }: {
      dnsPacket: Packet;
      publicKeyBytes: Uint8Array;
      signer: Signer;
    }): Promise<Bep44Message> {
    // BEP44 requires that the sequence number be a monotoically increasing integer, so we use the
    // current time in seconds since Unix epoch as a simple solution. Higher precision is not
    // recommended since DID DHT documents are not expected to change frequently and there are
    // small differences in system clocks that can cause issues if multiple clients are publishing
    // updates to the same DID document.
    const sequenceNumber = Math.ceil(Date.now() / 1000);

    // Encode the DNS packet into a byte array containing a UDP payload.
    const encodedDnsPacket = dnsPacketEncode(dnsPacket);

    // Encode the sequence and DNS byte array to bencode format.
    const bencodedData = bencode.encode({ seq: sequenceNumber, v: encodedDnsPacket }).subarray(1, -1);

    if (bencodedData.length > 1000) {
      throw new DidError(DidErrorCode.InvalidDidDocumentLength, `DNS packet exceeds the 1000 byte maximum size: ${bencodedData.length} bytes`);
    }

    // Sign the BEP44 message.
    const signature = await signer.sign({ data: bencodedData });

    return { k: publicKeyBytes, seq: sequenceNumber, sig: signature, v: encodedDnsPacket };
  }

  public static async identifierToIdentityKey({ didUri }: {
    didUri: string
  }): Promise<Jwk> {
    // Parse the DID URI.
    const parsedDid = DidUri.parse(didUri);

    // Verify that the DID URI is valid.
    if (!parsedDid) {
      throw new DidError(DidErrorCode.InvalidDid, `Invalid DID URI: ${didUri}`);
    }

    // Verify the DID method is supported.
    if (parsedDid.method !== DidDht.methodName) {
      throw new DidError(DidErrorCode.MethodNotSupported, `Method not supported: ${parsedDid.method}`);
    }

    // Decode the method-specific identifier from z-base-32 to a byte array.
    let identityKeyBytes: Uint8Array | undefined;
    try {
      identityKeyBytes = Convert.base32Z(parsedDid.id).toUint8Array();
    } catch { /* Capture error */ }

    // Verify that the method-specific identifier was decoded successfully.
    if (!identityKeyBytes || identityKeyBytes.length !== 32) {
      throw new DidError(DidErrorCode.InvalidDid, `Failed to decode method-specific identifier`);
    }

    // Convert the byte array to a JWK.
    const identityKey = await Ed25519.bytesToPublicKey({ publicKeyBytes: identityKeyBytes });

    return identityKey;
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
  public static async identityKeyToIdentifier({ identityKey }: {
    identityKey: Jwk
  }): Promise<string> {
    // Convert the key from JWK format to a byte array.
    const publicKeyBytes = await Ed25519.publicKeyToBytes({ publicKey: identityKey });

    // Encode the byte array as a z-base-32 string.
    const identifier = Convert.uint8Array(publicKeyBytes).toBase32Z();

    return `did:${DidDht.methodName}:${identifier}`;
  }

  public static identifierToIdentityKeyBytes({ didUri }: {
    didUri: string
  }): Uint8Array {
    // Parse the DID URI.
    const parsedDid = DidUri.parse(didUri);

    // Verify that the DID URI is valid.
    if (!(parsedDid && parsedDid.method === DidDht.methodName)) {
      throw new DidError(DidErrorCode.InvalidDid, `Invalid DID URI: ${didUri}`);
    }

    // Decode the method-specific identifier from z-base-32 to a byte array.
    let identityKeyBytes: Uint8Array | undefined;
    try {
      identityKeyBytes = Convert.base32Z(parsedDid.id).toUint8Array();
    } catch { /* Capture error */ }

    if (!identityKeyBytes) {
      throw new DidError(DidErrorCode.InvalidPublicKey, `Failed to decode method-specific identifier`);
    }

    if (identityKeyBytes.length !== 32) {
      throw new DidError(DidErrorCode.InvalidPublicKeyLength, `Invalid public key length: ${identityKeyBytes.length}`);
    }

    return identityKeyBytes;
  }

  public static keyConverter(curve: string): AsymmetricKeyConverter {
    const converters: Record<string, AsymmetricKeyConverter> = {
      'Ed25519'   : Ed25519,
      'secp256k1' : Secp256k1,
      'secp256r1' : P256
    };

    const converter = converters[curve];

    if (!converter) throw new DidError(DidErrorCode.InvalidPublicKeyType, `Unsupported curve: ${curve}`);

    return converter;
  }

  /**
   *
   * @param params - The parameters to use when verifying and parsing the BEP44 Get response message.
   * @param params.bep44Message - The BEP44 message to verify and parse.
   * @returns A promise that resolves to a DNS packet.
   */
  public static async parseBep44GetMessage({ bep44Message }: {
    bep44Message: Bep44Message;
  }): Promise<Packet> {
    // Convert the public key byte array to JWK format.
    const publicKey = await Ed25519.bytesToPublicKey({ publicKeyBytes: bep44Message.k });

    // Encode the sequence and DNS byte array to bencode format.
    const bencodedData = bencode.encode({ seq: bep44Message.seq, v: bep44Message.v }).subarray(1, -1);

    // Verify the signature of the BEP44 message.
    const isValid = await Ed25519.verify({
      key       : publicKey,
      signature : bep44Message.sig,
      data      : bencodedData
    });

    if (!isValid) {
      throw new DidError(DidErrorCode.InvalidSignature, `Invalid signature for DHT BEP44 message`);
    }

    return dnsPacketDecode(bep44Message.v);
  }

  /**
   * Helper function to decode and parse the data value of a DNS TXT record.
   */
  public static parseTxtDataToObject(txtData: TxtData): Record<string, string> {
    return this.parseTxtDataToString(txtData).split(PROPERTY_SEPARATOR).reduce((acc, pair) => {
      const [key, value] = pair.split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
  }

  // Helper function to convert TXT data property to a string value.
  public static parseTxtDataToString(txtData: TxtData): string {
    if (typeof txtData === 'string') {
      return txtData;
    } else if (txtData instanceof Uint8Array) {
      return Convert.uint8Array(txtData).toString();
    } else if (Array.isArray(txtData)) {
      return txtData.map(item => this.parseTxtDataToString(item)).join('');
    } else {
      throw new DidError(DidErrorCode.InternalError, 'Pkarr returned DNS TXT record with invalid data type');
    }
  }
}