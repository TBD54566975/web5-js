import { expect } from 'chai';

import { checkValidProperty, checkRequiredProperty, randomUuid } from '../src/utils-new.js';

describe('Crypto Utils', () => {
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

  describe('randomUuid()', () => {
    it('should generate a valid v4 UUID', () => {
      const id = randomUuid();
      expect(id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(id).to.have.length(36);
    });

    it('should generate different UUIDs', () => {
      const id1 = randomUuid();
      const id2 = randomUuid();
      expect(id1).to.not.equal(id2);
    });
  });
});