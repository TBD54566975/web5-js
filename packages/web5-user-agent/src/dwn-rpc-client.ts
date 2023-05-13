import { DwnRpc, DwnRpcRequest, DwnRpcResponse, createJsonRpcErrorResponse } from '@tbd54566975/web5-agent';

import crossFetch from 'cross-fetch';

import { v4 as uuidv4 } from 'uuid';
import { JsonRpcResponse, createJsonRpcRequest, parseJson, JsonRpcErrorCodes } from '@tbd54566975/web5-agent';

// TODO: move what's below to dwn-server repo. i wrote this here for expediency

/**
 * Supports fetch in: browser, browser extensions, Node, and React Native.
 * In node, it uses node-fetch, and in a browser or React Native, it uses
 * Github's whatwg-fetch.
 *
 * WARNING for browser extension background service workers:
 * 'cross-fetch' is a ponyfill that uses `XMLHTTPRequest` under the hood.
 * `XMLHTTPRequest` cannot be used in browser extension background service
 * workers.  Browser extensions get even more strict with `fetch` in that it
 * cannot be referenced indirectly.
 *
 * use presence of File to decide whether we're in the browser or not
 * TODO: ask Adam or Tim if globalThis is available in react native
 */
const fetch = globalThis.File ? globalThis.fetch : crossFetch;

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
    let resp;
    try {
      resp = await fetch(request.dwnUrl, fetchOpts);
    } catch(e) {
      return createJsonRpcErrorResponse(requestId, JsonRpcErrorCodes.TransportError, e.message);
    }

    let dwnRpcResponse: DwnRpcResponse;

    // check to see if response is in header first. if it is, that means the response is a ReadableStream
    const { headers } = resp;
    if (headers.has('dwn-response')) {
      const jsonRpcResponse = parseJson(headers.get('dwn-response')) as JsonRpcResponse;

      if (jsonRpcResponse == null) {
        throw new Error(`failed to parse json rpc response. dwn url: ${request.dwnUrl}`);
      }

      dwnRpcResponse = {
        ...jsonRpcResponse,
        dataStream: resp.body
      };
    } else {
      // TODO: wonder if i need to try/catch this?
      dwnRpcResponse = await resp.json() as JsonRpcResponse;
    }

    return dwnRpcResponse;
  }
}