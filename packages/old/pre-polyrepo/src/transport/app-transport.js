import { DataStream } from '@tbd54566975/dwn-sdk-js';

import { Transport } from './transport.js';

export class AppTransport extends Transport {
  async encodeData(data) {
    return DataStream.fromBytes(data);
  }

  async decodeData(stream) {
    return DataStream.toBytes(stream);
  }

  async send(endpoint, request) { // override
    const encodedData = request.data ? await this.encodeData(request.data) : undefined;
    const node = await this.web5.dwn.node;
    return node.processMessage(request.target, request.message.message, encodedData);
  }
}
