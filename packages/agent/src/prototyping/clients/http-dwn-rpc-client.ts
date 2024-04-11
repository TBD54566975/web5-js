import type { JsonRpcResponse } from './json-rpc.js';
import type { DwnRpc, DwnRpcRequest, DwnRpcResponse } from './dwn-rpc-types.js';

import { createJsonRpcRequest, parseJson } from './json-rpc.js';
import { utils as cryptoUtils } from '@web5/crypto';
import { DwnServerInfoCache, ServerInfo } from './server-info-types.js';
import { DwnServerInfoCacheMemory } from './dwn-server-info-cache-memory.js';

/**
 * HTTP client that can be used to communicate with Dwn Servers
 */
export class HttpDwnRpcClient implements DwnRpc {
  private serverInfoCache: DwnServerInfoCache;
  constructor(serverInfoCache?: DwnServerInfoCache) {
    this.serverInfoCache = serverInfoCache ?? new DwnServerInfoCacheMemory();
  }

  get transportProtocols() { return ['http:', 'https:']; }

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
        throw new Error(`failed to parse json rpc response. dwn url: ${request.dwnUrl}`);
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

  async getServerInfo(dwnUrl: string): Promise<ServerInfo> {
    const serverInfo = await this.serverInfoCache.get(dwnUrl);
    if (serverInfo) {
      return serverInfo;
    }

    const url = new URL(dwnUrl);

    // add `/info` to the dwn server url path
    url.pathname.endsWith('/') ? url.pathname += 'info' : url.pathname += '/info';

    try {
      const response = await fetch(url.toString());
      if(response.ok) {
        const results = await response.json() as ServerInfo;

        // explicitly return and cache only the desired properties.
        const serverInfo = {
          registrationRequirements : results.registrationRequirements,
          maxFileSize              : results.maxFileSize,
          webSocketSupport         : results.webSocketSupport,
        };
        this.serverInfoCache.set(dwnUrl, serverInfo);

        return serverInfo;
      } else {
        throw new Error(`HTTP (${response.status}) - ${response.statusText}`);
      }
    } catch(error: any) {
      throw new Error(`Error encountered while processing response from ${url.toString()}: ${error.message}`);
    }
  }
}
