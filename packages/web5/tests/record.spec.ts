import type { DidDocument } from '@tbd54566975/dids';
import type  { PrivateJwk as DwnPrivateKeyJwk, PublicJwk as DwnPublicKeyJwk, RecordsWriteMessage } from '@tbd54566975/dwn-sdk-js';

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import emailProtocolDefinition from './fixtures/protocol-definitions/email.json' assert { type: 'json' };

import { utils as didUtils } from '@tbd54566975/dids';
import { DwnInterfaceName, DwnMethodName, KeyDerivationScheme, RecordsWrite } from '@tbd54566975/dwn-sdk-js';

import * as testProfile from './fixtures/test-profiles.js';

import { Record } from '../src/record.js';
import { DwnApi } from '../src/dwn-api.js';
import { dataToBlob } from '../src/utils.js';
import { TestDataGenerator } from './test-utils/test-data-generator.js';
import { TestAgent, TestProfileOptions } from './test-utils/test-user-agent.js';

chai.use(chaiAsPromised);

// TODO: Come up with a better way of resolving the TS errors.
type RecordsWriteTest = RecordsWrite & RecordsWriteMessage;

let testAgent: TestAgent;
let testProfileOptions: TestProfileOptions;
let dwn: DwnApi;
let didAllKeys: string;
let dataText: string;
let dataBlob: Blob;
let dataFormat: string;

