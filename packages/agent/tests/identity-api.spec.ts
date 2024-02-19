import { expect } from 'chai';

import { TestAgent } from './utils/test-agent.js';
import { AgentIdentityApi } from '../src/identity-api.js';
import { ManagedAgentTestHarness } from '../src/test-harness.js';

describe('AgentIdentityApi', () => {

  describe('constructor', () => {
    it('returns instance if no parameters are given', () => {
      expect(
        new AgentIdentityApi()
      ).to.not.throw;
    });
  });

  describe('get agent', () => {
    it(`returns the 'agent' instance property`, async () => {
      // @ts-expect-error because we are only mocking a single property.
      const mockAgent: Web5PlatformAgent = {
        agentDid: 'did:method:abc123'
      };
      const identityApi = new AgentIdentityApi({ agent: mockAgent });
      const agent = identityApi.agent;
      expect(agent).to.exist;
      expect(agent.agentDid).to.equal('did:method:abc123');
    });

    it(`throws an error if the 'agent' instance property is undefined`, () => {
      const identityApi = new AgentIdentityApi();
      expect(() =>
        identityApi.agent
      ).to.throw(Error, 'Unable to determine agent execution context');
    });
  });

  // Run tests for each supported data store type.
  const agentStoreTypes = ['dwn'] as const;
  // const agentStoreTypes = ['dwn', 'memory'] as const;
  // agentStoreTypes.forEach((agentStoreType) => {
  for (const agentStoreType of agentStoreTypes) {

    describe(`with ${agentStoreType} DID store`, () => {
      let testHarness: ManagedAgentTestHarness;

      before(async () => {
        testHarness = await ManagedAgentTestHarness.setup({
          agentClass  : TestAgent,
          agentStores : agentStoreType
        });
        // });

        // beforeEach(async () => {
        await testHarness.clearStorage();
        await testHarness.createAgentDid();
      });

      after(async () => {
        await testHarness.clearStorage();
        await testHarness.closeStorage();
      });

      describe('create()', () => {
        it('creates and returns an Identity', async () => {

          // Generate a new Identity.
          const identity = await testHarness.agent.identity.create({
            metadata   : { name: 'Test Identity' },
            didMethod  : 'jwk',
            didOptions : {
              verificationMethods: [{
                algorithm: 'Ed25519'
              }]
            }
          });

          // Verify the result.
          expect(identity).to.have.property('did');
          expect(identity).to.have.property('metadata');
        });
      });

      describe('import()' , () => {
        it('handles importing only the Identity Metadata to Agent tenant', async () => {
          // Create a new Identity, which by default is stored under the tenant of the created DID.
          const identity = await testHarness.agent.identity.create({
            didMethod : 'jwk',
            metadata  : { name: 'Test Identity' },
          });

          // Attempt to import just the Identity Metadata (no PortableDid) to the Agent's tenant.
          const managedIdentity = await testHarness.agent.identity.manage({
            portableIdentity: await identity.export()
          });
          expect(managedIdentity).to.deep.equal(identity);

          // Verify that the Identity Metadata is stored under the Agent's tenant.
          let storedIdentity = await testHarness.agent.identity.get({ didUri: identity.did.uri });
          expect(storedIdentity).to.exist;

          // Verify that the Identity is also stored under the new Identity's tenant.
          storedIdentity = await testHarness.agent.identity.get({ didUri: identity.did.uri, tenant: identity.did.uri });
          expect(storedIdentity).to.exist;

          // Verify the DID ONLY exists under the new Identity's tenant.
          let storedDidAgent = await testHarness.agent.did.get({ didUri: identity.did.uri });
          expect(storedDidAgent).to.not.exist;
          let storedDidNewIdentity = await testHarness.agent.did.get({ didUri: identity.did.uri, tenant: identity.did.uri });
          expect(storedDidNewIdentity).to.exist;
        });
      });
    });
  }
});