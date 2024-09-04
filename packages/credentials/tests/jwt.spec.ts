import type { JwtHeaderParams, JwtPayload, PrivateKeyJwk } from '@web5/crypto';

import { expect } from 'chai';
import { Convert } from '@web5/common';
import { Ed25519 } from '@web5/crypto';
import { DidDereferencingResult, DidDht, DidJwk, DidKey, PortableDid } from '@web5/dids';

import { Jwt } from '../src/jwt.js';
import JwtVerifyTestVector from '../../../web5-spec/test-vectors/vc_jwt/verify.json' assert { type: 'json' };
import JwtDecodeTestVector from '../../../web5-spec/test-vectors/vc_jwt/decode.json' assert { type: 'json' };
import { VerifiableCredential } from '../src/verifiable-credential.js';
import sinon from 'sinon';

describe('Jwt', () => {

  after(() => {
    sinon.restore();
  });

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
    it('successful verify with did:dht', async () => {
      const dereferenceStub = sinon.stub(Jwt.didResolver, 'dereference');

      const mockResult: DidDereferencingResult = {
        dereferencingMetadata: {
          contentType: 'application/did+json'
        },
        contentStream: {
          id           : 'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo#0',
          type         : 'JsonWebKey',
          controller   : 'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo',
          publicKeyJwk : {
            kty : 'OKP',
            crv : 'Ed25519',
            x   : 'VYKm2SCIV9Vz3BRy-v5R9GHz3EOJCPvZ1_gP1e3XiB0',
            kid : 'cyvOypa6k-4ffsRWcza37s5XVOh1kO9ICUeo1ZxHVM8',
            alg : 'EdDSA'
          }
        },
        contentMetadata: {}
      };

      dereferenceStub.resolves(mockResult);

      let portableDid : PortableDid = {
        uri      : 'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo',
        document : {
          id                 : 'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo',
          verificationMethod : [
            {
              id           : 'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo#0',
              type         : 'JsonWebKey',
              controller   : 'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo',
              publicKeyJwk : {
                crv : 'Ed25519',
                kty : 'OKP',
                x   : 'VYKm2SCIV9Vz3BRy-v5R9GHz3EOJCPvZ1_gP1e3XiB0',
                kid : 'cyvOypa6k-4ffsRWcza37s5XVOh1kO9ICUeo1ZxHVM8',
                alg : 'EdDSA'
              },
            },
          ],
          authentication: [
            'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo#0'
          ],
          assertionMethod: [
            'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo#0'
          ],
          capabilityDelegation: [
            'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo#0'
          ],
          capabilityInvocation: [
            'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo#0'
          ],
        },
        metadata: {
          types: [6, 7]
        },
        privateKeys: [
          {
            crv : 'Ed25519',
            d   : 'hdSIwbQwVD-fNOVEgt-k3mMl44Ip1iPi58Ex6VDGxqY',
            kty : 'OKP',
            x   : 'VYKm2SCIV9Vz3BRy-v5R9GHz3EOJCPvZ1_gP1e3XiB0',
            kid : 'cyvOypa6k-4ffsRWcza37s5XVOh1kO9ICUeo1ZxHVM8',
            alg : 'EdDSA',
          }
        ]
      };

      const bearerDid = await DidDht.import({ portableDid });

      const siopv2Response = {
        id_token: await Jwt.sign({
          signerDid : bearerDid,
          payload   : {
            iss   : bearerDid.uri,
            sub   : bearerDid.uri,
            aud   : 'did:dht:ho3axp5pgp4k8a7kqtb8knn5uaqwy9ghkm98wrytnh67bsn7ezry',
            nonce : 'd844f80d21c33ea6e087afa2b84dc31f',
            iat   : Math.floor(Date.now() / 1000),
            exp   : Math.floor(Date.now() / 1000) + (30 * 60), // plus 30 minutes
          }
        })
      };

      // Verify the JWT and make sure we get a result that it does not throw an error.
      const jwtVerifyResult = await Jwt.verify({ jwt: siopv2Response.id_token });

      expect(bearerDid.document?.verificationMethod?.[0]?.publicKeyJwk?.alg).to.equal('EdDSA');
      expect(jwtVerifyResult.header.alg).to.equal('EdDSA');

      dereferenceStub.restore();
    });

    it('throws error if JWT is expired', async () => {
      const did = await DidKey.create({ options: { algorithm: 'secp256k1'} });
      const header: JwtHeaderParams = { typ: 'JWT', alg: 'ES256K', kid: did.document.verificationMethod![0].id };
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

      const payload: JwtPayload = { iat: Math.floor(Date.now() / 1000), iss: did.uri, sub: did.uri };
      const base64UrlEncodedPayload = Convert.object(payload).toBase64Url();

      try {
        await Jwt.verify({ jwt: `${base64UrlEncodedHeader}.${base64UrlEncodedPayload}.hijk` });
        expect.fail();
      } catch(e: any) {
        expect(e.message).to.include('dereference a DID Document Verification Method');
      }
    });

    it('throws error if public key alg is not supported', async () => {
      const did = await DidJwk.create({ options: { algorithm: 'secp256k1'} });
      const header: JwtHeaderParams = { typ: 'JWT', alg: 'ES256', kid: did.document.verificationMethod![0].id };
      const base64UrlEncodedHeader = Convert.object(header).toBase64Url();

      const payload: JwtPayload = { iat: Math.floor(Date.now() / 1000), iss: did.uri, sub: did.uri };
      const base64UrlEncodedPayload = Convert.object(payload).toBase64Url();

      try {
        await Jwt.verify({ jwt: `${base64UrlEncodedHeader}.${base64UrlEncodedPayload}.hijk` });
        expect.fail();
      } catch(e: any) {
        expect(e.message).to.include('Verification failed: Expected alg in JWT header to match DID Document Verification Method alg');
      }
    });

    it('returns signer DID if verification succeeds', async () => {
      const portableDid: PortableDid = {
        uri      : 'did:key:z6MkkGkByH7rSY3uxDEPTk1CZzPG5hvf564ABFLQzCFwyYNN',
        document : {
          '@context'         : 'https://www.w3.org/ns/did/v1',
          id                 : 'did:key:z6MkkGkByH7rSY3uxDEPTk1CZzPG5hvf564ABFLQzCFwyYNN',
          verificationMethod : [
            {
              id           : 'did:key:z6MkkGkByH7rSY3uxDEPTk1CZzPG5hvf564ABFLQzCFwyYNN#z6MkkGkByH7rSY3uxDEPTk1CZzPG5hvf564ABFLQzCFwyYNN', // You may need to adjust the ID based on your requirements
              type         : 'JsonWebKey2020', // Adjust the type according to your needs, assuming JsonWebKey2020
              controller   : 'did:key:z6MkkGkByH7rSY3uxDEPTk1CZzPG5hvf564ABFLQzCFwyYNN',
              publicKeyJwk : {
                kty : 'OKP',
                crv : 'Ed25519',
                x   : 'VnSOQ-n7kRcYd0XGW2MNCv7DDY5py5XhNcjM7-Y1HVM',
              },
            },
          ],
          authentication: [
            'did:key:z6MkkGkByH7rSY3uxDEPTk1CZzPG5hvf564ABFLQzCFwyYNN#z6MkkGkByH7rSY3uxDEPTk1CZzPG5hvf564ABFLQzCFwyYNN',
          ],
          // Add other fields like assertionMethod, capabilityInvocation, etc., as needed
        },
        metadata    : {}, // Populate according to DidMetadata interface
        privateKeys : [
          {
            kty : 'OKP',
            crv : 'Ed25519',
            x   : 'VnSOQ-n7kRcYd0XGW2MNCv7DDY5py5XhNcjM7-Y1HVM',
            d   : 'iTD5DIOKZNkwgzsND-I8CLIXmgTxfQ1HUzl9fpMktAo',
          },
        ],
      };

      const did = await DidKey.import({ portableDid });

      const header: JwtHeaderParams = { typ: 'JWT', alg: 'EdDSA', kid: did.document.verificationMethod![0].id };
      const base64UrlEncodedHeader = Convert.object(header).toBase64Url();

      const payload: JwtPayload = { iat: Math.floor(Date.now() / 1000), iss: did.uri, sub: did.uri };
      const base64UrlEncodedPayload = Convert.object(payload).toBase64Url();

      const toSign = `${base64UrlEncodedHeader}.${base64UrlEncodedPayload}`;
      const toSignBytes = Convert.string(toSign).toUint8Array();

      const privateKeyJwk = portableDid.privateKeys![0];

      const signatureBytes = await Ed25519.sign({ key: privateKeyJwk as PrivateKeyJwk, data: toSignBytes });
      const base64UrlEncodedSignature = Convert.uint8Array(signatureBytes).toBase64Url();

      const jwt = `${toSign}.${base64UrlEncodedSignature}`;
      const verifyResult = await Jwt.verify({ jwt });

      expect(verifyResult.header).to.deep.equal(header);
      expect(verifyResult.payload).to.deep.equal(payload);
    });
  });

  describe('sign()', () => {
    it('allows typ to be set by caller', async () => {
      const did = await DidJwk.create();
      const signedJwt = await Jwt.sign({
        signerDid : did,
        payload   : {jti: 'hehe'},
        header    : {typ: 'openid4vci-proof+jwt'}
      });

      const parsed = Jwt.parse({ jwt: signedJwt });
      expect(parsed.decoded.header.typ).to.equal('openid4vci-proof+jwt');
    });
  });

  describe('Web5TestVectorsVcJwt', () => {
    it('decode', async () => {
      const vectors = JwtDecodeTestVector.vectors;

      for (const vector of vectors) {
        const { input, errors, errorMessage } = vector;

        if (errors) {
          let errorOccurred = false;
          try {
            VerifiableCredential.parseJwt({ vcJwt: input });
          } catch (e: any) {
            errorOccurred = true;
            expect(e.message).to.not.be.null;
            if(errorMessage && errorMessage['web5-js']) {
              expect(e.message).to.include(errorMessage['web5-js']);
            }
          }
          if (!errorOccurred) {
            throw new Error('Verification should have failed but didn\'t.');
          }
        } else {
          VerifiableCredential.parseJwt({ vcJwt: input });
        }
      }
    });

    it('verify', async () => {
      const vectors = JwtVerifyTestVector.vectors;

      for (const vector of vectors) {
        const { input, errors } = vector;

        if (errors) {
          let errorOccurred = false;
          try {
            await VerifiableCredential.verify({ vcJwt: input });
          } catch (e: any) {
            errorOccurred = true;
          }
          if (!errorOccurred) {
            throw new Error('Verification should have failed but didn\'t.');
          }
        } else {
          // Expecting successful verification
          await VerifiableCredential.verify({ vcJwt: input });
        }
      }
    });
  });
});