import chai, { expect } from 'chai';
import { Convert } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';

import { XChaCha20 } from '../../src/crypto-primitives/xchacha20.js';

chai.use(chaiAsPromised);

// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;

describe('XChaCha20', () => {
  describe('decrypt()', () => {
    it('returns Uint8Array plaintext with length matching input', async () => {
      const plaintext = await XChaCha20.decrypt({
        data  : new Uint8Array(10),
        key   : new Uint8Array(32),
        nonce : new Uint8Array(24)
      });
      expect(plaintext).to.be.an('Uint8Array');
      expect(plaintext.byteLength).to.equal(10);
    });

    it('passes test vectors', async () => {
      const input = {
        data  : Convert.hex('879b10a139674fe65087f59577ee2c1ab54655d900697fd02d953f53ddcc1ae476e8').toUint8Array(),
        key   : Convert.hex('79c99798ac67300bbb2704c95c341e3245f3dcb21761b98e52ff45b24f304fc4').toUint8Array(),
        nonce : Convert.hex('b33ffd3096479bcfbc9aee49417688a0a2554f8d95389419').toUint8Array()
      };
      const output = Convert.string(`Are You There Bob? It's Me, Alice.`).toUint8Array();

      const ciphertext = await XChaCha20.decrypt({
        data  : input.data,
        key   : input.key,
        nonce : input.nonce
      });

      expect(ciphertext).to.deep.equal(output);
    });
  });

  describe('encrypt()', () => {
    it('returns Uint8Array ciphertext with length matching input', async () => {
      const ciphertext = await XChaCha20.encrypt({
        data  : new Uint8Array(10),
        key   : new Uint8Array(32),
        nonce : new Uint8Array(24)
      });
      expect(ciphertext).to.be.an('Uint8Array');
      expect(ciphertext.byteLength).to.equal(10);
    });

    it('passes test vectors', async () => {
      const input = {
        data  : Convert.string(`Are You There Bob? It's Me, Alice.`).toUint8Array(),
        key   : Convert.hex('79c99798ac67300bbb2704c95c341e3245f3dcb21761b98e52ff45b24f304fc4').toUint8Array(),
        nonce : Convert.hex('b33ffd3096479bcfbc9aee49417688a0a2554f8d95389419').toUint8Array()
      };
      const output = Convert.hex('879b10a139674fe65087f59577ee2c1ab54655d900697fd02d953f53ddcc1ae476e8').toUint8Array();

      const ciphertext = await XChaCha20.encrypt({
        data  : input.data,
        key   : input.key,
        nonce : input.nonce
      });

      expect(ciphertext).to.deep.equal(output);
    });
  });

  describe('generateKey()', () => {
    it('returns a 32-byte secret key of type Uint8Array', async () => {
      const secretKey = await XChaCha20.generateKey();
      expect(secretKey).to.be.instanceOf(Uint8Array);
      expect(secretKey.byteLength).to.equal(32);
    });
  });
});