import type { Readable } from '@web5/common';
import type { Dwn, MessageEvent, RecordsWriteMessage } from '@tbd54566975/dwn-sdk-js';

import { DidDht } from '@web5/dids';
import { Convert, NodeStream, Stream } from '@web5/common';
import { DwnInterfaceName, DwnMethodName, Message, ProtocolDefinition, TestDataGenerator, Time } from '@tbd54566975/dwn-sdk-js';

import sinon from 'sinon';

import { expect } from 'chai';

import type { PortableIdentity } from '../src/types/identity.js';

import { DwnInterface, DwnPermissionScope } from '../src/types/dwn.js';
import { BearerIdentity } from '../src/bearer-identity.js';
import emailProtocolDefinition from './fixtures/protocol-definitions/email.json' assert { type: 'json' };
import { PlatformAgentTestHarness } from '../src/test-harness.js';
import { TestAgent } from './utils/test-agent.js';
import { testDwnUrl } from './utils/test-config.js';
import { AgentDwnApi, isDwnMessage, isMessagesPermissionScope, isRecordPermissionScope } from '../src/dwn-api.js';

// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';
// @ts-expect-error - globalThis.crypto and webcrypto are of different types.
if (!globalThis.crypto) globalThis.crypto = webcrypto;

let testDwnUrls: string[] = [testDwnUrl];

