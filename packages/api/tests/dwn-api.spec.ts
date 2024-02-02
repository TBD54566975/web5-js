import type { PortableDid } from '@web5/dids';

import sinon from 'sinon';
import { expect } from 'chai';
import { TestManagedAgent } from '@web5/agent';
import { DateSort } from '@tbd54566975/dwn-sdk-js';

import { DwnApi } from '../src/dwn-api.js';
import { testDwnUrl } from './utils/test-config.js';
import { TestUserAgent } from './utils/test-user-agent.js';
import emailProtocolDefinition from './fixtures/protocol-definitions/email.json' assert { type: 'json' };
import photosProtocolDefinition from './fixtures/protocol-definitions/photos.json' assert { type: 'json' };

let testDwnUrls: string[] = [testDwnUrl];

describe('DwnApi', () => {
  let aliceDid: PortableDid;
  let bobDid: PortableDid;
  let dwnAlice: DwnApi;
  let dwnBob: DwnApi;
  let testAgent: TestManagedAgent;

  before(async () => {
    testAgent = await TestManagedAgent.create({
      agentClass  : TestUserAgent,
      agentStores : 'memory'
    });
  });

  beforeEach(async () => {
    await testAgent.clearStorage();

    // Create an Agent DID.
    await testAgent.createAgentDid();

    // Create an "alice" Identity to author the DWN messages.
    ({ did: aliceDid } = await testAgent.createIdentity({ testDwnUrls }));
    await testAgent.agent.identityManager.import({
      did      : aliceDid,
      identity : { name: 'Alice', did: aliceDid.did },
      kms      : 'local'
    });

    // Create a "bob" Identity to author the DWN messages.
    ({ did: bobDid } = await testAgent.createIdentity({ testDwnUrls }));
    await testAgent.agent.identityManager.import({
      did      : bobDid,
      identity : { name: 'Bob', did: bobDid.did },
      kms      : 'local'
    });

    // Instantiate DwnApi for both test identities.
    dwnAlice = new DwnApi({ agent: testAgent.agent, connectedDid: aliceDid.did });
    dwnBob = new DwnApi({ agent: testAgent.agent, connectedDid: bobDid.did });
  });

  after(async () => {
    await testAgent.clearStorage();
    await testAgent.closeStorage();
  });

  describe('protocols.configure()', () => {
    describe('agent', () => {
      it('writes a protocol definition', async () => {
        const response = await dwnAlice.protocols.configure({
          message: {
            definition: emailProtocolDefinition
          }
        });

        expect(response.status.code).to.equal(202);
        expect(response.status.detail).to.equal('Accepted');
      });
    });
  });

  describe('protocols.query()', () => {
    describe('agent', () => {
      it('should return protocols matching the query', async () => {
        // Write a protocols configure to the connected agent's DWN.
        const configureResponse = await dwnAlice.protocols.configure({
          message: {
            definition: emailProtocolDefinition
          }
        });
        expect(configureResponse.status.code).to.equal(202);
        expect(configureResponse.status.detail).to.equal('Accepted');

        // Query for the protocol just configured.
        const queryResponse = await dwnAlice.protocols.query({
          message: {
            filter: {
              protocol: emailProtocolDefinition.protocol
            }
          }
        });

        expect(queryResponse.status.code).to.equal(200);
        expect(queryResponse.protocols.length).to.equal(1);
        expect(queryResponse.protocols[0].definition).to.have.property('types');
        expect(queryResponse.protocols[0].definition).to.have.property('protocol');
        expect(queryResponse.protocols[0].definition.protocol).to.equal(emailProtocolDefinition.protocol);
        expect(queryResponse.protocols[0].definition).to.have.property('structure');
      });
    });

    describe('from: did', () => {
      it('should return protocols matching the query', async () => {
        // Write a protocols configure to the connected agent's DWN.
        const configureResponse = await dwnAlice.protocols.configure({
          message: {
            definition: emailProtocolDefinition
          }
        });
        expect(configureResponse.status.code).to.equal(202);
        expect(configureResponse.status.detail).to.equal('Accepted');

        // Write the protocol to the remote DWN.
        await configureResponse.protocol.send(aliceDid.did);

        // Query for the protocol just configured.
        const queryResponse = await dwnAlice.protocols.query({
          from    : aliceDid.did,
          message : {
            filter: {
              protocol: emailProtocolDefinition.protocol
            }
          }
        });

        expect(queryResponse.status.code).to.equal(200);
        expect(queryResponse.protocols.length).to.equal(1);
        expect(queryResponse.protocols[0].definition).to.have.property('types');
        expect(queryResponse.protocols[0].definition).to.have.property('protocol');
        expect(queryResponse.protocols[0].definition.protocol).to.equal(emailProtocolDefinition.protocol);
        expect(queryResponse.protocols[0].definition).to.have.property('structure');
      });

      it('returns empty protocols array when no protocols match the filter provided', async () => {
        // Query for a non-existent protocol.
        const response = await dwnAlice.protocols.query({
          from    : aliceDid.did,
          message : {
            filter: {
              protocol: 'https://doesnotexist.com/protocol'
            }
          }
        });

        expect(response.status.code).to.equal(200);
        expect(response.protocols).to.exist;
        expect(response.protocols.length).to.equal(0);
      });

      it('returns published protocol definitions for requests from external DID', async () => {
        // Configure a published protocol on Alice's local DWN.
        const publicProtocol = await dwnAlice.protocols.configure({
          message: {
            definition: { ...emailProtocolDefinition, protocol: 'http://proto-published', published: true }
          }
        });
        expect(publicProtocol.status.code).to.equal(202);

        // Configure the published protocol on Alice's remote DWN.
        const sendPublic = await publicProtocol.protocol.send(aliceDid.did);
        expect(sendPublic.status.code).to.equal(202);

        // Attempt to query for the published protocol on Alice's remote DWN authored by Bob.
        const publishedResponse = await dwnBob.protocols.query({
          from    : aliceDid.did,
          message : {
            filter: {
              protocol: 'http://proto-published'
            }
          }
        });

        // Verify that one query result is returned.
        expect(publishedResponse.status.code).to.equal(200);
        expect(publishedResponse.protocols.length).to.equal(1);
        expect(publishedResponse.protocols[0].definition.protocol).to.equal('http://proto-published');
      });

      it('does not return unpublished protocol definitions for requests from external DID', async () => {
        // Configure an unpublished protocol on Alice's DWN.
        const notPublicProtocol = await dwnAlice.protocols.configure({
          message: {
            definition: { ...emailProtocolDefinition, protocol: 'http://proto-not-published', published: false }
          }
        });
        expect(notPublicProtocol.status.code).to.equal(202);

        // Configure the unpublished protocol on Alice's remote DWN.
        const sendNotPublic = await notPublicProtocol.protocol.send(aliceDid.did);
        expect(sendNotPublic.status.code).to.equal(202);

        // Attempt to query for the unpublished protocol on Alice's remote DWN authored by Bob.
        const nonPublishedResponse = await dwnBob.protocols.query({
          from    : aliceDid.did,
          message : {
            filter: {
              protocol: 'http://proto-not-published'
            }
          }
        });

        // Verify that no query results are returned.
        expect(nonPublishedResponse.status.code).to.equal(200);
        expect(nonPublishedResponse.protocols.length).to.equal(0);
      });

      it('returns a 401 with an invalid permissions grant', async () => {
        // Attempt to query for a record using Bob's DWN tenant with an invalid grant.
        const response = await dwnAlice.protocols.query({
          from    : bobDid.did,
          message : {
            permissionsGrantId : 'bafyreiduimprbncdo2oruvjrvmfmwuyz4xx3d5biegqd2qntlryvuuosem',
            filter             : {
              protocol: 'https://doesnotexist.com/protocol'
            }
          }
        });

        expect(response.status.code).to.equal(401);
        expect(response.status.detail).to.include('GrantAuthorizationGrantMissing');
        expect(response.protocols).to.exist;
        expect(response.protocols.length).to.equal(0);
      });
    });
  });

  describe('records.create()', () => {
    describe('agent', () => {
      it('creates a record with string data', async () => {
        const dataString = 'Hello, world!Hello, world!';
        const result = await dwnAlice.records.create({
          data    : dataString,
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });

        expect(result.status.code).to.equal(202);
        expect(result.status.detail).to.equal('Accepted');
        expect(result.record).to.exist;
        expect(await result.record?.data.text()).to.equal(dataString);
      });

      it('creates a record with JSON data', async () => {
        const dataJson = { hello: 'world!'};
        const result = await dwnAlice.records.create({
          data    : dataJson,
          message : {
            schema     : 'foo/bar',
            dataFormat : 'application/json'
          }
        });

        expect(result.status.code).to.equal(202);
        expect(result.status.detail).to.equal('Accepted');
        expect(result.record).to.exist;
        expect(await result.record?.data.json()).to.deep.equal(dataJson);
      });

      it('creates a role record for another user that they can use to create role-based records', async () => {
        /**
         * WHAT IS BEING TESTED?
         *
         * We are testing whether role records can be created for outbound participants
         * so they can use them to create records corresponding to the roles they are granted.
         *
         * TEST SETUP STEPS:
         *    1. Configure the photos protocol on Bob and Alice's remote and local DWNs.
         *    2. Alice creates a role-based 'friend' record for Bob, updates it, then sends it to her remote DWN.
         *    3. Bob creates an album record using the role 'friend', adds Alice as a `participant` of the album and sends the records to Alice.
         *    4. Alice fetches the album, and the `participant` record to store it on her local DWN.
         *    5. Alice adds Bob as an `updater` of the album and sends the record to Bob and her own remote node. This allows bob to edit photos in the album.
         *    6. Alice creates a photo using her participant role and sends it to her own DWN and Bob's DWN.
         *    7. Bob updates the photo using his updater role and sends it to Alice and his own DWN.
         *    8. Alice fetches the photo and stores it on her local DWN.
         */

        // Configure the photos protocol on Alice and Bob's local and remote DWNs.
        const { status: bobProtocolStatus, protocol: bobProtocol } = await dwnBob.protocols.configure({
          message: {
            definition: photosProtocolDefinition
          }
        });
        expect(bobProtocolStatus.code).to.equal(202);
        const { status: bobRemoteProtocolStatus } = await bobProtocol.send(bobDid.did);
        expect(bobRemoteProtocolStatus.code).to.equal(202);

        const { status: aliceProtocolStatus, protocol: aliceProtocol } = await dwnAlice.protocols.configure({
          message: {
            definition: photosProtocolDefinition
          }
        });
        expect(aliceProtocolStatus.code).to.equal(202);
        const { status: aliceRemoteProtocolStatus } = await aliceProtocol.send(aliceDid.did);
        expect(aliceRemoteProtocolStatus.code).to.equal(202);

        // Alice creates a role-based 'friend' record, updates it, then sends it to her remote DWN.
        const { status: friendCreateStatus, record: friendRecord} = await dwnAlice.records.create({
          data    : 'test',
          message : {
            recipient    : bobDid.did,
            protocol     : photosProtocolDefinition.protocol,
            protocolPath : 'friend',
            schema       : photosProtocolDefinition.types.friend.schema,
            dataFormat   : 'text/plain'
          }
        });
        expect(friendCreateStatus.code).to.equal(202);
        const { status: friendRecordUpdateStatus } = await friendRecord.update({ data: 'update' });
        expect(friendRecordUpdateStatus.code).to.equal(202);
        const { status: aliceFriendSendStatus } = await friendRecord.send(aliceDid.did);
        expect(aliceFriendSendStatus.code).to.equal(202);

        // Bob creates an album record using the role 'friend' and sends it to Alice
        const { status: albumCreateStatus, record: albumRecord} = await dwnBob.records.create({
          data    : 'test',
          message : {
            recipient    : aliceDid.did,
            protocol     : photosProtocolDefinition.protocol,
            protocolPath : 'album',
            protocolRole : 'friend',
            schema       : photosProtocolDefinition.types.album.schema,
            dataFormat   : 'text/plain'
          }
        });
        expect(albumCreateStatus.code).to.equal(202);
        const { status: bobAlbumSendStatus } = await albumRecord.send(bobDid.did);
        expect(bobAlbumSendStatus.code).to.equal(202);
        const { status: aliceAlbumSendStatus } = await albumRecord.send(aliceDid.did);
        expect(aliceAlbumSendStatus.code).to.equal(202);

        // Bob makes Alice a `participant` and sends the record to her and his own remote node.
        const { status: participantCreateStatus, record: participantRecord} = await dwnBob.records.create({
          data    : 'test',
          message : {
            contextId    : albumRecord.id,
            parentId     : albumRecord.id,
            recipient    : aliceDid.did,
            protocol     : photosProtocolDefinition.protocol,
            protocolPath : 'album/participant',
            schema       : photosProtocolDefinition.types.participant.schema,
            dataFormat   : 'text/plain'
          }
        });
        expect(participantCreateStatus.code).to.equal(202);
        const { status: bobParticipantSendStatus } = await participantRecord.send(bobDid.did);
        expect(bobParticipantSendStatus.code).to.equal(202);
        const { status: aliceParticipantSendStatus } = await participantRecord.send(aliceDid.did);
        expect(aliceParticipantSendStatus.code).to.equal(202);

        // Alice fetches the album record as well as the participant record that Bob created and stores it on her local node.
        const aliceAlbumReadResult = await dwnAlice.records.read({
          from    : aliceDid.did,
          message : {
            filter: {
              recordId: albumRecord.id
            }
          }
        });
        expect(aliceAlbumReadResult.status.code).to.equal(200);
        expect(aliceAlbumReadResult.record).to.exist;
        const { status: aliceAlbumReadStoreStatus } = await aliceAlbumReadResult.record.store();
        expect(aliceAlbumReadStoreStatus.code).to.equal(202);

        const aliceParticipantReadResult = await dwnAlice.records.read({
          from    : aliceDid.did,
          message : {
            filter: {
              recordId: participantRecord.id
            }
          }
        });
        expect(aliceParticipantReadResult.status.code).to.equal(200);
        expect(aliceParticipantReadResult.record).to.exist;
        const { status: aliceParticipantReadStoreStatus } = await aliceParticipantReadResult.record.store();
        expect(aliceParticipantReadStoreStatus.code).to.equal(202);

        // Using the participant role, Alice can make Bob an `updater` and send the record to him and her own remote node.
        // Only updater roles can update the photo record after it's been created.
        const { status: updaterCreateStatus, record: updaterRecord} = await dwnAlice.records.create({
          data    : 'test',
          message : {
            contextId    : albumRecord.id,
            parentId     : albumRecord.id,
            recipient    : bobDid.did,
            protocol     : photosProtocolDefinition.protocol,
            protocolPath : 'album/updater',
            protocolRole : 'album/participant',
            schema       : photosProtocolDefinition.types.updater.schema,
            dataFormat   : 'text/plain'
          }
        });
        expect(updaterCreateStatus.code).to.equal(202);
        const { status: bobUpdaterSendStatus } = await updaterRecord.send(bobDid.did);
        expect(bobUpdaterSendStatus.code).to.equal(202);
        const { status: aliceUpdaterSendStatus } = await updaterRecord.send(aliceDid.did);
        expect(aliceUpdaterSendStatus.code).to.equal(202);

        // Alice creates a photo using her participant role and sends it to her own DWN and Bob's DWN.
        const { status: photoCreateStatus, record: photoRecord} = await dwnAlice.records.create({
          data    : 'test',
          message : {
            contextId    : albumRecord.id,
            parentId     : albumRecord.id,
            protocol     : photosProtocolDefinition.protocol,
            protocolPath : 'album/photo',
            protocolRole : 'album/participant',
            schema       : photosProtocolDefinition.types.photo.schema,
            dataFormat   : 'text/plain'
          }
        });
        expect(photoCreateStatus.code).to.equal(202);
        const { status:alicePhotoSendStatus } = await photoRecord.send(aliceDid.did);
        expect(alicePhotoSendStatus.code).to.equal(202);
        const { status: bobPhotoSendStatus } = await photoRecord.send(bobDid.did);
        expect(bobPhotoSendStatus.code).to.equal(202);

        // Bob updates the photo using his updater role and sends it to Alice and his own DWN.
        const { status: photoUpdateStatus, record: photoUpdateRecord} = await dwnBob.records.write({
          data    : 'test again',
          store   : false,
          message : {
            contextId    : albumRecord.id,
            parentId     : albumRecord.id,
            recordId     : photoRecord.id,
            dateCreated  : photoRecord.dateCreated,
            protocol     : photosProtocolDefinition.protocol,
            protocolPath : 'album/photo',
            protocolRole : 'album/updater',
            schema       : photosProtocolDefinition.types.photo.schema,
            dataFormat   : 'text/plain'
          }
        });
        expect(photoUpdateStatus.code).to.equal(202);
        const { status:alicePhotoUpdateSendStatus } = await photoUpdateRecord.send(aliceDid.did);
        expect(alicePhotoUpdateSendStatus.code).to.equal(202);
        const { status: bobPhotoUpdateSendStatus } = await photoUpdateRecord.send(bobDid.did);
        expect(bobPhotoUpdateSendStatus.code).to.equal(202);

        // Alice fetches the photo and stores it on her local DWN.
        const alicePhotoReadResult = await dwnAlice.records.read({
          from    : aliceDid.did,
          message : {
            filter: {
              recordId: photoRecord.id
            }
          }
        });
        expect(alicePhotoReadResult.status.code).to.equal(200);
        expect(alicePhotoReadResult.record).to.exist;
        const { status: alicePhotoReadStoreStatus } = await alicePhotoReadResult.record.store();
        expect(alicePhotoReadStoreStatus.code).to.equal(202);
      });
    });

    describe('agent store: false', () => {
      it('does not persist record to agent DWN', async () => {
        const dataString = 'Hello, world!';
        const createResult = await dwnAlice.records.create({
          store   : false,
          data    : dataString,
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });

        expect(createResult.status.code).to.equal(202);
        expect(createResult.status.detail).to.equal('Accepted');
        expect(createResult.record).to.exist;
        expect(await createResult.record?.data.text()).to.equal(dataString);

        const queryResult = await dwnAlice.records.query({
          message: {
            filter: {
              schema: 'foo/bar'
            }
          }
        });

        expect(queryResult.status.code).to.equal(200);
        expect(queryResult.records).to.exist;
        expect(queryResult.records!.length).to.equal(0);
      });

      it('has no effect if `store: true`', async () => {
        const dataString = 'Hello, world!';
        const createResult = await dwnAlice.records.create({
          store   : true,
          data    : dataString,
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });

        expect(createResult.status.code).to.equal(202);
        expect(createResult.status.detail).to.equal('Accepted');
        expect(createResult.record).to.exist;
        expect(await createResult.record?.data.text()).to.equal(dataString);

        const queryResult = await dwnAlice.records.query({
          message: {
            filter: {
              schema: 'foo/bar'
            }
          }
        });

        expect(queryResult.status.code).to.equal(200);
        expect(queryResult.records).to.exist;
        expect(queryResult.records!.length).to.equal(1);
        expect(queryResult.records![0].id).to.equal(createResult.record!.id);
        expect(await queryResult.records![0].data.text()).to.equal(dataString);
      });
    });
  });

  describe('records.createFrom()', () => {
    describe('agent', () => {
      it('creates a new record that inherits properties from an existing record', async () => {
        // Create a record.
        const { record: baseRecord } = await dwnAlice.records.create({
          data    : 'Hello, world!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });

        // Create a new record, inheriting properties from the first record.
        const writeResponse = await dwnAlice.records.createFrom({
          author : aliceDid.did,
          data   : 'Foo bar!',
          record : baseRecord
        });

        expect(writeResponse.status.code).to.equal(202);
        expect(writeResponse.status.detail).to.equal('Accepted');
        expect(writeResponse.record).to.exist;
        expect(await writeResponse.record?.data.text()).to.equal('Foo bar!');
      });
    });
  });

  describe('records.delete()', () => {
    describe('agent', () => {
      it('deletes a record', async () => {
        const { status: writeStatus, record }  = await dwnAlice.records.write({
          data    : 'Hello, world!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });

        expect(writeStatus.code).to.equal(202);
        expect(record).to.not.be.undefined;

        // Write the record to Alice's remote DWN.
        const { status } = await record!.send(aliceDid.did);
        expect(status.code).to.equal(202);

        const deleteResult = await dwnAlice.records.delete({
          message: {
            recordId: record!.id
          }
        });

        expect(deleteResult.status.code).to.equal(202);
      });

      it('returns a 404 when the specified record does not exist', async () => {
        let deleteResult = await dwnAlice.records.delete({
          message: {
            recordId: 'abcd1234'
          }
        });
        expect(deleteResult.status.code).to.equal(404);
      });
    });

    describe('from: did', () => {
      it('deletes a record', async () => {
        const { status: writeStatus, record }  = await dwnAlice.records.write({
          data    : 'Hello, world!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });

        expect(writeStatus.code).to.equal(202);
        expect(record).to.not.be.undefined;

        // Write the record to the remote DWN.
        const { status } = await record!.send(aliceDid.did);
        expect(status.code).to.equal(202);

        // Attempt to delete a record from the remote DWN.
        const deleteResult = await dwnAlice.records.delete({
          from    : aliceDid.did,
          message : {
            recordId: record.id
          }
        });

        expect(deleteResult.status.code).to.equal(202);
        expect(deleteResult.status.detail).to.equal('Accepted');
      });

      it('returns a 401 when authentication or authorization fails', async () => {
        // Create a record on Bob's local DWN.
        const writeResult = await dwnBob.records.write({
          data    : 'Hello, world!',
          message : {
            dataFormat: 'foo'
          }
        });
        expect(writeResult.status.code).to.equal(202);

        // Write the record to Bob's remote DWN.
        const sendResult = await writeResult.record.send(bobDid.did);
        expect(sendResult.status.code).to.equal(202);

        // Alice attempts to delete a record from Bob's remote DWN specifying a recordId.
        const deleteResult = await dwnAlice.records.delete({
          from    : bobDid.did,
          message : {
            recordId: writeResult.record.id
          }
        });

        /** Confirm that authorization failed because the Alice identity does not have
         * permission to delete a record from Bob's DWN. */
        expect(deleteResult.status.code).to.equal(401);
        expect(deleteResult.status.detail).to.include('message failed authorization');
      });

      it('deletes records that were authored/signed by another DID', async () => {
        /**
         * WHAT IS BEING TESTED?
         *
         * We are testing whether a record authored/signed by one party (Alice) can be written to
         * another party's DWN (Bob), and that recipient (Bob) is able to delete the record.
         *
         * TEST SETUP STEPS:
         *   1. Configure the email protocol on Bob's local DWN.
         */
        const { status: bobProtocolStatus, protocol: bobProtocol } = await dwnBob.protocols.configure({
          message: {
            definition: emailProtocolDefinition
          }
        });
        expect(bobProtocolStatus.code).to.equal(202);
        /**
         *   2. Configure the email protocol on Bob's remote DWN.
         */
        const { status: bobRemoteProtocolStatus } = await bobProtocol.send(bobDid.did);
        expect(bobRemoteProtocolStatus.code).to.equal(202);
        /**
         *   3. Alice creates a record, but doesn't store it locally.
         */
        const { status: createStatus, record: testRecord} = await dwnAlice.records.create({
          store   : false,
          data    : 'test',
          message : {
            protocol     : 'http://email-protocol.xyz',
            protocolPath : 'email',
            schema       : 'http://email-protocol.xyz/schema/email',
            dataFormat   : 'text/plain'
          }
        });
        expect(createStatus.code).to.equal(202);
        expect(testRecord.author).to.equal(aliceDid.did);
        /**
         *   4. Alice writes the record to Bob's remote DWN.
         */
        const { status: sendStatus } = await testRecord.send(bobDid.did);
        expect(sendStatus.code).to.equal(202);
        /**
         *   5. Bob deletes the record from his remote DWN.
         */
        const deleteResult = await dwnBob.records.delete({
          from    : bobDid.did,
          message : {
            recordId: testRecord.id
          }
        });
        expect(deleteResult.status.code).to.equal(202);
      });
    });
  });

  describe('records.query()', () => {
    describe('agent', () => {
      it('returns an array of records that match the filter provided', async () => {
        const writeResult = await dwnAlice.records.write({
          data    : 'Hello, world!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });

        expect(writeResult.status.code).to.equal(202);
        expect(writeResult.status.detail).to.equal('Accepted');
        expect(writeResult.record).to.exist;

        const result = await dwnAlice.records.query({
          message: {
            filter: {
              schema: 'foo/bar'
            }
          }
        });

        expect(result.status.code).to.equal(200);
        expect(result.records).to.exist;
        expect(result.records!.length).to.equal(1);
        expect(result.records![0].id).to.equal(writeResult.record!.id);
      });

      it('returns cursor when there are additional results', async () => {
        for(let i = 0; i < 3; i++ ) {
          const writeResult = await dwnAlice.records.write({
            data    : `Hello, world ${i + 1}!`,
            message : {
              schema     : 'foo/bar',
              dataFormat : 'text/plain'
            }
          });

          expect(writeResult.status.code).to.equal(202);
          expect(writeResult.status.detail).to.equal('Accepted');
          expect(writeResult.record).to.exist;
        }

        const results = await dwnAlice.records.query({
          message: {
            filter: {
              schema: 'foo/bar'
            },
            pagination: { limit: 2 } // set a limit of 2
          }
        });

        expect(results.status.code).to.equal(200);
        expect(results.records).to.exist;
        expect(results.records!.length).to.equal(2);
        expect(results.cursor).to.exist;

        const additionalResults = await dwnAlice.records.query({
          message: {
            filter: {
              schema: 'foo/bar'
            },
            pagination: { limit: 2, cursor: results.cursor}
          }
        });
        expect(additionalResults.status.code).to.equal(200);
        expect(additionalResults.records).to.exist;
        expect(additionalResults.records!.length).to.equal(1);
        expect(additionalResults.cursor).to.not.exist;
      });

      it('sorts results based on provided query sort parameter', async () => {
        const clock = sinon.useFakeTimers();

        const items = [];
        const publishedItems = [];
        for(let i = 0; i < 6; i++ ) {
          const writeResult = await dwnAlice.records.write({
            data    : `Hello, world ${i + 1}!`,
            message : {
              published  : i % 2 == 0 ? true : false,
              schema     : 'foo/bar',
              dataFormat : 'text/plain'
            }
          });

          expect(writeResult.status.code).to.equal(202);
          expect(writeResult.status.detail).to.equal('Accepted');
          expect(writeResult.record).to.exist;

          items.push(writeResult.record.id); // add id to list in the order it was inserted
          if (writeResult.record.published === true) {
            publishedItems.push(writeResult.record.id); // add published records separately
          }

          clock.tick(1000 * 1); // travel forward one second
        }
        clock.restore();

        // query in ascending order by the dateCreated field
        const createdAscResults = await dwnAlice.records.query({
          message: {
            filter: {
              schema: 'foo/bar'
            },
            dateSort: DateSort.CreatedAscending // same as default
          }
        });
        expect(createdAscResults.status.code).to.equal(200);
        expect(createdAscResults.records).to.exist;
        expect(createdAscResults.records!.length).to.equal(6);
        expect(createdAscResults.records.map(r => r.id)).to.eql(items);

        // query in descending order by the dateCreated field
        const createdDescResults = await dwnAlice.records.query({
          message: {
            filter: {
              schema: 'foo/bar'
            },
            dateSort: DateSort.CreatedDescending
          }
        });
        expect(createdDescResults.status.code).to.equal(200);
        expect(createdDescResults.records).to.exist;
        expect(createdDescResults.records!.length).to.equal(6);
        expect(createdDescResults.records.map(r => r.id)).to.eql([...items].reverse());

        // query in ascending order by the datePublished field, this will only return published records
        const publishedAscResults = await dwnAlice.records.query({
          message: {
            filter: {
              schema: 'foo/bar'
            },
            dateSort: DateSort.PublishedAscending
          }
        });
        expect(publishedAscResults.status.code).to.equal(200);
        expect(publishedAscResults.records).to.exist;
        expect(publishedAscResults.records!.length).to.equal(3);
        expect(publishedAscResults.records.map(r => r.id)).to.eql(publishedItems);

        // query in desscending order by the datePublished field, this will only return published records
        const publishedDescResults = await dwnAlice.records.query({
          message: {
            filter: {
              schema: 'foo/bar'
            },
            dateSort: DateSort.PublishedDescending
          }
        });
        expect(publishedDescResults.status.code).to.equal(200);
        expect(publishedDescResults.records).to.exist;
        expect(publishedDescResults.records!.length).to.equal(3);
        expect(publishedDescResults.records.map(r => r.id)).to.eql([...publishedItems].reverse());
      });
    });

    describe('from: did', () => {
      it('returns an array of records that match the filter provided', async () => {
        // Write a record to the agent's local DWN.
        const { record } = await dwnAlice.records.write({
          data    : 'Hello, world!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });

        // Write the record to the agent's remote DWN.
        await record.send(aliceDid.did);

        // Query the agent's remote DWN.
        const result = await dwnAlice.records.query({
          from    : aliceDid.did,
          message : {
            filter: {
              schema: 'foo/bar'
            }
          }
        });

        // Verify the query returns a result.
        expect(result.status.code).to.equal(200);
        expect(result.records).to.exist;
        expect(result.records!.length).to.equal(1);
        expect(result.records![0].id).to.equal(record!.id);
      });

      it('returns empty records array when no records match the filter provided', async () => {
        /** Create a new DID to represent an external entity who has a remote
         * DWN server defined in their DID document. */
        const { did: bob } = await testAgent.createIdentity({ testDwnUrls });

        // Attempt to query Bob's DWN using the ID of a record that does not exist.
        const result = await dwnAlice.records.query({
          from    : bob.did,
          message : {
            filter: {
              recordId: 'abcd1234'
            }
          }
        });
        // Confirm that the record does not currently exist on Bob's DWN.
        expect(result.status.code).to.equal(200);
        expect(result.records).to.exist;
        expect(result.records!.length).to.equal(0);
      });

      it('returns the correct author for records signed by another DID', async () => {
        /**
         * WHAT IS BEING TESTED?
         *
         * We are testing whether a record authored/signed by one party (Alice) can be written to
         * another party's DWN (Bob) and retain the original author's DID (Alice) when queried.
         *
         * TEST SETUP STEPS:
         *   1. Configure the email protocol on Bob's local DWN.
         */
        const { status: bobProtocolStatus, protocol: bobProtocol } = await dwnBob.protocols.configure({
          message: {
            definition: emailProtocolDefinition
          }
        });
        expect(bobProtocolStatus.code).to.equal(202);
        /**
         *   2. Configure the email protocol on Bob's remote DWN.
         */
        const { status: bobRemoteProtocolStatus } = await bobProtocol.send(bobDid.did);
        expect(bobRemoteProtocolStatus.code).to.equal(202);
        /**
         *   3. Alice creates a record, but doesn't store it locally.
         */
        const { status: createStatus, record: testRecord} = await dwnAlice.records.create({
          store   : false,
          data    : 'test',
          message : {
            protocol     : 'http://email-protocol.xyz',
            protocolPath : 'email',
            schema       : 'http://email-protocol.xyz/schema/email',
            dataFormat   : 'text/plain'
          }
        });
        expect(createStatus.code).to.equal(202);
        expect(testRecord.author).to.equal(aliceDid.did);
        /**
         *   4. Alice writes the record to Bob's remote DWN.
         */
        const { status: sendStatus } = await testRecord.send(bobDid.did);
        expect(sendStatus.code).to.equal(202);
        /**
         *   5. Bob queries his remote DWN for the record.
         */
        const bobQueryResult = await dwnBob.records.query({
          from    : bobDid.did,
          message : {
            filter: {
              recordId: testRecord.id
            }
          }
        });

        // The record's author should be Alice's DID since Alice was the signer.
        const [ recordOnBobsDwn ] = bobQueryResult.records;
        expect(recordOnBobsDwn.author).to.equal(aliceDid.did);
      });
    });
  });

  describe('records.read()', () => {
    describe('agent', () => {
      it('returns a record', async () => {
        const writeResult = await dwnAlice.records.write({
          data    : 'Hello, world!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });

        expect(writeResult.status.code).to.equal(202);
        expect(writeResult.status.detail).to.equal('Accepted');
        expect(writeResult.record).to.exist;

        const result = await dwnAlice.records.read({
          message: {
            filter: {
              recordId: writeResult.record!.id
            }
          }
        });

        expect(result.status.code).to.equal(200);
        expect(result.record.id).to.equal(writeResult.record!.id);
      });

      it('returns a 404 when a record cannot be found', async () => {
        const writeResult = await dwnAlice.records.write({
          data    : 'Hello, world!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });

        expect(writeResult.status.code).to.equal(202);
        expect(writeResult.status.detail).to.equal('Accepted');
        expect(writeResult.record).to.exist;

        // Delete the record
        await dwnAlice.records.delete({
          message: {
            recordId: writeResult.record!.id
          }
        });

        const result = await dwnAlice.records.read({
          message: {
            filter: {
              recordId: writeResult.record!.id
            }
          }
        });

        expect(result.status.code).to.equal(404);
        expect(result.record).to.not.exist;
      });
    });

    describe('from: did', () => {
      it('returns a record', async () => {
        // Write a record to the agent's local DWN.
        const writeResult = await dwnAlice.records.write({
          data    : 'Hello, world!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });

        expect(writeResult.status.code).to.equal(202);
        expect(writeResult.status.detail).to.equal('Accepted');
        expect(writeResult.record).to.exist;

        // Write the record to the agent's remote DWN.
        await writeResult.record.send(aliceDid.did);

        // Attempt to read the record from the agent's remote DWN.
        const result = await dwnAlice.records.read({
          from    : aliceDid.did,
          message : {
            filter: {
              recordId: writeResult.record!.id
            }
          }
        });

        expect(result.status.code).to.equal(200);
        expect(result.record.id).to.equal(writeResult.record!.id);
      });

      it('returns undefined record when requested record does not exit', async () => {
        /** Create a new DID to represent an external entity who has a remote
         * DWN server defined in their DID document. */
        const { did: bob } = await testAgent.createIdentity({ testDwnUrls });

        // Attempt to read a record from Bob's DWN using the ID of a record that only exists in the connected agent's DWN.
        const result = await dwnAlice.records.read({
          from    : bob.did,
          message : {
            filter: {
              recordId: 'non-existent-id'
            }
          }
        });

        // Confirm that the record does not currently exist on Bob's DWN.
        expect(result.status.code).to.equal(404);
        expect(result.record).to.be.undefined;
      });

      it('returns the correct author for records signed by another DID', async () => {
        /**
         * WHAT IS BEING TESTED?
         *
         * We are testing whether a record authored/signed by one party (Alice) can be written to
         * another party's DWN (Bob) and retain the original author's DID (Alice) when read.
         *
         * TEST SETUP STEPS:
         *   1. Configure the email protocol on Bob's local DWN.
         */
        const { status: bobProtocolStatus, protocol: bobProtocol } = await dwnBob.protocols.configure({
          message: {
            definition: emailProtocolDefinition
          }
        });
        expect(bobProtocolStatus.code).to.equal(202);
        /**
         *   2. Configure the email protocol on Bob's remote DWN.
         */
        const { status: bobRemoteProtocolStatus } = await bobProtocol.send(bobDid.did);
        expect(bobRemoteProtocolStatus.code).to.equal(202);
        /**
         *   3. Alice creates a record, but doesn't store it locally.
         */
        const { status: createStatus, record: testRecord} = await dwnAlice.records.create({
          store   : false,
          data    : 'test',
          message : {
            protocol     : 'http://email-protocol.xyz',
            protocolPath : 'email',
            schema       : 'http://email-protocol.xyz/schema/email',
            dataFormat   : 'text/plain'
          }
        });
        expect(createStatus.code).to.equal(202);
        expect(testRecord.author).to.equal(aliceDid.did);
        /**
         *   4. Alice writes the record to Bob's remote DWN.
         */
        const { status: sendStatus } = await testRecord.send(bobDid.did);
        expect(sendStatus.code).to.equal(202);
        /**
         *   5. Bob queries his remote DWN for the record.
         */
        const bobQueryResult = await dwnBob.records.read({
          from    : bobDid.did,
          message : {
            filter: {
              recordId: testRecord.id
            }
          }
        });

        // The record's author should be Alice's DID since Alice was the signer.
        const recordOnBobsDwn = bobQueryResult.record;
        expect(recordOnBobsDwn.author).to.equal(aliceDid.did);
      });
    });
  });
});