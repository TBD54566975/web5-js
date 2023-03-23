import crossFetch from 'cross-fetch';
import { Encoder } from '@tbd54566975/dwn-sdk-js';

import { Transport } from './Transport.js';

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
 */
const fetch = globalThis.fetch ?? crossFetch;

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
    })
      .then((response) => {
        // Only resolve if response was successful (status of 200-299)
        if (response.ok) { 
          return response;
        }
        return Promise.reject(response); 
      });
  }
}

export {
  HTTPTransport,
};
