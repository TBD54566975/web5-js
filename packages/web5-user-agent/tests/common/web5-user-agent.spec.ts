import { expect } from 'chai';
import { Encoder, RecordsWriteMessage, RecordsRead } from '@tbd54566975/dwn-sdk-js';
import { TestAgent } from './utils/test-user-agent.js';

// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;

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