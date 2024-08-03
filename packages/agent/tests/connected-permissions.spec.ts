import { DwnInterfaceName, DwnMethodName, Jws, Message, MessagesQuery, MessagesRead, MessagesSubscribe, PermissionGrant, Poller, ProtocolDefinition, ProtocolsQuery, RecordsDelete, RecordsQuery, RecordsRead, RecordsSubscribe, RecordsWrite, RecordsWriteMessage, Time } from '@tbd54566975/dwn-sdk-js';

import type { BearerIdentity } from '../src/bearer-identity.js';

import { TestAgent } from './utils/test-agent.js';
import { DwnInterface, DwnResponse, ProcessDwnRequest } from '../src/types/dwn.js';
import { testDwnUrl } from './utils/test-config.js';
import { PlatformAgentTestHarness } from '../src/test-harness.js';
import { NodeStream } from '@web5/common';

import sinon from 'sinon';

import { expect } from 'chai';

// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';
import { GrantsUtil } from './utils/grants.js';
import { matchGrantFromArray } from '../src/utils.js';
// @ts-expect-error - globalThis.crypto and webcrypto are of different types.
if (!globalThis.crypto) globalThis.crypto = webcrypto;

let testDwnUrls: string[] = [testDwnUrl];

describe('Connect Flow Permissions', () => {
  let aliceAgent: PlatformAgentTestHarness;
  let appAgent: PlatformAgentTestHarness;

  before(async () => {
    aliceAgent = await PlatformAgentTestHarness.setup({
      agentClass  : TestAgent,
      agentStores : 'dwn'
    });

    appAgent = await PlatformAgentTestHarness.setup({
      agentClass       : TestAgent,
      agentStores      : 'dwn',
      testDataLocation : '__TESTDATA__/app' // Use a different data location for the app
    });
  });

  after(async () => {
    await aliceAgent.clearStorage();
    await aliceAgent.closeStorage();

    await appAgent.clearStorage();
    await appAgent.closeStorage();
  });

  describe('with Web5 Platform Agent', () => {
    let alice: BearerIdentity;

    before(async () => {
      await aliceAgent.clearStorage();
      await aliceAgent.createAgentDid();

      await appAgent.clearStorage();
      await appAgent.createAgentDid();
    });

    beforeEach(async () => {
      sinon.restore();

      await aliceAgent.syncStore.clear();
      await aliceAgent.dwnDataStore.clear();
      await aliceAgent.dwnEventLog.clear();
      await aliceAgent.dwnMessageStore.clear();
      await aliceAgent.dwnResumableTaskStore.clear();
      aliceAgent.dwnStores.clear();

      await appAgent.syncStore.clear();
      await appAgent.dwnDataStore.clear();
      await appAgent.dwnEventLog.clear();
      await appAgent.dwnMessageStore.clear();
      await appAgent.dwnResumableTaskStore.clear();
      appAgent.dwnStores.clear();

      // create and manage alice identity for the tests to use
      alice = await aliceAgent.createIdentity({ name: 'Alice', testDwnUrls });
      await aliceAgent.agent.identity.manage({ portableIdentity: await alice.export() });
    });

    after(async () => {
      await aliceAgent.clearStorage();
      await appAgent.clearStorage();
    });

    it('creates and signs a message with a permission grant', async () => {
      // scenario:
      // an app creates an identity and manages it within it's own agent
      // alice creates a permission grant for the app identity to allow MessageQuery on her DWN
      // the app processes the permission grant
      // the app then attempts to MessagesQuery using the permission grant on both the local app's DWN and alice's remote DWN

      // create a new identity for the app
      const appX = await appAgent.agent.identity.create({
        store     : true,
        metadata  : { name: 'Device X' },
        didMethod : 'jwk'
      });

      await appAgent.agent.identity.manage({ portableIdentity: await appX.export() });

      // alice creates a permission grant
      const messagesQueryGrant = await aliceAgent.agent.dwn.createGrant({
        grantedFrom : alice.did.uri,
        grantedTo   : appX.did.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : { interface: DwnInterfaceName.Messages, method: DwnMethodName.Query }
      });

      // alice stores and processes the permission grant on her DWN
      const { reply: aliceGrantReply } = await aliceAgent.agent.dwn.processRequest({
        messageType : DwnInterface.RecordsWrite,
        rawMessage  : messagesQueryGrant.recordsWrite.message,
        author      : alice.did.uri,
        target      : alice.did.uri,
        dataStream  : new Blob([messagesQueryGrant.permissionGrantBytes]),
      });
      expect(aliceGrantReply.status.code).to.equal(202);

      // The App processes the permission grant given by Alice, so it can be accessible when using it
      const { reply: appAgentGrantReply } = await appAgent.agent.dwn.processRequest({
        messageType : DwnInterface.RecordsWrite,
        rawMessage  : messagesQueryGrant.recordsWrite.message,
        author      : alice.did.uri,
        target      : alice.did.uri,
        dataStream  : new Blob([messagesQueryGrant.permissionGrantBytes]),
      });
      expect(appAgentGrantReply.status.code).to.equal(202);

      const writeGrantToGrantee: ProcessDwnRequest<DwnInterface.RecordsWrite> = {
        messageType : DwnInterface.RecordsWrite,
        rawMessage  : messagesQueryGrant.recordsWrite.message,
        author      : appX.did.uri,
        target      : appX.did.uri,
        dataStream  : new Blob([messagesQueryGrant.permissionGrantBytes]),
        signAsOwner : true
      };

      const { reply: importGrantReply } = await appAgent.agent.dwn.processRequest(writeGrantToGrantee);
      expect(importGrantReply.status.code).to.equal(202);

      // Attempt to process the MessagesQuery locally using the permission grant.
      const { message: queryMessage, reply } = await appAgent.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.MessagesQuery,
        messageParams : {
          filters           : [],
          permissionGrantId : messagesQueryGrant.recordsWrite.message.recordId
        },
        granteeDid: appX.did.uri,
      });
      const messageSignature = queryMessage!.authorization.signature.signatures[0];
      const signatureDid = Jws.getSignerDid(messageSignature);

      expect(signatureDid).to.equal(appX.did.uri);
      expect(reply.status.code).to.equal(200);
      expect(reply.entries?.length).to.equal(1); // the permission grant should exist
      expect(reply.entries![0]).to.equal(await Message.getCid(messagesQueryGrant.recordsWrite.message));

      // process the message on alice's agent
      const { reply: aliceReply } = await aliceAgent.agent.dwn.processRequest({
        messageType : DwnInterface.MessagesQuery,
        rawMessage  : queryMessage,
        author      : alice.did.uri,
        target      : alice.did.uri,
      });
      expect(aliceReply.status.code).to.equal(200);

      // should have more than 1 message
      // the other messages are related to DID and Identity information stored on the DWN
      expect(aliceReply.entries?.length).to.be.gt(1);
      expect(aliceReply.entries).to.include(await Message.getCid(messagesQueryGrant.recordsWrite.message));
    });

    it('creates and signs a delegated grant message', async () => {
      // Scenario:
      // alice wants to grant permission to an app to write records to her DWN on her behalf
      // alice creates an identity for the app
      // alice installs the protocol that app will use to write to her DWN
      // alice creates a delegated permission grant for RecordsWrite scoped to the protocol of the app
      // alice processes the permission grant
      // the app is able to write to alice's DWN using the delegated permission grant
      // the app attempts to read the record it wrote to alice's DWN, but without a permission grant for RecordsRead, it should fail
      // alice issues a delegated permission grant for RecordsRead and the app uses it to read the record

      // alice installs a protocol for deviceX to use to write to her DWN
      const protocol: ProtocolDefinition = {
        protocol  : 'http://example.com/protocol',
        published : true,
        types     : {
          foo: {}
        },
        structure: {
          foo: {}
        }
      };
      const { reply, message: protocolConfigureMessage } = await aliceAgent.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.ProtocolsConfigure,
        messageParams : {
          definition: protocol,
        }
      });
      expect(reply.status.code).to.equal(202);

      // create a new identity for the app
      const appX = await appAgent.agent.identity.create({
        store     : true,
        metadata  : { name: 'App Identity X' },
        didMethod : 'jwk'
      });

      await appAgent.agent.identity.manage({ portableIdentity: await appX.export() });

      // alice creates a delegated permission grant
      const recordsWriteGrant = await aliceAgent.agent.dwn.createGrant({
        grantedFrom : alice.did.uri,
        grantedTo   : appX.did.uri,
        delegated   : true,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : protocol.protocol
        }
      });

      // alice stores and processes the permission grant on her DWN
      const { reply: aliceGrantReply } = await aliceAgent.agent.dwn.processRequest({
        messageType : DwnInterface.RecordsWrite,
        rawMessage  : recordsWriteGrant.recordsWrite.message,
        author      : alice.did.uri,
        target      : alice.did.uri,
        dataStream  : new Blob([ recordsWriteGrant.permissionGrantBytes ]),
      });
      expect(aliceGrantReply.status.code).to.equal(202);

      // alice hands off the grant to the appX agent
      // if sync is initiated, the appX will also have the protocol message installed
      // but for this test we will process it manually
      const { reply: appXProtocolReply } = await appAgent.agent.dwn.processRequest({
        messageType : DwnInterface.ProtocolsConfigure,
        rawMessage  : protocolConfigureMessage,
        author      : alice.did.uri,
        target      : alice.did.uri,
      });
      expect(appXProtocolReply.status.code).to.equal(202);


      // The App processes the permission grant given by Alice, so it can be accessible when using it
      const { reply: appAgentGrantReply } = await appAgent.agent.dwn.processRequest({
        messageType : DwnInterface.RecordsWrite,
        rawMessage  : recordsWriteGrant.recordsWrite.message,
        author      : appX.did.uri,
        target      : appX.did.uri,
        dataStream  : new Blob([ recordsWriteGrant.permissionGrantBytes ]),
        signAsOwner : true
      });
      expect(appAgentGrantReply.status.code).to.equal(202);

      // write a record to the app's DWN as alice
      const data = new Blob([ 'Hello, Alice!' ]);
      const { message: delegatedWriteMessage, reply: delegatedWriteReply  } = await appAgent.agent.dwn.processRequest({
        messageType   : DwnInterface.RecordsWrite,
        messageParams : {
          protocol       : protocol.protocol,
          protocolPath   : 'foo',
          dataFormat     : 'application/json',
          delegatedGrant : recordsWriteGrant.dataEncodedMessage
        },
        author     : alice.did.uri,
        target     : alice.did.uri,
        dataStream : data,
        granteeDid : appX.did.uri,
      });
      expect(delegatedWriteReply.status.code).to.equal(202, 'delegated write');

      // write the record to alice's DWN
      const { reply: aliceReply } = await aliceAgent.agent.dwn.processRequest({
        messageType : DwnInterface.RecordsWrite,
        rawMessage  : delegatedWriteMessage,
        author      : alice.did.uri,
        target      : alice.did.uri,
        dataStream  : data,
      });
      expect(aliceReply.status.code).to.equal(202, 'delegated write to alice');

      //Record Read will not work because the permission grant is for RecordsWrite
      const { reply: delegatedReadReply } = await appAgent.agent.dwn.processRequest({
        messageType   : DwnInterface.RecordsRead,
        messageParams : {
          filter: {
            protocol     : protocol.protocol,
            protocolPath : 'foo'
          },
          delegatedGrant: recordsWriteGrant.dataEncodedMessage,
        },
        author     : alice.did.uri,
        target     : alice.did.uri,
        granteeDid : appX.did.uri,
      });
      expect(delegatedReadReply.status.code).to.equal(401, 'delegated read');

      // alice issues a delegated read permission grant
      const recordReadGrant = await aliceAgent.agent.dwn.createGrant({
        grantedFrom : alice.did.uri,
        grantedTo   : appX.did.uri,
        delegated   : true,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Read,
          protocol  : protocol.protocol
        }
      });

      // alice stores and processes the permission grant on her DWN
      const { reply: aliceGrantReadReply } = await aliceAgent.agent.dwn.processRequest({
        messageType : DwnInterface.RecordsWrite,
        rawMessage  : recordReadGrant.recordsWrite.message,
        author      : alice.did.uri,
        target      : alice.did.uri,
        dataStream  : new Blob([ recordReadGrant.permissionGrantBytes]),
      });
      expect(aliceGrantReadReply.status.code).to.equal(202);

      // alice hands off the grant to the appX agent
      const { reply: appAgentGrantReadReply } = await appAgent.agent.dwn.processRequest({
        messageType : DwnInterface.RecordsWrite,
        rawMessage  : recordReadGrant.recordsWrite.message,
        author      : appX.did.uri,
        target      : appX.did.uri,
        dataStream  : new Blob([ recordReadGrant.permissionGrantBytes ]),
        signAsOwner : true
      });
      expect(appAgentGrantReadReply.status.code).to.equal(202);

      // appX now attempts to read the messages using the delegated read permission grant
      const { reply: delegatedReadReply2 } = await appAgent.agent.dwn.processRequest({
        messageType   : DwnInterface.RecordsRead,
        messageParams : {
          filter: {
            protocol     : protocol.protocol,
            protocolPath : 'foo'
          },
          delegatedGrant: recordReadGrant.dataEncodedMessage,
        },
        author     : alice.did.uri,
        target     : alice.did.uri,
        granteeDid : appX.did.uri,
      });
      expect(delegatedReadReply2.status.code).to.equal(200, 'delegated read ok');
      expect(delegatedReadReply2.record?.recordId).to.equal(delegatedWriteMessage?.recordId);
    });

    describe('fetchGrants', () => {
      it('fetches grants for a grantee', async () => {
        // scenario: alice creates grants for recipients deviceY and deviceX
        // the grantee fetches their own grants respectively

        // create an identity for deviceX and deviceY
        const aliceDeviceX = await appAgent.agent.identity.create({
          store     : true,
          metadata  : { name: 'Alice Device X' },
          didMethod : 'jwk'
        });

        const aliceDeviceY = await appAgent.agent.identity.create({
          store     : true,
          metadata  : { name: 'Alice Device Y' },
          didMethod : 'jwk'
        });

        // create records grants for deviceX
        const deviceXGrants = await GrantsUtil.createRecordsGrants({
          grantorAgent : aliceAgent.agent,
          granteeAgent : appAgent.agent,
          grantor      : alice.did.uri,
          grantee      : aliceDeviceX.did.uri,
          protocol     : 'http://example.com/protocol',
        });

        const deviceXGrantRecordIds = [
          deviceXGrants.delete.recordId,
          deviceXGrants.query.recordId,
          deviceXGrants.read.recordId,
          deviceXGrants.subscribe.recordId,
          deviceXGrants.write.recordId
        ];

        // create records and messages grants for deviceY
        const deviceYRecordGrants = await GrantsUtil.createRecordsGrants({
          grantorAgent : aliceAgent.agent,
          granteeAgent : appAgent.agent,
          grantor      : alice.did.uri,
          grantee      : aliceDeviceY.did.uri,
          protocol     : 'http://example.com/protocol',
        });

        const deviceYMessageGrants = await GrantsUtil.createMessagesGrants({
          grantorAgent : aliceAgent.agent,
          granteeAgent : appAgent.agent,
          grantor      : alice.did.uri,
          grantee      : aliceDeviceY.did.uri,
          protocol     : 'http://example.com/protocol',
        });

        const deviceYGrantRecordIds = [
          deviceYRecordGrants.delete.recordId,
          deviceYRecordGrants.query.recordId,
          deviceYRecordGrants.read.recordId,
          deviceYRecordGrants.subscribe.recordId,
          deviceYRecordGrants.write.recordId,
          deviceYMessageGrants.read.recordId,
          deviceYMessageGrants.query.recordId,
          deviceYMessageGrants.subscribe.recordId
        ];

        // fetch the grants for deviceX from the app agent
        const fetchedDeviceXGrants = await appAgent.agent.dwn.fetchGrants({
          grantor : alice.did.uri,
          grantee : aliceDeviceX.did.uri,
        });

        // expect to have the 5 grants created for deviceX
        expect(fetchedDeviceXGrants.length).to.equal(5);
        expect(fetchedDeviceXGrants.map(grant => grant.recordId)).to.have.members(deviceXGrantRecordIds);

        // fetch grants for deviceY from the app agent
        const fetchedDeviceYGrants = await appAgent.agent.dwn.fetchGrants({
          grantor : alice.did.uri,
          grantee : aliceDeviceY.did.uri,
        });

        // expect to have the 8 grants created for deviceY
        expect(fetchedDeviceYGrants.length).to.equal(8);
        expect(fetchedDeviceYGrants.map(grant => grant.recordId)).to.have.members(deviceYGrantRecordIds);
      });

      it('fetches grants for a given target', async () => {
        // scenario : alice creates a grant for deviceX and stores them in deviceX's DWN
        // fetches the grants for deviceX with the default target, which is the grantee (deviceX)
        // attempts to fetch the grants setting the target to alice's DWN, gets no results.
        // process the grant to alice's DWN and attempts the fetch again, this time the grant should be available

        // create an identity for deviceX
        const aliceDeviceX = await aliceAgent.agent.identity.create({
          store     : true,
          metadata  : { name: 'Alice Device X' },
          didMethod : 'jwk'
        });

        // create a grant for deviceX from alice
        const recordsWriteGrant = await aliceAgent.agent.dwn.createGrant({
          grantedFrom : alice.did.uri,
          grantedTo   : aliceDeviceX.did.uri,
          dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
          scope       : { interface: DwnInterfaceName.Records, method: DwnMethodName.Write, protocol: 'http://example.com/protocol' }
        });

        // write to deviceX's DWN
        const { reply: writeReplyDeviceX } = await aliceAgent.agent.dwn.processRequest({
          messageType : DwnInterface.RecordsWrite,
          rawMessage  : recordsWriteGrant.recordsWrite.message,
          author      : aliceDeviceX.did.uri,
          target      : aliceDeviceX.did.uri,
          dataStream  : new Blob([recordsWriteGrant.permissionGrantBytes]),
          signAsOwner : true
        });

        expect(writeReplyDeviceX.status.code).to.equal(202);

        // fetch the grants for deviceX from the app agent, the target defaults to grantee
        const fetchedDeviceXGrants = await aliceAgent.agent.dwn.fetchGrants({
          grantor : alice.did.uri,
          grantee : aliceDeviceX.did.uri,
        });

        // expect to have the 1 grant created for deviceX
        expect(fetchedDeviceXGrants.length).to.equal(1);

        // explicitly set the target to alice
        let fetchedAliceTarget = await aliceAgent.agent.dwn.fetchGrants({
          target  : alice.did.uri,
          grantor : alice.did.uri,
          grantee : aliceDeviceX.did.uri,
        });

        // because the grants were not yet processed by alice's DWN, the results should be empty
        expect(fetchedAliceTarget.length).to.equal(0);

        // process the grant to alice's DWN
        const { reply: writeReply } = await aliceAgent.agent.dwn.processRequest({
          messageType : DwnInterface.RecordsWrite,
          rawMessage  : recordsWriteGrant.recordsWrite.message,
          author      : alice.did.uri,
          target      : alice.did.uri,
          dataStream  : new Blob([recordsWriteGrant.permissionGrantBytes]),
        });
        expect(writeReply.status.code).to.equal(202);

        // try again to fetch the grants with alice ad the target
        fetchedAliceTarget = await aliceAgent.agent.dwn.fetchGrants({
          target  : alice.did.uri,
          grantor : alice.did.uri,
          grantee : aliceDeviceX.did.uri,
        });

        // now the grants should be available
        expect(fetchedAliceTarget.length).to.equal(1);
      });

      it('should throw if the grant query returns anything other than a 200', async () => {
        // create an identity for deviceX and deviceY
        const aliceDeviceX = await appAgent.agent.identity.create({
          store     : true,
          metadata  : { name: 'Alice Device X' },
          didMethod : 'jwk'
        });

        // return empty array if grant query returns something other than a 200
        sinon.stub(appAgent.agent.dwn, 'processRequest').resolves({ messageCid: '', reply: { status: { code: 400, detail: 'unknown error' } } });
        try {
          await appAgent.agent.dwn.fetchGrants({
            grantor : alice.did.uri,
            grantee : aliceDeviceX.did.uri,
          });

          expect.fail('Expected fetchGrants to throw');
        } catch(error: any) {
          expect(error.message).to.equal('AgentDwnApi: Failed to fetch grants: unknown error');
        }
      });
    });

    describe('isGrantRevoked', () => {
      it('checks if grant is revoked', async () => {
        // scenario: create a grant for deviceX, check if the grant is revoked, revoke the grant, check if the grant is revoked

        // create an identity for deviceX
        const aliceDeviceX = await appAgent.agent.identity.create({
          store     : true,
          metadata  : { name: 'Alice Device X' },
          didMethod : 'jwk'
        });

        // create records grants for deviceX
        const deviceXGrant = await  aliceAgent.agent.dwn.createGrant({
          grantedFrom : alice.did.uri,
          grantedTo   : aliceDeviceX.did.uri,
          dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
          scope       : {
            interface : DwnInterfaceName.Records,
            method    : DwnMethodName.Write,
            protocol  : 'http://example.com/protocol'
          }
        });

        const { reply: processGrantReply } = await aliceAgent.agent.dwn.processRequest({
          messageType : DwnInterface.RecordsWrite,
          rawMessage  : deviceXGrant.recordsWrite.message,
          author      : alice.did.uri,
          target      : alice.did.uri,
          dataStream  : new Blob([deviceXGrant.permissionGrantBytes]),
        });
        expect(processGrantReply.status.code).to.equal(202);

        // fetch the grants for deviceX
        const fetchedDeviceXGrants = await aliceAgent.agent.dwn.fetchGrants({
          author  : alice.did.uri,
          grantor : alice.did.uri,
          grantee : aliceDeviceX.did.uri
        });

        // expect to have the 5 grants created for deviceX
        expect(fetchedDeviceXGrants.length).to.equal(1);
        expect(fetchedDeviceXGrants.map(grant => grant.recordId)).to.have.members([ deviceXGrant.recordsWrite.message.recordId ]);

        // check if the grant is revoked
        let isRevoked = await aliceAgent.agent.dwn.isGrantRevoked(
          alice.did.uri,
          alice.did.uri,
          deviceXGrant.recordsWrite.message.recordId
        );

        expect(isRevoked).to.equal(false);

        // revoke the grant
        const writeGrant = await PermissionGrant.parse(deviceXGrant.dataEncodedMessage);
        const revokeGrant = await aliceAgent.agent.dwn.createRevocation({
          author : alice.did.uri,
          grant  : writeGrant,
        });

        const revokeReply = await aliceAgent.agent.dwn.processRequest({
          messageType : DwnInterface.RecordsWrite,
          rawMessage  : revokeGrant.recordsWrite.message,
          author      : alice.did.uri,
          target      : alice.did.uri,
          dataStream  : new Blob([revokeGrant.permissionRevocationBytes]),
        });
        expect(revokeReply.reply.status.code).to.equal(202);

        // check if the grant is revoked again, should be true
        isRevoked = await aliceAgent.agent.dwn.isGrantRevoked(
          alice.did.uri,
          alice.did.uri,
          deviceXGrant.recordsWrite.message.recordId
        );
        expect(isRevoked).to.equal(true);
      });

      it('throws if grant revocation query returns anything other than a 200 or 404', async () => {
        // return empty array if grant query returns something other than a 200
        sinon.stub(appAgent.agent.dwn, 'processRequest').resolves({ messageCid: '', reply: { status: { code: 400, detail: 'unknown error' } } });

        try {
          await appAgent.agent.dwn.isGrantRevoked(alice.did.uri, alice.did.uri, 'some-record-id');
          expect.fail('Expected isGrantRevoked to throw');
        } catch (error:any) {
          expect(error.message).to.equal('AgentDwnApi: Failed to check if grant is revoked: unknown error');
        }
      });
    });

    describe('matchGrantFromArray', () => {
      it('does not match a grant with a different grantee or grantor', async () => {
        const aliceDeviceX = await appAgent.agent.identity.create({
          store     : true,
          metadata  : { name: 'Alice Device X' },
          didMethod : 'jwk'
        });

        const aliceDeviceY = await appAgent.agent.identity.create({
          store     : true,
          metadata  : { name: 'Alice Device Y' },
          didMethod : 'jwk'
        });

        const protocol = 'http://example.com/protocol';

        await GrantsUtil.createRecordsGrants({
          grantorAgent : aliceAgent.agent,
          granteeAgent : appAgent.agent,
          grantor      : alice.did.uri,
          grantee      : aliceDeviceX.did.uri,
          protocol
        });

        const deviceXGranteeGrants = await appAgent.agent.dwn.fetchGrants({
          grantor : alice.did.uri,
          grantee : aliceDeviceX.did.uri
        });
        expect(deviceXGranteeGrants.length).to.equal(5);

        // attempt to match a grant with a different grantee, aliceDeviceY
        const notFoundGrantee = await matchGrantFromArray(alice.did.uri, aliceDeviceY.did.uri, {
          messageType: DwnInterface.RecordsWrite,
          protocol
        }, deviceXGranteeGrants);

        expect(notFoundGrantee).to.be.undefined;

        await GrantsUtil.createRecordsGrants({
          grantorAgent : appAgent.agent,
          granteeAgent : appAgent.agent,
          grantor      : aliceDeviceX.did.uri,
          grantee      : aliceDeviceY.did.uri,
          protocol
        });

        const deviceXGrantorGrants = await appAgent.agent.dwn.fetchGrants({ grantor: aliceDeviceX.did.uri, grantee: aliceDeviceY.did.uri });
        expect(deviceXGrantorGrants.length).to.equal(5);

        const notFoundGrantor = await matchGrantFromArray(alice.did.uri, aliceDeviceY.did.uri, {
          messageType: DwnInterface.RecordsWrite,
          protocol
        }, deviceXGrantorGrants);

        expect(notFoundGrantor).to.be.undefined;
      });

      it('matches delegated grants if specified', async () => {
        const aliceDeviceX = await appAgent.agent.identity.create({
          store     : true,
          metadata  : { name: 'Alice Device X' },
          didMethod : 'jwk'
        });

        const messagesGrants = await GrantsUtil.createMessagesGrants({
          grantorAgent : aliceAgent.agent,
          granteeAgent : appAgent.agent,
          grantor      : alice.did.uri,
          grantee      : aliceDeviceX.did.uri,
        });

        const fetchedGrants = await appAgent.agent.dwn.fetchGrants({ grantor: alice.did.uri, grantee: aliceDeviceX.did.uri });

        // control: match a grant without specifying delegated
        const queryGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType: DwnInterface.MessagesQuery,
        }, fetchedGrants);

        expect(queryGrant?.message.recordId).to.equal(messagesGrants.query.recordId);

        // attempt to match non-delegated grant with delegated set to true
        const notFoundDelegated = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType: DwnInterface.MessagesQuery,
        }, fetchedGrants, true);

        expect(notFoundDelegated).to.be.undefined;

        // create delegated record grants
        const protocol = 'http://example.com/protocol';
        const recordsGrants = await GrantsUtil.createRecordsGrants({
          grantorAgent : aliceAgent.agent,
          granteeAgent : appAgent.agent,
          grantor      : alice.did.uri,
          grantee      : aliceDeviceX.did.uri,
          protocol
        });

        const fetchedRecordsGrants = await appAgent.agent.dwn.fetchGrants({ grantor: alice.did.uri, grantee: aliceDeviceX.did.uri });

        // match a delegated grant
        const writeGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType: DwnInterface.RecordsWrite,
          protocol
        }, fetchedRecordsGrants, true);

        expect(writeGrant?.message.recordId).to.equal(recordsGrants.write.recordId);
      });

      it('Messages', async () => {
        const aliceDeviceX = await appAgent.agent.identity.create({
          store     : true,
          metadata  : { name: 'Alice Device X' },
          didMethod : 'jwk'
        });

        const messageGrants = await GrantsUtil.createMessagesGrants({
          grantorAgent : aliceAgent.agent,
          granteeAgent : appAgent.agent,
          grantor      : alice.did.uri,
          grantee      : aliceDeviceX.did.uri
        });

        const fetchedGrants = await appAgent.agent.dwn.fetchGrants({ grantor: alice.did.uri, grantee: aliceDeviceX.did.uri });

        const queryGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType: DwnInterface.MessagesQuery,
        }, fetchedGrants);

        expect(queryGrant?.message.recordId).to.equal(messageGrants.query.recordId);

        const readGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType: DwnInterface.MessagesRead,
        }, fetchedGrants);

        expect(readGrant?.message.recordId).to.equal(messageGrants.read.recordId);

        const subscribeGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType: DwnInterface.MessagesSubscribe,
        }, fetchedGrants);

        expect(subscribeGrant?.message.recordId).to.equal(messageGrants.subscribe.recordId);

        const invalidGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType: DwnInterface.RecordsQuery,
        }, fetchedGrants);

        expect(invalidGrant).to.be.undefined;
      });

      it('Messages with protocol', async () => {
        const aliceDeviceX = await appAgent.agent.identity.create({
          store     : true,
          metadata  : { name: 'Alice Device X' },
          didMethod : 'jwk'
        });

        const protocol = 'http://example.com/protocol';
        const otherProtocol = 'http://example.com/other-protocol';

        const protocolMessageGrants = await GrantsUtil.createMessagesGrants({
          grantorAgent : aliceAgent.agent,
          granteeAgent : appAgent.agent,
          grantor      : alice.did.uri,
          grantee      : aliceDeviceX.did.uri,
          protocol
        });

        const otherProtocolMessageGrants = await GrantsUtil.createMessagesGrants({
          grantorAgent : aliceAgent.agent,
          granteeAgent : appAgent.agent,
          grantor      : alice.did.uri,
          grantee      : aliceDeviceX.did.uri,
          protocol     : otherProtocol
        });

        const fetchedGrants = await appAgent.agent.dwn.fetchGrants({ grantor: alice.did.uri, grantee: aliceDeviceX.did.uri });

        const queryGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType: DwnInterface.MessagesQuery,
          protocol
        }, fetchedGrants);

        expect(queryGrant?.message.recordId).to.equal(protocolMessageGrants.query.recordId);

        const readGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType: DwnInterface.MessagesRead,
          protocol
        }, fetchedGrants);

        expect(readGrant?.message.recordId).to.equal(protocolMessageGrants.read.recordId);

        const subscribeGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType: DwnInterface.MessagesSubscribe,
          protocol
        }, fetchedGrants);

        expect(subscribeGrant?.message.recordId).to.equal(protocolMessageGrants.subscribe.recordId);

        const invalidGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType : DwnInterface.MessagesQuery,
          protocol    : 'http://example.com/unknown-protocol'
        }, fetchedGrants);

        expect(invalidGrant).to.be.undefined;

        const otherProtocolQueryGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType : DwnInterface.MessagesQuery,
          protocol    : otherProtocol
        }, fetchedGrants);

        expect(otherProtocolQueryGrant?.message.recordId).to.equal(otherProtocolMessageGrants.query.recordId);
      });

      it('Records', async () => {
        const aliceDeviceX = await appAgent.agent.identity.create({
          store     : true,
          metadata  : { name: 'Alice Device X' },
          didMethod : 'jwk'
        });

        const protocol1 = 'http://example.com/protocol';
        const protocol2 = 'http://example.com/other-protocol';

        const protocol1Grants = await GrantsUtil.createRecordsGrants({
          grantorAgent : aliceAgent.agent,
          granteeAgent : appAgent.agent,
          grantor      : alice.did.uri,
          grantee      : aliceDeviceX.did.uri,
          protocol     : protocol1,
        });

        const otherProtocolGrants = await GrantsUtil.createRecordsGrants({
          grantorAgent : aliceAgent.agent,
          granteeAgent : appAgent.agent,
          grantor      : alice.did.uri,
          grantee      : aliceDeviceX.did.uri,
          protocol     : protocol2,
        });

        const fetchedGrants = await appAgent.agent.dwn.fetchGrants({ grantor: alice.did.uri, grantee: aliceDeviceX.did.uri });

        const writeGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType : DwnInterface.RecordsWrite,
          protocol    : protocol1
        }, fetchedGrants);

        expect(writeGrant?.message.recordId).to.equal(protocol1Grants.write.recordId);

        const readGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType : DwnInterface.RecordsRead,
          protocol    : protocol1
        }, fetchedGrants);

        expect(readGrant?.message.recordId).to.equal(protocol1Grants.read.recordId);

        const deleteGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType : DwnInterface.RecordsDelete,
          protocol    : protocol1
        }, fetchedGrants);

        expect(deleteGrant?.message.recordId).to.equal(protocol1Grants.delete.recordId);

        const queryGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType : DwnInterface.RecordsQuery,
          protocol    : protocol1
        }, fetchedGrants);

        expect(queryGrant?.message.recordId).to.equal(protocol1Grants.query.recordId);

        const subscribeGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType : DwnInterface.RecordsSubscribe,
          protocol    : protocol1
        }, fetchedGrants);

        expect(subscribeGrant?.message.recordId).to.equal(protocol1Grants.subscribe.recordId);

        const queryGrantOtherProtocol = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType : DwnInterface.RecordsQuery,
          protocol    : protocol2
        }, fetchedGrants);

        expect(queryGrantOtherProtocol?.message.recordId).to.equal(otherProtocolGrants.query.recordId);

        // unknown protocol
        const invalidGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType : DwnInterface.RecordsQuery,
          protocol    : 'http://example.com/unknown-protocol'
        }, fetchedGrants);

        expect(invalidGrant).to.be.undefined;
      });

      it('Records with protocolPath', async () => {
        const aliceDeviceX = await appAgent.agent.identity.create({
          store     : true,
          metadata  : { name: 'Alice Device X' },
          didMethod : 'jwk'
        });

        const protocol = 'http://example.com/protocol';

        const fooGrants = await GrantsUtil.createRecordsGrants({
          grantorAgent : aliceAgent.agent,
          granteeAgent : appAgent.agent,
          grantor      : alice.did.uri,
          grantee      : aliceDeviceX.did.uri,
          protocol,
          protocolPath : 'foo'
        });

        const barGrants = await GrantsUtil.createRecordsGrants({
          grantorAgent : aliceAgent.agent,
          granteeAgent : appAgent.agent,
          grantor      : alice.did.uri,
          grantee      : aliceDeviceX.did.uri,
          protocol,
          protocolPath : 'foo/bar'
        });

        const fetchedGrants = await appAgent.agent.dwn.fetchGrants({ grantor: alice.did.uri, grantee: aliceDeviceX.did.uri });

        const writeFooGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType  : DwnInterface.RecordsWrite,
          protocol     : protocol,
          protocolPath : 'foo'
        }, fetchedGrants);

        expect(writeFooGrant?.message.recordId).to.equal(fooGrants.write.recordId);

        const readFooGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType  : DwnInterface.RecordsRead,
          protocol     : protocol,
          protocolPath : 'foo'
        }, fetchedGrants);

        expect(readFooGrant?.message.recordId).to.equal(fooGrants.read.recordId);

        const deleteFooGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType  : DwnInterface.RecordsDelete,
          protocol     : protocol,
          protocolPath : 'foo'
        }, fetchedGrants);

        expect(deleteFooGrant?.message.recordId).to.equal(fooGrants.delete.recordId);

        const queryGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType  : DwnInterface.RecordsQuery,
          protocol     : protocol,
          protocolPath : 'foo'
        }, fetchedGrants);

        expect(queryGrant?.message.recordId).to.equal(fooGrants.query.recordId);

        const subscribeGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType  : DwnInterface.RecordsSubscribe,
          protocol     : protocol,
          protocolPath : 'foo'
        }, fetchedGrants);

        expect(subscribeGrant?.message.recordId).to.equal(fooGrants.subscribe.recordId);

        const writeBarGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType  : DwnInterface.RecordsWrite,
          protocol     : protocol,
          protocolPath : 'foo/bar'
        }, fetchedGrants);

        expect(writeBarGrant?.message.recordId).to.equal(barGrants.write.recordId);

        const noMatchGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType  : DwnInterface.RecordsWrite,
          protocol     : protocol,
          protocolPath : 'bar'
        }, fetchedGrants);

        expect(noMatchGrant).to.be.undefined;
      });

      it('Records with contextId', async () => {
        const aliceDeviceX = await appAgent.agent.identity.create({
          store     : true,
          metadata  : { name: 'Alice Device X' },
          didMethod : 'jwk'
        });

        const protocol = 'http://example.com/protocol';

        const abcGrants = await GrantsUtil.createRecordsGrants({
          grantorAgent : aliceAgent.agent,
          granteeAgent : appAgent.agent,
          grantor      : alice.did.uri,
          grantee      : aliceDeviceX.did.uri,
          protocol,
          contextId    : 'abc'
        });

        const defGrants = await GrantsUtil.createRecordsGrants({
          grantorAgent : aliceAgent.agent,
          granteeAgent : appAgent.agent,
          grantor      : alice.did.uri,
          grantee      : aliceDeviceX.did.uri,
          protocol,
          contextId    : 'def/ghi'
        });

        const fetchedGrants = await appAgent.agent.dwn.fetchGrants({ grantor: alice.did.uri, grantee: aliceDeviceX.did.uri });

        const writeFooGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType : DwnInterface.RecordsWrite,
          protocol    : protocol,
          contextId   : 'abc'
        }, fetchedGrants);

        expect(writeFooGrant?.message.recordId).to.equal(abcGrants.write.recordId);

        const writeBarGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType : DwnInterface.RecordsWrite,
          protocol    : protocol,
          contextId   : 'def/ghi'
        }, fetchedGrants);

        expect(writeBarGrant?.message.recordId).to.equal(defGrants.write.recordId);

        const invalidGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType : DwnInterface.RecordsWrite,
          protocol    : protocol,
          contextId   : 'def'
        }, fetchedGrants);

        expect(invalidGrant).to.be.undefined;

        const withoutContextGrant = await matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
          messageType : DwnInterface.RecordsWrite,
          protocol    : protocol
        }, fetchedGrants);

        expect(withoutContextGrant).to.be.undefined;
      });
    });

    xdescribe('e2e grants tests', () => {
      let alice: BearerIdentity;
      let aliceDwn: PlatformAgentTestHarness;

      let aliceDeviceX: BearerIdentity;
      let aliceDeviceXDwn: PlatformAgentTestHarness;

      const exampleProtocol: ProtocolDefinition = {
        protocol  : 'http://example.com/protocol',
        published : true,
        types     : {
          foo    : {},
          bar    : {},
          baz    : {},
          parent : {},
          child  : {}
        },
        structure: {
          foo: {
            bar: {
              baz: {}
            }
          },
          parent: {
            child: {}
          }
        }
      };

      before(async () => {
        aliceDwn = await PlatformAgentTestHarness.setup({
          agentClass       : TestAgent,
          agentStores      : 'dwn',
          testDataLocation : '__TESTDATA__/alice' // Use a different data location to avoid locking.
        });

        aliceDeviceXDwn = await PlatformAgentTestHarness.setup({
          agentClass       : TestAgent,
          agentStores      : 'dwn',
          testDataLocation : '__TESTDATA__/deviceX' // Use a different data location to avoid locking.
        });
      });

      beforeEach(async () => {
        sinon.restore();

        await aliceDwn.clearStorage();
        await aliceDwn.createAgentDid();

        alice = await aliceDwn.agent.identity.create({
          metadata  : { name: 'Alice' },
          didMethod : 'jwk'
        });

        await aliceDeviceXDwn.clearStorage();
        await aliceDeviceXDwn.createAgentDid();

        aliceDeviceX = await aliceDeviceXDwn.agent.identity.create({
          metadata  : { name: 'Alice Device X' },
          didMethod : 'jwk'
        });
      });

      after(async () => {
        await aliceDwn.clearStorage();
        await aliceDwn.closeStorage();

        await aliceDeviceXDwn.clearStorage();
        await aliceDeviceXDwn.closeStorage();
      });

      xdescribe('e2e Message interface with grants', () => {
        let protocolConfig: DwnResponse<DwnInterface.ProtocolsConfigure>;

        beforeEach(async () => {
          // configure a protocol for aliceDeviceX to use to write to alice's DWN
          protocolConfig = await aliceDwn.agent.dwn.processRequest({
            store         : false, // no need to store the record in alice's DWN since it will be used in the device DWN
            author        : alice.did.uri,
            target        : alice.did.uri,
            messageType   : DwnInterface.ProtocolsConfigure,
            messageParams : {
              definition: exampleProtocol
            }
          });

          // process the protocol message on aliceDeviceX's DWN
          const protocolConfig1Reply = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : alice.did.uri,
            target      : alice.did.uri,
            messageType : DwnInterface.ProtocolsConfigure,
            rawMessage  : protocolConfig.message,
          });

          // confirm the protocol was configured
          expect(protocolConfig1Reply.reply.status.code).to.equal(202, 'protocol configured');
        });

        it('MessagesQuery', async () => {
          // scenario: Alice gives permission to the App's Identity to MessageQuery on her DWN,
          // alice then creates records and the app is able to query for them

          // create a MessagesQuery grant for aliceDeviceX
          const messagesQueryGrant = await aliceDwn.agent.dwn.createGrant({
            dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
            grantedFrom : alice.did.uri,
            grantedTo   : aliceDeviceX.did.uri,
            scope       : {
              interface : DwnInterfaceName.Messages,
              method    : DwnMethodName.Query,
            }
          });

          // process the grant on the deviceDWN as alice so the grant can be used during processing of messages which rely on the grant
          const messagesQueryReplyAlice = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : alice.did.uri,
            target      : alice.did.uri,
            messageType : DwnInterface.RecordsWrite,
            rawMessage  : messagesQueryGrant.recordsWrite.message,
            dataStream  : new Blob([ messagesQueryGrant.permissionGrantBytes ]),
          });
          expect(messagesQueryReplyAlice.reply.status.code).to.equal(202);

          // process the grant on the deviceDWN as aliceDeviceX so the grant can be used when signing messages
          const messagesQueryReplyDeviceX = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : aliceDeviceX.did.uri,
            target      : aliceDeviceX.did.uri,
            messageType : DwnInterface.RecordsWrite,
            rawMessage  : messagesQueryGrant.recordsWrite.message,
            dataStream  : new Blob([ messagesQueryGrant.permissionGrantBytes ]),
            signAsOwner : true
          });
          expect(messagesQueryReplyDeviceX.reply.status.code).to.equal(202);

          const record1Data = new Blob([ JSON.stringify({ message: 'Hello, Alice!' }) ]);

          // create some records related to the protocol
          const record1 = await aliceDwn.agent.dwn.processRequest({
            store         : false,
            author        : alice.did.uri,
            target        : alice.did.uri,
            messageType   : DwnInterface.RecordsWrite,
            messageParams : {
              protocol     : exampleProtocol.protocol,
              protocolPath : 'foo',
              dataFormat   : 'application/json',
            },
            dataStream: record1Data,
          });

          // process the record on aliceDeviceX's DWN
          const record1Reply = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : alice.did.uri,
            target      : alice.did.uri,
            messageType : DwnInterface.RecordsWrite,
            rawMessage  : record1.message,
            dataStream  : record1Data
          });
          expect(record1Reply.reply.status.code).to.equal(202, 'record 1 processed');

          const record2Data = new Blob([ JSON.stringify({ message: 'Hello, Alice Bar!' }) ]);

          const record2 = await aliceDwn.agent.dwn.processRequest({
            store         : false,
            author        : alice.did.uri,
            target        : alice.did.uri,
            messageType   : DwnInterface.RecordsWrite,
            messageParams : {
              protocol        : exampleProtocol.protocol,
              parentContextId : record1.message?.contextId,
              protocolPath    : 'foo/bar',
              dataFormat      : 'application/json',
            },
            dataStream: record2Data,
          });

          // process the record on aliceDeviceX's DWN
          const record2Reply = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : alice.did.uri,
            target      : alice.did.uri,
            messageType : DwnInterface.RecordsWrite,
            rawMessage  : record2.message,
            dataStream  : record2Data
          });
          expect(record2Reply.reply.status.code).to.equal(202, 'record 2 processed');

          // query for the messages using the grant
          const messagesQuery = await aliceDeviceXDwn.agent.dwn.processRequest({
            author        : alice.did.uri,
            target        : alice.did.uri,
            messageType   : DwnInterface.MessagesQuery,
            messageParams : {
              filters           : [],
              permissionGrantId : messagesQueryGrant.recordsWrite.message.recordId
            },
            granteeDid: aliceDeviceX.did.uri,
          });
          // Validate that the message was signed with the correct permission grant
          expect(messagesQuery.message).to.exist;
          const messagesQueryMessage = await MessagesQuery.parse(messagesQuery.message!);
          expect(messagesQueryMessage.signaturePayload?.permissionGrantId).to.equal(messagesQueryGrant.recordsWrite.message.recordId);
          // Validate that the message was signed by the grantee
          const signer = Message.getSigner(messagesQuery.message!);
          expect(signer).to.equal(aliceDeviceX.did.uri);

          // check the results of the query
          expect(messagesQuery.reply.status.code).to.equal(200);
          expect(messagesQuery.reply.entries?.length).to.equal(4); // grant, protocol, record1, record2

          expect(messagesQuery.reply.entries).to.have.members([
            await Message.getCid(messagesQueryGrant.recordsWrite.message),
            await Message.getCid(protocolConfig.message!),
            await Message.getCid(record1.message!),
            await Message.getCid(record2.message!)
          ]);
        });

        it('MessagesRead', async () => {
          // scenario: Alice gives permission to the App's Identity to MessageRead on her DWN,
          // alice then creates records and the app is able to read them

          // create a MessagesRead grant for aliceDeviceX
          const messagesReadGrant = await aliceDwn.agent.dwn.createGrant({
            dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
            grantedFrom : alice.did.uri,
            grantedTo   : aliceDeviceX.did.uri,
            scope       : {
              interface : DwnInterfaceName.Messages,
              method    : DwnMethodName.Read,
            }
          });

          // process the grant on the deviceDWN as alice so the grant can be used during processing of messages which rely on the grant
          const messagesReadReplyAlice = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : alice.did.uri,
            target      : alice.did.uri,
            messageType : DwnInterface.RecordsWrite,
            rawMessage  : messagesReadGrant.recordsWrite.message,
            dataStream  : new Blob([ messagesReadGrant.permissionGrantBytes ]),
          });
          expect(messagesReadReplyAlice.reply.status.code).to.equal(202);

          // process the grant on the deviceDWN as aliceDeviceX so the grant can be used when signing messages
          const messagesReadReplyDeviceX = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : aliceDeviceX.did.uri,
            target      : aliceDeviceX.did.uri,
            messageType : DwnInterface.RecordsWrite,
            rawMessage  : messagesReadGrant.recordsWrite.message,
            dataStream  : new Blob([ messagesReadGrant.permissionGrantBytes ]),
            signAsOwner : true
          });
          expect(messagesReadReplyDeviceX.reply.status.code).to.equal(202);

          // write a record with data to read
          const recordData = new Blob([ JSON.stringify({ message: 'Hello, Alice!' }) ]);

          const record = await aliceDwn.agent.dwn.processRequest({
            store         : false,
            author        : alice.did.uri,
            target        : alice.did.uri,
            messageType   : DwnInterface.RecordsWrite,
            messageParams : {
              protocol     : exampleProtocol.protocol,
              protocolPath : 'foo',
              dataFormat   : 'application/json',
            },
            dataStream: recordData,
          });

          // process the record on aliceDeviceX's DWN
          const recordReply = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : alice.did.uri,
            target      : alice.did.uri,
            messageType : DwnInterface.RecordsWrite,
            rawMessage  : record.message,
            dataStream  : recordData
          });
          expect(recordReply.reply.status.code).to.equal(202, 'record processed');

          // read the message associated with the record using the grant
          const messagesRead = await aliceDeviceXDwn.agent.dwn.processRequest({
            author        : alice.did.uri,
            target        : alice.did.uri,
            messageType   : DwnInterface.MessagesRead,
            messageParams : {
              messageCid        : await Message.getCid(record.message!),
              permissionGrantId : messagesReadGrant.recordsWrite.message.recordId
            },
            granteeDid: aliceDeviceX.did.uri,
          });
          // Validate that the message was signed with the correct permission grant
          expect(messagesRead.message).to.exist;
          const messagesReadMessage = await MessagesRead.parse(messagesRead.message!);
          expect(messagesReadMessage.signaturePayload?.permissionGrantId).to.equal(messagesReadGrant.recordsWrite.message.recordId);
          // Validate that the message was signed by the grantee
          const signer = Message.getSigner(messagesRead.message!);
          expect(signer).to.equal(aliceDeviceX.did.uri);

          // check the results of the read
          expect(messagesRead.reply.status.code).to.equal(200);
          expect(messagesRead.reply.entry).to.exist;
          const recordEntry = messagesRead.reply.entry?.message as RecordsWriteMessage;
          expect(recordEntry.recordId).to.equal(record.message?.recordId);

          // read the data from the record
          const data = messagesRead.reply.entry?.data;
          const readData= await NodeStream.consumeToText({ readable: data! });
          expect(readData).to.deep.equal(await recordData.text());
        });

        it('MessagesSubscribe', async () => {
          // scenario: Alice gives permission to the App's Identity to MessageSubscribe on her DWN,
          // alice then creates records and the app is able to subscribe to them

          // create a MessagesSubscribe grant for aliceDeviceX
          const messagesSubscribeGrant = await aliceDwn.agent.dwn.createGrant({
            dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
            grantedFrom : alice.did.uri,
            grantedTo   : aliceDeviceX.did.uri,
            scope       : {
              interface : DwnInterfaceName.Messages,
              method    : DwnMethodName.Subscribe,
            }
          });

          // process the grant on the deviceDWN as alice so the grant can be used during processing of messages which rely on the grant
          const messagesSubscribeReplyAlice = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : alice.did.uri,
            target      : alice.did.uri,
            messageType : DwnInterface.RecordsWrite,
            rawMessage  : messagesSubscribeGrant.recordsWrite.message,
            dataStream  : new Blob([ messagesSubscribeGrant.permissionGrantBytes ]),
          });
          expect(messagesSubscribeReplyAlice.reply.status.code).to.equal(202);

          // process the grant on the deviceDWN as aliceDeviceX so the grant can be used when signing messages
          const messagesSubscribeReplyDeviceX = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : aliceDeviceX.did.uri,
            target      : aliceDeviceX.did.uri,
            messageType : DwnInterface.RecordsWrite,
            rawMessage  : messagesSubscribeGrant.recordsWrite.message,
            dataStream  : new Blob([ messagesSubscribeGrant.permissionGrantBytes ]),
            signAsOwner : true
          });
          expect(messagesSubscribeReplyDeviceX.reply.status.code).to.equal(202);

          const receivedMessages: string[] = [];

          // subscribe using the grant
          const messagesSubscribe = await aliceDeviceXDwn.agent.dwn.processRequest({
            author        : alice.did.uri,
            target        : alice.did.uri,
            messageType   : DwnInterface.MessagesSubscribe,
            messageParams : {
              filters           : [],
              permissionGrantId : messagesSubscribeGrant.recordsWrite.message.recordId
            },
            granteeDid          : aliceDeviceX.did.uri,
            subscriptionHandler : async (event) => {
              const messageCid = await Message.getCid(event.message);
              receivedMessages.push(messageCid);
            }
          });

          // Validate that the message was signed with the correct permission grant
          expect(messagesSubscribe.message).to.exist;
          const messagesSubscribeMessage = await MessagesSubscribe.parse(messagesSubscribe.message!);
          expect(messagesSubscribeMessage.signaturePayload?.permissionGrantId).to.equal(messagesSubscribeGrant.recordsWrite.message.recordId);
          // Validate that the message was signed by the grantee
          const signer = Message.getSigner(messagesSubscribe.message!);
          expect(signer).to.equal(aliceDeviceX.did.uri);

          // write a record
          const recordData = new Blob([ JSON.stringify({ message: 'Hello, Alice!' }) ]);

          const record = await aliceDwn.agent.dwn.processRequest({
            store         : false,
            author        : alice.did.uri,
            target        : alice.did.uri,
            messageType   : DwnInterface.RecordsWrite,
            messageParams : {
              protocol     : exampleProtocol.protocol,
              protocolPath : 'foo',
              dataFormat   : 'application/json',
            },
            dataStream: recordData,
          });

          // process the record on aliceDeviceX's DWN
          const recordReply = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : alice.did.uri,
            target      : alice.did.uri,
            messageType : DwnInterface.RecordsWrite,
            rawMessage  : record.message,
            dataStream  : recordData
          });
          // confirm the record was processed
          expect(recordReply.reply.status.code).to.equal(202, 'record processed');
          await Poller.pollUntilSuccessOrTimeout(async () => {
            expect(receivedMessages).to.include(await Message.getCid(record.message!));
          });
        });

        describe('protocol scoped', () => {
          let secondProtocolConfig: DwnResponse<DwnInterface.ProtocolsConfigure>;

          beforeEach(async () => {
            // install a second protocol to compare
            // configure a protocol for aliceDeviceX to use to write to alice's DWN
            secondProtocolConfig = await aliceDwn.agent.dwn.processRequest({
              store         : false, // no need to store the record in alice's DWN since it will be used in the device DWN
              author        : alice.did.uri,
              target        : alice.did.uri,
              messageType   : DwnInterface.ProtocolsConfigure,
              messageParams : {
                definition: {
                  ...exampleProtocol,
                  protocol: 'http://example.com/second-protocol'
                }
              }
            });

            // process the protocol message on aliceDeviceX's DWN
            const protocolConfig1Reply = await aliceDeviceXDwn.agent.dwn.processRequest({
              author      : alice.did.uri,
              target      : alice.did.uri,
              messageType : DwnInterface.ProtocolsConfigure,
              rawMessage  : secondProtocolConfig.message,
            });

            // confirm the protocol was configured
            expect(protocolConfig1Reply.reply.status.code).to.equal(202, 'protocol configured');
          });

          it('MessagesQuery', async () => {
            // scenario: Alice gives permission to the App's Identity to MessageQuery on her DWN scoped to a specific protocol,
            // alice then creates records for both the scoped protocol, as well as for a second protocol,
            // the app is able to query for the records related to the protocol the grant was scoped to

            // create a MessagesQuery grant for aliceDeviceX
            const messagesQueryGrant = await aliceDwn.agent.dwn.createGrant({
              dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
              grantedFrom : alice.did.uri,
              grantedTo   : aliceDeviceX.did.uri,
              scope       : {
                interface : DwnInterfaceName.Messages,
                method    : DwnMethodName.Query,
                protocol  : exampleProtocol.protocol
              }
            });

            // process the grant on the deviceDWN as alice so the grant can be used during processing of messages which rely on the grant
            const messagesQueryReplyAlice = await aliceDeviceXDwn.agent.dwn.processRequest({
              author      : alice.did.uri,
              target      : alice.did.uri,
              messageType : DwnInterface.RecordsWrite,
              rawMessage  : messagesQueryGrant.recordsWrite.message,
              dataStream  : new Blob([ messagesQueryGrant.permissionGrantBytes ]),
            });
            expect(messagesQueryReplyAlice.reply.status.code).to.equal(202);

            // process the grant on the deviceDWN as aliceDeviceX so the grant can be used when signing messages
            const messagesQueryReplyDeviceX = await aliceDeviceXDwn.agent.dwn.processRequest({
              author      : aliceDeviceX.did.uri,
              target      : aliceDeviceX.did.uri,
              messageType : DwnInterface.RecordsWrite,
              rawMessage  : messagesQueryGrant.recordsWrite.message,
              dataStream  : new Blob([ messagesQueryGrant.permissionGrantBytes ]),
              signAsOwner : true
            });
            expect(messagesQueryReplyDeviceX.reply.status.code).to.equal(202);

            const record1Data = new Blob([ JSON.stringify({ message: 'Hello, Alice!' }) ]);

            // create some records related to the protocol
            const record1 = await aliceDwn.agent.dwn.processRequest({
              store         : false,
              author        : alice.did.uri,
              target        : alice.did.uri,
              messageType   : DwnInterface.RecordsWrite,
              messageParams : {
                protocol     : exampleProtocol.protocol,
                protocolPath : 'foo',
                dataFormat   : 'application/json',
              },
              dataStream: record1Data,
            });

            // process the record on aliceDeviceX's DWN
            const record1Reply = await aliceDeviceXDwn.agent.dwn.processRequest({
              author      : alice.did.uri,
              target      : alice.did.uri,
              messageType : DwnInterface.RecordsWrite,
              rawMessage  : record1.message,
              dataStream  : record1Data
            });
            expect(record1Reply.reply.status.code).to.equal(202, 'record 1 processed');

            const record2Data = new Blob([ JSON.stringify({ message: 'Hello, Alice Bar!' }) ]);

            const record2 = await aliceDwn.agent.dwn.processRequest({
              store         : false,
              author        : alice.did.uri,
              target        : alice.did.uri,
              messageType   : DwnInterface.RecordsWrite,
              messageParams : {
                protocol        : exampleProtocol.protocol,
                parentContextId : record1.message?.contextId,
                protocolPath    : 'foo/bar',
                dataFormat      : 'application/json',
              },
              dataStream: record2Data,
            });

            // process the record on aliceDeviceX's DWN
            const record2Reply = await aliceDeviceXDwn.agent.dwn.processRequest({
              author      : alice.did.uri,
              target      : alice.did.uri,
              messageType : DwnInterface.RecordsWrite,
              rawMessage  : record2.message,
              dataStream  : record2Data
            });
            expect(record2Reply.reply.status.code).to.equal(202, 'record 2 processed');

            // create a record for the second protocol
            const record3 = await aliceDwn.agent.dwn.processRequest({
              store         : false,
              author        : alice.did.uri,
              target        : alice.did.uri,
              messageType   : DwnInterface.RecordsWrite,
              messageParams : {
                protocol     : secondProtocolConfig.message!.descriptor.definition.protocol,
                protocolPath : 'foo',
                dataFormat   : 'application/json',
              },
              dataStream: record1Data,
            });

            // process the record on aliceDeviceX's DWN
            const record3Reply = await aliceDeviceXDwn.agent.dwn.processRequest({
              author      : alice.did.uri,
              target      : alice.did.uri,
              messageType : DwnInterface.RecordsWrite,
              rawMessage  : record3.message,
              dataStream  : record1Data
            });
            expect(record3Reply.reply.status.code).to.equal(202, 'record 3 processed');

            // query for the messages using the grant
            const messagesQuery = await aliceDeviceXDwn.agent.dwn.processRequest({
              author        : alice.did.uri,
              target        : alice.did.uri,
              messageType   : DwnInterface.MessagesQuery,
              messageParams : {
                filters: [{
                  protocol: exampleProtocol.protocol
                }],
                permissionGrantId: messagesQueryGrant.recordsWrite.message.recordId
              },
              granteeDid: aliceDeviceX.did.uri,
            });

            // Validate that the message was signed with the correct permission grant
            expect(messagesQuery.message).to.exist;
            const messagesQueryMessage = await MessagesQuery.parse(messagesQuery.message!);
            expect(messagesQueryMessage.signaturePayload?.permissionGrantId).to.equal(messagesQueryGrant.recordsWrite.message.recordId);
            // Validate that the message was signed by the grantee
            const signer = Message.getSigner(messagesQuery.message!);
            expect(signer).to.equal(aliceDeviceX.did.uri);

            // check the results of the query
            expect(messagesQuery.reply.status.code).to.equal(200);
            expect(messagesQuery.reply.entries?.length).to.equal(4); // grant, protocol, record1, record2

            expect(messagesQuery.reply.entries).to.have.members([
              await Message.getCid(messagesQueryGrant.recordsWrite.message),
              await Message.getCid(protocolConfig.message!),
              await Message.getCid(record1.message!),
              await Message.getCid(record2.message!)
            ]);

            // query for the messages using the grant for the second protocol
            const messagesQuery2 = await aliceDeviceXDwn.agent.dwn.processRequest({
              author        : alice.did.uri,
              target        : alice.did.uri,
              messageType   : DwnInterface.MessagesQuery,
              messageParams : {
                filters: [{
                  protocol: secondProtocolConfig.message!.descriptor.definition.protocol
                }],
                permissionGrantId: messagesQueryGrant.recordsWrite.message.recordId
              },
              granteeDid: aliceDeviceX.did.uri,
            });

            // Validate that the message was signed with the correct permission grant
            expect(messagesQuery2.message).to.exist;
            const messagesQueryMessage2 = await MessagesQuery.parse(messagesQuery2.message!);
            expect(messagesQueryMessage2.signaturePayload?.permissionGrantId).to.equal(messagesQueryGrant.recordsWrite.message.recordId);
            // Validate that the message was signed by the grantee
            const signer2 = Message.getSigner(messagesQuery2.message!);
            expect(signer2).to.equal(aliceDeviceX.did.uri);

            // validate that the query was unauthorized
            expect(messagesQuery2.reply.status.code).to.equal(401);
          });

          it('MessagesRead', async () => {
            // scenario: Alice gives permission to the App's Identity to MessageRead on her DWN scoped to a specific protocol,
            // alice then creates records for both the scoped protocol, as well as for a second protocol,
            // the app is able to read the records related to the protocol the grant was scoped to

            // create a MessagesRead grant for aliceDeviceX
            const messagesReadGrant = await aliceDwn.agent.dwn.createGrant({
              dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
              grantedFrom : alice.did.uri,
              grantedTo   : aliceDeviceX.did.uri,
              scope       : {
                interface : DwnInterfaceName.Messages,
                method    : DwnMethodName.Read,
                protocol  : exampleProtocol.protocol
              }
            });

            // process the grant on the deviceDWN as alice so the grant can be used during processing of messages which rely on the grant
            const messagesReadReplyAlice = await aliceDeviceXDwn.agent.dwn.processRequest({
              author      : alice.did.uri,
              target      : alice.did.uri,
              messageType : DwnInterface.RecordsWrite,
              rawMessage  : messagesReadGrant.recordsWrite.message,
              dataStream  : new Blob([ messagesReadGrant.permissionGrantBytes ]),
            });
            expect(messagesReadReplyAlice.reply.status.code).to.equal(202);

            // process the grant on the deviceDWN as aliceDeviceX so the grant can be used when signing messages
            const messagesReadReplyDeviceX = await aliceDeviceXDwn.agent.dwn.processRequest({
              author      : aliceDeviceX.did.uri,
              target      : aliceDeviceX.did.uri,
              messageType : DwnInterface.RecordsWrite,
              rawMessage  : messagesReadGrant.recordsWrite.message,
              dataStream  : new Blob([ messagesReadGrant.permissionGrantBytes ]),
              signAsOwner : true
            });
            expect(messagesReadReplyDeviceX.reply.status.code).to.equal(202);

            // write a record with data to read
            const recordData = new Blob([ JSON.stringify({ message: 'Hello, Alice!' }) ]);

            const record = await aliceDwn.agent.dwn.processRequest({
              store         : false,
              author        : alice.did.uri,
              target        : alice.did.uri,
              messageType   : DwnInterface.RecordsWrite,
              messageParams : {
                protocol     : exampleProtocol.protocol,
                protocolPath : 'foo',
                dataFormat   : 'application/json',
              },
              dataStream: recordData,
            });

            // process the record on aliceDeviceX's DWN
            const recordReply = await aliceDeviceXDwn.agent.dwn.processRequest({
              author      : alice.did.uri,
              target      : alice.did.uri,
              messageType : DwnInterface.RecordsWrite,
              rawMessage  : record.message,
              dataStream  : recordData
            });
            expect(recordReply.reply.status.code).to.equal(202, 'record processed');

            // create a record for the second protocol
            const record2 = await aliceDwn.agent.dwn.processRequest({
              store         : false,
              author        : alice.did.uri,
              target        : alice.did.uri,
              messageType   : DwnInterface.RecordsWrite,
              messageParams : {
                protocol     : secondProtocolConfig.message!.descriptor.definition.protocol,
                protocolPath : 'foo',
                dataFormat   : 'application/json',
              },
              dataStream: recordData,
            });

            // process the record on aliceDeviceX's DWN
            const record2Reply = await aliceDeviceXDwn.agent.dwn.processRequest({
              author      : alice.did.uri,
              target      : alice.did.uri,
              messageType : DwnInterface.RecordsWrite,
              rawMessage  : record2.message,
              dataStream  : recordData
            });
            expect(record2Reply.reply.status.code).to.equal(202, 'record 2 processed');

            // read the message associated with the record using the grant
            const messagesRead = await aliceDeviceXDwn.agent.dwn.processRequest({
              author        : alice.did.uri,
              target        : alice.did.uri,
              messageType   : DwnInterface.MessagesRead,
              messageParams : {
                messageCid        : await Message.getCid(record.message!),
                permissionGrantId : messagesReadGrant.recordsWrite.message.recordId,
              },
              granteeDid: aliceDeviceX.did.uri,
            });

            // Validate that the message was signed with the correct permission grant
            expect(messagesRead.message).to.exist;
            const messagesReadMessage = await MessagesRead.parse(messagesRead.message!);
            expect(messagesReadMessage.signaturePayload?.permissionGrantId).to.equal(messagesReadGrant.recordsWrite.message.recordId);
            // Validate that the message was signed by the grantee
            const signer = Message.getSigner(messagesRead.message!);
            expect(signer).to.equal(aliceDeviceX.did.uri);

            // check the results of the read
            expect(messagesRead.reply.status.code).to.equal(200);
            expect(messagesRead.reply.entry).to.exist;
            const recordEntry = messagesRead.reply.entry?.message as RecordsWriteMessage;
            expect(recordEntry.recordId).to.equal(record.message?.recordId);

            // create a message for the second protocol to read
            const messagesReadWrongProtocol = await aliceDeviceXDwn.agent.dwn.processRequest({
              author        : alice.did.uri,
              target        : alice.did.uri,
              messageType   : DwnInterface.MessagesRead,
              messageParams : {
                messageCid        : await Message.getCid(record2.message!),
                permissionGrantId : messagesReadGrant.recordsWrite.message.recordId,
              },
              granteeDid: aliceDeviceX.did.uri,
            });

            // check the results of the read
            expect(messagesReadWrongProtocol.reply.status.code).to.equal(401);
          });

          it('MessagesSubscribe', async () => {
            // scenario: Alice gives permission to the App's Identity to MessageSubscribe on her DWN scoped to a specific protocol,
            // alice then creates records for both the scoped protocol, as well as for a second protocol,
            // the app is able to subscribe to the records related to the protocol the grant was scoped to

            // create a MessagesSubscribe grant for aliceDeviceX
            const messagesSubscribeGrant = await aliceDwn.agent.dwn.createGrant({
              dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
              grantedFrom : alice.did.uri,
              grantedTo   : aliceDeviceX.did.uri,
              scope       : {
                interface : DwnInterfaceName.Messages,
                method    : DwnMethodName.Subscribe,
                protocol  : exampleProtocol.protocol
              }
            });

            // process the grant on the deviceDWN as alice so the grant can be used during processing of messages which rely on the grant
            const messagesSubscribeReplyAlice = await aliceDeviceXDwn.agent.dwn.processRequest({
              author      : alice.did.uri,
              target      : alice.did.uri,
              messageType : DwnInterface.RecordsWrite,
              rawMessage  : messagesSubscribeGrant.recordsWrite.message,
              dataStream  : new Blob([ messagesSubscribeGrant.permissionGrantBytes ]),
            });
            expect(messagesSubscribeReplyAlice.reply.status.code).to.equal(202);

            // process the grant on the deviceDWN as aliceDeviceX so the grant can be used when signing messages
            const messagesSubscribeReplyDeviceX = await aliceDeviceXDwn.agent.dwn.processRequest({
              author      : aliceDeviceX.did.uri,
              target      : aliceDeviceX.did.uri,
              messageType : DwnInterface.RecordsWrite,
              rawMessage  : messagesSubscribeGrant.recordsWrite.message,
              dataStream  : new Blob([ messagesSubscribeGrant.permissionGrantBytes ]),
              signAsOwner : true
            });

            expect(messagesSubscribeReplyDeviceX.reply.status.code).to.equal(202);

            const receivedMessages: string[] = [];

            // subscribe using the grant
            const messagesSubscribe = await aliceDeviceXDwn.agent.dwn.processRequest({
              author        : alice.did.uri,
              target        : alice.did.uri,
              messageType   : DwnInterface.MessagesSubscribe,
              messageParams : {
                filters: [{
                  protocol: exampleProtocol.protocol
                }],
                permissionGrantId: messagesSubscribeGrant.recordsWrite.message.recordId
              },
              granteeDid          : aliceDeviceX.did.uri,
              subscriptionHandler : async (event) => {
                const messageCid = await Message.getCid(event.message);
                receivedMessages.push(messageCid);
              }
            });

            // Validate that the message was signed with the correct permission grant
            expect(messagesSubscribe.message).to.exist;
            const messagesSubscribeMessage = await MessagesSubscribe.parse(messagesSubscribe.message!);
            expect(messagesSubscribeMessage.signaturePayload?.permissionGrantId).to.equal(messagesSubscribeGrant.recordsWrite.message.recordId);
            // Validate that the message was signed by the grantee
            const signer = Message.getSigner(messagesSubscribe.message!);
            expect(signer).to.equal(aliceDeviceX.did.uri);

            // write a record
            const recordData = new Blob([ JSON.stringify({ message: 'Hello, Alice!' }) ]);

            const record = await aliceDwn.agent.dwn.processRequest({
              store         : false,
              author        : alice.did.uri,
              target        : alice.did.uri,
              messageType   : DwnInterface.RecordsWrite,
              messageParams : {
                protocol     : exampleProtocol.protocol,
                protocolPath : 'foo',
                dataFormat   : 'application/json',
              },
              dataStream: recordData,
            });

            // process the record on aliceDeviceX's DWN
            const recordReply = await aliceDeviceXDwn.agent.dwn.processRequest({
              author      : alice.did.uri,
              target      : alice.did.uri,
              messageType : DwnInterface.RecordsWrite,
              rawMessage  : record.message,
              dataStream  : recordData
            });

            // confirm the record was processed
            expect(recordReply.reply.status.code).to.equal(202, 'record processed');

            // create a record for the second protocol
            const record2 = await aliceDwn.agent.dwn.processRequest({
              store         : false,
              author        : alice.did.uri,
              target        : alice.did.uri,
              messageType   : DwnInterface.RecordsWrite,
              messageParams : {
                protocol     : secondProtocolConfig.message!.descriptor.definition.protocol,
                protocolPath : 'foo',
                dataFormat   : 'application/json',
              },
              dataStream: recordData,
            });

            // process the record on aliceDeviceX's DWN
            const record2Reply = await aliceDeviceXDwn.agent.dwn.processRequest({
              author      : alice.did.uri,
              target      : alice.did.uri,
              messageType : DwnInterface.RecordsWrite,
              rawMessage  : record2.message,
              dataStream  : recordData
            });

            // confirm the record was processed
            expect(record2Reply.reply.status.code).to.equal(202, 'record 2 processed');

            // wait for the subscription to receive the message
            await Poller.pollUntilSuccessOrTimeout(async () => {
              expect(receivedMessages).to.include(await Message.getCid(record.message!));
              expect(receivedMessages).to.not.include(await Message.getCid(record2.message!));
            });

            // attempt to subscribe to the second protocol
            const receivedMessages2: string[] = [];

            // subscribe using the grant for protocol 1
            const messagesSubscribe2 = await aliceDeviceXDwn.agent.dwn.processRequest({
              author        : alice.did.uri,
              target        : alice.did.uri,
              messageType   : DwnInterface.MessagesSubscribe,
              messageParams : {
                filters: [{
                  protocol: secondProtocolConfig.message!.descriptor.definition.protocol
                }],
                permissionGrantId: messagesSubscribeGrant.recordsWrite.message.recordId
              },
              granteeDid          : aliceDeviceX.did.uri,
              subscriptionHandler : async (event) => {
                const messageCid = await Message.getCid(event.message);
                receivedMessages2.push(messageCid);
              }
            });


            // check the results of the subscribe
            expect(messagesSubscribe2.reply.status.code).to.equal(401);
          });
        });
      });

      xdescribe('e2e Protocol interface with grants', () => {
        xit('ProtocolsConfigure');

        it('ProtocolsQuery', async () => {
          // scenario: Alice gives permission to the App's Identity to ProtocolQuery on her DWN,
          // alice then creates protocols and the app is able to query for them

          // create a ProtocolsQuery grant for aliceDeviceX
          const protocolsQueryGrant = await aliceDwn.agent.dwn.createGrant({
            dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
            grantedFrom : alice.did.uri,
            grantedTo   : aliceDeviceX.did.uri,
            scope       : {
              interface : DwnInterfaceName.Protocols,
              method    : DwnMethodName.Query,
            }
          });

          // process the grant on the deviceDWN as alice so the grant can be used during processing of messages which rely on the grant
          const protocolsQueryReplyAlice = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : alice.did.uri,
            target      : alice.did.uri,
            messageType : DwnInterface.RecordsWrite,
            rawMessage  : protocolsQueryGrant.recordsWrite.message,
            dataStream  : new Blob([ protocolsQueryGrant.permissionGrantBytes ]),
          });
          expect(protocolsQueryReplyAlice.reply.status.code).to.equal(202);

          // process the grant on the deviceDWN as aliceDeviceX so the grant can be used when signing messages
          const protocolsQueryReplyDeviceX = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : aliceDeviceX.did.uri,
            target      : aliceDeviceX.did.uri,
            messageType : DwnInterface.RecordsWrite,
            rawMessage  : protocolsQueryGrant.recordsWrite.message,
            dataStream  : new Blob([ protocolsQueryGrant.permissionGrantBytes ]),
            signAsOwner : true
          });
          expect(protocolsQueryReplyDeviceX.reply.status.code).to.equal(202);

          // create a protocol
          const protocol = await aliceDwn.agent.dwn.processRequest({
            store         : false,
            author        : alice.did.uri,
            target        : alice.did.uri,
            messageType   : DwnInterface.ProtocolsConfigure,
            messageParams : {
              definition: exampleProtocol
            }
          });

          // process the protocol on aliceDeviceX's DWN
          const protocolReply = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : alice.did.uri,
            target      : alice.did.uri,
            messageType : DwnInterface.ProtocolsConfigure,
            rawMessage  : protocol.message
          });
          // confirm the protocol was configured
          expect(protocolReply.reply.status.code).to.equal(202, 'protocol configured');

          // query for the protocols using the grant
          const protocolsQuery = await aliceDeviceXDwn.agent.dwn.processRequest({
            author        : alice.did.uri,
            target        : alice.did.uri,
            messageType   : DwnInterface.ProtocolsQuery,
            messageParams : {
              filter: {
                protocol: exampleProtocol.protocol
              },
              permissionGrantId: protocolsQueryGrant.recordsWrite.message.recordId
            },
            granteeDid: aliceDeviceX.did.uri,
          });

          // Validate that the message was signed with the correct permission grant
          expect(protocolsQuery.message).to.exist;
          const protocolsQueryMessage = await ProtocolsQuery.parse(protocolsQuery.message!);
          expect(protocolsQueryMessage.signaturePayload?.permissionGrantId).to.equal(protocolsQueryGrant.recordsWrite.message.recordId);
          // Validate that the message was signed by the grantee
          const signer = Message.getSigner(protocolsQuery.message!);
          expect(signer).to.equal(aliceDeviceX.did.uri);

          // check the results of the query
          expect(protocolsQuery.reply.status.code).to.equal(200);
          expect(protocolsQuery.reply.entries?.length).to.equal(1);
          expect(protocolsQuery.reply.entries).to.deep.equal([ protocol.message ]);
        });
      });

      xdescribe('e2e Records interface with grants', () => {

        beforeEach(async () => {
          // configure a protocol for aliceDeviceX to use to write to alice's DWN
          const protocolConfig = await aliceDwn.agent.dwn.processRequest({
            store         : false, // no need to store the record in alice's DWN since it will be used in the device DWN
            author        : alice.did.uri,
            target        : alice.did.uri,
            messageType   : DwnInterface.ProtocolsConfigure,
            messageParams : {
              definition: exampleProtocol
            }
          });

          // process the protocol message on aliceDeviceX's DWN
          const protocolConfig1Reply = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : alice.did.uri,
            target      : alice.did.uri,
            messageType : DwnInterface.ProtocolsConfigure,
            rawMessage  : protocolConfig.message,
          });
          // confirm the protocol was configured
          expect(protocolConfig1Reply.reply.status.code).to.equal(202, 'protocol configured');
        });

        it('RecordsDelete', async () => {
        // scenario: Alice gives permission to the App's Identity to RecordsDelete on her DWN,
        // alice then creates records and the app is able to delete them

          // create a RecordsDelete delegated grant for aliceDeviceX scoped to exampleProtocol
          const recordsDeleteGrant = await aliceDwn.agent.dwn.createGrant({
            dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
            grantedFrom : alice.did.uri,
            grantedTo   : aliceDeviceX.did.uri,
            delegated   : true, // grant is delegated
            scope       : {
              interface : DwnInterfaceName.Records,
              method    : DwnMethodName.Delete,
              protocol  : exampleProtocol.protocol,
            }
          });

          // process the grant on the deviceDWN as alice so the grant can be used during processing of messages which rely on the grant
          const recordsDeleteReplyAlice = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : alice.did.uri,
            target      : alice.did.uri,
            messageType : DwnInterface.RecordsWrite,
            rawMessage  : recordsDeleteGrant.recordsWrite.message,
            dataStream  : new Blob([ recordsDeleteGrant.permissionGrantBytes ]),
          });
          expect(recordsDeleteReplyAlice.reply.status.code).to.equal(202);

          // process the grant on the deviceDWN as aliceDeviceX so the grant can be used when signing messages
          const recordsDeleteReplyDeviceX = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : aliceDeviceX.did.uri,
            target      : aliceDeviceX.did.uri,
            messageType : DwnInterface.RecordsWrite,
            rawMessage  : recordsDeleteGrant.recordsWrite.message,
            dataStream  : new Blob([ recordsDeleteGrant.permissionGrantBytes ]),
            signAsOwner : true
          });
          expect(recordsDeleteReplyDeviceX.reply.status.code).to.equal(202);

          // write a record
          const recordData = new Blob([ JSON.stringify({ message: 'Hello, Alice!' }) ]);

          const record = await aliceDwn.agent.dwn.processRequest({
            store         : false,
            author        : alice.did.uri,
            target        : alice.did.uri,
            messageType   : DwnInterface.RecordsWrite,
            messageParams : {
              protocol     : exampleProtocol.protocol,
              protocolPath : 'foo',
              dataFormat   : 'application/json',
            },
            dataStream: recordData,
          });

          // process the record on aliceDeviceX's DWN
          const recordReply = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : alice.did.uri,
            target      : alice.did.uri,
            messageType : DwnInterface.RecordsWrite,
            rawMessage  : record.message,
            dataStream  : recordData
          });

          // confirm the record was processed
          expect(recordReply.reply.status.code).to.equal(202, 'record processed');

          // sanity: read the record to confirm it exists
          const readRecord = await aliceDwn.agent.dwn.processRequest({
            store         : false,
            author        : alice.did.uri,
            target        : alice.did.uri,
            messageType   : DwnInterface.RecordsRead,
            messageParams : {
              filter: {
                protocol : exampleProtocol.protocol,
                recordId : record.message?.recordId
              }
            }
          });

          // process the record read on aliceDeviceX's DWN
          const readRecordReply = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : alice.did.uri,
            target      : alice.did.uri,
            messageType : DwnInterface.RecordsRead,
            rawMessage  : readRecord.message
          });

          // confirm the record was read
          expect(readRecordReply.reply.status.code).to.equal(200, 'record read');
          expect(readRecordReply.reply.record).of.exist;
          expect(readRecordReply.reply.record!.recordId).to.equal(record.message?.recordId);

          // delete the record using the grant
          const recordsDelete = await aliceDeviceXDwn.agent.dwn.processRequest({
            author        : alice.did.uri,
            target        : alice.did.uri,
            messageType   : DwnInterface.RecordsDelete,
            messageParams : {
              recordId       : record.message!.recordId,
              delegatedGrant : recordsDeleteGrant.dataEncodedMessage,
            },
            granteeDid: aliceDeviceX.did.uri,
          });

          // Validate that the message was signed with the correct permission grant
          expect(recordsDelete.message).to.exist;
          const recordsDeleteMessage = await RecordsDelete.parse(recordsDelete.message!);
          expect(recordsDeleteMessage.message.authorization?.authorDelegatedGrant?.recordId).to.equal(recordsDeleteGrant.dataEncodedMessage.recordId, 'delegate record id');
          const delegateGrantId = await Message.getCid(recordsDeleteMessage.message.authorization!.authorDelegatedGrant!);
          expect(recordsDeleteMessage.signaturePayload?.delegatedGrantId).to.equal(delegateGrantId, 'delegate grant id');

          // attempt reading the record to confirm it was deleted
          const readRecordAfterDelete = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : alice.did.uri,
            target      : alice.did.uri,
            messageType : DwnInterface.RecordsRead,
            rawMessage  : readRecord.message
          });

          // confirm the record was not read
          expect(readRecordAfterDelete.reply.status.code).to.equal(404, 'record not found');
        });

        it('RecordsQuery', async () => {
        // scenario: Alice gives permission to the App's Identity to RecordsQuery on her DWN,
        // alice then creates records and the app is able to query for them

          // create a RecordsQuery grant for aliceDeviceX
          const recordsQueryGrant = await aliceDwn.agent.dwn.createGrant({
            dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
            grantedFrom : alice.did.uri,
            grantedTo   : aliceDeviceX.did.uri,
            scope       : {
              interface : DwnInterfaceName.Records,
              method    : DwnMethodName.Query,
              protocol  : exampleProtocol.protocol,
            },
            delegated: true
          });

          // process the grant on the deviceDWN as alice so the grant can be used during processing of messages which rely on the grant
          const recordsQueryReplyAlice = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : alice.did.uri,
            target      : alice.did.uri,
            messageType : DwnInterface.RecordsWrite,
            rawMessage  : recordsQueryGrant.recordsWrite.message,
            dataStream  : new Blob([ recordsQueryGrant.permissionGrantBytes ]),
          });
          expect(recordsQueryReplyAlice.reply.status.code).to.equal(202);

          // process the grant on the deviceDWN as aliceDeviceX so the grant can be used when signing messages
          const recordsQueryReplyDeviceX = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : aliceDeviceX.did.uri,
            target      : aliceDeviceX.did.uri,
            messageType : DwnInterface.RecordsWrite,
            rawMessage  : recordsQueryGrant.recordsWrite.message,
            dataStream  : new Blob([ recordsQueryGrant.permissionGrantBytes ]),
            signAsOwner : true
          });
          expect(recordsQueryReplyDeviceX.reply.status.code).to.equal(202);

          // write a record
          const recordData = new Blob([ JSON.stringify({ message: 'Hello, Alice!' }) ]);

          const record = await aliceDwn.agent.dwn.processRequest({
            store         : false,
            author        : alice.did.uri,
            target        : alice.did.uri,
            messageType   : DwnInterface.RecordsWrite,
            messageParams : {
              protocol     : exampleProtocol.protocol,
              protocolPath : 'foo',
              dataFormat   : 'application/json',
            },
            dataStream: recordData,
          });

          // process the record on aliceDeviceX's DWN
          const recordReply = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : alice.did.uri,
            target      : alice.did.uri,
            messageType : DwnInterface.RecordsWrite,
            rawMessage  : record.message,
            dataStream  : recordData
          });
          expect(recordReply.reply.status.code).to.equal(202, 'record processed');

          // write another record
          const record2Data = new Blob([ JSON.stringify({ message: 'Hello, Alice Bar!' }) ]);

          const record2 = await aliceDwn.agent.dwn.processRequest({
            store         : false,
            author        : alice.did.uri,
            target        : alice.did.uri,
            messageType   : DwnInterface.RecordsWrite,
            messageParams : {
              protocol        : exampleProtocol.protocol,
              parentContextId : record.message?.contextId,
              protocolPath    : 'foo/bar',
              dataFormat      : 'application/json',
            },
            dataStream: record2Data,
          });

          // process the record on aliceDeviceX's DWN
          const record2Reply = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : alice.did.uri,
            target      : alice.did.uri,
            messageType : DwnInterface.RecordsWrite,
            rawMessage  : record2.message,
            dataStream  : record2Data
          });

          // confirm the record was processed
          expect(record2Reply.reply.status.code).to.equal(202, 'record 2 processed');

          // query for the records using the grant
          const recordsQuery = await aliceDeviceXDwn.agent.dwn.processRequest({
            author        : alice.did.uri,
            target        : alice.did.uri,
            messageType   : DwnInterface.RecordsQuery,
            messageParams : {
              filter: {
                protocol: exampleProtocol.protocol
              },
              delegatedGrant: recordsQueryGrant.dataEncodedMessage
            },
            granteeDid: aliceDeviceX.did.uri,
          });

          // Validate that the message was signed with the correct permission grant
          expect(recordsQuery.message).to.exist;
          const recordsQueryMessage = await RecordsQuery.parse(recordsQuery.message!);
          expect(recordsQueryMessage.message.authorization?.authorDelegatedGrant?.recordId).to.equal(recordsQueryGrant.dataEncodedMessage.recordId, 'delegate record id');
          const delegateGrantId = await Message.getCid(recordsQueryMessage.message.authorization!.authorDelegatedGrant!);
          expect(recordsQueryMessage.signaturePayload?.delegatedGrantId).to.equal(delegateGrantId, 'delegate grant id');

          // check the results of the query
          expect(recordsQuery.reply.status.code).to.equal(200);
          expect(recordsQuery.reply.entries?.length).to.equal(2);
          expect(recordsQuery.reply.entries?.map(r => r.recordId)).to.deep.equal([
            record.message?.recordId,
            record2.message?.recordId
          ]);
        });

        it('RecordsRead', async () => {
        // scenario: Alice gives permission to the App's Identity to RecordsRead on her DWN,
        // alice then creates records and the app is able to read them

          // create a RecordsRead grant for aliceDeviceX
          const recordsReadGrant = await aliceDwn.agent.dwn.createGrant({
            dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
            grantedFrom : alice.did.uri,
            grantedTo   : aliceDeviceX.did.uri,
            scope       : {
              interface : DwnInterfaceName.Records,
              method    : DwnMethodName.Read,
              protocol  : exampleProtocol.protocol,
            },
            delegated: true
          });

          // process the grant on the deviceDWN as alice so the grant can be used during processing of messages which rely on the grant
          const recordsReadReplyAlice = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : alice.did.uri,
            target      : alice.did.uri,
            messageType : DwnInterface.RecordsWrite,
            rawMessage  : recordsReadGrant.recordsWrite.message,
            dataStream  : new Blob([ recordsReadGrant.permissionGrantBytes ]),
          });
          expect(recordsReadReplyAlice.reply.status.code).to.equal(202);

          // process the grant on the deviceDWN as aliceDeviceX so the grant can be used when signing messages
          const recordsReadReplyDeviceX = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : aliceDeviceX.did.uri,
            target      : aliceDeviceX.did.uri,
            messageType : DwnInterface.RecordsWrite,
            rawMessage  : recordsReadGrant.recordsWrite.message,
            dataStream  : new Blob([ recordsReadGrant.permissionGrantBytes ]),
            signAsOwner : true
          });
          expect(recordsReadReplyDeviceX.reply.status.code).to.equal(202);

          // write a record with data to read
          const recordData = new Blob([ JSON.stringify({ message: 'Hello, Alice!' }) ]);

          const record = await aliceDwn.agent.dwn.processRequest({
            store         : false,
            author        : alice.did.uri,
            target        : alice.did.uri,
            messageType   : DwnInterface.RecordsWrite,
            messageParams : {
              protocol     : exampleProtocol.protocol,
              protocolPath : 'foo',
              dataFormat   : 'application/json',
            },
            dataStream: recordData,
          });

          // process the record on aliceDeviceX's DWN
          const recordReply = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : alice.did.uri,
            target      : alice.did.uri,
            messageType : DwnInterface.RecordsWrite,
            rawMessage  : record.message,
            dataStream  : recordData
          });
          expect(recordReply.reply.status.code).to.equal(202, 'record processed');

          // read the record using the grant
          const recordsRead = await aliceDeviceXDwn.agent.dwn.processRequest({
            author        : alice.did.uri,
            target        : alice.did.uri,
            messageType   : DwnInterface.RecordsRead,
            messageParams : {
              filter: {
                recordId: record.message!.recordId
              },
              delegatedGrant: recordsReadGrant.dataEncodedMessage
            },
            granteeDid: aliceDeviceX.did.uri,
          });

          // Validate that the message was signed with the correct permission grant
          expect(recordsRead.message).to.exist;
          const recordsReadMessage = await RecordsRead.parse(recordsRead.message!);
          expect(recordsReadMessage.message.authorization?.authorDelegatedGrant?.recordId).to.equal(recordsReadGrant.dataEncodedMessage.recordId, 'delegate record id');
          const delegateGrantId = await Message.getCid(recordsReadMessage.message.authorization!.authorDelegatedGrant!);
          expect(recordsReadMessage.signaturePayload?.delegatedGrantId).to.equal(delegateGrantId, 'delegate grant id');
          // Validate that the message was signed by the grantee
          const signer = Message.getSigner(recordsRead.message!);
          expect(signer).to.equal(aliceDeviceX.did.uri);

          // check the results of the read
          expect(recordsRead.reply.status.code).to.equal(200);
          expect(recordsRead.reply.record).to.exist;
          expect(recordsRead.reply.record!.recordId).to.equal(record.message?.recordId);
        });

        it('RecordsSubscribe', async () => {
        // scenario: Alice gives permission to the App's Identity to RecordsSubscribe on her DWN,
        // alice then creates records and the app is able to subscribe to them

          // create a RecordsSubscribe grant for aliceDeviceX
          const recordsSubscribeGrant = await aliceDwn.agent.dwn.createGrant({
            dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
            grantedFrom : alice.did.uri,
            grantedTo   : aliceDeviceX.did.uri,
            scope       : {
              interface : DwnInterfaceName.Records,
              method    : DwnMethodName.Subscribe,
              protocol  : exampleProtocol.protocol,
            },
            delegated: true
          });

          // process the grant on the deviceDWN as alice so the grant can be used during processing of messages which rely on the grant
          const recordsSubscribeReplyAlice = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : alice.did.uri,
            target      : alice.did.uri,
            messageType : DwnInterface.RecordsWrite,
            rawMessage  : recordsSubscribeGrant.recordsWrite.message,
            dataStream  : new Blob([ recordsSubscribeGrant.permissionGrantBytes ]),
          });
          expect(recordsSubscribeReplyAlice.reply.status.code).to.equal(202);

          // process the grant on the deviceDWN as aliceDeviceX so the grant can be used when signing messages
          const recordsSubscribeReplyDeviceX = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : aliceDeviceX.did.uri,
            target      : aliceDeviceX.did.uri,
            messageType : DwnInterface.RecordsWrite,
            rawMessage  : recordsSubscribeGrant.recordsWrite.message,
            dataStream  : new Blob([ recordsSubscribeGrant.permissionGrantBytes ]),
            signAsOwner : true
          });
          expect(recordsSubscribeReplyDeviceX.reply.status.code).to.equal(202);

          // subscribe using the grant
          const receivedRecords: string[] = [];

          const recordsSubscribe = await aliceDeviceXDwn.agent.dwn.processRequest({
            author        : alice.did.uri,
            target        : alice.did.uri,
            messageType   : DwnInterface.RecordsSubscribe,
            messageParams : {
              filter: {
                protocol: exampleProtocol.protocol
              },
              delegatedGrant: recordsSubscribeGrant.dataEncodedMessage
            },
            granteeDid          : aliceDeviceX.did.uri,
            subscriptionHandler : async (event) => {
              const record = event.message as RecordsWriteMessage;
              receivedRecords.push(record.recordId);
            }
          });

          // Validate that the message was signed with the correct permission grant
          expect(recordsSubscribe.message).to.exist;
          const recordsSubscribeMessage = await RecordsSubscribe.parse(recordsSubscribe.message!);
          expect(recordsSubscribeMessage.message.authorization?.authorDelegatedGrant?.recordId).to.equal(recordsSubscribeGrant.dataEncodedMessage.recordId, 'delegate record id');
          const delegateGrantId = await Message.getCid(recordsSubscribeMessage.message.authorization!.authorDelegatedGrant!);
          expect(recordsSubscribeMessage.signaturePayload?.delegatedGrantId).to.equal(delegateGrantId, 'delegate grant id');
          // Validate that the message was signed by the grantee
          const signer = Message.getSigner(recordsSubscribe.message!);
          expect(signer).to.equal(aliceDeviceX.did.uri);

          // write a record
          const recordData = new Blob([ JSON.stringify({ message: 'Hello, Alice!' }) ]);

          const record = await aliceDwn.agent.dwn.processRequest({
            store         : false,
            author        : alice.did.uri,
            target        : alice.did.uri,
            messageType   : DwnInterface.RecordsWrite,
            messageParams : {
              protocol     : exampleProtocol.protocol,
              protocolPath : 'foo',
              dataFormat   : 'application/json',
            },
            dataStream: recordData,
          });

          // process the record on aliceDeviceX's DWN
          const recordReply = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : alice.did.uri,
            target      : alice.did.uri,
            messageType : DwnInterface.RecordsWrite,
            rawMessage  : record.message,
            dataStream  : recordData
          });
          // confirm the record was processed
          expect(recordReply.reply.status.code).to.equal(202, 'record processed');

          // check that the record was received
          await Poller.pollUntilSuccessOrTimeout(async () => {
            expect(receivedRecords).to.include(record.message?.recordId);
          });
        });

        it('RecordsWrite', async () => {
        // scenario: Alice gives permission to the App's Identity to RecordsWrite on her DWN,
        // alice then writes records and the app is able to write them

          // create a RecordsWrite grant for aliceDeviceX
          const recordsWriteGrant = await aliceDwn.agent.dwn.createGrant({
            dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
            grantedFrom : alice.did.uri,
            grantedTo   : aliceDeviceX.did.uri,
            scope       : {
              interface : DwnInterfaceName.Records,
              method    : DwnMethodName.Write,
              protocol  : exampleProtocol.protocol,
            },
            delegated: true
          });

          // process the grant on the deviceDWN as alice so the grant can be used during processing of messages which rely on the grant
          const recordsWriteReplyAlice = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : alice.did.uri,
            target      : alice.did.uri,
            messageType : DwnInterface.RecordsWrite,
            rawMessage  : recordsWriteGrant.recordsWrite.message,
            dataStream  : new Blob([ recordsWriteGrant.permissionGrantBytes ]),
          });
          expect(recordsWriteReplyAlice.reply.status.code).to.equal(202);

          // process the grant on the deviceDWN as aliceDeviceX so the grant can be used when signing messages
          const recordsWriteReplyDeviceX = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : aliceDeviceX.did.uri,
            target      : aliceDeviceX.did.uri,
            messageType : DwnInterface.RecordsWrite,
            rawMessage  : recordsWriteGrant.recordsWrite.message,
            dataStream  : new Blob([ recordsWriteGrant.permissionGrantBytes ]),
            signAsOwner : true
          });
          expect(recordsWriteReplyDeviceX.reply.status.code).to.equal(202);

          // write a record using the grant
          const recordData = new Blob([ JSON.stringify({ message: 'Hello, Alice!' }) ]);

          const record = await aliceDeviceXDwn.agent.dwn.processRequest({
            author        : alice.did.uri,
            target        : alice.did.uri,
            messageType   : DwnInterface.RecordsWrite,
            messageParams : {
              protocol       : exampleProtocol.protocol,
              protocolPath   : 'foo',
              dataFormat     : 'application/json',
              delegatedGrant : recordsWriteGrant.dataEncodedMessage
            },
            dataStream : recordData,
            granteeDid : aliceDeviceX.did.uri,
          });

          // Validate that the message was signed with the correct permission grant
          expect(record.message).to.exist;
          const recordMessage = await RecordsWrite.parse(record.message!);
          expect(recordMessage.message.authorization?.authorDelegatedGrant?.recordId).to.equal(recordsWriteGrant.dataEncodedMessage.recordId, 'delegate record id');
          const delegateGrantId = await Message.getCid(recordMessage.message.authorization!.authorDelegatedGrant!);
          expect(recordMessage.signaturePayload?.delegatedGrantId).to.equal(delegateGrantId, 'delegate grant id');
          // Validate that the message was signed by the grantee
          const signer = Message.getSigner(record.message!);
          expect(signer).to.equal(aliceDeviceX.did.uri);

          // check the results of the write
          expect(record.reply.status.code).to.equal(202);

          // sanity read the record
          const readRecord = await aliceDwn.agent.dwn.processRequest({
            store         : false,
            author        : alice.did.uri,
            target        : alice.did.uri,
            messageType   : DwnInterface.RecordsRead,
            messageParams : {
              filter: {
                recordId: record.message?.recordId,
              }
            }
          });

          // process the record read on aliceDeviceX's DWN
          const readRecordReply = await aliceDeviceXDwn.agent.dwn.processRequest({
            author      : alice.did.uri,
            target      : alice.did.uri,
            messageType : DwnInterface.RecordsRead,
            rawMessage  : readRecord.message
          });
          // confirm the record was read
          expect(readRecordReply.reply.status.code).to.equal(200, 'record read');
          expect(readRecordReply.reply.record).to.exist;
          expect(readRecordReply.reply.record!.recordId).to.equal(record.message?.recordId);
        });

        describe('scoped to a protocol path', () => {
          xit('RecordsDelete', async () => {
            // scenario: Alice gives permission to the App's Identity to RecordsDelete on her DWN for a specific protocol path,
            // alice then creates records and the app is able to delete them

            // create a RecordsDelete grant for aliceDeviceX scoped to exampleProtocol and 'foo'
            const recordsDeleteGrant = await aliceDwn.agent.dwn.createGrant({
              dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
              grantedFrom : alice.did.uri,
              grantedTo   : aliceDeviceX.did.uri,
              delegated   : true, // grant is delegated
              scope       : {
                interface    : DwnInterfaceName.Records,
                method       : DwnMethodName.Delete,
                protocol     : exampleProtocol.protocol,
                protocolPath : 'foo'
              }
            });

            // process the grant on the deviceDWN as alice so the grant can be used during processing of messages which rely on the grant
            const recordsDeleteReplyAlice = await aliceDeviceXDwn.agent.dwn.processRequest({
              author      : alice.did.uri,
              target      : alice.did.uri,
              messageType : DwnInterface.RecordsWrite,
              rawMessage  : recordsDeleteGrant.recordsWrite.message,
              dataStream  : new Blob([ recordsDeleteGrant.permissionGrantBytes ]),
            });
            // confirm the grant was processed
            expect(recordsDeleteReplyAlice.reply.status.code).to.equal(202);


            // process the grant on the deviceDWN as aliceDeviceX so the grant can be used when signing messages
            const recordsDeleteReplyDeviceX = await aliceDeviceXDwn.agent.dwn.processRequest({
              author      : aliceDeviceX.did.uri,
              target      : aliceDeviceX.did.uri,
              messageType : DwnInterface.RecordsWrite,
              rawMessage  : recordsDeleteGrant.recordsWrite.message,
              dataStream  : new Blob([ recordsDeleteGrant.permissionGrantBytes ]),
              signAsOwner : true
            });
            expect(recordsDeleteReplyDeviceX.reply.status.code).to.equal(202);

            // write a record with the protocol `foo` to be deleted
            const recordData = new Blob([ JSON.stringify({ message: 'Hello, Alice!' }) ]);

            const record = await aliceDwn.agent.dwn.processRequest({
              store         : false,
              author        : alice.did.uri,
              target        : alice.did.uri,
              messageType   : DwnInterface.RecordsWrite,
              messageParams : {
                protocol     : exampleProtocol.protocol,
                protocolPath : 'foo',
                dataFormat   : 'application/json',
              },
              dataStream: recordData,
            });

            // process the record on aliceDeviceX's DWN
            const recordReply = await aliceDeviceXDwn.agent.dwn.processRequest({
              author      : alice.did.uri,
              target      : alice.did.uri,
              messageType : DwnInterface.RecordsWrite,
              rawMessage  : record.message,
              dataStream  : recordData
            });

            // confirm the record was processed
            expect(recordReply.reply.status.code).to.equal(202, 'record processed');

            // Write a record with the protocol path `foo/bar` as a control test of a record that cannot be deleted using the grant
            const record2Data = new Blob([ JSON.stringify({ message: 'Hello, Alice Bar!' }) ]);

            const record2 = await aliceDwn.agent.dwn.processRequest({
              store         : false,
              author        : alice.did.uri,
              target        : alice.did.uri,
              messageType   : DwnInterface.RecordsWrite,
              messageParams : {
                protocol        : exampleProtocol.protocol,
                parentContextId : record.message?.contextId,
                protocolPath    : 'foo/bar',
                dataFormat      : 'application/json',
              },
              dataStream: record2Data,
            });

            // process the record on aliceDeviceX's DWN
            const record2Reply = await aliceDeviceXDwn.agent.dwn.processRequest({
              author      : alice.did.uri,
              target      : alice.did.uri,
              messageType : DwnInterface.RecordsWrite,
              rawMessage  : record2.message,
              dataStream  : record2Data
            });

            // confirm the record was processed
            expect(record2Reply.reply.status.code).to.equal(202, 'record 2 processed');

            // delete the record using the grant
            const recordsDelete = await aliceDeviceXDwn.agent.dwn.processRequest({
              author        : alice.did.uri,
              target        : alice.did.uri,
              messageType   : DwnInterface.RecordsDelete,
              messageParams : {
                recordId       : record.message!.recordId,
                delegatedGrant : recordsDeleteGrant.dataEncodedMessage,
              },
              granteeDid: aliceDeviceX.did.uri,
            });

            // Validate that the message was signed with the correct permission grant
            expect(recordsDelete.message).to.exist;
            const recordsDeleteMessage = await RecordsDelete.parse(recordsDelete.message!);
            expect(recordsDeleteMessage.message.authorization?.authorDelegatedGrant?.recordId).to.equal(recordsDeleteGrant.dataEncodedMessage.recordId, 'delegate record id');
            const delegateGrantId = await Message.getCid(recordsDeleteMessage.message.authorization!.authorDelegatedGrant!);
            expect(recordsDeleteMessage.signaturePayload?.delegatedGrantId).to.equal(delegateGrantId, 'delegate grant id');
            // Validate that the message was signed by the grantee
            const signer = Message.getSigner(recordsDelete.message!);
            expect(signer).to.equal(aliceDeviceX.did.uri);

            // attempt reading the record to confirm it was deleted
            const readRecordAfterDelete = await aliceDwn.agent.dwn.processRequest({
              store         : false,
              author        : alice.did.uri,
              target        : alice.did.uri,
              messageType   : DwnInterface.RecordsRead,
              messageParams : {
                filter: {
                  recordId: record.message!.recordId,
                }
              }
            });

            const readRecordAfterDeleteReply = await aliceDeviceXDwn.agent.dwn.processRequest({
              author      : alice.did.uri,
              target      : alice.did.uri,
              messageType : DwnInterface.RecordsRead,
              rawMessage  : readRecordAfterDelete.message
            });

            // confirm the record was not read
            expect(readRecordAfterDeleteReply.reply.status.code).to.equal(404, 'record not found');

            // control: attempt to delete a record that does not match the protocol path
            const recordDeleteWithIncorrectPath = await aliceDeviceXDwn.agent.dwn.processRequest({
              author        : alice.did.uri,
              target        : alice.did.uri,
              messageType   : DwnInterface.RecordsDelete,
              messageParams : {
                recordId       : record2.message!.recordId,
                delegatedGrant : recordsDeleteGrant.dataEncodedMessage,
              },
              granteeDid: aliceDeviceX.did.uri,
            });

            // should be unauthorized
            expect(recordDeleteWithIncorrectPath.reply.status.code).to.equal(401);

            // confirm the record was not deleted
            const readRecordAfterDeleteControl = await aliceDwn.agent.dwn.processRequest({
              store         : false,
              author        : alice.did.uri,
              target        : alice.did.uri,
              messageType   : DwnInterface.RecordsRead,
              messageParams : {
                filter: {
                  recordId: record2.message!.recordId,
                }
              }
            });

            const readRecordAfterDeleteControlReply = await aliceDeviceXDwn.agent.dwn.processRequest({
              author      : alice.did.uri,
              target      : alice.did.uri,
              messageType : DwnInterface.RecordsRead,
              rawMessage  : readRecordAfterDeleteControl.message
            });

            // confirm the record was read
            expect(readRecordAfterDeleteControlReply.reply.status.code).to.equal(200, 'record read');
          });
          xit('RecordsQuery');
          xit('RecordsRead');
          xit('RecordsSubscribe');
          xit('RecordsWrite');
        });

        describe('scoped to a contextId', () => {
          xit('RecordsDelete');
          xit('RecordsQuery');
          xit('RecordsRead');
          xit('RecordsSubscribe');
          xit('RecordsWrite');
        });
      });
    });
  });
});