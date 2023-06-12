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

  describe('create', () => {
    it('is not implemented', async () => {
      try {
        await vc.create();
        expect.fail();
      } catch(e) {
        expect(e.message).to.include('Not implemented.');
      }
    });
  });
});