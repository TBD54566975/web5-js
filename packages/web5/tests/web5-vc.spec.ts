import { expect } from 'chai';

import * as testProfile from './fixtures/test-profiles.js';

import { VcApi } from '../src/vc-api.js';
import { TestAgent, TestProfileOptions } from './test-utils/test-user-agent.js';

let testAgent;
let vc: VcApi;
let did: string;
let testProfileOptions: TestProfileOptions;

describe('web5.vc', () => {
  before(async () => {
    testAgent = await TestAgent.create();
  });

  beforeEach(async () => {
    await testAgent.clearStorage();

    testProfileOptions = await testProfile.ion.with.dwn.service.and.authorization.keys();
    ({ did } = await testAgent.createProfile(testProfileOptions));
    vc = new VcApi(testAgent.agent, did);
  });

  after(async () => {
    await testAgent.clearStorage();
    await testAgent.closeStorage();
  });

  describe('verifiable credentials', () => {
    describe('create', () => {
      it('valid vc', async () => {
        const credentialSubject = {firstName: 'alice'};
        const result = await vc.create(credentialSubject);

        expect(result.status.code).to.equal(202);
        expect(result.status.detail).to.equal('Accepted');
        expect(result.record).to.exist;
        expect(await result.record?.data.json()).to.deep.equal(result.vc);
      });

      it('invalid credential subject', async () => {
        const credentialSubject = 'badcredsubject';
        try {
          await vc.create(credentialSubject);
          expect.fail();
        } catch(e) {
          expect(e.message).to.include('credentialSubject not valid');
        }
      });
    });
  });
});