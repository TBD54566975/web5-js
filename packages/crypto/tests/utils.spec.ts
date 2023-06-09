import { expect } from 'chai';

import { bytesToBase58btcMultibase, checkPropertyExists, checkRequiredProperty } from '../src/utils.js';

describe('Crypto Utils', () => {
  describe('bytesToBase58btcMultibase()', () => {
    it('returns a multibase encoded string', () => {
    // Test Vector 1.
      const input = {
        header : new Uint8Array([0x00, 0x00]),
        data   : new Uint8Array([0x00, 0x00])
      };
      const output = 'z1111';
      const encoded = bytesToBase58btcMultibase(input.header, input.data);
      expect(encoded).to.be.a.string;
      expect(encoded.substring(0, 1)).to.equal('z');
      expect(encoded).to.deep.equal(output);
    });


    it('returns multibase encoded value with specified header', () => {
    // Test Vector 1.
      const input = {
        header : new Uint8Array([0x01, 0x02]),
        data   : new Uint8Array([3, 4, 5, 6, 7])
      };
      const output = 'z3DUyZY2dc';

      const encoded = bytesToBase58btcMultibase(input.header, input.data);
      expect(encoded).to.deep.equal(output);
    });
  });

  describe('checkPropertyExists()', () => {
    it('throws an error if required arguments are missing', () => {
    // @ts-expect-error because second argument is intentionally omitted.
      expect(() => checkPropertyExists('foo')).to.throw('required arguments missing');
      // @ts-expect-error because both arguments are intentionally omitted.
      expect(() => checkPropertyExists()).to.throw('required arguments missing');
    });

    it('throws an error if the property does not exist', () => {
      const propertiesCollection = ['foo', 'bar'];
      expect(() => checkPropertyExists('baz', propertiesCollection)).to.throw('Out of range');
    });

    it('does not throw an error if the property exists', () => {
      const propertiesCollection = ['foo', 'bar'];
      expect(() => checkPropertyExists('foo', propertiesCollection)).to.not.throw();
    });
  });

  describe('checkRequiredProperty', () => {
    it('throws an error if required arguments are missing', () => {
    // @ts-expect-error because second argument is intentionally omitted.
      expect(() => checkRequiredProperty('foo')).to.throw('required arguments missing');
      // @ts-expect-error because both arguments are intentionally omitted.
      expect(() => checkRequiredProperty()).to.throw('required arguments missing');
    });

    it('throws an error if the property is missing', () => {
      const propertiesCollection = { foo: 'bar', baz: 'qux' };
      expect(() => checkRequiredProperty('quux', propertiesCollection)).to.throw('Required parameter was missing');
    });

    it('does not throw an error if the property is present', () => {
      const propertiesCollection = { foo: 'bar', baz: 'qux' };
      expect(() => checkRequiredProperty('foo', propertiesCollection)).to.not.throw();
    });
  });
});