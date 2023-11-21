import chai, { expect } from 'chai';
import { Convert, MulticodecCode, MulticodecDefinition } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';

import type { JsonWebKey } from '../src/jose.js';
import type { Web5Crypto } from '../src/types/web5-crypto.js';

import { Jose } from '../src/jose.js';
import {
  cryptoKeyToJwkTestVectors,
  cryptoKeyPairToJsonWebKeyTestVectors,
  joseToWebCryptoTestVectors,
  keyToJwkWebCryptoTestVectors,
  keyToJwkMulticodecTestVectors,
  keyToJwkTestVectorsKeyMaterial,
  joseToMulticodecTestVectors,
  jwkToThumbprintTestVectors,
  jwkToCryptoKeyTestVectors,
  jwkToKeyTestVectors,
  jwkToMultibaseIdTestVectors,
  keyToJwkWebCryptoWithNullKTYTestVectors,
} from './fixtures/test-vectors/jose.js';

chai.use(chaiAsPromised);

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

  describe('jwkToCryptoKey()', () => {
    it('passes all test vectors', async () => {
      let cryptoKey: Web5Crypto.CryptoKey;

      for (const vector of jwkToCryptoKeyTestVectors) {
        cryptoKey = await Jose.jwkToCryptoKey({ key: vector.jsonWebKey as JsonWebKey});
        expect(cryptoKey).to.deep.equal(vector.cryptoKey);
      }
    });

    it('throws an error when ext parameter is missing', async () => {
      await expect(
        Jose.jwkToCryptoKey({key: {
          'alg'     : 'A256CTR',
          'key_ops' : ['encrypt', 'decrypt'],
          'k'       : 'UQtIAS-rmWB-vgNgG4lPrnTS2tNvwDPKl9rs0L9ICnU',
          'kty'     : 'oct',
        }})
      ).to.eventually.be.rejectedWith(Error, `Conversion from JWK to CryptoKey failed. Required parameter missing: 'ext'`);
    });

    it('throws an error when key_ops parameter is missing', async () => {
      await expect(
        Jose.jwkToCryptoKey({key: {
          'alg' : 'A256CTR',
          'ext' : 'true',
          'k'   : 'UQtIAS-rmWB-vgNgG4lPrnTS2tNvwDPKl9rs0L9ICnU',
          'kty' : 'oct',
        }})
      ).to.eventually.be.rejectedWith(Error, `Conversion from JWK to CryptoKey failed. Required parameter missing: 'key_ops'`);
    });
  });

  describe('jwkToKey()', () => {
    it('converts JWK into Jose parameters', async () => {
      let jwk: { keyMaterial: Uint8Array; keyType: Web5Crypto.KeyType };

      for (const vector of jwkToKeyTestVectors) {
        jwk = await Jose.jwkToKey({ key: vector.input as JsonWebKey});
        const hexKeyMaterial = Convert.uint8Array(jwk.keyMaterial).toHex();

        expect({...jwk, keyMaterial: hexKeyMaterial}).to.deep.equal(vector.output);
      }
    });

    it('throws an error if unsupported JOSE has been passed', async () => {
      await expect(
        // @ts-expect-error because parameters are intentionally omitted to trigger an error.
        Jose.jwkToKey({ key: { alg: 'HS256', kty: 'oct' }})
      ).to.eventually.be.rejectedWith(Error, `Jose: Unknown JSON Web Key format.`);
    });
  });

  describe('jwkToMultibaseId()', () => {
    it('passes all test vectors', async () => {
      let multibaseId: string;

      for (const vector of jwkToMultibaseIdTestVectors) {
        multibaseId = await Jose.jwkToMultibaseId({ key: vector.input as JsonWebKey});
        expect(multibaseId).to.equal(vector.output);
      }
    });

    // it('throws an error when ext parameter is missing', async () => {
    //   await expect(
    //     Jose.jwkToCryptoKey({key: {
    //       'alg'     : 'A256CTR',
    //       'key_ops' : ['encrypt', 'decrypt'],
    //       'k'       : 'UQtIAS-rmWB-vgNgG4lPrnTS2tNvwDPKl9rs0L9ICnU',
    //       'kty'     : 'oct',
    //     }})
    //   ).to.eventually.be.rejectedWith(Error, `Conversion from JWK to CryptoKey failed. Required parameter missing: 'ext'`);
    // });
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

    it('coverts when kty equals to null', async () => {
      let jwkParams: Partial<JsonWebKey>;
      const keyMaterial = Convert.hex(keyToJwkTestVectorsKeyMaterial).toUint8Array();

      for (const vector of keyToJwkWebCryptoWithNullKTYTestVectors) {
        jwkParams = Jose.webCryptoToJose(vector.input);
        // @ts-expect-error because parameters are intentionally omitted to trigger an error.
        const jwk = await Jose.keyToJwk({ keyMaterial, keyType: 'public', ...jwkParams, kty: null });
        expect(jwk).to.deep.equal(vector.output);
      }
    });

    it('throws an error for wrong arguments', async () => {
      await expect(
        Jose.multicodecToJose({ name: 'intentionally-wrong-name', code: 12345 })
      ).to.eventually.be.rejectedWith(Error, `Either 'name' or 'code' must be defined, but not both.`);
    });

    it('handles undefined name', async () => {
      const jwkParams = await Jose.multicodecToJose({ name: undefined, code: 0xed });
      expect(jwkParams).to.deep.equal({ alg: 'EdDSA', crv: 'Ed25519', kty: 'OKP', x: '' });
    });

    it('throws an error for unsupported multicodec conversion', async () => {
      await expect(
        Jose.multicodecToJose({ name: 'intentionally-wrong-name' })
      ).to.eventually.be.rejectedWith(Error, `Unsupported Multicodec to JOSE conversion: 'intentionally-wrong-name'`);
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

  describe('cryptoKeyToJwkPair()', () => {
    it('converts CryptoKeys to JWK Pair', async () => {
      for (const vector of cryptoKeyPairToJsonWebKeyTestVectors) {
        const privateKey = {
          ...vector.cryptoKey.privateKey,
          material: Convert.hex(
            vector.cryptoKey.privateKey.material
          ).toUint8Array(),
        } as Web5Crypto.CryptoKey;
        const publicKey = {
          ...vector.cryptoKey.publicKey,
          material: Convert.hex(
            vector.cryptoKey.publicKey.material
          ).toUint8Array(),
        } as Web5Crypto.CryptoKey;

        const jwkKeyPair = await Jose.cryptoKeyToJwkPair({
          keyPair: { publicKey, privateKey },
        });

        expect(jwkKeyPair).to.deep.equal(vector.jsonWebKey);
      }
    });
  });
});