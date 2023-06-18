import { expect } from 'chai';
import { base64url } from 'multiformats/bases/base64';

import { Convert } from '../src/common/convert.js';

describe('Convert', () =>{
  // let textDecoder = new TextDecoder();
  let textEncoder = new TextEncoder();

  describe('from: Base64url', () => {
    it('to: Object', () => {
      const testObject = { foo: 'bar' };
      const string = JSON.stringify(testObject);
      const u8a = textEncoder.encode(string);
      const base64UrlString = base64url.baseEncode(u8a);

      const result = Convert.base64Url(base64UrlString).toObject();

      expect(result).to.deep.equal(testObject);
    });
  });
});

/**
 * Tests written:
 {Base64url, Object}

 * Tests to write:
 {Base64url, Uint8Array}
 {Base64url, String}
 {Object, Uint8Array}
 {Object, String}
 {Object, Base64url}
 {String, Object}
 {String, Uint8Array}
 {String, Base64url}
 {Uint8Array, Object}
 {Uint8Array, String}
 {Uint8Array, Base64url}
 */