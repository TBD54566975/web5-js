import { expect } from 'chai';
import { TestManagedAgent } from '@web5/agent';

import { VcApi } from '../src/vc-api.js';
import { TestUserAgent } from './utils/test-user-agent.js';

describe('VcApi', () => {
  let vc: VcApi;
  let testAgent: TestManagedAgent;

  before(async () => {
    testAgent = await TestManagedAgent.create({
      agentClass  : TestUserAgent,
      agentStores : 'memory'
    });
  });

  beforeEach(async () => {
    await testAgent.clearStorage();

    // Create an Agent DID.
    await testAgent.createAgentDid();

    // Create a new Identity to author DWN messages.
    const identity = await testAgent.agent.identityManager.create({
      name      : 'Test',
      didMethod : 'key',
      kms       : 'local'
    });

    // Instantiate VcApi.
    vc = new VcApi({ agent: testAgent.agent, connectedDid: identity.did });
  });

  after(async () => {
    await testAgent.clearStorage();
    await testAgent.closeStorage();
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