import { AgentDidResolverCache } from '../src/agent-did-resolver-cache.js';
import { PlatformAgentTestHarness } from '../src/test-harness.js';
import { TestAgent } from './utils/test-agent.js';

import sinon from 'sinon';
import { expect } from 'chai';
import { DidJwk } from '@web5/dids';
import { BearerIdentity } from '../src/bearer-identity.js';

describe('AgentDidResolverCache',  () => {
  let resolverCache: AgentDidResolverCache;
  let testHarness: PlatformAgentTestHarness;

  before(async () => {
    testHarness = await PlatformAgentTestHarness.setup({
      agentClass  : TestAgent,
      agentStores : 'dwn'
    });

    resolverCache = new AgentDidResolverCache({ agent: testHarness.agent, location: '__TESTDATA__/did_cache' });
  });

  after(async () => {
    sinon.restore();
    await testHarness.clearStorage();
    await testHarness.closeStorage();
  });

  beforeEach(async () => {
    sinon.restore();
    await testHarness.clearStorage();
    await testHarness.createAgentDid();
  });

  it('does not attempt to resolve a DID that is already resolving', async () => {
    const did = testHarness.agent.agentDid.uri;
    const getStub = sinon.stub(resolverCache['cache'], 'get').resolves(JSON.stringify({ ttlMillis: Date.now() - 1000, value: { didDocument: { id: did } } }));
    const resolveSpy = sinon.spy(testHarness.agent.did, 'resolve');

    await Promise.all([
      resolverCache.get(did),
      resolverCache.get(did)
    ]);

    // get should be called twice, but resolve should only be called once
    // because the second call should be blocked by the _resolving Map
    expect(getStub.callCount).to.equal(2);
    expect(resolveSpy.callCount).to.equal(1);
  });

  it('should not resolve a DID if the ttl has not elapsed', async () => {
    const did = testHarness.agent.agentDid.uri;
    const getStub = sinon.stub(resolverCache['cache'], 'get').resolves(JSON.stringify({ ttlMillis: Date.now() + 1000, value: { didDocument: { id: did } } }));
    const resolveSpy = sinon.spy(testHarness.agent.did, 'resolve');

    await resolverCache.get(did);

    // get should be called once, but resolve should not be called
    expect(getStub.callCount).to.equal(1);
    expect(resolveSpy.callCount).to.equal(0);
  });

  it('should not call resolve if the DID is not the agent DID or exists as an identity in the agent', async () => {
    const did = await DidJwk.create({});
    const getStub = sinon.stub(resolverCache['cache'], 'get').resolves(JSON.stringify({ ttlMillis: Date.now() - 1000, value: { didDocument: { id: did.uri } } }));
    const resolveSpy = sinon.spy(testHarness.agent.did, 'resolve');
    const nextTickSpy = sinon.stub(resolverCache['cache'], 'nextTick').resolves();
    sinon.stub(testHarness.agent.identity, 'get').resolves(undefined);

    await resolverCache.get(did.uri),

    // get should be called once, but we do not resolve even though the TTL is expired
    expect(getStub.callCount).to.equal(1);
    expect(resolveSpy.callCount).to.equal(0);

    // we expect the nextTick of the cache to be called to trigger a delete of the cache item after returning as it's expired
    expect(nextTickSpy.callCount).to.equal(1);
  });

  it('should resolve if the DID is managed by the agent', async () => {
    const did = await DidJwk.create({});
    const getStub = sinon.stub(resolverCache['cache'], 'get').resolves(JSON.stringify({ ttlMillis: Date.now() - 1000, value: { didDocument: { id: did.uri } } }));
    const resolveSpy = sinon.spy(testHarness.agent.did, 'resolve');
    const nextTickSpy = sinon.stub(resolverCache['cache'], 'nextTick').resolves();
    sinon.stub(testHarness.agent.identity, 'get').resolves(new BearerIdentity({
      metadata: { name: 'Some Name', uri: did.uri, tenant: did.uri },
      did,
    }));

    await resolverCache.get(did.uri),

    // get should be called once, and we also resolve the DId as it's returned by the identity.get method
    expect(getStub.callCount).to.equal(1);
    expect(resolveSpy.callCount).to.equal(1);
  });

  it('does not cache notFound records', async () => {
    const did = testHarness.agent.agentDid.uri;
    const getStub = sinon.stub(resolverCache['cache'], 'get').rejects({ notFound: true });

    const result = await resolverCache.get(did);

    // get should be called once, and resolve should be called once
    expect(getStub.callCount).to.equal(1);
    expect(result).to.equal(undefined);
  });

  it('throws if the error is anything other than a notFound error', async () => {
    const did = testHarness.agent.agentDid.uri;
    const getStub = sinon.stub(resolverCache['cache'], 'get').rejects(new Error('Some Error'));

    try {
      await resolverCache.get(did);
      expect.fail('Should have thrown');
    } catch (error: any) {
      expect(error.message).to.equal('Some Error');
    }
  });

  it('throws if the agent is not initialized', async () => {
    // close existing DB
    await resolverCache['cache'].close();

    // set resolver cache without an agent
    resolverCache = new AgentDidResolverCache({ location: '__TESTDATA__/did_cache' });

    try {
      // attempt to access the agent property
      resolverCache.agent;

      expect.fail('Should have thrown');
    } catch (error: any) {
      expect(error.message).to.equal('Agent not initialized');
    }

    // set the agent property
    resolverCache.agent = testHarness.agent;

    // should not throw
    resolverCache.agent;
  });
});