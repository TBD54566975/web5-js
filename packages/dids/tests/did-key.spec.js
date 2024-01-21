var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { expect } from 'chai';
import { DidKeyMethod } from '../src/did-key.js';
import { didKeyCreateTestVectors, didKeyCreateDocumentTestVectors, } from './fixtures/test-vectors/did-key.js';
describe('DidKeyMethod', () => {
    describe('create()', () => {
        it('creates a DID with Ed25519 keys, by default', () => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const portableDid = yield DidKeyMethod.create();
            // Verify expected result.
            expect(portableDid).to.have.property('did');
            expect(portableDid).to.have.property('document');
            expect(portableDid).to.have.property('keySet');
            expect(portableDid.keySet).to.have.property('verificationMethodKeys');
            expect(portableDid.keySet.verificationMethodKeys).to.have.length(1);
            expect((_a = portableDid.keySet.verificationMethodKeys) === null || _a === void 0 ? void 0 : _a[0]).to.have.property('publicKeyJwk');
            expect((_b = portableDid.keySet.verificationMethodKeys) === null || _b === void 0 ? void 0 : _b[0]).to.have.property('privateKeyJwk');
            expect((_c = portableDid.keySet.verificationMethodKeys) === null || _c === void 0 ? void 0 : _c[0].publicKeyJwk).to.have.property('alg', 'EdDSA');
            expect((_d = portableDid.keySet.verificationMethodKeys) === null || _d === void 0 ? void 0 : _d[0].publicKeyJwk).to.have.property('crv', 'Ed25519');
        }));
        it('creates a DID with secp256k1 keys, if specified', () => __awaiter(void 0, void 0, void 0, function* () {
            var _e, _f, _g, _h;
            const portableDid = yield DidKeyMethod.create({ keyAlgorithm: 'secp256k1' });
            // Verify expected result.
            expect(portableDid).to.have.property('did');
            expect(portableDid).to.have.property('document');
            expect(portableDid).to.have.property('keySet');
            expect(portableDid.keySet).to.have.property('verificationMethodKeys');
            expect(portableDid.keySet.verificationMethodKeys).to.have.length(1);
            expect((_e = portableDid.keySet.verificationMethodKeys) === null || _e === void 0 ? void 0 : _e[0]).to.have.property('publicKeyJwk');
            expect((_f = portableDid.keySet.verificationMethodKeys) === null || _f === void 0 ? void 0 : _f[0]).to.have.property('privateKeyJwk');
            expect((_g = portableDid.keySet.verificationMethodKeys) === null || _g === void 0 ? void 0 : _g[0].publicKeyJwk).to.have.property('alg', 'ES256K');
            expect((_h = portableDid.keySet.verificationMethodKeys) === null || _h === void 0 ? void 0 : _h[0].publicKeyJwk).to.have.property('crv', 'secp256k1');
        }));
        for (const vector of didKeyCreateTestVectors) {
            it(`passes test vector ${vector.id}`, () => __awaiter(void 0, void 0, void 0, function* () {
                const portableDid = yield DidKeyMethod.create(vector.input);
                expect(portableDid).to.deep.equal(vector.output);
            }));
        }
    });
    describe('createDocument()', () => {
        it('accepts an alternate default context', () => __awaiter(void 0, void 0, void 0, function* () {
            const didDocument = yield DidKeyMethod.createDocument({
                did: 'did:key:z6MkjVM3rLLh9KCFBfKPNA5oEBq6KXXsPu72FDX7cZzYJN3y',
                defaultContext: 'https://www.w3.org/ns/did/v99',
                publicKeyFormat: 'JsonWebKey2020'
            });
            expect(didDocument['@context']).to.include('https://www.w3.org/ns/did/v99');
        }));
        for (const vector of didKeyCreateDocumentTestVectors) {
            it(`passes test vector ${vector.id}`, () => __awaiter(void 0, void 0, void 0, function* () {
                const didDocument = yield DidKeyMethod.createDocument(vector.input);
                expect(didDocument).to.deep.equal(vector.output);
            }));
        }
    });
    describe('getDefaultSigningKey()', () => {
        it('returns the did:key default signing key, when present', () => __awaiter(void 0, void 0, void 0, function* () {
            const partialDidDocument = {
                authentication: [
                    'did:key:z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk#z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk'
                ]
            };
            const defaultSigningKeyId = yield DidKeyMethod.getDefaultSigningKey({
                didDocument: partialDidDocument
            });
            expect(defaultSigningKeyId).to.equal('did:key:z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk#z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk');
        }));
        it('returns undefined if the did:key default signing key is not present', () => __awaiter(void 0, void 0, void 0, function* () {
            const partialDidDocument = {
                authentication: [{
                        id: 'did:key:z6LSgmjjYTAffdKWLmBbYxe5d5fgLzuZxi6PEbHZNt3Cifvg#z6LSgmjjYTAffdKWLmBbYxe5d5fgLzuZxi6PEbHZNt3Cifvg',
                        type: 'JsonWebKey2020',
                        controller: 'did:key:z6LSgmjjYTAffdKWLmBbYxe5d5fgLzuZxi6PEbHZNt3Cifvg',
                        publicKeyJwk: {
                            kty: 'OKP',
                            crv: 'X25519',
                            x: 'S7cqN2_-PIPK6fVjR6PrQ1YZyyw61ajVnAJClFcXVhk'
                        }
                    }],
                keyAgreement: [
                    'did:key:z6LSqCkip7X19obTwRpWc8ZLLCiXLzVQBFpcBAsTW38m6Rzs#z6LSqCkip7X19obTwRpWc8ZLLCiXLzVQBFpcBAsTW38m6Rzs'
                ]
            };
            const defaultSigningKeyId = yield DidKeyMethod.getDefaultSigningKey({
                didDocument: partialDidDocument
            });
            expect(defaultSigningKeyId).to.be.undefined;
        }));
    });
});
//# sourceMappingURL=did-key.spec.js.map