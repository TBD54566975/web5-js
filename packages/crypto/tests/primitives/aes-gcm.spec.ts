import chai, { expect } from 'chai';
import { Convert } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';

import type { Jwk, JwkParamsOctPrivate } from '../../src/jose/jwk.js';

import { AesGcm, AES_GCM_TAG_LENGTHS } from '../../src/primitives/aes-gcm.js';
import AesGcmDecryptTestVector from '../fixtures/test-vectors/aes-gcm/decrypt.json' assert { type: 'json' };
import AesGcmEncryptTestVector from '../fixtures/test-vectors/aes-gcm/encrypt.json' assert { type: 'json' };

chai.use(chaiAsPromised);

describe('AesGcm', () => {
  describe('bytesToPrivateKey()', () => {
    it('returns a private key in JWK format', async () => {
      const privateKeyBytes = Convert.hex('ffbd52af5980bd3870cdc3f3634980ae9d15b33440f63f79799eb8ca2329117f').toUint8Array();
      const privateKey = await AesGcm.bytesToPrivateKey({ privateKeyBytes });

      expect(privateKey).to.have.property('k');
      expect(privateKey).to.have.property('kid');
      expect(privateKey).to.have.property('kty', 'oct');
    });

    it('returns the expected JWK given byte array input', async () => {
      const privateKeyBytes = Convert.hex('2fbd52af5980bd3870cdc3f3634980ae9d15b33440f63f79799eb8ca2329117f').toUint8Array();

      const privateKey = await AesGcm.bytesToPrivateKey({ privateKeyBytes });

      const expectedOutput: Jwk = {
        k   : 'L71Sr1mAvThwzcPzY0mArp0VszRA9j95eZ64yiMpEX8',
        kty : 'oct',
        kid : '6oEQ2tFk2QI4_Lz8uxQpT4_Qce6f9ceS3ZD76nqd_qg'
      };
      expect(privateKey).to.deep.equal(expectedOutput);
    });
  });

  describe('decrypt', () => {
    it('returns ciphertext as a Uint8Array', async () => {
      // Setup.
      const privateKeyBytes = Convert.hex('de4ea2de269297bfbf4be347dcdd4631').toUint8Array();
      const privateKey = await AesGcm.bytesToPrivateKey({ privateKeyBytes });
      const ciphertext = Convert.hex('f27e81aa63c315a5cd03e2abcbc62a5665').toUint8Array();

      // Test the method.
      const plaintext = await AesGcm.decrypt({ data: ciphertext, iv: new Uint8Array(12), key: privateKey, tagLength: 128 });

      // Validate the results.
      expect(plaintext).to.be.instanceOf(Uint8Array);
    });

    it('uses a tagLength of 128 bits by default', async () => {
      const privateKeyBytes = Convert.hex('de4ea2de269297bfbf4be347dcdd4631').toUint8Array();
      const privateKey = await AesGcm.bytesToPrivateKey({ privateKeyBytes });
      const ciphertext = Convert.hex('f27e81aa63c315a5cd03e2abcbc62a5665').toUint8Array();

      const plaintext = await AesGcm.decrypt({ data: ciphertext, iv: new Uint8Array(12), key: privateKey });
      expect(plaintext).to.be.instanceOf(Uint8Array);
    });

    for (const vector of AesGcmDecryptTestVector.vectors) {
      it(vector.description, async () => {
        const privateKeyBytes = Convert.hex(vector.input.key).toUint8Array();
        const privateKey = await AesGcm.bytesToPrivateKey({ privateKeyBytes });

        const plaintext = await AesGcm.decrypt({
          key            : privateKey,
          data           : Convert.hex(vector.input.data).toUint8Array(),
          iv             : Convert.hex(vector.input.iv).toUint8Array(),
          additionalData : Convert.hex(vector.input.additionalData).toUint8Array(),
          tagLength      : vector.input.tagLength as typeof AES_GCM_TAG_LENGTHS[number]
        });

        expect(plaintext).to.deep.equal(Convert.hex(vector.output).toUint8Array());
      });
    }

    it('throws an error if the initialization vector is not 96 bits in length', async () => {
      // Setup.
      const data = new Uint8Array(8);
      const key = await AesGcm.generateKey({ length: 256 });

      for (const ivLength of [32, 64, 100, 256]) {
        const iv = new Uint8Array(ivLength);
        try {
          // Test the method.
          await AesGcm.decrypt({ key, data, iv });
          expect.fail('expected an error to be thrown due to unsupported initialization vector length');

        } catch (error: any) {
          // Validate the result.
          expect(error.message).to.include(`initialization vector must be 96 bits`);
        }
      }
    });

    it('throws an error if the tag length is invalid', async () => {
      // Setup.
      const data = new Uint8Array(8);
      const iv = new Uint8Array(12);
      const key = await AesGcm.generateKey({ length: 256 });

      for (const tagLength of [32, 64, 100, 256]) {
        try {
          // Test the method.
          // @ts-expect-error because invalid tag lengths are being tested
          await AesGcm.decrypt({ tagLength, key, data, iv });
          expect.fail('expected an error to be thrown due to invalid tag length');

        } catch (error: any) {
          // Validate the result.
          expect(error.message).to.include(`tag length is invalid`);
        }
      }
    });
  });

  describe('encrypt', () => {
    it('returns ciphertext as a Uint8Array', async () => {
      // Setup.
      const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const privateKey = await AesGcm.generateKey({ length: 256 });

      // Test the method.
      const ciphertext = await AesGcm.encrypt({ data, iv: new Uint8Array(12), key: privateKey, tagLength: 128 });

      // Validate the results.
      expect(ciphertext).to.be.instanceOf(Uint8Array);
    });

    it('optionally accepts additional authenticated data', async () => {
      // Setup.
      const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const additionalData = new Uint8Array([9, 10, 11, 12, 13, 14, 15, 16]);
      const privateKey = await AesGcm.generateKey({ length: 256 });

      // Test the method.
      const ciphertext = await AesGcm.encrypt({
        key       : privateKey,
        data,
        iv        : new Uint8Array(12),
        tagLength : 128,
        additionalData
      });

      // Validate the results.
      expect(ciphertext).to.be.instanceOf(Uint8Array);
    });

    it('uses a tagLength of 128 bits by default', async () => {
      // Setup.
      const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const privateKey = await AesGcm.generateKey({ length: 256 });

      // Test the method.
      const ciphertext = await AesGcm.encrypt({ data, iv: new Uint8Array(12), key: privateKey });

      // Validate the results.
      expect(ciphertext).to.have.length(data.byteLength + 16); // 128 bits = 16 bytes
    });

    for (const vector of AesGcmEncryptTestVector.vectors) {
      it(vector.description, async () => {
        // Setup.
        const privateKeyBytes = Convert.hex(vector.input.key).toUint8Array();
        const privateKey = await AesGcm.bytesToPrivateKey({ privateKeyBytes });
        const expectedCiphertext = Convert.hex(vector.output).toUint8Array();

        // Test the method.
        const ciphertext = await AesGcm.encrypt({
          key            : privateKey,
          data           : Convert.hex(vector.input.data).toUint8Array(),
          iv             : Convert.hex(vector.input.iv).toUint8Array(),
          additionalData : Convert.hex(vector.input.additionalData).toUint8Array(),
          tagLength      : vector.input.tagLength as typeof AES_GCM_TAG_LENGTHS[number]
        });

        // Validate the result.
        expect(ciphertext).to.deep.equal(expectedCiphertext);
      });
    }

    it('throws an error if the initialization vector is not 96 bits in length', async () => {
      // Setup.
      const data = new Uint8Array(8);
      const key = await AesGcm.generateKey({ length: 256 });

      for (const ivLength of [32, 64, 100, 256]) {
        const iv = new Uint8Array(ivLength);
        try {
          // Test the method.
          await AesGcm.encrypt({ key, data, iv });
          expect.fail('expected an error to be thrown due to unsupported initialization vector length');

        } catch (error: any) {
          // Validate the result.
          expect(error.message).to.include(`initialization vector must be 96 bits`);
        }
      }
    });

    it('throws an error if the tag length is invalid', async () => {
      // Setup.
      const data = new Uint8Array(8);
      const iv = new Uint8Array(12);
      const key = await AesGcm.generateKey({ length: 256 });

      for (const tagLength of [32, 64, 100, 256]) {
        try {
          // Test the method.
          // @ts-expect-error because invalid tag lengths are being tested
          await AesGcm.encrypt({ tagLength, key, data, iv });
          expect.fail('expected an error to be thrown due to invalid tag length');

        } catch (error: any) {
          // Validate the result.
          expect(error.message).to.include(`tag length is invalid`);
        }
      }
    });
  });

  describe('generateKey()', () => {
    it('returns a private key in JWK format', async () => {
      const privateKey = await AesGcm.generateKey({ length: 256 });

      expect(privateKey).to.have.property('k');
      expect(privateKey).to.have.property('kid');
      expect(privateKey).to.have.property('kty', 'oct');
    });

    it('supports key lengths of 128, 192, or 256 bits', async () => {
      let privateKey: JwkParamsOctPrivate;
      let privateKeyBytes: Uint8Array;

      // 128 bits
      privateKey = await AesGcm.generateKey({ length: 128 }) as JwkParamsOctPrivate;
      privateKeyBytes = Convert.base64Url(privateKey.k).toUint8Array();
      expect(privateKeyBytes.byteLength).to.equal(16);

      // 192 bits
      privateKey = await AesGcm.generateKey({ length: 192 }) as JwkParamsOctPrivate;
      privateKeyBytes = Convert.base64Url(privateKey.k).toUint8Array();
      expect(privateKeyBytes.byteLength).to.equal(24);

      // 256 bits
      privateKey = await AesGcm.generateKey({ length: 256 }) as JwkParamsOctPrivate;
      privateKeyBytes = Convert.base64Url(privateKey.k).toUint8Array();
      expect(privateKeyBytes.byteLength).to.equal(32);
    });

    it('throws an error if the key length is invalid', async () => {
      for (const length of [32, 64, 100, 512]) {
        try {
          // Test the method.
          // @ts-expect-error because invalid tag lengths are being tested
          await AesGcm.generateKey({ length });
          expect.fail('expected an error to be thrown due to invalid key length');

        } catch (error: any) {
          // Validate the result.
          expect(error.message).to.include(`key length is invalid`);
        }
      }
    });
  });

  describe('privateKeyToBytes()', () => {
    it('returns a private key as a byte array', async () => {
      const privateKey = await AesGcm.generateKey({ length: 128 });
      const privateKeyBytes = await AesGcm.privateKeyToBytes({ privateKey });

      expect(privateKeyBytes).to.be.an.instanceOf(Uint8Array);
    });

    it('returns the expected byte array for JWK input', async () => {
      const privateKey: Jwk = {
        k   : 'L71Sr1mAvThwzcPzY0mArp0VszRA9j95eZ64yiMpEX8',
        kty : 'oct',
        kid : '6oEQ2tFk2QI4_Lz8uxQpT4_Qce6f9ceS3ZD76nqd_qg'
      };
      const privateKeyBytes = await AesGcm.privateKeyToBytes({ privateKey });

      expect(privateKeyBytes).to.be.an.instanceOf(Uint8Array);
      const expectedOutput = Convert.hex('2fbd52af5980bd3870cdc3f3634980ae9d15b33440f63f79799eb8ca2329117f').toUint8Array();
      expect(privateKeyBytes).to.deep.equal(expectedOutput);
    });

    it('throws an error when provided an asymmetric public key', async () => {
      const publicKey: Jwk = {
        crv : 'Ed25519',
        kty : 'OKP',
        x   : 'PUAXw-hDiVqStwqnTRt-vJyYLM8uxJaMwM1V8Sr0Zgw',
      };

      await expect(
        AesGcm.privateKeyToBytes({ privateKey: publicKey })
      ).to.eventually.be.rejectedWith(Error, 'provided key is not a valid oct private key');
    });
  });
});