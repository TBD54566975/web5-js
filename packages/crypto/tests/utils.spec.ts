import { expect } from 'chai';
import * as sinon from 'sinon';

import type { Jwk } from '../src/jose/jwk.js';

import { CryptoUtils } from '../src/utils.js';

// TODO: Remove this polyfill once Node.js v18 is no longer supported by @web5/crypto.
if (!globalThis.crypto) {
  // Node.js v18 and earlier requires a polyfill for `webcrypto` because the Web Crypto API was
  // still marked as experimental and not available globally. In contrast, Node.js versions 19 and
  // 20 removed the experimental flag and `webcrypto` is globally available.
  // As a consequence `webcrypto` must be imported from the Node.js `crypto` until Node.js 18
  // reaches "End-of-life" status on 2025-04-30.
  (async () => {
    const { webcrypto } = await import('node:crypto');
    // @ts-ignore
    globalThis.crypto = webcrypto;
  })();
}

describe('Crypto Utils', () => {
  describe('getJoseSignatureAlgorithmFromPublicKey()', () => {
    it('returns the algorithm specified by the alg property regardless of the crv property', () => {
      const publicKey: Jwk = { kty: 'OKP', alg: 'EdDSA', crv: 'P-256' };
      expect(CryptoUtils.getJoseSignatureAlgorithmFromPublicKey(publicKey)).to.equal('EdDSA');
    });

    it('returns the correct algorithm for Ed25519 curve', () => {
      const publicKey: Jwk = { kty: 'OKP', crv: 'Ed25519' };
      expect(CryptoUtils.getJoseSignatureAlgorithmFromPublicKey(publicKey)).to.equal('EdDSA');
    });

    it('returns the correct algorithm for P-256 curve', () => {
      const publicKey: Jwk = { kty: 'EC', crv: 'P-256' };
      expect(CryptoUtils.getJoseSignatureAlgorithmFromPublicKey(publicKey)).to.equal('ES256');
    });

    it('returns the correct algorithm for P-384 curve', () => {
      const publicKey: Jwk = { kty: 'EC', crv: 'P-384' };
      expect(CryptoUtils.getJoseSignatureAlgorithmFromPublicKey(publicKey)).to.equal('ES384');
    });

    it('returns the correct algorithm for P-521 curve', () => {
      const publicKey: Jwk = { kty: 'EC', crv: 'P-521' };
      expect(CryptoUtils.getJoseSignatureAlgorithmFromPublicKey(publicKey)).to.equal('ES512');
    });

    it('throws an error for unsupported algorithms', () => {
      const publicKey: Jwk = { kty: 'EC', alg: 'UnsupportedAlgorithm' };
      expect(() => CryptoUtils.getJoseSignatureAlgorithmFromPublicKey(publicKey)).to.throw();
    });

    it('throws an error for unsupported curves', () => {
      const publicKey: Jwk = { kty: 'EC', crv: 'UnsupportedCurve' };
      expect(() => CryptoUtils.getJoseSignatureAlgorithmFromPublicKey(publicKey)).to.throw();
    });

    it('throws an error when neither alg nor crv is provided', () => {
      const publicKey: Jwk = { kty: 'EC' };
      expect(() => CryptoUtils.getJoseSignatureAlgorithmFromPublicKey(publicKey)).to.throw();
    });
  });

  describe('randomBytes()', () => {
    it('returns a Uint8Array of the specified length', () => {
      const length = 16;
      const result = CryptoUtils.randomBytes(length);

      expect(result).to.be.instanceof(Uint8Array);
      expect(result).to.have.length(length);
    });

    it('handles invalid input gracefully', () => {
      expect(() => CryptoUtils.randomBytes(-1)).to.throw(RangeError, 'length'); // Length cannot be negative.

      // NOTE: only checking for Error being thrown because there is no meaningful message overlap between all browsers:
      // Webkit:  The quota has been exceeded.
      // Firefox: Crypto.getRandomValues: getRandomValues can only generate maximum 65536 bytes
      // Chromium: The ArrayBufferView's byte length (1000000000) exceeds the number of bytes of entropy available via this API (65536).
      expect(() => CryptoUtils.randomBytes(1e9)).to.throw(Error); // Extremely large number that exceeds the available entropy.
    });

    it('produces unique values on each call', () => {
      const set = new Set();
      for (let i = 0; i < 100; i++) {
        set.add(CryptoUtils.randomBytes(10).toString());
      }
      expect(set.size).to.equal(100);
    });
  });

  describe('randomUuid()', () => {
    it('generates a valid v4 UUID', () => {
      const id = CryptoUtils.randomUuid();
      expect(id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(id).to.have.length(36);
    });

    it('produces unique values on each call', () => {
      const set = new Set();
      for (let i = 0; i < 100; i++) {
        set.add(CryptoUtils.randomUuid());
      }
      expect(set.size).to.equal(100);
    });
  });

  describe('randomPin', () => {
    it('generates a 3-digit PIN', () => {
      const pin = CryptoUtils.randomPin({ length: 3 });
      expect(pin).to.match(/^\d{3}$/);
    });

    it('generates a 4-digit PIN', () => {
      const pin = CryptoUtils.randomPin({ length: 4 });
      expect(pin).to.match(/^\d{4}$/);
    });

    it('generates a 5-digit PIN', () => {
      const pin = CryptoUtils.randomPin({ length: 5 });
      expect(pin).to.match(/^\d{5}$/);
    });

    it('generates a 6-digit PIN', () => {
      const pin = CryptoUtils.randomPin({ length: 6 });
      expect(pin).to.match(/^\d{6}$/);
    });

    it('generates a 7-digit PIN', () => {
      const pin = CryptoUtils.randomPin({ length: 7 });
      expect(pin).to.match(/^\d{7}$/);
    });

    it('generates an 8-digit PIN', () => {
      const pin = CryptoUtils.randomPin({ length: 8 });
      expect(pin).to.match(/^\d{8}$/);
    });

    it('generates an 9-digit PIN', () => {
      const pin = CryptoUtils.randomPin({ length: 9 });
      expect(pin).to.match(/^\d{9}$/);
    });

    it('generates an 10-digit PIN', () => {
      const pin = CryptoUtils.randomPin({ length: 10 });
      expect(pin).to.match(/^\d{10}$/);
    });

    it('throws an error for a PIN length less than 3', () => {
      expect(
        () => CryptoUtils.randomPin({ length: 2 })
      ).to.throw(Error, 'randomPin() can securely generate a PIN between 3 to 10 digits.');
    });

    it('throws an error for a PIN length greater than 10', () => {
      expect(
        () => CryptoUtils.randomPin({ length: 11 })
      ).to.throw(Error, 'randomPin() can securely generate a PIN between 3 to 10 digits.');
    });
  });
});