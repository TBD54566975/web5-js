import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import type { Jwk } from '../../src/jose/jwk.js';

import {
  isPublicJwk,
  isPrivateJwk,
  isEcPublicJwk,
  isEcPrivateJwk,
  isOkpPublicJwk,
  isOctPrivateJwk,
  isOkpPrivateJwk,
  computeJwkThumbprint,
} from '../../src/jose/jwk.js';
import { jwkToThumbprintTestVectors } from '../fixtures/test-vectors/jwk.js';

chai.use(chaiAsPromised);

describe('JWK', () => {
  describe('computeJwkThumbprint()', () => {
    it('passes all test vectors', async () => {
      let jwkThumbprint: string;

      for (const vector of jwkToThumbprintTestVectors) {
        jwkThumbprint = await computeJwkThumbprint({ jwk: vector.input as Jwk });
        expect(jwkThumbprint).to.equal(vector.output);
      }
    });

    it('throws an error if unsupported key type has been passed', async () => {
      await expect(
        // @ts-expect-error because an invalid key type is being intentionally passed.
        computeJwkThumbprint({ jwk: { crv: 'X25519', kty: 'unsupported' }})
      ).to.eventually.be.rejectedWith(Error, `Unsupported key type: unsupported`);
    });
  });

  describe('isEcPrivateJwk()', () => {
    it('returns true for a valid EC private key JWK', () => {
      const validEcJwk = {
        kty : 'EC',
        crv : 'P-256',
        x   : 'base64url-encoded-x-value',
        d   : 'base64url-encoded-private-key'
      };
      expect(isEcPrivateJwk(validEcJwk)).to.be.true;
    });

    it('returns false for non-object inputs', () => {
      expect(isEcPrivateJwk(null)).to.be.false;
      expect(isEcPrivateJwk(undefined)).to.be.false;
      expect(isEcPrivateJwk(123)).to.be.false;
      expect(isEcPrivateJwk('string')).to.be.false;
      expect(isEcPrivateJwk([])).to.be.false;
    });

    it('returns false if any required property is missing', () => {
      const missingKty = { crv: 'P-256', x: 'base64url-encoded-x-value', d: 'base64url-encoded-private-key' };
      const missingCrv = { kty: 'EC', x: 'base64url-encoded-x-value', d: 'base64url-encoded-private-key' };
      const missingX = { kty: 'EC', crv: 'P-256', d: 'base64url-encoded-private-key' };
      const missingD = { kty: 'EC', crv: 'P-256', x: 'base64url-encoded-x-value' };

      expect(isEcPrivateJwk(missingKty)).to.be.false;
      expect(isEcPrivateJwk(missingCrv)).to.be.false;
      expect(isEcPrivateJwk(missingX)).to.be.false;
      expect(isEcPrivateJwk(missingD)).to.be.false;
    });

    it('returns false if kty is not EC', () => {
      const invalidKty = { kty: 'RSA', crv: 'P-256', x: 'base64url-encoded-x-value', d: 'base64url-encoded-private-key' };
      expect(isEcPrivateJwk(invalidKty)).to.be.false;
    });

    it('returns false if any property is of incorrect type', () => {
      const invalidDType = { kty: 'EC', crv: 'P-256', x: 'base64url-encoded-x-value', d: 123 };
      const invalidXType = { kty: 'EC', crv: 'P-256', x: 123, d: 'base64url-encoded-private-key' };

      expect(isEcPrivateJwk(invalidDType)).to.be.false;
      expect(isEcPrivateJwk(invalidXType)).to.be.false;
    });

    it('returns true for valid EC JWK with extra properties', () => {
      const validEcJwkExtra = {
        kty   : 'EC',
        crv   : 'P-256',
        x     : 'base64url-encoded-x-value',
        d     : 'base64url-encoded-private-key',
        extra : 'extra-value'
      };
      expect(isEcPrivateJwk(validEcJwkExtra)).to.be.true;
    });
  });

  describe('isEcPublicJwk()', () => {
    it('returns true for a valid EC public key JWK', () => {
      const validEcJwk = {
        kty : 'EC',
        crv : 'P-256',
        x   : 'base64url-encoded-x-value'
      };
      expect(isEcPublicJwk(validEcJwk)).to.be.true;
    });

    it('returns false for non-object inputs', () => {
      expect(isEcPublicJwk(null)).to.be.false;
      expect(isEcPublicJwk(undefined)).to.be.false;
      expect(isEcPublicJwk(123)).to.be.false;
      expect(isEcPublicJwk('string')).to.be.false;
      expect(isEcPublicJwk([])).to.be.false;
    });

    it('returns false if any required property is missing', () => {
      const missingKty = { crv: 'P-256', x: 'base64url-encoded-x-value' };
      const missingCrv = { kty: 'EC', x: 'base64url-encoded-x-value' };
      const missingX = { kty: 'EC', crv: 'P-256' };

      expect(isEcPublicJwk(missingKty)).to.be.false;
      expect(isEcPublicJwk(missingCrv)).to.be.false;
      expect(isEcPublicJwk(missingX)).to.be.false;
    });

    it('returns false if kty is not EC', () => {
      const invalidKty = { kty: 'RSA', crv: 'P-256', x: 'base64url-encoded-x-value' };
      expect(isEcPublicJwk(invalidKty)).to.be.false;
    });

    it('returns false if any property is of incorrect type', () => {
      const invalidXType = { kty: 'EC', crv: 'P-256', x: 123 };

      expect(isEcPublicJwk(invalidXType)).to.be.false;
    });

    it('returns false if the private key parameter \'d\' is present', () => {
      const withDParam = { kty: 'EC', crv: 'P-256', x: 'base64url-encoded-x-value', d: 'base64url-encoded-d-value' };
      expect(isEcPublicJwk(withDParam)).to.be.false;
    });

    it('returns true for valid EC public JWK with extra properties', () => {
      const validEcJwkExtra = {
        kty   : 'EC',
        crv   : 'P-256',
        x     : 'base64url-encoded-x-value',
        extra : 'extra-value'
      };
      expect(isEcPublicJwk(validEcJwkExtra)).to.be.true;
    });
  });

  describe('isOctPrivateJwk()', () => {
    it('returns true for a valid OCT private key JWK', () => {
      const validOctJwk = {
        kty : 'oct',
        k   : 'base64url-encoded-key'
      };
      expect(isOctPrivateJwk(validOctJwk)).to.be.true;
    });

    it('returns false for non-object inputs', () => {
      expect(isOctPrivateJwk(null)).to.be.false;
      expect(isOctPrivateJwk(undefined)).to.be.false;
      expect(isOctPrivateJwk(123)).to.be.false;
      expect(isOctPrivateJwk('string')).to.be.false;
      expect(isOctPrivateJwk([])).to.be.false;
    });

    it('returns false if any required property is missing', () => {
      const missingKty = { k: 'base64url-encoded-key' };
      const missingK = { kty: 'oct' };

      expect(isOctPrivateJwk(missingKty)).to.be.false;
      expect(isOctPrivateJwk(missingK)).to.be.false;
    });

    it('returns false if kty is not oct', () => {
      const invalidKty = { kty: 'RSA', k: 'base64url-encoded-key' };
      expect(isOctPrivateJwk(invalidKty)).to.be.false;
    });

    it('returns false if any property is of incorrect type', () => {
      const invalidKType = { kty: 'oct', k: 123 };

      expect(isOctPrivateJwk(invalidKType)).to.be.false;
    });

    it('returns true for valid OCT private JWK with extra properties', () => {
      const validOctJwkExtra = {
        kty   : 'oct',
        k     : 'base64url-encoded-key',
        extra : 'extra-value'
      };
      expect(isOctPrivateJwk(validOctJwkExtra)).to.be.true;
    });
  });

  describe('isOkpPrivateJwk()', () => {
    it('returns true for a valid OKP private key JWK', () => {
      const validOkpJwk = {
        kty : 'OKP',
        crv : 'Ed25519',
        x   : 'base64url-encoded-x-value',
        d   : 'base64url-encoded-private-key'
      };
      expect(isOkpPrivateJwk(validOkpJwk)).to.be.true;
    });

    it('returns false for non-object inputs', () => {
      expect(isOkpPrivateJwk(null)).to.be.false;
      expect(isOkpPrivateJwk(undefined)).to.be.false;
      expect(isOkpPrivateJwk(123)).to.be.false;
      expect(isOkpPrivateJwk('string')).to.be.false;
      expect(isOkpPrivateJwk([])).to.be.false;
    });

    it('returns false if any required property is missing', () => {
      const missingKty = { crv: 'Ed25519', x: 'base64url-encoded-x-value', d: 'base64url-encoded-private-key' };
      const missingCrv = { kty: 'OKP', x: 'base64url-encoded-x-value', d: 'base64url-encoded-private-key' };
      const missingX = { kty: 'OKP', crv: 'Ed25519', d: 'base64url-encoded-private-key' };
      const missingD = { kty: 'OKP', crv: 'Ed25519', x: 'base64url-encoded-x-value' };

      expect(isOkpPrivateJwk(missingKty)).to.be.false;
      expect(isOkpPrivateJwk(missingCrv)).to.be.false;
      expect(isOkpPrivateJwk(missingX)).to.be.false;
      expect(isOkpPrivateJwk(missingD)).to.be.false;
    });

    it('returns false if kty is not OKP', () => {
      const invalidKty = { kty: 'EC', crv: 'Ed25519', x: 'base64url-encoded-x-value', d: 'base64url-encoded-private-key' };
      expect(isOkpPrivateJwk(invalidKty)).to.be.false;
    });

    it('returns false if any property is of incorrect type', () => {
      const invalidDType = { kty: 'OKP', crv: 'Ed25519', x: 'base64url-encoded-x-value', d: 123 };
      const invalidXType = { kty: 'OKP', crv: 'Ed25519', x: 123, d: 'base64url-encoded-private-key' };

      expect(isOkpPrivateJwk(invalidDType)).to.be.false;
      expect(isOkpPrivateJwk(invalidXType)).to.be.false;
    });

    it('returns true for valid OKP private JWK with extra properties', () => {
      const validOkpJwkExtra = {
        kty   : 'OKP',
        crv   : 'Ed25519',
        x     : 'base64url-encoded-x-value',
        d     : 'base64url-encoded-private-key',
        extra : 'extra-value'
      };
      expect(isOkpPrivateJwk(validOkpJwkExtra)).to.be.true;
    });
  });

  describe('isOkpPublicJwk()', () => {
    it('returns true for a valid OKP public key JWK', () => {
      const validOkpJwk = {
        kty : 'OKP',
        crv : 'Ed25519',
        x   : 'base64url-encoded-x-value'
      };
      expect(isOkpPublicJwk(validOkpJwk)).to.be.true;
    });

    it('returns false for non-object inputs', () => {
      expect(isOkpPublicJwk(null)).to.be.false;
      expect(isOkpPublicJwk(undefined)).to.be.false;
      expect(isOkpPublicJwk(123)).to.be.false;
      expect(isOkpPublicJwk('string')).to.be.false;
      expect(isOkpPublicJwk([])).to.be.false;
    });

    it('returns false if any required property is missing', () => {
      const missingKty = { crv: 'Ed25519', x: 'base64url-encoded-x-value' };
      const missingCrv = { kty: 'OKP', x: 'base64url-encoded-x-value' };
      const missingX = { kty: 'OKP', crv: 'Ed25519' };

      expect(isOkpPublicJwk(missingKty)).to.be.false;
      expect(isOkpPublicJwk(missingCrv)).to.be.false;
      expect(isOkpPublicJwk(missingX)).to.be.false;
    });

    it('returns false if kty is not OKP', () => {
      const invalidKty = { kty: 'EC', crv: 'Ed25519', x: 'base64url-encoded-x-value' };
      expect(isOkpPublicJwk(invalidKty)).to.be.false;
    });

    it('returns false if any property is of incorrect type', () => {
      const invalidXType = { kty: 'OKP', crv: 'Ed25519', x: 123 };

      expect(isOkpPublicJwk(invalidXType)).to.be.false;
    });

    it(`returns false if the private key parameter 'd' is present`, () => {
      const withDParam = { kty: 'OKP', crv: 'Ed25519', x: 'base64url-encoded-x-value', d: 'base64url-encoded-d-value' };
      expect(isOkpPublicJwk(withDParam)).to.be.false;
    });

    it('returns true for valid OKP public JWK with extra properties', () => {
      const validOkpJwkExtra = {
        kty   : 'OKP',
        crv   : 'Ed25519',
        x     : 'base64url-encoded-x-value',
        extra : 'extra-value'
      };
      expect(isOkpPublicJwk(validOkpJwkExtra)).to.be.true;
    });
  });

  describe('isPrivateJwk()', () => {
    it('returns true for a valid EC private key JWK', () => {
      const validEcJwk = {
        kty : 'EC',
        crv : 'P-256',
        x   : 'base64url-encoded-x-value',
        d   : 'base64url-encoded-private-key'
      };
      expect(isPrivateJwk(validEcJwk)).to.be.true;
    });

    it('returns true for a valid OKP private key JWK', () => {
      const validOkpJwk = {
        kty : 'OKP',
        crv : 'Ed25519',
        x   : 'base64url-encoded-x-value',
        d   : 'base64url-encoded-private-key'
      };
      expect(isPrivateJwk(validOkpJwk)).to.be.true;
    });

    it('returns true for a valid OCT private key JWK', () => {
      const validOctJwk = {
        kty : 'oct',
        k   : 'base64url-encoded-key'
      };
      expect(isPrivateJwk(validOctJwk)).to.be.true;
    });

    it('returns true for a valid RSA private key JWK', () => {
      const validRsaJwk = {
        kty : 'RSA',
        n   : 'base64url-encoded-n-value',
        e   : 'base64url-encoded-e-value',
        d   : 'base64url-encoded-d-value'
      };
      expect(isPrivateJwk(validRsaJwk)).to.be.true;
    });

    it('returns false for an EC public key JWK', () => {
      const validEcJwk = {
        kty : 'EC',
        crv : 'P-256',
        x   : 'base64url-encoded-x-value'
      };
      expect(isPrivateJwk(validEcJwk)).to.be.false;
    });

    it('returns false for an OKP public key JWK', () => {
      const validOkpPublicJwk = {
        kty : 'OKP',
        crv : 'Ed25519',
        x   : 'base64url-encoded-x-value'
      };
      expect(isPrivateJwk(validOkpPublicJwk)).to.be.false;
    });

    it('returns false for a RSA public key JWK', () => {
      const validRsaPublicJwk = {
        kty : 'RSA',
        n   : 'base64url-encoded-n-value',
        e   : 'base64url-encoded-e-value'
      };
      expect(isPrivateJwk(validRsaPublicJwk)).to.be.false;
    });

    it('returns false for non-object inputs', () => {
      expect(isPrivateJwk(null)).to.be.false;
      expect(isPrivateJwk(undefined)).to.be.false;
      expect(isPrivateJwk(123)).to.be.false;
      expect(isPrivateJwk('string')).to.be.false;
      expect(isPrivateJwk([])).to.be.false;
    });
  });

  describe('isPublicJwk()', () => {
    it('returns true for a valid EC public key JWK', () => {
      const validEcJwk = {
        kty : 'EC',
        crv : 'P-256',
        x   : 'base64url-encoded-x-value'
      };
      expect(isPublicJwk(validEcJwk)).to.be.true;
    });

    it('returns true for a valid OKP public key JWK', () => {
      const validOkpPublicJwk = {
        kty : 'OKP',
        crv : 'Ed25519',
        x   : 'base64url-encoded-x-value'
      };
      expect(isPublicJwk(validOkpPublicJwk)).to.be.true;
    });

    it('returns true for a valid RSA public key JWK', () => {
      const validRsaPublicJwk = {
        kty : 'RSA',
        n   : 'base64url-encoded-n-value',
        e   : 'base64url-encoded-e-value'
      };
      expect(isPublicJwk(validRsaPublicJwk)).to.be.true;
    });

    it('returns false for an EC private key JWK', () => {
      const validEcJwk = {
        kty : 'EC',
        crv : 'P-256',
        x   : 'base64url-encoded-x-value',
        d   : 'base64url-encoded-private-key'
      };
      expect(isPublicJwk(validEcJwk)).to.be.false;
    });

    it('returns false for an OKP private key JWK', () => {
      const validOkpJwk = {
        kty : 'OKP',
        crv : 'Ed25519',
        x   : 'base64url-encoded-x-value',
        d   : 'base64url-encoded-private-key'
      };
      expect(isPublicJwk(validOkpJwk)).to.be.false;
    });

    it('returns false for an OCT private key JWK', () => {
      const validOctJwk = {
        kty : 'oct',
        k   : 'base64url-encoded-key'
      };
      expect(isPublicJwk(validOctJwk)).to.be.false;
    });

    it('returns false for a RSA private key JWK', () => {
      const validRsaJwk = {
        kty : 'RSA',
        n   : 'base64url-encoded-n-value',
        e   : 'base64url-encoded-e-value',
        d   : 'base64url-encoded-d-value'
      };
      expect(isPublicJwk(validRsaJwk)).to.be.false;
    });

    it('returns false for non-object inputs', () => {
      expect(isPublicJwk(null)).to.be.false;
      expect(isPublicJwk(undefined)).to.be.false;
      expect(isPublicJwk(123)).to.be.false;
      expect(isPublicJwk('string')).to.be.false;
      expect(isPublicJwk([])).to.be.false;
    });
  });
});