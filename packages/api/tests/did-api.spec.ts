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

  describe('resolve()', async () => {
    it('resolves a DID and returns a resolution result', async () => {
      const testDid = 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D';
      const didResolutionResult = await did.resolve(testDid);

      expect(didResolutionResult).to.exist;
      expect(didResolutionResult).to.have.property('didDocument');
      expect(didResolutionResult.didDocument).to.have.property('id', testDid);
      expect(didResolutionResult).to.have.property('didDocument');
      expect(didResolutionResult).to.have.property('didDocumentMetadata');
      expect(didResolutionResult).to.have.property('didResolutionMetadata');
    });

    it('returns an invalidDid error if the DID cannot be parsed', async () => {
      const didResolutionResult = await did.resolve('unparseable:did');

      expect(didResolutionResult).to.exist;
      expect(didResolutionResult).to.have.property('@context');
      expect(didResolutionResult).to.have.property('didDocument');
      expect(didResolutionResult).to.have.property('didDocumentMetadata');
      expect(didResolutionResult).to.have.property('didResolutionMetadata');
      expect(didResolutionResult.didResolutionMetadata).to.have.property('error', 'invalidDid');
    });

    it('returns a methodNotSupported error if the DID method is not supported', async () => {
      const didResolutionResult = await did.resolve('did:unknown:abc123');

      expect(didResolutionResult).to.exist;
      expect(didResolutionResult).to.have.property('@context');
      expect(didResolutionResult).to.have.property('didDocument');
      expect(didResolutionResult).to.have.property('didDocumentMetadata');
      expect(didResolutionResult).to.have.property('didResolutionMetadata');
      expect(didResolutionResult.didResolutionMetadata).to.have.property('error', 'methodNotSupported');
    });
  });
});