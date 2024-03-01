import type { Dwn } from '@tbd54566975/dwn-sdk-js';

import { expect } from 'chai';
import { Convert } from '@web5/common';

import type { PortableIdentity } from '../src/types/identity.js';

import { AgentDwnApi } from '../src/dwn-api.js';
import { TestAgent } from './utils/test-agent.js';
import { testDwnUrl } from './utils/test-config.js';
import { DwnInterface } from '../src/types/dwn.js';
import { BearerIdentity } from '../src/bearer-identity.js';
import { ManagedAgentTestHarness } from '../src/test-harness.js';
import emailProtocolDefinition from './fixtures/protocol-definitions/email.json' assert { type: 'json' };

// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';
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

  after(async () => {
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
      const mockAgent: Web5PlatformAgent = {
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

    it('handles EventsGet', async () => {
      const testCursor = {
        messageCid : 'foo',
        value      : 'bar'
      };

      // Attempt to process the EventsGet.
      let eventsQueryResponse = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.EventsGet,
        messageParams : {
          cursor: testCursor,
        }
      });

      expect(eventsQueryResponse).to.have.property('message');
      expect(eventsQueryResponse).to.have.property('messageCid');
      expect(eventsQueryResponse).to.have.property('reply');

      const eventsGetMessage = eventsQueryResponse.message!;
      expect(eventsGetMessage.descriptor).to.have.property('cursor', testCursor);

      const eventsGetReply = eventsQueryResponse.reply;
      expect(eventsGetReply).to.have.property('status');
      expect(eventsGetReply.status.code).to.equal(200);
      expect(eventsGetReply.entries).to.have.length(0);
    });

    it('handles EventsQuery', async () => {
      const testCursor = {
        messageCid : 'foo',
        value      : 'bar'
      };

      const testFilters = [{ schema: 'http://schema1' }];

      // Attempt to process the EventsGet.
      let eventsQueryResponse = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.EventsQuery,
        messageParams : {
          cursor  : testCursor,
          filters : testFilters
        }
      });

      expect(eventsQueryResponse).to.have.property('message');
      expect(eventsQueryResponse).to.have.property('messageCid');
      expect(eventsQueryResponse).to.have.property('reply');

      const eventsQueryMessage = eventsQueryResponse.message!;
      expect(eventsQueryMessage.descriptor).to.have.property('cursor', testCursor);
      expect(eventsQueryMessage.descriptor.filters).to.deep.equal(testFilters);

      const eventsQueryReply = eventsQueryResponse.reply;
      expect(eventsQueryReply).to.have.property('status');
      expect(eventsQueryReply.status.code).to.equal(200);
      expect(eventsQueryReply.entries).to.have.length(0);
    });

    it('handles MessagesGet', async () => {
      // Create test data to write.
      const dataBytes = Convert.string('Hello, world!').toUint8Array();

      // Write a record to use for the MessagesGet test.
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

      // Attempt to process the MessagesGet.
      let messagesGetResponse = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.MessagesGet,
        messageParams : {
          messageCids: [writeResponse.messageCid!]
        }
      });

      expect(messagesGetResponse).to.have.property('message');
      expect(messagesGetResponse).to.have.property('messageCid');
      expect(messagesGetResponse).to.have.property('reply');

      const messagesGetMessage = messagesGetResponse.message!;
      expect(messagesGetMessage.descriptor).to.have.property('messageCids');
      expect(messagesGetMessage.descriptor.messageCids).to.have.length(1);
      expect(messagesGetMessage.descriptor.messageCids).to.include(writeResponse.messageCid);

      const messagesGetReply = messagesGetResponse.reply;
      expect(messagesGetReply).to.have.property('status');
      expect(messagesGetReply.status.code).to.equal(200);
      expect(messagesGetReply.entries).to.have.length(1);

      const [ retrievedRecordsWrite ] = messagesGetReply.entries!;
      expect(retrievedRecordsWrite.message).to.have.property('recordId', writeMessage.recordId);
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

      await testHarness.preloadResolverCache({
        didUri           : testPortableIdentity.portableDid.uri,
        resolutionResult : {
          didDocument           : testPortableIdentity.portableDid.document,
          didDocumentMetadata   : testPortableIdentity.portableDid.metadata,
          didResolutionMetadata : {}
        }
      });

      alice = await testHarness.agent.identity.import({
        portableIdentity: testPortableIdentity
      });
    });

    after(async () => {
      await testHarness.clearStorage();
      await testHarness.closeStorage();
    });

    it('handles EventsGet', async () => {
      const testCursor = {
        messageCid : 'foo',
        value      : 'bar'
      };

      // Attempt to process the EventsGet.
      let eventsQueryResponse = await testHarness.agent.dwn.sendRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.EventsGet,
        messageParams : {
          cursor: testCursor,
        }
      });

      expect(eventsQueryResponse).to.have.property('message');
      expect(eventsQueryResponse).to.have.property('messageCid');
      expect(eventsQueryResponse).to.have.property('reply');

      const eventsGetMessage = eventsQueryResponse.message!;
      expect(eventsGetMessage.descriptor).to.have.property('cursor', testCursor);

      const eventsGetReply = eventsQueryResponse.reply;
      expect(eventsGetReply).to.have.property('status');
      expect(eventsGetReply.status.code).to.equal(200);
      expect(eventsGetReply.entries).to.have.length(0);
    }).timeout(10000);

    it('handles EventsQuery', async () => {
      const testCursor = {
        messageCid : 'foo',
        value      : 'bar'
      };

      const testFilters = [{ schema: 'http://schema1' }];

      // Attempt to process the EventsGet.
      let eventsQueryResponse = await testHarness.agent.dwn.sendRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.EventsQuery,
        messageParams : {
          cursor  : testCursor,
          filters : testFilters
        }
      });

      expect(eventsQueryResponse).to.have.property('message');
      expect(eventsQueryResponse).to.have.property('messageCid');
      expect(eventsQueryResponse).to.have.property('reply');

      const eventsQueryMessage = eventsQueryResponse.message!;
      expect(eventsQueryMessage.descriptor).to.have.property('cursor', testCursor);
      expect(eventsQueryMessage.descriptor.filters).to.deep.equal(testFilters);

      const eventsQueryReply = eventsQueryResponse.reply;
      expect(eventsQueryReply).to.have.property('status');
      expect(eventsQueryReply.status.code).to.equal(200);
      expect(eventsQueryReply.entries).to.have.length(0);
    }).timeout(10000);

    it('handles MessagesGet', async () => {
      // Create test data to write.
      const dataBytes = Convert.string('Hello, world!').toUint8Array();

      // Write a record to use for the MessagesGet test.
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

      // Attempt to process the MessagesGet.
      let messagesGetResponse = await testHarness.agent.dwn.sendRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.MessagesGet,
        messageParams : {
          messageCids: [writeResponse.messageCid!]
        }
      });

      expect(messagesGetResponse).to.have.property('message');
      expect(messagesGetResponse).to.have.property('messageCid');
      expect(messagesGetResponse).to.have.property('reply');

      const messagesGetMessage = messagesGetResponse.message!;
      expect(messagesGetMessage.descriptor).to.have.property('messageCids');
      expect(messagesGetMessage.descriptor.messageCids).to.have.length(1);
      expect(messagesGetMessage.descriptor.messageCids).to.include(writeResponse.messageCid);

      const messagesGetReply = messagesGetResponse.reply;
      expect(messagesGetReply).to.have.property('status');
      expect(messagesGetReply.status.code).to.equal(200);
      expect(messagesGetReply.entries).to.have.length(1);

      const [ retrievedRecordsWrite ] = messagesGetReply.entries!;
      expect(retrievedRecordsWrite.message).to.have.property('recordId', writeMessage.recordId);
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

      // Since the DID DHT document wasn't published, add the DID DHT document to the resolver
      // cache so that DID resolution will succeed during the dereferencing operation.
      await testHarness.preloadResolverCache({
        didUri           : identity.did.uri,
        resolutionResult : {
          didDocument           : identity.did.document,
          didDocumentMetadata   : identity.did.metadata,
          didResolutionMetadata : {}
        }
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