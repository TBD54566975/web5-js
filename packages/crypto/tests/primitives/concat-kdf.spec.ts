import chai, { expect } from 'chai';
import { Convert } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';

import { ConcatKdf } from '../../src/primitives/concat-kdf.js';

chai.use(chaiAsPromised);

describe('ConcatKdf', () => {
  describe('deriveKey()', () => {
    it('matches RFC 7518 ECDH-ES key agreement computation example', async () => {
      // Test vector 1
      const inputSharedSecret = 'nlbZHYFxNdNyg0KDv4QmnPsxbqPagGpI9tqneYz-kMQ';
      const input = {
        sharedSecret : Convert.base64Url(inputSharedSecret).toUint8Array(),
        keyDataLen   : 128,
        fixedInfo    : {
          algorithmId : 'A128GCM',
          partyUInfo  : 'Alice',
          partyVInfo  : 'Bob',
          suppPubInfo : 128
        }
      };
      const output = 'VqqN6vgjbSBcIijNcacQGg';

      const derivedKeyingMaterial = await ConcatKdf.deriveKey(input);

      const expectedResult = Convert.base64Url(output).toUint8Array();
      expect(derivedKeyingMaterial).to.deep.equal(expectedResult);
      expect(derivedKeyingMaterial.byteLength).to.equal(16);
    });

    it('accepts other info as String and TypedArray', async () => {
      const inputBase = {
        sharedSecret : new Uint8Array([1, 2, 3]),
        keyDataLen   : 256,
        fixedInfo    : {}
      };

      // String input.
      const inputString = { ...inputBase, fixedInfo: {
        algorithmId : 'A128GCM',
        partyUInfo  : 'Alice',
        partyVInfo  : 'Bob',
        suppPubInfo : 128
      }};
      let derivedKeyingMaterial = await ConcatKdf.deriveKey(inputString);
      expect(derivedKeyingMaterial).to.be.an('Uint8Array');
      expect(derivedKeyingMaterial.byteLength).to.equal(32);

      // TypedArray input.
      const inputTypedArray = { ...inputBase, fixedInfo: {
        algorithmId : 'A128GCM',
        partyUInfo  : Convert.string('Alice').toUint8Array(),
        partyVInfo  : Convert.string('Bob').toUint8Array(),
        suppPubInfo : 128
      }};
      derivedKeyingMaterial = await ConcatKdf.deriveKey(inputTypedArray);
      expect(derivedKeyingMaterial).to.be.an('Uint8Array');
      expect(derivedKeyingMaterial.byteLength).to.equal(32);
    });

    it('throws error if multi-round Concat KDF attempted', async () => {
      await expect(
        // @ts-expect-error because only parameters needed to trigger the error are specified.
        ConcatKdf.deriveKey({ keyDataLen: 512 })
      ).to.eventually.be.rejectedWith(Error, 'rounds not supported');
    });

    it('throws an error if suppPubInfo is not a Number', async () => {
      await expect(
        ConcatKdf.deriveKey({
          sharedSecret : new Uint8Array([1, 2, 3]),
          keyDataLen   : 128,
          fixedInfo    : {
            algorithmId : 'A128GCM',
            partyUInfo  : 'Alice',
            partyVInfo  : 'Bob',
            // @ts-expect-error because a string is specified to trigger an error.
            suppPubInfo : '128',
          }
        })
      ).to.eventually.be.rejectedWith(TypeError, 'Fixed length input must be a number');
    });
  });

  describe('computeFixedInfo()', () => {
    it('returns concatenated and formatted Uint8Array', () => {
      const input = {
        algorithmId  : 'A128GCM',
        partyUInfo   : 'Alice',
        partyVInfo   : 'Bob',
        suppPubInfo  : 128,
        suppPrivInfo : 'gI0GAILBdu7T53akrFmMyGcsF3n5dO7MmwNBHKW5SV0'
      };
      const output = 'AAAAB0ExMjhHQ00AAAAFQWxpY2UAAAADQm9iAAAAgAAAACtnSTBHQUlMQmR1N1Q1M2FrckZtTXlHY3NGM241ZE83TW13TkJIS1c1U1Yw';

      // @ts-expect-error because computeFixedInfo() is a private method.
      const fixedInfo = ConcatKdf.computeFixedInfo(input);

      const expectedResult = Convert.base64Url(output).toUint8Array();
      expect(fixedInfo).to.deep.equal(expectedResult);
    });

    it('matches RFC 7518 ECDH-ES key agreement computation example', async () => {
      // Test vector 1.
      const input = {
        algorithmId : 'A128GCM',
        partyUInfo  : 'Alice',
        partyVInfo  : 'Bob',
        suppPubInfo : 128
      };
      const output = 'AAAAB0ExMjhHQ00AAAAFQWxpY2UAAAADQm9iAAAAgA';

      // @ts-expect-error because computeFixedInfo() is a private method.
      const fixedInfo = ConcatKdf.computeFixedInfo(input);

      const expectedResult = Convert.base64Url(output).toUint8Array();
      expect(fixedInfo).to.deep.equal(expectedResult);
    });
  });
});