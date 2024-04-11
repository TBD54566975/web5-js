import { utils as cryptoUtils } from '@web5/crypto';
import { RecordsReadReply, UnionMessageReply } from '@tbd54566975/dwn-sdk-js';


import { HttpDwnRpcClient } from './prototyping/clients/http-dwn-rpc-client.js';
import { WebSocketDwnRpcClient } from './prototyping/clients/web-socket-clients.js';
import { JsonRpcResponse, createJsonRpcRequest } from './prototyping/clients/json-rpc.js';

/**
 * Interface that can be implemented to communicate with {@link Web5Agent | Web5 Agent}
 * implementations via JSON-RPC.
 */
export interface DidRpc {
  get transportProtocols(): string[]
  sendDidRequest(request: DidRpcRequest): Promise<DidRpcResponse>
}

export enum DidRpcMethod {
  Create = 'did.create',
  Resolve = 'did.resolve'
}

export type DidRpcRequest = {
  data: string;
  method: DidRpcMethod;
  url: string;
}

export type DidRpcResponse = {
  data?: string;
  ok: boolean;
  status: RpcStatus;
}

/**
 * Interface for communicating with {@link https://github.com/TBD54566975/dwn-server | DWN Servers}
 * via JSON-RPC, supporting operations like sending DWN requests.
 */
export interface DwnRpc {
  /**
   * Lists the transport protocols supported by the DWN RPC client, such as HTTP or HTTPS.
   * @returns An array of strings representing the supported transport protocols.
   */
  get transportProtocols(): string[]

  /**
   * Sends a request to a DWN Server using the specified DWN RPC request parameters.
   *
   * @param request - The DWN RPC request containing the URL, target DID, message, and optional data.
   * @returns A promise that resolves to the response from the DWN server.
   */
  sendDwnRequest(request: DwnRpcRequest): Promise<DwnRpcResponse>
}


/**
 * Represents a JSON RPC request to a DWN server, including the URL, target DID, the message to be
 * processed, and optional data.
 */
export type DwnRpcRequest = {
  /** Optional data to be sent with the request. */
  data?: any;

  /** The URL of the DWN server to which the request is sent. */
  dwnUrl: string;

  /** The message to be processed by the DWN server, which can be a serializable DWN message. */
  message: SerializableDwnMessage | any;

  /** The DID of the target to which the message is addressed. */
  targetDid: string;
}

/**
 * Represents the JSON RPC response from a DWN server to a request, combining the results of various
 * DWN operations.
 */
export type DwnRpcResponse = UnionMessageReply & RecordsReadReply;

export type RpcStatus = {
  code: number;
  message: string;
};

export interface SerializableDwnMessage {
  toJSON(): string;
}

export interface Web5Rpc extends DwnRpc, DidRpc {}

/**
 * Client used to communicate with Dwn Servers
 */
export class Web5RpcClient implements Web5Rpc {
  private transportClients: Map<string, Web5Rpc>;

  constructor(clients: Web5Rpc[] = []) {
    this.transportClients = new Map();

    // include http client as default. can be overwritten for 'http:' or 'https:' if instantiator provides
    // their own.
    clients = [new HttpWeb5RpcClient(), ...clients];

    for (let client of clients) {
      for (let transportScheme of client.transportProtocols) {
        this.transportClients.set(transportScheme, client);
      }
    }
  }

  get transportProtocols(): string[] {
    return Array.from(this.transportClients.keys());
  }

  async sendDidRequest(request: DidRpcRequest): Promise<DidRpcResponse> {
    // URL() will throw if provided `url` is invalid.
    const url = new URL(request.url);

    const transportClient = this.transportClients.get(url.protocol);
    if (!transportClient) {
      const error = new Error(`no ${url.protocol} transport client available`);
      error.name = 'NO_TRANSPORT_CLIENT';

      throw error;
    }

    return transportClient.sendDidRequest(request);
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

export class HttpWeb5RpcClient extends HttpDwnRpcClient implements Web5Rpc {
  async sendDidRequest(request: DidRpcRequest): Promise<DidRpcResponse> {
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

    return jsonRpcResponse.result as DidRpcResponse;
  }
}

export class WebSocketWeb5RpcClient extends WebSocketDwnRpcClient implements Web5Rpc {
  async sendDidRequest(_request: DidRpcRequest): Promise<DidRpcResponse> {
    throw new Error(`not implemented for transports [${this.transportProtocols.join(', ')}]`);
  }
}