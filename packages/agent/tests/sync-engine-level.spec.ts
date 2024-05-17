import sinon from 'sinon';
import { expect } from 'chai';
import { utils as cryptoUtils } from '@web5/crypto';
import { DwnConstant } from '@tbd54566975/dwn-sdk-js';

import type { BearerIdentity } from '../src/bearer-identity.js';

import { AgentSyncApi } from '../src/sync-api.js';
import { TestAgent } from './utils/test-agent.js';
import { DwnInterface } from '../src/types/dwn.js';
import { testDwnUrl } from './utils/test-config.js';
import { SyncEngineLevel } from '../src/sync-engine-level.js';
import { PlatformAgentTestHarness } from '../src/test-harness.js';

let testDwnUrls: string[] = [testDwnUrl];

describe('SyncEngineLevel', () => {
  let testHarness: PlatformAgentTestHarness;

  before(async () => {
    testHarness = await PlatformAgentTestHarness.setup({
      agentClass  : TestAgent,
      agentStores : 'dwn'
    });
  });

  after(async () => {
    await testHarness.closeStorage();
  });

  describe('get agent', () => {
    it(`returns the 'agent' instance property`, () => {
      // we are only mocking
      const mockAgent: any = {
        agentDid: 'did:method:abc123'
      };
      const syncEngine = new SyncEngineLevel({ agent: mockAgent, db: {} as any });
      const agent = syncEngine.agent;
      expect(agent).to.exist;
      expect(agent.agentDid).to.equal('did:method:abc123');
    });

    it(`throws an error if the 'agent' instance property is undefined`, async () => {
      const syncEngine = new SyncEngineLevel({ db: {} as any });
      expect(() =>
        syncEngine.agent
      ).to.throw(Error, 'Unable to determine agent execution context');
    });
  });

  describe('with Web5 Platform Agent', () => {
    let alice: BearerIdentity;
    let randomSchema: string;
    let syncEngine: SyncEngineLevel;

    before(async () => {
      await testHarness.clearStorage();
      await testHarness.createAgentDid();

      const syncStore = testHarness.syncStore;
      syncEngine = new SyncEngineLevel({ db: syncStore, agent: testHarness.agent });
      const syncApi = new AgentSyncApi({ syncEngine, agent: testHarness.agent });
      testHarness.agent.sync = syncApi;

      alice = await testHarness.createIdentity({ name: 'Alice', testDwnUrls });
    });

    beforeEach(async () => {
      randomSchema = cryptoUtils.randomUuid();
    });

    afterEach(async () => {
      await testHarness.syncStore.clear();
    });

    after(async () => {
      await testHarness.clearStorage();
      await testHarness.closeStorage();
    });

    it('syncs multiple records in both directions', async () => {
      // create 3 local records.
      const localRecords: string[] = [];
      for (let i = 0; i < 3; i++) {
        const writeResponse = await testHarness.agent.dwn.processRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat : 'text/plain',
            schema     : randomSchema
          },
          dataStream: new Blob([`Hello, ${i}`])
        });

        localRecords.push((writeResponse.message!).recordId);
      }

      // create 3 remote records
      const remoteRecords: string[] = [];
      for (let i = 0; i < 3; i++) {
        let writeResponse = await testHarness.agent.dwn.sendRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat : 'text/plain',
            schema     : randomSchema
          },
          dataStream: new Blob([`Hello, ${i}`])
        });
        remoteRecords.push((writeResponse.message!).recordId);
      }

      // query local and check for only local records
      let localQueryResponse = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsQuery,
        messageParams : {
          filter: {
            dataFormat : 'text/plain',
            schema     : randomSchema
          }
        }
      });
      let localDwnQueryReply = localQueryResponse.reply;
      expect(localDwnQueryReply.status.code).to.equal(200);
      expect(localDwnQueryReply.entries).to.have.length(3);
      let localRecordsFromQuery = localDwnQueryReply.entries?.map(entry => entry.recordId);
      expect(localRecordsFromQuery).to.have.members(localRecords);

      // query remote and check for only remote records
      let remoteQueryResponse = await testHarness.agent.dwn.sendRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsQuery,
        messageParams : {
          filter: {
            dataFormat : 'text/plain',
            schema     : randomSchema
          }
        }
      });
      let remoteDwnQueryReply = remoteQueryResponse.reply;
      expect(remoteDwnQueryReply.status.code).to.equal(200);
      expect(remoteDwnQueryReply.entries).to.have.length(3);
      let remoteRecordsFromQuery = remoteDwnQueryReply.entries?.map(entry => entry.recordId);
      expect(remoteRecordsFromQuery).to.have.members(remoteRecords);

      // Register Alice's DID to be synchronized.
      await testHarness.agent.sync.registerIdentity({
        did: alice.did.uri
      });

      // Execute Sync to pull all records from Alice's remote DWN to Alice's local DWN.
      await syncEngine.push();
      await syncEngine.pull();

      // query local node to see all records
      localQueryResponse = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsQuery,
        messageParams : {
          filter: {
            dataFormat : 'text/plain',
            schema     : randomSchema
          }
        }
      });
      localDwnQueryReply = localQueryResponse.reply;
      expect(localDwnQueryReply.status.code).to.equal(200);
      expect(localDwnQueryReply.entries).to.have.length(6);
      localRecordsFromQuery = localDwnQueryReply.entries?.map(entry => entry.recordId);
      expect(localRecordsFromQuery).to.have.members([...localRecords, ...remoteRecords]);

      // query remote node to see all results
      remoteQueryResponse = await testHarness.agent.dwn.sendRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsQuery,
        messageParams : {
          filter: {
            dataFormat : 'text/plain',
            schema     : randomSchema
          }
        }
      });
      remoteDwnQueryReply = remoteQueryResponse.reply;
      expect(remoteDwnQueryReply.status.code).to.equal(200);
      expect(remoteDwnQueryReply.entries).to.have.length(6);
      remoteRecordsFromQuery = remoteDwnQueryReply.entries?.map(entry => entry.recordId);
      expect(remoteRecordsFromQuery).to.have.members([...localRecords, ...remoteRecords]);
    }).slow(1000); // Yellow at 500ms, Red at 1000ms.

    describe('pull()', () => {
      it('takes no action if no identities are registered', async () => {
        const didResolveSpy = sinon.spy(testHarness.agent.did, 'resolve');
        const sendDwnRequestSpy = sinon.spy(testHarness.agent.rpc, 'sendDwnRequest');

        await syncEngine.pull();

        // Verify DID resolution and DWN requests did not occur.
        expect(didResolveSpy.notCalled).to.be.true;
        expect(sendDwnRequestSpy.notCalled).to.be.true;

        didResolveSpy.restore();
        sendDwnRequestSpy.restore();
      });

      it('synchronizes records for 1 identity from remote DWN to local DWN', async () => {
      // Write a test record to Alice's remote DWN.
        let writeResponse = await testHarness.agent.dwn.sendRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat : 'text/plain',
            schema     : randomSchema
          },
          dataStream: new Blob(['Hello, world!'])
        });

        // Get the record ID of the test record.
        const testRecordId = writeResponse.message!.recordId;

        // Confirm the record does NOT exist on Alice's local DWN.
        let queryResponse = await testHarness.agent.dwn.processRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : {
            filter: {
              dataFormat : 'text/plain',
              schema     : randomSchema
            }
          }
        });
        let localDwnQueryReply = queryResponse.reply;
        expect(localDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
        expect(localDwnQueryReply.entries).to.have.length(0); // Record doesn't exist on local DWN.

        // Register Alice's DID to be synchronized.
        await testHarness.agent.sync.registerIdentity({
          did: alice.did.uri
        });

        // Execute Sync to pull all records from Alice's remote DWN to Alice's local DWN.
        await syncEngine.pull();

        // Confirm the record now DOES exist on Alice's local DWN.
        queryResponse = await testHarness.agent.dwn.processRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : { filter: { recordId: testRecordId } }
        });
        localDwnQueryReply = queryResponse.reply;
        expect(localDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
        expect(localDwnQueryReply.entries).to.have.length(1); // Record does exist on local DWN.




        // Add another record for a subsequent sync.
        let writeResponse2 = await testHarness.agent.dwn.sendRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat: 'text/plain'
          },
          dataStream: new Blob(['Hello, world 2!'])
        });
        // Get the record ID of the test record.
        const testRecord2Id = writeResponse2.message!.recordId;

        // Confirm the new record does NOT exist on Alice's local DWN.
        queryResponse = await testHarness.agent.dwn.processRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : { filter: { recordId: testRecord2Id } } // New RecordId
        });
        localDwnQueryReply = queryResponse.reply;
        expect(localDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
        expect(localDwnQueryReply.entries).to.have.length(0); // New Record doesn't exist on local DWN.

        await syncEngine.pull();

        // Confirm the new record DOES exist on Alice's local DWN.
        queryResponse = await testHarness.agent.dwn.processRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : { filter: { recordId: testRecord2Id } } // New RecordId
        });
        localDwnQueryReply = queryResponse.reply;
        expect(localDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
        expect(localDwnQueryReply.entries).to.have.length(1); // New Record does exist on local DWN.
      }).slow(300); // Yellow at 150ms, Red at 300ms.

      it('synchronizes records with data larger than the `encodedData` limit within the `RecordsQuery` response', async () => {
      // larger than the size of data returned in a RecordsQuery
        const LARGE_DATA_SIZE = 1_000 + DwnConstant.maxDataSizeAllowedToBeEncoded;

        // register alice
        await testHarness.agent.sync.registerIdentity({
          did: alice.did.uri
        });

        // create a remote record
        const writeResponse = await testHarness.agent.dwn.sendRequest({
          store         : false,
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat: 'text/plain'
          },
          dataStream: new Blob(Array(LARGE_DATA_SIZE).fill('a')) //large data
        });

        // check that the record doesn't exist locally
        const { reply: localReply } = await testHarness.agent.dwn.processRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : { filter: { recordId: writeResponse.message!.recordId } }
        });

        expect(localReply.status.code).to.equal(200);
        expect(localReply.entries?.length).to.equal(0);

        // initiate sync
        await syncEngine.pull();

        // query that the local record exists
        const { reply: localReply2 } = await testHarness.agent.dwn.processRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : { filter: { recordId: writeResponse.message!.recordId } }
        });

        expect(localReply2.status.code).to.equal(200);
        expect(localReply2.entries?.length).to.equal(1);
        const [ entry ] = localReply2.entries!;
        expect(entry.encodedData).to.be.undefined; // encodedData is undefined

        // Execute a RecordsRead to verify the data was synced.
        // check for response encodedData if it doesn't exist issue a RecordsRead
        // get individual records without encodedData to check that data exists
        const readResponse = await testHarness.agent.dwn.processRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsRead,
          messageParams : { filter: { recordId: writeResponse.message!.recordId } }
        });
        expect(readResponse.reply.status.code).to.equal(200);
        expect(readResponse.reply.record).to.exist;
        expect(readResponse.reply.record!.data).to.exist;
        expect(readResponse.reply.record!.descriptor.dataSize).to.equal(LARGE_DATA_SIZE);
      }).slow(1200); // Yellow at 600ms, Red at 1200ms.

      it('synchronizes records for multiple identities from remote DWN to local DWN', async () => {
      // Create a second Identity to author the DWN messages.
        const bob = await testHarness.createIdentity({ name: 'Bob', testDwnUrls });

        // Write a test record to Alice's remote DWN.
        let writeResponse = await testHarness.agent.dwn.sendRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat: 'text/plain'
          },
          dataStream: new Blob(['Hello, Bob!'])
        });

        // Get the record ID of Alice's test record.
        const testRecordIdAlice = writeResponse.message!.recordId;

        // Write a test record to Bob's remote DWN.
        writeResponse = await testHarness.agent.dwn.sendRequest({
          author        : bob.did.uri,
          target        : bob.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat: 'text/plain'
          },
          dataStream: new Blob(['Hello, Alice!'])
        });

        // Get the record ID of Bob's test record.
        const testRecordIdBob = writeResponse.message!.recordId;

        // Register Alice's DID to be synchronized.
        await testHarness.agent.sync.registerIdentity({
          did: alice.did.uri
        });

        // Register Bob's DID to be synchronized.
        await testHarness.agent.sync.registerIdentity({
          did: bob.did.uri
        });

        // Execute Sync to pull all records from Alice's and Bob's remove DWNs to their local DWNs.
        await syncEngine.pull();

        // Confirm the Alice test record exist on Alice's local DWN.
        let queryResponse = await testHarness.agent.dwn.processRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : { filter: { recordId: testRecordIdAlice } }
        });
        let localDwnQueryReply = queryResponse.reply;
        expect(localDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
        expect(localDwnQueryReply.entries).to.have.length(1); // Record does exist on local DWN.

        // Confirm the Bob test record exist on Bob's local DWN.
        queryResponse = await testHarness.agent.dwn.sendRequest({
          author        : bob.did.uri,
          target        : bob.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : { filter: { recordId: testRecordIdBob } }
        });
        localDwnQueryReply = queryResponse.reply;
        expect(localDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
        expect(localDwnQueryReply.entries).to.have.length(1); // Record does exist on local DWN.
      }).slow(1000); // Yellow at 500ms, Red at 1000ms.
    });

    describe('push()', () => {
      it('takes no action if no identities are registered', async () => {
        const didResolveSpy = sinon.spy(testHarness.agent.did, 'resolve');
        const processRequestSpy = sinon.spy(testHarness.agent.dwn, 'processRequest');

        await syncEngine.push();

        // Verify DID resolution and DWN requests did not occur.
        expect(didResolveSpy.notCalled).to.be.true;
        expect(processRequestSpy.notCalled).to.be.true;

        didResolveSpy.restore();
        processRequestSpy.restore();
      });

      it('synchronizes records for 1 identity from local DWN to remote DWN', async () => {
        // Write a record that we can use for this test.
        let writeResponse = await testHarness.agent.dwn.processRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat: 'text/plain'
          },
          dataStream: new Blob(['Hello, world!'])
        });

        // Get the record ID of the test record.
        const testRecordId = writeResponse.message!.recordId;

        // Confirm the record does NOT exist on Alice's remote DWN.
        let queryResponse = await testHarness.agent.dwn.sendRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : { filter: { recordId: testRecordId } }
        });
        let remoteDwnQueryReply = queryResponse.reply;
        expect(remoteDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
        expect(remoteDwnQueryReply.entries).to.have.length(0); // Record doesn't exist on remote DWN.

        // Register Alice's DID to be synchronized.
        await testHarness.agent.sync.registerIdentity({
          did: alice.did.uri
        });

        // Execute Sync to push all records from Alice's local DWN to Alice's remote DWN.
        await syncEngine.push();

        // Confirm the record now DOES exist on Alice's remote DWN.
        queryResponse = await testHarness.agent.dwn.sendRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : { filter: { recordId: testRecordId } }
        });
        remoteDwnQueryReply = queryResponse.reply;
        expect(remoteDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
        expect(remoteDwnQueryReply.entries).to.have.length(1); // Record does exist on remote DWN.

        // Add another record for a subsequent sync.
        let writeResponse2 = await testHarness.agent.dwn.processRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat: 'text/plain'
          },
          dataStream: new Blob(['Hello, world 2!'])
        });
        // Get the record ID of the test record.
        const testRecord2Id = writeResponse2.message!.recordId;

        // Confirm the new record does NOT exist on Alice's remote DWN.
        queryResponse = await testHarness.agent.dwn.sendRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : { filter: { recordId: testRecord2Id } } // New RecordId
        });
        remoteDwnQueryReply = queryResponse.reply;
        expect(remoteDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
        expect(remoteDwnQueryReply.entries).to.have.length(0); // New Record doesn't exist on local DWN.

        await syncEngine.push();

        // Confirm the new record DOES exist on Alice's local DWN.
        queryResponse = await testHarness.agent.dwn.sendRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : { filter: { recordId: testRecord2Id } } // New RecordId
        });
        remoteDwnQueryReply = queryResponse.reply;
        expect(remoteDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
        expect(remoteDwnQueryReply.entries).to.have.length(1); // New Record does exist on local DWN.
      }).slow(600); // Yellow at 300ms, Red at 600ms.

      it('synchronizes records with data larger than the `encodedData` limit within the `RecordsQuery` response', async () => {
        // larger than the size of data returned in a RecordsQuery
        const LARGE_DATA_SIZE = DwnConstant.maxDataSizeAllowedToBeEncoded + 1_000;

        //register alice
        await testHarness.agent.sync.registerIdentity({
          did: alice.did.uri
        });

        // create a local record
        const record = await testHarness.agent.dwn.processRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat: 'text/plain'
          },
          dataStream: new Blob(Array(LARGE_DATA_SIZE).fill('a')) //large data
        });

        // check that record doesn't exist remotely
        const { reply: remoteReply } = await testHarness.agent.dwn.sendRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : { filter: { recordId: record.message!.recordId }}
        });

        expect(remoteReply.status.code).to.equal(200);
        expect(remoteReply.entries?.length).to.equal(0);

        // initiate sync
        await syncEngine.push();

        // query for remote REcords
        const { reply: remoteReply2 } = await testHarness.agent.dwn.sendRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : { filter: { recordId: record.message!.recordId }}
        });

        expect(remoteReply2.status.code).to.equal(200);
        expect(remoteReply2.entries?.length).to.equal(1);
        const entry = remoteReply2.entries![0];
        expect(entry.encodedData).to.be.undefined;
        // check for response encodedData if it doesn't exist issue a RecordsRead
        const recordId = entry.recordId;
        // get individual records without encodedData to check that data exists
        const readRecord = await testHarness.agent.dwn.processRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsRead,
          messageParams : { filter: { recordId } }
        });
        const reply = readRecord.reply;
        expect(reply.status.code).to.equal(200);
        expect(reply.record).to.not.be.undefined;
        expect(reply.record!.data).to.not.be.undefined;
      }).slow(1200); // Yellow at 600ms, Red at 1200ms.

      it('synchronizes records for multiple identities from local DWN to remote DWN', async () => {
        // Create a second Identity to author the DWN messages.
        const bob  = await testHarness.createIdentity({ name: 'Bob', testDwnUrls });

        // Write a test record to Alice's local DWN.
        let writeResponse = await testHarness.agent.dwn.processRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat: 'text/plain'
          },
          dataStream: new Blob(['Hello, Bob!'])
        });

        // Get the record ID of Alice's test record.
        const testRecordIdAlice = writeResponse.message!.recordId;

        // Write a test record to Bob's local DWN.
        writeResponse = await testHarness.agent.dwn.processRequest({
          author        : bob.did.uri,
          target        : bob.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat: 'text/plain'
          },
          dataStream: new Blob(['Hello, Alice!'])
        });

        // Get the record ID of Bob's test record.
        const testRecordIdBob = writeResponse.message!.recordId;

        // Register Alice's DID to be synchronized.
        await testHarness.agent.sync.registerIdentity({
          did: alice.did.uri
        });

        // Register Bob's DID to be synchronized.
        await testHarness.agent.sync.registerIdentity({
          did: bob.did.uri
        });

        // Execute Sync to push all records from Alice's and Bob's local DWNs to their remote DWNs.
        await syncEngine.push();

        // Confirm the Alice test record exist on Alice's remote DWN.
        let queryResponse = await testHarness.agent.dwn.sendRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : { filter: { recordId: testRecordIdAlice } }
        });
        let remoteDwnQueryReply = queryResponse.reply;
        expect(remoteDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
        expect(remoteDwnQueryReply.entries).to.have.length(1); // Record does exist on remote DWN.

        // Confirm the Bob test record exist on Bob's remote DWN.
        queryResponse = await testHarness.agent.dwn.sendRequest({
          author        : bob.did.uri,
          target        : bob.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : { filter: { recordId: testRecordIdBob } }
        });
        remoteDwnQueryReply = queryResponse.reply;
        expect(remoteDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
        expect(remoteDwnQueryReply.entries).to.have.length(1); // Record does exist on remote DWN.
      }).slow(1200); // Yellow at 600ms, Red at 1200ms.
    });

    describe('startSync()', () => {
      it('calls push/pull in each interval', async () => {
        await testHarness.agent.sync.registerIdentity({
          did: alice.did.uri
        });

        const pushSpy = sinon.stub(SyncEngineLevel.prototype, 'push');
        pushSpy.resolves();

        const pullSpy = sinon.stub(SyncEngineLevel.prototype, 'pull');
        pullSpy.resolves();

        const clock = sinon.useFakeTimers();

        testHarness.agent.sync.startSync({ interval: '500ms' });

        await clock.tickAsync(1_400); // just under 3 intervals
        pushSpy.restore();
        pullSpy.restore();
        clock.restore();

        expect(pushSpy.callCount).to.equal(2, 'push');
        expect(pullSpy.callCount).to.equal(2, 'pull');
      });

      it('does not call push/pull again until a push/pull finishes', async () => {
        await testHarness.agent.sync.registerIdentity({
          did: alice.did.uri
        });

        const clock = sinon.useFakeTimers();

        const pushSpy = sinon.stub(SyncEngineLevel.prototype, 'push');
        pushSpy.returns(new Promise((resolve) => {
          clock.setTimeout(() => {
            resolve();
          }, 1_500); // more than the interval
        }));

        const pullSpy = sinon.stub(SyncEngineLevel.prototype, 'pull');
        pullSpy.resolves();

        testHarness.agent.sync.startSync({ interval: '500ms' });

        await clock.tickAsync(1_400); // less time than the push

        expect(pushSpy.callCount).to.equal(1, 'push');
        expect(pullSpy.callCount).to.equal(0, 'pull'); // not called yet

        await clock.tickAsync(100); //remaining time for pull to be called

        expect(pullSpy.callCount).to.equal(1, 'pull');

        pushSpy.restore();
        pullSpy.restore();
        clock.restore();
      });
    });
  });
});