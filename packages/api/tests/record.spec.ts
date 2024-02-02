import type { PortableDid } from '@web5/dids';
import type {
  RecordsWriteMessage,
  PublicJwk as DwnPublicKeyJwk,
  PrivateJwk as DwnPrivateKeyJwk,
  EncryptionInput,
} from '@tbd54566975/dwn-sdk-js';

import chai, { expect } from 'chai';
import { NodeStream } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';
import { utils as didUtils } from '@web5/dids';
import { TestManagedAgent } from '@web5/agent';
import {
  DataStream,
  DwnConstant,
  RecordsWrite,
  DwnMethodName,
  DwnInterfaceName,
  PrivateKeySigner,
  EncryptionAlgorithm,
  KeyDerivationScheme,
} from '@tbd54566975/dwn-sdk-js';

import { Record } from '../src/record.js';
import { DwnApi } from '../src/dwn-api.js';
import { dataToBlob } from '../src/utils.js';
import { testDwnUrl } from './utils/test-config.js';
import { TestUserAgent } from './utils/test-user-agent.js';
import { TestDataGenerator } from './utils/test-data-generator.js';
import emailProtocolDefinition from './fixtures/protocol-definitions/email.json' assert { type: 'json' };

chai.use(chaiAsPromised);

// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;

// TODO: Come up with a better way of resolving the TS errors.
type RecordsWriteTest = RecordsWrite & RecordsWriteMessage;

let testDwnUrls: string[] = [testDwnUrl];

