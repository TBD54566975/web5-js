import type { Packet } from 'dns-packet';
import type { Web5Crypto } from '@web5/crypto';
import type { DidDocument } from './types.js';
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
export declare class DidDht {
    /**
     * Parses a DNS packet into a DID Document.
     * @param did The DID of the document.
     * @param packet A DNS packet to parse into a DID Document.
     * @returns A Promise that resolves to the parsed DidDocument.
     */
    static fromDnsPacket({ did, packet }: {
        did: string;
        packet: Packet;
    }): Promise<DidDocument>;
    /**
     * Retrieves a DID Document from the DHT.
     *
     * @param did The DID of the document to retrieve.
     * @param relay The relay to use to retrieve the document; defaults to `PKARR_RELAY`.
     * @returns A Promise that resolves to the retrieved DidDocument.
     */
    static getDidDocument({ did, relay }: {
        did: string;
        relay?: string;
    }): Promise<DidDocument>;
    /**
     * Publishes a DID Document to the DHT.
     *
     * @param keyPair The key pair to sign the document with.
     * @param didDocument The DID Document to publish.
     * @param relay The relay to use to retrieve the document; defaults to `PKARR_RELAY`.
     * @returns A boolean indicating the success of the publishing operation.
     */
    static publishDidDocument({ keyPair, didDocument, relay }: {
        didDocument: DidDocument;
        keyPair: Web5Crypto.CryptoKeyPair;
        relay?: string;
    }): Promise<boolean>;
    /**
     * Converts a DID Document to a DNS packet according to the did:dht spec.
     *
     * @param didDocument The DID Document to convert.
     * @returns A DNS packet converted from the DID Document.
     */
    static toDnsPacket({ didDocument }: {
        didDocument: DidDocument;
    }): Promise<Packet>;
    /**
     * Extracts the fragment from a DID.
     *
     * @param identifier The DID to extract the fragment from.
     * @returns The fragment from the DID or the complete DID if no fragment exists.
     */
    private static identifierFragment;
    /**
     * Parses TXT data from a DNS answer to extract key or service information.
     *
     * @param data The TXT record string data containing key-value pairs separated by commas.
     * @returns An object containing parsed attributes such as 'id', 't', 'k', and 'uri'.
    */
    private static parseTxtData;
}
//# sourceMappingURL=dht.d.ts.map