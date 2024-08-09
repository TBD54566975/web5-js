import { expect } from 'chai';

import sinon from 'sinon';

import { JsonRpcSocket } from '../../../src/prototyping/clients/json-rpc-socket.js';
import { CryptoUtils } from '@web5/crypto';
import { JsonRpcErrorCodes, JsonRpcResponse, createJsonRpcErrorResponse, createJsonRpcRequest, createJsonRpcSubscriptionRequest, createJsonRpcSuccessResponse } from '../../../src/prototyping/clients/json-rpc.js';
import { testDwnUrl } from '../../utils/test-config.js';
import { Persona, TestDataGenerator } from '@tbd54566975/dwn-sdk-js';

/** helper method to sleep while waiting for events to process/arrive */
async function sleepWhileWaitingForEvents(override?: number):Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, override || 10));
}

describe('JsonRpcSocket', () => {
  let alice: Persona;
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

  it('connects to a url', async () => {
    const client = await JsonRpcSocket.connect(socketDwnUrl);
    client.close();
  });

  it('generates a request id if one is not provided', async () => {
    const client = await JsonRpcSocket.connect(socketDwnUrl);
    const requestId = CryptoUtils.randomUuid();
    const request = createJsonRpcRequest(requestId, 'dwn.processMessage', { param1: 'test-param1', param2: 'test-param2' });
    delete request.id;

    const response = await client.request(request);
    expect(response.id).to.not.equal(requestId);
  });

  it('resolves a request with given params', async () => {
    const client = await JsonRpcSocket.connect(socketDwnUrl);
    const requestId = CryptoUtils.randomUuid();
    const request = createJsonRpcRequest(requestId, 'dwn.processMessage', { param1: 'test-param1', param2: 'test-param2' });
    const response = await client.request(request);
    expect(response.id).to.equal(request.id);
  });

  it('request times out', async () => {
    // time out after 1 ms
    const client = await JsonRpcSocket.connect(socketDwnUrl, { responseTimeout: 1 });
    const requestId = CryptoUtils.randomUuid();
    const request = createJsonRpcRequest(requestId, 'down.processMessage', { param1: 'test-param1', param2: 'test-param2' });
    try {
      await client.request(request);
      expect.fail('Expected an error to be thrown');
    } catch (error: any) {
      expect(error.message).to.contain('timed out');
    }
  });

  it('adds a handler to the messageHandlers map when listening for a response to a request', async () => {
    const client = await JsonRpcSocket.connect(socketDwnUrl);
    const { message } = await TestDataGenerator.generateRecordsSubscribe({ author: alice });
    const requestId = CryptoUtils.randomUuid();
    const request = createJsonRpcRequest(requestId, 'dwn.processMessage', { target: alice.did, message });
    const response = client.request(request);
    expect(client['messageHandlers'].has(requestId)).to.be.true;

    await response;

    // removes the handler after the response is received
    expect(client['messageHandlers'].has(requestId)).to.be.false;
  });

  it('adds a handler to the messageHandlers map when listening for a response to a subscription', async () => {
    const client = await JsonRpcSocket.connect(socketDwnUrl);
    const { message } = await TestDataGenerator.generateRecordsSubscribe({ author: alice });

    const requestId = CryptoUtils.randomUuid();
    const subscriptionId = CryptoUtils.randomUuid();
    const request = createJsonRpcSubscriptionRequest(
      requestId,
      'dwn.processMessage',
      subscriptionId,
      { target: alice.did, message }
    );

    const responseListener = (_response: JsonRpcResponse): void => {};
    const subscription = await client.subscribe(request, responseListener);
    expect(client['messageHandlers'].has(subscriptionId)).to.be.true;

    // removes the handler after the subscription is closed
    await subscription.close!();
    expect(client['messageHandlers'].has(subscriptionId)).to.be.false;
  });

  it('removes listener if subscription json rpc is rejected ', async () => {
    const client = await JsonRpcSocket.connect(socketDwnUrl);
    const requestId = CryptoUtils.randomUuid();
    const subscribeId = CryptoUtils.randomUuid();

    const request = createJsonRpcSubscriptionRequest(
      requestId,
      'dwn.processMessage',
      subscribeId,
      { },
    );

    const responseListener = (_response: JsonRpcResponse): void => {};

    const subscription = await client.subscribe(request, responseListener);
    expect(subscription.response.error).to.not.be.undefined;
    expect(client['messageHandlers'].has(subscribeId)).to.be.false;
  });

  it('opens a subscription', async () => {

    const client = await JsonRpcSocket.connect(socketDwnUrl);
    const { message } = await TestDataGenerator.generateRecordsSubscribe({ author: alice });

    const requestId = CryptoUtils.randomUuid();
    const subscriptionId = CryptoUtils.randomUuid();
    const request = createJsonRpcSubscriptionRequest(
      requestId,
      'dwn.processMessage',
      subscriptionId,
      { target: alice.did, message }
    );

    const responseListener = (_response: JsonRpcResponse): void => {};

    const subscription = await client.subscribe(request, responseListener);
    expect(subscription.response.error).to.be.undefined;
    // wait for the messages to arrive
    await sleepWhileWaitingForEvents();
    // the original response
    if (subscription.close) {
      await subscription.close();
    }
  });

  it('only JSON RPC Methods prefixed with `rpc.subscribe.` are accepted for a subscription', async () => {
    const client = await JsonRpcSocket.connect(socketDwnUrl);
    const requestId = CryptoUtils.randomUuid();
    const request = createJsonRpcRequest(requestId, 'test.method', { param1: 'test-param1', param2: 'test-param2' });
    try {
      await client.subscribe(request, () => {});
      expect.fail('Expected an error to be thrown');
    } catch(error: any) {
      expect(error.message).to.contain('subscribe rpc requests must include the `rpc.subscribe` prefix');
    }
  });

  it('subscribe methods must contain a subscribe object within the request which contains the subscription JsonRpcId', async () => {
    const client = await JsonRpcSocket.connect(socketDwnUrl);
    const requestId = CryptoUtils.randomUuid();
    const request = createJsonRpcRequest(requestId, 'rpc.subscribe.test.method', { param1: 'test-param1', param2: 'test-param2' });
    try {
      await client.subscribe(request, () => {});
      expect.fail('Expected an error to be thrown');
    } catch(error: any) {
      expect(error.message).to.contain('subscribe rpc requests must include subscribe options');
    }
  });

  it('calls onclose handler', async () => {
    // test injected handler
    const onCloseHandler = { onclose: ():void => {} };
    const onCloseSpy = sinon.spy(onCloseHandler, 'onclose');
    const client = await JsonRpcSocket.connect(socketDwnUrl, { onclose: onCloseHandler.onclose });
    client.close();

    await sleepWhileWaitingForEvents();
    expect(onCloseSpy.callCount).to.equal(1);

    // test default logger
    const logInfoSpy = sinon.stub(console, 'info');
    const defaultClient = await JsonRpcSocket.connect(socketDwnUrl);
    defaultClient.close();

    await sleepWhileWaitingForEvents();
    expect(logInfoSpy.callCount).to.equal(1);

    // extract log message from argument
    const logMessage:string = logInfoSpy.args[0][0]!;
    expect(logMessage).to.equal(`JSON RPC Socket close ${socketDwnUrl}`);
  });

  // NOTE: Temporary in lieu of a better mock of isomorphic-ws
  // tests reply on Node's use of event listeners to emit an error or message over the socket.
  describe('browser', () => {
    if (typeof window !== 'undefined') {
      xit('calls onerror handler', async () => {
      });
      xit('closes subscription upon receiving a JsonRpc Error for a long running subscription', async () => {
      });
    }
  });

  describe('NodeJS', function () {
    if (typeof process !== 'undefined' && (process as any).browser !== true) {
      it('calls onerror handler', async () => {
        // test injected handler
        const onErrorHandler = { onerror: ():void => {} };
        const onErrorSpy = sinon.spy(onErrorHandler, 'onerror');
        const client = await JsonRpcSocket.connect(socketDwnUrl, { onerror: onErrorHandler.onerror });
        client['socket'].emit('error', 'some error');

        await sleepWhileWaitingForEvents();
        expect(onErrorSpy.callCount).to.equal(1, 'error');

        // test default logger
        const logInfoSpy = sinon.stub(console, 'error');
        const defaultClient = await JsonRpcSocket.connect(socketDwnUrl);
        defaultClient['socket'].emit('error', 'some error');

        await sleepWhileWaitingForEvents();
        expect(logInfoSpy.callCount).to.equal(1, 'log');

        // extract log message from argument
        const logMessage:string = logInfoSpy.args[0][0]!;
        expect(logMessage).to.equal(`JSON RPC Socket error ${socketDwnUrl}`);
      });

      it('closes subscription upon receiving a JsonRpc Error for a long running subscription', async () => {

        const client = await JsonRpcSocket.connect(socketDwnUrl);
        const { message } = await TestDataGenerator.generateRecordsSubscribe({ author: alice });

        const requestId = CryptoUtils.randomUuid();
        const subscriptionId = CryptoUtils.randomUuid();
        const request = createJsonRpcSubscriptionRequest(
          requestId,
          'dwn.processMessage',
          subscriptionId,
          { target: alice.did, message }
        );

        let errorCounter = 0;
        let responseCounter = 0;
        const responseListener = (response: JsonRpcResponse): void => {
          expect(response.id).to.equal(subscriptionId);
          if (response.error) {
            errorCounter++;
          }

          if (response.result) {
            responseCounter++;
          }
        };

        const subscription = await client.subscribe(request, responseListener);
        expect(subscription.response.error).to.be.undefined;
        // wait for the messages to arrive

        // induce positive result
        const jsonResponse = createJsonRpcSuccessResponse(subscriptionId, { reply: {} });
        client['socket'].emit('message', JSON.stringify(jsonResponse));

        // induce error message
        const errorResponse = createJsonRpcErrorResponse(subscriptionId, JsonRpcErrorCodes.InternalError, 'message');
        client['socket'].emit('message', JSON.stringify(errorResponse));

        await sleepWhileWaitingForEvents();
        // the original response
        expect(responseCounter).to.equal(1, 'response');
        expect(errorCounter).to.equal(1, 'error');
      });
    }
  });
});
