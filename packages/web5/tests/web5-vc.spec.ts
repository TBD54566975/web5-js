import { expect } from 'chai';

import * as testProfile from './fixtures/test-profiles.js';

import { VcApi } from '../src/vc-api.js';
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
        const result = await vcApi.create(credentialSubject);

        const resultRecord = await result.record?.data.text();
        const decoded = jwt.decode(resultRecord, { complete: true });

        expect(result.status.code).to.equal(202);
        expect(result.status.detail).to.equal('Accepted');
        expect(result.record).to.exist;
        // expect(resultRecord).to.deep.equal(result.vcJwt);
        // expect(decoded.payload.id).to.equal(result.vc.id);
        // expect(decoded.payload.credentialSubject).to.deep.equal(result.vc.credentialSubject);
        // expect(decoded.payload.issuer).to.deep.equal(result.vc.issuer);
      });

      it('invalid credential subject', async () => {
        const credentialSubject = 'badcredsubject';
        try {
          await vcApi.create(credentialSubject);
          expect.fail();
        } catch(e) {
          expect(e.message).to.include('credentialSubject not valid');
        }
      });
    });
  });
});