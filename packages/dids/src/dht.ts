import dns, {AUTHORITATIVE_ANSWER, Packet, TxtAnswer} from 'dns-packet';
import Encoder from '@decentralized-identity/ion-sdk/dist/lib/Encoder.js';
import {Pkarr, SignedPacket, z32} from 'pkarr';
import type {PublicKeyJwk, Web5Crypto} from '@web5/crypto';
import {Jose} from '@web5/crypto';
import type {DidDocument} from './types.js';

const PKARR_RELAYS = ['https://relay.pkarr.org'];
const TTL = 7200;

export class DidDht {

  /**
     * Publishes a DID Document to the DHT
     * @param keypair The keypair to sign the document with
     * @param did The DID Document to publish
     */
  public static async publishDidDocument(keypair: Web5Crypto.CryptoKeyPair, did: DidDocument): Promise<boolean> {
    const packet = await DidDht.toDnsPacket(did);
    const pkarrKeypair = {
      publicKey : keypair.publicKey.material,
      secretKey : new Uint8Array([...keypair.privateKey.material, ...keypair.publicKey.material])
    };
    const signedPacket = SignedPacket.fromPacket(pkarrKeypair, packet);
    const results = await Promise.all(PKARR_RELAYS.map(relay => Pkarr.relayPut(relay, signedPacket)));
    const successfulCount = results.filter(Boolean).length;
    return successfulCount > 0;
  }

  /**
     * Converts a DID Document to a DNS packet according to the did:dht spec
     * @param document The DID Document to convert
     */
  private static async toDnsPacket(document: DidDocument): Promise<Packet> {
    const packet: Partial<Packet> = {
      id      : 0,
      type    : 'response',
      flags   : AUTHORITATIVE_ANSWER,
      answers : []
    };

    const rootRecord: string[] = [];
    const keyLookup = new Map<string, string>();

    // Add key records for each verification method
    for (const vm of document.verificationMethod) {
      const index = document.verificationMethod.indexOf(vm);
      const recordIdentifier = `k${index}`;
      let vmId = DidDht.identifierFragment(vm.id);
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

      const cryptoKey = await Jose.jwkToCryptoKey({key: vm.publicKeyJwk});
      const keyBase64Url = Encoder.encode(cryptoKey.material);
      const keyRecord: TxtAnswer = {
        type : 'TXT',
        name : `_${recordIdentifier}._did`,
        ttl  : TTL,
        data : `id=${vmId},t=${keyType},k=${keyBase64Url}`
      };

      packet.answers.push(keyRecord);
      rootRecord.push(`vm=${recordIdentifier}`);
    }

    // Add service records
    document.service?.forEach((service, index) => {
      const recordIdentifier = `s${index}`;
      let sId = DidDht.identifierFragment(service.id);
      const serviceRecord: TxtAnswer = {
        type : 'TXT',
        name : `_${recordIdentifier}._did`,
        ttl  : TTL,
        data : `id=${sId},t=${service.type},uri=${service.serviceEndpoint}`
      };

      packet.answers.push(serviceRecord);
      rootRecord.push(`srv=${recordIdentifier}`);
    });

    // add verification relationships
    if (document.authentication) {
      const authIds: string[] = document.authentication
        .map(id => DidDht.identifierFragment(id))
        .filter(id => keyLookup.has(id))
        .map(id => keyLookup.get(id) as string);
      if (authIds.length) {
        rootRecord.push(`auth=${authIds.join(',')}`);
      }
    }
    if (document.assertionMethod) {
      const authIds: string[] = document.assertionMethod
        .map(id => DidDht.identifierFragment(id))
        .filter(id => keyLookup.has(id))
        .map(id => keyLookup.get(id) as string);
      if (authIds.length) {
        rootRecord.push(`asm=${authIds.join(',')}`);
      }
    }
    if (document.keyAgreement) {
      const authIds: string[] = document.keyAgreement
        .map(id => DidDht.identifierFragment(id))
        .filter(id => keyLookup.has(id))
        .map(id => keyLookup.get(id) as string);
      if (authIds.length) {
        rootRecord.push(`agm=${authIds.join(',')}`);
      }
    }
    if (document.capabilityInvocation) {
      const authIds: string[] = document.capabilityInvocation
        .map(id => DidDht.identifierFragment(id))
        .filter(id => keyLookup.has(id))
        .map(id => keyLookup.get(id) as string);
      if (authIds.length) {
        rootRecord.push(`inv=${authIds.join(',')}`);
      }
    }
    if (document.capabilityDelegation) {
      const authIds: string[] = document.capabilityDelegation
        .map(id => DidDht.identifierFragment(id))
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
     * Extracts the fragment from a DID
     * @param identifier The DID to extract the fragment from
     */
  private static identifierFragment(identifier: string): string {
    return identifier.includes('#') ? identifier.substring(identifier.indexOf('#') + 1) : identifier;
  }

  /**
     * Retrieves a DID Document from the DHT
     * @param did The DID of the document to retrieve
     */
  public static async getDidDocument(did: string): Promise<DidDocument> {
    const didFragment = did.replace('did:dht:', '');
    const publicKeyBytes = new Uint8Array(z32.decode(didFragment));
    for (const relay of PKARR_RELAYS) {
      const resolved = await Pkarr.relayGet(relay, publicKeyBytes);
      if (resolved) {
        return await DidDht.fromDnsPacket(did, resolved.packet());
      }
    }
    throw new Error('No packet found');
  }

  /**
     * Parses a DNS packet into a DID Document
     * @param did The DID of the document
     * @param packet A DNS packet to parse into a DID Document
     */
  private static async fromDnsPacket(did: string, packet: Packet): Promise<DidDocument> {
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
        case 'k':
          const {id, t, k} = DidDht.parseTxtData(dataStr);
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
            keyMaterial : Encoder.decodeAsBytes(k, 'key'),
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
        case 's':
          const {id: sId, t: sType, uri} = DidDht.parseTxtData(dataStr);

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

  private static parseTxtData(data: string): { [key: string]: string } {
    return data.split(',').reduce((acc, pair) => {
      const [key, value] = pair.split('=');
      acc[key] = value;
      return acc;
    }, {} as { [key: string]: string });
  }
}
