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
import { EcdsaAlgorithm } from '../../src/algorithms/ecdsa.js';
describe('EcdsaAlgorithm', () => {
    let ecdsa;
    let privateKey;
    let publicKey;
    before(() => {
        ecdsa = new EcdsaAlgorithm();
    });
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        privateKey = yield ecdsa.generateKey({ algorithm: 'ES256K' });
        publicKey = yield ecdsa.getPublicKey({ key: privateKey });
    }));
    describe('computePublicKey()', () => {
        it('returns a public key in JWK format', () => __awaiter(void 0, void 0, void 0, function* () {
            // Test the method.
            const publicKey = yield ecdsa.computePublicKey({ key: privateKey });
            // Validate the result.
            expect(publicKey).to.not.have.property('d');
            expect(publicKey).to.have.property('kid');
            expect(publicKey).to.have.property('kty');
            expect(publicKey).to.have.property('x');
            expect(publicKey).to.have.property('y');
        }));
        it('computes and adds a kid property, if missing', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const { kid } = privateKey, privateKeyWithoutKid = __rest(privateKey, ["kid"]);
            // Test the method.
            const publicKey = yield ecdsa.computePublicKey({ key: privateKeyWithoutKid });
            // Validate the result.
            expect(publicKey).to.have.property('kid', kid);
        }));
        it('supports ECDSA using secp256k1 curve and SHA-256', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const privateKey = yield ecdsa.generateKey({ algorithm: 'ES256K' });
            // Test the method.
            const publicKey = yield ecdsa.computePublicKey({ key: privateKey });
            // Validate the result.
            expect(publicKey).to.have.property('kty', 'EC');
            expect(publicKey).to.have.property('alg', 'ES256K');
            expect(publicKey).to.have.property('crv', 'secp256k1');
        }));
        it('throws an error if the key provided is not an EC private key', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const privateKey = {
                crv: 'Ed25519',
                d: 'd',
                kty: 'OKP',
                x: 'x',
            };
            // Test the method.
            try {
                yield ecdsa.computePublicKey({ key: privateKey });
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
                kty: 'EC',
                x: 'x',
                y: 'y',
            };
            // Test the method.
            try {
                yield ecdsa.computePublicKey({ key: privateKey });
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
            const privateKey = yield ecdsa.generateKey({ algorithm: 'ES256K' });
            // Validate the result.
            expect(privateKey).to.have.property('kty', 'EC');
            expect(privateKey).to.have.property('kid');
        }));
        it('supports ECDSA using secp256k1 curve and SHA-256', () => __awaiter(void 0, void 0, void 0, function* () {
            // Test the method.
            const privateKey = yield ecdsa.generateKey({ algorithm: 'ES256K' });
            expect(privateKey).to.have.property('alg', 'ES256K');
            expect(privateKey).to.have.property('crv', 'secp256k1');
        }));
    });
    describe('getPublicKey()', () => {
        it('returns a public key in JWK format', () => __awaiter(void 0, void 0, void 0, function* () {
            // Test the method.
            const publicKey = yield ecdsa.getPublicKey({ key: privateKey });
            // Validate the result.
            expect(publicKey).to.not.have.property('d');
            expect(publicKey).to.have.property('kid');
            expect(publicKey).to.have.property('kty');
            expect(publicKey).to.have.property('x');
            expect(publicKey).to.have.property('y');
        }));
        it('computes and adds a kid property, if missing', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const { kid } = privateKey, privateKeyWithoutKid = __rest(privateKey, ["kid"]);
            // Test the method.
            const publicKey = yield ecdsa.getPublicKey({ key: privateKeyWithoutKid });
            // Validate the result.
            expect(publicKey).to.have.property('kid', kid);
        }));
        it('supports ECDSA using secp256k1 curve and SHA-256', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const privateKey = yield ecdsa.generateKey({ algorithm: 'ES256K' });
            // Test the method.
            const publicKey = yield ecdsa.getPublicKey({ key: privateKey });
            // Validate the result.
            expect(publicKey).to.have.property('kty', 'EC');
            expect(publicKey).to.have.property('alg', 'ES256K');
            expect(publicKey).to.have.property('crv', 'secp256k1');
        }));
        it('throws an error if the key provided is not an EC private key', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const privateKey = {
                crv: 'Ed25519',
                d: 'd',
                kty: 'OKP',
                x: 'x',
            };
            // Test the method.
            try {
                yield ecdsa.getPublicKey({ key: privateKey });
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
                kty: 'EC',
                x: 'x',
                y: 'y',
            };
            // Test the method.
            try {
                yield ecdsa.getPublicKey({ key: privateKey });
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
            const signature = yield ecdsa.sign({ key: privateKey, data });
            // Validate the result.
            expect(signature).to.exist;
            expect(signature).to.be.a('Uint8Array');
        }));
        it('generates signatures in compact R+S format', () => __awaiter(void 0, void 0, void 0, function* () {
            // Test the method.
            const signature = yield ecdsa.sign({ key: privateKey, data });
            // Validate the result.
            expect(signature).to.have.length(64);
        }));
        it('throws an error if the key provided is not an EC private key', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const privateKey = {
                crv: 'Ed25519',
                d: 'd',
                kty: 'OKP',
                x: 'x',
            };
            // Test the method.
            try {
                yield ecdsa.sign({ key: privateKey, data });
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
                kty: 'EC',
                x: 'x',
                y: 'y',
            };
            // Test the method.
            try {
                // Test the method.
                yield ecdsa.sign({ key: privateKey, data });
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
            signature = yield ecdsa.sign({ key: privateKey, data });
        }));
        it(`returns a boolean verification result`, () => __awaiter(void 0, void 0, void 0, function* () {
            const isValid = yield ecdsa.verify({
                key: publicKey,
                signature,
                data
            });
            expect(isValid).to.be.a('boolean');
        }));
        it('returns true for a valid signature', () => __awaiter(void 0, void 0, void 0, function* () {
            // Test the method.
            const isValid = yield ecdsa.verify({ key: publicKey, signature, data });
            // Validate the result.
            expect(isValid).to.be.true;
        }));
        it('returns false for an invalid signature', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const signature = new Uint8Array(64);
            // Test the method.
            const isValid = yield ecdsa.verify({ key: publicKey, signature, data });
            // Validate the result.
            expect(isValid).to.be.false;
        }));
        it('throws an error if the key provided is not an EC public key', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const publicKey = {
                crv: 'Ed25519',
                kty: 'OKP',
                x: 'x',
            };
            // Test the method.
            try {
                yield ecdsa.verify({ key: publicKey, signature, data });
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
                kty: 'EC',
                x: 'x',
                y: 'y',
            };
            // Test the method.
            try {
                // Test the method.
                yield ecdsa.verify({ key: publicKey, signature, data });
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
//# sourceMappingURL=ecdsa.spec.js.map