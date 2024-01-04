import chai, { expect } from 'chai';
import { Convert } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';

import Sha256DigestTestVector from '../fixtures/test-vectors/sha256/digest.json' assert { type: 'json' };

import { Sha256 } from '../../src/primitives/sha256.js';

chai.use(chaiAsPromised);

describe('Sha256', () => {
  describe('digest()', () => {
    it('returns a Uint8Array digest of length 32', async () => {
      const digest = await Sha256.digest({
        data: new Uint8Array(10)
      });

      expect(digest).to.be.an('Uint8Array');
      expect(digest.byteLength).to.equal(32);
    });

    for (const vector of Sha256DigestTestVector.vectors) {
      it(vector.description, async () => {
        const digest = await Sha256.digest({
          data: Convert.string(vector.input).toUint8Array()
        });

        expect(digest).to.deep.equal(
          Convert.hex(vector.output).toUint8Array()
        );
      });
    }
  });
});