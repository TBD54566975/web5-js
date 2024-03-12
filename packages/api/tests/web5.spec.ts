import { expect } from 'chai';
import { Web5UserAgent } from '@web5/user-agent';
import { HdIdentityVault, PlatformAgentTestHarness } from '@web5/agent';

import { Web5 } from '../src/web5.js';
import { MemoryStore } from '@web5/common';

describe('Web5', () => {
  describe('using Test Harness', () => {
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
    });

    after(async () => {
      await testHarness.clearStorage();
      await testHarness.closeStorage();
    });

    describe('constructor', () => {
      it('instantiates Web5 API with provided Web5Agent and connectedDid', async () => {
        // Create a new Identity.
        const socialIdentity = await testHarness.agent.identity.create({
          metadata  : { name: 'Social' },
          didMethod : 'jwk',
        });

        // Instantiates Web5 instance with test agent and new Identity's DID.
        const web5 = new Web5({ agent: testHarness.agent, connectedDid: socialIdentity.did.uri });
        expect(web5).to.exist;
        expect(web5).to.have.property('did');
        expect(web5).to.have.property('dwn');
        expect(web5).to.have.property('vc');
      });
    });

    describe('connect()', () => {
      it('accepts an externally created DID', async () => {
        const testIdentity = await testHarness.createIdentity({
          name        : 'Test',
          testDwnUrls : ['https://dwn.example.com']
        });

        // Call connect() with the custom agent.
        const { web5, did } = await Web5.connect({
          agent        : testHarness.agent,
          connectedDid : testIdentity.did.uri
        });

        expect(did).to.exist;
        expect(web5).to.exist;
      });
    });
  });

  describe('connect()', () => {
    it('uses Web5UserAgent, by default', async () => {
      // Create an in-memory identity vault store to speed up tests.
      const agentVault = new HdIdentityVault({
        keyDerivationWorkFactor : 1,
        store                   : new MemoryStore<string, string>()
      });
      const { web5 } = await Web5.connect({ agentVault });

      expect(web5).to.exist;
      expect(web5.agent).to.be.instanceOf(Web5UserAgent);
    });
  });
});