import chai, { expect } from 'chai';
import { Convert } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';

import type { Jwk, JwkParamsOctPrivate } from '../../src/jose/jwk.js';

import { AesCtr } from '../../src/primitives/aes-ctr.js';
import { aesCtrTestVectors } from '../fixtures/test-vectors/aes.js';

chai.use(chaiAsPromised);

// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;

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
    for (const vector of aesCtrTestVectors) {
      it(`passes test vector ${vector.id}`, async () => {
        const plaintext = await AesCtr.decrypt({
          counter : Convert.hex(vector.counter).toUint8Array(),
          data    : Convert.hex(vector.ciphertext).toUint8Array(),
          key     : await AesCtr.bytesToPrivateKey({ privateKeyBytes: Convert.hex(vector.key).toUint8Array() }),
          length  : vector.length
        });
        expect(Convert.uint8Array(plaintext).toHex()).to.deep.equal(vector.data);
      });
    }

    it('accepts ciphertext input as Uint8Array', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const privateKey = await AesCtr.generateKey({ length: 256 });

      const ciphertext = await AesCtr.decrypt({ counter: new Uint8Array(16), data, key: privateKey, length: 128 });
      expect(ciphertext).to.be.instanceOf(Uint8Array);
    });
  });

  describe('encrypt', () => {
    for (const vector of aesCtrTestVectors) {
      it(`passes test vector ${vector.id}`, async () => {
        const ciphertext = await AesCtr.encrypt({
          counter : Convert.hex(vector.counter).toUint8Array(),
          data    : Convert.hex(vector.data).toUint8Array(),
          key     : await AesCtr.bytesToPrivateKey({ privateKeyBytes: Convert.hex(vector.key).toUint8Array() }),
          length  : vector.length
        });
        expect(Convert.uint8Array(ciphertext).toHex()).to.deep.equal(vector.ciphertext);
      });
    }

    it('accepts plaintext input as Uint8Array', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const privateKey = await AesCtr.generateKey({ length: 256 });
      let ciphertext: Uint8Array;

      // Uint8Array
      ciphertext = await AesCtr.encrypt({ counter: new Uint8Array(16), data, key: privateKey, length: 128 });
      expect(ciphertext).to.be.instanceOf(Uint8Array);
    });
  });

  describe('generateKey()', () => {
    it('returns a private key in JWK format', async () => {
      const privateKey = await AesCtr.generateKey({ length: 256 });

      expect(privateKey).to.have.property('k');
      expect(privateKey).to.have.property('kid');
      expect(privateKey).to.have.property('kty', 'oct');
    });

    it('returns a private key of the specified length', async () => {
      let privateKey: Jwk;
      let privateKeyBytes: Uint8Array;

      // 128 bits
      privateKey = await AesCtr.generateKey({ length: 128 }) as JwkParamsOctPrivate;
      privateKeyBytes = Convert.base64Url(privateKey.k).toUint8Array();
      expect(privateKeyBytes.byteLength).to.equal(16);

      // 192 bits
      privateKey = await AesCtr.generateKey({ length: 192 }) as JwkParamsOctPrivate;
      privateKeyBytes = Convert.base64Url(privateKey.k).toUint8Array();
      expect(privateKeyBytes.byteLength).to.equal(24);

      // 256 bits
      privateKey = await AesCtr.generateKey({ length: 256 }) as JwkParamsOctPrivate;
      privateKeyBytes = Convert.base64Url(privateKey.k).toUint8Array();
      expect(privateKeyBytes.byteLength).to.equal(32);
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