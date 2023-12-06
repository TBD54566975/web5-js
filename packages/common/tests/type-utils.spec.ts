import { expect } from 'chai';

import { isAsyncIterable, isDefined, universalTypeOf } from '../src/type-utils.js';

describe('Type Utils', () => {
  describe('isAsyncIterable()', () => {
    it('should return true for a valid AsyncIterable', () => {
      const asyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield 1;
          yield 2;
        }
      };
      expect(isAsyncIterable(asyncIterator)).to.be.true;
    });

    it('should return false for non-object types', () => {
      expect(isAsyncIterable(123)).to.be.false;
      expect(isAsyncIterable('string')).to.be.false;
      expect(isAsyncIterable(true)).to.be.false;
      expect(isAsyncIterable(undefined)).to.be.false;
    });

    it('should return false for null', () => {
      expect(isAsyncIterable(null)).to.be.false;
    });

    it('should return false for an object without [Symbol.asyncIterator]', () => {
      const regularObject = { a: 1, b: 2 };
      expect(isAsyncIterable(regularObject)).to.be.false;
    });

    it('should return false for an object with a non-function [Symbol.asyncIterator]', () => {
      const invalidAsyncIterator = { [Symbol.asyncIterator]: 123 };
      expect(isAsyncIterable(invalidAsyncIterator)).to.be.false;
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

    it('should correctly identify Blob', () => {
      expect(universalTypeOf(new Blob(['foo']))).to.equal('Blob');
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

});