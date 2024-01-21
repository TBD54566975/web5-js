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
import { Pbkdf2 } from '../../src/primitives/pbkdf2.js';
chai.use(chaiAsPromised);
describe('Pbkdf2', () => {
    const password = Convert.string('password').toUint8Array();
    const salt = Convert.string('salt').toUint8Array();
    const iterations = 1;
    const length = 256; // 32 bytes
    describe('deriveKey', () => {
        it('successfully derives a key', () => __awaiter(void 0, void 0, void 0, function* () {
            const derivedKey = yield Pbkdf2.deriveKey({ hash: 'SHA-256', password, salt, iterations, length });
            expect(derivedKey).to.be.instanceOf(Uint8Array);
            expect(derivedKey.byteLength).to.equal(length / 8);
        }));
        const hashFunctions = ['SHA-256', 'SHA-384', 'SHA-512'];
        hashFunctions.forEach(hash => {
            it(`handles ${hash} hash function`, () => __awaiter(void 0, void 0, void 0, function* () {
                const options = { hash, password, salt, iterations, length };
                const derivedKey = yield Pbkdf2.deriveKey(options);
                expect(derivedKey).to.be.instanceOf(Uint8Array);
                expect(derivedKey.byteLength).to.equal(length / 8);
            }));
        });
        it('throws an error when an invalid hash function is specified', () => __awaiter(void 0, void 0, void 0, function* () {
            const options = {
                hash: 'SHA-2', password, salt, iterations, length
            };
            // @ts-expect-error for testing purposes
            yield expect(Pbkdf2.deriveKey(options)).to.eventually.be.rejectedWith(Error);
        }));
        it('throws an error when iterations count is not a positive number', () => __awaiter(void 0, void 0, void 0, function* () {
            const options = {
                hash: 'SHA-256', password, salt,
                iterations: -1, length
            };
            // Every browser throws a different error message so a specific message cannot be checked.
            yield expect(Pbkdf2.deriveKey(options)).to.eventually.be.rejectedWith(Error);
        }));
    });
});
//# sourceMappingURL=pbkdf2.spec.js.map