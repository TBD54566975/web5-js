import type { PrivateKeyJwk } from '@web5/crypto';
import type { JwtHeader, JwtPayload } from 'jwt-decode';

import { expect } from 'chai';
import { Convert } from '@web5/common';
import { Secp256k1 } from '@web5/crypto';
import { DidKeyMethod } from '@web5/dids';

import { CompactJwt } from '../src/index.js';

describe('CompactJwt', () => {
  describe('parse()', () => {
    it('throws error if JWT doesnt contain 3 parts', async () => {
      expect(() =>
        CompactJwt.parse({ compactJwt: 'abcd123' })
      ).to.throw('Malformed JWT. expected 3 parts');
    });

    it('throws error if JWT header is not properly base64url encoded', async () => {
      expect(() =>
        CompactJwt.parse({ compactJwt: 'abcd123.efgh.hijk' })
      ).to.throw('Invalid base64url encoding for JWT header');
    });

    it('throws error if JWT header is missing typ property', async () => {
      const header: JwtHeader = { alg: 'ES256K', kid: 'whateva' };
      const base64UrlEncodedHeader = Convert.object(header).toBase64Url();

      expect(() =>
        CompactJwt.parse({ compactJwt: `${base64UrlEncodedHeader}.efgh.hijk` })
      ).to.throw('typ property set to JWT');
    });

    it('throws error if JWT header typ property is not set to JWT', async () => {
      const header: JwtHeader = { typ: 'hehe', alg: 'ES256K', kid: 'whateva' };
      const base64UrlEncodedHeader = Convert.object(header).toBase64Url();

      expect(() =>
        CompactJwt.parse({ compactJwt: `${base64UrlEncodedHeader}.efgh.hijk` })
      ).to.throw('typ property set to JWT');
    });

    it('throws error if JWT header alg property is missing', async () => {
      const header: JwtHeader = { typ: 'JWT', kid: 'whateva' };
      const base64UrlEncodedHeader = Convert.object(header).toBase64Url();

      expect(() =>
        CompactJwt.parse({ compactJwt: `${base64UrlEncodedHeader}.efgh.hijk` })
      ).to.throw('to contain alg and kid');
    });

    it('throws error if JWT header kid property is missing', async () => {
      const header: JwtHeader = { typ: 'JWT', alg: 'ES256K' };
      const base64UrlEncodedHeader = Convert.object(header).toBase64Url();

      expect(() =>
        CompactJwt.parse({ compactJwt: `${base64UrlEncodedHeader}.efgh.hijk` })
      ).to.throw('to contain alg and kid');
    });

    it('throws error if JWT payload is not properly base64url encoded', async () => {
      const header: JwtHeader = { typ: 'JWT', alg: 'ES256K', kid: 'whateva' };
      const base64UrlEncodedHeader = Convert.object(header).toBase64Url();

      expect(() =>
        CompactJwt.parse({ compactJwt: `${base64UrlEncodedHeader}.efgh.hijk` })
      ).to.throw('Invalid base64url encoding for JWT payload');
    });
  });

  describe('verify()', () => {
    it('throws error if JWT header kid does not dereference a verification method', async () => {
      const did = await DidKeyMethod.create({ keyAlgorithm: 'secp256k1' });
      const header: JwtHeader = { typ: 'JWT', alg: 'ES256K', kid: did.did };
      const base64UrlEncodedHeader = Convert.object(header).toBase64Url();

      const payload: JwtPayload = { iat: Math.floor(Date.now() / 1000) };
      const base64UrlEncodedPayload = Convert.object(payload).toBase64Url();

      try {
        await CompactJwt.verify({ compactJwt: `${base64UrlEncodedHeader}.${base64UrlEncodedPayload}.hijk` });
        expect.fail();
      } catch(e: any) {
        expect(e.message).to.include('dereference a DID Document Verification Method');
      }
    });

    it('throws error if alg is not supported', async () => {
      const did = await DidKeyMethod.create({ keyAlgorithm: 'secp256k1' });
      const header: JwtHeader = { typ: 'JWT', alg: 'RS256', kid: did.document.verificationMethod![0].id };
      const base64UrlEncodedHeader = Convert.object(header).toBase64Url();

      const payload: JwtPayload = { iat: Math.floor(Date.now() / 1000) };
      const base64UrlEncodedPayload = Convert.object(payload).toBase64Url();

      try {
        await CompactJwt.verify({ compactJwt: `${base64UrlEncodedHeader}.${base64UrlEncodedPayload}.hijk` });
        expect.fail();
      } catch(e: any) {
        expect(e.message).to.include('not supported');
      }
    });

    it('returns signer DID if verification succeeds', async () => {
      const did = await DidKeyMethod.create({ keyAlgorithm: 'secp256k1' });
      const header: JwtHeader = { typ: 'JWT', alg: 'ES256K', kid: did.document.verificationMethod![0].id };
      const base64UrlEncodedHeader = Convert.object(header).toBase64Url();

      const payload: JwtPayload = { iat: Math.floor(Date.now() / 1000) };
      const base64UrlEncodedPayload = Convert.object(payload).toBase64Url();

      const toSign = `${base64UrlEncodedHeader}.${base64UrlEncodedPayload}`;
      const toSignBytes = Convert.string(toSign).toUint8Array();

      const privateKeyJwk = did.keySet.verificationMethodKeys![0].privateKeyJwk;

      const signatureBytes = await Secp256k1.sign({ key: privateKeyJwk as PrivateKeyJwk, data: toSignBytes });
      const base64UrlEncodedSignature = Convert.uint8Array(signatureBytes).toBase64Url();

      const compactJwt = `${toSign}.${base64UrlEncodedSignature}`;
      const { signerDid } = await CompactJwt.verify({ compactJwt });

      expect(signerDid).to.equal(did.did);
    });
  });
});