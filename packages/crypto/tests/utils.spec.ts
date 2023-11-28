import { expect } from 'chai';
import * as sinon from 'sinon';

import {
  randomUuid,
  keyToMultibaseId,
  multibaseIdToKey,
  checkValidProperty,
  isWebCryptoSupported,
  checkRequiredProperty,
} from '../src/utils.js';

describe('Crypto Utils', () => {
  describe('checkValidProperty()', () => {
    it('should not throw for a property in the allowed list', () => {
      expect(() => checkValidProperty({ property: 'foo', allowedProperties: ['foo', 'bar']})).to.not.throw();
      expect(() => checkValidProperty({ property: 'foo', allowedProperties: new Set(['foo', 'bar'])})).to.not.throw();
      expect(() => checkValidProperty({ property: 'foo', allowedProperties: new Map([['foo', 1], ['bar', 2]])})).to.not.throw();
    });

    it('throws an error if required parameters are missing', () => {
      expect(() => checkValidProperty({ property: 'foo' } as any)).to.throw(TypeError, 'required parameters missing');
      expect(() => checkValidProperty({ allowedProperties: ['foo', 'bar'] } as any)).to.throw(TypeError, 'required parameters missing');
      // @ts-expect-error because both arguments are intentionally omitted.
      expect(() => checkValidProperty()).to.throw(TypeError, 'required parameters missing');
    });

    it('throws an error if the property does not exist', () => {
      expect(() => checkValidProperty({ property: 'baz', allowedProperties: ['foo', 'bar']})).to.throw(TypeError, 'Out of range');
      expect(() => checkValidProperty({ property: 'baz', allowedProperties: new Set(['foo', 'bar'])})).to.throw(TypeError, 'Out of range');
      expect(() => checkValidProperty({ property: 'baz', allowedProperties: new Map([['foo', 1], ['bar', 2]])})).to.throw(TypeError, 'Out of range');
    });

  });

  describe('checkRequiredProperty', () => {
    it('throws an error if required parameters are missing', () => {
    // @ts-expect-error because second argument is intentionally omitted.
      expect(() => checkRequiredProperty({ property: 'foo' })).to.throw('required parameters missing');
      // @ts-expect-error because both arguments are intentionally omitted.
      expect(() => checkRequiredProperty()).to.throw('required parameters missing');
    });

    it('throws an error if the property is missing', () => {
      const propertiesCollection = { foo: 'bar', baz: 'qux' };
      expect(() => checkRequiredProperty({ property: 'quux', inObject: propertiesCollection })).to.throw('Required parameter missing');
    });

    it('does not throw an error if the property is present', () => {
      const propertiesCollection = { foo: 'bar', baz: 'qux' };
      expect(() => checkRequiredProperty({ property: 'foo', inObject: propertiesCollection })).to.not.throw();
    });
  });

  describe('isWebCryptoSupported()', () => {
    afterEach(() => {
      // Restore the original state after each test
      sinon.restore();
    });

    it('returns true if the Web Crypto API is supported', () => {
      expect(isWebCryptoSupported()).to.be.true;
    });

    it('returns false if Web Crypto API is not supported', function () {
      // Mock an unsupported environment
      sinon.stub(globalThis, 'crypto').value({});

      expect(isWebCryptoSupported()).to.be.false;
    });
  });

  describe('keyToMultibaseId()', () => {
    it('returns a multibase encoded string', () => {
      const input = {
        key            : new Uint8Array(32),
        multicodecName : 'ed25519-pub',
      };
      const encoded = keyToMultibaseId({ key: input.key, multicodecName: input.multicodecName });
      expect(encoded).to.be.a.string;
      expect(encoded.substring(0, 1)).to.equal('z');
      expect(encoded.substring(1, 4)).to.equal('6Mk');
    });

    it('passes test vectors', () => {
      let input: { key: Uint8Array, multicodecName: string };
      let output: string;
      let encoded: string;

      // Test Vector 1.
      input = {
        key            : (new Uint8Array(32)).fill(0),
        multicodecName : 'ed25519-pub',
      };
      output = 'z6MkeTG3bFFSLYVU7VqhgZxqr6YzpaGrQtFMh1uvqGy1vDnP';
      encoded = keyToMultibaseId({ key: input.key, multicodecName: input.multicodecName });
      expect(encoded).to.equal(output);

      // Test Vector 2.
      input = {
        key            : (new Uint8Array(32)).fill(1),
        multicodecName : 'ed25519-pub',
      };
      output = 'z6MkeXBLjYiSvqnhFb6D7sHm8yKm4jV45wwBFRaatf1cfZ76';
      encoded = keyToMultibaseId({ key: input.key, multicodecName: input.multicodecName });
      expect(encoded).to.equal(output);

      // Test Vector 3.
      input = {
        key            : (new Uint8Array(32)).fill(9),
        multicodecName : 'ed25519-pub',
      };
      output = 'z6Mkf4XhsxSXfEAWNK6GcFu7TyVs21AfUTRjiguqMhNQeDgk';
      encoded = keyToMultibaseId({ key: input.key, multicodecName: input.multicodecName });
      expect(encoded).to.equal(output);
    });
  });

  describe('multibaseIdToKey()', () => {
    it('Converts secp256k1-pub multibase identifiers', () => {
      const multibaseKeyId = 'zQ3shMrXA3Ah8h5asMM69USP8qRDnPaCLRV3nPmitAXVfWhgp';

      const { key, multicodecCode, multicodecName } = multibaseIdToKey({ multibaseKeyId });

      expect(key).to.exist;
      expect(key).to.be.a('Uint8Array');
      expect(key).to.have.length(33);
      expect(multicodecCode).to.exist;
      expect(multicodecCode).to.equal(231);
      expect(multicodecName).to.exist;
      expect(multicodecName).to.equal('secp256k1-pub');
    });

    it('Converts ed25519-pub multibase identifiers', () => {
      const multibaseKeyId = 'z6MkizSHspkM891CAnYZis1TJkB4fWwuyVjt4pV93rWPGYwW';

      const { key, multicodecCode, multicodecName } = multibaseIdToKey({ multibaseKeyId });

      expect(key).to.exist;
      expect(key).to.be.a('Uint8Array');
      expect(key).to.have.length(32);
      expect(multicodecCode).to.exist;
      expect(multicodecCode).to.equal(237);
      expect(multicodecName).to.exist;
      expect(multicodecName).to.equal('ed25519-pub');
    });

    it('Converts x25519-pub multibase identifiers', () => {
      const multibaseKeyId = 'z6LSfsF6tQA7j56WSzNPT4yrzZprzGEK8137DMeAVLgGBJEz';

      const { key, multicodecCode, multicodecName } = multibaseIdToKey({ multibaseKeyId });

      expect(key).to.exist;
      expect(key).to.be.a('Uint8Array');
      expect(key).to.have.length(32);
      expect(multicodecCode).to.exist;
      expect(multicodecCode).to.equal(236);
      expect(multicodecName).to.exist;
      expect(multicodecName).to.equal('x25519-pub');
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