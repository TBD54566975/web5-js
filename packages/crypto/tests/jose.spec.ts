import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { MulticodecCode, MulticodecDefinition } from '@web5/common';

import type { JsonWebKey, PublicKeyJwk } from '../src/jose.js';

import { Jose } from '../src/jose.js';
import {
  jwkToThumbprintTestVectors,
  joseToMulticodecTestVectors,
  jwkToMultibaseIdTestVectors,
} from './fixtures/test-vectors/jose.js';

chai.use(chaiAsPromised);

describe('Jose', () => {
  describe('isEcPrivateKeyJwk', () => {
    it('returns true for a valid EC private key JWK', () => {
      const validEcJwk = {
        kty : 'EC',
        crv : 'P-256',
        x   : 'base64url-encoded-x-value',
        d   : 'base64url-encoded-private-key'
      };
      expect(Jose.isEcPrivateKeyJwk(validEcJwk)).to.be.true;
    });

    it('returns false for non-object inputs', () => {
      expect(Jose.isEcPrivateKeyJwk(null)).to.be.false;
      expect(Jose.isEcPrivateKeyJwk(undefined)).to.be.false;
      expect(Jose.isEcPrivateKeyJwk(123)).to.be.false;
      expect(Jose.isEcPrivateKeyJwk('string')).to.be.false;
      expect(Jose.isEcPrivateKeyJwk([])).to.be.false;
    });

    it('returns false if any required property is missing', () => {
      const missingKty = { crv: 'P-256', x: 'base64url-encoded-x-value', d: 'base64url-encoded-private-key' };
      const missingCrv = { kty: 'EC', x: 'base64url-encoded-x-value', d: 'base64url-encoded-private-key' };
      const missingX = { kty: 'EC', crv: 'P-256', d: 'base64url-encoded-private-key' };
      const missingD = { kty: 'EC', crv: 'P-256', x: 'base64url-encoded-x-value' };

      expect(Jose.isEcPrivateKeyJwk(missingKty)).to.be.false;
      expect(Jose.isEcPrivateKeyJwk(missingCrv)).to.be.false;
      expect(Jose.isEcPrivateKeyJwk(missingX)).to.be.false;
      expect(Jose.isEcPrivateKeyJwk(missingD)).to.be.false;
    });

    it('returns false if kty is not EC', () => {
      const invalidKty = { kty: 'RSA', crv: 'P-256', x: 'base64url-encoded-x-value', d: 'base64url-encoded-private-key' };
      expect(Jose.isEcPrivateKeyJwk(invalidKty)).to.be.false;
    });

    it('returns false if any property is of incorrect type', () => {
      const invalidDType = { kty: 'EC', crv: 'P-256', x: 'base64url-encoded-x-value', d: 123 };
      const invalidXType = { kty: 'EC', crv: 'P-256', x: 123, d: 'base64url-encoded-private-key' };

      expect(Jose.isEcPrivateKeyJwk(invalidDType)).to.be.false;
      expect(Jose.isEcPrivateKeyJwk(invalidXType)).to.be.false;
    });

    it('returns true for valid EC JWK with extra properties', () => {
      const validEcJwkExtra = {
        kty   : 'EC',
        crv   : 'P-256',
        x     : 'base64url-encoded-x-value',
        d     : 'base64url-encoded-private-key',
        extra : 'extra-value'
      };
      expect(Jose.isEcPrivateKeyJwk(validEcJwkExtra)).to.be.true;
    });
  });

  describe('isEcPublicKeyJwk', () => {
    it('returns true for a valid EC public key JWK', () => {
      const validEcJwk = {
        kty : 'EC',
        crv : 'P-256',
        x   : 'base64url-encoded-x-value'
      };
      expect(Jose.isEcPublicKeyJwk(validEcJwk)).to.be.true;
    });

    it('returns false for non-object inputs', () => {
      expect(Jose.isEcPublicKeyJwk(null)).to.be.false;
      expect(Jose.isEcPublicKeyJwk(undefined)).to.be.false;
      expect(Jose.isEcPublicKeyJwk(123)).to.be.false;
      expect(Jose.isEcPublicKeyJwk('string')).to.be.false;
      expect(Jose.isEcPublicKeyJwk([])).to.be.false;
    });

    it('returns false if any required property is missing', () => {
      const missingKty = { crv: 'P-256', x: 'base64url-encoded-x-value' };
      const missingCrv = { kty: 'EC', x: 'base64url-encoded-x-value' };
      const missingX = { kty: 'EC', crv: 'P-256' };

      expect(Jose.isEcPublicKeyJwk(missingKty)).to.be.false;
      expect(Jose.isEcPublicKeyJwk(missingCrv)).to.be.false;
      expect(Jose.isEcPublicKeyJwk(missingX)).to.be.false;
    });

    it('returns false if kty is not EC', () => {
      const invalidKty = { kty: 'RSA', crv: 'P-256', x: 'base64url-encoded-x-value' };
      expect(Jose.isEcPublicKeyJwk(invalidKty)).to.be.false;
    });

    it('returns false if any property is of incorrect type', () => {
      const invalidXType = { kty: 'EC', crv: 'P-256', x: 123 };

      expect(Jose.isEcPublicKeyJwk(invalidXType)).to.be.false;
    });

    it('returns false if the private key parameter \'d\' is present', () => {
      const withDParam = { kty: 'EC', crv: 'P-256', x: 'base64url-encoded-x-value', d: 'base64url-encoded-d-value' };
      expect(Jose.isEcPublicKeyJwk(withDParam)).to.be.false;
    });

    it('returns true for valid EC public JWK with extra properties', () => {
      const validEcJwkExtra = {
        kty   : 'EC',
        crv   : 'P-256',
        x     : 'base64url-encoded-x-value',
        extra : 'extra-value'
      };
      expect(Jose.isEcPublicKeyJwk(validEcJwkExtra)).to.be.true;
    });
  });

  describe('isOctPrivateKeyJwk()', () => {
    it('returns true for a valid OCT private key JWK', () => {
      const validOctJwk = {
        kty : 'oct',
        k   : 'base64url-encoded-key'
      };
      expect(Jose.isOctPrivateKeyJwk(validOctJwk)).to.be.true;
    });

    it('returns false for non-object inputs', () => {
      expect(Jose.isOctPrivateKeyJwk(null)).to.be.false;
      expect(Jose.isOctPrivateKeyJwk(undefined)).to.be.false;
      expect(Jose.isOctPrivateKeyJwk(123)).to.be.false;
      expect(Jose.isOctPrivateKeyJwk('string')).to.be.false;
      expect(Jose.isOctPrivateKeyJwk([])).to.be.false;
    });

    it('returns false if any required property is missing', () => {
      const missingKty = { k: 'base64url-encoded-key' };
      const missingK = { kty: 'oct' };

      expect(Jose.isOctPrivateKeyJwk(missingKty)).to.be.false;
      expect(Jose.isOctPrivateKeyJwk(missingK)).to.be.false;
    });

    it('returns false if kty is not oct', () => {
      const invalidKty = { kty: 'RSA', k: 'base64url-encoded-key' };
      expect(Jose.isOctPrivateKeyJwk(invalidKty)).to.be.false;
    });

    it('returns false if any property is of incorrect type', () => {
      const invalidKType = { kty: 'oct', k: 123 };

      expect(Jose.isOctPrivateKeyJwk(invalidKType)).to.be.false;
    });

    it('returns true for valid OCT private JWK with extra properties', () => {
      const validOctJwkExtra = {
        kty   : 'oct',
        k     : 'base64url-encoded-key',
        extra : 'extra-value'
      };
      expect(Jose.isOctPrivateKeyJwk(validOctJwkExtra)).to.be.true;
    });
  });

  describe('isOkpPrivateKeyJwk()', () => {
    it('returns true for a valid OKP private key JWK', () => {
      const validOkpJwk = {
        kty : 'OKP',
        crv : 'Ed25519',
        x   : 'base64url-encoded-x-value',
        d   : 'base64url-encoded-private-key'
      };
      expect(Jose.isOkpPrivateKeyJwk(validOkpJwk)).to.be.true;
    });

    it('returns false for non-object inputs', () => {
      expect(Jose.isOkpPrivateKeyJwk(null)).to.be.false;
      expect(Jose.isOkpPrivateKeyJwk(undefined)).to.be.false;
      expect(Jose.isOkpPrivateKeyJwk(123)).to.be.false;
      expect(Jose.isOkpPrivateKeyJwk('string')).to.be.false;
      expect(Jose.isOkpPrivateKeyJwk([])).to.be.false;
    });

    it('returns false if any required property is missing', () => {
      const missingKty = { crv: 'Ed25519', x: 'base64url-encoded-x-value', d: 'base64url-encoded-private-key' };
      const missingCrv = { kty: 'OKP', x: 'base64url-encoded-x-value', d: 'base64url-encoded-private-key' };
      const missingX = { kty: 'OKP', crv: 'Ed25519', d: 'base64url-encoded-private-key' };
      const missingD = { kty: 'OKP', crv: 'Ed25519', x: 'base64url-encoded-x-value' };

      expect(Jose.isOkpPrivateKeyJwk(missingKty)).to.be.false;
      expect(Jose.isOkpPrivateKeyJwk(missingCrv)).to.be.false;
      expect(Jose.isOkpPrivateKeyJwk(missingX)).to.be.false;
      expect(Jose.isOkpPrivateKeyJwk(missingD)).to.be.false;
    });

    it('returns false if kty is not OKP', () => {
      const invalidKty = { kty: 'EC', crv: 'Ed25519', x: 'base64url-encoded-x-value', d: 'base64url-encoded-private-key' };
      expect(Jose.isOkpPrivateKeyJwk(invalidKty)).to.be.false;
    });

    it('returns false if any property is of incorrect type', () => {
      const invalidDType = { kty: 'OKP', crv: 'Ed25519', x: 'base64url-encoded-x-value', d: 123 };
      const invalidXType = { kty: 'OKP', crv: 'Ed25519', x: 123, d: 'base64url-encoded-private-key' };

      expect(Jose.isOkpPrivateKeyJwk(invalidDType)).to.be.false;
      expect(Jose.isOkpPrivateKeyJwk(invalidXType)).to.be.false;
    });

    it('returns true for valid OKP private JWK with extra properties', () => {
      const validOkpJwkExtra = {
        kty   : 'OKP',
        crv   : 'Ed25519',
        x     : 'base64url-encoded-x-value',
        d     : 'base64url-encoded-private-key',
        extra : 'extra-value'
      };
      expect(Jose.isOkpPrivateKeyJwk(validOkpJwkExtra)).to.be.true;
    });
  });


  describe('isOkpPublicKeyJwk()', () => {
    it('returns true for a valid OKP public key JWK', () => {
      const validOkpJwk = {
        kty : 'OKP',
        crv : 'Ed25519',
        x   : 'base64url-encoded-x-value'
      };
      expect(Jose.isOkpPublicKeyJwk(validOkpJwk)).to.be.true;
    });

    it('returns false for non-object inputs', () => {
      expect(Jose.isOkpPublicKeyJwk(null)).to.be.false;
      expect(Jose.isOkpPublicKeyJwk(undefined)).to.be.false;
      expect(Jose.isOkpPublicKeyJwk(123)).to.be.false;
      expect(Jose.isOkpPublicKeyJwk('string')).to.be.false;
      expect(Jose.isOkpPublicKeyJwk([])).to.be.false;
    });

    it('returns false if any required property is missing', () => {
      const missingKty = { crv: 'Ed25519', x: 'base64url-encoded-x-value' };
      const missingCrv = { kty: 'OKP', x: 'base64url-encoded-x-value' };
      const missingX = { kty: 'OKP', crv: 'Ed25519' };

      expect(Jose.isOkpPublicKeyJwk(missingKty)).to.be.false;
      expect(Jose.isOkpPublicKeyJwk(missingCrv)).to.be.false;
      expect(Jose.isOkpPublicKeyJwk(missingX)).to.be.false;
    });

    it('returns false if kty is not OKP', () => {
      const invalidKty = { kty: 'EC', crv: 'Ed25519', x: 'base64url-encoded-x-value' };
      expect(Jose.isOkpPublicKeyJwk(invalidKty)).to.be.false;
    });

    it('returns false if any property is of incorrect type', () => {
      const invalidXType = { kty: 'OKP', crv: 'Ed25519', x: 123 };

      expect(Jose.isOkpPublicKeyJwk(invalidXType)).to.be.false;
    });

    it(`returns false if the private key parameter 'd' is present`, () => {
      const withDParam = { kty: 'OKP', crv: 'Ed25519', x: 'base64url-encoded-x-value', d: 'base64url-encoded-d-value' };
      expect(Jose.isOkpPublicKeyJwk(withDParam)).to.be.false;
    });

    it('returns true for valid OKP public JWK with extra properties', () => {
      const validOkpJwkExtra = {
        kty   : 'OKP',
        crv   : 'Ed25519',
        x     : 'base64url-encoded-x-value',
        extra : 'extra-value'
      };
      expect(Jose.isOkpPublicKeyJwk(validOkpJwkExtra)).to.be.true;
    });
  });

  describe('joseToMulticodec()', () => {
    it('converts JOSE to Multicodec', async () => {
      let multicoded: MulticodecDefinition<MulticodecCode>;
      for (const vector of joseToMulticodecTestVectors) {
        multicoded = await Jose.joseToMulticodec({
          key: vector.input as JsonWebKey,
        });
        expect(multicoded).to.deep.equal(vector.output);
      }
    });

    it('throws an error if unsupported JOSE has been passed', async () => {
      await expect(
        // @ts-expect-error because parameters are intentionally omitted to trigger an error.
        Jose.joseToMulticodec({key: { crv: '123'}})
      ).to.eventually.be.rejectedWith(Error, `Unsupported JOSE to Multicodec conversion: '123:public'`);
    });
  });

  describe('jwkThumbprint()', () => {
    it('passes all test vectors', async () => {
      let jwkThumbprint: string;

      for (const vector of jwkToThumbprintTestVectors) {
        jwkThumbprint = await Jose.jwkThumbprint({ key: vector.input as JsonWebKey});
        expect(jwkThumbprint).to.equal(vector.output);
      }
    });

    it('throws an error if unsupported key type has been passed', async () => {
      await expect(
        // @ts-expect-error because parameters are intentionally omitted to trigger an error.
        Jose.jwkThumbprint({key: { crv: 'X25519', kty: 'unsupported' }})
      ).to.eventually.be.rejectedWith(Error, `Unsupported key type: unsupported`);
    });
  });

  describe('publicKeyToMultibaseId()', () => {
    it('passes all test vectors', async () => {
      let multibaseId: string;

      for (const vector of jwkToMultibaseIdTestVectors) {
        multibaseId = await Jose.publicKeyToMultibaseId({ publicKey: vector.input as PublicKeyJwk});
        expect(multibaseId).to.equal(vector.output);
      }
    });

    it('throws an error for an unsupported public key type', async () => {
      await expect(
        Jose.publicKeyToMultibaseId({
          publicKey: {
            kty : 'RSA',
            n   : 'r0YDzIV4GPJ1wFb1Gftdd3C3VE6YeknVq1C7jGypq5WTTmX0yRDBqzL6mBR3_c-mKRuE5Z5VMGniA1lFnFmv8m0A2engKfALXHPJqoL6WzqN1SyjSM2aI6v8JVTj4H0RdYV9R4jxIB-zK5X-ZyL6CwHx-3dKZkCvZSEp8b-5I8c2Fz8E8Hl7qKkD_qEz6ZOmKVhJLGiEag1qUQYJv2TcRdiyZfwwVsV3nI3IcVfMCTjDZTw2jI0YHJgLi7-MkP4DO7OJ4D4AFtL-7CkZ7V2xG0piBz4b02_-ZGnBZ5zHJxGoUZnTY6HX4V9bPQI_ME8qCjFXf-TcwCfDFcwMm70L2Q',
            e   : 'AQAB',
            alg : 'RS256'
          }
        })
      ).to.eventually.be.rejectedWith(Error, `Unsupported public key type`);
    });

    it('throws an error for an unsupported public key curve', async () => {
      await expect(
        Jose.publicKeyToMultibaseId({
          publicKey: {
            kty : 'EC',
            crv : 'P-256',
            x   : 'SVqB4JcUD6lsfvqMr-OKUNUphdNn64Eay60978ZlL74',
            y   : 'lf0u0pMj4lGAzZix5u4Cm5CMQIgMNpkwy163wtKYVKI'
          }
        })
      ).to.eventually.be.rejectedWith(Error, `Unsupported public key curve`);
    });
  });

  describe('multicodecToJose()', () => {
    it('converts ed25519 public key multicodec to JWK', async () => {
      const result = await Jose.multicodecToJose({ name: 'ed25519-pub' });
      expect(result).to.deep.equal({
        crv : 'Ed25519',
        kty : 'OKP',
        x   : '' // x value would be populated with actual key material in real use
      });
    });

    it('converts ed25519 private key multicodec to JWK', async () => {
      const result = await Jose.multicodecToJose({ name: 'ed25519-priv' });
      expect(result).to.deep.equal({
        crv : 'Ed25519',
        kty : 'OKP',
        x   : '', // x value would be populated with actual key material in real use
        d   : ''  // d value would be populated with actual key material in real use
      });
    });

    it('converts secp256k1 public key multicodec to JWK', async () => {
      const result = await Jose.multicodecToJose({ name: 'secp256k1-pub' });
      expect(result).to.deep.equal({
        crv : 'secp256k1',
        kty : 'EC',
        x   : '', // x value would be populated with actual key material in real use
        y   : ''  // y value would be populated with actual key material in real use
      });
    });

    it('converts secp256k1 private key multicodec to JWK', async () => {
      const result = await Jose.multicodecToJose({ name: 'secp256k1-priv' });
      expect(result).to.deep.equal({
        crv : 'secp256k1',
        kty : 'EC',
        x   : '', // x value would be populated with actual key material in real use
        y   : '', // y value would be populated with actual key material in real use
        d   : ''  // d value would be populated with actual key material in real use
      });
    });

    it('converts x25519 public key multicodec to JWK', async () => {
      const result = await Jose.multicodecToJose({ name: 'x25519-pub' });
      expect(result).to.deep.equal({
        crv : 'X25519',
        kty : 'OKP',
        x   : '' // x value would be populated with actual key material in real use
      });
    });

    it('converts x25519 private key multicodec to JWK', async () => {
      const result = await Jose.multicodecToJose({ name: 'x25519-priv' });
      expect(result).to.deep.equal({
        crv : 'X25519',
        kty : 'OKP',
        x   : '', // x value would be populated with actual key material in real use
        d   : ''  // d value would be populated with actual key material in real use
      });
    });

    it('throws an error when name is undefined and code is not provided', async () => {
      try {
        await Jose.multicodecToJose({});
        expect.fail('Should have thrown an error for undefined name and code');
      } catch (e: any) {
        expect(e.message).to.equal('Either \'name\' or \'code\' must be defined, but not both.');
      }
    });

    it('throws an error when both name and code are provided', async () => {
      try {
        await Jose.multicodecToJose({ name: 'ed25519-pub', code: 0xed });
        expect.fail('Should have thrown an error for both name and code being defined');
      } catch (e: any) {
        expect(e.message).to.equal('Either \'name\' or \'code\' must be defined, but not both.');
      }
    });

    it('throws an error for unsupported multicodec name', async () => {
      try {
        await Jose.multicodecToJose({ name: 'unsupported-key-type' });
        expect.fail('Should have thrown an error for unsupported multicodec name');
      } catch (e: any) {
        expect(e.message).to.include('Unsupported Multicodec to JOSE conversion');
      }
    });

    it('throws an error for unsupported multicodec code', async () => {
      try {
        await Jose.multicodecToJose({ code: 0x9999 });
        expect.fail('Should have thrown an error for unsupported multicodec code');
      } catch (e: any) {
        expect(e.message).to.include('Unsupported multicodec');
      }
    });
  });
});