import { expect } from 'chai';

import { keyToMultibaseId } from '../src/utils.js';

describe('DID Utils', () => {
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
});