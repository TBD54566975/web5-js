
import sinon from 'sinon';

import { expect } from 'chai';

import { utils as cryptoUtils } from '@web5/crypto';

import { testDwnUrl } from './utils/test-config.js';

import { DidRpcMethod, HttpWeb5RpcClient, Web5RpcClient, WebSocketWeb5RpcClient } from '../src/rpc-client.js';
import { Persona, TestDataGenerator } from '@tbd54566975/dwn-sdk-js';
import { JsonRpcErrorCodes, createJsonRpcErrorResponse, createJsonRpcSuccessResponse } from '../src/prototyping/clients/json-rpc.js';

describe('RPC Clients', () => {
  describe('Web5RpcClient', () => {
    let alice: Persona;
  
    beforeEach(async () => {
      sinon.restore();
  
      alice = await TestDataGenerator.generateDidKeyPersona();
    });
  
    it('returns available transports', async () => {
      const httpOnlyClient = new Web5RpcClient();
      expect(httpOnlyClient.transportProtocols).to.have.members(['http:', 'https:']);
  
      const wsAndHttpClients = new Web5RpcClient([
        new WebSocketWeb5RpcClient()
      ]);
  
      expect(wsAndHttpClients.transportProtocols).to.have.members([
        'http:',
        'https:',
        'ws:',
        'wss:'
      ]);
    });
  
    describe('sendDidRequest', () => {
      it('should send to the client depending on transport', async () => {
        const stubHttpClient = sinon.createStubInstance(HttpWeb5RpcClient);
        const httpOnlyClient = new Web5RpcClient([ stubHttpClient ]);
  
        // request with http
        const request = { method: DidRpcMethod.Resolve, url: 'http://127.0.0.1', data: 'some-data' };
        httpOnlyClient.sendDidRequest(request);
  
        expect(stubHttpClient.sendDidRequest.callCount).to.equal(1);
      });
  
      it('should throw if transport client is not found', async () => {
        const stubHttpClient = sinon.createStubInstance(HttpWeb5RpcClient);
        const httpOnlyClient = new Web5RpcClient([ stubHttpClient ]);
  
        // request with http
        const request = { method: DidRpcMethod.Resolve, url: 'ws://127.0.0.1', data: 'some-data' };
        try {
          await httpOnlyClient.sendDidRequest(request);
          expect.fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.message).to.equal('no ws: transport client available');
        }
  
        // confirm http transport was not called
        expect(stubHttpClient.sendDidRequest.callCount).to.equal(0);
      });
    });
  
    describe('sendDwnRequest', () => {
      it('should send to the client depending on transport', async () => {
        const stubHttpClient = sinon.createStubInstance(HttpWeb5RpcClient);
        const httpOnlyClient = new Web5RpcClient([ stubHttpClient ]);
        const { message } = await TestDataGenerator.generateRecordsQuery({
          author : alice,
          filter : {
            schema: 'foo/bar'
          }
        });
  
        // request with http
        await httpOnlyClient.sendDwnRequest({
          dwnUrl    : 'http://127.0.0.1',
          targetDid : alice.did,
          message,
        });
  
        // confirm http transport was called
        expect(stubHttpClient.sendDwnRequest.callCount).to.equal(1);
      });
  
      it('should throw if transport client is not found', async () => {
        const stubHttpClient = sinon.createStubInstance(HttpWeb5RpcClient);
        const httpOnlyClient = new Web5RpcClient([ stubHttpClient ]);
        const { message } = await TestDataGenerator.generateRecordsQuery({
          author : alice,
          filter : {
            schema: 'foo/bar'
          }
        });
  
        try {
          // request with ws
          await httpOnlyClient.sendDwnRequest({
            dwnUrl    : 'ws://127.0.0.1',
            targetDid : alice.did,
            message,
          });
          expect.fail('Expected error to be thrown');
        } catch(error: any) {
          expect(error.message).to.equal('no ws: transport client available');
        }
  
        // confirm http transport was not called
        expect(stubHttpClient.sendDwnRequest.callCount).to.equal(0);
      });
    });
  });

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

  describe('WebSocketWeb5RpcClient', () => {
    let alice: Persona;
    const client = new WebSocketWeb5RpcClient();
    // we set the client to a websocket url
    const dwnUrl = new URL(testDwnUrl);
    dwnUrl.protocol = dwnUrl.protocol === 'http:' ? 'ws:' : 'wss:';
    const socketDwnUrl = dwnUrl.toString();
  
    beforeEach(async () => {
      sinon.restore();
  
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
          dwnUrl    : socketDwnUrl,
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
      it('did requests are not supported over sockets', async () => {
        const request = { method: DidRpcMethod.Resolve, url: socketDwnUrl, data: 'some-data' };
        try {
          await client.sendDidRequest(request);
          expect.fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.message).to.equal('not implemented for transports [ws:, wss:]');
        }
      });
    });
  });
});