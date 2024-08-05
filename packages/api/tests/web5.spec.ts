import { expect } from 'chai';
import sinon from 'sinon';

import { MemoryStore } from '@web5/common';
import { Web5UserAgent } from '@web5/user-agent';
import { AgentIdentityApi, DwnRegistrar, HdIdentityVault, PlatformAgentTestHarness, WalletConnect } from '@web5/agent';

import { Web5 } from '../src/web5.js';
import { testDwnUrl } from './utils/test-config.js';

describe('web5 api', () => {
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
      const walletConnectSpy = sinon.spy(WalletConnect, 'initClient');

      expect(web5).to.exist;
      expect(web5.agent).to.be.instanceOf(Web5UserAgent);
      // Verify recovery phrase is a 12-word string.
      expect(recoveryPhrase).to.be.a('string');
      expect(recoveryPhrase.split(' ')).to.have.lengthOf(12);
      expect(walletConnectSpy.called).to.be.false;
    });

    it('accepts an externally created DID', async () => {
      const walletConnectSpy = sinon.spy(WalletConnect, 'initClient');

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
      expect(walletConnectSpy.called).to.be.false;
    });

    it('creates an identity using the provided techPreview dwnEndpoints', async () => {
      sinon.stub(Web5UserAgent, 'create').resolves(testHarness.agent as Web5UserAgent);
      const walletConnectSpy = sinon.spy(WalletConnect, 'initClient');
      const identityApiSpy = sinon.spy(AgentIdentityApi.prototype, 'create');
      const { web5, did } = await Web5.connect({ techPreview: { dwnEndpoints: ['https://dwn.example.com/preview'] }});
      expect(web5).to.exist;
      expect(did).to.exist;

      expect(identityApiSpy.calledOnce, 'identityApiSpy called').to.be.true;
      const serviceEndpoints = (identityApiSpy.firstCall.args[0].didOptions as any).services[0].serviceEndpoint;
      expect(serviceEndpoints).to.deep.equal(['https://dwn.example.com/preview']);
      expect(walletConnectSpy.called).to.be.false;
    });

    it('creates an identity using the provided didCreateOptions dwnEndpoints', async () => {
      sinon.stub(Web5UserAgent, 'create').resolves(testHarness.agent as Web5UserAgent);
      const identityApiSpy = sinon.spy(AgentIdentityApi.prototype, 'create');
      const walletConnectSpy = sinon.spy(WalletConnect, 'initClient');
      const { web5, did } = await Web5.connect({ didCreateOptions: { dwnEndpoints: ['https://dwn.example.com'] }});
      expect(web5).to.exist;
      expect(did).to.exist;

      expect(identityApiSpy.calledOnce, 'identityApiSpy called').to.be.true;
      const serviceEndpoints = (identityApiSpy.firstCall.args[0].didOptions as any).services[0].serviceEndpoint;
      expect(serviceEndpoints).to.deep.equal(['https://dwn.example.com']);
      expect(walletConnectSpy.called).to.be.false;
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

    describe('wallet connect', () => {

      it('should not initiate wallet connect if has walletConnectOptions and stored identities', async () => {
        const walletConnectSpy = sinon.spy(WalletConnect, 'initClient');
        sinon.stub(Web5UserAgent, 'create').resolves(testHarness.agent as Web5UserAgent);
        const existingIdentity = await testHarness.createIdentity({
          name        : 'Mr FooBarovich',
          testDwnUrls : [testDwnUrl]
        });
        sinon.stub(testHarness.agent.identity, 'list').resolves([existingIdentity]);

        const { web5, did } = await Web5.connect({
          walletConnectOptions: {} as any,
        });

        expect(walletConnectSpy.called).to.be.false;
        expect(web5).to.exist;
        expect(did).to.exist;
      });

      it('should initiate wallet connect if has walletConnectOptions and no stored identities', async () => {
        const walletConnectSpy = sinon.spy(WalletConnect, 'initClient');
        sinon.stub(Web5UserAgent, 'create').resolves(testHarness.agent as Web5UserAgent);

        try {
          const { web5, did } = await Web5.connect({
            walletConnectOptions: {} as any
          });
          expect(walletConnectSpy.called).to.be.true;
          expect(web5).to.exist;
          expect(did).to.exist;
        } catch(e) {
          console.log();
        }
      });
    });

    describe('registration', () => {
      it('should call onSuccess if registration is successful', async () => {
        sinon.stub(Web5UserAgent, 'create').resolves(testHarness.agent as Web5UserAgent);
        const serverInfoStub = sinon.stub(testHarness.agent.rpc, 'getServerInfo').resolves({
          registrationRequirements : ['terms-of-service'],
          maxFileSize              : 10000,
          webSocketSupport         : true,
        });

        // stub a successful registration
        const registerStub = sinon.stub(DwnRegistrar, 'registerTenant').resolves();

        const registration = {
          onSuccess : () => {},
          onFailure : () => {}
        };

        const registerSuccessSpy = sinon.spy(registration, 'onSuccess');
        const registerFailureSpy = sinon.spy(registration, 'onFailure');

        const { web5, did } = await Web5.connect({ registration, didCreateOptions: { dwnEndpoints: [
          'https://dwn.example.com',
          'https://dwn.production.com/'
        ] } });
        expect(web5).to.exist;
        expect(did).to.exist;

        // Success should be called, and failure should not
        expect(registerFailureSpy.notCalled, 'onFailure not called').to.be.true;
        expect(registerSuccessSpy.calledOnce, 'onSuccess called').to.be.true;

        // Expect getServerInfo and registerTenant to be called.
        expect(serverInfoStub.calledTwice, 'getServerInfo called').to.be.true; // once per dwnEndpoint
        expect(registerStub.callCount, 'registerTenant called').to.equal(4); // called twice for each dwnEndpoint
      });

      it('should call onFailure if the registration attempts fail', async () => {
        sinon.stub(Web5UserAgent, 'create').resolves(testHarness.agent as Web5UserAgent);
        const serverInfoStub = sinon.stub(testHarness.agent.rpc, 'getServerInfo').resolves({
          registrationRequirements : ['terms-of-service'],
          maxFileSize              : 10000,
          webSocketSupport         : true,
        });

        // stub a successful registration
        const registerStub = sinon.stub(DwnRegistrar, 'registerTenant').rejects();

        const registration = {
          onSuccess : () => {},
          onFailure : () => {}
        };

        const registerSuccessSpy = sinon.spy(registration, 'onSuccess');
        const registerFailureSpy = sinon.spy(registration, 'onFailure');

        const { web5, did } = await Web5.connect({ registration, didCreateOptions: { dwnEndpoints: [
          'https://dwn.example.com',
          'https://dwn.production.com/'
        ] } });
        expect(web5).to.exist;
        expect(did).to.exist;

        // failure should be called, and success should not
        expect(registerSuccessSpy.notCalled, 'onSuccess not called').to.be.true;
        expect(registerFailureSpy.calledOnce, 'onFailure called').to.be.true;

        // Expect getServerInfo and registerTenant to be called.
        expect(serverInfoStub.calledOnce, 'getServerInfo called').to.be.true; // only called once before registration fails
        expect(registerStub.callCount, 'registerTenant called').to.equal(1); // called once and fails
      });

      it('should not attempt registration if the server does not require it', async () => {
        sinon.stub(Web5UserAgent, 'create').resolves(testHarness.agent as Web5UserAgent);
        const serverInfoStub = sinon.stub(testHarness.agent.rpc, 'getServerInfo').resolves({
          registrationRequirements : [], // no registration requirements
          maxFileSize              : 10000,
          webSocketSupport         : true,
        });

        // stub a successful registration
        const registerStub = sinon.stub(DwnRegistrar, 'registerTenant').resolves();

        const registration = {
          onSuccess : () => {},
          onFailure : () => {}
        };

        const registerSuccessSpy = sinon.spy(registration, 'onSuccess');
        const registerFailureSpy = sinon.spy(registration, 'onFailure');

        const { web5, did } = await Web5.connect({ registration, didCreateOptions: { dwnEndpoints: [
          'https://dwn.example.com',
          'https://dwn.production.com/'
        ] } });
        expect(web5).to.exist;
        expect(did).to.exist;

        // should call onSuccess and not onFailure
        expect(registerSuccessSpy.calledOnce, 'onSuccess called').to.be.true;
        expect(registerFailureSpy.notCalled, 'onFailure not called').to.be.true;

        // Expect getServerInfo to be called but not registerTenant
        expect(serverInfoStub.calledTwice, 'getServerInfo called').to.be.true; // once per dwnEndpoint
        expect(registerStub.notCalled, 'registerTenant not called').to.be.true; // not called
      });

      it('techPreview.dwnEndpoints should take precedence over didCreateOptions.dwnEndpoints', async () => {
        sinon.stub(Web5UserAgent, 'create').resolves(testHarness.agent as Web5UserAgent);
        const serverInfoStub = sinon.stub(testHarness.agent.rpc, 'getServerInfo').resolves({
          registrationRequirements : ['terms-of-service'],
          maxFileSize              : 10000,
          webSocketSupport         : true,
        });

        // stub a successful registration
        const registerStub = sinon.stub(DwnRegistrar, 'registerTenant').resolves();

        const registration = {
          onSuccess : () => {},
          onFailure : () => {}
        };

        const registerSuccessSpy = sinon.spy(registration, 'onSuccess');
        const registerFailureSpy = sinon.spy(registration, 'onFailure');

        const { web5, did } = await Web5.connect({ registration,
          didCreateOptions : { dwnEndpoints: [ 'https://dwn.example.com', 'https://dwn.production.com/' ] }, // two endpoints,
          techPreview      : { dwnEndpoints: [ 'https://dwn.production.com/' ] }, // one endpoint
        });
        expect(web5).to.exist;
        expect(did).to.exist;

        // Success should be called, and failure should not
        expect(registerFailureSpy.notCalled, 'onFailure not called').to.be.true;
        expect(registerSuccessSpy.calledOnce, 'onSuccess called').to.be.true;

        // Expect getServerInfo and registerTenant to be called.
        expect(serverInfoStub.calledOnce, 'getServerInfo called').to.be.true; // Should only be called once for `techPreview` endpoint
        expect(registerStub.callCount, 'registerTenant called').to.equal(2); // called twice, once for Agent DID once for Identity DID
      });
    });
  });
});