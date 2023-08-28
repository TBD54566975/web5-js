import { expect } from 'chai';
import { VcJwt, VpJwt, EvaluationResults, VerifiableCredential} from '../src/types.js';
import {VC, VP, CreateVcOptions, CreateVpOptions, SignOptions} from '../src/ssi.js';
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

  beforeEach(async () => {
    alice = await DidKeyMethod.create();
    [signingKeyPair] = alice.keySet.verificationMethodKeys!;
    privateKey = (await Jose.jwkToKey({ key: signingKeyPair.privateKeyJwk!})).keyMaterial;
    kid = signingKeyPair.privateKeyJwk!.kid!;
    subjectIssuerDid = alice.did;
    signer = EdDsaSigner(privateKey);
  });

  describe('Verifiable Credential (VC)', () => {
    it('creates a VC JWT with CreateVCOptions', async () => {
      const vcCreateOptions: CreateVcOptions = {
        credentialSubject : { id: subjectIssuerDid, btcAddress: 'abc123' },
        issuer            : { id: subjectIssuerDid }
      };
      const vcSignOptions: SignOptions = {
        issuerDid  : alice.did,
        subjectDid : alice.did,
        kid        : kid,
        signer     : signer
      };

      const vcJwt: VcJwt = await VC.createVerifiableCredentialJwt(vcSignOptions, vcCreateOptions);
      expect(async () => await VC.verifyVerifiableCredentialJwt(vcJwt)).to.not.throw();
    });

    it('creates a VC JWT with a VC', async () => {
      const btcCredential: VerifiableCredential = {
        '@context'          : ['https://www.w3.org/2018/credentials/v1'],
        'id'                : 'btc-credential',
        'type'              : ['VerifiableCredential'],
        'issuer'            : alice.did,
        'issuanceDate'      : getCurrentXmlSchema112Timestamp(),
        'credentialSubject' : {
          'btcAddress': 'btcAddress123'
        }
      };

      const vcSignOptions: SignOptions = {
        issuerDid  : alice.did,
        subjectDid : alice.did,
        kid        : kid,
        signer     : signer
      };

      const vcJwt: VcJwt = await VC.createVerifiableCredentialJwt(vcSignOptions, undefined, btcCredential);
      expect(async () => await VC.verifyVerifiableCredentialJwt(vcJwt)).to.not.throw();
    });

    it('decodes a VC JWT', async () => {
      const vcCreateOptions: CreateVcOptions = {
        credentialSubject : { id: subjectIssuerDid, btcAddress: 'abc123' },
        issuer            : { id: subjectIssuerDid }
      };

      const vcSignOptions: SignOptions = {
        issuerDid  : alice.did,
        subjectDid : alice.did,
        kid        : kid,
        signer     : signer
      };

      const vcJwt: VcJwt = await VC.createVerifiableCredentialJwt(vcSignOptions, vcCreateOptions);
      const vcPayload = VC.decodeVerifiableCredentialJwt(vcJwt).payload.vc;

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
      const vcSignOptions: SignOptions = {
        issuerDid  : alice.did,
        subjectDid : alice.did,
        kid        : kid,
        signer     : signer
      };

      const vcJwt: VcJwt = await VC.createVerifiableCredentialJwt(vcSignOptions, vcCreateOptions);
      const vcPayload = VC.decodeVerifiableCredentialJwt(vcJwt).payload.vc;

      expect(() => VC.validateVerifiableCredentialPayload(vcPayload)).to.not.throw();
    });
  });

  describe('Verifiable Presentation (VP)', () => {
    let vcCreateOptions: CreateVcOptions;
    let signOptions: SignOptions;
    let vcJwt: VcJwt;

    beforeEach(async () => {
      vcCreateOptions = {credentialSubject: {id: subjectIssuerDid, btcAddress: 'abc123'}, issuer: {id: subjectIssuerDid}};
      signOptions = {issuerDid: alice.did, subjectDid: alice.did, kid: kid, signer: signer};
      vcJwt = await VC.createVerifiableCredentialJwt(signOptions, vcCreateOptions);
    });

    it('creates a VP JWT', async () => {
      const vpCreateOptions: CreateVpOptions = {
        presentationDefinition   : getPresentationDefinition(),
        verifiableCredentialJwts : [vcJwt]
      };

      const vpJwt: VpJwt = await VP.createVerifiablePresentationJwt(vpCreateOptions, signOptions);
      expect(vpJwt).to.exist;

      const decodedVp = VP.decodeVerifiablePresentationJwt(vpJwt);
      expect(decodedVp).to.have.property('header');
      expect(decodedVp).to.have.property('payload');
      expect(decodedVp).to.have.property('signature');
    });

    it('verifies a VP JWT', async () => {
      const vpCreateOptions: CreateVpOptions = {
        presentationDefinition   : getPresentationDefinition(),
        verifiableCredentialJwts : [vcJwt],
      };

      const vpJwt: VpJwt = await VP.createVerifiablePresentationJwt(vpCreateOptions, signOptions);
      expect(async () => await VP.verifyVerifiablePresentationJwt(vpJwt)).to.not.throw();
    });

    it('evaluates a VP', async () => {
      const vpCreateOptions: CreateVpOptions = {
        presentationDefinition   : getPresentationDefinition(),
        verifiableCredentialJwts : [vcJwt]
      };

      const vpJwt: VpJwt = await VP.createVerifiablePresentationJwt(vpCreateOptions, signOptions);
      const result: EvaluationResults = VP.evaluatePresentation(getPresentationDefinition(), VP.decodeVerifiablePresentationJwt(vpJwt).payload.vp);

      expect(result.warnings).to.be.an('array');
      expect(result.warnings!.length).to.equal(0);
      expect(result.errors).to.be.an('array');
      expect(result.errors!.length).to.equal(0);
    });

    it('evaluates an invalid VP with empty VCs', async () => {
      const vpCreateOptions: CreateVpOptions = {
        presentationDefinition   : getPresentationDefinition(),
        verifiableCredentialJwts : []
      };

      try {
        await VP.createVerifiablePresentationJwt(vpCreateOptions, signOptions);
      } catch (err: any) {
        expect(err).instanceOf(Error);
        expect(err!.message).to.equal('Failed to create Verifiable Presentation JWT due to: Required Credentials Not Present: "error"');
      }
    });

    it('evaluates an invalid VP with invalid subject', async () => {
      vcCreateOptions = {credentialSubject: {id: subjectIssuerDid, badSubject: 'abc123'}, issuer: {id: subjectIssuerDid}};
      signOptions = {issuerDid: alice.did, subjectDid: alice.did, kid: kid, signer: signer};
      vcJwt = await VC.createVerifiableCredentialJwt(signOptions, vcCreateOptions);

      const vpCreateOptions: CreateVpOptions = {
        presentationDefinition   : getPresentationDefinition(),
        verifiableCredentialJwts : [vcJwt]
      };

      try {
        await VP.createVerifiablePresentationJwt(vpCreateOptions, signOptions);
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
        await VP.createVerifiablePresentationJwt(vpCreateOptions, signOptions);
      } catch (err: any) {
        expect(err).instanceOf(Error);
        expect(err!.message).to.equal('Failed to create Verifiable Presentation JWT due to: Required Credentials Not Present: "error"Errors: [{"tag":"FilterEvaluation","status":"error","message":"Input candidate does not contain property: $.input_descriptors[0]: $.verifiableCredential[0]"},{"tag":"MarkForSubmissionEvaluation","status":"error","message":"The input candidate is not eligible for submission: $.input_descriptors[0]: $.verifiableCredential[0]"}]');
      }
    });
  });
});

function getPresentationDefinition() {
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