
import sinon from 'sinon';

import { expect } from 'chai';

import { WebSocketWeb5RpcClient } from '../../../src/prototyping/clients/web-socket-clients.js';
import { Persona, TestDataGenerator } from '@tbd54566975/dwn-sdk-js';
import { DidRpcMethod } from '../../../src/prototyping/clients/web5-rpc-types.js';
import { Web5RpcClient } from '../../../src/prototyping/clients/web5-rpc-client.js';
import { HttpWeb5RpcClient } from '../../../src/prototyping/clients/http-clients.js';

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