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
import { Convert } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';
import { AesCtr } from '../../src/primitives/aes-ctr.js';
import AesCtrDecryptTestVector from '../fixtures/test-vectors/aes-ctr/decrypt.json' assert { type: 'json' };
import AesCtrEncryptTestVector from '../fixtures/test-vectors/aes-ctr/encrypt.json' assert { type: 'json' };
chai.use(chaiAsPromised);
describe('AesCtr', () => {
    describe('bytesToPrivateKey()', () => {
        it('returns a private key in JWK format', () => __awaiter(void 0, void 0, void 0, function* () {
            const privateKeyBytes = Convert.hex('ffbd52af5980bd3870cdc3f3634980ae9d15b33440f63f79799eb8ca2329117f').toUint8Array();
            const privateKey = yield AesCtr.bytesToPrivateKey({ privateKeyBytes });
            expect(privateKey).to.have.property('k');
            expect(privateKey).to.have.property('kid');
            expect(privateKey).to.have.property('kty', 'oct');
        }));
        it('returns the expected JWK given byte array input', () => __awaiter(void 0, void 0, void 0, function* () {
            const privateKeyBytes = Convert.hex('2fbd52af5980bd3870cdc3f3634980ae9d15b33440f63f79799eb8ca2329117f').toUint8Array();
            const privateKey = yield AesCtr.bytesToPrivateKey({ privateKeyBytes });
            const expectedOutput = {
                k: 'L71Sr1mAvThwzcPzY0mArp0VszRA9j95eZ64yiMpEX8',
                kty: 'oct',
                kid: '6oEQ2tFk2QI4_Lz8uxQpT4_Qce6f9ceS3ZD76nqd_qg'
            };
            expect(privateKey).to.deep.equal(expectedOutput);
        }));
    });
    describe('decrypt', () => {
        it('accepts ciphertext input as Uint8Array', () => __awaiter(void 0, void 0, void 0, function* () {
            const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
            const privateKey = yield AesCtr.generateKey({ length: 256 });
            const ciphertext = yield AesCtr.decrypt({ counter: new Uint8Array(16), data, key: privateKey, length: 128 });
            expect(ciphertext).to.be.instanceOf(Uint8Array);
        }));
        for (const vector of AesCtrDecryptTestVector.vectors) {
            it(vector.description, () => __awaiter(void 0, void 0, void 0, function* () {
                const privateKeyBytes = Convert.hex(vector.input.key).toUint8Array();
                const privateKey = yield AesCtr.bytesToPrivateKey({ privateKeyBytes });
                const ciphertext = yield AesCtr.decrypt({
                    key: privateKey,
                    data: Convert.hex(vector.input.data).toUint8Array(),
                    counter: Convert.hex(vector.input.counter).toUint8Array(),
                    length: vector.input.length
                });
                expect(ciphertext).to.deep.equal(Convert.hex(vector.output).toUint8Array());
            }));
        }
        it('throws an error if the initial counter block is not 128 bits in length', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const data = new Uint8Array(8);
            const key = { k: 'k', kty: 'oct' };
            for (const counterLength of [64, 192, 256]) {
                const counter = new Uint8Array(counterLength);
                try {
                    // Test the method.
                    yield AesCtr.decrypt({ key, data, counter, length: 128 });
                    expect.fail('expected an error to be thrown due to invalid counter length');
                }
                catch (error) {
                    // Validate the result.
                    expect(error.message).to.include(`counter must be 128 bits`);
                }
            }
        }));
        it('throws an error if the counter length is not in the range 1 to 128 bits', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const data = new Uint8Array(8);
            const counter = new Uint8Array(16);
            // const key: Jwk = { k: 'k', kty: 'oct' };
            const key = yield AesCtr.generateKey({ length: 256 });
            for (const length of [0, 129, 256]) {
                try {
                    // Test the method.
                    yield AesCtr.decrypt({ key, data, counter, length });
                    expect.fail('expected an error to be thrown due to invalid length property');
                }
                catch (error) {
                    // Validate the result.
                    expect(error.message).to.include(`must be in the range 1 to 128`);
                }
            }
        }));
    });
    describe('encrypt', () => {
        it('accepts plaintext input as Uint8Array', () => __awaiter(void 0, void 0, void 0, function* () {
            const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
            const privateKey = yield AesCtr.generateKey({ length: 256 });
            let ciphertext;
            // Uint8Array
            ciphertext = yield AesCtr.encrypt({ counter: new Uint8Array(16), data, key: privateKey, length: 128 });
            expect(ciphertext).to.be.instanceOf(Uint8Array);
        }));
        for (const vector of AesCtrEncryptTestVector.vectors) {
            it(vector.description, () => __awaiter(void 0, void 0, void 0, function* () {
                const privateKeyBytes = Convert.hex(vector.input.key).toUint8Array();
                const privateKey = yield AesCtr.bytesToPrivateKey({ privateKeyBytes });
                const ciphertext = yield AesCtr.encrypt({
                    key: privateKey,
                    data: Convert.hex(vector.input.data).toUint8Array(),
                    counter: Convert.hex(vector.input.counter).toUint8Array(),
                    length: vector.input.length
                });
                expect(ciphertext).to.deep.equal(Convert.hex(vector.output).toUint8Array());
            }));
        }
        it('throws an error if the initial counter block is not 128 bits in length', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const data = new Uint8Array(8);
            const key = yield AesCtr.generateKey({ length: 256 });
            for (const counterLength of [64, 192, 256]) {
                const counter = new Uint8Array(counterLength);
                try {
                    // Test the method.
                    yield AesCtr.encrypt({ key, data, counter, length: 128 });
                    expect.fail('expected an error to be thrown due to invalid counter length');
                }
                catch (error) {
                    // Validate the result.
                    expect(error.message).to.include(`counter must be 128 bits`);
                }
            }
        }));
        it('throws an error if the counter length is not in the range 1 to 128 bits', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const data = new Uint8Array(8);
            const counter = new Uint8Array(16);
            // const key: Jwk = { k: 'k', kty: 'oct' };
            const key = yield AesCtr.generateKey({ length: 256 });
            for (const length of [0, 129, 256]) {
                try {
                    // Test the method.
                    yield AesCtr.encrypt({ key, data, counter, length });
                    expect.fail('expected an error to be thrown due to invalid length property');
                }
                catch (error) {
                    // Validate the result.
                    expect(error.message).to.include(`must be in the range 1 to 128`);
                }
            }
        }));
    });
    describe('generateKey()', () => {
        it('returns a private key in JWK format', () => __awaiter(void 0, void 0, void 0, function* () {
            const privateKey = yield AesCtr.generateKey({ length: 256 });
            expect(privateKey).to.have.property('k');
            expect(privateKey).to.have.property('kid');
            expect(privateKey).to.have.property('kty', 'oct');
        }));
        it('supports key lengths of 128, 192, or 256 bits', () => __awaiter(void 0, void 0, void 0, function* () {
            let privateKey;
            let privateKeyBytes;
            // 128 bits
            privateKey = (yield AesCtr.generateKey({ length: 128 }));
            privateKeyBytes = Convert.base64Url(privateKey.k).toUint8Array();
            expect(privateKeyBytes.byteLength).to.equal(16);
            // 192 bits
            privateKey = (yield AesCtr.generateKey({ length: 192 }));
            privateKeyBytes = Convert.base64Url(privateKey.k).toUint8Array();
            expect(privateKeyBytes.byteLength).to.equal(24);
            // 256 bits
            privateKey = (yield AesCtr.generateKey({ length: 256 }));
            privateKeyBytes = Convert.base64Url(privateKey.k).toUint8Array();
            expect(privateKeyBytes.byteLength).to.equal(32);
        }));
        it('throws an error if the key length is invalid', () => __awaiter(void 0, void 0, void 0, function* () {
            for (const length of [32, 64, 100, 512]) {
                try {
                    // Test the method.
                    // @ts-expect-error because invalid tag lengths are being tested
                    yield AesCtr.generateKey({ length });
                    expect.fail('expected an error to be thrown due to invalid key length');
                }
                catch (error) {
                    // Validate the result.
                    expect(error.message).to.include(`key length is invalid`);
                }
            }
        }));
    });
    describe('privateKeyToBytes()', () => {
        it('returns a private key as a byte array', () => __awaiter(void 0, void 0, void 0, function* () {
            const privateKey = yield AesCtr.generateKey({ length: 128 });
            const privateKeyBytes = yield AesCtr.privateKeyToBytes({ privateKey });
            expect(privateKeyBytes).to.be.an.instanceOf(Uint8Array);
        }));
        it('returns the expected byte array for JWK input', () => __awaiter(void 0, void 0, void 0, function* () {
            const privateKey = {
                k: 'L71Sr1mAvThwzcPzY0mArp0VszRA9j95eZ64yiMpEX8',
                kty: 'oct',
                kid: '6oEQ2tFk2QI4_Lz8uxQpT4_Qce6f9ceS3ZD76nqd_qg'
            };
            const privateKeyBytes = yield AesCtr.privateKeyToBytes({ privateKey });
            expect(privateKeyBytes).to.be.an.instanceOf(Uint8Array);
            const expectedOutput = Convert.hex('2fbd52af5980bd3870cdc3f3634980ae9d15b33440f63f79799eb8ca2329117f').toUint8Array();
            expect(privateKeyBytes).to.deep.equal(expectedOutput);
        }));
        it('throws an error when provided an asymmetric public key', () => __awaiter(void 0, void 0, void 0, function* () {
            const publicKey = {
                crv: 'Ed25519',
                kty: 'OKP',
                x: 'PUAXw-hDiVqStwqnTRt-vJyYLM8uxJaMwM1V8Sr0Zgw',
            };
            yield expect(AesCtr.privateKeyToBytes({ privateKey: publicKey })).to.eventually.be.rejectedWith(Error, 'provided key is not a valid oct private key');
        }));
    });
});
//# sourceMappingURL=aes-ctr.spec.js.map