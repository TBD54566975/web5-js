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
import { Convert } from '@web5/common';
import { randomBytes } from '../../src/utils.js';
import { AesCtrAlgorithm } from '../../src/algorithms/aes-ctr.js';
describe('AesCtrAlgorithm', () => {
    let aesCtr;
    let dataEncryptionKey;
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        aesCtr = new AesCtrAlgorithm();
        dataEncryptionKey = yield aesCtr.generateKey({ algorithm: 'A128CTR' });
    }));
    describe('encrypt()', () => {
        it('returns ciphertext as a Uint8Array', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const plaintext = new Uint8Array([1, 2, 3, 4]);
            const counter = randomBytes(16); // Initial value of the counter block.
            const length = 64; // Number of bits in the counter block used for the counter.
            // Test the method.
            const ciphertext = yield aesCtr.encrypt({
                key: dataEncryptionKey,
                data: plaintext,
                counter,
                length
            });
            // Validate the results.
            expect(ciphertext).to.be.instanceOf(Uint8Array);
            expect(ciphertext.byteLength).to.equal(plaintext.byteLength);
        }));
    });
    describe('decrypt()', () => {
        it('returns plaintext as a Uint8Array', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const ciphertext = new Uint8Array([1, 2, 3, 4]);
            const counter = randomBytes(16); // Initial value of the counter block.
            const length = 64; // Number of bits in the counter block used for the counter.
            // Test the method.
            const plaintext = yield aesCtr.decrypt({
                key: dataEncryptionKey,
                data: ciphertext,
                counter,
                length
            });
            // Validate the results.
            expect(plaintext).to.be.instanceOf(Uint8Array);
            expect(plaintext.byteLength).to.equal(ciphertext.byteLength);
        }));
    });
    describe('generateKey()', () => {
        it('returns a private key in JWK format', () => __awaiter(void 0, void 0, void 0, function* () {
            const privateKey = yield aesCtr.generateKey({ algorithm: 'A128CTR' });
            expect(privateKey).to.have.property('alg', 'A128CTR');
            expect(privateKey).to.have.property('k');
            expect(privateKey).to.have.property('kid');
            expect(privateKey).to.have.property('kty', 'oct');
        }));
        it(`supports 'A128CTR', 'A192CTR', and 'A256CTR' algorithms`, () => __awaiter(void 0, void 0, void 0, function* () {
            const algorithms = ['A128CTR', 'A192CTR', 'A256CTR'];
            for (const algorithm of algorithms) {
                const privateKey = yield aesCtr.generateKey({ algorithm });
                expect(privateKey).to.have.property('alg', algorithm);
            }
        }));
        it(`returns keys with the correct bit length`, () => __awaiter(void 0, void 0, void 0, function* () {
            const algorithms = ['A128CTR', 'A192CTR', 'A256CTR'];
            for (const algorithm of algorithms) {
                const privateKey = yield aesCtr.generateKey({ algorithm });
                if (!('k' in privateKey))
                    throw new Error('Expected privateKey to have a `k` property'); // TypeScript type guard.
                const privateKeyBytes = Convert.base64Url(privateKey.k).toUint8Array();
                expect(privateKeyBytes.byteLength * 8).to.equal(parseInt(algorithm.slice(1, 4)));
            }
        }));
    });
});
//# sourceMappingURL=aes-ctr.spec.js.map