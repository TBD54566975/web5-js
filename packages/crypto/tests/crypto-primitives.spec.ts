import sinon from 'sinon';
import chai, { expect } from 'chai';
import { Convert } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';

import { NotSupportedError } from '../src/algorithms-api/errors.js';
import { aesCtrTestVectors, aesGcmTestVectors } from './fixtures/test-vectors/aes.js';

import {
  AesCtr,
  AesGcm,
  Pbkdf2,
  ConcatKdf,
  XChaCha20,
  XChaCha20Poly1305
} from '../src/crypto-primitives/index.js';

chai.use(chaiAsPromised);

// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;

describe('Cryptographic Primitive Implementations', () => {

  describe('AesCtr', () => {
    describe('decrypt', () => {
      for (const vector of aesCtrTestVectors) {
        it(`passes test vector ${vector.id}`, async () => {
          const plaintext = await AesCtr.decrypt({
            counter : Convert.hex(vector.counter).toUint8Array(),
            data    : Convert.hex(vector.ciphertext).toUint8Array(),
            key     : Convert.hex(vector.key).toUint8Array(),
            length  : vector.length
          });
          expect(Convert.uint8Array(plaintext).toHex()).to.deep.equal(vector.data);
        });
      }

      it('accepts ciphertext input as Uint8Array', async () => {
        const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        const secretKey = await AesCtr.generateKey({ length: 256 });
        let ciphertext: Uint8Array;

        // TypedArray - Uint8Array
        ciphertext = await AesCtr.decrypt({ counter: new Uint8Array(16), data, key: secretKey, length: 128 });
        expect(ciphertext).to.be.instanceOf(Uint8Array);
      });
    });

    describe('encrypt', () => {
      for (const vector of aesCtrTestVectors) {
        it(`passes test vector ${vector.id}`, async () => {
          const ciphertext = await AesCtr.encrypt({
            counter : Convert.hex(vector.counter).toUint8Array(),
            data    : Convert.hex(vector.data).toUint8Array(),
            key     : Convert.hex(vector.key).toUint8Array(),
            length  : vector.length
          });
          expect(Convert.uint8Array(ciphertext).toHex()).to.deep.equal(vector.ciphertext);
        });
      }

      it('accepts plaintext input as Uint8Array', async () => {
        const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        const secretKey = await AesCtr.generateKey({ length: 256 });
        let ciphertext: Uint8Array;

        // Uint8Array
        ciphertext = await AesCtr.encrypt({ counter: new Uint8Array(16), data, key: secretKey, length: 128 });
        expect(ciphertext).to.be.instanceOf(Uint8Array);
      });
    });

    describe('generateKey()', () => {
      it('returns a secret key of type Uint8Array', async () => {
        const secretKey = await AesCtr.generateKey({ length: 256 });
        expect(secretKey).to.be.instanceOf(Uint8Array);
      });

      it('returns a secret key of the specified length', async () => {
        let secretKey: Uint8Array;

        // 128 bits
        secretKey= await AesCtr.generateKey({ length: 128 });
        expect(secretKey.byteLength).to.equal(16);

        // 192 bits
        secretKey= await AesCtr.generateKey({ length: 192 });
        expect(secretKey.byteLength).to.equal(24);

        // 256 bits
        secretKey= await AesCtr.generateKey({ length: 256 });
        expect(secretKey.byteLength).to.equal(32);
      });
    });
  });

  describe('AesGcm', () => {
    describe('decrypt', () => {
      for (const vector of aesGcmTestVectors) {
        it(`passes test vector ${vector.id}`, async () => {
          const plaintext = await AesGcm.decrypt({
            additionalData : Convert.hex(vector.aad).toUint8Array(),
            iv             : Convert.hex(vector.iv).toUint8Array(),
            data           : Convert.hex(vector.ciphertext + vector.tag).toUint8Array(),
            key            : Convert.hex(vector.key).toUint8Array(),
            tagLength      : vector.tagLength
          });
          expect(Convert.uint8Array(plaintext).toHex()).to.deep.equal(vector.data);
        });
      }

      it('accepts ciphertext input as Uint8Array', async () => {
        const secretKey = new Uint8Array([222, 78, 162, 222, 38, 146, 151, 191, 191, 75, 227, 71, 220, 221, 70, 49]);
        let plaintext: Uint8Array;

        // TypedArray - Uint8Array
        const ciphertext = new Uint8Array([242, 126, 129, 170, 99, 195, 21, 165, 205, 3, 226, 171, 203, 198, 42, 86, 101]);
        plaintext = await AesGcm.decrypt({ data: ciphertext, iv: new Uint8Array(12), key: secretKey, tagLength: 128 });
        expect(plaintext).to.be.instanceOf(Uint8Array);
      });
    });

    describe('encrypt', () => {
      for (const vector of aesGcmTestVectors) {
        it(`passes test vector ${vector.id}`, async () => {
          const ciphertext = await AesGcm.encrypt({
            additionalData : Convert.hex(vector.aad).toUint8Array(),
            iv             : Convert.hex(vector.iv).toUint8Array(),
            data           : Convert.hex(vector.data).toUint8Array(),
            key            : Convert.hex(vector.key).toUint8Array(),
            tagLength      : vector.tagLength
          });
          expect(Convert.uint8Array(ciphertext).toHex()).to.deep.equal(vector.ciphertext + vector.tag);
        });
      }

      it('accepts plaintext input as Uint8Array', async () => {
        const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        const secretKey = await AesGcm.generateKey({ length: 256 });
        let ciphertext: Uint8Array;

        // TypedArray - Uint8Array
        ciphertext = await AesGcm.encrypt({ data, iv: new Uint8Array(12), key: secretKey, tagLength: 128 });
        expect(ciphertext).to.be.instanceOf(Uint8Array);
      });
    });

    describe('generateKey()', () => {
      it('returns a secret key of type Uint8Array', async () => {
        const secretKey = await AesGcm.generateKey({ length: 256 });
        expect(secretKey).to.be.instanceOf(Uint8Array);
      });

      it('returns a secret key of the specified length', async () => {
        let secretKey: Uint8Array;

        // 128 bits
        secretKey= await AesGcm.generateKey({ length: 128 });
        expect(secretKey.byteLength).to.equal(16);

        // 192 bits
        secretKey= await AesGcm.generateKey({ length: 192 });
        expect(secretKey.byteLength).to.equal(24);

        // 256 bits
        secretKey= await AesGcm.generateKey({ length: 256 });
        expect(secretKey.byteLength).to.equal(32);
      });
    });
  });

  describe('ConcatKdf', () => {
    describe('deriveKey()', () => {
      it('matches RFC 7518 ECDH-ES key agreement computation example', async () => {
        // Test vector 1
        const inputSharedSecret = 'nlbZHYFxNdNyg0KDv4QmnPsxbqPagGpI9tqneYz-kMQ';
        const input = {
          sharedSecret : Convert.base64Url(inputSharedSecret).toUint8Array(),
          keyDataLen   : 128,
          otherInfo    : {
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
          otherInfo    : {}
        };

        // String input.
        const inputString = { ...inputBase, otherInfo: {
          algorithmId : 'A128GCM',
          partyUInfo  : 'Alice',
          partyVInfo  : 'Bob',
          suppPubInfo : 128
        }};
        let derivedKeyingMaterial = await ConcatKdf.deriveKey(inputString);
        expect(derivedKeyingMaterial).to.be.an('Uint8Array');
        expect(derivedKeyingMaterial.byteLength).to.equal(32);

        // TypedArray input.
        const inputTypedArray = { ...inputBase, otherInfo: {
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
        ).to.eventually.be.rejectedWith(NotSupportedError, 'rounds not supported');
      });

      it('throws an error if suppPubInfo is not a Number', async () => {
        await expect(
          ConcatKdf.deriveKey({
            sharedSecret : new Uint8Array([1, 2, 3]),
            keyDataLen   : 128,
            otherInfo    : {
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

    describe('computeOtherInfo()', () => {
      it('returns concatenated and formatted Uint8Array', () => {
        const input = {
          algorithmId  : 'A128GCM',
          partyUInfo   : 'Alice',
          partyVInfo   : 'Bob',
          suppPubInfo  : 128,
          suppPrivInfo : 'gI0GAILBdu7T53akrFmMyGcsF3n5dO7MmwNBHKW5SV0'
        };
        const output = 'AAAAB0ExMjhHQ00AAAAFQWxpY2UAAAADQm9iAAAAgAAAACtnSTBHQUlMQmR1N1Q1M2FrckZtTXlHY3NGM241ZE83TW13TkJIS1c1U1Yw';

        // @ts-expect-error because computeOtherInfo() is a private method.
        const otherInfo = ConcatKdf.computeOtherInfo(input);

        const expectedResult = Convert.base64Url(output).toUint8Array();
        expect(otherInfo).to.deep.equal(expectedResult);
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

        // @ts-expect-error because computeOtherInfo() is a private method.
        const otherInfo = ConcatKdf.computeOtherInfo(input);

        const expectedResult = Convert.base64Url(output).toUint8Array();
        expect(otherInfo).to.deep.equal(expectedResult);
      });
    });
  });

  describe('Pbkdf2', () => {
    const password = Convert.string('password').toUint8Array();
    const salt = Convert.string('salt').toUint8Array();
    const iterations = 1;
    const length = 256; // 32 bytes

    describe('deriveKey', () => {
      it('successfully derives a key using WebCrypto, if available', async () => {
        const subtleDeriveBitsSpy = sinon.spy(crypto.subtle, 'deriveBits');

        const derivedKey = await Pbkdf2.deriveKey({ hash: 'SHA-256', password, salt, iterations, length });

        expect(derivedKey).to.be.instanceOf(Uint8Array);
        expect(derivedKey.byteLength).to.equal(length / 8);
        expect(subtleDeriveBitsSpy.called).to.be.true;

        subtleDeriveBitsSpy.restore();
      });

      it('successfully derives a key using node:crypto when WebCrypto is not supported', async function () {
        // Skip test in web browsers since node:crypto is not available.
        if (typeof window !== 'undefined') this.skip();

        // Ensure that WebCrypto is not available for this test.
        sinon.stub(crypto, 'subtle').value(null);

        // @ts-expect-error because we're spying on a private method.
        const nodeCryptoDeriveKeySpy = sinon.spy(Pbkdf2, 'deriveKeyWithNodeCrypto');

        const derivedKey = await Pbkdf2.deriveKey({ hash: 'SHA-256', password, salt, iterations, length });

        expect(derivedKey).to.be.instanceOf(Uint8Array);
        expect(derivedKey.byteLength).to.equal(length / 8);
        expect(nodeCryptoDeriveKeySpy.called).to.be.true;

        nodeCryptoDeriveKeySpy.restore();
        sinon.restore();
      });

      it('derives the same value with node:crypto and WebCrypto', async function () {
        // Skip test in web browsers since node:crypto is not available.
        if (typeof window !== 'undefined') this.skip();

        const options = { hash: 'SHA-256', password, salt, iterations, length };

        // @ts-expect-error because we're testing a private method.
        const webCryptoDerivedKey = await Pbkdf2.deriveKeyWithNodeCrypto(options);
        // @ts-expect-error because we're testing a private method.
        const nodeCryptoDerivedKey = await Pbkdf2.deriveKeyWithWebCrypto(options);

        expect(webCryptoDerivedKey).to.deep.equal(nodeCryptoDerivedKey);
      });

      const hashFunctions: ('SHA-256' | 'SHA-384' | 'SHA-512')[] = ['SHA-256', 'SHA-384', 'SHA-512'];
      hashFunctions.forEach(hash => {
        it(`handles ${hash} hash function`, async () => {
          const options = { hash, password, salt, iterations, length };

          const derivedKey = await Pbkdf2.deriveKey(options);
          expect(derivedKey).to.be.instanceOf(Uint8Array);
          expect(derivedKey.byteLength).to.equal(length / 8);
        });
      });

      it('throws an error when an invalid hash function is used with WebCrypto', async () => {
        const options = {
          hash: 'SHA-2' as const, password, salt, iterations, length
        };

        // @ts-expect-error for testing purposes
        await expect(Pbkdf2.deriveKey(options)).to.eventually.be.rejectedWith(Error);
      });

      it('throws an error when an invalid hash function is used with node:crypto', async function () {
        // Skip test in web browsers since node:crypto is not available.
        if (typeof window !== 'undefined') this.skip();

        // Ensure that WebCrypto is not available for this test.
        sinon.stub(crypto, 'subtle').value(null);

        const options = {
          hash: 'SHA-2' as const, password, salt, iterations, length
        };

        // @ts-expect-error for testing purposes
        await expect(Pbkdf2.deriveKey(options)).to.eventually.be.rejectedWith(Error);

        sinon.restore();
      });

      it('throws an error when iterations count is not a positive number with WebCrypto', async () => {
        const options = {
          hash       : 'SHA-256' as const, password, salt,
          iterations : -1, length
        };

        // Every browser throws a different error message so a specific message cannot be checked.
        await expect(Pbkdf2.deriveKey(options)).to.eventually.be.rejectedWith(Error);
      });

      it('throws an error when iterations count is not a positive number with node:crypto', async function () {
        // Skip test in web browsers since node:crypto is not available.
        if (typeof window !== 'undefined') this.skip();

        // Ensure that WebCrypto is not available for this test.
        sinon.stub(crypto, 'subtle').value(null);

        const options = {
          hash       : 'SHA-256' as const, password, salt,
          iterations : -1, length
        };

        await expect(Pbkdf2.deriveKey(options)).to.eventually.be.rejectedWith(Error, 'out of range');

        sinon.restore();
      });
    });
  });

  describe('XChaCha20', () => {
    describe('decrypt()', () => {
      it('returns Uint8Array plaintext with length matching input', async () => {
        const plaintext = await XChaCha20.decrypt({
          data  : new Uint8Array(10),
          key   : new Uint8Array(32),
          nonce : new Uint8Array(24)
        });
        expect(plaintext).to.be.an('Uint8Array');
        expect(plaintext.byteLength).to.equal(10);
      });

      it('passes test vectors', async () => {
        const input = {
          data  : Convert.hex('879b10a139674fe65087f59577ee2c1ab54655d900697fd02d953f53ddcc1ae476e8').toUint8Array(),
          key   : Convert.hex('79c99798ac67300bbb2704c95c341e3245f3dcb21761b98e52ff45b24f304fc4').toUint8Array(),
          nonce : Convert.hex('b33ffd3096479bcfbc9aee49417688a0a2554f8d95389419').toUint8Array()
        };
        const output = Convert.string(`Are You There Bob? It's Me, Alice.`).toUint8Array();

        const ciphertext = await XChaCha20.decrypt({
          data  : input.data,
          key   : input.key,
          nonce : input.nonce
        });

        expect(ciphertext).to.deep.equal(output);
      });
    });

    describe('encrypt()', () => {
      it('returns Uint8Array ciphertext with length matching input', async () => {
        const ciphertext = await XChaCha20.encrypt({
          data  : new Uint8Array(10),
          key   : new Uint8Array(32),
          nonce : new Uint8Array(24)
        });
        expect(ciphertext).to.be.an('Uint8Array');
        expect(ciphertext.byteLength).to.equal(10);
      });

      it('passes test vectors', async () => {
        const input = {
          data  : Convert.string(`Are You There Bob? It's Me, Alice.`).toUint8Array(),
          key   : Convert.hex('79c99798ac67300bbb2704c95c341e3245f3dcb21761b98e52ff45b24f304fc4').toUint8Array(),
          nonce : Convert.hex('b33ffd3096479bcfbc9aee49417688a0a2554f8d95389419').toUint8Array()
        };
        const output = Convert.hex('879b10a139674fe65087f59577ee2c1ab54655d900697fd02d953f53ddcc1ae476e8').toUint8Array();

        const ciphertext = await XChaCha20.encrypt({
          data  : input.data,
          key   : input.key,
          nonce : input.nonce
        });

        expect(ciphertext).to.deep.equal(output);
      });
    });

    describe('generateKey()', () => {
      it('returns a 32-byte secret key of type Uint8Array', async () => {
        const secretKey = await XChaCha20.generateKey();
        expect(secretKey).to.be.instanceOf(Uint8Array);
        expect(secretKey.byteLength).to.equal(32);
      });
    });
  });

  describe('XChaCha20Poly1305', () => {
    describe('decrypt()', () => {
      it('returns Uint8Array plaintext with length matching input', async () => {
        const plaintext = await XChaCha20Poly1305.decrypt({
          data  : Convert.hex('789e9689e5208d7fd9e1').toUint8Array(),
          key   : new Uint8Array(32),
          nonce : new Uint8Array(24),
          tag   : Convert.hex('09701fb9f36ab77a0f136ca539229a34').toUint8Array()
        });
        expect(plaintext).to.be.an('Uint8Array');
        expect(plaintext.byteLength).to.equal(10);
      });

      it('passes test vectors', async () => {
        const input = {
          data  : Convert.hex('80246ca517c0fb5860c19090a7e7a2b030dde4882520102cbc64fad937916596ca9d').toUint8Array(),
          key   : Convert.hex('79c99798ac67300bbb2704c95c341e3245f3dcb21761b98e52ff45b24f304fc4').toUint8Array(),
          nonce : Convert.hex('b33ffd3096479bcfbc9aee49417688a0a2554f8d95389419').toUint8Array(),
          tag   : Convert.hex('9e10a121d990e6a290f6b534516aa32f').toUint8Array()
        };
        const output = Convert.string(`Are You There Bob? It's Me, Alice.`).toUint8Array();

        const plaintext = await XChaCha20Poly1305.decrypt({
          data  : input.data,
          key   : input.key,
          nonce : input.nonce,
          tag   : input.tag
        });

        expect(plaintext).to.deep.equal(output);
      });

      it('throws an error if the wrong tag is given', async () => {
        await expect(
          XChaCha20Poly1305.decrypt({
            data  : new Uint8Array(10),
            key   : new Uint8Array(32),
            nonce : new Uint8Array(24),
            tag   : new Uint8Array(16)
          })
        ).to.eventually.be.rejectedWith(Error, 'Wrong tag');
      });
    });

    describe('encrypt()', () => {
      it('returns Uint8Array ciphertext and tag', async () => {
        const { ciphertext, tag } = await XChaCha20Poly1305.encrypt({
          data  : new Uint8Array(10),
          key   : new Uint8Array(32),
          nonce : new Uint8Array(24)
        });
        expect(ciphertext).to.be.an('Uint8Array');
        expect(ciphertext.byteLength).to.equal(10);
        expect(tag).to.be.an('Uint8Array');
        expect(tag.byteLength).to.equal(16);
      });

      it('accepts additional authenticated data', async () => {
        const { ciphertext: ciphertextAad, tag: tagAad } = await XChaCha20Poly1305.encrypt({
          additionalData : new Uint8Array(64),
          data           : new Uint8Array(10),
          key            : new Uint8Array(32),
          nonce          : new Uint8Array(24)
        });

        const { ciphertext, tag } = await XChaCha20Poly1305.encrypt({
          data  : new Uint8Array(10),
          key   : new Uint8Array(32),
          nonce : new Uint8Array(24)
        });

        expect(ciphertextAad.byteLength).to.equal(10);
        expect(ciphertext.byteLength).to.equal(10);
        expect(ciphertextAad).to.deep.equal(ciphertext);
        expect(tagAad).to.not.deep.equal(tag);
      });

      it('passes test vectors', async () => {
        const input = {
          data  : Convert.string(`Are You There Bob? It's Me, Alice.`).toUint8Array(),
          key   : Convert.hex('79c99798ac67300bbb2704c95c341e3245f3dcb21761b98e52ff45b24f304fc4').toUint8Array(),
          nonce : Convert.hex('b33ffd3096479bcfbc9aee49417688a0a2554f8d95389419').toUint8Array()
        };
        const output = {
          ciphertext : Convert.hex('80246ca517c0fb5860c19090a7e7a2b030dde4882520102cbc64fad937916596ca9d').toUint8Array(),
          tag        : Convert.hex('9e10a121d990e6a290f6b534516aa32f').toUint8Array()
        };

        const { ciphertext, tag } = await XChaCha20Poly1305.encrypt({
          data  : input.data,
          key   : input.key,
          nonce : input.nonce
        });

        expect(ciphertext).to.deep.equal(output.ciphertext);
        expect(tag).to.deep.equal(output.tag);
      });
    });

    describe('generateKey()', () => {
      it('returns a 32-byte secret key of type Uint8Array', async () => {
        const secretKey = await XChaCha20Poly1305.generateKey();
        expect(secretKey).to.be.instanceOf(Uint8Array);
        expect(secretKey.byteLength).to.equal(32);
      });
    });
  });

});