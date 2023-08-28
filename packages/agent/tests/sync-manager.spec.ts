import type { PortableDid } from '@web5/dids';

import { expect } from 'chai';
import * as sinon from 'sinon';

import type { ManagedIdentity } from '../src/identity-manager.js';

import { testDwnUrl } from './test-config.js';
import { TestAgent } from './utils/test-agent.js';
import { SyncManagerLevel } from '../src/sync-manager.js';
import { TestManagedAgent } from '../src/test-managed-agent.js';

import { RecordsQueryReply, RecordsWriteMessage } from '@tbd54566975/dwn-sdk-js';

let testDwnUrls: string[] = [testDwnUrl];

describe('SyncManagerLevel', () => {
  describe('get agent', () => {
    it(`returns the 'agent' instance property`, async () => {
      // @ts-expect-error because we are only mocking a single property.
      const mockAgent: Web5ManagedAgent = {
        agentDid: 'did:method:abc123'
      };
      const syncManager = new SyncManagerLevel({ agent: mockAgent });
      const agent = syncManager.agent;
      expect(agent).to.exist;
      expect(agent.agentDid).to.equal('did:method:abc123');
    });

    it(`throws an error if the 'agent' instance property is undefined`, () => {
      const syncManager = new SyncManagerLevel();
      expect(() =>
        syncManager.agent
      ).to.throw(Error, 'Unable to determine agent execution context');
    });
  });

  {
    let alice: ManagedIdentity;
    let aliceDid: PortableDid;
    let syncManager: SyncManagerLevel;
    let testAgent: TestManagedAgent;

    before(async () => {
      testAgent = await TestManagedAgent.create({
        agentClass  : TestAgent,
        agentStores : 'dwn'
      });

      syncManager = new SyncManagerLevel({
        agent    : testAgent.agent,
        dataPath : '__TESTDATA__/SYNC_STORE'
      });
    });

    beforeEach(async () => {
      await testAgent.clearStorage();
      // @ts-ignore
      await syncManager._db.clear();
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
      // @ts-ignore
      await syncManager._db.clear();
    });

    after(async () => {
      await testAgent.clearStorage();
      // @ts-ignore
      await syncManager._db.clear();
      // @ts-ignore
      await syncManager._db.close();
      await testAgent.closeStorage();
    });

    describe('pull()', () => {
      it('takes no action if no identities are registered', async () => {
        const didResolveSpy = sinon.spy(testAgent.agent.didResolver, 'resolve');
        const sendDwnRequestSpy = sinon.spy(testAgent.agent.rpcClient, 'sendDwnRequest');


        await syncManager.pull();

        // Verify DID resolution and DWN requests did not occur.
        expect(didResolveSpy.notCalled).to.be.true;
        expect(sendDwnRequestSpy.notCalled).to.be.true;

        didResolveSpy.restore();
        sendDwnRequestSpy.restore();
      });

      it('synchronizes records for 1 identity from remove DWN to local DWN', async () => {
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
        await syncManager.registerIdentity({
          did: alice.did
        });

        // Execute Sync to pull all records from Alice's remote DWN to Alice's local DWN.
        await syncManager.pull();

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
        await syncManager.registerIdentity({
          did: alice.did
        });

        // Register Bob's DID to be synchronized.
        await syncManager.registerIdentity({
          did: bob.did
        });

        // Execute Sync to pull all records from Alice's and Bob's remove DWNs to their local DWNs.
        await syncManager.pull();

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
      });
    });

    describe('push()', () => {
      it('takes no action if no identities are registered', async () => {
        const didResolveSpy = sinon.spy(testAgent.agent.didResolver, 'resolve');
        const processRequestSpy = sinon.spy(testAgent.agent.dwnManager, 'processRequest');

        await syncManager.push();

        // Verify DID resolution and DWN requests did not occur.
        expect(didResolveSpy.notCalled).to.be.true;
        expect(processRequestSpy.notCalled).to.be.true;

        didResolveSpy.restore();
        processRequestSpy.restore();
      });

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
        await syncManager.registerIdentity({
          did: alice.did
        });

        // Execute Sync to push all records from Alice's local DWN to Alice's remote DWN.
        await syncManager.push();

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
        await syncManager.registerIdentity({
          did: alice.did
        });

        // Register Bob's DID to be synchronized.
        await syncManager.registerIdentity({
          did: bob.did
        });

        // Execute Sync to push all records from Alice's and Bob's local DWNs to their remote DWNs.
        await syncManager.push();

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
      });
    });
  }
});