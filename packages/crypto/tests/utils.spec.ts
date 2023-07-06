import { expect } from 'chai';

import { bytesToBase58btcMultibase } from '../src/utils.js';

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
});