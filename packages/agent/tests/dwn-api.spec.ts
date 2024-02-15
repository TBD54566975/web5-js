import { expect } from 'chai';

import { AgentDwnApi } from '../src/dwn-api.js';
import { testDwnUrl } from './utils/test-config.js';

// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';
import { Dwn } from '@tbd54566975/dwn-sdk-js';
import { ManagedAgentTestHarness } from '../src/test-harness.js';
import { TestAgent } from './utils/test-agent.js';
import { BearerIdentity } from '../src/identity-api.js';
import { Convert } from '@web5/common';
import { DwnInterface } from '../src/types/agent-dwn.js';
// @ts-expect-error - globalThis.crypto and webcrypto are of different types.
if (!globalThis.crypto) globalThis.crypto = webcrypto;

let testDwnUrls: string[] = [testDwnUrl];

describe('AgentDwnApi', () => {
  let testHarness: ManagedAgentTestHarness;

  before(async () => {
    testHarness = await ManagedAgentTestHarness.setup({
      agentClass  : TestAgent,
      agentStores : 'dwn'
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
    it('accepts a custom DWN instance', async () => {
      const mockDwn = ({ test: 'value' } as unknown) as Dwn;

      // Instantiate DWN API with custom DWN instance.
      const dwnApi = new AgentDwnApi({ dwn: mockDwn });

      expect(dwnApi).to.exist;
      expect(dwnApi.node).to.exist;
      expect(dwnApi.node).to.have.property('test', 'value');
    });
  });

  describe('get agent', () => {
    it(`returns the 'agent' instance property`, () => {
      // @ts-expect-error because we are only mocking a single property.
      const mockAgent: Web5ManagedAgent = {
        agentDid: 'did:method:abc123'
      };
      const mockDwn = ({} as unknown) as Dwn;
      const dwnApi = new AgentDwnApi({ agent: mockAgent, dwn: mockDwn });
      const agent = dwnApi.agent;
      expect(agent).to.exist;
      expect(agent.agentDid).to.equal('did:method:abc123');
    });

    it(`throws an error if the 'agent' instance property is undefined`, async () => {
      const mockDwn = ({} as unknown) as Dwn;
      const dwnApi = new AgentDwnApi({ dwn: mockDwn });
      expect(() =>
        dwnApi.agent
      ).to.throw(Error, 'Unable to determine agent execution context');
    });
  });

  describe('processRequest', () => {
    let alice: BearerIdentity;
    let bob: BearerIdentity;

    beforeEach(async () => {
      // Creates a new Identity to author the DWN messages.
      alice = await testHarness.agent.identity.create({
        metadata  : { name: 'Alice' },
        didMethod : 'jwk'
      });

      bob = await testHarness.agent.identity.create({
        metadata  : { name: 'Alice' },
        didMethod : 'jwk'
      });
    });

    it('handles RecordsWrite messages', async () => {
      // Create test data to write.
      const dataBytes = Convert.string('Hello, world!').toUint8Array();

      // Attempt to process the RecordsWrite
      let writeResponse = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsWrite,
        messageParams : {
          dataFormat: 'text/plain'
        },
        dataStream: new Blob([dataBytes])
      });

      // Verify the response.
      expect(writeResponse).to.have.property('message');
      expect(writeResponse).to.have.property('messageCid');
      expect(writeResponse).to.have.property('reply');

      const writeMessage = writeResponse.message;
      expect(writeMessage).to.have.property('authorization');
      expect(writeMessage).to.have.property('descriptor');
      expect(writeMessage).to.have.property('recordId');

      const writeReply = writeResponse.reply;
      expect(writeReply).to.have.property('status');
      expect(writeReply.status.code).to.equal(202);
    });
  });
});