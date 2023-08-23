import type { PresentationDefinition, PresentationResult } from '../src/types.js';

import { expect } from 'chai';
import { Encoder } from '@tbd54566975/dwn-sdk-js';

import { TestAgent } from '../../agent/tests/utils/test-agent.js';
import { TestManagedAgent } from '../../agent/src/test-managed-agent.js';
import { VerifiableCredential, evaluateCredentials, evaluatePresentation, presentationFrom } from '../src/types.js';

let testAgent: TestManagedAgent;

describe('PresentationExchange', () => {
  before(async () => {
    testAgent = await TestManagedAgent.create({
      agentClass  : TestAgent,
      agentStores : 'dwn'
    });

    await testAgent.createAgentDid();
  });

  describe('Full Presentation Exchange', () => {
    let aliceDid: string;
    let btcCredentialJwt: string;
    let presentationDefinition: PresentationDefinition;
    let presentationResult: PresentationResult;

    before(async () => {
      aliceDid = testAgent.agent.agentDid!;

      btcCredentialJwt = await createBtcCredentialJwt(aliceDid);
      presentationDefinition = createPresentationDefinition();
    });

    after(async () => {
      await testAgent.clearStorage();
      await testAgent.closeStorage();
    });

    it('should evaluate credentials without any errors or warnings', async () => {
      const evaluationResults = evaluateCredentials(presentationDefinition, [btcCredentialJwt]);

      expect(evaluationResults.errors).to.be.an('array');
      expect(evaluationResults.errors?.length).to.equal(0);
      expect(evaluationResults.warnings).to.be.an('array');
      expect(evaluationResults.warnings?.length).to.equal(0);
    });

    it('should successfully create a presentation from the given definition and credentials', () => {
      presentationResult = presentationFrom(presentationDefinition, [btcCredentialJwt]);

      expect(presentationResult).to.exist;
      expect(presentationResult.presentationSubmission.definition_id).to.equal(presentationDefinition.id);
    });

    it('should evaluate the presentation without any errors or warnings', async () => {
      const vpJwt = await createJwt({
        payload : { vp: presentationResult.presentation },
        issuer  : aliceDid,
        subject : aliceDid
      });

      const presentation = decodeJwt(vpJwt).payload.vp;

      const { warnings, errors } = evaluatePresentation(presentationDefinition,  presentation );

      expect(errors).to.be.an('array');
      expect(errors?.length).to.equal(0);

      expect(warnings).to.be.an('array');
      expect(warnings?.length).to.equal(0);
    });

    it('should successfully execute the complete presentation exchange flow', async () => {
      const evaluationResults = evaluateCredentials(presentationDefinition, [btcCredentialJwt]);

      expect(evaluationResults.errors).to.be.an('array');
      expect(evaluationResults.errors?.length).to.equal(0);
      expect(evaluationResults.warnings).to.be.an('array');
      expect(evaluationResults.warnings?.length).to.equal(0);

      presentationResult = presentationFrom(presentationDefinition, [btcCredentialJwt]);

      expect(presentationResult).to.exist;
      expect(presentationResult.presentationSubmission.definition_id).to.equal(presentationDefinition.id);

      const vpJwt = await createJwt({
        payload : { vp: presentationResult.presentation },
        issuer  : aliceDid,
        subject : aliceDid
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
}

async function createBtcCredentialJwt(aliceDid: string) {
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
    payload : { vc: btcCredential },
    issuer  : aliceDid,
    subject : aliceDid
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

async function createJwt(opts: CreateJwtOpts) {
  const keyRef = await testAgent.agent.didManager.getDefaultSigningKey({ did: testAgent.agent.agentDid! });
  const header = { alg: 'EdDSA', kid: keyRef };

  const jwtPayload = {
    iss : opts.issuer,
    sub : opts.subject,
    ...opts.payload,
  };

  const headerBytes = Encoder.objectToBytes(header);
  const encodedHeader = Encoder.bytesToBase64Url(headerBytes);

  const payloadBytes = Encoder.objectToBytes(jwtPayload);
  const encodedPayload = Encoder.bytesToBase64Url(payloadBytes);

  const message = encodedHeader + '.' + encodedPayload;

  const signature = await testAgent.agent.keyManager.sign({
    algorithm : { name: 'EdDSA', hash: 'SHA-256' },
    keyRef    : keyRef!,
    data      : Encoder.stringToBytes(message)
  });

  const encodedSignature = Encoder.bytesToBase64Url(signature);
  const jwt = message + '.' + encodedSignature;

  return jwt;
}