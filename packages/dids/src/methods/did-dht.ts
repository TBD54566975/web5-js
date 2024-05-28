import type { Packet, StringAnswer, TxtAnswer, TxtData } from '@dnsquery/dns-packet';
import type {
  Jwk,
  Signer,
  CryptoApi,
  KeyIdentifier,
  KmsExportKeyParams,
  KmsImportKeyParams,
  KeyImporterExporter,
  AsymmetricKeyConverter,
} from '@web5/crypto';

import bencode from 'bencode';
import { Convert } from '@web5/common';
import { computeJwkThumbprint, Ed25519, LocalKeyManager, Secp256k1, Secp256r1, X25519 } from '@web5/crypto';
import { AUTHORITATIVE_ANSWER, decode as dnsPacketDecode, encode as dnsPacketEncode } from '@dnsquery/dns-packet';

import type { DidMetadata, PortableDid } from '../types/portable-did.js';
import type { DidCreateOptions, DidCreateVerificationMethod, DidRegistrationResult } from './did-method.js';
import type {
  DidService,
  DidDocument,
  DidResolutionResult,
  DidResolutionOptions,
  DidVerificationMethod,
} from '../types/did-core.js';

import { Did } from '../did.js';
import { DidMethod } from './did-method.js';
import { BearerDid } from '../bearer-did.js';
import { extractDidFragment } from '../utils.js';
import { DidError, DidErrorCode } from '../did-error.js';
import { DidVerificationRelationship } from '../types/did-core.js';
import { EMPTY_DID_RESOLUTION_RESULT } from '../types/did-resolution.js';

/**
 * Represents a BEP44 message, which is used for storing and retrieving data in the Mainline DHT
 * network.
 *
 * A BEP44 message is used primarily in the context of the DID DHT method for publishing and
 * resolving DID documents in the DHT network. This type encapsulates the data structure required
 * for such operations in accordance with BEP44.
 *
 * @see {@link https://www.bittorrent.org/beps/bep_0044.html | BEP44}
 */
export interface Bep44Message {
  /**
   * The public key bytes of the Identity Key, which serves as the identifier in the DHT network for
   * the corresponding BEP44 message.
   */
  k: Uint8Array;

  /**
   * The sequence number of the message, used to ensure the latest version of the data is retrieved
   * and updated. It's a monotonically increasing number.
   */
  seq: number;

  /**
   * The signature of the message, ensuring the authenticity and integrity of the data. It's
   * computed over the bencoded sequence number and value.
   */
  sig: Uint8Array;

  /**
   * The actual data being stored or retrieved from the DHT network, typically encoded in a format
   * suitable for DNS packet representation of a DID Document.
   */
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
   * Optional. The URI of a server involved in executing DID method operations. In the context of
   * DID creation, the endpoint is expected to be a DID DHT Gateway or Pkarr relay. If not
   * specified, a default gateway node is used.
   */
  gatewayUri?: string;

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
 * Proof to used to construct the `_prv._did.` DNS record as described in https://did-dht.com/#rotation to link a DID to a previous DID.
 */
export type PreviousDidProof = {
  /** The previous DID. */
  previousDid: string;

  /** The signature signed using the private Identity Key of the previous DID in Base64URL format. */
  signature: string;
};

/**
 * The default DID DHT Gateway or Pkarr Relay server to use when publishing and resolving DID
 * documents.
 */
const DEFAULT_GATEWAY_URI = 'https://diddht.tbddev.org';

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
  /**
   * Type 0 is reserved for DIDs that do not wish to associate themselves with a specific type but
   * wish to make themselves discoverable.
   */
  Discoverable = 0,

  /**
   * Organization
   * @see {@link https://schema.org/Organization | schema definition}
   */
  Organization = 1,

  /**
   * Government Organization
   * @see {@link https://schema.org/GovernmentOrganization | schema definition}
   */
  Government = 2,

  /**
   * Corporation
   * @see {@link https://schema.org/Corporation | schema definition}
   */
  Corporation = 3,

  /**
   * Corporation
   * @see {@link https://schema.org/Corporation | schema definition}
   */
  LocalBusiness = 4,

  /**
   * Software Package
   * @see {@link https://schema.org/SoftwareSourceCode | schema definition}
   */
  SoftwarePackage = 5,

  /**
   * Web App
   * @see {@link https://schema.org/WebApplication | schema definition}
   */
  WebApp = 6,

  /**
   * Financial Institution
   * @see {@link https://schema.org/FinancialService | schema definition}
   */
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
  /**
   * Ed25519: A public-key signature system using the EdDSA (Edwards-curve Digital Signature
   * Algorithm) and Curve25519.
   */
  Ed25519 = 0,

  /**
   * secp256k1: A cryptographic curve used for digital signatures in a range of decentralized
   * systems.
   */
  secp256k1 = 1,

  /**
   * secp256r1: Also known as P-256 or prime256v1, this curve is used for cryptographic operations
   * and is widely supported in various cryptographic libraries and standards.
   */
  secp256r1 = 2,

  /**
   * X25519: A public key used for Diffie-Hellman key exchange using Curve25519.
   */
  X25519 = 3,
}

/**
 * Maps {@link https://www.w3.org/TR/did-core/#verification-relationships | DID Core Verification Relationship}
 * values to the corresponding record name in the DNS packet representation of a DHT DID document.
 */
export enum DidDhtVerificationRelationship {
  /**
   * Specifies how the DID subject is expected to be authenticated.
   */
  authentication = 'auth',

  /**
   * Specifies how the DID subject is expected to express claims, such as for issuing Verifiable
   * Credentials.
   */
  assertionMethod = 'asm',