describe('AgentDwnApi', () => {
  let testHarness: PlatformAgentTestHarness;

  before(async () => {
    testHarness = await PlatformAgentTestHarness.setup({
      agentClass  : TestAgent,
      agentStores : 'dwn'
    });
  });

  beforeEach(() => {
    sinon.restore();
  });

  after(async () => {
    sinon.restore();
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
      // we are only mocking
      const mockAgent: any = {
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

  describe('processRequest()', () => {
    let alice: BearerIdentity;
    let bob: BearerIdentity;

    beforeEach(async () => {
      await testHarness.clearStorage();
      await testHarness.createAgentDid();

      alice = await testHarness.agent.identity.create({
        metadata  : { name: 'Alice' },
        didMethod : 'jwk'
      });

      bob = await testHarness.agent.identity.create({
        metadata  : { name: 'Alice' },
        didMethod : 'jwk'
      });
    });

    after(async () => {
      await testHarness.clearStorage();
    });

    it('handles MessagesQuery', async () => {
      const testCursor = {
        messageCid : 'foo',
        value      : 'bar'
      };

      const testFilters = [{ protocol: 'http://protocol1' }];

      // Attempt to process the MessagesQuery.
      let messagesQueryResponse = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.MessagesQuery,
        messageParams : {
          cursor  : testCursor,
          filters : testFilters
        }
      });

      expect(messagesQueryResponse).to.have.property('message');
      expect(messagesQueryResponse).to.have.property('messageCid');
      expect(messagesQueryResponse).to.have.property('reply');

      const messagesQueryMessage = messagesQueryResponse.message!;
      expect(messagesQueryMessage.descriptor).to.have.property('cursor', testCursor);
      expect(messagesQueryMessage.descriptor.filters).to.deep.equal(testFilters);

      const messagesQueryReply = messagesQueryResponse.reply;
      expect(messagesQueryReply).to.have.property('status');
      expect(messagesQueryReply.status.code).to.equal(200);
      expect(messagesQueryReply.entries).to.have.length(0);
    });

    it('handles MessageSubscription', async () => {
      const receivedMessages: string[] = [];
      const subscriptionHandler = async (event: MessageEvent) => {
        const { message } = event;
        receivedMessages.push(await Message.getCid(message));
      };

      // create a subscription message for protocol 'https://schemas.xyz/example'
      const { reply: { status: subscribeStatus, subscription } } = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.MessagesSubscribe,
        messageParams : {
          filters: [{
            protocol: 'https://protocol.xyz/example'
          }]
        },
        subscriptionHandler
      });

      // Verify the response.
      expect(subscribeStatus.code).to.equal(200);
      expect(subscription).to.exist;

      // install the protocol, this will match the subscription filter
      const protocolDefinition: ProtocolDefinition = {
        published : true,
        protocol  : 'https://protocol.xyz/example',
        types     : {
          foo: {
            schema      : 'https://schemas.xyz/foo',
            dataFormats : ['text/plain', 'application/json']
          }
        },
        structure: {
          foo: {}
        }
      };

      let {messageCid: protocolMessageCid, reply: { status: protocolStatus } } = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.ProtocolsConfigure,
        messageParams : {
          definition: protocolDefinition
        }
      });
      expect(protocolStatus.code).to.equal(202);

      // create a test record that matches the subscription filter
      const dataBytes = Convert.string('Write 1').toUint8Array();
      let { messageCid: write1MessageCid, reply: { status: writeStatus } } = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsWrite,
        messageParams : {
          protocol     : 'https://protocol.xyz/example',
          protocolPath : 'foo',
          dataFormat   : 'text/plain',
          schema       : 'https://schemas.xyz/foo'
        },
        dataStream: new Blob([dataBytes])
      });
      expect(writeStatus.code).to.equal(202);

      // create another test record that matches the subscription filter
      const dataBytes2 = Convert.string('Write 2').toUint8Array();
      let { messageCid: write2MessageCid, reply: { status: writeStatus2 } } = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsWrite,
        messageParams : {
          protocol     : 'https://protocol.xyz/example',
          protocolPath : 'foo',
          dataFormat   : 'text/plain',
          schema       : 'https://schemas.xyz/foo'
        },
        dataStream: new Blob([dataBytes2])
      });
      expect(writeStatus2.code).to.equal(202);

      // create a message that does not match the subscription filter
      const dataBytes3 = Convert.string('Write 3').toUint8Array();
      let { reply: { status: writeStatus3 } } = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsWrite,
        messageParams : {
          dataFormat : 'text/plain',
          schema     : 'https://schemas.xyz/foo' // no protocol
        },
        dataStream: new Blob([dataBytes3])
      });
      expect(writeStatus3.code).to.equal(202);

      // close subscription
      await subscription!.close();

      // check that the subscription handler received the expected messages
      expect(receivedMessages).to.have.length(3);
      expect(receivedMessages).to.have.members([
        protocolMessageCid,
        write1MessageCid,
        write2MessageCid
      ]);
    });

    it('handles MessagesRead', async () => {
      // Create test data to write.
      const dataBytes = Convert.string('Hello, world!').toUint8Array();

      // Write a record to use for the MessagesRead test.
      let writeResponse = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsWrite,
        messageParams : {
          dataFormat : 'text/plain',
          schema     : 'https://schemas.xyz/example'
        },
        dataStream: new Blob([dataBytes])
      });
      expect(writeResponse.reply.status.code).to.equal(202);
      const writeMessage = writeResponse.message!;

      // Attempt to process the MessagesRead.
      let messagesReadResponse = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.MessagesRead,
        messageParams : {
          messageCid: writeResponse.messageCid!
        }
      });

      expect(messagesReadResponse).to.have.property('message');
      expect(messagesReadResponse).to.have.property('messageCid');
      expect(messagesReadResponse).to.have.property('reply');

      const messagesReadMessage = messagesReadResponse.message!;
      expect(messagesReadMessage.descriptor).to.have.property('messageCid');
      expect(messagesReadMessage.descriptor.messageCid).to.equal(writeResponse.messageCid);

      const messagesReadReply = messagesReadResponse.reply;
      expect(messagesReadReply).to.have.property('status');
      expect(messagesReadReply.status.code).to.equal(200);

      const retrievedRecordsWrite = messagesReadReply.entry!;
      expect(retrievedRecordsWrite.message).to.have.property('recordId', writeMessage.recordId);

      const readDataBytes = await NodeStream.consumeToBytes({ readable: retrievedRecordsWrite.data! });
      expect(readDataBytes).to.deep.equal(dataBytes);
    });

    it('handles ProtocolsConfigure', async () => {
      let protocolsConfigureResponse = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.ProtocolsConfigure,
        messageParams : {
          definition: emailProtocolDefinition
        }
      });

      expect(protocolsConfigureResponse).to.have.property('message');
      expect(protocolsConfigureResponse).to.have.property('messageCid');
      expect(protocolsConfigureResponse).to.have.property('reply');

      const configureMessage = protocolsConfigureResponse.message!;
      expect(configureMessage.descriptor).to.have.property('definition');
      expect(configureMessage.descriptor.definition).to.deep.equal(emailProtocolDefinition);

      const configureReply = protocolsConfigureResponse.reply;
      expect(configureReply).to.have.property('status');
      expect(configureReply.status.code).to.equal(202);
    });

    it('handles ProtocolsQuery', async () => {
      // Configure a protocol to use for the ProtocolsQuery test.
      let protocolsConfigureResponse = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.ProtocolsConfigure,
        messageParams : {
          definition: emailProtocolDefinition
        }
      });
      expect(protocolsConfigureResponse.reply.status.code).to.equal(202);

      // Attempt to query for the protocol that was just configured.
      let protocolsQueryResponse = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.ProtocolsQuery,
        messageParams : {
          filter: { protocol: emailProtocolDefinition.protocol },
        }
      });

      expect(protocolsQueryResponse).to.have.property('message');
      expect(protocolsQueryResponse).to.have.property('messageCid');
      expect(protocolsQueryResponse).to.have.property('reply');

      const queryReply = protocolsQueryResponse.reply;
      expect(queryReply).to.have.property('status');
      expect(queryReply.status.code).to.equal(200);
      expect(queryReply).to.have.property('entries');
      expect(queryReply.entries).to.have.length(1);

      if (!Array.isArray(queryReply.entries)) throw new Error('Type guard');
      if (queryReply.entries.length !== 1) throw new Error('Type guard');
      const protocolsConfigure = queryReply.entries[0];
      expect(protocolsConfigure.descriptor.definition).to.deep.equal(emailProtocolDefinition);
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

      const readDataBytes = await NodeStream.consumeToBytes({ readable: readReply.record!.data });
      expect(readDataBytes).to.deep.equal(dataBytes);
    });

    it('handles RecordsSubscribe message', async () => {
      const receivedMessages: RecordsWriteMessage[] = [];
      const subscriptionHandler = (event: MessageEvent) => {
        const { message } = event;
        if (!isDwnMessage(DwnInterface.RecordsWrite, message)) {
          expect.fail('Received message is not a RecordsWrite message');
        }
        receivedMessages.push(message);
      };

      // create a subscription message for schema 'https://schemas.xyz/example'
      const { reply: { status: subscribeStatus, subscription } } = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsSubscribe,
        messageParams : {
          filter: {
            schema: 'https://schemas.xyz/example'
          }
        },
        subscriptionHandler
      });

      // Verify the response.
      expect(subscribeStatus.code).to.equal(200);
      expect(subscription).to.exist;


      // create a test record that matches the subscription filter
      const dataBytes = Convert.string('Write 1').toUint8Array();
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
      const writeMessage1 = message!;

      // create another test record that matches the subscription filter
      const dataBytes2 = Convert.string('Write 2').toUint8Array();
      let { message: message2, reply: { status: writeStatus2 } } = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsWrite,
        messageParams : {
          dataFormat : 'text/plain',
          schema     : 'https://schemas.xyz/example'
        },
        dataStream: new Blob([dataBytes2])
      });
      expect(writeStatus2.code).to.equal(202);
      const writeMessage2 = message2!;

      // create a message that does not match the subscription filter
      const dataBytes3 = Convert.string('Write 3').toUint8Array();
      let { reply: { status: writeStatus3 } } = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsWrite,
        messageParams : {
          dataFormat : 'text/plain',
          schema     : 'https://schemas.xyz/other' // different schema
        },
        dataStream: new Blob([dataBytes3])
      });
      expect(writeStatus3.code).to.equal(202);

      // close subscription
      await subscription!.close();

      // check that the subscription handler received the expected messages
      expect(receivedMessages).to.have.length(2);
      expect(receivedMessages[0].recordId).to.equal(writeMessage1.recordId);
      expect(receivedMessages[1].recordId).to.equal(writeMessage2.recordId);
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

    it('returns a 202 Accepted status when the request is not stored', async () => {
      // spy on dwn.processMessage
      const processMessageSpy = sinon.spy(testHarness.agent.dwn.node, 'processMessage');

      // Attempt to process the RecordsWrite
      const dataBytes = Convert.string('Hello, world!').toUint8Array();
      let writeResponse = await testHarness.agent.dwn.processRequest({
        store         : false,
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
      expect(writeResponse.reply.status.code).to.equal(202);
      expect(writeResponse.reply.status.detail).to.equal('Accepted');

      // dwnProcessMessage should not have been called
      expect(processMessageSpy.called).to.be.false;
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

    it('handles RecordsWrite messages to sign as delegate owner', async () => {
      // install a protocol to use for the test
      const protocolDefinition: ProtocolDefinition = {
        published : true,
        protocol  : 'https://schemas.xyz/example',
        types     : {
          foo: {}
        },
        structure: {
          foo: {}
        }
      };

      // install for bob
      let { reply: { status: protocolStatus } } = await testHarness.agent.dwn.processRequest({
        author        : bob.did.uri,
        target        : bob.did.uri,
        messageType   : DwnInterface.ProtocolsConfigure,
        messageParams : {
          definition: protocolDefinition
        }
      });
      expect(protocolStatus.code).to.equal(202);

      // install for alice
      let { reply: { status: protocolStatus2 } } = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.ProtocolsConfigure,
        messageParams : {
          definition: protocolDefinition
        }
      });

      expect(protocolStatus2.code).to.equal(202);

      // create a DID for alice's Device X and grant it delegated write permissions to alice's DWN
      const aliceDeviceX = await testHarness.agent.identity.create({
        metadata  : { name: 'Alice Device X' },
        didMethod : 'jwk'
      });

      // create teh grant
      const recordsWriteDelegateGrant = await testHarness.agent.permissions.createGrant({
        author      : alice.did.uri,
        grantedTo   : aliceDeviceX.did.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        delegated   : true,
        scope       : { interface: DwnInterfaceName.Records, method: DwnMethodName.Write, protocol: protocolDefinition.protocol }
      });

      // bob authors a public record to his dwn
      const dataStream = new Blob([ Convert.string('Hello, world!').toUint8Array() ]);

      const bobWrite = await testHarness.agent.dwn.processRequest({
        author        : bob.did.uri,
        target        : bob.did.uri,
        messageType   : DwnInterface.RecordsWrite,
        messageParams : {
          published    : true,
          protocol     : protocolDefinition.protocol,
          protocolPath : 'foo',
          dataFormat   : 'text/plain'
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
        messageType         : DwnInterface.RecordsWrite,
        author              : alice.did.uri,
        target              : alice.did.uri,
        rawMessage          : message,
        signAsOwnerDelegate : true,
        granteeDid          : aliceDeviceX.did.uri,
        messageParams       : {
          dataFormat     : 'text/plain', // TODO: not necessary
          delegatedGrant : recordsWriteDelegateGrant.message,
        },
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

    it('should throw if attempting to sign as owner delegate without providing a delegated grant in the messageParams', async () => {
      // create a DID for alice's Device X and grant it delegated write permissions to alice's DWN
      const aliceDeviceX = await testHarness.agent.identity.create({
        metadata  : { name: 'Alice Device X' },
        didMethod : 'jwk'
      });

      // install a protocol to use for the test
      const protocolDefinition: ProtocolDefinition = {
        published : true,
        protocol  : 'https://schemas.xyz/example',
        types     : {
          foo: {}
        },
        structure: {
          foo: {}
        }
      };

      // install for bob
      let { reply: { status: protocolStatus } } = await testHarness.agent.dwn.processRequest({
        author        : bob.did.uri,
        target        : bob.did.uri,
        messageType   : DwnInterface.ProtocolsConfigure,
        messageParams : {
          definition: protocolDefinition
        }
      });
      expect(protocolStatus.code).to.equal(202);

      // install for alice
      let { reply: { status: protocolStatus2 } } = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.ProtocolsConfigure,
        messageParams : {
          definition: protocolDefinition
        }
      });

      expect(protocolStatus2.code).to.equal(202);

      // bob authors a public record to his dwn
      const dataStream = new Blob([ Convert.string('Hello, world!').toUint8Array() ]);

      const bobWrite = await testHarness.agent.dwn.processRequest({
        author        : bob.did.uri,
        target        : bob.did.uri,
        messageType   : DwnInterface.RecordsWrite,
        messageParams : {
          published    : true,
          protocol     : protocolDefinition.protocol,
          protocolPath : 'foo',
          dataFormat   : 'text/plain'
        },
        dataStream,
      });
      expect(bobWrite.reply.status.code).to.equal(202);
      const message = bobWrite.message!;

      // alice attempts to sign as owner delegate without providing a delegated grant in the messageParams
      try {
        await testHarness.agent.dwn.processRequest({
          messageType         : DwnInterface.RecordsWrite,
          author              : alice.did.uri,
          target              : alice.did.uri,
          rawMessage          : message,
          signAsOwnerDelegate : true,
          granteeDid          : aliceDeviceX.did.uri,
          dataStream,
        });

        expect.fail('Should have thrown');
      } catch(error:any) {
        expect(error.message).to.include('Requested to sign with a permission but no grant messageParams were provided in the request');
      }
    });

    it('should throw if attempting to sign as a delegate without providing a delegated grant in the messageParams', async () => {
      // create a DID for alice's Device X and grant it delegated write permissions to alice's DWN
      const aliceDeviceX = await testHarness.agent.identity.create({
        metadata  : { name: 'Alice Device X' },
        didMethod : 'jwk'
      });

      // alice attempts to sign as a grantee without providing a grant parameters in the messageParams
      try {
        const dataStream = new Blob([ Convert.string('Hello, world!').toUint8Array() ]);

        await testHarness.agent.dwn.processRequest({
          messageType   : DwnInterface.RecordsWrite,
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageParams : {
            dataFormat   : 'text/plain',
            protocol     : 'https://schemas.xyz/example',
            protocolPath : 'foo',
          },
          granteeDid: aliceDeviceX.did.uri,
          dataStream,
        });

        expect.fail('Should have thrown');
      } catch(error:any) {
        expect(error.message).to.include('AgentDwnApi: Requested to sign with a permission but no grant messageParams were provided in the request');
      }
    });
  });

  describe('sendRequest()', () => {
    let alice: BearerIdentity;

    before(async () => {
      await testHarness.clearStorage();
      await testHarness.createAgentDid();

      const testPortableIdentity: PortableIdentity = {
        portableDid: {
          uri      : 'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy',
          document : {
            id                 : 'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy',
            verificationMethod : [
              {
                id           : 'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy#0',
                type         : 'JsonWebKey',
                controller   : 'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy',
                publicKeyJwk : {
                  crv : 'Ed25519',
                  kty : 'OKP',
                  x   : 'mZXKvarfofrcrdTYzes2YneEsrbJFc1kE0O-d1cJPEw',
                  kid : 'EAlW6h08kqdLGEhR_o6hCnZpYpQ8QJavMp3g0BJ35IY',
                  alg : 'EdDSA',
                },
              },
              {
                id           : 'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy#sig',
                type         : 'JsonWebKey',
                controller   : 'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy',
                publicKeyJwk : {
                  crv : 'Ed25519',
                  kty : 'OKP',
                  x   : 'iIWijzQnfb_Jk4yRjISV6ci8EtyHn0fIxg0TVCh7wkE',
                  kid : '8QSlw4ct9taIgh23EUGLM0ELaukQ1VogIuBGrQ_UIsk',
                  alg : 'EdDSA',
                },
              },
              {
                id           : 'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy#enc',
                type         : 'JsonWebKey',
                controller   : 'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy',
                publicKeyJwk : {
                  kty : 'EC',
                  crv : 'secp256k1',
                  x   : 'P5FoqXk9W11i8FWyTpIvltAjV09FL9Q5o76wEHcxMtI',
                  y   : 'DgoLVlLKbjlaUja4RTjdxzqAy0ITOEFlCXGKSpu8XQs',
                  kid : 'hXXhIgfXRVIYqnKiX0DIL7ZGy0CBJrFQFIYxmRkAB-A',
                  alg : 'ES256K',
                },
              },
            ],
            authentication: [
              'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy#0',
              'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy#sig',
            ],
            assertionMethod: [
              'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy#0',
              'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy#sig',
            ],
            capabilityDelegation: [
              'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy#0',
            ],
            capabilityInvocation: [
              'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy#0',
            ],
            keyAgreement: [
              'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy#enc',
            ],
            service: [
              {
                id              : 'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy#dwn',
                type            : 'DecentralizedWebNode',
                serviceEndpoint : testDwnUrls,
                enc             : '#enc',
                sig             : '#sig',
              },
            ],
          },
          metadata: {
            published : true,
            versionId : '1708160454',
          },
          privateKeys: [
            {
              crv : 'Ed25519',
              d   : 'gXu7HmJgvZFWgNf_eqF-eDAFegd0OLe8elAIXXGMgoc',
              kty : 'OKP',
              x   : 'mZXKvarfofrcrdTYzes2YneEsrbJFc1kE0O-d1cJPEw',
              kid : 'EAlW6h08kqdLGEhR_o6hCnZpYpQ8QJavMp3g0BJ35IY',
              alg : 'EdDSA',
            },
            {
              crv : 'Ed25519',
              d   : 'SiUL1QDp6X2QnvJ1Q7hRlpo3ZhiVjRlvINocOzYPaBU',
              kty : 'OKP',
              x   : 'iIWijzQnfb_Jk4yRjISV6ci8EtyHn0fIxg0TVCh7wkE',
              kid : '8QSlw4ct9taIgh23EUGLM0ELaukQ1VogIuBGrQ_UIsk',
              alg : 'EdDSA',
            },
            {
              kty : 'EC',
              crv : 'secp256k1',
              d   : 'b2gb-OfB5X4G3xd16u19MXNkamDP5lsT6bVsDN4aeuY',
              x   : 'P5FoqXk9W11i8FWyTpIvltAjV09FL9Q5o76wEHcxMtI',
              y   : 'DgoLVlLKbjlaUja4RTjdxzqAy0ITOEFlCXGKSpu8XQs',
              kid : 'hXXhIgfXRVIYqnKiX0DIL7ZGy0CBJrFQFIYxmRkAB-A',
              alg : 'ES256K',
            },
          ],
        },
        metadata: {
          name   : 'Alice',
          tenant : 'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy',
          uri    : 'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy'
        }
      };

      alice = await testHarness.agent.identity.import({
        portableIdentity: testPortableIdentity
      });

      // Ensure the DID is published to the DHT. This step is necessary while the DHT Gateways
      // operated by TBD are regularly restarted and DIDs are no longer persisted.
      await DidDht.publish({ did: alice.did });
    });

    after(async () => {
      await testHarness.clearStorage();
    });

    it('handles sending existing message using `messageCid` request property', async () => {
      // Create test data to write.
      const dataBytes = Convert.string('Hello, world!').toUint8Array();

      // Write a record to the local DWN to use for the test.
      let writeResponse = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsWrite,
        messageParams : {
          dataFormat : 'text/plain',
          schema     : 'https://schemas.xyz/example'
        },
        dataStream: new Blob([dataBytes])
      });
      expect(writeResponse.reply.status.code).to.equal(202);

      // sendRequest using the message's `messageCid`
      const sendResponse = await testHarness.agent.dwn.sendRequest({
        author      : alice.did.uri,
        target      : alice.did.uri,
        messageType : DwnInterface.RecordsWrite,
        messageCid  : writeResponse.messageCid
      });

      // Verify the response.
      expect(sendResponse.message).to.deep.equal(writeResponse.message);
      expect(sendResponse.messageCid).to.equal(writeResponse.messageCid);
      expect(sendResponse.reply.status.code).to.equal(202);
    });

    it('should fail when sending a message with a `messageCid` that does not exist', async () => {
      // Attempt to send a message with an invalid `messageCid`.
      try {
        const messageCid = await TestDataGenerator.randomCborSha256Cid();

        await testHarness.agent.dwn.sendRequest({
          author      : alice.did.uri,
          target      : alice.did.uri,
          messageType : DwnInterface.RecordsWrite,
          messageCid,
        });
        expect.fail('Expected an error to be thrown');
      } catch (error:any) {
        expect(error.message).to.contain('AgentDwnApi: Failed to read message');
      }
    });

    it('handles MessagesQuery', async () => {
      const testCursor = {
        messageCid : 'foo',
        value      : 'bar'
      };

      const testFilters = [{ protocol: 'http://protocol1' }];

      // Attempt to process the MessagesQuery.
      let messagesQueryResponse = await testHarness.agent.dwn.sendRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.MessagesQuery,
        messageParams : {
          cursor  : testCursor,
          filters : testFilters
        }
      });

      expect(messagesQueryResponse).to.have.property('message');
      expect(messagesQueryResponse).to.have.property('messageCid');
      expect(messagesQueryResponse).to.have.property('reply');

      const messagesQueryMessage = messagesQueryResponse.message!;
      expect(messagesQueryMessage.descriptor).to.have.property('cursor', testCursor);
      expect(messagesQueryMessage.descriptor.filters).to.deep.equal(testFilters);

      const messagesQueryReply = messagesQueryResponse.reply;
      expect(messagesQueryReply).to.have.property('status');
      expect(messagesQueryReply.status.code).to.equal(200);
      expect(messagesQueryReply.entries).to.have.length(0);
    });

    it('handles MessagesSubscribe', async () => {
      const receivedMessages: string[] = [];
      const subscriptionHandler = async (event: MessageEvent) => {
        const { message } = event;
        receivedMessages.push(await Message.getCid(message));
      };

      // create a subscription message for protocol 'https://schemas.xyz/example'
      const { reply: { status: subscribeStatus, subscription } } = await testHarness.agent.dwn.sendRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.MessagesSubscribe,
        messageParams : {
          filters: [{
            protocol: 'https://protocol.xyz/example'
          }]
        },
        subscriptionHandler
      });

      // Verify the response.
      expect(subscribeStatus.code).to.equal(200);
      expect(subscription).to.exist;

      // install the protocol, this will match the subscription filter
      const protocolDefinition: ProtocolDefinition = {
        published : true,
        protocol  : 'https://protocol.xyz/example',
        types     : {
          foo: {
            schema      : 'https://schemas.xyz/foo',
            dataFormats : ['text/plain', 'application/json']
          }
        },
        structure: {
          foo: {}
        }
      };

      let {messageCid: protocolMessageCid, reply: { status: protocolStatus } } = await testHarness.agent.dwn.sendRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.ProtocolsConfigure,
        messageParams : {
          definition: protocolDefinition
        }
      });
      expect(protocolStatus.code).to.equal(202);

      // create a test record that matches the subscription filter
      const dataBytes = Convert.string('Write 1').toUint8Array();
      let { messageCid: write1MessageCid, reply: { status: writeStatus } } = await testHarness.agent.dwn.sendRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsWrite,
        messageParams : {
          protocol     : 'https://protocol.xyz/example',
          protocolPath : 'foo',
          dataFormat   : 'text/plain',
          schema       : 'https://schemas.xyz/foo'
        },
        dataStream: new Blob([dataBytes])
      });
      expect(writeStatus.code).to.equal(202);

      // create another test record that matches the subscription filter
      const dataBytes2 = Convert.string('Write 2').toUint8Array();
      let { messageCid: write2MessageCid, reply: { status: writeStatus2 } } = await testHarness.agent.dwn.sendRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsWrite,
        messageParams : {
          protocol     : 'https://protocol.xyz/example',
          protocolPath : 'foo',
          dataFormat   : 'text/plain',
          schema       : 'https://schemas.xyz/foo'
        },
        dataStream: new Blob([dataBytes2])
      });
      expect(writeStatus2.code).to.equal(202);

      // create a message that does not match the subscription filter
      const dataBytes3 = Convert.string('Write 3').toUint8Array();
      let { reply: { status: writeStatus3 } } = await testHarness.agent.dwn.sendRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsWrite,
        messageParams : {
          dataFormat : 'text/plain',
          schema     : 'https://schemas.xyz/foo' // no protocol
        },
        dataStream: new Blob([dataBytes3])
      });
      expect(writeStatus3.code).to.equal(202);

      // close subscription
      await subscription!.close();

      // check that the subscription handler received the expected messages
      expect(receivedMessages).to.have.length(3);
      expect(receivedMessages).to.have.members([
        protocolMessageCid,
        write1MessageCid,
        write2MessageCid
      ]);
    });

    it('handles MessagesRead', async () => {
      // Create test data to write.
      const dataBytes = Convert.string('Hello, world!').toUint8Array();

      // Write a record to use for the MessagesRead test.
      let writeResponse = await testHarness.agent.dwn.sendRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsWrite,
        messageParams : {
          dataFormat : 'text/plain',
          schema     : 'https://schemas.xyz/example'
        },
        dataStream: new Blob([dataBytes])
      });
      expect(writeResponse.reply.status.code).to.equal(202);
      const writeMessage = writeResponse.message!;

      // Attempt to process the MessagesRead.
      let messagesReadResponse = await testHarness.agent.dwn.sendRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.MessagesRead,
        messageParams : {
          messageCid: writeResponse.messageCid!
        }
      });

      expect(messagesReadResponse).to.have.property('message');
      expect(messagesReadResponse).to.have.property('messageCid');
      expect(messagesReadResponse).to.have.property('reply');

      const messagesReadMessage = messagesReadResponse.message!;
      expect(messagesReadMessage.descriptor).to.have.property('messageCid');
      expect(messagesReadMessage.descriptor.messageCid).to.equal(writeResponse.messageCid);

      const messagesReadReply = messagesReadResponse.reply;
      expect(messagesReadReply).to.have.property('status');
      expect(messagesReadReply.status.code).to.equal(200);
      const retrievedRecordsWrite = messagesReadReply.entry!;
      expect(retrievedRecordsWrite.message).to.have.property('recordId', writeMessage.recordId);

      const dataStream: ReadableStream | Readable = retrievedRecordsWrite.data!;
      // If the data stream is a web ReadableStream, convert it to a Node.js Readable.
      const nodeReadable = Stream.isReadableStream(dataStream) ?
        NodeStream.fromWebReadable({ readableStream: dataStream }) :
        dataStream;

      const readDataBytes = await NodeStream.consumeToBytes({ readable: nodeReadable });
      expect(readDataBytes).to.deep.equal(dataBytes);
    });

    it('handles ProtocolsConfigure', async () => {
      let protocolsConfigureResponse = await testHarness.agent.dwn.sendRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.ProtocolsConfigure,
        messageParams : {
          definition: emailProtocolDefinition
        }
      });

      expect(protocolsConfigureResponse).to.have.property('message');
      expect(protocolsConfigureResponse).to.have.property('messageCid');
      expect(protocolsConfigureResponse).to.have.property('reply');

      const configureMessage = protocolsConfigureResponse.message!;
      expect(configureMessage.descriptor).to.have.property('definition');
      expect(configureMessage.descriptor.definition).to.deep.equal(emailProtocolDefinition);

      const configureReply = protocolsConfigureResponse.reply;
      expect(configureReply).to.have.property('status');
      expect(configureReply.status.code).to.equal(202);
    });

    it('handles ProtocolsQuery', async () => {
      // Configure a protocol to use for the ProtocolsQuery test.
      let protocolsConfigureResponse = await testHarness.agent.dwn.sendRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.ProtocolsConfigure,
        messageParams : {
          definition: emailProtocolDefinition
        }
      });
      expect(protocolsConfigureResponse.reply.status.code).to.equal(202);

      // Attempt to query for the protocol that was just configured.
      let protocolsQueryResponse = await testHarness.agent.dwn.sendRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.ProtocolsQuery,
        messageParams : {
          filter: { protocol: emailProtocolDefinition.protocol },
        }
      });

      expect(protocolsQueryResponse).to.have.property('message');
      expect(protocolsQueryResponse).to.have.property('messageCid');
      expect(protocolsQueryResponse).to.have.property('reply');

      const queryReply = protocolsQueryResponse.reply;
      expect(queryReply).to.have.property('status');
      expect(queryReply.status.code).to.equal(200);
      expect(queryReply).to.have.property('entries');
      expect(queryReply.entries).to.have.length(1);

      if (!Array.isArray(queryReply.entries)) throw new Error('Type guard');
      if (queryReply.entries.length !== 1) throw new Error('Type guard');
      const protocolsConfigure = queryReply.entries[0];
      expect(protocolsConfigure.descriptor.definition).to.deep.equal(emailProtocolDefinition);
    });

    it('handles RecordsDelete messages', async () => {
      // Create test data to write.
      const dataBytes = Convert.string('Hello, world!').toUint8Array();

      // Write a record that can be deleted.
      let { message, reply: { status: writeStatus } } = await testHarness.agent.dwn.sendRequest({
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
      const deleteResponse = await testHarness.agent.dwn.sendRequest({
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

    it('handles RecordsQuery Messages', async () => {
      // Create test data to write.
      const dataBytes = Convert.string('Hello, world!').toUint8Array();

      // Write a record that can be queried for.
      let { message, reply: { status: writeStatus } } = await testHarness.agent.dwn.sendRequest({
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
      const queryResponse = await testHarness.agent.dwn.sendRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsQuery,
        messageParams : {
          filter: {
            recordId: writeMessage.recordId
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
      let { message, reply: { status: writeStatus } } = await testHarness.agent.dwn.sendRequest({
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
      const readResponse = await testHarness.agent.dwn.sendRequest({
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

      const dataStream: ReadableStream | Readable = readReply.record!.data;
      // If the data stream is a web ReadableStream, convert it to a Node.js Readable.
      const nodeReadable = Stream.isReadableStream(dataStream) ?
        NodeStream.fromWebReadable({ readableStream: dataStream }) :
        dataStream;

      const readDataBytes = await NodeStream.consumeToBytes({ readable: nodeReadable });
      expect(readDataBytes).to.deep.equal(dataBytes);
    });

    it('handles RecordsSubscribe message', async () => {
      const receivedMessages: RecordsWriteMessage[] = [];
      const subscriptionHandler = (event: MessageEvent) => {
        const { message } = event;
        if (!isDwnMessage(DwnInterface.RecordsWrite, message)) {
          expect.fail('Received message is not a RecordsWrite message');
        }
        receivedMessages.push(message);
      };

      // create a subscription message for schema 'https://schemas.xyz/example'
      const { reply: { status: subscribeStatus, subscription } } = await testHarness.agent.dwn.sendRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsSubscribe,
        messageParams : {
          filter: {
            schema: 'https://schemas.xyz/example'
          }
        },
        subscriptionHandler
      });

      // Verify the response.
      expect(subscribeStatus.code).to.equal(200);
      expect(subscription).to.exist;


      // create a test record that matches the subscription filter
      const dataBytes = Convert.string('Write 1').toUint8Array();
      let { message, reply: { status: writeStatus } } = await testHarness.agent.dwn.sendRequest({
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
      const writeMessage1 = message!;

      // create another test record that matches the subscription filter
      const dataBytes2 = Convert.string('Write 2').toUint8Array();
      let { message: message2, reply: { status: writeStatus2 } } = await testHarness.agent.dwn.sendRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsWrite,
        messageParams : {
          dataFormat : 'text/plain',
          schema     : 'https://schemas.xyz/example'
        },
        dataStream: new Blob([dataBytes2])
      });
      expect(writeStatus2.code).to.equal(202);
      const writeMessage2 = message2!;

      // create a message that does not match the subscription filter
      const dataBytes3 = Convert.string('Write 3').toUint8Array();
      let { reply: { status: writeStatus3 } } = await testHarness.agent.dwn.sendRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsWrite,
        messageParams : {
          dataFormat : 'text/plain',
          schema     : 'https://schemas.xyz/other' // different schema
        },
        dataStream: new Blob([dataBytes3])
      });
      expect(writeStatus3.code).to.equal(202);

      // close subscription
      await subscription!.close();

      // check that the subscription handler received the expected messages
      expect(receivedMessages).to.have.length(2);
      expect(receivedMessages[0].recordId).to.equal(writeMessage1.recordId);
      expect(receivedMessages[1].recordId).to.equal(writeMessage2.recordId);
    });

    it('handles RecordsWrite messages', async () => {
      // Create test data to write.
      const dataBytes = Convert.string('Hello, world!').toUint8Array();

      // Attempt to process the RecordsWrite
      let writeResponse = await testHarness.agent.dwn.sendRequest({
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

    it('should use a secure (wss) transport when the dwnUrl is also secure (https)', async () => {

      // mock the dereference method to return a DWN service endpoint that is secure (https)
      sinon.stub(testHarness.agent.did, 'dereference').resolves({
        dereferencingMetadata : {},
        contentMetadata       : {},
        contentStream         : {
          id              : '#dwn',
          type            : 'DecentralizedWebNode',
          serviceEndpoint : ['https://localhost'], // secure endpoint
          enc             : '#enc',
          sig             : '#sig'
        }
      });

      // stub the serverInfo to return true for `webSocketSupport`
      sinon.stub(testHarness.agent.rpc, 'getServerInfo').resolves({
        registrationRequirements : [],
        maxFileSize              : 1000000,
        webSocketSupport         : true
      });

      // stub the sendDwnRequest method to return a 500 error as it doesn't matter if the request is successful or not
      const sendDwnRequestStub = sinon.stub(testHarness.agent.rpc, 'sendDwnRequest').resolves({
        status: {
          code   : 500,
          detail : 'Internal Server Error'
        }
      });

      // Attempt to process a RecordsSubscribe message
      await testHarness.agent.dwn.sendRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsSubscribe,
        messageParams : {
          filter: {
            schema: 'https://schemas.xyz/example'
          }
        },
        subscriptionHandler: () => {}
      });

      // the dwnUrl should be 'wss://localhost' as the server http(s) transport is secure
      const { dwnUrl } = sendDwnRequestStub.args[0][0];
      expect(dwnUrl).to.equal('wss://localhost/');
    });

    it('should use a non-secure (ws) transport when the dwnUrl is also non-secure (http)', async () => {

      // mock the dereference method to return a DWN service endpoint that is insecure (http)
      sinon.stub(testHarness.agent.did, 'dereference').resolves({
        dereferencingMetadata : {},
        contentMetadata       : {},
        contentStream         : {
          id              : '#dwn',
          type            : 'DecentralizedWebNode',
          serviceEndpoint : ['http://localhost'], // secure endpoint
          enc             : '#enc',
          sig             : '#sig'
        }
      });

      // stub the serverInfo to return true for `webSocketSupport`
      sinon.stub(testHarness.agent.rpc, 'getServerInfo').resolves({
        registrationRequirements : [],
        maxFileSize              : 1000000,
        webSocketSupport         : true
      });

      // stub the sendDwnRequest method to return a 500 error as it doesn't matter if the request is successful or not
      const sendDwnRequestStub = sinon.stub(testHarness.agent.rpc, 'sendDwnRequest').resolves({
        status: {
          code   : 500,
          detail : 'Internal Server Error'
        }
      });

      // Attempt to process a RecordsSubscribe message
      await testHarness.agent.dwn.sendRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsSubscribe,
        messageParams : {
          filter: {
            schema: 'https://schemas.xyz/example'
          }
        },
        subscriptionHandler: () => {}
      });

      // the dwnUrl should be 'ws://localhost/' as the server http transport is insecure
      const { dwnUrl } = sendDwnRequestStub.args[0][0];
      expect(dwnUrl).to.equal('ws://localhost/');
    });

    it('throws an error if target DID does not contain websocket support', async () => {
      // stub the serverInfo to return false for `webSocketSupport`
      sinon.stub(testHarness.agent.rpc, 'getServerInfo').resolves({
        registrationRequirements : [],
        maxFileSize              : 1000000,
        webSocketSupport         : false
      });

      try {
        await testHarness.agent.dwn.sendRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsSubscribe,
          messageParams : {
            filter: {
              schema: 'https://schemas.xyz/example'
            }
          },
          dataStream          : new Blob([Convert.string('Hello, world!').toUint8Array()]),
          subscriptionHandler : () => {}
        });
        expect.fail('Expected an error to be thrown');

      } catch (error: any) {
        expect(error.message).to.include('Failed to send DWN RPC request');
        expect(error.message).to.include('WebSocket support is not enabled on the server.');
      }
    });

    it('throws an error if sendDwnRequest fails', async () => {
      // stub sendDwnRequest to reject with an error
      sinon.stub(testHarness.agent.rpc, 'sendDwnRequest').rejects(new Error('sendDwnRequest Error'));

      try {
        await testHarness.agent.dwn.sendRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : {
            filter: {
              schema: 'https://schemas.xyz/example'
            }
          },
        });
        expect.fail('Expected an error to be thrown');

      } catch (error: any) {
        expect(error.message).to.include('Failed to send DWN RPC request');
        expect(error.message).to.include('sendDwnRequest Error');
      }
    });

    it('throws an error if target DID method is not supported by the Agent DID Resolver', async () => {
      try {
        await testHarness.agent.dwn.sendRequest({
          author        : alice.did.uri,
          target        : 'did:test:abc123',
          messageType   : DwnInterface.RecordsQuery,
          messageParams : {
            filter: {
              schema: 'https://schemas.xyz/example'
            }
          }
        });
        expect.fail('Expected an error to be thrown');

      } catch (error: any) {
        expect(error.message).to.include('methodNotSupported');
      }
    });

    it('throws an error if target DID has no #dwn service endpoints', async () => {
      // Create a new Identity but don't store or publish the DID DHT document.
      const identity = await testHarness.agent.identity.create({
        metadata   : { name: 'Test Identity' },
        didMethod  : 'dht',
        didOptions : { services: [], publish: false },
        store      : false
      });

      try {
        await testHarness.agent.dwn.sendRequest({
          author        : identity.did.uri,
          target        : identity.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : {
            filter: {
              schema: 'https://schemas.xyz/example'
            }
          }
        });
        expect.fail('Expected an error to be thrown');

      } catch (error: any) {
        expect(error.message).to.include('Failed to dereference');
      }
    });

    it('throws an error when a Subscribe method is called without a subscriptionHandler', async () => {

      // RecordsSubscribe message without a subscriptionHandler
      try {
        await testHarness.agent.dwn.sendRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsSubscribe,
          messageParams : {
            filter: {
              schema: 'https://schemas.xyz/example'
            }
          }
        });
        expect.fail('Expected an error to be thrown');

      } catch (error: any) {
        expect(error.message).to.include('AgentDwnApi: Subscription handler is required for subscription requests.');
      }

      // MessagesSubscribe message without a subscriptionHandler
      try {
        await testHarness.agent.dwn.sendRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.MessagesSubscribe,
          messageParams : {}
        });
        expect.fail('Expected an error to be thrown');

      } catch (error: any) {
        expect(error.message).to.include('AgentDwnApi: Subscription handler is required for subscription requests.');
      }
    });

    it('throws an error when DwnRequest fails validation', async () => {
      try {
        await testHarness.agent.dwn.sendRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : {
            // @ts-expect-error - because the filter is an incorrect type.
            filter: true
          }
        });
      } catch (error: any) {
        expect(error.message).to.include('/descriptor/filter: must NOT have fewer than 1 properties');
      }
    });
  });
});

