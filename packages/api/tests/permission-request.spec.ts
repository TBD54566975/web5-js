import sinon from 'sinon';
import { expect } from 'chai';

import { testDwnUrl } from './utils/test-config.js';

import { BearerDid } from '@web5/dids';
import { DwnApi } from '../src/dwn-api.js';
import { PlatformAgentTestHarness } from '@web5/agent';
import { Web5UserAgent } from '@web5/user-agent';
import { DwnInterfaceName, DwnMethodName, Time } from '@tbd54566975/dwn-sdk-js';
import { PermissionRequest } from '../src/permission-request.js';

const testDwnUrls = [testDwnUrl];

describe('PermissionRequest', () => {
  let aliceDid: BearerDid;
  let bobDid: BearerDid;
  let aliceDwn: DwnApi;
  let bobDwn: DwnApi;
  let testHarness: PlatformAgentTestHarness;

  before(async () => {
    testHarness = await PlatformAgentTestHarness.setup({
      agentClass  : Web5UserAgent,
      agentStores : 'memory'
    });

  });

  beforeEach(async () => {
    sinon.restore();
    await testHarness.clearStorage();
    await testHarness.createAgentDid();

    // Create an "alice" Identity to author the DWN messages.
    const alice = await testHarness.createIdentity({ name: 'Alice', testDwnUrls });
    await testHarness.agent.identity.manage({ portableIdentity: await alice.export() });
    aliceDid = alice.did;

    // Create a "bob" Identity to author the DWN messages.
    const bob = await testHarness.createIdentity({ name: 'Bob', testDwnUrls });
    await testHarness.agent.identity.manage({ portableIdentity: await bob.export() });
    bobDid = bob.did;

    aliceDwn = new DwnApi({ agent: testHarness.agent, connectedDid: aliceDid.uri });
    bobDwn = new DwnApi({ agent: testHarness.agent, connectedDid: bobDid.uri });
  });

  after(async () => {
    sinon.restore();
    await testHarness.clearStorage();
    await testHarness.closeStorage();
  });

  describe('parse()', () => {
    it('should parse a grant request message', async () => {
      const { request, message } = await testHarness.agent.permissions.createRequest({
        author : aliceDid.uri,
        scope  : {
          interface : DwnInterfaceName.Messages,
          method    : DwnMethodName.Read
        }
      });

      const parsedRequest = await PermissionRequest.parse({
        agent        : testHarness.agent,
        connectedDid : bobDid.uri,
        message
      });

      expect(parsedRequest.toJSON()).to.deep.equal(request);
      expect(parsedRequest.rawMessage).to.deep.equal(message);
    });

    //TODO: this should happen in the `dwn-sdk-js` helper
    xit('throws for an invalid request');
  });

  describe('send()', () => {
    it('should send a grant request to connectedDID by default', async () => {
      const grantRequest = await aliceDwn.permissions.request({
        store : false,
        scope : {
          interface : DwnInterfaceName.Messages,
          method    : DwnMethodName.Read
        }
      });

      // confirm the request is not present on the remote
      let requests = await aliceDwn.permissions.queryRequests({
        from: aliceDid.uri
      });
      expect(requests).to.have.length(0);

      const sendReply = await grantRequest.send();
      expect(sendReply.status.code).to.equal(202);

      // fetch the requests from the remote
      requests = await aliceDwn.permissions.queryRequests({
        from: aliceDid.uri
      });

      expect(requests).to.have.length(1);
      expect(requests[0].id).to.deep.equal(grantRequest.id);
    });

    it('sends a grant request to a remote target', async () => {
      const grantRequest = await aliceDwn.permissions.request({
        store : false,
        scope : {
          interface : DwnInterfaceName.Messages,
          method    : DwnMethodName.Read
        }
      });

      // confirm the request is not present on the remote
      let remoteRequestsBob = await bobDwn.permissions.queryRequests({
        from: bobDid.uri
      });
      expect(remoteRequestsBob).to.have.length(0);

      // send from alice to bob's remote DWN
      const sendReply = await grantRequest.send(bobDid.uri);
      expect(sendReply.status.code).to.equal(202);

      // fetch the requests from the remote
      remoteRequestsBob = await bobDwn.permissions.queryRequests({
        from: bobDid.uri
      });
      expect(remoteRequestsBob).to.have.length(1);
      expect(remoteRequestsBob[0].id).to.deep.equal(grantRequest.id);
    });
  });

  describe('store()', () => {
    it('stores the request', async () => {
      // create a grant not marked as stored
      const request = await aliceDwn.permissions.request({
        store : false,
        scope : { interface: DwnInterfaceName.Messages, method: DwnMethodName.Read }
      });

      // validate the grant does not exist in the DWN
      let fetchedRequests = await bobDwn.permissions.queryRequests({
        from: bobDid.uri,
      });
      expect(fetchedRequests.length).to.equal(0);

      const sentToBob = await request.send(bobDid.uri);
      expect(sentToBob.status.code).to.equal(202);

      // Bob fetches requests
      fetchedRequests = await bobDwn.permissions.queryRequests({
        from: bobDid.uri,
      });
      expect(fetchedRequests.length).to.equal(1);

      let localRequests = await bobDwn.permissions.queryRequests();
      expect(localRequests.length).to.equal(0);

      const remoteGrant = fetchedRequests[0];

      // store the grant
      const stored = await remoteGrant.store();
      expect(stored.status.code).to.equal(202);

      // validate the grant now exists in the DWN
      localRequests = await bobDwn.permissions.queryRequests();
      expect(localRequests.length).to.equal(1);
      expect(localRequests[0].toJSON()).to.deep.equal(request.toJSON());
    });
  });

  describe('grant()', () => {
    it('should create a grant and store it by default', async () => {
      const requestFromBob = await bobDwn.permissions.request({
        store : false,
        scope : { interface: DwnInterfaceName.Messages, method: DwnMethodName.Read }
      });

      const sentToAlice = await requestFromBob.send(aliceDid.uri);
      expect(sentToAlice.status.code).to.equal(202);

      // Alice fetches requests
      let requests = await aliceDwn.permissions.queryRequests({
        from: aliceDid.uri
      });
      expect(requests.length).to.equal(1);

      // confirm no grants exist
      let grants = await aliceDwn.permissions.queryGrants();
      expect(grants.length).to.equal(0);

      // Alice grants the request and it will be stored by default
      const dateExpires = Time.createOffsetTimestamp({ seconds: 60 });
      const grant = await requests[0].grant(dateExpires);
      expect(grant).to.exist;

      // confirm the grant exists
      grants = await aliceDwn.permissions.queryGrants();
      expect(grants.length).to.equal(1);
      expect(grants[0].id).to.equal(grant.id);
    });

    it('does not store the grant if store is false', async () => {
      const requestFromBob = await bobDwn.permissions.request({
        store : false,
        scope : { interface: DwnInterfaceName.Messages, method: DwnMethodName.Read }
      });

      const sentToAlice = await requestFromBob.send(aliceDid.uri);
      expect(sentToAlice.status.code).to.equal(202);

      // Alice fetches requests
      let requests = await aliceDwn.permissions.queryRequests({
        from: aliceDid.uri
      });
      expect(requests.length).to.equal(1);

      // confirm no grants exist
      let grants = await aliceDwn.permissions.queryGrants();
      expect(grants.length).to.equal(0);

      // Alice grants the request but does not store it
      const dateExpires = Time.createOffsetTimestamp({ seconds: 60 });
      const grant = await requests[0].grant(dateExpires, false);
      expect(grant).to.exist;

      // confirm the grant does not exist
      grants = await aliceDwn.permissions.queryGrants();
      expect(grants.length).to.equal(0);
    });
  });

  describe('toJSON()', () => {
    it('should return the PermissionRequest as a JSON object', async () => {
      const { request, message } = await testHarness.agent.permissions.createRequest({
        author : aliceDid.uri,
        scope  : {
          interface : DwnInterfaceName.Messages,
          method    : DwnMethodName.Read
        }
      });

      const grantRequest = await PermissionRequest.parse({
        agent        : testHarness.agent,
        connectedDid : bobDid.uri,
        message
      });

      expect(grantRequest.toJSON()).to.deep.equal(request);
    });
  });
});