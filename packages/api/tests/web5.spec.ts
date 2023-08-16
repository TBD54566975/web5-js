import { expect } from 'chai';
import { TestManagedAgent } from '@web5/agent';

import { Web5 } from '../src/web5.js';
import { TestUserAgent } from './utils/test-user-agent.js';

describe('Web5', () => {
  let testAgent: TestManagedAgent;

  before(async () => {
    testAgent = await TestManagedAgent.create({
      agentClass  : TestUserAgent,
      agentStores : 'memory'
    });
  });

  beforeEach(async () => {
    await testAgent.clearStorage();
    await testAgent.createAgentDid();
  });

  after(async () => {
    await testAgent.clearStorage();
    await testAgent.closeStorage();
  });

  it('instantiates Web5 API with provided Web5Agent and connectedDid', async () => {
    // Create a new Identity.
    const socialIdentity = await testAgent.agent.identityManager.create({
      name      : 'Social',
      didMethod : 'key',
      kms       : 'local'
    });

    // Instantiates Web5 instance with test agent and new Identity's DID.
    const web5 = new Web5({ agent: testAgent.agent, connectedDid: socialIdentity.did });
    expect(web5).to.exist;
    expect(web5).to.have.property('did');
    expect(web5).to.have.property('dwn');
    expect(web5).to.have.property('vc');
  });
});