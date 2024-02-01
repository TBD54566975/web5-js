import chai, { expect } from 'chai';
import { Convert } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';

import type { Jwk, JwkParamsOctPrivate } from '../../src/jose/jwk.js';

import { AesCtr } from '../../src/primitives/aes-ctr.js';
import AesCtrDecryptTestVector from '../fixtures/test-vectors/aes-ctr/decrypt.json' assert { type: 'json' };
import AesCtrEncryptTestVector from '../fixtures/test-vectors/aes-ctr/encrypt.json' assert { type: 'json' };

chai.use(chaiAsPromised);

describe('AesCtr', () => {
  describe('bytesToPrivateKey()', () => {
    it('returns a private key in JWK format', async () => {
      const privateKeyBytes = Convert.hex('ffbd52af5980bd3870cdc3f3634980ae9d15b33440f63f79799eb8ca2329117f').toUint8Array();
      const privateKey = await AesCtr.bytesToPrivateKey({ privateKeyBytes });

      expect(privateKey).to.have.property('k');
      expect(privateKey).to.have.property('kid');
      expect(privateKey).to.have.property('kty', 'oct');
    });

    it('returns the expected JWK given byte array input', async () => {
      const privateKeyBytes = Convert.hex('2fbd52af5980bd3870cdc3f3634980ae9d15b33440f63f79799eb8ca2329117f').toUint8Array();

      const privateKey = await AesCtr.bytesToPrivateKey({ privateKeyBytes });

      const expectedOutput: Jwk = {
        k   : 'L71Sr1mAvThwzcPzY0mArp0VszRA9j95eZ64yiMpEX8',
        kty : 'oct',
        kid : '6oEQ2tFk2QI4_Lz8uxQpT4_Qce6f9ceS3ZD76nqd_qg'
      };
      expect(privateKey).to.deep.equal(expectedOutput);
    });
  });

  describe('decrypt', () => {
    it('accepts ciphertext input as Uint8Array', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const privateKey = await AesCtr.generateKey({ length: 256 });

      const ciphertext = await AesCtr.decrypt({ counter: new Uint8Array(16), data, key: privateKey, length: 128 });
      expect(ciphertext).to.be.instanceOf(Uint8Array);
    });

    for (const vector of AesCtrDecryptTestVector.vectors) {
      it(vector.description, async () => {
        const privateKeyBytes = Convert.hex(vector.input.key).toUint8Array();
        const privateKey = await AesCtr.bytesToPrivateKey({ privateKeyBytes });

        const ciphertext = await AesCtr.decrypt({
          key     : privateKey,
          data    : Convert.hex(vector.input.data).toUint8Array(),
          counter : Convert.hex(vector.input.counter).toUint8Array(),
          length  : vector.input.length
        });

        expect(ciphertext).to.deep.equal(Convert.hex(vector.output).toUint8Array());
      });
    }

    it('throws an error if the initial counter block is not 128 bits in length', async () => {
      // Setup.
      const data = new Uint8Array(8);
      const key: Jwk = { k: 'k', kty: 'oct' };

      for (const counterLength of [64, 192, 256]) {
        const counter = new Uint8Array(counterLength);
        try {
          // Test the method.
          await AesCtr.decrypt({ key, data, counter, length: 128 });
          expect.fail('expected an error to be thrown due to invalid counter length');

        } catch (error: any) {
          // Validate the result.
          expect(error.message).to.include(`counter must be 128 bits`);
        }
      }
    });

    it('throws an error if the counter length is not in the range 1 to 128 bits', async () => {
      // Setup.
      const data = new Uint8Array(8);
      const counter = new Uint8Array(16);
      // const key: Jwk = { k: 'k', kty: 'oct' };
      const key = await AesCtr.generateKey({ length: 256 });

      for (const length of [0, 129, 256]) {
        try {
          // Test the method.
          await AesCtr.decrypt({ key, data, counter, length });
          expect.fail('expected an error to be thrown due to invalid length property');

        } catch (error: any) {
          // Validate the result.
          expect(error.message).to.include(`must be in the range 1 to 128`);
        }
      }
    });
  });

  describe('encrypt', () => {
    it('accepts plaintext input as Uint8Array', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const privateKey = await AesCtr.generateKey({ length: 256 });
      let ciphertext: Uint8Array;

      // Uint8Array
      ciphertext = await AesCtr.encrypt({ counter: new Uint8Array(16), data, key: privateKey, length: 128 });
      expect(ciphertext).to.be.instanceOf(Uint8Array);
    });

    for (const vector of AesCtrEncryptTestVector.vectors) {
      it(vector.description, async () => {
        const privateKeyBytes = Convert.hex(vector.input.key).toUint8Array();
        const privateKey = await AesCtr.bytesToPrivateKey({ privateKeyBytes });

        const ciphertext = await AesCtr.encrypt({
          key     : privateKey,
          data    : Convert.hex(vector.input.data).toUint8Array(),
          counter : Convert.hex(vector.input.counter).toUint8Array(),
          length  : vector.input.length
        });

        expect(ciphertext).to.deep.equal(Convert.hex(vector.output).toUint8Array());
      });
    }

    it('throws an error if the initial counter block is not 128 bits in length', async () => {
      // Setup.
      const data = new Uint8Array(8);
      const key = await AesCtr.generateKey({ length: 256 });

      for (const counterLength of [64, 192, 256]) {
        const counter = new Uint8Array(counterLength);
        try {
          // Test the method.
          await AesCtr.encrypt({ key, data, counter, length: 128 });
          expect.fail('expected an error to be thrown due to invalid counter length');

        } catch (error: any) {
          // Validate the result.
          expect(error.message).to.include(`counter must be 128 bits`);
        }
      }
    });

    it('throws an error if the counter length is not in the range 1 to 128 bits', async () => {
      // Setup.
      const data = new Uint8Array(8);
      const counter = new Uint8Array(16);
      // const key: Jwk = { k: 'k', kty: 'oct' };
      const key = await AesCtr.generateKey({ length: 256 });

      for (const length of [0, 129, 256]) {
        try {
          // Test the method.
          await AesCtr.encrypt({ key, data, counter, length });
          expect.fail('expected an error to be thrown due to invalid length property');

        } catch (error: any) {
          // Validate the result.
          expect(error.message).to.include(`must be in the range 1 to 128`);
        }
      }
    });
  });

  describe('generateKey()', () => {
    it('returns a private key in JWK format', async () => {
      const privateKey = await AesCtr.generateKey({ length: 256 });

      expect(privateKey).to.have.property('k');
      expect(privateKey).to.have.property('kid');
      expect(privateKey).to.have.property('kty', 'oct');
    });

    it('supports key lengths of 128, 192, or 256 bits', async () => {
      let privateKey: Jwk;
      let privateKeyBytes: Uint8Array;

      // 128 bits
      privateKey = await AesCtr.generateKey({ length: 128 }) as JwkParamsOctPrivate;
      privateKeyBytes = Convert.base64Url(privateKey.k!).toUint8Array();
      expect(privateKeyBytes.byteLength).to.equal(16);

      // 192 bits
      privateKey = await AesCtr.generateKey({ length: 192 }) as JwkParamsOctPrivate;
      privateKeyBytes = Convert.base64Url(privateKey.k!).toUint8Array();
      expect(privateKeyBytes.byteLength).to.equal(24);

      // 256 bits
      privateKey = await AesCtr.generateKey({ length: 256 }) as JwkParamsOctPrivate;
      privateKeyBytes = Convert.base64Url(privateKey.k!).toUint8Array();
      expect(privateKeyBytes.byteLength).to.equal(32);
    });

    it('throws an error if the key length is invalid', async () => {
      for (const length of [32, 64, 100, 512]) {
        try {
          // Test the method.
          // @ts-expect-error because invalid tag lengths are being tested
          await AesCtr.generateKey({ length });
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
      const privateKey = await AesCtr.generateKey({ length: 128 });
      const privateKeyBytes = await AesCtr.privateKeyToBytes({ privateKey });

      expect(privateKeyBytes).to.be.an.instanceOf(Uint8Array);
    });

    it('returns the expected byte array for JWK input', async () => {
      const privateKey: Jwk = {
        k   : 'L71Sr1mAvThwzcPzY0mArp0VszRA9j95eZ64yiMpEX8',
        kty : 'oct',
        kid : '6oEQ2tFk2QI4_Lz8uxQpT4_Qce6f9ceS3ZD76nqd_qg'
      };
      const privateKeyBytes = await AesCtr.privateKeyToBytes({ privateKey });

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
        AesCtr.privateKeyToBytes({ privateKey: publicKey })
      ).to.eventually.be.rejectedWith(Error, 'provided key is not a valid oct private key');
    });
  });
});