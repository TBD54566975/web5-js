import { Encoder } from '@tbd54566975/dwn-sdk-js';

import { encodeData } from '../utils';
import { Transport } from './Transport';

class HTTPTransport extends Transport {
  async send(endpoint, request) { // override
    const { encodedData, dataFormat } = encodeData(request.data, request.message.dataFormat);
    return fetch(endpoint, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        'DWN-MESSAGE': Encoder.stringToBase64Url(JSON.stringify({
          ...request.message,
          dataFormat,
          author: request.author.did,
          target: request.target.did,
        })),
        'Content-Type': 'application/octet-stream',
      },
      body: encodedData,
    });
  }
}

export {
  HTTPTransport,
};
