import { expect } from 'chai';
import { Convert } from '@web5/common';

import { Sha2Algorithm } from '../../src/algorithms/sha-2.js';

describe('Sha2Algorithm', () => {
  let sha2: Sha2Algorithm;

  beforeEach(() => {
    sha2 = new Sha2Algorithm();
  });

  describe('digest()', () => {
    it('computes and returns a digest as a Uint8Array', async () => {
      // Setup.
      const data = new Uint8Array([0, 1, 2, 3, 4]);

      // Test the method.
      const digest = await sha2.digest({ algorithm: 'SHA-256', data });

      // Validate the result.
      expect(digest).to.exist;
      expect(digest).to.be.an.instanceOf(Uint8Array);
    });

    it('supports SHA-256', async () => {
      // Setup.
      const data = Convert.string('abc').toUint8Array();
      const expectedOutput = Convert.hex('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad').toUint8Array();

      // Test the method.
      const digest = await sha2.digest({ algorithm: 'SHA-256', data });

      // Validate the result.
      expect(digest).to.exist;
      expect(digest).to.be.an.instanceOf(Uint8Array);
      expect(digest).to.have.lengthOf(32);
      expect(digest).to.deep.equal(expectedOutput);
    });
  });
});