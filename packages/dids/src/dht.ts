import {Jose, PublicKeyJwk, Web5Crypto} from '@web5/crypto';
import DHT from 'bittorrent-dht';
import ed from 'bittorrent-dht-sodium';
import {DidDocument} from './types.js';
import dns, {AUTHORITATIVE_ANSWER, Packet, TxtAnswer} from 'dns-packet'
import Encoder from "@decentralized-identity/ion-sdk/dist/lib/Encoder.js";

const DEFAULT_BOOTSTRAP = [
    'router.magnets.im:6881',
    'router.bittorrent.com:6881',
    'router.utorrent.com:6881',
    'dht.transmissionbt.com:6881',
    'router.nuh.dev:6881'
].map(addr => {
    const [host, port] = addr.split(':');
    return {host, port: Number(port)};
});

const TTL = 7200;

export type PutRequest = {
    // sequence number of the request
    seq: number;
    // data value, encoded and compressed
    v: Buffer;
    // public key of the signer
    k: Buffer;
    // secret key of the signer
    sk: Buffer;
};

export class DidDht {
    private dht: DHT;

    constructor() {
        this.dht = new DHT({bootstrap: DEFAULT_BOOTSTRAP, verify: ed.verify});

        this.dht.listen(0, () => {
            console.debug('DHT is listening...');
        });
    }

    public async createPutDidRequest(keypair: Web5Crypto.CryptoKeyPair, did: DidDocument): Promise<PutRequest> {
        const seq = Math.ceil(Date.now() / 1000);
        const v = await DidDht.toEncodedDnsPacket(did);
        return {
            seq: seq,
            v: Buffer.from(v),
            k: Buffer.from(keypair.publicKey.material),
            sk: Buffer.concat([keypair.privateKey.material, keypair.publicKey.material])
        };
    }

