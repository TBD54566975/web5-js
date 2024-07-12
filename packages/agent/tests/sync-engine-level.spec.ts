import sinon from 'sinon';
import { expect } from 'chai';
import { utils as cryptoUtils } from '@web5/crypto';
import { DwnConstant, ProtocolDefinition } from '@tbd54566975/dwn-sdk-js';

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

      sinon.restore();
      await syncEngine.clear();
      await testHarness.syncStore.clear();
      await testHarness.dwnDataStore.clear();
      await testHarness.dwnEventLog.clear();
      await testHarness.dwnMessageStore.clear();
      await testHarness.dwnResumableTaskStore.clear();
    });

    after(async () => {
      await testHarness.clearStorage();
      await testHarness.closeStorage();
    });

    it('syncs multiple messages in both directions', async () => {
      // create 1 local protocol configure
      const protocolDefinition1: ProtocolDefinition = {
        published : true,
        protocol  : 'https://protocol.xyz/example/1',
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

      const protocolsConfigure1 = await testHarness.agent.processDwnRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.ProtocolsConfigure,
        messageParams : {
          definition: protocolDefinition1
        }
      });

      // create 1 remote protocol configure
      const protocolDefinition2: ProtocolDefinition = {
        published : true,
        protocol  : 'https://protocol.xyz/example/2',
        types     : {
          bar: {
            schema      : 'https://schemas.xyz/bar',
            dataFormats : ['text/plain', 'application/json']
          }
        },
        structure: {
          bar: {}
        }
      };

      const protocolsConfigure2 = await testHarness.agent.sendDwnRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.ProtocolsConfigure,
        messageParams : {
          definition: protocolDefinition2
        }
      });


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
        expect(writeResponse.reply.status.code).to.equal(202);

        // write an update message for one of the records
        if (i === 0) {
          const updateResponse = await testHarness.agent.dwn.processRequest({
            author        : alice.did.uri,
            target        : alice.did.uri,
            messageType   : DwnInterface.RecordsWrite,
            messageParams : {
              recordId    : writeResponse.message!.recordId,
              dataFormat  : 'text/plain',
              schema      : writeResponse.message!.descriptor.schema,
              dateCreated : writeResponse.message!.descriptor.dateCreated
            },
            dataStream: new Blob([`Hello, ${i} updated!`]),
          });
          expect(updateResponse.reply.status.code).to.equal(202);
        }

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
        expect(writeResponse.reply.status.code).to.equal(202);

        // write an update message for one of the records
        if (i === 0) {
          const updateResponse = await testHarness.agent.dwn.sendRequest({
            author        : alice.did.uri,
            target        : alice.did.uri,
            messageType   : DwnInterface.RecordsWrite,
            messageParams : {
              recordId    : writeResponse.message!.recordId,
              dataFormat  : 'text/plain',
              schema      : writeResponse.message!.descriptor.schema,
              dateCreated : writeResponse.message!.descriptor.dateCreated
            },
            dataStream: new Blob([`Hello, ${i} updated!`]),
          });
          expect(updateResponse.reply.status.code).to.equal(202);
        }
        remoteRecords.push((writeResponse.message!).recordId);
      }

      // check that protocol1 exists locally
      let localProtocolsQueryResponse = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.ProtocolsQuery,
        messageParams : {}
      });
      let localProtocolsQueryReply = localProtocolsQueryResponse.reply;
      expect(localProtocolsQueryReply.status.code).to.equal(200);
      expect(localProtocolsQueryReply.entries?.length).to.equal(1);
      expect(localProtocolsQueryReply.entries).to.have.deep.equal([ protocolsConfigure1.message ]);

      // query local and check for only local records
      let localRecordsQueryResponse = await testHarness.agent.dwn.processRequest({
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
      let localRecordsQueryReply = localRecordsQueryResponse.reply;
      expect(localRecordsQueryReply.status.code).to.equal(200);
      expect(localRecordsQueryReply.entries).to.have.length(3);
      let localRecordsFromQuery = localRecordsQueryReply.entries?.map(entry => entry.recordId);
      expect(localRecordsFromQuery).to.have.members(localRecords);

      // check that protocol2 exists remotely
      let remoteProtocolsQueryResponse = await testHarness.agent.dwn.sendRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.ProtocolsQuery,
        messageParams : {}
      });
      let remoteProtocolsQueryReply = remoteProtocolsQueryResponse.reply;
      expect(remoteProtocolsQueryReply.status.code).to.equal(200);
      expect(remoteProtocolsQueryReply.entries?.length).to.equal(1);
      expect(remoteProtocolsQueryReply.entries).to.have.deep.equal([ protocolsConfigure2.message ]);

      // query remote and check for only remote records
      let remoteRecordsQueryResponse = await testHarness.agent.dwn.sendRequest({
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
      let remoteRecordsQueryReply = remoteRecordsQueryResponse.reply;
      expect(remoteRecordsQueryReply.status.code).to.equal(200);
      expect(remoteRecordsQueryReply.entries).to.have.length(3);
      let remoteRecordsFromQuery = remoteRecordsQueryReply.entries?.map(entry => entry.recordId);
      expect(remoteRecordsFromQuery).to.have.members(remoteRecords);

      // Register Alice's DID to be synchronized.
      await testHarness.agent.sync.registerIdentity({
        did: alice.did.uri
      });

      // Execute Sync to pull all records from Alice's remote DWN to Alice's local DWN.
      await syncEngine.push();
      await syncEngine.pull();

      // query local to see all protocols
      localProtocolsQueryResponse = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.ProtocolsQuery,
        messageParams : {}
      });
      localProtocolsQueryReply = localProtocolsQueryResponse.reply;
      expect(localProtocolsQueryReply.status.code).to.equal(200);
      expect(localProtocolsQueryReply.entries?.length).to.equal(2);
      expect(localProtocolsQueryReply.entries).to.have.deep.equal([ protocolsConfigure1.message, protocolsConfigure2.message ]);

      // query local node to see all records
      localRecordsQueryResponse = await testHarness.agent.dwn.processRequest({
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
      localRecordsQueryReply = localRecordsQueryResponse.reply;
      expect(localRecordsQueryReply.status.code).to.equal(200);
      expect(localRecordsQueryReply.entries).to.have.length(6, 'local');
      localRecordsFromQuery = localRecordsQueryReply.entries?.map(entry => entry.recordId);
      expect(localRecordsFromQuery).to.have.members([...localRecords, ...remoteRecords]);

      // query remote node to see all protocols
      remoteProtocolsQueryResponse = await testHarness.agent.dwn.sendRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.ProtocolsQuery,
        messageParams : {}
      });
      remoteProtocolsQueryReply = remoteProtocolsQueryResponse.reply;
      expect(remoteProtocolsQueryReply.status.code).to.equal(200);
      expect(remoteProtocolsQueryReply.entries?.length).to.equal(2);
      expect(remoteProtocolsQueryReply.entries).to.have.deep.equal([ protocolsConfigure1.message, protocolsConfigure2.message ]);

      // query remote node to see all records
      remoteRecordsQueryResponse = await testHarness.agent.dwn.sendRequest({
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
      remoteRecordsQueryReply = remoteRecordsQueryResponse.reply;
      expect(remoteRecordsQueryReply.status.code).to.equal(200);
      expect(remoteRecordsQueryReply.entries).to.have.length(6, 'remote');
      remoteRecordsFromQuery = remoteRecordsQueryReply.entries?.map(entry => entry.recordId);
      expect(remoteRecordsFromQuery).to.have.members([...localRecords, ...remoteRecords]);
    }).slow(1000); // Yellow at 500ms, Red at 1000ms.

    describe('pull()', () => {
      it('silently ignores sendDwnRequest for a messageCid that does not exist on a remote DWN', async () => {
        // scenario: The messageCids returned  from the remote eventLog contains a Cid that is not found in the remote DWN
        //           this could happen when a record is updated, only the initial write and the most recent state are kept.
        //           if this happens during a sync, the messageCid will not be found in the remote DWN and the sync should continue
        //
        //           We artificially return an invalid messageCid between 2 valid messageCid and ensure that the sync continues

        // create a record that will not be stored or sent to the remote DWN
        const invalidRecord = await testHarness.agent.processDwnRequest({
          store         : false,
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat : 'text/plain',
            schema     : randomSchema
          },
          dataStream: new Blob(['Hello, invalid!'])
        });

        // create 2 records for the remote DWN to sync
        const record1 = await testHarness.agent.sendDwnRequest({
          store         : false,
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat : 'text/plain',
            schema     : randomSchema
          },
          dataStream: new Blob(['Hello, 1'])
        });
        expect(record1.reply.status.code).to.equal(202);

        const record2 = await testHarness.agent.sendDwnRequest({
          store         : false,
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat : 'text/plain',
            schema     : randomSchema
          },
          dataStream: new Blob(['Hello, 2'])
        });
        expect(record2.reply.status.code).to.equal(202);

        // confirm that no records exist locally
        let localQueryResponse = await testHarness.agent.processDwnRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.MessagesQuery,
          messageParams : {
            filters: [] // get all messages
          }
        });
        let localDwnQueryEntries = localQueryResponse.reply.entries!;
        expect(localDwnQueryEntries.length).to.equal(0);

        // spy on sendDwnRequest to the remote DWN
        const sendDwnRequestSpy = sinon.spy(testHarness.agent.rpc, 'sendDwnRequest');

        sinon.stub(syncEngine as any, 'getDwnEventLog').resolves([
          record1.messageCid,
          invalidRecord.messageCid, // this record will fail to be retrieved
          record2.messageCid
        ]);

        // Register Alice's DID to be synchronized.
        await testHarness.agent.sync.registerIdentity({
          did: alice.did.uri
        });

        // Execute Sync to pull all records from Alice's remote DWNs
        await syncEngine.pull();

        // Verify sendDwnRequest was called once for each record, including the invalid record
        //
        // NOTE: because we stubbed `getDwnEventLog` to return the messageCids of the records,
        //       we expect the sendDwnRequest from within the `getDwnEventLog` function to not be called
        //       if it were not stubbed, the could would have been called an additional time
        expect(sendDwnRequestSpy.callCount).to.equal(3);

        // confirm that the two valid records exist locally
        localQueryResponse = await testHarness.agent.processDwnRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.MessagesQuery,
          messageParams : {
            filters: [] // get all messages
          }
        });
        localDwnQueryEntries = localQueryResponse.reply.entries!;
        expect(localDwnQueryEntries.length).to.equal(2);
        expect(localDwnQueryEntries).to.have.members([
          record1.messageCid,
          record2.messageCid
        ]);
      });

      it('silently ignores a messageCid that already exists on the local DWN', async () => {
        // scenario: The messageCids returned from the remote eventLog contains a messageCid that already exists on the local DWN.
        //           During sync, when processing the messageCid the local DWN will return a conflict response, but the sync should continue
        //
        //           NOTE: When deleting a message, the conflicting Delete will return a 404 instead of a 409,
        //           the sync should still mark the message as synced and continue

        // create a record and store it locally and remotely
        const remoteAndLocalRecord = await testHarness.agent.processDwnRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat : 'text/plain',
            schema     : randomSchema
          },
          dataStream: new Blob(['Hello, remote!'])
        });

        // send record to remote
        await testHarness.agent.sendDwnRequest({
          author      : alice.did.uri,
          target      : alice.did.uri,
          messageType : DwnInterface.RecordsWrite,
          messageCid  : remoteAndLocalRecord.messageCid,
        });

        // delete the record both locally and remotely
        const deleteMessage = await testHarness.agent.processDwnRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsDelete,
          messageParams : {
            recordId: remoteAndLocalRecord.message!.recordId
          }
        });
        // send the delete to the remote
        await testHarness.agent.sendDwnRequest({
          author      : alice.did.uri,
          target      : alice.did.uri,
          messageType : DwnInterface.RecordsDelete,
          messageCid  : deleteMessage.messageCid,
        });

        // create 2 records stored only remotely to later sync to the local DWN
        const record1 = await testHarness.agent.sendDwnRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat : 'text/plain',
            schema     : randomSchema
          },
          dataStream: new Blob(['Hello, 1'])
        });
        expect(record1.reply.status.code).to.equal(202);

        const record2 = await testHarness.agent.sendDwnRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat : 'text/plain',
            schema     : randomSchema
          },
          dataStream: new Blob(['Hello, 2'])
        });
        expect(record2.reply.status.code).to.equal(202);

        // confirm that only the record and it's delete exists locally
        let localQueryResponse = await testHarness.agent.processDwnRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.MessagesQuery,
          messageParams : {
            filters: [], // get all messages
          }
        });

        let localDwnQueryEntries = localQueryResponse.reply.entries!;
        expect(localDwnQueryEntries.length).to.equal(2);
        expect(localDwnQueryEntries).to.have.members([
          remoteAndLocalRecord.messageCid,
          deleteMessage.messageCid
        ]);

        // stub getDwnEventLog to return the messageCids of the records we want to sync
        sinon.stub(syncEngine as any, 'getDwnEventLog').resolves([
          remoteAndLocalRecord.messageCid,
          deleteMessage.messageCid,
          record1.messageCid,
          record2.messageCid
        ]);

        // Register Alice's DID to be synchronized.
        await testHarness.agent.sync.registerIdentity({
          did: alice.did.uri
        });

        // spy on sendDwnRequest to the remote DWN
        const sendDwnRequestSpy = sinon.spy(testHarness.agent.rpc, 'sendDwnRequest');
        const processMessageSpy = sinon.spy(testHarness.agent.dwn.node, 'processMessage');

        // Execute Sync to push records to Alice's remote node
        await syncEngine.pull();

        // Verify sendDwnRequest is called for all 4 messages
        expect(sendDwnRequestSpy.callCount).to.equal(4, 'sendDwnRequestSpy');
        // Verify that processMessage is called for all 4 messages
        expect(processMessageSpy.callCount).to.equal(4, 'processMessageSpy');

        // Verify that the conflict response is returned for the record that already exists locally
        expect((await processMessageSpy.firstCall.returnValue).status.code).to.equal(409);
        // Verify that the delete message returned a 404
        expect((await processMessageSpy.secondCall.returnValue).status.code).to.equal(404);

        // Verify that the other 2 records are successfully processed
        expect((await processMessageSpy.returnValues[2]).status.code).to.equal(202);
        expect((await processMessageSpy.returnValues[3]).status.code).to.equal(202);

        // confirm the new records exist remotely
        localQueryResponse = await testHarness.agent.processDwnRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.MessagesQuery,
          messageParams : {
            filters: [], // get all messages
          },
        });
        localDwnQueryEntries = localQueryResponse.reply.entries!;
        expect(localDwnQueryEntries.length).to.equal(4);
        expect(localDwnQueryEntries).to.have.members([
          remoteAndLocalRecord.messageCid,
          deleteMessage.messageCid,
          record1.messageCid,
          record2.messageCid
        ]);
      });

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
      it('silently ignores a messageCid from the eventLog that does not exist on the local DWN', async () => {
        // It's important to create a new DID here to avoid conflicts with the previous test on the remote DWN,
        // since we are not clearing the remote DWN's storage before each test.
        const name = cryptoUtils.randomUuid();
        const alice = await testHarness.createIdentity({ name, testDwnUrls });

        // scenario: The messageCids returned from the local eventLog contains a Cid that is not found when attempting to push it to the remote DWN
        //           this could happen when a record is updated, only the initial write and the most recent state are kept.
        //           if this happens during a sync, the messageCid will not be found in the DWN and the sync should continue
        //
        //           We artificially return an invalid messageCid between 2 valid messageCid and ensure that the sync continues

        // create a record that will not be stored or sent to the remote DWN
        const invalidRecord = await testHarness.agent.processDwnRequest({
          store         : false,
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat : 'text/plain',
            schema     : randomSchema
          },
          dataStream: new Blob(['Hello, invalid!'])
        });

        // create 2 records for the local DWN to sync to the remote DWN
        const record1 = await testHarness.agent.processDwnRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat : 'text/plain',
            schema     : randomSchema
          },
          dataStream: new Blob(['Hello, 1'])
        });
        expect(record1.reply.status.code).to.equal(202);

        const record2 = await testHarness.agent.processDwnRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat : 'text/plain',
            schema     : randomSchema
          },
          dataStream: new Blob(['Hello, 2'])
        });
        expect(record2.reply.status.code).to.equal(202);

        // confirm that no records exist remotely
        let remoteQueryResponse = await testHarness.agent.sendDwnRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.MessagesQuery,
          messageParams : {
            filters: [] // get all messages
          }
        });
        let remoteDwnQueryEntries = remoteQueryResponse.reply.entries!;
        expect(remoteDwnQueryEntries.length).to.equal(0);

        // spy on getDwnMessage that retrieves the message from the local DWN
        const getDwnMessageSpy = sinon.spy(syncEngine as any, 'getDwnMessage');

        // spy on sendDwnRequest to the remote DWN
        const sendDwnRequestSpy = sinon.spy(testHarness.agent.rpc, 'sendDwnRequest');

        // stub getDwnEventLog to return the messageCids of the records as well as the invalid one
        sinon.stub(syncEngine as any, 'getDwnEventLog').resolves([
          record1.messageCid,
          invalidRecord.messageCid, // this record will fail to be retrieved
          record2.messageCid
        ]);

        // Register Alice's DID to be synchronized.
        await testHarness.agent.sync.registerIdentity({
          did: alice.did.uri
        });

        // Execute Sync to pull all records from Alice's remote DWNs
        await syncEngine.push();

        // verify that sendDwnRequest was called once only for each valid record
        // and getDwnMessage was called for each record, including the invalid record
        expect(sendDwnRequestSpy.callCount).to.equal(2);
        expect(getDwnMessageSpy.callCount).to.equal(3);

        // confirm that the two valid records exist remotely
        remoteQueryResponse = await testHarness.agent.sendDwnRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.MessagesQuery,
          messageParams : {
            filters: [] // get all messages
          }
        });
        remoteDwnQueryEntries = remoteQueryResponse.reply.entries!;
        expect(remoteDwnQueryEntries.length).to.equal(2);
        expect(remoteDwnQueryEntries).to.have.members([
          record1.messageCid,
          record2.messageCid
        ]);
      });

      it('silently ignores a messageCid that already exists on the remote DWN', async () => {
        // It's important to create a new DID here to avoid conflicts with the previous test on the remote DWN,
        // since we are not clearing the remote DWN's storage before each test.
        const name = cryptoUtils.randomUuid();
        const alice = await testHarness.createIdentity({ name, testDwnUrls });

        // Register Alice's DID to be synchronized.
        await testHarness.agent.sync.registerIdentity({
          did: alice.did.uri
        });

        // scenario: The messageCids returned from the local eventLog contains a Cid that already exists in the remote DWN.
        //           During sync, the remote DWN will return a conflict 409 status code and the sync should continue
        //           NOTE: if the messageCid is a delete message and it is already deleted,
        //           the remote DWN will return a 404 status code and the sync should continue

        // create a record, store it and send it to the remote Dwn
        const remoteAndLocalRecord = await testHarness.agent.processDwnRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat : 'text/plain',
            schema     : randomSchema
          },
          dataStream: new Blob(['Hello, remote!'])
        });

        // send record to remote
        await testHarness.agent.sendDwnRequest({
          author      : alice.did.uri,
          target      : alice.did.uri,
          messageType : DwnInterface.RecordsWrite,
          messageCid  : remoteAndLocalRecord.messageCid,
        });

        // delete the record both locally and remotely
        const deleteMessage = await testHarness.agent.processDwnRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsDelete,
          messageParams : {
            recordId: remoteAndLocalRecord.message!.recordId
          }
        });
        // send the delete to the remote
        await testHarness.agent.sendDwnRequest({
          author      : alice.did.uri,
          target      : alice.did.uri,
          messageType : DwnInterface.RecordsDelete,
          messageCid  : deleteMessage.messageCid,
        });

        // create 2 records stored only locally to sync to the remote DWN
        const record1 = await testHarness.agent.processDwnRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat : 'text/plain',
            schema     : randomSchema
          },
          dataStream: new Blob(['Hello, 1'])
        });
        expect(record1.reply.status.code).to.equal(202);

        const record2 = await testHarness.agent.processDwnRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat : 'text/plain',
            schema     : randomSchema
          },
          dataStream: new Blob(['Hello, 2'])
        });
        expect(record2.reply.status.code).to.equal(202);

        // confirm that only record and it's delete exist remotely
        let remoteQueryResponse = await testHarness.agent.sendDwnRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.MessagesQuery,
          messageParams : {
            filters: [], // get all messages
          }
        });

        let remoteDwnQueryEntries = remoteQueryResponse.reply.entries!;
        expect(remoteDwnQueryEntries.length).to.equal(2);
        expect(remoteDwnQueryEntries).to.have.members([ remoteAndLocalRecord.messageCid, deleteMessage.messageCid ]);

        // stub getDwnEventLog to return the messageCids of the records we want to sync
        // we stub this to avoid syncing the registered identity related messages
        sinon.stub(syncEngine as any, 'getDwnEventLog').resolves([
          remoteAndLocalRecord.messageCid,
          deleteMessage.messageCid,
          record1.messageCid,
          record2.messageCid
        ]);

        // spy on sendDwnRequest to the remote DWN
        const sendDwnRequestSpy = sinon.spy(testHarness.agent.rpc, 'sendDwnRequest');

        // Execute Sync to push records to Alice's remote node
        await syncEngine.push();

        // Verify sendDwnRequest was called once for each record including the ones that already exist remotely
        expect(sendDwnRequestSpy.callCount).to.equal(4);

        // Verify that the conflict response is returned for the record that already exists remotely
        expect((await sendDwnRequestSpy.firstCall.returnValue).status.code).to.equal(409);
        // Verify that the delete message returned a 404
        expect((await sendDwnRequestSpy.secondCall.returnValue).status.code).to.equal(404);

        // Verify that the other 2 records are successfully processed
        expect((await sendDwnRequestSpy.returnValues[2]).status.code).to.equal(202);
        expect((await sendDwnRequestSpy.returnValues[3]).status.code).to.equal(202);

        // confirm the new records exist remotely
        remoteQueryResponse = await testHarness.agent.sendDwnRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.MessagesQuery,
          messageParams : {
            filters: [], // get all messages
          },
        });
        remoteDwnQueryEntries = remoteQueryResponse.reply.entries!;
        expect(remoteDwnQueryEntries.length).to.equal(4);
        expect(remoteDwnQueryEntries).to.have.members([
          remoteAndLocalRecord.messageCid,
          deleteMessage.messageCid,
          record1.messageCid,
          record2.messageCid
        ]);
      });

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