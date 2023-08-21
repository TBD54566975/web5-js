import chai, { expect } from 'chai';
import { Convert } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';

import type { JsonWebKey } from '../src/jose.js';
import type { Web5Crypto } from '../src/types/web5-crypto.js';

import { CryptoKeyWithJwk, Jose } from '../src/jose.js';
import {
  cryptoKeyToJwkTestVectors,
  cryptoKeyPairToJsonWebKeyTestVectors,
  joseToWebCryptoTestVectors,
  keyToJwkWebCryptoTestVectors,
  keyToJwkMulticodecTestVectors,
  keyToJwkTestVectorsKeyMaterial
} from './fixtures/test-vectors/jose.js';

chai.use(chaiAsPromised);

describe('CryptoKeyWithJwk()', () => {
  it('converts private CryptoKeys to JWK', async () => {
    for (const vector of cryptoKeyPairToJsonWebKeyTestVectors) {
      const privateKey = {
        ...vector.cryptoKey.privateKey,
        material: Convert.hex(vector.cryptoKey.privateKey.material).toUint8Array()
      } as Web5Crypto.CryptoKey;

      const cryptoKey = new CryptoKeyWithJwk(
        privateKey.algorithm,
        privateKey.extractable,
        privateKey.material,
        privateKey.type,
        privateKey.usages
      );

      const jsonWebKey = await cryptoKey.toJwk();

      expect(jsonWebKey).to.deep.equal(vector.jsonWebKey.privateKeyJwk);
    }
  });

  it('converts public CryptoKeys to JWK', async () => {
    for (const vector of cryptoKeyPairToJsonWebKeyTestVectors) {
      const publicKey = {
        ...vector.cryptoKey.publicKey,
        material: Convert.hex(vector.cryptoKey.publicKey.material).toUint8Array()
      } as Web5Crypto.CryptoKey;

      const cryptoKey = new CryptoKeyWithJwk(
        publicKey.algorithm,
        publicKey.extractable,
        publicKey.material,
        publicKey.type,
        publicKey.usages
      );

      const jsonWebKey = await cryptoKey.toJwk();

      expect(jsonWebKey).to.deep.equal(vector.jsonWebKey.publicKeyJwk);
    }
  });

  it('converts secret CryptoKeys to JWK', async () => {
    for (const vector of cryptoKeyToJwkTestVectors) {
      const secretKey = {
        ...vector.cryptoKey,
        material: Convert.hex(vector.cryptoKey.material).toUint8Array()
      } as Web5Crypto.CryptoKey;

      const cryptoKey = new CryptoKeyWithJwk(
        secretKey.algorithm,
        secretKey.extractable,
        secretKey.material,
        secretKey.type,
        secretKey.usages
      );

      const jsonWebKey = await cryptoKey.toJwk();

      expect(jsonWebKey).to.deep.equal(vector.jsonWebKey);
    }
  });

  it('converts public CryptoKeys with extractable=false', async () => {
    for (const vector of cryptoKeyPairToJsonWebKeyTestVectors) {
      const publicKey = {
        ...vector.cryptoKey.publicKey,
        material: Convert.hex(vector.cryptoKey.publicKey.material).toUint8Array()
      } as Web5Crypto.CryptoKey;

      const cryptoKey = new CryptoKeyWithJwk(
        publicKey.algorithm,
        false, // override extractable to false
        publicKey.material,
        publicKey.type,
        publicKey.usages
      );

      const jsonWebKey = await cryptoKey.toJwk();

      expect(jsonWebKey).to.deep.equal({ ...vector.jsonWebKey.publicKeyJwk, ext: 'false' });
    }
  });

  it('throws an error with unsupported algorithms', async () => {
    const cryptoKey = new CryptoKeyWithJwk(
      { name: 'ECDSA', namedCurve: 'P-256' }, // algorithm identifier
      false, // extractable
      new Uint8Array(32), // material aka key material
      'private', // key type
      ['sign', 'verify'] // key usages
    );

    await expect(
      cryptoKey.toJwk()
    ).to.eventually.be.rejectedWith(Error, 'Unsupported key to JWK conversion: P-256');
  });
});

