import type { MessageReply, RecordsRead, RecordsWriteMessage } from '@tbd54566975/dwn-sdk-js';

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { Encoder } from '@tbd54566975/dwn-sdk-js';

import { TestAgent } from './utils/test-user-agent.js';
import * as testProfile from '../fixtures/test-profiles.js';
import messageProtocolDefinition from '../fixtures/protocol-definitions/message.json' assert { type: 'json' };

chai.use(chaiAsPromised);

let did: string;
let dwnNodes: string[] = ['https://dwn.tbddev.org/dwn0'];
// let dwnNodes: string[] = ['http://localhost:3000'];
let testAgent: TestAgent;

describe('Web5UserAgent', () => {
  before(async () => {
    testAgent = await TestAgent.create();
  });

  beforeEach(async () => {
    await testAgent.clearStorage();
    ({ did } = await testAgent.createProfile());
  });

  after(async () => {
    await testAgent.clearStorage();
    await testAgent.closeStorage();
  });

  describe('processDwnRequest', () => {
    it('throws an error if DID doc is missing DWN service endoint', async () => {
      const dataBlob = new Blob(['Hello, world!']);
      const { did: aliceDid } = await testAgent.createProfile();

      await expect(testAgent.agent.processDwnRequest({
        author         : aliceDid,
        dataStream     : dataBlob,
        encrypt        : true,
        messageOptions : { dataFormat: 'text/plain' },
        messageType    : 'RecordsWrite',
        target         : aliceDid
      })).to.eventually.be.rejectedWith('service endpoint defined in DID document');
    });

    it('throws an error if DID doc is missing record encryption keys', async () => {
      const dataBlob = new Blob(['Hello, world!']);
      const testProfileOptions = await testProfile.ion.with.dwn.service.and.authorization.keys();
      const { did: aliceDid } = await testAgent.createProfile(testProfileOptions);

      await expect(testAgent.agent.processDwnRequest({
        author         : aliceDid,
        dataStream     : dataBlob,
        encrypt        : true,
        messageOptions : { dataFormat: 'text/plain' },
        messageType    : 'RecordsWrite',
        target         : aliceDid
      })).to.eventually.be.rejectedWith(`no 'recordEncryptionKeys' defined`);
    });

    it('throws an error if record encryption key ID cannot be found in DID document', async () => {
      const dataBlob = new Blob(['Hello, world!']);
      const testProfileOptions = {
        keys: [
          await testProfile.keys.secp256k1.jwk.authorization(),
          await testProfile.keys.secp256k1.jwk.encryption()
        ],
        services: [{
          'id'              : 'dwn',
          'type'            : 'DecentralizedWebNode',
          'serviceEndpoint' : {
            'nodes'                    : ['https://dwn-host.com'],
            'messageAuthorizationKeys' : ['#authz'],
            'recordEncryptionKeys'     : ['#wrong']
          }
        }]
      };
      const { did: aliceDid } = await testAgent.createProfile({
        profileDidOptions: testProfileOptions
      });

      await expect(testAgent.agent.processDwnRequest({
        author         : aliceDid,
        dataStream     : dataBlob,
        encrypt        : true,
        messageOptions : { dataFormat: 'text/plain' },
        messageType    : 'RecordsWrite',
        target         : aliceDid
      })).to.eventually.be.rejectedWith(`no '#wrong' verification method defined`);
    });

    describe('handles a RecordsWrite with encrypt: true', () => {
      it('with DataFormats key derivation', async () => {
        const dataBlob = new Blob(['Hello, world!']);
        const testProfileOptions = await testProfile.ion.with.dwn.service.and.authorization.encryption.keys();
        const { did: aliceDid } = await testAgent.createProfile(testProfileOptions);

        const response = await testAgent.agent.processDwnRequest({
          author         : aliceDid,
          dataStream     : dataBlob,
          encrypt        : true,
          messageOptions : { dataFormat: 'text/plain' },
          messageType    : 'RecordsWrite',
          target         : aliceDid
        });
        const message = response.message as RecordsWriteMessage;
        const status = response.reply.status as MessageReply['status'];

        expect(status.code).to.equal(202);
        expect(message.encryption).to.exist;
        expect(message?.encryption?.keyEncryption).to.have.length(1);
        expect(message?.encryption?.keyEncryption[0]).to.have.property('derivationScheme', 'dataFormats');
      });

      it('with DataFormats and Schemas key derivation', async () => {
        const dataBlob = new Blob(['Hello, world!']);
        const testProfileOptions = await testProfile.ion.with.dwn.service.and.authorization.encryption.keys();
        const { did: aliceDid } = await testAgent.createProfile(testProfileOptions);

        const response = await testAgent.agent.processDwnRequest({
          author         : aliceDid,
          dataStream     : dataBlob,
          encrypt        : true,
          messageOptions : {
            dataFormat : 'text/plain',
            schema     : 'https://protocols.xyz/schemas/music-playlist'
          },
          messageType : 'RecordsWrite',
          target      : aliceDid
        });

        const message = response.message as RecordsWriteMessage;
        const status = response.reply.status as MessageReply['status'];

        expect(status.code).to.equal(202);
        expect(message.encryption).to.exist;
        expect(message?.encryption?.keyEncryption).to.have.length(2);
        expect(message?.encryption?.keyEncryption[0]).to.have.property('derivationScheme', 'dataFormats');
        expect(message?.encryption?.keyEncryption[1]).to.have.property('derivationScheme', 'schemas');
      });

      it('with DataFormats, Schemas, and Protocols key derivation', async () => {
        // Create data to use to test encryption.
        const dataBlob = new Blob(['Hello, world!']);
        // Create an encryption subject to
        const testProfileOptions = await testProfile.ion.with.dwn.service.and.authorization.encryption.keys();
        const { did: aliceDid } = await testAgent.createProfile(testProfileOptions);

        // First configure a protocol on the agent-connected DWN.
        const protocolsConfigureResponse = await testAgent.agent.processDwnRequest({
          author         : aliceDid,
          messageOptions : { definition: messageProtocolDefinition },
          messageType    : 'ProtocolsConfigure',
          target         : aliceDid
        });
        expect(protocolsConfigureResponse.reply.status.code).to.equal(202);

        // Then try to process the RecordsWrite.
        const response = await testAgent.agent.processDwnRequest({
          author         : aliceDid,
          dataStream     : dataBlob,
          encrypt        : true,
          messageOptions : {
            dataFormat   : 'text/plain',
            protocol     : 'http://message-protocol.xyz',
            protocolPath : 'message',
            schema       : 'https://protocols.xyz/message/schema/message'
          },
          messageType : 'RecordsWrite',
          target      : aliceDid
        });

        const message = response.message as RecordsWriteMessage;
        const status = response.reply.status as MessageReply['status'];

        expect(status.code).to.equal(202);
        expect(message.encryption).to.exist;
        expect(message?.encryption?.keyEncryption).to.have.length(3);
        expect(message?.encryption?.keyEncryption[0]).to.have.property('derivationScheme', 'dataFormats');
        expect(message?.encryption?.keyEncryption[1]).to.have.property('derivationScheme', 'protocols');
        expect(message?.encryption?.keyEncryption[2]).to.have.property('derivationScheme', 'schemas');
      });
    });

    describe('handles a RecordsWrite with encrypt: { for: did }', () => {
      it('throws an error if `encrypt: { for: }` missing DID', async () => {
        const dataBlob = new Blob(['Hello, world!']);
        const testProfileOptions = await testProfile.ion.with.dwn.service.and.authorization.encryption.keys();
        const { did: aliceDid } = await testAgent.createProfile(testProfileOptions);

        await expect(testAgent.agent.processDwnRequest({
          author         : aliceDid,
          dataStream     : dataBlob,
          encrypt        : { for: undefined },
          messageOptions : { dataFormat: 'text/plain' },
          messageType    : 'RecordsWrite',
          target         : aliceDid
        })).to.eventually.be.rejectedWith('DID to encrypt for not provided');
      });

      it('with DataFormats key derivation', async () => {
        const dataBlob = new Blob(['Hello, world!']);
        const testProfileOptions = await testProfile.ion.with.dwn.service.and.authorization.encryption.keys();
        const { did: aliceDid } = await testAgent.createProfile(testProfileOptions);
        const { did: bobDid } = await testAgent.createProfile(testProfileOptions);

        const response = await testAgent.agent.processDwnRequest({
          author         : aliceDid,
          dataStream     : dataBlob,
          encrypt        : { for: bobDid },
          messageOptions : { dataFormat: 'text/plain' },
          messageType    : 'RecordsWrite',
          target         : aliceDid
        });

        const message = response.message as RecordsWriteMessage;
        const status = response.reply.status as MessageReply['status'];

        expect(status.code).to.equal(202);
        expect(message.encryption).to.exist;
        expect(message?.encryption?.keyEncryption).to.have.length(1);
        expect(message?.encryption?.keyEncryption[0]).to.have.property('derivationScheme', 'dataFormats');
      });
    });
  });

  describe('sendDwnRequest', () => {
    it('throws an exception if target DID has no #dwn service endpoints', async () => {
      try {
        await testAgent.agent.sendDwnRequest({
          author         : did,
          target         : did,
          messageType    : 'RecordsQuery',
          messageOptions : {
            filter: {
              schema: 'https://schemas.xyz/example'
            }
          }
        });

        expect.fail();
      } catch(e) {
        expect(e.message).to.include(`has no '#dwn' service endpoints`);
      }
    });

    it('handles RecordsQuery Messages', async () => {
      const { did: aliceDid } = await testAgent.createProfile({
        profileDidOptions: {
          services: [{
            type            : 'dwn',
            id              : 'dwn',
            serviceEndpoint : {
              nodes: dwnNodes
            }
          }]
        }
      });

      const response = await testAgent.agent.sendDwnRequest({
        author         : aliceDid,
        target         : aliceDid,
        messageType    : 'RecordsQuery',
        messageOptions : {
          filter: {
            schema: 'https://schemas.xyz/example'
          }
        }
      });

      expect(response.reply).to.exist;
      expect(response.message).to.exist;
      expect(response.messageCid).to.exist;
      expect(response.reply.status).to.exist;
      expect(response.reply.entries).to.exist;
      expect(response.reply.status.code).to.equal(200);
    });

    it('handles RecordsDelete Messages', async () => {
      const { did: aliceDid } = await testAgent.createProfile({
        profileDidOptions: {
          services: [{
            type            : 'dwn',
            id              : 'dwn',
            serviceEndpoint : {
              nodes: dwnNodes
            }
          }]
        }
      });

      const response = await testAgent.agent.sendDwnRequest({
        author         : aliceDid,
        target         : aliceDid,
        messageType    : 'RecordsDelete',
        messageOptions : {
          recordId: 'abcd123'
        }
      });

      expect(response.reply).to.exist;
      expect(response.reply.status).to.exist;
      expect(response.reply.status.code).to.equal(404);
    });

    it('throws an error when DwnRequest fails validation', async () => {
      const { did: aliceDid } = await testAgent.createProfile({
        profileDidOptions: {
          services: [{
            type            : 'dwn',
            id              : 'dwn',
            serviceEndpoint : {
              nodes: dwnNodes
            }
          }]
        }
      });

      try {
        await testAgent.agent.sendDwnRequest({
          author         : aliceDid,
          target         : aliceDid,
          messageType    : 'RecordsQuery',
          messageOptions : {
            filter: true
          }
        });
        expect.fail();
      } catch(e) {
        expect(e.message).to.include('/descriptor/filter');
      }
    });

    it('handles RecordsRead Messages', async () => {
      const { did: aliceDid } = await testAgent.createProfile({
        profileDidOptions: {
          services: [{
            type            : 'dwn',
            id              : 'dwn',
            serviceEndpoint : {
              nodes: dwnNodes
            }
          }]
        }
      });

      const dataBytes = Encoder.stringToBytes('hi');

      let response = await testAgent.agent.sendDwnRequest({
        author         : aliceDid,
        target         : aliceDid,
        messageType    : 'RecordsWrite',
        messageOptions : {
          dataFormat : 'text/plain',
          data       : dataBytes
        },
        dataStream: new Blob([dataBytes])
      });

      const message = response.message as RecordsWriteMessage;

      response = await testAgent.agent.sendDwnRequest({
        author         : aliceDid,
        target         : aliceDid,
        messageType    : 'RecordsRead',
        messageOptions : {
          recordId: message.recordId
        }
      });

      expect(response.reply.status.code).to.equal(200);
      expect(response.message).to.exist;

      const readMessage = response.message as RecordsRead['message'];
      expect(readMessage.descriptor.method).to.equal('Read');
      expect(readMessage.descriptor.interface).to.equal('Records');

      expect(response.reply['record']).to.exist;

      const record = response.reply['record'] as RecordsWriteMessage & { data: ReadableStream };
      expect(record.recordId).to.equal(message.recordId);

      expect(record.data).to.exist;
      expect(record.data instanceof ReadableStream).to.be.true;

      const { value } = await record.data.getReader().read();
      expect(dataBytes).to.eql(value);
    });
  });
});