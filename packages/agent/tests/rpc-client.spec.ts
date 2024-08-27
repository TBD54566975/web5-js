import sinon from 'sinon';
import { expect } from 'chai';
import { testDwnUrl } from './utils/test-config.js';
import { CryptoUtils } from '@web5/crypto';

import { DidRpcMethod, HttpWeb5RpcClient, Web5RpcClient, WebSocketWeb5RpcClient } from '../src/rpc-client.js';
import { DwnServerInfoCacheMemory } from '../src/prototyping/clients/dwn-server-info-cache-memory.js';
import { HttpDwnRpcClient } from '../src/prototyping/clients/http-dwn-rpc-client.js';
import { Persona, TestDataGenerator } from '@tbd54566975/dwn-sdk-js';
import { JsonRpcErrorCodes, createJsonRpcErrorResponse, createJsonRpcSuccessResponse } from '../src/prototyping/clients/json-rpc.js';

describe('RPC Clients', () => {
  describe('HttpDwnRpcClient', () => {
    let client: HttpDwnRpcClient;

    beforeEach(async () => {
      sinon.restore();
      client = new HttpDwnRpcClient();
    });

    after(() => {
      sinon.restore();
    });

    it('should retrieve subsequent result from cache', async () => {
      // we spy on fetch to see how many times it is called
      const fetchSpy = sinon.spy(globalThis, 'fetch');

      // fetch info first, currently not in cache should call fetch
      const serverInfo = await client.getServerInfo(testDwnUrl);
      expect(fetchSpy.callCount).to.equal(1);

      // confirm it exists in cache
      const cachedResult = await client['serverInfoCache'].get(testDwnUrl);
      expect(cachedResult).to.equal(serverInfo);

      // make another call and confirm that fetch ahs not been called again
      const serverInfo2 = await client.getServerInfo(testDwnUrl);
      expect(fetchSpy.callCount).to.equal(1); // should still equal only 1
      expect(cachedResult).to.equal(serverInfo2);

      // delete the cache entry to force a fetch call
      await client['serverInfoCache'].delete(testDwnUrl);
      const noResult = await client['serverInfoCache'].get(testDwnUrl);
      expect(noResult).to.equal(undefined);

      // make a third call and confirm that a new fetch request was made and data is in the cache
      const serverInfo3 = await client.getServerInfo(testDwnUrl);
      expect(fetchSpy.callCount).to.equal(2); // another fetch call was made
      const cachedResult2 = await client['serverInfoCache'].get(testDwnUrl);
      expect(cachedResult2).to.equal(serverInfo3);
    });

    it('should accept an override server info cache', async () => {
      const serverInfoCacheStub = sinon.createStubInstance(DwnServerInfoCacheMemory);
      const client = new HttpDwnRpcClient(serverInfoCacheStub);
      await client.getServerInfo(testDwnUrl);

      expect(serverInfoCacheStub.get.callCount).to.equal(1);
    });
  });

  describe('Web5RpcClient', () => {
    let alice: Persona;

    beforeEach(async () => {
      sinon.restore();

      alice = await TestDataGenerator.generateDidKeyPersona();
    });

    after(() => {
      sinon.restore();
    });

    it('returns available transports', async () => {
      const httpOnlyClient = new Web5RpcClient();

      expect(httpOnlyClient.transportProtocols).to.have.members([
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
        const client = new Web5RpcClient();

        // request with foo transport
        const request = { method: DidRpcMethod.Resolve, url: 'foo://127.0.0.1', data: 'some-data' };
        try {
          await client.sendDidRequest(request);
          expect.fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.message).to.equal('no foo: transport client available');
        }
      });

      it('should throw if transport is sockets', async () => {
        const socketClientSpy = sinon.spy(WebSocketWeb5RpcClient.prototype, 'sendDidRequest');
        const client = new Web5RpcClient();

        for (const transport of ['ws:', 'wss:']) {
        // request with ws transport
          try {
            const request = { method: DidRpcMethod.Resolve, url: `${transport}//127.0.0.1`, data: 'some-data' };
            await client.sendDidRequest(request);
            expect.fail('Expected error to be thrown');
          } catch (error: any) {
            expect(error.message).to.equal('not implemented for transports [ws:, wss:]');
          }
        }

        // confirm it was called once per each transport
        expect(socketClientSpy.callCount).to.equal(2);
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
        const client = new Web5RpcClient();
        const { message } = await TestDataGenerator.generateRecordsQuery({
          author : alice,
          filter : {
            schema: 'foo/bar'
          }
        });

        try {
          // request with foo transport
          await client.sendDwnRequest({
            dwnUrl    : 'foo://127.0.0.1',
            targetDid : alice.did,
            message,
          });
          expect.fail('Expected error to be thrown');
        } catch(error: any) {
          expect(error.message).to.equal('no foo: transport client available');
        }
      });
    });

    describe('getServerInfo',() => {
      let client: Web5RpcClient;

      after(() => {
        sinon.restore();
      });

      beforeEach(async () => {
        sinon.restore();
        client = new Web5RpcClient();
      });

      it('is able to get server info', async () => {
        const serverInfo = await client.getServerInfo(testDwnUrl);
        expect(serverInfo.registrationRequirements).to.not.be.undefined;
        expect(serverInfo.maxFileSize).to.not.be.undefined;
        expect(serverInfo.webSocketSupport).to.not.be.undefined;
      });

      it('throws for an invalid response', async () => {
        const mockResponse = new Response(JSON.stringify({}), { status: 500 });
        sinon.stub(globalThis, 'fetch').resolves(mockResponse);

        try {
          await client.getServerInfo(testDwnUrl);
          expect.fail('Expected an error to be thrown');
        } catch(error: any) {
          expect(error.message).to.contain('HTTP (500)');
        }
      });

      it('should append url with info path accounting for trailing slash', async () => {
        const fetchStub = sinon.stub(globalThis, 'fetch').resolves(new Response(JSON.stringify({
          registrationRequirements : [],
          maxFileSize              : 123,
          webSocketSupport         : false,
        })));

        await client.getServerInfo('http://some-domain.com/dwn'); // without trailing slash
        let fetchUrl = fetchStub.args[0][0];
        expect(fetchUrl).to.equal('http://some-domain.com/dwn/info');

        // we reset the fetch stub and initiate a new response
        // this wa the response body stream won't be attempt to be read twice and fail on the 2nd attempt.
        fetchStub.reset();
        fetchStub.resolves(new Response(JSON.stringify({
          registrationRequirements : [],
          maxFileSize              : 123,
          webSocketSupport         : false,
        })));

        await client.getServerInfo('http://some-other-domain.com/dwn/'); // with trailing slash
        fetchUrl = fetchStub.args[0][0];
        expect(fetchUrl).to.equal('http://some-other-domain.com/dwn/info');
      });

      it('should throw if transport client is not found', async () => {
        const client = new Web5RpcClient();

        // request with foo transport
        try {
          await client.getServerInfo('foo://127.0.0.1');
          expect.fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.message).to.equal('no foo: transport client available');
        }
      });

      it('should throw if transport is sockets', async () => {
        const socketClientSpy = sinon.spy(WebSocketWeb5RpcClient.prototype, 'getServerInfo');
        const client = new Web5RpcClient();

        for (const transport of ['ws:', 'wss:']) {
        // request with ws transport
          try {
            await client.getServerInfo(`${transport}//127.0.0.1`);
            expect.fail('Expected error to be thrown');
          } catch (error: any) {
            expect(error.message).to.equal('not implemented for transports [ws:, wss:]');
          }
        }

        // confirm it was called once per each transport
        expect(socketClientSpy.callCount).to.equal(2);
      });
    });
  });

  describe('HttpWeb5RpcClient', () => {
    let alice: Persona;
    let client: HttpWeb5RpcClient;

    after(() => {
      sinon.restore();
    });

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

        const requestId = CryptoUtils.randomUuid();
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

        const requestId = CryptoUtils.randomUuid();
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

    after(() => {
      sinon.restore();
    });

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

    describe('getServerInfo', () => {
      it('server info requests are not supported over sockets', async () => {
        try {
          await client.getServerInfo(socketDwnUrl);
          expect.fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.message).to.equal('not implemented for transports [ws:, wss:]');
        }
      });
    });
  });
});
