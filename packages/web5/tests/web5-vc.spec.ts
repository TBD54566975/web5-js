import { expect } from 'chai';

import * as testProfile from './fixtures/test-profiles.js';

import { VcApi, VcCreateRequest } from '../src/vc-api.js';
import { TestAgent, TestProfileOptions } from './test-utils/test-user-agent.js';

import jwt from 'jsonwebtoken';

let did: string;
let vcApi: VcApi;
let testAgent;
let testProfileOptions: TestProfileOptions;

describe('web5.vc', () => {
  before(async () => {
    testAgent = await TestAgent.create();
  });

  beforeEach(async () => {
    await testAgent.clearStorage();
    testProfileOptions = await testProfile.ion.with.dwn.service.and.authorization.keys();

    ({ did } = await testAgent.createProfile(testProfileOptions));

    vcApi = new VcApi(testAgent.agent, did);
  });

  after(async () => {
    await testAgent.clearStorage();
    await testAgent.closeStorage();
  });

  describe('verifiable credentials', () => {
    describe('create', () => {
      it('valid vc', async () => {
        const credentialSubject = {firstName: 'alice'};

        const vcCreateRequest: VcCreateRequest = { credentialSubject: credentialSubject, kid: testAgent.signKeyPair.privateKey.id};
        const result = await vcApi.create(vcCreateRequest);

        const resultRecord = await result.record?.data.text();
        const decodedVc = jwt.decode(resultRecord, { complete: true });

        expect(result.status.code).to.equal(202);
        expect(result.status.detail).to.equal('Accepted');
        expect(result.record).to.exist;
        expect(resultRecord).to.equal(result.vcJwt);
        expect(decodedVc.payload.vc.credentialSubject).to.deep.equal(credentialSubject);
      });

      it('simple schema string', async () => {
        const credentialSubject = {firstName: 'alice'};

        const vcCreateRequest: VcCreateRequest = { credentialSubject: credentialSubject, kid: testAgent.signKeyPair.privateKey.id,  credentialSchema: 'https://schema.org/Person'};
        const result = await vcApi.create(vcCreateRequest);

        const resultRecord = await result.record?.data.text();
        const decodedVc = jwt.decode(resultRecord, { complete: true });

        expect(result.status.code).to.equal(202);
        expect(decodedVc.payload.vc.credentialSchema).to.equal('https://schema.org/Person');
        expect(result.record?.schema).to.equal('https://schema.org/Person');
      });

      it('simple schema type', async () => {
        const credentialSubject = {firstName: 'alice'};

        const vcCreateRequest: VcCreateRequest = { credentialSubject: credentialSubject, kid: testAgent.signKeyPair.privateKey.id,  credentialSchema: {id: 'https://schema.org/Person', type: 'JsonSchemaValidator2018'}};
        const result = await vcApi.create(vcCreateRequest);

        const resultRecord = await result.record?.data.text();
        const decodedVc = jwt.decode(resultRecord, { complete: true });

        expect(result.status.code).to.equal(202);
        expect(decodedVc.payload.vc.credentialSchema).to.deep.equal({id: 'https://schema.org/Person', type: 'JsonSchemaValidator2018'});
        expect(result.record?.schema).to.equal('https://schema.org/Person');
      });

      it('invalid expiration date', async () => {
        const credentialSubject = {firstName: 'alice'};
        try {
          const vcCreateRequest: VcCreateRequest = { credentialSubject: credentialSubject, kid: testAgent.signKeyPair.privateKey.id, expirationDate: 'badexpirationdate'};
          await vcApi.create(vcCreateRequest);
          expect.fail();
        } catch(e) {
          expect(e.message).to.include('expirationDate not valid');
        }
      });

      it('invalid credential subject', async () => {
        const credentialSubject = 'badcredsubject';
        try {
          const vcCreateRequest: VcCreateRequest = { credentialSubject: credentialSubject, kid: testAgent.signKeyPair.privateKey.id};
          await vcApi.create(vcCreateRequest);
          expect.fail();
        } catch(e) {
          expect(e.message).to.include('credentialSubject not valid');
        }
      });
    });
  });
});