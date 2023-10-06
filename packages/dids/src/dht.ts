import {Web5Crypto} from '@web5/crypto';
import DHT from 'bittorrent-dht';
import ed from 'bittorrent-dht-sodium';
import brotli from 'brotli-compress';
import b4a from 'b4a';
import {DidDocument} from "./types.js";


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
    const records: string[][] = [['did', JSON.stringify(did)]];
    const v = await DidDht.compress(records);
    return {
      seq : seq,
      v   : Buffer.from(v),
      k   : Buffer.from(keypair.publicKey.material),
      sk  : Buffer.concat([keypair.privateKey.material, keypair.publicKey.material])
    };
  }

  public async put(request: PutRequest): Promise<string> {
    const opts = {
      k    : request.k,
      v    : request.v,
      seq  : request.seq,
      sign : function (buf: Buffer) {
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

  public async parseGetDidResponse(response: Buffer): Promise<DidDocument> {
    const records = await DidDht.decompress(response);
    const didRecord = records.find(record => record[0] === 'did');
    if (!didRecord) {
      throw new Error('No DID record found');
    }
    return JSON.parse(didRecord[1]);
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

  public static async compress(records: string[][]): Promise<Uint8Array> {
    const string = JSON.stringify(records);
    const toCompress = b4a.from(string);
    return await brotli.compress(toCompress);
  }

  /**
     * @param compressed A Uint8Array containing the compressed data
     */
  public static async decompress(compressed: Uint8Array): Promise<string[][]> {
    const decompressed = await brotli.decompress(compressed);
    const string = b4a.toString(b4a.from(decompressed));
    return JSON.parse(string);
  }

  public destroy(): void {
    this.dht.destroy();
  }
}
