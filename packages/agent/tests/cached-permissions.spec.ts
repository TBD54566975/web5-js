import sinon from 'sinon';
import { expect } from 'chai';
import { AgentPermissionsApi } from '../src/permissions-api.js';
import { PlatformAgentTestHarness } from '../src/test-harness.js';
import { TestAgent } from './utils/test-agent.js';
import { BearerDid } from '@web5/dids';

import { testDwnUrl } from './utils/test-config.js';
import { DwnInterfaceName, DwnMethodName, Time } from '@tbd54566975/dwn-sdk-js';
import { CachedPermissions, DwnInterface } from '../src/index.js';
import { Convert } from '@web5/common';

let testDwnUrls: string[] = [testDwnUrl];

describe('CachedPermissions', () => {
  let permissions: AgentPermissionsApi;
  let testHarness: PlatformAgentTestHarness;
  let aliceDid: BearerDid;
  let bobDid: BearerDid;

  before(async () => {
    testHarness = await PlatformAgentTestHarness.setup({
      agentClass  : TestAgent,
      agentStores : 'dwn'
    });
  });

  after(async () => {
    sinon.restore();
    await testHarness.clearStorage();
    await testHarness.closeStorage();
  });

  beforeEach(async () => {
    sinon.restore();
    await testHarness.clearStorage();
    await testHarness.createAgentDid();

    // Create an "alice" Identity to author the DWN messages.
    const alice = await testHarness.createIdentity({ name: 'Alice', testDwnUrls });
    await testHarness.agent.identity.manage({ portableIdentity: await alice.export() });
    aliceDid = alice.did;

    const bob = await testHarness.createIdentity({ name: 'Bob', testDwnUrls });
    await testHarness.agent.identity.manage({ portableIdentity: await bob.export() });
    bobDid = bob.did;

    permissions = new AgentPermissionsApi({ agent: testHarness.agent });
  });

  describe('cachedDefault', () => {
    it('caches permissions by default if defaultCache is set to true', async () => {
      // create a permission grant to fetch
      const messagesQueryGrant = await permissions.createGrant({
        store       : true,
        author      : aliceDid.uri,
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : {
          interface : DwnInterfaceName.Messages,
          method    : DwnMethodName.Query,
        }
      });

      // store the grant as owner from bob so that it can be fetched
      const { encodedData, ...messagesQueryGrantMessage } = messagesQueryGrant.message;
      const grantReply = await testHarness.agent.processDwnRequest({
        target      : bobDid.uri,
        author      : bobDid.uri,
        signAsOwner : true,
        messageType : DwnInterface.RecordsWrite,
        rawMessage  : messagesQueryGrantMessage,
        dataStream  : new Blob([ Convert.base64Url(encodedData).toUint8Array() ])
      });
      expect(grantReply.reply.status.code).to.equal(202);

      const permissionGrantsApiSpy = sinon.spy(AgentPermissionsApi.prototype, 'fetchGrants');

      // with defaultCache set to true
      const cachedPermissions = new CachedPermissions({ agent: testHarness.agent, cachedDefault: true });

      // fetch the grant
      let fetchedMessagesQueryGrant = await cachedPermissions.getPermission({
        connectedDid : aliceDid.uri,
        delegateDid  : bobDid.uri,
        messageType  : DwnInterface.MessagesQuery,
      });
      expect(fetchedMessagesQueryGrant).to.not.be.undefined;
      expect(fetchedMessagesQueryGrant.message.recordId).to.equal(messagesQueryGrant.message.recordId);

      // confirm that the permission was fetched from the API
      expect(permissionGrantsApiSpy.calledOnce).to.be.true;
      permissionGrantsApiSpy.resetHistory();

      // fetch the grant again to confirm that it was cached
      fetchedMessagesQueryGrant = await cachedPermissions.getPermission({
        connectedDid : aliceDid.uri,
        delegateDid  : bobDid.uri,
        messageType  : DwnInterface.MessagesQuery,
      });
      expect(fetchedMessagesQueryGrant).to.not.be.undefined;
      expect(fetchedMessagesQueryGrant.message.recordId).to.equal(messagesQueryGrant.message.recordId);

      // confirm that the permission was not fetched again from the API
      expect(permissionGrantsApiSpy.called).to.be.false;

      // confirm that the permissions is fetched from teh api if cache is set to false on a single call
      fetchedMessagesQueryGrant = await cachedPermissions.getPermission({
        connectedDid : aliceDid.uri,
        delegateDid  : bobDid.uri,
        messageType  : DwnInterface.MessagesQuery,
        cached       : false,
      });
      expect(fetchedMessagesQueryGrant).to.not.be.undefined;
      expect(fetchedMessagesQueryGrant.message.recordId).to.equal(messagesQueryGrant.message.recordId);

      // confirm that the permission was fetched from the API
      expect(permissionGrantsApiSpy.calledOnce).to.be.true;
    });

    it('does not cache permission by default defaultCache is set to false', async () => {
      // create a permission grant to fetch
      const messagesQueryGrant = await permissions.createGrant({
        store       : true,
        author      : aliceDid.uri,
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : {
          interface : DwnInterfaceName.Messages,
          method    : DwnMethodName.Query,
        }
      });

      // store the grant as owner from bob so that it can be fetched
      const { encodedData, ...messagesQueryGrantMessage } = messagesQueryGrant.message;
      const grantReply = await testHarness.agent.processDwnRequest({
        target      : bobDid.uri,
        author      : bobDid.uri,
        signAsOwner : true,
        messageType : DwnInterface.RecordsWrite,
        rawMessage  : messagesQueryGrantMessage,
        dataStream  : new Blob([ Convert.base64Url(encodedData).toUint8Array() ])
      });
      expect(grantReply.reply.status.code).to.equal(202);

      const permissionGrantsApiSpy = sinon.spy(AgentPermissionsApi.prototype, 'fetchGrants');

      // with defaultCache set to false by default
      const cachedPermissions = new CachedPermissions({ agent: testHarness.agent });

      // fetch the grant
      let fetchedMessagesQueryGrant = await cachedPermissions.getPermission({
        connectedDid : aliceDid.uri,
        delegateDid  : bobDid.uri,
        messageType  : DwnInterface.MessagesQuery,
      });
      expect(fetchedMessagesQueryGrant).to.not.be.undefined;
      expect(fetchedMessagesQueryGrant.message.recordId).to.equal(messagesQueryGrant.message.recordId);

      // confirm that the permission was fetched from the API
      expect(permissionGrantsApiSpy.calledOnce).to.be.true;
      permissionGrantsApiSpy.resetHistory();

      // fetch the grant again to confirm that it was cached
      fetchedMessagesQueryGrant = await cachedPermissions.getPermission({
        connectedDid : aliceDid.uri,
        delegateDid  : bobDid.uri,
        messageType  : DwnInterface.MessagesQuery,
      });
      expect(fetchedMessagesQueryGrant).to.not.be.undefined;
      expect(fetchedMessagesQueryGrant.message.recordId).to.equal(messagesQueryGrant.message.recordId);

      // confirm that the permission was fetched a second time from the API
      expect(permissionGrantsApiSpy.called).to.be.true;
      permissionGrantsApiSpy.resetHistory();

      // confirm that the permissions is not fetched from the api if cache is set to true on a single call
      fetchedMessagesQueryGrant = await cachedPermissions.getPermission({
        connectedDid : aliceDid.uri,
        delegateDid  : bobDid.uri,
        messageType  : DwnInterface.MessagesQuery,
        cached       : true,
      });
      expect(fetchedMessagesQueryGrant).to.not.be.undefined;
      expect(fetchedMessagesQueryGrant.message.recordId).to.equal(messagesQueryGrant.message.recordId);

      // confirm that the permission was fetched from the API
      expect(permissionGrantsApiSpy.calledOnce).to.be.false;
    });
  });

  describe('getPermission', () => {
    it('throws an error if no permissions are found', async () => {
      const cachedPermissions = new CachedPermissions({ agent: testHarness.agent });

      try {
        await cachedPermissions.getPermission({
          connectedDid : aliceDid.uri,
          delegateDid  : bobDid.uri,
          messageType  : DwnInterface.MessagesQuery,
        });
        expect.fail('Expected an error to be thrown');
      } catch(error: any) {
        expect(error.message).to.equal('CachedPermissions: No permissions found for MessagesQuery: undefined');
      }

      // create a permission grant to fetch
      const messagesQueryGrant = await permissions.createGrant({
        store       : true,
        author      : aliceDid.uri,
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : {
          interface : DwnInterfaceName.Messages,
          method    : DwnMethodName.Query,
        }
      });

      // store the grant as owner from bob so that it can be fetched
      const { encodedData, ...messagesQueryGrantMessage } = messagesQueryGrant.message;
      const grantReply = await testHarness.agent.processDwnRequest({
        target      : bobDid.uri,
        author      : bobDid.uri,
        signAsOwner : true,
        messageType : DwnInterface.RecordsWrite,
        rawMessage  : messagesQueryGrantMessage,
        dataStream  : new Blob([ Convert.base64Url(encodedData).toUint8Array() ])
      });
      expect(grantReply.reply.status.code).to.equal(202);

      // fetch the grant
      const fetchedMessagesQueryGrant = await cachedPermissions.getPermission({
        connectedDid : aliceDid.uri,
        delegateDid  : bobDid.uri,
        messageType  : DwnInterface.MessagesQuery,
      });
      expect(fetchedMessagesQueryGrant.message.recordId).to.equal(messagesQueryGrant.message.recordId);
    });
  });
});