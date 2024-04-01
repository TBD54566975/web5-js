
import sinon from 'sinon';

import { expect } from 'chai';

import { testDwnUrl } from '../../utils/test-config.js';

import { WebSocketWeb5RpcClient } from '../../../src/prototyping/clients/web-socket-clients.js';
import { Persona, TestDataGenerator } from '@tbd54566975/dwn-sdk-js';
import { DidRpcMethod } from '../../../src/prototyping/clients/web5-rpc-types.js';

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

  describe('getServerInfo', () => {
    it('server info requests are not supported over sockets', async () => {
      try {
        await client.getServerInfo('http://some-url.com');
        expect.fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.message).to.equal('not implemented for transports [ws:, wss:]');
      }
    });
  });
});