import chai, { expect } from 'chai';
import { Convert } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';

import { aesGcmTestVectors } from '../fixtures/test-vectors/aes.js';

import { AesGcm } from '../../src/crypto-primitives/aes-gcm.js';

chai.use(chaiAsPromised);

// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;

describe('AesGcm', () => {
  describe('decrypt', () => {
    for (const vector of aesGcmTestVectors) {
      it(`passes test vector ${vector.id}`, async () => {
        const plaintext = await AesGcm.decrypt({
          additionalData : Convert.hex(vector.aad).toUint8Array(),
          iv             : Convert.hex(vector.iv).toUint8Array(),
          data           : Convert.hex(vector.ciphertext + vector.tag).toUint8Array(),
          key            : Convert.hex(vector.key).toUint8Array(),
          tagLength      : vector.tagLength
        });
        expect(Convert.uint8Array(plaintext).toHex()).to.deep.equal(vector.data);
      });
    }

    it('accepts ciphertext input as Uint8Array', async () => {
      const secretKey = new Uint8Array([222, 78, 162, 222, 38, 146, 151, 191, 191, 75, 227, 71, 220, 221, 70, 49]);
      let plaintext: Uint8Array;

      // TypedArray - Uint8Array
      const ciphertext = new Uint8Array([242, 126, 129, 170, 99, 195, 21, 165, 205, 3, 226, 171, 203, 198, 42, 86, 101]);
      plaintext = await AesGcm.decrypt({ data: ciphertext, iv: new Uint8Array(12), key: secretKey, tagLength: 128 });
      expect(plaintext).to.be.instanceOf(Uint8Array);
    });
  });

  describe('encrypt', () => {
    for (const vector of aesGcmTestVectors) {
      it(`passes test vector ${vector.id}`, async () => {
        const ciphertext = await AesGcm.encrypt({
          additionalData : Convert.hex(vector.aad).toUint8Array(),
          iv             : Convert.hex(vector.iv).toUint8Array(),
          data           : Convert.hex(vector.data).toUint8Array(),
          key            : Convert.hex(vector.key).toUint8Array(),
          tagLength      : vector.tagLength
        });
        expect(Convert.uint8Array(ciphertext).toHex()).to.deep.equal(vector.ciphertext + vector.tag);
      });
    }

    it('accepts plaintext input as Uint8Array', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const secretKey = await AesGcm.generateKey({ length: 256 });
      let ciphertext: Uint8Array;

      // TypedArray - Uint8Array
      ciphertext = await AesGcm.encrypt({ data, iv: new Uint8Array(12), key: secretKey, tagLength: 128 });
      expect(ciphertext).to.be.instanceOf(Uint8Array);
    });
  });

  describe('generateKey()', () => {
    it('returns a secret key of type Uint8Array', async () => {
      const secretKey = await AesGcm.generateKey({ length: 256 });
      expect(secretKey).to.be.instanceOf(Uint8Array);
    });

    it('returns a secret key of the specified length', async () => {
      let secretKey: Uint8Array;

      // 128 bits
      secretKey= await AesGcm.generateKey({ length: 128 });
      expect(secretKey.byteLength).to.equal(16);

      // 192 bits
      secretKey= await AesGcm.generateKey({ length: 192 });
      expect(secretKey.byteLength).to.equal(24);

      // 256 bits
      secretKey= await AesGcm.generateKey({ length: 256 });
      expect(secretKey.byteLength).to.equal(32);
    });
  });
});