  /**
   * Specifies a mechanism used by the DID subject to delegate a cryptographic capability to another
   * party
   */
  capabilityDelegation = 'del',

  /**
   * Specifies a verification method used by the DID subject to invoke a cryptographic capability.
   */
  capabilityInvocation = 'inv',

  /**
   * Specifies how an entity can generate encryption material to communicate confidentially with the
   * DID subject.
   */
  keyAgreement = 'agm'
}

/**
 * Private helper that maps algorithm identifiers to their corresponding DID DHT
 * {@link DidDhtRegisteredKeyType | registered key type}.
 */
const AlgorithmToKeyTypeMap = {
  Ed25519   : DidDhtRegisteredKeyType.Ed25519,
  ES256K    : DidDhtRegisteredKeyType.secp256k1,
  ES256     : DidDhtRegisteredKeyType.secp256r1,
  'P-256'   : DidDhtRegisteredKeyType.secp256r1,
  secp256k1 : DidDhtRegisteredKeyType.secp256k1,
  secp256r1 : DidDhtRegisteredKeyType.secp256r1,
  X25519    : DidDhtRegisteredKeyType.X25519,
} as const;

/**
 * Private helper that maps did dht registered key types to their corresponding default algorithm identifiers.
 */
const KeyTypeToDefaultAlgorithmMap = {
  [DidDhtRegisteredKeyType.Ed25519]   : 'Ed25519',
  [DidDhtRegisteredKeyType.secp256k1] : 'ES256K',
  [DidDhtRegisteredKeyType.secp256r1] : 'ES256',
  [DidDhtRegisteredKeyType.X25519]    : 'ECDH-ES+A256KW',
};

/**
 * The `DidDht` class provides an implementation of the `did:dht` DID method.
 *
 * Features:
 * - DID Creation: Create new `did:dht` DIDs.
 * - DID Key Management: Instantiate a DID object from an existing verification method keys or
 *                       or a key in a Key Management System (KMS). If supported by the KMS, a DID's
 *                       key can be exported to a portable DID format.
 * - DID Resolution: Resolve a `did:dht` to its corresponding DID Document stored in the DHT network.
 * - Signature Operations: Sign and verify messages using keys associated with a DID.
 *
 * @remarks
 * The `did:dht` method leverages the distributed nature of the Mainline DHT network for
 * decentralized identity management. This method allows DIDs to be resolved without relying on
 * centralized registries or ledgers, enhancing privacy and control for users. The DID Document is
 * stored and retrieved from the DHT network, and the method includes optional mechanisms for
 * discovering DIDs by type.
 *
 * The DID URI in the `did:dht` method includes a method-specific identifier called the Identity Key
 * which corresponds to the DID's entry in the DHT network. The Identity Key required to make
 * changes to the DID Document since Mainline DHT nodes validate the signature of each message
 * before storing the value in the DHT.
 *
 * @see {@link https://did-dht.com | DID DHT Method Specification}
 *
 * @example
 * ```ts
 * // DID Creation
 * const did = await DidDht.create();
 *
 * // DID Creation with a KMS
 * const keyManager = new LocalKeyManager();
 * const did = await DidDht.create({ keyManager });
 *
 * // DID Resolution
 * const resolutionResult = await DidDht.resolve({ did: did.uri });
 *
 * // Signature Operations
 * const signer = await did.getSigner();
 * const signature = await signer.sign({ data: new TextEncoder().encode('Message') });
 * const isValid = await signer.verify({ data: new TextEncoder().encode('Message'), signature });
 *
 * // Import / Export
 *
 * // Export a BearerDid object to the PortableDid format.
 * const portableDid = await did.export();
 *
 * // Reconstruct a BearerDid object from a PortableDid
 * const did = await DidDht.import(portableDid);
 * ```
 */
export class DidDht extends DidMethod {

  /**
   * Name of the DID method, as defined in the DID DHT specification.
   */
  public static methodName = 'dht';

