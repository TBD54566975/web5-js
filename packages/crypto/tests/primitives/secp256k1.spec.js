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
import chai, { expect } from 'chai';
import { Convert } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';
import secp256k1GetCurvePoints from '../fixtures/test-vectors/secp256k1/get-curve-points.json' assert { type: 'json' };
import secp256k1BytesToPublicKey from '../fixtures/test-vectors/secp256k1/bytes-to-public-key.json' assert { type: 'json' };
import secp256k1PublicKeyToBytes from '../fixtures/test-vectors/secp256k1/public-key-to-bytes.json' assert { type: 'json' };
import secp256k1ValidatePublicKey from '../fixtures/test-vectors/secp256k1/validate-public-key.json' assert { type: 'json' };
import secp256k1BytesToPrivateKey from '../fixtures/test-vectors/secp256k1/bytes-to-private-key.json' assert { type: 'json' };
import secp256k1PrivateKeyToBytes from '../fixtures/test-vectors/secp256k1/private-key-to-bytes.json' assert { type: 'json' };
import secp256k1ValidatePrivateKey from '../fixtures/test-vectors/secp256k1/validate-private-key.json' assert { type: 'json' };
import { Secp256k1 } from '../../src/primitives/secp256k1.js';
chai.use(chaiAsPromised);
describe('Secp256k1', () => {
    let privateKey;
    let publicKey;
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        privateKey = yield Secp256k1.generateKey();
        publicKey = yield Secp256k1.computePublicKey({ key: privateKey });
    }));
    describe('bytesToPrivateKey()', () => {
        it('returns a private key in JWK format', () => __awaiter(void 0, void 0, void 0, function* () {
            const privateKeyBytes = Convert.hex('740ec69810de9ad1b8f298f1d2c0e6a52dd1e958dc2afc85764bec169c222e88').toUint8Array();
            const privateKey = yield Secp256k1.bytesToPrivateKey({ privateKeyBytes });
            expect(privateKey).to.have.property('crv', 'secp256k1');
            expect(privateKey).to.have.property('d');
            expect(privateKey).to.have.property('kid');
            expect(privateKey).to.have.property('kty', 'EC');
            expect(privateKey).to.have.property('x');
            expect(privateKey).to.have.property('y');
        }));
        for (const vector of secp256k1BytesToPrivateKey.vectors) {
            it(vector.description, () => __awaiter(void 0, void 0, void 0, function* () {
                const privateKey = yield Secp256k1.bytesToPrivateKey({
                    privateKeyBytes: Convert.hex(vector.input.privateKeyBytes).toUint8Array()
                });
                expect(privateKey).to.deep.equal(vector.output);
            }));
        }
    });
    describe('bytesToPublicKey()', () => {
        it('returns a public key in JWK format', () => __awaiter(void 0, void 0, void 0, function* () {
            const publicKeyBytes = Convert.hex('043752951274023296c8a74b0ffe42f82ff4b4d4bba4326477422703f761f59258c26a7465b9a77ac0c3f1cedb139c428b0b1fbb5516867b527636f3286f705553').toUint8Array();
            const publicKey = yield Secp256k1.bytesToPublicKey({ publicKeyBytes });
            expect(publicKey).to.have.property('crv', 'secp256k1');
            expect(publicKey).to.have.property('kid');
            expect(publicKey).to.have.property('kty', 'EC');
            expect(publicKey).to.have.property('x');
            expect(publicKey).to.have.property('y');
            expect(publicKey).to.not.have.property('d');
        }));
        for (const vector of secp256k1BytesToPublicKey.vectors) {
            it(vector.description, () => __awaiter(void 0, void 0, void 0, function* () {
                const publicKey = yield Secp256k1.bytesToPublicKey({
                    publicKeyBytes: Convert.hex(vector.input.publicKeyBytes).toUint8Array()
                });
                expect(publicKey).to.deep.equal(vector.output);
            }));
        }
    });
    describe('compressPublicKey()', () => {
        it('converts an uncompressed public key to compressed format', () => __awaiter(void 0, void 0, void 0, function* () {
            const compressedPublicKeyBytes = Convert.hex('026bcdccc644b309921d3b0c266183a20786650c1634d34e8dfa1ed74cd66ce214').toUint8Array();
            const uncompressedPublicKeyBytes = Convert.hex('046bcdccc644b309921d3b0c266183a20786650c1634d34e8dfa1ed74cd66ce21465062296011dd076ae4e8ce5163ccf69d01496d3147656dcc96645b95211f3c6').toUint8Array();
            const output = yield Secp256k1.compressPublicKey({
                publicKeyBytes: uncompressedPublicKeyBytes
            });
            // Confirm the length of the resulting public key is 33 bytes
            expect(output.byteLength).to.equal(33);
            // Confirm the output matches the expected compressed public key.
            expect(output).to.deep.equal(compressedPublicKeyBytes);
        }));
        it('throws an error for an invalid uncompressed public key', () => __awaiter(void 0, void 0, void 0, function* () {
            // Invalid uncompressed public key.
            const invalidPublicKey = Convert.hex('dfebc16793a5737ac51f606a43524df8373c063e41d5a99b2f1530afd987284bd1c7cde1658a9a756e71f44a97b4783ea9dee5ccb7f1447eb4836d8de9bd4f81fd').toUint8Array();
            try {
                yield Secp256k1.compressPublicKey({
                    publicKeyBytes: invalidPublicKey,
                });
                expect.fail('Expected method to throw an error.');
            }
            catch (error) {
                expect(error).to.be.instanceOf(Error);
                expect(error.message).to.include('Point of length 65 was invalid');
            }
        }));
    });
    describe('computePublicKey()', () => {
        it('returns a public key in JWK format', () => __awaiter(void 0, void 0, void 0, function* () {
            publicKey = yield Secp256k1.computePublicKey({ key: privateKey });
            expect(publicKey).to.have.property('crv', 'secp256k1');
            expect(publicKey).to.not.have.property('d');
            expect(publicKey).to.have.property('kid');
            expect(publicKey).to.have.property('kty', 'EC');
            expect(publicKey).to.have.property('x');
            expect(publicKey).to.have.property('y');
        }));
        it('computes and adds a kid property, if missing', () => __awaiter(void 0, void 0, void 0, function* () {
            const { kid } = privateKey, privateKeyWithoutKid = __rest(privateKey, ["kid"]);
            const publicKey = yield Secp256k1.computePublicKey({ key: privateKeyWithoutKid });
            expect(publicKey).to.have.property('kid', kid);
        }));
    });
    describe('convertDerToCompactSignature()', () => {
        it('returns compact R+S format signature as a Uint8Array', () => __awaiter(void 0, void 0, void 0, function* () {
            const derSignature = Convert.hex('304402203d2f8c3d0f3f7b8b0a9f4d2e8a0f2d4d7a4d2e8a0f2d4d7a4d2e8a0f2d4d7a4d02203d2f8c3d0f3f7b8b0a9f4d2e8a0f2d4d7a4d2e8a0f2d4d7a4d2e8a0f2d4d7a4d').toUint8Array();
            const compactSignature = yield Secp256k1.convertDerToCompactSignature({ derSignature });
            expect(compactSignature).to.be.instanceOf(Uint8Array);
            expect(compactSignature.byteLength).to.equal(64);
        }));
        it('converted ASN.1 DER encoded ECDSA signature matches the expected compact R+S signature', () => __awaiter(void 0, void 0, void 0, function* () {
            const derSignature = Convert.hex('3046022100bd856f326c9d52c6ea6b0711831fe706ad4df6f1c2499de3aa2950d27fe89590022100be32e04c6d0d6fe1628b84eacff5bb871cea4138199521b37234da79b63586f8').toUint8Array();
            const expectedCompactSignature = Convert.hex('bd856f326c9d52c6ea6b0711831fe706ad4df6f1c2499de3aa2950d27fe89590be32e04c6d0d6fe1628b84eacff5bb871cea4138199521b37234da79b63586f8').toUint8Array();
            const compactSignature = yield Secp256k1.convertDerToCompactSignature({ derSignature });
            expect(compactSignature).to.deep.equal(expectedCompactSignature);
        }));
        it('converts AWS KMS signatures that can be verified with Secp256k1.verify()', () => __awaiter(void 0, void 0, void 0, function* () {
            // Public key generated with AWS KMS.
            const publicKey = {
                kty: 'EC',
                x: 'RZibmDDBkHgq13BrUB7myVzZf_mvgXyesI2eyu4Mbto',
                y: 'RGrSYhAEPg2Wl8dOnVWLWvp79A9ueqzhXNaVd-oR7Xo',
                crv: 'secp256k1',
                kid: 'm-M694699ruAkBudvKuhXvJ1e_nz7wdksjuPyVShVjo'
            };
            // Data payload that was used to generate the signature.
            const message = new Uint8Array([0, 1, 2, 3, 4]);
            // ASN.1 DER encoded ECDSA signature generated with AWS KMS.
            const derSignature = Convert.hex('3046022100bd856f326c9d52c6ea6b0711831fe706ad4df6f1c2499de3aa2950d27fe89590022100be32e04c6d0d6fe1628b84eacff5bb871cea4138199521b37234da79b63586f8').toUint8Array();
            // Convert the AWS KMS signature to a compact R+S signature.
            const compactSignature = yield Secp256k1.convertDerToCompactSignature({ derSignature });
            // Verify the signature with the public key using Secp256k1.verify().
            const isValid = yield Secp256k1.verify({
                key: publicKey,
                signature: compactSignature,
                data: message
            });
            expect(isValid).to.be.true;
        }));
        it('passes Wycheproof test vector', () => __awaiter(void 0, void 0, void 0, function* () {
            // Source: https://github.com/paulmillr/noble-curves/blob/37eab5a28a43c35b87e9e95a12ae6086393ac38b/test/wycheproof/ecdsa_secp256k1_sha256_test.json#L189-L198
            const publicKeyBytes = Convert.hex('04b838ff44e5bc177bf21189d0766082fc9d843226887fc9760371100b7ee20a6ff0c9d75bfba7b31a6bca1974496eeb56de357071955d83c4b1badaa0b21832e9').toUint8Array();
            const publicKey = yield Secp256k1.bytesToPublicKey({ publicKeyBytes });
            const message = Convert.hex('313233343030').toUint8Array();
            const derSignature = Convert.hex('3046022100813ef79ccefa9a56f7ba805f0e478584fe5f0dd5f567bc09b5123ccbc9832365022100900e75ad233fcc908509dbff5922647db37c21f4afd3203ae8dc4ae7794b0f87').toUint8Array();
            const compactSignature = yield Secp256k1.convertDerToCompactSignature({ derSignature });
            const isValid = yield Secp256k1.verify({
                key: publicKey,
                signature: compactSignature,
                data: message
            });
            expect(isValid).to.be.true;
        }));
        it('throws an error for an invalid ASN.1 DER encoded ECDSA signature due to incorrect length', () => __awaiter(void 0, void 0, void 0, function* () {
            // Invalid ASN.1 DER encoded ECDSA signature.
            // Source: https://github.com/paulmillr/noble-curves/blob/37eab5a28a43c35b87e9e95a12ae6086393ac38b/test/wycheproof/ecdsa_secp256k1_sha256_test.json#L239-L248
            const invalidDerSignature = Convert.hex('3046022100813ef79ccefa9a56f7ba805f0e478584fe5f0dd5f567bc09b5123ccbc983236502206ff18a52dcc0336f7af62400a6dd9b810732baf1ff758000d6f613a556eb31ba').toUint8Array();
            try {
                yield Secp256k1.convertDerToCompactSignature({ derSignature: invalidDerSignature });
                expect.fail('Expected method to throw an error.');
            }
            catch (error) {
                expect(error).to.be.instanceOf(Error);
                expect(error.message).to.include('Invalid signature: incorrect length');
            }
        }));
        it('throws an error for an invalid ASN.1 DER encoded ECDSA signature due to appending zeros to sequence', () => __awaiter(void 0, void 0, void 0, function* () {
            // Invalid ASN.1 DER encoded ECDSA signature.
            // Source: https://github.com/paulmillr/noble-curves/blob/37eab5a28a43c35b87e9e95a12ae6086393ac38b/test/wycheproof/ecdsa_secp256k1_sha256_test.json#L369-L378
            const invalidDerSignature = Convert.hex('3047022100813ef79ccefa9a56f7ba805f0e478584fe5f0dd5f567bc09b5123ccbc983236502206ff18a52dcc0336f7af62400a6dd9b810732baf1ff758000d6f613a556eb31ba0000').toUint8Array();
            try {
                yield Secp256k1.convertDerToCompactSignature({ derSignature: invalidDerSignature });
                expect.fail('Expected method to throw an error.');
            }
            catch (error) {
                expect(error).to.be.instanceOf(Error);
                expect(error.message).to.include('Invalid signature: left bytes after parsing');
            }
        }));
    });
    describe('decompressPublicKey()', () => {
        it('converts a compressed public key to an uncompressed format', () => __awaiter(void 0, void 0, void 0, function* () {
            const compressedPublicKeyBytes = Convert.hex('026bcdccc644b309921d3b0c266183a20786650c1634d34e8dfa1ed74cd66ce214').toUint8Array();
            const uncompressedPublicKeyBytes = Convert.hex('046bcdccc644b309921d3b0c266183a20786650c1634d34e8dfa1ed74cd66ce21465062296011dd076ae4e8ce5163ccf69d01496d3147656dcc96645b95211f3c6').toUint8Array();
            const output = yield Secp256k1.decompressPublicKey({
                publicKeyBytes: compressedPublicKeyBytes
            });
            // Confirm the length of the resulting public key is 65 bytes
            expect(output.byteLength).to.equal(65);
            // Confirm the output matches the expected uncompressed public key.
            expect(output).to.deep.equal(uncompressedPublicKeyBytes);
        }));
        it('throws an error for an invalid compressed public key', () => __awaiter(void 0, void 0, void 0, function* () {
            // Invalid compressed public key.
            const invalidPublicKey = Convert.hex('fef0b998921eafb58f49efdeb0adc47123aa28a4042924236f08274d50c72fe7b0').toUint8Array();
            try {
                yield Secp256k1.decompressPublicKey({
                    publicKeyBytes: invalidPublicKey,
                });
                expect.fail('Expected method to throw an error.');
            }
            catch (error) {
                expect(error).to.be.instanceOf(Error);
                expect(error.message).to.include('Point of length 33 was invalid');
            }
        }));
    });
    describe('generateKey()', () => {
        it('returns a private key in JWK format', () => __awaiter(void 0, void 0, void 0, function* () {
            const privateKey = yield Secp256k1.generateKey();
            expect(privateKey).to.have.property('crv', 'secp256k1');
            expect(privateKey).to.have.property('d');
            expect(privateKey).to.have.property('kid');
            expect(privateKey).to.have.property('kty', 'EC');
            expect(privateKey).to.have.property('x');
            expect(privateKey).to.have.property('y');
        }));
        it('returns a 32-byte private key', () => __awaiter(void 0, void 0, void 0, function* () {
            const privateKey = yield Secp256k1.generateKey();
            const privateKeyBytes = Convert.base64Url(privateKey.d).toUint8Array();
            expect(privateKeyBytes.byteLength).to.equal(32);
        }));
    });
    describe('getCurvePoints()', () => {
        for (const vector of secp256k1GetCurvePoints.vectors) {
            it(vector.description, () => __awaiter(void 0, void 0, void 0, function* () {
                const keyBytes = Convert.hex(vector.input.keyBytes).toUint8Array();
                // @ts-expect-error because getCurvePoints() is a private method.
                const points = yield Secp256k1.getCurvePoints({ keyBytes });
                expect(points.x).to.deep.equal(Convert.hex(vector.output.x).toUint8Array());
                expect(points.y).to.deep.equal(Convert.hex(vector.output.y).toUint8Array());
            }));
        }
        it('throws error with invalid input key length', () => __awaiter(void 0, void 0, void 0, function* () {
            yield expect(
            // @ts-expect-error because getCurvePoints() is a private method.
            Secp256k1.getCurvePoints({ keyBytes: new Uint8Array(16) })).to.eventually.be.rejectedWith(Error, 'Point of length 16 was invalid. Expected 33 compressed bytes or 65 uncompressed bytes');
        }));
    });
    describe('getPublicKey()', () => {
        it('returns a public key in JWK format', () => __awaiter(void 0, void 0, void 0, function* () {
            const publicKey = yield Secp256k1.getPublicKey({ key: privateKey });
            expect(publicKey).to.have.property('kty', 'EC');
            expect(publicKey).to.have.property('crv', 'secp256k1');
            expect(publicKey).to.have.property('kid');
            expect(publicKey).to.have.property('x');
            expect(publicKey).to.have.property('y');
            expect(publicKey).to.not.have.property('d');
        }));
        it('computes and adds a kid property, if missing', () => __awaiter(void 0, void 0, void 0, function* () {
            const { kid } = privateKey, privateKeyWithoutKid = __rest(privateKey, ["kid"]);
            const publicKey = yield Secp256k1.getPublicKey({ key: privateKeyWithoutKid });
            expect(publicKey).to.have.property('kid', kid);
        }));
        it('returns the same output as computePublicKey()', () => __awaiter(void 0, void 0, void 0, function* () {
            const publicKey = yield Secp256k1.getPublicKey({ key: privateKey });
            expect(publicKey).to.deep.equal(yield Secp256k1.computePublicKey({ key: privateKey }));
        }));
        it('throws an error when provided a secp256k1 public key', () => __awaiter(void 0, void 0, void 0, function* () {
            yield expect(Secp256k1.getPublicKey({ key: publicKey })).to.eventually.be.rejectedWith(Error, 'key is not a secp256k1 private JWK');
        }));
        it('throws an error when provided an Ed25519 private key', () => __awaiter(void 0, void 0, void 0, function* () {
            const ed25519PrivateKey = {
                crv: 'Ed25519',
                d: 'TM0Imyj_ltqdtsNG7BFOD1uKMZ81q6Yk2oz27U-4pvs',
                kty: 'OKP',
                x: 'PUAXw-hDiVqStwqnTRt-vJyYLM8uxJaMwM1V8Sr0Zgw',
                kid: 'FtIu-VbGrfe_KB6CH7GNwODB72MNxj_ml11dEvO-7kk'
            };
            yield expect(Secp256k1.getPublicKey({ key: ed25519PrivateKey })).to.eventually.be.rejectedWith(Error, 'key is not a secp256k1 private JWK');
        }));
        it('throws an error when provided a secp256r1 public key', () => __awaiter(void 0, void 0, void 0, function* () {
            const secp256r1PrivateKey = {
                crv: 'P-256',
                d: '5MtBQ7qP4Xk_5pfmsNsih9aLV-BXoEospV8LrowDPNY',
                kty: 'EC',
                x: '2zYnEGgGPrSq3FIFkpyEH-0LcBHZiztBN_H2cL_NrzY',
                y: 'x6z_PPovAYsOsRBKjohvRbtL5466684OumQQ9xuDCtI'
            };
            yield expect(Secp256k1.getPublicKey({ key: secp256r1PrivateKey })).to.eventually.be.rejectedWith(Error, 'key is not a secp256k1 private JWK');
        }));
        it('throws an error when provided an Ed25519 private key', () => __awaiter(void 0, void 0, void 0, function* () {
            const ed25519PrivateKey = {
                crv: 'Ed25519',
                d: 'TM0Imyj_ltqdtsNG7BFOD1uKMZ81q6Yk2oz27U-4pvs',
                kty: 'OKP',
                x: 'PUAXw-hDiVqStwqnTRt-vJyYLM8uxJaMwM1V8Sr0Zgw',
                kid: 'FtIu-VbGrfe_KB6CH7GNwODB72MNxj_ml11dEvO-7kk'
            };
            yield expect(Secp256k1.getPublicKey({ key: ed25519PrivateKey })).to.eventually.be.rejectedWith(Error, 'key is not a secp256k1 private JWK');
        }));
    });
    describe('privateKeyToBytes()', () => {
        it('returns a private key as a byte array', () => __awaiter(void 0, void 0, void 0, function* () {
            const privateKey = {
                kty: 'EC',
                crv: 'secp256k1',
                d: 'dA7GmBDemtG48pjx0sDmpS3R6VjcKvyFdkvsFpwiLog',
                x: 'N1KVEnQCMpbIp0sP_kL4L_S01LukMmR3QicD92H1klg',
                y: 'wmp0ZbmnesDD8c7bE5xCiwsfu1UWhntSdjbzKG9wVVM',
                kid: 'iwwOeCqgvREo5xGeBS-obWW9ZGjv0o1M65gUYN6SYh4'
            };
            const privateKeyBytes = yield Secp256k1.privateKeyToBytes({ privateKey });
            expect(privateKeyBytes).to.be.an.instanceOf(Uint8Array);
            const expectedOutput = Convert.hex('740ec69810de9ad1b8f298f1d2c0e6a52dd1e958dc2afc85764bec169c222e88').toUint8Array();
            expect(privateKeyBytes).to.deep.equal(expectedOutput);
        }));
        it('throws an error when provided a secp256k1 public key', () => __awaiter(void 0, void 0, void 0, function* () {
            const publicKey = {
                kty: 'EC',
                crv: 'secp256k1',
                x: 'N1KVEnQCMpbIp0sP_kL4L_S01LukMmR3QicD92H1klg',
                y: 'wmp0ZbmnesDD8c7bE5xCiwsfu1UWhntSdjbzKG9wVVM'
            };
            yield expect(Secp256k1.privateKeyToBytes({ privateKey: publicKey })).to.eventually.be.rejectedWith(Error, 'provided key is not a valid EC private key');
        }));
        for (const vector of secp256k1PrivateKeyToBytes.vectors) {
            it(vector.description, () => __awaiter(void 0, void 0, void 0, function* () {
                const privateKeyBytes = yield Secp256k1.privateKeyToBytes({
                    privateKey: vector.input.privateKey
                });
                expect(privateKeyBytes).to.deep.equal(Convert.hex(vector.output).toUint8Array());
            }));
        }
    });
    describe('publicKeyToBytes()', () => {
        it('returns a public key in JWK format', () => __awaiter(void 0, void 0, void 0, function* () {
            const publicKey = {
                kty: 'EC',
                crv: 'secp256k1',
                x: 'N1KVEnQCMpbIp0sP_kL4L_S01LukMmR3QicD92H1klg',
                y: 'wmp0ZbmnesDD8c7bE5xCiwsfu1UWhntSdjbzKG9wVVM',
                kid: 'iwwOeCqgvREo5xGeBS-obWW9ZGjv0o1M65gUYN6SYh4'
            };
            const publicKeyBytes = yield Secp256k1.publicKeyToBytes({ publicKey });
            expect(publicKeyBytes).to.be.an.instanceOf(Uint8Array);
            const expectedOutput = Convert.hex('043752951274023296c8a74b0ffe42f82ff4b4d4bba4326477422703f761f59258c26a7465b9a77ac0c3f1cedb139c428b0b1fbb5516867b527636f3286f705553').toUint8Array();
            expect(publicKeyBytes).to.deep.equal(expectedOutput);
        }));
        it('throws an error when provided an Ed25519 private key', () => __awaiter(void 0, void 0, void 0, function* () {
            const privateKey = {
                kty: 'EC',
                crv: 'secp256k1',
                d: 'dA7GmBDemtG48pjx0sDmpS3R6VjcKvyFdkvsFpwiLog',
                x: 'N1KVEnQCMpbIp0sP_kL4L_S01LukMmR3QicD92H1klg',
                y: 'wmp0ZbmnesDD8c7bE5xCiwsfu1UWhntSdjbzKG9wVVM',
                kid: 'iwwOeCqgvREo5xGeBS-obWW9ZGjv0o1M65gUYN6SYh4'
            };
            yield expect(Secp256k1.publicKeyToBytes({ publicKey: privateKey })).to.eventually.be.rejectedWith(Error, 'provided key is not a valid EC public key');
        }));
        for (const vector of secp256k1PublicKeyToBytes.vectors) {
            it(vector.description, () => __awaiter(void 0, void 0, void 0, function* () {
                const publicKeyBytes = yield Secp256k1.publicKeyToBytes({
                    publicKey: vector.input.publicKey
                });
                expect(publicKeyBytes).to.deep.equal(Convert.hex(vector.output).toUint8Array());
            }));
        }
    });
    describe('sharedSecret()', () => {
        let ownPrivateKey;
        let ownPublicKey;
        let otherPartyPrivateKey;
        let otherPartyPublicKey;
        beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
            ownPrivateKey = privateKey;
            ownPublicKey = publicKey;
            otherPartyPrivateKey = yield Secp256k1.generateKey();
            otherPartyPublicKey = yield Secp256k1.computePublicKey({ key: otherPartyPrivateKey });
        }));
        it('generates a 32-byte shared secret', () => __awaiter(void 0, void 0, void 0, function* () {
            const sharedSecret = yield Secp256k1.sharedSecret({
                privateKeyA: ownPrivateKey,
                publicKeyB: otherPartyPublicKey
            });
            expect(sharedSecret).to.be.instanceOf(Uint8Array);
            expect(sharedSecret.byteLength).to.equal(32);
        }));
        it('is commutative', () => __awaiter(void 0, void 0, void 0, function* () {
            const sharedSecretOwnOther = yield Secp256k1.sharedSecret({
                privateKeyA: ownPrivateKey,
                publicKeyB: otherPartyPublicKey
            });
            const sharedSecretOtherOwn = yield Secp256k1.sharedSecret({
                privateKeyA: otherPartyPrivateKey,
                publicKeyB: ownPublicKey
            });
            expect(sharedSecretOwnOther).to.deep.equal(sharedSecretOtherOwn);
        }));
        it('throws an error if the public/private keys from the same key pair are specified', () => __awaiter(void 0, void 0, void 0, function* () {
            yield expect(Secp256k1.sharedSecret({
                privateKeyA: ownPrivateKey,
                publicKeyB: ownPublicKey
            })).to.eventually.be.rejectedWith(Error, 'shared secret cannot be computed from a single key pair');
        }));
    });
    describe('sign()', () => {
        it('returns a 64-byte signature of type Uint8Array', () => __awaiter(void 0, void 0, void 0, function* () {
            const data = new Uint8Array([51, 52, 53]);
            const signature = yield Secp256k1.sign({ key: privateKey, data });
            expect(signature).to.be.instanceOf(Uint8Array);
            expect(signature.byteLength).to.equal(64);
        }));
        it('accepts input data as Uint8Array', () => __awaiter(void 0, void 0, void 0, function* () {
            const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
            const key = privateKey;
            let signature;
            signature = yield Secp256k1.sign({ key, data });
            expect(signature).to.be.instanceOf(Uint8Array);
        }));
    });
    describe('validatePrivateKey()', () => {
        for (const vector of secp256k1ValidatePrivateKey.vectors) {
            it(vector.description, () => __awaiter(void 0, void 0, void 0, function* () {
                const privateKeyBytes = Convert.hex(vector.input.privateKeyBytes).toUint8Array();
                const isValid = yield Secp256k1.validatePrivateKey({ privateKeyBytes });
                expect(isValid).to.equal(vector.output);
            }));
        }
    });
    describe('validatePublicKey()', () => {
        for (const vector of secp256k1ValidatePublicKey.vectors) {
            it(vector.description, () => __awaiter(void 0, void 0, void 0, function* () {
                const publicKeyBytes = Convert.hex(vector.input.publicKeyBytes).toUint8Array();
                const isValid = yield Secp256k1.validatePublicKey({ publicKeyBytes });
                expect(isValid).to.equal(vector.output);
            }));
        }
    });
    describe('verify()', () => {
        it('returns a boolean result', () => __awaiter(void 0, void 0, void 0, function* () {
            const data = new Uint8Array([51, 52, 53]);
            const signature = yield Secp256k1.sign({ key: privateKey, data });
            const isValid = yield Secp256k1.verify({ key: publicKey, signature, data });
            expect(isValid).to.exist;
            expect(isValid).to.be.true;
        }));
        it('accepts input data as Uint8Array', () => __awaiter(void 0, void 0, void 0, function* () {
            const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
            let isValid;
            let signature;
            // TypedArray - Uint8Array
            signature = yield Secp256k1.sign({ key: privateKey, data });
            isValid = yield Secp256k1.verify({ key: publicKey, signature, data });
            expect(isValid).to.be.true;
        }));
        it('returns false if the signed data was mutated', () => __awaiter(void 0, void 0, void 0, function* () {
            const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
            let isValid;
            // Generate signature using the private key.
            const signature = yield Secp256k1.sign({ key: privateKey, data });
            // Verification should return true with the data used to generate the signature.
            isValid = yield Secp256k1.verify({ key: publicKey, signature, data });
            expect(isValid).to.be.true;
            // Make a copy and flip the least significant bit (the rightmost bit) in the first byte of the array.
            const mutatedData = new Uint8Array(data);
            mutatedData[0] ^= 1 << 0;
            // Verification should return false if the given data does not match the data used to generate the signature.
            isValid = yield Secp256k1.verify({ key: publicKey, signature, data: mutatedData });
            expect(isValid).to.be.false;
        }));
        it('returns false if the signature was mutated', () => __awaiter(void 0, void 0, void 0, function* () {
            const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
            let isValid;
            // Generate signature using the private key.
            const signature = yield Secp256k1.sign({ key: privateKey, data });
            // Verification should return true with the data used to generate the signature.
            isValid = yield Secp256k1.verify({ key: publicKey, signature, data });
            expect(isValid).to.be.true;
            // Make a copy and flip the least significant bit (the rightmost bit) in the first byte of the array.
            const mutatedSignature = new Uint8Array(signature);
            mutatedSignature[0] ^= 1 << 0;
            // Verification should return false if the signature was modified.
            isValid = yield Secp256k1.verify({ key: publicKey, signature: signature, data: mutatedSignature });
            expect(isValid).to.be.false;
        }));
        it('returns false with a signature generated using a different private key', () => __awaiter(void 0, void 0, void 0, function* () {
            const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
            const publicKeyA = publicKey;
            const privateKeyB = yield Secp256k1.generateKey();
            let isValid;
            // Generate a signature using private key B.
            const signatureB = yield Secp256k1.sign({ key: privateKeyB, data });
            // Verification should return false with public key A.
            isValid = yield Secp256k1.verify({ key: publicKeyA, signature: signatureB, data });
            expect(isValid).to.be.false;
        }));
    });
});
//# sourceMappingURL=secp256k1.spec.js.map