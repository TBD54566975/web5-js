import chai, { expect } from 'chai';
import { Convert } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';

import { aesCtrTestVectors } from '../fixtures/test-vectors/aes.js';

import { AesCtr } from '../../src/crypto-primitives/aes-ctr.js';

chai.use(chaiAsPromised);

// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;

describe('AesCtr', () => {
  describe('decrypt', () => {
    for (const vector of aesCtrTestVectors) {
      it(`passes test vector ${vector.id}`, async () => {
        const plaintext = await AesCtr.decrypt({
          counter : Convert.hex(vector.counter).toUint8Array(),
          data    : Convert.hex(vector.ciphertext).toUint8Array(),
          key     : Convert.hex(vector.key).toUint8Array(),
          length  : vector.length
        });
        expect(Convert.uint8Array(plaintext).toHex()).to.deep.equal(vector.data);
      });
    }

    it('accepts ciphertext input as Uint8Array', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const secretKey = await AesCtr.generateKey({ length: 256 });
      let ciphertext: Uint8Array;

      // TypedArray - Uint8Array
      ciphertext = await AesCtr.decrypt({ counter: new Uint8Array(16), data, key: secretKey, length: 128 });
      expect(ciphertext).to.be.instanceOf(Uint8Array);
    });
  });

  describe('encrypt', () => {
    for (const vector of aesCtrTestVectors) {
      it(`passes test vector ${vector.id}`, async () => {
        const ciphertext = await AesCtr.encrypt({
          counter : Convert.hex(vector.counter).toUint8Array(),
          data    : Convert.hex(vector.data).toUint8Array(),
          key     : Convert.hex(vector.key).toUint8Array(),
          length  : vector.length
        });
        expect(Convert.uint8Array(ciphertext).toHex()).to.deep.equal(vector.ciphertext);
      });
    }

    it('accepts plaintext input as Uint8Array', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const secretKey = await AesCtr.generateKey({ length: 256 });
      let ciphertext: Uint8Array;

      // Uint8Array
      ciphertext = await AesCtr.encrypt({ counter: new Uint8Array(16), data, key: secretKey, length: 128 });
      expect(ciphertext).to.be.instanceOf(Uint8Array);
    });
  });

  describe('generateKey()', () => {
    it('returns a secret key of type Uint8Array', async () => {
      const secretKey = await AesCtr.generateKey({ length: 256 });
      expect(secretKey).to.be.instanceOf(Uint8Array);
    });

    it('returns a secret key of the specified length', async () => {
      let secretKey: Uint8Array;

      // 128 bits
      secretKey= await AesCtr.generateKey({ length: 128 });
      expect(secretKey.byteLength).to.equal(16);

      // 192 bits
      secretKey= await AesCtr.generateKey({ length: 192 });
      expect(secretKey.byteLength).to.equal(24);

      // 256 bits
      secretKey= await AesCtr.generateKey({ length: 256 });
      expect(secretKey.byteLength).to.equal(32);
    });
  });
});