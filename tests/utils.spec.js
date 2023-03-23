import { expect } from 'chai';

import * as utils from '../src/utils.js';

describe('Utils Tests', () => {
  describe('dataToBytes', () => {
    it('sets dataFormat to text/plain if string is provided', () => {
      const { dataFormat } = utils.dataToBytes('hello');

      expect(dataFormat).to.equal('text/plain');
    });

    it('sets dataFormat to application/json if object is provided', () => {
      const { dataFormat } = utils.dataToBytes({ hello: 'world' });

      expect(dataFormat).to.equal('application/json');
    });

    it('sets dataFormat to `application/octet-stream` if data is not string or object and dataFormat not specified', () => {
      const { dataFormat } = utils.dataToBytes(new Uint8Array([10, 11, 12]));

      expect(dataFormat).to.equal('application/octet-stream');
    });

    it('does not change dataFormat if specified', () => {
      const { dataFormat } = utils.dataToBytes(new Uint8Array([10, 11, 12]), 'image/png');

      expect(dataFormat).to.equal('image/png');
    });
  });

  describe('isUnsignedMessage', () => {
    const signedMessage = {
      message: { authorization: 'value' },
    };

    const unsignedMessage = {
      message: { descriptor: { schema: 'foo/bar' } },
    };

    
    it('should return true is message is missing authorization', () => {
      const result = utils.isMessageUnsigned(unsignedMessage);
      expect(result).to.be.true;
    });

    it('should return false is message contains authorization', () => {
      const result = utils.isMessageUnsigned(signedMessage);
      expect(result).to.be.false;
    });
  });
});