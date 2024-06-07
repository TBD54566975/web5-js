import { expect } from 'chai';
import { MemoryStore } from '@web5/common';
import { Web5UserAgent } from '@web5/user-agent';
import { HdIdentityVault, PlatformAgentTestHarness } from '@web5/agent';

import sinon from 'sinon';

import { Web5 } from '../src/web5.js';

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

      it('supports a single agent with multiple Web5 instances and different DIDs', async () => {
        // Create two identities, each of which is stored in a new tenant.
        const careerIdentity = await testHarness.agent.identity.create({
          metadata  : { name: 'Social' },
          didMethod : 'jwk'
        });
        const socialIdentity = await testHarness.agent.identity.create({
          metadata  : { name: 'Social' },
          didMethod : 'jwk'
        });

        // Instantiate a Web5 instance with the "Career" Identity, write a record, and verify the result.
        const web5Career = new Web5({ agent: testHarness.agent, connectedDid: careerIdentity.did.uri });
        expect(web5Career).to.exist;

        // Instantiate a Web5 instance with the "Social" Identity, write a record, and verify the result.
        const web5Social = new Web5({ agent: testHarness.agent, connectedDid: socialIdentity.did.uri });
        expect(web5Social).to.exist;
      });
    });

    describe('scenarios', () => {
      it('writes records with multiple identities under management', async () => {
        // First launch and initialization.
        await testHarness.agent.initialize({ password: 'test' });

        // Start the Agent, which will decrypt and load the Agent's DID from the vault.
        await testHarness.agent.start({ password: 'test' });

        // Create two identities, each of which is stored in a new tenant.
        const careerIdentity = await testHarness.agent.identity.create({
          metadata  : { name: 'Social' },
          didMethod : 'jwk'
        });
        const socialIdentity = await testHarness.agent.identity.create({
          metadata  : { name: 'Social' },
          didMethod : 'jwk'
        });

        // Instantiate a Web5 instance with the "Career" Identity, write a record, and verify the result.
        const web5Career = new Web5({ agent: testHarness.agent, connectedDid: careerIdentity.did.uri });
        const careerResult = await web5Career.dwn.records.write({
          data    : 'Hello, world!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });
        expect(careerResult.status.code).to.equal(202);
        expect(careerResult.record).to.exist;
        expect(careerResult.record?.author).to.equal(careerIdentity.did.uri);
        expect(await careerResult.record?.data.text()).to.equal('Hello, world!');

        // Instantiate a Web5 instance with the "Social" Identity, write a record, and verify the result.
        const web5Social = new Web5({ agent: testHarness.agent, connectedDid: socialIdentity.did.uri });
        const socialResult = await web5Social.dwn.records.write({
          data    : 'Hello, everyone!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });
        expect(socialResult.status.code).to.equal(202);
        expect(socialResult.record).to.exist;
        expect(socialResult.record?.author).to.equal(socialIdentity.did.uri);
        expect(await socialResult.record?.data.text()).to.equal('Hello, everyone!');
      });
    });
  });

  describe('connect()', () => {
    let testHarness: PlatformAgentTestHarness;
    let agent: Web5UserAgent;
    const password = 'insecure-static-phrase';

    before(async () => {
      testHarness = await PlatformAgentTestHarness.setup({
        agentClass  : Web5UserAgent,
        agentStores : 'memory'
      });
      agent = testHarness.agent as Web5UserAgent;
    });

    beforeEach(async () => {
      sinon.restore();
      await testHarness.clearStorage();
      await testHarness.createAgentDid();

      if (await agent.firstLaunch()) {
        await agent.initialize({ password });
      }
      await agent.start({ password: 'insecure-static-phrase' });
    });

    after(async () => {
      sinon.restore();
      await testHarness.clearStorage();
      await testHarness.closeStorage();
    });


    it('uses Web5UserAgent, by default', async () => {
      // Create an in-memory identity vault store to speed up tests.
      const agentVault = new HdIdentityVault({
        keyDerivationWorkFactor : 1,
        store                   : new MemoryStore<string, string>()
      });
      const { web5, recoveryPhrase } = await Web5.connect({ agentVault });

      expect(web5).to.exist;
      expect(web5.agent).to.be.instanceOf(Web5UserAgent);
      // Verify recovery phrase is a 12-word string.
      expect(recoveryPhrase).to.be.a('string');
      expect(recoveryPhrase.split(' ')).to.have.lengthOf(12);
    });

    it('fails if a connectedDid is provided and it is not found in the identities list', async () => {
      sinon.stub(Web5UserAgent, 'create').resolves(agent as Web5UserAgent);
      const connectedDid = 'did:web5:1234567890';
      try {
        await Web5.connect({ connectedDid, password });
        expect.fail('Expected an error to be thrown');
      } catch (error:any) {
        expect(error.message).to.equal(`connect() failed due to unexpected state: Expected to find identity with DID ${connectedDid}.`);
      }
    });

    it('if multiple identities are returned by the agent and a connectedDid is provided, it uses the connectedDid', async () => {
      sinon.stub(Web5UserAgent, 'create').resolves(agent);

      // create two identities, use the second one as connectedDid
      const identity1 = await agent.identity.create({
        store     : true,
        metadata  : { name: 'Test 2' },
        didMethod : 'jwk'
      });
      await agent.identity.manage({ portableIdentity: await identity1.export() });

      const identity2 = await agent.identity.create({
        store     : true,
        metadata  : { name: 'Test' },
        didMethod : 'jwk'
      });
      await agent.identity.manage({ portableIdentity: await identity2.export() });

      const connectedDid = identity2.did.uri;
      const { web5, did } = await Web5.connect({ connectedDid, password });

      expect(did).to.equal(connectedDid);
      expect(web5).to.exist;
      expect(web5.agent).to.be.instanceOf(Web5UserAgent);
    });

    it('fails if multiple identities are returned by the agent and no connectedDid is provided', async () => {
      sinon.stub(Web5UserAgent, 'create').resolves(agent);

      // create two identities, use the second one as connectedDid
      const identity1 = await agent.identity.create({
        store     : true,
        metadata  : { name: 'Test 2' },
        didMethod : 'jwk'
      });
      await agent.identity.manage({ portableIdentity: await identity1.export() });

      const identity2 = await agent.identity.create({
        store     : true,
        metadata  : { name: 'Test' },
        didMethod : 'jwk'
      });
      await agent.identity.manage({ portableIdentity: await identity2.export() });

      try {
        await Web5.connect({ password });
      } catch(error:any) {
        expect(error.message).to.equal(`connect() failed due to unexpected state: Expected 1 but found 2 stored identities with no connectedDid option.`);
      }
    });

    it('calling connect multiple times will return the same did', async () => {
      sinon.stub(Web5UserAgent, 'create').resolves(agent);
      const { did } = await Web5.connect({ password });
      const { did: did_2 } = await Web5.connect({ password });

      expect(did).to.equal(did_2);
    });
  });
});