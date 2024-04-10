
import sinon from 'sinon';

import { expect } from 'chai';

import { utils as cryptoUtils } from '@web5/crypto';

import { testDwnUrl } from '../../utils/test-config.js';

import { HttpWeb5RpcClient } from '../../../src/prototyping/clients/http-clients.js';
import { Persona, TestDataGenerator } from '@tbd54566975/dwn-sdk-js';
import { DidRpcMethod } from '../../../src/prototyping/clients/web5-rpc-types.js';
import { JsonRpcErrorCodes, createJsonRpcErrorResponse, createJsonRpcSuccessResponse } from '../../../src/prototyping/clients/json-rpc.js';

describe('HttpWeb5RpcClient', () => {
  let alice: Persona;
  let client: HttpWeb5RpcClient;

  beforeEach(async () => {
    sinon.restore();

    client = new HttpWeb5RpcClient();
    alice = await TestDataGenerator.generateDidKeyPersona();
  });

  describe('sendDwnRequest', () => {
    it('supports sending dwn requests', async () => {
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
  });

  describe('sendDidRequest', () => {
    it('should throw if json rpc server responds with an error', async () => {
      const request = { method: DidRpcMethod.Resolve, url: testDwnUrl, data: 'some-data' };

      const requestId = cryptoUtils.randomUuid();
      const jsonRpcResponse = createJsonRpcErrorResponse(
        requestId,
        JsonRpcErrorCodes.InternalError,
        'some error'
      );
      const mockResponse = new Response(JSON.stringify(jsonRpcResponse));
      sinon.stub(globalThis, 'fetch').resolves(mockResponse);

      try {
        await client.sendDidRequest(request);
        expect.fail('Expected an error to be thrown');
      } catch(error: any) {
        expect(error.message).to.contain(`Error encountered while processing response from ${testDwnUrl}`);
      }
    });

    it('should throw if http response does not return ok', async () => {
      const request = { method: DidRpcMethod.Resolve, url: testDwnUrl, data: 'some-data' };

      const mockResponse = new Response(JSON.stringify({}), { status: 500 });
      sinon.stub(globalThis, 'fetch').resolves(mockResponse);

      try {
        await client.sendDidRequest(request);
        expect.fail('Expected an error to be thrown');
      } catch(error: any) {
        expect(error.message).to.contain(`Error encountered while processing response from ${testDwnUrl}`);
      }
    });

    it('should return json rpc result', async () => {
      const request = { method: DidRpcMethod.Resolve, url: testDwnUrl, data: 'some-data' };

      const requestId = cryptoUtils.randomUuid();
      const jsonRpcResponse = createJsonRpcSuccessResponse(
        requestId,
        { status: { code: 200 }, data: 'data' }
      );
      const mockResponse = new Response(JSON.stringify(jsonRpcResponse));
      sinon.stub(globalThis, 'fetch').resolves(mockResponse);

      const response = await client.sendDidRequest(request);
      expect(response.status.code).to.equal(200);
      expect(response.data).to.equal('data');
    });
  });
});