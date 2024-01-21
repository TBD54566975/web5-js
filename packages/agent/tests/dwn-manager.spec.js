var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import chai, { expect } from 'chai';
import { Convert } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';
import { Message, } from '@tbd54566975/dwn-sdk-js';
import { testDwnUrl } from './utils/test-config.js';
import { TestAgent } from './utils/test-agent.js';
import { DwnManager } from '../src/dwn-manager.js';
import { TestManagedAgent } from '../src/test-managed-agent.js';
import emailProtocolDefinition from './fixtures/protocol-definitions/email.json' assert { type: 'json' };
// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';
// @ts-ignore
if (!globalThis.crypto)
    globalThis.crypto = webcrypto;
chai.use(chaiAsPromised);
let testDwnUrls = [testDwnUrl];
describe('DwnManager', () => {
    describe('constructor', () => {
        it('accepts a custom DWN instance', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockDwn = {};
            // Instantiate DWN Manager with custom DWN instance.
            const dwnManager = yield DwnManager.create({ dwn: mockDwn });
            expect(dwnManager).to.exist;
            // @ts-expect-error because a private property is being accessed.
            expect(dwnManager._dwn).to.exist;
        }));
    });
    describe('get agent', () => {
        it(`returns the 'agent' instance property`, () => {
            // @ts-expect-error because we are only mocking a single property.
            const mockAgent = {
                agentDid: 'did:method:abc123'
            };
            const mockDwn = {};
            const dwnManager = new DwnManager({ agent: mockAgent, dwn: mockDwn });
            const agent = dwnManager.agent;
            expect(agent).to.exist;
            expect(agent.agentDid).to.equal('did:method:abc123');
        });
        it(`throws an error if the 'agent' instance property is undefined`, () => __awaiter(void 0, void 0, void 0, function* () {
            const mockDwn = {};
            const dwnManager = yield DwnManager.create({ dwn: mockDwn });
            expect(() => dwnManager.agent).to.throw(Error, 'Unable to determine agent execution context');
        }));
    });
    describe('#create', () => {
        it('works with no options provided', () => __awaiter(void 0, void 0, void 0, function* () {
            const dwnManager = yield DwnManager.create();
            expect(dwnManager).to.not.be.undefined;
        }));
    });
    describe(`with dwn data stores`, () => {
        let testAgent;
        before(() => __awaiter(void 0, void 0, void 0, function* () {
            testAgent = yield TestManagedAgent.create({
                agentClass: TestAgent,
                agentStores: 'dwn'
            });
        }));
        after(() => __awaiter(void 0, void 0, void 0, function* () {
            yield testAgent.clearStorage();
            yield testAgent.closeStorage();
        }));
        describe('processRequest()', () => {
            let identity;
            beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
                yield testAgent.clearStorage();
                yield testAgent.createAgentDid();
                // Creates a new Identity to author the DWN messages.
                identity = yield testAgent.agent.identityManager.create({
                    name: 'Alice',
                    didMethod: 'key',
                    kms: 'local'
                });
            }));
            it('handles EventsGet', () => __awaiter(void 0, void 0, void 0, function* () {
                const testCursor = 'foo';
                // Attempt to process the EventsGet.
                let eventsGetResponse = yield testAgent.agent.dwnManager.processRequest({
                    author: identity.did,
                    target: identity.did,
                    messageType: 'EventsGet',
                    messageOptions: {
                        cursor: testCursor,
                    }
                });
                expect(eventsGetResponse).to.have.property('message');
                expect(eventsGetResponse).to.have.property('messageCid');
                expect(eventsGetResponse).to.have.property('reply');
                const eventsGetMessage = eventsGetResponse.message;
                expect(eventsGetMessage.descriptor).to.have.property('cursor', testCursor);
                const eventsGetReply = eventsGetResponse.reply;
                expect(eventsGetReply).to.have.property('status');
                expect(eventsGetReply.status.code).to.equal(200);
                expect(eventsGetReply.entries).to.have.length(0);
            }));
            it('handles MessagesGet', () => __awaiter(void 0, void 0, void 0, function* () {
                // Create test data to write.
                const dataBytes = Convert.string('Hello, world!').toUint8Array();
                // Write a record to use for the MessagesGet test.
                let { message, reply: { status: writeStatus } } = yield testAgent.agent.dwnManager.processRequest({
                    author: identity.did,
                    target: identity.did,
                    messageType: 'RecordsWrite',
                    messageOptions: {
                        dataFormat: 'text/plain',
                        schema: 'https://schemas.xyz/example'
                    },
                    dataStream: new Blob([dataBytes])
                });
                expect(writeStatus.code).to.equal(202);
                const writeMessage = message;
                // Get the message CID to attempt to get.
                const messageCid = yield Message.getCid(writeMessage);
                // Attempt to process the MessagesGet.
                let messagesGetResponse = yield testAgent.agent.dwnManager.processRequest({
                    author: identity.did,
                    target: identity.did,
                    messageType: 'MessagesGet',
                    messageOptions: {
                        messageCids: [messageCid]
                    }
                });
                expect(messagesGetResponse).to.have.property('message');
                expect(messagesGetResponse).to.have.property('messageCid');
                expect(messagesGetResponse).to.have.property('reply');
                const messagesGetMessage = messagesGetResponse.message;
                expect(messagesGetMessage.descriptor).to.have.property('messageCids');
                expect(messagesGetMessage.descriptor.messageCids).to.have.length(1);
                expect(messagesGetMessage.descriptor.messageCids).to.include(messageCid);
                const messagesGetReply = messagesGetResponse.reply;
                expect(messagesGetReply).to.have.property('status');
                expect(messagesGetReply.status.code).to.equal(200);
                expect(messagesGetReply.entries).to.have.length(1);
                if (!Array.isArray(messagesGetReply.entries))
                    throw new Error('Type guard');
                if (messagesGetReply.entries.length !== 1)
                    throw new Error('Type guard');
                const [retrievedRecordsWrite] = messagesGetReply.entries;
                expect(retrievedRecordsWrite.message).to.have.property('recordId', writeMessage.recordId);
            }));
            it('handles ProtocolsConfigure', () => __awaiter(void 0, void 0, void 0, function* () {
                let protocolsConfigureResponse = yield testAgent.agent.dwnManager.processRequest({
                    author: identity.did,
                    target: identity.did,
                    messageType: 'ProtocolsConfigure',
                    messageOptions: {
                        definition: emailProtocolDefinition
                    }
                });
                expect(protocolsConfigureResponse).to.have.property('message');
                expect(protocolsConfigureResponse).to.have.property('messageCid');
                expect(protocolsConfigureResponse).to.have.property('reply');
                const configureMessage = protocolsConfigureResponse.message;
                expect(configureMessage.descriptor).to.have.property('definition');
                expect(configureMessage.descriptor.definition).to.deep.equal(emailProtocolDefinition);
                const configureReply = protocolsConfigureResponse.reply;
                expect(configureReply).to.have.property('status');
                expect(configureReply.status.code).to.equal(202);
            }));
            it('handles ProtocolsQuery', () => __awaiter(void 0, void 0, void 0, function* () {
                // Configure a protocol to use for the ProtocolsQuery test.
                let protocolsConfigureResponse = yield testAgent.agent.dwnManager.processRequest({
                    author: identity.did,
                    target: identity.did,
                    messageType: 'ProtocolsConfigure',
                    messageOptions: {
                        definition: emailProtocolDefinition
                    }
                });
                expect(protocolsConfigureResponse.reply.status.code).to.equal(202);
                // Attempt to query for the protocol that was just configured.
                let protocolsQueryResponse = yield testAgent.agent.dwnManager.processRequest({
                    author: identity.did,
                    target: identity.did,
                    messageType: 'ProtocolsQuery',
                    messageOptions: {
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
                if (!Array.isArray(queryReply.entries))
                    throw new Error('Type guard');
                if (queryReply.entries.length !== 1)
                    throw new Error('Type guard');
                const protocolsConfigure = queryReply.entries[0];
                expect(protocolsConfigure.descriptor.definition).to.deep.equal(emailProtocolDefinition);
            }));
            it('handles RecordsDelete messages', () => __awaiter(void 0, void 0, void 0, function* () {
                // Create test data to write.
                const dataBytes = Convert.string('Hello, world!').toUint8Array();
                // Write a record that can be deleted.
                let { message, reply: { status: writeStatus } } = yield testAgent.agent.dwnManager.processRequest({
                    author: identity.did,
                    target: identity.did,
                    messageType: 'RecordsWrite',
                    messageOptions: {
                        dataFormat: 'text/plain',
                        schema: 'https://schemas.xyz/example'
                    },
                    dataStream: new Blob([dataBytes])
                });
                expect(writeStatus.code).to.equal(202);
                const writeMessage = message;
                // Attempt to process the RecordsRead.
                const deleteResponse = yield testAgent.agent.dwnManager.processRequest({
                    author: identity.did,
                    target: identity.did,
                    messageType: 'RecordsDelete',
                    messageOptions: {
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
            }));
            it('handles RecordsQuery messages', () => __awaiter(void 0, void 0, void 0, function* () {
                var _a, _b, _c;
                // Create test data to write.
                const dataBytes = Convert.string('Hello, world!').toUint8Array();
                // Write a record that can be queried for.
                let { message, reply: { status: writeStatus } } = yield testAgent.agent.dwnManager.processRequest({
                    author: identity.did,
                    target: identity.did,
                    messageType: 'RecordsWrite',
                    messageOptions: {
                        dataFormat: 'text/plain',
                        schema: 'https://schemas.xyz/example'
                    },
                    dataStream: new Blob([dataBytes])
                });
                expect(writeStatus.code).to.equal(202);
                const writeMessage = message;
                // Attempt to process the RecordsQuery.
                const queryResponse = yield testAgent.agent.dwnManager.processRequest({
                    author: identity.did,
                    target: identity.did,
                    messageType: 'RecordsQuery',
                    messageOptions: {
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
                expect((_a = queryReply.entries) === null || _a === void 0 ? void 0 : _a[0]).to.have.property('descriptor');
                expect((_b = queryReply.entries) === null || _b === void 0 ? void 0 : _b[0]).to.have.property('encodedData');
                expect((_c = queryReply.entries) === null || _c === void 0 ? void 0 : _c[0]).to.have.property('recordId', writeMessage.recordId);
            }));
            it('handles RecordsRead messages', () => __awaiter(void 0, void 0, void 0, function* () {
                // Create test data to write.
                const dataBytes = Convert.string('Hello, world!').toUint8Array();
                // Write a record that can be read.
                let { message, reply: { status: writeStatus } } = yield testAgent.agent.dwnManager.processRequest({
                    author: identity.did,
                    target: identity.did,
                    messageType: 'RecordsWrite',
                    messageOptions: {
                        dataFormat: 'text/plain',
                        schema: 'https://schemas.xyz/example'
                    },
                    dataStream: new Blob([dataBytes])
                });
                expect(writeStatus.code).to.equal(202);
                const writeMessage = message;
                // Attempt to process the RecordsRead.
                const readResponse = yield testAgent.agent.dwnManager.processRequest({
                    author: identity.did,
                    target: identity.did,
                    messageType: 'RecordsRead',
                    messageOptions: {
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
            }));
            it('handles RecordsWrite messages', () => __awaiter(void 0, void 0, void 0, function* () {
                // Create test data to write.
                const dataBytes = Convert.string('Hello, world!').toUint8Array();
                // Attempt to process the RecordsWrite
                let writeResponse = yield testAgent.agent.dwnManager.processRequest({
                    author: identity.did,
                    target: identity.did,
                    messageType: 'RecordsWrite',
                    messageOptions: {
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
            }));
        });
        describe('sendDwnRequest()', () => {
            let identity;
            before(() => __awaiter(void 0, void 0, void 0, function* () {
                yield testAgent.createAgentDid();
                const services = [{
                        id: '#dwn',
                        type: 'DecentralizedWebNode',
                        serviceEndpoint: {
                            encryptionKeys: ['#dwn-enc'],
                            nodes: testDwnUrls,
                            signingKeys: ['#dwn-sig']
                        }
                    }];
                // Creates a new Identity to author the DWN messages.
                identity = yield testAgent.agent.identityManager.create({
                    name: 'Alice',
                    didMethod: 'ion',
                    didOptions: { services },
                    kms: 'local'
                });
            }));
            after(() => __awaiter(void 0, void 0, void 0, function* () {
                yield testAgent.clearStorage();
            }));
            it('throws an exception if target DID cannot be resolved', () => __awaiter(void 0, void 0, void 0, function* () {
                yield expect(testAgent.agent.sendDwnRequest({
                    author: identity.did,
                    target: 'did:test:abc123',
                    messageType: 'RecordsQuery',
                    messageOptions: {
                        filter: {
                            schema: 'https://schemas.xyz/example'
                        }
                    }
                })).to.eventually.be.rejectedWith(Error, 'DwnManager: methodNotSupported: Method not supported: test');
            }));
            it('throws an exception if target DID has no #dwn service endpoints', () => __awaiter(void 0, void 0, void 0, function* () {
                const identity = yield testAgent.agent.identityManager.create({
                    name: 'Alice',
                    didMethod: 'ion',
                    didOptions: { services: [] },
                    kms: 'local'
                });
                yield expect(testAgent.agent.sendDwnRequest({
                    author: identity.did,
                    target: identity.did,
                    messageType: 'RecordsQuery',
                    messageOptions: {
                        filter: {
                            schema: 'https://schemas.xyz/example'
                        }
                    }
                })).to.eventually.be.rejectedWith(Error, `has no service endpoints with ID '#dwn'`);
            }));
            it('handles RecordsDelete Messages', () => __awaiter(void 0, void 0, void 0, function* () {
                const response = yield testAgent.agent.sendDwnRequest({
                    author: identity.did,
                    target: identity.did,
                    messageType: 'RecordsDelete',
                    messageOptions: {
                        recordId: 'abcd123'
                    }
                });
                expect(response.reply).to.exist;
                expect(response.reply.status).to.exist;
                expect(response.reply.status.code).to.equal(404);
            }));
            it('handles RecordsQuery Messages', () => __awaiter(void 0, void 0, void 0, function* () {
                const response = yield testAgent.agent.sendDwnRequest({
                    author: identity.did,
                    target: identity.did,
                    messageType: 'RecordsQuery',
                    messageOptions: {
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
            }));
            it('handles RecordsRead Messages', () => __awaiter(void 0, void 0, void 0, function* () {
                const dataBytes = Convert.string('Hi').toUint8Array();
                let response = yield testAgent.agent.sendDwnRequest({
                    author: identity.did,
                    target: identity.did,
                    messageType: 'RecordsWrite',
                    messageOptions: {
                        dataFormat: 'text/plain',
                        data: dataBytes
                    },
                    dataStream: new Blob([dataBytes])
                });
                const message = response.message;
                response = yield testAgent.agent.sendDwnRequest({
                    author: identity.did,
                    target: identity.did,
                    messageType: 'RecordsRead',
                    messageOptions: {
                        filter: {
                            recordId: message.recordId
                        }
                    }
                });
                expect(response.reply.status.code).to.equal(200);
                expect(response.message).to.exist;
                const readMessage = response.message;
                expect(readMessage.descriptor.method).to.equal('Read');
                expect(readMessage.descriptor.interface).to.equal('Records');
                const readReply = response.reply;
                expect(readReply.record).to.exist;
                const record = readReply.record;
                expect(record.recordId).to.equal(message.recordId);
                expect(record.data).to.exist;
                expect(record.data instanceof ReadableStream).to.be.true;
                const { value } = yield record.data.getReader().read();
                expect(dataBytes).to.eql(value);
            }));
            it('throws an error when DwnRequest fails validation', () => __awaiter(void 0, void 0, void 0, function* () {
                yield expect(testAgent.agent.sendDwnRequest({
                    author: identity.did,
                    target: identity.did,
                    messageType: 'RecordsQuery',
                    messageOptions: {
                        filter: true
                    }
                })).to.eventually.be.rejectedWith(Error, '/descriptor/filter: must NOT have fewer than 1 properties');
            }));
        });
    });
});
//# sourceMappingURL=dwn-manager.spec.js.map