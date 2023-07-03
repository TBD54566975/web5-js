import { expect } from 'chai';

import { bytesToBase58btcMultibase } from '../src/utils.js';
import { checkValidProperty, checkRequiredProperty, uuid } from '../src/utils-key-manager.js';

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

  describe('checkValidProperty()', () => {
    it('should not throw for a property in the allowed list', () => {
      expect(() => checkValidProperty({ property: 'foo', allowedProperties: ['foo', 'bar']})).to.not.throw();
      expect(() => checkValidProperty({ property: 'foo', allowedProperties: new Set(['foo', 'bar'])})).to.not.throw();
      expect(() => checkValidProperty({ property: 'foo', allowedProperties: new Map([['foo', 1], ['bar', 2]])})).to.not.throw();
    });

    it('throws an error if required arguments are missing', () => {
      expect(() => checkValidProperty({ property: 'foo' } as any)).to.throw(TypeError, 'required arguments missing');
      expect(() => checkValidProperty({ allowedProperties: ['foo', 'bar'] } as any)).to.throw(TypeError, 'required arguments missing');
      // @ts-expect-error because both arguments are intentionally omitted.
      expect(() => checkValidProperty()).to.throw(TypeError, 'required arguments missing');
    });

    it('throws an error if the property does not exist', () => {
      expect(() => checkValidProperty({ property: 'baz', allowedProperties: ['foo', 'bar']})).to.throw(TypeError, 'Out of range');
      expect(() => checkValidProperty({ property: 'baz', allowedProperties: new Set(['foo', 'bar'])})).to.throw(TypeError, 'Out of range');
      expect(() => checkValidProperty({ property: 'baz', allowedProperties: new Map([['foo', 1], ['bar', 2]])})).to.throw(TypeError, 'Out of range');
    });

  });

  describe('checkRequiredProperty', () => {
    it('throws an error if required arguments are missing', () => {
    // @ts-expect-error because second argument is intentionally omitted.
      expect(() => checkRequiredProperty({ property: 'foo' })).to.throw('required arguments missing');
      // @ts-expect-error because both arguments are intentionally omitted.
      expect(() => checkRequiredProperty()).to.throw('required arguments missing');
    });

    it('throws an error if the property is missing', () => {
      const propertiesCollection = { foo: 'bar', baz: 'qux' };
      expect(() => checkRequiredProperty({ property: 'quux', inObject: propertiesCollection })).to.throw('Required parameter was missing');
    });

    it('does not throw an error if the property is present', () => {
      const propertiesCollection = { foo: 'bar', baz: 'qux' };
      expect(() => checkRequiredProperty({ property: 'foo', inObject: propertiesCollection })).to.not.throw();
    });
  });

  describe('uuid()', () => {
    it('should generate a valid v4 UUID', () => {
      const id = uuid();
      expect(id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(id).to.have.length(36);
    });

    it('should generate different UUIDs', () => {
      const id1 = uuid();
      const id2 = uuid();
      expect(id1).to.not.equal(id2);
    });
  });
});