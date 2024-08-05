
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
      const notFoundGrantee = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceY.did.uri, {
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

      const notFoundGrantor = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceY.did.uri, {
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
      const queryGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType: DwnInterface.MessagesQuery,
      }, fetchedGrants);

      expect(queryGrant?.message.recordId).to.equal(messagesGrants.query.recordId);

      // attempt to match non-delegated grant with delegated set to true
      const notFoundDelegated = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
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
      const writeGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
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

      const queryGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType: DwnInterface.MessagesQuery,
      }, fetchedGrants);

      expect(queryGrant?.message.recordId).to.equal(messageGrants.query.recordId);

      const readGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType: DwnInterface.MessagesRead,
      }, fetchedGrants);

      expect(readGrant?.message.recordId).to.equal(messageGrants.read.recordId);

      const subscribeGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType: DwnInterface.MessagesSubscribe,
      }, fetchedGrants);

      expect(subscribeGrant?.message.recordId).to.equal(messageGrants.subscribe.recordId);

      const invalidGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
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

      const queryGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType: DwnInterface.MessagesQuery,
        protocol
      }, fetchedGrants);

      expect(queryGrant?.message.recordId).to.equal(protocolMessageGrants.query.recordId);

      const readGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType: DwnInterface.MessagesRead,
        protocol
      }, fetchedGrants);

      expect(readGrant?.message.recordId).to.equal(protocolMessageGrants.read.recordId);

      const subscribeGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType: DwnInterface.MessagesSubscribe,
        protocol
      }, fetchedGrants);

      expect(subscribeGrant?.message.recordId).to.equal(protocolMessageGrants.subscribe.recordId);

      const invalidGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.MessagesQuery,
        protocol    : 'http://example.com/unknown-protocol'
      }, fetchedGrants);

      expect(invalidGrant).to.be.undefined;

      const otherProtocolQueryGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
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

      const writeGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsWrite,
        protocol    : protocol1
      }, fetchedGrants);

      expect(writeGrant?.message.recordId).to.equal(protocol1Grants.write.recordId);

      const readGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsRead,
        protocol    : protocol1
      }, fetchedGrants);

      expect(readGrant?.message.recordId).to.equal(protocol1Grants.read.recordId);

      const deleteGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsDelete,
        protocol    : protocol1
      }, fetchedGrants);

      expect(deleteGrant?.message.recordId).to.equal(protocol1Grants.delete.recordId);

      const queryGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsQuery,
        protocol    : protocol1
      }, fetchedGrants);

      expect(queryGrant?.message.recordId).to.equal(protocol1Grants.query.recordId);

      const subscribeGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsSubscribe,
        protocol    : protocol1
      }, fetchedGrants);

      expect(subscribeGrant?.message.recordId).to.equal(protocol1Grants.subscribe.recordId);

      const queryGrantOtherProtocol = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsQuery,
        protocol    : protocol2
      }, fetchedGrants);

      expect(queryGrantOtherProtocol?.message.recordId).to.equal(otherProtocolGrants.query.recordId);

      // unknown protocol
      const invalidGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
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

      const writeFooGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType  : DwnInterface.RecordsWrite,
        protocol     : protocol,
        protocolPath : 'foo'
      }, fetchedGrants);

      expect(writeFooGrant?.message.recordId).to.equal(fooGrants.write.recordId);

      const readFooGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType  : DwnInterface.RecordsRead,
        protocol     : protocol,
        protocolPath : 'foo'
      }, fetchedGrants);

      expect(readFooGrant?.message.recordId).to.equal(fooGrants.read.recordId);

      const deleteFooGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType  : DwnInterface.RecordsDelete,
        protocol     : protocol,
        protocolPath : 'foo'
      }, fetchedGrants);

      expect(deleteFooGrant?.message.recordId).to.equal(fooGrants.delete.recordId);

      const queryGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType  : DwnInterface.RecordsQuery,
        protocol     : protocol,
        protocolPath : 'foo'
      }, fetchedGrants);

      expect(queryGrant?.message.recordId).to.equal(fooGrants.query.recordId);

      const subscribeGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType  : DwnInterface.RecordsSubscribe,
        protocol     : protocol,
        protocolPath : 'foo'
      }, fetchedGrants);

      expect(subscribeGrant?.message.recordId).to.equal(fooGrants.subscribe.recordId);

      const writeBarGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType  : DwnInterface.RecordsWrite,
        protocol     : protocol,
        protocolPath : 'foo/bar'
      }, fetchedGrants);

      expect(writeBarGrant?.message.recordId).to.equal(barGrants.write.recordId);

      const noMatchGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
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

      const writeFooGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsWrite,
        protocol    : protocol,
        contextId   : 'abc'
      }, fetchedGrants);

      expect(writeFooGrant?.message.recordId).to.equal(abcGrants.write.recordId);

      const writeBarGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsWrite,
        protocol    : protocol,
        contextId   : 'def/ghi'
      }, fetchedGrants);

      expect(writeBarGrant?.message.recordId).to.equal(defGrants.write.recordId);

      const invalidGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsWrite,
        protocol    : protocol,
        contextId   : 'def'
      }, fetchedGrants);

      expect(invalidGrant).to.be.undefined;

      const withoutContextGrant = await DwnPermissionsUtil.matchGrantFromArray(alice.did.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsWrite,
        protocol    : protocol
      }, fetchedGrants);

      expect(withoutContextGrant).to.be.undefined;
    });
  });
});