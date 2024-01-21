import sinon from 'sinon';
import { expect } from 'chai';
import { Jose } from '@web5/crypto';

import type { DidKeySetVerificationMethodKey, DidService } from '../src/types.js';

import { DidDht } from '../src/dht.js';
import { DidDhtMethod } from '../src/did-dht.js';

describe('DidDht', () => {
  it('should create a put and parse a get request', async () => {

    const { document, keySet } = await DidDhtMethod.create();
    const identityKey = keySet.verificationMethodKeys.find(key => key.publicKeyJwk.kid === '0');
    const publicCryptoKey = await Jose.jwkToCryptoKey({ key: identityKey.publicKeyJwk });
    const privateCryptoKey = await Jose.jwkToCryptoKey({ key: identityKey.privateKeyJwk });

    const dhtPublishStub = sinon.stub(DidDht, 'publishDidDocument').resolves(true);
    const dhtGetStub = sinon.stub(DidDht, 'getDidDocument').resolves(document);

    const published = await DidDht.publishDidDocument({
      keyPair: {
        publicKey  : publicCryptoKey,
        privateKey : privateCryptoKey
      },
      didDocument: document
    });

    expect(published).to.be.true;

    const gotDid = await DidDht.getDidDocument({ did: document.id });
    expect(gotDid.id).to.deep.equal(document.id);
    expect(gotDid.capabilityDelegation).to.deep.equal(document.capabilityDelegation);
    expect(gotDid.capabilityInvocation).to.deep.equal(document.capabilityInvocation);
    expect(gotDid.keyAgreement).to.deep.equal(document.keyAgreement);
    expect(gotDid.service).to.deep.equal(document.service);
    expect(gotDid.verificationMethod.length).to.deep.equal(document.verificationMethod.length);
    expect(gotDid.verificationMethod[0].id).to.deep.equal(document.verificationMethod[0].id);
    expect(gotDid.verificationMethod[0].type).to.deep.equal(document.verificationMethod[0].type);
    expect(gotDid.verificationMethod[0].controller).to.deep.equal(document.verificationMethod[0].controller);
    expect(gotDid.verificationMethod[0].publicKeyJwk.kid).to.deep.equal(document.verificationMethod[0].publicKeyJwk.kid);
    expect(gotDid.verificationMethod[0].publicKeyJwk.kty).to.deep.equal(document.verificationMethod[0].publicKeyJwk.kty);

    expect(dhtPublishStub.calledOnce).to.be.true;
    expect(dhtGetStub.calledOnce).to.be.true;
    sinon.restore();
  });

  describe('Codec', async () => {
    it('encodes and decodes a DID Document as a DNS Packet', async () => {
      const services: DidService[] = [{
        id              : 'dwn',
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
        verificationMethodKeys: [vm],
      };
      const { did, document } = await DidDhtMethod.create({ services: services, keySet: keySet });
      const encoded = await DidDht.toDnsPacket({ didDocument: document });
      const decoded = await DidDht.fromDnsPacket({ did, packet: encoded });

      expect(document.id).to.deep.equal(decoded.id);
      expect(document.capabilityDelegation).to.deep.equal(decoded.capabilityDelegation);
      expect(document.capabilityInvocation).to.deep.equal(decoded.capabilityInvocation);
      expect(document.keyAgreement).to.deep.equal(decoded.keyAgreement);
      expect(document.service).to.deep.equal(decoded.service);
      expect(document.verificationMethod.length).to.deep.equal(decoded.verificationMethod.length);
      expect(document.verificationMethod[0].id).to.deep.equal(decoded.verificationMethod[0].id);
      expect(document.verificationMethod[0].type).to.deep.equal(decoded.verificationMethod[0].type);
      expect(document.verificationMethod[0].controller).to.deep.equal(decoded.verificationMethod[0].controller);
      expect(document.verificationMethod[0].publicKeyJwk.kid).to.deep.equal(decoded.verificationMethod[0].publicKeyJwk.kid);
      expect(document.verificationMethod[0].publicKeyJwk.kty).to.deep.equal(decoded.verificationMethod[0].publicKeyJwk.kty);
      expect(document.verificationMethod[1].id).to.deep.equal(decoded.verificationMethod[1].id);
      expect(document.verificationMethod[1].type).to.deep.equal(decoded.verificationMethod[1].type);
      expect(document.verificationMethod[1].controller).to.deep.equal(decoded.verificationMethod[1].controller);
      expect(document.verificationMethod[1].publicKeyJwk.kid).to.deep.equal(decoded.verificationMethod[1].publicKeyJwk.kid);
      expect(document.verificationMethod[1].publicKeyJwk.kty).to.deep.equal(decoded.verificationMethod[1].publicKeyJwk.kty);
    });
  });
});