import { expect } from 'chai';

import { Convert } from '../src/convert.js';

describe('Convert', () =>{
  describe('from: ArrayBuffer', () => {
    it('to: Base58Btc', () => {
      // Test Vector 1.
      let input = (new Uint8Array([51, 52, 53])).buffer;
      let output = 'JCXv';

      let result = Convert.arrayBuffer(input).toBase58Btc();

      expect(result).to.deep.equal(output);
    });

    it('to: Base64Url', () => {
      // Test Vector 1.
      let input = (new Uint8Array([51, 52, 53])).buffer;
      let output = 'MzQ1';

      let result = Convert.arrayBuffer(input).toBase64Url();

      expect(result).to.deep.equal(output);
    });

    it('to: Hex', () => {
      // Test Vector 1.
      let input = (new Uint8Array([0xab, 0xba, 0xfa, 0xab])).buffer;
      let output = 'abbafaab';
      const result = Convert.arrayBuffer(input).toHex();
      expect(result).to.deep.equal(output);
    });

    it('to: String', () => {
      // Test Vector 1.
      let input = (new Uint8Array([102, 111, 111])).buffer;
      let output = 'foo';

      const result = Convert.arrayBuffer(input).toString();

      expect(result).to.deep.equal(output);
    });

    it('to: Uint8Array', () => {
      // Test Vector 1.
      let input = (new Uint8Array([102, 111, 111])).buffer;
      let output = new Uint8Array([102, 111, 111]);

      let result = Convert.arrayBuffer(input).toUint8Array();

      expect(result).to.deep.equal(output);
    });
  });

  describe('from: Base58Btc', () => {
    it('to: ArrayBuffer', () => {
      // Test Vector 1.
      let input = 'JCXv';
      let output = (new Uint8Array([51, 52, 53])).buffer;

      let result = Convert.base58Btc(input).toArrayBuffer();

      expect(result).to.deep.equal(output);
    });

    it('to: Multibase', () => {
      // Test Vector 1.
      let input = '6MkugFXawZ8fvt5Q9gXkrtSZdTRg9W9M1hBpEh8HpF7wjSZ';
      let output = 'z6MkugFXawZ8fvt5Q9gXkrtSZdTRg9W9M1hBpEh8HpF7wjSZ';

      let result = Convert.base58Btc(input).toMultibase();

      expect(result).to.deep.equal(output);
    });

    it('to: Uint8Array', () => {
      // Test Vector 1.
      let input = 'JCXv';
      let output = new Uint8Array([51, 52, 53]);

      let result = Convert.base58Btc(input).toUint8Array();

      expect(result).to.deep.equal(output);
    });
  });

  describe('from: Base64Url', () => {
    it('to: ArrayBuffer', () => {
      // Test Vector 1.
      let input = 'MzQ1';
      let output = (new Uint8Array([51, 52, 53])).buffer;

      let result = Convert.base64Url(input).toArrayBuffer();

      expect(result).to.deep.equal(output);
    });

    it('to: Object', () => {
      // Test Vector 1.
      let input = 'eyJmb28iOiJiYXIifQ';
      let output = { foo: 'bar' };

      let result = Convert.base64Url(input).toObject();

      expect(result).to.deep.equal(output);
    });

    it('to: String', () => {
      // Test Vector 1.
      let input = 'Zm9v';
      let output = 'foo';

      const result = Convert.base64Url(input).toString();

      expect(result).to.deep.equal(output);
    });

    it('to: Uint8Array', () => {
      // Test Vector 1.
      let input = 'MzQ1';
      let output = new Uint8Array([51, 52, 53]);

      let result = Convert.base64Url(input).toUint8Array();

      expect(result).to.deep.equal(output);
    });
  });

  describe('from: BufferSource', () => {
    it('to: ArrayBuffer', () => {
      // Test Vector 1 - BufferSource is Uint8Array.
      let inputT1 = new Uint8Array([101, 111, 111]);
      let outputT1 = (new Uint8Array([101, 111, 111])).buffer;
      let resultT1 = Convert.bufferSource(inputT1).toArrayBuffer();
      expect(resultT1).to.deep.equal(outputT1);

      // Test Vector 2 - BufferSource is ArrayBuffer.
      let inputT2 = (new Uint8Array([102, 111, 111])).buffer;
      let outputT2 = (new Uint8Array([102, 111, 111])).buffer;
      let resultT2 = Convert.bufferSource(inputT2).toArrayBuffer();
      expect(resultT2).to.deep.equal(outputT2);

      // Test Vector 3 - BufferSource is DataView.
      let inputT3 = new DataView((new Uint8Array([103, 111, 111])).buffer);
      let outputT3 = (new Uint8Array([103, 111, 111])).buffer;
      let resultT3 = Convert.bufferSource(inputT3).toArrayBuffer();
      expect(resultT3).to.deep.equal(outputT3);

      // Test Vector 4 - BufferSource is an unsigned, 16-bit Typed Array.
      let inputT4 = new Uint16Array([299]);
      let outputT4 = (new Uint8Array([43, 1])).buffer;
      let resultT4 = Convert.bufferSource(inputT4).toArrayBuffer();
      expect(resultT4).to.deep.equal(outputT4);

      // Test Vector 5 - BufferSource is a signed, 32-bit Typed Array.
      let inputT5 = new Int32Array([1111]);
      let outputT5 = (new Uint8Array([87, 4, 0, 0])).buffer;
      let resultT5 = Convert.bufferSource(inputT5).toArrayBuffer();
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

      // Test Vector 8 - BufferSource is Uint8Array.
      let inputT8 = 'not BufferSource type';
      // @ts-expect-error because incorrect input data type is intentionally being used to trigger error.
      expect (() => Convert.bufferSource(inputT8).toArrayBuffer()).to.throw(TypeError, 'value is not of type');
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

      // Test Vector 6 - BufferSource is Uint8Array.
      let inputT6 = 'not BufferSource type';
      // @ts-expect-error because incorrect input data type is intentionally being used to trigger error.
      expect (() => Convert.bufferSource(inputT6).toUint8Array()).to.throw(TypeError, 'value is not of type');
    });
  });

  describe('from: Hex', () => {
    it('throws an error if the input is not a string', () => {
      // Test Vector 1.
      let input = 0xaf;

      // @ts-expect-error because error is being intentionally trigger by passing non-string input.
      expect(() => Convert.hex(input)).to.throw(TypeError, 'must be a string');
    });

    it('throws an error if the input string is an odd number of characters', () => {
      // Test Vector 1.
      let input = 'faaba';

      expect(() => Convert.hex(input)).to.throw(TypeError, 'must have an even number of characters');
    });

    it('to: ArrayBuffer', () => {
      // Test Vector 1.
      let input = 'abbafaab';
      let output = (new Uint8Array([0xab, 0xba, 0xfa, 0xab])).buffer;
      const result = Convert.hex(input).toArrayBuffer();
      expect(result).to.deep.equal(output);

      // Test Vector 2.
      input = 'foobar';
      expect(() => Convert.hex(input).toArrayBuffer()).to.throw(TypeError, 'Input is not a valid hexadecimal string');
    });

    it('to: Uint8Array', () => {
      // Test Vector 1.
      let input = 'abbafaab';
      let output = new Uint8Array([0xab, 0xba, 0xfa, 0xab]);
      const result = Convert.hex(input).toUint8Array();
      expect(result).to.deep.equal(output);

      // Test Vector 2.
      input = 'foobar';
      expect(() => Convert.hex(input).toUint8Array()).to.throw(TypeError, 'Input is not a valid hexadecimal string');
    });
  });

  describe('from: Multibase', () => {
    it('to: Base58Btc', () => {
      // Test Vector 1.
      let input = 'z6MkugFXawZ8fvt5Q9gXkrtSZdTRg9W9M1hBpEh8HpF7wjSZ';
      let output = '6MkugFXawZ8fvt5Q9gXkrtSZdTRg9W9M1hBpEh8HpF7wjSZ';

      let result = Convert.multibase(input).toBase58Btc();

      expect(result).to.deep.equal(output);
    });
  });

  describe('from: Object', () => {
    it('to: Base64Url', () => {
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
    it('to: ArrayBuffer', () => {
      // Test Vector 1.
      let input = 'foo';
      let output = (new Uint8Array([102, 111, 111])).buffer;

      const result = Convert.string(input).toArrayBuffer();

      expect(result).to.deep.equal(output);
    });

    it('to: Base64Url', () => {
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
    it('to: ArrayBuffer', () => {
      // Test Vector 1.
      let input = new Uint8Array([102, 111, 111]);
      let output = (new Uint8Array([102, 111, 111])).buffer;

      let result = Convert.uint8Array(input).toArrayBuffer();

      expect(result).to.deep.equal(output);
    });

    it('to: Base58Btc', () => {
      // Test Vector 1.
      let input = new Uint8Array([51, 52, 53]);
      let output = 'JCXv';

      let result = Convert.uint8Array(input).toBase58Btc();

      expect(result).to.deep.equal(output);
    });

    it('to: Base64Url', () => {
      // Test Vector 1.
      let input = new Uint8Array([51, 52, 53]);
      let output = 'MzQ1';

      let result = Convert.uint8Array(input).toBase64Url();

      expect(result).to.deep.equal(output);
    });

    it('to: Hex', () => {
      // Test Vector 1.
      let input = new Uint8Array([0xab, 0xba, 0xfa, 0xab]);
      let output = 'abbafaab';
      const result = Convert.uint8Array(input).toHex();
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

    it('toArrayBuffer() throw an error', () => {
      expect(() => unsupported.toArrayBuffer()).to.throw(TypeError, 'not supported');
    });

    it('toBase58Btc() throw an error', () => {
      expect(() => unsupported.toBase58Btc()).to.throw(TypeError, 'not supported');
    });

    it('toBase64Url() throw an error', () => {
      expect(() => unsupported.toBase64Url()).to.throw(TypeError, 'not supported');
    });

    it('toHex() throw an error', () => {
      expect(() => unsupported.toHex()).to.throw(TypeError, 'not supported');
    });

    it('toMultibase() throw an error', () => {
      expect(() => unsupported.toMultibase()).to.throw(TypeError, 'not supported');
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