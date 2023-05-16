import type { DwnRpc, DwnRpcRequest, DwnRpcResponse, JsonRpcResponse } from '@tbd54566975/web5-agent';

import { v4 as uuidv4 } from 'uuid';
import { createJsonRpcRequest, parseJson } from '@tbd54566975/web5-agent';

// TODO: move what's below to dwn-server repo. i wrote this here for expediency

/**
 * Client used to communicate with Dwn Servers
 */
export class DwnRpcClient implements DwnRpc {
  #transportClients: Map<string, DwnRpc>;

  constructor(clients: DwnRpc[] = []) {
    this.#transportClients = new Map();

    // include http client as default. can be overwritten for 'http:' or 'https:' if instantiator provides
    // their own.
    clients = [new HttpDwnRpcClient(), ...clients];

    for (let client of clients) {
      for (let transportScheme of client.transportProtocols) {
        this.#transportClients.set(transportScheme, client);
      }
    }
  }

  get transportProtocols(): string[] {
    return Array.from(this.#transportClients.keys());
  }

  sendDwnRequest(request: DwnRpcRequest): Promise<DwnRpcResponse> {
    // will throw if url is invalid
    const url = new URL(request.dwnUrl);

    const transportClient = this.#transportClients.get(url.protocol);
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
class HttpDwnRpcClient implements DwnRpc {
  get transportProtocols() { return ['http:', 'https:']; }

  async sendDwnRequest(request: DwnRpcRequest): Promise<DwnRpcResponse> {
    const requestId = uuidv4();
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
      fetchOpts.headers['content-type'] = 'application/octet-stream';
      fetchOpts['body'] = request.data;
    }

    const resp = await fetch(request.dwnUrl, fetchOpts);
    let dwnRpcResponse: DwnRpcResponse;

    // check to see if response is in header first. if it is, that means the response is a ReadableStream
    let dataStream;
    const { headers } = resp;
    if (headers.has('dwn-response')) {
      const jsonRpcResponse = parseJson(headers.get('dwn-response')) as JsonRpcResponse;

      if (jsonRpcResponse == null) {
        throw new Error(`failed to parse json rpc response. dwn url: ${request.dwnUrl}`);
      }

      dataStream = resp.body;
      dwnRpcResponse = jsonRpcResponse;
    } else {
      // TODO: wonder if i need to try/catch this?
      dwnRpcResponse = await resp.json() as JsonRpcResponse;
    }

    if (dwnRpcResponse.error) {
      const { code, message } = dwnRpcResponse.error;
      throw new Error(`(${code}) - ${message}`);
    }

    const { reply } = dwnRpcResponse.result;
    if (dataStream) {
      reply['record']['data'] = dataStream;
    }

    return reply;
  }
}