import type { UnionMessageReply } from '@tbd54566975/dwn-sdk-js';

import { utils as cryptoUtils } from '@web5/crypto';

import type { JsonRpcResponse } from './json-rpc.js';

import { createJsonRpcRequest, parseJson } from './json-rpc.js';

export type RpcStatus = {
  code: number;
  message: string;
};

export interface Web5Rpc extends DwnRpc, ConnectRpc {}

export enum ConnectRpcMethod {
  AuthorizationRequest = 'connect.authorizationRequest',
  AuthorizationResponse = 'connect.authorizationResponse',
  GetAuthorizationRequest = 'connect.getAuthorizationRequest',
  GetAuthorizationResponse = 'connect.getAuthorizationResponse',
  Subscribe = 'connect.subscribe'
}

export type ConnectRpcRequest = {
  data: string;
  method: ConnectRpcMethod;
  url: string;
}

export type ConnectRpcResponse = {
  data?: string;
  ok: boolean;
  status: RpcStatus;
}

export interface ConnectRpc {
  get transportProtocols(): string[]
  sendConnectRequest(request: ConnectRpcRequest): Promise<ConnectRpcResponse>
}

/**
 * interface that can be implemented to communicate with Dwn Servers
 */
export interface DwnRpc {
  /**
   * TODO: add jsdoc
   */
  get transportProtocols(): string[]

  /**
   * TODO: add jsdoc
   * @param request
   */
  sendDwnRequest(request: DwnRpcRequest): Promise<DwnRpcResponse>
}

/**
 * TODO: add jsdoc
 */
export type DwnRpcRequest = {
  data?: any;
  dwnUrl: string;
  message: SerializableDwnMessage | any;
  targetDid: string;
}

/**
 * TODO: add jsdoc
 */
export type DwnRpcResponse = UnionMessageReply;

export interface SerializableDwnMessage {
  toJSON(): string;
}

/**
 * Client used to communicate with Dwn Servers
 */
export class Web5RpcClient implements Web5Rpc {
  private transportClients: Map<string, Web5Rpc>;

  constructor(clients: Web5Rpc[] = []) {
    this.transportClients = new Map();

    // include http client as default. can be overwritten for 'http:' or 'https:' if instantiator provides
    // their own.
    clients = [new HttpDwnRpcClient(), ...clients];

    for (let client of clients) {
      for (let transportScheme of client.transportProtocols) {
        this.transportClients.set(transportScheme, client);
      }
    }
  }

  get transportProtocols(): string[] {
    return Array.from(this.transportClients.keys());
  }

  async sendConnectRequest(request: ConnectRpcRequest): Promise<ConnectRpcResponse> {
    // URL() will throw if provided `endpointUrl` is invalid.
    const url = new URL(request.url);

    const transportClient = this.transportClients.get(url.protocol);
    if (!transportClient) {
      const error = new Error(`no ${url.protocol} transport client available`);
      error.name = 'NO_TRANSPORT_CLIENT';

      throw error;
    }

    return transportClient.sendConnectRequest(request);
  }

  sendDwnRequest(request: DwnRpcRequest): Promise<DwnRpcResponse> {
    // will throw if url is invalid
    const url = new URL(request.dwnUrl);

    const transportClient = this.transportClients.get(url.protocol);
    if (!transportClient) {
      const error = new Error(`no ${url.protocol} transport client available`);
      error.name = 'NO_TRANSPORT_CLIENT';

      throw error;
    }

    return transportClient.sendDwnRequest(request);
  }
}

// TODO: move to dwn-server repo. i wrote this here for expediency

/**
 * Http client that can be used to communicate with Dwn Servers
 */
class HttpDwnRpcClient implements Web5Rpc {
  get transportProtocols() { return ['http:', 'https:']; }

  async sendConnectRequest(request: ConnectRpcRequest): Promise<ConnectRpcResponse> {
    const requestId = cryptoUtils.randomUuid();
    const jsonRpcRequest = createJsonRpcRequest(requestId, request.method, {
      data: request.data
    });

    const httpRequest = new Request(request.url, {
      method  : 'POST',
      headers : {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jsonRpcRequest),
    });

    let jsonRpcResponse: JsonRpcResponse;

    try {
      const response = await fetch(httpRequest);

      if (response.ok) {
        jsonRpcResponse = await response.json();

        // If the response is an error, throw an error.
        if (jsonRpcResponse.error) {
          const { code, message } = jsonRpcResponse.error;
          throw new Error(`JSON RPC (${code}) - ${message}`);
        }
      } else {
        throw new Error(`HTTP (${response.status}) - ${response.statusText}`);
      }
    } catch (error: any) {
      throw new Error(`Error encountered while processing response from ${request.url}: ${error.message}`);
    }

    const connectRpcResponse: ConnectRpcResponse = jsonRpcResponse.result;

    return connectRpcResponse;
  }