describe('isDwnMessage', () => {
  it('asserts the type of DWN message', async () => {
    const { message: recordsWriteMessage } = await TestDataGenerator.generateRecordsWrite();
    const { message: recordsQueryMessage } = await TestDataGenerator.generateRecordsQuery();

    // positive tests
    expect(isDwnMessage(DwnInterface.RecordsWrite, recordsWriteMessage)).to.be.true;
    expect(isDwnMessage(DwnInterface.RecordsQuery, recordsQueryMessage)).to.be.true;

    // negative tests
    expect(isDwnMessage(DwnInterface.RecordsQuery, recordsWriteMessage)).to.be.false;
    expect(isDwnMessage(DwnInterface.RecordsWrite, recordsQueryMessage)).to.be.false;
  });
});

describe('isRecordPermissionScope', () => {
  it('asserts the type of RecordPermissionScope', async () => {
    // messages read scope to test negative case
    const messagesReadScope:DwnPermissionScope = {
      interface : DwnInterfaceName.Messages,
      method    : DwnMethodName.Read
    };

    expect(isRecordPermissionScope(messagesReadScope)).to.be.false;

    // records read scope to test positive case
    const recordsReadScope:DwnPermissionScope = {
      interface : DwnInterfaceName.Records,
      method    : DwnMethodName.Read,
      protocol  : 'https://schemas.xyz/example'
    };

    expect(isRecordPermissionScope(recordsReadScope)).to.be.true;
  });
});

describe('isMessagesPermissionScope', () => {
  it('asserts the type of RecordPermissionScope', async () => {

    // records read scope to test negative case
    const recordsReadScope:DwnPermissionScope = {
      interface : DwnInterfaceName.Records,
      method    : DwnMethodName.Read,
      protocol  : 'https://schemas.xyz/example'
    };

    expect(isMessagesPermissionScope(recordsReadScope)).to.be.false;

    // messages read scope to test positive case
    const messagesReadScope:DwnPermissionScope = {
      interface : DwnInterfaceName.Messages,
      method    : DwnMethodName.Read
    };

    expect(isMessagesPermissionScope(messagesReadScope)).to.be.true;

  });
});