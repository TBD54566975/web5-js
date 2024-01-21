var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import sinon from 'sinon';
import { expect } from 'chai';
import { Jose } from '@web5/crypto';
import { DidDht } from '../src/dht.js';
import { DidDhtMethod } from '../src/did-dht.js';
describe('DidDht', () => {
    it('should create a put and parse a get request', () => __awaiter(void 0, void 0, void 0, function* () {
        const { document, keySet } = yield DidDhtMethod.create();
        const identityKey = keySet.verificationMethodKeys.find(key => key.publicKeyJwk.kid === '0');
        const publicCryptoKey = yield Jose.jwkToCryptoKey({ key: identityKey.publicKeyJwk });
        const privateCryptoKey = yield Jose.jwkToCryptoKey({ key: identityKey.privateKeyJwk });
        const dhtPublishStub = sinon.stub(DidDht, 'publishDidDocument').resolves(true);
        const dhtGetStub = sinon.stub(DidDht, 'getDidDocument').resolves(document);
        const published = yield DidDht.publishDidDocument({
            keyPair: {
                publicKey: publicCryptoKey,
                privateKey: privateCryptoKey
            },
            didDocument: document
        });
        expect(published).to.be.true;
        const gotDid = yield DidDht.getDidDocument({ did: document.id });
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
    }));
    describe('Codec', () => __awaiter(void 0, void 0, void 0, function* () {
        it('encodes and decodes a DID Document as a DNS Packet', () => __awaiter(void 0, void 0, void 0, function* () {
            const services = [{
                    id: 'dwn',
                    type: 'DecentralizedWebNode',
                    serviceEndpoint: 'https://example.com/dwn'
                }];
            const secp = yield DidDhtMethod.generateJwkKeyPair({ keyAlgorithm: 'secp256k1' });
            const vm = {
                publicKeyJwk: secp.publicKeyJwk,
                privateKeyJwk: secp.privateKeyJwk,
                relationships: ['authentication', 'assertionMethod']
            };
            const keySet = {
                verificationMethodKeys: [vm],
            };
            const { did, document } = yield DidDhtMethod.create({ services: services, keySet: keySet });
            const encoded = yield DidDht.toDnsPacket({ didDocument: document });
            const decoded = yield DidDht.fromDnsPacket({ did, packet: encoded });
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
        }));
    }));
});
//# sourceMappingURL=dht.spec.js.map