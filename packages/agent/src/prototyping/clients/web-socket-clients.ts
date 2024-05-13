import type { DwnRpc, DwnRpcRequest, DwnRpcResponse, DwnSubscriptionHandler } from './dwn-rpc-types.js';
import type { GenericMessage, MessageSubscription, UnionMessageReply } from '@tbd54566975/dwn-sdk-js';

import { utils as cryptoUtils } from '@web5/crypto';
import { createJsonRpcRequest, createJsonRpcSubscriptionRequest } from './json-rpc.js';
import { JsonRpcSocket, JsonRpcSocketOptions } from './json-rpc-socket.js';

interface SocketConnection {
  socket: JsonRpcSocket;
  subscriptions: Map<string, MessageSubscription>;
}

export class WebSocketDwnRpcClient implements DwnRpc {
  public get transportProtocols() { return ['ws:', 'wss:']; }
  // a map of dwn host to WebSocket connection
  private static connections = new Map<string, SocketConnection>();

  async sendDwnRequest(request: DwnRpcRequest, jsonRpcSocketOptions?: JsonRpcSocketOptions): Promise<DwnRpcResponse> {

    // validate that the dwn URL provided is a valid WebSocket URL
    const url = new URL(request.dwnUrl);
    if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
      throw new Error(`Invalid websocket protocol ${url.protocol}`);
    }

    // check if there is already a connection to this host, if it does not exist, initiate a new connection
    const hasConnection = WebSocketDwnRpcClient.connections.has(url.host);
    if (!hasConnection) {
      try {
        const socket = await JsonRpcSocket.connect(url.toString(), jsonRpcSocketOptions);
        const subscriptions = new Map();
        WebSocketDwnRpcClient.connections.set(url.host, { socket, subscriptions });
      } catch(error) {
        throw new Error(`Error connecting to ${url.host}: ${(error as Error).message}`);
      }
    }

    const connection = WebSocketDwnRpcClient.connections.get(url.host)!;
    const { targetDid, message, subscriptionHandler } = request;

    if (subscriptionHandler) {
      return WebSocketDwnRpcClient.subscriptionRequest(connection, targetDid, message, subscriptionHandler);
    }

    return WebSocketDwnRpcClient.processMessage(connection, targetDid, message);
  }

  private static async processMessage(connection: SocketConnection, target: string, message: GenericMessage): Promise<DwnRpcResponse> {
    const requestId = cryptoUtils.randomUuid();
    const request = createJsonRpcRequest(requestId, 'dwn.processMessage', { target, message });

    const { socket } = connection;
    const response = await socket.request(request);

    const { error, result } = response;
    if (error !== undefined) {
      throw new Error(`error sending DWN request: ${error.message}`);
    }

    return result.reply as DwnRpcResponse;
  }

  private static async subscriptionRequest(connection: SocketConnection, target:string, message: GenericMessage, messageHandler: DwnSubscriptionHandler): Promise<DwnRpcResponse> {
    const requestId = cryptoUtils.randomUuid();
    const subscriptionId = cryptoUtils.randomUuid();
    const request = createJsonRpcSubscriptionRequest(requestId, 'dwn.processMessage', subscriptionId, { target, message });

    const { socket, subscriptions } = connection;
    const { response, close } = await socket.subscribe(request, (response) => {
      const { result, error } = response;
      if (error) {

        // if there is an error, close the subscription and delete it from the connection
        const subscription = subscriptions.get(subscriptionId);
        if (subscription) {
          subscription.close();
        }

        subscriptions.delete(subscriptionId);
        return;
      }

      const { event } = result;
      messageHandler(event);
    });

    const { error, result } = response;
    if (error) {
      throw new Error(`could not subscribe via jsonrpc socket: ${error.message}`);
    }

    const { reply } = result as { reply: UnionMessageReply };
    if (reply.subscription && close) {
      subscriptions.set(subscriptionId, { ...reply.subscription, close });
      reply.subscription.close = close;
    }

    return reply;
  }
}