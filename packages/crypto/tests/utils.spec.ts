import { expect } from 'chai';
import * as sinon from 'sinon';

import type { Jwk } from '../src/jose/jwk.js';

import {
  randomUuid,
  randomBytes,
  checkValidProperty,
  isWebCryptoSupported,
  checkRequiredProperty,
  getJoseSignatureAlgorithmFromPublicKey,
} from '../src/utils.js';

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
  describe('checkValidProperty()', () => {
    it('should not throw for a property in the allowed list', () => {
      expect(() => checkValidProperty({ property: 'foo', allowedProperties: ['foo', 'bar']})).to.not.throw();
      expect(() => checkValidProperty({ property: 'foo', allowedProperties: new Set(['foo', 'bar'])})).to.not.throw();
      expect(() => checkValidProperty({ property: 'foo', allowedProperties: new Map([['foo', 1], ['bar', 2]])})).to.not.throw();
    });

    it('throws an error if required parameters are missing', () => {
      expect(() => checkValidProperty({ property: 'foo' } as any)).to.throw(TypeError, 'required parameters missing');
      expect(() => checkValidProperty({ allowedProperties: ['foo', 'bar'] } as any)).to.throw(TypeError, 'required parameters missing');
      // @ts-expect-error because both arguments are intentionally omitted.
      expect(() => checkValidProperty()).to.throw(TypeError, 'required parameters missing');
    });

    it('throws an error if the property does not exist', () => {
      expect(() => checkValidProperty({ property: 'baz', allowedProperties: ['foo', 'bar']})).to.throw(TypeError, 'Out of range');
      expect(() => checkValidProperty({ property: 'baz', allowedProperties: new Set(['foo', 'bar'])})).to.throw(TypeError, 'Out of range');
      expect(() => checkValidProperty({ property: 'baz', allowedProperties: new Map([['foo', 1], ['bar', 2]])})).to.throw(TypeError, 'Out of range');
    });

  });

  describe('checkRequiredProperty', () => {
    it('throws an error if required parameters are missing', () => {
    // @ts-expect-error because second argument is intentionally omitted.
      expect(() => checkRequiredProperty({ property: 'foo' })).to.throw('required parameters missing');
      // @ts-expect-error because both arguments are intentionally omitted.
      expect(() => checkRequiredProperty()).to.throw('required parameters missing');
    });

    it('throws an error if the property is missing', () => {
      const propertiesCollection = { foo: 'bar', baz: 'qux' };
      expect(() => checkRequiredProperty({ property: 'quux', inObject: propertiesCollection })).to.throw('Required parameter missing');
    });

    it('does not throw an error if the property is present', () => {
      const propertiesCollection = { foo: 'bar', baz: 'qux' };
      expect(() => checkRequiredProperty({ property: 'foo', inObject: propertiesCollection })).to.not.throw();
    });
  });

  describe('getJoseSignatureAlgorithmFromPublicKey()', () => {
    it('returns the algorithm specified by the alg property regardless of the crv property', () => {
      const publicKey: Jwk = { kty: 'OKP', alg: 'EdDSA', crv: 'P-256' };
      expect(getJoseSignatureAlgorithmFromPublicKey(publicKey)).to.equal('EdDSA');
    });

    it('returns the correct algorithm for Ed25519 curve', () => {
      const publicKey: Jwk = { kty: 'OKP', crv: 'Ed25519' };
      expect(getJoseSignatureAlgorithmFromPublicKey(publicKey)).to.equal('EdDSA');
    });

    it('returns the correct algorithm for P-256 curve', () => {
      const publicKey: Jwk = { kty: 'EC', crv: 'P-256' };
      expect(getJoseSignatureAlgorithmFromPublicKey(publicKey)).to.equal('ES256');
    });

    it('returns the correct algorithm for P-384 curve', () => {
      const publicKey: Jwk = { kty: 'EC', crv: 'P-384' };
      expect(getJoseSignatureAlgorithmFromPublicKey(publicKey)).to.equal('ES384');
    });

    it('returns the correct algorithm for P-521 curve', () => {
      const publicKey: Jwk = { kty: 'EC', crv: 'P-521' };
      expect(getJoseSignatureAlgorithmFromPublicKey(publicKey)).to.equal('ES512');
    });

    it('throws an error for unsupported algorithms', () => {
      const publicKey: Jwk = { kty: 'EC', alg: 'UnsupportedAlgorithm' };
      expect(() => getJoseSignatureAlgorithmFromPublicKey(publicKey)).to.throw();
    });

    it('throws an error for unsupported curves', () => {
      const publicKey: Jwk = { kty: 'EC', crv: 'UnsupportedCurve' };
      expect(() => getJoseSignatureAlgorithmFromPublicKey(publicKey)).to.throw();
    });

    it('throws an error when neither alg nor crv is provided', () => {
      const publicKey: Jwk = { kty: 'EC' };
      expect(() => getJoseSignatureAlgorithmFromPublicKey(publicKey)).to.throw();
    });
  });

  describe('isWebCryptoSupported()', () => {
    afterEach(() => {
      // Restore the original state after each test
      sinon.restore();
    });

    it('returns true if the Web Crypto API is supported', () => {
      expect(isWebCryptoSupported()).to.be.true;
    });

    it('returns false if Web Crypto API is not supported', function () {
      // Mock an unsupported environment
      sinon.stub(globalThis, 'crypto').value({});

      expect(isWebCryptoSupported()).to.be.false;
    });
  });

  describe('randomBytes()', () => {
    it('returns a Uint8Array of the specified length', () => {
      const length = 16;
      const result = randomBytes(length);

      expect(result).to.be.instanceof(Uint8Array);
      expect(result).to.have.length(length);
    });

    it('handles invalid input gracefully', () => {
      expect(() => randomBytes(-1)).to.throw(RangeError, 'length'); // Length cannot be negative.
      expect(() => randomBytes(1e9)).to.throw(Error, 'exceed'); // Extremely large number that exceeds the available entropy.
    });

    it('produces unique values on each call', () => {
      const set = new Set();
      for (let i = 0; i < 100; i++) {
        set.add(randomBytes(10).toString());
      }
      expect(set.size).to.equal(100);
    });
  });

  describe('randomUuid()', () => {
    it('generates a valid v4 UUID', () => {
      const id = randomUuid();
      expect(id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(id).to.have.length(36);
    });

    it('produces unique values on each call', () => {
      const set = new Set();
      for (let i = 0; i < 100; i++) {
        set.add(randomUuid());
      }
      expect(set.size).to.equal(100);
    });
  });
});