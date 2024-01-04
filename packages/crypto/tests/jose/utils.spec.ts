import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { canonicalize } from '../../src/jose/utils.js';

chai.use(chaiAsPromised);

describe('JOSE Utils', () => {
  describe('canonicalize', () => {
    it('returns the stringified version of an object with its keys sorted alphabetically', () => {
      const obj = { banana: 1, apple: 2, cherry: 3 };
      const expectedResult = '{"apple":2,"banana":1,"cherry":3}';
      expect(canonicalize(obj)).to.equal(expectedResult);
    });

    it('handles an empty object', () => {
      const obj = {};
      const expectedResult = '{}';
      expect(canonicalize(obj)).to.equal(expectedResult);
    });

    it('handles an object with nested properties', () => {
      const obj = { c: 3, a: { z: 1, b: 2 } };
      const expectedResult = '{"a":{"b":2,"z":1},"c":3}';
      expect(canonicalize(obj)).to.equal(expectedResult);
    });

    it('handles an object with array values', () => {
      const obj = { b: [3, 2, 1], a: [1, 2, 3] };
      const expectedResult = '{"a":[1,2,3],"b":[3,2,1]}';
      expect(canonicalize(obj)).to.equal(expectedResult);
    });

    it('handles an object with null values', () => {
      const obj = { b: null, a: 1 };
      const expectedResult = '{"a":1,"b":null}';
      expect(canonicalize(obj)).to.equal(expectedResult);
    });

    it('handles an object with undefined values', () => {
      const obj = { b: undefined, a: 1 };
      const expectedResult = '{"a":1}';
      expect(canonicalize(obj)).to.equal(expectedResult);
    });
  });
});