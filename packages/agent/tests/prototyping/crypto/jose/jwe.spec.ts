import { expect } from 'chai';

import { CompactJwe } from '../../../../src/prototyping/crypto/jose/jwe.js';

// describe('CompactJwe', () => {
//   describe('decrypt()', () => {
//     it('returns the protected header and decrypted payload', () => {
//       const decrypted = CompactJwe.decrypt({
//         jwe : 'a.b.c.d.e',
//         key : 'keyUri'
//       });
//     });
//   });

//   describe('encrypt()', () => {
//     it('encrypts and returns a JWE', () => {
//       const decrypted = CompactJwe.encrypt({
//         algorithm : '',
//         jwe       : 'a.b.c.d.e',
//         key       : 'keyUri'
//       });
//     });
//   });
// });