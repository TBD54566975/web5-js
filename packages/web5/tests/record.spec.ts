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
let aliceDid: string;
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
          publicKey        : encryptionPublicKeyJwk as DwnPublicKeyJwk
        },
        {
          derivationScheme : KeyDerivationScheme.Schemas,
          publicKey        : encryptionPublicKeyJwk as DwnPublicKeyJwk
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

      await expect(record!.delete()).to.eventually.be.rejectedWith('was previously deleted');
    });
  });

  describe('send()', () => {
    it('works', async () => {
      // install a protocol for alice
      let { protocol: aliceProtocol, status: aliceStatus } = await dwn.protocols.configure({
        message: {
          definition: emailProtocolDefinition
        }
      });

      expect(aliceStatus.code).to.equal(202);
      expect(aliceProtocol).to.exist;

      const { status: alicePushStatus } = await aliceProtocol!.send();
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

      const { status: bobPushStatus } = await bobProtocol!.send();
      expect(bobPushStatus.code).to.equal(202);

      // alice writes a message to her own dwn
      const { status: aliceEmailStatus, record: aliceEmailRecord } = await dwn.records.write({
        data    : 'Herro!',
        message : {
          protocol     : emailProtocolDefinition.protocol,
          protocolPath : 'email',
          schema       : 'email',
        }
      });

      expect(aliceEmailStatus.code).to.equal(202);

      const { status } = await aliceEmailRecord!.send(bobDid);
      expect(status.code).to.equal(202);
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
            publicKey        : encryptionPublicKeyJwk as DwnPublicKeyJwk
          },
          {
            derivationScheme : KeyDerivationScheme.Schemas,
            publicKey        : encryptionPublicKeyJwk as DwnPublicKeyJwk
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