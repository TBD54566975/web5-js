import type { BearerDid, PortableDid } from '@web5/dids';

import sinon from 'sinon';
import { expect } from 'chai';
import { DidDht, DidKey, DidJwk } from '@web5/dids';

import { Jwt } from '../src/jwt.js';
import { VerifiableCredential } from '../src/verifiable-credential.js';
import CredentialsVerifyTestVector from '../../../web5-spec/test-vectors/credentials/verify.json' assert { type: 'json' };
import { getCurrentXmlSchema112Timestamp } from '../src/utils.js';

describe('Verifiable Credential Tests', () => {
  let issuerDid: BearerDid;

  class StreetCredibility {
    constructor(
      public localRespect: string,
      public legit: boolean
    ) {}
  }

  after(() => {
    sinon.restore();
  });

  beforeEach(async () => {
    issuerDid = await DidJwk.create();
  });

  describe('Verifiable Credential (VC)', () => {
    it('create vc works', async () => {
      const subjectDid = issuerDid.uri;

      const vc = await VerifiableCredential.create({
        type    : 'StreetCred',
        issuer  : issuerDid.uri,
        subject : subjectDid,
        data    : new StreetCredibility('high', true),
      });

      expect(vc.issuer).to.equal(issuerDid.uri);
      expect(vc.subject).to.equal(subjectDid);
      expect(vc.type).to.equal('StreetCred');
      expect(vc.vcDataModel.issuanceDate).to.not.be.undefined;
      expect(vc.vcDataModel.credentialSubject).to.deep.equal({ id: subjectDid, localRespect: 'high', legit: true });
    });

    it('create and sign vc with did:key', async () => {
      const did = await DidKey.create();

      const vc = await VerifiableCredential.create({
        type    : 'TBDeveloperCredential',
        subject : did.uri,
        issuer  : did.uri,
        data    : {
          username: 'nitro'
        }
      });

      const vcJwt = await vc.sign({ did });

      await VerifiableCredential.verify({ vcJwt });

      for( const currentVc of [vc, VerifiableCredential.parseJwt({ vcJwt })]){
        expect(currentVc.issuer).to.equal(did.uri);
        expect(currentVc.subject).to.equal(did.uri);
        expect(currentVc.type).to.equal('TBDeveloperCredential');
        expect(currentVc.vcDataModel.issuanceDate).to.not.be.undefined;
        expect(currentVc.vcDataModel.credentialSubject).to.deep.equal({ id: did.uri, username: 'nitro'});
      }
    });

    it('create and sign vc with did:jwk', async () => {
      const did = await DidJwk.create();

      const vc = await VerifiableCredential.create({
        type    : 'TBDeveloperCredential',
        subject : did.uri,
        issuer  : did.uri,
        data    : {
          username: 'nitro'
        }
      });

      const vcJwt = await vc.sign({ did });

      await VerifiableCredential.verify({ vcJwt });

      for( const currentVc of [vc, VerifiableCredential.parseJwt({ vcJwt })]){
        expect(currentVc.issuer).to.equal(did.uri);
        expect(currentVc.subject).to.equal(did.uri);
        expect(currentVc.type).to.equal('TBDeveloperCredential');
        expect(currentVc.vcDataModel.issuanceDate).to.not.be.undefined;
        expect(currentVc.vcDataModel.credentialSubject).to.deep.equal({ id: did.uri, username: 'nitro'});
      }
    });

    it('create and sign kyc vc with did:jwk', async () => {
      // KYC schema, also hosted here https://developer.tbd.website/schemas/kccSchema.json
      const kycSchema = {
        '$schema'    : 'http://json-schema.org/draft-07/schema#',
        'type'       : 'object',
        'properties' : {
          'credentialSubject': {
            'type'       : 'object',
            'properties' : {
              'id': {
                'type': 'string'
              },
              'countryOfResidence': {
                'type'    : 'string',
                'pattern' : '^[A-Z]{2}$'
              },
              'tier': {
                'type'     : 'string',
                'optional' : true
              }
            },
            'required': [
              'id',
              'countryOfResidence'
            ]
          },
          'issuer': {
            'type': 'string'
          },
          'issuanceDate': {
            'type'   : 'string',
            'format' : 'date-time'
          },
          'expirationDate': {
            'type'   : 'string',
            'format' : 'date-time'
          },
          'credentialSchema': {
            'type'       : 'object',
            'properties' : {
              'id': {
                'type'   : 'string',
                'format' : 'uri'
              },
              'type': {
                'type'  : 'string',
                'const' : 'JsonSchema'
              }
            },
            'required': [
              'id',
              'type'
            ]
          },
          'evidence': {
            'type'  : 'array',
            'items' : {
              'type'       : 'object',
              'properties' : {
                'kind': {
                  'type': 'string'
                },
                'checks': {
                  'type'  : 'array',
                  'items' : {
                    'type': 'string'
                  }
                }
              },
              'optional': true
            },
            'optional': true
          }
        },
        'required': [
          'credentialSubject',
          'issuer',
          'issuanceDate',
          'expirationDate',
          'credentialSchema'
        ]
      };

      // Setup stub for fetch
      const fetchStub = sinon.stub(globalThis, 'fetch');

      // Mock the schema fetch
      fetchStub.withArgs('https://schema.org/PFI').resolves(new Response(JSON.stringify(kycSchema), { status: 200 }));

      const subjectDid = await DidJwk.create();
      const issuerDid = await DidJwk.create();

      const issuanceDate = '2023-05-19T08:02:04Z';
      const expirationDate = '2055-05-19T08:02:04Z';
      const evidence = [
        { kind: 'document_verification', checks: ['passport', 'utility_bill'] },
        { kind: 'sanctions_check', checks: ['daily'] }
      ];
      const credentialSubject = { id: subjectDid.uri, countryOfResidence: 'US', tier: 'Tier 1' };
      const credentialSchema = { id: 'https://schema.org/PFI', type: 'JsonSchema' };

      const vc = await VerifiableCredential.create({
        type    : 'KnowYourCustomerCred',
        subject : subjectDid.uri,
        issuer  : issuerDid.uri,
        issuanceDate,
        expirationDate,
        data    : credentialSubject,
        credentialSchema,
        evidence
      });

      const vcJwt = await vc.sign({ did: issuerDid });

      await VerifiableCredential.verify({ vcJwt });

      const currentVc = VerifiableCredential.parseJwt({ vcJwt });

      expect(currentVc.issuer).to.equal(issuerDid.uri);
      expect(currentVc.subject).to.equal(subjectDid.uri);
      expect(currentVc.type).to.equal('KnowYourCustomerCred');
      expect(currentVc.vcDataModel.issuanceDate).to.equal(issuanceDate);
      expect(currentVc.vcDataModel.expirationDate).to.equal(expirationDate);
      expect(currentVc.vcDataModel.evidence).to.deep.equal(evidence);
      expect(currentVc.vcDataModel.credentialSubject).to.deep.equal(credentialSubject);
      expect(currentVc.vcDataModel.credentialSchema).to.deep.equal(credentialSchema);

      sinon.restore();
    });

    it('create and sign vc with did:dht', async () => {
      const did = await DidDht.create();

      const vc = await VerifiableCredential.create({
        type    : 'TBDeveloperCredential',
        subject : did.uri,
        issuer  : did.uri,
        data    : {
          username: 'nitro'
        }
      });

      const vcJwt = await vc.sign({ did });

      await VerifiableCredential.verify({ vcJwt });

      for (const currentVc of [vc, VerifiableCredential.parseJwt({ vcJwt })]){
        expect(currentVc.issuer).to.equal(did.uri);
        expect(currentVc.subject).to.equal(did.uri);
        expect(currentVc.type).to.equal('TBDeveloperCredential');
        expect(currentVc.vcDataModel.issuanceDate).to.not.be.undefined;
        expect(currentVc.vcDataModel.credentialSubject).to.deep.equal({ id: did.uri, username: 'nitro'});
      }
    });

    it('create and sign vc with evidence', async () => {
      const did = await DidJwk.create();

      const evidence = [{
        'id'               : 'https://example.edu/evidence/f2aeec97-fc0d-42bf-8ca7-0548192d4231',
        'type'             : ['DocumentVerification'],
        'verifier'         : 'https://example.edu/issuers/14',
        'evidenceDocument' : 'DriversLicense',
        'subjectPresence'  : 'Physical',
        'documentPresence' : 'Physical',
        'licenseNumber'    : '123AB4567'
      }];

      const vc = await VerifiableCredential.create({
        type    : 'TBDeveloperCredential',
        subject : did.uri,
        issuer  : did.uri,
        data    : {
          username: 'nitro'
        },
        evidence: evidence
      });

      expect(vc.vcDataModel.evidence).to.deep.equal(evidence);

      const vcJwt = await vc.sign({ did });

      await VerifiableCredential.verify({ vcJwt });

      for( const currentVc of [vc, VerifiableCredential.parseJwt({ vcJwt })]){
        expect(currentVc.issuer).to.equal(did.uri);
        expect(currentVc.subject).to.equal(did.uri);
        expect(currentVc.type).to.equal('TBDeveloperCredential');
        expect(currentVc.vcDataModel.issuanceDate).to.not.be.undefined;
        expect(currentVc.vcDataModel.credentialSubject).to.deep.equal({ id: did.uri, username: 'nitro'});
        expect(currentVc.vcDataModel.evidence).to.deep.equal(evidence);
      }
    });

    it('should throw an error if issuer is not string', async () => {
      const subjectDid = issuerDid.uri;

      const anyTypeIssuer: any = DidKey.create();

      try {
        await VerifiableCredential.create({
          type    : 'StreetCred',
          issuer  : anyTypeIssuer,
          subject : subjectDid,
          data    : new StreetCredibility('high', true),
        });
        expect.fail();
      } catch(e: any) {
        expect(e.message).to.include('Issuer and subject must be of type string');
      }
    });

    it('should throw and error if wrong issuer', async () => {
      const issuerDid = await DidKey.create();
      const vc = await VerifiableCredential.create({
        type    : 'StreetCred',
        issuer  : 'did:fakeissuer:123',
        subject : 'did:subject:123',
        data    : new StreetCredibility('high', true),
      });

      const vcJwt = await vc.sign({ did: issuerDid });

      try {
        await VerifiableCredential.verify({ vcJwt });
        expect.fail();
      } catch(e: any) {
        expect(e.message).to.include('Verification failed: iss claim does not match expected issuer');
      }
    });

    it('should throw an error if data is not parseable into a JSON object', async () => {
      const issuerDid = 'did:example:issuer';
      const subjectDid = 'did:example:subject';

      const invalidData = 'NotAJSONObject';

      try {
        await VerifiableCredential.create({
          type    : 'InvalidDataTest',
          issuer  : issuerDid,
          subject : subjectDid,
          data    : invalidData
        });
        expect.fail();
      } catch(e: any) {
        expect(e.message).to.include('Expected data to be parseable into a JSON object');
      }
    });

    it('should throw an error if issuer or subject is not defined', async () => {
      const issuerDid = 'did:example:issuer';
      const subjectDid = 'did:example:subject';
      const validData = new StreetCredibility('high', true);

      try {
        await VerifiableCredential.create({
          type    : 'IssuerUndefinedTest',
          issuer  : '',
          subject : subjectDid,
          data    : validData
        });
        expect.fail();
      } catch(e: any) {
        expect(e.message).to.include('Issuer and subject must be defined');
      }

      try {
        await VerifiableCredential.create({
          type    : 'SubjectUndefinedTest',
          issuer  : issuerDid,
          subject : '',
          data    : validData
        });
        expect.fail();
      } catch(e: any) {
        expect(e.message).to.include('Issuer and subject must be defined');
      }
    });

    it('signing with Ed25519 key works', async () => {
      const subjectDid = issuerDid.uri;

      const vc = await VerifiableCredential.create({
        type    : 'StreetCred',
        issuer  : issuerDid.uri,
        subject : subjectDid,
        data    : new StreetCredibility('high', true),
      });

      const vcJwt = await vc.sign({did: issuerDid});
      expect(vcJwt).to.not.be.null;
      expect(vcJwt).to.be.a('string');

      const parts = vcJwt.split('.');
      expect(parts.length).to.equal(3);
    });

    it('signing with secp256k1 key works', async () => {
      const did = await DidKey.create({ options: { algorithm: 'secp256k1'} });

      const vc = await VerifiableCredential.create({
        type    : 'StreetCred',
        issuer  : did.uri,
        subject : did.uri,
        data    : new StreetCredibility('high', true),
      });

      const vcJwt = await vc.sign({ did });
      expect(vcJwt).to.not.be.null;
      expect(vcJwt).to.be.a('string');

      const parts = vcJwt.split('.');
      expect(parts.length).to.equal(3);
    });

    it('parseJwt throws ParseException if argument is not a valid JWT', async () => {
      expect(() =>
        VerifiableCredential.parseJwt({ vcJwt: 'hi' })
      ).to.throw('Malformed JWT');
    });

    it('parseJwt checks if missing vc property', async () => {
      const did = await DidKey.create();

      const jwt = await Jwt.sign({
        signerDid : did,
        payload   : {
          iss : did.uri,
          sub : did.uri
        }
      });

      expect(() =>
        VerifiableCredential.parseJwt({ vcJwt: jwt })
      ).to.throw('Jwt payload missing vc property');
    });

    it('parseJwt returns an instance of VerifiableCredential on success', async () => {
      const vc = await VerifiableCredential.create({
        type    : 'StreetCred',
        issuer  : issuerDid.uri,
        subject : issuerDid.uri,
        data    : new StreetCredibility('high', true),
      });

      const vcJwt = await vc.sign({did: issuerDid});
      const parsedVc = VerifiableCredential.parseJwt({ vcJwt });

      expect(parsedVc).to.not.be.null;
      expect(parsedVc.type).to.equal(vc.type);
      expect(parsedVc.issuer).to.equal(vc.issuer);
      expect(parsedVc.subject).to.equal(vc.subject);

      expect(vc.toString()).to.equal(parsedVc.toString());
    });

    it('fails to verify an invalid VC JWT', async () => {
      try {
        await VerifiableCredential.verify({ vcJwt: 'invalid-jwt' });
        expect.fail();
      } catch(e: any) {
        expect(e.message).to.include('Malformed JWT');
      }
    });

    it('should throw an error if JWS header does not contain alg and kid', async () => {
      const invalidJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      try {
        await VerifiableCredential.verify({ vcJwt: invalidJwt });
        expect.fail();
      } catch(e: any) {
        expect(e.message).to.include('to contain alg and kid');
      }
    });

    it('verify does not throw an exception with valid vc', async () => {
      const vc = await VerifiableCredential.create({
        type    : 'StreetCred',
        issuer  : issuerDid.uri,
        subject : issuerDid.uri,
        data    : new StreetCredibility('high', true),
      });

      const vcJwt = await vc.sign({did: issuerDid});

      const { issuer, subject, vc: credential } = await VerifiableCredential.verify({ vcJwt });
      expect(issuer).to.equal(issuerDid.uri);
      expect(subject).to.equal(issuerDid.uri);
      expect(credential).to.not.be.null;
    });

    it('verify throws exception if vc property does not exist', async () => {
      const did = await DidKey.create();

      const jwt = await Jwt.sign({
        payload   : { jti: 'hi', iss: did.uri, sub: did.uri },
        signerDid : did
      });

      try {
        await VerifiableCredential.verify({ vcJwt: jwt });
      } catch(e: any) {
        expect(e.message).to.include('vc property missing');
      }
    });

    it('verify works with RFC3339 vcjwt', async () => {
      const didIssuer = await DidKey.create();
      const didSubject = await DidKey.create();

      const vc = await VerifiableCredential.create({
        type         : 'TBDeveloperCredential',
        subject      : didSubject.uri,
        issuer       : didIssuer.uri,
        issuanceDate : new Date().toISOString(),
        data         : {
          username: 'nitro'
        }
      });

      const vcJwt = await vc.sign({ did: didIssuer });
      await VerifiableCredential.verify({ vcJwt });
    });

    it('verify works with XmlSchema112 vcjwt', async () => {
      const didIssuer = await DidKey.create();
      const didSubject = await DidKey.create();

      const vc = await VerifiableCredential.create({
        type         : 'TBDeveloperCredential',
        subject      : didSubject.uri,
        issuer       : didIssuer.uri,
        issuanceDate : getCurrentXmlSchema112Timestamp(),
        data         : {
          username: 'nitro'
        }
      });

      const vcJwt = await vc.sign({ did: didIssuer });
      await VerifiableCredential.verify({ vcJwt });
    });

    it('create throws with with invalid issuance date vcjwt', async () => {
      const didIssuer = await DidKey.create();
      const didSubject = await DidKey.create();

      try {
        await VerifiableCredential.create({
          type         : 'TBDeveloperCredential',
          subject      : didSubject.uri,
          issuer       : didIssuer.uri,
          issuanceDate : 'July 20, 2024, 15:45:30 GMT+02:00',
          data         : {
            username: 'nitro'
          }
        });
        expect.fail();
      } catch(e: any) {
        expect(e).to.not.be.null;
        expect(e.message).to.include('timestamp is not valid');
      }
    });

    it('verify throws exception if vc property is invalid', async () => {
      const did = await DidKey.create();

      const jwt = await Jwt.sign({
        payload   : { vc: 'hi' },
        signerDid : did
      });

      try {
        await VerifiableCredential.verify({ vcJwt: jwt });
        expect.fail();
      } catch(e: any) {
        expect(e).to.not.be.null;
      }
    });

    it('verify does not throw an exception with vaild vc signed by did:dht', async () => {
      const portableDid: PortableDid = {
        uri      : 'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo',
        document : {
          '@context'         : 'https://www.w3.org/ns/did/v1',
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
                alg : 'EdDSA',
              },
            },
          ],
          authentication       : ['did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo#0'],
          assertionMethod      : ['did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo#0'],
          capabilityDelegation : ['did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo#0'],
          capabilityInvocation : ['did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo#0'],
        },
        metadata    : {},
        privateKeys : [
          {
            crv : 'Ed25519',
            d   : 'hdSIwbQwVD-fNOVEgt-k3mMl44Ip1iPi58Ex6VDGxqY',
            kty : 'OKP',
            x   : 'VYKm2SCIV9Vz3BRy-v5R9GHz3EOJCPvZ1_gP1e3XiB0',
            kid : 'cyvOypa6k-4ffsRWcza37s5XVOh1kO9ICUeo1ZxHVM8',
            alg : 'EdDSA',
          },
        ],
      };

      const bearerDid = await DidDht.import({ portableDid });

      const didDhtCreateStub = sinon.stub(DidDht, 'create').resolves(bearerDid);

      const alice = await DidDht.create({options: { publish: true }});

      const vc = await VerifiableCredential.create({
        type    : 'StreetCred',
        issuer  : alice.uri,
        subject : alice.uri,
        data    : new StreetCredibility('high', true),
      });

      const dhtDidResolutionSpy = sinon.stub(DidDht, 'resolve').resolves({
        '@context'  : 'https://w3id.org/did-resolution/v1',
        didDocument : {
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
                alg : 'EdDSA',
              }
            }
          ],
          authentication: [
            '#0'
          ],
          assertionMethod: [
            '#0'
          ],
          capabilityInvocation: [
            '#0'
          ],
          capabilityDelegation: [
            '#0'
          ]
        },
        didDocumentMetadata   : {},
        didResolutionMetadata : {
          did: {
            didString        : 'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo',
            methodSpecificId : 'ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo',
            method           : 'dht'
          }
        }
      });

      const vcJwt = await vc.sign({did: alice});

      await VerifiableCredential.verify({ vcJwt });

      expect(didDhtCreateStub.calledOnce).to.be.true;
      expect(dhtDidResolutionSpy.calledOnce).to.be.true;
      sinon.restore();
    });
  });

  describe('Web5TestVectorsCredentials', () => {
    it('verify', async () => {
      const vectors = CredentialsVerifyTestVector.vectors;

      for (const vector of vectors) {
        const { input, errors } = vector;

        if (errors) {
          let errorOccurred = false;
          try {
            await VerifiableCredential.verify({ vcJwt: input.vcJwt });
          } catch (e: any) {
            errorOccurred = true;
            expect(e.message).to.not.be.null;
          }
          if (!errorOccurred) {
            throw new Error('Verification should have failed but didn\'t.');
          }
        } else {
          // Expecting successful verification
          await VerifiableCredential.verify({ vcJwt: input.vcJwt });
        }
      }
    });
  });
});