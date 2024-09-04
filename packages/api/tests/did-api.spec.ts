import { expect } from 'chai';
import { Web5UserAgent } from '@web5/user-agent';
import { PlatformAgentTestHarness } from '@web5/agent';
import sinon from 'sinon';

import { DidApi } from '../src/did-api.js';
import { DidDht } from '@web5/dids';

describe('DidApi', () => {
  let did: DidApi;
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

    // Create a new Identity to author DID requests.
    const identity = await testHarness.agent.identity.create({
      metadata  : { name: 'Test' },
      didMethod : 'jwk',
    });

    // Instantiate DidApi.
    did = new DidApi({ agent: testHarness.agent, connectedDid: identity.did.uri });
  });

  after(async () => {
    sinon.restore();
    await testHarness.clearStorage();
    await testHarness.closeStorage();
  });

  describe('create()', () => {
    it('creates a DID and returns a response', async () => {
      const didCreateResponse = await did.create({ method: 'jwk' });

      expect(didCreateResponse).to.exist;
      expect(didCreateResponse).to.have.property('ok', true);
      expect(didCreateResponse).to.have.property('status');
      expect(didCreateResponse.status).to.have.property('code', 201);
      expect(didCreateResponse.status).to.have.property('message', 'Created');
      expect(didCreateResponse).to.have.property('did');
      expect(didCreateResponse.did).to.have.property('uri');
      expect(didCreateResponse.did).to.have.property('document');
      expect(didCreateResponse.did).to.have.property('metadata');
    });

    it('supports DHT method', async () => {
      const didCreateResponse = await did.create({ method: 'dht' });

      expect(didCreateResponse.did.uri).includes('did:dht:');
    });

    it('supports JWK method', async () => {
      const didCreateResponse = await did.create({ method: 'jwk' });

      expect(didCreateResponse.did.uri).includes('did:jwk:');
    });
  });

  describe('resolve()', () => {
    it('resolves a DID and returns a resolution result', async () => {

      // avoid actually resolving the DHT
      sinon.stub(DidDht, 'resolve').resolves({
        didDocument: {
          id                 : 'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy',
          '@context'         : 'https://w3id.org/did/v1',
          verificationMethod : [
          ],
          authentication: [
            'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy#keys-1'
          ]
        },
        didDocumentMetadata   : {},
        didResolutionMetadata : {}
      });

      const testDid = 'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy';

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