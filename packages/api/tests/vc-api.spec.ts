import { expect } from 'chai';
import { Web5UserAgent } from '@web5/user-agent';
import { PlatformAgentTestHarness } from '@web5/agent';

import { VcApi } from '../src/vc-api.js';

describe('VcApi', () => {
  let vc: VcApi;
  let testHarness: PlatformAgentTestHarness;

  before(async () => {
    testHarness = await PlatformAgentTestHarness.setup({
      agentClass  : Web5UserAgent,
      agentStores : 'memory'
    });
  });

  beforeEach(async () => {
    await testHarness.clearStorage();
    await testHarness.createAgentDid();

    // Create a new Identity to author VC requests.
    const identity = await testHarness.agent.identity.create({
      metadata  : { name: 'Test' },
      didMethod : 'jwk',
    });

    // Instantiate VcApi.
    vc = new VcApi({ agent: testHarness.agent, connectedDid: identity.did.uri });
  });

  after(async () => {
    await testHarness.clearStorage();
    await testHarness.closeStorage();
  });

  describe('create()', () => {
    it('is not implemented', async () => {
      try {
        await vc.create();
        expect.fail('Expected method to throw, but it did not.');
      } catch(e) {
        expect(e.message).to.include('Not implemented.');
      }
    });
  });
});