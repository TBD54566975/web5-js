import {expect} from 'chai';
import {DidDht} from '../src/dht.js';
import {DidDhtKeySet, DidDhtMethod} from '../src/did-dht.js';
import {Jose} from '@web5/crypto';
import {DidKeySetVerificationMethodKey, DidService} from "../src/index.js";

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

    console.log('did', document.id);
    console.log('hash', hash);

    const retrievedValue = await dht.get(hash);

    const gotDid = await dht.parseGetDidResponse(retrievedValue);
    expect(gotDid).to.deep.equal(document);
  });
});

describe('Codec', async () => {
  it('encodes and decodes a DID Document as a DNS Packet', async () => {
    const services: DidService[] = [{
      id              : '#dwn',
      type            : 'DecentralizedWebNode',
      serviceEndpoint : 'https://example.com/dwn'
    }];
    const secp = await DidDhtMethod.generateJwkKeyPair({keyAlgorithm: 'secp256k1'});
    const vm: DidKeySetVerificationMethodKey = {
      publicKeyJwk  : secp.publicKeyJwk,
      privateKeyJwk : secp.privateKeyJwk,
      relationships : ['authentication', 'assertionMethod']
    };
    const keySet = {
      verificationMethodKeys : [vm],
    }
    const {did, document} = await DidDhtMethod.create({services: services, keySet: keySet});

    console.log('document', JSON.stringify(document));
    const encoded = await DidDht.toEncodedDnsPacket(document);

    const decoded = await DidDht.fromEncodedDnsPacket(did, encoded);
    expect(decoded).to.deep.equal(decoded);

    console.log('decoded', JSON.stringify(decoded));
  });
});
