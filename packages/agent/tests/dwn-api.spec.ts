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

    it('handles RecordsDelete messages', async () => {
      // Create test data to write.
      const dataBytes = Convert.string('Hello, world!').toUint8Array();

      // Write a record that can be deleted.
      let { message, reply: { status: writeStatus } } = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsWrite,
        messageParams : {
          dataFormat : 'text/plain',
          schema     : 'https://schemas.xyz/example'
        },
        dataStream: new Blob([dataBytes])
      });
      expect(writeStatus.code).to.equal(202);
      const writeMessage = message!;

      // Attempt to process the RecordsRead.
      const deleteResponse = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsDelete,
        messageParams : {
          recordId: writeMessage.recordId
        }
      });

      // Verify the response.
      expect(deleteResponse).to.have.property('message');
      expect(deleteResponse).to.have.property('messageCid');
      expect(deleteResponse).to.have.property('reply');

      const deleteMessage = deleteResponse.message;
      expect(deleteMessage).to.have.property('authorization');
      expect(deleteMessage).to.have.property('descriptor');

      const deleteReply = deleteResponse.reply;
      expect(deleteReply).to.have.property('status');
      expect(deleteReply.status.code).to.equal(202);
    });

    it('handles RecordsQuery messages', async () => {
      // Create test data to write.
      const dataBytes = Convert.string('Hello, world!').toUint8Array();

      // Write a record that can be queried for.
      let { message, reply: { status: writeStatus } } = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsWrite,
        messageParams : {
          dataFormat : 'text/plain',
          schema     : 'https://schemas.xyz/example'
        },
        dataStream: new Blob([dataBytes])
      });
      expect(writeStatus.code).to.equal(202);
      const writeMessage = message!;

      // Attempt to process the RecordsQuery.
      const queryResponse = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsQuery,
        messageParams : {
          filter: {
            schema: 'https://schemas.xyz/example'
          }
        }
      });

      // Verify the response.
      expect(queryResponse).to.have.property('message');
      expect(queryResponse).to.have.property('messageCid');
      expect(queryResponse).to.have.property('reply');

      const queryMessage = queryResponse.message;
      expect(queryMessage).to.have.property('authorization');
      expect(queryMessage).to.have.property('descriptor');

      const queryReply = queryResponse.reply;
      expect(queryReply).to.have.property('status');
      expect(queryReply.status.code).to.equal(200);
      expect(queryReply.entries).to.exist;
      expect(queryReply.entries).to.have.length(1);
      expect(queryReply.entries?.[0]).to.have.property('descriptor');
      expect(queryReply.entries?.[0]).to.have.property('encodedData');
      expect(queryReply.entries?.[0]).to.have.property('recordId', writeMessage.recordId);
    });

    it('handles RecordsRead messages', async () => {
      // Create test data to write.
      const dataBytes = Convert.string('Hello, world!').toUint8Array();

      // Write a record that can be read.
      let { message, reply: { status: writeStatus } } = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsWrite,
        messageParams : {
          dataFormat : 'text/plain',
          schema     : 'https://schemas.xyz/example'
        },
        dataStream: new Blob([dataBytes])
      });
      expect(writeStatus.code).to.equal(202);
      const writeMessage = message!;

      // Attempt to process the RecordsRead.
      const readResponse = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsRead,
        messageParams : {
          filter: {
            recordId: writeMessage.recordId
          }
        }
      });

      // Verify the response.
      expect(readResponse).to.have.property('message');
      expect(readResponse).to.have.property('messageCid');
      expect(readResponse).to.have.property('reply');

      const readMessage = readResponse.message;
      expect(readMessage).to.have.property('authorization');
      expect(readMessage).to.have.property('descriptor');

      const readReply = readResponse.reply;
      expect(readReply).to.have.property('status');
      expect(readReply.status.code).to.equal(200);
      expect(readReply).to.have.property('record');
      expect(readReply.record).to.have.property('data');
      expect(readReply.record).to.have.property('descriptor');
      expect(readReply.record).to.have.property('recordId', writeMessage.recordId);
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

    it('handles RecordsWrite messages to sign as owner', async () => {
      // bob authors a public record to his dwn
      const dataStream = new Blob([ Convert.string('Hello, world!').toUint8Array() ]);

      const bobWrite = await testHarness.agent.dwn.processRequest({
        author        : bob.did.uri,
        target        : bob.did.uri,
        messageType   : DwnInterface.RecordsWrite,
        messageParams : {
          published  : true,
          schema     : 'foo/bar',
          dataFormat : 'text/plain'
        },
        dataStream,
      });
      expect(bobWrite.reply.status.code).to.equal(202);
      const message = bobWrite.message!;

      // alice queries bob's DWN for the record
      const queryBobResponse = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : bob.did.uri,
        messageType   : DwnInterface.RecordsQuery,
        messageParams : {
          filter: {
            recordId: message.recordId
          }
        }
      });
      let reply = queryBobResponse.reply;
      expect(reply.status.code).to.equal(200);
      expect(reply.entries!.length).to.equal(1);
      expect(reply.entries![0].recordId).to.equal(message.recordId);

      // alice attempts to process the rawMessage as is without signing it, should fail
      let aliceWrite = await testHarness.agent.dwn.processRequest({
        messageType : DwnInterface.RecordsWrite,
        author      : alice.did.uri,
        target      : alice.did.uri,
        rawMessage  : message,
        dataStream,
      });
      expect(aliceWrite.reply.status.code).to.equal(401);

      // alice queries to make sure the record is not saved on her dwn
      let queryAliceResponse = await testHarness.agent.dwn.processRequest({
        messageType   : DwnInterface.RecordsQuery,
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageParams : {
          filter: {
            recordId: message.recordId
          }
        }
      });
      expect(queryAliceResponse.reply.status.code).to.equal(200);
      expect(queryAliceResponse.reply.entries!.length).to.equal(0);

      // alice attempts to process the rawMessage again this time marking it to be signed as owner
      aliceWrite = await testHarness.agent.dwn.processRequest({
        messageType : DwnInterface.RecordsWrite,
        author      : alice.did.uri,
        target      : alice.did.uri,
        rawMessage  : message,
        signAsOwner : true,
        dataStream,
      });
      expect(aliceWrite.reply.status.code).to.equal(202);

      // alice now queries for the record, it should be there
      queryAliceResponse = await testHarness.agent.dwn.processRequest({
        messageType   : DwnInterface.RecordsQuery,
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageParams : {
          filter: {
            recordId: message.recordId
          }
        }
      });
      expect(queryAliceResponse.reply.status.code).to.equal(200);
      expect(queryAliceResponse.reply.entries!.length).to.equal(1);
    });
  });
});