describe('Record', () => {
  let dataText: string;
  let dataBlob: Blob;
  let dataFormat: string;
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

    dataText = TestDataGenerator.randomString(100);
    ({ dataBlob, dataFormat } = dataToBlob(dataText));
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

  it('imports a record that another user wrote', async () => {

    // Install the email protocol for Alice's local DWN.
    let { protocol: aliceProtocol, status: aliceStatus } = await dwnAlice.protocols.configure({
      message: {
        definition: emailProtocolDefinition
      }
    });
    expect(aliceStatus.code).to.equal(202);
    expect(aliceProtocol).to.exist;

    // Install the email protocol for Alice's remote DWN.
    const { status: alicePushStatus } = await aliceProtocol!.send(aliceDid.did);
    expect(alicePushStatus.code).to.equal(202);

    // Install the email protocol for Bob's local DWN.
    const { protocol: bobProtocol, status: bobStatus } = await dwnBob.protocols.configure({
      message: {
        definition: emailProtocolDefinition
      }
    });

    expect(bobStatus.code).to.equal(202);
    expect(bobProtocol).to.exist;

    // Install the email protocol for Bob's remote DWN.
    const { status: bobPushStatus } = await bobProtocol!.send(bobDid.did);
    expect(bobPushStatus.code).to.equal(202);

    // Alice creates a new large record and stores it on her own dwn
    const { status: aliceEmailStatus, record: aliceEmailRecord } = await dwnAlice.records.write({
      data    : TestDataGenerator.randomString(DwnConstant.maxDataSizeAllowedToBeEncoded + 1000),
      message : {
        recipient    : bobDid.did,
        protocol     : emailProtocolDefinition.protocol,
        protocolPath : 'thread',
        schema       : 'http://email-protocol.xyz/schema/thread',
      }
    });
    expect(aliceEmailStatus.code).to.equal(202);
    const { status: sendStatus } = await aliceEmailRecord!.send(aliceDid.did);
    expect(sendStatus.code).to.equal(202);


    // Bob queries for the record on his own DWN (should not find it)
    let bobQueryBobDwn = await dwnBob.records.query({
      from    : bobDid.did,
      message : {
        filter: {
          protocol     : emailProtocolDefinition.protocol,
          protocolPath : 'thread',
        }
      }
    });
    expect(bobQueryBobDwn.status.code).to.equal(200);
    expect(bobQueryBobDwn.records.length).to.equal(0); // no results

    // Bob queries for the record that was just created on Alice's remote DWN.
    let bobQueryAliceDwn = await dwnBob.records.query({
      from    : aliceDid.did,
      message : {
        filter: {
          protocol     : emailProtocolDefinition.protocol,
          protocolPath : 'thread',
        }
      }
    });
    expect(bobQueryAliceDwn.status.code).to.equal(200);
    expect(bobQueryAliceDwn.records.length).to.equal(1);

    // bob imports the record
    const importRecord = bobQueryAliceDwn.records[0];
    const { status: importRecordStatus } = await importRecord.import();
    expect(importRecordStatus.code).to.equal(202);

    // bob sends the record to his remote dwn
    const { status: importSendStatus } = await importRecord!.send();
    expect(importSendStatus.code).to.equal(202);

    // Bob queries for the record on his own DWN (should now return it)
    bobQueryBobDwn = await dwnBob.records.query({
      from    : bobDid.did,
      message : {
        filter: {
          protocol     : emailProtocolDefinition.protocol,
          protocolPath : 'thread',
        }
      }
    });
    expect(bobQueryBobDwn.status.code).to.equal(200);
    expect(bobQueryBobDwn.records.length).to.equal(1);
    expect(bobQueryBobDwn.records[0].id).to.equal(importRecord.id);

    // Alice updates her record
    let { status: aliceEmailStatusUpdated } = await aliceEmailRecord.update({
      data: TestDataGenerator.randomString(DwnConstant.maxDataSizeAllowedToBeEncoded + 1000)
    });
    expect(aliceEmailStatusUpdated.code).to.equal(202);

    const { status: sentToSelfStatus } = await aliceEmailRecord!.send();
    expect(sentToSelfStatus.code).to.equal(202);

    const { status: sentToBobStatus } = await aliceEmailRecord!.send(bobDid.did);
    expect(sentToBobStatus.code).to.equal(202);

    // Alice updates her record and sends it to her own DWN again
    const updatedText = TestDataGenerator.randomString(DwnConstant.maxDataSizeAllowedToBeEncoded + 1000);
    let { status: aliceEmailStatusUpdatedAgain } = await aliceEmailRecord.update({
      data: updatedText
    });
    expect(aliceEmailStatusUpdatedAgain.code).to.equal(202);
    const { status: sentToSelfAgainStatus } = await aliceEmailRecord!.send();
    expect(sentToSelfAgainStatus.code).to.equal(202);

    // Bob queries for the updated record on alice's DWN
    bobQueryAliceDwn = await dwnBob.records.query({
      from    : aliceDid.did,
      message : {
        filter: {
          protocol     : emailProtocolDefinition.protocol,
          protocolPath : 'thread',
        }
      }
    });
    expect(bobQueryAliceDwn.status.code).to.equal(200);
    expect(bobQueryAliceDwn.records.length).to.equal(1);
    const updatedRecord = bobQueryAliceDwn.records[0];

    // stores the record on his own DWN
    const { status: updatedRecordStoredStatus } = await updatedRecord.store();
    expect(updatedRecordStoredStatus.code).to.equal(202);
    expect(await updatedRecord.data.text()).to.equal(updatedText);

    // sends the record to his own DWN
    const { status: updatedRecordToSelfStatus } = await updatedRecord!.send();
    expect(updatedRecordToSelfStatus.code).to.equal(202);

    // Bob queries for the updated record on his own DWN
    bobQueryBobDwn = await dwnBob.records.query({
      from    : bobDid.did,
      message : {
        filter: {
          protocol     : emailProtocolDefinition.protocol,
          protocolPath : 'thread',
        }
      }
    });
    expect(bobQueryBobDwn.status.code).to.equal(200);
    expect(bobQueryBobDwn.records.length).to.equal(1);
    expect(bobQueryBobDwn.records[0].id).to.equal(importRecord.id);
    expect(await bobQueryBobDwn.records[0].data.text()).to.equal(updatedText);
  });

  it('should retain all defined properties', async () => {
    // RecordOptions properties
    const author = aliceDid.did;

    // Retrieve `#dwn` service entry.
    const [ didDwnService ] = didUtils.getServices({ didDocument: aliceDid.document, id: '#dwn' });

    // Retrieve first message signing key from the #dwn service endpoint.
    if (!didUtils.isDwnServiceEndpoint(didDwnService.serviceEndpoint)) throw Error('Type guard');
    const [ signingKeyIdFragment ] = didDwnService!.serviceEndpoint!.signingKeys;
    const [ encryptionKeyIdFragment ] = didDwnService!.serviceEndpoint!.encryptionKeys;

    const signingKeyId = `${aliceDid.did}${signingKeyIdFragment}`;
    const signingKeyPair = aliceDid.keySet.verificationMethodKeys!.find(keyPair => keyPair.publicKeyJwk.kid === signingKeyIdFragment);
    const signingPrivateKeyJwk = signingKeyPair.privateKeyJwk;

    const encryptionKeyId = `${aliceDid.did}${encryptionKeyIdFragment}`;
    const encryptionPublicKeyJwk = aliceDid.keySet.verificationMethodKeys!.find(keyPair => keyPair.publicKeyJwk.kid === encryptionKeyIdFragment)!.publicKeyJwk;

    // RecordsWriteMessage properties that can be pre-defined
    const attestation = [new PrivateKeySigner({
      privateJwk : signingPrivateKeyJwk as DwnPrivateKeyJwk,
      algorithm  : signingPrivateKeyJwk.alg as string,
      keyId      : signingKeyId,
    })];

    const authorization = new PrivateKeySigner({
      privateJwk : signingPrivateKeyJwk as DwnPrivateKeyJwk,
      algorithm  : signingPrivateKeyJwk.alg as string,
      keyId      : signingKeyId,
    });

    const encryptionInput: EncryptionInput = {
      algorithm            : EncryptionAlgorithm.Aes256Ctr,
      initializationVector : TestDataGenerator.randomBytes(16),
      key                  : TestDataGenerator.randomBytes(32),
      keyEncryptionInputs  : [{
        algorithm        : EncryptionAlgorithm.EciesSecp256k1,
        derivationScheme : KeyDerivationScheme.ProtocolPath,
        publicKey        : encryptionPublicKeyJwk as DwnPublicKeyJwk,
        publicKeyId      : encryptionKeyId
      }]
    };

    // RecordsWriteDescriptor properties that can be pre-defined
    const protocol = emailProtocolDefinition.protocol;
    const protocolPath = 'email';
    const schema = emailProtocolDefinition.types.email.schema;
    const recipient = aliceDid.did;
    const published = true;

    // Install a protocol on Alice's agent connected DWN.
    await dwnAlice.protocols.configure({
      message: {
        definition: emailProtocolDefinition
      }
    });

    // Create a parent record to reference in the RecordsWriteMessage used for validation
    const parentRecordsWrite = await RecordsWrite.create({
      data   : new Uint8Array(await dataBlob.arrayBuffer()),
      dataFormat,
      protocol,
      protocolPath,
      schema,
      signer : authorization,
    }) as RecordsWriteTest;

    // Create a RecordsWriteMessage
    const recordsWrite = await RecordsWrite.create({
      attestationSigners : attestation,
      data               : new Uint8Array(await dataBlob.arrayBuffer()),
      dataFormat,
      encryptionInput,
      parentId           : parentRecordsWrite.recordId,
      protocol,
      protocolPath,
      published,
      recipient,
      schema,
      signer             : authorization,
    }) as RecordsWriteTest;

    // Create record using test RecordsWriteMessage.
    const record = new Record(testAgent.agent, {
      ...recordsWrite.message,
      encodedData  : dataBlob,
      author       : aliceDid.did,
      connectedDid : aliceDid.did
    });

    // Retained Record properties
    expect(record.author).to.equal(author);

    // Retained RecordsWriteMessage top-level properties
    expect(record.contextId).to.equal(recordsWrite.message.contextId);
    expect(record.id).to.equal(recordsWrite.message.recordId);
    expect(record.encryption).to.not.be.undefined;
    expect(record.encryption).to.deep.equal(recordsWrite.message.encryption);
    expect(record.encryption!.keyEncryption.find(key => key.derivationScheme === KeyDerivationScheme.ProtocolPath));
    expect(record.attestation).to.not.be.undefined;
    expect(record.attestation).to.have.property('signatures');

    // Retained RecordsWriteDescriptor properties
    expect(record.protocol).to.equal(protocol);
    expect(record.protocolPath).to.equal(protocolPath);
    expect(record.recipient).to.equal(recipient);
    expect(record.schema).to.equal(schema);
    expect(record.parentId).to.equal(parentRecordsWrite.recordId);
    expect(record.dataCid).to.equal(recordsWrite.message.descriptor.dataCid);
    expect(record.dataSize).to.equal(recordsWrite.message.descriptor.dataSize);
    expect(record.dateCreated).to.equal(recordsWrite.message.descriptor.dateCreated);
    expect(record.dateModified).to.equal(recordsWrite.message.descriptor.messageTimestamp);
    expect(record.published).to.equal(published);
    expect(record.datePublished).to.equal(recordsWrite.message.descriptor.datePublished);
    expect(record.dataFormat).to.equal(dataFormat);
  });

  describe('data', () => {
    let dataText500Bytes: string;
    let dataTextExceedingMaxSize: string;

    before(async () => {
      dataText500Bytes = TestDataGenerator.randomString(500);
      dataTextExceedingMaxSize = TestDataGenerator.randomString(DwnConstant.maxDataSizeAllowedToBeEncoded + 1000);
    });

    describe('data.blob()', () => {
      it('returns small data payloads after dwn.records.write()', async () => {
        // Generate data that is less than the encoded data limit to ensure that the data will not have to be fetched
        // with a RecordsRead when record.data.blob() is executed.
        const dataJson = TestDataGenerator.randomJson(500);
        const inputDataBytes = new TextEncoder().encode(JSON.stringify(dataJson));

        // Write the 500B record to agent-connected DWN.
        const { record, status } = await dwnAlice.records.write({ data: dataJson });

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
        const { record, status } = await dwnAlice.records.write({ data: dataJson });

        expect(status.code).to.equal(202);

        // Read the record that was just created.
        const { record: readRecord, status: readRecordStatus } = await dwnAlice.records.read({ message: { filter: { recordId: record!.id }}});

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
        const dataJson = TestDataGenerator.randomJson(DwnConstant.maxDataSizeAllowedToBeEncoded + 1000);
        const inputDataBytes = new TextEncoder().encode(JSON.stringify(dataJson));

        // Write the large record to agent-connected DWN.
        const { record, status } = await dwnAlice.records.write({ data: dataJson });

        expect(status.code).to.equal(202);

        // Confirm that the size, in bytes, of the data read as a Blob matches the original input data.
        const readDataBlob = await record!.data.blob();
        expect(readDataBlob.size).to.equal(inputDataBytes.length);

        // Convert the Blob into an array and ensure it matches the input data byte for byte.
        const readDataBytes = new Uint8Array(await readDataBlob.arrayBuffer());
        expect(readDataBytes).to.deep.equal(inputDataBytes);
      });

      it('returns large data payloads after local dwn.records.query()', async () => {
        /** Generate data that exceeds the DWN encoded data limit to ensure that the data will have to
         * be fetched with a RecordsRead when record.data.blob() is executed. */
        const dataJson = TestDataGenerator.randomJson(DwnConstant.maxDataSizeAllowedToBeEncoded + 1000);
        const inputDataBytes = new TextEncoder().encode(JSON.stringify(dataJson));

        // Write the large record to agent-connected DWN.
        const { record, status } = await dwnAlice.records.write({ data: dataJson });
        expect(status.code).to.equal(202);

        // Query for the record that was just created.
        const { records: queryRecords, status: queryRecordStatus } = await dwnAlice.records.query({
          message: { filter: { recordId: record!.id }}
        });
        expect(queryRecordStatus.code).to.equal(200);

        // Confirm that the size, in bytes, of the data read as a Blob matches the original input data.
        const [ queryRecord ] = queryRecords;
        const queriedDataBlob = await queryRecord.data.blob();
        expect(queriedDataBlob.size).to.equal(inputDataBytes.length);

        // Convert the Blob into an array and ensure it matches the input data, byte for byte.
        const queriedDataBytes = new Uint8Array(await queriedDataBlob.arrayBuffer());
        expect(queriedDataBytes).to.deep.equal(inputDataBytes);
      });

      it('returns large data payloads after local dwn.records.read()', async () => {
        // Generate data that exceeds the DWN encoded data limit to ensure that the data will have to be fetched
        // with a RecordsRead when record.data.blob() is executed.
        const dataJson = TestDataGenerator.randomJson(DwnConstant.maxDataSizeAllowedToBeEncoded + 1000);
        const inputDataBytes = new TextEncoder().encode(JSON.stringify(dataJson));

        // Write the large record to agent-connected DWN.
        const { record, status } = await dwnAlice.records.write({ data: dataJson });

        expect(status.code).to.equal(202);

        // Read the record that was just created.
        const { record: readRecord, status: readRecordStatus } = await dwnAlice.records.read({
          message: { filter: { recordId: record!.id }}
        });

        expect(readRecordStatus.code).to.equal(200);

        // Confirm that the size, in bytes, of the data read as a Blob matches the original input data.
        const readDataBlob = await readRecord.data.blob();
        expect(readDataBlob.size).to.equal(inputDataBytes.length);

        // Convert the Blob into an array and ensure it matches the input data byte for byte.
        const readDataBytes = new Uint8Array(await readDataBlob.arrayBuffer());
        expect(readDataBytes).to.deep.equal(inputDataBytes);
      });
    });

    describe('data.json()', () => {
      it('returns small data payloads after dwn.records.write()', async () => {
        // Generate data that is less than the encoded data limit to ensure that the data will not have to be fetched
        // with a RecordsRead when record.data.json() is executed.
        const dataJson = TestDataGenerator.randomJson(500);
        const inputDataBytes = new TextEncoder().encode(JSON.stringify(dataJson));

        // Write the 500B record to agent-connected DWN.
        const { record, status } = await dwnAlice.records.write({ data: dataJson });

        expect(status.code).to.equal(202);

        // Confirm that the size, in bytes, of the data read as JSON matches the original input data.
        const readDataJson = await record!.data.json();
        const readDataBytes = new TextEncoder().encode(JSON.stringify(readDataJson));
        expect(readDataBytes.length).to.equal(inputDataBytes.length);

        // Ensure the JSON returned matches the input data, byte for byte.
        expect(readDataBytes).to.deep.equal(inputDataBytes);
      });

      it('returns small data payloads after dwnAlice.records.read()', async () => {
      // Generate data that is less than the encoded data limit to ensure that the data will not have to be fetched
      // with a RecordsRead when record.data.json() is executed.
        const dataJson = TestDataGenerator.randomJson(500);
        const inputDataBytes = new TextEncoder().encode(JSON.stringify(dataJson));

        // Write the 500B record to agent-connected DWN.
        const { record, status } = await dwnAlice.records.write({ data: dataJson });

        expect(status.code).to.equal(202);

        // Read the record that was just created.
        const { record: readRecord, status: readRecordStatus } = await dwnAlice.records.read({ message: { filter: { recordId: record!.id }}});

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
        const dataJson = TestDataGenerator.randomJson(DwnConstant.maxDataSizeAllowedToBeEncoded + 1000);
        const inputDataBytes = new TextEncoder().encode(JSON.stringify(dataJson));

        // Write the large record to agent-connected DWN.
        const { record, status } = await dwnAlice.records.write({ data: dataJson });

        expect(status.code).to.equal(202);

        // Confirm that the size, in bytes, of the data read as JSON matches the original input data.
        const readDataJson = await record!.data.json();
        const readDataBytes = new TextEncoder().encode(JSON.stringify(readDataJson));
        expect(readDataBytes.length).to.equal(inputDataBytes.length);

        // Ensure the JSON returned matches the input data, byte for byte.
        expect(readDataBytes).to.deep.equal(inputDataBytes);
      });

      it('returns large data payloads after local dwn.records.query()', async () => {
        /** Generate data that exceeds the DWN encoded data limit to ensure that the data will have to
         * be fetched with a RecordsRead when record.data.json() is executed. */
        const dataJson = TestDataGenerator.randomJson(DwnConstant.maxDataSizeAllowedToBeEncoded + 1000);
        const inputDataBytes = new TextEncoder().encode(JSON.stringify(dataJson));

        // Write the large record to agent-connected DWN.
        const { record, status } = await dwnAlice.records.write({ data: dataJson });
        expect(status.code).to.equal(202);

        // Query for the record that was just created.
        const { records: queryRecords, status: queryRecordStatus } = await dwnAlice.records.query({
          message: { filter: { recordId: record!.id }}
        });
        expect(queryRecordStatus.code).to.equal(200);

        // Confirm that the size, in bytes, of the data read as JSON matches the original input data.
        const [ queryRecord ] = queryRecords;
        const queriedDataBlob = await queryRecord!.data.json();

        // Convert the JSON to bytes and ensure it matches the input data, byte for byte.
        const queriedDataBytes = new TextEncoder().encode(JSON.stringify(queriedDataBlob));
        expect(queriedDataBytes.length).to.equal(inputDataBytes.length);
        expect(queriedDataBytes).to.deep.equal(inputDataBytes);
      });

      it('returns large data payloads after local dwn.records.read()', async () => {
        // Generate data that exceeds the DWN encoded data limit to ensure that the data will have to be fetched
        // with a RecordsRead when record.data.json() is executed.
        const dataJson = TestDataGenerator.randomJson(DwnConstant.maxDataSizeAllowedToBeEncoded + 1000);
        const inputDataBytes = new TextEncoder().encode(JSON.stringify(dataJson));

        // Write the large record to agent-connected DWN.
        const { record, status } = await dwnAlice.records.write({ data: dataJson });

        expect(status.code).to.equal(202);

        // Read the record that was just created.
        const { record: readRecord, status: readRecordStatus } = await dwnAlice.records.read({
          message: { filter: { recordId: record!.id }}
        });

        expect(readRecordStatus.code).to.equal(200);

        // Confirm that the size, in bytes, of the data read as JSON matches the original input data.
        const readDataJson = await readRecord!.data.json();
        const readDataBytes = new TextEncoder().encode(JSON.stringify(readDataJson));
        expect(readDataBytes.length).to.equal(inputDataBytes.length);

        // Ensure the JSON returned matches the input data, byte for byte.
        expect(readDataBytes).to.deep.equal(inputDataBytes);
      });
    });

    describe('data.stream()', () => {
      it('returns small data payloads after dwnAlice.records.write()', async () => {
        // Use a data payload that is less than the encoded data limit to ensure that the data will
        // not have to be fetched with a RecordsRead when record.data.text() is executed.
        const inputDataBytes = new TextEncoder().encode(dataText500Bytes);

        // Write the 500B record to agent-connected DWN.
        const { record, status } = await dwnAlice.records.write({ data: dataText500Bytes });
        expect(status.code).to.equal(202);

        // Confirm that the length of the data read as text matches the original input data.
        const dataStream = await record!.data.stream();
        const dataStreamBytes = await DataStream.toBytes(dataStream);
        expect(dataStreamBytes.length).to.equal(dataText500Bytes.length);

        // Ensure the text returned matches the input data, byte for byte.
        expect(dataStreamBytes).to.deep.equal(inputDataBytes);
      });

      it('returns small data payloads after dwn.records.read()', async () => {
        // Use a data payload that is less than the encoded data limit to ensure that the data will
        // not have to be fetched with a RecordsRead when record.data.text() is executed.
        const inputDataBytes = new TextEncoder().encode(dataText500Bytes);

        // Write the 500B record to agent-connected DWN.
        const { record, status } = await dwnAlice.records.write({ data: dataText500Bytes });
        expect(status.code).to.equal(202);

        // Read the record that was just created.
        const { record: readRecord, status: readRecordStatus } = await dwnAlice.records.read({ message: { filter: { recordId: record!.id }}});
        expect(readRecordStatus.code).to.equal(200);

        // Confirm that the length of the data read as text matches the original input data.
        const dataStream = await readRecord!.data.stream();
        const dataStreamBytes = await DataStream.toBytes(dataStream);
        expect(dataStreamBytes.length).to.equal(dataText500Bytes.length);

        // Ensure the text returned matches the input data, byte for byte.
        expect(dataStreamBytes).to.deep.equal(inputDataBytes);
      });

      it('returns large data payloads after dwn.records.write()', async () => {
        // Use a data payload that exceeds the DWN encoded data limit to ensure that the data will
        // have to be fetched with a RecordsRead when record.data.text() is executed.
        const inputDataBytes = new TextEncoder().encode(dataTextExceedingMaxSize);

        // Write the large record to agent-connected DWN.
        const { record, status } = await dwnAlice.records.write({ data: dataTextExceedingMaxSize });
        expect(status.code).to.equal(202);

        // Confirm that the length of the data read as text matches the original input data.
        const dataStream = await record!.data.stream();
        const dataStreamBytes = await DataStream.toBytes(dataStream);
        expect(dataStreamBytes.length).to.equal(dataTextExceedingMaxSize.length);

        // Ensure the text returned matches the input data, byte for byte.
        expect(dataStreamBytes).to.deep.equal(inputDataBytes);
      });

      it('returns large data payloads after local dwn.records.query()', async () => {
        // Use a data payload that exceeds the DWN encoded data limit to ensure that the data will
        // have to be fetched with a RecordsRead when record.data.text() is executed.
        const inputDataBytes = new TextEncoder().encode(dataTextExceedingMaxSize);

        // Write the large record to agent-connected DWN.
        const { record, status } = await dwnAlice.records.write({ data: dataTextExceedingMaxSize });
        expect(status.code).to.equal(202);

        // Query for the record that was just created.
        const { records: queryRecords, status: queryRecordStatus } = await dwnAlice.records.query({
          message: { filter: { recordId: record!.id }}
        });
        expect(queryRecordStatus.code).to.equal(200);

        // Confirm that the length of the data read as text matches the original input data.
        const [ queryRecord ] = queryRecords;
        const dataStream = await queryRecord!.data.stream();
        const dataStreamBytes = await DataStream.toBytes(dataStream);
        expect(dataStreamBytes.length).to.equal(dataTextExceedingMaxSize.length);

        // Ensure the text returned matches the input data, byte for byte.
        expect(dataStreamBytes).to.deep.equal(inputDataBytes);
      });

      it('returns large data payloads after local dwn.records.read()', async () => {
        // Use a data payload that exceeds the DWN encoded data limit to ensure that the data will
        // have to be fetched with a RecordsRead when record.data.text() is executed.
        const inputDataBytes = new TextEncoder().encode(dataTextExceedingMaxSize);

        // Write the large record to agent-connected DWN.
        const { record, status } = await dwnAlice.records.write({ data: dataTextExceedingMaxSize });

        expect(status.code).to.equal(202);

        // Read the record that was just created.
        const { record: readRecord, status: readRecordStatus } = await dwnAlice.records.read({
          message: { filter: { recordId: record!.id }}
        });
        expect(readRecordStatus.code).to.equal(200);

        // Confirm that the length of the data read as text matches the original input data.
        const dataStream = await readRecord!.data.stream();
        const dataStreamBytes = await DataStream.toBytes(dataStream);
        expect(dataStreamBytes.length).to.equal(dataTextExceedingMaxSize.length);

        // Ensure the text returned matches the input data, byte for byte.
        expect(dataStreamBytes).to.deep.equal(inputDataBytes);
      });
    });

    describe('data.text()', () => {
      it('returns small data payloads after dwnAlice.records.write()', async () => {
        // Generate data that is less than the encoded data limit to ensure that the data will not have to be fetched
        // with a RecordsRead when record.data.text() is executed.
        const dataText = TestDataGenerator.randomString(500);

        // Write the 500B record to agent-connected DWN.
        const { record, status } = await dwnAlice.records.write({ data: dataText });

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
        const { record, status } = await dwnAlice.records.write({ data: dataText });

        expect(status.code).to.equal(202);

        // Read the record that was just created.
        const { record: readRecord, status: readRecordStatus } = await dwnAlice.records.read({ message: { filter: { recordId: record!.id }}});

        expect(readRecordStatus.code).to.equal(200);

        // Confirm that the length of the data read as text matches the original input data.
        const readDataText = await readRecord!.data.text();
        expect(readDataText.length).to.equal(dataText.length);

        // Ensure the text returned matches the input data, char for char.
        expect(readDataText).to.deep.equal(dataText);
      });

      it('returns large data payloads after dwnAlice.records.write()', async () => {
        // Generate data that exceeds the DWN encoded data limit to ensure that the data will have to be fetched
        // with a RecordsRead when record.data.text() is executed.
        const dataText = TestDataGenerator.randomString(DwnConstant.maxDataSizeAllowedToBeEncoded + 1000);

        // Write the large record to agent-connected DWN.
        const { record, status } = await dwnAlice.records.write({ data: dataText });

        expect(status.code).to.equal(202);

        // Confirm that the length of the data read as text matches the original input data.
        const readDataText = await record!.data.text();
        expect(readDataText.length).to.equal(dataText.length);

        // Ensure the text returned matches the input data, char for char.
        expect(readDataText).to.deep.equal(dataText);
      });

      it('returns large data payloads after local dwn.records.query()', async () => {
        /** Generate data that exceeds the DWN encoded data limit to ensure that the data will have to
         * be fetched with a RecordsRead when record.data.blob() is executed. */
        const dataText = TestDataGenerator.randomString(DwnConstant.maxDataSizeAllowedToBeEncoded + 1000);

        // Write the large record to agent-connected DWN.
        const { record, status } = await dwnAlice.records.write({ data: dataText });
        expect(status.code).to.equal(202);

        // Query for the record that was just created.
        const { records: queryRecords, status: queryRecordStatus } = await dwnAlice.records.query({
          message: { filter: { recordId: record!.id }}
        });
        expect(queryRecordStatus.code).to.equal(200);

        // Confirm that the length of the data read as text matches the original input data.
        const [ queryRecord ] = queryRecords;
        const queriedDataText = await queryRecord!.data.text();
        expect(queriedDataText.length).to.equal(dataText.length);

        // Ensure the text returned matches the input data, char for char.
        expect(queriedDataText).to.deep.equal(dataText);
      });

      it('returns large data payloads after local dwn.records.read()', async () => {
        // Generate data that exceeds the DWN encoded data limit to ensure that the data will have to be fetched
        // with a RecordsRead when record.data.text() is executed.
        const dataText = TestDataGenerator.randomString(DwnConstant.maxDataSizeAllowedToBeEncoded + 1000);

        // Write the large record to agent-connected DWN.
        const { record, status } = await dwnAlice.records.write({ data: dataText });

        expect(status.code).to.equal(202);

        // Read the record that was just created.
        const { record: readRecord, status: readRecordStatus } = await dwnAlice.records.read({
          message: { filter: { recordId: record!.id }}
        });

        expect(readRecordStatus.code).to.equal(200);

        // Confirm that the length of the data read as text matches the original input data.
        const readDataText = await readRecord!.data.text();
        expect(readDataText.length).to.equal(dataText.length);

        // Ensure the text returned matches the input data, char for char.
        expect(readDataText).to.deep.equal(dataText);
      });
    });

    it('returns large data payloads after remote dwn.records.query()', async () => {
      /** Generate data that exceeds the DWN encoded data limit to ensure that the data will have to
       * be fetched with a RecordsRead when record.data.* is executed. */
      const dataJson = TestDataGenerator.randomJson(DwnConstant.maxDataSizeAllowedToBeEncoded + 1000);
      const inputDataBytes = new TextEncoder().encode(JSON.stringify(dataJson));

      // Create a large record but do NOT store it on the local, agent-connected DWN.
      const { record, status } = await dwnAlice.records.write({ data: dataJson, store: false });
      expect(status.code).to.equal(202);

      // Write the large record to a remote DWN.
      const { status: sendStatus } = await record!.send(aliceDid.did);
      expect(sendStatus.code).to.equal(202);

      // Query for the record that was just created on the remote DWN.
      const { records: queryRecords, status: queryRecordStatus } = await dwnAlice.records.query({
        from    : aliceDid.did,
        message : { filter: { recordId: record!.id }}
      });
      expect(queryRecordStatus.code).to.equal(200);

      // Confirm that the size, in bytes, of the data read as a Blob matches the original input data.
      const [ queryRecord ] = queryRecords;
      const queriedDataBlob = await queryRecord.data.blob();
      expect(queriedDataBlob.size).to.equal(inputDataBytes.length);
    });

    it('returns large data payloads after remote dwn.records.read()', async () => {
      /** Generate data that exceeds the DWN encoded data limit to ensure that the data will have to
       * be fetched with a RecordsRead when record.data.* is executed. */
      const dataJson = TestDataGenerator.randomJson(DwnConstant.maxDataSizeAllowedToBeEncoded + 1000);
      const inputDataBytes = new TextEncoder().encode(JSON.stringify(dataJson));

      // Create a large record but do NOT store it on the local, agent-connected DWN.
      const { record, status } = await dwnAlice.records.write({ data: dataJson, store: false });
      expect(status.code).to.equal(202);

      // Write the large record to a remote DWN.
      const { status: sendStatus } = await record!.send(aliceDid.did);
      expect(sendStatus.code).to.equal(202);

      // Read the record that was just created on the remote DWN.
      const { record: readRecord, status: readRecordStatus } = await dwnAlice.records.read({
        from    : aliceDid.did,
        message : { filter: { recordId: record!.id }}
      });
      expect(readRecordStatus.code).to.equal(200);

      // Confirm that the size, in bytes, of the data read as a Blob matches the original input data.
      const readDataBlob = await readRecord.data.blob();
      expect(readDataBlob.size).to.equal(inputDataBytes.length);

      // Convert the Blob into an array and ensure it matches the input data byte for byte.
      const readDataBytes = new Uint8Array(await readDataBlob.arrayBuffer());
      expect(readDataBytes).to.deep.equal(inputDataBytes);
    });

    it('returns small data payloads repeatedly after dwn.records.write()', async () => {
      /** Generate data that exceeds the DWN encoded data limit to ensure that the data will have to
       * be fetched with a RecordsRead when record.data.* is executed. */
      const dataJson = TestDataGenerator.randomJson(100_000);
      const inputDataBytes = new TextEncoder().encode(JSON.stringify(dataJson));

      // Write the 500B record to agent-connected DWN.
      const { record, status } = await dwnAlice.records.write({ data: dataJson });
      expect(status.code).to.equal(202);

      // Read the data payload as bytes.
      let readDataBytes = await record!.data.bytes();
      // Ensure the JSON returned matches the input data, byte for byte.
      expect(inputDataBytes).to.deep.equal(readDataBytes);

      // Read the data payload a second time.
      readDataBytes = await record!.data.bytes();
      // Ensure the JSON returned matches the input data, byte for byte.
      expect(inputDataBytes).to.deep.equal(readDataBytes);

      // Read the data payload a third time.
      readDataBytes = await record!.data.bytes();
      // Ensure the JSON returned matches the input data, byte for byte.
      expect(inputDataBytes).to.deep.equal(readDataBytes);
    });

    it('returns large data payloads repeatedly after dwn.records.write()', async () => {
      /** Generate data that exceeds the DWN encoded data limit to ensure that the data will have to
       * be fetched with a RecordsRead when record.data.* is executed. */
      const dataJson = TestDataGenerator.randomJson(DwnConstant.maxDataSizeAllowedToBeEncoded + 25000);
      const inputDataBytes = new TextEncoder().encode(JSON.stringify(dataJson));

      // Write the large record to agent-connected DWN.
      const { record, status } = await dwnAlice.records.write({ data: dataJson });
      expect(status.code).to.equal(202);

      // Confirm that the size, in bytes, of the data read as JSON matches the original input data.
      let readDataJson = await record!.data.json();
      let readDataBytes = new TextEncoder().encode(JSON.stringify(readDataJson));
      expect(readDataBytes.length).to.equal(inputDataBytes.length);

      // Ensure the JSON returned matches the input data, byte for byte.
      expect(readDataBytes).to.deep.equal(inputDataBytes);

      // Attempt to read the record again.
      readDataJson = await record!.data.json();
      readDataBytes = new TextEncoder().encode(JSON.stringify(readDataJson));
      expect(readDataBytes.length).to.equal(inputDataBytes.length);

      // Ensure the JSON returned matches the input data, byte for byte.
      expect(readDataBytes).to.deep.equal(inputDataBytes);

      // Attempt to read the record again.
      readDataJson = await record!.data.json();
      readDataBytes = new TextEncoder().encode(JSON.stringify(readDataJson));
      expect(readDataBytes.length).to.equal(inputDataBytes.length);

      // Ensure the JSON returned matches the input data, byte for byte.
      expect(readDataBytes).to.deep.equal(inputDataBytes);
    });

    it('allows small data payloads written locally to be consumed as a stream repeatedly', async () => {
      /** Generate data that is less than the encoded data limit to ensure that the data will not
       * have to be fetched with a RecordsRead when record.data.blob() is executed. */
      const dataJson = TestDataGenerator.randomJson(1000);
      const inputDataBytes = new TextEncoder().encode(JSON.stringify(dataJson));

      // Write the large record to agent-connected DWN.
      const { record, status } = await dwnAlice.records.write({ data: dataJson });
      expect(status.code).to.equal(202);

      // Consume the data stream as bytes.
      let readDataStream = await record!.data.stream();
      let readDataBytes = await NodeStream.consumeToBytes({ readable: readDataStream });
      expect(readDataBytes.length).to.equal(inputDataBytes.length);

      // Consume the data stream as bytes a second time.
      readDataStream = await record!.data.stream();
      readDataBytes = await NodeStream.consumeToBytes({ readable: readDataStream });
      expect(readDataBytes.length).to.equal(inputDataBytes.length);
    });

    it('allows large data payloads written locally to be consumed as a stream repeatedly', async () => {
      /** Generate data that exceeds the DWN encoded data limit to ensure that the data will have to
       * be fetched with a RecordsRead when record.data.* is executed. */
      const dataJson = TestDataGenerator.randomJson(DwnConstant.maxDataSizeAllowedToBeEncoded + 1000);
      const inputDataBytes = new TextEncoder().encode(JSON.stringify(dataJson));

      // Write the large record to agent-connected DWN.
      const { record, status } = await dwnAlice.records.write({ data: dataJson });
      expect(status.code).to.equal(202);

      // Consume the data stream as bytes.
      let readDataStream = await record!.data.stream();
      let readDataBytes = await NodeStream.consumeToBytes({ readable: readDataStream });
      expect(readDataBytes.length).to.equal(inputDataBytes.length);

      // Consume the data stream as bytes a second time.
      readDataStream = await record!.data.stream();
      readDataBytes = await NodeStream.consumeToBytes({ readable: readDataStream });
      expect(readDataBytes.length).to.equal(inputDataBytes.length);
    });

    it('allows small data payloads read from a remote to be consumed as a stream repeatedly', async () => {
      /** Generate data that is less than the encoded data limit to ensure that the data will not
       * have to be fetched with a RecordsRead when record.data.blob() is executed. */
      const dataJson = TestDataGenerator.randomJson(1000);
      const inputDataBytes = new TextEncoder().encode(JSON.stringify(dataJson));

      // Create a large record but do NOT store it on the local, agent-connected DWN.
      const { record, status } = await dwnAlice.records.write({ data: dataJson, store: false });
      expect(status.code).to.equal(202);

      // Write the large record to a remote DWN.
      const { status: sendStatus } = await record!.send(aliceDid.did);
      expect(sendStatus.code).to.equal(202);

      // Read the record that was just created on the remote DWN.
      const { record: readRecord, status: readRecordStatus } = await dwnAlice.records.read({
        from    : aliceDid.did,
        message : { filter: { recordId: record!.id }}
      });
      expect(readRecordStatus.code).to.equal(200);

      // Confirm that the size, in bytes, of the data read as a Blob matches the original input data.
      const readDataBlob = await readRecord.data.blob();
      expect(readDataBlob.size).to.equal(inputDataBytes.length);

      // Confirm that the size, in bytes, of the data read as JSON matches the original input data.
      let readDataStream = await readRecord!.data.stream();
      let readDataBytes = await DataStream.toBytes(readDataStream);
      expect(readDataBytes.length).to.equal(inputDataBytes.length);

      // Consume the data stream as bytes a third time.
      readDataStream = await readRecord!.data.stream();
      readDataBytes = await DataStream.toBytes(readDataStream);
      expect(readDataBytes.length).to.equal(inputDataBytes.length);
    });

    it('allows large data payloads read from a remote to be consumed as a stream repeatedly', async () => {
      /** Generate data that exceeds the DWN encoded data limit to ensure that the data will have to
       * be fetched with a RecordsRead when record.data.* is executed. */
      const dataJson = TestDataGenerator.randomJson(DwnConstant.maxDataSizeAllowedToBeEncoded + 1000);
      const inputDataBytes = new TextEncoder().encode(JSON.stringify(dataJson));

      // Create a large record but do NOT store it on the local, agent-connected DWN.
      const { record, status } = await dwnAlice.records.write({ data: dataJson, store: false });
      expect(status.code).to.equal(202);

      // Write the large record to a remote DWN.
      const { status: sendStatus } = await record!.send(aliceDid.did);
      expect(sendStatus.code).to.equal(202);

      // Read the record that was just created on the remote DWN.
      const { record: readRecord, status: readRecordStatus } = await dwnAlice.records.read({
        from    : aliceDid.did,
        message : { filter: { recordId: record!.id }}
      });
      expect(readRecordStatus.code).to.equal(200);

      // Consume the data stream as bytes.
      let readDataStream = await readRecord!.data.stream();
      let readDataBytes = await NodeStream.consumeToBytes({ readable: readDataStream });
      expect(readDataBytes.length).to.equal(inputDataBytes.length);

      // Consume the data stream as bytes a second time.
      readDataStream = await record!.data.stream();
      readDataBytes = await NodeStream.consumeToBytes({ readable: readDataStream });
      expect(readDataBytes.length).to.equal(inputDataBytes.length);

      // Consume the data stream as bytes a third time.
      readDataStream = await record!.data.stream();
      readDataBytes = await NodeStream.consumeToBytes({ readable: readDataStream });
      expect(readDataBytes.length).to.equal(inputDataBytes.length);
    });

    it('allows small data payloads queried from a remote to be consumed as a stream repeatedly', async () => {
      /** Generate data that is less than the encoded data limit to ensure that the data will not
       * have to be fetched with a RecordsRead when record.data.blob() is executed. */
      const dataJson = TestDataGenerator.randomJson(1000);
      const inputDataBytes = new TextEncoder().encode(JSON.stringify(dataJson));

      // Create a large record but do NOT store it on the local, agent-connected DWN.
      const { record, status } = await dwnAlice.records.write({ data: dataJson, store: false });
      expect(status.code).to.equal(202);

      // Write the large record to a remote DWN.
      const { status: sendStatus } = await record!.send(aliceDid.did);
      expect(sendStatus.code).to.equal(202);

      // Read the record that was just created on the remote DWN.
      const { records: queriedRecords, status: queriedRecordStatus } = await dwnAlice.records.query({
        from    : aliceDid.did,
        message : { filter: { recordId: record!.id }}
      });
      expect(queriedRecordStatus.code).to.equal(200);

      const [ queriedRecord ] = queriedRecords;

      // Consume the data stream as bytes.
      let readDataStream = await queriedRecord!.data.stream();
      let readDataBytes = await NodeStream.consumeToBytes({ readable: readDataStream });
      expect(readDataBytes.length).to.equal(inputDataBytes.length);

      // Consume the data stream as bytes a second time.
      readDataStream = await queriedRecord!.data.stream();
      readDataBytes = await NodeStream.consumeToBytes({ readable: readDataStream });
      expect(readDataBytes.length).to.equal(inputDataBytes.length);

      // Consume the data stream as bytes a third time.
      readDataStream = await queriedRecord!.data.stream();
      readDataBytes = await NodeStream.consumeToBytes({ readable: readDataStream });
      expect(readDataBytes.length).to.equal(inputDataBytes.length);
    });

    it('allows large data payloads queried from a remote to be consumed as a stream repeatedly', async () => {
      /** Generate data that exceeds the DWN encoded data limit to ensure that the data will have to
       * be fetched with a RecordsRead when record.data.* is executed. */
      const dataJson = TestDataGenerator.randomJson(DwnConstant.maxDataSizeAllowedToBeEncoded + 1000);
      const inputDataBytes = new TextEncoder().encode(JSON.stringify(dataJson));

      // Create a large record but do NOT store it on the local, agent-connected DWN.
      const { record, status } = await dwnAlice.records.write({ data: dataJson, store: false });
      expect(status.code).to.equal(202);

      // Write the large record to a remote DWN.
      const { status: sendStatus } = await record!.send(aliceDid.did);
      expect(sendStatus.code).to.equal(202);

      // Query for the record that was just created on the remote DWN.
      const { records: queriedRecords, status: queriedRecordStatus } = await dwnAlice.records.query({
        from    : aliceDid.did,
        message : { filter: { recordId: record!.id }}
      });
      expect(queriedRecordStatus.code).to.equal(200);

      const [ queriedRecord ] = queriedRecords;

      // Consume the data stream as bytes.
      let readDataStream = await queriedRecord!.data.stream();
      let readDataBytes = await NodeStream.consumeToBytes({ readable: readDataStream });
      expect(readDataBytes.length).to.equal(inputDataBytes.length);

      // Consume the data stream as bytes a second time.
      readDataStream = await queriedRecord!.data.stream();
      readDataBytes = await NodeStream.consumeToBytes({ readable: readDataStream });
      expect(readDataBytes.length).to.equal(inputDataBytes.length);

      // Consume the data stream as bytes a third time.
      readDataStream = await queriedRecord!.data.stream();
      readDataBytes = await NodeStream.consumeToBytes({ readable: readDataStream });
      expect(readDataBytes.length).to.equal(inputDataBytes.length);
    });

    describe('with two Agents', () => {
      let testAgentBob: TestManagedAgent;

      before(async () => {
        // Create a second `TestManagedAgent` that only Bob will use.
        testAgentBob = await TestManagedAgent.create({
          agentClass       : TestUserAgent,
          agentStores      : 'memory',
          testDataLocation : '__TESTDATA__/AGENT_BOB'
        });
      });

      beforeEach(async () => {
        await testAgentBob.clearStorage();

        // Create an Agent DID.
        await testAgent.createAgentDid();

        // Create a new "bob" Identity to author the DWN messages.
        ({ did: bobDid } = await testAgentBob.createIdentity({ testDwnUrls }));
        await testAgentBob.agent.identityManager.import({
          did      : bobDid,
          identity : { name: 'Bob', did: bobDid.did },
          kms      : 'local'
        });

        // Instantiate a new `DwnApi` using Bob's test agent.
        dwnBob = new DwnApi({ agent: testAgentBob.agent, connectedDid: bobDid.did });
      });

      after(async () => {
        await testAgentBob.clearStorage();
        await testAgentBob.closeStorage();
      });

      it('returns large data payloads of records signed by another entity after remote dwn.records.query()', async () => {
        /**
         * WHAT IS BEING TESTED?
         *
         * We are testing whether a large (> `DwnConstant.maxDataSizeAllowedToBeEncoded`) record
         * authored/signed by one party (Alice) can be written to another party's DWN (Bob), and that
         * recipient (Bob) is able to access the data payload. This test was added to reveal a bug
         * that only surfaces when accessing the data (`record.data.*`) of a record signed by a
         * different entity  a `Record` instance's data, which requires fetching the data from a
         * remote DWN. Since the large (> `DwnConstant.maxDataSizeAllowedToBeEncoded`) data was not
         * returned with the query as `encodedData`, the `Record` instance's data is not available and
         * must be fetched from the remote DWN using a `RecordsRead` message.
         *
         * What made this bug particularly difficult to track down is that the bug only surfaces when
         * keys used to sign the record are different than the keys used to fetch the record AND both
         * sets of keys are unavailable to the test Agent used by the entity that is attempting to
         * fetch the record. In all of the other tests, the same test agent is used to store the keys
         * for all entities (e.g., "Alice", "Bob", etc.) so the bug never surfaced.
         *
         * In this test, Alice is the author of the record and Bob is the recipient. Alice and Bob
         * each have their own Agents, DWNs, DIDs, and keys. Alice's DWN is configured to use
         * Alice's DID/keys, and Bob's DWN is configured to use Bob's DID/keys. When Alice writes a
         * record to Bob's DWN, the record is signed by Alice's keys. When Bob fetches the record from
         * his DWN, this test validates that the `RecordsRead` is signed by Bob's keys.
         *
         * SETUP STEPS:
         *   S1. Install the email protocol to both Alice's and Bob's DWNs.
         */
        let { protocol: aliceProtocol, status: aliceStatus } = await dwnAlice.protocols.configure({
          message: { definition: emailProtocolDefinition }
        });
        expect(aliceStatus.code).to.equal(202);
        const { status: alicePushStatus } = await aliceProtocol!.send(aliceDid.did);
        expect(alicePushStatus.code).to.equal(202);
        const { protocol: bobProtocol, status: bobStatus } = await dwnBob.protocols.configure({
          message: {
            definition: emailProtocolDefinition
          }
        });
        expect(bobStatus.code).to.equal(202);
        const { status: bobPushStatus } = await bobProtocol!.send(bobDid.did);
        expect(bobPushStatus.code).to.equal(202);

        /**
         * TEST STEPS:
         *
         *   1. Alice creates a record but does NOT store it her local, agent-connected DWN.
         */
        const { record, status } = await dwnAlice.records.write({
          data    : dataTextExceedingMaxSize,
          store   : false,
          message : {
            protocol     : emailProtocolDefinition.protocol,
            protocolPath : 'email',
            schema       : emailProtocolDefinition.types.email.schema
          }
        });
        expect(status.code).to.equal(202);
        /**
         *   2. Alice writes the record to Bob's remote DWN.
         */
        const { status: sendStatus } = await record!.send(bobDid.did);
        expect(sendStatus.code).to.equal(202);
        /**
         *   3. Bob queries his remote DWN for the record that Alice just wrote.
         */
        const { records: queryRecordsFrom, status: queryRecordStatusFrom } = await dwnBob.records.query({
          from    : bobDid.did,
          message : { filter: { recordId: record!.id }}
        });
        expect(queryRecordStatusFrom.code).to.equal(200);
        /**
         *   4. Validate that Bob is able to access the data payload.
         */
        const recordData = await queryRecordsFrom[0].data.blob();
        expect(recordData.size).to.equal(dataTextExceedingMaxSize.length);
      });

      it('returns large data payloads of records signed by another entity after remote dwn.records.query()', async () => {
        /**
         * WHAT IS BEING TESTED?
         *
         * We are testing whether a large (> `DwnConstant.maxDataSizeAllowedToBeEncoded`) record
         * authored/signed by one party (Alice) can be written to another party's DWN (Bob), and that
         * recipient (Bob) is able to access the data payload. This test was added to reveal a bug
         * that only surfaces when accessing the data (`record.data.*`) of a record signed by a
         * different entity  a `Record` instance's data, which requires fetching the data from a
         * remote DWN. Since the large (> `DwnConstant.maxDataSizeAllowedToBeEncoded`) data was not
         * returned with the query as `encodedData`, the `Record` instance's data is not available and
         * must be fetched from the remote DWN using a `RecordsRead` message.
         *
         * What made this bug particularly difficult to track down is that the bug only surfaces when
         * keys used to sign the record are different than the keys used to fetch the record AND both
         * sets of keys are unavailable to the test Agent used by the entity that is attempting to
         * fetch the record. In all of the other tests, the same test agent is used to store the keys
         * for all entities (e.g., "Alice", "Bob", etc.) so the bug never surfaced.
         *
         * In this test, Alice is the author of the record and Bob is the recipient. Alice and Bob
         * each have their own Agents, DWNs, DIDs, and keys. Alice's DWN is configured to use
         * Alice's DID/keys, and Bob's DWN is configured to use Bob's DID/keys. When Alice writes a
         * record to Bob's DWN, the record is signed by Alice's keys. When Bob fetches the record from
         * his DWN, this test validates that the `RecordsRead` is signed by Bob's keys.
         *
         * SETUP STEPS:
         *   S1. Install the email protocol to both Alice's and Bob's DWNs.
         */
        let { protocol: aliceProtocol, status: aliceStatus } = await dwnAlice.protocols.configure({
          message: { definition: emailProtocolDefinition }
        });
        expect(aliceStatus.code).to.equal(202);
        const { status: alicePushStatus } = await aliceProtocol!.send(aliceDid.did);
        expect(alicePushStatus.code).to.equal(202);
        const { protocol: bobProtocol, status: bobStatus } = await dwnBob.protocols.configure({
          message: {
            definition: emailProtocolDefinition
          }
        });
        expect(bobStatus.code).to.equal(202);
        const { status: bobPushStatus } = await bobProtocol!.send(bobDid.did);
        expect(bobPushStatus.code).to.equal(202);

        /**
         * TEST STEPS:
         *
         *   1. Alice creates a record but does NOT store it her local, agent-connected DWN.
         */
        const { record, status } = await dwnAlice.records.write({
          data    : dataTextExceedingMaxSize,
          store   : false,
          message : {
            protocol     : emailProtocolDefinition.protocol,
            protocolPath : 'email',
            schema       : emailProtocolDefinition.types.email.schema
          }
        });
        expect(status.code).to.equal(202);
        /**
         *   2. Alice writes the record to Bob's remote DWN.
         */
        const { status: sendStatus } = await record!.send(bobDid.did);
        expect(sendStatus.code).to.equal(202);
        /**
         *   3. Bob queries his remote DWN for the record that Alice just wrote.
         */
        const { records: queryRecordsFrom, status: queryRecordStatusFrom } = await dwnBob.records.query({
          from    : bobDid.did,
          message : { filter: { recordId: record!.id }}
        });
        expect(queryRecordStatusFrom.code).to.equal(200);
        /**
         *   4. Validate that Bob is able to write the record to Alice's remote DWN.
         */
        const { status: sendStatusToAlice } = await queryRecordsFrom[0]!.send(aliceDid.did);
        expect(sendStatusToAlice.code).to.equal(202);
        /**
         *  5. Alice queries her remote DWN for the record that Bob just wrote.
         */
        const { records: queryRecordsTo, status: queryRecordStatusTo } = await dwnAlice.records.query({
          from    : aliceDid.did,
          message : { filter: { recordId: record!.id }}
        });
        expect(queryRecordStatusTo.code).to.equal(200);
        /**
         *   6. Validate that Alice is able to access the data payload.
         */
        const recordData = await queryRecordsTo[0].data.text();
        expect(recordData).to.deep.equal(dataTextExceedingMaxSize);
      });
    });
  });

  describe('send()', () => {
    it('writes small records to remote DWNs for your own DID', async () => {
      const dataString = 'Hello, world!';

      // Alice writes a message to her agent connected DWN.
      const { status: aliceEmailStatus, record: aliceEmailRecord } = await dwnAlice.records.write({
        data    : dataString,
        message : {
          schema: 'email',
        }
      });

      expect(aliceEmailStatus.code).to.equal(202);
      expect(await aliceEmailRecord?.data.text()).to.equal(dataString);

      // Query Alice's agent connected DWN for `email` schema records.
      const aliceAgentQueryResult = await dwnAlice.records.query({
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
      const { status } = await aliceEmailRecord!.send(aliceDid.did);
      expect(status.code).to.equal(202);

      // Query Alices's remote DWN for `email` schema records.
      const aliceRemoteQueryResult = await dwnAlice.records.query({
        from    : aliceDid.did,
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
    });

    it('writes large records to remote DWNs that were initially queried from a local DWN', async () => {
      /** Generate data that exceeds the DWN encoded data limit to ensure that the data will have to
       * be fetched with a RecordsRead when record.send() is executed. */
      const dataText = TestDataGenerator.randomString(DwnConstant.maxDataSizeAllowedToBeEncoded + 1000);

      // Alice writes a message to her agent connected DWN.
      const { status: aliceEmailStatus } = await dwnAlice.records.write({
        data    : dataText,
        message : {
          schema: 'email',
        }
      });
      expect(aliceEmailStatus.code).to.equal(202);

      // Query Alice's local, agent connected DWN for `email` schema records.
      const aliceAgentQueryResult = await dwnAlice.records.query({
        message: {
          filter: {
            schema: 'email'
          }
        }
      });

      expect(aliceAgentQueryResult.status.code).to.equal(200);
      expect(aliceAgentQueryResult!.records).to.have.length(1);
      const [ aliceAgentEmailRecord ] = aliceAgentQueryResult!.records!;

      // Attempt to write the record to Alice's remote DWN.
      const { status } = await aliceAgentEmailRecord!.send(aliceDid.did);
      expect(status.code).to.equal(202);
    });

    it('writes large records to remote DWNs that were initially read from a local DWN', async () => {
      /** Generate data that exceeds the DWN encoded data limit to ensure that the data will have to
       * be fetched with a RecordsRead when record.send() is executed. */
      const dataText = TestDataGenerator.randomString(DwnConstant.maxDataSizeAllowedToBeEncoded + 1000);

      // Alice writes a message to her agent connected DWN.
      const { status: aliceEmailStatus, record: aliceEmailRecord } = await dwnAlice.records.write({
        data    : dataText,
        message : {
          schema: 'email',
        }
      });
      expect(aliceEmailStatus.code).to.equal(202);

      // Read from Alice's local, agent connected DWN for the record that was just created.
      const aliceAgentReadResult = await dwnAlice.records.read({
        message: {
          filter: {
            recordId: aliceEmailRecord.id
          }
        }
      });

      expect(aliceAgentReadResult.status.code).to.equal(200);
      expect(aliceAgentReadResult.record).to.exist;

      // Attempt to write the record to Alice's remote DWN.
      const { status } = await aliceAgentReadResult.record.send(aliceDid.did);
      expect(status.code).to.equal(202);
    });

    it('writes updated records to a remote DWN', async () => {
      /**
       * NOTE: The issue that this test was added to cover was intermittently failing the first
       * time the updated record is sent to the remote DWN. However, it always failed on the second
       * attempt to send the updated record to the remote DWN. As a result, this test was written
       * to update the record twice and send it to the remote DWN after each update to ensure that
       * the issue is covered.
       */

      // Alice writes a message to her agent connected DWN.
      const { status, record } = await dwnAlice.records.write({
        data    : 'Hello, world!',
        message : {
          schema     : 'foo/bar',
          dataFormat : 'text/plain'
        }
      });
      expect(status.code).to.equal(202);

      // Write the record to Alice's remote DWN.
      let sendResult = await record.send(aliceDid.did);
      expect(sendResult.status.code).to.equal(202);

      // Update the record by mutating the data property.
      let updateResult = await record!.update({ data: 'hi' });
      expect(updateResult.status.code).to.equal(202);

      // Write the updated record to Alice's remote DWN a second time.
      sendResult = await record!.send(aliceDid.did);
      expect(sendResult.status.code).to.equal(202);

      // Update the record again.
      updateResult = await record!.update({ data: 'bye' });
      expect(updateResult.status.code).to.equal(202);

      // Write the updated record to Alice's remote DWN a third time.
      sendResult = await record!.send(aliceDid.did);
      expect(sendResult.status.code).to.equal(202);
    });

    it('automatically sends the initial write and update of a record to a remote DWN', async () => {
      // Alice writes a message to her agent connected DWN.
      const { status, record } = await dwnAlice.records.write({
        data    : 'Hello, world!',
        message : {
          schema     : 'foo/bar',
          dataFormat : 'text/plain'
        }
      });
      expect(status.code).to.equal(202);

      // Update the record by mutating the data property.
      const updateResult = await record!.update({ data: 'hi' });
      expect(updateResult.status.code).to.equal(202);

      // Write the updated record to Alice's remote DWN a second time.
      const sendResult = await record!.send(aliceDid.did);
      expect(sendResult.status.code).to.equal(202);
    });

    it('writes large records to remote DWNs that were initially queried from a remote DWN', async () => {
      /** Generate data that exceeds the DWN encoded data limit to ensure that the data will have to
       * be fetched with a RecordsRead when record.data.blob() is executed. */
      const dataText = TestDataGenerator.randomString(DwnConstant.maxDataSizeAllowedToBeEncoded + 1000);

      // Install the email protocol for Alice's local DWN.
      let { protocol: aliceProtocol, status: aliceStatus } = await dwnAlice.protocols.configure({
        message: { definition: emailProtocolDefinition }
      });
      expect(aliceStatus.code).to.equal(202);
      expect(aliceProtocol).to.exist;

      // Install the email protocol for Alice's remote DWN.
      const { status: alicePushStatus } = await aliceProtocol!.send(aliceDid.did);
      expect(alicePushStatus.code).to.equal(202);

      // Install the email protocol for Bob's local DWN.
      const { protocol: bobProtocol, status: bobStatus } = await dwnBob.protocols.configure({
        message: {
          definition: emailProtocolDefinition
        }
      });

      expect(bobStatus.code).to.equal(202);
      expect(bobProtocol).to.exist;

      // Install the email protocol for Bob's remote DWN.
      const { status: bobPushStatus } = await bobProtocol!.send(bobDid.did);
      expect(bobPushStatus.code).to.equal(202);

      // Alice creates a new large record but does not store it in her local DWN.
      const { status: aliceEmailStatus, record: aliceEmailRecord } = await dwnAlice.records.write({
        store   : false,
        data    : dataText,
        message : {
          protocol     : emailProtocolDefinition.protocol,
          protocolPath : 'email',
          schema       : 'http://email-protocol.xyz/schema/email',
        }
      });
      expect(aliceEmailStatus.code).to.equal(202);

      // Alice writes the large record to her own remote DWN.
      const { status: sendStatus } = await aliceEmailRecord!.send(aliceDid.did);
      expect(sendStatus.code).to.equal(202);

      // Alice queries for the record that was just created on her remote DWN.
      const { records: queryRecords, status: queryRecordStatus } = await dwnAlice.records.query({
        from    : aliceDid.did,
        message : { filter: { recordId: aliceEmailRecord!.id }}
      });
      expect(queryRecordStatus.code).to.equal(200);

      // Attempt to write the record to Bob's DWN.
      const [ queryRecord ] = queryRecords;
      const { status } = await queryRecord!.send(bobDid.did);
      expect(status.code).to.equal(202);

      // Confirm Bob can query his own remote DWN for the created record.
      const bobQueryResult = await dwnBob.records.query({
        from    : bobDid.did,
        message : {
          filter: {
            schema: 'http://email-protocol.xyz/schema/email'
          }
        }
      });
      expect(bobQueryResult.status.code).to.equal(200);
      expect(bobQueryResult.records).to.exist;
      expect(bobQueryResult.records!.length).to.equal(1);
    });

    it('writes large records to remote DWNs that were initially read from a remote DWN', async () => {
      /** Generate data that exceeds the DWN encoded data limit to ensure that the data will have to
       * be fetched with a RecordsRead when record.data.blob() is executed. */
      const dataText = TestDataGenerator.randomString(DwnConstant.maxDataSizeAllowedToBeEncoded + 1000);

      // Install the email protocol for Alice's local DWN.
      let { protocol: aliceProtocol, status: aliceStatus } = await dwnAlice.protocols.configure({
        message: { definition: emailProtocolDefinition }
      });
      expect(aliceStatus.code).to.equal(202);
      expect(aliceProtocol).to.exist;

      // Install the email protocol for Alice's remote DWN.
      const { status: alicePushStatus } = await aliceProtocol!.send(aliceDid.did);
      expect(alicePushStatus.code).to.equal(202);

      // Install the email protocol for Bob's local DWN.
      const { protocol: bobProtocol, status: bobStatus } = await dwnBob.protocols.configure({
        message: {
          definition: emailProtocolDefinition
        }
      });

      expect(bobStatus.code).to.equal(202);
      expect(bobProtocol).to.exist;

      // Install the email protocol for Bob's remote DWN.
      const { status: bobPushStatus } = await bobProtocol!.send(bobDid.did);
      expect(bobPushStatus.code).to.equal(202);

      // Alice creates a new large record but does not store it in her local DWN.
      const { status: aliceEmailStatus, record: aliceEmailRecord } = await dwnAlice.records.write({
        store   : false,
        data    : dataText,
        message : {
          protocol     : emailProtocolDefinition.protocol,
          protocolPath : 'email',
          schema       : 'http://email-protocol.xyz/schema/email',
        }
      });
      expect(aliceEmailStatus.code).to.equal(202);

      // Alice writes the large record to her own remote DWN.
      const { status: sendStatus } = await aliceEmailRecord!.send(aliceDid.did);
      expect(sendStatus.code).to.equal(202);

      // Alice queries for the record that was just created on her remote DWN.
      const { record: queryRecord, status: queryRecordStatus } = await dwnAlice.records.read({
        from    : aliceDid.did,
        message : { filter: { recordId: aliceEmailRecord!.id }}
      });
      expect(queryRecordStatus.code).to.equal(200);

      // Attempt to write the record to Bob's DWN.
      const { status } = await queryRecord!.send(bobDid.did);
      expect(status.code).to.equal(202);

      // Confirm Bob can query his own remote DWN for the created record.
      const bobQueryResult = await dwnBob.records.query({
        from    : bobDid.did,
        message : {
          filter: {
            schema: 'http://email-protocol.xyz/schema/email'
          }
        }
      });
      expect(bobQueryResult.status.code).to.equal(200);
      expect(bobQueryResult.records).to.exist;
      expect(bobQueryResult.records!.length).to.equal(1);
    });

    it(`writes records to remote DWNs for someone else's DID`, async () => {
      const dataString = 'Hello, world!';

      // Install the email protocol for Alice's local DWN.
      let { protocol: aliceProtocol, status: aliceStatus } = await dwnAlice.protocols.configure({
        message: {
          definition: emailProtocolDefinition
        }
      });

      expect(aliceStatus.code).to.equal(202);
      expect(aliceProtocol).to.exist;

      // Install the email protocol for Alice's remote DWN.
      const { status: alicePushStatus } = await aliceProtocol!.send(aliceDid.did);
      expect(alicePushStatus.code).to.equal(202);

      // Install the email protocol for Bob's local DWN.
      const { protocol: bobProtocol, status: bobStatus } = await dwnBob.protocols.configure({
        message: {
          definition: emailProtocolDefinition
        }
      });

      expect(bobStatus.code).to.equal(202);
      expect(bobProtocol).to.exist;

      // Install the email protocol for Bob's remote DWN.
      const { status: bobPushStatus } = await bobProtocol!.send(bobDid.did);
      expect(bobPushStatus.code).to.equal(202);

      // Alice writes a message to her own DWN.
      const { status: aliceEmailStatus, record: aliceEmailRecord } = await dwnAlice.records.write({
        data    : dataString,
        message : {
          protocol     : emailProtocolDefinition.protocol,
          protocolPath : 'email',
          schema       : 'http://email-protocol.xyz/schema/email',
        }
      });

      expect(aliceEmailStatus.code).to.equal(202);

      // Attempt to write the message to Bob's DWN.
      const { status } = await aliceEmailRecord!.send(bobDid.did);
      expect(status.code).to.equal(202);

      // Query Bob's remote DWN for `email` schema records.
      const bobQueryResult = await dwnBob.records.query({
        from    : bobDid.did,
        message : {
          filter: {
            schema: 'http://email-protocol.xyz/schema/email'
          }
        }
      });

      expect(bobQueryResult.status.code).to.equal(200);
      expect(bobQueryResult.records).to.exist;
      expect(bobQueryResult.records!.length).to.equal(1);
      const [ bobRemoteEmailRecord ] = bobQueryResult!.records!;
      expect(await bobRemoteEmailRecord.data.text()).to.equal(dataString);
    });

    describe('with store: false', () => {
      it('writes records to your own remote DWN but not your local DWN', async () => {
        // Alice creates a record but does not store it on her local DWN with `store: false`.
        const dataString = 'Hello, world!';
        const writeResult = await dwnAlice.records.write({
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
        const queryResult = await dwnAlice.records.query({
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
        const { status } = await writeResult.record!.send(aliceDid.did);
        expect(status.code).to.equal(202);

        // Query Alice's remote DWN for `plain/text` records.
        const aliceRemoteQueryResult = await dwnAlice.records.query({
          from    : aliceDid.did,
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

      it(`writes records to someone else's remote DWN but not your agent DWN`, async () => {
        // Install a protocol on Alice's agent connected DWN.
        let { protocol: aliceProtocol, status: aliceStatus } = await dwnAlice.protocols.configure({
          message: {
            definition: emailProtocolDefinition
          }
        });

        expect(aliceStatus.code).to.equal(202);
        expect(aliceProtocol).to.exist;

        // Install the protocol on Alice's remote DWN.
        const { status: alicePushStatus } = await aliceProtocol!.send(aliceDid.did);
        expect(alicePushStatus.code).to.equal(202);

        // Install the email protocol for Bob's local DWN.
        const { protocol: bobProtocol, status: bobStatus } = await dwnBob.protocols.configure({
          message: {
            definition: emailProtocolDefinition
          }
        });

        expect(bobStatus.code).to.equal(202);
        expect(bobProtocol).to.exist;

        // Install the email protocol for Bob's remote DWN.
        const { status: bobPushStatus } = await bobProtocol!.send(bobDid.did);
        expect(bobPushStatus.code).to.equal(202);

        // Alice writes a message to her agent DWN with `store: false`.
        const dataString = 'Hello, world!';
        const writeResult = await dwnAlice.records.write({
          store   : false,
          data    : dataString,
          message : {
            protocol     : emailProtocolDefinition.protocol,
            protocolPath : 'email',
            schema       : 'http://email-protocol.xyz/schema/email',
          }
        });

        // Confirm that the request was accepted and a Record instance was returned.
        expect(writeResult.status.code).to.equal(202);
        expect(writeResult.status.detail).to.equal('Accepted');
        expect(writeResult.record).to.exist;
        expect(await writeResult.record?.data.text()).to.equal(dataString);

        // Query Alice's agent DWN for `email` schema records.
        const queryResult = await dwnAlice.records.query({
          message: {
            filter: {
              schema: 'http://email-protocol.xyz/schema/email'
            }
          }
        });

        // Confirm no `email` schema records were written.
        expect(queryResult.status.code).to.equal(200);
        expect(queryResult.records).to.exist;
        expect(queryResult.records!.length).to.equal(0);

        // Alice writes the message to Bob's remote DWN.
        const { status } = await writeResult.record!.send(bobDid.did);
        expect(status.code).to.equal(202);

        // Query Bobs's remote DWN for `email` schema records.
        const bobQueryResult = await dwnBob.records.query({
          from    : bobDid.did,
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
      });

      it('has no effect if `store: true`', async () => {
        // Alice writes a message to her agent DWN with `store: true`.
        const dataString = 'Hello, world!';
        const writeResult = await dwnAlice.records.write({
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
        const queryResult = await dwnAlice.records.query({
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
        const { status } = await writeResult.record!.send(aliceDid.did);
        expect(status.code).to.equal(202);

        // Query Alice's remote DWN for `plain/text` records.
        const aliceRemoteQueryResult = await dwnAlice.records.query({
          from    : aliceDid.did,
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
      const author = aliceDid.did;

      // Retrieve `#dwn` service entry.
      const [ didDwnService ] = didUtils.getServices({ didDocument: aliceDid.document, id: '#dwn' });

      // Retrieve first message signing key from the #dwn service endpoint.
      if (!didUtils.isDwnServiceEndpoint(didDwnService.serviceEndpoint)) throw Error('Type guard');
      const [ signingKeyIdFragment ] = didDwnService!.serviceEndpoint!.signingKeys;
      const [ encryptionKeyIdFragment ] = didDwnService!.serviceEndpoint!.encryptionKeys;

      const signingKeyId = `${aliceDid.did}${signingKeyIdFragment}`;
      const signingKeyPair = aliceDid.keySet.verificationMethodKeys!.find(keyPair => keyPair.publicKeyJwk.kid === signingKeyIdFragment);
      const signingPrivateKeyJwk = signingKeyPair.privateKeyJwk;

      const encryptionKeyId = `${aliceDid.did}${encryptionKeyIdFragment}`;
      const encryptionPublicKeyJwk = aliceDid.keySet.verificationMethodKeys!.find(keyPair => keyPair.publicKeyJwk.kid === encryptionKeyIdFragment)!.publicKeyJwk;

      // RecordsWriteMessage properties that can be pre-defined
      const attestation = [new PrivateKeySigner({
        privateJwk : signingPrivateKeyJwk as DwnPrivateKeyJwk,
        algorithm  : signingPrivateKeyJwk.alg as string,
        keyId      : signingKeyId,
      })];

      const authorization = new PrivateKeySigner({
        privateJwk : signingPrivateKeyJwk as DwnPrivateKeyJwk,
        algorithm  : signingPrivateKeyJwk.alg as string,
        keyId      : signingKeyId,
      });

      const encryptionInput: EncryptionInput = {
        algorithm            : EncryptionAlgorithm.Aes256Ctr,
        initializationVector : TestDataGenerator.randomBytes(16),
        key                  : TestDataGenerator.randomBytes(32),
        keyEncryptionInputs  : [{
          algorithm        : EncryptionAlgorithm.EciesSecp256k1,
          derivationScheme : KeyDerivationScheme.ProtocolPath,
          publicKey        : encryptionPublicKeyJwk as DwnPublicKeyJwk,
          publicKeyId      : encryptionKeyId
        }]
      };

      // RecordsWriteDescriptor properties that can be pre-defined
      const protocol = emailProtocolDefinition.protocol;
      const protocolPath = 'email';
      const schema = emailProtocolDefinition.types.email.schema;
      const recipient = aliceDid.did;
      const published = true;

      // Install a protocol on Alice's agent connected DWN.
      await dwnAlice.protocols.configure({
        message: {
          definition: emailProtocolDefinition
        }
      });

      // Create a parent record to reference in the RecordsWriteMessage used for validation
      const parentRecordsWrite = await RecordsWrite.create({
        data   : new Uint8Array(await dataBlob.arrayBuffer()),
        dataFormat,
        protocol,
        protocolPath,
        schema,
        signer : authorization,
      }) as RecordsWriteTest;

      // Create a RecordsWriteMessage
      const recordsWrite = await RecordsWrite.create({
        attestationSigners : attestation,
        data               : new Uint8Array(await dataBlob.arrayBuffer()),
        dataFormat,
        encryptionInput,
        parentId           : parentRecordsWrite.recordId,
        protocol,
        protocolPath,
        published,
        recipient,
        schema,
        signer             : authorization,
      }) as RecordsWriteTest;

      // Create record using test RecordsWriteMessage.
      const record = new Record(testAgent.agent, {
        ...recordsWrite.message,
        encodedData  : dataBlob,
        author       : aliceDid.did,
        connectedDid : aliceDid.did,
      });

      // Call toJSON() method.
      const recordJson = record.toJSON();

      // Retained Record properties.
      expect(recordJson.author).to.equal(author);

      // Retained RecordsWriteMessage top-level properties.
      expect(record.contextId).to.equal(recordsWrite.message.contextId);
      expect(record.id).to.equal(recordsWrite.message.recordId);
      expect(record.encryption).to.not.be.undefined;
      expect(record.encryption).to.deep.equal(recordsWrite.message.encryption);
      expect(record.encryption!.keyEncryption.find(key => key.derivationScheme === KeyDerivationScheme.ProtocolPath));
      expect(record.attestation).to.not.be.undefined;
      expect(record.attestation).to.have.property('signatures');

      // Retained RecordsWriteDescriptor properties.
      expect(recordJson.interface).to.equal(DwnInterfaceName.Records);
      expect(recordJson.method).to.equal(DwnMethodName.Write);
      expect(recordJson.protocol).to.equal(protocol);
      expect(recordJson.protocolPath).to.equal(protocolPath);
      expect(recordJson.recipient).to.equal(recipient);
      expect(recordJson.schema).to.equal(schema);
      expect(recordJson.parentId).to.equal(parentRecordsWrite.recordId);
      expect(recordJson.dataCid).to.equal(recordsWrite.message.descriptor.dataCid);
      expect(recordJson.dataSize).to.equal(recordsWrite.message.descriptor.dataSize);
      expect(recordJson.dateCreated).to.equal(recordsWrite.message.descriptor.dateCreated);
      expect(recordJson.messageTimestamp).to.equal(recordsWrite.message.descriptor.messageTimestamp);
      expect(recordJson.published).to.equal(published);
      expect(recordJson.datePublished).to.equal(recordsWrite.message.descriptor.datePublished);
      expect(recordJson.dataFormat).to.equal(dataFormat);
    });
  });

  describe('update()', () => {
    it('updates a local record on the local DWN', async () => {
      const { status, record } = await dwnAlice.records.write({
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

      const readResult = await dwnAlice.records.read({
        message: {
          filter: {
            recordId: record!.id
          }
        }
      });

      expect(readResult.status.code).to.equal(200);
      expect(readResult.record).to.not.be.undefined;

      expect(readResult.record.dataCid).to.not.equal(dataCidBeforeDataUpdate);
      expect(readResult.record.dataCid).to.equal(record!.dataCid);

      const updatedData = await record!.data.text();
      expect(updatedData).to.equal('bye');
    });

    it('updates a record locally that only written to a remote DWN', async () => {
      // Create a record but do not store it on the local DWN.
      const { status, record } = await dwnAlice.records.write({
        store   : false,
        data    : 'Hello, world!',
        message : {
          schema     : 'foo/bar',
          dataFormat : 'text/plain'
        }
      });
      expect(status.code).to.equal(202);
      expect(record).to.not.be.undefined;

      // Store the data CID of the record before it is updated.
      const dataCidBeforeDataUpdate = record!.dataCid;

      // Write the record to a remote DWN.
      const { status: sendStatus } = await record!.send(aliceDid.did);
      expect(sendStatus.code).to.equal(202);

      // fails because record has not been stored in the local dwn yet
      let updateResult = await record!.update({ data: 'bye' });
      expect(updateResult.status.code).to.equal(400);
      expect(updateResult.status.detail).to.equal('RecordsWriteGetInitialWriteNotFound: initial write is not found');

      const { status: recordStoreStatus }=  await record.store();
      expect(recordStoreStatus.code).to.equal(202);

      // now succeeds with the update
      updateResult = await record!.update({ data: 'bye' });
      expect(updateResult.status.code).to.equal(202);

      // Confirm that the record was written to the local DWN.
      const readResult = await dwnAlice.records.read({
        message: {
          filter: {
            recordId: record!.id
          }
        }
      });
      expect(readResult.status.code).to.equal(200);
      expect(readResult.record).to.not.be.undefined;

      // Confirm that the data CID of the record was updated.
      expect(readResult.record.dataCid).to.not.equal(dataCidBeforeDataUpdate);
      expect(readResult.record.dataCid).to.equal(record!.dataCid);

      // Confirm that the data payload of the record was modified.
      const updatedData = await record!.data.text();
      expect(updatedData).to.equal('bye');
    });

    it('allows to update a record locally that was initially read from a remote DWN if store() is issued', async () => {
      // Create a record but do not store it on the local DWN.
      const { status, record } = await dwnAlice.records.write({
        store   : false,
        data    : 'Hello, world!',
        message : {
          schema     : 'foo/bar',
          dataFormat : 'text/plain'
        }
      });
      expect(status.code).to.equal(202);
      expect(record).to.not.be.undefined;

      // Store the data CID of the record before it is updated.
      const dataCidBeforeDataUpdate = record!.dataCid;

      // Write the record to a remote DWN.
      const { status: sendStatus } = await record!.send(aliceDid.did);
      expect(sendStatus.code).to.equal(202);

      // Read the record from the remote DWN.
      let readResult = await dwnAlice.records.read({
        from    : aliceDid.did,
        message : {
          filter: {
            recordId: record!.id
          }
        }
      });
      expect(readResult.status.code).to.equal(200);
      expect(readResult.record).to.not.be.undefined;

      const readRecord = readResult.record;

      // Attempt to update the record without storing, should fail
      let updateResult = await readRecord.update({ data: 'bye' });
      expect(updateResult.status.code).to.equal(400);

      // store the record locally
      const { status: storeStatus } = await readRecord.store();
      expect(storeStatus.code).to.equal(202);

      // Attempt to update the record, which should write the updated record the local DWN.
      updateResult = await readRecord.update({ data: 'bye' });
      expect(updateResult.status.code).to.equal(202);

      // Confirm that the record was written to the local DWN.
      readResult = await dwnAlice.records.read({
        message: {
          filter: {
            recordId: record!.id
          }
        }
      });
      expect(readResult.status.code).to.equal(200);
      expect(readResult.record).to.not.be.undefined;

      // Confirm that the data CID of the record was updated.
      expect(readResult.record.dataCid).to.not.equal(dataCidBeforeDataUpdate);
      expect(readResult.record.dataCid).to.equal(readRecord.dataCid);
    });

    it('updates a record locally that was initially queried from a remote DWN', async () => {
      // Create a record but do not store it on the local DWN.
      const { status, record } = await dwnAlice.records.write({
        store   : false,
        data    : 'Hello, world!',
        message : {
          schema     : 'foo/bar',
          dataFormat : 'text/plain'
        }
      });
      expect(status.code).to.equal(202);
      expect(record).to.not.be.undefined;

      // Store the data CID of the record before it is updated.
      const dataCidBeforeDataUpdate = record!.dataCid;

      // Write the record to a remote DWN.
      const { status: sendStatus } = await record!.send(aliceDid.did);
      expect(sendStatus.code).to.equal(202);

      // Query the record from the remote DWN.
      const queryResult = await dwnAlice.records.query({
        from    : aliceDid.did,
        message : {
          filter: {
            recordId: record!.id
          }
        }
      });
      expect(queryResult.status.code).to.equal(200);
      expect(queryResult.records).to.not.be.undefined;
      expect(queryResult.records.length).to.equal(1);

      // Attempt to update the queried record, which will fail because we haven't stored the queried record locally yet
      const [ queriedRecord ] = queryResult.records;
      let updateResult = await queriedRecord!.update({ data: 'bye' });
      expect(updateResult.status.code).to.equal(400);
      expect(updateResult.status.detail).to.equal('RecordsWriteGetInitialWriteNotFound: initial write is not found');

      // store the queried record
      const { status: queriedStoreStatus } = await queriedRecord.store();
      expect(queriedStoreStatus.code).to.equal(202);

      updateResult = await queriedRecord!.update({ data: 'bye' });
      expect(updateResult.status.code).to.equal(202);

      // Confirm that the record was written to the local DWN.
      const readResult = await dwnAlice.records.read({
        message: {
          filter: {
            recordId: record!.id
          }
        }
      });
      expect(readResult.status.code).to.equal(200);
      expect(readResult.record).to.not.be.undefined;

      // Confirm that the data CID of the record was updated.
      expect(readResult.record.dataCid).to.not.equal(dataCidBeforeDataUpdate);
      expect(readResult.record.dataCid).to.equal(queriedRecord!.dataCid);

      // Confirm that the data payload of the record was modified.
      const updatedData = await queriedRecord!.data.text();
      expect(updatedData).to.equal('bye');
    });

    it('returns new dateModified after each update', async () => {
      // Initial write of the record.
      const { status, record } = await dwnAlice.records.write({
        data    : 'Hello, world!',
        message : {
          schema     : 'foo/bar',
          dataFormat : 'text/plain'
        }
      });
      const initialDateModified = record.dateModified;
      expect(status.code).to.equal(202);

      // First update of the record.
      let updateResult = await record!.update({ data: 'hi' });
      expect(updateResult.status.code).to.equal(202);

      // Verify that the dateModified was updated.
      const firstUpdateDateModified = record.dateModified;
      expect(initialDateModified).to.not.equal(firstUpdateDateModified);

      //  Second update of the record.
      updateResult = await record!.update({ data: 'bye' });
      expect(updateResult.status.code).to.equal(202);

      // Verify that the dateModified was updated.
      const secondUpdateDateModified = record.dateModified;
      expect(firstUpdateDateModified).to.not.equal(secondUpdateDateModified);
    });

    it('throws an exception when an immutable property is modified', async () => {
      const { status, record } = await dwnAlice.records.write({
        data    : 'Hello, world!',
        message : {
          schema     : 'foo/bar',
          dataFormat : 'text/plain'
        }
      });

      expect(status.code).to.equal(202);
      expect(record).to.not.be.undefined;

      await expect(
        // @ts-expect-error because this test intentionally specifies an immutable property that is not present in RecordUpdateOptions.
        record!.update({ dataFormat: 'application/json' })
      ).to.eventually.be.rejectedWith('is an immutable property. Its value cannot be changed.');
    });
  });

  describe('store()', () => {
    it('should store an external record if it has been imported by the dwn owner', async () => {
      // Scenario: Alice creates a record.
      //           Bob queries for the record from Alice's DWN and then stores it to their own DWN.

      // alice creates a record and sends it to their DWN
      const { status, record } = await dwnAlice.records.write({
        data    : 'Hello, world!',
        message : {
          published  : true,
          schema     : 'foo/bar',
          dataFormat : 'text/plain'
        }
      });
      expect(status.code).to.equal(202, status.detail);
      let sendResponse = await record.send();
      expect(sendResponse.status.code).to.equal(202, sendResponse.status.detail);

      // bob queries alice's DWN for the record
      const aliceQueryResult = await dwnBob.records.query({
        from    : aliceDid.did,
        message : {
          filter: {
            recordId: record.id
          }
        }
      });
      expect(aliceQueryResult.status.code).to.equal(200);
      expect(aliceQueryResult.records.length).to.equal(1);
      const queriedRecord = aliceQueryResult.records[0];

      // bob queries their own DWN for the record, should not return any results
      let bobQueryResult = await dwnBob.records.query({
        message: {
          filter: {
            recordId: record.id
          }
        }
      });
      expect(bobQueryResult.status.code).to.equal(200);
      expect(bobQueryResult.records.length).to.equal(0);

      // attempts to store the record without importing it, should fail
      let { status: storeRecordStatus } = await queriedRecord.store();
      expect(storeRecordStatus.code).to.equal(401, storeRecordStatus.detail);

      // attempts to store the record flagging it for import
      ({ status: storeRecordStatus } = await queriedRecord.store(true));
      expect(storeRecordStatus.code).to.equal(202, storeRecordStatus.detail);

      // bob queries their own DWN for the record, should return the record
      bobQueryResult = await dwnBob.records.query({
        message: {
          filter: {
            recordId: record.id
          }
        }
      });
      expect(bobQueryResult.status.code).to.equal(200);
      expect(bobQueryResult.records.length).to.equal(1);
      const storedRecord = bobQueryResult.records[0];
      expect(storedRecord.id).to.equal(record.id);
    });

    it('stores an updated record to the local DWN along with the initial write', async () => {
      // Scenario: Alice creates a record and then updates it.
      //           Bob queries for the record from Alice's DWN and then stores the updated record along with it's initial write.

      // Alice creates a public record then sends it to her remote DWN.
      const { status, record } = await dwnAlice.records.write({
        data    : 'Hello, world!',
        message : {
          published  : true,
          schema     : 'foo/bar',
          dataFormat : 'text/plain'
        }
      });
      expect(status.code).to.equal(202, status.detail);
      const updatedText = 'updated text';
      const updateResult = await record!.update({ data: updatedText });
      expect(updateResult.status.code).to.equal(202, updateResult.status.detail);

      const sendResponse = await record.send();
      expect(sendResponse.status.code).to.equal(202, sendResponse.status.detail);

      // Bob queries for the record from his own node, should not return any results
      let queryResult = await dwnBob.records.query({
        message: {
          filter: {
            recordId: record.id
          }
        }
      });
      expect(queryResult.status.code).to.equal(200);
      expect(queryResult.records.length).to.equal(0);

      // Bob queries for the record from Alice's remote DWN
      const queryResultFromAlice = await dwnBob.records.query({
        from    : aliceDid.did,
        message : {
          filter: {
            recordId: record.id
          }
        }
      });
      expect(queryResultFromAlice.status.code).to.equal(200);
      expect(queryResultFromAlice.records.length).to.equal(1);
      const queriedRecord = queryResultFromAlice.records[0];
      expect(await queriedRecord.data.text()).to.equal(updatedText);

      // attempts to store the record without signing it, should fail
      let { status: storeRecordStatus } = await queriedRecord.store();
      expect(storeRecordStatus.code).to.equal(401, storeRecordStatus.detail);

      // stores the record in Bob's DWN, the importRecord parameter is set to true so that bob signs the record before storing it
      ({ status: storeRecordStatus } = await queriedRecord.store(true));
      expect(storeRecordStatus.code).to.equal(202, storeRecordStatus.detail);

      // The record should now exist on bob's node
      queryResult = await dwnBob.records.query({
        message: {
          filter: {
            recordId: record.id
          }
        }
      });
      expect(queryResult.status.code).to.equal(200);
      expect(queryResult.records.length).to.equal(1);
      const storedRecord = queryResult.records[0];
      expect(storedRecord.id).to.equal(record!.id);
      expect(await storedRecord.data.text()).to.equal(updatedText);
    });
  });

  describe('import()', () => {
    it('should import an external record without storing it', async () => {
      // Scenario: Alice creates a record.
      //           Bob queries for the record from Alice's DWN and then imports it without storing
      //           Bob then .stores() it without specifying import explicitly as it's already been imported.

      // alice creates a record and sends it to her DWN
      const { status, record } = await dwnAlice.records.write({
        data    : 'Hello, world!',
        message : {
          published  : true,
          schema     : 'foo/bar',
          dataFormat : 'text/plain'
        }
      });
      expect(status.code).to.equal(202, status.detail);
      let sendResponse = await record.send();
      expect(sendResponse.status.code).to.equal(202, sendResponse.status.detail);

      // bob queries alice's DWN for the record
      const aliceQueryResult = await dwnBob.records.query({
        from    : aliceDid.did,
        message : {
          filter: {
            recordId: record.id
          }
        }
      });
      expect(aliceQueryResult.status.code).to.equal(200);
      expect(aliceQueryResult.records.length).to.equal(1);
      const queriedRecord = aliceQueryResult.records[0];

      // imports the record without storing it
      let { status: importRecordStatus } = await queriedRecord.import();
      expect(importRecordStatus.code).to.equal(202, importRecordStatus.detail);

      // bob queries their own DWN for the record, should return the record
      const bobQueryResult = await dwnBob.records.query({
        message: {
          filter: {
            recordId: record.id
          }
        }
      });
      expect(bobQueryResult.status.code).to.equal(200);
      expect(bobQueryResult.records.length).to.equal(1);
      const storedRecord = bobQueryResult.records[0];
      expect(storedRecord.id).to.equal(record.id);
    });

    it('import an external record along with the initial write', async () => {
      // Scenario: Alice creates a record and then updates it.
      //           Bob queries for the record from Alice's DWN and then stores the updated record along with it's initial write.

      // Alice creates a public record then sends it to her remote DWN.
      const { status, record } = await dwnAlice.records.write({
        data    : 'Hello, world!',
        message : {
          published  : true,
          schema     : 'foo/bar',
          dataFormat : 'text/plain'
        }
      });
      expect(status.code).to.equal(202, status.detail);
      const updatedText = 'updated text';
      const updateResult = await record!.update({ data: updatedText });
      expect(updateResult.status.code).to.equal(202, updateResult.status.detail);
      const sendResponse = await record.send();
      expect(sendResponse.status.code).to.equal(202, sendResponse.status.detail);

      // bob queries alice's DWN for the record
      const aliceQueryResult = await dwnBob.records.query({
        from    : aliceDid.did,
        message : {
          filter: {
            recordId: record.id
          }
        }
      });
      expect(aliceQueryResult.status.code).to.equal(200);
      expect(aliceQueryResult.records.length).to.equal(1);
      const queriedRecord = aliceQueryResult.records[0];

      // imports the record without storing it
      let { status: importRecordStatus } = await queriedRecord.import();
      expect(importRecordStatus.code).to.equal(202, importRecordStatus.detail);

      // bob queries their own DWN for the record, should return the record
      const bobQueryResult = await dwnBob.records.query({
        message: {
          filter: {
            recordId: record.id
          }
        }
      });
      expect(bobQueryResult.status.code).to.equal(200);
      expect(bobQueryResult.records.length).to.equal(1);
      const storedRecord = bobQueryResult.records[0];
      expect(storedRecord.id).to.equal(record.id);
    });

    describe('store: false', () => {
      it('should import an external record without storing it', async () => {
        // Scenario: Alice creates a record.
        //           Bob queries for the record from Alice's DWN and then imports it without storing
        //           Bob then .stores() it without specifying import explicitly as it's already been imported.

        // alice creates a record and sends it to her DWN
        const { status, record } = await dwnAlice.records.write({
          data    : 'Hello, world!',
          message : {
            published  : true,
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });
        expect(status.code).to.equal(202, status.detail);
        let sendResponse = await record.send();
        expect(sendResponse.status.code).to.equal(202, sendResponse.status.detail);

        // bob queries alice's DWN for the record
        const aliceQueryResult = await dwnBob.records.query({
          from    : aliceDid.did,
          message : {
            filter: {
              recordId: record.id
            }
          }
        });
        expect(aliceQueryResult.status.code).to.equal(200);
        expect(aliceQueryResult.records.length).to.equal(1);
        const queriedRecord = aliceQueryResult.records[0];

        // imports the record without storing it
        let { status: importRecordStatus } = await queriedRecord.import(false);
        expect(importRecordStatus.code).to.equal(202, importRecordStatus.detail);

        // queries for the record from bob's DWN, should not return any results
        let bobQueryResult = await dwnBob.records.query({
          message: {
            filter: {
              recordId: record.id
            }
          }
        });
        expect(bobQueryResult.status.code).to.equal(200);
        expect(bobQueryResult.records.length).to.equal(0);

        // attempts to store the record without explicitly marking it for import as it's already been imported
        ({ status: importRecordStatus } = await queriedRecord.store());
        expect(importRecordStatus.code).to.equal(202, importRecordStatus.detail);

        // bob queries their own DWN for the record, should return the record
        bobQueryResult = await dwnBob.records.query({
          message: {
            filter: {
              recordId: record.id
            }
          }
        });
        expect(bobQueryResult.status.code).to.equal(200);
        expect(bobQueryResult.records.length).to.equal(1);
        const storedRecord = bobQueryResult.records[0];
        expect(storedRecord.id).to.equal(record.id);
      });

      it('import an external record along with the initial write', async () => {
        // Scenario: Alice creates a record and then updates it.
        //           Bob queries for the record from Alice's DWN and then stores the updated record along with it's initial write.

        // Alice creates a public record then sends it to her remote DWN.
        const { status, record } = await dwnAlice.records.write({
          data    : 'Hello, world!',
          message : {
            published  : true,
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });
        expect(status.code).to.equal(202, status.detail);
        const updatedText = 'updated text';
        const updateResult = await record.update({ data: updatedText });
        expect(updateResult.status.code).to.equal(202, updateResult.status.detail);
        const sendResponse = await record.send();
        expect(sendResponse.status.code).to.equal(202, sendResponse.status.detail);

        // bob queries alice's DWN for the record
        const aliceQueryResult = await dwnBob.records.query({
          from    : aliceDid.did,
          message : {
            filter: {
              recordId: record.id
            }
          }
        });
        expect(aliceQueryResult.status.code).to.equal(200);
        expect(aliceQueryResult.records.length).to.equal(1);
        const queriedRecord = aliceQueryResult.records[0];

        // imports the record without storing it
        let { status: importRecordStatus } = await queriedRecord.import(false);
        expect(importRecordStatus.code).to.equal(202, importRecordStatus.detail);

        // queries for the record from bob's DWN, should not return any results
        let bobQueryResult = await dwnBob.records.query({
          message: {
            filter: {
              recordId: record.id
            }
          }
        });
        expect(bobQueryResult.status.code).to.equal(200);
        expect(bobQueryResult.records.length).to.equal(0);

        // attempts to store the record without explicitly marking it for import as it's already been imported
        ({ status: importRecordStatus } = await queriedRecord.store());
        expect(importRecordStatus.code).to.equal(202, importRecordStatus.detail);

        // bob queries their own DWN for the record, should return the record
        bobQueryResult = await dwnBob.records.query({
          message: {
            filter: {
              recordId: record.id
            }
          }
        });
        expect(bobQueryResult.status.code).to.equal(200);
        expect(bobQueryResult.records.length).to.equal(1);
        const storedRecord = bobQueryResult.records[0];
        expect(storedRecord.id).to.equal(record.id);
      });
    });
  });
});