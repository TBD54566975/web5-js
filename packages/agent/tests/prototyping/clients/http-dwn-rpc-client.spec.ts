import type { Persona } from '@tbd54566975/dwn-sdk-js';

import sinon from 'sinon';
import { expect } from 'chai';

import { RecordsRead, TestDataGenerator } from '@tbd54566975/dwn-sdk-js';
import { HttpDwnRpcClient } from '../../../src/prototyping/clients/http-dwn-rpc-client.js';

import { testDwnUrl } from '../../utils/test-config.js';

describe('HttpDwnRpcClient', () => {
  const client = new HttpDwnRpcClient();
  let alice: Persona;

  beforeEach(async () => {
    sinon.restore();
    alice = await TestDataGenerator.generateDidKeyPersona();
  });

  after(() => {
    sinon.restore();
  });

  describe('sendDwnRequest', () => {
    it('sends request', async () => {
      // create a generic records query
      const { message } = await TestDataGenerator.generateRecordsQuery({
        author : alice,
        filter : {
          schema: 'foo/bar'
        }
      });

      const response = await client.sendDwnRequest({
        dwnUrl    : testDwnUrl,
        targetDid : alice.did,
        message,
      });

      // should return success but without any records as none exist yet
      expect(response.status.code).to.equal(200);
      expect(response.entries).to.exist;
      expect(response.entries?.length).to.equal(0);
    });

    it('send RecordsWrite message', async () => {
      // create a generic record with schema `foo/bar`
      const { message: writeMessage, dataBytes } = await TestDataGenerator.generateRecordsWrite({
        author : alice,
        schema : 'foo/bar'
      });

      const writeResponse = await client.sendDwnRequest({
        dwnUrl    : testDwnUrl,
        targetDid : alice.did,
        message   : writeMessage,
        data      : dataBytes,
      });
      expect(writeResponse.status.code).to.equal(202);

      // query for records matching the schema of the record we inserted
      const { message: readMessage } = await RecordsRead.create({
        signer : alice.signer,
        filter : {
          recordId: writeMessage.recordId,
        }
      });

      const readResponse = await client.sendDwnRequest({
        dwnUrl    : testDwnUrl,
        targetDid : alice.did,
        message   : readMessage,
      });

      // should return success, and the record we inserted
      expect(readResponse.status.code).to.equal(200);
      expect(readResponse.entry).to.exist;
      expect(readResponse.entry?.recordsWrite?.recordId).to.equal(writeMessage.recordId);
    });

    it('throws error if invalid response exists in the header', async () => {
      const headers = sinon.createStubInstance(Headers, { has: true });
      sinon.stub(globalThis, 'fetch').resolves({ headers } as any);

      // create a generic record with schema `foo/bar`
      const { message: writeMessage, dataBytes } = await TestDataGenerator.generateRecordsWrite({
        author : alice,
        schema : 'foo/bar'
      });


      try {
        await client.sendDwnRequest({
          dwnUrl    : testDwnUrl,
          targetDid : alice.did,
          message   : writeMessage,
          data      : dataBytes,
        });
        expect.fail('Expected an error to be thrown');
      } catch(error:any) {
        expect(error.message).to.include('failed to parse json rpc response.');
      }
    });

    it('throws error if rpc responds with an error', async () => {
      const headers = sinon.createStubInstance(Headers, {
        has : true,
        get : '{ "error": { "message": "message", "code":"code" } }'
      });
      sinon.stub(globalThis, 'fetch').resolves({ headers } as any);

      // create a generic record with schema `foo/bar`
      const { message: writeMessage, dataBytes } = await TestDataGenerator.generateRecordsWrite({
        author : alice,
        schema : 'foo/bar'
      });
      try {
        await client.sendDwnRequest({
          dwnUrl    : testDwnUrl,
          targetDid : alice.did,
          message   : writeMessage,
          data      : dataBytes,
        });
        expect.fail('Expected an error to be thrown');
      } catch(error: any) {
        expect(error.message).to.include('(code) - message');
      }
    });
  });
});