import type { PortableDid } from '@web5/dids';

import { expect } from 'chai';
import sinon from 'sinon';

import type { ManagedIdentity } from '../src/identity-manager.js';

import { testDwnUrls } from './test-config.js';
import { TestAgent, randomBytes } from './utils/test-agent.js';
import { MIN_SYNC_INTERVAL, SyncManagerLevel } from '../src/sync-manager.js';
import { TestManagedAgent } from '../src/test-managed-agent.js';

import { ProcessDwnRequest } from '../src/index.js';
import { DataStream, RecordsQueryReply, RecordsReadReply, RecordsWriteMessage } from '@tbd54566975/dwn-sdk-js';
import { Readable } from 'readable-stream';

/**
 *  Generates a `RecordsWrite` ProcessDwnRequest for testing.
 */
export function TestRecordsWriteMessage(target: string, author: string, dataStream: Blob | ReadableStream | Readable ): ProcessDwnRequest {
  return {
    author         : author,
    target         : target,
    messageType    : 'RecordsWrite',
    messageOptions : {
      schema     : 'testSchema',
      dataFormat : 'text/plain'
    },
    dataStream,
  };
}

describe('SyncManagerLevel', () => {
  describe('get agent', () => {
    it(`returns the 'agent' instance property`, async () => {
      // @ts-expect-error because we are only mocking a single property.
      const mockAgent: Web5ManagedAgent = {
        agentDid: 'did:method:abc123'
      };
      const syncManager = new SyncManagerLevel({
        agent    : mockAgent,
        dataPath : '__TESTDATA__/SYNC_STORE4'
      });
      const agent = syncManager.agent;
      expect(agent).to.exist;
      expect(agent.agentDid).to.equal('did:method:abc123');
    });

    it(`throws an error if the 'agent' instance property is undefined`, () => {
      const syncManager = new SyncManagerLevel({
        dataPath: '__TESTDATA__/SYNC_STORE4'
      });
      expect(() =>
        syncManager.agent
      ).to.throw(Error, 'Unable to determine agent execution context');
    });
  });

  describe('with Web5ManagedAgent', () => {
    let alice: ManagedIdentity;
    let aliceDid: PortableDid;
    let testAgent: TestManagedAgent;

    before(async () => {
      testAgent = await TestManagedAgent.create({
        agentClass  : TestAgent,
        agentStores : 'dwn'
      });
    });

    beforeEach(async () => {
      await testAgent.clearStorage();
      await testAgent.createAgentDid();

      // Create a new Identity to author the DWN messages.
      ({ did: aliceDid } = await testAgent.createIdentity({ testDwnUrls }));
      alice = await testAgent.agent.identityManager.import({
        did      : aliceDid,
        identity : { name: 'Alice', did: aliceDid.did },
        kms      : 'local'
      });
    });

    afterEach(async () => {
      await testAgent.clearStorage();
    });

    after(async () => {
      await testAgent.clearStorage();
      await testAgent.closeStorage();
    });

    describe('startSync()', () => {
      let clock: sinon.SinonFakeTimers;

      beforeEach(() => {
        clock = sinon.useFakeTimers();
      });

      afterEach(() => {
        clock.restore();
      });

      it('check sync interval input', async () => {
        const syncSpy = sinon.spy(testAgent.agent.syncManager, 'sync');
        await testAgent.agent.syncManager.registerIdentity({
          did: alice.did
        });
        testAgent.agent.syncManager.startSync({ interval: 5000 });

        clock.tick(3 * 5000);

        expect(syncSpy.callCount).to.equal(3);
        syncSpy.restore();
      });

      it('sync interval below minimum allowed threshold will sync at the minimum interval', async () => {
        const syncSpy = sinon.spy(testAgent.agent.syncManager, 'sync');
        await testAgent.agent.syncManager.registerIdentity({
          did: alice.did
        });
        testAgent.agent.syncManager.startSync({ interval: 100 });

        clock.tick(3 * MIN_SYNC_INTERVAL);

        expect(syncSpy.callCount).to.equal(3);
        syncSpy.restore();
      });

      it('subsequent startSync should cancel the old sync and start a new sync interval', async () => {
        const syncSpy = sinon.spy(testAgent.agent.syncManager, 'sync');
        await testAgent.agent.syncManager.registerIdentity({
          did: alice.did
        });

        // start sync with default timeout
        testAgent.agent.syncManager.startSync();

        // go through 3 intervals
        clock.tick(3 * MIN_SYNC_INTERVAL);

        expect(syncSpy.callCount).to.equal(3);

        // start sync with a higher interval. Should cancel the old sync and set a new interval.
        testAgent.agent.syncManager.startSync({ interval: 10_000 });

        // go through 3 intervals with the new timeout
        clock.tick( 3 * 10_000);

        // should be called a total of 6 times.
        expect(syncSpy.callCount).to.equal(6);

        syncSpy.restore();
      });

      it('check sync default value passed', async () => {
        const setIntervalSpy = sinon.spy(global, 'setInterval');
        await testAgent.agent.syncManager.registerIdentity({
          did: alice.did
        });
        testAgent.agent.syncManager.startSync();

        clock.tick( 1 * MIN_SYNC_INTERVAL);

        expect(setIntervalSpy.calledOnce).to.be.true;
        expect(setIntervalSpy.getCall(0).args.at(1)).to.equal(MIN_SYNC_INTERVAL);
        setIntervalSpy.restore();
      });
    });

    describe('sync()', () => {
      it('takes no action if no identities are registered', async () => {
        const didResolveSpy = sinon.spy(testAgent.agent.didResolver, 'resolve');
        const sendDwnRequestSpy = sinon.spy(testAgent.agent.rpcClient, 'sendDwnRequest');

        await testAgent.agent.syncManager.sync();

        // Verify DID resolution and DWN requests did not occur.
        expect(didResolveSpy.notCalled).to.be.true;
        expect(sendDwnRequestSpy.notCalled).to.be.true;

        didResolveSpy.restore();
        sendDwnRequestSpy.restore();
      });

      it('silently ignore when a particular DWN service endpoint is unreachable', async () => {
        // Write a test record to Alice's remote DWN.
        let writeResponse = await testAgent.agent.dwnManager.sendRequest({
          author         : alice.did,
          target         : alice.did,
          messageType    : 'RecordsWrite',
          messageOptions : {
            dataFormat: 'text/plain'
          },
          dataStream: new Blob(['Hello, world!'])
        });
        expect(writeResponse.reply.status.code).to.equal(202);

        const getRemoteEventsSpy = sinon.spy(testAgent.agent.syncManager as any, 'getRemoteEvents');
        const sendDwnRequestStub = sinon.stub(testAgent.agent.rpcClient, 'sendDwnRequest').rejects('some failure');

        // Register Alice's DID to be synchronized.
        await testAgent.agent.syncManager.registerIdentity({
          did: alice.did
        });

        // Execute Sync to pull all records from Alice's remote DWN to Alice's local DWN.
        await testAgent.agent.syncManager.sync();

        //restore sinon stubs and spys
        getRemoteEventsSpy.restore();
        sendDwnRequestStub.restore();

        expect(getRemoteEventsSpy.called).to.be.true;
        expect(getRemoteEventsSpy.threw()).to.be.false;
      });

      it('synchronizes data in both directions for a single identity', async () => {

        await testAgent.agent.syncManager.registerIdentity({
          did: alice.did
        });

        const everythingQuery = (): ProcessDwnRequest => {
          return {
            author         : alice.did,
            target         : alice.did,
            messageType    : 'RecordsQuery',
            messageOptions : { filter: { schema: 'testSchema' } }
          };
        };

        const localRecords = new Set(
          (await Promise.all(Array(5).fill({}).map(_ => testAgent.agent.dwnManager.processRequest(TestRecordsWriteMessage(
            alice.did,
            alice.did,
            new Blob([randomBytes(256)]),
          ))))).map(r => (r.message as RecordsWriteMessage).recordId)
        );

        const remoteRecords = new Set(
          (await Promise.all(Array(5).fill({}).map(_ => testAgent.agent.dwnManager.sendRequest(TestRecordsWriteMessage(
            alice.did,
            alice.did,
            new Blob([randomBytes(256)]),
          ))))).map(r => (r.message as RecordsWriteMessage).recordId)
        );

        const { reply: localReply } = await testAgent.agent.dwnManager.processRequest(everythingQuery());
        expect(localReply.status.code).to.equal(200);
        expect(localReply.entries?.length).to.equal(localRecords.size);
        expect(localReply.entries?.every(e => localRecords.has((e as RecordsWriteMessage).recordId))).to.be.true;

        const { reply: remoteReply } = await testAgent.agent.dwnManager.sendRequest(everythingQuery());
        expect(remoteReply.status.code).to.equal(200);
        expect(remoteReply.entries?.length).to.equal(remoteRecords.size);
        expect(remoteReply.entries?.every(e => remoteRecords.has((e as RecordsWriteMessage).recordId))).to.be.true;

        await testAgent.agent.syncManager.sync();

        const records = new Set([...remoteRecords, ...localRecords]);
        const { reply: allRemoteReply } = await testAgent.agent.dwnManager.sendRequest(everythingQuery());
        expect(allRemoteReply.status.code).to.equal(200);
        expect(allRemoteReply.entries?.length).to.equal(records.size);
        expect(allRemoteReply.entries?.every(e => records.has((e as RecordsWriteMessage).recordId))).to.be.true;

        const { reply: allLocalReply } = await testAgent.agent.dwnManager.sendRequest(everythingQuery());
        expect(allLocalReply.status.code).to.equal(200);
        expect(allLocalReply.entries?.length).to.equal(records.size);
        expect(allLocalReply.entries?.every(e => records.has((e as RecordsWriteMessage).recordId))).to.be.true;

      }).timeout(10_000);

      it('should skip dwn if there a failure getting syncState', async () => {
        await testAgent.agent.syncManager.registerIdentity({
          did: alice.did
        });

        const getWatermarkStub = sinon.stub(testAgent.agent.syncManager as any, 'getSyncState').rejects('rejected');
        const getSyncPeerState = sinon.spy(testAgent.agent.syncManager as any, 'getSyncPeerState');

        await testAgent.agent.syncManager.sync();
        getWatermarkStub.restore();
        getSyncPeerState.restore();

        expect(getSyncPeerState.called).to.be.true;
        expect(getWatermarkStub.called).to.be.true;
      });

      describe('batchOperations()', () => {
        it('should only call once per remote DWN if pull direction is passed', async () => {
          const batchOperationsSpy = sinon.spy(testAgent.agent.syncManager as any, 'batchOperations');
          await testAgent.agent.syncManager.registerIdentity({
            did: alice.did
          });
          await testAgent.agent.syncManager.sync('pull');
          batchOperationsSpy.restore(); // restore before assertions to avoid failures in other tests
          expect(batchOperationsSpy.callCount).to.equal(testDwnUrls.length, 'pull direction is passed');
          expect(batchOperationsSpy.args.filter(arg => arg.includes('pull')).length).to.equal(testDwnUrls.length, `args must include pull ${batchOperationsSpy.args[0]}`);
        });

        it('should only call once per remote DWN if push direction is passed', async () => {
          const batchOperationsSpy = sinon.spy(testAgent.agent.syncManager as any, 'batchOperations');
          await testAgent.agent.syncManager.registerIdentity({
            did: alice.did
          });
          await testAgent.agent.syncManager.sync('push');
          batchOperationsSpy.restore(); // restore before assertions to avoid failures in other tests
          expect(batchOperationsSpy.callCount).to.equal(testDwnUrls.length, 'push direction is passed');
          expect(batchOperationsSpy.args.filter(arg => arg.includes('push')).length).to.equal(testDwnUrls.length, `args must include push ${batchOperationsSpy.args[0]}`);
        });

        it('should be called twice per remote DWN if no direction is passed', async () => {
          const batchOperationsSpy = sinon.spy(testAgent.agent.syncManager as any, 'batchOperations');
          await testAgent.agent.syncManager.registerIdentity({
            did: alice.did
          });
          await testAgent.agent.syncManager.sync();
          batchOperationsSpy.restore(); // restore before assertions to avoid failures in other tests
          expect(batchOperationsSpy.callCount).to.equal((2 * testDwnUrls.length), 'no direction is passed');
          expect(batchOperationsSpy.args.filter(arg => arg.includes('pull')).length).to.equal(testDwnUrls.length, `args must include one pull ${batchOperationsSpy.args}`);
          expect(batchOperationsSpy.args.filter(arg => arg.includes('push')).length).to.equal(testDwnUrls.length, `args must include one push ${batchOperationsSpy.args}`);
        });
      });

      describe('pull', () => {
        it('synchronizes records for 1 identity from remote DWN to local DWN', async () => {
          // Write a test record to Alice's remote DWN.
          let writeResponse = await testAgent.agent.dwnManager.sendRequest({
            author         : alice.did,
            target         : alice.did,
            messageType    : 'RecordsWrite',
            messageOptions : {
              dataFormat: 'text/plain'
            },
            dataStream: new Blob(['Hello, world!'])
          });

          // Get the record ID of the test record.
          const testRecordId = (writeResponse.message as RecordsWriteMessage).recordId;

          // Confirm the record does NOT exist on Alice's local DWN.
          let queryResponse = await testAgent.agent.dwnManager.processRequest({
            author         : alice.did,
            target         : alice.did,
            messageType    : 'RecordsQuery',
            messageOptions : { filter: { recordId: testRecordId } }
          });
          let localDwnQueryReply = queryResponse.reply as RecordsQueryReply;
          expect(localDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
          expect(localDwnQueryReply.entries).to.have.length(0); // Record doesn't exist on local DWN.

          // Register Alice's DID to be synchronized.
          await testAgent.agent.syncManager.registerIdentity({
            did: alice.did
          });

          // Execute Sync to pull all records from Alice's remote DWN to Alice's local DWN.
          await testAgent.agent.syncManager.sync('pull');

          // Confirm the record now DOES exist on Alice's local DWN.
          queryResponse = await testAgent.agent.dwnManager.processRequest({
            author         : alice.did,
            target         : alice.did,
            messageType    : 'RecordsQuery',
            messageOptions : { filter: { recordId: testRecordId } }
          });
          localDwnQueryReply = queryResponse.reply as RecordsQueryReply;
          expect(localDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
          expect(localDwnQueryReply.entries).to.have.length(1); // Record does exist on local DWN.
        });

        it('synchronizes records for multiple identities from remote DWN to local DWN', async () => {
          // Create a second Identity to author the DWN messages.
          const { did: bobDid } = await testAgent.createIdentity({ testDwnUrls });
          const bob = await testAgent.agent.identityManager.import({
            did      : bobDid,
            identity : { name: 'Bob', did: bobDid.did },
            kms      : 'local'
          });

          // Write a test record to Alice's remote DWN.
          let writeResponse = await testAgent.agent.dwnManager.sendRequest({
            author         : alice.did,
            target         : alice.did,
            messageType    : 'RecordsWrite',
            messageOptions : {
              dataFormat: 'text/plain'
            },
            dataStream: new Blob(['Hello, Bob!'])
          });

          // Get the record ID of Alice's test record.
          const testRecordIdAlice = (writeResponse.message as RecordsWriteMessage).recordId;

          // Write a test record to Bob's remote DWN.
          writeResponse = await testAgent.agent.dwnManager.sendRequest({
            author         : bob.did,
            target         : bob.did,
            messageType    : 'RecordsWrite',
            messageOptions : {
              dataFormat: 'text/plain'
            },
            dataStream: new Blob(['Hello, Alice!'])
          });

          // Get the record ID of Bob's test record.
          const testRecordIdBob = (writeResponse.message as RecordsWriteMessage).recordId;

          // Register Alice's DID to be synchronized.
          await testAgent.agent.syncManager.registerIdentity({
            did: alice.did
          });

          // Register Bob's DID to be synchronized.
          await testAgent.agent.syncManager.registerIdentity({
            did: bob.did
          });

          // Execute Sync to pull all records from Alice's and Bob's remote DWNs to their local DWNs.
          await testAgent.agent.syncManager.sync('pull');

          // Confirm the Alice test record exist on Alice's local DWN.
          let queryResponse = await testAgent.agent.dwnManager.processRequest({
            author         : alice.did,
            target         : alice.did,
            messageType    : 'RecordsQuery',
            messageOptions : { filter: { recordId: testRecordIdAlice } }
          });
          let localDwnQueryReply = queryResponse.reply as RecordsQueryReply;
          expect(localDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
          expect(localDwnQueryReply.entries).to.have.length(1); // Record does exist on local DWN.

          // Confirm the Bob test record exist on Bob's local DWN.
          queryResponse = await testAgent.agent.dwnManager.sendRequest({
            author         : bob.did,
            target         : bob.did,
            messageType    : 'RecordsQuery',
            messageOptions : { filter: { recordId: testRecordIdBob } }
          });
          localDwnQueryReply = queryResponse.reply as RecordsQueryReply;
          expect(localDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
          expect(localDwnQueryReply.entries).to.have.length(1); // Record does exist on local DWN.
        }).timeout(5_000);

        it('synchronizes records with data larger than the `encodedData` limit within the `RecordsQuery` response', async () => {
          // larger than the size of data returned in a RecordsQuery
          const LARGE_DATA_SIZE = 70_000;
          const everythingQuery = (): ProcessDwnRequest => {
            return {
              author         : alice.did,
              target         : alice.did,
              messageType    : 'RecordsQuery',
              messageOptions : { filter: { schema: 'testSchema' } }
            };
          };

          //register alice
          await testAgent.agent.syncManager.registerIdentity({
            did: alice.did
          });

          // create remote records to sync locally
          const remoteRecords = new Set(
            (await Promise.all(Array(2).fill({}).map(i => testAgent.agent.dwnManager.sendRequest(TestRecordsWriteMessage(
              alice.did,
              alice.did,
              new Blob([randomBytes(i % 2 === 0 ? 256 : LARGE_DATA_SIZE )]), // create some small and large records
            ))))));

          // check that records don't exist locally
          const { reply: localReply } = await testAgent.agent.dwnManager.processRequest(everythingQuery());
          expect(localReply.status.code).to.equal(200);
          expect(localReply.entries?.length).to.equal(0);

          // initiate sync
          await testAgent.agent.syncManager.sync();

          // query for local records
          const { reply: localReply2 } = await testAgent.agent.dwnManager.processRequest(everythingQuery());
          expect(localReply2.status.code).to.equal(200);
          expect(localReply2.entries?.length).to.equal(remoteRecords.size);

          // check for response encodedData if it doesn't exist issue a RecordsRead
          for (const entry of localReply2.entries!) {
            if (entry.encodedData === undefined) {
              const recordId = (entry as RecordsWriteMessage).recordId;
              // get individual records without encodedData to check that data exists
              const record = await testAgent.agent.dwnManager.processRequest({
                author         : alice.did,
                target         : alice.did,
                messageType    : 'RecordsRead',
                messageOptions : { recordId }
              });
              const reply = record.reply as RecordsReadReply;
              expect(reply.status.code).to.equal(200);
              expect(reply.record).to.not.be.undefined;
              expect(reply.record!.data).to.not.be.undefined;
              const data = await DataStream.toBytes(reply.record!.data);
              expect(data.length).to.equal(LARGE_DATA_SIZE);
            }
          }
        }).timeout(5_000);
      });

      describe('push', () => {
        it('synchronizes records for 1 identity from local DWN to remote DWN', async () => {
          // Write a record that we can use for this test.
          let writeResponse = await testAgent.agent.dwnManager.processRequest({
            author         : alice.did,
            target         : alice.did,
            messageType    : 'RecordsWrite',
            messageOptions : {
              dataFormat: 'text/plain'
            },
            dataStream: new Blob(['Hello, world!'])
          });

          // Get the record ID of the test record.
          const testRecordId = (writeResponse.message as RecordsWriteMessage).recordId;

          // Confirm the record does NOT exist on Alice's remote DWN.
          let queryResponse = await testAgent.agent.dwnManager.sendRequest({
            author         : alice.did,
            target         : alice.did,
            messageType    : 'RecordsQuery',
            messageOptions : { filter: { recordId: testRecordId } }
          });
          let remoteDwnQueryReply = queryResponse.reply as RecordsQueryReply;
          expect(remoteDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
          expect(remoteDwnQueryReply.entries).to.have.length(0); // Record doesn't exist on remote DWN.

          // Register Alice's DID to be synchronized.
          await testAgent.agent.syncManager.registerIdentity({
            did: alice.did
          });

          // Execute Sync to push all records from Alice's local DWN to Alice's remote DWN.
          await testAgent.agent.syncManager.sync('push');

          // Confirm the record now DOES exist on Alice's remote DWN.
          queryResponse = await testAgent.agent.dwnManager.sendRequest({
            author         : alice.did,
            target         : alice.did,
            messageType    : 'RecordsQuery',
            messageOptions : { filter: { recordId: testRecordId } }
          });
          remoteDwnQueryReply = queryResponse.reply as RecordsQueryReply;
          expect(remoteDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
          expect(remoteDwnQueryReply.entries).to.have.length(1); // Record does exist on remote DWN.
        });

        it('synchronizes records for multiple identities from local DWN to remote DWN', async () => {
          // Create a second Identity to author the DWN messages.
          const { did: bobDid } = await testAgent.createIdentity({ testDwnUrls });
          const bob = await testAgent.agent.identityManager.import({
            did      : bobDid,
            identity : { name: 'Bob', did: bobDid.did },
            kms      : 'local'
          });

          // Write a test record to Alice's local DWN.
          let writeResponse = await testAgent.agent.dwnManager.processRequest({
            author         : alice.did,
            target         : alice.did,
            messageType    : 'RecordsWrite',
            messageOptions : {
              dataFormat: 'text/plain'
            },
            dataStream: new Blob(['Hello, Bob!'])
          });

          // Get the record ID of Alice's test record.
          const testRecordIdAlice = (writeResponse.message as RecordsWriteMessage).recordId;

          // Write a test record to Bob's local DWN.
          writeResponse = await testAgent.agent.dwnManager.processRequest({
            author         : bob.did,
            target         : bob.did,
            messageType    : 'RecordsWrite',
            messageOptions : {
              dataFormat: 'text/plain'
            },
            dataStream: new Blob(['Hello, Alice!'])
          });

          // Get the record ID of Bob's test record.
          const testRecordIdBob = (writeResponse.message as RecordsWriteMessage).recordId;

          // Register Alice's DID to be synchronized.
          await testAgent.agent.syncManager.registerIdentity({
            did: alice.did
          });

          // Register Bob's DID to be synchronized.
          await testAgent.agent.syncManager.registerIdentity({
            did: bob.did
          });

          // Execute Sync to push all records from Alice's and Bob's local DWNs to their remote DWNs.
          await testAgent.agent.syncManager.sync('push');

          // Confirm the Alice test record exist on Alice's remote DWN.
          let queryResponse = await testAgent.agent.dwnManager.sendRequest({
            author         : alice.did,
            target         : alice.did,
            messageType    : 'RecordsQuery',
            messageOptions : { filter: { recordId: testRecordIdAlice } }
          });
          let remoteDwnQueryReply = queryResponse.reply as RecordsQueryReply;
          expect(remoteDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
          expect(remoteDwnQueryReply.entries).to.have.length(1); // Record does exist on remote DWN.

          // Confirm the Bob test record exist on Bob's remote DWN.
          queryResponse = await testAgent.agent.dwnManager.sendRequest({
            author         : bob.did,
            target         : bob.did,
            messageType    : 'RecordsQuery',
            messageOptions : { filter: { recordId: testRecordIdBob } }
          });
          remoteDwnQueryReply = queryResponse.reply as RecordsQueryReply;
          expect(remoteDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
          expect(remoteDwnQueryReply.entries).to.have.length(1); // Record does exist on remote DWN.
        }).timeout(5_000);

        it('synchronizes records with data larger than the `encodedData` limit within the `RecordsQuery` response', async () => {
          // larger than the size of data returned in a RecordsQuery
          const LARGE_DATA_SIZE = 70_000;
          const everythingQuery = (): ProcessDwnRequest => {
            return {
              author         : alice.did,
              target         : alice.did,
              messageType    : 'RecordsQuery',
              messageOptions : { filter: { schema: 'testSchema' } }
            };
          };

          //register alice
          await testAgent.agent.syncManager.registerIdentity({
            did: alice.did
          });

          // create remote local records to sync to remote
          const remoteRecords = new Set(
            (await Promise.all(Array(2).fill({}).map(i => testAgent.agent.dwnManager.processRequest(TestRecordsWriteMessage(
              alice.did,
              alice.did,
              new Blob([randomBytes(i % 2 === 0 ? 256 : LARGE_DATA_SIZE )]), // create some small and large records
            ))))));

          // check that records don't exist on remote
          const { reply: localReply } = await testAgent.agent.dwnManager.sendRequest(everythingQuery());
          expect(localReply.status.code).to.equal(200);
          expect(localReply.entries?.length).to.equal(0);

          // initiate sync
          await testAgent.agent.syncManager.sync();

          // query for for remote records that now exist
          const { reply: localReply2 } = await testAgent.agent.dwnManager.sendRequest(everythingQuery());
          expect(localReply2.status.code).to.equal(200);
          expect(localReply2.entries?.length).to.equal(remoteRecords.size);

          // check for response encodedData if it doesn't exist issue a RecordsRead
          for (const entry of localReply2.entries!) {
            if (entry.encodedData === undefined) {
              const recordId = (entry as RecordsWriteMessage).recordId;
              // get individual records without encodedData to check that data exists
              const record = await testAgent.agent.dwnManager.sendRequest({
                author         : alice.did,
                target         : alice.did,
                messageType    : 'RecordsRead',
                messageOptions : { recordId }
              });
              const reply = record.reply as RecordsReadReply;
              expect(reply.status.code).to.equal(200);
              expect(reply.record).to.not.be.undefined;
              expect(reply.record!.data).to.not.be.undefined;
              const data = await DataStream.toBytes(reply.record!.data);
              expect(data.length).to.equal(LARGE_DATA_SIZE);
            }
          }
        }).timeout(5_000);
      });
    });
  });
});