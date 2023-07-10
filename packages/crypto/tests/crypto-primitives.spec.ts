import type { BufferKeyPair } from '../src/types/index.js';

import { expect } from 'chai';
import { Convert } from '@tbd54566975/common';

import { aesCtrTestVectors, aesGcmTestVectors } from './fixtures/test-vectors/aes.js';
import { NotSupportedError } from '../src/algorithms-api/errors.js';
import { AesCtr, AesGcm, ConcatKdf, Ed25519, Secp256k1, X25519, XChaCha20 } from '../src/crypto-primitives/index.js';

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
            key     : Convert.hex(vector.key).toArrayBuffer(),
            length  : vector.length
          });
          expect(Convert.arrayBuffer(plaintext).toHex()).to.deep.equal(vector.data);
        });
      }

      it('accepts ciphertext input as ArrayBuffer, DataView, and TypedArray', async () => {
        const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        const secretKey = await AesCtr.generateKey({ length: 256 });
        let ciphertext: ArrayBuffer;

        // ArrayBuffer
        const dataArrayBuffer = dataU8A.buffer;
        ciphertext = await AesCtr.decrypt({ counter: new ArrayBuffer(16), data: dataArrayBuffer, key: secretKey, length: 128 });
        expect(ciphertext).to.be.instanceOf(ArrayBuffer);

        // DataView
        const dataView = new DataView(dataArrayBuffer);
        ciphertext = await AesCtr.decrypt({ counter: new ArrayBuffer(16), data: dataView, key: secretKey, length: 128 });
        expect(ciphertext).to.be.instanceOf(ArrayBuffer);

        // TypedArray - Uint8Array
        ciphertext = await AesCtr.decrypt({ counter: new ArrayBuffer(16), data: dataU8A, key: secretKey, length: 128 });
        expect(ciphertext).to.be.instanceOf(ArrayBuffer);

        // TypedArray - Int32Array
        const dataI32A = new Int32Array([10, 20, 30, 40]);
        ciphertext = await AesCtr.decrypt({ counter: new ArrayBuffer(16), data: dataI32A, key: secretKey, length: 128 });
        expect(ciphertext).to.be.instanceOf(ArrayBuffer);

        // TypedArray - Uint32Array
        const dataU32A = new Uint32Array([8, 7, 6, 5, 4, 3, 2, 1]);
        ciphertext = await AesCtr.decrypt({ counter: new ArrayBuffer(16), data: dataU32A, key: secretKey, length: 128 });
        expect(ciphertext).to.be.instanceOf(ArrayBuffer);
      });
    });

    describe('encrypt', () => {
      for (const vector of aesCtrTestVectors) {
        it(`passes test vector ${vector.id}`, async () => {
          const ciphertext = await AesCtr.encrypt({
            counter : Convert.hex(vector.counter).toUint8Array(),
            data    : Convert.hex(vector.data).toUint8Array(),
            key     : Convert.hex(vector.key).toArrayBuffer(),
            length  : vector.length
          });
          expect(Convert.arrayBuffer(ciphertext).toHex()).to.deep.equal(vector.ciphertext);
        });
      }

      it('accepts plaintext input as ArrayBuffer, DataView, and TypedArray', async () => {
        const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        const secretKey = await AesCtr.generateKey({ length: 256 });
        let ciphertext: ArrayBuffer;

        // ArrayBuffer
        const dataArrayBuffer = dataU8A.buffer;
        ciphertext = await AesCtr.encrypt({ counter: new ArrayBuffer(16), data: dataArrayBuffer, key: secretKey, length: 128 });
        expect(ciphertext).to.be.instanceOf(ArrayBuffer);

        // DataView
        const dataView = new DataView(dataArrayBuffer);
        ciphertext = await AesCtr.encrypt({ counter: new ArrayBuffer(16), data: dataView, key: secretKey, length: 128 });
        expect(ciphertext).to.be.instanceOf(ArrayBuffer);

        // TypedArray - Uint8Array
        ciphertext = await AesCtr.encrypt({ counter: new ArrayBuffer(16), data: dataU8A, key: secretKey, length: 128 });
        expect(ciphertext).to.be.instanceOf(ArrayBuffer);

        // TypedArray - Int32Array
        const dataI32A = new Int32Array([10, 20, 30, 40]);
        ciphertext = await AesCtr.encrypt({ counter: new ArrayBuffer(16), data: dataI32A, key: secretKey, length: 128 });
        expect(ciphertext).to.be.instanceOf(ArrayBuffer);

        // TypedArray - Uint32Array
        const dataU32A = new Uint32Array([8, 7, 6, 5, 4, 3, 2, 1]);
        ciphertext = await AesCtr.encrypt({ counter: new ArrayBuffer(16), data: dataU32A, key: secretKey, length: 128 });
        expect(ciphertext).to.be.instanceOf(ArrayBuffer);
      });
    });

    describe('generateKey()', () => {
      it('returns a secret key of type ArrayBuffer', async () => {
        const secretKey = await AesCtr.generateKey({ length: 256 });
        expect(secretKey).to.be.instanceOf(ArrayBuffer);
      });

      it('returns a secret key of the specified length', async () => {
        let secretKey: ArrayBuffer;

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
            key            : Convert.hex(vector.key).toArrayBuffer(),
            tagLength      : vector.tagLength
          });
          expect(Convert.arrayBuffer(plaintext).toHex()).to.deep.equal(vector.data);
        });
      }

      it('accepts ciphertext input as ArrayBuffer and TypedArray', async () => {
        const secretKey = new Uint8Array([222, 78, 162, 222, 38, 146, 151, 191, 191, 75, 227, 71, 220, 221, 70, 49]);
        let plaintext: ArrayBuffer;

        // ArrayBuffer
        const ciphertextArrayBuffer = (new Uint8Array([242, 126, 129, 170, 99, 195, 21, 165, 205, 3, 226, 171, 203, 198, 42, 86, 101])).buffer;
        plaintext = await AesGcm.decrypt({ data: ciphertextArrayBuffer, iv: new ArrayBuffer(12), key: secretKey, tagLength: 128 });
        expect(plaintext).to.be.instanceOf(ArrayBuffer);

        // TypedArray - Uint8Array
        const ciphertextU8A = new Uint8Array([242, 126, 129, 170, 99, 195, 21, 165, 205, 3, 226, 171, 203, 198, 42, 86, 101]);
        plaintext = await AesGcm.decrypt({ data: ciphertextU8A, iv: new ArrayBuffer(12), key: secretKey, tagLength: 128 });
        expect(plaintext).to.be.instanceOf(ArrayBuffer);
      });
    });

    describe('encrypt', () => {
      for (const vector of aesGcmTestVectors) {
        it(`passes test vector ${vector.id}`, async () => {
          const ciphertext = await AesGcm.encrypt({
            additionalData : Convert.hex(vector.aad).toUint8Array(),
            iv             : Convert.hex(vector.iv).toUint8Array(),
            data           : Convert.hex(vector.data).toUint8Array(),
            key            : Convert.hex(vector.key).toArrayBuffer(),
            tagLength      : vector.tagLength
          });
          expect(Convert.arrayBuffer(ciphertext).toHex()).to.deep.equal(vector.ciphertext + vector.tag);
        });
      }

      it('accepts plaintext input as ArrayBuffer, DataView, and TypedArray', async () => {
        const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        const secretKey = await AesGcm.generateKey({ length: 256 });
        let ciphertext: ArrayBuffer;

        // ArrayBuffer
        const dataArrayBuffer = dataU8A.buffer;
        ciphertext = await AesGcm.encrypt({ data: dataArrayBuffer, iv: new ArrayBuffer(12), key: secretKey, tagLength: 128 });
        expect(ciphertext).to.be.instanceOf(ArrayBuffer);

        // DataView
        const dataView = new DataView(dataArrayBuffer);
        ciphertext = await AesGcm.encrypt({ data: dataView, iv: new ArrayBuffer(12), key: secretKey, tagLength: 128 });
        expect(ciphertext).to.be.instanceOf(ArrayBuffer);

        // TypedArray - Uint8Array
        ciphertext = await AesGcm.encrypt({ data: dataU8A, iv: new ArrayBuffer(12), key: secretKey, tagLength: 128 });
        expect(ciphertext).to.be.instanceOf(ArrayBuffer);

        // TypedArray - Int32Array
        const dataI32A = new Int32Array([10, 20, 30, 40]);
        ciphertext = await AesGcm.encrypt({ data: dataI32A, iv: new ArrayBuffer(12), key: secretKey, tagLength: 128 });
        expect(ciphertext).to.be.instanceOf(ArrayBuffer);

        // TypedArray - Uint32Array
        const dataU32A = new Uint32Array([8, 7, 6, 5, 4, 3, 2, 1]);
        ciphertext = await AesGcm.encrypt({ data: dataU32A, iv: new ArrayBuffer(12), key: secretKey, tagLength: 128 });
        expect(ciphertext).to.be.instanceOf(ArrayBuffer);
      });
    });

    describe('generateKey()', () => {
      it('returns a secret key of type ArrayBuffer', async () => {
        const secretKey = await AesGcm.generateKey({ length: 256 });
        expect(secretKey).to.be.instanceOf(ArrayBuffer);
      });

      it('returns a secret key of the specified length', async () => {
        let secretKey: ArrayBuffer;

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

        const expectedResult = Convert.base64Url(output).toArrayBuffer();
        expect(derivedKeyingMaterial).to.deep.equal(expectedResult);
        expect(derivedKeyingMaterial.byteLength).to.equal(16);
      });

      it('accepts other info as ArrayBuffer, String, and TypedArray', async () => {
        const inputBase = {
          sharedSecret : new Uint8Array([1, 2, 3]),
          keyDataLen   : 256,
          otherInfo    : {}
        };

        // ArrayBuffer input.
        const inputArrayBuffer = { ...inputBase, otherInfo: {
          algorithmId : 'A128GCM',
          partyUInfo  : Convert.string('Alice').toArrayBuffer(),
          partyVInfo  : Convert.string('Bob').toArrayBuffer(),
          suppPubInfo : 128
        }};
        let derivedKeyingMaterial = await ConcatKdf.deriveKey(inputArrayBuffer);
        expect(derivedKeyingMaterial).to.be.an('ArrayBuffer');
        expect(derivedKeyingMaterial.byteLength).to.equal(32);

        // String input.
        const inputString = { ...inputBase, otherInfo: {
          algorithmId : 'A128GCM',
          partyUInfo  : 'Alice',
          partyVInfo  : 'Bob',
          suppPubInfo : 128
        }};
        derivedKeyingMaterial = await ConcatKdf.deriveKey(inputString);
        expect(derivedKeyingMaterial).to.be.an('ArrayBuffer');
        expect(derivedKeyingMaterial.byteLength).to.equal(32);

        // TypedArray input.
        const inputTypedArray = { ...inputBase, otherInfo: {
          algorithmId : 'A128GCM',
          partyUInfo  : Convert.string('Alice').toUint8Array(),
          partyVInfo  : Convert.string('Bob').toUint8Array(),
          suppPubInfo : 128
        }};
        derivedKeyingMaterial = await ConcatKdf.deriveKey(inputTypedArray);
        expect(derivedKeyingMaterial).to.be.an('ArrayBuffer');
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

    describe('#computeOtherInfo()', () => {
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

  describe('Ed25519', () => {
    describe('generateKeyPair()', () => {
      it('returns a pair of keys of type ArrayBuffer', async () => {
        const keyPair = await Ed25519.generateKeyPair();
        expect(keyPair).to.have.property('privateKey');
        expect(keyPair).to.have.property('publicKey');
        expect(keyPair.privateKey).to.be.instanceOf(ArrayBuffer);
        expect(keyPair.publicKey).to.be.instanceOf(ArrayBuffer);
      });

      it('returns a 32-byte private key', async () => {
        const keyPair = await Ed25519.generateKeyPair();
        expect(keyPair.privateKey.byteLength).to.equal(32);
      });

      it('returns a 32-byte compressed public key', async () => {
        const keyPair = await Ed25519.generateKeyPair();
        expect(keyPair.publicKey.byteLength).to.equal(32);
      });
    });

    describe('getPublicKey()', () => {
      let keyPair: BufferKeyPair;

      before(async () => {
        keyPair = await Ed25519.generateKeyPair();
      });

      it('returns a 32-byte compressed public key', async () => {
        const publicKey = await Ed25519.getPublicKey({ privateKey: keyPair.privateKey });
        expect(publicKey.byteLength).to.equal(32);
      });
    });

    describe('sign()', () => {
      let keyPair: BufferKeyPair;

      before(async () => {
        keyPair = await Ed25519.generateKeyPair();
      });

      it('returns a 64-byte signature of type ArrayBuffer', async () => {
        const dataU8A = new Uint8Array([51, 52, 53]);
        const signature = await Ed25519.sign({ key: keyPair.privateKey, data: dataU8A });
        expect(signature).to.be.instanceOf(ArrayBuffer);
        expect(signature.byteLength).to.equal(64);
      });

      it('accepts input data as ArrayBuffer, DataView, and TypedArray', async () => {
        const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        const key = keyPair.privateKey;
        let signature: ArrayBuffer;

        // ArrayBuffer
        const dataArrayBuffer = dataU8A.buffer;
        signature = await Ed25519.sign({ key, data: dataArrayBuffer });
        expect(signature).to.be.instanceOf(ArrayBuffer);

        // DataView
        const dataView = new DataView(dataArrayBuffer);
        signature = await Ed25519.sign({ key, data: dataView });
        expect(signature).to.be.instanceOf(ArrayBuffer);

        // TypedArray - Uint8Array
        signature = await Ed25519.sign({ key, data: dataU8A });
        expect(signature).to.be.instanceOf(ArrayBuffer);

        // TypedArray - Int32Array
        const dataI32A = new Int32Array([10, 20, 30, 40]);
        signature = await Ed25519.sign({ key, data: dataI32A });
        expect(signature).to.be.instanceOf(ArrayBuffer);

        // TypedArray - Uint32Array
        const dataU32A = new Uint32Array([8, 7, 6, 5, 4, 3, 2, 1]);
        signature = await Ed25519.sign({ key, data: dataU32A });
        expect(signature).to.be.instanceOf(ArrayBuffer);
      });
    });

    describe('verify()', () => {
      let keyPair: BufferKeyPair;

      before(async () => {
        keyPair = await Ed25519.generateKeyPair();
      });

      it('returns a boolean result', async () => {
        const dataU8A = new Uint8Array([51, 52, 53]);
        const signature = await Ed25519.sign({ key: keyPair.privateKey, data: dataU8A });

        const isValid = await Ed25519.verify({ key: keyPair.publicKey, signature, data: dataU8A });
        expect(isValid).to.exist;
        expect(isValid).to.be.true;
      });

      it('accepts input data as ArrayBuffer, DataView, and TypedArray', async () => {
        const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        let isValid: boolean;
        let signature: ArrayBuffer;

        // ArrayBuffer
        const dataArrayBuffer = dataU8A.buffer;
        signature = await Ed25519.sign({ key: keyPair.privateKey, data: dataArrayBuffer });
        isValid = await Ed25519.verify({ key: keyPair.publicKey, signature, data: dataArrayBuffer });
        expect(isValid).to.be.true;

        // DataView
        const dataView = new DataView(dataArrayBuffer);
        signature = await Ed25519.sign({ key: keyPair.privateKey, data: dataView });
        isValid = await Ed25519.verify({ key: keyPair.publicKey, signature, data: dataView });
        expect(isValid).to.be.true;

        // TypedArray - Uint8Array
        signature = await Ed25519.sign({ key: keyPair.privateKey, data: dataU8A });
        isValid = await Ed25519.verify({ key: keyPair.publicKey, signature, data: dataU8A });
        expect(isValid).to.be.true;

        // TypedArray - Int32Array
        const dataI32A = new Int32Array([10, 20, 30, 40]);
        signature = await Ed25519.sign({ key: keyPair.privateKey, data: dataI32A });
        isValid = await Ed25519.verify({ key: keyPair.publicKey, signature, data: dataI32A });
        expect(isValid).to.be.true;

        // TypedArray - Uint32Array
        const dataU32A = new Uint32Array([8, 7, 6, 5, 4, 3, 2, 1]);
        signature = await Ed25519.sign({ key: keyPair.privateKey, data: dataU32A });
        isValid = await Ed25519.verify({ key: keyPair.publicKey, signature, data: dataU32A });
        expect(isValid).to.be.true;
      });

      it('returns false if the signed data was mutated', async () => {
        const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        let isValid: boolean;

        // Generate signature using the private key.
        const signature = await Ed25519.sign({ key: keyPair.privateKey, data: dataU8A });

        // Verification should return true with the data used to generate the signature.
        isValid = await Ed25519.verify({ key: keyPair.publicKey, signature, data: dataU8A });
        expect(isValid).to.be.true;

        // Make a copy and flip the least significant bit (the rightmost bit) in the first byte of the array.
        const mutatedDataU8A = new Uint8Array(dataU8A);
        mutatedDataU8A[0] ^= 1 << 0;

        // Verification should return false if the given data does not match the data used to generate the signature.
        isValid = await Ed25519.verify({ key: keyPair.publicKey, signature, data: mutatedDataU8A });
        expect(isValid).to.be.false;
      });

      it('returns false if the signature was mutated', async () => {
        const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        let isValid: boolean;

        // Generate a new key pair.
        keyPair = await Ed25519.generateKeyPair();

        // Generate signature using the private key.
        const signature = await Ed25519.sign({ key: keyPair.privateKey, data: dataU8A });

        // Make a copy and flip the least significant bit (the rightmost bit) in the first byte of the array.
        const mutatedSignature = new Uint8Array(signature);
        mutatedSignature[0] ^= 1 << 0;

        // Verification should return false if the signature was modified.
        isValid = await Ed25519.verify({ key: keyPair.publicKey, signature: signature, data: mutatedSignature.buffer });
        expect(isValid).to.be.false;
      });

      it('returns false with a signature generated using a different private key', async () => {
        const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        const keyPairA = await Ed25519.generateKeyPair();
        const keyPairB = await Ed25519.generateKeyPair();
        let isValid: boolean;

        // Generate a signature using the private key from key pair B.
        const signatureB = await Ed25519.sign({ key: keyPairB.privateKey, data: dataU8A });

        // Verification should return false with the public key from key pair A.
        isValid = await Ed25519.verify({ key: keyPairA.publicKey, signature: signatureB, data: dataU8A.buffer });
        expect(isValid).to.be.false;
      });
    });
  });

  describe('Secp256k1', () => {
    describe('generateKeyPair()', () => {
      it('returns a pair of keys of type ArrayBuffer', async () => {
        const keyPair = await Secp256k1.generateKeyPair();
        expect(keyPair).to.have.property('privateKey');
        expect(keyPair).to.have.property('publicKey');
        expect(keyPair.privateKey).to.be.instanceOf(ArrayBuffer);
        expect(keyPair.publicKey).to.be.instanceOf(ArrayBuffer);
      });

      it('returns a 32-byte private key', async () => {
        const keyPair = await Secp256k1.generateKeyPair();
        expect(keyPair.privateKey.byteLength).to.equal(32);
      });

      it('returns a 33-byte compressed public key, by default', async () => {
        const keyPair = await Secp256k1.generateKeyPair();
        expect(keyPair.publicKey.byteLength).to.equal(33);
      });

      it('returns a 65-byte uncompressed public key, if specified', async () => {
        const keyPair = await Secp256k1.generateKeyPair({ compressedPublicKey: false });
        expect(keyPair.publicKey.byteLength).to.equal(65);
      });
    });

    describe('getPublicKey()', () => {
      let keyPair: BufferKeyPair;

      before(async () => {
        keyPair = await Secp256k1.generateKeyPair();
      });

      it('returns a 33-byte compressed public key, by default', async () => {
        const publicKey = await Secp256k1.getPublicKey({ privateKey: keyPair.privateKey });
        expect(publicKey.byteLength).to.equal(33);
      });

      it('returns a 65-byte uncompressed public key, if specified', async () => {
        const publicKey = await Secp256k1.getPublicKey({ privateKey: keyPair.privateKey, compressedPublicKey: false });
        expect(publicKey.byteLength).to.equal(65);
      });
    });

    describe('sharedSecret()', () => {
      let otherPartyKeyPair: BufferKeyPair;
      let ownKeyPair: BufferKeyPair;

      beforeEach(async () => {
        otherPartyKeyPair = await Secp256k1.generateKeyPair();
        ownKeyPair = await Secp256k1.generateKeyPair();
      });

      it('generates a 32-byte shared secret', async () => {
        const sharedSecret = await Secp256k1.sharedSecret({
          privateKey : ownKeyPair.privateKey,
          publicKey  : otherPartyKeyPair.publicKey
        });
        expect(sharedSecret).to.be.instanceOf(ArrayBuffer);
        expect(sharedSecret.byteLength).to.equal(32);
      });

      it('generates identical output if keypairs are swapped', async () => {
        const sharedSecretOwnOther = await Secp256k1.sharedSecret({
          privateKey : ownKeyPair.privateKey,
          publicKey  : otherPartyKeyPair.publicKey
        });

        const sharedSecretOtherOwn = await Secp256k1.sharedSecret({
          privateKey : otherPartyKeyPair.privateKey,
          publicKey  : ownKeyPair.publicKey
        });

        expect(sharedSecretOwnOther).to.deep.equal(sharedSecretOtherOwn);
      });
    });

    describe('sign()', () => {
      let keyPair: BufferKeyPair;

      before(async () => {
        keyPair = await Secp256k1.generateKeyPair();
      });

      it('returns a 64-byte signature of type ArrayBuffer', async () => {
        const hash = 'SHA-256';
        const dataU8A = new Uint8Array([51, 52, 53]);
        const signature = await Secp256k1.sign({ hash, key: keyPair.privateKey, data: dataU8A });
        expect(signature).to.be.instanceOf(ArrayBuffer);
        expect(signature.byteLength).to.equal(64);
      });

      it('accepts input data as ArrayBuffer, DataView, and TypedArray', async () => {
        const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        const hash = 'SHA-256';
        const key = keyPair.privateKey;
        let signature: ArrayBuffer;

        // ArrayBuffer
        const dataArrayBuffer = dataU8A.buffer;
        signature = await Secp256k1.sign({ hash, key, data: dataArrayBuffer });
        expect(signature).to.be.instanceOf(ArrayBuffer);

        // DataView
        const dataView = new DataView(dataArrayBuffer);
        signature = await Secp256k1.sign({ hash, key, data: dataView });
        expect(signature).to.be.instanceOf(ArrayBuffer);

        // TypedArray - Uint8Array
        signature = await Secp256k1.sign({ hash, key, data: dataU8A });
        expect(signature).to.be.instanceOf(ArrayBuffer);

        // TypedArray - Int32Array
        const dataI32A = new Int32Array([10, 20, 30, 40]);
        signature = await Secp256k1.sign({ hash, key, data: dataI32A });
        expect(signature).to.be.instanceOf(ArrayBuffer);

        // TypedArray - Uint32Array
        const dataU32A = new Uint32Array([8, 7, 6, 5, 4, 3, 2, 1]);
        signature = await Secp256k1.sign({ hash, key, data: dataU32A });
        expect(signature).to.be.instanceOf(ArrayBuffer);
      });
    });

    describe('verify()', () => {
      let keyPair: BufferKeyPair;

      before(async () => {
        keyPair = await Secp256k1.generateKeyPair();
      });

      it('returns a boolean result', async () => {
        const dataU8A = new Uint8Array([51, 52, 53]);
        const signature = await Secp256k1.sign({ hash: 'SHA-256', key: keyPair.privateKey, data: dataU8A });

        const isValid = await Secp256k1.verify({ hash: 'SHA-256', key: keyPair.publicKey, signature, data: dataU8A });
        expect(isValid).to.exist;
        expect(isValid).to.be.true;
      });

      it('accepts input data as ArrayBuffer, DataView, and TypedArray', async () => {
        const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        const hash = 'SHA-256';
        let isValid: boolean;
        let signature: ArrayBuffer;

        // ArrayBuffer
        const dataArrayBuffer = dataU8A.buffer;
        signature = await Secp256k1.sign({ hash, key: keyPair.privateKey, data: dataArrayBuffer });
        isValid = await Secp256k1.verify({ hash, key: keyPair.publicKey, signature, data: dataArrayBuffer });
        expect(isValid).to.be.true;

        // DataView
        const dataView = new DataView(dataArrayBuffer);
        signature = await Secp256k1.sign({ hash, key: keyPair.privateKey, data: dataView });
        isValid = await Secp256k1.verify({ hash, key: keyPair.publicKey, signature, data: dataView });
        expect(isValid).to.be.true;

        // TypedArray - Uint8Array
        signature = await Secp256k1.sign({ hash, key: keyPair.privateKey, data: dataU8A });
        isValid = await Secp256k1.verify({ hash, key: keyPair.publicKey, signature, data: dataU8A });
        expect(isValid).to.be.true;

        // TypedArray - Int32Array
        const dataI32A = new Int32Array([10, 20, 30, 40]);
        signature = await Secp256k1.sign({ hash, key: keyPair.privateKey, data: dataI32A });
        isValid = await Secp256k1.verify({ hash, key: keyPair.publicKey, signature, data: dataI32A });
        expect(isValid).to.be.true;

        // TypedArray - Uint32Array
        const dataU32A = new Uint32Array([8, 7, 6, 5, 4, 3, 2, 1]);
        signature = await Secp256k1.sign({ hash, key: keyPair.privateKey, data: dataU32A });
        isValid = await Secp256k1.verify({ hash, key: keyPair.publicKey, signature, data: dataU32A });
        expect(isValid).to.be.true;
      });

      it('accepts both compressed and uncompressed public keys', async () => {
        let signature: ArrayBuffer;
        let isValid: boolean;
        const hash = 'SHA-256';
        const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

        // Generate signature using the private key.
        signature = await Secp256k1.sign({ hash, key: keyPair.privateKey, data: dataU8A });

        // Attempt to verify the signature using a compressed public key.
        const compressedPublicKey = await Secp256k1.getPublicKey({ privateKey: keyPair.privateKey, compressedPublicKey: true });
        isValid = await Secp256k1.verify({ hash, key: compressedPublicKey, signature, data: dataU8A });
        expect(isValid).to.be.true;

        // Attempt to verify the signature using an uncompressed public key.
        const uncompressedPublicKey = await Secp256k1.getPublicKey({ privateKey: keyPair.privateKey, compressedPublicKey: false });
        isValid = await Secp256k1.verify({ hash, key: uncompressedPublicKey, signature, data: dataU8A });
        expect(isValid).to.be.true;
      });

      it('returns false if the signed data was mutated', async () => {
        const hash = 'SHA-256';
        const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        let isValid: boolean;

        // Generate signature using the private key.
        const signature = await Secp256k1.sign({ hash, key: keyPair.privateKey, data: dataU8A });

        // Verification should return true with the data used to generate the signature.
        isValid = await Secp256k1.verify({ hash, key: keyPair.publicKey, signature, data: dataU8A });
        expect(isValid).to.be.true;

        // Make a copy and flip the least significant bit (the rightmost bit) in the first byte of the array.
        const mutatedDataU8A = new Uint8Array(dataU8A);
        mutatedDataU8A[0] ^= 1 << 0;

        // Verification should return false if the given data does not match the data used to generate the signature.
        isValid = await Secp256k1.verify({ hash, key: keyPair.publicKey, signature, data: mutatedDataU8A });
        expect(isValid).to.be.false;
      });

      it('returns false if the signature was mutated', async () => {
        const hash = 'SHA-256';
        const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        let isValid: boolean;

        // Generate signature using the private key.
        const signature = await Secp256k1.sign({ hash, key: keyPair.privateKey, data: dataU8A });

        // Verification should return true with the data used to generate the signature.
        isValid = await Secp256k1.verify({ hash, key: keyPair.publicKey, signature, data: dataU8A });
        expect(isValid).to.be.true;

        // Make a copy and flip the least significant bit (the rightmost bit) in the first byte of the array.
        const mutatedSignature = new Uint8Array(signature);
        mutatedSignature[0] ^= 1 << 0;

        // Verification should return false if the signature was modified.
        isValid = await Secp256k1.verify({ hash, key: keyPair.publicKey, signature: signature, data: mutatedSignature.buffer });
        expect(isValid).to.be.false;
      });

      it('returns false with a signature generated using a different private key', async () => {
        const hash = 'SHA-256';
        const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        const keyPairA = await Secp256k1.generateKeyPair();
        const keyPairB = await Secp256k1.generateKeyPair();
        let isValid: boolean;

        // Generate a signature using the private key from key pair B.
        const signatureB = await Secp256k1.sign({ hash, key: keyPairB.privateKey, data: dataU8A });

        // Verification should return false with the public key from key pair A.
        isValid = await Secp256k1.verify({ hash, key: keyPairA.publicKey, signature: signatureB, data: dataU8A.buffer });
        expect(isValid).to.be.false;
      });
    });
  });

  describe('X25519', () => {
    describe('generateKeyPair()', () => {
      it('returns a pair of keys of type ArrayBuffer', async () => {
        const keyPair = await X25519.generateKeyPair();
        expect(keyPair).to.have.property('privateKey');
        expect(keyPair).to.have.property('publicKey');
        expect(keyPair.privateKey).to.be.instanceOf(ArrayBuffer);
        expect(keyPair.publicKey).to.be.instanceOf(ArrayBuffer);
      });

      it('returns a 32-byte private key', async () => {
        const keyPair = await X25519.generateKeyPair();
        expect(keyPair.privateKey.byteLength).to.equal(32);
      });

      it('returns a 32-byte compressed public key', async () => {
        const keyPair = await X25519.generateKeyPair();
        expect(keyPair.publicKey.byteLength).to.equal(32);
      });
    });

    describe('getPublicKey()', () => {
      let keyPair: BufferKeyPair;

      before(async () => {
        keyPair = await X25519.generateKeyPair();
      });

      it('returns a 32-byte compressed public key', async () => {
        const publicKey = await X25519.getPublicKey({ privateKey: keyPair.privateKey });
        expect(publicKey.byteLength).to.equal(32);
      });
    });

    describe('sharedSecret()', () => {
      describe('sharedSecret()', () => {
        let otherPartyKeyPair: BufferKeyPair;
        let ownKeyPair: BufferKeyPair;

        beforeEach(async () => {
          otherPartyKeyPair = await X25519.generateKeyPair();
          ownKeyPair = await X25519.generateKeyPair();
        });

        it('generates a 32-byte compressed secret, by default', async () => {
          const sharedSecret = await X25519.sharedSecret({
            privateKey : ownKeyPair.privateKey,
            publicKey  : otherPartyKeyPair.publicKey
          });
          expect(sharedSecret).to.be.instanceOf(ArrayBuffer);
          expect(sharedSecret.byteLength).to.equal(32);
        });

        it('generates identical output if keypairs are swapped', async () => {
          const sharedSecretOwnOther = await X25519.sharedSecret({
            privateKey : ownKeyPair.privateKey,
            publicKey  : otherPartyKeyPair.publicKey
          });

          const sharedSecretOtherOwn = await X25519.sharedSecret({
            privateKey : otherPartyKeyPair.privateKey,
            publicKey  : ownKeyPair.publicKey
          });

          expect(sharedSecretOwnOther).to.deep.equal(sharedSecretOtherOwn);
        });
      });
    });
  });

  describe('XChaCha20', () => {
    describe('decrypt()', () => {
      it('returns ArrayBuffer plaintext with length matching input', async () => {
        const plaintext = await XChaCha20.decrypt({
          data  : new Uint8Array(10),
          key   : new ArrayBuffer(32),
          nonce : new Uint8Array(24)
        });
        expect(plaintext).to.be.an('ArrayBuffer');
        expect(plaintext.byteLength).to.equal(10);
      });

      it('passes test vectors', async () => {
        const input = {
          data  : Convert.hex('879b10a139674fe65087f59577ee2c1ab54655d900697fd02d953f53ddcc1ae476e8').toArrayBuffer(),
          key   : Convert.hex('79c99798ac67300bbb2704c95c341e3245f3dcb21761b98e52ff45b24f304fc4').toArrayBuffer(),
          nonce : Convert.hex('b33ffd3096479bcfbc9aee49417688a0a2554f8d95389419').toArrayBuffer()
        };
        const output = Convert.string(`Are You There Bob? It's Me, Alice.`).toArrayBuffer();

        const ciphertext = await XChaCha20.decrypt({
          data  : input.data,
          key   : input.key,
          nonce : input.nonce
        });

        expect(ciphertext).to.deep.equal(output);
      });

      it('accepts plaintext input as ArrayBuffer, DataView, and TypedArray', async () => {
        const input = {
          data  : Convert.hex('879b10a139674fe65087f59577ee2c1ab54655d900697fd02d953f53ddcc1ae476e8').toUint8Array(),
          key   : Convert.hex('79c99798ac67300bbb2704c95c341e3245f3dcb21761b98e52ff45b24f304fc4').toArrayBuffer(),
          nonce : Convert.hex('b33ffd3096479bcfbc9aee49417688a0a2554f8d95389419').toArrayBuffer()
        };
        let ciphertext: ArrayBuffer;
        let output: ArrayBuffer;
        output = Convert.string(`Are You There Bob? It's Me, Alice.`).toArrayBuffer();

        // ArrayBuffer
        const dataArrayBuffer = input.data.buffer;
        ciphertext = await XChaCha20.decrypt({ data: dataArrayBuffer, key: input.key, nonce: input.nonce });
        expect(ciphertext).to.deep.equal(output);

        // DataView
        const dataView = new DataView(dataArrayBuffer);
        ciphertext = await XChaCha20.decrypt({ data: dataView, key: input.key, nonce: input.nonce });
        expect(ciphertext).to.deep.equal(output);

        // TypedArray - Uint8Array
        ciphertext = await XChaCha20.decrypt({ data: input.data, key: input.key,nonce: input.nonce });
        expect(ciphertext).to.deep.equal(output);

        // TypedArray - Int32Array
        const dataI32A = new Int32Array(Convert.hex('cce9758174083ac61aef90e73ace6e75').toArrayBuffer());
        ciphertext = await XChaCha20.decrypt({ data: dataI32A, key: input.key, nonce: input.nonce });
        output = (new Int32Array([10, 20, 30, 40])).buffer;
        expect(ciphertext).to.deep.equal(output);

        // TypedArray - Uint32Array
        const dataU32A = new Uint32Array(Convert.hex('cee9758167083ac602ef90e717ce6e75d3797590774e0cf062f013739da07387').toArrayBuffer());
        ciphertext = await XChaCha20.decrypt({ data: dataU32A, key: input.key, nonce: input.nonce });
        output = (new Uint32Array([8, 7, 6, 5, 4, 3, 2, 1])).buffer;
        expect(ciphertext).to.deep.equal(output);
      });
    });

    describe('encrypt()', () => {
      it('returns ArrayBuffer ciphertext with length matching input', async () => {
        const ciphertext = await XChaCha20.encrypt({
          data  : new Uint8Array(10),
          key   : new ArrayBuffer(32),
          nonce : new Uint8Array(24)
        });
        expect(ciphertext).to.be.an('ArrayBuffer');
        expect(ciphertext.byteLength).to.equal(10);
      });

      it('passes test vectors', async () => {
        const input = {
          data  : Convert.string(`Are You There Bob? It's Me, Alice.`).toArrayBuffer(),
          key   : Convert.hex('79c99798ac67300bbb2704c95c341e3245f3dcb21761b98e52ff45b24f304fc4').toArrayBuffer(),
          nonce : Convert.hex('b33ffd3096479bcfbc9aee49417688a0a2554f8d95389419').toArrayBuffer()
        };
        const output = Convert.hex('879b10a139674fe65087f59577ee2c1ab54655d900697fd02d953f53ddcc1ae476e8').toArrayBuffer();

        const ciphertext = await XChaCha20.encrypt({
          data  : input.data,
          key   : input.key,
          nonce : input.nonce
        });

        expect(ciphertext).to.deep.equal(output);
      });

      it('accepts plaintext input as ArrayBuffer, DataView, and TypedArray', async () => {
        const input = {
          data  : Convert.string(`Are You There Bob? It's Me, Alice.`).toUint8Array(),
          key   : Convert.hex('79c99798ac67300bbb2704c95c341e3245f3dcb21761b98e52ff45b24f304fc4').toArrayBuffer(),
          nonce : Convert.hex('b33ffd3096479bcfbc9aee49417688a0a2554f8d95389419').toArrayBuffer()
        };
        let ciphertext: ArrayBuffer;
        let output: ArrayBuffer;
        output = Convert.hex('879b10a139674fe65087f59577ee2c1ab54655d900697fd02d953f53ddcc1ae476e8').toArrayBuffer();

        // ArrayBuffer
        const dataArrayBuffer = input.data.buffer;
        ciphertext = await XChaCha20.encrypt({ data: dataArrayBuffer, key: input.key, nonce: input.nonce });
        expect(ciphertext).to.deep.equal(output);

        // DataView
        const dataView = new DataView(dataArrayBuffer);
        ciphertext = await XChaCha20.encrypt({ data: dataView, key: input.key, nonce: input.nonce });
        expect(ciphertext).to.deep.equal(output);

        // TypedArray - Uint8Array
        ciphertext = await XChaCha20.encrypt({ data: input.data, key: input.key,nonce: input.nonce });
        expect(ciphertext).to.deep.equal(output);

        // TypedArray - Int32Array
        const dataI32A = new Int32Array([10, 20, 30, 40]);
        ciphertext = await XChaCha20.encrypt({ data: dataI32A, key: input.key, nonce: input.nonce });
        output = Convert.hex('cce9758174083ac61aef90e73ace6e75').toArrayBuffer();
        expect(ciphertext).to.deep.equal(output);

        // TypedArray - Uint32Array
        const dataU32A = new Uint32Array([8, 7, 6, 5, 4, 3, 2, 1]);
        ciphertext = await XChaCha20.encrypt({ data: dataU32A, key: input.key, nonce: input.nonce });
        output = Convert.hex('cee9758167083ac602ef90e717ce6e75d3797590774e0cf062f013739da07387').toArrayBuffer();
        expect(ciphertext).to.deep.equal(output);
      });
    });

    describe('generateKey()', () => {
      it('returns a 32-byte secret key of type ArrayBuffer', async () => {
        const secretKey = await XChaCha20.generateKey();
        expect(secretKey).to.be.instanceOf(ArrayBuffer);
        expect(secretKey.byteLength).to.equal(32);
      });
    });
  });

});