import sinon from 'sinon';
import chai, { expect } from 'chai';
import { Convert } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';

import { Pbkdf2 } from '../../src/crypto-primitives/pbkdf2.js';

chai.use(chaiAsPromised);

// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;

describe('Pbkdf2', () => {
  const password = Convert.string('password').toUint8Array();
  const salt = Convert.string('salt').toUint8Array();
  const iterations = 1;
  const length = 256; // 32 bytes

  describe('deriveKey', () => {
    it('successfully derives a key using WebCrypto, if available', async () => {
      const subtleDeriveBitsSpy = sinon.spy(crypto.subtle, 'deriveBits');

      const derivedKey = await Pbkdf2.deriveKey({ hash: 'SHA-256', password, salt, iterations, length });

      expect(derivedKey).to.be.instanceOf(Uint8Array);
      expect(derivedKey.byteLength).to.equal(length / 8);
      expect(subtleDeriveBitsSpy.called).to.be.true;

      subtleDeriveBitsSpy.restore();
    });

    it('successfully derives a key using node:crypto when WebCrypto is not supported', async function () {
      // Skip test in web browsers since node:crypto is not available.
      if (typeof window !== 'undefined') this.skip();

      // Ensure that WebCrypto is not available for this test.
      sinon.stub(crypto, 'subtle').value(null);

      // @ts-expect-error because we're spying on a private method.
      const nodeCryptoDeriveKeySpy = sinon.spy(Pbkdf2, 'deriveKeyWithNodeCrypto');

      const derivedKey = await Pbkdf2.deriveKey({ hash: 'SHA-256', password, salt, iterations, length });

      expect(derivedKey).to.be.instanceOf(Uint8Array);
      expect(derivedKey.byteLength).to.equal(length / 8);
      expect(nodeCryptoDeriveKeySpy.called).to.be.true;

      nodeCryptoDeriveKeySpy.restore();
      sinon.restore();
    });

    it('derives the same value with node:crypto and WebCrypto', async function () {
      // Skip test in web browsers since node:crypto is not available.
      if (typeof window !== 'undefined') this.skip();

      const options = { hash: 'SHA-256', password, salt, iterations, length };

      // @ts-expect-error because we're testing a private method.
      const webCryptoDerivedKey = await Pbkdf2.deriveKeyWithNodeCrypto(options);
      // @ts-expect-error because we're testing a private method.
      const nodeCryptoDerivedKey = await Pbkdf2.deriveKeyWithWebCrypto(options);

      expect(webCryptoDerivedKey).to.deep.equal(nodeCryptoDerivedKey);
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

    it('throws an error when an invalid hash function is used with WebCrypto', async () => {
      const options = {
        hash: 'SHA-2' as const, password, salt, iterations, length
      };

      // @ts-expect-error for testing purposes
      await expect(Pbkdf2.deriveKey(options)).to.eventually.be.rejectedWith(Error);
    });

    it('throws an error when an invalid hash function is used with node:crypto', async function () {
      // Skip test in web browsers since node:crypto is not available.
      if (typeof window !== 'undefined') this.skip();

      // Ensure that WebCrypto is not available for this test.
      sinon.stub(crypto, 'subtle').value(null);

      const options = {
        hash: 'SHA-2' as const, password, salt, iterations, length
      };

      // @ts-expect-error for testing purposes
      await expect(Pbkdf2.deriveKey(options)).to.eventually.be.rejectedWith(Error);

      sinon.restore();
    });

    it('throws an error when iterations count is not a positive number with WebCrypto', async () => {
      const options = {
        hash       : 'SHA-256' as const, password, salt,
        iterations : -1, length
      };

      // Every browser throws a different error message so a specific message cannot be checked.
      await expect(Pbkdf2.deriveKey(options)).to.eventually.be.rejectedWith(Error);
    });

    it('throws an error when iterations count is not a positive number with node:crypto', async function () {
      // Skip test in web browsers since node:crypto is not available.
      if (typeof window !== 'undefined') this.skip();

      // Ensure that WebCrypto is not available for this test.
      sinon.stub(crypto, 'subtle').value(null);

      const options = {
        hash       : 'SHA-256' as const, password, salt,
        iterations : -1, length
      };

      await expect(Pbkdf2.deriveKey(options)).to.eventually.be.rejectedWith(Error, 'out of range');

      sinon.restore();
    });
  });
});