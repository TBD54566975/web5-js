import type { Packet, TxtAnswer } from 'dns-packet';
import type { PublicKeyJwk, Web5Crypto} from '@web5/crypto';

import { Jose } from '@web5/crypto';
import { Convert } from '@web5/common';
import { Pkarr, SignedPacket, z32 } from 'pkarr';
import dns, { AUTHORITATIVE_ANSWER } from 'dns-packet';

import type { DidDocument } from './types.js';

const PKARR_RELAY = 'https://diddht.tbddev.org';
const TTL = 7200;

/**
 * A class to handle operations related to DHT-based Decentralized Identifiers (DIDs).
 * It provides methods to:
 * - Parse a DNS packet into a DID Document.
 * - Retrieve a DID Document from the DHT.
 * - Publish a DID Document to the DHT.
 * - Convert a DID Document to a DNS packet.
 *
 * The class assumes that DIDs and DID Documents are compliant with the did:dht specification.
 */
export class DidDht {

  /**
   * Parses a DNS packet into a DID Document.
   * @param did The DID of the document.
   * @param packet A DNS packet to parse into a DID Document.
   * @returns A Promise that resolves to the parsed DidDocument.
   */
  public static async fromDnsPacket({ did, packet }: {
    did: string,
    packet: Packet
  }): Promise<DidDocument> {
    const document: Partial<DidDocument> = {
      id: did,
    };

    const keyLookup = new Map<string, string>();

    for (const answer of packet.answers) {
      if (answer.type !== 'TXT') continue;

      const dataStr = answer.data?.toString();
      // Extracts 'k' or 's' from "_k0._did" or "_s0._did"
      const recordType = answer.name?.split('.')[0].substring(1, 2);

      /*eslint-disable no-case-declarations*/
      switch (recordType) {
        case 'k': {
          const { id, t, k } = DidDht.parseTxtData({ data: dataStr });
          const keyConfigurations: { [keyType: string]: Partial<PublicKeyJwk> } = {
            '0': {
              crv : 'Ed25519',
              kty : 'OKP',
              alg : 'EdDSA'
            },
            '1': {
              crv : 'secp256k1',
              kty : 'EC',
              alg : 'ES256K'
            }
          };
          const keyConfig = keyConfigurations[t];
          if (!keyConfig) {
            throw new Error('Unsupported key type');
          }

          const publicKeyJwk = await Jose.keyToJwk({
            ...keyConfig,
            kid         : id,
            keyMaterial : Convert.base64Url(k).toUint8Array(),
            keyType     : 'public'
          }) as PublicKeyJwk;

          if (!document.verificationMethod) {
            document.verificationMethod = [];
          }
          document.verificationMethod.push({
            id           : `${did}#${id}`,
            type         : 'JsonWebKey2020',
            controller   : did,
            publicKeyJwk : publicKeyJwk,
          });
          keyLookup.set(answer.name, id);

          break;
        }

        case 's': {
          const {id: sId, t: sType, uri} = DidDht.parseTxtData({ data: dataStr });

          if (!document.service) {
            document.service = [];
          }
          document.service.push({
            id              : `${did}#${sId}`,
            type            : sType,
            serviceEndpoint : uri
          });

          break;
        }
      }
    }

    // Extract relationships from root record
    const didSuffix = did.split('did:dht:')[1];
    const potentialRootNames = ['_did', `_did.${didSuffix}`];

    let actualRootName = null;
    const root = packet.answers
      .filter(answer => {
        if (potentialRootNames.includes(answer.name)) {
          actualRootName = answer.name;
          return true;
        }
        return false;
      }) as dns.TxtAnswer[];

    if (root.length === 0) {
      throw new Error('No root record found');
    }

    if (root.length > 1) {
      throw new Error('Multiple root records found');
    }
    const singleRoot = root[0] as dns.TxtAnswer;
    const rootRecord = singleRoot.data?.toString().split(';');
    rootRecord?.forEach(record => {
      const [type, ids] = record.split('=');
      let idList = ids?.split(',').map(id => `#${keyLookup.get(`_${id}.${actualRootName}`)}`);
      switch (type) {
        case 'auth':
          document.authentication = idList;
          break;
        case 'asm':
          document.assertionMethod = idList;
          break;
        case 'agm':
          document.keyAgreement = idList;
          break;
        case 'inv':
          document.capabilityInvocation = idList;
          break;
        case 'del':
          document.capabilityDelegation = idList;
          break;
      }
    });

    return document as DidDocument;
  }

