import { expect } from 'chai';
import { Convert } from '@web5/common';

import type { Jwk } from '../../src/jose/jwk.js';

import { randomBytes } from '../../src/utils.js';
import { AesCtrAlgorithm } from '../../src/algorithms/aes-ctr.js';

describe('AesCtrAlgorithm', () => {
  let aesCtr: AesCtrAlgorithm;
  let dataEncryptionKey: Jwk;

  before(async () => {
    aesCtr = new AesCtrAlgorithm();
    dataEncryptionKey = await aesCtr.generateKey({ algorithm: 'A128CTR' });
  });

  describe('encrypt()', () => {
    it('returns ciphertext as a Uint8Array', async () => {
      // Setup.
      const plaintext = new Uint8Array([1, 2, 3, 4]);
      const counter = randomBytes(16); // Initial value of the counter block.
      const length = 64; // Number of bits in the counter block used for the counter.

      // Test the method.
      const ciphertext = await aesCtr.encrypt({
        key  : dataEncryptionKey,
        data : plaintext,
        counter,
        length
      });

      // Validate the results.
      expect(ciphertext).to.be.instanceOf(Uint8Array);
      expect(ciphertext.byteLength).to.equal(plaintext.byteLength);
    });
  });

  describe('decrypt()', () => {
    it('returns plaintext as a Uint8Array', async () => {
      // Setup.
      const ciphertext = new Uint8Array([1, 2, 3, 4]);
      const counter = randomBytes(16); // Initial value of the counter block.
      const length = 64; // Number of bits in the counter block used for the counter.

      // Test the method.
      const plaintext = await aesCtr.decrypt({
        key  : dataEncryptionKey,
        data : ciphertext,
        counter,
        length
      });

      // Validate the results.
      expect(plaintext).to.be.instanceOf(Uint8Array);
      expect(plaintext.byteLength).to.equal(ciphertext.byteLength);
    });
  });

  describe('generateKey()', () => {
    it('returns a private key in JWK format', async () => {
      const privateKey = await aesCtr.generateKey({ algorithm: 'A128CTR' });

      expect(privateKey).to.have.property('alg', 'A128CTR');
      expect(privateKey).to.have.property('k');
      expect(privateKey).to.have.property('kid');
      expect(privateKey).to.have.property('kty', 'oct');
    });

    it(`supports 'A128CTR', 'A192CTR', and 'A256CTR' algorithms`, async () => {
      const algorithms = ['A128CTR', 'A192CTR', 'A256CTR'] as const;
      for (const algorithm of algorithms) {
        const privateKey = await aesCtr.generateKey({ algorithm });
        expect(privateKey).to.have.property('alg', algorithm);
      }
    });

    it(`returns keys with the correct bit length`, async () => {
      const algorithms = ['A128CTR', 'A192CTR', 'A256CTR'] as const;
      for (const algorithm of algorithms) {
        const privateKey = await aesCtr.generateKey({ algorithm });
        if (!privateKey.k) throw new Error('Expected privateKey to have a `k` property'); // TypeScript type guard.
        const privateKeyBytes = Convert.base64Url(privateKey.k).toUint8Array();
        expect(privateKeyBytes.byteLength * 8).to.equal(parseInt(algorithm.slice(1, 4)));
      }
    });
  });
});