  /**
   * Creates a new DID using the `did:dht` method formed from a newly generated key.
   *
   * @remarks
   * The DID URI is formed by z-base-32 encoding the Identity Key public key and prefixing with
   * `did:dht:`.
   *
   * Notes:
   * - If no `options` are given, by default a new Ed25519 key will be generated which serves as the
   *   Identity Key.
   *
   * @example
   * ```ts
   * // DID Creation
   * const did = await DidDht.create();
   *
   * // DID Creation with a KMS
   * const keyManager = new LocalKeyManager();
   * const did = await DidDht.create({ keyManager });
   * ```
   *
   * @param params - The parameters for the create operation.
   * @param params.keyManager - Optionally specify a Key Management System (KMS) used to generate
   *                            keys and sign data.
   * @param params.options - Optional parameters that can be specified when creating a new DID.
   * @returns A Promise resolving to a {@link BearerDid} object representing the new DID.
   */
  public static async create<TKms extends CryptoApi | undefined = undefined>({
    keyManager = new LocalKeyManager(),
    options = {}
  }: {
    keyManager?: TKms;
    options?: DidDhtCreateOptions<TKms>;
  } = {}): Promise<BearerDid> {
    // Before processing the create operation, validate DID-method-specific requirements to prevent
    // keys from being generated unnecessarily.

    // Check 1: Validate that the algorithm for any given verification method is supported by the
    // DID DHT specification.
    if (options.verificationMethods?.some(vm => !(vm.algorithm in AlgorithmToKeyTypeMap))) {
      throw new Error('One or more verification method algorithms are not supported');
    }

    // Check 2: Validate that the ID for any given verification method is unique.
    const methodIds = options.verificationMethods?.filter(vm => 'id' in vm).map(vm => vm.id);
    if (methodIds && methodIds.length !== new Set(methodIds).size) {
      throw new Error('One or more verification method IDs are not unique');
    }

    // Check 3: Validate that the required properties for any given services are present.
    if (options.services?.some(s => !s.id || !s.type || !s.serviceEndpoint)) {
      throw new Error('One or more services are missing required properties');
    }

    // Generate random key material for the Identity Key.
    const identityKeyUri = await keyManager.generateKey({ algorithm: 'Ed25519' });
    const identityKey = await keyManager.getPublicKey({ keyUri: identityKeyUri });

    // Compute the DID URI from the Identity Key.
    const didUri = await DidDhtUtils.identityKeyToIdentifier({ identityKey });

    // Begin constructing the DID Document.
    const document: DidDocument = {
      id: didUri,
      ...options.alsoKnownAs && { alsoKnownAs: options.alsoKnownAs },
      ...options.controllers && { controller: options.controllers }
    };

    // If the given verification methods do not contain an Identity Key, add one.
    const verificationMethodsToAdd = [...options.verificationMethods ?? []];
    if (!verificationMethodsToAdd?.some(vm => vm.id?.split('#').pop() === '0')) {
      // Add the Identity Key to the beginning of the key set.
      verificationMethodsToAdd.unshift({
        algorithm : 'Ed25519' as any,
        id        : '0',
        purposes  : ['authentication', 'assertionMethod', 'capabilityDelegation', 'capabilityInvocation']
      });
    }

    // Generate random key material for the Identity Key and any additional verification methods.
    // Add verification methods to the DID document.
    for (const verificationMethod of verificationMethodsToAdd) {
      // Generate a random key for the verification method, or if its the Identity Key's
      // verification method (`id` is 0) use the key previously generated.
      const keyUri = (verificationMethod.id && verificationMethod.id.split('#').pop() === '0')
        ? identityKeyUri
        : await keyManager.generateKey({ algorithm: verificationMethod.algorithm });

      const publicKey = await keyManager.getPublicKey({ keyUri });

      // Use the given ID, the key's ID, or the key's thumbprint as the verification method ID.
      let methodId = verificationMethod.id ?? publicKey.kid ?? await computeJwkThumbprint({ jwk: publicKey });
      methodId = `${didUri}#${extractDidFragment(methodId)}`; // Remove fragment prefix, if any.

      // Initialize the `verificationMethod` array if it does not already exist.
      document.verificationMethod ??= [];

      // Add the verification method to the DID document.
      document.verificationMethod.push({
        id           : methodId,
        type         : 'JsonWebKey',
        controller   : verificationMethod.controller ?? didUri,
        publicKeyJwk : publicKey,
      });

      // Add the verification method to the specified purpose properties of the DID document.
      for (const purpose of verificationMethod.purposes ?? []) {
        // Initialize the purpose property if it does not already exist.
        if (!document[purpose]) document[purpose] = [];
        // Add the verification method to the purpose property.
        document[purpose]!.push(methodId);
      }
    }

    // Add services, if any, to the DID document.
    options.services?.forEach(service => {
      document.service ??= [];
      service.id = `${didUri}#${service.id.split('#').pop()}`; // Remove fragment prefix, if any.
      document.service.push(service);
    });

    // Create the BearerDid object, including the registered DID types (if any), and specify that
    // the DID has not yet been published.
    const did = new BearerDid({
      uri      : didUri,
      document,
      metadata : {
        published: false,
        ...options.types && { types: options.types }
      },
      keyManager
    });

    // By default, publish the DID document to a DHT Gateway unless explicitly disabled.
    if (options.publish ?? true) {
      const registrationResult = await DidDht.publish({ did, gatewayUri: options.gatewayUri });
      did.metadata = registrationResult.didDocumentMetadata;
    }

    return did;
  }

  /**
   * Instantiates a {@link BearerDid} object for the DID DHT method from a given {@link PortableDid}.
   *
   * This method allows for the creation of a `BearerDid` object using a previously created DID's
   * key material, DID document, and metadata.
   *
   * @example
   * ```ts
   * // Export an existing BearerDid to PortableDid format.
   * const portableDid = await did.export();
   * // Reconstruct a BearerDid object from the PortableDid.
   * const did = await DidDht.import({ portableDid });
   * ```
   *
   * @param params - The parameters for the import operation.
   * @param params.portableDid - The PortableDid object to import.
   * @param params.keyManager - Optionally specify an external Key Management System (KMS) used to
   *                            generate keys and sign data. If not given, a new
   *                            {@link LocalKeyManager} instance will be created and
   *                            used.
   * @returns A Promise resolving to a `BearerDid` object representing the DID formed from the
   *          provided PortableDid.
   * @throws An error if the PortableDid document does not contain any verification methods, lacks
   *         an Identity Key, or the keys for any verification method are missing in the key
   *         manager.
   */
  public static async import({ portableDid, keyManager = new LocalKeyManager() }: {
    keyManager?: CryptoApi & KeyImporterExporter<KmsImportKeyParams, KeyIdentifier, KmsExportKeyParams>;
    portableDid: PortableDid;
  }): Promise<BearerDid> {
    // Verify the DID method is supported.
    const parsedDid = Did.parse(portableDid.uri);
    if (parsedDid?.method !== DidDht.methodName) {
      throw new DidError(DidErrorCode.MethodNotSupported, `Method not supported`);
    }

    const did = await BearerDid.import({ portableDid, keyManager });

    // Validate that the given verification methods contain an Identity Key.
    if (!did.document.verificationMethod?.some(vm => vm.id?.split('#').pop() === '0')) {
      throw new DidError(DidErrorCode.InvalidDidDocument, `DID document must contain an Identity Key`);
    }

    return did;
  }

