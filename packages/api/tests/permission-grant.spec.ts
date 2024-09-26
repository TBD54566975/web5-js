import type { BearerDid } from '@web5/dids';

import sinon from 'sinon';
import { expect } from 'chai';
import { Web5UserAgent } from '@web5/user-agent';
import { testDwnUrl } from './utils/test-config.js';

// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';
import { PlatformAgentTestHarness } from '@web5/agent';
import { DwnInterfaceName, DwnMethodName, TestDataGenerator, Time } from '@tbd54566975/dwn-sdk-js';
import { PermissionGrant } from '../src/permission-grant.js';
import { DwnApi } from '../src/dwn-api.js';
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;

let testDwnUrls: string[] = [testDwnUrl];

describe('PermissionGrant', () => {
  let aliceDid: BearerDid;
  let bobDid: BearerDid;
  let aliceDwn: DwnApi;
  let bobDwn: DwnApi;
  let testHarness: PlatformAgentTestHarness;
  let protocolUri: string;

  before(async () => {
    testHarness = await PlatformAgentTestHarness.setup({
      agentClass  : Web5UserAgent,
      agentStores : 'memory'
    });

    sinon.restore();
    await testHarness.clearStorage();
    await testHarness.createAgentDid();

    // Create an "alice" Identity to author the DWN messages.
    const alice = await testHarness.createIdentity({ name: 'Alice', testDwnUrls });
    aliceDid = alice.did;

    // Create a "bob" Identity to author the DWN messages.
    const bob = await testHarness.createIdentity({ name: 'Bob', testDwnUrls });
    bobDid = bob.did;

    aliceDwn = new DwnApi({ agent: testHarness.agent, connectedDid: aliceDid.uri });
    bobDwn = new DwnApi({ agent: testHarness.agent, connectedDid: bobDid.uri });
  });

  beforeEach(async () => {
    sinon.restore();
    await testHarness.syncStore.clear();
    await testHarness.dwnDataStore.clear();
    await testHarness.dwnEventLog.clear();
    await testHarness.dwnMessageStore.clear();
    await testHarness.dwnResumableTaskStore.clear();
    await testHarness.agent.permissions.clear();
    testHarness.dwnStores.clear();

    // create a random protocol URI for each run
    protocolUri = `http://example.com/protocol/${TestDataGenerator.randomString(15)}`;
  });


  after(async () => {
    sinon.restore();
    await testHarness.clearStorage();
    await testHarness.closeStorage();
  });

  describe('parse()',() => {
    it('parses a grant message', async () => {
      const { grant, message } = await testHarness.agent.permissions.createGrant({
        store       : false,
        author      : aliceDid.uri,
        grantedTo   : bobDid.uri,
        requestId   : '123',
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        description : 'This is a grant',
        scope       : { interface: DwnInterfaceName.Messages, method: DwnMethodName.Read, protocol: protocolUri },
      });

      const parsedGrant = await PermissionGrant.parse({
        agent        : testHarness.agent,
        connectedDid : bobDid.uri,
        message,
      });

      expect(parsedGrant.toJSON()).to.deep.equal(grant);
      expect(parsedGrant.rawMessage).to.deep.equal(message);
      expect(parsedGrant.id).to.equal(grant.id);
      expect(parsedGrant.grantor).to.equal(grant.grantor);
      expect(parsedGrant.grantee).to.equal(grant.grantee);
      expect(parsedGrant.scope).to.deep.equal(grant.scope);
      expect(parsedGrant.conditions).to.deep.equal(grant.conditions);
      expect(parsedGrant.requestId).to.equal(grant.requestId);
      expect(parsedGrant.dateGranted).to.equal(grant.dateGranted);
      expect(parsedGrant.dateExpires).to.equal(grant.dateExpires);
      expect(parsedGrant.description).to.equal(grant.description);
      expect(parsedGrant.delegated).to.equal(grant.delegated);
    });

    //TODO: this should happen in the `dwn-sdk-js` helper
    xit('throws for an invalid grant');
  });

  describe('send()', () => {
    it('sends to connectedDID target by default', async () => {
      // Create a grant message.
      const grant = await aliceDwn.permissions.grant({
        store       : false,
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : { interface: DwnInterfaceName.Messages, method: DwnMethodName.Read, protocol: protocolUri },
      });

      // query the remote for the grant
      let fetchedRemote = await aliceDwn.permissions.queryGrants({
        from     : aliceDid.uri,
        protocol : protocolUri,
      });
      expect(fetchedRemote.length).to.equal(0);

      // send the grant
      const sent = await grant.send();
      expect(sent.status.code).to.equal(202);

      // query the remote for the grant, should now exist
      fetchedRemote = await aliceDwn.permissions.queryGrants({
        from     : aliceDid.uri,
        protocol : protocolUri,
      });
      expect(fetchedRemote.length).to.equal(1);
    });

    it('sends to a remote target', async () => {
      // Alice creates a grant for Bob
      const grant = await aliceDwn.permissions.grant({
        store       : false,
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : { interface: DwnInterfaceName.Messages, method: DwnMethodName.Read, protocol: protocolUri },
      });
      // alice sends it to her own DWN
      const aliceSent = await grant.send();
      expect(aliceSent.status.code).to.equal(202);

      // bob queries alice's remote for a grant
      const fetchedFromAlice = await bobDwn.permissions.queryGrants({
        from     : aliceDid.uri,
        protocol : protocolUri,
      });
      expect(fetchedFromAlice.length).to.equal(1);

      // fetch from bob's remote. should have no grants
      let fetchedRemote = await bobDwn.permissions.queryGrants({
        from     : bobDid.uri,
        protocol : protocolUri,
      });
      expect(fetchedRemote.length).to.equal(0);

      // fetchedGrant
      const fetchedGrant = fetchedFromAlice[0];

      // import the grant (signing as owner), but do not store it
      const imported = await fetchedGrant.import(false);
      expect(imported.status.code).to.equal(202);

      // send the grant to bob's remote
      const sent = await fetchedGrant.send(bobDid.uri);
      expect(sent.status.code).to.equal(202);
      // // send the gran
      // the grant should now exist in bob's remote
      fetchedRemote = await bobDwn.permissions.queryGrants({
        from     : bobDid.uri,
        protocol : protocolUri,
      });
      expect(fetchedRemote.length).to.equal(1);
      expect(fetchedRemote[0].toJSON()).to.deep.equal(grant.toJSON());
    });
  });

  describe('store()', () => {
    it('stores the grant as is', async () => {
      // create a grant not marked as stored
      const grant = await aliceDwn.permissions.grant({
        store       : false,
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : { interface: DwnInterfaceName.Messages, method: DwnMethodName.Read, protocol: protocolUri },
      });

      // validate the grant does not exist in the DWN
      let fetchedGrants = await aliceDwn.permissions.queryGrants({
        protocol: protocolUri,
      });
      expect(fetchedGrants.length).to.equal(0);

      // store the grant
      const stored = await grant.store();
      expect(stored.status.code).to.equal(202);

      // validate the grant now exists in the DWN
      fetchedGrants = await aliceDwn.permissions.queryGrants({
        protocol: protocolUri,
      });
      expect(fetchedGrants.length).to.equal(1);
      expect(fetchedGrants[0].toJSON()).to.deep.equal(grant.toJSON());
    });

    it('stores the grant and imports it', async () => {
      // alice creates a grant and sends it to her remote
      const grant = await aliceDwn.permissions.grant({
        store       : false,
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : { interface: DwnInterfaceName.Messages, method: DwnMethodName.Read, protocol: protocolUri },
      });
      const sent = await grant.send();
      expect(sent.status.code).to.equal(202);

      // bob queries alice's remote for a grant
      let fetchedFromAlice = await bobDwn.permissions.queryGrants({
        from     : aliceDid.uri,
        protocol : protocolUri,
      });
      expect(fetchedFromAlice.length).to.equal(1);

      // attempt to store it without importing, should fail
      let fetchedGrant = fetchedFromAlice[0];
      let stored = await fetchedGrant.store();
      expect(stored.status.code).to.equal(401);

      // attempt to fetch from local to ensure it was not imported
      let fetchedLocal = await bobDwn.permissions.queryGrants({
        protocol: protocolUri,
      });
      expect(fetchedLocal.length).to.equal(0);

      // store the grant and import it
      stored = await fetchedGrant.store(true);
      expect(stored.status.code).to.equal(202);

      // fetch from local to ensure it was imported
      fetchedLocal = await bobDwn.permissions.queryGrants({
        protocol: protocolUri,
      });
      expect(fetchedLocal.length).to.equal(1);
      expect(fetchedLocal[0].toJSON()).to.deep.equal(fetchedGrant.toJSON());
    });
  });

  describe('import()', () => {
    it('imports the grant without storing it', async () => {
      // alice creates a grant and sends it to her remote
      const grant = await aliceDwn.permissions.grant({
        store       : false,
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : { interface: DwnInterfaceName.Messages, method: DwnMethodName.Read, protocol: protocolUri },
      });
      const sent = await grant.send();
      expect(sent.status.code).to.equal(202);

      // bob queries alice's remote for a grant
      let fetchedFromAlice = await bobDwn.permissions.queryGrants({
        from     : aliceDid.uri,
        protocol : protocolUri,
      });
      expect(fetchedFromAlice.length).to.equal(1);
      const fetchedGrant = fetchedFromAlice[0];

      // confirm the grant does not yet exist in bob's remote
      let fetchedRemote = await bobDwn.permissions.queryGrants({
        from     : bobDid.uri,
        protocol : protocolUri,
      });
      expect(fetchedRemote.length).to.equal(0);

      // attempt to send it to bob's remote without importing it first
      let sentToBob = await fetchedGrant.send(bobDid.uri);
      expect(sentToBob.status.code).to.equal(401);

      // import the grant without storing it
      let imported = await fetchedGrant.import(false);
      expect(imported.status.code).to.equal(202);

      // fetch from local to ensure it was not stored
      const fetchedLocal = await bobDwn.permissions.queryGrants({
        protocol: protocolUri,
      });
      expect(fetchedLocal.length).to.equal(0);

      // send the grant to bob's remote
      sentToBob = await fetchedGrant.send(bobDid.uri);
      expect(sentToBob.status.code).to.equal(202);

      // fetch from bob's remote to ensure it was imported
      fetchedRemote = await bobDwn.permissions.queryGrants({
        from     : bobDid.uri,
        protocol : protocolUri,
      });
      expect(fetchedRemote.length).to.equal(1);
      expect(fetchedRemote[0].toJSON()).to.deep.equal(fetchedGrant.toJSON());
    });

    it('imports the grant and stores it', async () => {
      // alice creates a grant and sends it to her remote
      const grant = await aliceDwn.permissions.grant({
        store       : false,
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : { interface: DwnInterfaceName.Messages, method: DwnMethodName.Read, protocol: protocolUri },
      });
      const sent = await grant.send();
      expect(sent.status.code).to.equal(202);

      // bob queries alice's remote for a grant
      let fetchedFromAlice = await bobDwn.permissions.queryGrants({
        from     : aliceDid.uri,
        protocol : protocolUri,
      });
      expect(fetchedFromAlice.length).to.equal(1);
      const fetchedGrant = fetchedFromAlice[0];

      // confirm the grant does not yet exist in bob's remote
      let fetchedRemote = await bobDwn.permissions.queryGrants({
        from     : bobDid.uri,
        protocol : protocolUri,
      });
      expect(fetchedRemote.length).to.equal(0);

      // import the grant and store it
      let imported = await fetchedGrant.import(true);
      expect(imported.status.code).to.equal(202);

      // fetch from local to ensure it was stored
      const fetchedLocal = await bobDwn.permissions.queryGrants({
        protocol: protocolUri,
      });
      expect(fetchedLocal.length).to.equal(1);
      expect(fetchedLocal[0].toJSON()).to.deep.equal(fetchedGrant.toJSON());
    });
  });

  describe('toJSON()', () => {
    it('returns the grant as a PermissionsGrant JSON object', async () => {
      const { grant, message } = await testHarness.agent.permissions.createGrant({
        store       : false,
        author      : aliceDid.uri,
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : { interface: DwnInterfaceName.Messages, method: DwnMethodName.Read, protocol: protocolUri },
      });

      const parsedGrant = await PermissionGrant.parse({
        agent        : testHarness.agent,
        connectedDid : bobDid.uri,
        message,
      });

      expect(parsedGrant.toJSON()).to.deep.equal(grant);
    });
  });

  describe('revoke()', () => {
    it('revokes the grant, stores it by default', async () => {
      // create a grant
      const grant = await aliceDwn.permissions.grant({
        store       : true,
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : { interface: DwnInterfaceName.Messages, method: DwnMethodName.Read, protocol: protocolUri },
      });

      let isRevoked = await grant.isRevoked();
      expect(isRevoked).to.equal(false);

      // revoke the grant, stores it by default
      const revocation = await grant.revoke();
      expect(revocation.author).to.equal(aliceDid.uri);

      isRevoked = await grant.isRevoked();
      expect(isRevoked).to.equal(true);
    });

    it('revokes the grant, does not store it', async () => {
      // create a grant
      const grant = await aliceDwn.permissions.grant({
        store       : true,
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : { interface: DwnInterfaceName.Messages, method: DwnMethodName.Read, protocol: protocolUri },
      });

      let isRevoked = await grant.isRevoked();
      expect(isRevoked).to.equal(false);

      // revoke the grant but do not store it
      const revocation = await grant.revoke(false);
      expect(revocation.author).to.equal(aliceDid.uri);

      // is still false
      isRevoked = await grant.isRevoked();
      expect(isRevoked).to.equal(false);

      // store the revocation
      await revocation.store();

      // is now true
      isRevoked = await grant.isRevoked();
      expect(isRevoked).to.equal(true);
    });

    it('sends the revocation to a remote target', async () => {
      // create a grant
      const grant = await aliceDwn.permissions.grant({
        store       : true,
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : { interface: DwnInterfaceName.Messages, method: DwnMethodName.Read, protocol: protocolUri },
      });

      // send the grant to alice's remote
      const sentGrant = await grant.send();
      expect(sentGrant.status.code).to.equal(202);

      // revoke the grant but do not store it
      const revocation = await grant.revoke(false);
      const sendToAliceRevoke = await revocation.send(aliceDid.uri);
      expect(sendToAliceRevoke.status.code).to.equal(202);

      // should not return revoked since it was not stored locally
      let isRevoked = await grant.isRevoked();
      expect(isRevoked).to.equal(false);

      // check the revocation status of the grant on alice's remote node
      isRevoked = await grant.isRevoked(true);
      expect(isRevoked).to.equal(true);
    });
  });

  describe('isRevoked()', () => {
    it('checks revocation status of local DWN', async () => {
      // create a grant
      const grant = await aliceDwn.permissions.grant({
        store       : true,
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : { interface: DwnInterfaceName.Messages, method: DwnMethodName.Read, protocol: protocolUri },
      });

      let isRevoked = await grant.isRevoked();
      expect(isRevoked).to.equal(false);

      // revoke the grant
      const revocation = await grant.revoke();
      expect(revocation.author).to.equal(aliceDid.uri);

      isRevoked = await grant.isRevoked();
      expect(isRevoked).to.equal(true);
    });

    it('checks revocation status of remote DWN', async () => {
      // create a grant
      const grant = await aliceDwn.permissions.grant({
        store       : true,
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : { interface: DwnInterfaceName.Messages, method: DwnMethodName.Read, protocol: protocolUri },
      });

      // send the grant to alice's remote
      const sentGrant = await grant.send();
      expect(sentGrant.status.code).to.equal(202);

      // revoke the grant but do not store it locally
      const revocation = await grant.revoke(false);
      expect(revocation.author).to.equal(aliceDid.uri);

      // check the revocation status on alice's remote node first
      let isRevoked = await grant.isRevoked(true);
      expect(isRevoked).to.equal(false);

      // send the revocation to alice's remote
      const sentRevocation = await revocation.send();
      expect(sentRevocation.status.code).to.equal(202);

      // check the revocation status of the grant on alice's remote node
      isRevoked = await grant.isRevoked(true);
      expect(isRevoked).to.equal(true);
    });
  });
});