  /**
   * Retrieves a DID Document from the DHT.
   *
   * @param did The DID of the document to retrieve.
   * @param relay The relay to use to retrieve the document; defaults to `PKARR_RELAY`.
   * @returns A Promise that resolves to the retrieved DidDocument.
   */
  public static async getDidDocument({ did, relay = PKARR_RELAY }: {
      did: string,
      relay?: string
    }): Promise<DidDocument> {
    const didFragment = did.replace('did:dht:', '');
    const publicKeyBytes = new Uint8Array(z32.decode(didFragment));
    const resolved = await Pkarr.relayGet(relay, publicKeyBytes);
    if (resolved) {
      return await DidDht.fromDnsPacket({ did, packet: resolved.packet() });
    }
    throw new Error('No packet found');
  }

  /**
   * Publishes a DID Document to the DHT.
   *
   * @param keyPair The key pair to sign the document with.
   * @param didDocument The DID Document to publish.
   * @param relay The relay to use to retrieve the document; defaults to `PKARR_RELAY`.
   * @returns A boolean indicating the success of the publishing operation.
   */
  public static async publishDidDocument({ keyPair, didDocument, relay = PKARR_RELAY }: {
    didDocument: DidDocument,
    keyPair: Web5Crypto.CryptoKeyPair,
    relay?: string
  }): Promise<boolean> {
    const packet = await DidDht.toDnsPacket({ didDocument });
    const pkarrKeypair = {
      publicKey : keyPair.publicKey.material,
      secretKey : new Uint8Array([...keyPair.privateKey.material, ...keyPair.publicKey.material])
    };
    const signedPacket = SignedPacket.fromPacket(pkarrKeypair, packet);
    const results = await Pkarr.relayPut(relay, signedPacket);

    return results.ok;
  }