  /**
   * Given the W3C DID Document of a `did:dht` DID, return the verification method that will be used
   * for signing messages and credentials. If given, the `methodId` parameter is used to select the
   * verification method. If not given, the Identity Key's verification method with an ID fragment
   * of '#0' is used.
   *
   * @param params - The parameters for the `getSigningMethod` operation.
   * @param params.didDocument - DID Document to get the verification method from.
   * @param params.methodId - ID of the verification method to use for signing.
   * @returns Verification method to use for signing.
   */
  public static async getSigningMethod({ didDocument, methodId = '#0' }: {
    didDocument: DidDocument;
    methodId?: string;
  }): Promise<DidVerificationMethod> {
    // Verify the DID method is supported.
    const parsedDid = Did.parse(didDocument.id);
    if (parsedDid && parsedDid.method !== this.methodName) {
      throw new DidError(DidErrorCode.MethodNotSupported, `Method not supported: ${parsedDid.method}`);
    }

    // Attempt to find a verification method that matches the given method ID, or if not given,
    // find the first verification method intended for signing claims.
    const verificationMethod = didDocument.verificationMethod?.find(
      vm => extractDidFragment(vm.id) === (extractDidFragment(methodId) ?? extractDidFragment(didDocument.assertionMethod?.[0]))
    );

    if (!(verificationMethod && verificationMethod.publicKeyJwk)) {
      throw new DidError(DidErrorCode.InternalError, 'A verification method intended for signing could not be determined from the DID Document');
    }

    return verificationMethod;
  }

  /**
   * Publishes a DID to the DHT, making it publicly discoverable and resolvable.
   *
   * This method handles the publication of a DID Document associated with a `did:dht` DID to the
   * Mainline DHT network. The publication process involves storing the DID Document in Mainline DHT
   * via a Pkarr relay server.
   *
   * @remarks
   * - This method is typically invoked automatically during the creation of a new DID unless the
   *   `publish` option is set to `false`.
   * - For existing, unpublished DIDs, it can be used to publish the DID Document to Mainline DHT.
   * - The method relies on the specified Pkarr relay server to interface with the DHT network.
   *
   * @example
   * ```ts
   * // Generate a new DID and keys but explicitly disable publishing.
   * const did = await DidDht.create({ options: { publish: false } });
   * // Publish the DID to the DHT.
   * const registrationResult = await DidDht.publish({ did });
   * // `registrationResult.didDocumentMetadata.published` is true if the DID was successfully published.
   * ```
   *
   * @param params - The parameters for the `publish` operation.
   * @param params.did - The `BearerDid` object representing the DID to be published.
   * @param params.gatewayUri - Optional. The URI of a server involved in executing DID method
   *                            operations. In the context of publishing, the endpoint is expected
   *                            to be a DID DHT Gateway or Pkarr Relay. If not specified, a default
   *                            gateway node is used.
   * @returns A promise that resolves to a {@link DidRegistrationResult} object that contains
   *          the result of registering the DID with a DID DHT Gateway or Pkarr relay.
   */
  public static async publish({ did, gatewayUri = DEFAULT_GATEWAY_URI }: {
    did: BearerDid;
    gatewayUri?: string;
  }): Promise<DidRegistrationResult> {
    const registrationResult = await DidDhtDocument.put({ did, gatewayUri });

    return registrationResult;
  }

