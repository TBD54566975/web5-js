import { expect } from 'chai';
import { TestManagedAgent } from '@web5/agent';

import { DidApi } from '../src/did-api.js';
import { TestUserAgent } from './utils/test-user-agent.js';

describe('DidApi', () => {
  let did: DidApi;
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

    // Instantiate DwnApi.
    did = new DidApi({ agent: testAgent.agent, connectedDid: identity.did });
  });

  after(async () => {
    await testAgent.clearStorage();
    await testAgent.closeStorage();
  });

  it('needs tests', () => {
    expect(did).to.exist;
  });
});