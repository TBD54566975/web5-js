import { expect } from 'chai';
import { VerifiableCredential, SignOptions } from '../src/verifiable-credential.js';
import { Ed25519, Jose } from '@web5/crypto';
import { DidDhtMethod, DidKeyMethod, PortableDid } from '@web5/dids';
import sinon from 'sinon';

type Signer = (data: Uint8Array) => Promise<Uint8Array>;

describe('Verifiable Credential Tests', () => {
  let signer: Signer;
  let signOptions: SignOptions;

  class StreetCredibility {
    constructor(
      public localRespect: string,
      public legit: boolean
    ) {}
  }

  beforeEach(async () => {
    const alice = await DidKeyMethod.create();
    const [signingKeyPair] = alice.keySet.verificationMethodKeys!;
    const privateKey = (await Jose.jwkToKey({ key: signingKeyPair.privateKeyJwk!})).keyMaterial;
    signer = EdDsaSigner(privateKey);
    signOptions = {
      issuerDid  : alice.did,
      subjectDid : alice.did,
      kid        : alice.did + '#' + alice.did.split(':')[2],
      signer     : signer
    };
  });

  describe('Verifiable Credential (VC)', () => {
    it('create vc works', async () => {
      // const keyManager = new InMemoryKeyManager();
      const issuerDid = signOptions.issuerDid;
      const subjectDid = signOptions.subjectDid;

      const vc = VerifiableCredential.create({
        type    : 'StreetCred',
        issuer  : issuerDid,
        subject : subjectDid,
        data    : new StreetCredibility('high', true),
      });

      expect(vc.issuer).to.equal(issuerDid);
      expect(vc.subject).to.equal(subjectDid);
      expect(vc.type).to.equal('StreetCred');
      expect(vc.vcDataModel.issuanceDate).to.not.be.undefined;
      expect(vc.vcDataModel.credentialSubject).to.deep.equal({ id: subjectDid, localRespect: 'high', legit: true });
    });

    it('should throw an error if data is not parseable into a JSON object', () => {
      const issuerDid = 'did:example:issuer';
      const subjectDid = 'did:example:subject';

      const invalidData = 'NotAJSONObject';

      expect(() => {
        VerifiableCredential.create({
          type    : 'InvalidDataTest',
          issuer  : issuerDid,
          subject : subjectDid,
          data    : invalidData
        });
      }).to.throw('Expected data to be parseable into a JSON object');
    });

    it('should throw an error if issuer or subject is not defined', () => {
      const issuerDid = 'did:example:issuer';
      const subjectDid = 'did:example:subject';
      const validData = new StreetCredibility('high', true);

      expect(() => {
        VerifiableCredential.create({
          type    : 'IssuerUndefinedTest',
          issuer  : '',
          subject : subjectDid,
          data    : validData
        });
      }).to.throw('Issuer and subject must be defined');

      expect(() => {
        VerifiableCredential.create({
          type    : 'SubjectUndefinedTest',
          issuer  : issuerDid,
          subject : '',
          data    : validData
        });
      }).to.throw('Issuer and subject must be defined');

    });

    it('signing vc works', async () => {
      const issuerDid = signOptions.issuerDid;
      const subjectDid = signOptions.subjectDid;

      const vc = VerifiableCredential.create({
        type    : 'StreetCred',
        issuer  : issuerDid,
        subject : subjectDid,
        data    : new StreetCredibility('high', true),
      });

      const vcJwt = await vc.sign(signOptions);
      expect(vcJwt).to.not.be.null;
      expect(vcJwt).to.be.a('string');

      const parts = vcJwt.split('.');
      expect(parts.length).to.equal(3);
    });

    it('parseJwt throws ParseException if argument is not a valid JWT', () => {
      expect(() => {
        VerifiableCredential.parseJwt('hi');
      }).to.throw('Not a valid jwt');
    });

    it('verify fails with bad issuer did', async () => {
      const vc = VerifiableCredential.create({
        type    : 'StreetCred',
        issuer  : 'bad:did: invalidDid',
        subject : signOptions.subjectDid,
        data    : new StreetCredibility('high', true)
      });

      const badSignOptions = {
        issuerDid  : 'bad:did: invalidDid',
        subjectDid : signOptions.subjectDid,
        kid        : signOptions.issuerDid + '#' + signOptions.issuerDid.split(':')[2],
        signer     : signer
      };

      const vcJwt = await vc.sign(badSignOptions);

      await expectThrowsAsync(() =>  VerifiableCredential.verify(vcJwt), 'Unable to resolve DID');
    });

    it('parseJwt checks if missing vc property', async () => {
      await expectThrowsAsync(() =>  VerifiableCredential.parseJwt('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'), 'Jwt payload missing vc property');
    });

    it('parseJwt returns an instance of VerifiableCredential on success', async () => {
      const vc = VerifiableCredential.create({
        type    : 'StreetCred',
        issuer  : signOptions.issuerDid,
        subject : signOptions.subjectDid,
        data    : new StreetCredibility('high', true),
      });

      const vcJwt = await vc.sign(signOptions);
      const parsedVc = VerifiableCredential.parseJwt(vcJwt);

      expect(parsedVc).to.not.be.null;
      expect(parsedVc.type).to.equal(vc.type);
      expect(parsedVc.issuer).to.equal(vc.issuer);
      expect(parsedVc.subject).to.equal(vc.subject);

      expect(vc.toString()).to.equal(parsedVc.toString());
    });

    it('fails to verify an invalid VC JWT', async () => {
      await expectThrowsAsync(() =>  VerifiableCredential.verify('invalid-jwt'), 'Not a valid jwt');
    });

    it('should throw an error if JWS header does not contain alg and kid', async () => {
      const invalidJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      await expectThrowsAsync(() =>  VerifiableCredential.verify(invalidJwt), 'Signature verification failed: Expected JWS header to contain alg and kid');
    });

    it('verify does not throw an exception with vaild vc', async () => {
      const vc = VerifiableCredential.create({
        type    : 'StreetCred',
        issuer  : signOptions.issuerDid,
        subject : signOptions.subjectDid,
        data    : new StreetCredibility('high', true),
      });

      const vcJwt = await vc.sign(signOptions);

      await VerifiableCredential.verify(vcJwt);
    });

    it('verify does not throw an exception with vaild vc signed by did:dht', async () => {
      const mockDocument: PortableDid = {
        keySet: {
          verificationMethodKeys: [
            {
              privateKeyJwk: {
                d       : '_8gihSI-m8aOCCM6jHg33d8kxdImPBN4C5_bZIu10XU',
                alg     : 'EdDSA',
                crv     : 'Ed25519',
                kty     : 'OKP',
                ext     : 'true',
                key_ops : [
                  'sign'
                ],
                x   : 'Qm88q6jAN9tfnrLt5V2zAiZs7wD_jnewHp7HIvM3dGo',
                kid : '0'
              },
              publicKeyJwk: {
                alg     : 'EdDSA',
                crv     : 'Ed25519',
                kty     : 'OKP',
                ext     : 'true',
                key_ops : [
                  'verify'
                ],
                x   : 'Qm88q6jAN9tfnrLt5V2zAiZs7wD_jnewHp7HIvM3dGo',
                kid : '0'
              },
              relationships: [
                'authentication',
                'assertionMethod',
                'capabilityInvocation',
                'capabilityDelegation'
              ]
            }
          ]

        },
        did      : 'did:dht:ejzu3k7eay57szh6sms6kzpuyeug35ay9688xcy6u5d1fh3zqtiy',
        document : {
          id                 : 'did:dht:ejzu3k7eay57szh6sms6kzpuyeug35ay9688xcy6u5d1fh3zqtiy',
          verificationMethod : [
            {
              id           : 'did:dht:ejzu3k7eay57szh6sms6kzpuyeug35ay9688xcy6u5d1fh3zqtiy#0',
              type         : 'JsonWebKey2020',
              controller   : 'did:dht:ejzu3k7eay57szh6sms6kzpuyeug35ay9688xcy6u5d1fh3zqtiy',
              publicKeyJwk : {
                crv : 'Ed25519',
                kty : 'OKP',
                alg : 'EdDSA',
                kid : '0',
                x   : 'Qm88q6jAN9tfnrLt5V2zAiZs7wD_jnewHp7HIvM3dGo'
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
        }
      };
      const didDhtCreateStub = sinon.stub(DidDhtMethod, 'create').resolves(mockDocument);

      const alice = await DidDhtMethod.create({ publish: true });

      const [signingKeyPair] = alice.keySet.verificationMethodKeys!;
      const privateKey = (await Jose.jwkToKey({ key: signingKeyPair.privateKeyJwk! })).keyMaterial;
      signer = EdDsaSigner(privateKey);
      signOptions = {
        issuerDid  : alice.did,
        subjectDid : alice.did,
        kid        : alice.did + '#0',
        signer     : signer
      };

      const vc = VerifiableCredential.create({
        type    : 'StreetCred',
        issuer  : signOptions.issuerDid,
        subject : signOptions.subjectDid,
        data    : new StreetCredibility('high', true),
      });

      const dhtDidResolutionSpy = sinon.stub(DidDhtMethod, 'resolve').resolves({
        '@context'  : 'https://w3id.org/did-resolution/v1',
        didDocument : {
          id                 : 'did:dht:ejzu3k7eay57szh6sms6kzpuyeug35ay9688xcy6u5d1fh3zqtiy',
          verificationMethod : [
            {
              id           : 'did:dht:ejzu3k7eay57szh6sms6kzpuyeug35ay9688xcy6u5d1fh3zqtiy#0',
              type         : 'JsonWebKey2020',
              controller   : 'did:dht:ejzu3k7eay57szh6sms6kzpuyeug35ay9688xcy6u5d1fh3zqtiy',
              publicKeyJwk : {
                crv : 'Ed25519',
                kty : 'OKP',
                alg : 'EdDSA',
                kid : '0',
                x   : 'Qm88q6jAN9tfnrLt5V2zAiZs7wD_jnewHp7HIvM3dGo'
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
          contentType : 'application/did+ld+json',
          did         : {
            didString        : 'did:dht:ejzu3k7eay57szh6sms6kzpuyeug35ay9688xcy6u5d1fh3zqtiy',
            methodSpecificId : 'ejzu3k7eay57szh6sms6kzpuyeug35ay9688xcy6u5d1fh3zqtiy',
            method           : 'dht'
          }
        }
      });

      const vcJwt = await vc.sign(signOptions);

      await VerifiableCredential.verify(vcJwt);

      expect(didDhtCreateStub.calledOnce).to.be.true;
      expect(dhtDidResolutionSpy.calledOnce).to.be.true;
      sinon.restore();
    });
  });
});

function EdDsaSigner(privateKey: Uint8Array): Signer {
  return async (data: Uint8Array): Promise<Uint8Array> => {
    const signature = await Ed25519.sign({ data, key: privateKey});
    return signature;
  };
}

const expectThrowsAsync = async (method: any, errorMessage: string) => {
  let error: any = null;
  try {
    await method();
  }
  catch (err) {
    error = err;
  }
  expect(error).to.be.an('Error');
  if (errorMessage) {
    expect(error.message).to.contain(errorMessage);
  }
};