    public async put(request: PutRequest): Promise<string> {
        const opts = {
            k: request.k,
            v: request.v,
            seq: request.seq,
            sign: function (buf: Buffer) {
                return ed.sign(buf, request.sk);
            }
        };
        return new Promise((resolve, reject) => {
            this.dht.put(opts, (err, hash) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(hash.toString('hex'));
                }
            });
        });
    }

    public async parseGetDidResponse(id: string, response: Buffer): Promise<DidDocument> {
        return await DidDht.fromEncodedDnsPacket(id, response);
    }

    public async get(keyHash: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            this.dht.get(keyHash, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res.v);
                }
            });
        });
    }

    public static async toEncodedDnsPacket(document: DidDocument): Promise<Buffer> {
        const packet: Partial<Packet> = {
            id: 0,
            type: 'response',
            flags: AUTHORITATIVE_ANSWER,
            answers: []
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
                type: 'TXT',
                name: `_${recordIdentifier}._did`,
                ttl: TTL,
                data: Buffer.from(`id=${vmId},t=${keyType},k=${keyBase64Url}`)
            };

            packet.answers.push(keyRecord);
            rootRecord.push(`vm=${recordIdentifier}`);
        }

        // Add service records
        document.service?.forEach((service, index) => {
            const recordIdentifier = `s${index}`;
            let sId = DidDht.identifierFragment(service.id);
            const serviceRecord: TxtAnswer = {
                type: 'TXT',
                name: `_${recordIdentifier}._did`,
                ttl: TTL,
                data: Buffer.from(`id=${sId},t=${service.type},uri=${service.serviceEndpoint}`)
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
                rootRecord.push(`auth=${authIds.join(",")}`);
            }
        }
        if (document.assertionMethod) {
            const authIds: string[] = document.assertionMethod
                .map(id => DidDht.identifierFragment(id))
                .filter(id => keyLookup.has(id))
                .map(id => keyLookup.get(id) as string);
            if (authIds.length) {
                rootRecord.push(`asm=${authIds.join(",")}`);
            }
        }
        if (document.keyAgreement) {
            const authIds: string[] = document.keyAgreement
                .map(id => DidDht.identifierFragment(id))
                .filter(id => keyLookup.has(id))
                .map(id => keyLookup.get(id) as string);
            if (authIds.length) {
                rootRecord.push(`agm=${authIds.join(",")}`);
            }
        }
        if (document.capabilityInvocation) {
            const authIds: string[] = document.capabilityInvocation
                .map(id => DidDht.identifierFragment(id))
                .filter(id => keyLookup.has(id))
                .map(id => keyLookup.get(id) as string);
            if (authIds.length) {
                rootRecord.push(`inv=${authIds.join(",")}`);
            }
        }
        if (document.capabilityDelegation) {
            const authIds: string[] = document.capabilityDelegation
                .map(id => DidDht.identifierFragment(id))
                .filter(id => keyLookup.has(id))
                .map(id => keyLookup.get(id) as string);
            if (authIds.length) {
                rootRecord.push(`del=${authIds.join(",")}`);
            }
        }

        // Add root record
        packet.answers.push({
            type: 'TXT',
            name: '_did',
            ttl: TTL,
            data: Buffer.from(rootRecord.join(";"))
        });

        return dns.encode(packet);
    }

    private static identifierFragment(identifier: string): string {
        return identifier.includes("#") ? identifier.substring(identifier.indexOf("#") + 1) : identifier;
    }

    /**
     * @param did The DID of the document
     * @param encodedPacket A Uint8Array containing the encoded DNS packet
     */
    public static async fromEncodedDnsPacket(did: string, encodedPacket: Buffer): Promise<DidDocument> {
        const packet = dns.decode(encodedPacket);
        const document: Partial<DidDocument> = {
            id: did,
        };

        const keyLookup = new Map<string, string>();

        for (const answer of packet.answers) {
            if (answer.type !== 'TXT') continue;

            const dataStr = answer.data?.toString();
            // Extracts 'k' or 's' from "_k0._did" or "_s0._did"
            const recordType = answer.name?.split('.')[0].substring(1, 2);

            switch (recordType) {
                case 'k':
                    const {id, t, k} = DidDht.parseTxtData(dataStr);
                    const keyConfigurations: { [keyType: string]: Partial<PublicKeyJwk> } = {
                        '0': {
                            crv: 'Ed25519',
                            kty: 'OKP',
                            alg: 'EdDSA'
                        },
                        '1': {
                            crv: 'secp256k1',
                            kty: 'EC',
                            alg: 'ES256K'
                        }
                    };
                    const keyConfig = keyConfigurations[t];
                    if (!keyConfig) {
                        throw new Error('Unsupported key type');
                    }

                    const publicKeyJwk = await Jose.keyToJwk({
                        ...keyConfig,
                        kid: id,
                        keyMaterial: Encoder.decodeAsBytes(k, "key"),
                        keyType: 'public'
                    }) as PublicKeyJwk;

                    if (!document.verificationMethod) {
                        document.verificationMethod = [];
                    }
                    document.verificationMethod.push({
                        id: `${did}#${id}`,
                        type: 'JsonWebKey2020',
                        controller: did,
                        publicKeyJwk: publicKeyJwk,
                    });
                    keyLookup.set(answer.name, id);
                    break;
                case 's':
                    const {id: sId, t: sType, uri} = DidDht.parseTxtData(dataStr);

                    if (!document.service) {
                        document.service = [];
                    }
                    document.service.push({
                        id: `${did}#${sId}`,
                        type: sType,
                        serviceEndpoint: uri
                    });
                    break;
            }
        }

        // Extract relationships from root record
        const root = packet.answers.filter(answer => answer.name === '_did');
        if (!root.length) {
            throw new Error('No root record found');
        }
        if (root.length > 1) {
            throw new Error('Multiple root records found');
        }
        const singleRoot = root[0] as dns.TxtAnswer;
        const rootRecord = singleRoot.data?.toString().split(';');
        rootRecord?.forEach(record => {
            const [type, ids] = record.split('=');
            const idList = ids?.split(',').map(id => `#${keyLookup.get(`_${id}._did`)}`);
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

    public static parseTxtData(data: string): { [key: string]: string } {
        return data.split(',').reduce((acc, pair) => {
            const [key, value] = pair.split('=');
            acc[key] = value;
            return acc;
        }, {} as { [key: string]: string });
    }

    public static async printEncodedDnsPacket(encodedPacket: Buffer) {
        const packet = dns.decode(encodedPacket);
        packet.answers.forEach(answer => {
            if (answer.type === 'TXT') {
                const data = answer.data.toString();
                console.log(answer.name, data);
            }
        })
    }

    public destroy(): void {
        this.dht.destroy();
    }
}
