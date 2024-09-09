import sinon from 'sinon';
import { expect } from 'chai';
import { CryptoUtils } from '@web5/crypto';
import { DwnConstant, DwnInterfaceName, DwnMethodName, Jws, Message, ProtocolDefinition, Time } from '@tbd54566975/dwn-sdk-js';

import type { BearerIdentity } from '../src/bearer-identity.js';

import { AgentSyncApi } from '../src/sync-api.js';
import { TestAgent } from './utils/test-agent.js';
import { DwnInterface } from '../src/types/dwn.js';
import { testDwnUrl } from './utils/test-config.js';
import { SyncEngineLevel } from '../src/sync-engine-level.js';
import { PlatformAgentTestHarness } from '../src/test-harness.js';
import { Convert } from '@web5/common';
import { AbstractLevel } from 'abstract-level';
import { SyncIdentityOptions } from '../src/index.js';

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
    sinon.restore();
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

  describe('generateSyncMessageParamsKey & parseSyncMessageParamsKey', () => {
    it('parses key into sync params', () => {
      const did = 'did:example:alice';
      const delegateDid = 'did:example:bob';
      const dwnUrl = 'https://dwn.example.com';
      const protocol = 'https://protocol.example.com';
      const watermark = '1234567890';
      const messageCid = 'abc123';

      const key = SyncEngineLevel['generateSyncMessageParamsKey']({
        did,
        delegateDid,
        dwnUrl,
        protocol,
        watermark,
        messageCid
      });

      const syncParams = SyncEngineLevel['parseSyncMessageParamsKey'](key);
      expect(syncParams.did).to.equal(did);
      expect(syncParams.delegateDid).to.equal(delegateDid);
      expect(syncParams.dwnUrl).to.equal(dwnUrl);
      expect(syncParams.protocol).to.equal(protocol);
      expect(syncParams.watermark).to.equal(watermark);
      expect(syncParams.messageCid).to.equal(messageCid);
    });

    it('returns undefined protocol if not present', () => {
      const did = 'did:example:alice';
      const delegateDid = 'did:example:bob';
      const dwnUrl = 'https://dwn.example.com';
      const watermark = '1234567890';
      const messageCid = 'abc123';

      const key = SyncEngineLevel['generateSyncMessageParamsKey']({
        did,
        delegateDid,
        dwnUrl,
        watermark,
        messageCid
      });

      const syncParams = SyncEngineLevel['parseSyncMessageParamsKey'](key);
      expect(syncParams.protocol).to.be.undefined;

      expect(syncParams.did).to.equal(did);
      expect(syncParams.delegateDid).to.equal(delegateDid);
      expect(syncParams.dwnUrl).to.equal(dwnUrl);
      expect(syncParams.watermark).to.equal(watermark);
      expect(syncParams.messageCid).to.equal(messageCid);
    });

    it('returns undefined delegateDid if not present', () => {
      const did = 'did:example:alice';
      const dwnUrl = 'https://dwn.example.com';
      const protocol = 'https://protocol.example.com';
      const watermark = '1234567890';
      const messageCid = 'abc123';

      const key = SyncEngineLevel['generateSyncMessageParamsKey']({
        did,
        dwnUrl,
        protocol,
        watermark,
        messageCid
      });

      const syncParams = SyncEngineLevel['parseSyncMessageParamsKey'](key);
      expect(syncParams.delegateDid).to.be.undefined;

      expect(syncParams.did).to.equal(did);
      expect(syncParams.dwnUrl).to.equal(dwnUrl);
      expect(syncParams.protocol).to.equal(protocol);
      expect(syncParams.watermark).to.equal(watermark);
      expect(syncParams.messageCid).to.equal(messageCid);
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
      randomSchema = CryptoUtils.randomUuid();

      sinon.restore();

      await syncEngine.clear();
      await testHarness.syncStore.clear();
      await testHarness.dwnDataStore.clear();
      await testHarness.dwnEventLog.clear();
      await testHarness.dwnMessageStore.clear();
      await testHarness.dwnResumableTaskStore.clear();
      await testHarness.agent.permissions.clear();
      testHarness.dwnStores.clear();
    });

    after(async () => {
      sinon.restore();
      await testHarness.clearStorage();
      await testHarness.closeStorage();
    });

    it('syncs multiple messages in both directions', async () => {
      // scenario:  Alice installs a protocol only on her local DWN and writes some messages associated with it
      //            Alice installs a protocol only on her remote DWN and writes some messages associated with it
      //            Alice registers her DID to be synchronized, and kicks off a sync
      //            The sync should complete and the same records should exist on both remote and local DWNs


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
        did: alice.did.uri,
      });

      // Execute Sync to pull all records from Alice's remote DWN to Alice's local DWN.
      await syncEngine.sync();

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

    describe('sync()', () => {
      it('syncs only specified direction, or if non specified syncs both directions', async () => {
        // spy on push and pull and stub their response
        const pushSpy = sinon.stub(syncEngine as any, 'push').resolves();
        const pullSpy = sinon.stub(syncEngine as any, 'pull').resolves();

        // Register Alice's DID to be synchronized.
        await testHarness.agent.sync.registerIdentity({
          did: alice.did.uri,
        });

        // Execute Sync to push and pull all records from Alice's remote DWN to Alice's local DWN.
        await syncEngine.sync();

        // Verify push and pull were called once
        expect(pushSpy.calledOnce).to.be.true;
        expect(pullSpy.calledOnce).to.be.true;


        // reset counts
        pushSpy.reset();
        pullSpy.reset();

        // Execute only push sync
        await syncEngine.sync('push');

        // Verify push was called once and pull was not called
        expect(pushSpy.calledOnce).to.be.true;
        expect(pullSpy.notCalled).to.be.true;

        // reset counts
        pushSpy.reset();
        pullSpy.reset();

        // Execute only pull sync
        await syncEngine.sync('pull');

        // Verify pull was called once and push was not called
        expect(pushSpy.notCalled).to.be.true;
        expect(pullSpy.calledOnce).to.be.true;
      });

      it('throws an error if the sync is currently already running', async () => {
        // Register Alice's DID to be synchronized.
        await testHarness.agent.sync.registerIdentity({
          did: alice.did.uri,
        });

        const clock = sinon.useFakeTimers({ shouldClearNativeTimers: true });
        sinon.stub(syncEngine as any, 'push').resolves();
        const pullSpy = sinon.stub(syncEngine as any, 'pull');
        pullSpy.returns(new Promise<void>((resolve) => {
          clock.setTimeout(() => {
            resolve();
          }, 90);
        }));

        // do not await
        syncEngine.sync();

        await clock.tickAsync(50);

        // do not block for subsequent syncs
        pullSpy.returns(Promise.resolve());
        try {
          await syncEngine.sync();
          expect.fail('Expected an error to be thrown');
        } catch(error:any) {
          expect(error.message).to.equal('SyncEngineLevel: Sync operation is already in progress.');
        }

        await clock.tickAsync(50);

        // no error thrown
        await syncEngine.sync();

        clock.restore();
      });
    });

    describe('pull()', () => {
      it('synchronizes records that have been updated', async () => {
        // Write a test record to Alice's remote DWN.
        let writeResponse1 = await testHarness.agent.dwn.sendRequest({
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
        const testRecordId = writeResponse1.message!.recordId;

        // const update the record
        let updateResponse = await testHarness.agent.dwn.sendRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            recordId    : testRecordId,
            dataFormat  : 'text/plain',
            schema      : randomSchema,
            dateCreated : writeResponse1.message!.descriptor.dateCreated
          },
          dataStream: new Blob(['Hello, world updated!'])
        });
        expect(updateResponse.reply.status.code).to.equal(202);
        expect(updateResponse.message!.recordId).to.equal(testRecordId);

        const updateMessageCid = updateResponse.messageCid;

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
          did: alice.did.uri,
        });

        // Execute Sync to pull all records from Alice's remote DWN to Alice's local DWN.
        await syncEngine.sync('pull');

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

        // remove `initialWrite` from the response to generate an accurate messageCid
        const { initialWrite, ...rawMessage } = localDwnQueryReply.entries![0];
        const queriedMessageCid = await Message.getCid(rawMessage);
        expect(queriedMessageCid).to.equal(updateMessageCid);
      });

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
          did: alice.did.uri,
        });

        // Execute Sync to pull all records from Alice's remote DWNs
        await syncEngine.sync('pull');

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
          did: alice.did.uri,
        });

        // spy on sendDwnRequest to the remote DWN
        const sendDwnRequestSpy = sinon.spy(testHarness.agent.rpc, 'sendDwnRequest');
        const processMessageSpy = sinon.spy(testHarness.agent.dwn.node, 'processMessage');

        // Execute Sync to push records to Alice's remote node
        await syncEngine.sync('pull');

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

        await syncEngine.sync('pull');

        // Verify DID resolution and DWN requests did not occur.
        expect(didResolveSpy.notCalled).to.be.true;
        expect(sendDwnRequestSpy.notCalled).to.be.true;

        didResolveSpy.restore();
        sendDwnRequestSpy.restore();
      });

      it('logs an error if could not fetch MessagesQuery permission needed for a sync', async () => {
        // create new identity to not conflict the previous tests's remote records
        const aliceSync = await testHarness.createIdentity({ name: 'Alice', testDwnUrls });

        const delegateDid = await testHarness.agent.identity.create({
          store     : true,
          didMethod : 'jwk',
          metadata  : { name: 'Alice Delegate', connectedDid: aliceSync.did.uri }
        });

        await testHarness.agent.sync.registerIdentity({
          did     : aliceSync.did.uri,
          options : {
            delegateDid : delegateDid.did.uri,
            protocols   : [ 'https://protocol.xyz/foo' ]
          }
        });

        // spy on console.error to check if the error message is logged
        const consoleErrorSpy = sinon.stub(console, 'error').resolves();

        await syncEngine.sync('pull');
        expect(consoleErrorSpy.called).to.be.true;
        expect(consoleErrorSpy.args[0][0]).to.include('SyncEngineLevel: Error fetching MessagesQuery permission grant for delegate DID');
      });

      it('logs an error if could not fetch MessagesRead permission needed for a sync', async () => {
        // create new identity to not conflict the previous tests's remote records
        const aliceSync = await testHarness.createIdentity({ name: 'Alice', testDwnUrls });

        // create 3 local protocols
        const protocolFoo: ProtocolDefinition = {
          published : true,
          protocol  : 'https://protocol.xyz/foo',
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

        // install a protocol on the remote node for aliceSync
        const protocolsFoo = await testHarness.agent.sendDwnRequest({
          author        : aliceSync.did.uri,
          target        : aliceSync.did.uri,
          messageType   : DwnInterface.ProtocolsConfigure,
          messageParams : {
            definition: protocolFoo
          }
        });
        expect(protocolsFoo.reply.status.code).to.equal(202);


        // create a record that will be read as a part of sync
        const record1 = await testHarness.agent.sendDwnRequest({
          author        : aliceSync.did.uri,
          target        : aliceSync.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            protocol     : 'https://protocol.xyz/foo',
            protocolPath : 'foo',
            schema       : 'https://schemas.xyz/foo',
            dataFormat   : 'text/plain',
          },
          dataStream: new Blob(['Hello, world!'])
        });
        expect(record1.reply.status.code).to.equal(202);


        const delegateDid = await testHarness.agent.identity.create({
          store     : true,
          didMethod : 'jwk',
          metadata  : { name: 'Alice Delegate', connectedDid: aliceSync.did.uri }
        });

        // write a MessagesQuery permission grant for the delegate DID
        const messagesQueryGrant = await testHarness.agent.permissions.createGrant({
          store       : true,
          author      : aliceSync.did.uri,
          grantedTo   : delegateDid.did.uri,
          dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
          scope       : {
            interface : DwnInterfaceName.Messages,
            method    : DwnMethodName.Query,
            protocol  : 'https://protocol.xyz/foo'
          }
        });

        const { encodedData: messagesQueryGrantData, ...messagesQueryGrantMessage } = messagesQueryGrant.message;
        // send to the remote node
        const sendGrant = await testHarness.agent.sendDwnRequest({
          author      : aliceSync.did.uri,
          target      : aliceSync.did.uri,
          messageType : DwnInterface.RecordsWrite,
          rawMessage  : messagesQueryGrantMessage,
          dataStream  : new Blob([ Convert.base64Url(messagesQueryGrantData).toUint8Array() ]),
        });
        expect(sendGrant.reply.status.code).to.equal(202);

        // store it as the delegate DID so that it can be fetched during sync
        const processGrant = await testHarness.agent.processDwnRequest({
          author      : delegateDid.did.uri,
          target      : delegateDid.did.uri,
          messageType : DwnInterface.RecordsWrite,
          rawMessage  : messagesQueryGrantMessage,
          dataStream  : new Blob([ Convert.base64Url(messagesQueryGrantData).toUint8Array() ]),
          signAsOwner : true
        });
        expect(processGrant.reply.status.code).to.equal(202);

        await testHarness.agent.sync.registerIdentity({
          did     : aliceSync.did.uri,
          options : {
            delegateDid : delegateDid.did.uri,
            protocols   : [ 'https://protocol.xyz/foo' ]
          }
        });

        // spy on console.error to check if the error message is logged
        const consoleErrorSpy = sinon.stub(console, 'error').resolves();

        await syncEngine.sync('pull');
        expect(consoleErrorSpy.called).to.be.true;
        expect(consoleErrorSpy.args[0][0]).to.include('SyncEngineLevel: pull - Error fetching MessagesRead permission grant for delegate DID');
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
          did: alice.did.uri,
        });

        // Execute Sync to pull all records from Alice's remote DWN to Alice's local DWN.
        await syncEngine.sync('pull');

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

        await syncEngine.sync('pull');

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
          did: alice.did.uri,
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
        await syncEngine.sync('pull');

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
          did: alice.did.uri,
        });

        // Register Bob's DID to be synchronized.
        await testHarness.agent.sync.registerIdentity({
          did: bob.did.uri,
        });

        // Execute Sync to pull all records from Alice's and Bob's remove DWNs to their local DWNs.
        await syncEngine.sync('pull');

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
      it('synchronizes records that have been updated', async () => {
        // Write a test record to Alice's local DWN.
        let writeResponse1 = await testHarness.agent.dwn.processRequest({
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
        const testRecordId = writeResponse1.message!.recordId;

        // const update the record
        let updateResponse = await testHarness.agent.dwn.processRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            recordId    : testRecordId,
            dataFormat  : 'text/plain',
            schema      : randomSchema,
            dateCreated : writeResponse1.message!.descriptor.dateCreated
          },
          dataStream: new Blob(['Hello, world updated!'])
        });
        expect(updateResponse.reply.status.code).to.equal(202);
        expect(updateResponse.message!.recordId).to.equal(testRecordId);

        const updateMessageCid = updateResponse.messageCid;

        // Confirm the record does NOT exist on Alice's remote DWN.
        let queryResponse = await testHarness.agent.dwn.sendRequest({
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
        let remoteDwnQueryReply = queryResponse.reply;
        expect(remoteDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
        expect(remoteDwnQueryReply.entries).to.have.length(0); // Record doesn't exist on local DWN.

        // Register Alice's DID to be synchronized.
        await testHarness.agent.sync.registerIdentity({
          did: alice.did.uri,
        });

        // Execute Sync to pull all records from Alice's remote DWN to Alice's local DWN.
        await syncEngine.sync('push');

        // Confirm the record now DOES exist on Alice's local DWN.
        queryResponse = await testHarness.agent.dwn.sendRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : { filter: { recordId: testRecordId } }
        });
        remoteDwnQueryReply = queryResponse.reply;
        expect(remoteDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
        expect(remoteDwnQueryReply.entries).to.have.length(1); // Record does exist on local DWN.

        // remove `initialWrite` from the response to generate an accurate messageCid
        const { initialWrite, ...rawMessage } = remoteDwnQueryReply.entries![0];
        const queriedMessageCid = await Message.getCid(rawMessage);
        expect(queriedMessageCid).to.equal(updateMessageCid);
      });

      it('silently ignores a messageCid from the eventLog that does not exist on the local DWN', async () => {
        // It's important to create a new DID here to avoid conflicts with the previous test on the remote DWN,
        // since we are not clearing the remote DWN's storage before each test.
        const name = CryptoUtils.randomUuid();
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
          did: alice.did.uri,
        });

        // Execute Sync to pull all records from Alice's remote DWNs
        await syncEngine.sync('push');

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
        const name = CryptoUtils.randomUuid();
        const alice = await testHarness.createIdentity({ name, testDwnUrls });

        // Register Alice's DID to be synchronized.
        await testHarness.agent.sync.registerIdentity({
          did: alice.did.uri,
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
        await syncEngine.sync('push');

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

        await syncEngine.sync('push');

        // Verify DID resolution and DWN requests did not occur.
        expect(didResolveSpy.notCalled).to.be.true;
        expect(processRequestSpy.notCalled).to.be.true;

        didResolveSpy.restore();
        processRequestSpy.restore();
      });

      it('logs an error if could not fetch MessagesQuery permission needed for a sync', async () => {
        // create new identity to not conflict the previous tests's remote records
        const aliceSync = await testHarness.createIdentity({ name: 'Alice', testDwnUrls });

        const delegateDid = await testHarness.agent.identity.create({
          store     : true,
          didMethod : 'jwk',
          metadata  : { name: 'Alice Delegate', connectedDid: aliceSync.did.uri }
        });

        await testHarness.agent.sync.registerIdentity({
          did     : aliceSync.did.uri,
          options : {
            delegateDid : delegateDid.did.uri,
            protocols   : [ 'https://protocol.xyz/foo' ]
          }
        });

        // spy on console.error to check if the error message is logged
        const consoleErrorSpy = sinon.stub(console, 'error').resolves();

        await syncEngine.sync('push');
        expect(consoleErrorSpy.called).to.be.true;
        expect(consoleErrorSpy.args[0][0]).to.include('SyncEngineLevel: Error fetching MessagesQuery permission grant for delegate DID');
      });

      it('logs an error if could not fetch MessagesRead permission needed for a sync', async () => {
        // create new identity to not conflict the previous tests's remote records
        const aliceSync = await testHarness.createIdentity({ name: 'Alice', testDwnUrls });

        // create 3 local protocols
        const protocolFoo: ProtocolDefinition = {
          published : true,
          protocol  : 'https://protocol.xyz/foo',
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

        // install a protocol on the local node for aliceSync
        const protocolsFoo = await testHarness.agent.processDwnRequest({
          author        : aliceSync.did.uri,
          target        : aliceSync.did.uri,
          messageType   : DwnInterface.ProtocolsConfigure,
          messageParams : {
            definition: protocolFoo
          }
        });
        expect(protocolsFoo.reply.status.code).to.equal(202);


        // create a record that will be read as a part of sync
        const record1 = await testHarness.agent.processDwnRequest({
          author        : aliceSync.did.uri,
          target        : aliceSync.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            protocol     : 'https://protocol.xyz/foo',
            protocolPath : 'foo',
            schema       : 'https://schemas.xyz/foo',
            dataFormat   : 'text/plain',
          },
          dataStream: new Blob(['Hello, world!'])
        });
        expect(record1.reply.status.code).to.equal(202);


        const delegateDid = await testHarness.agent.identity.create({
          store     : true,
          didMethod : 'jwk',
          metadata  : { name: 'Alice Delegate', connectedDid: aliceSync.did.uri }
        });

        // write a MessagesQuery permission grant for the delegate DID
        const messagesQueryGrant = await testHarness.agent.permissions.createGrant({
          store       : true,
          author      : aliceSync.did.uri,
          grantedTo   : delegateDid.did.uri,
          dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
          scope       : {
            interface : DwnInterfaceName.Messages,
            method    : DwnMethodName.Query,
            protocol  : 'https://protocol.xyz/foo'
          }
        });

        // store it as the delegate DID so that it can be fetched during sync
        const { encodedData: messagesQueryGrantData, ...messagesQueryGrantMessage } = messagesQueryGrant.message;
        const processGrant = await testHarness.agent.processDwnRequest({
          author      : delegateDid.did.uri,
          target      : delegateDid.did.uri,
          messageType : DwnInterface.RecordsWrite,
          rawMessage  : messagesQueryGrantMessage,
          dataStream  : new Blob([ Convert.base64Url(messagesQueryGrantData).toUint8Array() ]),
          signAsOwner : true
        });
        expect(processGrant.reply.status.code).to.equal(202);

        await testHarness.agent.sync.registerIdentity({
          did     : aliceSync.did.uri,
          options : {
            delegateDid : delegateDid.did.uri,
            protocols   : [ 'https://protocol.xyz/foo' ]
          }
        });

        // spy on console.error to check if the error message is logged
        const consoleErrorSpy = sinon.stub(console, 'error').resolves();

        await syncEngine.sync('push');
        expect(consoleErrorSpy.called).to.be.true;
        expect(consoleErrorSpy.args[0][0]).to.include('SyncEngineLevel: push - Error fetching MessagesRead permission grant for delegate DID');
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
          did: alice.did.uri,
        });

        // Execute Sync to push all records from Alice's local DWN to Alice's remote DWN.
        await syncEngine.sync('push');

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

        await syncEngine.sync('push');

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
          did: alice.did.uri,
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
        await syncEngine.sync('push');

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
          did: alice.did.uri,
        });

        // Register Bob's DID to be synchronized.
        await testHarness.agent.sync.registerIdentity({
          did: bob.did.uri,
        });

        // Execute Sync to push all records from Alice's and Bob's local DWNs to their remote DWNs.
        await syncEngine.sync('push');

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
      it('calls pull() and push() in each interval', async () => {
        await testHarness.agent.sync.registerIdentity({
          did: alice.did.uri,
        });

        const pullSpy = sinon.stub(SyncEngineLevel.prototype as any, 'pull');
        pullSpy.resolves();

        const pushSpy = sinon.stub(SyncEngineLevel.prototype as any, 'push');
        pushSpy.resolves();

        const clock = sinon.useFakeTimers({ shouldClearNativeTimers: true });

        testHarness.agent.sync.startSync({ interval: '500ms' });

        await clock.tickAsync(1_400); // just under 3 intervals
        pullSpy.restore();
        pushSpy.restore();
        clock.restore();

        // one when starting the sync, and another for each interval
        expect(pullSpy.callCount).to.equal(3, 'push');
        expect(pushSpy.callCount).to.equal(3, 'pull');
      });

      it('does not call sync() again until a sync round finishes', async () => {
        await testHarness.agent.sync.registerIdentity({
          did: alice.did.uri,
        });

        const clock = sinon.useFakeTimers({ shouldClearNativeTimers: true });

        const pullSpy = sinon.stub(SyncEngineLevel.prototype as any, 'pull');
        pullSpy.returns(new Promise<void>((resolve) => {
          clock.setTimeout(() => {
            resolve();
          }, 1_500); // more than the interval
        }));

        const pushSpy = sinon.stub(SyncEngineLevel.prototype as any, 'push');
        pushSpy.resolves();

        testHarness.agent.sync.startSync({ interval: '500ms' });

        await clock.tickAsync(1_400); // less time than the push

        // only once for when starting the sync
        expect(pullSpy.callCount).to.equal(1, 'pull');
        expect(pullSpy.callCount).to.equal(1, 'push');

        await clock.tickAsync(200); //remaining time and one interval

        // once when starting, and once for the interval
        expect(pullSpy.callCount).to.equal(2, 'pull');
        expect(pushSpy.callCount).to.equal(2, 'push');

        await clock.tickAsync(500); // one more interval

        // one more for the interval
        expect(pullSpy.callCount).to.equal(3, 'pull');
        expect(pushSpy.callCount).to.equal(3, 'push');

        pullSpy.restore();
        pushSpy.restore();
        clock.restore();
      });

      it('calls sync once per interval with the latest interval timer being respected', async () => {
        await testHarness.agent.sync.registerIdentity({
          did: alice.did.uri,
        });

        const clock = sinon.useFakeTimers({ shouldClearNativeTimers: true });

        const syncSpy = sinon.stub(SyncEngineLevel.prototype as any, 'sync');
        // set to be a sync time longer than the interval
        syncSpy.returns(new Promise<void>((resolve) => {
          clock.setTimeout(() => {
            resolve();
          }, 1_000);
        }));

        testHarness.agent.sync.startSync({ interval: '500ms' });

        await clock.tickAsync(1_400); // less than the initial interval + the sync time

        // once for the initial call and once for each interval call
        expect(syncSpy.callCount).to.equal(2);

        // set to be a short sync time
        syncSpy.returns(new Promise<void>((resolve) => {
          clock.setTimeout(() => {
            resolve();
          }, 15);
        }));

        testHarness.agent.sync.startSync({ interval: '300ms' });

        await clock.tickAsync(301); // exactly the new interval + 1

        // one for the initial 'startSync' call and one for each interval call
        expect(syncSpy.callCount).to.equal(4);


        await clock.tickAsync(601); // two more intervals

        expect(syncSpy.callCount).to.equal(6);

        syncSpy.restore();
        clock.restore();
      });

      it('should replace the interval timer with the latest interval timer', async () => {

        await testHarness.agent.sync.registerIdentity({
          did: alice.did.uri,
        });

        const clock = sinon.useFakeTimers({ shouldClearNativeTimers: true });

        const syncSpy = sinon.stub(SyncEngineLevel.prototype as any, 'sync');
        // set to be a sync time longer than the interval
        syncSpy.returns(new Promise<void>((resolve) => {
          clock.setTimeout(() => {
            resolve();
          }, 100);
        }));

        testHarness.agent.sync.startSync({ interval: '500ms' });

        // two intervals
        await clock.tickAsync(1_001);

        // this should equal 3, once for the initial call and once for each interval call
        expect(syncSpy.callCount).to.equal(3);

        syncSpy.resetHistory();
        testHarness.agent.sync.startSync({ interval: '200ms' });

        await clock.tickAsync(401); // two intervals

        // one for the initial 'startSync' call and one for each interval call
        expect(syncSpy.callCount).to.equal(3);

        await clock.tickAsync(401); // two more intervals

        // one additional calls for each interval
        expect(syncSpy.callCount).to.equal(5);

        syncSpy.restore();
        clock.restore();
      });
    });

    describe('stopSync()', () => {
      it('stops the sync interval', async () => {
        await testHarness.agent.sync.registerIdentity({
          did: alice.did.uri,
        });

        const clock = sinon.useFakeTimers({ shouldClearNativeTimers: true });

        const syncSpy = sinon.spy(SyncEngineLevel.prototype as any, 'sync');

        // stub push and pull to take 3 ms each
        const pullStub = sinon.stub(SyncEngineLevel.prototype as any, 'pull');
        pullStub.returns(new Promise<void>((resolve) => {
          clock.setTimeout(() => {
            resolve();
          }, 3);
        }));

        const pushStub = sinon.stub(SyncEngineLevel.prototype as any, 'push');
        pushStub.returns(new Promise<void>((resolve) => {
          clock.setTimeout(() => {
            resolve();
          }, 3);
        }));

        testHarness.agent.sync.startSync({ interval: '500ms' });

        // expect the immediate sync call
        expect(syncSpy.callCount).to.equal(1);


        await clock.tickAsync(1_300); // just under 3 intervals

        // expect 2 sync interval calls + initial sync
        expect(syncSpy.callCount).to.equal(3);

        await testHarness.agent.sync.stopSync();

        await clock.tickAsync(1_000); // 2 intervals

        // sync calls remain unchanged
        expect(syncSpy.callCount).to.equal(3);

        syncSpy.restore();
        clock.restore();
      });

      it('waits for the current sync to complete before stopping', async () => {
        await testHarness.agent.sync.registerIdentity({
          did: alice.did.uri,
        });

        const clock = sinon.useFakeTimers({ shouldClearNativeTimers: true });

        const syncSpy = sinon.spy(SyncEngineLevel.prototype as any, 'sync');

        // stub push and pull to take 3 ms each
        const pullStub = sinon.stub(SyncEngineLevel.prototype as any, 'pull');
        pullStub.returns(new Promise<void>((resolve) => {
          clock.setTimeout(() => {
            resolve();
          }, 3);
        }));

        const pushStub = sinon.stub(SyncEngineLevel.prototype as any, 'push');
        pushStub.returns(new Promise<void>((resolve) => {
          clock.setTimeout(() => {
            resolve();
          }, 3);
        }));

        testHarness.agent.sync.startSync({ interval: '500ms' });

        // expect the immediate sync call
        expect(syncSpy.callCount).to.equal(1);

        await clock.tickAsync(1_300); // just under 3 intervals

        // expect 2 sync interval calls + initial sync
        expect(syncSpy.callCount).to.equal(3);

        // cause pull to take longer
        pullStub.returns(new Promise<void>((resolve) => {
          clock.setTimeout(() => {
            resolve();
          }, 1_000);
        }));

        await clock.tickAsync(201); // Enough time for the next interval to start

        // next interval was called
        expect(syncSpy.callCount).to.equal(4);

        // stop the sync
        await new Promise<void>((resolve) => {
          const stopPromise = testHarness.agent.sync.stopSync();
          clock.tickAsync(1_000).then(async () => {
            await stopPromise;
            resolve();
          });
        });

        // sync calls remain unchanged
        expect(syncSpy.callCount).to.equal(4);

        // wait for future intervals
        await clock.tickAsync(2_000);

        // sync calls remain unchanged
        expect(syncSpy.callCount).to.equal(4);

        syncSpy.restore();
        clock.restore();
      });

      it('throws if ongoing sync does not complete within 2 seconds', async () => {
        await testHarness.agent.sync.registerIdentity({
          did: alice.did.uri,
        });

        const clock = sinon.useFakeTimers({ shouldClearNativeTimers: true });

        const syncSpy = sinon.spy(SyncEngineLevel.prototype as any, 'sync');

        // stub push and pull to take 3 ms each
        const pullStub = sinon.stub(SyncEngineLevel.prototype as any, 'pull');
        pullStub.returns(new Promise<void>((resolve) => {
          clock.setTimeout(() => {
            resolve();
          }, 3);
        }));

        const pushStub = sinon.stub(SyncEngineLevel.prototype as any, 'push');
        pushStub.returns(new Promise<void>((resolve) => {
          clock.setTimeout(() => {
            resolve();
          }, 3);
        }));

        testHarness.agent.sync.startSync({ interval: '500ms' });

        // expect the immediate sync call
        expect(syncSpy.callCount).to.equal(1);

        await clock.tickAsync(1_300); // just under 3 intervals

        // expect 2 sync interval calls + initial sync
        expect(syncSpy.callCount).to.equal(3);

        // cause pull to take longer
        pullStub.returns(new Promise<void>((resolve) => {
          clock.setTimeout(() => {
            resolve();
          }, 2_700); // longer than the 2 seconds
        }));

        await clock.tickAsync(201); // Enough time for the next interval to start

        // next interval was called
        expect(syncSpy.callCount).to.equal(4);

        const stopPromise = testHarness.agent.sync.stopSync();

        try {
          await new Promise<void>((resolve, reject) => {
            stopPromise.catch((error) => reject(error));

            clock.runToLastAsync().then(async () => {
              try {
                await stopPromise;
                resolve();
              } catch(error) {
                reject(error);
              }
            });

          });
          expect.fail('Expected an error to be thrown');
        } catch(error:any) {
          expect(error.message).to.equal('SyncEngineLevel: Existing sync operation did not complete within 2000 milliseconds.');
        }

        syncSpy.restore();
        clock.restore();
      });

      it('only waits for the ongoing sync for the given timeout before failing', async () => {
        await testHarness.agent.sync.registerIdentity({
          did: alice.did.uri,
        });

        const clock = sinon.useFakeTimers({ shouldClearNativeTimers: true });

        const syncSpy = sinon.spy(SyncEngineLevel.prototype as any, 'sync');

        // stub push and pull to take 3 ms each
        const pullStub = sinon.stub(SyncEngineLevel.prototype as any, 'pull');
        pullStub.returns(new Promise<void>((resolve) => {
          clock.setTimeout(() => {
            resolve();
          }, 3);
        }));

        const pushStub = sinon.stub(SyncEngineLevel.prototype as any, 'push');
        pushStub.returns(new Promise<void>((resolve) => {
          clock.setTimeout(() => {
            resolve();
          }, 3);
        }));

        testHarness.agent.sync.startSync({ interval: '500ms' });

        // expect the immediate sync call
        expect(syncSpy.callCount).to.equal(1);

        await clock.tickAsync(10); // enough time for the sync round trip to complete

        // cause pull to take longer
        pullStub.returns(new Promise<void>((resolve) => {
          clock.setTimeout(() => {
            resolve();
          }, 2_700); // longer than the 2 seconds
        }));

        await clock.tickAsync(501); // Enough time for the next interval to start

        // next interval was called
        expect(syncSpy.callCount).to.equal(2);

        const stopPromise = testHarness.agent.sync.stopSync(10);
        try {
          await new Promise<void>((resolve, reject) => {
            stopPromise.catch((error) => reject(error));

            clock.tickAsync(10).then(async () => {
              try {
                await stopPromise;
                resolve();
              } catch(error) {
                reject(error);
              }
            });

          });
          expect.fail('Expected an error to be thrown');
        } catch(error:any) {
          expect(error.message).to.equal('SyncEngineLevel: Existing sync operation did not complete within 10 milliseconds.');
        }

        // call again with a longer timeout
        await new Promise<void>((resolve) => {
          const stopPromise2 = testHarness.agent.sync.stopSync(3_000);
          // enough time for the ongoing sync to complete + 100ms as the check interval
          clock.tickAsync(2800).then(async () => {
            stopPromise2.then(() => resolve());
          });
        });

        await clock.runToLastAsync();
        syncSpy.restore();
        clock.restore();
      });

    });

    describe('Identity Registration', () => {
      it('registers an identity with the sync engine', async () => {
        const did = alice.did.uri;
        const syncOption: SyncIdentityOptions = {
          protocols: ['https://protocol.xyz/foo', 'https://protocol.xyz/bar', 'https://protocol.xyz/baz']
        };
        await testHarness.agent.sync.registerIdentity({ did, options: syncOption });

        const identityOptions = await testHarness.agent.sync.getIdentityOptions(did);
        expect(identityOptions).to.deep.equal(syncOption);
      });

      it('throws if attempting to register an identity that is already registered', async () => {
        const did = alice.did.uri;
        const syncOption: SyncIdentityOptions = {
          protocols: ['https://protocol.xyz/foo', 'https://protocol.xyz/bar', 'https://protocol.xyz/baz']
        };
        await testHarness.agent.sync.registerIdentity({ did, options: syncOption });

        try {
          await testHarness.agent.sync.registerIdentity({ did, options: syncOption });
          expect.fail('Expected an error to be thrown');
        } catch(error:any) {
          expect(error.message).to.equal(`SyncEngineLevel: Identity with DID ${did} is already registered.`);
        }
      });

      it('unregisters an identity from the sync engine', async () => {
        const did = alice.did.uri;
        const syncOption: SyncIdentityOptions = {
          protocols: ['https://protocol.xyz/foo', 'https://protocol.xyz/bar', 'https://protocol.xyz/baz']
        };
        await testHarness.agent.sync.registerIdentity({ did, options: syncOption });

        // sanity confirm that the identity is registered
        let identityOptions = await testHarness.agent.sync.getIdentityOptions(did);
        expect(identityOptions).to.deep.equal(syncOption);

        await testHarness.agent.sync.unregisterIdentity(did);

        identityOptions = await testHarness.agent.sync.getIdentityOptions(did);
        expect(identityOptions).to.be.undefined;
      });

      it('throws when attempting to unregister an identity that is not registered', async () => {
        const did = alice.did.uri;
        try {
          await testHarness.agent.sync.unregisterIdentity(did);
          expect.fail('Expected an error to be thrown');
        } catch(error:any) {
          expect(error.message).to.equal(`SyncEngineLevel: Identity with DID ${did} is not registered.`);
        }
      });

      it('gets the sync options for a specific identity', async () => {
        const did = alice.did.uri;
        const syncOption: SyncIdentityOptions = {
          protocols: ['https://protocol.xyz/foo', 'https://protocol.xyz/bar', 'https://protocol.xyz/baz']
        };
        await testHarness.agent.sync.registerIdentity({ did, options: syncOption });

        const identityOptions = await testHarness.agent.sync.getIdentityOptions(did);
        expect(identityOptions).to.deep.equal(syncOption);
      });

      it('throws if underlying DB throws an error when getting identity options', async () => {
        // stub the sublevel get method to throw an error
        const stubbedSublevel = {
          get: (_key:string) => { throw { code: 'DB_ERROR' }; }
        };
        sinon.stub(syncEngine['_db'], 'sublevel').withArgs('registeredIdentities').returns(stubbedSublevel as any);

        try {
          await testHarness.agent.sync.getIdentityOptions('did:example:123');
          expect.fail('Expected an error to be thrown');
        } catch(error:any) {
          expect(error.message).to.equal('SyncEngineLevel: Error reading level: DB_ERROR.');
        }
      });

      it('updates the sync options for a specific identity', async () => {
        const did = alice.did.uri;
        const syncOption: SyncIdentityOptions = {
          protocols: ['https://protocol.xyz/foo', 'https://protocol.xyz/bar', 'https://protocol.xyz/baz']
        };
        await testHarness.agent.sync.registerIdentity({ did, options: syncOption });

        // sanity confirm that the identity is registered
        let identityOptions = await testHarness.agent.sync.getIdentityOptions(did);
        expect(identityOptions).to.deep.equal(syncOption);

        const updatedSyncOption: SyncIdentityOptions = {
          protocols: ['https://protocol.xyz/foo', 'https://protocol.xyz/bar']
        };
        await testHarness.agent.sync.updateIdentityOptions({ did, options: updatedSyncOption });

        identityOptions = await testHarness.agent.sync.getIdentityOptions(did);
        expect(identityOptions).to.deep.equal(updatedSyncOption);
      });

      it('throws if attempting to update an identity that is not registered', async () => {
        const did = alice.did.uri;
        const syncOption: SyncIdentityOptions = {
          protocols: ['https://protocol.xyz/foo', 'https://protocol.xyz/bar', 'https://protocol.xyz/baz']
        };

        try {
          await testHarness.agent.sync.updateIdentityOptions({ did, options: syncOption });
          expect.fail('Expected an error to be thrown');
        } catch(error:any) {
          expect(error.message).to.equal(`SyncEngineLevel: Identity with DID ${did} is not registered.`);
        }
      });

      it('syncs only specified protocols', async () => {
        // create new identity to not conflict the previous tests's remote records
        const aliceSync = await testHarness.createIdentity({ name: 'Alice', testDwnUrls });

        // create 3 local protocols
        const protocolFoo: ProtocolDefinition = {
          published : true,
          protocol  : 'https://protocol.xyz/foo',
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

        const protocolBar: ProtocolDefinition = {
          published : true,
          protocol  : 'https://protocol.xyz/bar',
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

        const protocolBaz: ProtocolDefinition = {
          published : true,
          protocol  : 'https://protocol.xyz/baz',
          types     : {
            baz: {
              schema      : 'https://schemas.xyz/baz',
              dataFormats : ['text/plain', 'application/json']
            }
          },
          structure: {
            baz: {}
          }
        };

        const protocolsFoo = await testHarness.agent.processDwnRequest({
          author        : aliceSync.did.uri,
          target        : aliceSync.did.uri,
          messageType   : DwnInterface.ProtocolsConfigure,
          messageParams : {
            definition: protocolFoo
          }
        });
        expect(protocolsFoo.reply.status.code).to.equal(202);

        const protocolsBar = await testHarness.agent.processDwnRequest({
          author        : aliceSync.did.uri,
          target        : aliceSync.did.uri,
          messageType   : DwnInterface.ProtocolsConfigure,
          messageParams : {
            definition: protocolBar
          }
        });
        expect(protocolsBar.reply.status.code).to.equal(202);

        const protocolsBaz = await testHarness.agent.processDwnRequest({
          author        : aliceSync.did.uri,
          target        : aliceSync.did.uri,
          messageType   : DwnInterface.ProtocolsConfigure,
          messageParams : {
            definition: protocolBaz
          }
        });
        expect(protocolsBaz.reply.status.code).to.equal(202);

        // write a record for each protocol
        const recordFoo = await testHarness.agent.processDwnRequest({
          author        : aliceSync.did.uri,
          target        : aliceSync.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat   : 'text/plain',
            protocol     : protocolFoo.protocol,
            protocolPath : 'foo',
            schema       : protocolFoo.types.foo.schema
          },
          dataStream: new Blob(['Hello, foo!'])
        });
        expect(recordFoo.reply.status.code).to.equal(202);

        const recordBar = await testHarness.agent.processDwnRequest({
          author        : aliceSync.did.uri,
          target        : aliceSync.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat   : 'text/plain',
            protocol     : protocolBar.protocol,
            protocolPath : 'bar',
            schema       : protocolBar.types.bar.schema
          },
          dataStream: new Blob(['Hello, bar!'])
        });
        expect(recordBar.reply.status.code).to.equal(202);

        const recordBaz = await testHarness.agent.processDwnRequest({
          author        : aliceSync.did.uri,
          target        : aliceSync.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat   : 'text/plain',
            protocol     : protocolBaz.protocol,
            protocolPath : 'baz',
            schema       : protocolBaz.types.baz.schema
          },
          dataStream: new Blob(['Hello, baz!'])
        });
        expect(recordBaz.reply.status.code).to.equal(202);

        // Register Alice's DID to be synchronized with only foo and bar protocols
        await testHarness.agent.sync.registerIdentity({
          did     : aliceSync.did.uri,
          options : {
            protocols: [ 'https://protocol.xyz/foo', 'https://protocol.xyz/bar' ]
          }
        });

        // Execute Sync to push sync, only foo protocol should be synced
        await syncEngine.sync('push');

        // query remote to see foo protocol
        const remoteProtocolsQueryResponse = await testHarness.agent.dwn.sendRequest({
          author        : aliceSync.did.uri,
          target        : aliceSync.did.uri,
          messageType   : DwnInterface.ProtocolsQuery,
          messageParams : {}
        });
        const remoteProtocolsQueryReply = remoteProtocolsQueryResponse.reply;
        expect(remoteProtocolsQueryReply.status.code).to.equal(200);
        expect(remoteProtocolsQueryReply.entries?.length).to.equal(2);
        expect(remoteProtocolsQueryReply.entries).to.have.deep.equal([ protocolsFoo.message, protocolsBar.message ]);

        // query remote to see foo record
        let remoteFooRecordsResponse = await testHarness.agent.dwn.sendRequest({
          author        : aliceSync.did.uri,
          target        : aliceSync.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : {
            filter: {
              protocol: protocolFoo.protocol,
            }
          }
        });
        let remoteFooRecordsReply = remoteFooRecordsResponse.reply;
        expect(remoteFooRecordsReply.status.code).to.equal(200);
        expect(remoteFooRecordsReply.entries).to.have.length(1);
        let remoteFooRecordIds = remoteFooRecordsReply.entries?.map(entry => entry.recordId);
        expect(remoteFooRecordIds).to.have.members([ recordFoo.message!.recordId ]);

        // query remote to see bar record
        let remoteBarRecordsResponse = await testHarness.agent.dwn.sendRequest({
          author        : aliceSync.did.uri,
          target        : aliceSync.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : {
            filter: {
              protocol: protocolBar.protocol,
            }
          }
        });
        let remoteBarRecordsReply = remoteBarRecordsResponse.reply;
        expect(remoteBarRecordsReply.status.code).to.equal(200);
        expect(remoteBarRecordsReply.entries).to.have.length(1);
        let remoteBarRecordIds = remoteBarRecordsReply.entries?.map(entry => entry.recordId);
        expect(remoteBarRecordIds).to.have.members([ recordBar.message!.recordId ]);

        // query remote to see baz record, none should be returned
        let remoteBazRecordsResponse = await testHarness.agent.dwn.sendRequest({
          author        : aliceSync.did.uri,
          target        : aliceSync.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : {
            filter: {
              protocol: protocolBaz.protocol,
            }
          }
        });
        let remoteBazRecordsReply = remoteBazRecordsResponse.reply;
        expect(remoteBazRecordsReply.status.code).to.equal(200);
        expect(remoteBazRecordsReply.entries).to.have.length(0);


        // now write a foo record remotely, and a bar record locally
        // initiate a sync to both push and pull the records respectively

        // write a record to the remote for the foo protocol
        const recordFoo2 = await testHarness.agent.sendDwnRequest({
          author        : aliceSync.did.uri,
          target        : aliceSync.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat   : 'text/plain',
            protocol     : protocolFoo.protocol,
            protocolPath : 'foo',
            schema       : protocolFoo.types.foo.schema
          },
          dataStream: new Blob(['Hello, foo 2!'])
        });
        expect(recordFoo2.reply.status.code).to.equal(202);

        // write a local record to the bar protocol
        const recordBar2 = await testHarness.agent.processDwnRequest({
          author        : aliceSync.did.uri,
          target        : aliceSync.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat   : 'text/plain',
            protocol     : protocolBar.protocol,
            protocolPath : 'bar',
            schema       : protocolBar.types.bar.schema
          },
          dataStream: new Blob(['Hello, bar 2!'])
        });
        expect(recordBar2.reply.status.code).to.equal(202);

        // confirm that the foo record is not yet in the local DWN
        let localFooRecordsResponse = await testHarness.agent.dwn.processRequest({
          author        : aliceSync.did.uri,
          target        : aliceSync.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : {
            filter: {
              protocol: protocolFoo.protocol,
            }
          }
        });
        let localFooRecordsReply = localFooRecordsResponse.reply;
        expect(localFooRecordsReply.status.code).to.equal(200);
        expect(localFooRecordsReply.entries).to.have.length(1);
        let localFooRecordIds = localFooRecordsReply.entries?.map(entry => entry.recordId);
        expect(localFooRecordIds).to.not.include(recordFoo2.message!.recordId);


        // confirm that the bar record is not yet in the remote DWN
        remoteBarRecordsResponse = await testHarness.agent.dwn.sendRequest({
          author        : aliceSync.did.uri,
          target        : aliceSync.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : {
            filter: {
              protocol: protocolBar.protocol,
            }
          }
        });
        remoteBarRecordsReply = remoteBarRecordsResponse.reply;
        expect(remoteBarRecordsReply.status.code).to.equal(200);
        expect(remoteBarRecordsReply.entries).to.have.length(1);
        remoteBarRecordIds = remoteBarRecordsReply.entries?.map(entry => entry.recordId);
        expect(remoteBarRecordIds).to.not.include(recordBar2.message!.recordId);

        // preform a pull and push sync
        await syncEngine.sync();

        // query local to see foo records with the new record
        localFooRecordsResponse = await testHarness.agent.dwn.processRequest({
          author        : aliceSync.did.uri,
          target        : aliceSync.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : {
            filter: {
              protocol: protocolFoo.protocol,
            }
          }
        });
        localFooRecordsReply = localFooRecordsResponse.reply;
        expect(localFooRecordsReply.status.code).to.equal(200);
        expect(localFooRecordsReply.entries).to.have.length(2);
        localFooRecordIds = localFooRecordsReply.entries?.map(entry => entry.recordId);
        expect(localFooRecordIds).to.have.members([ recordFoo.message!.recordId, recordFoo2.message!.recordId ]);

        // query remote to see bar records with the new record
        remoteBarRecordsResponse = await testHarness.agent.dwn.sendRequest({
          author        : aliceSync.did.uri,
          target        : aliceSync.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : {
            filter: {
              protocol: protocolBar.protocol,
            }
          }
        });
        remoteBarRecordsReply = remoteBarRecordsResponse.reply;
        expect(remoteBarRecordsReply.status.code).to.equal(200);
        expect(remoteBarRecordsReply.entries).to.have.length(2);
        remoteBarRecordIds = remoteBarRecordsReply.entries?.map(entry => entry.recordId);
        expect(remoteBarRecordIds).to.have.members([ recordBar.message!.recordId, recordBar2.message!.recordId ]);

        // confirm that still no baz records exist remotely
        remoteBazRecordsResponse = await testHarness.agent.dwn.sendRequest({
          author        : aliceSync.did.uri,
          target        : aliceSync.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : {
            filter: {
              protocol: protocolBaz.protocol,
            }
          }
        });
        remoteBazRecordsReply = remoteBazRecordsResponse.reply;
        expect(remoteBazRecordsReply.status.code).to.equal(200);
        expect(remoteBazRecordsReply.entries).to.have.length(0);
      });

      it('syncs only specified protocols and delegates', async () => {
        const alice = await testHarness.createIdentity({ name: 'Alice', testDwnUrls });

        const aliceDeviceXHarness = await PlatformAgentTestHarness.setup({
          agentClass       : TestAgent,
          agentStores      : 'memory',
          testDataLocation : '__TESTDATA__/alice-device',
        });
        await aliceDeviceXHarness.clearStorage();
        await aliceDeviceXHarness.createAgentDid();

        // create a connected DID
        const aliceDeviceX = await aliceDeviceXHarness.agent.identity.create({
          store     : true,
          didMethod : 'jwk',
          metadata  : { name: 'Alice Device X', connectedDid: alice.did.uri }
        });

        // Alice create 2 protocols on alice's remote DWN
        const protocolFoo: ProtocolDefinition = {
          published : true,
          protocol  : 'https://protocol.xyz/foo',
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

        const protocolBar: ProtocolDefinition = {
          published : true,
          protocol  : 'https://protocol.xyz/bar',
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

        // configure the protocols
        const protocolsFoo = await testHarness.agent.sendDwnRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.ProtocolsConfigure,
          messageParams : {
            definition: protocolFoo
          }
        });
        expect(protocolsFoo.reply.status.code).to.equal(202);

        const protocolsBar = await testHarness.agent.sendDwnRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.ProtocolsConfigure,
          messageParams : {
            definition: protocolBar
          }
        });
        expect(protocolsBar.reply.status.code).to.equal(202);

        // create grants for foo protocol, granted to aliceDeviceX
        const messagesReadGrant = await testHarness.agent.permissions.createGrant({
          store       : true,
          author      : alice.did.uri,
          grantedTo   : aliceDeviceX.did.uri,
          dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
          scope       : { protocol: protocolFoo.protocol, interface: DwnInterfaceName.Messages, method: DwnMethodName.Read }
        });

        const messagesQueryGrant = await testHarness.agent.permissions.createGrant({
          store       : true,
          author      : alice.did.uri,
          grantedTo   : aliceDeviceX.did.uri,
          dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
          scope       : { protocol: protocolFoo.protocol, interface: DwnInterfaceName.Messages, method: DwnMethodName.Query }
        });

        const recordsQueryGrant = await testHarness.agent.permissions.createGrant({
          store       : true,
          author      : alice.did.uri,
          grantedTo   : aliceDeviceX.did.uri,
          dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
          delegated   : true,
          scope       : { protocol: protocolFoo.protocol, interface: DwnInterfaceName.Records, method: DwnMethodName.Query }
        });

        const { encodedData: readGrantData, ... messagesReadGrantMessage } = messagesReadGrant.message;
        const processMessagesReadGrantAsOwner = await aliceDeviceXHarness.agent.processDwnRequest({
          author      : aliceDeviceX.did.uri,
          target      : aliceDeviceX.did.uri,
          messageType : DwnInterface.RecordsWrite,
          rawMessage  : messagesReadGrantMessage,
          dataStream  : new Blob([ Convert.base64Url(readGrantData).toUint8Array() ]),
          signAsOwner : true
        });
        expect(processMessagesReadGrantAsOwner.reply.status.code).to.equal(202);

        const processMessagesReadGrant = await aliceDeviceXHarness.agent.processDwnRequest({
          author      : aliceDeviceX.did.uri,
          target      : alice.did.uri,
          messageType : DwnInterface.RecordsWrite,
          rawMessage  : messagesReadGrantMessage,
          dataStream  : new Blob([ Convert.base64Url(readGrantData).toUint8Array() ])
        });
        expect(processMessagesReadGrant.reply.status.code).to.equal(202);

        const { encodedData: queryGrantData, ... messagesQueryGrantMessage } = messagesQueryGrant.message;
        const processMessagesQueryGrantAsOwner = await aliceDeviceXHarness.agent.processDwnRequest({
          author      : aliceDeviceX.did.uri,
          target      : aliceDeviceX.did.uri,
          messageType : DwnInterface.RecordsWrite,
          rawMessage  : messagesQueryGrantMessage,
          dataStream  : new Blob([ Convert.base64Url(queryGrantData).toUint8Array() ]),
          signAsOwner : true
        });
        expect(processMessagesQueryGrantAsOwner.reply.status.code).to.equal(202);

        const processMessagesQueryGrant = await aliceDeviceXHarness.agent.processDwnRequest({
          author      : aliceDeviceX.did.uri,
          target      : alice.did.uri,
          messageType : DwnInterface.RecordsWrite,
          rawMessage  : messagesQueryGrantMessage,
          dataStream  : new Blob([ Convert.base64Url(queryGrantData).toUint8Array() ]),
        });
        expect(processMessagesQueryGrant.reply.status.code).to.equal(202);

        // send the grants to the remote DWN
        const remoteMessagesQueryGrant = await testHarness.agent.sendDwnRequest({
          author      : alice.did.uri,
          target      : alice.did.uri,
          messageType : DwnInterface.RecordsWrite,
          rawMessage  : messagesQueryGrantMessage,
          dataStream  : new Blob([ Convert.base64Url(queryGrantData).toUint8Array() ]),
        });
        expect(remoteMessagesQueryGrant.reply.status.code).to.equal(202);

        const remoteMessagesReadGrant = await testHarness.agent.sendDwnRequest({
          author      : alice.did.uri,
          target      : alice.did.uri,
          messageType : DwnInterface.RecordsWrite,
          rawMessage  : messagesReadGrantMessage,
          dataStream  : new Blob([ Convert.base64Url(readGrantData).toUint8Array() ]),
        });
        expect(remoteMessagesReadGrant.reply.status.code).to.equal(202);

        const { encodedData: recordsQueryGrantData, ... recordsQueryGrantMessage } = recordsQueryGrant.message;
        const processRecordsQueryGrant = await testHarness.agent.sendDwnRequest({
          author      : alice.did.uri,
          target      : alice.did.uri,
          messageType : DwnInterface.RecordsWrite,
          rawMessage  : recordsQueryGrantMessage,
          dataStream  : new Blob([ Convert.base64Url(recordsQueryGrantData).toUint8Array() ]),
        });
        expect(processRecordsQueryGrant.reply.status.code).to.equal(202);


        // create a record for each protocol
        const recordFoo = await testHarness.agent.sendDwnRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat   : 'text/plain',
            protocol     : protocolFoo.protocol,
            protocolPath : 'foo',
            schema       : protocolFoo.types.foo.schema
          },
          dataStream: new Blob(['Hello, foo!'])
        });
        expect(recordFoo.reply.status.code).to.equal(202);

        const recordBar = await testHarness.agent.sendDwnRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat   : 'text/plain',
            protocol     : protocolBar.protocol,
            protocolPath : 'bar',
            schema       : protocolBar.types.bar.schema
          },
          dataStream: new Blob(['Hello, bar!'])
        });
        expect(recordBar.reply.status.code).to.equal(202);

        // Register Alice's DID to be synchronized with only foo protocol
        await aliceDeviceXHarness.agent.sync.registerIdentity({
          did     : alice.did.uri,
          options : {
            protocols   : [ protocolFoo.protocol ],
            delegateDid : aliceDeviceX.did.uri
          }
        });

        // Execute Sync, only foo protocol should be synced
        await aliceDeviceXHarness.agent.sync.sync();

        // query aliceDeviceX to see foo records
        const localFooRecords = await aliceDeviceXHarness.agent.dwn.processRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          granteeDid    : aliceDeviceX.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : {
            delegatedGrant : recordsQueryGrant.message,
            filter         : {
              protocol: protocolFoo.protocol,
            }
          }
        });
        const didAuthor = Jws.getSignerDid(localFooRecords.message!.authorization?.signature.signatures[0]!);
        expect(didAuthor).to.equal(aliceDeviceX.did.uri);
        expect(localFooRecords.reply.status.code).to.equal(200);
        expect(localFooRecords.reply.entries).to.have.length(1);
        expect(localFooRecords.reply.entries?.map(entry => entry.recordId)).to.have.deep.equal([ recordFoo.message?.recordId ]);

        // sanity check that bar records do not exist on aliceDeviceX
        // since aliceDeviceX does not have a grant for the bar protocol, query the records using alice's signatures.
        // confirm that the query was successful on alice's remote DWN and returns the message
        const localBarRecordsQuery = await testHarness.agent.dwn.sendRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : {
            filter: {
              protocol: protocolBar.protocol,
            }
          }
        });
        expect(localBarRecordsQuery.reply.status.code).to.equal(200);
        expect(localBarRecordsQuery.reply.entries).to.have.length(1);

        // use the same message to query `aliceDeviceXHarness` DWN, should return zero results because they were not synced
        const localBarRecords = await aliceDeviceXHarness.agent.dwn.processRequest({
          author      : alice.did.uri,
          target      : alice.did.uri,
          messageType : DwnInterface.RecordsQuery,
          rawMessage  : localBarRecordsQuery.message,
        });
        expect(localBarRecords.reply.status.code).to.equal(200);
        expect(localBarRecords.reply.entries).to.have.length(0);
      });

      it('defaults to all protocols and undefined delegate if no options are provided', async () => {
        // spy on AbstractLevel put
        const abstractLevelPut = sinon.spy(AbstractLevel.prototype, 'put');

        // register identity without any options
        await testHarness.agent.sync.registerIdentity({
          did: alice.did.uri
        });

        const registerIdentitiesPutCall = abstractLevelPut.args[0];
        const options = JSON.parse(registerIdentitiesPutCall[1] as string);
        // confirm that without options the options are set to an empty protocol array
        expect(options).to.deep.equal({ protocols: [] });
      });
    });
  });
});