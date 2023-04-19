import crossFetch from 'cross-fetch';
import { Encoder } from '@tbd54566975/dwn-sdk-js';

import { Transport } from './transport.js';

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

export class HttpTransport extends Transport {
  ENCODED_MESSAGE_HEADER = 'DWN-MESSAGE';
  ENCODED_RESPONSE_HEADER = 'WEB5-RESPONSE';

  async encodeMessage(message) {
    return Encoder.stringToBase64Url(JSON.stringify(message));
  }

  async decodeMessage(base64urlString) {
    return Encoder.base64UrlToObject(base64urlString);
  }

  async send(endpoint, request) { // override
    const response = await fetch(endpoint, {
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

    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }

    const web5ResponseHeader = response.headers.get(this.ENCODED_RESPONSE_HEADER);
    if (web5ResponseHeader) {
      // RecordsRead responses return `message` and `status` as header values, with a `data` ReadableStream in the body.
      const { entries = null, message, record, status } = await this.decodeMessage(web5ResponseHeader);
      return { entries, message, record: { data: response.body, ...record }, status };

    } else { 
      // All other DWN responses return `entries`, `message`, and `status` as stringified JSON in the body.
      return await response.json();
    }
  }
}
