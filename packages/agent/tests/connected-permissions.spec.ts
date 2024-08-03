import { DwnInterfaceName, DwnMethodName, Jws, Message, PermissionGrant, ProtocolDefinition, Time } from '@tbd54566975/dwn-sdk-js';

import type { BearerIdentity } from '../src/bearer-identity.js';

import { TestAgent } from './utils/test-agent.js';
import { DwnInterface, ProcessDwnRequest } from '../src/types/dwn.js';
import { testDwnUrl } from './utils/test-config.js';
import { PlatformAgentTestHarness } from '../src/test-harness.js';

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
  });
});