describe('Record', () => {
  before(async () => {
    testAgent = await TestAgent.create();
    dataText = TestDataGenerator.randomString(100);
    ({ dataBlob, dataFormat } = dataToBlob(dataText));
  });

  beforeEach(async () => {
    await testAgent.clearStorage();

    testProfileOptions = await testProfile.ion.with.dwn.service.and.authorization.encryption.attestation.keys();
    ({ did: didAllKeys } = await testAgent.createProfile(testProfileOptions));

    dwn = new DwnApi(testAgent.agent, didAllKeys);

  });

  after(async () => {
    await testAgent.clearStorage();
    await testAgent.closeStorage();
  });

  it('should retain all defined properties', async () => {
    // RecordOptions properties
    const author = didAllKeys;
    const target = didAllKeys;

    const profile = await testAgent.profileApi.getProfile(didAllKeys);

    // Retrieve `#dwn` service entry.
    const [ didDwnService ] = didUtils.getServices(profile!.did.didDocument as DidDocument, { id: '#dwn' });

    // Retrieve first record encryption key from the #dwn serviceEndpoint.
    const recordEncryptionKeyId = typeof didDwnService!.serviceEndpoint !== 'string' ? didDwnService!.serviceEndpoint!.recordEncryptionKeys![0] : undefined;
    const encryptionKeyId = `${profile?.did.id}${recordEncryptionKeyId}`;
    const encryptionPublicKeyJwk = profile!.did.keys.find(key => key.id === encryptionKeyId)!.publicKeyJwk;

    // Retrieve first message authorization key from the #dwn serviceEndpoint.
    const messageAuthorizationKeyId = typeof didDwnService!.serviceEndpoint !== 'string' ? didDwnService!.serviceEndpoint!.messageAuthorizationKeys![0] : undefined;
    const authorizationKeyId = `${profile?.did.id}${messageAuthorizationKeyId}`;
    const authorizationPrivateKeyJwk = profile!.did.keys.find(key => key.id === authorizationKeyId)!.privateKeyJwk;

    // Retrieve first message attestation key from the #dwn serviceEndpoint.
    const messageAttestationKeyId = typeof didDwnService!.serviceEndpoint !== 'string' ? didDwnService!.serviceEndpoint!.messageAttestationKeys![0] : undefined;
    const attestationKeyId = `${profile?.did.id}${messageAttestationKeyId}`;
    const attestationPrivateKeyJwk = profile!.did.keys.find(key => key.id === attestationKeyId)!.privateKeyJwk;

    // RecordsWriteMessage properties that can be pre-defined
    const attestation = [{
      privateJwk      : attestationPrivateKeyJwk as DwnPrivateKeyJwk,
      protectedHeader : {
        alg : attestationPrivateKeyJwk.alg as string,
        kid : attestationKeyId
      }
    }];

    const authorization = {
      privateJwk      : authorizationPrivateKeyJwk as DwnPrivateKeyJwk,
      protectedHeader : {
        alg : authorizationPrivateKeyJwk.alg as string,
        kid : authorizationKeyId
      }
    };

    const encryptionInput = {
      initializationVector : TestDataGenerator.randomBytes(16),
      key                  : TestDataGenerator.randomBytes(32),
      keyEncryptionInputs  : [
        {
          derivationScheme : KeyDerivationScheme.Protocols,
          publicKey        : encryptionPublicKeyJwk as DwnPublicKeyJwk,
          publicKeyId      : recordEncryptionKeyId
        },
        {
          derivationScheme : KeyDerivationScheme.Schemas,
          publicKey        : encryptionPublicKeyJwk as DwnPublicKeyJwk,
          publicKeyId      : recordEncryptionKeyId
        },
      ]
    };

    // RecordsWriteDescriptor properties that can be pre-defined
    const protocol = 'http://example.org/chat/protocol';
    const protocolPath = 'message';
    const recipient = didAllKeys;
    const published = true;
    const schema = 'http://example.org/chat/schema/message';

    // Create a parent record to reference in the RecordsWriteMessage used for validation
    const parentRecorsWrite = await RecordsWrite.create({
      protocol,
      protocolPath,
      schema,
      data                        : new Uint8Array(await dataBlob.arrayBuffer()),
      dataFormat,
      authorizationSignatureInput : authorization,
    }) as RecordsWriteTest;

    // Create a RecordsWriteMessage
    const recordsWrite = await RecordsWrite.create({
      protocol,
      protocolPath,
      recipient,
      schema,
      parentId                    : parentRecorsWrite.recordId,
      data                        : new Uint8Array(await dataBlob.arrayBuffer()),
      published,
      dataFormat,
      attestationSignatureInputs  : attestation,
      authorizationSignatureInput : authorization,
      encryptionInput,
    }) as RecordsWriteTest;

    // Create record using test RecordsWriteMessage.
    const record = new Record(testAgent.agent, {
      ...recordsWrite.message,
      encodedData: dataBlob,
      target,
      author,
    });

    // Retained Record properties
    expect(record.author).to.equal(author);
    expect(record.target).to.equal(target);

    // Retained RecordsWriteMessage top-level properties
    expect(record.contextId).to.equal(recordsWrite.message.contextId);
    expect(record.id).to.equal(recordsWrite.message.recordId);
    expect(record.encryption).to.not.be.undefined;
    expect(record.encryption).to.deep.equal(recordsWrite.message.encryption);
    expect(record.encryption!.keyEncryption.find(key => key.derivationScheme === KeyDerivationScheme.Protocols));
    expect(record.encryption!.keyEncryption.find(key => key.derivationScheme === KeyDerivationScheme.Schemas));
    expect(record.attestation).to.not.be.undefined;
    expect(record.attestation).to.have.property('signatures');

    // Retained RecordsWriteDescriptor properties
    expect(record.protocol).to.equal(protocol);
    expect(record.protocolPath).to.equal(protocolPath);
    expect(record.recipient).to.equal(recipient);
    expect(record.schema).to.equal(schema);
    expect(record.parentId).to.equal(parentRecorsWrite.recordId);
    expect(record.dataCid).to.equal(recordsWrite.message.descriptor.dataCid);
    expect(record.dataSize).to.equal(recordsWrite.message.descriptor.dataSize);
    expect(record.dateCreated).to.equal(recordsWrite.message.descriptor.dateCreated);
    expect(record.dateModified).to.equal(recordsWrite.message.descriptor.dateModified);
    expect(record.published).to.equal(published);
    expect(record.datePublished).to.equal(recordsWrite.message.descriptor.datePublished);
    expect(record.dataFormat).to.equal(dataFormat);
  });

  describe('record.update', () => {
    it('updates a record', async () => {
      const { status, record } = await dwn.records.write({
        data    : 'Hello, world!',
        message : {
          schema     : 'foo/bar',
          dataFormat : 'text/plain'
        }
      });

      const dataCidBeforeDataUpdate = record!.dataCid;

      expect(status.code).to.equal(202);
      expect(record).to.not.be.undefined;

      const updateResult = await record!.update({ data: 'bye' });
      expect(updateResult.status.code).to.equal(202);

      const readResult = await dwn.records.read({
        message: {
          recordId: record!.id
        }
      });

      expect(readResult.status.code).to.equal(200);
      expect(readResult.record).to.not.be.undefined;

      expect(readResult.record.dataCid).to.not.equal(dataCidBeforeDataUpdate);
      expect(readResult.record.dataCid).to.equal(record!.dataCid);

      const updatedData = await record!.data.text();
      expect(updatedData).to.equal('bye');
    });

    it('throws an exception when an immutable property is modified', async () => {
      const { status, record } = await dwn.records.write({
        data    : 'Hello, world!',
        message : {
          schema     : 'foo/bar',
          dataFormat : 'text/plain'
        }
      });

      expect(status.code).to.equal(202);
      expect(record).to.not.be.undefined;

      // @ts-expect-error because this test intentionally specifies an immutable property that is not present in RecordUpdateOptions.
      await expect(record!.update({ dataFormat: 'application/json' })).to.eventually.be.rejectedWith('is an immutable property. Its value cannot be changed.');
    });
  });

  describe('record.data', () => {
    describe('blob()', () => {
      it('returns small data payloads after dwn.records.write()', async () => {
        // Generate data that is less than the encoded data limit to ensure that the data will not have to be fetched
        // with a RecordsRead when record.data.blob() is executed.
        const dataJson = TestDataGenerator.randomJson(500);
        const inputDataBytes = new TextEncoder().encode(JSON.stringify(dataJson));

        // Write the 500B record to agent-connected DWN.
        const { record, status } = await dwn.records.write({ data: dataJson });

        expect(status.code).to.equal(202);

        // Confirm that the size, in bytes, of the data read as a Blob matches the original input data.
        const readDataBlob = await record!.data.blob();
        expect(readDataBlob.size).to.equal(inputDataBytes.length);

        // Convert the Blob into an array and ensure it matches the input data byte for byte.
        const readDataBytes = new Uint8Array(await readDataBlob.arrayBuffer());
        expect(readDataBytes).to.deep.equal(inputDataBytes);
      });

      it('returns small data payloads after dwn.records.read()', async () => {
        // Generate data that is less than the encoded data limit to ensure that the data will not have to be fetched
        // with a RecordsRead when record.data.blob() is executed.
        const dataJson = TestDataGenerator.randomJson(500);
        const inputDataBytes = new TextEncoder().encode(JSON.stringify(dataJson));

        // Write the 500B record to agent-connected DWN.
        const { record, status } = await dwn.records.write({ data: dataJson });

        expect(status.code).to.equal(202);

        // Read the record that was just created.
        const { record: readRecord, status: readRecordStatus } = await dwn.records.read({ message: { recordId: record!.id }});

        expect(readRecordStatus.code).to.equal(200);

        // Confirm that the size, in bytes, of the data read as a Blob matches the original input data.
        const readDataBlob = await readRecord.data.blob();
        expect(readDataBlob.size).to.equal(inputDataBytes.length);

        // Convert the Blob into an array and ensure it matches the input data byte for byte.
        const readDataBytes = new Uint8Array(await readDataBlob.arrayBuffer());
        expect(readDataBytes).to.deep.equal(inputDataBytes);
      });

      it('returns large data payloads after dwn.records.write()', async () => {
        // Generate data that exceeds the DWN encoded data limit to ensure that the data will have to be fetched
        // with a RecordsRead when record.data.blob() is executed.
        const dataJson = TestDataGenerator.randomJson(11_000);
        const inputDataBytes = new TextEncoder().encode(JSON.stringify(dataJson));

        // Write the 11KB record to agent-connected DWN.
        const { record, status } = await dwn.records.write({ data: dataJson });

        expect(status.code).to.equal(202);

        // Confirm that the size, in bytes, of the data read as a Blob matches the original input data.
        const readDataBlob = await record!.data.blob();
        expect(readDataBlob.size).to.equal(inputDataBytes.length);

        // Convert the Blob into an array and ensure it matches the input data byte for byte.
        const readDataBytes = new Uint8Array(await readDataBlob.arrayBuffer());
        expect(readDataBytes).to.deep.equal(inputDataBytes);
      });

      it('returns large data payloads after dwn.records.read()', async () => {
        // Generate data that exceeds the DWN encoded data limit to ensure that the data will have to be fetched
        // with a RecordsRead when record.data.blob() is executed.
        const dataJson = TestDataGenerator.randomJson(11_000);
        const inputDataBytes = new TextEncoder().encode(JSON.stringify(dataJson));

        // Write the 11KB record to agent-connected DWN.
        const { record, status } = await dwn.records.write({ data: dataJson });

        expect(status.code).to.equal(202);

        // Read the record that was just created.
        const { record: readRecord, status: readRecordStatus } = await dwn.records.read({ message: { recordId: record!.id }});

        expect(readRecordStatus.code).to.equal(200);

        // Confirm that the size, in bytes, of the data read as a Blob matches the original input data.
        const readDataBlob = await readRecord.data.blob();
        expect(readDataBlob.size).to.equal(inputDataBytes.length);

        // Convert the Blob into an array and ensure it matches the input data byte for byte.
        const readDataBytes = new Uint8Array(await readDataBlob.arrayBuffer());
        expect(readDataBytes).to.deep.equal(inputDataBytes);
      });
    });

    describe('json()', () => {
      it('returns small data payloads after dwn.records.write()', async () => {
        // Generate data that is less than the encoded data limit to ensure that the data will not have to be fetched
        // with a RecordsRead when record.data.json() is executed.
        const dataJson = TestDataGenerator.randomJson(500);
        const inputDataBytes = new TextEncoder().encode(JSON.stringify(dataJson));

        // Write the 500B record to agent-connected DWN.
        const { record, status } = await dwn.records.write({ data: dataJson });

        expect(status.code).to.equal(202);

        // Confirm that the size, in bytes, of the data read as JSON matches the original input data.
        const readDataJson = await record!.data.json();
        const readDataBytes = new TextEncoder().encode(JSON.stringify(readDataJson));
        expect(readDataBytes.length).to.equal(inputDataBytes.length);

        // Ensure the JSON returned matches the input data, byte for byte.
        expect(readDataBytes).to.deep.equal(inputDataBytes);
      });

      it('returns small data payloads after dwn.records.read()', async () => {
        // Generate data that is less than the encoded data limit to ensure that the data will not have to be fetched
        // with a RecordsRead when record.data.json() is executed.
        const dataJson = TestDataGenerator.randomJson(500);
        const inputDataBytes = new TextEncoder().encode(JSON.stringify(dataJson));

        // Write the 500B record to agent-connected DWN.
        const { record, status } = await dwn.records.write({ data: dataJson });

        expect(status.code).to.equal(202);

        // Read the record that was just created.
        const { record: readRecord, status: readRecordStatus } = await dwn.records.read({ message: { recordId: record!.id }});

        expect(readRecordStatus.code).to.equal(200);

        // Confirm that the size, in bytes, of the data read as JSON matches the original input data.
        const readDataJson = await readRecord!.data.json();
        const readDataBytes = new TextEncoder().encode(JSON.stringify(readDataJson));
        expect(readDataBytes.length).to.equal(inputDataBytes.length);

        // Ensure the JSON returned matches the input data, byte for byte.
        expect(readDataBytes).to.deep.equal(inputDataBytes);
      });

      it('returns large data payloads after dwn.records.write()', async () => {
        // Generate data that exceeds the DWN encoded data limit to ensure that the data will have to be fetched
        // with a RecordsRead when record.data.json() is executed.
        const dataJson = TestDataGenerator.randomJson(11_000);
        const inputDataBytes = new TextEncoder().encode(JSON.stringify(dataJson));

        // Write the 11KB record to agent-connected DWN.
        const { record, status } = await dwn.records.write({ data: dataJson });

        expect(status.code).to.equal(202);

        // Confirm that the size, in bytes, of the data read as JSON matches the original input data.
        const readDataJson = await record!.data.json();
        const readDataBytes = new TextEncoder().encode(JSON.stringify(readDataJson));
        expect(readDataBytes.length).to.equal(inputDataBytes.length);

        // Ensure the JSON returned matches the input data, byte for byte.
        expect(readDataBytes).to.deep.equal(inputDataBytes);
      });

      it('returns large data payloads after dwn.records.read()', async () => {
      // Generate data that exceeds the DWN encoded data limit to ensure that the data will have to be fetched
      // with a RecordsRead when record.data.json() is executed.
        const dataJson = TestDataGenerator.randomJson(11_000);
        const inputDataBytes = new TextEncoder().encode(JSON.stringify(dataJson));

        // Write the 11KB record to agent-connected DWN.
        const { record, status } = await dwn.records.write({ data: dataJson });

        expect(status.code).to.equal(202);

        // Read the record that was just created.
        const { record: readRecord, status: readRecordStatus } = await dwn.records.read({ message: { recordId: record!.id }});

        expect(readRecordStatus.code).to.equal(200);

        // Confirm that the size, in bytes, of the data read as JSON matches the original input data.
        const readDataJson = await readRecord!.data.json();
        const readDataBytes = new TextEncoder().encode(JSON.stringify(readDataJson));
        expect(readDataBytes.length).to.equal(inputDataBytes.length);

        // Ensure the JSON returned matches the input data, byte for byte.
        expect(readDataBytes).to.deep.equal(inputDataBytes);
      });
    });

    describe('text()', () => {
      it('returns small data payloads after dwn.records.write()', async () => {
      // Generate data that is less than the encoded data limit to ensure that the data will not have to be fetched
      // with a RecordsRead when record.data.text() is executed.
        const dataText = TestDataGenerator.randomString(500);

        // Write the 500B record to agent-connected DWN.
        const { record, status } = await dwn.records.write({ data: dataText });

        expect(status.code).to.equal(202);

        // Confirm that the length of the data read as text matches the original input data.
        const readDataText = await record!.data.text();
        expect(readDataText.length).to.equal(dataText.length);

        // Ensure the text returned matches the input data, char for char.
        expect(readDataText).to.deep.equal(dataText);
      });

      it('returns small data payloads after dwn.records.read()', async () => {
      // Generate data that is less than the encoded data limit to ensure that the data will not have to be fetched
      // with a RecordsRead when record.data.text() is executed.
        const dataText = TestDataGenerator.randomString(500);

        // Write the 500B record to agent-connected DWN.
        const { record, status } = await dwn.records.write({ data: dataText });

        expect(status.code).to.equal(202);

        // Read the record that was just created.
        const { record: readRecord, status: readRecordStatus } = await dwn.records.read({ message: { recordId: record!.id }});

        expect(readRecordStatus.code).to.equal(200);

        // Confirm that the length of the data read as text matches the original input data.
        const readDataText = await readRecord!.data.text();
        expect(readDataText.length).to.equal(dataText.length);

        // Ensure the text returned matches the input data, char for char.
        expect(readDataText).to.deep.equal(dataText);
      });

      it('returns large data payloads after dwn.records.write()', async () => {
      // Generate data that exceeds the DWN encoded data limit to ensure that the data will have to be fetched
      // with a RecordsRead when record.data.text() is executed.
        const dataText = TestDataGenerator.randomString(11_000);

        // Write the 11KB record to agent-connected DWN.
        const { record, status } = await dwn.records.write({ data: dataText });

        expect(status.code).to.equal(202);

        // Confirm that the length of the data read as text matches the original input data.
        const readDataText = await record!.data.text();
        expect(readDataText.length).to.equal(dataText.length);

        // Ensure the text returned matches the input data, char for char.
        expect(readDataText).to.deep.equal(dataText);
      });

      it('returns large data payloads after dwn.records.read()', async () => {
      // Generate data that exceeds the DWN encoded data limit to ensure that the data will have to be fetched
      // with a RecordsRead when record.data.text() is executed.
        const dataText = TestDataGenerator.randomString(11_000);

        // Write the 11KB record to agent-connected DWN.
        const { record, status } = await dwn.records.write({ data: dataText });

        expect(status.code).to.equal(202);

        // Read the record that was just created.
        const { record: readRecord, status: readRecordStatus } = await dwn.records.read({ message: { recordId: record!.id }});

        expect(readRecordStatus.code).to.equal(200);

        // Confirm that the length of the data read as text matches the original input data.
        const readDataText = await readRecord!.data.text();
        expect(readDataText.length).to.equal(dataText.length);

        // Ensure the text returned matches the input data, char for char.
        expect(readDataText).to.deep.equal(dataText);
      });
    });
  });

  describe('record.delete', () => {
    it('deletes the record', async () => {
      const { status, record } = await dwn.records.write({
        data    : 'Hello, world!',
        message : {
          schema     : 'foo/bar',
          dataFormat : 'text/plain'
        }
      });

      expect(status.code).to.equal(202);
      expect(record).to.not.be.undefined;

      const deleteResult = await record!.delete();
      expect(deleteResult.status.code).to.equal(202);

      const queryResult = await dwn.records.query({
        message: {
          filter: {
            recordId: record!.id
          }
        }
      });

      expect(queryResult.status.code).to.equal(200);
      expect(queryResult.records!.length).to.equal(0);
    });

    it('throws an exception when delete is called twice', async () => {
      const { status, record } = await dwn.records.write({
        data    : 'Hello, world!',
        message : {
          schema     : 'foo/bar',
          dataFormat : 'text/plain'
        }
      });

      expect(status.code).to.equal(202);
      expect(record).to.not.be.undefined;

      let deleteResult = await record!.delete();
      expect(deleteResult.status.code).to.equal(202);

      await expect(record!.delete()).to.eventually.be.rejectedWith('Operation failed');
    });
  });

  describe('send()', () => {
    it(`writes records to remote DWNs for your own DID`, async () => {
      const dataString = 'Hello, world!';

      // Alice writes a message to her agent connected DWN.
      const { status: aliceEmailStatus, record: aliceEmailRecord } = await dwn.records.write({
        data    : dataString,
        message : {
          schema: 'email',
        }
      });

      expect(aliceEmailStatus.code).to.equal(202);
      expect(await aliceEmailRecord?.data.text()).to.equal(dataString);

      // Query Alice's agent connected DWN for `email` schema records.
      const aliceAgentQueryResult = await dwn.records.query({
        message: {
          filter: {
            schema: 'email'
          }
        }
      });

      expect(aliceAgentQueryResult.status.code).to.equal(200);
      expect(aliceAgentQueryResult!.records).to.have.length(1);
      const [ aliceAgentEmailRecord ] = aliceAgentQueryResult!.records!;
      expect(await aliceAgentEmailRecord.data.text()).to.equal(dataString);

      // Attempt to write the record to Alice's remote DWN.
      const { status } = await aliceEmailRecord!.send(didAllKeys);
      expect(status.code).to.equal(202);

      // Query Alices's remote DWN for `email` schema records.
      const aliceRemoteQueryResult = await dwn.records.query({
        from    : didAllKeys,
        message : {
          filter: {
            schema: 'email'
          }
        }
      });

      expect(aliceRemoteQueryResult.status.code).to.equal(200);
      expect(aliceRemoteQueryResult.records).to.exist;
      expect(aliceRemoteQueryResult.records!.length).to.equal(1);
      const [ aliceRemoteEmailRecord ] = aliceAgentQueryResult!.records!;
      expect(await aliceRemoteEmailRecord.data.text()).to.equal(dataString);
    }).timeout(10_000);

    it(`writes records to remote DWNs for someone else's DID`, async () => {
      const dataString = 'Hello, world!';

      // install a protocol for alice
      let { protocol: aliceProtocol, status: aliceStatus } = await dwn.protocols.configure({
        message: {
          definition: emailProtocolDefinition
        }
      });

      expect(aliceStatus.code).to.equal(202);
      expect(aliceProtocol).to.exist;

      const { status: alicePushStatus } = await aliceProtocol!.send(didAllKeys);
      expect(alicePushStatus.code).to.equal(202);

      // install a protocol for bob
      testProfileOptions = await testProfile.ion.with.dwn.service.and.authorization.encryption.attestation.keys();
      const { did: bobDid } = await testAgent.createProfile(testProfileOptions);
      const bobDwn = new DwnApi(testAgent.agent, bobDid);

      const { protocol: bobProtocol, status: bobStatus } = await bobDwn.protocols.configure({
        message: {
          definition: emailProtocolDefinition
        }
      });

      expect(bobStatus.code).to.equal(202);
      expect(bobProtocol).to.exist;

      const { status: bobPushStatus } = await bobProtocol!.send(bobDid);
      expect(bobPushStatus.code).to.equal(202);

      // alice writes a message to her own dwn
      const { status: aliceEmailStatus, record: aliceEmailRecord } = await dwn.records.write({
        data    : dataString,
        message : {
          protocol     : emailProtocolDefinition.protocol,
          protocolPath : 'email',
          schema       : 'email',
        }
      });

      expect(aliceEmailStatus.code).to.equal(202);

      const { status } = await aliceEmailRecord!.send(bobDid);
      expect(status.code).to.equal(202);

      // Query Bob's remote DWN for `email` schema records.
      const bobQueryResult = await bobDwn.records.query({
        from    : bobDid,
        message : {
          filter: {
            schema: 'email'
          }
        }
      });

      expect(bobQueryResult.status.code).to.equal(200);
      expect(bobQueryResult.records).to.exist;
      expect(bobQueryResult.records!.length).to.equal(1);
      const [ bobRemoteEmailRecord ] = bobQueryResult!.records!;
      expect(await bobRemoteEmailRecord.data.text()).to.equal(dataString);
    }).timeout(10_000);

    describe('with `store: false`', () => {
      it('writes records to your own remote DWN but not your agent DWN', async () => {
        // Alice writes a message to her agent DWN with `store: false`.
        const dataString = 'Hello, world!';
        const writeResult = await dwn.records.write({
          store   : false,
          data    : dataString,
          message : {
            dataFormat: 'text/plain'
          }
        });

        // Confirm that the request was accepted and a Record instance was returned.
        expect(writeResult.status.code).to.equal(202);
        expect(writeResult.status.detail).to.equal('Accepted');
        expect(writeResult.record).to.exist;
        expect(await writeResult.record?.data.text()).to.equal(dataString);

        // Query Alice's agent DWN for `text/plain` records.
        const queryResult = await dwn.records.query({
          message: {
            filter: {
              dataFormat: 'text/plain'
            }
          }
        });

        // Confirm no `email` schema records were written.
        expect(queryResult.status.code).to.equal(200);
        expect(queryResult.records).to.exist;
        expect(queryResult.records!.length).to.equal(0);

        // Alice writes the message to her remote DWN.
        const { status } = await writeResult.record!.send(didAllKeys);
        expect(status.code).to.equal(202);

        // Query Alice's remote DWN for `plain/text` records.
        const aliceRemoteQueryResult = await dwn.records.query({
          from    : didAllKeys,
          message : {
            filter: {
              dataFormat: 'text/plain'
            }
          }
        });

        // Confirm `email` schema record was written to Alice's remote DWN.
        expect(aliceRemoteQueryResult.status.code).to.equal(200);
        expect(aliceRemoteQueryResult.records).to.exist;
        expect(aliceRemoteQueryResult.records!.length).to.equal(1);
        const [ aliceRemoteEmailRecord ] = aliceRemoteQueryResult!.records!;
        expect(await aliceRemoteEmailRecord.data.text()).to.equal(dataString);
      }).timeout(10_000);

      it(`writes records to someone else's remote DWN but not your agent DWN`, async () => {
        // Install a protocol on Alice's agent connected DWN.
        let { protocol: aliceProtocol, status: aliceStatus } = await dwn.protocols.configure({
          message: {
            definition: emailProtocolDefinition
          }
        });

        expect(aliceStatus.code).to.equal(202);
        expect(aliceProtocol).to.exist;

        // Install the protocol on Alice's remote DWN.
        const { status: alicePushStatus } = await aliceProtocol!.send(didAllKeys);
        expect(alicePushStatus.code).to.equal(202);

        // Create a second profile for Bob.
        testProfileOptions = await testProfile.ion.with.dwn.service.and.authorization.encryption.attestation.keys();
        const { did: bobDid } = await testAgent.createProfile(testProfileOptions);
        const bobDwn = new DwnApi(testAgent.agent, bobDid);

        // Install a protocol on Bob's agent connected DWN.
        const { protocol: bobProtocol, status: bobStatus } = await bobDwn.protocols.configure({
          message: {
            definition: emailProtocolDefinition
          }
        });

        expect(bobStatus.code).to.equal(202);
        expect(bobProtocol).to.exist;

        // Install the protocol on Bob's remote DWN.
        const { status: bobPushStatus } = await bobProtocol!.send(bobDid);
        expect(bobPushStatus.code).to.equal(202);

        // Alice writes a message to her agent DWN with `store: false`.
        const dataString = 'Hello, world!';
        const writeResult = await dwn.records.write({
          store   : false,
          data    : dataString,
          message : {
            protocol     : emailProtocolDefinition.protocol,
            protocolPath : 'email',
            schema       : 'email',
          }
        });

        // Confirm that the request was accepted and a Record instance was returned.
        expect(writeResult.status.code).to.equal(202);
        expect(writeResult.status.detail).to.equal('Accepted');
        expect(writeResult.record).to.exist;
        expect(await writeResult.record?.data.text()).to.equal(dataString);

        // Query Alice's agent DWN for `email` schema records.
        const queryResult = await dwn.records.query({
          message: {
            filter: {
              schema: 'email'
            }
          }
        });

        // Confirm no `email` schema records were written.
        expect(queryResult.status.code).to.equal(200);
        expect(queryResult.records).to.exist;
        expect(queryResult.records!.length).to.equal(0);

        // Alice writes the message to Bob's remote DWN.
        const { status } = await writeResult.record!.send(bobDid);
        expect(status.code).to.equal(202);

        // Query Bobs's remote DWN for `email` schema records.
        const bobQueryResult = await bobDwn.records.query({
          from    : bobDid,
          message : {
            filter: {
              dataFormat: 'text/plain'
            }
          }
        });

        // Confirm `email` schema record was written to Bob's remote DWN.
        expect(bobQueryResult.status.code).to.equal(200);
        expect(bobQueryResult.records).to.exist;
        expect(bobQueryResult.records!.length).to.equal(1);
        const [ bobRemoteEmailRecord ] = bobQueryResult!.records!;
        expect(await bobRemoteEmailRecord.data.text()).to.equal(dataString);
      }).timeout(10_000);

      it('has no effect if `store: true`', async () => {
        // Alice writes a message to her agent DWN with `store: true`.
        const dataString = 'Hello, world!';
        const writeResult = await dwn.records.write({
          store   : true,
          data    : dataString,
          message : {
            dataFormat: 'text/plain'
          }
        });

        // Confirm that the request was accepted and a Record instance was returned.
        expect(writeResult.status.code).to.equal(202);
        expect(writeResult.status.detail).to.equal('Accepted');
        expect(writeResult.record).to.exist;
        expect(await writeResult.record?.data.text()).to.equal(dataString);

        // Query Alice's agent DWN for `text/plain` records.
        const queryResult = await dwn.records.query({
          message: {
            filter: {
              dataFormat: 'text/plain'
            }
          }
        });

        // Confirm the `email` schema records was written.
        expect(queryResult.status.code).to.equal(200);
        expect(queryResult.records).to.exist;
        expect(queryResult.records!.length).to.equal(1);
        const [ aliceAgentRecord ] = queryResult!.records!;
        expect(await aliceAgentRecord.data.text()).to.equal(dataString);

        // Alice writes the message to her remote DWN.
        const { status } = await writeResult.record!.send(didAllKeys);
        expect(status.code).to.equal(202);

        // Query Alice's remote DWN for `plain/text` records.
        const aliceRemoteQueryResult = await dwn.records.query({
          from    : didAllKeys,
          message : {
            filter: {
              dataFormat: 'text/plain'
            }
          }
        });

        // Confirm `email` schema record was written to Alice's remote DWN.
        expect(aliceRemoteQueryResult.status.code).to.equal(200);
        expect(aliceRemoteQueryResult.records).to.exist;
        expect(aliceRemoteQueryResult.records!.length).to.equal(1);
        const [ aliceRemoteEmailRecord ] = aliceRemoteQueryResult!.records!;
        expect(await aliceRemoteEmailRecord.data.text()).to.equal(dataString);
      });
    });
  });

  describe('toJSON()', () => {
    it('should return all defined properties', async () => {
      // RecordOptions properties
      const author = didAllKeys;
      const target = didAllKeys;

      const profile = await testAgent.profileApi.getProfile(didAllKeys);

      // Retrieve `#dwn` service entry.
      const [ didDwnService ] = didUtils.getServices(profile!.did.didDocument as DidDocument, { id: '#dwn' });

      // Retrieve first record encryption key from the #dwn serviceEndpoint.
      const recordEncryptionKeyId = typeof didDwnService!.serviceEndpoint !== 'string' ? didDwnService!.serviceEndpoint!.recordEncryptionKeys![0] : undefined;
      const encryptionKeyId = `${profile?.did.id}${recordEncryptionKeyId}`;
      const encryptionPublicKeyJwk = profile!.did.keys.find(key => key.id === encryptionKeyId)!.publicKeyJwk;

      // Retrieve first message authorization key from the #dwn serviceEndpoint.
      const messageAuthorizationKeyId = typeof didDwnService!.serviceEndpoint !== 'string' ? didDwnService!.serviceEndpoint!.messageAuthorizationKeys![0] : undefined;
      const authorizationKeyId = `${profile?.did.id}${messageAuthorizationKeyId}`;
      const authorizationPrivateKeyJwk = profile!.did.keys.find(key => key.id === authorizationKeyId)!.privateKeyJwk;

      // Retrieve first message attestation key from the #dwn serviceEndpoint.
      const messageAttestationKeyId = typeof didDwnService!.serviceEndpoint !== 'string' ? didDwnService!.serviceEndpoint!.messageAttestationKeys![0] : undefined;
      const attestationKeyId = `${profile?.did.id}${messageAttestationKeyId}`;
      const attestationPrivateKeyJwk = profile!.did.keys.find(key => key.id === attestationKeyId)!.privateKeyJwk;

      // RecordsWriteMessage properties that can be pre-defined
      const attestation = [{
        privateJwk      : attestationPrivateKeyJwk as DwnPrivateKeyJwk,
        protectedHeader : {
          alg : attestationPrivateKeyJwk.alg as string,
          kid : attestationKeyId
        }
      }];

      const authorization = {
        privateJwk      : authorizationPrivateKeyJwk as DwnPrivateKeyJwk,
        protectedHeader : {
          alg : authorizationPrivateKeyJwk.alg as string,
          kid : authorizationKeyId
        }
      };

      const encryptionInput = {
        initializationVector : TestDataGenerator.randomBytes(16),
        key                  : TestDataGenerator.randomBytes(32),
        keyEncryptionInputs  : [
          {
            derivationScheme : KeyDerivationScheme.Protocols,
            publicKey        : encryptionPublicKeyJwk as DwnPublicKeyJwk,
            publicKeyId      : recordEncryptionKeyId
          },
          {
            derivationScheme : KeyDerivationScheme.Schemas,
            publicKey        : encryptionPublicKeyJwk as DwnPublicKeyJwk,
            publicKeyId      : recordEncryptionKeyId
          },
        ]
      };

      // RecordsWriteDescriptor properties that can be pre-defined
      const protocol = 'http://example.org/chat/protocol';
      const protocolPath = 'message';
      const recipient = didAllKeys;
      const published = true;
      const schema = 'http://example.org/chat/schema/message';

      // Create a parent record to reference in the RecordsWriteMessage used for validation
      const parentRecorsWrite = await RecordsWrite.create({
        protocol,
        protocolPath,
        schema,
        data                        : new Uint8Array(await dataBlob.arrayBuffer()),
        dataFormat,
        authorizationSignatureInput : authorization,
      }) as RecordsWriteTest;

      // Create a RecordsWriteMessage
      const recordsWrite = await RecordsWrite.create({
        protocol,
        protocolPath,
        recipient,
        schema,
        parentId                    : parentRecorsWrite.recordId,
        data                        : new Uint8Array(await dataBlob.arrayBuffer()),
        published,
        dataFormat,
        attestationSignatureInputs  : attestation,
        authorizationSignatureInput : authorization,
        encryptionInput,
      }) as RecordsWriteTest;

      // Create record using test RecordsWriteMessage.
      const record = new Record(testAgent.agent, {
        ...recordsWrite.message,
        encodedData: dataBlob,
        target,
        author,
      });

      // Call toJSON() method.
      const recordJson = record.toJSON();

      // Retained Record properties.
      expect(recordJson.author).to.equal(author);
      expect(recordJson.target).to.equal(target);

      // Retained RecordsWriteMessage top-level properties.
      expect(record.contextId).to.equal(recordsWrite.message.contextId);
      expect(record.id).to.equal(recordsWrite.message.recordId);
      expect(record.encryption).to.not.be.undefined;
      expect(record.encryption).to.deep.equal(recordsWrite.message.encryption);
      expect(record.encryption!.keyEncryption.find(key => key.derivationScheme === KeyDerivationScheme.Protocols));
      expect(record.encryption!.keyEncryption.find(key => key.derivationScheme === KeyDerivationScheme.Schemas));
      expect(record.attestation).to.not.be.undefined;
      expect(record.attestation).to.have.property('signatures');

      // Retained RecordsWriteDescriptor properties.
      expect(recordJson.interface).to.equal(DwnInterfaceName.Records);
      expect(recordJson.method).to.equal(DwnMethodName.Write);
      expect(recordJson.protocol).to.equal(protocol);
      expect(recordJson.protocolPath).to.equal(protocolPath);
      expect(recordJson.recipient).to.equal(recipient);
      expect(recordJson.schema).to.equal(schema);
      expect(recordJson.parentId).to.equal(parentRecorsWrite.recordId);
      expect(recordJson.dataCid).to.equal(recordsWrite.message.descriptor.dataCid);
      expect(recordJson.dataSize).to.equal(recordsWrite.message.descriptor.dataSize);
      expect(recordJson.dateCreated).to.equal(recordsWrite.message.descriptor.dateCreated);
      expect(recordJson.dateModified).to.equal(recordsWrite.message.descriptor.dateModified);
      expect(recordJson.published).to.equal(published);
      expect(recordJson.datePublished).to.equal(recordsWrite.message.descriptor.datePublished);
      expect(recordJson.dataFormat).to.equal(dataFormat);
    });
  });
});