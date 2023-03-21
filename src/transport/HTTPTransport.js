import { Encoder } from '@tbd54566975/dwn-sdk-js';

import { Transport } from './Transport.js';

class HTTPTransport extends Transport {
  ENCODED_MESSAGE_HEADER = 'DWN-MESSAGE';

  async encodeMessage(message) {
    return Encoder.stringToBase64Url(JSON.stringify(message));
  }

  async decodeMessage(base64urlString) {
    return Encoder.base64UrlToObject(base64urlString);
  }

  async send(endpoint, request) { // override
    return fetch(endpoint, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        [this.ENCODED_MESSAGE_HEADER]: await this.encodeMessage({
          ...request.message,
          author: request.author,
          target: request.target,
        }),
        'Content-Type': 'application/octet-stream',
      },
      body: request.data,
    });
  }
}

export {
  HTTPTransport,
};
