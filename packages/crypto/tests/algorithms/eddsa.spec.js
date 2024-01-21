var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { expect } from 'chai';
import { EdDsaAlgorithm } from '../../src/algorithms/eddsa.js';
describe('EdDsaAlgorithm', () => {
    let eddsa;
    let privateKey;
    let publicKey;
    before(() => {
        eddsa = new EdDsaAlgorithm();
    });
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        privateKey = yield eddsa.generateKey({ algorithm: 'Ed25519' });
        publicKey = yield eddsa.getPublicKey({ key: privateKey });
    }));
    describe('computePublicKey()', () => {
        it('returns a public key in JWK format', () => __awaiter(void 0, void 0, void 0, function* () {
            // Test the method.
            const publicKey = yield eddsa.computePublicKey({ key: privateKey });
            // Validate the result.
            expect(publicKey).to.have.property('kid');
            expect(publicKey).to.have.property('kty');
            expect(publicKey).to.have.property('x');
            expect(publicKey).to.not.have.property('d');
            expect(publicKey).to.not.have.property('y');
        }));
        it('computes and adds a kid property, if missing', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const { kid } = privateKey, privateKeyWithoutKid = __rest(privateKey, ["kid"]);
            // Test the method.
            const publicKey = yield eddsa.computePublicKey({ key: privateKeyWithoutKid });
            // Validate the result.
            expect(publicKey).to.have.property('kid', kid);
        }));
        it('supports EdDSA using Ed25519 curve', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const privateKey = yield eddsa.generateKey({ algorithm: 'Ed25519' });
            // Test the method.
            const publicKey = yield eddsa.computePublicKey({ key: privateKey });
            // Validate the result.
            expect(publicKey).to.have.property('kty', 'OKP');
            expect(publicKey).to.have.property('alg', 'EdDSA');
            expect(publicKey).to.have.property('crv', 'Ed25519');
        }));
        it('throws an error if the key provided is not an OKP private key', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const privateKey = {
                crv: 'secp256k1',
                d: 'd',
                kty: 'EC',
                x: 'x',
                y: 'y'
            };
            // Test the method.
            try {
                yield eddsa.computePublicKey({ key: privateKey });
                expect.fail('Expected an error to be thrown.');
            }
            catch (error) {
                // Validate the result.
                expect(error).to.exist;
                expect(error).to.be.an.instanceOf(Error);
                expect(error.message).to.include('Invalid key provided');
            }
        }));
        it('throws an error for an unsupported curve', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const privateKey = {
                // @ts-expect-error because an unsupported curve is intentionally provided.
                crv: 'unsupported-curve',
                d: 'd',
                kty: 'OKP',
                x: 'x'
            };
            // Test the method.
            try {
                yield eddsa.computePublicKey({ key: privateKey });
                expect.fail('Expected an error to be thrown.');
            }
            catch (error) {
                // Validate the result.
                expect(error).to.exist;
                expect(error).to.be.an.instanceOf(Error);
                expect(error.message).to.include('Unsupported curve');
            }
        }));
    });
    describe('generateKey()', () => {
        it('returns a private key in JWK format', () => __awaiter(void 0, void 0, void 0, function* () {
            // Test the method.
            const privateKey = yield eddsa.generateKey({ algorithm: 'Ed25519' });
            // Validate the result.
            expect(privateKey).to.have.property('kty', 'OKP');
            expect(privateKey).to.have.property('kid');
        }));
        it('supports EdDSA using Ed25519 curve', () => __awaiter(void 0, void 0, void 0, function* () {
            // Test the method.
            const privateKey = yield eddsa.generateKey({ algorithm: 'Ed25519' });
            expect(privateKey).to.have.property('alg', 'EdDSA');
            expect(privateKey).to.have.property('crv', 'Ed25519');
        }));
    });
    describe('getPublicKey()', () => {
        it('returns a public key in JWK format', () => __awaiter(void 0, void 0, void 0, function* () {
            // Test the method.
            const publicKey = yield eddsa.getPublicKey({ key: privateKey });
            // Validate the result.
            expect(publicKey).to.not.have.property('d');
            expect(publicKey).to.have.property('kid');
            expect(publicKey).to.have.property('kty');
            expect(publicKey).to.have.property('x');
        }));
        it('computes and adds a kid property, if missing', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const { kid } = privateKey, privateKeyWithoutKid = __rest(privateKey, ["kid"]);
            // Test the method.
            const publicKey = yield eddsa.getPublicKey({ key: privateKeyWithoutKid });
            // Validate the result.
            expect(publicKey).to.have.property('kid', kid);
        }));
        it('supports EdDSA using Ed25519 curve', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const privateKey = yield eddsa.generateKey({ algorithm: 'Ed25519' });
            // Test the method.
            const publicKey = yield eddsa.getPublicKey({ key: privateKey });
            // Validate the result.
            expect(publicKey).to.have.property('kty', 'OKP');
            expect(publicKey).to.have.property('alg', 'EdDSA');
            expect(publicKey).to.have.property('crv', 'Ed25519');
        }));
        it('throws an error if the key provided is not an OKP private key', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const privateKey = {
                crv: 'secp256k1',
                d: 'd',
                kty: 'EC',
                x: 'x',
                y: 'y'
            };
            // Test the method.
            try {
                yield eddsa.getPublicKey({ key: privateKey });
                expect.fail('Expected an error to be thrown.');
            }
            catch (error) {
                // Validate the result.
                expect(error).to.exist;
                expect(error).to.be.an.instanceOf(Error);
                expect(error.message).to.include('Invalid key provided');
            }
        }));
        it('throws an error for an unsupported curve', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const privateKey = {
                // @ts-expect-error because an unsupported curve is intentionally provided.
                crv: 'unsupported-curve',
                d: 'd',
                kty: 'OKP',
                x: 'x'
            };
            // Test the method.
            try {
                yield eddsa.getPublicKey({ key: privateKey });
                expect.fail('Expected an error to be thrown.');
            }
            catch (error) {
                // Validate the result.
                expect(error).to.exist;
                expect(error).to.be.an.instanceOf(Error);
                expect(error.message).to.include('Unsupported curve');
            }
        }));
    });
    describe('sign()', () => {
        let data = new Uint8Array([0, 1, 2, 3, 4]);
        it('generates signatures as Uint8Array', () => __awaiter(void 0, void 0, void 0, function* () {
            // Test the method.
            const signature = yield eddsa.sign({ key: privateKey, data });
            // Validate the result.
            expect(signature).to.exist;
            expect(signature).to.be.a('Uint8Array');
        }));
        it('generates signatures in compact R+S format', () => __awaiter(void 0, void 0, void 0, function* () {
            // Test the method.
            const signature = yield eddsa.sign({ key: privateKey, data });
            // Validate the result.
            expect(signature).to.have.length(64);
        }));
        it('throws an error if the key provided is not an OKP private key', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const privateKey = {
                crv: 'secp256k1',
                d: 'd',
                kty: 'EC',
                x: 'x',
                y: 'y'
            };
            // Test the method.
            try {
                yield eddsa.sign({ key: privateKey, data });
                expect.fail('Expected an error to be thrown.');
            }
            catch (error) {
                // Validate the result.
                expect(error).to.exist;
                expect(error).to.be.an.instanceOf(Error);
                expect(error.message).to.include('Invalid key provided');
            }
        }));
        it('throws an error for an unsupported curve', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const privateKey = {
                // @ts-expect-error because an unsupported curve is intentionally provided.
                crv: 'unsupported-curve',
                d: 'd',
                kty: 'OKP',
                x: 'x'
            };
            // Test the method.
            try {
                // Test the method.
                yield eddsa.sign({ key: privateKey, data });
                expect.fail('Expected an error to be thrown.');
            }
            catch (error) {
                // Validate the result.
                expect(error).to.exist;
                expect(error).to.be.an.instanceOf(Error);
                expect(error.message).to.include('Unsupported curve');
            }
        }));
    });
    describe('verify()', () => {
        let data = new Uint8Array([0, 1, 2, 3, 4]);
        let signature;
        beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
            signature = yield eddsa.sign({ key: privateKey, data });
        }));
        it(`returns a boolean verification result`, () => __awaiter(void 0, void 0, void 0, function* () {
            const isValid = yield eddsa.verify({
                key: publicKey,
                signature,
                data
            });
            expect(isValid).to.be.a('boolean');
        }));
        it('returns true for a valid signature', () => __awaiter(void 0, void 0, void 0, function* () {
            // Test the method.
            const isValid = yield eddsa.verify({ key: publicKey, signature, data });
            // Validate the result.
            expect(isValid).to.be.true;
        }));
        it('returns false for an invalid signature', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const signature = new Uint8Array(64);
            // Test the method.
            const isValid = yield eddsa.verify({ key: publicKey, signature, data });
            // Validate the result.
            expect(isValid).to.be.false;
        }));
        it('throws an error if the key provided is not an OKP public key', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const publicKey = {
                crv: 'secp256k1',
                kty: 'EC',
                x: 'x',
                y: 'y'
            };
            // Test the method.
            try {
                yield eddsa.verify({ key: publicKey, signature, data });
                expect.fail('Expected an error to be thrown.');
            }
            catch (error) {
                // Validate the result.
                expect(error).to.exist;
                expect(error).to.be.an.instanceOf(Error);
                expect(error.message).to.include('Invalid key provided');
            }
        }));
        it('throws an error for an unsupported curve', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const publicKey = {
                // @ts-expect-error because an unsupported curve is intentionally provided.
                crv: 'unsupported-curve',
                kty: 'OKP',
                x: 'x'
            };
            // Test the method.
            try {
                // Test the method.
                yield eddsa.verify({ key: publicKey, signature, data });
                expect.fail('Expected an error to be thrown.');
            }
            catch (error) {
                // Validate the result.
                expect(error).to.exist;
                expect(error).to.be.an.instanceOf(Error);
                expect(error.message).to.include('Unsupported curve');
            }
        }));
    });
});
//# sourceMappingURL=eddsa.spec.js.map