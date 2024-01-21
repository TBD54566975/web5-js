var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { Jose } from '../src/jose.js';
import { joseToMulticodecTestVectors, jwkToMultibaseIdTestVectors, } from './fixtures/test-vectors/jose.js';
chai.use(chaiAsPromised);
describe('Jose', () => {
    describe('joseToMulticodec()', () => {
        it('converts JOSE to Multicodec', () => __awaiter(void 0, void 0, void 0, function* () {
            let multicoded;
            for (const vector of joseToMulticodecTestVectors) {
                multicoded = yield Jose.jwkToMulticodec({
                    jwk: vector.input,
                });
                expect(multicoded).to.deep.equal(vector.output);
            }
        }));
        it('throws an error if unsupported JOSE has been passed', () => __awaiter(void 0, void 0, void 0, function* () {
            yield expect(
            // @ts-expect-error because parameters are intentionally omitted to trigger an error.
            Jose.jwkToMulticodec({ jwk: { crv: '123' } })).to.eventually.be.rejectedWith(Error, `Unsupported JOSE to Multicodec conversion: '123:public'`);
        }));
    });
    describe('publicKeyToMultibaseId()', () => {
        it('passes all test vectors', () => __awaiter(void 0, void 0, void 0, function* () {
            let multibaseId;
            for (const vector of jwkToMultibaseIdTestVectors) {
                multibaseId = yield Jose.publicKeyToMultibaseId({ publicKey: vector.input });
                expect(multibaseId).to.equal(vector.output);
            }
        }));
        it('throws an error for an unsupported public key type', () => __awaiter(void 0, void 0, void 0, function* () {
            yield expect(Jose.publicKeyToMultibaseId({
                publicKey: {
                    kty: 'RSA',
                    n: 'r0YDzIV4GPJ1wFb1Gftdd3C3VE6YeknVq1C7jGypq5WTTmX0yRDBqzL6mBR3_c-mKRuE5Z5VMGniA1lFnFmv8m0A2engKfALXHPJqoL6WzqN1SyjSM2aI6v8JVTj4H0RdYV9R4jxIB-zK5X-ZyL6CwHx-3dKZkCvZSEp8b-5I8c2Fz8E8Hl7qKkD_qEz6ZOmKVhJLGiEag1qUQYJv2TcRdiyZfwwVsV3nI3IcVfMCTjDZTw2jI0YHJgLi7-MkP4DO7OJ4D4AFtL-7CkZ7V2xG0piBz4b02_-ZGnBZ5zHJxGoUZnTY6HX4V9bPQI_ME8qCjFXf-TcwCfDFcwMm70L2Q',
                    e: 'AQAB',
                    alg: 'RS256'
                }
            })).to.eventually.be.rejectedWith(Error, `Unsupported public key type`);
        }));
        it('throws an error for an unsupported public key curve', () => __awaiter(void 0, void 0, void 0, function* () {
            yield expect(Jose.publicKeyToMultibaseId({
                publicKey: {
                    kty: 'EC',
                    crv: 'P-256',
                    x: 'SVqB4JcUD6lsfvqMr-OKUNUphdNn64Eay60978ZlL74',
                    y: 'lf0u0pMj4lGAzZix5u4Cm5CMQIgMNpkwy163wtKYVKI'
                }
            })).to.eventually.be.rejectedWith(Error, `Unsupported public key curve`);
        }));
    });
    describe('multicodecToJose()', () => {
        it('converts ed25519 public key multicodec to JWK', () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield Jose.multicodecToJose({ name: 'ed25519-pub' });
            expect(result).to.deep.equal({
                crv: 'Ed25519',
                kty: 'OKP',
                x: '' // x value would be populated with actual key material in real use
            });
        }));
        it('converts ed25519 private key multicodec to JWK', () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield Jose.multicodecToJose({ name: 'ed25519-priv' });
            expect(result).to.deep.equal({
                crv: 'Ed25519',
                kty: 'OKP',
                x: '', // x value would be populated with actual key material in real use
                d: '' // d value would be populated with actual key material in real use
            });
        }));
        it('converts secp256k1 public key multicodec to JWK', () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield Jose.multicodecToJose({ name: 'secp256k1-pub' });
            expect(result).to.deep.equal({
                crv: 'secp256k1',
                kty: 'EC',
                x: '', // x value would be populated with actual key material in real use
                y: '' // y value would be populated with actual key material in real use
            });
        }));
        it('converts secp256k1 private key multicodec to JWK', () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield Jose.multicodecToJose({ name: 'secp256k1-priv' });
            expect(result).to.deep.equal({
                crv: 'secp256k1',
                kty: 'EC',
                x: '', // x value would be populated with actual key material in real use
                y: '', // y value would be populated with actual key material in real use
                d: '' // d value would be populated with actual key material in real use
            });
        }));
        it('converts x25519 public key multicodec to JWK', () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield Jose.multicodecToJose({ name: 'x25519-pub' });
            expect(result).to.deep.equal({
                crv: 'X25519',
                kty: 'OKP',
                x: '' // x value would be populated with actual key material in real use
            });
        }));
        it('converts x25519 private key multicodec to JWK', () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield Jose.multicodecToJose({ name: 'x25519-priv' });
            expect(result).to.deep.equal({
                crv: 'X25519',
                kty: 'OKP',
                x: '', // x value would be populated with actual key material in real use
                d: '' // d value would be populated with actual key material in real use
            });
        }));
        it('throws an error when name is undefined and code is not provided', () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                yield Jose.multicodecToJose({});
                expect.fail('Should have thrown an error for undefined name and code');
            }
            catch (e) {
                expect(e.message).to.equal('Either \'name\' or \'code\' must be defined, but not both.');
            }
        }));
        it('throws an error when both name and code are provided', () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                yield Jose.multicodecToJose({ name: 'ed25519-pub', code: 0xed });
                expect.fail('Should have thrown an error for both name and code being defined');
            }
            catch (e) {
                expect(e.message).to.equal('Either \'name\' or \'code\' must be defined, but not both.');
            }
        }));
        it('throws an error for unsupported multicodec name', () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                yield Jose.multicodecToJose({ name: 'unsupported-key-type' });
                expect.fail('Should have thrown an error for unsupported multicodec name');
            }
            catch (e) {
                expect(e.message).to.include('Unsupported Multicodec to JOSE conversion');
            }
        }));
        it('throws an error for unsupported multicodec code', () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                yield Jose.multicodecToJose({ code: 0x9999 });
                expect.fail('Should have thrown an error for unsupported multicodec code');
            }
            catch (e) {
                expect(e.message).to.include('Unsupported multicodec');
            }
        }));
    });
});
//# sourceMappingURL=jose.spec.js.map