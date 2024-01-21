var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import sinon from 'sinon';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { TestAgent } from './utils/test-agent.js';
import { testDwnUrl } from './utils/test-config.js';
import { TestManagedAgent } from '../src/test-managed-agent.js';
import { SyncManagerLevel } from '../src/sync-manager.js';
chai.use(chaiAsPromised);
let testDwnUrls = [testDwnUrl];
describe('SyncManagerLevel', () => {
    describe('get agent', () => {
        it(`returns the 'agent' instance property`, () => __awaiter(void 0, void 0, void 0, function* () {
            // @ts-expect-error because we are only mocking a single property.
            const mockAgent = {
                agentDid: 'did:method:abc123'
            };
            const syncManager = new SyncManagerLevel({
                agent: mockAgent,
                dataPath: '__TESTDATA__/SYNC_STORE4'
            });
            const agent = syncManager.agent;
            expect(agent).to.exist;
            expect(agent.agentDid).to.equal('did:method:abc123');
        }));
        it(`throws an error if the 'agent' instance property is undefined`, () => {
            const syncManager = new SyncManagerLevel({
                dataPath: '__TESTDATA__/SYNC_STORE4'
            });
            expect(() => syncManager.agent).to.throw(Error, 'Unable to determine agent execution context');
        });
    });
    describe('with Web5ManagedAgent', () => {
        let alice;
        let aliceDid;
        let testAgent;
        before(() => __awaiter(void 0, void 0, void 0, function* () {
            testAgent = yield TestManagedAgent.create({
                agentClass: TestAgent,
                agentStores: 'dwn'
            });
        }));
        beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
            yield testAgent.clearStorage();
            yield testAgent.createAgentDid();
            // Create a new Identity to author the DWN messages.
            ({ did: aliceDid } = yield testAgent.createIdentity({ testDwnUrls }));
            alice = yield testAgent.agent.identityManager.import({
                did: aliceDid,
                identity: { name: 'Alice', did: aliceDid.did },
                kms: 'local'
            });
        }));
        afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
            yield testAgent.clearStorage();
        }));
        after(() => __awaiter(void 0, void 0, void 0, function* () {
            yield testAgent.clearStorage();
            yield testAgent.closeStorage();
        }));
        it('syncs multiple records in both directions', () => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            // create 3 local records.
            const localRecords = [];
            for (let i = 0; i < 3; i++) {
                const writeResponse = yield testAgent.agent.dwnManager.processRequest({
                    author: alice.did,
                    target: alice.did,
                    messageType: 'RecordsWrite',
                    messageOptions: {
                        dataFormat: 'text/plain'
                    },
                    dataStream: new Blob([`Hello, ${i}`])
                });
                localRecords.push(writeResponse.message.recordId);
            }
            // create 3 remote records
            const remoteRecords = [];
            for (let i = 0; i < 3; i++) {
                let writeResponse = yield testAgent.agent.dwnManager.sendRequest({
                    author: alice.did,
                    target: alice.did,
                    messageType: 'RecordsWrite',
                    messageOptions: {
                        dataFormat: 'text/plain'
                    },
                    dataStream: new Blob([`Hello, ${i}`])
                });
                remoteRecords.push(writeResponse.message.recordId);
            }
            // query local and check for only local records
            let localQueryResponse = yield testAgent.agent.dwnManager.processRequest({
                author: alice.did,
                target: alice.did,
                messageType: 'RecordsQuery',
                messageOptions: { filter: { dataFormat: 'text/plain' } }
            });
            let localDwnQueryReply = localQueryResponse.reply;
            expect(localDwnQueryReply.status.code).to.equal(200);
            expect(localDwnQueryReply.entries).to.have.length(3);
            let localRecordsFromQuery = (_a = localDwnQueryReply.entries) === null || _a === void 0 ? void 0 : _a.map(entry => entry.recordId);
            expect(localRecordsFromQuery).to.have.members(localRecords);
            // query remote and check for only remote records
            let remoteQueryResponse = yield testAgent.agent.dwnManager.sendRequest({
                author: alice.did,
                target: alice.did,
                messageType: 'RecordsQuery',
                messageOptions: { filter: { dataFormat: 'text/plain' } }
            });
            let remoteDwnQueryReply = remoteQueryResponse.reply;
            expect(remoteDwnQueryReply.status.code).to.equal(200);
            expect(remoteDwnQueryReply.entries).to.have.length(3);
            let remoteRecordsFromQuery = (_b = remoteDwnQueryReply.entries) === null || _b === void 0 ? void 0 : _b.map(entry => entry.recordId);
            expect(remoteRecordsFromQuery).to.have.members(remoteRecords);
            // Register Alice's DID to be synchronized.
            yield testAgent.agent.syncManager.registerIdentity({
                did: alice.did
            });
            // Execute Sync to pull all records from Alice's remote DWN to Alice's local DWN.
            yield testAgent.agent.syncManager.push();
            yield testAgent.agent.syncManager.pull();
            // query local node to see all records
            localQueryResponse = yield testAgent.agent.dwnManager.processRequest({
                author: alice.did,
                target: alice.did,
                messageType: 'RecordsQuery',
                messageOptions: { filter: { dataFormat: 'text/plain' } }
            });
            localDwnQueryReply = localQueryResponse.reply;
            expect(localDwnQueryReply.status.code).to.equal(200);
            expect(localDwnQueryReply.entries).to.have.length(6);
            localRecordsFromQuery = (_c = localDwnQueryReply.entries) === null || _c === void 0 ? void 0 : _c.map(entry => entry.recordId);
            expect(localRecordsFromQuery).to.have.members([...localRecords, ...remoteRecords]);
            // query remote node to see all results
            remoteQueryResponse = yield testAgent.agent.dwnManager.sendRequest({
                author: alice.did,
                target: alice.did,
                messageType: 'RecordsQuery',
                messageOptions: { filter: { dataFormat: 'text/plain' } }
            });
            remoteDwnQueryReply = remoteQueryResponse.reply;
            expect(remoteDwnQueryReply.status.code).to.equal(200);
            expect(remoteDwnQueryReply.entries).to.have.length(6);
            remoteRecordsFromQuery = (_d = remoteDwnQueryReply.entries) === null || _d === void 0 ? void 0 : _d.map(entry => entry.recordId);
            expect(remoteRecordsFromQuery).to.have.members([...localRecords, ...remoteRecords]);
        }));
        describe('pull()', () => {
            it('takes no action if no identities are registered', () => __awaiter(void 0, void 0, void 0, function* () {
                const didResolveSpy = sinon.spy(testAgent.agent.didResolver, 'resolve');
                const sendDwnRequestSpy = sinon.spy(testAgent.agent.rpcClient, 'sendDwnRequest');
                yield testAgent.agent.syncManager.pull();
                // Verify DID resolution and DWN requests did not occur.
                expect(didResolveSpy.notCalled).to.be.true;
                expect(sendDwnRequestSpy.notCalled).to.be.true;
                didResolveSpy.restore();
                sendDwnRequestSpy.restore();
            }));
            it('synchronizes records for 1 identity from remove DWN to local DWN', () => __awaiter(void 0, void 0, void 0, function* () {
                // Write a test record to Alice's remote DWN.
                let writeResponse = yield testAgent.agent.dwnManager.sendRequest({
                    author: alice.did,
                    target: alice.did,
                    messageType: 'RecordsWrite',
                    messageOptions: {
                        dataFormat: 'text/plain'
                    },
                    dataStream: new Blob(['Hello, world!'])
                });
                // Get the record ID of the test record.
                const testRecordId = writeResponse.message.recordId;
                // Confirm the record does NOT exist on Alice's local DWN.
                let queryResponse = yield testAgent.agent.dwnManager.processRequest({
                    author: alice.did,
                    target: alice.did,
                    messageType: 'RecordsQuery',
                    messageOptions: { filter: { recordId: testRecordId } }
                });
                let localDwnQueryReply = queryResponse.reply;
                expect(localDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
                expect(localDwnQueryReply.entries).to.have.length(0); // Record doesn't exist on local DWN.
                // Register Alice's DID to be synchronized.
                yield testAgent.agent.syncManager.registerIdentity({
                    did: alice.did
                });
                // Execute Sync to pull all records from Alice's remote DWN to Alice's local DWN.
                yield testAgent.agent.syncManager.pull();
                // Confirm the record now DOES exist on Alice's local DWN.
                queryResponse = yield testAgent.agent.dwnManager.processRequest({
                    author: alice.did,
                    target: alice.did,
                    messageType: 'RecordsQuery',
                    messageOptions: { filter: { recordId: testRecordId } }
                });
                localDwnQueryReply = queryResponse.reply;
                expect(localDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
                expect(localDwnQueryReply.entries).to.have.length(1); // Record does exist on local DWN.
            }));
            it('synchronizes records with data larger than the `encodedData` limit within the `RecordsQuery` response', () => __awaiter(void 0, void 0, void 0, function* () {
                var _a, _b;
                // larger than the size of data returned in a RecordsQuery
                const LARGE_DATA_SIZE = 70000;
                //register alice
                yield testAgent.agent.syncManager.registerIdentity({
                    did: alice.did
                });
                // create a remote record
                const record = yield testAgent.agent.dwnManager.sendRequest({
                    store: false,
                    author: alice.did,
                    target: alice.did,
                    messageType: 'RecordsWrite',
                    messageOptions: {
                        dataFormat: 'text/plain'
                    },
                    dataStream: new Blob(Array(LARGE_DATA_SIZE).fill('a')) //large data
                });
                // check that the record doesn't exist locally
                const { reply: localReply } = yield testAgent.agent.dwnManager.processRequest({
                    author: alice.did,
                    target: alice.did,
                    messageType: 'RecordsQuery',
                    messageOptions: { filter: { recordId: record.message.recordId } }
                });
                expect(localReply.status.code).to.equal(200);
                expect((_a = localReply.entries) === null || _a === void 0 ? void 0 : _a.length).to.equal(0);
                // initiate sync
                yield testAgent.agent.syncManager.pull();
                // query that the local record exists
                const { reply: localReply2 } = yield testAgent.agent.dwnManager.processRequest({
                    author: alice.did,
                    target: alice.did,
                    messageType: 'RecordsQuery',
                    messageOptions: { filter: { recordId: record.message.recordId } }
                });
                expect(localReply2.status.code).to.equal(200);
                expect((_b = localReply2.entries) === null || _b === void 0 ? void 0 : _b.length).to.equal(1);
                const entry = localReply2.entries[0];
                expect(entry.encodedData).to.be.undefined; // encodedData is undefined
                // check for response encodedData if it doesn't exist issue a RecordsRead
                const recordId = entry.recordId;
                // get individual records without encodedData to check that data exists
                const readRecord = yield testAgent.agent.dwnManager.processRequest({
                    author: alice.did,
                    target: alice.did,
                    messageType: 'RecordsRead',
                    messageOptions: { filter: { recordId } }
                });
                const reply = readRecord.reply;
                expect(reply.status.code).to.equal(200);
                expect(reply.record).to.not.be.undefined;
                expect(reply.record.data).to.not.be.undefined; // record data exists
            }));
            it('synchronizes records for multiple identities from remote DWN to local DWN', () => __awaiter(void 0, void 0, void 0, function* () {
                // Create a second Identity to author the DWN messages.
                const { did: bobDid } = yield testAgent.createIdentity({ testDwnUrls });
                const bob = yield testAgent.agent.identityManager.import({
                    did: bobDid,
                    identity: { name: 'Bob', did: bobDid.did },
                    kms: 'local'
                });
                // Write a test record to Alice's remote DWN.
                let writeResponse = yield testAgent.agent.dwnManager.sendRequest({
                    author: alice.did,
                    target: alice.did,
                    messageType: 'RecordsWrite',
                    messageOptions: {
                        dataFormat: 'text/plain'
                    },
                    dataStream: new Blob(['Hello, Bob!'])
                });
                // Get the record ID of Alice's test record.
                const testRecordIdAlice = writeResponse.message.recordId;
                // Write a test record to Bob's remote DWN.
                writeResponse = yield testAgent.agent.dwnManager.sendRequest({
                    author: bob.did,
                    target: bob.did,
                    messageType: 'RecordsWrite',
                    messageOptions: {
                        dataFormat: 'text/plain'
                    },
                    dataStream: new Blob(['Hello, Alice!'])
                });
                // Get the record ID of Bob's test record.
                const testRecordIdBob = writeResponse.message.recordId;
                // Register Alice's DID to be synchronized.
                yield testAgent.agent.syncManager.registerIdentity({
                    did: alice.did
                });
                // Register Bob's DID to be synchronized.
                yield testAgent.agent.syncManager.registerIdentity({
                    did: bob.did
                });
                // Execute Sync to pull all records from Alice's and Bob's remove DWNs to their local DWNs.
                yield testAgent.agent.syncManager.pull();
                // Confirm the Alice test record exist on Alice's local DWN.
                let queryResponse = yield testAgent.agent.dwnManager.processRequest({
                    author: alice.did,
                    target: alice.did,
                    messageType: 'RecordsQuery',
                    messageOptions: { filter: { recordId: testRecordIdAlice } }
                });
                let localDwnQueryReply = queryResponse.reply;
                expect(localDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
                expect(localDwnQueryReply.entries).to.have.length(1); // Record does exist on local DWN.
                // Confirm the Bob test record exist on Bob's local DWN.
                queryResponse = yield testAgent.agent.dwnManager.sendRequest({
                    author: bob.did,
                    target: bob.did,
                    messageType: 'RecordsQuery',
                    messageOptions: { filter: { recordId: testRecordIdBob } }
                });
                localDwnQueryReply = queryResponse.reply;
                expect(localDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
                expect(localDwnQueryReply.entries).to.have.length(1); // Record does exist on local DWN.
            }));
        });
        describe('push()', () => {
            it('takes no action if no identities are registered', () => __awaiter(void 0, void 0, void 0, function* () {
                const didResolveSpy = sinon.spy(testAgent.agent.didResolver, 'resolve');
                const processRequestSpy = sinon.spy(testAgent.agent.dwnManager, 'processRequest');
                yield testAgent.agent.syncManager.push();
                // Verify DID resolution and DWN requests did not occur.
                expect(didResolveSpy.notCalled).to.be.true;
                expect(processRequestSpy.notCalled).to.be.true;
                didResolveSpy.restore();
                processRequestSpy.restore();
            }));
            it('synchronizes records for 1 identity from local DWN to remote DWN', () => __awaiter(void 0, void 0, void 0, function* () {
                // Write a record that we can use for this test.
                let writeResponse = yield testAgent.agent.dwnManager.processRequest({
                    author: alice.did,
                    target: alice.did,
                    messageType: 'RecordsWrite',
                    messageOptions: {
                        dataFormat: 'text/plain'
                    },
                    dataStream: new Blob(['Hello, world!'])
                });
                // Get the record ID of the test record.
                const testRecordId = writeResponse.message.recordId;
                // Confirm the record does NOT exist on Alice's remote DWN.
                let queryResponse = yield testAgent.agent.dwnManager.sendRequest({
                    author: alice.did,
                    target: alice.did,
                    messageType: 'RecordsQuery',
                    messageOptions: { filter: { recordId: testRecordId } }
                });
                let remoteDwnQueryReply = queryResponse.reply;
                expect(remoteDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
                expect(remoteDwnQueryReply.entries).to.have.length(0); // Record doesn't exist on remote DWN.
                // Register Alice's DID to be synchronized.
                yield testAgent.agent.syncManager.registerIdentity({
                    did: alice.did
                });
                // Execute Sync to push all records from Alice's local DWN to Alice's remote DWN.
                yield testAgent.agent.syncManager.push();
                // Confirm the record now DOES exist on Alice's remote DWN.
                queryResponse = yield testAgent.agent.dwnManager.sendRequest({
                    author: alice.did,
                    target: alice.did,
                    messageType: 'RecordsQuery',
                    messageOptions: { filter: { recordId: testRecordId } }
                });
                remoteDwnQueryReply = queryResponse.reply;
                expect(remoteDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
                expect(remoteDwnQueryReply.entries).to.have.length(1); // Record does exist on remote DWN.
            }));
            it('synchronizes records with data larger than the `encodedData` limit within the `RecordsQuery` response', () => __awaiter(void 0, void 0, void 0, function* () {
                var _a, _b;
                // larger than the size of data returned in a RecordsQuery
                const LARGE_DATA_SIZE = 70000;
                //register alice
                yield testAgent.agent.syncManager.registerIdentity({
                    did: alice.did
                });
                // create a local record
                const record = yield testAgent.agent.dwnManager.processRequest({
                    author: alice.did,
                    target: alice.did,
                    messageType: 'RecordsWrite',
                    messageOptions: {
                        dataFormat: 'text/plain'
                    },
                    dataStream: new Blob(Array(LARGE_DATA_SIZE).fill('a')) //large data
                });
                // check that record doesn't exist remotely
                const { reply: remoteReply } = yield testAgent.agent.dwnManager.sendRequest({
                    author: alice.did,
                    target: alice.did,
                    messageType: 'RecordsQuery',
                    messageOptions: { filter: { recordId: record.message.recordId } }
                });
                expect(remoteReply.status.code).to.equal(200);
                expect((_a = remoteReply.entries) === null || _a === void 0 ? void 0 : _a.length).to.equal(0);
                // initiate sync
                yield testAgent.agent.syncManager.push();
                // query for remote REcords
                const { reply: remoteReply2 } = yield testAgent.agent.dwnManager.sendRequest({
                    author: alice.did,
                    target: alice.did,
                    messageType: 'RecordsQuery',
                    messageOptions: { filter: { recordId: record.message.recordId } }
                });
                expect(remoteReply2.status.code).to.equal(200);
                expect((_b = remoteReply2.entries) === null || _b === void 0 ? void 0 : _b.length).to.equal(1);
                const entry = remoteReply2.entries[0];
                expect(entry.encodedData).to.be.undefined;
                // check for response encodedData if it doesn't exist issue a RecordsRead
                const recordId = entry.recordId;
                // get individual records without encodedData to check that data exists
                const readRecord = yield testAgent.agent.dwnManager.processRequest({
                    author: alice.did,
                    target: alice.did,
                    messageType: 'RecordsRead',
                    messageOptions: { filter: { recordId } }
                });
                const reply = readRecord.reply;
                expect(reply.status.code).to.equal(200);
                expect(reply.record).to.not.be.undefined;
                expect(reply.record.data).to.not.be.undefined;
            }));
            it('synchronizes records for multiple identities from local DWN to remote DWN', () => __awaiter(void 0, void 0, void 0, function* () {
                // Create a second Identity to author the DWN messages.
                const { did: bobDid } = yield testAgent.createIdentity({ testDwnUrls });
                const bob = yield testAgent.agent.identityManager.import({
                    did: bobDid,
                    identity: { name: 'Bob', did: bobDid.did },
                    kms: 'local'
                });
                // Write a test record to Alice's local DWN.
                let writeResponse = yield testAgent.agent.dwnManager.processRequest({
                    author: alice.did,
                    target: alice.did,
                    messageType: 'RecordsWrite',
                    messageOptions: {
                        dataFormat: 'text/plain'
                    },
                    dataStream: new Blob(['Hello, Bob!'])
                });
                // Get the record ID of Alice's test record.
                const testRecordIdAlice = writeResponse.message.recordId;
                // Write a test record to Bob's local DWN.
                writeResponse = yield testAgent.agent.dwnManager.processRequest({
                    author: bob.did,
                    target: bob.did,
                    messageType: 'RecordsWrite',
                    messageOptions: {
                        dataFormat: 'text/plain'
                    },
                    dataStream: new Blob(['Hello, Alice!'])
                });
                // Get the record ID of Bob's test record.
                const testRecordIdBob = writeResponse.message.recordId;
                // Register Alice's DID to be synchronized.
                yield testAgent.agent.syncManager.registerIdentity({
                    did: alice.did
                });
                // Register Bob's DID to be synchronized.
                yield testAgent.agent.syncManager.registerIdentity({
                    did: bob.did
                });
                // Execute Sync to push all records from Alice's and Bob's local DWNs to their remote DWNs.
                yield testAgent.agent.syncManager.push();
                // Confirm the Alice test record exist on Alice's remote DWN.
                let queryResponse = yield testAgent.agent.dwnManager.sendRequest({
                    author: alice.did,
                    target: alice.did,
                    messageType: 'RecordsQuery',
                    messageOptions: { filter: { recordId: testRecordIdAlice } }
                });
                let remoteDwnQueryReply = queryResponse.reply;
                expect(remoteDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
                expect(remoteDwnQueryReply.entries).to.have.length(1); // Record does exist on remote DWN.
                // Confirm the Bob test record exist on Bob's remote DWN.
                queryResponse = yield testAgent.agent.dwnManager.sendRequest({
                    author: bob.did,
                    target: bob.did,
                    messageType: 'RecordsQuery',
                    messageOptions: { filter: { recordId: testRecordIdBob } }
                });
                remoteDwnQueryReply = queryResponse.reply;
                expect(remoteDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
                expect(remoteDwnQueryReply.entries).to.have.length(1); // Record does exist on remote DWN.
            }));
        });
        describe('startSync()', () => {
            it('calls push/pull in each interval', () => __awaiter(void 0, void 0, void 0, function* () {
                yield testAgent.agent.syncManager.registerIdentity({
                    did: alice.did
                });
                const pushSpy = sinon.stub(SyncManagerLevel.prototype, 'push');
                pushSpy.resolves();
                const pullSpy = sinon.stub(SyncManagerLevel.prototype, 'pull');
                pullSpy.resolves();
                const clock = sinon.useFakeTimers();
                testAgent.agent.syncManager.startSync({ interval: 500 });
                yield clock.tickAsync(1400); // just under 3 intervals
                pushSpy.restore();
                pullSpy.restore();
                clock.restore();
                expect(pushSpy.callCount).to.equal(2, 'push');
                expect(pullSpy.callCount).to.equal(2, 'pull');
            }));
            it('does not call push/pull again until a push/pull finishes', () => __awaiter(void 0, void 0, void 0, function* () {
                yield testAgent.agent.syncManager.registerIdentity({
                    did: alice.did
                });
                const clock = sinon.useFakeTimers();
                const pushSpy = sinon.stub(SyncManagerLevel.prototype, 'push');
                pushSpy.returns(new Promise((resolve) => {
                    clock.setTimeout(() => {
                        resolve();
                    }, 1500); // more than the interval
                }));
                const pullSpy = sinon.stub(SyncManagerLevel.prototype, 'pull');
                pullSpy.resolves();
                testAgent.agent.syncManager.startSync({ interval: 500 });
                yield clock.tickAsync(1400); // less time than the push
                expect(pushSpy.callCount).to.equal(1, 'push');
                expect(pullSpy.callCount).to.equal(0, 'pull'); // not called yet
                yield clock.tickAsync(100); //remaining time for pull to be called
                expect(pullSpy.callCount).to.equal(1, 'pull');
                pushSpy.restore();
                pullSpy.restore();
                clock.restore();
            }));
        });
    });
});
//# sourceMappingURL=sync-manager.spec.js.map