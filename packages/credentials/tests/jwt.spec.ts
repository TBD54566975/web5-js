import type { JwtHeaderParams, JwtPayload, PrivateKeyJwk } from '@web5/crypto';

import { expect } from 'chai';
import { Convert } from '@web5/common';
import { Ed25519 } from '@web5/crypto';
import { DidKey, PortableDid } from '@web5/dids';

import { Jwt } from '../src/jwt.js';

describe('Jwt', () => {
  describe('parse()', () => {
    it('throws error if JWT doesnt contain 3 parts', async () => {
      expect(() =>
        Jwt.parse({ jwt: 'abcd123' })
      ).to.throw('Malformed JWT. expected 3 parts');
    });

    it('throws error if JWT header is not properly base64url encoded', async () => {
      expect(() =>
        Jwt.parse({ jwt: 'abcd123.efgh.hijk' })
      ).to.throw('Invalid base64url encoding for JWT header');
    });

    it('throws error if JWT header is missing typ property', async () => {
      const header: JwtHeaderParams = { alg: 'ES256K', kid: 'whateva' };
      const base64UrlEncodedHeader = Convert.object(header).toBase64Url();

      expect(() =>
        Jwt.parse({ jwt: `${base64UrlEncodedHeader}.efgh.hijk` })
      ).to.throw('typ property set to JWT');
    });

    it('throws error if JWT header typ property is not set to JWT', async () => {
      const header: JwtHeaderParams = { typ: 'hehe', alg: 'ES256K', kid: 'whateva' };
      const base64UrlEncodedHeader = Convert.object(header).toBase64Url();

      expect(() =>
        Jwt.parse({ jwt: `${base64UrlEncodedHeader}.efgh.hijk` })
      ).to.throw('typ property set to JWT');
    });

    it('throws error if JWT header alg property is missing', async () => {
      // @ts-expect-error because alg is intentionally missing to trigger error.
      const header: JwtHeaderParams = { typ: 'JWT', kid: 'whateva' };
      const base64UrlEncodedHeader = Convert.object(header).toBase64Url();

      expect(() =>
        Jwt.parse({ jwt: `${base64UrlEncodedHeader}.efgh.hijk` })
      ).to.throw('to contain alg and kid');
    });

    it('throws error if JWT header kid property is missing', async () => {
      const header: JwtHeaderParams = { typ: 'JWT', alg: 'ES256K' };
      const base64UrlEncodedHeader = Convert.object(header).toBase64Url();

      expect(() =>
        Jwt.parse({ jwt: `${base64UrlEncodedHeader}.efgh.hijk` })
      ).to.throw('to contain alg and kid');
    });

    it('throws error if JWT payload is not properly base64url encoded', async () => {
      const header: JwtHeaderParams = { typ: 'JWT', alg: 'ES256K', kid: 'whateva' };
      const base64UrlEncodedHeader = Convert.object(header).toBase64Url();

      expect(() =>
        Jwt.parse({ jwt: `${base64UrlEncodedHeader}.efgh.hijk` })
      ).to.throw('Invalid base64url encoding for JWT payload');
    });
  });

  describe('verify()', () => {
    it('throws error if JWT is expired', async () => {
      const did = await DidKey.create({ options: { algorithm: 'secp256k1'} });
      const header: JwtHeaderParams = { typ: 'JWT', alg: 'ES256K', kid: did.didDocument.verificationMethod![0].id };
      const base64UrlEncodedHeader = Convert.object(header).toBase64Url();

      const payload: JwtPayload = { exp: Math.floor(Date.now() / 1000 - 1) };
      const base64UrlEncodedPayload = Convert.object(payload).toBase64Url();

      try {
        await Jwt.verify({ jwt: `${base64UrlEncodedHeader}.${base64UrlEncodedPayload}.hijk` });
        expect.fail();
      } catch(e: any) {
        expect(e.message).to.include('JWT is expired');
      }
    });
    it('throws error if JWT header kid does not dereference a verification method', async () => {
      const did = await DidKey.create({ options: { algorithm: 'secp256k1'} });
      const header: JwtHeaderParams = { typ: 'JWT', alg: 'ES256K', kid: did.uri };
      const base64UrlEncodedHeader = Convert.object(header).toBase64Url();

      const payload: JwtPayload = { iat: Math.floor(Date.now() / 1000) };
      const base64UrlEncodedPayload = Convert.object(payload).toBase64Url();

      try {
        await Jwt.verify({ jwt: `${base64UrlEncodedHeader}.${base64UrlEncodedPayload}.hijk` });
        expect.fail();
      } catch(e: any) {
        expect(e.message).to.include('dereference a DID Document Verification Method');
      }
    });

    it('throws error if alg is not supported', async () => {
      const did = await DidKey.create({ options: { algorithm: 'secp256k1'} });
      const header: JwtHeaderParams = { typ: 'JWT', alg: 'RS256', kid: did.didDocument.verificationMethod![0].id };
      const base64UrlEncodedHeader = Convert.object(header).toBase64Url();

      const payload: JwtPayload = { iat: Math.floor(Date.now() / 1000) };
      const base64UrlEncodedPayload = Convert.object(payload).toBase64Url();

      try {
        await Jwt.verify({ jwt: `${base64UrlEncodedHeader}.${base64UrlEncodedPayload}.hijk` });
        expect.fail();
      } catch(e: any) {
        expect(e.message).to.include('not supported');
      }
    });

    it('returns signer DID if verification succeeds', async () => {
      const portabldDid: PortableDid = {
        uri                 : 'did:key:z6MkkGkByH7rSY3uxDEPTk1CZzPG5hvf564ABFLQzCFwyYNN',
        verificationMethods : [{
          publicKeyJwk: {
            kty : 'OKP',
            crv : 'Ed25519',
            x   : 'VnSOQ-n7kRcYd0XGW2MNCv7DDY5py5XhNcjM7-Y1HVM'
          },
          privateKeyJwk: {
            kty : 'OKP',
            crv : 'Ed25519',
            x   : 'VnSOQ-n7kRcYd0XGW2MNCv7DDY5py5XhNcjM7-Y1HVM',
            d   : 'iTD5DIOKZNkwgzsND-I8CLIXmgTxfQ1HUzl9fpMktAo'
          },
          purposes: ['authentication']
        }]
      };

      const did = await DidKey.fromKeys(portabldDid);

      const header: JwtHeaderParams = { typ: 'JWT', alg: 'EdDSA', kid: did.didDocument.verificationMethod![0].id };
      const base64UrlEncodedHeader = Convert.object(header).toBase64Url();

      const payload: JwtPayload = { iat: Math.floor(Date.now() / 1000) };
      const base64UrlEncodedPayload = Convert.object(payload).toBase64Url();

      const toSign = `${base64UrlEncodedHeader}.${base64UrlEncodedPayload}`;
      const toSignBytes = Convert.string(toSign).toUint8Array();

      const privateKeyJwk = portabldDid.verificationMethods![0].privateKeyJwk;

      const signatureBytes = await Ed25519.sign({ key: privateKeyJwk as PrivateKeyJwk, data: toSignBytes });
      const base64UrlEncodedSignature = Convert.uint8Array(signatureBytes).toBase64Url();

      const jwt = `${toSign}.${base64UrlEncodedSignature}`;
      const verifyResult = await Jwt.verify({ jwt });

      expect(verifyResult.header).to.deep.equal(header);
      expect(verifyResult.payload).to.deep.equal(payload);
    });
  });
});