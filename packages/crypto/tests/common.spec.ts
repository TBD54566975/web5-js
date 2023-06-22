import { expect } from 'chai';

import { Convert } from '../src/common/convert.js';
import { isDefined, universalTypeOf } from '../src/common/type-utils.js';

describe('Convert', () =>{
  describe('from: ArrayBuffer', () => {
    it('to: Uint8Array', () => {
      // Test Vector 1.
      let input = (new Uint8Array([102, 111, 111])).buffer;
      let output = new Uint8Array([102, 111, 111]);

      let result = Convert.arrayBuffer(input).toUint8Array();

      expect(result).to.deep.equal(output);
    });
  });

  describe('from: Base64url', () => {
    it('to: Object', () => {
      // Test Vector 1.
      let input = 'eyJmb28iOiJiYXIifQ';
      let output = { foo: 'bar' };

      let result = Convert.base64Url(input).toObject();

      expect(result).to.deep.equal(output);
    });

    it('to: Uint8Array', () => {
      // Test Vector 1.
      let input = 'MzQ1';
      let output = new Uint8Array([51, 52, 53]);

      let result = Convert.base64Url(input).toUint8Array();

      expect(result).to.deep.equal(output);
    });

    it('to: String', () => {
      // Test Vector 1.
      let input = 'Zm9v';
      let output = 'foo';

      const result = Convert.base64Url(input).toString();

      expect(result).to.deep.equal(output);
    });
  });

  describe('from: BufferSource', () => {
    it('to: ArrayBuffer', () => {
      // Test Vector 1 - BufferSource is Uint8Array.
      let inputT1 = new Uint8Array([102, 111, 111]);
      let outputT1 = new Uint8Array([102, 111, 111]);
      let resultT1 = Convert.bufferSource(inputT1).toUint8Array();
      expect(resultT1).to.deep.equal(outputT1);

      // Test Vector 2 - BufferSource is ArrayBuffer.
      let inputT2 = (new Uint8Array([102, 111, 111])).buffer;
      let outputT2 = new Uint8Array([102, 111, 111]);
      let resultT2 = Convert.bufferSource(inputT2).toUint8Array();
      expect(resultT2).to.deep.equal(outputT2);

      // Test Vector 3 - BufferSource is DataView.
      let inputT3 = new DataView((new Uint8Array([102, 111, 111])).buffer);
      let outputT3 = new Uint8Array([102, 111, 111]);
      let resultT3 = Convert.bufferSource(inputT3).toUint8Array();
      expect(resultT3).to.deep.equal(outputT3);

      // Test Vector 4 - BufferSource is an unsigned, 16-bit Typed Array.
      let inputT4 = new Uint16Array([299]);
      let outputT4 = new Uint8Array([43, 1]);
      let resultT4 = Convert.bufferSource(inputT4).toUint8Array();
      expect(resultT4).to.deep.equal(outputT4);

      // Test Vector 5 - BufferSource is a signed, 32-bit Typed Array.
      let inputT5 = new Int32Array([1111]);
      let outputT5 = new Uint8Array([87, 4, 0, 0]);
      let resultT5 = Convert.bufferSource(inputT5).toUint8Array();
      expect(resultT5).to.deep.equal(outputT5);

      // Test Vector 6 - BufferSource is a slice of a Typed Array.
      let inputT6 = (new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7])).slice(1, 6);
      let outputT6 = (new Uint8Array([1, 2, 3, 4, 5])).buffer;
      let resultT6 = Convert.bufferSource(inputT6).toArrayBuffer();
      expect(resultT6).to.deep.equal(outputT6);

      // Test Vector 7 - BufferSource is a slice of a DataView.
      let dataView = new DataView((new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7])).buffer);
      let inputT7 = new DataView(dataView.buffer, dataView.byteOffset + 1, 6 - 1);
      let outputT7 = (new Uint8Array([1, 2, 3, 4, 5])).buffer;
      let resultT7 = Convert.bufferSource(inputT7).toArrayBuffer();
      expect(resultT7).to.deep.equal(outputT7);
    });

    it('to: Uint8Array', () => {
      // Test Vector 1 - BufferSource is Uint8Array.
      let inputT1 = new Uint8Array([102, 111, 111]);
      let outputT1 = new Uint8Array([102, 111, 111]);
      let resultT1 = Convert.bufferSource(inputT1).toUint8Array();
      expect(resultT1).to.deep.equal(outputT1);

      // Test Vector 2 - BufferSource is ArrayBuffer.
      let inputT2 = (new Uint8Array([102, 111, 111])).buffer;
      let outputT2 = new Uint8Array([102, 111, 111]);
      let resultT2 = Convert.bufferSource(inputT2).toUint8Array();
      expect(resultT2).to.deep.equal(outputT2);

      // Test Vector 3 - BufferSource is DataView.
      let inputT3 = new DataView((new Uint8Array([102, 111, 111])).buffer);
      let outputT3 = new Uint8Array([102, 111, 111]);
      let resultT3 = Convert.bufferSource(inputT3).toUint8Array();
      expect(resultT3).to.deep.equal(outputT3);

      // Test Vector 4 - BufferSource is an unsigned, 16-bit Typed Array.
      let inputT4 = new Uint16Array([299]);
      let outputT4 = new Uint8Array([43, 1]);
      let resultT4 = Convert.bufferSource(inputT4).toUint8Array();
      expect(resultT4).to.deep.equal(outputT4);

      // Test Vector 5 - BufferSource is a signed, 32-bit Typed Array.
      let inputT5 = new Int32Array([1111]);
      let outputT5 = new Uint8Array([87, 4, 0, 0]);
      let resultT5 = Convert.bufferSource(inputT5).toUint8Array();
      expect(resultT5).to.deep.equal(outputT5);
    });

    it('throws an error if input data type is not ArrayBuffer, DataView, or TypedArray', () => {
      // Test Vector 1 - BufferSource is Uint8Array.
      let input = 'not BufferSource type';
      // @ts-expect-error because incorrect input data type is intentionally being used to trigger error.
      expect (() => Convert.bufferSource(input).toUint8Array()).to.throw(TypeError, 'value is not of type');
    });
  });

  describe('from: Object', () => {
    it('to: Base64url', () => {
      // Test Vector 1.
      let input = { foo: 'bar' };
      let output = 'eyJmb28iOiJiYXIifQ';

      const result = Convert.object(input).toBase64Url();

      expect(result).to.deep.equal(output);
    });

    it('to: String', () => {
      // Test Vector 1.
      let input = { foo: 'bar' };
      let output = '{"foo":"bar"}';

      const result = Convert.object(input).toString();

      expect(result).to.deep.equal(output);
    });

    it('to: Uint8Array', () => {
      // Test Vector 1.
      let input = { foo: 'bar' };
      let output = new Uint8Array([123, 34, 102, 111, 111, 34, 58, 34, 98, 97, 114, 34, 125]);

      const result = Convert.object(input).toUint8Array();

      expect(result).to.deep.equal(output);
    });
  });

  describe('from: String', () => {
    it('to: Base64url', () => {
      // Test Vector 1.
      let input = 'foo';
      let output = 'Zm9v';

      const result = Convert.string(input).toBase64Url();

      expect(result).to.deep.equal(output);
    });

    it('to: Object', () => {
      // Test Vector 1.
      let input = '{"foo":"bar"}';
      let output = { foo: 'bar' };

      const result = Convert.string(input).toObject();

      expect(result).to.deep.equal(output);
    });

    it('to: Uint8Array', () => {
      // Test Vector 1.
      let input = 'foo';
      let output = new Uint8Array([102, 111, 111]);

      const result = Convert.string(input).toUint8Array();

      expect(result).to.deep.equal(output);
    });
  });

  describe('from: Uint8Array', () => {
    it('to: Base64url', () => {
      // Test Vector 1.
      let input = new Uint8Array([51, 52, 53]);
      let output = 'MzQ1';

      let result = Convert.uint8Array(input).toBase64Url();

      expect(result).to.deep.equal(output);
    });

    it('to: Object', () => {
      // Test Vector 1.
      let input = new Uint8Array([123, 34, 102, 111, 111, 34, 58, 34, 98, 97, 114, 34, 125]);
      let output = { foo: 'bar' };

      const result = Convert.uint8Array(input).toObject();

      expect(result).to.deep.equal(output);
    });

    it('to: String', () => {
      // Test Vector 1.
      let input = new Uint8Array([102, 111, 111]);
      let output = 'foo';

      const result = Convert.uint8Array(input).toString();

      expect(result).to.deep.equal(output);
    });
  });

  describe('Unsupported conversions', () => {

    const unsupported = new Convert(null, 'Unobtanium');

    it('toBase64url() throw an error', () => {
      expect(() => unsupported.toBase64Url()).to.throw(TypeError, 'not supported');
    });

    it('toObject() throw an error', () => {
      expect(() => unsupported.toObject()).to.throw(TypeError, 'not supported');
    });

    it('toString() throw an error', () => {
      expect(() => unsupported.toString()).to.throw(TypeError, 'not supported');
    });

    it('toUint8Array() throw an error', () => {
      expect(() => unsupported.toUint8Array()).to.throw(TypeError, 'not supported');
    });
  });
});

