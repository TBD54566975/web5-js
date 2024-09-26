import sinon from 'sinon';
import { expect } from 'chai';
import { AgentPermissionsApi } from '../src/permissions-api.js';
import { PlatformAgentTestHarness } from '../src/test-harness.js';
import { TestAgent } from './utils/test-agent.js';
import { BearerDid } from '@web5/dids';

import { DwnInterfaceName, DwnMethodName, Time } from '@tbd54566975/dwn-sdk-js';
import { DwnInterface, DwnPermissionGrant, DwnPermissionScope, Web5PlatformAgent } from '../src/index.js';
import { Convert } from '@web5/common';


describe('AgentPermissionsApi', () => {
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
    const alice = await testHarness.agent.identity.create({ didMethod: 'jwk', metadata: { name: 'Alice' } });
    aliceDid = alice.did;

    const bob = await testHarness.agent.identity.create({ didMethod: 'jwk', metadata: { name: 'Bob' } });
    bobDid = bob.did;
  });

  describe('get agent', () => {
    it(`returns the 'agent' instance property`, async () => {
      // we are only mocking
      const permissionsApi = new AgentPermissionsApi({ agent: testHarness.agent });
      const agent = permissionsApi.agent;
      expect(agent).to.exist;
      expect(agent.agentDid).to.equal(testHarness.agent.agentDid);
    });

    it(`throws an error if the 'agent' instance property is undefined`, () => {
      const permissionsApi = new AgentPermissionsApi();
      expect(() =>
        permissionsApi.agent
      ).to.throw(Error, 'AgentPermissionsApi: Agent is not set');
    });
  });

  describe('getPermission', () => {
    it('throws an error if no permissions are found', async () => {
      try {
        await testHarness.agent.permissions.getPermissionForRequest({
          connectedDid : aliceDid.uri,
          delegateDid  : bobDid.uri,
          messageType  : DwnInterface.MessagesQuery,
        });
        expect.fail('Expected an error to be thrown');
      } catch(error: any) {
        expect(error.message).to.equal('CachedPermissions: No permissions found for MessagesQuery: undefined');
      }

      // create a permission grant to fetch
      const messagesQueryGrant = await testHarness.agent.permissions.createGrant({
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
      const fetchedMessagesQueryGrant = await testHarness.agent.permissions.getPermissionForRequest({
        connectedDid : aliceDid.uri,
        delegateDid  : bobDid.uri,
        messageType  : DwnInterface.MessagesQuery,
      });
      expect(fetchedMessagesQueryGrant.message.recordId).to.equal(messagesQueryGrant.message.recordId);
    });

    it('caches and returns the permission grant', async () => {
      // create a RecordsWrite grant from alice to bob
      const protocolUri = 'http://example.com/protocol';
      const recordsWriteGrant = await testHarness.agent.permissions.createGrant({
        store       : true,
        author      : aliceDid.uri,
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : protocolUri
        }
      });
      expect(recordsWriteGrant).to.exist;

      // store as bob
      const { encodedData, ...recordsWriteGrantMessage } = recordsWriteGrant.message;
      const grantReply = await testHarness.agent.processDwnRequest({
        target      : bobDid.uri,
        author      : bobDid.uri,
        signAsOwner : true,
        messageType : DwnInterface.RecordsWrite,
        rawMessage  : recordsWriteGrantMessage,
        dataStream  : new Blob([ Convert.base64Url(encodedData).toUint8Array() ])
      });
      expect(grantReply.reply.status.code).to.equal(202);

      // spy on fetchGrant to ensure it's only called once
      const fetchGrantSpy = sinon.spy(testHarness.agent.permissions, 'fetchGrants');

      // get the grant
      const fetchedMessagesQueryGrant = await testHarness.agent.permissions.getPermissionForRequest({
        connectedDid : aliceDid.uri,
        delegateDid  : bobDid.uri,
        messageType  : DwnInterface.RecordsWrite,
        protocol     : protocolUri,
        cached       : true
      });
      expect(fetchedMessagesQueryGrant.message.recordId).to.equal(recordsWriteGrant.message.recordId);

      expect(fetchGrantSpy.callCount).to.equal(1, 'fetched');

      // get the grant again
      const fetchedMessagesQueryGrant2 = await testHarness.agent.permissions.getPermissionForRequest({
        connectedDid : aliceDid.uri,
        delegateDid  : bobDid.uri,
        messageType  : DwnInterface.RecordsWrite,
        protocol     : protocolUri,
        cached       : true
      });
      expect(fetchedMessagesQueryGrant2.message.recordId).to.equal(recordsWriteGrant.message.recordId);

      // expect the fetchGrant method to not have been called again
      expect(fetchGrantSpy.callCount).to.equal(1, 'got from cache');
    });

    it('should cache the results of a fetch even if cache is set to false', async () => {
      // create a RecordsWrite grant from alice to bob
      const protocolUri = 'http://example.com/protocol';
      const recordsWriteGrant = await testHarness.agent.permissions.createGrant({
        store       : true,
        author      : aliceDid.uri,
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : protocolUri
        }
      });
      expect(recordsWriteGrant).to.exist;

      // store as bob
      const { encodedData, ...recordsWriteGrantMessage } = recordsWriteGrant.message;
      const grantReply = await testHarness.agent.processDwnRequest({
        target      : bobDid.uri,
        author      : bobDid.uri,
        signAsOwner : true,
        messageType : DwnInterface.RecordsWrite,
        rawMessage  : recordsWriteGrantMessage,
        dataStream  : new Blob([ Convert.base64Url(encodedData).toUint8Array() ])
      });
      expect(grantReply.reply.status.code).to.equal(202);

      // spy on fetchGrant to ensure it's only called once
      const fetchGrantSpy = sinon.spy(testHarness.agent.permissions, 'fetchGrants');

      // get the grant with cache set to false (default)
      // this will refresh the cache with the result anyway, but will always call fetchGrant when set to false
      const fetchedMessagesQueryGrant = await testHarness.agent.permissions.getPermissionForRequest({
        connectedDid : aliceDid.uri,
        delegateDid  : bobDid.uri,
        messageType  : DwnInterface.RecordsWrite,
        protocol     : protocolUri,
        cached       : false
      });
      expect(fetchedMessagesQueryGrant.message.recordId).to.equal(recordsWriteGrant.message.recordId);

      expect(fetchGrantSpy.callCount).to.equal(1, 'fetched');

      // get the grant again (with cache set to true)
      const fetchedMessagesQueryGrant2 = await testHarness.agent.permissions.getPermissionForRequest({
        connectedDid : aliceDid.uri,
        delegateDid  : bobDid.uri,
        messageType  : DwnInterface.RecordsWrite,
        protocol     : protocolUri,
        cached       : true
      });
      expect(fetchedMessagesQueryGrant2.message.recordId).to.equal(recordsWriteGrant.message.recordId);

      // expect the fetchGrant method to not have been called again
      expect(fetchGrantSpy.callCount).to.equal(1, 'got from cache');

      // call again with cache set to false
      const fetchedMessagesQueryGrant3 = await testHarness.agent.permissions.getPermissionForRequest({
        connectedDid : aliceDid.uri,
        delegateDid  : bobDid.uri,
        messageType  : DwnInterface.RecordsWrite,
        protocol     : protocolUri,
        cached       : false
      });
      expect(fetchedMessagesQueryGrant3.message.recordId).to.equal(recordsWriteGrant.message.recordId);

      // now cache was not set to true, so expect the fetchGrant method to have been called again
      expect(fetchGrantSpy.callCount).to.equal(2, 'fetched again');
    });
  });

  describe('fetchGrants', () => {
    it('from remote', async () => {
      // spy on the processDwnRequest method
      const processDwnRequestSpy = sinon.spy(testHarness.agent, 'processDwnRequest');
      // mock the sendDwnRequest method to return a 200 response
      const sendDwnRequestStub = sinon.stub(testHarness.agent, 'sendDwnRequest').resolves({ messageCid: '', reply: { entries: [], status: { code: 200, detail: 'OK'} }});

      // fetch permission grants
      await testHarness.agent.permissions.fetchGrants({
        author : aliceDid.uri,
        target : aliceDid.uri,
        remote : true
      });

      // expect the processDwnRequest method to not have been called
      expect(processDwnRequestSpy.called).to.be.false;

      // expect the sendDwnRequest method to have been called
      expect(sendDwnRequestStub.called).to.be.true;
    });

    it('filter by protocol', async () => {
      // create a grant for permission-1
      const protocol1Grant = await testHarness.agent.permissions.createGrant({
        author      : aliceDid.uri,
        grantedTo   : aliceDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        store       : true,
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol-1'
        }
      });

      // create a grant for permission-2
      const protocol2Grant = await testHarness.agent.permissions.createGrant({
        author      : aliceDid.uri,
        grantedTo   : aliceDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        store       : true,
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol-2'
        }
      });

      // fetch permission grants
      const protocol1Grants = await testHarness.agent.permissions.fetchGrants({
        author   : aliceDid.uri,
        target   : aliceDid.uri,
        protocol : 'http://example.com/protocol-1'
      });
      expect(protocol1Grants.length).to.equal(1);
      expect(protocol1Grants[0].grant.id).to.equal(protocol1Grant.grant.id);

      const protocol2Grants = await testHarness.agent.permissions.fetchGrants({
        author   : aliceDid.uri,
        target   : aliceDid.uri,
        protocol : 'http://example.com/protocol-2'
      });
      expect(protocol2Grants.length).to.equal(1);
      expect(protocol2Grants[0].grant.id).to.equal(protocol2Grant.grant.id);
    });

    it('throws if the query returns anything other than 200', async () => {
      // stub the processDwnRequest method to return a 400 error
      sinon.stub(testHarness.agent, 'processDwnRequest').resolves({ messageCid: '', reply: { status: { code: 400, detail: 'Bad Request'} }});

      // fetch permission requests
      try {
        await testHarness.agent.permissions.fetchGrants({
          author : aliceDid.uri,
          target : aliceDid.uri,
        });
      } catch(error: any) {
        expect(error.message).to.equal('PermissionsApi: Failed to fetch grants: Bad Request');
      }
    });
  });

  describe('fetchRequests', () => {
    it('from remote', async () => {
      // spy on the processDwnRequest method
      const processDwnRequestSpy = sinon.spy(testHarness.agent, 'processDwnRequest');
      // mock the sendDwnRequest method to return a 200 response
      const sendDwnRequestStub = sinon.stub(testHarness.agent, 'sendDwnRequest').resolves({ messageCid: '', reply: { entries: [], status: { code: 200, detail: 'OK'} }});

      // fetch permission grants
      await testHarness.agent.permissions.fetchRequests({
        author : aliceDid.uri,
        target : aliceDid.uri,
        remote : true
      });

      // expect the processDwnRequest method to not have been called
      expect(processDwnRequestSpy.called).to.be.false;

      // expect the sendDwnRequest method to have been called
      expect(sendDwnRequestStub.called).to.be.true;
    });

    it('filter by protocol', async () => {
      // create a request for permission-1
      const protocol1Request = await testHarness.agent.permissions.createRequest({
        author : aliceDid.uri,
        store  : true,
        scope  : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol-1'
        }
      });

      // create a request for permission-2
      const protocol2Request = await testHarness.agent.permissions.createRequest({
        author : aliceDid.uri,
        store  : true,
        scope  : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol-2'
        }
      });

      // fetch permission grants
      const protocol1Requests = await testHarness.agent.permissions.fetchRequests({
        author   : aliceDid.uri,
        target   : aliceDid.uri,
        protocol : 'http://example.com/protocol-1'
      });
      expect(protocol1Requests.length).to.equal(1);
      expect(protocol1Requests[0].request.id).to.equal(protocol1Request.request.id);

      const protocol2Requests = await testHarness.agent.permissions.fetchRequests({
        author   : aliceDid.uri,
        target   : aliceDid.uri,
        protocol : 'http://example.com/protocol-2'
      });
      expect(protocol2Requests.length).to.equal(1);
      expect(protocol2Requests[0].request.id).to.equal(protocol2Request.request.id);
    });

    it('throws if the query returns anything other than 200', async () => {
      // stub the processDwnRequest method to return a 400 error
      sinon.stub(testHarness.agent, 'processDwnRequest').resolves({ messageCid: '', reply: { status: { code: 400, detail: 'Bad Request'} }});

      // fetch permission requests
      try {
        await testHarness.agent.permissions.fetchRequests({
          author : aliceDid.uri,
          target : aliceDid.uri,
        });
      } catch(error: any) {
        expect(error.message).to.equal('PermissionsApi: Failed to fetch requests: Bad Request');
      }
    });
  });

  describe('isGrantRevoked', () => {
    it('from remote', async () => {
      // spy on the processDwnRequest method
      const processDwnRequestSpy = sinon.spy(testHarness.agent, 'processDwnRequest');
      // mock the sendDwnRequest method to return a 200 response
      const sendDwnRequestStub = sinon.stub(testHarness.agent, 'sendDwnRequest').resolves({ messageCid: '', reply: { status: { code: 200, detail: 'OK'} }});

      // fetch permission grants
      await testHarness.agent.permissions.isGrantRevoked({
        author        : aliceDid.uri,
        target        : aliceDid.uri,
        grantRecordId : 'grant-record-id',
        remote        : true
      });

      // expect the processDwnRequest method to not have been called
      expect(processDwnRequestSpy.called).to.be.false;

      // expect the sendDwnRequest method to have been called
      expect(sendDwnRequestStub.called).to.be.true;
    });

    it('throws if the request was bad', async () => {
      // stub the processDwnRequest method to return a 400 error
      sinon.stub(testHarness.agent, 'processDwnRequest').resolves({ messageCid: '', reply: { status: { code: 400, detail: 'Bad Request'} }});

      // create a permission request
      try {
        await testHarness.agent.permissions.isGrantRevoked({
          author        : aliceDid.uri,
          target        : aliceDid.uri,
          grantRecordId : 'grant-record-id'
        });
      } catch(error: any) {
        expect(error.message).to.equal('PermissionsApi: Failed to check if grant is revoked: Bad Request');
      }
    });

    it('returns revocation status', async () => {
      // scenario: create a grant for deviceX, revoke the grant, confirm the grant is revoked

      // create an identity for deviceX
      const aliceDeviceX = await testHarness.agent.identity.create({
        store     : true,
        metadata  : { name: 'Alice Device X' },
        didMethod : 'jwk'
      });

      // create a grant for deviceX
      const deviceXGrant = await testHarness.agent.permissions.createGrant({
        store       : true,
        author      : aliceDid.uri,
        grantedTo   : aliceDeviceX.did.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol'
        }
      });

      // check if the grant is revoked
      let isRevoked = await testHarness.agent.permissions.isGrantRevoked({
        author        : aliceDid.uri,
        target        : aliceDid.uri,
        grantRecordId : deviceXGrant.grant.id
      });
      expect(isRevoked).to.equal(false);

      // create a revocation for the grant
      await testHarness.agent.permissions.createRevocation({
        author : aliceDid.uri,
        store  : true,
        grant  : deviceXGrant.grant,
      });

      // check if the grant is revoked again, should be true
      isRevoked = await testHarness.agent.permissions.isGrantRevoked({
        author        : aliceDid.uri,
        target        : aliceDid.uri,
        grantRecordId : deviceXGrant.grant.id
      });
      expect(isRevoked).to.equal(true);
    });
  });

  describe('createGrant', () => {
    it('throws if the grant was not created', async () => {
      // stub the processDwnRequest method to return a 400 error
      sinon.stub(testHarness.agent, 'processDwnRequest').resolves({ messageCid: '', reply: { status: { code: 400, detail: 'Bad Request'} }});

      // create a permission request
      try {
        await testHarness.agent.permissions.createGrant({
          author      : aliceDid.uri,
          grantedTo   : 'did:example:deviceX',
          dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
          store       : true,
          scope       : {} as DwnPermissionScope,
        });
      } catch(error: any) {
        expect(error.message).to.equal('PermissionsApi: Failed to create grant: Bad Request');
      }
    });

    it('creates and stores a grant', async () => {
      // scenario: create a grant for deviceX, confirm the grant exists

      // create an identity for deviceX
      const aliceDeviceX = await testHarness.agent.identity.create({
        store     : false,
        metadata  : { name: 'Alice Device X' },
        didMethod : 'jwk'
      });


      // create a grant for deviceX
      const deviceXGrant = await testHarness.agent.permissions.createGrant({
        store       : true,
        author      : aliceDid.uri,
        grantedTo   : aliceDeviceX.did.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol'
        }
      });

      const grants = await testHarness.agent.permissions.fetchGrants({
        author : aliceDid.uri,
        target : aliceDid.uri,
      });

      // expect to have the 1 grant created for deviceX
      expect(grants.length).to.equal(1);
      expect(grants[0].message.recordId).to.equal(deviceXGrant.message.recordId);
    });

    it('creates a grant without storing it', async () => {
      // scenario: create a grant for deviceX, confirm the grant does not exist

      // create an identity for deviceX
      const aliceDeviceX = await testHarness.agent.identity.create({
        store     : false,
        metadata  : { name: 'Alice Device X' },
        didMethod : 'jwk'
      });

      // create a grant for deviceX store is set to false by default
      const deviceXGrant = await testHarness.agent.permissions.createGrant({
        author      : aliceDid.uri,
        grantedTo   : aliceDeviceX.did.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol'
        }
      });

      const grantDataObject = { ...deviceXGrant.grant };
      const parsedGrant = await DwnPermissionGrant.parse(deviceXGrant.message);

      expect(grantDataObject).to.deep.equal(parsedGrant);
    });
  });

  describe('createRevocation', () => {
    it('throws if the revocation was not created', async () => {
      // stub the processDwnRequest method to return a 400 error
      sinon.stub(testHarness.agent, 'processDwnRequest').resolves({ messageCid: '', reply: { status: { code: 400, detail: 'Bad Request'} }});

      // create a permission request
      try {
        await testHarness.agent.permissions.createRevocation({
          author : aliceDid.uri,
          store  : true,
          grant  : {
            scope: {}
          } as DwnPermissionGrant,
        });
      } catch(error: any) {
        expect(error.message).to.equal('PermissionsApi: Failed to create revocation: Bad Request');
      }

    });

    it('creates and stores a grant revocation', async () => {
      // scenario: create a grant for deviceX, revoke the grant, confirm the grant is revoked

      // create an identity for deviceX
      const aliceDeviceX = await testHarness.agent.identity.create({
        store     : true,
        metadata  : { name: 'Alice Device X' },
        didMethod : 'jwk'
      });

      // create a grant for deviceX
      const deviceXGrant = await testHarness.agent.permissions.createGrant({
        store       : true,
        author      : aliceDid.uri,
        grantedTo   : aliceDeviceX.did.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol'
        }
      });

      // parse the grant
      const writeGrant = await DwnPermissionGrant.parse(deviceXGrant.message);

      // check if the grant is revoked
      let isRevoked = await testHarness.agent.permissions.isGrantRevoked({
        author        : aliceDid.uri,
        target        : aliceDid.uri,
        grantRecordId : deviceXGrant.grant.id
      });
      expect(isRevoked).to.equal(false);

      // create a revocation for the grant
      await testHarness.agent.permissions.createRevocation({
        author : aliceDid.uri,
        store  : true,
        grant  : writeGrant,
      });

      // check if the grant is revoked again, should be true
      isRevoked = await testHarness.agent.permissions.isGrantRevoked({
        author        : aliceDid.uri,
        target        : aliceDid.uri,
        grantRecordId : deviceXGrant.grant.id
      });
      expect(isRevoked).to.equal(true);
    });

    it('creates a grant revocation without storing it', async () => {
      // scenario: create a grant for deviceX, revoke the grant, confirm the grant is revoked

      // create an identity for deviceX
      const aliceDeviceX = await testHarness.agent.identity.create({
        store     : true,
        metadata  : { name: 'Alice Device X' },
        didMethod : 'jwk'
      });

      // create a grant for deviceX
      const deviceXGrant = await testHarness.agent.permissions.createGrant({
        store       : true,
        author      : aliceDid.uri,
        grantedTo   : aliceDeviceX.did.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol'
        }
      });

      // parse the grant
      const writeGrant = await DwnPermissionGrant.parse(deviceXGrant.message);

      // check if the grant is revoked
      let isRevoked = await testHarness.agent.permissions.isGrantRevoked({
        author        : aliceDid.uri,
        target        : aliceDid.uri,
        grantRecordId : deviceXGrant.grant.id
      });
      expect(isRevoked).to.equal(false);

      // create a revocation for the grant without storing it
      await testHarness.agent.permissions.createRevocation({
        author : aliceDid.uri,
        grant  : writeGrant,
      });

      // check if the grant is revoked again, should be true
      isRevoked = await testHarness.agent.permissions.isGrantRevoked({
        author        : aliceDid.uri,
        target        : aliceDid.uri,
        grantRecordId : deviceXGrant.grant.id
      });
      expect(isRevoked).to.equal(false);
    });
  });

  describe('createRequest', () => {
    it('throws if the request was not created', async () => {
      // stub the processDwnRequest method to return a 400 error
      sinon.stub(testHarness.agent, 'processDwnRequest').resolves({ messageCid: '', reply: { status: { code: 400, detail: 'Bad Request'} }});

      // create a permission request
      try {
        await testHarness.agent.permissions.createRequest({
          author : aliceDid.uri,
          scope  : {
            interface : DwnInterfaceName.Records,
            method    : DwnMethodName.Write,
            protocol  : 'http://example.com/protocol'
          }
        });
      } catch(error: any) {
        expect(error.message).to.equal('PermissionsApi: Failed to create request: Bad Request');
      }

    });

    it('creates a permission request and stores it', async () => {
      // scenario: create a permission request confirm the request exists

      // create a permission request
      const deviceXRequest = await testHarness.agent.permissions.createRequest({
        author : aliceDid.uri,
        store  : true,
        scope  : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol'
        }
      });

      // query for the request
      const fetchedRequests = await testHarness.agent.permissions.fetchRequests({
        author : aliceDid.uri,
        target : aliceDid.uri,
      });

      // expect to have the 1 request created
      expect(fetchedRequests.length).to.equal(1);
      expect(fetchedRequests[0].request.id).to.equal(deviceXRequest.message.recordId);
    });

    it('creates a permission request without storing it', async () => {
      // scenario: create a permission request confirm the request does not exist

      // create a permission request store is set to false by default
      await testHarness.agent.permissions.createRequest({
        author : aliceDid.uri,
        scope  : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol'
        }
      });

      // query for the request
      const fetchedRequests = await testHarness.agent.permissions.fetchRequests({
        author : aliceDid.uri,
        target : aliceDid.uri,
      });

      // expect to have no requests
      expect(fetchedRequests.length).to.equal(0);
    });
  });

  describe('matchGrantFromArray', () => {

    const createRecordGrants = async ({ grantee, grantor, grantorAgent, protocol, protocolPath, contextId }:{
      grantorAgent: Web5PlatformAgent;
      granteeAgent: Web5PlatformAgent;
      grantor: string;
      grantee: string;
      protocol: string;
      protocolPath?: string;
      contextId?: string;
    }) => {
      const recordsWriteGrant = await grantorAgent.permissions.createGrant({
        author      : grantor,
        grantedTo   : grantee,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        store       : true,
        delegated   : true,
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol,
          protocolPath,
          contextId
        }
      });

      const recordsReadGrant = await grantorAgent.permissions.createGrant({
        author      : grantor,
        grantedTo   : grantee,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        store       : true,
        delegated   : true,
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Read,
          protocol,
          protocolPath,
          contextId
        }
      });

      const recordsDeleteGrant = await grantorAgent.permissions.createGrant({
        author      : grantor,
        grantedTo   : grantee,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        store       : true,
        delegated   : true,
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Delete,
          protocol,
          protocolPath,
          contextId
        }
      });

      const recordsQueryGrant = await grantorAgent.permissions.createGrant({
        author      : grantor,
        grantedTo   : grantee,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        store       : true,
        delegated   : true,
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Query,
          protocol,
          protocolPath,
          contextId
        }
      });

      const recordsSubscribeGrant = await grantorAgent.permissions.createGrant({
        author      : grantor,
        grantedTo   : grantee,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        store       : true,
        delegated   : true,
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Subscribe,
          protocol,
          protocolPath,
          contextId
        }
      });

      return {
        write     : recordsWriteGrant,
        read      : recordsReadGrant,
        delete    : recordsDeleteGrant,
        query     : recordsQueryGrant,
        subscribe : recordsSubscribeGrant
      };
    };

    const createMessageGrants = async ({ grantee, grantor, grantorAgent, protocol }:{
      grantorAgent: Web5PlatformAgent;
      granteeAgent: Web5PlatformAgent;
      grantor: string;
      grantee: string;
      protocol?: string;
    }) => {

      const messagesReadGrant = await grantorAgent.permissions.createGrant({
        author      : grantor,
        grantedTo   : grantee,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        store       : true,
        scope       : {
          interface : DwnInterfaceName.Messages,
          method    : DwnMethodName.Read,
          protocol
        }
      });

      const messagesQueryGrant = await grantorAgent.permissions.createGrant({
        author      : grantor,
        grantedTo   : grantee,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        store       : true,
        scope       : {
          interface : DwnInterfaceName.Messages,
          method    : DwnMethodName.Query,
          protocol
        }
      });

      const messagesSubscribeGrant = await grantorAgent.permissions.createGrant({
        author      : grantor,
        grantedTo   : grantee,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        store       : true,
        scope       : {
          interface : DwnInterfaceName.Messages,
          method    : DwnMethodName.Subscribe,
          protocol
        }
      });

      return {
        read      : messagesReadGrant,
        query     : messagesQueryGrant,
        subscribe : messagesSubscribeGrant
      };
    };

    it('does not match a grant with a different grantee or grantor', async () => {
      const aliceDeviceX = await testHarness.agent.identity.create({
        store     : true,
        metadata  : { name: 'Alice Device X' },
        didMethod : 'jwk'
      });

      const aliceDeviceY = await testHarness.agent.identity.create({
        store     : true,
        metadata  : { name: 'Alice Device Y' },
        didMethod : 'jwk'
      });

      const protocol = 'http://example.com/protocol';


      const deviceXRecordGrantsFromAlice = await createRecordGrants({
        grantorAgent : testHarness.agent as Web5PlatformAgent,
        granteeAgent : testHarness.agent as Web5PlatformAgent,
        grantor      : aliceDid.uri,
        grantee      : aliceDeviceX.did.uri,
        protocol
      });

      const deviceXRecordGrantsFromAliceArray = [
        deviceXRecordGrantsFromAlice.write,
        deviceXRecordGrantsFromAlice.read,
        deviceXRecordGrantsFromAlice.delete,
        deviceXRecordGrantsFromAlice.query,
        deviceXRecordGrantsFromAlice.subscribe
      ];

      // attempt to match a grant with a different grantee, aliceDeviceY
      const notFoundGrantee = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceY.did.uri, {
        messageType: DwnInterface.RecordsWrite,
        protocol
      }, deviceXRecordGrantsFromAliceArray);

      expect(notFoundGrantee).to.be.undefined;

      const deviceYRecordGrantsFromDeviceX = await createRecordGrants({
        grantorAgent : testHarness.agent as Web5PlatformAgent,
        granteeAgent : testHarness.agent as Web5PlatformAgent,
        grantor      : aliceDeviceX.did.uri,
        grantee      : aliceDeviceY.did.uri,
        protocol
      });

      const deviceYRecordGrantsFromDeviceXArray = [
        deviceYRecordGrantsFromDeviceX.write,
        deviceYRecordGrantsFromDeviceX.read,
        deviceYRecordGrantsFromDeviceX.delete,
        deviceYRecordGrantsFromDeviceX.query,
        deviceYRecordGrantsFromDeviceX.subscribe
      ];

      const notFoundGrantor = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceY.did.uri, {
        messageType: DwnInterface.RecordsWrite,
        protocol
      }, deviceYRecordGrantsFromDeviceXArray);

      expect(notFoundGrantor).to.be.undefined;
    });

    it('matches delegated grants if specified', async () => {
      const aliceDeviceX = await testHarness.agent.identity.create({
        store     : true,
        metadata  : { name: 'Alice Device X' },
        didMethod : 'jwk'
      });

      const messagesGrants = await createMessageGrants({
        grantorAgent : testHarness.agent as Web5PlatformAgent,
        granteeAgent : testHarness.agent as Web5PlatformAgent,
        grantor      : aliceDid.uri,
        grantee      : aliceDeviceX.did.uri,
      });

      const aliceDeviceXMessageGrants = [
        messagesGrants.query,
        messagesGrants.read,
        messagesGrants.subscribe
      ];

      // control: match a grant without specifying delegated
      const queryGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType: DwnInterface.MessagesQuery,
      }, aliceDeviceXMessageGrants);

      expect(queryGrant?.message.recordId).to.equal(messagesGrants.query.message.recordId);

      // attempt to match non-delegated grant with delegated set to true
      const notFoundDelegated = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType: DwnInterface.MessagesQuery,
      }, aliceDeviceXMessageGrants, true);

      expect(notFoundDelegated).to.be.undefined;

      // create delegated record grants
      const protocol = 'http://example.com/protocol';
      const recordsGrants = await createRecordGrants({
        grantorAgent : testHarness.agent as Web5PlatformAgent,
        granteeAgent : testHarness.agent as Web5PlatformAgent,
        grantor      : aliceDid.uri,
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
      const writeGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType: DwnInterface.RecordsWrite,
        protocol
      }, deviceXRecordGrants, true);

      expect(writeGrant?.message.recordId).to.equal(recordsGrants.write.message.recordId);
    });

    it('Messages', async () => {
      const aliceDeviceX = await testHarness.agent.identity.create({
        store     : true,
        metadata  : { name: 'Alice Device X' },
        didMethod : 'jwk'
      });

      const messageGrants = await createMessageGrants({
        grantorAgent : testHarness.agent as Web5PlatformAgent,
        granteeAgent : testHarness.agent as Web5PlatformAgent,
        grantor      : aliceDid.uri,
        grantee      : aliceDeviceX.did.uri
      });

      const deviceXMessageGrants = [
        messageGrants.query,
        messageGrants.read,
        messageGrants.subscribe
      ];

      const queryGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType: DwnInterface.MessagesQuery,
      }, deviceXMessageGrants);

      expect(queryGrant?.message.recordId).to.equal(messageGrants.query.message.recordId);

      const readGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType: DwnInterface.MessagesRead,
      }, deviceXMessageGrants);

      expect(readGrant?.message.recordId).to.equal(messageGrants.read.message.recordId);

      const subscribeGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType: DwnInterface.MessagesSubscribe,
      }, deviceXMessageGrants);

      expect(subscribeGrant?.message.recordId).to.equal(messageGrants.subscribe.message.recordId);

      const invalidGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType: DwnInterface.RecordsQuery,
      }, deviceXMessageGrants);

      expect(invalidGrant).to.be.undefined;
    });

    it('Messages with protocol', async () => {
      const aliceDeviceX = await testHarness.agent.identity.create({
        store     : true,
        metadata  : { name: 'Alice Device X' },
        didMethod : 'jwk'
      });

      const protocol = 'http://example.com/protocol';
      const otherProtocol = 'http://example.com/other-protocol';

      const protocolMessageGrants = await createMessageGrants({
        grantorAgent : testHarness.agent as Web5PlatformAgent,
        granteeAgent : testHarness.agent as Web5PlatformAgent,
        grantor      : aliceDid.uri,
        grantee      : aliceDeviceX.did.uri,
        protocol
      });

      const otherProtocolMessageGrants = await createMessageGrants({
        grantorAgent : testHarness.agent as Web5PlatformAgent,
        granteeAgent : testHarness.agent as Web5PlatformAgent,
        grantor      : aliceDid.uri,
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

      const queryGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType: DwnInterface.MessagesQuery,
        protocol
      }, deviceXMessageGrants);

      expect(queryGrant?.message.recordId).to.equal(protocolMessageGrants.query.message.recordId);

      const readGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType: DwnInterface.MessagesRead,
        protocol
      }, deviceXMessageGrants);

      expect(readGrant?.message.recordId).to.equal(protocolMessageGrants.read.message.recordId);

      const subscribeGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType: DwnInterface.MessagesSubscribe,
        protocol
      }, deviceXMessageGrants);

      expect(subscribeGrant?.message.recordId).to.equal(protocolMessageGrants.subscribe.message.recordId);

      const invalidGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.MessagesQuery,
        protocol    : 'http://example.com/unknown-protocol'
      }, deviceXMessageGrants);

      expect(invalidGrant).to.be.undefined;

      const otherProtocolQueryGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.MessagesQuery,
        protocol    : otherProtocol
      }, deviceXMessageGrants);

      expect(otherProtocolQueryGrant?.message.recordId).to.equal(otherProtocolMessageGrants.query.message.recordId);
    });

    it('Records', async () => {
      const aliceDeviceX = await testHarness.agent.identity.create({
        store     : true,
        metadata  : { name: 'Alice Device X' },
        didMethod : 'jwk'
      });

      const protocol1 = 'http://example.com/protocol';
      const protocol2 = 'http://example.com/other-protocol';

      const protocol1Grants = await createRecordGrants({
        grantorAgent : testHarness.agent as Web5PlatformAgent,
        granteeAgent : testHarness.agent as Web5PlatformAgent,
        grantor      : aliceDid.uri,
        grantee      : aliceDeviceX.did.uri,
        protocol     : protocol1,
      });

      const otherProtocolGrants = await createRecordGrants({
        grantorAgent : testHarness.agent as Web5PlatformAgent,
        granteeAgent : testHarness.agent as Web5PlatformAgent,
        grantor      : aliceDid.uri,
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

      const writeGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsWrite,
        protocol    : protocol1
      }, deviceXRecordGrants);

      expect(writeGrant?.message.recordId).to.equal(protocol1Grants.write.message.recordId);

      const readGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsRead,
        protocol    : protocol1
      }, deviceXRecordGrants);

      expect(readGrant?.message.recordId).to.equal(protocol1Grants.read.message.recordId);

      const deleteGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsDelete,
        protocol    : protocol1
      }, deviceXRecordGrants);

      expect(deleteGrant?.message.recordId).to.equal(protocol1Grants.delete.message.recordId);

      const queryGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsQuery,
        protocol    : protocol1
      }, deviceXRecordGrants);

      expect(queryGrant?.message.recordId).to.equal(protocol1Grants.query.message.recordId);

      const subscribeGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsSubscribe,
        protocol    : protocol1
      }, deviceXRecordGrants);

      expect(subscribeGrant?.message.recordId).to.equal(protocol1Grants.subscribe.message.recordId);

      const queryGrantOtherProtocol = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsQuery,
        protocol    : protocol2
      }, deviceXRecordGrants);

      expect(queryGrantOtherProtocol?.message.recordId).to.equal(otherProtocolGrants.query.message.recordId);

      // unknown protocol
      const invalidGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsQuery,
        protocol    : 'http://example.com/unknown-protocol'
      }, deviceXRecordGrants);

      expect(invalidGrant).to.be.undefined;
    });

    it('Records with protocolPath', async () => {
      const aliceDeviceX = await testHarness.agent.identity.create({
        store     : true,
        metadata  : { name: 'Alice Device X' },
        didMethod : 'jwk'
      });

      const protocol = 'http://example.com/protocol';

      const fooGrants = await createRecordGrants({
        grantorAgent : testHarness.agent as Web5PlatformAgent,
        granteeAgent : testHarness.agent as Web5PlatformAgent,
        grantor      : aliceDid.uri,
        grantee      : aliceDeviceX.did.uri,
        protocol,
        protocolPath : 'foo'
      });

      const barGrants = await createRecordGrants({
        grantorAgent : testHarness.agent as Web5PlatformAgent,
        granteeAgent : testHarness.agent as Web5PlatformAgent,
        grantor      : aliceDid.uri,
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

      const writeFooGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType  : DwnInterface.RecordsWrite,
        protocol     : protocol,
        protocolPath : 'foo'
      }, protocolGrants);

      expect(writeFooGrant?.message.recordId).to.equal(fooGrants.write.message.recordId);

      const readFooGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType  : DwnInterface.RecordsRead,
        protocol     : protocol,
        protocolPath : 'foo'
      }, protocolGrants);

      expect(readFooGrant?.message.recordId).to.equal(fooGrants.read.message.recordId);

      const deleteFooGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType  : DwnInterface.RecordsDelete,
        protocol     : protocol,
        protocolPath : 'foo'
      }, protocolGrants);

      expect(deleteFooGrant?.message.recordId).to.equal(fooGrants.delete.message.recordId);

      const queryGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType  : DwnInterface.RecordsQuery,
        protocol     : protocol,
        protocolPath : 'foo'
      }, protocolGrants);

      expect(queryGrant?.message.recordId).to.equal(fooGrants.query.message.recordId);

      const subscribeGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType  : DwnInterface.RecordsSubscribe,
        protocol     : protocol,
        protocolPath : 'foo'
      }, protocolGrants);

      expect(subscribeGrant?.message.recordId).to.equal(fooGrants.subscribe.message.recordId);

      const writeBarGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType  : DwnInterface.RecordsWrite,
        protocol     : protocol,
        protocolPath : 'foo/bar'
      }, protocolGrants);

      expect(writeBarGrant?.message.recordId).to.equal(barGrants.write.message.recordId);

      const noMatchGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType  : DwnInterface.RecordsWrite,
        protocol     : protocol,
        protocolPath : 'bar'
      }, protocolGrants);

      expect(noMatchGrant).to.be.undefined;
    });

    it('Records with contextId', async () => {
      const aliceDeviceX = await testHarness.agent.identity.create({
        store     : true,
        metadata  : { name: 'Alice Device X' },
        didMethod : 'jwk'
      });

      const protocol = 'http://example.com/protocol';

      const abcGrants = await createRecordGrants({
        grantorAgent : testHarness.agent as Web5PlatformAgent,
        granteeAgent : testHarness.agent as Web5PlatformAgent,
        grantor      : aliceDid.uri,
        grantee      : aliceDeviceX.did.uri,
        protocol,
        contextId    : 'abc'
      });

      const defGrants = await createRecordGrants({
        grantorAgent : testHarness.agent as Web5PlatformAgent,
        granteeAgent : testHarness.agent as Web5PlatformAgent,
        grantor      : aliceDid.uri,
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

      const writeFooGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsWrite,
        protocol    : protocol,
        contextId   : 'abc'
      }, contextGrants);

      expect(writeFooGrant?.message.recordId).to.equal(abcGrants.write.message.recordId);

      const writeBarGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsWrite,
        protocol    : protocol,
        contextId   : 'def/ghi'
      }, contextGrants);

      expect(writeBarGrant?.message.recordId).to.equal(defGrants.write.message.recordId);

      const invalidGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsWrite,
        protocol    : protocol,
        contextId   : 'def'
      }, contextGrants);

      expect(invalidGrant).to.be.undefined;

      const withoutContextGrant = await AgentPermissionsApi.matchGrantFromArray(aliceDid.uri, aliceDeviceX.did.uri, {
        messageType : DwnInterface.RecordsWrite,
        protocol    : protocol
      }, contextGrants);

      expect(withoutContextGrant).to.be.undefined;
    });
  });
});