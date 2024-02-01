import { expect } from 'chai';
import { Convert } from '@web5/common';

import type { Jwk } from '../../src/jose/jwk.js';

import { randomBytes } from '../../src/utils.js';
import { AesGcmAlgorithm } from '../../src/algorithms/aes-gcm.js';

describe('AesGcmAlgorithm', () => {
  let aesGcm: AesGcmAlgorithm;
  let dataEncryptionKey: Jwk;

  before(async () => {
    aesGcm = new AesGcmAlgorithm();
    dataEncryptionKey = await aesGcm.generateKey({ algorithm: 'A128GCM' });
  });

  describe('encrypt()', () => {
    it('returns ciphertext as a Uint8Array', async () => {
      // Setup.
      const plaintext = new Uint8Array([1, 2, 3, 4]);
      const iv = randomBytes(12); // Initialization vector.
      const tagLength = 128; // Size in bits of the authentication tag.

      // Test the method.
      const ciphertext = await aesGcm.encrypt({
        key  : dataEncryptionKey,
        data : plaintext,
        iv,
        tagLength
      });

      // Validate the results.
      expect(ciphertext).to.be.instanceOf(Uint8Array);
      expect(ciphertext.byteLength).to.equal(plaintext.byteLength + tagLength / 8);
    });
  });

  describe('decrypt()', () => {
    it('returns plaintext as a Uint8Array', async () => {
      // Setup.
      const privateKey: Jwk = {
        k   : '3k6i3iaSl7-_S-NH3N1GMQ',
        kty : 'oct',
        kid : 'HLYc5oFZYs3OfBfOa-dWL5md__xFUIpx1BJ6ueCPQQQ'
      };
      const ciphertext = Convert.hex('f27e81aa63c315a5cd03e2abcbc62a5665').toUint8Array();

      // Test the method.
      const plaintext = await aesGcm.decrypt({
        key  : privateKey,
        data : ciphertext,
        iv   : new Uint8Array(12)
      });

      // Validate the results.
      expect(plaintext).to.be.instanceOf(Uint8Array);
    });
  });

  describe('generateKey()', () => {
    it('returns a private key in JWK format', async () => {
      const privateKey = await aesGcm.generateKey({ algorithm: 'A128GCM' });

      expect(privateKey).to.have.property('alg', 'A128GCM');
      expect(privateKey).to.have.property('k');
      expect(privateKey).to.have.property('kid');
      expect(privateKey).to.have.property('kty', 'oct');
    });

    it(`supports 'A128GCM', 'A192GCM', and 'A256GCM' algorithms`, async () => {
      const algorithms = ['A128GCM', 'A192GCM', 'A256GCM'] as const;
      for (const algorithm of algorithms) {
        const privateKey = await aesGcm.generateKey({ algorithm });
        expect(privateKey).to.have.property('alg', algorithm);
      }
    });

    it(`returns keys with the correct bit length`, async () => {
      const algorithms = ['A128GCM', 'A192GCM', 'A256GCM'] as const;
      for (const algorithm of algorithms) {
        const privateKey = await aesGcm.generateKey({ algorithm });
        if (!privateKey.k) throw new Error('Expected privateKey to have a `k` property'); // TypeScript type guard.
        const privateKeyBytes = Convert.base64Url(privateKey.k).toUint8Array();
        expect(privateKeyBytes.byteLength * 8).to.equal(parseInt(algorithm.slice(1, 4)));
      }
    });
  });
});