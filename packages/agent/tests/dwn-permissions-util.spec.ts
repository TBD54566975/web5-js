
import type { BearerIdentity } from '../src/bearer-identity.js';

import { TestAgent } from './utils/test-agent.js';
import { DwnInterface } from '../src/types/dwn.js';
import { testDwnUrl } from './utils/test-config.js';
import { PlatformAgentTestHarness } from '../src/test-harness.js';

import sinon from 'sinon';

import { expect } from 'chai';

// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';
import { GrantsUtil } from './utils/grants.js';
import { DwnPermissionsUtil } from '../src/dwn-permissions-util.js';
import { PermissionsProtocol } from '@tbd54566975/dwn-sdk-js';
// @ts-expect-error - globalThis.crypto and webcrypto are of different types.
if (!globalThis.crypto) globalThis.crypto = webcrypto;

let testDwnUrls: string[] = [testDwnUrl];

describe('DwnPermissionsUtil', () => {
  describe('permissionsProtocolParams', () => {
    it('returns correct params to use in a records message', async () => {
      const grantsParams = DwnPermissionsUtil.permissionsProtocolParams('grant');
      expect(grantsParams.protocol).to.equal(PermissionsProtocol.uri);
      expect(grantsParams.protocolPath).to.equal(PermissionsProtocol.grantPath);

      const revokeParams = DwnPermissionsUtil.permissionsProtocolParams('revoke');
      expect(revokeParams.protocol).to.equal(PermissionsProtocol.uri);
      expect(revokeParams.protocolPath).to.equal(PermissionsProtocol.revocationPath);

      const requestParams = DwnPermissionsUtil.permissionsProtocolParams('request');
      expect(requestParams.protocol).to.equal(PermissionsProtocol.uri);
      expect(requestParams.protocolPath).to.equal(PermissionsProtocol.requestPath);
    });
  });

  describe('matchGrantFromArray', () => {
    let aliceAgent: PlatformAgentTestHarness;
    let appAgent: PlatformAgentTestHarness;
    let alice: BearerIdentity;

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

      await aliceAgent.createAgentDid();
      await appAgent.createAgentDid();
    });

    after(async () => {
      sinon.restore();

      await aliceAgent.clearStorage();
      await aliceAgent.closeStorage();

      await appAgent.clearStorage();
      await appAgent.closeStorage();
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

      const deviceXRecordGrants = await GrantsUtil.createRecordsGrants({
        grantorAgent : aliceAgent.agent,
        granteeAgent : appAgent.agent,
        grantor      : alice.did.uri,
        grantee      : aliceDeviceX.did.uri,
        protocol
      });

      const deviceXGranteeGrants = [
        deviceXRecordGrants.write,
        deviceXRecordGrants.read,
        deviceXRecordGrants.delete,
        deviceXRecordGrants.query,
        deviceXRecordGrants.subscribe
      ];

      // attempt to match a grant with a different grantee, aliceDeviceY
      const notFoundGrantee = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceY.did.uri, {
        messageType: DwnInterface.RecordsWrite,
        protocol
      }, deviceXGranteeGrants);

      expect(notFoundGrantee).to.be.undefined;

      const deviceYRecordGrants = await GrantsUtil.createRecordsGrants({
        grantorAgent : appAgent.agent,
        granteeAgent : appAgent.agent,
        grantor      : aliceDeviceX.did.uri,
        grantee      : aliceDeviceY.did.uri,
        protocol
      });

      const deviceYGrantorGrants = [
        deviceYRecordGrants.write,
        deviceYRecordGrants.read,
        deviceYRecordGrants.delete,
        deviceYRecordGrants.query,
        deviceYRecordGrants.subscribe
      ];

      const notFoundGrantor = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceY.did.uri, {
        messageType: DwnInterface.RecordsWrite,
        protocol
      }, deviceYGrantorGrants);

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

      const aliceDeviceXMessageGrants = [
        messagesGrants.query,
        messagesGrants.read,
        messagesGrants.subscribe
      ];

      // control: match a grant without specifying delegated
      const queryGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType: DwnInterface.MessagesQuery,
      }, aliceDeviceXMessageGrants);

      expect(queryGrant?.message.recordId).to.equal(messagesGrants.query.recordId);

      // attempt to match non-delegated grant with delegated set to true
      const notFoundDelegated = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType: DwnInterface.MessagesQuery,
      }, aliceDeviceXMessageGrants, true);

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

      const deviceXRecordGrants = [
        recordsGrants.write,
        recordsGrants.read,
        recordsGrants.delete,
        recordsGrants.query,
        recordsGrants.subscribe
      ];

      // match a delegated grant
      const writeGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType: DwnInterface.RecordsWrite,
        protocol
      }, deviceXRecordGrants, true);

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

      const deviceXMessageGrants = [
        messageGrants.query,
        messageGrants.read,
        messageGrants.subscribe
      ];

      const queryGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType: DwnInterface.MessagesQuery,
      }, deviceXMessageGrants);

      expect(queryGrant?.message.recordId).to.equal(messageGrants.query.recordId);

      const readGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType: DwnInterface.MessagesRead,
      }, deviceXMessageGrants);

      expect(readGrant?.message.recordId).to.equal(messageGrants.read.recordId);

      const subscribeGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType: DwnInterface.MessagesSubscribe,
      }, deviceXMessageGrants);

      expect(subscribeGrant?.message.recordId).to.equal(messageGrants.subscribe.recordId);

      const invalidGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType: DwnInterface.RecordsQuery,
      }, deviceXMessageGrants);

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

      const deviceXMessageGrants = [
        protocolMessageGrants.query,
        protocolMessageGrants.read,
        protocolMessageGrants.subscribe,
        otherProtocolMessageGrants.query,
        otherProtocolMessageGrants.read,
        otherProtocolMessageGrants.subscribe
      ];

      const queryGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType: DwnInterface.MessagesQuery,
        protocol
      }, deviceXMessageGrants);

      expect(queryGrant?.message.recordId).to.equal(protocolMessageGrants.query.recordId);

      const readGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType: DwnInterface.MessagesRead,
        protocol
      }, deviceXMessageGrants);

      expect(readGrant?.message.recordId).to.equal(protocolMessageGrants.read.recordId);

      const subscribeGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType: DwnInterface.MessagesSubscribe,
        protocol
      }, deviceXMessageGrants);

      expect(subscribeGrant?.message.recordId).to.equal(protocolMessageGrants.subscribe.recordId);

      const invalidGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.MessagesQuery,
        protocol    : 'http://example.com/unknown-protocol'
      }, deviceXMessageGrants);

      expect(invalidGrant).to.be.undefined;

      const otherProtocolQueryGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.MessagesQuery,
        protocol    : otherProtocol
      }, deviceXMessageGrants);

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

      const deviceXRecordGrants = [
        protocol1Grants.write,
        protocol1Grants.read,
        protocol1Grants.delete,
        protocol1Grants.query,
        protocol1Grants.subscribe,
        otherProtocolGrants.write,
        otherProtocolGrants.read,
        otherProtocolGrants.delete,
        otherProtocolGrants.query,
        otherProtocolGrants.subscribe
      ];

      const writeGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsWrite,
        protocol    : protocol1
      }, deviceXRecordGrants);

      expect(writeGrant?.message.recordId).to.equal(protocol1Grants.write.recordId);

      const readGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsRead,
        protocol    : protocol1
      }, deviceXRecordGrants);

      expect(readGrant?.message.recordId).to.equal(protocol1Grants.read.recordId);

      const deleteGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsDelete,
        protocol    : protocol1
      }, deviceXRecordGrants);

      expect(deleteGrant?.message.recordId).to.equal(protocol1Grants.delete.recordId);

      const queryGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsQuery,
        protocol    : protocol1
      }, deviceXRecordGrants);

      expect(queryGrant?.message.recordId).to.equal(protocol1Grants.query.recordId);

      const subscribeGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsSubscribe,
        protocol    : protocol1
      }, deviceXRecordGrants);

      expect(subscribeGrant?.message.recordId).to.equal(protocol1Grants.subscribe.recordId);

      const queryGrantOtherProtocol = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsQuery,
        protocol    : protocol2
      }, deviceXRecordGrants);

      expect(queryGrantOtherProtocol?.message.recordId).to.equal(otherProtocolGrants.query.recordId);

      // unknown protocol
      const invalidGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsQuery,
        protocol    : 'http://example.com/unknown-protocol'
      }, deviceXRecordGrants);

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

      const protocolGrants = [
        fooGrants.write,
        fooGrants.read,
        fooGrants.delete,
        fooGrants.query,
        fooGrants.subscribe,
        barGrants.write,
        barGrants.read,
        barGrants.delete,
        barGrants.query,
        barGrants.subscribe
      ];

      const writeFooGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType  : DwnInterface.RecordsWrite,
        protocol     : protocol,
        protocolPath : 'foo'
      }, protocolGrants);

      expect(writeFooGrant?.message.recordId).to.equal(fooGrants.write.recordId);

      const readFooGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType  : DwnInterface.RecordsRead,
        protocol     : protocol,
        protocolPath : 'foo'
      }, protocolGrants);

      expect(readFooGrant?.message.recordId).to.equal(fooGrants.read.recordId);

      const deleteFooGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType  : DwnInterface.RecordsDelete,
        protocol     : protocol,
        protocolPath : 'foo'
      }, protocolGrants);

      expect(deleteFooGrant?.message.recordId).to.equal(fooGrants.delete.recordId);

      const queryGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType  : DwnInterface.RecordsQuery,
        protocol     : protocol,
        protocolPath : 'foo'
      }, protocolGrants);

      expect(queryGrant?.message.recordId).to.equal(fooGrants.query.recordId);

      const subscribeGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType  : DwnInterface.RecordsSubscribe,
        protocol     : protocol,
        protocolPath : 'foo'
      }, protocolGrants);

      expect(subscribeGrant?.message.recordId).to.equal(fooGrants.subscribe.recordId);

      const writeBarGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType  : DwnInterface.RecordsWrite,
        protocol     : protocol,
        protocolPath : 'foo/bar'
      }, protocolGrants);

      expect(writeBarGrant?.message.recordId).to.equal(barGrants.write.recordId);

      const noMatchGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType  : DwnInterface.RecordsWrite,
        protocol     : protocol,
        protocolPath : 'bar'
      }, protocolGrants);

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

      const contextGrants = [
        abcGrants.write,
        abcGrants.read,
        abcGrants.delete,
        abcGrants.query,
        abcGrants.subscribe,
        defGrants.write,
        defGrants.read,
        defGrants.delete,
        defGrants.query,
        defGrants.subscribe
      ];

      const writeFooGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsWrite,
        protocol    : protocol,
        contextId   : 'abc'
      }, contextGrants);

      expect(writeFooGrant?.message.recordId).to.equal(abcGrants.write.recordId);

      const writeBarGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsWrite,
        protocol    : protocol,
        contextId   : 'def/ghi'
      }, contextGrants);

      expect(writeBarGrant?.message.recordId).to.equal(defGrants.write.recordId);

      const invalidGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsWrite,
        protocol    : protocol,
        contextId   : 'def'
      }, contextGrants);

      expect(invalidGrant).to.be.undefined;

      const withoutContextGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsWrite,
        protocol    : protocol
      }, contextGrants);

      expect(withoutContextGrant).to.be.undefined;
    });
  });
});