import { expect } from 'chai';
import sinon from 'sinon';

import { MemoryStore } from '@web5/common';
import { Web5UserAgent } from '@web5/user-agent';
import { AgentIdentityApi, HdIdentityVault, PlatformAgentTestHarness } from '@web5/agent';

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

    before(async () => {
      testHarness = await PlatformAgentTestHarness.setup({
        agentClass  : Web5UserAgent,
        agentStores : 'memory'
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

    it('creates an identity using the provided techPreview dwnEndpoints', async () => {
      sinon.stub(Web5UserAgent, 'create').resolves(testHarness.agent as Web5UserAgent);
      const identityApiSpy = sinon.spy(AgentIdentityApi.prototype, 'create');
      const { web5, did } = await Web5.connect({ techPreview: { dwnEndpoints: ['https://dwn.example.com/preview'] }});
      expect(web5).to.exist;
      expect(did).to.exist;

      expect(identityApiSpy.calledOnce, 'identityApiSpy called').to.be.true;
      const serviceEndpoints = (identityApiSpy.firstCall.args[0].didOptions as any).services[0].serviceEndpoint;
      expect(serviceEndpoints).to.deep.equal(['https://dwn.example.com/preview']);
    });

    it('creates an identity using the provided didCreateOptions dwnEndpoints', async () => {
      sinon.stub(Web5UserAgent, 'create').resolves(testHarness.agent as Web5UserAgent);
      const identityApiSpy = sinon.spy(AgentIdentityApi.prototype, 'create');
      const { web5, did } = await Web5.connect({ didCreateOptions: { dwnEndpoints: ['https://dwn.example.com'] }});
      expect(web5).to.exist;
      expect(did).to.exist;

      expect(identityApiSpy.calledOnce, 'identityApiSpy called').to.be.true;
      const serviceEndpoints = (identityApiSpy.firstCall.args[0].didOptions as any).services[0].serviceEndpoint;
      expect(serviceEndpoints).to.deep.equal(['https://dwn.example.com']);
    });

    it('defaults to `https://dwn.tbddev.org/beta` as the single DWN Service endpoint if non is provided', async () => {
      sinon.stub(Web5UserAgent, 'create').resolves(testHarness.agent as Web5UserAgent);
      const identityApiSpy = sinon.spy(AgentIdentityApi.prototype, 'create');
      const { web5, did } = await Web5.connect();
      expect(web5).to.exist;
      expect(did).to.exist;

      expect(identityApiSpy.calledOnce, 'identityApiSpy called').to.be.true;
      const serviceEndpoints = (identityApiSpy.firstCall.args[0].didOptions as any).services[0].serviceEndpoint;
      expect(serviceEndpoints).to.deep.equal(['https://dwn.tbddev.org/beta']);
    });
  });
});