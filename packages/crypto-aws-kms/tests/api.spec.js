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
import sinon from 'sinon';
import { expect } from 'chai';
import { Convert } from '@web5/common';
import { CreateAliasCommand, CreateKeyCommand, DescribeKeyCommand, GetPublicKeyCommand, KMSClient, SignCommand } from '@aws-sdk/client-kms';
import { AwsKmsCrypto } from '../src/api.js';
import { mockEcdsaSecp256k1 } from './fixtures/mock-ecdsa-secp256k1.js';
describe('AWS KMS Crypto API', () => {
    let crypto;
    let kmsClientStub;
    beforeEach(() => {
        kmsClientStub = sinon.createStubInstance(KMSClient);
        crypto = new AwsKmsCrypto({ kmsClient: kmsClientStub });
    });
    afterEach(() => {
        sinon.restore();
    });
    describe('constructor', () => {
        it('instantiates a KMSClient if one is not given', () => {
            // Execute the test.
            const crypto = new AwsKmsCrypto();
            // Validate the result.
            expect(crypto).to.exist;
            expect(crypto).to.be.an.instanceOf(AwsKmsCrypto);
        });
        it('accepts the KMSClient that is given', () => {
            // Setup.
            const kmsClient = new KMSClient({});
            // Execute the test.
            const crypto = new AwsKmsCrypto({ kmsClient });
            // Validate the result.
            expect(crypto).to.exist;
            expect(crypto).to.be.an.instanceOf(AwsKmsCrypto);
        });
    });
    describe('digest()', () => {
        it('computes and returns a digest as a Uint8Array', () => __awaiter(void 0, void 0, void 0, function* () {
            const data = new Uint8Array([0, 1, 2, 3, 4]);
            const digest = yield crypto.digest({ algorithm: 'SHA-256', data });
            expect(digest).to.exist;
            expect(digest).to.be.an.instanceOf(Uint8Array);
        }));
        it('supports SHA-256', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const data = Convert.string('abc').toUint8Array();
            const expectedOutput = Convert.hex('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad').toUint8Array();
            // Test the method.
            const digest = yield crypto.digest({ algorithm: 'SHA-256', data });
            // Validate the result.
            expect(digest).to.exist;
            expect(digest).to.be.an.instanceOf(Uint8Array);
            expect(digest).to.have.lengthOf(32);
            expect(digest).to.deep.equal(expectedOutput);
        }));
    });
    describe('generateKey()', () => {
        it('generates a key and returns a key URI', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            kmsClientStub.send.withArgs(sinon.match.instanceOf(CreateKeyCommand)).resolves(mockEcdsaSecp256k1.generateKey.output);
            kmsClientStub.send.withArgs(sinon.match.instanceOf(GetPublicKeyCommand)).resolves(mockEcdsaSecp256k1.getPublicKey.output);
            kmsClientStub.send.withArgs(sinon.match.instanceOf(CreateAliasCommand)).resolves(mockEcdsaSecp256k1.createKeyAlias.output);
            // Test the method.
            const keyUri = yield crypto.generateKey(mockEcdsaSecp256k1.generateKey.input);
            // Validate the result.
            expect(keyUri).to.exist;
            expect(keyUri).to.be.a.string;
            expect(keyUri.indexOf('urn:jwk:')).to.equal(0);
            expect(kmsClientStub.send.callCount).to.equal(3);
        }));
        it('supports ECDSA using secp256k1 curve and SHA-256', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            kmsClientStub.send.withArgs(sinon.match.instanceOf(CreateKeyCommand)).resolves(mockEcdsaSecp256k1.generateKey.output);
            kmsClientStub.send.withArgs(sinon.match.instanceOf(GetPublicKeyCommand)).resolves(mockEcdsaSecp256k1.getPublicKey.output);
            kmsClientStub.send.withArgs(sinon.match.instanceOf(CreateAliasCommand)).resolves(mockEcdsaSecp256k1.createKeyAlias.output);
            // Test the method.
            const keyUri = yield crypto.generateKey({ algorithm: 'ES256K' });
            // Validate the result.
            expect(keyUri).to.exist;
            expect(kmsClientStub.send.callCount).to.equal(3);
        }));
        it('throws an error if the algorithm is not supported', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const algorithm = 'unsupported-algorithm';
            // Test the method.
            try {
                // @ts-expect-error because an unsupported algorithm is being tested.
                yield crypto.generateKey({ algorithm });
                expect.fail('Expected an error to be thrown.');
            }
            catch (error) {
                // Validate the result.
                expect(error).to.exist;
                expect(error).to.be.an.instanceOf(Error);
                expect(error.message).to.include(`Algorithm not supported: ${algorithm}`);
            }
        }));
    });
    describe('getKeyUri()', () => {
        it('returns a string with the expected prefix', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const key = mockEcdsaSecp256k1.verify.input.key;
            // Test the method.
            const keyUri = yield crypto.getKeyUri({ key });
            // Validate the result.
            expect(keyUri).to.exist;
            expect(keyUri).to.be.a.string;
            expect(keyUri.indexOf('urn:jwk:')).to.equal(0);
        }));
        it('computes the key URI correctly for a valid JWK', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const key = mockEcdsaSecp256k1.verify.input.key;
            const expectedThumbprint = 'U01_M3_A9vMLOWixG-rlfC-_f3LLdurttn7c7d3_upU';
            const expectedKeyUri = 'urn:jwk:' + expectedThumbprint;
            // Test the method.
            const keyUri = yield crypto.getKeyUri({ key });
            expect(keyUri).to.equal(expectedKeyUri);
        }));
    });
    describe('getPublicKey()', () => {
        it('retrieves the public key for a given JWK URI', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            kmsClientStub.send.withArgs(sinon.match.instanceOf(GetPublicKeyCommand)).resolves(mockEcdsaSecp256k1.getPublicKey.output);
            // Test the method.
            const result = yield crypto.getPublicKey(mockEcdsaSecp256k1.getPublicKey.input);
            // Validate the result.
            expect(result).to.be.an('object');
            expect(result).to.have.property('kty');
            expect(result).to.have.property('kid');
            expect(kmsClientStub.send.calledOnce).to.be.true;
        }));
        it('retrieves the public key for a given AWS KMS ARN', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            kmsClientStub.send.withArgs(sinon.match.instanceOf(GetPublicKeyCommand)).resolves(mockEcdsaSecp256k1.getPublicKey.output);
            // Test the method.
            const publicKey = yield crypto.getPublicKey({ keyUri: 'arn:aws:kms:us-east-1:364764707041:key/bb48abe3-5948-48e0-80d8-605c04d68171' });
            // Validate the result.
            expect(publicKey).to.exist;
            expect(publicKey).to.be.an('object');
            expect(publicKey).to.have.property('kty');
            expect(kmsClientStub.send.calledOnce).to.be.true;
        }));
        it('supports ECDSA using secp256k1 curve and SHA-256', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            kmsClientStub.send.withArgs(sinon.match.instanceOf(GetPublicKeyCommand)).resolves(mockEcdsaSecp256k1.getPublicKey.output);
            // Test the method.
            const publicKey = yield crypto.getPublicKey(mockEcdsaSecp256k1.getPublicKey.input);
            // Validate the result.
            expect(publicKey).to.exist;
            expect(publicKey).to.be.an('object');
            expect(publicKey).to.have.property('kty', 'EC');
            expect(publicKey).to.have.property('alg', 'ES256K');
            expect(publicKey).to.have.property('crv', 'secp256k1');
            expect(publicKey).to.have.property('x');
            expect(publicKey).to.have.property('y');
            expect(publicKey).to.not.have.property('d');
            expect(kmsClientStub.send.calledOnce).to.be.true;
        }));
        it('throws an error if the public key is not returned in the AWS KMS response', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            kmsClientStub.send.withArgs(sinon.match.instanceOf(GetPublicKeyCommand)).resolves({});
            // Test the method.
            try {
                yield crypto.getPublicKey(mockEcdsaSecp256k1.getPublicKey.input);
                expect.fail('Expected an error to be thrown.');
            }
            catch (error) {
                // Validate the result.
                expect(error).to.exist;
                expect(error).to.be.an.instanceOf(Error);
                expect(error.message).to.include('Public key was not returned');
            }
        }));
    });
    describe('sign()', () => {
        it('generates signatures as Uint8Array', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            kmsClientStub.send.withArgs(sinon.match.instanceOf(SignCommand)).resolves(mockEcdsaSecp256k1.sign.output);
            kmsClientStub.send.withArgs(sinon.match.instanceOf(DescribeKeyCommand)).resolves(mockEcdsaSecp256k1.getKeySpec.output);
            // Test the method.
            const signature = yield crypto.sign(mockEcdsaSecp256k1.sign.input);
            // Validate the result.
            expect(signature).to.be.a('Uint8Array');
            expect(kmsClientStub.send.calledTwice).to.be.true;
        }));
        it('generates signatures in compact R+S format', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            kmsClientStub.send.withArgs(sinon.match.instanceOf(SignCommand)).resolves(mockEcdsaSecp256k1.sign.output);
            kmsClientStub.send.withArgs(sinon.match.instanceOf(DescribeKeyCommand)).resolves(mockEcdsaSecp256k1.getKeySpec.output);
            // Test the method.
            const signature = yield crypto.sign(mockEcdsaSecp256k1.sign.input);
            // Validate the result.
            expect(signature).to.have.length(64);
        }));
    });
    describe('verify()', () => {
        it('returns true for a valid signature', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const key = mockEcdsaSecp256k1.verify.input.key; // Public key generated with AWS KMS
            const signature = mockEcdsaSecp256k1.verify.input.signature;
            const data = mockEcdsaSecp256k1.verify.input.data;
            // Test the method.
            const isValid = yield crypto.verify({ key, signature, data });
            // Validate the result.
            expect(isValid).to.be.true;
        }));
        it('returns false for an invalid signature', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const key = mockEcdsaSecp256k1.verify.input.key; // Public key generated with AWS KMS
            const signature = new Uint8Array(64);
            const data = mockEcdsaSecp256k1.verify.input.data;
            // Test the method.
            const isValid = yield crypto.verify({ key, signature, data });
            // Validate the result.
            expect(isValid).to.be.false;
        }));
        it('validates signatures with public keys lacking an alg property', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const _a = mockEcdsaSecp256k1.verify.input.key, { alg } = _a, key = __rest(_a, ["alg"]); // Public key generated with AWS KMS
            const signature = new Uint8Array(64);
            const data = mockEcdsaSecp256k1.verify.input.data;
            // Test the method.
            const isValid = yield crypto.verify({ key, signature, data });
            // Validate the result.
            expect(isValid).to.be.false;
        }));
        it('throws an error when public key algorithm and curve are unsupported', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            // @ts-expect-error because an unsupported algorithm and currve is being tested.
            const key = { kty: 'EC', alg: 'unsupported-algorithm', crv: 'unsupported-curve', x: 'x', y: 'y' };
            const signature = new Uint8Array(64);
            const data = new Uint8Array(0);
            // Test the method.
            try {
                yield crypto.verify({ key, signature, data });
                expect.fail('Expected an error to be thrown.');
            }
            catch (error) {
                // Validate the result.
                expect(error).to.exist;
                expect(error).to.be.an.instanceOf(Error);
                expect(error.message).to.include('Unable to determine algorithm based on provided input');
            }
        }));
    });
});
//# sourceMappingURL=api.spec.js.map