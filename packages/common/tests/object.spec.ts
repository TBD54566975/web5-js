import { expect } from 'chai';

import { isEmptyObject, removeEmptyObjects, removeUndefinedProperties } from '../src/object.js';

describe('Object', () => {

  describe('isEmptyObject()', () => {
    it('should return true for an empty object', () => {
      expect(isEmptyObject({})).to.be.true;
    });

    it('should return false for a non-empty object', () => {
      expect(isEmptyObject({ key: 'value' })).to.be.false;
    });

    it('should return false for null', () => {
      expect(isEmptyObject(null)).to.be.false;
    });

    it('should return true for an object with no prototype', () => {
      expect(isEmptyObject(Object.create(null))).to.be.true;
    });

    it('should return false for an object with no prototype but containing properties', () => {
      const obj = Object.create(null);
      obj.key = 'value';
      expect(isEmptyObject(obj)).to.be.false;
    });

    it('should return false for an object with symbol properties', () => {
      const symbol = Symbol('key');
      const obj = { [symbol]: 'value' };
      expect(isEmptyObject(obj)).to.be.false;
    });

    it('should return false for a non-object (number)', () => {
      expect(isEmptyObject(42)).to.be.false;
    });

    it('should return false for a non-object (string)', () => {
      expect(isEmptyObject('text')).to.be.false;
    });

    it('should return true for an object that inherits properties but has none of its own', () => {
      const parent = { parentKey: 'value' };
      const child = Object.create(parent);
      expect(isEmptyObject(child)).to.be.true;
    });
  });

  describe('removeEmptyObjects()', () => {
    it('should remove all empty objects', () => {
      const mockObject = {
        foo  : {},
        bar  : { baz: {} },
        buzz : 'hello'
      };

      const expectedResult = { buzz: 'hello' };

      removeEmptyObjects(mockObject);

      expect(mockObject).to.deep.equal(expectedResult);
    });
  });

  describe('removeUndefinedProperties()', () => {
    it('should remove all `undefined` properties of a nested object', () => {
      const mockObject = {
        a : true,
        b : undefined,
        c : {
          a : 0,
          b : undefined,
        }
      };

      const expectedResult = {
        a : true,
        c : {
          a: 0
        }
      };

      removeUndefinedProperties(mockObject);

      expect(mockObject).to.deep.equal(expectedResult);
    });
  });

});