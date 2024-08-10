import sinon from 'sinon';
import { expect } from 'chai';
import { AgentPermissionsApi } from '../src/permissions-api.js';
import { PlatformAgentTestHarness } from '../src/test-harness.js';
import { TestAgent } from './utils/test-agent.js';
import { BearerDid } from '@web5/dids';

import { testDwnUrl } from './utils/test-config.js';
import { DwnInterfaceName, DwnMethodName, Time } from '@tbd54566975/dwn-sdk-js';
import { DwnPermissionGrant, DwnPermissionScope } from '../src/index.js';

let testDwnUrls: string[] = [testDwnUrl];

describe('AgentPermissionsApi', () => {
  let testHarness: PlatformAgentTestHarness;
  let aliceDid: BearerDid;

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

  describe('fetchGrants', () => {
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
    it('throws if the request was bad', async () => {
      // stub the processDwnRequest method to return a 400 error
      sinon.stub(testHarness.agent, 'processDwnRequest').resolves({ messageCid: '', reply: { status: { code: 400, detail: 'Bad Request'} }});

      // create a permission request
      try {
        await testHarness.agent.permissions.isGrantRevoked(aliceDid.uri, aliceDid.uri, 'grant-record-id');
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

      // parse the grant
      const writeGrant = await DwnPermissionGrant.parse(deviceXGrant.message);

      // check if the grant is revoked
      let isRevoked = await testHarness.agent.permissions.isGrantRevoked(aliceDid.uri, aliceDid.uri, deviceXGrant.grant.id);
      expect(isRevoked).to.equal(false);

      // create a revocation for the grant
      await testHarness.agent.permissions.createRevocation({
        author : aliceDid.uri,
        store  : true,
        grant  : writeGrant,
      });

      // check if the grant is revoked again, should be true
      isRevoked = await testHarness.agent.permissions.isGrantRevoked(aliceDid.uri, aliceDid.uri, deviceXGrant.grant.id);
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
      let isRevoked = await testHarness.agent.permissions.isGrantRevoked(aliceDid.uri, aliceDid.uri, deviceXGrant.grant.id);
      expect(isRevoked).to.equal(false);

      // create a revocation for the grant
      await testHarness.agent.permissions.createRevocation({
        author : aliceDid.uri,
        store  : true,
        grant  : writeGrant,
      });

      // check if the grant is revoked again, should be true
      isRevoked = await testHarness.agent.permissions.isGrantRevoked(aliceDid.uri, aliceDid.uri, deviceXGrant.grant.id);
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
      let isRevoked = await testHarness.agent.permissions.isGrantRevoked(aliceDid.uri, aliceDid.uri, deviceXGrant.grant.id);
      expect(isRevoked).to.equal(false);

      // create a revocation for the grant without storing it
      await testHarness.agent.permissions.createRevocation({
        author : aliceDid.uri,
        grant  : writeGrant,
      });

      // check if the grant is revoked again, should be true
      isRevoked = await testHarness.agent.permissions.isGrantRevoked(aliceDid.uri, aliceDid.uri, deviceXGrant.grant.id);
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
});