
import sinon from 'sinon';

import { expect } from 'chai';

import { utils as cryptoUtils } from '@web5/crypto';

import { testDwnUrl } from '../../utils/test-config.js';

import { HttpWeb5RpcClient } from '../../../src/prototyping/clients/http-clients.js';
import { Persona, TestDataGenerator } from '@tbd54566975/dwn-sdk-js';
import { DidRpcMethod } from '../../../src/prototyping/clients/web5-rpc-types.js';
import { JsonRpcErrorCodes, createJsonRpcErrorResponse, createJsonRpcSuccessResponse } from '../../../src/prototyping/clients/json-rpc.js';
import { DwnServerInfoCacheMemory } from '../../../src/prototyping/clients/dwn-server-info-cache-memory.js';

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

  describe('getServerInfo',() => {
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

    it('should accept an override server info cache', async () => {
      const serverInfoCacheStub = sinon.createStubInstance(DwnServerInfoCacheMemory);
      const client = new HttpWeb5RpcClient(serverInfoCacheStub);
      await client.getServerInfo(testDwnUrl);

      expect(serverInfoCacheStub.get.callCount).to.equal(1);
    });
  });
});