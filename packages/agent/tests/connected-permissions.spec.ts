import { DwnInterfaceName, DwnMethodName, Jws, Message, ProtocolDefinition, Time } from '@tbd54566975/dwn-sdk-js';

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
import { Convert } from '@web5/common';
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
      const messagesQueryGrant = await aliceAgent.agent.permissions.createGrant({
        store       : false,
        author      : alice.did.uri,
        grantedTo   : appX.did.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : { interface: DwnInterfaceName.Messages, method: DwnMethodName.Query }
      });

      // alice stores and processes the permission grant on her DWN
      const { encodedData: messagesQueryGrantData, ...messagesQueryGrantMessage } = messagesQueryGrant.message;
      const { reply: aliceGrantReply } = await aliceAgent.agent.dwn.processRequest({
        messageType : DwnInterface.RecordsWrite,
        rawMessage  : messagesQueryGrantMessage,
        author      : alice.did.uri,
        target      : alice.did.uri,
        dataStream  : new Blob([ Convert.base64Url(messagesQueryGrantData).toUint8Array() ]),
      });
      expect(aliceGrantReply.status.code).to.equal(202);

      // The App processes the permission grant given by Alice, so it can be accessible when using it
      const { reply: appAgentGrantReply } = await appAgent.agent.dwn.processRequest({
        messageType : DwnInterface.RecordsWrite,
        rawMessage  : messagesQueryGrantMessage,
        author      : alice.did.uri,
        target      : alice.did.uri,
        dataStream  : new Blob([ Convert.base64Url(messagesQueryGrantData).toUint8Array() ]),
      });
      expect(appAgentGrantReply.status.code).to.equal(202);

      const writeGrantToGrantee: ProcessDwnRequest<DwnInterface.RecordsWrite> = {
        messageType : DwnInterface.RecordsWrite,
        rawMessage  : messagesQueryGrantMessage,
        author      : appX.did.uri,
        target      : appX.did.uri,
        dataStream  : new Blob([ Convert.base64Url(messagesQueryGrantData).toUint8Array() ]),
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
          permissionGrantId : messagesQueryGrant.message.recordId
        },
        granteeDid: appX.did.uri,
      });
      const messageSignature = queryMessage!.authorization.signature.signatures[0];
      const signatureDid = Jws.getSignerDid(messageSignature);

      expect(signatureDid).to.equal(appX.did.uri);
      expect(reply.status.code).to.equal(200);
      expect(reply.entries?.length).to.equal(1); // the permission grant should exist
      expect(reply.entries![0]).to.equal(await Message.getCid(messagesQueryGrant.message));

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
      expect(aliceReply.entries).to.include(await Message.getCid(messagesQueryGrant.message));
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
      const recordsWriteGrant = await aliceAgent.agent.permissions.createGrant({
        author      : alice.did.uri,
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
      const { encodedData: recordsWriteGrantData, ...recordsWriteGrantMessage } = recordsWriteGrant.message;
      const { reply: aliceGrantReply } = await aliceAgent.agent.dwn.processRequest({
        messageType : DwnInterface.RecordsWrite,
        rawMessage  : recordsWriteGrantMessage,
        author      : alice.did.uri,
        target      : alice.did.uri,
        dataStream  : new Blob([ Convert.base64Url(recordsWriteGrantData).toUint8Array() ]),
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
        rawMessage  : recordsWriteGrantMessage,
        author      : appX.did.uri,
        target      : appX.did.uri,
        dataStream  : new Blob([ Convert.base64Url(recordsWriteGrantData).toUint8Array() ]),
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
          delegatedGrant : recordsWriteGrant.message
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
          delegatedGrant: recordsWriteGrant.message,
        },
        author     : alice.did.uri,
        target     : alice.did.uri,
        granteeDid : appX.did.uri,
      });
      expect(delegatedReadReply.status.code).to.equal(401, 'delegated read');

      // alice issues a delegated read permission grant
      const recordReadGrant = await aliceAgent.agent.permissions.createGrant({
        author      : alice.did.uri,
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
      const { encodedData: recordsReadGrantData, ...recordsReadGrantMessage } = recordReadGrant.message;
      const { reply: aliceGrantReadReply } = await aliceAgent.agent.dwn.processRequest({
        messageType : DwnInterface.RecordsWrite,
        rawMessage  : recordsReadGrantMessage,
        author      : alice.did.uri,
        target      : alice.did.uri,
        dataStream  : new Blob([ Convert.base64Url(recordsReadGrantData).toUint8Array() ]),
      });
      expect(aliceGrantReadReply.status.code).to.equal(202);

      // alice hands off the grant to the appX agent
      const { reply: appAgentGrantReadReply } = await appAgent.agent.dwn.processRequest({
        messageType : DwnInterface.RecordsWrite,
        rawMessage  : recordsReadGrantMessage,
        author      : appX.did.uri,
        target      : appX.did.uri,
        dataStream  : new Blob([ Convert.base64Url(recordsReadGrantData).toUint8Array() ]),
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
          delegatedGrant: recordReadGrant.message,
        },
        author     : alice.did.uri,
        target     : alice.did.uri,
        granteeDid : appX.did.uri,
      });
      expect(delegatedReadReply2.status.code).to.equal(200, 'delegated read ok');
      expect(delegatedReadReply2.record?.recordId).to.equal(delegatedWriteMessage?.recordId);
    });
  });
});