describe('isDefined()', () => {
  it('should return true for defined non-null values', () => {
    expect(isDefined('string')).to.equal(true);
    expect(isDefined(42)).to.equal(true);
    expect(isDefined(false)).to.equal(true);
    expect(isDefined({})).to.equal(true);
    expect(isDefined([])).to.equal(true);
  });

  it('should return false for undefined or null', () => {
    expect(isDefined(undefined)).to.equal(false);
    expect(isDefined(null)).to.equal(false);
  });
});

describe('universalTypeOf()', () => {
  it('should correctly identify Array', () => {
    expect(universalTypeOf([1, 2, 3])).to.equal('Array');
  });

  it('should correctly identify ArrayBuffer', () => {
    expect(universalTypeOf(new ArrayBuffer(2))).to.equal('ArrayBuffer');
  });

  it('should correctly identify Boolean', () => {
    expect(universalTypeOf(true)).to.equal('Boolean');
  });

  it('should correctly identify Number', () => {
    expect(universalTypeOf(42)).to.equal('Number');
  });

  it('should correctly identify Null', () => {
    expect(universalTypeOf(null)).to.equal('Null');
  });

  it('should correctly identify Object', () => {
    expect(universalTypeOf({a: 1, b: 2})).to.equal('Object');
  });

  it('should correctly identify String', () => {
    expect(universalTypeOf('some string')).to.equal('String');
  });

  it('should correctly identify Uint8Array', () => {
    expect(universalTypeOf(new Uint8Array([1, 2, 3]))).to.equal('Uint8Array');
  });

  it('should correctly identify Undefined', () => {
    expect(universalTypeOf(undefined)).to.equal('Undefined');
  });
});