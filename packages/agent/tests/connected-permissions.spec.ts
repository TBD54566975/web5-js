import sinon from 'sinon';
import { expect } from 'chai';
import { DwnInterfaceName, DwnMethodName, Jws, Message, ProtocolDefinition, Time } from '@tbd54566975/dwn-sdk-js';

import type { BearerIdentity } from '../src/bearer-identity.js';

import { TestAgent } from './utils/test-agent.js';
import { DwnInterface, ProcessDwnRequest } from '../src/types/dwn.js';
import { testDwnUrl } from './utils/test-config.js';
import { PlatformAgentTestHarness } from '../src/test-harness.js';

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
    await aliceAgent.closeStorage();
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
      await aliceAgent.closeStorage();

      await appAgent.clearStorage();
      await appAgent.closeStorage();
    });


    it('creates and signs a message with a permission grant', async () => {
      // scenario: Alice gives permission to the App's Identity to MessageQuery on her DWN

      // app an appX identity and manages it within it's own agent
      // alice creates a permission grant for the appX identity to MessageQuery on her DWN
      // appX processes the permission grant
      // appX "registers" the delegate did with it's agent to use appX as the signer for alice's messages
      // appX is able to sign a MessagesQuery message using the permission grant
      // both alice's agent and appX's agent are able to verify the signature and process the message

      // create a new identity for deviceX
      const appX = await appAgent.agent.identity.create({
        store     : true,
        metadata  : { name: 'Device X' },
        didMethod : 'jwk'
      });

      await appAgent.agent.identity.manage({ portableIdentity: await appX.export() });

      // alice creates a permission grant
      const { recordsWrite: grantRecordsWrite, permissionGrantBytes } = await aliceAgent.agent.dwn.createGrant({
        grantedFrom : alice.did.uri,
        grantedTo   : appX.did.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : { interface: DwnInterfaceName.Messages, method: DwnMethodName.Query }
      });

      // alice stores and processes the permission grant on her DWN
      const { reply: aliceGrantReply } = await aliceAgent.agent.dwn.processRequest({
        messageType : DwnInterface.RecordsWrite,
        rawMessage  : grantRecordsWrite.message,
        author      : alice.did.uri,
        target      : alice.did.uri,
        dataStream  : new Blob([permissionGrantBytes]),
      });
      expect(aliceGrantReply.status.code).to.equal(202);


      // The App processes the permission grant given by Alice, so it can be accessible when using it
      const { reply: appAgentGrantReply } = await appAgent.agent.dwn.processRequest({
        messageType : DwnInterface.RecordsWrite,
        rawMessage  : grantRecordsWrite.message,
        author      : alice.did.uri,
        target      : alice.did.uri,
        dataStream  : new Blob([permissionGrantBytes]),
      });
      expect(appAgentGrantReply.status.code).to.equal(202);

      const writeGrantToGrantee: ProcessDwnRequest<DwnInterface.RecordsWrite> = {
        messageType : DwnInterface.RecordsWrite,
        rawMessage  : grantRecordsWrite.message,
        author      : appX.did.uri,
        target      : appX.did.uri,
        dataStream  : new Blob([permissionGrantBytes]),
        signAsOwner : true
      };

      const { reply: importGrantReply } = await appAgent.agent.dwn.processRequest(writeGrantToGrantee);
      expect(importGrantReply.status.code).to.equal(202);

      await appAgent.agent.vault.setGranteeDid(alice.did.uri, appX.did.uri);

      // Attempt to process the MessagesQuery locally.
      const { message: queryMessage, reply } = await appAgent.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.MessagesQuery,
        messageParams : {
          filters: [],
        }
      });
      const messageSignature = queryMessage!.authorization.signature.signatures[0];
      const signatureDid = Jws.getSignerDid(messageSignature);

      expect(signatureDid).to.equal(appX.did.uri);
      expect(reply.status.code).to.equal(200);
      expect(reply.entries?.length).to.equal(1); // the permission grant should exist
      expect(reply.entries![0]).to.equal(await Message.getCid(grantRecordsWrite.message));

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
      expect(aliceReply.entries).to.include(await Message.getCid(grantRecordsWrite.message));
    });

    xit('creates and signs a delegated grant RecordsWrite message', async () => {
      // Scenario: alice wants to grant permission to deviceX to Write to her DWN on her behalf
      // alice creates a deviceX identity and imports it into her agent
      // alice installs the protocol that deviceX will use to write to her DWN
      // alice creates a delegated permission grant for RecordsWrite for the protocol
      // alice processes the permission grant
      // alice "registers" the delegate did with her agent
      // alice's agent is able to sign with the new delegate did

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

      // create a new identity for deviceX
      const appX = await appAgent.agent.identity.create({
        store     : true,
        metadata  : { name: 'Device X' },
        didMethod : 'jwk'
      });

      await appAgent.agent.identity.manage({ portableIdentity: await appX.export() });

      // alice creates a delegated permission grant
      const { recordsWrite: grantRecordsWrite, permissionGrantBytes } = await aliceAgent.agent.dwn.createGrant({
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
        rawMessage  : grantRecordsWrite.message,
        author      : alice.did.uri,
        target      : alice.did.uri,
        dataStream  : new Blob([permissionGrantBytes]),
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
        rawMessage  : grantRecordsWrite.message,
        author      : appX.did.uri,
        target      : appX.did.uri,
        dataStream  : new Blob([permissionGrantBytes]),
        signAsOwner : true
      });
      expect(appAgentGrantReply.status.code).to.equal(202);

      // appX now attempts to write to alice's DWN using the delegated permission grant
      // create a new message to write to alice's DWN
      await appAgent.agent.vault.setGranteeDid(alice.did.uri, appX.did.uri);

      const data = new Blob([ 'Hello, Alice!' ]);
      const { message: delegatedWriteMessage, reply: delegatedWriteReply  } = await appAgent.agent.dwn.processRequest({
        messageType   : DwnInterface.RecordsWrite,
        messageParams : {
          protocol     : protocol.protocol,
          protocolPath : 'foo',
          dataFormat   : 'application/json',
        },
        author     : alice.did.uri,
        target     : alice.did.uri,
        dataStream : data,
      });
      expect(delegatedWriteReply.status.code).to.equal(202, 'delegated write');

      // write to alice's DWN
      const { reply: aliceReply } = await aliceAgent.agent.dwn.processRequest({
        messageType : DwnInterface.RecordsWrite,
        rawMessage  : delegatedWriteMessage,
        author      : alice.did.uri,
        target      : alice.did.uri,
        dataStream  : data,
      });
      expect(aliceReply.status.code).to.equal(202, 'delegated write to alice');

      // Records Read will not work because the permission grant is for RecordsWrite
      const { reply: delegatedReadReply } = await appAgent.agent.dwn.processRequest({
        messageType   : DwnInterface.RecordsRead,
        messageParams : {
          filter: {
            protocol     : protocol.protocol,
            protocolPath : 'foo'
          }
        },
        author : alice.did.uri,
        target : alice.did.uri,
      });
      expect(delegatedReadReply.status.code).to.equal(401, 'delegated read');

      // alice issues a delegated read permission grant
      const { recordsWrite: grantRecordsRead, permissionGrantBytes: readPermissionGrantBytes } = await aliceAgent.agent.dwn.createGrant({
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
      console.log('record read grant id', grantRecordsRead.message.recordId);

      // alice stores and processes the permission grant on her DWN
      const { reply: aliceGrantReadReply } = await aliceAgent.agent.dwn.processRequest({
        messageType : DwnInterface.RecordsWrite,
        rawMessage  : grantRecordsRead.message,
        author      : alice.did.uri,
        target      : alice.did.uri,
        dataStream  : new Blob([readPermissionGrantBytes]),
      });
      expect(aliceGrantReadReply.status.code).to.equal(202);

      // alice hands off the grant to the appX agent
      const { reply: appAgentGrantReadReply } = await appAgent.agent.dwn.processRequest({
        messageType : DwnInterface.RecordsWrite,
        rawMessage  : grantRecordsRead.message,
        author      : appX.did.uri,
        target      : appX.did.uri,
        dataStream  : new Blob([readPermissionGrantBytes]),
        signAsOwner : true
      });
      expect(appAgentGrantReadReply.status.code).to.equal(202);

      // appX now attempts to read the messages
      const { reply: delegatedReadReply2 } = await appAgent.agent.dwn.processRequest({
        messageType   : DwnInterface.RecordsRead,
        messageParams : {
          filter: {
            protocol     : protocol.protocol,
            protocolPath : 'foo'
          }
        },
        author : alice.did.uri,
        target : alice.did.uri,
      });
      console.log('detail', delegatedReadReply2.status.detail);
      expect(delegatedReadReply2.status.code).to.equal(200, 'delegated read ok');
      expect(delegatedReadReply2.record?.recordId).to.equal(delegatedWriteMessage?.recordId);
    });
  });
});