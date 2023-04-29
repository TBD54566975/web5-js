import { expect } from 'chai';

import * as utils from '../src/utils.js';

describe('Web5 Utils', () => {
  describe('dataToBytes()', () => {
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

  describe('isUnsignedMessage()', () => {
    const signedMessage = {
      message: { authorization: 'value' },
    };

    const unsignedMessage = {
      message: { descriptor: { schema: 'foo/bar' } },
    };

    
    it('should return true is message is missing authorization', () => {
      const result = utils.isUnsignedMessage(unsignedMessage);
      expect(result).to.be.true;
    });

    it('should return false is message contains authorization', () => {
      const result = utils.isUnsignedMessage(signedMessage);
      expect(result).to.be.false;
    });
  });

  describe('pascalToKebabCase()', () => {
    it('should return kebab case from regular pascal case', () => {
      const result = utils.pascalToKebabCase('MyClassName');
      expect(result).to.equal('my-class-name');
    });
    
    it('should return kebab case from pascal case with leading acryonym', () => {
      const result = utils.pascalToKebabCase('HTTPServer');
      expect(result).to.equal('http-server');
    });
    
    it('should return kebab case from pascal case with trailing acryonym', () => {
      const result = utils.pascalToKebabCase('ResolvedDID');
      expect(result).to.equal('resolved-did');
    });
    
    it('should return kebab case from pascal case with mid acryonym', () => {
      const result = utils.pascalToKebabCase('MyDIDClass');
      expect(result).to.equal('my-did-class');
    });
  });
});
