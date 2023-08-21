import { expect } from 'chai';
import { varint } from 'multiformats';

import { Multicodec } from '../src/multicodec.js';

describe('Multicodec', () => {
  let mockEd25519PublicKey = (new Uint8Array(32)).fill(9);

  describe('addPrefix()', () => {
    it('returns Uint8Array with prefixed codec by code', () => {
      const input = 0xed;
      const output = new Uint8Array([0xed, 0x01]);

      const prefixedData = Multicodec.addPrefix({ code: input, data: mockEd25519PublicKey });

      expect(prefixedData).to.be.a('Uint8Array');
      const [_, codeByteLength] = varint.decode(prefixedData);
      expect(prefixedData.byteLength).to.equal(codeByteLength + mockEd25519PublicKey.byteLength);
      expect(prefixedData.slice(0, codeByteLength)).to.deep.equal(output);
    });

    it('returns Uint8Array with prefixed codec by name', () => {
      const input = 'ed25519-pub';
      const output = new Uint8Array([0xed, 0x01]);

      const prefixedData = Multicodec.addPrefix({ name: input, data: mockEd25519PublicKey });

      const [_, codeByteLength] = varint.decode(prefixedData);
      expect(prefixedData.byteLength).to.equal(codeByteLength + mockEd25519PublicKey.byteLength);
      expect(prefixedData.slice(0, codeByteLength)).to.deep.equal(output);
    });

    it('passes Multicodec test vectors', () => {
      Multicodec.registerCodec({ code: 0x3ffff, name: 'test-vector-3' });
      Multicodec.registerCodec({ code: 0x3fffff, name: 'test-vector-4' });

      // Test vectors.
      const testVectors: [number, ArrayLike<number>][] = [
        [0xed, [0xed, 0x01]],
        [0x1300, [0x80, 0x26]],
        [0x3ffff, [0xff, 0xff, 0x0f]],
        [0x3fffff, [0xff, 0xff, 0xff, 0x01]],
      ];

      testVectors.forEach(([input, output]) => {
        const prefixedData = Multicodec.addPrefix({ code: input, data: mockEd25519PublicKey });
        const [_, codeByteLength] = varint.decode(prefixedData);
        expect(prefixedData.byteLength).to.equal(codeByteLength + mockEd25519PublicKey.byteLength);
        expect(prefixedData.slice(0, codeByteLength)).to.deep.equal(new Uint8Array(output));
      });
    });

    it('throws an error when code and name input data missing', () => {
      expect(
        () => Multicodec.addPrefix({ data: new Uint8Array(0) })
      ).to.throw(Error, `Either 'name' or 'code' must be defined, but not both.`);
    });

    it('throws an error when both code and name specified', () => {
      expect(
        () => Multicodec.addPrefix({ code: 0x99999, name: 'non-existent', data: new Uint8Array(0) })
      ).to.throw(Error, `Either 'name' or 'code' must be defined, but not both.`);
    });

    it('throws an error when codec not found', () => {
      expect(
        () => Multicodec.addPrefix({ code: 0x99999, data: new Uint8Array(0) })
      ).to.throw(Error, 'Unsupported multicodec: 629145');

      expect(
        () => Multicodec.addPrefix({ name: 'non-existent', data: new Uint8Array(0) })
      ).to.throw(Error, 'Unsupported multicodec: non-existent');
    });
  });

  describe('getCodeFromData()', () => {
    it('returns codec code as a number', () => {
      const input = 0xed;
      const output = 237;
      const prefixedData = Multicodec.addPrefix({ code: input, data: mockEd25519PublicKey });

      const codecCode = Multicodec.getCodeFromData({ prefixedData });
      expect(codecCode).to.be.a('Number');
      expect(codecCode).to.equal(output);
    });
  });

  describe('removePrefix()', () => {
    it('returns code, name, and data', () => {
      const input = new Uint8Array([0xed, 0x01, 0, 1, 2, 3]);

      const { code, data, name } = Multicodec.removePrefix({ prefixedData: input });

      expect(code).to.be.a('Number');
      expect(data).to.be.a('Uint8Array');
      expect(name).to.be.a('String');
    });

    it('returns data as Uint8Array with prefixed codec removed', () => {
      const input = new Uint8Array([0xed, 0x01, 0, 1, 2, 3]);
      const output = new Uint8Array([0, 1, 2, 3]);

      const { data } = Multicodec.removePrefix({ prefixedData: input });

      expect(data).to.be.a('Uint8Array');
      expect(data).to.deep.equal(output);
    });

    it('passes Multicodec test vectors', () => {
      Multicodec.registerCodec({ code: 0x3ffff, name: 'test-vector-3' });
      Multicodec.registerCodec({ code: 0x3fffff, name: 'test-vector-4' });

      // Test vectors.
      const testVectors: [ArrayLike<number>, ArrayLike<number>][] = [
        [[0xed, 0x01, 0, 1], [0, 1]],
        [[0x80, 0x26, 0, 1], [0, 1]],
        [[0xff, 0xff, 0x0f, 0, 1], [0, 1]],
        [[0xff, 0xff, 0xff, 0x01, 0, 1], [0, 1]],
      ];

      testVectors.forEach(([input, output]) => {
        const prefixedData = new Uint8Array(input);
        const [_, codeByteLength] = varint.decode(prefixedData);
        const { data } = Multicodec.removePrefix({ prefixedData });
        expect(data.byteLength).to.equal(prefixedData.byteLength - codeByteLength);
        expect(data).to.deep.equal(new Uint8Array(output));
      });
    });

    it('throws an error when codec not found', () => {
      const prefix = new Uint8Array([100, 100]);
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const dataWithPrefix = new Uint8Array(prefix.byteLength + data.byteLength);
      dataWithPrefix.set(prefix, 0);
      dataWithPrefix.set(data, prefix.length);

      expect(
        () => Multicodec.removePrefix({ prefixedData: dataWithPrefix })
      ).to.throw(Error, 'Unsupported multicodec: 100');
    });
  });
});