import { expect } from 'chai';

import { dataToBlob } from '../src/utils.js';

describe('Web5 API Utils', () => {
  describe('dataToBlob()', () => {
    it('should handle text data with explicit format', async () => {
      const result = dataToBlob('Hello World', 'text/plain');
      expect(result.dataBlob.type).to.equal('text/plain');
      expect(result.dataFormat).to.equal('text/plain');
      const output = await result.dataBlob.text();
      expect(output).to.equal('Hello World');
    });

    it('should handle text data with detected type', async () => {
      const result = dataToBlob('Hello World');
      expect(result.dataBlob.type).to.equal('text/plain');
      expect(result.dataFormat).to.equal('text/plain');
      const output = await result.dataBlob.text();
      expect(output).to.equal('Hello World');
    });

    it('should handle JSON data with explicit format', async () => {
      const result = dataToBlob({ key: 'value' }, 'application/json');
      expect(result.dataBlob.type).to.equal('application/json');
      expect(result.dataFormat).to.equal('application/json');
    });

    it('should handle JSON data with detected type', () => {
      const result = dataToBlob({ key: 'value' });
      expect(result.dataBlob.type).to.equal('application/json');
      expect(result.dataFormat).to.equal('application/json');
    });

    it('should handle Uint8Array data', () => {
      const result = dataToBlob(new Uint8Array([1, 2, 3]));
      expect(result.dataBlob.type).to.equal('application/octet-stream');
      expect(result.dataFormat).to.equal('application/octet-stream');
    });

    it('should handle ArrayBuffer data', () => {
      const result = dataToBlob(new ArrayBuffer(3));
      expect(result.dataBlob.type).to.equal('application/octet-stream');
      expect(result.dataFormat).to.equal('application/octet-stream');
    });

    it('should handle Blob data', () => {
      const blob = new Blob(['data'], { type: 'custom/type' });
      const result = dataToBlob(blob);
      expect(result.dataBlob.type).to.equal('custom/type');
      expect(result.dataFormat).to.equal('custom/type');
    });

    it('should throw an error for unsupported data types', () => {
      expect(() => dataToBlob(42)).to.throw('data type not supported.');
    });
  });
});