import chai, { expect } from 'chai';
import { Convert } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';
import {
  Dwn,
  Message,
  RecordsRead,
  EventsGetReply,
  EventsGetMessage,
  MessagesGetReply,
  RecordsQueryReply,
  UnionMessageReply,
  MessagesGetMessage,
  RecordsQueryMessage,
  RecordsWriteMessage,
  RecordsDeleteMessage,
  ProtocolsConfigureMessage,
} from '@tbd54566975/dwn-sdk-js';

import { testDwnUrl } from './utils/test-config.js';
import { TestAgent } from './utils/test-agent.js';
import { DwnManager } from '../src/dwn-manager.js';
import { ManagedIdentity } from '../src/identity-manager.js';
import { TestManagedAgent } from '../src/test-managed-agent.js';
import emailProtocolDefinition from './fixtures/protocol-definitions/email.json' assert { type: 'json' };

// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';

// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;

chai.use(chaiAsPromised);

let testDwnUrls: string[] = [testDwnUrl];

describe('DwnManager', () => {

  describe(`with dwn data stores`, () => {
    let testAgent: TestManagedAgent;

    before(async () => {
      testAgent = await TestManagedAgent.create({
        agentClass  : TestAgent,
        agentStores : 'dwn'
      });
    });

    after(async () => {
      await testAgent.clearStorage();
      await testAgent.closeStorage();
    });

    describe('processRequest()', () => {
      let alice: ManagedIdentity;
      let bob: ManagedIdentity;

      beforeEach(async () => {
        await testAgent.clearStorage();
        await testAgent.createAgentDid();
        // Creates a new Identity to author the DWN messages.
        alice = await testAgent.agent.identityManager.create({
          name      : 'Alice',
          didMethod : 'key',
          kms       : 'local'
        });

        bob = await testAgent.agent.identityManager.create({
          name      : 'Bob',
          didMethod : 'key',
          kms       : 'local'
        });
      });

      it('handles EventsGet', async () => {
        const testCursor = {
          messageCid : 'foo',
          value      : 'bar'
        };

        // Attempt to process the EventsGet.
        let eventsGetResponse = await testAgent.agent.dwnManager.processRequest({
          author         : alice.did,
          target         : alice.did,
          messageType    : 'EventsGet',
          messageOptions : {
            cursor: testCursor,
          }
        });

        expect(eventsGetResponse).to.have.property('message');
        expect(eventsGetResponse).to.have.property('messageCid');
        expect(eventsGetResponse).to.have.property('reply');

        const eventsGetMessage = eventsGetResponse.message as EventsGetMessage;
        expect(eventsGetMessage.descriptor).to.have.property('cursor', testCursor);

        const eventsGetReply = eventsGetResponse.reply as EventsGetReply;
        expect(eventsGetReply).to.have.property('status');
        expect(eventsGetReply.status.code).to.equal(200);
        expect(eventsGetReply.entries).to.have.length(0);
      });

      it('handles MessagesGet', async () => {
        // Create test data to write.
        const dataBytes = Convert.string('Hello, world!').toUint8Array();

        // Write a record to use for the MessagesGet test.
        let { message, reply: { status: writeStatus } } = await testAgent.agent.dwnManager.processRequest({
          author         : alice.did,
          target         : alice.did,
          messageType    : 'RecordsWrite',
          messageOptions : {
            dataFormat : 'text/plain',
            schema     : 'https://schemas.xyz/example'
          },
          dataStream: new Blob([dataBytes])
        });
        expect(writeStatus.code).to.equal(202);
        const writeMessage = message as RecordsWriteMessage;

        // Get the message CID to attempt to get.
        const messageCid = await Message.getCid(writeMessage);

        // Attempt to process the MessagesGet.
        let messagesGetResponse = await testAgent.agent.dwnManager.processRequest({
          author         : alice.did,
          target         : alice.did,
          messageType    : 'MessagesGet',
          messageOptions : {
            messageCids: [messageCid]
          }
        });

        expect(messagesGetResponse).to.have.property('message');
        expect(messagesGetResponse).to.have.property('messageCid');
        expect(messagesGetResponse).to.have.property('reply');

        const messagesGetMessage = messagesGetResponse.message as MessagesGetMessage;
        expect(messagesGetMessage.descriptor).to.have.property('messageCids');
        expect(messagesGetMessage.descriptor.messageCids).to.have.length(1);
        expect(messagesGetMessage.descriptor.messageCids).to.include(messageCid);

        const messagesGetReply = messagesGetResponse.reply as MessagesGetReply;
        expect(messagesGetReply).to.have.property('status');
        expect(messagesGetReply.status.code).to.equal(200);
        expect(messagesGetReply.entries).to.have.length(1);

        if (!Array.isArray(messagesGetReply.entries)) throw new Error('Type guard');
        if (messagesGetReply.entries.length !== 1) throw new Error('Type guard');
        const [ retrievedRecordsWrite ] = messagesGetReply.entries;
        expect(retrievedRecordsWrite.message).to.have.property('recordId', writeMessage.recordId);
      });

      it('handles ProtocolsConfigure', async () => {
        let protocolsConfigureResponse = await testAgent.agent.dwnManager.processRequest({
          author         : alice.did,
          target         : alice.did,
          messageType    : 'ProtocolsConfigure',
          messageOptions : {
            definition: emailProtocolDefinition
          }
        });

        expect(protocolsConfigureResponse).to.have.property('message');
        expect(protocolsConfigureResponse).to.have.property('messageCid');
        expect(protocolsConfigureResponse).to.have.property('reply');

        const configureMessage = protocolsConfigureResponse.message as ProtocolsConfigureMessage;
        expect(configureMessage.descriptor).to.have.property('definition');
        expect(configureMessage.descriptor.definition).to.deep.equal(emailProtocolDefinition);

        const configureReply = protocolsConfigureResponse.reply;
        expect(configureReply).to.have.property('status');
        expect(configureReply.status.code).to.equal(202);
      });


    });

    describe('sendDwnRequest()', () => {
      let identity: ManagedIdentity;

      before(async () => {
        await testAgent.createAgentDid();

        const services = [{
          id              : '#dwn',
          type            : 'DecentralizedWebNode',
          serviceEndpoint : {
            encryptionKeys : ['#dwn-enc'],
            nodes          : testDwnUrls,
            signingKeys    : ['#dwn-sig']
          }
        }];

        // Creates a new Identity to author the DWN messages.
        identity = await testAgent.agent.identityManager.create({
          name       : 'Alice',
          didMethod  : 'ion',
          didOptions : { services },
          kms        : 'local'
        });
      });

      after(async () => {
        await testAgent.clearStorage();
      });

      it('throws an exception if target DID cannot be resolved', async () => {
        await expect(
          testAgent.agent.sendDwnRequest({
            author         : identity.did,
            target         : 'did:test:abc123',
            messageType    : 'RecordsQuery',
            messageOptions : {
              filter: {
                schema: 'https://schemas.xyz/example'
              }
            }
          })
        ).to.eventually.be.rejectedWith(Error, 'DwnManager: methodNotSupported: Method not supported: test');
      });

      it('throws an exception if target DID has no #dwn service endpoints', async () => {
        const identity = await testAgent.agent.identityManager.create({
          name       : 'Alice',
          didMethod  : 'ion',
          didOptions : { services: [] },
          kms        : 'local'
        });

        await expect(
          testAgent.agent.sendDwnRequest({
            author         : identity.did,
            target         : identity.did,
            messageType    : 'RecordsQuery',
            messageOptions : {
              filter: {
                schema: 'https://schemas.xyz/example'
              }
            }
          })
        ).to.eventually.be.rejectedWith(Error, `has no service endpoints with ID '#dwn'`);
      });

      it('handles RecordsDelete Messages', async () => {
        const response = await testAgent.agent.sendDwnRequest({
          author         : identity.did,
          target         : identity.did,
          messageType    : 'RecordsDelete',
          messageOptions : {
            recordId: 'abcd123'
          }
        });

        expect(response.reply).to.exist;
        expect(response.reply.status).to.exist;
        expect(response.reply.status.code).to.equal(404);
      });

      it('handles RecordsQuery Messages', async () => {
        const response = await testAgent.agent.sendDwnRequest({
          author         : identity.did,
          target         : identity.did,
          messageType    : 'RecordsQuery',
          messageOptions : {
            filter: {
              schema: 'https://schemas.xyz/example'
            }
          }
        });

        expect(response.reply).to.exist;
        expect(response.message).to.exist;
        expect(response.messageCid).to.exist;
        expect(response.reply.status).to.exist;
        expect(response.reply.entries).to.exist;
        expect(response.reply.status.code).to.equal(200);
      });

      it('handles RecordsRead Messages', async () => {
        const dataBytes = Convert.string('Hi').toUint8Array();

        let response = await testAgent.agent.sendDwnRequest({
          author         : identity.did,
          target         : identity.did,
          messageType    : 'RecordsWrite',
          messageOptions : {
            dataFormat : 'text/plain',
            data       : dataBytes
          },
          dataStream: new Blob([dataBytes])
        });

        const message = response.message as RecordsWriteMessage;

        response = await testAgent.agent.sendDwnRequest({
          author         : identity.did,
          target         : identity.did,
          messageType    : 'RecordsRead',
          messageOptions : {
            filter: {
              recordId: message.recordId
            }
          }
        });

        expect(response.reply.status.code).to.equal(200);
        expect(response.message).to.exist;

        const readMessage = response.message as RecordsRead['message'];
        expect(readMessage.descriptor.method).to.equal('Read');
        expect(readMessage.descriptor.interface).to.equal('Records');

        const readReply = response.reply;
        expect(readReply.record).to.exist;

        const record = readReply.record as unknown as RecordsWriteMessage & { data: ReadableStream };
        expect(record.recordId).to.equal(message.recordId);

        expect(record.data).to.exist;
        expect(record.data instanceof ReadableStream).to.be.true;

        const { value } = await record.data.getReader().read();
        expect(dataBytes).to.eql(value);
      });

      it('throws an error when DwnRequest fails validation', async () => {
        await expect(
          testAgent.agent.sendDwnRequest({
            author         : identity.did,
            target         : identity.did,
            messageType    : 'RecordsQuery',
            messageOptions : {
              filter: true
            }
          })
        ).to.eventually.be.rejectedWith(Error, '/descriptor/filter: must NOT have fewer than 1 properties');
      });
    });
  });
});