  /**
   * Resolves a `did:dht` identifier to its corresponding DID document.
   *
   * This method performs the resolution of a `did:dht` DID, retrieving its DID Document from the
   * Mainline DHT network. The process involves querying the DHT network via a Pkarr relay server to
   * retrieve the DID Document that corresponds to the given DID identifier.
   *
   * @remarks
   * - If a `gatewayUri` option is not specified, a default Pkarr relay is used to access the DHT
   *   network.
   * - It decodes the DID identifier and retrieves the associated DID Document and metadata.
   * - In case of resolution failure, appropriate error information is returned.
   *
   * @example
   * ```ts
   * const resolutionResult = await DidDht.resolve('did:dht:example');
   * ```
   *
   * @param didUri - The DID to be resolved.
   * @param options - Optional parameters for resolving the DID. Unused by this DID method.
   * @returns A Promise resolving to a {@link DidResolutionResult} object representing the result of
   *          the resolution.
   */
  public static async resolve(didUri: string, options: DidResolutionOptions = {}): Promise<DidResolutionResult> {
    // To execute the read method operation, use the given gateway URI or a default.
    const gatewayUri = options?.gatewayUri ?? DEFAULT_GATEWAY_URI;

    try {
      // Attempt to decode the z-base-32-encoded identifier.
      await DidDhtUtils.identifierToIdentityKey({ didUri });

      // Attempt to retrieve the DID document and metadata from the DHT network.
      const { didDocument, didDocumentMetadata } = await DidDhtDocument.get({ didUri, gatewayUri });

      // If the DID document was retrieved successfully, return it.
      return {
        ...EMPTY_DID_RESOLUTION_RESULT,
        didDocument,
        didDocumentMetadata
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
}

/**
 * The `DidDhtDocument` class provides functionality for interacting with the DID document stored in
 * Mainline DHT in support of DID DHT method create, resolve, update, and deactivate operations.
 *
 * This class includes methods for retrieving and publishing DID documents to and from the DHT,
 * using DNS packet encoding and DID DHT Gateway or Pkarr Relay servers.
 */
export class DidDhtDocument {
  /**
   * Retrieves a DID document and its metadata from the DHT network.
   *
   * @param params - The parameters for the get operation.
   * @param params.didUri - The DID URI containing the Identity Key.
   * @param params.gatewayUri - The DID DHT Gateway or Pkarr Relay URI.
   * @returns A Promise resolving to a {@link DidResolutionResult} object containing the DID
   *          document and its metadata.
   */
  public static async get({ didUri, gatewayUri }: {
    didUri: string;
    gatewayUri: string;
  }): Promise<DidResolutionResult> {
    // Decode the z-base-32 DID identifier to public key as a byte array.
    const publicKeyBytes = DidDhtUtils.identifierToIdentityKeyBytes({ didUri });

    // Retrieve the signed BEP44 message from a DID DHT Gateway or Pkarr relay.
    const bep44Message = await DidDhtDocument.pkarrGet({ gatewayUri, publicKeyBytes });

    // Verify the signature of the BEP44 message and parse the value to a DNS packet.
    const dnsPacket = await DidDhtUtils.parseBep44GetMessage({ bep44Message });

    // Convert the DNS packet to a DID document and metadata.
    const resolutionResult = await DidDhtDocument.fromDnsPacket({ didUri, dnsPacket });

    // Set the version ID of the DID document metadata to the sequence number of the BEP44 message.
    resolutionResult.didDocumentMetadata.versionId = bep44Message.seq.toString();

    return resolutionResult;
  }

  /**
   * Publishes a DID document to the DHT network.
   *
   * @param params - The parameters to use when publishing the DID document to the DHT network.
   * @param params.did - The DID object whose DID document will be published.
   * @param params.gatewayUri - The DID DHT Gateway or Pkarr Relay URI.
   * @returns A promise that resolves to a {@link DidRegistrationResult} object that contains
   *          the result of registering the DID with a DID DHT Gateway or Pkarr relay.
   */
  public static async put({ did, gatewayUri }: {
    did: BearerDid;
    gatewayUri: string;
  }): Promise<DidRegistrationResult> {
    // Convert the DID document and DID metadata (such as DID types) to a DNS packet.
    const dnsPacket = await DidDhtDocument.toDnsPacket({
      didDocument              : did.document,
      didMetadata              : did.metadata,
      authoritativeGatewayUris : [gatewayUri]
    });

    // Create a signed BEP44 put message from the DNS packet.
    const bep44Message = await DidDhtUtils.createBep44PutMessage({
      dnsPacket,
      publicKeyBytes : DidDhtUtils.identifierToIdentityKeyBytes({ didUri: did.uri }),
      signer         : await did.getSigner({ methodId: '0' })
    });

    // Publish the DNS packet to the DHT network.
    const putResult = await DidDhtDocument.pkarrPut({ gatewayUri, bep44Message });

    // Return the result of processing the PUT operation, including the updated DID metadata with
    // the version ID and the publishing result.
    return {
      didDocument         : did.document,
      didDocumentMetadata : {
        ...did.metadata,
        published : putResult,
        versionId : bep44Message.seq.toString()
      },
      didRegistrationMetadata: {}
    };
  }

  /**
   * Retrieves a signed BEP44 message from a DID DHT Gateway or Pkarr Relay server.
   *
   * @see {@link https://github.com/Nuhvi/pkarr/blob/main/design/relays.md | Pkarr Relay design}
   *
   * @param params
   * @param params.gatewayUri - The DID DHT Gateway or Pkarr Relay URI.
   * @param params.publicKeyBytes - The public key bytes of the Identity Key, z-base-32 encoded.
   * @returns A promise resolving to a BEP44 message containing the signed DNS packet.
  */
  private static async pkarrGet({ gatewayUri, publicKeyBytes }: {
    publicKeyBytes: Uint8Array;
    gatewayUri: string;
  }): Promise<Bep44Message> {
    // The identifier (key in the DHT) is the z-base-32 encoding of the Identity Key.
    const identifier = Convert.uint8Array(publicKeyBytes).toBase32Z();

    // Concatenate the gateway URI with the identifier to form the full URL.
    const url = new URL(identifier, gatewayUri).href;

    // Transmit the Get request to the DID DHT Gateway or Pkarr Relay and get the response.
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

    if(!messageBytes) {
      throw new DidError(DidErrorCode.NotFound, `Pkarr record not found for: ${identifier}`);
    }

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

  /**
   * Publishes a signed BEP44 message to a DID DHT Gateway or Pkarr Relay server.
   *
   * @see {@link https://github.com/Nuhvi/pkarr/blob/main/design/relays.md | Pkarr Relay design}
   *
   * @param params - The parameters to use when publishing a signed BEP44 message to a Pkarr relay server.
   * @param params.gatewayUri - The DID DHT Gateway or Pkarr Relay URI.
   * @param params.bep44Message - The BEP44 message to be published, containing the signed DNS packet.
   * @returns A promise resolving to `true` if the message was successfully published, otherwise `false`.
   */
  private static async pkarrPut({ gatewayUri, bep44Message }: {
    bep44Message: Bep44Message;
    gatewayUri: string;
  }): Promise<boolean> {
    // The identifier (key in the DHT) is the z-base-32 encoding of the Identity Key.
    const identifier = Convert.uint8Array(bep44Message.k).toBase32Z();

    // Concatenate the gateway URI with the identifier to form the full URL.
    const url = new URL(identifier, gatewayUri).href;

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
      throw new DidError(DidErrorCode.InternalError, `Failed to put Pkarr record for identifier ${identifier}: ${error.message}`);
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
   * @returns A Promise resolving to a {@link DidResolutionResult} object containing the DID
   *          document and its metadata.
   */
  public static async fromDnsPacket({ didUri, dnsPacket }: {
    didUri: string;
    dnsPacket: Packet;
  }): Promise<DidResolutionResult> {
    // Begin constructing the DID Document.
    const didDocument: DidDocument = { id: didUri };

    // Since the DID document is being retrieved from the DHT, it is considered published.
    const didDocumentMetadata: DidMetadata = {
      published: true
    };

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
          // Get the key type (t), Base64URL-encoded public key (k), algorithm (a), and
          // optionally, controller (c) or Verification Method ID (id) from the decoded TXT record data.
          const { id, t, k, c, a: parsedAlg } = DidDhtUtils.parseTxtDataToObject(answer.data);

          // Convert the public key from Base64URL format to a byte array.
          const publicKeyBytes = Convert.base64Url(k).toUint8Array();

          // Use the key type integer to look up the cryptographic curve name.
          const namedCurve = DidDhtRegisteredKeyType[Number(t)];

          // Convert the public key from a byte array to JWK format.
          let publicKey = await DidDhtUtils.keyConverter(namedCurve).bytesToPublicKey({ publicKeyBytes });

          publicKey.alg = parsedAlg || KeyTypeToDefaultAlgorithmMap[Number(t) as DidDhtRegisteredKeyType];

          // Determine the Verification Method ID: '0' for the identity key,
          // the id from the TXT Data Object, or the JWK thumbprint if an explicity Verification Method ID not defined.
          const vmId = dnsRecordId === 'k0' ? '0' : id !== undefined ? id : await computeJwkThumbprint({ jwk: publicKey });

          // Initialize the `verificationMethod` array if it does not already exist.
          didDocument.verificationMethod ??= [];

          // Prepend the DID URI to the ID fragment to form the full verification method ID.
          const methodId = `${didUri}#${vmId}`;

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

          // if multi-values: 'a,b,c' -> ['a', 'b', 'c'], if single-value: 'a' -> ['a']
          // NOTE: The service endpoint technically can either be a string or an array of strings,
          // we enforce an array for single-value to simplify verification of vector 3 in the spec: https://did-dht.com/#vector-3
          const serviceEndpoint = se.includes(VALUE_SEPARATOR) ? se.split(VALUE_SEPARATOR) : [se];

          // Convert custom property values to either a string or an array of strings.
          const serviceProperties = Object.fromEntries(Object.entries(customProperties).map(
            ([k, v]) => [k, v.includes(VALUE_SEPARATOR) ? v.split(VALUE_SEPARATOR) : v]
          ));

          // Initialize the `service` array if it does not already exist.
          didDocument.service ??= [];

          didDocument.service.push({
            ...serviceProperties,
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
          didDocumentMetadata.types = types.split(VALUE_SEPARATOR).map(typeInteger => Number(typeInteger));

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

    return { didDocument, didDocumentMetadata, didResolutionMetadata: {} };
  }

  /**
   * Converts a DID document to a DNS packet according to the DID DHT specification.
   *
   * @see {@link https://did-dht.com/#dids-as-dns-records | DID DHT Specification, § DIDs as DNS Records}
   *
   * @param params - The parameters to use when converting a DID document to a DNS packet.
   * @param params.didDocument - The DID document to convert to a DNS packet.
   * @param params.didMetadata - The DID metadata to include in the DNS packet.
   * @param params.authoritativeGatewayUris - The URIs of the Authoritative Gateways to generate NS records from.
   * @param params.previousDidProof - The signature proof that this DID is linked to the given previous DID.
   * @returns A promise that resolves to a DNS packet.
   */
  public static async toDnsPacket({ didDocument, didMetadata, authoritativeGatewayUris, previousDidProof }: {
    didDocument: DidDocument;
    didMetadata: DidMetadata;
    authoritativeGatewayUris?: string[];
    previousDidProof?: PreviousDidProof;
  }): Promise<Packet> {
    const txtRecords: TxtAnswer[] = [];
    const nsRecords: StringAnswer[] = [];
    const idLookup = new Map<string, string>();
    const serviceIds: string[] = [];
    const verificationMethodIds: string[] = [];

    // Add `_prv._did.` TXT record if previous DID proof is provided and valid.
    if (previousDidProof !== undefined) {
      const { signature, previousDid } = previousDidProof;

      await DidDhtUtils.validatePreviousDidProof({
        newDid: didDocument.id,
        previousDidProof
      });

      txtRecords.push({
        type : 'TXT',
        name : '_prv._did.',
        ttl  : DNS_RECORD_TTL,
        data : `id=${previousDid};s=${signature}`
      });
    }

    // Add DNS TXT records if the DID document contains an `alsoKnownAs` property.
    if (didDocument.alsoKnownAs) {
      txtRecords.push({
        type : 'TXT',
        name : '_aka._did.',
        ttl  : DNS_RECORD_TTL,
        data : didDocument.alsoKnownAs.join(VALUE_SEPARATOR)
      });
    }

    // Add DNS TXT records if the DID document contains a `controller` property.
    if (didDocument.controller) {
      const controller = Array.isArray(didDocument.controller)
        ? didDocument.controller.join(VALUE_SEPARATOR)
        : didDocument.controller;
      txtRecords.push({
        type : 'TXT',
        name : '_cnt._did.',
        ttl  : DNS_RECORD_TTL,
        data : controller
      });
    }

    // Add DNS TXT records for each verification method.
    for (const [index, verificationMethod] of didDocument.verificationMethod?.entries() ?? []) {
      const dnsRecordId = `k${index}`;
      verificationMethodIds.push(dnsRecordId);
      let methodId = verificationMethod.id.split('#').pop()!; // Remove fragment prefix, if any.
      idLookup.set(methodId, dnsRecordId);

      const publicKey = verificationMethod.publicKeyJwk;

      if (!(publicKey?.crv && publicKey.crv in AlgorithmToKeyTypeMap)) {
        throw new DidError(DidErrorCode.InvalidPublicKeyType, `Verification method '${verificationMethod.id}' contains an unsupported key type: ${publicKey?.crv ?? 'undefined'}`);
      }

      // Use the public key's `crv` property to get the DID DHT key type.
      const keyType = DidDhtRegisteredKeyType[publicKey.crv as keyof typeof DidDhtRegisteredKeyType];

      // Convert the public key from JWK format to a byte array.
      const publicKeyBytes = await DidDhtUtils.keyConverter(publicKey.crv).publicKeyToBytes({ publicKey });

      // Convert the public key from a byte array to Base64URL format.
      const publicKeyBase64Url = Convert.uint8Array(publicKeyBytes).toBase64Url();

      // Define the data for the DNS TXT record.
      const txtData = [`t=${keyType}`, `k=${publicKeyBase64Url}`];
      // if the methodId is not the identity key or a thumbprint, explicity define the id within the DNS TXT record.
      // otherwise the id can be inferred from the thumbprint.
      if (methodId !== '0' && await computeJwkThumbprint({ jwk: publicKey }) !== methodId)  {
        txtData.unshift(`id=${methodId}`);
      }

      // Only set the algorithm property (`a`) if it differs from the default algorithm for the key type.
      if(publicKey.alg !== KeyTypeToDefaultAlgorithmMap[keyType]) {
        txtData.push(`a=${publicKey.alg}`);
      }

      // Add the controller property, if set to a value other than the Identity Key (DID Subject).
      if (verificationMethod.controller !== didDocument.id) txtData.push(`c=${verificationMethod.controller}`);

      // Add a TXT record for the verification method.
      txtRecords.push({
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
      let { id, type: t, serviceEndpoint: se, ...customProperties } = service;
      id = extractDidFragment(id)!;
      se = Array.isArray(se) ? se.join(',') : se;

      // Define the data for the DNS TXT record.
      const txtData = Object.entries({ id, t, se, ...customProperties }).map(
        ([key, value]) => `${key}=${value}`
      );

      const txtDataString = txtData.join(PROPERTY_SEPARATOR);
      const data = DidDhtUtils.chunkDataIfNeeded(txtDataString);

      // Add a TXT record for the verification method.
      txtRecords.push({
        type : 'TXT',
        name : `_${dnsRecordId}._did.`,
        ttl  : DNS_RECORD_TTL,
        data
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

      txtRecords.push({
        type : 'TXT',
        name : '_typ._did.',
        ttl  : DNS_RECORD_TTL,
        data : `id=${typeIntegers.join(VALUE_SEPARATOR)}`
      });
    }

    // Add a DNS TXT record for the root record.
    txtRecords.push({
      type : 'TXT',
      name : '_did.' + DidDhtDocument.getUniqueDidSuffix(didDocument.id) + '.', // name of a Root Record MUST end in `<ID>.`
      ttl  : DNS_RECORD_TTL,
      data : rootRecord.join(PROPERTY_SEPARATOR)
    });

    // Add an NS record for each authoritative gateway URI.
    for (const gatewayUri of authoritativeGatewayUris || []) {
      nsRecords.push({
        type : 'NS',
        name : '_did.' + DidDhtDocument.getUniqueDidSuffix(didDocument.id) + '.', // name of an NS record a authoritative gateway MUST end in `<ID>.`
        ttl  : DNS_RECORD_TTL,
        data : gatewayUri + '.'
      });
    }

    // Create a DNS response packet with the authoritative answer flag set.
    const dnsPacket: Packet = {
      id      : 0,
      type    : 'response',
      flags   : AUTHORITATIVE_ANSWER,
      answers : [...txtRecords, ...nsRecords]
    };

    return dnsPacket;
  }

  /**
   * Gets the unique portion of the DID identifier after the last `:` character.
   * e.g. `did:dht:example` -> `example`
   *
   * @param did - The DID to extract the unique suffix from.
   */
  private static getUniqueDidSuffix(did: string ): string {
    return did.split(':')[2];
  }
}

/**
 * The `DidDhtUtils` class provides utility functions to support operations in the DID DHT method.
 * This includes functions for creating and parsing BEP44 messages, handling identity keys, and
 * converting between different formats and representations.
 */
export class DidDhtUtils {
  /**
   * Creates a BEP44 put message, which is used to publish a DID document to the DHT network.
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

  /**
   * Converts a DID URI to a JSON Web Key (JWK) representing the Identity Key.
   *
   * @param params - The parameters to use for the conversion.
   * @param params.didUri - The DID URI containing the Identity Key.
   * @returns A promise that resolves to a JWK representing the Identity Key.
   */
  public static async identifierToIdentityKey({ didUri }: {
    didUri: string
  }): Promise<Jwk> {
    // Decode the method-specific identifier from z-base-32 to a byte array.
    let identityKeyBytes = DidDhtUtils.identifierToIdentityKeyBytes({ didUri });

    // Convert the byte array to a JWK.
    const identityKey = await Ed25519.bytesToPublicKey({ publicKeyBytes: identityKeyBytes });

    return identityKey;
  }

  /**
   * Converts a DID URI to the byte array representation of the Identity Key.
   *
   * @param params - The parameters to use for the conversion.
   * @param params.didUri - The DID URI containing the Identity Key.
   * @returns A byte array representation of the Identity Key.
   */
  public static identifierToIdentityKeyBytes({ didUri }: {
    didUri: string
  }): Uint8Array {
    // Parse the DID URI.
    const parsedDid = Did.parse(didUri);

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
    } catch {
      throw new DidError(DidErrorCode.InvalidPublicKey, `Failed to decode method-specific identifier`);
    }

    if (identityKeyBytes.length !== 32) {
      throw new DidError(DidErrorCode.InvalidPublicKeyLength, `Invalid public key length: ${identityKeyBytes.length}`);
    }

    return identityKeyBytes;
  }

  /**
   * Encodes a DID DHT Identity Key into a DID identifier.
   *
   * This method first z-base-32 encodes the Identity Key. The resulting string is prefixed with
   * `did:dht:` to form the DID identifier.
   *
   * @param params - The parameters to use for the conversion.
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

  /**
   * Returns the appropriate key converter for the specified cryptographic curve.
   *
   * @param curve - The cryptographic curve to use for the key conversion.
   * @returns An `AsymmetricKeyConverter` for the specified curve.
   */
  public static keyConverter(curve: string): AsymmetricKeyConverter {
    const converters: Record<string, AsymmetricKeyConverter> = {
      'Ed25519' : Ed25519,
      'P-256'   : {
        // Wrap the key converter which produces uncompressed public key bytes to produce compressed key bytes as required by the DID DHT spec.
        // See https://did-dht.com/#representing-keys for more info.
        publicKeyToBytes: async ({ publicKey }: { publicKey: Jwk }): Promise<Uint8Array> => {
          const publicKeyBytes = await Secp256r1.publicKeyToBytes({ publicKey });
          const compressedPublicKey = await Secp256r1.compressPublicKey({ publicKeyBytes });
          return compressedPublicKey;
        },
        bytesToPublicKey  : Secp256r1.bytesToPublicKey,
        privateKeyToBytes : Secp256r1.privateKeyToBytes,
        bytesToPrivateKey : Secp256r1.bytesToPrivateKey,
      },
      'secp256k1': {
        // Wrap the key converter which produces uncompressed public key bytes to produce compressed key bytes as required by the DID DHT spec.
        // See https://did-dht.com/#representing-keys for more info.
        publicKeyToBytes: async ({ publicKey }: { publicKey: Jwk }): Promise<Uint8Array> => {
          const publicKeyBytes = await Secp256k1.publicKeyToBytes({ publicKey });
          const compressedPublicKey = await Secp256k1.compressPublicKey({ publicKeyBytes });
          return compressedPublicKey;
        },
        bytesToPublicKey  : Secp256k1.bytesToPublicKey,
        privateKeyToBytes : Secp256k1.privateKeyToBytes,
        bytesToPrivateKey : Secp256k1.bytesToPrivateKey,
      },
      X25519: X25519,
    };

    const converter = converters[curve];

    if (!converter) throw new DidError(DidErrorCode.InvalidPublicKeyType, `Unsupported curve: ${curve}`);

    return converter;
  }

  /**
   * Parses and verifies a BEP44 Get message, converting it to a DNS packet.
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
   * Decodes and parses the data value of a DNS TXT record into a key-value object.
   *
   * @param txtData - The data value of a DNS TXT record.
   * @returns An object containing the key/value pairs of the TXT record data.
   */
  public static parseTxtDataToObject(txtData: TxtData): Record<string, string> {
    return this.parseTxtDataToString(txtData).split(PROPERTY_SEPARATOR).reduce((acc, pair) => {
      const [key, value] = pair.split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
  }

  /**
   * Decodes and parses the data value of a DNS TXT record into a string.
   *
   * @param txtData - The data value of a DNS TXT record.
   * @returns A string representation of the TXT record data.
   */
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

  /**
   * Validates the proof of previous DID given.
   *
   * @param params - The parameters to validate the previous DID proof.
   * @param params.newDid - The new DID that the previous DID is linking to.
   * @param params.previousDidProof - The proof of the previous DID, containing the previous DID and signature signed by the previous DID.
   */
  public static async validatePreviousDidProof({ newDid, previousDidProof }: {
    newDid: string,
    previousDidProof: PreviousDidProof,
  }): Promise<void> {
    const key = await DidDhtUtils.identifierToIdentityKey({ didUri: previousDidProof.previousDid });
    const data = DidDhtUtils.identifierToIdentityKeyBytes({ didUri: newDid });
    const signature = Convert.base64Url(previousDidProof.signature).toUint8Array();
    const isValid = await Ed25519.verify({ key, data, signature  });

    if (!isValid) {
      throw new DidError(DidErrorCode.InvalidPreviousDidProof, 'The previous DID proof is invalid.');
    }
  }

  /**
   * Splits a string into chunks of length 255 if the string exceeds length 255.
   * @param data - The string to split into chunks.
   * @returns The original string if its length is less than or equal to 255, otherwise an array of chunked strings.
   */
  public static chunkDataIfNeeded(data: string): string | string[] {
    if (data.length <= 255) {
      return data;
    }

    // Split the data into chunks of 255 characters.
    const chunks: string[] = [];
    for (let i = 0; i < data.length; i += 255) {
      chunks.push(data.slice(i, i + 255)); // end index is ignored if it exceeds the length of the string
    }

    return chunks;
  }
}