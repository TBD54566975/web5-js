import { DataStream } from '@tbd54566975/dwn-sdk-js';

import { sharedDwn } from '../dwn/node';
import { Transport } from './Transport';

class AppTransport extends Transport {
  async send(endpoint, request) { // override
    const encodedData = request.data ? DataStream.fromBytes(request.data) : undefined;
    const dwn = await sharedDwn();
    return dwn.processMessage(request.target.did, request.message.message, encodedData);
  }
}

export {
  AppTransport,
};