describe('Jose', () => {
  describe('joseToWebCrypto()', () => {
    it('translates algorithm format from JOSE to WebCrypto', () => {
      let webCrypto: Web5Crypto.GenerateKeyOptions;
      for (const vector of joseToWebCryptoTestVectors) {
        webCrypto = Jose.joseToWebCrypto(vector.jose as JsonWebKey);
        expect(webCrypto).to.deep.equal(vector.webCrypto);
      }
    });

    it('throws an error if required parameters are missing', () => {
      expect(
        () => Jose.joseToWebCrypto({})
      ).to.throw(TypeError, 'One or more parameters missing');
    });

    it('throws an error if an unknown JOSE algorithm is specified', () => {
      expect(
        () => Jose.joseToWebCrypto({ alg: 'non-existent' })
      ).to.throw(Error, `Unsupported JOSE to WebCrypto conversion: 'non-existent'`);

      expect(
        // @ts-expect-error because invalid algorithm was intentionally specified to trigger an error.
        () => Jose.joseToWebCrypto({ crv: 'non-existent' })
      ).to.throw(Error, `Unsupported JOSE to WebCrypto conversion: 'non-existent'`);
    });
  });

  describe('jwkThumbprint()', () => {
    it('passes RFC 7638 test vector', async () => {
      // @see {@link https://datatracker.ietf.org/doc/html/rfc7638#section-3.1 | Example JWK Thumbprint Computation}
      const jwk: JsonWebKey =   {
        'kty' : 'RSA',
        'n'   : '0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx4cbbfAAtVT86zwu1RK7aPFFxuhDR1L6tSoc_BJECPebWKRXjBZCiFV4n3oknjhMstn64tZ_2W-5JsGY4Hc5n9yBXArwl93lqt7_RN5w6Cf0h4QyQ5v-65YGjQR0_FDW2QvzqY368QQMicAtaSqzs8KJZgnYb9c7d0zgdAZHzu6qMQvRL5hajrn1n91CbOpbISD08qNLyrdkt-bFTWhAI4vMQFh6WeZu0fM4lFd2NcRwr3XPksINHaQ-G_xBniIqbw0Ls1jF44-csFCur-kEgU8awapJzKnqDKgw',
        'e'   : 'AQAB',
        'alg' : 'RS256',
        'kid' : '2011-04-29'
      };

      const jwkThumbprint = await Jose.jwkThumbprint({ key: jwk });
      expect(jwkThumbprint).to.equal('NzbLsXh8uDCcd-6MNwXF4W_7noWXFZAfHkxZsRGC9Xs');
    });
  });

  describe('keyToJwk()', () => {
    it('converts key with Jose parameters (from WebCrypto) into JWK', async () => {
      let jwkParams: Partial<JsonWebKey>;
      const keyMaterial = Convert.hex(keyToJwkTestVectorsKeyMaterial).toUint8Array();

      for (const vector of keyToJwkWebCryptoTestVectors) {
        jwkParams = Jose.webCryptoToJose(vector.input);
        const jwk = await Jose.keyToJwk({ keyMaterial, keyType: 'public', ...jwkParams });
        expect(jwk).to.deep.equal(vector.output);
      }
    });

    it('converts key with Jose parameters (from Multicodec) into JWK', async () => {
      let jwkParams: Partial<JsonWebKey>;
      const keyMaterial = Convert.hex(keyToJwkTestVectorsKeyMaterial).toUint8Array();

      for (const vector of keyToJwkMulticodecTestVectors) {
        jwkParams = await Jose.multicodecToJose({ name: vector.input });
        const keyType = vector.input.includes('priv') ? 'private' : 'public';
        const jwk = await Jose.keyToJwk({ keyMaterial, keyType, ...jwkParams });
        expect(jwk).to.deep.equal(vector.output);
      }
    });

    it('throws an error for unsupported conversion', async () => {
      let jwkParams: Partial<JsonWebKey>;
      const testVectors = [
        { namedCurve: 'Ed448', name: 'EdDSA' },
        { namedCurve: 'P-256', name: 'ECDSA' },
        { namedCurve: 'P-384', name: 'ECDSA' },
        { namedCurve: 'P-521', name: 'ECDSA' }
      ];
      const keyMaterial = new Uint8Array(32);
      for (const vector of testVectors) {
        jwkParams = Jose.webCryptoToJose(vector);
        await expect(
          Jose.keyToJwk({ keyMaterial, keyType: 'public', ...jwkParams })
        ).to.eventually.be.rejectedWith(Error, 'Unsupported key to JWK conversion');
      }
    });
  });

  describe('webCryptoToJose()', () => {
    it('translates algorithm format from WebCrypto to JOSE', () => {
      let jose: Partial<JsonWebKey>;
      for (const vector of joseToWebCryptoTestVectors) {
        jose = Jose.webCryptoToJose(vector.webCrypto);
        expect(jose).to.deep.equal(vector.jose);
      }
    });

    it('throws an error if required parameters are missing', () => {
      expect(
        // @ts-expect-error because parameters are intentionally omitted to trigger an error.
        () => Jose.webCryptoToJose({})
      ).to.throw(TypeError, 'One or more parameters missing');
    });

    it('throws an error if an unknown WebCrypto algorithm is specified', () => {
      expect(
        () => Jose.webCryptoToJose({ name: 'non-existent', namedCurve: 'non-existent' })
      ).to.throw(Error, `Unsupported WebCrypto to JOSE conversion: 'non-existent:non-existent'`);

      expect(
        () => Jose.webCryptoToJose({ name: 'non-existent', length: 64 })
      ).to.throw(Error, `Unsupported WebCrypto to JOSE conversion: 'non-existent:64'`);

      expect(
        () => Jose.webCryptoToJose({ name: 'non-existent', hash: { name: 'SHA-1' } })
      ).to.throw(Error, `Unsupported WebCrypto to JOSE conversion: 'non-existent:SHA-1'`);
    });
  });
});