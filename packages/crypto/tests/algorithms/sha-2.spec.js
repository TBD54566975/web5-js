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
import { Sha2Algorithm } from '../../src/algorithms/sha-2.js';
describe('Sha2Algorithm', () => {
    let sha2;
    beforeEach(() => {
        sha2 = new Sha2Algorithm();
    });
    describe('digest()', () => {
        it('computes and returns a digest as a Uint8Array', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const data = new Uint8Array([0, 1, 2, 3, 4]);
            // Test the method.
            const digest = yield sha2.digest({ algorithm: 'SHA-256', data });
            // Validate the result.
            expect(digest).to.exist;
            expect(digest).to.be.an.instanceOf(Uint8Array);
        }));
        it('supports SHA-256', () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup.
            const data = Convert.string('abc').toUint8Array();
            const expectedOutput = Convert.hex('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad').toUint8Array();
            // Test the method.
            const digest = yield sha2.digest({ algorithm: 'SHA-256', data });
            // Validate the result.
            expect(digest).to.exist;
            expect(digest).to.be.an.instanceOf(Uint8Array);
            expect(digest).to.have.lengthOf(32);
            expect(digest).to.deep.equal(expectedOutput);
        }));
    });
});
//# sourceMappingURL=sha-2.spec.js.map