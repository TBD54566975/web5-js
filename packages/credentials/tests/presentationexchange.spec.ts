import { webcrypto } from 'node:crypto';
import { expect } from 'chai';
import { Encoder } from '@tbd54566975/dwn-sdk-js';
import { sha256 } from '@noble/hashes/sha256';
import { Web5 } from '@tbd54566975/web5';
import * as secp256k1 from '@noble/secp256k1';

import { PresentationDefinition, PresentationResult, VerifiableCredential, evaluateCredentials, evaluatePresentation, presentationFrom } from '../src/types.js';
import * as testProfile from '../../web5/tests/fixtures/test-profiles.js';
import { TestAgent } from '../../web5/tests/test-utils/test-user-agent.js';

import { SignatureInput } from '@tbd54566975/dwn-sdk-js';

// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;

let testAgent: TestAgent;

describe('Presentation Exchange Types', () => {
  before(async () => {
    testAgent = await TestAgent.create();
  });

  describe('Full Presentation Exchange', () => {
    let aliceSignatureMaterial : SignatureInput;
    let btcCredentialJwt: string;
    let aliceDid: string;
    let presentationDefinition: PresentationDefinition;
    let presentationResult: PresentationResult;

    before(async () => {
      const { web5, did } = await Web5.connect();
      aliceDid = did;
      aliceSignatureMaterial = await getSignatureMaterial(web5, aliceDid);
      btcCredentialJwt = await createBtcCredentialJwt(aliceDid, aliceSignatureMaterial);
      presentationDefinition = createPresentationDefinition();
    });

    it('evaluateCredentials should not return any errors', async () => {
      const evaluationResults = evaluateCredentials(presentationDefinition, [btcCredentialJwt]);

      expect(evaluationResults.errors).to.be.an('array');
      expect(evaluationResults.errors?.length).to.equal(0);
      expect(evaluationResults.warnings).to.be.an('array');
      expect(evaluationResults.warnings?.length).to.equal(0);
    });

    it('presentationFrom should return a valid PresentationResult', () => {
      presentationResult = presentationFrom(presentationDefinition, [btcCredentialJwt]);

      expect(presentationResult).to.exist;
      expect(presentationResult.presentationSubmission.definition_id).to.equal(presentationDefinition.id);
    });

    it('evaluatePresentation should not return any warnings or errors', async () => {
      const vpJwt = await createJwt({
        payload           : { vp: presentationResult.presentation },
        issuer            : aliceDid,
        subject           : aliceDid,
        signatureMaterial : aliceSignatureMaterial
      });

      const presentation = decodeJwt(vpJwt).payload.vp;

      const { warnings, errors } = evaluatePresentation(presentationDefinition,  presentation );

      expect(errors).to.be.an('array');
      expect(errors?.length).to.equal(0);

      expect(warnings).to.be.an('array');
      expect(warnings?.length).to.equal(0);
    });

    it('does a full presentation exchange', async () => {
      const evaluationResults = evaluateCredentials(presentationDefinition, [btcCredentialJwt]);

      expect(evaluationResults.errors).to.be.an('array');
      expect(evaluationResults.errors?.length).to.equal(0);
      expect(evaluationResults.warnings).to.be.an('array');
      expect(evaluationResults.warnings?.length).to.equal(0);

      presentationResult = presentationFrom(presentationDefinition, [btcCredentialJwt]);

      expect(presentationResult).to.exist;
      expect(presentationResult.presentationSubmission.definition_id).to.equal(presentationDefinition.id);

      const vpJwt = await createJwt({
        payload           : { vp: presentationResult.presentation },
        issuer            : aliceDid,
        subject           : aliceDid,
        signatureMaterial : aliceSignatureMaterial
      });

      const presentation = decodeJwt(vpJwt).payload.vp;

      const { warnings, errors } = evaluatePresentation(presentationDefinition,  presentation );

      expect(errors).to.be.an('array');
      expect(errors?.length).to.equal(0);

      expect(warnings).to.be.an('array');
      expect(warnings?.length).to.equal(0);
    });
  });
});
type CreateJwtOpts = {
  payload: any,
  subject: string
  issuer: string
  signatureMaterial: SignatureInput
}

async function getSignatureMaterial(web5: Web5, did: string): Promise<SignatureInput> {
  const testProfileOptions = await testProfile.ion.with.dwn.service.and.authorization.keys();
  const { did: newDid } = await testAgent.createProfile(testProfileOptions);

  const profile = await testAgent.getProfile(newDid || did);

  if (!profile) {
    throw new Error('profile not found for author.');
  }

  const { keys } = profile.did;
  const [ key ] = keys;
  const { privateKeyJwk } = key;

  const kid = key.id;

  return {
    privateJwk      : privateKeyJwk as any,
    protectedHeader : { alg: privateKeyJwk.crv, kid }
  };
}

async function createBtcCredentialJwt(aliceDid: string, aliceSignatureMaterial: SignatureInput) {
  const btcCredential: VerifiableCredential = {
    '@context'          : ['https://www.w3.org/2018/credentials/v1'],
    'id'                : 'btc-credential',
    'type'              : ['VerifiableCredential'],
    'issuer'            : aliceDid,
    'issuanceDate'      : new Date().toISOString(),
    'credentialSubject' : {
      'btcAddress': 'btcAddress123'
    }
  };

  return await createJwt({
    payload           : { vc: btcCredential },
    issuer            : aliceDid,
    subject           : aliceDid,
    signatureMaterial : aliceSignatureMaterial
  });
}

function createPresentationDefinition() {
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

function decodeJwt(jwt: string) {
  const [encodedHeader, encodedPayload, encodedSignature] = jwt.split('.');

  return {
    header  : Encoder.base64UrlToObject(encodedHeader),
    payload : Encoder.base64UrlToObject(encodedPayload),
    encodedSignature
  };
}

export async function createJwt(opts: CreateJwtOpts) {
  const jwtPayload = {
    iss : opts.issuer,
    sub : opts.subject,
    ...opts.payload,
  };

  const signatureMaterial = opts.signatureMaterial;

  const payloadBytes = Encoder.objectToBytes(jwtPayload);
  const payloadBase64url = Encoder.bytesToBase64Url(payloadBytes);

  const headerBytes = Encoder.objectToBytes(signatureMaterial.protectedHeader);
  const headerBase64url = Encoder.bytesToBase64Url(headerBytes);

  const signatureInput = `${headerBase64url}.${payloadBase64url}`;
  const signatureInputBytes = Encoder.stringToBytes(signatureInput);

  const hashedSignatureInputBytes = sha256(signatureInputBytes);
  const hashedSignatureInputHex = secp256k1.etc.bytesToHex(hashedSignatureInputBytes);

  const privateKeyBytes = Encoder.base64UrlToBytes(signatureMaterial.privateJwk.d);
  const privateKeyHex = secp256k1.etc.bytesToHex(privateKeyBytes);

  const signature = await secp256k1.signAsync(hashedSignatureInputHex, privateKeyHex);
  const signatureBytes = signature.toCompactRawBytes();
  const signatureBase64url = Encoder.bytesToBase64Url(signatureBytes);

  return `${headerBase64url}.${payloadBase64url}.${signatureBase64url}`;
}