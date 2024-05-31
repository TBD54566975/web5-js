import type { JwtHeaderParams, JwtPayload, PrivateKeyJwk } from '@web5/crypto';

import { expect } from 'chai';
import { Convert } from '@web5/common';
import { Ed25519 } from '@web5/crypto';
import { DidDht, DidJwk, DidKey, PortableDid, UniversalResolver } from '@web5/dids';

import { Jwt } from '../src/jwt.js';
import JwtVerifyTestVector from '../../../web5-spec/test-vectors/vc_jwt/verify.json' assert { type: 'json' };
import JwtDecodeTestVector from '../../../web5-spec/test-vectors/vc_jwt/decode.json' assert { type: 'json' };
import { VerifiableCredential } from '../src/verifiable-credential.js';
import sinon from 'sinon';

// Helper function to create a mocked fetch response that is successful and returns the given
// response.
const fetchOkResponse = (response?: any) => ({
  status      : 200,
  statusText  : 'OK',
  ok          : true,
  arrayBuffer : async () => Promise.resolve(response)
});

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

    let fetchStub: sinon.SinonStub;

    beforeEach(() => {
      // Setup stub so that a mocked response is returned rather than calling over the network.
      fetchStub = sinon.stub(globalThis as any, 'fetch');

      // By default, return a 200 OK response when fetch is called by publish().
      fetchStub.resolves(fetchOkResponse());
    });

    afterEach(() => {
      fetchStub.restore();
    });

    it('successful verify with did:dht', async () => {
      const hexString =
        '0ab2b3386e22595e1271e7ef67fda70c37acf7d28b8c884a6fdcbb0ea739f341' +
        'fd5785483c3ea894f44c66c486c74a59326cda93d75aa71cd3846bc85fa9d60b' +
        '0000000065b2349c000084000000000300000000035f6b30045f646964346b73' +
        '626b70736a7974626d376b6836686e7433786939317436746f39387a6e647472' +
        '72787a73717a397938376d35717a7479716f000010000100001c200037366964' +
        '3d303b743d303b6b3d56594b6d325343495639567a334252792d763552394748' +
        '7a33454f4a4350765a315f675031653358694230045f747970045f646964346b' +
        '73626b70736a7974626d376b6836686e7433786939317436746f39387a6e6474' +
        '7272787a73717a397938376d35717a7479716f000010000100001c2000070669' +
        '643d372c36045f646964346b73626b70736a7974626d376b6836686e74337869' +
        '39317436746f39387a6e64747272787a73717a397938376d35717a7479716f00' +
        '0010000100001c20002726763d303b766d3d6b303b617574683d6b303b61736d' +
        '3d6b303b64656c3d6b303b696e763d6b30';

      // Mock the response from the Pkarr relay rather than calling over the network.
      fetchStub.resolves(fetchOkResponse(
        Convert.hex(hexString).toArrayBuffer()
      ));

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
      const result = await DidDht.resolve(`${bearerDid.uri}#0`);

      const siopv2Response = {
        id_token: await Jwt.sign({
          signerDid: bearerDid,
          payload: {
            iss: bearerDid.uri,
            sub: bearerDid.uri,
            aud: 'did:dht:ho3axp5pgp4k8a7kqtb8knn5uaqwy9ghkm98wrytnh67bsn7ezry',
            nonce: 'd844f80d21c33ea6e087afa2b84dc31f',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (30 * 60), // plus 30 minutes
          }
        })
      }

      // Verify the JWT and make sure we get a result that it does not throw an error.
      const jwtVerifyResult = await Jwt.verify({ jwt: siopv2Response.id_token });

      expect(bearerDid.document?.verificationMethod?.[0]?.publicKeyJwk?.alg).to.equal('EdDSA');
      expect(result.didDocument?.verificationMethod?.[0]?.publicKeyJwk?.alg).to.equal('EdDSA');
      expect(jwtVerifyResult.header.alg).to.equal('EdDSA');
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