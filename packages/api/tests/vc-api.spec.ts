import { expect } from 'chai';
import { TestManagedAgent } from '@web5/agent';

import { VcApi } from '../src/vc-api.js';
import { TestUserAgent } from './utils/test-user-agent.js';
import { VerifiableCredential } from '@web5/credentials';

describe('VcApi', () => {
  let vc: VcApi;
  let testAgent: TestManagedAgent;
  let identityDid: string;

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

    identityDid = identity.did;
    // Instantiate VcApi.
    vc = new VcApi({ agent: testAgent.agent, connectedDid: identityDid });
  });

  after(async () => {
    await testAgent.clearStorage();
    await testAgent.closeStorage();
  });

  describe('create()', () => {
    it('returns a self signed vc', async () => {
      const vcJwt = await vc.create(identityDid, identityDid, 'ExampleDataType', {example: 'goodStuff'});

      expect(vcJwt).to.not.be.null;
      expect(vcJwt.split('.').length).to.equal(3);

      await expect(VerifiableCredential.verify(vcJwt)).to.be.fulfilled;
    });
  });
});