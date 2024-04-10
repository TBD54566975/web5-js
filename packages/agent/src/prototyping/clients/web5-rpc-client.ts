import type { DidRpcRequest, DidRpcResponse, DwnRpcRequest, DwnRpcResponse, Web5Rpc } from './web5-rpc-types.js';

import { HttpWeb5RpcClient } from './http-clients.js';


/**
 * Client used to communicate with Dwn Servers
 */
export class Web5RpcClient implements Web5Rpc {
  private transportClients: Map<string, Web5Rpc>;

  constructor(clients: Web5Rpc[] = []) {
    this.transportClients = new Map();

    // include http client as default. can be overwritten for 'http:' or 'https:' if provided in the constructor
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

  async sendDwnRequest(request: DwnRpcRequest): Promise<DwnRpcResponse> {
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