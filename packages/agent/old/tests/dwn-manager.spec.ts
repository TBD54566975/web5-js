import chai, { expect } from 'chai';
import { Convert } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';
import {
  Dwn,
  Message,
  RecordsRead,
  EventsGetReply,
  EventsGetMessage,
  MessagesGetReply,
  RecordsQueryReply,
  UnionMessageReply,
  MessagesGetMessage,
  RecordsQueryMessage,
  RecordsWriteMessage,
  RecordsDeleteMessage,
  ProtocolsConfigureMessage,
} from '@tbd54566975/dwn-sdk-js';

import { testDwnUrl } from './utils/test-config.js';
import { TestAgent } from './utils/test-agent.js';
import { DwnManager } from '../src/dwn-manager.js';
import { ManagedIdentity } from '../src/identity-manager.js';
import { TestManagedAgent } from '../src/test-managed-agent.js';
import emailProtocolDefinition from './fixtures/protocol-definitions/email.json' assert { type: 'json' };

// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';

// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;

chai.use(chaiAsPromised);

let testDwnUrls: string[] = [testDwnUrl];

describe('DwnManager', () => {

  describe(`with dwn data stores`, () => {
    let testAgent: TestManagedAgent;

    before(async () => {
      testAgent = await TestManagedAgent.create({
        agentClass  : TestAgent,
        agentStores : 'dwn'
      });
    });

    after(async () => {
      await testAgent.clearStorage();
      await testAgent.closeStorage();
    });

    describe('sendDwnRequest()', () => {
      let identity: ManagedIdentity;

      before(async () => {
        await testAgent.createAgentDid();

        const services = [{
          id              : '#dwn',
          type            : 'DecentralizedWebNode',
          serviceEndpoint : {
            encryptionKeys : ['#dwn-enc'],
            nodes          : testDwnUrls,
            signingKeys    : ['#dwn-sig']
          }
        }];

        // Creates a new Identity to author the DWN messages.
        identity = await testAgent.agent.identityManager.create({
          name       : 'Alice',
          didMethod  : 'ion',
          didOptions : { services },
          kms        : 'local'
        });
      });

      after(async () => {
        await testAgent.clearStorage();
      });

      it('handles RecordsDelete Messages', async () => {
        const response = await testAgent.agent.sendDwnRequest({
          author         : identity.did,
          target         : identity.did,
          messageType    : 'RecordsDelete',
          messageOptions : {
            recordId: 'abcd123'
          }
        });

        expect(response.reply).to.exist;
        expect(response.reply.status).to.exist;
        expect(response.reply.status.code).to.equal(404);
      });

      it('handles RecordsQuery Messages', async () => {
        const response = await testAgent.agent.sendDwnRequest({
          author         : identity.did,
          target         : identity.did,
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

      it('handles RecordsRead Messages', async () => {
        const dataBytes = Convert.string('Hi').toUint8Array();

        let response = await testAgent.agent.sendDwnRequest({
          author         : identity.did,
          target         : identity.did,
          messageType    : 'RecordsWrite',
          messageOptions : {
            dataFormat : 'text/plain',
            data       : dataBytes
          },
          dataStream: new Blob([dataBytes])
        });

        const message = response.message as RecordsWriteMessage;

        response = await testAgent.agent.sendDwnRequest({
          author         : identity.did,
          target         : identity.did,
          messageType    : 'RecordsRead',
          messageOptions : {
            filter: {
              recordId: message.recordId
            }
          }
        });

        expect(response.reply.status.code).to.equal(200);
        expect(response.message).to.exist;

        const readMessage = response.message as RecordsRead['message'];
        expect(readMessage.descriptor.method).to.equal('Read');
        expect(readMessage.descriptor.interface).to.equal('Records');

        const readReply = response.reply;
        expect(readReply.record).to.exist;

        const record = readReply.record as unknown as RecordsWriteMessage & { data: ReadableStream };
        expect(record.recordId).to.equal(message.recordId);

        expect(record.data).to.exist;
        expect(record.data instanceof ReadableStream).to.be.true;

        const { value } = await record.data.getReader().read();
        expect(dataBytes).to.eql(value);
      });

      it('throws an error when DwnRequest fails validation', async () => {
        await expect(
          testAgent.agent.sendDwnRequest({
            author         : identity.did,
            target         : identity.did,
            messageType    : 'RecordsQuery',
            messageOptions : {
              filter: true
            }
          })
        ).to.eventually.be.rejectedWith(Error, '/descriptor/filter: must NOT have fewer than 1 properties');
      });
    });
  });
});