  async sendDwnRequest(request: DwnRpcRequest): Promise<DwnRpcResponse> {
    const requestId = cryptoUtils.randomUuid();
    const jsonRpcRequest = createJsonRpcRequest(requestId, 'dwn.processMessage', {
      target  : request.targetDid,
      message : request.message
    });

    const fetchOpts = {
      method  : 'POST',
      headers : {
        'dwn-request': JSON.stringify(jsonRpcRequest)
      }
    };

    if (request.data) {
      // @ts-expect-error TODO: REMOVE
      fetchOpts.headers['content-type'] = 'application/octet-stream';
      // @ts-expect-error TODO: REMOVE
      fetchOpts['body'] = request.data;
    }

    const resp = await fetch(request.dwnUrl, fetchOpts);
    let dwnRpcResponse: JsonRpcResponse;

    // check to see if response is in header first. if it is, that means the response is a ReadableStream
    let dataStream;
    const { headers } = resp;
    if (headers.has('dwn-response')) {
      // @ts-expect-error TODO: REMOVE
      const jsonRpcResponse = parseJson(headers.get('dwn-response')) as JsonRpcResponse;

      if (jsonRpcResponse == null) {
        throw new Error(`Failed to parse JSON RPC response from endpoint: ${request.dwnUrl}`);
      }

      dataStream = resp.body;
      dwnRpcResponse = jsonRpcResponse;
    } else {
      // TODO: wonder if i need to try/catch this?
      const responseBody = await resp.text();
      dwnRpcResponse = JSON.parse(responseBody);
    }

    if (dwnRpcResponse.error) {
      const { code, message } = dwnRpcResponse.error;
      throw new Error(`(${code}) - ${message}`);
    }

    const { reply } = dwnRpcResponse.result;
    if (dataStream) {
      reply['record']['data'] = dataStream;
    }

    return reply as DwnRpcResponse;
  }
}

/**
 * WebSocket client that can be used to communicate with Dwn Servers
 */
// class WebSocketDwnRpcClient implements Web5Rpc {
//   private socketClients: Map<string, WebSocket>;

//   constructor() {
//     this.socketClients = new Map();
//   }

//   get transportProtocols() { return ['ws:', 'wss:']; }

//   async sendDwnRequest(request: DwnRpcRequest): Promise<DwnRpcResponse> {
//     // will throw if url is invalid
//     const url = new URL(request.dwnUrl);

//     let socketClient = this.socketClients.get(url.href);
//     if (!socketClient) {
//       socketClient = await this.createSocketClient(url.href);
//       this.socketClients.set(url.href, socketClient);
//     }

//     return new Promise((resolve, reject) => {
//       const requestId = cryptoUtils.randomUuid();
//       const jsonRpcRequest = createJsonRpcRequest(requestId, 'dwn.processMessage', {
//         target  : request.targetDid,
//         message : request.message
//       });

//       const messageHandler = (event: MessageEvent) => {
//         const dwnRpcResponse = JSON.parse(event.data) as JsonRpcResponse;

//         if (dwnRpcResponse.error) {
//           const { code, message } = dwnRpcResponse.error;
//           reject(new Error(`(${code}) - ${message}`));
//         } else {
//           const { reply } = dwnRpcResponse.result;
//           if (reply.record.data) {
//             reply.record.data = new Blob([reply.record.data]);
//           }
//           resolve(reply as DwnRpcResponse);
//         }
//       };

//       const errorHandler = (event: Event) => {
//         reject(new Error(`WebSocket error: ${event.type}`));
//       };

//       const closeHandler = (event: CloseEvent) => {
//         this.socketClients.delete(url.href);
//         socketClient.removeEventListener('message', messageHandler);
//         socketClient.removeEventListener('error', errorHandler);
//         socketClient.removeEventListener('close', closeHandler);
//         reject(new Error(`WebSocket closed with code ${event.code}`));
//       };

//       socketClient.addEventListener('message', messageHandler);
//       socketClient.addEventListener('error', errorHandler);
//       socketClient.addEventListener('close', closeHandler);

//       socketClient.send(JSON.stringify(jsonRpcRequest));
//     });
//   }

//   async close(endpoint: string): Promise<void> {
//     const socketClient = this.socketClients.get(endpoint);
//     if (socketClient) {
//       socketClient.close();
//       this.socketClients.delete(endpoint);
//     }
//   }

//   private async createSocketClient(url: string): Promise<WebSocket> {
//     return new Promise((resolve, reject) => {
//       const socketClient = new WebSocket(url);

//       const openHandler = () => {
//         resolve(socketClient);
//       };

//       const errorHandler = (event: Event) => {
//         reject(new Error(`WebSocket error: ${event.type}`));
//       };

//       const closeHandler = (event: CloseEvent) => {
//         this.socketClients.delete(url);
//         socketClient.removeEventListener('open', openHandler);
//         socketClient.removeEventListener('error', errorHandler);
//         socketClient.removeEventListener('close', closeHandler);
//         reject(new Error(`WebSocket closed with code ${event.code}`));
//       };

//       socketClient.addEventListener('open', openHandler);
//       socketClient.addEventListener('error', errorHandler);
//       socketClient.addEventListener('close', closeHandler);
//     });
//   }
// }