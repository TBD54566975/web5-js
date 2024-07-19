import sinon from 'sinon';
import { expect } from 'chai';

import { TestAgent } from './utils/test-agent.js';
import { AgentIdentityApi } from '../src/identity-api.js';
import { PlatformAgentTestHarness } from '../src/test-harness.js';

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
      // we are only mocking
      const mockAgent: any = {
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
      let testHarness: PlatformAgentTestHarness;

      before(async () => {
        testHarness = await PlatformAgentTestHarness.setup({
          agentClass  : TestAgent,
          agentStores : agentStoreType
        });
      });

      beforeEach(async () => {
        sinon.restore();
        await testHarness.clearStorage();
        await testHarness.createAgentDid();
      });

      after(async () => {
        sinon.restore();
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

      describe('manage()' , () => {
        it('imports only the Identity Metadata to Agent tenant', async () => {
          // Create a new Identity, which by default is stored under the tenant of the created DID.
          const identity = await testHarness.agent.identity.create({
            didMethod : 'jwk',
            metadata  : { name: 'Test Identity' },
          });

          // Verify that the Identity is stored under the new Identity's tenant.
          let storedIdentity = await testHarness.agent.identity.get({ didUri: identity.did.uri, tenant: identity.did.uri });
          expect(storedIdentity).to.exist;

          // Add a managed Identity to the Agent's tenant.
          const managedIdentity = await testHarness.agent.identity.manage({
            portableIdentity: await identity.export()
          });
          expect(managedIdentity).to.deep.equal(identity);

          // Verify that the Identity Metadata is stored under the Agent's tenant.
          storedIdentity = await testHarness.agent.identity.get({ didUri: identity.did.uri });
          expect(storedIdentity).to.exist;

          // Verify the DID ONLY exists under the tenant of the previously created DID.
          let storedDidAgent = await testHarness.agent.did.get({ didUri: identity.did.uri });
          expect(storedDidAgent).to.not.exist;
          let storedDidNewIdentity = await testHarness.agent.did.get({ didUri: identity.did.uri, tenant: identity.did.uri });
          expect(storedDidNewIdentity).to.exist;
        });
      });

      describe('list()', () => {
        it('returns an array of all identities', async () => {
          // Create three new identities all under the Agent's tenant.
          const alice = await testHarness.agent.identity.create({
            didMethod : 'jwk',
            metadata  : { name: 'Alice' },
            tenant    : testHarness.agent.agentDid.uri
          });
          const bob = await testHarness.agent.identity.create({
            didMethod : 'jwk',
            metadata  : { name: 'Bob' },
            tenant    : testHarness.agent.agentDid.uri
          });
          const carol = await testHarness.agent.identity.create({
            didMethod : 'jwk',
            metadata  : { name: 'Carol' },
            tenant    : testHarness.agent.agentDid.uri
          });

          // List identities and verify the result.
          const storedIdentities = await testHarness.agent.identity.list();
          expect(storedIdentities).to.have.length(3);

          const createdIdentities = [alice.did.uri, bob.did.uri, carol.did.uri];
          for (const storedIdentity of storedIdentities) {
            expect(createdIdentities).to.include(storedIdentity.did.uri);
          }
        });

        it('returns an empty array if the store contains no Identities', async () => {
          // List identities and verify the result is empty.
          const storedIdentities = await testHarness.agent.identity.list();
          expect(storedIdentities).to.be.empty;
        });
      });

      describe('delete()', () => {
        it('deletes an Identity', async () => {
          // Create a new Identity.
          const identity = await testHarness.agent.identity.create({
            didMethod : 'jwk',
            metadata  : { name: 'Test Identity' },
            store     : true
          });

          // Verify that the Identity exists.
          let storedIdentity = await testHarness.agent.identity.get({ didUri: identity.did.uri, tenant: identity.did.uri });
          expect(storedIdentity).to.exist;
          expect(storedIdentity?.did.uri).to.equal(identity.did.uri);

          // Delete the Identity.
          await testHarness.agent.identity.delete({ didUri: identity.did.uri, tenant: identity.did.uri });

          // Verify that the Identity no longer exists.
          storedIdentity = await testHarness.agent.identity.get({ didUri: identity.did.uri, tenant: identity.did.uri });
          expect(storedIdentity).to.not.exist;

          // Verify that the DID still exists
          const storedDid = await testHarness.agent.did.get({ didUri: identity.did.uri, tenant: identity.did.uri });
          expect(storedDid).to.not.be.undefined;
          expect(storedDid!.uri).to.equal(identity.did.uri);
        });

        it('fails with not found error if the Identity does not exist', async () => {
          // Delete an Identity that does not exist.
          const didUri = 'did:method:xyz123';
          try {
            await testHarness.agent.identity.delete({ didUri });
            expect.fail('Expected an error to be thrown');
          } catch (error: any) {
            expect(error.message).to.include('AgentIdentityApi: Failed to purge due to Identity not found');
          }
        });
      });
    });
  }
});