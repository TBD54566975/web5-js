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
    it('successfully derives a key', async () => {
      const derivedKey = await Pbkdf2.deriveKey({ hash: 'SHA-256', password, salt, iterations, length });

      expect(derivedKey).to.be.instanceOf(Uint8Array);
      expect(derivedKey.byteLength).to.equal(length / 8);
    });

    const hashFunctions: ('SHA-256' | 'SHA-384' | 'SHA-512')[] = ['SHA-256', 'SHA-384', 'SHA-512'];
    hashFunctions.forEach(hash => {
      it(`handles ${hash} hash function`, async () => {
        const options = { hash, password, salt, iterations, length };

        const derivedKey = await Pbkdf2.deriveKey(options);
        expect(derivedKey).to.be.instanceOf(Uint8Array);
        expect(derivedKey.byteLength).to.equal(length / 8);
      });
    });

    it('throws an error when an invalid hash function is specified', async () => {
      const options = {
        hash: 'SHA-2' as const, password, salt, iterations, length
      };

      // @ts-expect-error for testing purposes
      await expect(Pbkdf2.deriveKey(options)).to.eventually.be.rejectedWith(Error);
    });

    it('throws an error when iterations count is not a positive number', async () => {
      const options = {
        hash       : 'SHA-256' as const, password, salt,
        iterations : -1, length
      };

      // Every browser throws a different error message so a specific message cannot be checked.
      await expect(Pbkdf2.deriveKey(options)).to.eventually.be.rejectedWith(Error);
    });
  });
});