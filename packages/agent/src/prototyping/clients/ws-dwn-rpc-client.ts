import { utils as cryptoUtils } from '@web5/crypto';
import { createJsonRpcRequest } from "../../json-rpc.js";
import { DwnRpc, DwnRpcRequest, DwnRpcResponse } from "../../rpc-client.js";
import { JsonRpcSocket } from '@web5/dwn-server';

/**
 * WebSocket client that can be used to communicate with Dwn Servers
 */
class WebSocketDwnRpcClient implements DwnRpc {
  get transportProtocols() { return ['ws:', 'wss:']; }

  async sendDwnRequest(request: DwnRpcRequest): Promise<DwnRpcResponse> {
    const requestId = cryptoUtils.randomUuid();;
    const jsonRpcRequest = createJsonRpcRequest(requestId, 'dwn.processMessage', {
      target  : request.targetDid,
      message : request.message,
    })

    const client = await JsonRpcSocket.connect(request.dwnUrl);
    const response = await client.request(jsonRpcRequest);

    if (response.error) {
      const { code, message } = response.error;
      throw new Error(`(${code}) - ${message}`);
    }

    return response.result.reply;
  }
}