import { expect } from 'chai';
import { DidIonMethod } from '@web5/dids';
import { MemoryStore } from '@web5/common';
import { AppDataVault, TestManagedAgent } from '@web5/agent';

import { Web5 } from '../src/web5.js';
import { TestUserAgent } from './utils/test-user-agent.js';

describe('Web5', () => {
  describe('using TestManagedAgent', () => {
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

    describe('connect()', () => {
      it('accepts an externally created ION DID', async () => {
        // Create an ION DID.
        const didOptions = await DidIonMethod.generateDwnOptions({
          serviceEndpointNodes: ['https://dwn.example.com']
        });
        const portableDid = await DidIonMethod.create({ ...didOptions });

        // Import the previously created DID.
        await testAgent.agent.identityManager.import({
          identity : { name: 'Test', did: portableDid.did },
          did      : portableDid,
          kms      : 'local'
        });

        // Call connect() with the custom agent.
        const { web5, did } = await Web5.connect({
          agent        : testAgent.agent,
          connectedDid : portableDid.did
        });

        expect(did).to.exist;
        expect(web5).to.exist;
      });
    });

    describe('constructor', () => {
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
  });

  describe('connect()', () => {
    it('returns a web5 instance and connected DID using Web5UserAgent, by default', async () => {
    // Create an in-memory App data store to speed up tests.
      const appData = new AppDataVault({
        keyDerivationWorkFactor : 1,
        store                   : new MemoryStore()
      });
      const { web5, did } = await Web5.connect({ appData });

      expect(did).to.exist;
      expect(web5).to.exist;
    });
  });
});