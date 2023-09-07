import { expect } from 'chai';
import { VcJwt, VpJwt, VerifiableCredentialTypeV1, PresentationDefinition} from '../src/types.js';
import {VerifiableCredential, VerifiablePresentation, CreateVcOptions, CreateVpOptions, SignOptions} from '../src/ssi.js';
import { Ed25519, Jose } from '@web5/crypto';
import { DidKeyMethod } from '@web5/dids';
import { getCurrentXmlSchema112Timestamp } from '../src/utils.js';

type Signer = (data: Uint8Array) => Promise<Uint8Array>;

describe('SSI Tests', () => {
  let alice: any;
  let signingKeyPair: any;
  let privateKey: any;
  let kid: string;
  let subjectIssuerDid: string;
  let signer: Signer;
  let signOptions: SignOptions;

  beforeEach(async () => {
    alice = await DidKeyMethod.create();
    [signingKeyPair] = alice.keySet.verificationMethodKeys!;
    privateKey = (await Jose.jwkToKey({ key: signingKeyPair.privateKeyJwk!})).keyMaterial;
    kid = signingKeyPair.privateKeyJwk!.kid!;
    subjectIssuerDid = alice.did;
    signer = EdDsaSigner(privateKey);
    signOptions = {
      issuerDid  : alice.did,
      subjectDid : alice.did,
      kid        : kid,
      signer     : signer
    };
  });

  describe('Verifiable Credential (VC)', () => {
    it('creates a VC JWT with CreateVCOptions', async () => {
      const vcCreateOptions: CreateVcOptions = {
        credentialSubject : { id: subjectIssuerDid, btcAddress: 'abc123' },
        issuer            : { id: subjectIssuerDid }
      };

      const vcJwt: VcJwt = await VerifiableCredential.create(signOptions, vcCreateOptions);
      expect(async () => await VerifiableCredential.verify(vcJwt)).to.not.throw();
    });

    it('creates a VC JWT with VerifiableCredentialV1 type', async () => {
      const vc:VerifiableCredentialTypeV1 = {
        id                : 'id123',
        '@context'        : ['https://www.w3.org/2018/credentials/v1'],
        credentialSubject : { id: subjectIssuerDid, btcAddress: 'abc123' },
        type              : ['VerifiableCredential'],
        issuer            : { id: subjectIssuerDid },
        issuanceDate      : getCurrentXmlSchema112Timestamp(),
      };

      const vcJwt: VcJwt = await VerifiableCredential.create(signOptions, undefined, vc);
      expect(async () => await VerifiableCredential.verify(vcJwt)).to.not.throw();
    });

    it('fails to create a VC JWT with CreateVCOptions and VC', async () => {
      const vc:VerifiableCredentialTypeV1 = {
        id                : 'id123',
        '@context'        : ['https://www.w3.org/2018/credentials/v1'],
        credentialSubject : { id: subjectIssuerDid, btcAddress: 'abc123' },
        type              : ['VerifiableCredential'],
        issuer            : { id: subjectIssuerDid },
        issuanceDate      : getCurrentXmlSchema112Timestamp(),
      };

      const vcCreateOptions: CreateVcOptions = {
        credentialSubject : { id: subjectIssuerDid, btcAddress: 'abc123' },
        issuer            : { id: subjectIssuerDid }
      };

      await expectThrowsAsync(() =>  VerifiableCredential.create(signOptions, vcCreateOptions, vc), 'options and verifiableCredentials are mutually exclusive, either include the full verifiableCredential or the options to create one');
    });

    it('fails to create a VC JWT with no CreateVCOptions and no VC', async () => {
      await expectThrowsAsync(() =>  VerifiableCredential.create(signOptions, undefined, undefined), 'options or verifiableCredential must be provided');
    });

    it('creates a VC JWT with a VC', async () => {
      const btcCredential: VerifiableCredentialTypeV1 = {
        '@context'          : ['https://www.w3.org/2018/credentials/v1'],
        'id'                : 'btc-credential',
        'type'              : ['VerifiableCredential'],
        'issuer'            : alice.did,
        'issuanceDate'      : getCurrentXmlSchema112Timestamp(),
        'credentialSubject' : {
          'btcAddress': 'btcAddress123'
        }
      };

      const vcJwt: VcJwt = await VerifiableCredential.create(signOptions, undefined, btcCredential);
      expect(async () => await VerifiableCredential.verify(vcJwt)).to.not.throw();
    });

    it('fails to verify an invalid VC JWT', async () => {
      await expectThrowsAsync(() =>  VerifiableCredential.verify('invalid-jwt'), 'Incorrect format JWT');
    });

    it('decodes a VC JWT', async () => {
      const vcCreateOptions: CreateVcOptions = {
        credentialSubject : { id: subjectIssuerDid, btcAddress: 'abc123' },
        issuer            : { id: subjectIssuerDid }
      };

      const vcJwt: VcJwt = await VerifiableCredential.create(signOptions, vcCreateOptions);
      const vcPayload = VerifiableCredential.decode(vcJwt).payload.vc;

      expect(vcPayload).to.exist;
      expect(vcPayload.issuer).to.deep.equal({ id: alice.did });
      expect(vcPayload.type).to.deep.equal(['VerifiableCredential']);
      expect(vcPayload.credentialSubject).to.deep.equal({ id: alice.did, btcAddress: 'abc123' });
      expect(vcPayload['@context']).to.deep.equal(['https://www.w3.org/2018/credentials/v1']);
    });

    it('validates VC payload', async () => {
      const vcCreateOptions: CreateVcOptions = {
        credentialSubject : { id: subjectIssuerDid, btcAddress: 'abc123' },
        issuer            : { id: subjectIssuerDid }
      };

      const vcJwt: VcJwt = await VerifiableCredential.create(signOptions, vcCreateOptions);
      const vcPayload = VerifiableCredential.decode(vcJwt).payload.vc;

      expect(() => VerifiableCredential.validatePayload(vcPayload)).to.not.throw();
    });

    it('detects invalid issuer sign options', async () => {
      const vcCreateOptions: CreateVcOptions = {
        credentialSubject : { id: subjectIssuerDid, btcAddress: 'abc123' },
        issuer            : { id: subjectIssuerDid }
      };

      const vcSignOptions: SignOptions = {
        issuerDid  : 'bad:did',
        subjectDid : alice.did,
        kid        : kid,
        signer     : signer
      };

      const vcJwt: VcJwt = await VerifiableCredential.create(vcSignOptions, vcCreateOptions);
      await expectThrowsAsync(() =>  VerifiableCredential.verify(vcJwt), 'resolver_error: Unable to resolve DID document for bad:did: invalidDid');
    });
  });

  describe('Verifiable Presentation (VP)', () => {
    let vcCreateOptions: CreateVcOptions;
    let signOptions: SignOptions;
    let vcJwt: VcJwt;

    beforeEach(async () => {
      vcCreateOptions = {credentialSubject: {id: subjectIssuerDid, btcAddress: 'abc123'}, issuer: {id: subjectIssuerDid}};
      signOptions = {issuerDid: alice.did, subjectDid: alice.did, kid: kid, signer: signer};
      vcJwt = await VerifiableCredential.create(signOptions, vcCreateOptions);
    });

    it('creates a VP JWT', async () => {
      const vpCreateOptions: CreateVpOptions = {
        presentationDefinition   : getPresentationDefinition(),
        verifiableCredentialJwts : [vcJwt]
      };

      const vpJwt: VpJwt = await VerifiablePresentation.create(signOptions, vpCreateOptions);
      expect(vpJwt).to.exist;

      const decodedVp = VerifiablePresentation.decode(vpJwt);
      expect(decodedVp).to.have.property('header');
      expect(decodedVp).to.have.property('payload');
      expect(decodedVp).to.have.property('signature');
    });

    it('verifies a VP JWT', async () => {
      const vpCreateOptions: CreateVpOptions = {
        presentationDefinition   : getPresentationDefinition(),
        verifiableCredentialJwts : [vcJwt],
      };

      const vpJwt: VpJwt = await VerifiablePresentation.create(signOptions, vpCreateOptions);
      expect(async () => await VerifiablePresentation.verify(vpJwt)).to.not.throw();
    });

    it('evaluates an invalid VP with empty VCs', async () => {
      const vpCreateOptions: CreateVpOptions = {
        presentationDefinition   : getPresentationDefinition(),
        verifiableCredentialJwts : []
      };

      try {
        await VerifiablePresentation.create(signOptions, vpCreateOptions);
      } catch (err: any) {
        expect(err).instanceOf(Error);
        expect(err!.message).to.equal('Failed to create Verifiable Presentation JWT due to: Required Credentials Not Present: "error"');
      }
    });

    it('evaluates an invalid VP with invalid subject', async () => {
      vcCreateOptions = {credentialSubject: {id: subjectIssuerDid, badSubject: 'abc123'}, issuer: {id: subjectIssuerDid}};
      signOptions = {issuerDid: alice.did, subjectDid: alice.did, kid: kid, signer: signer};
      vcJwt = await VerifiableCredential.create(signOptions, vcCreateOptions);

      const vpCreateOptions: CreateVpOptions = {
        presentationDefinition   : getPresentationDefinition(),
        verifiableCredentialJwts : [vcJwt]
      };

      try {
        await VerifiablePresentation.create(signOptions, vpCreateOptions);
      } catch (err: any) {
        expect(err).instanceOf(Error);
        expect(err!.message).to.equal('Failed to create Verifiable Presentation JWT due to: Required Credentials Not Present: "error"Errors: [{"tag":"FilterEvaluation","status":"error","message":"Input candidate does not contain property: $.input_descriptors[0]: $.verifiableCredential[0]"},{"tag":"MarkForSubmissionEvaluation","status":"error","message":"The input candidate is not eligible for submission: $.input_descriptors[0]: $.verifiableCredential[0]"}]');
      }
    });

    it('evaluates an invalid VP with bad presentation definition', async () => {
      const presentationDefinition = getPresentationDefinition();
      presentationDefinition.input_descriptors[0].constraints!.fields![0].path = ['$.credentialSubject.badSubject'];

      const vpCreateOptions: CreateVpOptions = {
        presentationDefinition   : presentationDefinition,
        verifiableCredentialJwts : [vcJwt]
      };

      try {
        await VerifiablePresentation.create(signOptions, vpCreateOptions);
      } catch (err: any) {
        expect(err).instanceOf(Error);
        expect(err!.message).to.equal('Failed to create Verifiable Presentation JWT due to: Required Credentials Not Present: "error"Errors: [{"tag":"FilterEvaluation","status":"error","message":"Input candidate does not contain property: $.input_descriptors[0]: $.verifiableCredential[0]"},{"tag":"MarkForSubmissionEvaluation","status":"error","message":"The input candidate is not eligible for submission: $.input_descriptors[0]: $.verifiableCredential[0]"}]');
      }
    });

    it('evaluates an invalid VP with an invalid presentation definition', async () => {
      const presentationDefinition = getPresentationDefinition();
      presentationDefinition.frame = { '@id': 'this is not valid' };

      const vpCreateOptions: CreateVpOptions = {
        presentationDefinition   : presentationDefinition,
        verifiableCredentialJwts : [vcJwt]
      };

      try {
        await VerifiablePresentation.create(signOptions, vpCreateOptions);
      } catch (err: any) {
        expect(err).instanceOf(Error);
        expect(err!.message).to.equal('Failed to pass validation check due to: Validation Errors: [{"tag":"presentation_definition.frame","status":"error","message":"frame value is not valid"}]');
      }
    });
  });
});

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

function getPresentationDefinition(): PresentationDefinition {
  return {
    'id'                : 'test-pd-id',
    'name'              : 'simple PD',
    'purpose'           : 'pd for testing',
    'input_descriptors' : [
      {
        'id'          : 'whatever',
        'purpose'     : 'id for testing',
        'constraints' : {
          'fields': [
            {
              'path': [
                '$.credentialSubject.btcAddress',
              ]
            }
          ]
        }
      }
    ]
  };
}

function EdDsaSigner(privateKey: Uint8Array): Signer {
  return async (data: Uint8Array): Promise<Uint8Array> => {
    const signature = await Ed25519.sign({ data, key: privateKey});
    return signature;
  };
}