  /**
   * Converts a DID Document to a DNS packet according to the did:dht spec.
   *
   * @param didDocument The DID Document to convert.
   * @returns A DNS packet converted from the DID Document.
   */
  public static async toDnsPacket({ didDocument }: { didDocument: DidDocument }): Promise<Packet> {
    const packet: Partial<Packet> = {
      id      : 0,
      type    : 'response',
      flags   : AUTHORITATIVE_ANSWER,
      answers : []
    };

    const vmIds: string[] = [];
    const svcIds: string[] = [];
    const rootRecord: string[] = [];
    const keyLookup = new Map<string, string>();

    // Add key records for each verification method
    for (const vm of didDocument.verificationMethod) {
      const index = didDocument.verificationMethod.indexOf(vm);
      const recordIdentifier = `k${index}`;
      let vmId = DidDht.identifierFragment({ identifier: vm.id });
      keyLookup.set(vmId, recordIdentifier);

      let keyType: number;
      switch (vm.publicKeyJwk.alg) {
        case 'EdDSA':
          keyType = 0;
          break;
        case 'ES256K':
          keyType = 1;
          break;
        default:
          keyType = 0; // Default value or throw an error if needed
      }

      const cryptoKey = await Jose.jwkToCryptoKey({ key: vm.publicKeyJwk });
      const keyBase64Url = Convert.uint8Array(cryptoKey.material).toBase64Url();

      const keyRecord: TxtAnswer = {
        type : 'TXT',
        name : `_${recordIdentifier}._did`,
        ttl  : TTL,
        data : `id=${vmId},t=${keyType},k=${keyBase64Url}`
      };

      packet.answers.push(keyRecord);
      vmIds.push(recordIdentifier);
    }

    // Add service records
    didDocument.service?.forEach((service, index) => {
      const recordIdentifier = `s${index}`;
      let sId = DidDht.identifierFragment({ identifier: service.id });
      const serviceRecord: TxtAnswer = {
        type : 'TXT',
        name : `_${recordIdentifier}._did`,
        ttl  : TTL,
        data : `id=${sId},t=${service.type},uri=${service.serviceEndpoint}`
      };

      packet.answers.push(serviceRecord);
      svcIds.push(recordIdentifier);
    });

    // add root record for vms and svcs
    if (vmIds.length) {
      rootRecord.push(`vm=${vmIds.join(',')}`);
    }
    if (svcIds.length) {
      rootRecord.push(`svc=${svcIds.join(',')}`);
    }

    // add verification relationships
    if (didDocument.authentication) {
      const authIds: string[] = didDocument.authentication
        .map(id => DidDht.identifierFragment({ identifier: id }))
        .filter(id => keyLookup.has(id))
        .map(id => keyLookup.get(id) as string);
      if (authIds.length) {
        rootRecord.push(`auth=${authIds.join(',')}`);
      }
    }
    if (didDocument.assertionMethod) {
      const authIds: string[] = didDocument.assertionMethod
        .map(id => DidDht.identifierFragment({ identifier: id }))
        .filter(id => keyLookup.has(id))
        .map(id => keyLookup.get(id) as string);
      if (authIds.length) {
        rootRecord.push(`asm=${authIds.join(',')}`);
      }
    }
    if (didDocument.keyAgreement) {
      const authIds: string[] = didDocument.keyAgreement
        .map(id => DidDht.identifierFragment({ identifier: id }))
        .filter(id => keyLookup.has(id))
        .map(id => keyLookup.get(id) as string);
      if (authIds.length) {
        rootRecord.push(`agm=${authIds.join(',')}`);
      }
    }
    if (didDocument.capabilityInvocation) {
      const authIds: string[] = didDocument.capabilityInvocation
        .map(id => DidDht.identifierFragment({ identifier: id }))
        .filter(id => keyLookup.has(id))
        .map(id => keyLookup.get(id) as string);
      if (authIds.length) {
        rootRecord.push(`inv=${authIds.join(',')}`);
      }
    }
    if (didDocument.capabilityDelegation) {
      const authIds: string[] = didDocument.capabilityDelegation
        .map(id => DidDht.identifierFragment({ identifier: id }))
        .filter(id => keyLookup.has(id))
        .map(id => keyLookup.get(id) as string);
      if (authIds.length) {
        rootRecord.push(`del=${authIds.join(',')}`);
      }
    }

    // Add root record
    packet.answers.push({
      type : 'TXT',
      name : '_did',
      ttl  : TTL,
      data : rootRecord.join(';')
    });

    return packet as Packet;
  }

  /**
   * Extracts the fragment from a DID.
   *
   * @param identifier The DID to extract the fragment from.
   * @returns The fragment from the DID or the complete DID if no fragment exists.
   */
  private static identifierFragment({ identifier }: { identifier: string }): string {
    return identifier.includes('#') ? identifier.substring(identifier.indexOf('#') + 1) : identifier;
  }

  /**
   * Parses TXT data from a DNS answer to extract key or service information.
   *
   * @param data The TXT record string data containing key-value pairs separated by commas.
   * @returns An object containing parsed attributes such as 'id', 't', 'k', and 'uri'.
  */
  private static parseTxtData({ data }: { data: string }): { [key: string]: string } {
    return data.split(',').reduce((acc, pair) => {
      const [key, value] = pair.split('=');
      acc[key] = value;
      return acc;
    }, {} as { [key: string]: string });
  }
}