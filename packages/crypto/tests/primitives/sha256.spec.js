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
import Sha256DigestTestVector from '../fixtures/test-vectors/sha256/digest.json' assert { type: 'json' };
import { Sha256 } from '../../src/primitives/sha256.js';
chai.use(chaiAsPromised);
describe('Sha256', () => {
    describe('digest()', () => {
        it('returns a Uint8Array digest of length 32', () => __awaiter(void 0, void 0, void 0, function* () {
            const digest = yield Sha256.digest({
                data: new Uint8Array(10)
            });
            expect(digest).to.be.an('Uint8Array');
            expect(digest.byteLength).to.equal(32);
        }));
        for (const vector of Sha256DigestTestVector.vectors) {
            it(vector.description, () => __awaiter(void 0, void 0, void 0, function* () {
                const digest = yield Sha256.digest({
                    data: Convert.string(vector.input).toUint8Array()
                });
                expect(digest).to.deep.equal(Convert.hex(vector.output).toUint8Array());
            }));
        }
    });
});
//# sourceMappingURL=sha256.spec.js.map