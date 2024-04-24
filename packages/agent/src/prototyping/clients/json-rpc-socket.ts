import { utils as cryptoUtils } from '@web5/crypto';
import IsomorphicWebSocket from 'isomorphic-ws';
import { JsonRpcId, JsonRpcRequest, JsonRpcResponse, createJsonRpcSubscriptionRequest, parseJson } from './json-rpc.js';

// These were arbitrarily chosen, but can be modified via connect options
const CONNECT_TIMEOUT = 3_000;
const RESPONSE_TIMEOUT = 30_000;

export interface JsonRpcSocketOptions {
  /** socket connection timeout in milliseconds */
  connectTimeout?: number;
  /** response timeout for rpc requests in milliseconds */
  responseTimeout?: number;
  /** optional connection close handler */
  onclose?: () => void;
  /** optional socket error handler */
  onerror?: (error?: any) => void;
}

/**
 * JSON RPC Socket Client for WebSocket request/response and long-running subscriptions.
 *
 * NOTE: This is temporarily copied over from https://github.com/TBD54566975/dwn-server/blob/main/src/json-rpc-socket.ts
 * This was done in order to avoid taking a dependency on the `dwn-server`, until a future time when there will be a `clients` package.
 */
export class JsonRpcSocket {
  private messageHandlers: Map<JsonRpcId, (event: { data: any }) => void> = new Map();

  private constructor(private socket: IsomorphicWebSocket, private responseTimeout: number) {}

  static async connect(url: string, options: JsonRpcSocketOptions = {}): Promise<JsonRpcSocket> {
    const { connectTimeout = CONNECT_TIMEOUT, responseTimeout = RESPONSE_TIMEOUT, onclose, onerror } = options;

    const socket = new IsomorphicWebSocket(url);

    if (!onclose) {
      socket.onclose = ():void => {
        console.info(`JSON RPC Socket close ${url}`);
      };
    } else {
      socket.onclose = onclose;
    }

    if (!onerror) {
      socket.onerror = (error?: any):void => {
        console.error(`JSON RPC Socket error ${url}`, error);
      };
    } else {
      socket.onerror = onerror;
    }

    return new Promise<JsonRpcSocket>((resolve, reject) => {
      socket.addEventListener('open', () => {
        const jsonRpcSocket = new JsonRpcSocket(socket, responseTimeout);

        socket.addEventListener('message', (event: { data: any }) => {
          const jsonRpcResponse = parseJson(event.data) as JsonRpcResponse;
          const handler = jsonRpcSocket.messageHandlers.get(jsonRpcResponse.id);
          if (handler) {
            handler(event);
          }
        });

        resolve(jsonRpcSocket);
      });

      socket.addEventListener('error', (error: any) => {
        reject(error);
      });

      setTimeout(() => reject, connectTimeout);
    });
  }

  close(): void {
    this.socket.close();
  }

  /**
   * Sends a JSON-RPC request through the socket and waits for a single response.
   */
  async request(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    return new Promise((resolve, reject) => {
      request.id ??= cryptoUtils.randomUuid();

      const handleResponse = (event: { data: any }):void => {
        const jsonRpsResponse = parseJson(event.data) as JsonRpcResponse;
        if (jsonRpsResponse.id === request.id) {
          // if the incoming response id matches the request id, we will remove the listener and resolve the response
          this.messageHandlers.delete(request.id);
          return resolve(jsonRpsResponse);
        }
      };

      // add the listener to the map of message handlers
      this.messageHandlers.set(request.id, handleResponse);
      this.send(request);

      // reject this promise if we don't receive any response back within the timeout period
      setTimeout(() => {
        this.messageHandlers.delete(request.id!);
        reject(new Error('request timed out'));
      }, this.responseTimeout);
    });
  }

  /**
   * Sends a JSON-RPC request through the socket and keeps a listener open to read associated responses as they arrive.
   * Returns a close method to clean up the listener.
   */
  async subscribe(request: JsonRpcRequest, listener: (response: JsonRpcResponse) => void): Promise<{
    response: JsonRpcResponse;
    close?: () => Promise<void>;
   }> {

    if (!request.method.startsWith('rpc.subscribe.')) {
      throw new Error('subscribe rpc requests must include the `rpc.subscribe` prefix');
    }

    if (!request.subscription) {
      throw new Error('subscribe rpc requests must include subscribe options');
    }

    const subscriptionId = request.subscription.id;
    const socketEventListener = (event: { data: any }):void => {
      const jsonRpcResponse = parseJson(event.data.toString()) as JsonRpcResponse;
      if (jsonRpcResponse.id === subscriptionId) {
        if (jsonRpcResponse.error !== undefined) {
          // remove the event listener upon receipt of a JSON RPC Error.
          this.messageHandlers.delete(subscriptionId);
          this.closeSubscription(subscriptionId);
        }
        listener(jsonRpcResponse);
      }
    };

    this.messageHandlers.set(subscriptionId, socketEventListener);

    const response = await this.request(request);
    if (response.error) {
      this.messageHandlers.delete(subscriptionId);
      return { response };
    }

    // clean up listener and create a `rpc.subscribe.close` message to use when closing this JSON RPC subscription
    const close = async (): Promise<void> => {
      this.messageHandlers.delete(subscriptionId);
      await this.closeSubscription(subscriptionId);
    };

    return {
      response,
      close
    };
  }

  private closeSubscription(id: JsonRpcId): Promise<JsonRpcResponse> {
    const requestId = cryptoUtils.randomUuid();
    const request = createJsonRpcSubscriptionRequest(requestId, 'close', id, {});
    return this.request(request);
  }

  /**
   * Sends a JSON-RPC request through the socket. You must subscribe to a message listener separately to capture the response.
   */
  send(request: JsonRpcRequest):void {
    this.socket.send(JSON.stringify(request));
  }
}