import type { DidDocument } from '@tbd54566975/dids';
import type { TestProfileOptions } from './test-utils/test-user-agent.js';
import type { PrivateJwk as DwnPrivateKeyJwk, PublicJwk as DwnPublicKeyJwk, RecordsWriteMessage } from '@tbd54566975/dwn-sdk-js';

import { expect } from 'chai';
import { utils as didUtils } from '@tbd54566975/dids';
import { generateKeyPair } from '@decentralized-identity/ion-tools';
import { DwnInterfaceName, DwnMethodName, KeyDerivationScheme, RecordsWrite } from '@tbd54566975/dwn-sdk-js';


import { Record } from '../src/record.js';
import { DwnApi } from '../src/dwn-api.js';
import { TestAgent } from './test-utils/test-user-agent.js';
import { dataToBytes } from '../src/utils.js';
import { TestDataGenerator } from './test-utils/test-data-generator.js';

// TODO: Come up with a better way of resolving the TS errors.
type RecordsWriteTest = RecordsWrite & RecordsWriteMessage;


let aliceDid: string;
let dataBytes: Uint8Array;
let dataFormat: string;
let dataText: string;
let testProfileOptions: TestProfileOptions;
let testAgent: TestAgent;
let did: string;
let dwn: DwnApi;

describe('web5.dwn', () => {
  before(async () => {
    testAgent = await TestAgent.create();

    const keys = [
      {
        id       : 'attest',
        type     : 'JsonWebKey2020',
        keyPair  : await generateKeyPair('secp256k1'),
        purposes : ['authentication'],
      },
      {
        id       : 'encrypt',
        type     : 'JsonWebKey2020',
        keyPair  : await generateKeyPair('secp256k1'),
        purposes : ['keyAgreement'],
      },
      {
        id       : 'authz',
        type     : 'JsonWebKey2020',
        keyPair  : await generateKeyPair('secp256k1'),
        purposes : ['authentication'],
      }
    ];

    testProfileOptions = {
      profileDidOptions: {
        keys,
        services: [
          {
            id              : 'dwn',
            type            : 'DecentralizedWebNode',
            serviceEndpoint : {
              nodes                    : ['https://dwn.tbddev.xyz'],
              messageAttestationKeys   : ['#attest'],
              messageAuthorizationKeys : ['#authz'],
              recordEncryptionKeys     : ['#encrypt']
            }
          }
        ]
      }
    };

    dataText = TestDataGenerator.randomString(100);
    ({ dataBytes, dataFormat } = dataToBytes(dataText));
  });

  beforeEach(async () => {
    await testAgent.clearStorage();
    ({ did } = await testAgent.createProfile({
      profileDidOptions: {
        services: [{
          type            : 'dwn',
          id              : 'dwn',
          serviceEndpoint : {
            nodes: ['https://dwn.tbddev.org/dwn0']
          }
        }]
      }})
    );

    ({ did: aliceDid } = await testAgent.createProfile(testProfileOptions));

    dwn = new DwnApi(testAgent.agent, did);
  });

  after(async () => {
    await testAgent.clearStorage();
    await testAgent.closeStorage();
  });

  describe('Record', () => {
    it('should retain all defined properties', async () => {
      // RecordOptions properties
      const author = aliceDid;
      const target = aliceDid;

      const profile = await testAgent.profileApi.getProfile(aliceDid);

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
      const recipient = aliceDid;
      const published = true;
      const schema = 'http://example.org/chat/schema/message';

      // Create a parent record to reference in the RecordsWriteMessage used for validation
      const parentRecorsWrite = await RecordsWrite.create({
        protocol,
        protocolPath,
        schema,
        data                        : dataBytes,
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
        data                        : dataBytes,
        published,
        dataFormat,
        attestationSignatureInputs  : attestation,
        authorizationSignatureInput : authorization,
        encryptionInput,
      }) as RecordsWriteTest;

      // Create record using test RecordsWriteMessage.
      const record = new Record(testAgent.agent, {
        ...recordsWrite.message,
        encodedData: dataBytes,
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

    describe('toJSON()', () => {
      it('should return all defined properties', async () => {
        // RecordOptions properties
        const author = aliceDid;
        const target = aliceDid;

        const profile = await testAgent.profileApi.getProfile(aliceDid);

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
        const recipient = aliceDid;
        const published = true;
        const schema = 'http://example.org/chat/schema/message';

        // Create a parent record to reference in the RecordsWriteMessage used for validation
        const parentRecorsWrite = await RecordsWrite.create({
          protocol,
          protocolPath,
          schema,
          data                        : dataBytes,
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
          data                        : dataBytes,
          published,
          dataFormat,
          attestationSignatureInputs  : attestation,
          authorizationSignatureInput : authorization,
          encryptionInput,
        }) as RecordsWriteTest;

        // Create record using test RecordsWriteMessage.
        const record = new Record(testAgent.agent, {
          ...recordsWrite.message,
          encodedData: dataBytes,
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

  describe('records', () => {
    describe('write', () => {
      it(`writes a record to alice's local dwn`, async () => {
        const result = await dwn.records.write({
          data    : 'Hello, world!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });

        expect(result.status.code).to.equal(202);
        expect(result.status.detail).to.equal('Accepted');
        expect(result.record).to.exist;
      });

    });

    describe('query', () => {
      it('returns an array of records that match the filter provided', async () => {
        const writeResult = await dwn.records.write({
          data    : 'Hello, world!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });

        expect(writeResult.status.code).to.equal(202);
        expect(writeResult.status.detail).to.equal('Accepted');
        expect(writeResult.record).to.exist;

        const result = await dwn.records.query({
          message: {
            filter: {
              schema: 'foo/bar'
            }
          }
        });

        expect(result.status.code).to.equal(200);
        expect(result.records.length).to.equal(1);
        expect(result.records[0].id).to.equal(writeResult.record!.id);
      });
    });

    describe('read', () => {
      it('returns a record', async () => {
        const writeResult = await dwn.records.write({
          data    : 'Hello, world!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });

        expect(writeResult.status.code).to.equal(202);
        expect(writeResult.status.detail).to.equal('Accepted');
        expect(writeResult.record).to.exist;

        const result = await dwn.records.read({
          message: {
            recordId: writeResult.record!.id
          }
        });

        expect(result.status.code).to.equal(200);
        expect(result.record.id).to.equal(writeResult.record!.id);
      });

      it('returns a 404 when a record cannot be found', async () => {
        const writeResult = await dwn.records.write({
          data    : 'Hello, world!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });

        expect(writeResult.status.code).to.equal(202);
        expect(writeResult.status.detail).to.equal('Accepted');
        expect(writeResult.record).to.exist;

        await writeResult.record!.delete();

        const result = await dwn.records.read({
          message: {
            recordId: writeResult.record!.id
          }
        });

        expect(result.status.code).to.equal(404);
        expect(result.record).to.not.exist;

      });
    });

    describe('delete', () => {
      it('deletes a record', async () => {
        const writeResult = await dwn.records.write({
          data    : 'Hello, world!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });

        expect(writeResult.status.code).to.equal(202);
        expect(writeResult.record).to.not.be.undefined;

        const deleteResult = await dwn.records.delete({
          message: {
            recordId: writeResult.record!.id
          }
        });

        expect(deleteResult.status.code).to.equal(202);
      });

      it('returns a 202 no matter what?', async () => {
        const writeResult = await dwn.records.write({
          data    : 'Hello, world!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });

        expect(writeResult.status.code).to.equal(202);
        expect(writeResult.record).to.not.be.undefined;

        let deleteResult = await dwn.records.delete({
          message: {
            recordId: writeResult.record!.id
          }
        });

        // TODO: (Moe -> Frank): this returns a 202. interesting
        deleteResult = await dwn.records.delete({
          message: {
            recordId: writeResult.record!.id
          }
        });

        expect(deleteResult.status.code).to.equal(202);
      });
    });
  });

  describe('protocols', () => {
    describe('configure', () => {
      xit('works');
    });

    describe('query', () => {
      xit('works');
    });
  });
});