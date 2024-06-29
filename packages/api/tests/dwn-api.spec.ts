import type { BearerDid } from '@web5/dids';

import sinon from 'sinon';
import { expect } from 'chai';
import { Web5UserAgent } from '@web5/user-agent';
import { DwnDateSort, PlatformAgentTestHarness } from '@web5/agent';

import { DwnApi } from '../src/dwn-api.js';
import { testDwnUrl } from './utils/test-config.js';
import emailProtocolDefinition from './fixtures/protocol-definitions/email.json' assert { type: 'json' };
import photosProtocolDefinition from './fixtures/protocol-definitions/photos.json' assert { type: 'json' };

let testDwnUrls: string[] = [testDwnUrl];

describe('DwnApi', () => {
  let aliceDid: BearerDid;
  let bobDid: BearerDid;
  let dwnAlice: DwnApi;
  let dwnBob: DwnApi;
  let testHarness: PlatformAgentTestHarness;

  before(async () => {
    testHarness = await PlatformAgentTestHarness.setup({
      agentClass  : Web5UserAgent,
      agentStores : 'memory'
    });
  });

  beforeEach(async () => {
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

    // Instantiate DwnApi for both test identities.
    dwnAlice = new DwnApi({ agent: testHarness.agent, connectedDid: aliceDid.uri });
    dwnBob = new DwnApi({ agent: testHarness.agent, connectedDid: bobDid.uri });
  });

  after(async () => {
    await testHarness.clearStorage();
    await testHarness.closeStorage();
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
        await configureResponse.protocol.send(aliceDid.uri);

        // Query for the protocol just configured.
        const queryResponse = await dwnAlice.protocols.query({
          from    : aliceDid.uri,
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
          from    : aliceDid.uri,
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
        const sendPublic = await publicProtocol.protocol.send(aliceDid.uri);
        expect(sendPublic.status.code).to.equal(202);

        // Attempt to query for the published protocol on Alice's remote DWN authored by Bob.
        const publishedResponse = await dwnBob.protocols.query({
          from    : aliceDid.uri,
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
        const sendNotPublic = await notPublicProtocol.protocol.send(aliceDid.uri);
        expect(sendNotPublic.status.code).to.equal(202);

        // Attempt to query for the unpublished protocol on Alice's remote DWN authored by Bob.
        const nonPublishedResponse = await dwnBob.protocols.query({
          from    : aliceDid.uri,
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
          from    : bobDid.uri,
          message : {
            permissionGrantId : 'bafyreiduimprbncdo2oruvjrvmfmwuyz4xx3d5biegqd2qntlryvuuosem',
            filter            : {
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

      it('creates a record with tags', async () => {
        const result = await dwnAlice.records.create({
          data    : 'some data',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain',
            tags       : {
              foo   : 'bar',
              count : 2,
              bool  : true
            }
          }
        });

        expect(result.status.code).to.equal(202);
        expect(result.status.detail).to.equal('Accepted');
        expect(result.record).to.exist;
        expect(result.record?.tags).to.exist;
        expect(result.record?.tags).to.deep.equal({
          foo   : 'bar',
          count : 2,
          bool  : true
        });

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
        const { status: bobRemoteProtocolStatus } = await bobProtocol.send(bobDid.uri);
        expect(bobRemoteProtocolStatus.code).to.equal(202);

        const { status: aliceProtocolStatus, protocol: aliceProtocol } = await dwnAlice.protocols.configure({
          message: {
            definition: photosProtocolDefinition
          }
        });
        expect(aliceProtocolStatus.code).to.equal(202);
        const { status: aliceRemoteProtocolStatus } = await aliceProtocol.send(aliceDid.uri);
        expect(aliceRemoteProtocolStatus.code).to.equal(202);

        // Alice creates a role-based 'friend' record, updates it, then sends it to her remote DWN.
        const { status: friendCreateStatus, record: friendRecord} = await dwnAlice.records.create({
          data    : 'test',
          message : {
            recipient    : bobDid.uri,
            protocol     : photosProtocolDefinition.protocol,
            protocolPath : 'friend',
            schema       : photosProtocolDefinition.types.friend.schema,
            dataFormat   : 'text/plain'
          }
        });
        expect(friendCreateStatus.code).to.equal(202);
        const { status: friendRecordUpdateStatus } = await friendRecord.update({ data: 'update' });
        expect(friendRecordUpdateStatus.code).to.equal(202);
        const { status: aliceFriendSendStatus } = await friendRecord.send(aliceDid.uri);
        expect(aliceFriendSendStatus.code).to.equal(202);

        // Bob creates an album record using the role 'friend' and sends it to Alice
        const { status: albumCreateStatus, record: albumRecord} = await dwnBob.records.create({
          data    : 'test',
          message : {
            recipient    : aliceDid.uri,
            protocol     : photosProtocolDefinition.protocol,
            protocolPath : 'album',
            protocolRole : 'friend',
            schema       : photosProtocolDefinition.types.album.schema,
            dataFormat   : 'text/plain'
          }
        });
        expect(albumCreateStatus.code).to.equal(202);
        const { status: bobAlbumSendStatus } = await albumRecord.send(bobDid.uri);
        expect(bobAlbumSendStatus.code).to.equal(202);
        const { status: aliceAlbumSendStatus } = await albumRecord.send(aliceDid.uri);
        expect(aliceAlbumSendStatus.code).to.equal(202);

        // Bob makes Alice a `participant` and sends the record to her and his own remote node.
        const { status: participantCreateStatus, record: participantRecord} = await dwnBob.records.create({
          data    : 'test',
          message : {
            parentContextId : albumRecord.contextId,
            recipient       : aliceDid.uri,
            protocol        : photosProtocolDefinition.protocol,
            protocolPath    : 'album/participant',
            schema          : photosProtocolDefinition.types.participant.schema,
            dataFormat      : 'text/plain'
          }
        });
        expect(participantCreateStatus.code).to.equal(202);
        const { status: bobParticipantSendStatus } = await participantRecord.send(bobDid.uri);
        expect(bobParticipantSendStatus.code).to.equal(202);
        const { status: aliceParticipantSendStatus } = await participantRecord.send(aliceDid.uri);
        expect(aliceParticipantSendStatus.code).to.equal(202);

        // Alice fetches the album record as well as the participant record that Bob created and stores it on her local node.
        const aliceAlbumReadResult = await dwnAlice.records.read({
          from    : aliceDid.uri,
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
          from    : aliceDid.uri,
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
            parentContextId : albumRecord.contextId,
            recipient       : bobDid.uri,
            protocol        : photosProtocolDefinition.protocol,
            protocolPath    : 'album/updater',
            protocolRole    : 'album/participant',
            schema          : photosProtocolDefinition.types.updater.schema,
            dataFormat      : 'text/plain'
          }
        });
        expect(updaterCreateStatus.code).to.equal(202);
        const { status: bobUpdaterSendStatus } = await updaterRecord.send(bobDid.uri);
        expect(bobUpdaterSendStatus.code).to.equal(202);
        const { status: aliceUpdaterSendStatus } = await updaterRecord.send(aliceDid.uri);
        expect(aliceUpdaterSendStatus.code).to.equal(202);

        // Alice creates a photo using her participant role and sends it to her own DWN and Bob's DWN.
        const { status: photoCreateStatus, record: photoRecord} = await dwnAlice.records.create({
          data    : 'test',
          message : {
            parentContextId : albumRecord.contextId,
            protocol        : photosProtocolDefinition.protocol,
            protocolPath    : 'album/photo',
            protocolRole    : 'album/participant',
            schema          : photosProtocolDefinition.types.photo.schema,
            dataFormat      : 'text/plain'
          }
        });
        expect(photoCreateStatus.code).to.equal(202);
        const { status:alicePhotoSendStatus } = await photoRecord.send(aliceDid.uri);
        expect(alicePhotoSendStatus.code).to.equal(202);
        const { status: bobPhotoSendStatus } = await photoRecord.send(bobDid.uri);
        expect(bobPhotoSendStatus.code).to.equal(202);

        // Bob updates the photo using his updater role and sends it to Alice and his own DWN.
        const { status: photoUpdateStatus, record: photoUpdateRecord} = await dwnBob.records.write({
          data    : 'test again',
          store   : false,
          message : {
            parentContextId : albumRecord.contextId,
            recordId        : photoRecord.id,
            dateCreated     : photoRecord.dateCreated,
            protocol        : photosProtocolDefinition.protocol,
            protocolPath    : 'album/photo',
            protocolRole    : 'album/updater',
            schema          : photosProtocolDefinition.types.photo.schema,
            dataFormat      : 'text/plain'
          }
        });
        expect(photoUpdateStatus.code).to.equal(202);
        const { status:alicePhotoUpdateSendStatus } = await photoUpdateRecord.send(aliceDid.uri);
        expect(alicePhotoUpdateSendStatus.code).to.equal(202);
        const { status: bobPhotoUpdateSendStatus } = await photoUpdateRecord.send(bobDid.uri);
        expect(bobPhotoUpdateSendStatus.code).to.equal(202);

        // Alice fetches the photo and stores it on her local DWN.
        const alicePhotoReadResult = await dwnAlice.records.read({
          from    : aliceDid.uri,
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
          author : aliceDid.uri,
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
        const { status } = await record!.send(aliceDid.uri);
        expect(status.code).to.equal(202);

        const deleteResult = await dwnAlice.records.delete({
          message: {
            recordId: record!.id
          }
        });

        expect(deleteResult.status.code).to.equal(202);
      });

      it('deletes a record and prunes its children', async () => {
        // Install a protocol that supports parent-child relationships.
        const { status: protocolStatus, protocol } = await dwnAlice.protocols.configure({
          message: {
            definition: {
              protocol  : 'http://example.com/parent-child',
              published : true,
              types     : {
                foo: {
                  schema: 'http://example.com/foo',
                },
                bar: {
                  schema: 'http://example.com/bar'
                }
              },
              structure: {
                foo: {
                  bar: {}
                }
              }
            }
          }
        });
        expect(protocolStatus.code).to.equal(202);

        // Write a parent record.
        const { status: parentWriteStatus, record: parentRecord } = await dwnAlice.records.write({
          data    : 'Hello, world!',
          message : {
            protocol     : protocol.definition.protocol,
            protocolPath : 'foo',
            schema       : 'http://example.com/foo',
            dataFormat   : 'text/plain'
          }
        });
        expect(parentWriteStatus.code).to.equal(202);
        expect(parentRecord).to.exist;

        // Write a child record.
        const { status: childWriteStatus, record: childRecord } = await dwnAlice.records.write({
          data    : 'Hello, world!',
          message : {
            protocol        : protocol.definition.protocol,
            protocolPath    : 'foo/bar',
            schema          : 'http://example.com/bar',
            dataFormat      : 'text/plain',
            parentContextId : parentRecord.contextId
          }
        });
        expect(childWriteStatus.code).to.equal(202);
        expect(childRecord).to.exist;

        // query for child records to confirm it exists
        const { status: childrenStatus, records: childrenRecords } = await dwnAlice.records.query({
          message: {
            filter: {
              protocol     : protocol.definition.protocol,
              protocolPath : 'foo/bar'
            }
          }
        });
        expect(childrenStatus.code).to.equal(200);
        expect(childrenRecords).to.exist;
        expect(childrenRecords).to.have.lengthOf(1);
        expect(childrenRecords![0].id).to.equal(childRecord.id);

        // Delete the parent record and its children.
        const { status: deleteStatus } = await dwnAlice.records.delete({
          message: {
            recordId : parentRecord.id,
            prune    : true
          }
        });
        expect(deleteStatus.code).to.equal(202);

        // query for child records to confirm it was deleted
        const { status: childrenStatusAfterDelete, records: childrenRecordsAfterDelete } = await dwnAlice.records.query({
          message: {
            filter: {
              protocol     : protocol.definition.protocol,
              protocolPath : 'foo/bar'
            }
          }
        });
        expect(childrenStatusAfterDelete.code).to.equal(200);
        expect(childrenRecordsAfterDelete).to.exist;
        expect(childrenRecordsAfterDelete).to.have.lengthOf(0);
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
        const { status } = await record!.send(aliceDid.uri);
        expect(status.code).to.equal(202);

        // Attempt to delete a record from the remote DWN.
        const deleteResult = await dwnAlice.records.delete({
          from    : aliceDid.uri,
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
        const sendResult = await writeResult.record.send(bobDid.uri);
        expect(sendResult.status.code).to.equal(202);

        // Alice attempts to delete a record from Bob's remote DWN specifying a recordId.
        const deleteResult = await dwnAlice.records.delete({
          from    : bobDid.uri,
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
        const { status: bobRemoteProtocolStatus } = await bobProtocol.send(bobDid.uri);
        expect(bobRemoteProtocolStatus.code).to.equal(202);
        /**
         *   3. Alice creates a record, but doesn't store it locally.
         */
        const { status: createStatus, record: testRecord} = await dwnAlice.records.create({
          store   : false,
          data    : 'test',
          message : {
            protocol     : 'http://email-protocol.xyz',
            protocolPath : 'thread',
            schema       : 'http://email-protocol.xyz/schema/thread',
            dataFormat   : 'text/plain'
          }
        });
        expect(createStatus.code).to.equal(202);
        expect(testRecord.author).to.equal(aliceDid.uri);
        /**
         *   4. Alice writes the record to Bob's remote DWN.
         */
        const { status: sendStatus } = await testRecord.send(bobDid.uri);
        expect(sendStatus.code).to.equal(202);
        /**
         *   5. Bob deletes the record from his remote DWN.
         */
        const deleteResult = await dwnBob.records.delete({
          from    : bobDid.uri,
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
            dateSort: DwnDateSort.CreatedAscending // same as default
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
            dateSort: DwnDateSort.CreatedDescending
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
            dateSort: DwnDateSort.PublishedAscending
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
            dateSort: DwnDateSort.PublishedDescending
          }
        });
        expect(publishedDescResults.status.code).to.equal(200);
        expect(publishedDescResults.records).to.exist;
        expect(publishedDescResults.records!.length).to.equal(3);
        expect(publishedDescResults.records.map(r => r.id)).to.eql([...publishedItems].reverse());
      });

      it('queries for records matching tags', async () => {

        // Write a record to the agent's local DWN that includes a tag `foo` with value `bar`
        const { status, record } = await dwnAlice.records.write({
          data    : 'Hello, world!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain',
            tags       : {
              foo: 'bar',
            }
          }
        });
        expect(status.code).to.equal(202);

        // Write a record to the agent's local DWN that includes a tag `foo` with value `baz`
        const { status: status2 } = await dwnAlice.records.write({
          data    : 'Hello, world!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain',
            tags       : {
              foo: 'baz',
            }
          }
        });
        expect(status2.code).to.equal(202);

        // Control: query the agent's local DWN for the record without any tag filters
        const result = await dwnAlice.records.query({
          message: {
            filter: {
              schema: 'foo/bar'
            }
          }
        });

        // should return both records
        expect(result.status.code).to.equal(200);
        expect(result.records).to.exist;
        expect(result.records!.length).to.equal(2);


        // Query the agent's local DWN for the record using the tags.
        const fooBarResult = await dwnAlice.records.query({
          message: {
            filter: {
              schema : 'foo/bar',
              tags   : {
                foo: 'bar',
              }
            }
          }
        });

        // should only return the record with the tag `foo` and value `bar`
        expect(fooBarResult.status.code).to.equal(200);
        expect(fooBarResult.records).to.exist;
        expect(fooBarResult.records!.length).to.equal(1);
        expect(fooBarResult.records![0].id).to.equal(record.id);
        expect(fooBarResult.records![0].tags).to.deep.equal({ foo: 'bar' });
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
        await record.send(aliceDid.uri);

        // Query the agent's remote DWN.
        const result = await dwnAlice.records.query({
          from    : aliceDid.uri,
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
        // Attempt to query Bob's DWN using the ID of a record that does not exist.
        const result = await dwnAlice.records.query({
          from    : bobDid.uri,
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
        const { status: bobRemoteProtocolStatus } = await bobProtocol.send(bobDid.uri);
        expect(bobRemoteProtocolStatus.code).to.equal(202);
        /**
         *   3. Alice creates a record, but doesn't store it locally.
         */
        const { status: createStatus, record: testRecord} = await dwnAlice.records.create({
          store   : false,
          data    : 'test',
          message : {
            protocol     : 'http://email-protocol.xyz',
            protocolPath : 'thread',
            schema       : 'http://email-protocol.xyz/schema/thread',
            dataFormat   : 'text/plain'
          }
        });
        expect(createStatus.code).to.equal(202);
        expect(testRecord.author).to.equal(aliceDid.uri);
        /**
         *   4. Alice writes the record to Bob's remote DWN.
         */
        const { status: sendStatus } = await testRecord.send(bobDid.uri);
        expect(sendStatus.code).to.equal(202);
        /**
         *   5. Bob queries his remote DWN for the record.
         */
        const bobQueryResult = await dwnBob.records.query({
          from    : bobDid.uri,
          message : {
            filter: {
              recordId: testRecord.id
            }
          }
        });

        // The record's author should be Alice's DID since Alice was the signer.
        const [ recordOnBobsDwn ] = bobQueryResult.records;
        expect(recordOnBobsDwn.author).to.equal(aliceDid.uri);
      });

      it('queries for records matching tags', async () => {

        // Write a record to alice's remote DWN that includes a tag `foo` with value `bar`
        const { status, record } = await dwnAlice.records.write({
          store   : false,
          data    : 'Hello, world!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain',
            tags       : {
              foo: 'bar',
            }
          }
        });
        expect(status.code).to.equal(202);
        const { status: sendFooBarStatus } = await record.send(aliceDid.uri);
        expect(sendFooBarStatus.code).to.equal(202);

        // Write a record to alice's remote DWN that includes a tag `foo` with value `baz`
        const { status: status2, record: record2 } = await dwnAlice.records.write({
          store   : false,
          data    : 'Hello, world!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain',
            tags       : {
              foo: 'baz',
            }
          }
        });
        expect(status2.code).to.equal(202);
        const { status: sendFooBazStatus } = await record2.send(aliceDid.uri);
        expect(sendFooBazStatus.code).to.equal(202);

        // Control: query the agent's local DWN for the record without any tag filters
        const result = await dwnAlice.records.query({
          from    : aliceDid.uri,
          message : {
            filter: {
              schema: 'foo/bar'
            }
          }
        });

        // should return both records
        expect(result.status.code).to.equal(200);
        expect(result.records).to.exist;
        expect(result.records!.length).to.equal(2);


        // Query the agent's local DWN for the record using the tags.
        const fooBarResult = await dwnAlice.records.query({
          from    : aliceDid.uri,
          message : {
            filter: {
              schema : 'foo/bar',
              tags   : {
                foo: 'bar',
              }
            }
          }
        });

        // should only return the record with the tag `foo` and value `bar`
        expect(fooBarResult.status.code).to.equal(200);
        expect(fooBarResult.records).to.exist;
        expect(fooBarResult.records!.length).to.equal(1);
        expect(fooBarResult.records![0].id).to.equal(record.id);
        expect(fooBarResult.records![0].tags).to.deep.equal({ foo: 'bar' });
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
        await writeResult.record.send(aliceDid.uri);

        // Attempt to read the record from the agent's remote DWN.
        const result = await dwnAlice.records.read({
          from    : aliceDid.uri,
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
        // Attempt to read a record from Bob's DWN using the ID of a record that only exists in the connected agent's DWN.
        const result = await dwnAlice.records.read({
          from    : bobDid.uri,
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
        const { status: bobRemoteProtocolStatus } = await bobProtocol.send(bobDid.uri);
        expect(bobRemoteProtocolStatus.code).to.equal(202);
        /**
         *   3. Alice creates a record, but doesn't store it locally.
         */
        const { status: createStatus, record: testRecord} = await dwnAlice.records.create({
          store   : false,
          data    : 'test',
          message : {
            protocol     : 'http://email-protocol.xyz',
            protocolPath : 'thread',
            schema       : 'http://email-protocol.xyz/schema/thread',
            dataFormat   : 'text/plain'
          }
        });
        expect(createStatus.code).to.equal(202);
        expect(testRecord.author).to.equal(aliceDid.uri);
        /**
         *   4. Alice writes the record to Bob's remote DWN.
         */
        const { status: sendStatus } = await testRecord.send(bobDid.uri);
        expect(sendStatus.code).to.equal(202);
        /**
         *   5. Bob queries his remote DWN for the record.
         */
        const bobQueryResult = await dwnBob.records.read({
          from    : bobDid.uri,
          message : {
            filter: {
              recordId: testRecord.id
            }
          }
        });

        // The record's author should be Alice's DID since Alice was the signer.
        const recordOnBobsDwn = bobQueryResult.record;
        expect(recordOnBobsDwn.author).to.equal(aliceDid.uri);
      });
    });
  });
});