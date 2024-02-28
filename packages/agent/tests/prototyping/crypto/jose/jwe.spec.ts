import { expect } from 'chai';

import { CompactJwe } from '../../../../src/prototyping/crypto/jose/jwe.js';

describe('CompactJwe', () => {
  describe('decrypt', () => {
    it('should decrypt a JWE', () => {
      const decrypted = CompactJwe.decrypt({
        jwe : 'a.b.c.d.e',
        key : 'keyUri'
      });
    });
  });
});