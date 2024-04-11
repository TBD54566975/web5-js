import type { Persona, RecordsWriteMessage } from '@tbd54566975/dwn-sdk-js';

import sinon from 'sinon';

import { expect } from 'chai';

import { DwnInterfaceName, DwnMethodName, RecordsRead, TestDataGenerator } from '@tbd54566975/dwn-sdk-js';
import { WebSocketDwnRpcClient } from '../../../src/prototyping/clients/web-socket-clients.js';

import { testDwnUrl } from '../../utils/test-config.js';
import { JsonRpcSocket } from '../../../src/prototyping/clients/json-rpc-socket.js';
import { JsonRpcErrorCodes, createJsonRpcErrorResponse } from '../../../src/prototyping/clients/json-rpc.js';
import { HttpDwnRpcClient } from '../../../src/prototyping/clients/http-dwn-rpc-client.js';
import { DwnEventSubscriptionHandler } from '../../../src/prototyping/clients/dwn-rpc-types.js';

/** helper method to sleep while waiting for events to process/arrive */
async function sleepWhileWaitingForEvents(override?: number):Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, override || 10));
}

describe('WebSocketDwnRpcClient', () => {
  const client = new WebSocketDwnRpcClient();
  const httpClient = new HttpDwnRpcClient();
  let alice: Persona;
  let socketDwnUrl: string;


  beforeEach(async () => {
    // we set the client to a websocket url
    const dwnUrl = new URL(testDwnUrl);
    dwnUrl.protocol = dwnUrl.protocol === 'http:' ? 'ws:' : 'wss:';
    socketDwnUrl = dwnUrl.toString();

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
        dwnUrl    : socketDwnUrl,
        targetDid : alice.did,
        message,
      });

      // should return success but without any records as none exist yet
      expect(response.status.code).to.equal(200);
      expect(response.entries).to.exist;
      expect(response.entries?.length).to.equal(0);
    });

    it('only supports WebSocket and Secure WebSocket protocols', async () => {
      // deliberately set 'http' as the protocol
      const dwnUrl = new URL(testDwnUrl);
      dwnUrl.protocol = 'http:';
      const httpDwnUrl = dwnUrl.toString();

      // create a generic records query
      const { message } = await TestDataGenerator.generateRecordsQuery({
        author : alice,
        filter : {
          schema: 'foo/bar'
        }
      });

      try {
        await client.sendDwnRequest({
          dwnUrl    : httpDwnUrl,
          targetDid : alice.did,
          message,
        });
        expect.fail('Expected an error to be thrown');
      } catch (error: any) {
        expect(error.message).to.equal('Invalid websocket protocol http:');
      }
    });

    it('rejects invalid connection', async () => {

      // create a generic records query
      const { message } = await TestDataGenerator.generateRecordsQuery({
        author : alice,
        filter : {
          schema: 'foo/bar'
        }
      });

      // avoid print default error logging
      sinon.stub(console, 'error');

      try {
        await client.sendDwnRequest({
          dwnUrl    : 'ws://127.0.0.1:10', // invalid host
          targetDid : alice.did,
          message,
        }, { connectTimeout: 5 }); // set a short connect timeout
        expect.fail('Expected an error to be thrown');
      } catch (error: any) {
        expect(error.message).to.include('Error connecting to 127.0.0.1:10');
      }
    });

    it('responds to a RecordsRead message', async () => {
      // create a generic record with schema `foo/bar`
      const { message: writeMessage, dataBytes } = await TestDataGenerator.generateRecordsWrite({
        author : alice,
        schema : 'foo/bar'
      });

      // write the message using the http client as we currently do not support `RecordsWrite` via sockets.
      const writeResponse = await httpClient.sendDwnRequest({
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

      // now we send a `RecordsRead` request using the socket client
      const readResponse = await client.sendDwnRequest({
        dwnUrl    : socketDwnUrl,
        targetDid : alice.did,
        message   : readMessage,
      });

      // should return success, and the record we inserted
      expect(readResponse.status.code).to.equal(200);
      expect(readResponse.record).to.exist;
      expect(readResponse.record?.recordId).to.equal(writeMessage.recordId);
    });

    it('subscribes to updates to a record', async () => {
      // create an initial record, we will subscribe to updates of this record
      const { message: writeMessage, dataBytes, recordsWrite } = await TestDataGenerator.generateRecordsWrite({
        author : alice,
        schema : 'foo/bar'
      });

      // write the message using the http client as we currently do not support `RecordsWrite` via sockets.
      const writeResponse = await httpClient.sendDwnRequest({
        dwnUrl    : testDwnUrl,
        targetDid : alice.did,
        message   : writeMessage,
        data      : dataBytes,
      });
      expect(writeResponse.status.code).to.equal(202);

      // create a subscription
      const { message: subscribeMessage } = await TestDataGenerator.generateRecordsSubscribe({
        author : alice,
        filter : {
          recordId: writeMessage.recordId,
        }
      });

      const dataCids:string[] = [];
      const subscriptionHandler: DwnEventSubscriptionHandler = (event) => {
        const { message, initialWrite } = event;
        expect(initialWrite!.recordId).to.equal(writeMessage.recordId);
        expect(initialWrite!.descriptor.dataCid).to.equal(writeMessage.descriptor.dataCid);
        if (message.descriptor.interface + message.descriptor.method === DwnInterfaceName.Records + DwnMethodName.Write) {
          dataCids.push((message as RecordsWriteMessage).descriptor.dataCid);
        }
      };

      const subscribeResponse = await client.sendDwnRequest({
        dwnUrl    : socketDwnUrl,
        targetDid : alice.did,
        message   : subscribeMessage,
        subscriptionHandler
      });
      expect(subscribeResponse.status.code).to.equal(200);
      expect(subscribeResponse.subscription).to.exist;

      // update the record
      const { message: update1, recordsWrite: updateWrite, dataBytes: update1Data } = await TestDataGenerator.generateFromRecordsWrite({
        existingWrite : recordsWrite,
        author        : alice,
      });

      let updateReply = await httpClient.sendDwnRequest({
        dwnUrl    : testDwnUrl,
        targetDid : alice.did,
        message   : update1,
        data      : update1Data,
      });
      expect(updateReply.status.code).to.equal(202);

      // make another update
      const { message: update2, dataBytes: update2Data } = await TestDataGenerator.generateFromRecordsWrite({
        existingWrite : updateWrite,
        author        : alice,
      });
      updateReply = await httpClient.sendDwnRequest({
        dwnUrl    : testDwnUrl,
        targetDid : alice.did,
        message   : update2,
        data      : update2Data,
      });
      expect(updateReply.status.code).to.equal(202);

      // wait for events to emit
      await sleepWhileWaitingForEvents();
      await subscribeResponse.subscription!.close();

      expect(dataCids).to.have.members([
        update1.descriptor.dataCid,
        update2.descriptor.dataCid
      ]);
    });

    describe('processMessage', () => {
      it('throws when json rpc response errors are returned', async () => {
        const { message } = await TestDataGenerator.generateRecordsQuery({
          author : alice,
          filter : {
            schema: 'foo/bar'
          }
        });

        const socket = await JsonRpcSocket.connect(socketDwnUrl);
        const connection = {
          subscriptions: new Map(),
          socket,
        };

        sinon.stub(socket, 'request').resolves({
          jsonrpc : '2.0',
          id      : 'id',
          error   : { message: 'some error',code: JsonRpcErrorCodes.BadRequest }
        });

        try {
          await WebSocketDwnRpcClient['processMessage'](connection, alice.did, message);
          expect.fail('Expected an error to be thrown');
        } catch(error: any) {
          expect(error.message).to.equal('error sending DWN request: some error');
        }
      });
    });

    describe('subscriptionRequest', () => {
      it('throws when json rpc response errors are returned', async () => {
        const { message } = await TestDataGenerator.generateRecordsQuery({
          author : alice,
          filter : {
            schema: 'foo/bar'
          }
        });

        const socket = await JsonRpcSocket.connect(socketDwnUrl);
        const connection = {
          subscriptions: new Map(),
          socket,
        };

        sinon.stub(socket, 'subscribe').resolves({
          response: {
            jsonrpc : '2.0',
            id      : 'id',
            error   : { message: 'some error',code: JsonRpcErrorCodes.BadRequest }
          }
        });

        try {
          await WebSocketDwnRpcClient['subscriptionRequest'](connection, alice.did, message, () => {});
          expect.fail('Expected an error to be thrown');
        } catch (error: any) {
          expect(error.message).to.equal('could not subscribe via jsonrpc socket: some error');
        }
      });

      it('close and clean up subscription when emitted an json rpc error response in the handler', async () => {
        const { message } = await TestDataGenerator.generateRecordsQuery({
          author : alice,
          filter : {
            schema: 'foo/bar'
          }
        });

        const socket = await JsonRpcSocket.connect(socketDwnUrl);
        const subscriptions = new Map();
        const connection = {
          subscriptions,
          socket,
        };

        const subscribeStub = sinon.stub(socket, 'subscribe').resolves({
          response: {
            jsonrpc : '2.0',
            id      : 'id',
            result  : {
              reply: {
                status       : { code: 200, detail: 'Ok' },
                subscription : {
                  id    : 'sub-id',
                  close : () => {}
                }
              }
            }
          }
        });

        const processMessage = await WebSocketDwnRpcClient['subscriptionRequest'](connection, alice.did, message, () => {});
        expect(processMessage.status.code).to.equal(200);
        const subscriptionCallArgs = [...subscribeStub.args][0];
        const subRequest = subscriptionCallArgs[0];
        const subHandler = subscriptionCallArgs[1];

        // get the subscription Id from the request, and add a mock subscription to the subscriptions map
        const subscriptionId = subRequest.subscription!.id;
        const subscription = {
          id    : subscriptionId,
          close : () => {}
        };
        // spy on the close function
        const closeSpy = sinon.spy(subscription, 'close');

        // add to the subscriptions map
        subscriptions.set(subscriptionId, subscription);

        const jsonError = createJsonRpcErrorResponse('id', JsonRpcErrorCodes.BadRequest, 'some error');
        subHandler(jsonError);

        // confirm close was called and subscription was removed
        expect(closeSpy.callCount).to.equal(1);
        expect(subscriptions.size).to.equal(0);
      });
    });
  });
});