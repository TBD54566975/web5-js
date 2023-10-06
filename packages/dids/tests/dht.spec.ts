import {expect} from 'chai';
import {DidDht} from '../src/dht.js';
import {DidDhtKeySet, DidDhtMethod} from '../src/did-dht.js';
import {Jose} from '@web5/crypto';

describe('DHT', function () {
  this.timeout(20000); // 20 seconds

  const dht = new DidDht();
  after(() => {
    dht.destroy();
  });

  it('should put and get data from DHT', async () => {
    const {document, keySet} = await DidDhtMethod.create();
    const ks = keySet as DidDhtKeySet;
    const publicCryptoKey = await Jose.jwkToCryptoKey({key: ks.identityKey.publicKeyJwk});
    const privateCryptoKey = await Jose.jwkToCryptoKey({key: ks.identityKey.privateKeyJwk});

    const request = await dht.createPutDidRequest({
      publicKey  : publicCryptoKey,
      privateKey : privateCryptoKey
    }, document);

    const hash = await dht.put(request);

    const retrievedValue = await dht.get(hash);

    const gotDid = await dht.parseGetDidResponse(retrievedValue);
    expect(gotDid).to.deep.equal(document);
  });
});

describe('Codec', async () => {

  it('compresses and decompresses an uncompressable value', async () => {
    const uncompressable = [['2'], ['3']];
    const compressed = await DidDht.compress(uncompressable);
    const decompressed = await DidDht.decompress(compressed);

    const uncompressableBuffer = Buffer.from(JSON.stringify(uncompressable));
    const compressedBuffer = Buffer.from(compressed);
    expect(compressedBuffer.length).to.be.greaterThanOrEqual(uncompressableBuffer.length);
    expect(decompressed).to.deep.equal(uncompressable);
  });

  it('compresses and decompresses a compressable value', async () => {
    const records = [['did', '{"@context":"https://w3id.org/did/v1", "id": "did:example:123"}']];
    const compressed = await DidDht.compress(records);
    const decompressed = await DidDht.decompress(compressed);

    const uncompressableBuffer = Buffer.from(JSON.stringify(records));
    const compressedBuffer = Buffer.from(compressed);
    expect(compressedBuffer.length).to.be.lessThan(uncompressableBuffer.length);
    expect(decompressed).to.deep.equal(records);
  });
});
