import type { BearerDid } from '@web5/dids';

import sinon from 'sinon';
import { expect } from 'chai';
import { Web5UserAgent } from '@web5/user-agent';
import { AgentPermissionsApi, DwnDateSort, DwnInterface, getRecordAuthor, PlatformAgentTestHarness } from '@web5/agent';

import { DwnApi } from '../src/dwn-api.js';
import { testDwnUrl } from './utils/test-config.js';
import emailProtocolDefinition from './fixtures/protocol-definitions/email.json' assert { type: 'json' };
import photosProtocolDefinition from './fixtures/protocol-definitions/photos.json' assert { type: 'json' };
import { DwnInterfaceName, DwnMethodName, PermissionsProtocol, Time } from '@tbd54566975/dwn-sdk-js';
import { PermissionGrant } from '../src/permission-grant.js';

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

    // Instantiate DwnApi for both test identities.
    dwnAlice = new DwnApi({ agent: testHarness.agent, connectedDid: aliceDid.uri });
    dwnBob = new DwnApi({ agent: testHarness.agent, connectedDid: bobDid.uri });

    // clear cached permissions between test runs
    dwnAlice['cachedPermissions'].clear();
    dwnBob['cachedPermissions'].clear();
  });

  after(async () => {
    sinon.restore();
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
        await writeResult.record!.delete();

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

  describe('connected.findPermissionGrantForRequest', () => {
    it('caches result', async () => {
      // create a grant for bob
      const deviceXGrant = await dwnAlice.permissions.grant({
        store       : true,
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        delegated   : true,
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol'
        }
      });

      // simulate a connect where bobDid can impersonate aliceDid
      dwnBob['connectedDid'] = aliceDid.uri;
      dwnBob['delegateDid'] = bobDid.uri;
      await DwnApi.processConnectedGrants({
        agent       : testHarness.agent,
        delegateDid : bobDid.uri,
        grants      : [ deviceXGrant.rawMessage ]
      });

      const fetchGrantsSpy = sinon.spy(AgentPermissionsApi.prototype, 'fetchGrants');

      // find the grant for a request
      let grantForRequest = await dwnBob['connected'].findPermissionGrantForMessage({
        messageParams: {
          messageType : DwnInterface.RecordsWrite,
          protocol    : 'http://example.com/protocol'
        }
      });

      // expect to have the grant
      expect(grantForRequest).to.exist;
      expect(grantForRequest.id).to.equal(deviceXGrant.id);
      expect(fetchGrantsSpy.callCount).to.equal(1);

      fetchGrantsSpy.resetHistory();

      // attempt to find the grant again
      grantForRequest = await dwnBob['connected'].findPermissionGrantForMessage({
        messageParams: {
          messageType : DwnInterface.RecordsWrite,
          protocol    : 'http://example.com/protocol'
        }
      });
      expect(grantForRequest).to.exist;
      expect(grantForRequest.id).to.equal(deviceXGrant.id);
      expect(fetchGrantsSpy.callCount).to.equal(0);

      // should call again if cached:false is passed
      grantForRequest = await dwnBob['connected'].findPermissionGrantForMessage({
        messageParams: {
          messageType : DwnInterface.RecordsWrite,
          protocol    : 'http://example.com/protocol'
        },
        cached: false
      });
      expect(grantForRequest).to.exist;
      expect(grantForRequest.id).to.equal(deviceXGrant.id);
      expect(fetchGrantsSpy.callCount).to.equal(1);

      // reset the spy
      fetchGrantsSpy.resetHistory();
      expect(fetchGrantsSpy.callCount).to.equal(0);

      // call for a different grant
      try {
        await dwnBob['connected'].findPermissionGrantForMessage({
          messageParams: {
            messageType : DwnInterface.RecordsRead,
            protocol    : 'http://example.com/protocol'
          }
        });
        expect.fail('Should have thrown an error');
      } catch(error:any) {
        expect(error.message).to.equal('AgentDwnApi: No permissions found for RecordsRead: http://example.com/protocol');
      }
      expect(fetchGrantsSpy.callCount).to.equal(1);

      // call again to ensure grants which are not found are not cached
      try {
        await dwnBob['connected'].findPermissionGrantForMessage({
          messageParams: {
            messageType : DwnInterface.RecordsRead,
            protocol    : 'http://example.com/protocol'
          }
        });
        expect.fail('Should have thrown an error');
      } catch(error:any) {
        expect(error.message).to.equal('AgentDwnApi: No permissions found for RecordsRead: http://example.com/protocol');
      }

      expect(fetchGrantsSpy.callCount).to.equal(2); // should have been called again
    });

    it('throws if no delegateDid is set', async () => {
      // make sure delegateDid is undefined
      dwnAlice['delegateDid'] = undefined;
      try {
        await dwnAlice['connected'].findPermissionGrantForMessage({
          messageParams: {
            messageType : DwnInterface.RecordsWrite,
            protocol    : 'http://example.com/protocol'
          }
        });
        expect.fail('Error was not thrown');
      } catch (e) {
        expect(e.message).to.equal('AgentDwnApi: Cannot find connected grants without a signer DID');
      }
    });
  });

  describe('permissions.grant', () => {
    it('uses the connected DID to create a grant if no delegate DID is set', async () => {
      // scenario: create a permission grant for bob, confirm that alice is the signer

      // create a permission grant for bob
      const deviceXGrant = await dwnAlice.permissions.grant({
        store       : true,
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol'
        }
      });

      const author = getRecordAuthor(deviceXGrant.rawMessage);
      expect(dwnAlice['connectedDid']).to.equal(aliceDid.uri); // connected DID should be alice
      expect(author).to.equal(aliceDid.uri);
    });

    it('uses the delegate DID to create a grant if set', async () => {
      // scenario: create a permission grant for aliceDeviceX, confirm that deviceX is the signer

      // create an identity for deviceX
      const aliceDeviceX = await testHarness.agent.identity.create({
        store     : true,
        metadata  : { name: 'Alice Device X' },
        didMethod : 'jwk'
      });

      // set the delegate DID, this happens during a connect flow
      dwnAlice['delegateDid'] = aliceDeviceX.did.uri;

      // create a permission grant for deviceX
      const deviceXGrant = await dwnAlice.permissions.grant({
        store       : true,
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol'
        }
      });

      const author = getRecordAuthor(deviceXGrant.rawMessage);
      expect(dwnAlice['connectedDid']).to.equal(aliceDid.uri); // connected DID should be alice
      expect(dwnAlice['delegateDid']).to.equal(aliceDeviceX.did.uri); // delegate DID should be deviceX
      expect(author).to.equal(aliceDeviceX.did.uri);
    });

    it('creates and stores a grant', async () => {
      // scenario: create a grant for deviceX, confirm the grant exists

      // create an identity for deviceX
      const aliceDeviceX = await testHarness.agent.identity.create({
        store     : true,
        metadata  : { name: 'Alice Device X' },
        didMethod : 'jwk'
      });


      // create a grant for deviceX
      const deviceXGrant = await dwnAlice.permissions.grant({
        store       : true,
        grantedTo   : aliceDeviceX.did.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol'
        }
      });

      // query for the grant
      const fetchedGrants = await dwnAlice.records.query({
        message: {
          filter: {
            protocol     : PermissionsProtocol.uri,
            protocolPath : PermissionsProtocol.grantPath,
          }
        }
      });

      // expect to have the 1 grant created for deviceX
      expect(fetchedGrants.status.code).to.equal(200);
      expect(fetchedGrants.records).to.exist;
      expect(fetchedGrants.records!.length).to.equal(1);
      expect(fetchedGrants.records![0].id).to.equal(deviceXGrant.rawMessage.recordId);
    });

    it('creates a grant without storing it', async () => {
      // scenario: create a grant for deviceX, confirm the grant does not exist

      // create an identity for deviceX
      const aliceDeviceX = await testHarness.agent.identity.create({
        store     : true,
        metadata  : { name: 'Alice Device X' },
        didMethod : 'jwk'
      });

      // create a grant for deviceX store is set to false by default
      const deviceXGrant = await dwnAlice.permissions.grant({
        grantedTo   : aliceDeviceX.did.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol'
        }
      });

      // query for the grant
      let fetchedGrants = await dwnAlice.records.query({
        message: {
          filter: {
            protocol     : PermissionsProtocol.uri,
            protocolPath : PermissionsProtocol.grantPath,
          }
        }
      });

      // expect to have no grants
      expect(fetchedGrants.status.code).to.equal(200);
      expect(fetchedGrants.records).to.exist;
      expect(fetchedGrants.records!.length).to.equal(0);

      // store the grant
      const processGrantReply = await deviceXGrant.store();
      expect(processGrantReply.status.code).to.equal(202);

      // query for the grants again
      fetchedGrants = await dwnAlice.records.query({
        message: {
          filter: {
            protocol     : PermissionsProtocol.uri,
            protocolPath : PermissionsProtocol.grantPath,
          }
        }
      });

      // expect to have the 1 grant created for deviceX
      expect(fetchedGrants.status.code).to.equal(200);
      expect(fetchedGrants.records).to.exist;
      expect(fetchedGrants.records!.length).to.equal(1);
      expect(fetchedGrants.records![0].id).to.equal(deviceXGrant.rawMessage.recordId);
    });
  });

  describe('permissions.request', () => {
    it('uses the connected DID to create a request if no delegate DID is set', async () => {
      // scenario: create a permission request for bob, confirm the request exists

      // create a permission request for bob
      const deviceXRequest = await dwnAlice.permissions.request({
        store : true,
        scope : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol'
        }
      });

      const author = getRecordAuthor(deviceXRequest.rawMessage);
      expect(dwnAlice['connectedDid']).to.equal(aliceDid.uri); // connected DID should be alice
      expect(author).to.equal(aliceDid.uri);
    });

    it('uses the delegate DID to create a request if set', async () => {
      // scenario: create a permission request for aliceDeviceX, the signer

      // create an identity for deviceX
      const aliceDeviceX = await testHarness.agent.identity.create({
        store     : true,
        metadata  : { name: 'Alice Device X' },
        didMethod : 'jwk'
      });

      // set the delegate DID
      dwnAlice['delegateDid'] = aliceDeviceX.did.uri;

      // create a permission request for deviceX
      const deviceXRequest = await dwnAlice.permissions.request({
        store : true,
        scope : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol'
        }
      });

      const author = getRecordAuthor(deviceXRequest.rawMessage);
      expect(dwnAlice['connectedDid']).to.equal(aliceDid.uri); // connected DID should be alice
      expect(dwnAlice['delegateDid']).to.equal(aliceDeviceX.did.uri); // delegate DID should be deviceX
      expect(author).to.equal(aliceDeviceX.did.uri);
    });

    it('creates a permission request and stores it', async () => {
      // scenario: create a permission request confirm the request exists

      // create a permission request
      const deviceXRequest = await dwnAlice.permissions.request({
        store : true,
        scope : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol'
        }
      });

      // query for the request
      const fetchedRequests = await dwnAlice.records.query({
        message: {
          filter: {
            protocol     : PermissionsProtocol.uri,
            protocolPath : PermissionsProtocol.requestPath,
          }
        }
      });

      // expect to have the 1 request created
      expect(fetchedRequests.status.code).to.equal(200);
      expect(fetchedRequests.records).to.exist;
      expect(fetchedRequests.records!.length).to.equal(1);
      expect(fetchedRequests.records![0].id).to.equal(deviceXRequest.rawMessage.recordId);
    });

    it('creates a permission request without storing it', async () => {
      // scenario: create a permission request confirm the request does not exist

      // create a permission request store is set to false by default
      const deviceXRequest = await dwnAlice.permissions.request({
        scope: {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol'
        }
      });

      // query for the request
      let fetchedRequests = await dwnAlice.records.query({
        message: {
          filter: {
            protocol     : PermissionsProtocol.uri,
            protocolPath : PermissionsProtocol.requestPath,
          }
        }
      });

      // expect to have no requests
      expect(fetchedRequests.status.code).to.equal(200);
      expect(fetchedRequests.records).to.exist;
      expect(fetchedRequests.records!.length).to.equal(0);

      // store the request
      const storeDeviceXRequest =  await deviceXRequest.store();
      expect(storeDeviceXRequest.status.code).to.equal(202);

      // query for the requests again
      fetchedRequests = await dwnAlice.records.query({
        message: {
          filter: {
            protocol     : PermissionsProtocol.uri,
            protocolPath : PermissionsProtocol.requestPath,
          }
        }
      });

      // expect to have the 1 request created for deviceX
      expect(fetchedRequests.status.code).to.equal(200);
      expect(fetchedRequests.records).to.exist;
      expect(fetchedRequests.records!.length).to.equal(1);
      expect(fetchedRequests.records![0].id).to.equal(deviceXRequest.rawMessage.recordId);
    });
  });

  describe('permissions.queryRequests', () => {
    it('uses the connected DID to query for permission requests if no delegate DID is set', async () => {
      // scenario: query for permission requests, confirm that alice is the author of the query

      // create a permission request
      await dwnAlice.permissions.request({
        store : true,
        scope : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol'
        }
      });

      // spy on the fetch requests method to confirm the author
      const fetchRequestsSpy = sinon.spy(AgentPermissionsApi.prototype, 'fetchRequests');

      // Query for requests
      const deviceXRequests = await dwnAlice.permissions.queryRequests();
      expect(deviceXRequests.length).to.equal(1);

      // confirm alice is the connected DID
      expect(dwnAlice['connectedDid']).to.equal(aliceDid.uri);
      expect(fetchRequestsSpy.callCount).to.equal(1);
      expect(fetchRequestsSpy.args[0][0].author).to.equal(aliceDid.uri);
    });

    it('uses the delegate DID to query for permission requests if set', async () => {
      // scenario: query for permission requests for aliceDeviceX, confirm that deviceX is the signer

      // create an identity for deviceX
      const aliceDeviceX = await testHarness.agent.identity.create({
        store     : true,
        metadata  : { name: 'Alice Device X' },
        didMethod : 'jwk'
      });

      // spy on the fetch requests method to confirm the author
      const fetchRequestsSpy = sinon.spy(AgentPermissionsApi.prototype, 'fetchRequests');

      // set the delegate DID, this happens during a connect flow
      dwnAlice['delegateDid'] = aliceDeviceX.did.uri;

      // create a permission request
      await dwnAlice.permissions.request({
        store : true,
        scope : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol'
        }
      });

      // Query for requests
      const deviceXRequests = await dwnAlice.permissions.queryRequests();
      expect(deviceXRequests.length).to.equal(1);

      // confirm alice is the connected DID, and aliceDeviceX is the delegate DID
      expect(dwnAlice['connectedDid']).to.equal(aliceDid.uri);
      expect(dwnAlice['delegateDid']).to.equal(aliceDeviceX.did.uri);

      // confirm the author is aliceDeviceX
      expect(fetchRequestsSpy.callCount).to.equal(1);
      expect(fetchRequestsSpy.args[0][0].author).to.equal(aliceDeviceX.did.uri);
    });

    it('should query for permission requests from the local DWN', async () => {
      // bob creates two different requests and stores it
      const bobRequest = await dwnBob.permissions.request({
        store : true,
        scope : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol-1'
        }
      });

      // query for the requests
      const fetchedRequests = await dwnBob.permissions.queryRequests();
      expect(fetchedRequests.length).to.equal(1);
      expect(fetchedRequests[0].id).to.equal(bobRequest.id);
    });

    it('should query for permission requests from the remote DWN', async () => {
      // bob creates two different requests and stores it
      const bobRequest = await dwnBob.permissions.request({
        scope: {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol-1'
        }
      });

      // send the request to alice's DWN
      const sentToAlice = await bobRequest.send(aliceDid.uri);
      expect(sentToAlice.status.code).to.equal(202);

      // alice Queries the remote DWN for the requests
      const fetchedRequests = await dwnAlice.permissions.queryRequests({
        from: aliceDid.uri
      });
      expect(fetchedRequests.length).to.equal(1);
      expect(fetchedRequests[0].id).to.equal(bobRequest.id);
    });

    it('should filter by protocol', async () => {
      // bob creates two different requests and stores it
      const bobRequest1 = await dwnBob.permissions.request({
        store : true,
        scope : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol-1'
        }
      });

      const bobRequest2 = await dwnBob.permissions.request({
        store : true,
        scope : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol-2'
        }
      });

      // query for the requests with protocol-1
      const fetchedRequests = await dwnBob.permissions.queryRequests({
        protocol: 'http://example.com/protocol-1'
      });
      expect(fetchedRequests.length).to.equal(1);
      expect(fetchedRequests[0].id).to.equal(bobRequest1.id);

      // query for the requests with protocol-2
      const fetchedRequests2 = await dwnBob.permissions.queryRequests({
        protocol: 'http://example.com/protocol-2'
      });
      expect(fetchedRequests2.length).to.equal(1);
      expect(fetchedRequests2[0].id).to.equal(bobRequest2.id);
    });
  });

  describe('permissions.queryGrants', () => {
    it('uses the connected DID to query for grants if no delegate DID is set', async () => {
      // scenario: query for grants, confirm that alice is the author of the query

      // spy on the fetch grants method to confirm the author
      const fetchGrantsSpy = sinon.spy(AgentPermissionsApi.prototype, 'fetchGrants');

      // Query for grants
      const deviceXGrants = await dwnAlice.permissions.queryGrants();
      expect(deviceXGrants.length).to.equal(0);

      // confirm alice is the connected DID
      expect(dwnAlice['connectedDid']).to.equal(aliceDid.uri);
      expect(fetchGrantsSpy.callCount).to.equal(1);
      expect(fetchGrantsSpy.args[0][0].author).to.equal(aliceDid.uri);
    });

    it('uses the delegate DID to query for grants if set', async () => {
      // scenario: query for grants for aliceDeviceX, confirm that deviceX is the signer

      // create an identity for deviceX
      const aliceDeviceX = await testHarness.agent.identity.create({
        store     : true,
        metadata  : { name: 'Alice Device X' },
        didMethod : 'jwk'
      });

      // spy on the fetch grants method to confirm the author
      const fetchGrantsSpy = sinon.spy(AgentPermissionsApi.prototype, 'fetchGrants');

      // set the delegate DID, this happens during a connect flow
      dwnAlice['delegateDid'] = aliceDeviceX.did.uri;

      // Query for grants
      const deviceXGrants = await dwnAlice.permissions.queryGrants();
      expect(deviceXGrants.length).to.equal(0);

      // confirm alice is the connected DID, and aliceDeviceX is the delegate DID
      expect(dwnAlice['connectedDid']).to.equal(aliceDid.uri);
      expect(dwnAlice['delegateDid']).to.equal(aliceDeviceX.did.uri);

      // confirm the author is aliceDeviceX
      expect(fetchGrantsSpy.callCount).to.equal(1);
      expect(fetchGrantsSpy.args[0][0].author).to.equal(aliceDeviceX.did.uri);
    });

    it('should query for permission grants from the local DWN', async () => {
      // alice creates a grant for bob and stores it
      const bobGrant = await dwnAlice.permissions.grant({
        store       : true,
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol'
        }
      });

      // query for the grants
      const fetchedGrants = await dwnAlice.permissions.queryGrants();
      expect(fetchedGrants.length).to.equal(1);
      expect(fetchedGrants[0].id).to.equal(bobGrant.id);
    });

    it('should query for permission grants from the remote DWN', async () => {
      // alice creates a grant for bob and doesn't store it locally
      const bobGrant = await dwnAlice.permissions.grant({
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol'
        }
      });

      // alice queries the remote DWN, should not find any grants
      let fetchedGrants = await dwnAlice.permissions.queryGrants();
      expect(fetchedGrants.length).to.equal(0);

      // send the grant to alice's remote DWN
      const sentToAlice = await bobGrant.send(aliceDid.uri);
      expect(sentToAlice.status.code).to.equal(202);

      // alice queries the remote DWN for the grants
      fetchedGrants = await dwnAlice.permissions.queryGrants({
        from: aliceDid.uri
      });
      expect(fetchedGrants.length).to.equal(1);
      expect(fetchedGrants[0].id).to.equal(bobGrant.id);
    });

    it('should filter by protocol', async () => {
      // alice creates two different grants for bob
      const bobGrant1 = await dwnAlice.permissions.grant({
        store       : true,
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol-1'
        }
      });

      const bobGrant2 = await dwnAlice.permissions.grant({
        store       : true,
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol-2'
        }
      });

      // query for the grants with protocol-1
      let fetchedGrants = await dwnAlice.permissions.queryGrants({
        protocol: 'http://example.com/protocol-1'
      });
      expect(fetchedGrants.length).to.equal(1);
      expect(fetchedGrants[0].id).to.equal(bobGrant1.id);

      // query for the grants with protocol-2
      fetchedGrants = await dwnAlice.permissions.queryGrants({
        protocol: 'http://example.com/protocol-2'
      });
      expect(fetchedGrants.length).to.equal(1);
      expect(fetchedGrants[0].id).to.equal(bobGrant2.id);
    });

    it('should filter by grantee', async () => {
      const { did: carolDid } = await testHarness.agent.identity.create({
        store     : false,
        metadata  : { name: 'Carol' },
        didMethod : 'jwk'
      });

      // alice creates a grant for bob and stores it
      const bobGrant = await dwnAlice.permissions.grant({
        store       : true,
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol'
        }
      });

      // alice creates a grant for carol and stores it
      const carolGrant = await dwnAlice.permissions.grant({
        store       : true,
        grantedTo   : carolDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol'
        }
      });

      // query for the grants with bob as the grantee
      let fetchedGrants = await dwnAlice.permissions.queryGrants({
        grantee: bobDid.uri
      });
      expect(fetchedGrants.length).to.equal(1);
      expect(fetchedGrants[0].id).to.equal(bobGrant.id);

      // query for the grants with carol as the grantee
      fetchedGrants = await dwnAlice.permissions.queryGrants({
        grantee: carolDid.uri
      });
      expect(fetchedGrants.length).to.equal(1);
      expect(fetchedGrants[0].id).to.equal(carolGrant.id);
    });

    it('should filter by grantor', async () => {
      const { did: carolDid } = await testHarness.agent.identity.create({
        store     : true,
        metadata  : { name: 'Carol' },
        didMethod : 'jwk'
      });

      // alice creates a grant for bob
      const { message: messageGrantFromAlice } = await testHarness.agent.permissions.createGrant({
        store       : false,
        author      : aliceDid.uri,
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol'
        }
      });

      const grantFromAlice = await PermissionGrant.parse({
        agent        : testHarness.agent,
        connectedDid : bobDid.uri,
        message      : messageGrantFromAlice
      });

      // import the grant
      const importFromAlice = await grantFromAlice.import(true);
      expect(importFromAlice.status.code).to.equal(202);

      // carol creates a grant for bob
      const { message: messageGrantFromCarol } = await testHarness.agent.permissions.createGrant({
        store       : false,
        author      : carolDid.uri,
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol'
        }
      });

      const grantFromCarol = await PermissionGrant.parse({
        agent        : testHarness.agent,
        connectedDid : bobDid.uri,
        message      : messageGrantFromCarol
      });

      const importGrantCarol = await grantFromCarol.import(true);
      expect(importGrantCarol.status.code).to.equal(202);

      // query for the grants with alice as the grantor
      const fetchedGrantsAlice = await dwnBob.permissions.queryGrants({
        grantor: aliceDid.uri
      });
      expect(fetchedGrantsAlice.length).to.equal(1);
      expect(fetchedGrantsAlice[0].id).to.equal(grantFromAlice.id);

      // query for the grants with carol as the grantor
      const fetchedGrantsCarol = await dwnBob.permissions.queryGrants({
        grantor: carolDid.uri
      });
      expect(fetchedGrantsCarol.length).to.equal(1);
      expect(fetchedGrantsCarol[0].id).to.equal(grantFromCarol.id);
    });

    it('should check revocation status if option is set', async () => {
      // alice creates a grant for bob and stores it
      const bobGrant = await dwnAlice.permissions.grant({
        store       : true,
        grantedTo   : bobDid.uri,
        dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
        scope       : {
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
          protocol  : 'http://example.com/protocol'
        }
      });

      // query for the grants
      let fetchedGrants = await dwnAlice.permissions.queryGrants({
        checkRevoked: true
      });

      // expect to have the 1 grant created
      expect(fetchedGrants.length).to.equal(1);
      expect(fetchedGrants[0].id).to.equal(bobGrant.id);

      // stub the isRevoked method to return true
      sinon.stub(AgentPermissionsApi.prototype, 'isGrantRevoked').resolves(true);

      // query for the grants
      fetchedGrants = await dwnAlice.permissions.queryGrants({
        checkRevoked: true
      });
      expect(fetchedGrants.length).to.equal(0);

      // return without checking revoked status
      fetchedGrants = await dwnAlice.permissions.queryGrants();
      expect(fetchedGrants.length).to.equal(1);
      expect(fetchedGrants[0].id).to.equal(bobGrant.id);
    });
  });
});