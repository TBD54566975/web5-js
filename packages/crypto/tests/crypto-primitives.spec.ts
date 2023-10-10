import type { BytesKeyPair } from '../src/types/crypto-key.js';

import chai, { expect } from 'chai';
import { Convert } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';

import { NotSupportedError } from '../src/algorithms-api/errors.js';
import { ed25519TestVectors } from './fixtures/test-vectors/ed25519.js';
import { hkdfTestVectors } from './fixtures/test-vectors/hkdf.js';
import { secp256k1TestVectors } from './fixtures/test-vectors/secp256k1.js';
import { aesCtrTestVectors, aesGcmTestVectors } from './fixtures/test-vectors/aes.js';
import {
  AesCtr,
  AesGcm,
  ConcatKdf,
  Ed25519,
  Hkdf,
  Secp256k1,
  X25519,
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
            associatedData : Convert.hex(vector.aad).toUint8Array(),
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
            associatedData : Convert.hex(vector.aad).toUint8Array(),
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

  describe('Ed25519', () => {
    describe('convertPrivateKeyToX25519()', () => {
      let validEd25519PrivateKey: Uint8Array;

      // This is a setup step. Before each test, generate a new Ed25519 key pair
      // and use the private key in tests. This ensures that we work with fresh keys for every test.
      beforeEach(async () => {
        const keyPair = await Ed25519.generateKeyPair();
        validEd25519PrivateKey = keyPair.publicKey;
      });

      it('converts a valid Ed25519 private key to X25519 format', async () => {
        const x25519PrivateKey = await Ed25519.convertPrivateKeyToX25519({ privateKey: validEd25519PrivateKey });

        expect(x25519PrivateKey).to.be.instanceOf(Uint8Array);
        expect(x25519PrivateKey.length).to.equal(32);
      });

      it('accepts any Uint8Array value as a private key', async () => {
        /** For Ed25519 the private key is a random string of bytes that is
         * hashed, which means many possible values can serve as a valid
         * private key. */
        const key0Bytes = new Uint8Array(0);
        const key33Bytes = Convert.hex('02fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f').toUint8Array();

        let x25519PrivateKey = await Ed25519.convertPrivateKeyToX25519({ privateKey: key0Bytes });
        expect(x25519PrivateKey.length).to.equal(32);
        x25519PrivateKey = await Ed25519.convertPrivateKeyToX25519({ privateKey: key33Bytes });
        expect(x25519PrivateKey.length).to.equal(32);
      });
    });

    describe('convertPublicKeyToX25519()', () => {
      let validEd25519PublicKey: Uint8Array;

      // This is a setup step. Before each test, generate a new Ed25519 key pair
      // and use the public key in tests. This ensures that we work with fresh keys for every test.
      beforeEach(async () => {
        const keyPair = await Ed25519.generateKeyPair();
        validEd25519PublicKey = keyPair.publicKey;
      });

      it('converts a valid Ed25519 public key to X25519 format', async () => {
        const x25519PublicKey = await Ed25519.convertPublicKeyToX25519({ publicKey: validEd25519PublicKey });

        expect(x25519PublicKey).to.be.instanceOf(Uint8Array);
        expect(x25519PublicKey.length).to.equal(32);
      });

      it('throws an error when provided an invalid Ed25519 public key', async () => {
        const invalidEd25519PublicKey = Convert.hex('02fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f').toUint8Array();

        await expect(
          Ed25519.convertPublicKeyToX25519({ publicKey: invalidEd25519PublicKey })
        ).to.eventually.be.rejectedWith(Error, 'Invalid public key');
      });

      it('throws an error when provided an Ed25519 private key', async () => {
        for (const vector of ed25519TestVectors) {
          const validEd25519PrivateKey = Convert.hex(vector.privateKey.encoded).toUint8Array();

          await expect(
            Ed25519.convertPublicKeyToX25519({ publicKey: validEd25519PrivateKey })
          ).to.eventually.be.rejectedWith(Error, 'Invalid public key');
        }
      });
    });

    describe('generateKeyPair()', () => {
      it('returns a pair of keys of type Uint8Array', async () => {
        const keyPair = await Ed25519.generateKeyPair();
        expect(keyPair).to.have.property('privateKey');
        expect(keyPair).to.have.property('publicKey');
        expect(keyPair.privateKey).to.be.instanceOf(Uint8Array);
        expect(keyPair.publicKey).to.be.instanceOf(Uint8Array);
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
      let keyPair: BytesKeyPair;

      before(async () => {
        keyPair = await Ed25519.generateKeyPair();
      });

      it('returns a 32-byte compressed public key', async () => {
        const publicKey = await Ed25519.getPublicKey({ privateKey: keyPair.privateKey });
        expect(publicKey).to.be.instanceOf(Uint8Array);
        expect(publicKey.byteLength).to.equal(32);
      });
    });

    describe('sign()', () => {
      let keyPair: BytesKeyPair;

      before(async () => {
        keyPair = await Ed25519.generateKeyPair();
      });

      it('returns a 64-byte signature of type Uint8Array', async () => {
        const data = new Uint8Array([51, 52, 53]);
        const signature = await Ed25519.sign({ key: keyPair.privateKey, data });
        expect(signature).to.be.instanceOf(Uint8Array);
        expect(signature.byteLength).to.equal(64);
      });

      it('accepts input data as Uint8Array', async () => {
        const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        const key = keyPair.privateKey;
        let signature: Uint8Array;

        // TypedArray - Uint8Array
        signature = await Ed25519.sign({ key, data: data });
        expect(signature).to.be.instanceOf(Uint8Array);
      });
    });

    describe('validatePublicKey()', () => {
      it('returns true for valid public keys', async () => {
        for (const vector of ed25519TestVectors) {
          const key = Convert.hex(vector.publicKey.encoded).toUint8Array();
          const isValid = await Ed25519.validatePublicKey({ key });
          expect(isValid).to.be.true;
        }
      });

      it('returns false for invalid public keys', async () => {
        const key = Convert.hex('02fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f').toUint8Array();
        const isValid = await Ed25519.validatePublicKey({ key });
        expect(isValid).to.be.false;
      });

      it('returns false if a private key is given', async () => {
        for (const vector of ed25519TestVectors) {
          const key = Convert.hex(vector.privateKey.encoded).toUint8Array();
          const isValid = await Ed25519.validatePublicKey({ key });
          expect(isValid).to.be.false;
        }
      });
    });

    describe('verify()', () => {
      let keyPair: BytesKeyPair;

      before(async () => {
        keyPair = await Ed25519.generateKeyPair();
      });

      it('returns a boolean result', async () => {
        const data = new Uint8Array([51, 52, 53]);
        const signature = await Ed25519.sign({ key: keyPair.privateKey, data });

        const isValid = await Ed25519.verify({ key: keyPair.publicKey, signature, data });
        expect(isValid).to.exist;
        expect(isValid).to.be.true;
      });

      it('accepts input data as Uint8Array', async () => {
        const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        let isValid: boolean;
        let signature: Uint8Array;

        // TypedArray - Uint8Array
        signature = await Ed25519.sign({ key: keyPair.privateKey, data });
        isValid = await Ed25519.verify({ key: keyPair.publicKey, signature, data });
        expect(isValid).to.be.true;
      });

      it('returns false if the signed data was mutated', async () => {
        const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        let isValid: boolean;

        // Generate signature using the private key.
        const signature = await Ed25519.sign({ key: keyPair.privateKey, data });

        // Verification should return true with the data used to generate the signature.
        isValid = await Ed25519.verify({ key: keyPair.publicKey, signature, data });
        expect(isValid).to.be.true;

        // Make a copy and flip the least significant bit (the rightmost bit) in the first byte of the array.
        const mutatedData = new Uint8Array(data);
        mutatedData[0] ^= 1 << 0;

        // Verification should return false if the given data does not match the data used to generate the signature.
        isValid = await Ed25519.verify({ key: keyPair.publicKey, signature, data: mutatedData });
        expect(isValid).to.be.false;
      });

      it('returns false if the signature was mutated', async () => {
        const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        let isValid: boolean;

        // Generate a new key pair.
        keyPair = await Ed25519.generateKeyPair();

        // Generate signature using the private key.
        const signature = await Ed25519.sign({ key: keyPair.privateKey, data });

        // Make a copy and flip the least significant bit (the rightmost bit) in the first byte of the array.
        const mutatedSignature = new Uint8Array(signature);
        mutatedSignature[0] ^= 1 << 0;

        // Verification should return false if the signature was modified.
        isValid = await Ed25519.verify({ key: keyPair.publicKey, signature: signature, data: mutatedSignature });
        expect(isValid).to.be.false;
      });

      it('returns false with a signature generated using a different private key', async () => {
        const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        const keyPairA = await Ed25519.generateKeyPair();
        const keyPairB = await Ed25519.generateKeyPair();
        let isValid: boolean;

        // Generate a signature using the private key from key pair B.
        const signatureB = await Ed25519.sign({ key: keyPairB.privateKey, data });

        // Verification should return false with the public key from key pair A.
        isValid = await Ed25519.verify({ key: keyPairA.publicKey, signature: signatureB, data });
        expect(isValid).to.be.false;
      });
    });
  });

  describe('Hkdf', () => {
    describe('deriveKey', () => {
      it('should derive a key using SHA-256', async () => {
        const inputKeyingMaterial = new Uint8Array([1, 2, 3]);
        const salt = new Uint8Array([4, 5, 6]);
        const info = new Uint8Array([7, 8, 9]);
        const derivedKey = await Hkdf.deriveKey({
          hash   : 'SHA-256',
          inputKeyingMaterial,
          length : 32,
          salt,
          info,
        });
        expect(derivedKey).to.be.instanceOf(Uint8Array);
        expect(derivedKey.length).to.equal(32);
      });

      it('should derive a key using SHA-384', async () => {
        const inputKeyingMaterial = new Uint8Array([1, 2, 3]);
        const salt = new Uint8Array([4, 5, 6]);
        const info = new Uint8Array([7, 8, 9]);
        const derivedKey = await Hkdf.deriveKey({
          hash   : 'SHA-384',
          inputKeyingMaterial,
          length : 48,
          salt,
          info,
        });
        expect(derivedKey).to.be.instanceOf(Uint8Array);
        expect(derivedKey.length).to.equal(48);
      });

      it('should derive a key using SHA-512', async () => {
        const inputKeyingMaterial = new Uint8Array([1, 2, 3]);
        const salt = new Uint8Array([4, 5, 6]);
        const info = new Uint8Array([7, 8, 9]);
        const derivedKey = await Hkdf.deriveKey({
          hash   : 'SHA-512',
          inputKeyingMaterial,
          length : 64,
          salt,
          info,
        });
        expect(derivedKey).to.be.instanceOf(Uint8Array);
        expect(derivedKey.length).to.equal(64);
      });

      for (const vector of hkdfTestVectors) {
        it(`passes test vector ${vector.id}`, async () => {
          const outputKeyingMaterial = await Hkdf.deriveKey({
            hash                : vector.hash,
            inputKeyingMaterial : Convert.hex(vector.inputKeyingMaterial).toUint8Array(),
            info                : Convert.hex(vector.info).toUint8Array(),
            salt                : Convert.hex(vector.salt).toUint8Array(),
            length              : vector.length
          });
          expect(Convert.uint8Array(outputKeyingMaterial).toHex()).to.deep.equal(vector.output);
        });
      }
    });
  });

  describe('Secp256k1', () => {
    describe('convertPublicKey method', () => {
      it('converts an uncompressed public key to a compressed format', async () => {
        // Generate the uncompressed public key.
        const keyPair = await Secp256k1.generateKeyPair({ compressedPublicKey: false });
        const uncompressedPublicKey = keyPair.publicKey;

        // Attempt to convert to compressed format.
        const compressedKey = await Secp256k1.convertPublicKey({
          publicKey           : uncompressedPublicKey,
          compressedPublicKey : true
        });

        // Confirm the length of the resulting public key is 33 bytes
        expect(compressedKey.byteLength).to.equal(33);
      });

      it('converts a compressed public key to an uncompressed format', async () => {
        // Generate the uncompressed public key.
        const keyPair = await Secp256k1.generateKeyPair({ compressedPublicKey: true });
        const compressedPublicKey = keyPair.publicKey;

        const uncompressedKey = await Secp256k1.convertPublicKey({
          publicKey           : compressedPublicKey,
          compressedPublicKey : false
        });

        // Confirm the length of the resulting public key is 65 bytes
        expect(uncompressedKey.byteLength).to.equal(65);
      });

      it('throws an error for an invalid compressed public key', async () => {
        // Invalid compressed public key.
        const invalidPublicKey = Convert.hex('fef0b998921eafb58f49efdeb0adc47123aa28a4042924236f08274d50c72fe7b0').toUint8Array();

        try {
          await Secp256k1.convertPublicKey({
            publicKey           : invalidPublicKey,
            compressedPublicKey : false
          });
          expect.fail('Expected method to throw an error.');
        } catch (error) {
          expect(error).to.be.instanceOf(Error);
          expect((error as Error).message).to.include('Point of length 33 was invalid');
        }
      });

      it('throws an error for an invalid uncompressed public key', async () => {
        // Here, generating a random byte array of size 65. It's unlikely to be a valid public key.
        const invalidPublicKey = Convert.hex('dfebc16793a5737ac51f606a43524df8373c063e41d5a99b2f1530afd987284bd1c7cde1658a9a756e71f44a97b4783ea9dee5ccb7f1447eb4836d8de9bd4f81fd').toUint8Array();

        try {
          await Secp256k1.convertPublicKey({
            publicKey           : invalidPublicKey,
            compressedPublicKey : true
          });
          expect.fail('Expected method to throw an error.');
        } catch (error) {
          expect(error).to.be.instanceOf(Error);
          expect((error as Error).message).to.include('Point of length 65 was invalid');
        }
      });
    });

    describe('generateKeyPair()', () => {
      it('returns a pair of keys of type Uint8Array', async () => {
        const keyPair = await Secp256k1.generateKeyPair();
        expect(keyPair).to.have.property('privateKey');
        expect(keyPair).to.have.property('publicKey');
        expect(keyPair.privateKey).to.be.instanceOf(Uint8Array);
        expect(keyPair.publicKey).to.be.instanceOf(Uint8Array);
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

    describe('getCurvePoints()', () => {
      it('returns public key x and y coordinates given a public key', async () => {
        for (const vector of secp256k1TestVectors) {
          const key = Convert.hex(vector.publicKey.encoded).toUint8Array();
          const points = await Secp256k1.getCurvePoints({ key });
          expect(points.x).to.deep.equal(Convert.hex(vector.publicKey.x).toUint8Array());
          expect(points.y).to.deep.equal(Convert.hex(vector.publicKey.y).toUint8Array());
        }
      });

      it('returns public key x and y coordinates given a private key', async () => {
        for (const vector of secp256k1TestVectors) {
          const key = Convert.hex(vector.privateKey.encoded).toUint8Array();
          const points = await Secp256k1.getCurvePoints({ key });
          expect(points.x).to.deep.equal(Convert.hex(vector.publicKey.x).toUint8Array());
          expect(points.y).to.deep.equal(Convert.hex(vector.publicKey.y).toUint8Array());
        }
      });

      it('handles keys that require padded x-coordinate when converting from BigInt to bytes', async () => {
        const key = Convert.hex('0206a1f9628c5bcd31f3bbc2f160ec98f99960147e04ea192f56c53a0086c5432d').toUint8Array();
        const points = await Secp256k1.getCurvePoints({ key });

        const expectedX = Convert.hex('06a1f9628c5bcd31f3bbc2f160ec98f99960147e04ea192f56c53a0086c5432d').toUint8Array();
        const expectedY = Convert.hex('bf2efab7943be51219a283c0979ccba0fbe03f571e75b0eb338cc2ec01e70552').toUint8Array();
        expect(points.x).to.deep.equal(expectedX);
        expect(points.y).to.deep.equal(expectedY);
      });

      it('handles keys that require padded y-coordinate when converting from BigInt to bytes', async () => {
        const key = Convert.hex('032ff752fb8fc6af85c8682b0ca9d48901b2b9ac130f558bd1a9092240d42c4682').toUint8Array();
        const points = await Secp256k1.getCurvePoints({ key });

        const expectedX = Convert.hex('2ff752fb8fc6af85c8682b0ca9d48901b2b9ac130f558bd1a9092240d42c4682').toUint8Array();
        const expectedY = Convert.hex('048c39d9ebdc1fd98bda38b7f00b93de1d2af5bb3ba8cb532ad47c1f36e19501').toUint8Array();
        expect(points.x).to.deep.equal(expectedX);
        expect(points.y).to.deep.equal(expectedY);
      });

      it('throws error with invalid input key length', async () => {
        await expect(
          Secp256k1.getCurvePoints({ key: new Uint8Array(16) })
        ).to.eventually.be.rejectedWith(Error, 'Point of length 16 was invalid. Expected 33 compressed bytes or 65 uncompressed bytes');
      });
    });

    describe('getPublicKey()', () => {
      let keyPair: BytesKeyPair;

      before(async () => {
        keyPair = await Secp256k1.generateKeyPair();
      });

      it('returns a 33-byte compressed public key, by default', async () => {
        const publicKey = await Secp256k1.getPublicKey({ privateKey: keyPair.privateKey });
        expect(publicKey).to.be.instanceOf(Uint8Array);
        expect(publicKey.byteLength).to.equal(33);
      });

      it('returns a 65-byte uncompressed public key, if specified', async () => {
        const publicKey = await Secp256k1.getPublicKey({ privateKey: keyPair.privateKey, compressedPublicKey: false });
        expect(publicKey).to.be.instanceOf(Uint8Array);
        expect(publicKey.byteLength).to.equal(65);
      });
    });

    describe('sharedSecret()', () => {
      let otherPartyKeyPair: BytesKeyPair;
      let ownKeyPair: BytesKeyPair;

      beforeEach(async () => {
        otherPartyKeyPair = await Secp256k1.generateKeyPair();
        ownKeyPair = await Secp256k1.generateKeyPair();
      });

      it('generates a 32-byte shared secret', async () => {
        const sharedSecret = await Secp256k1.sharedSecret({
          privateKey : ownKeyPair.privateKey,
          publicKey  : otherPartyKeyPair.publicKey
        });
        expect(sharedSecret).to.be.instanceOf(Uint8Array);
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
      let keyPair: BytesKeyPair;

      before(async () => {
        keyPair = await Secp256k1.generateKeyPair();
      });

      it('returns a 64-byte signature of type Uint8Array', async () => {
        const hash = 'SHA-256';
        const data = new Uint8Array([51, 52, 53]);
        const signature = await Secp256k1.sign({ hash, key: keyPair.privateKey, data });
        expect(signature).to.be.instanceOf(Uint8Array);
        expect(signature.byteLength).to.equal(64);
      });

      it('accepts input data as Uint8Array', async () => {
        const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        const hash = 'SHA-256';
        const key = keyPair.privateKey;
        let signature: Uint8Array;

        // TypedArray - Uint8Array
        signature = await Secp256k1.sign({ hash, key, data });
        expect(signature).to.be.instanceOf(Uint8Array);
      });
    });

    describe('validatePrivateKey()', () => {
      it('returns true for valid private keys', async () => {
        for (const vector of secp256k1TestVectors) {
          const key = Convert.hex(vector.privateKey.encoded).toUint8Array();
          const isValid = await Secp256k1.validatePrivateKey({ key });
          expect(isValid).to.be.true;
        }
      });

      it('returns false for invalid private keys', async () => {
        const key = Convert.hex('02fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f').toUint8Array();
        const isValid = await Secp256k1.validatePrivateKey({ key });
        expect(isValid).to.be.false;
      });

      it('returns false if a public key is given', async () => {
        for (const vector of secp256k1TestVectors) {
          const key = Convert.hex(vector.publicKey.encoded).toUint8Array();
          const isValid = await Secp256k1.validatePrivateKey({ key });
          expect(isValid).to.be.false;
        }
      });
    });

    describe('validatePublicKey()', () => {
      it('returns true for valid public keys', async () => {
        for (const vector of secp256k1TestVectors) {
          const key = Convert.hex(vector.publicKey.encoded).toUint8Array();
          const isValid = await Secp256k1.validatePublicKey({ key });
          expect(isValid).to.be.true;
        }
      });

      it('returns false for invalid public keys', async () => {
        const key = Convert.hex('02fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f').toUint8Array();
        const isValid = await Secp256k1.validatePublicKey({ key });
        expect(isValid).to.be.false;
      });

      it('returns false if a private key is given', async () => {
        for (const vector of secp256k1TestVectors) {
          const key = Convert.hex(vector.privateKey.encoded).toUint8Array();
          const isValid = await Secp256k1.validatePublicKey({ key });
          expect(isValid).to.be.false;
        }
      });
    });

    describe('verify()', () => {
      let keyPair: BytesKeyPair;

      before(async () => {
        keyPair = await Secp256k1.generateKeyPair();
      });

      it('returns a boolean result', async () => {
        const data = new Uint8Array([51, 52, 53]);
        const signature = await Secp256k1.sign({ hash: 'SHA-256', key: keyPair.privateKey, data });

        const isValid = await Secp256k1.verify({ hash: 'SHA-256', key: keyPair.publicKey, signature, data });
        expect(isValid).to.exist;
        expect(isValid).to.be.true;
      });

      it('accepts input data as Uint8Array', async () => {
        const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        const hash = 'SHA-256';
        let isValid: boolean;
        let signature: Uint8Array;

        // TypedArray - Uint8Array
        signature = await Secp256k1.sign({ hash, key: keyPair.privateKey, data });
        isValid = await Secp256k1.verify({ hash, key: keyPair.publicKey, signature, data });
        expect(isValid).to.be.true;
      });

      it('accepts both compressed and uncompressed public keys', async () => {
        let signature: Uint8Array;
        let isValid: boolean;
        const hash = 'SHA-256';
        const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

        // Generate signature using the private key.
        signature = await Secp256k1.sign({ hash, key: keyPair.privateKey, data });

        // Attempt to verify the signature using a compressed public key.
        const compressedPublicKey = await Secp256k1.getPublicKey({ privateKey: keyPair.privateKey, compressedPublicKey: true });
        isValid = await Secp256k1.verify({ hash, key: compressedPublicKey, signature, data });
        expect(isValid).to.be.true;

        // Attempt to verify the signature using an uncompressed public key.
        const uncompressedPublicKey = await Secp256k1.getPublicKey({ privateKey: keyPair.privateKey, compressedPublicKey: false });
        isValid = await Secp256k1.verify({ hash, key: uncompressedPublicKey, signature, data });
        expect(isValid).to.be.true;
      });

      it('returns false if the signed data was mutated', async () => {
        const hash = 'SHA-256';
        const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        let isValid: boolean;

        // Generate signature using the private key.
        const signature = await Secp256k1.sign({ hash, key: keyPair.privateKey, data });

        // Verification should return true with the data used to generate the signature.
        isValid = await Secp256k1.verify({ hash, key: keyPair.publicKey, signature, data });
        expect(isValid).to.be.true;

        // Make a copy and flip the least significant bit (the rightmost bit) in the first byte of the array.
        const mutatedData = new Uint8Array(data);
        mutatedData[0] ^= 1 << 0;

        // Verification should return false if the given data does not match the data used to generate the signature.
        isValid = await Secp256k1.verify({ hash, key: keyPair.publicKey, signature, data: mutatedData });
        expect(isValid).to.be.false;
      });

      it('returns false if the signature was mutated', async () => {
        const hash = 'SHA-256';
        const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        let isValid: boolean;

        // Generate signature using the private key.
        const signature = await Secp256k1.sign({ hash, key: keyPair.privateKey, data });

        // Verification should return true with the data used to generate the signature.
        isValid = await Secp256k1.verify({ hash, key: keyPair.publicKey, signature, data });
        expect(isValid).to.be.true;

        // Make a copy and flip the least significant bit (the rightmost bit) in the first byte of the array.
        const mutatedSignature = new Uint8Array(signature);
        mutatedSignature[0] ^= 1 << 0;

        // Verification should return false if the signature was modified.
        isValid = await Secp256k1.verify({ hash, key: keyPair.publicKey, signature: signature, data: mutatedSignature });
        expect(isValid).to.be.false;
      });

      it('returns false with a signature generated using a different private key', async () => {
        const hash = 'SHA-256';
        const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        const keyPairA = await Secp256k1.generateKeyPair();
        const keyPairB = await Secp256k1.generateKeyPair();
        let isValid: boolean;

        // Generate a signature using the private key from key pair B.
        const signatureB = await Secp256k1.sign({ hash, key: keyPairB.privateKey, data });

        // Verification should return false with the public key from key pair A.
        isValid = await Secp256k1.verify({ hash, key: keyPairA.publicKey, signature: signatureB, data });
        expect(isValid).to.be.false;
      });
    });
  });

  describe('X25519', () => {
    describe('generateKeyPair()', () => {
      it('returns a pair of keys of type Uint8Array', async () => {
        const keyPair = await X25519.generateKeyPair();
        expect(keyPair).to.have.property('privateKey');
        expect(keyPair).to.have.property('publicKey');
        expect(keyPair.privateKey).to.be.instanceOf(Uint8Array);
        expect(keyPair.publicKey).to.be.instanceOf(Uint8Array);
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
      let keyPair: BytesKeyPair;

      before(async () => {
        keyPair = await X25519.generateKeyPair();
      });

      it('returns a 32-byte compressed public key', async () => {
        const publicKey = await X25519.getPublicKey({ privateKey: keyPair.privateKey });
        expect(publicKey).to.be.instanceOf(Uint8Array);
        expect(publicKey.byteLength).to.equal(32);
      });
    });

    describe('sharedSecret()', () => {
      let otherPartyKeyPair: BytesKeyPair;
      let ownKeyPair: BytesKeyPair;

      beforeEach(async () => {
        otherPartyKeyPair = await X25519.generateKeyPair();
        ownKeyPair = await X25519.generateKeyPair();
      });

      it('generates a 32-byte compressed secret', async () => {
        const sharedSecret = await X25519.sharedSecret({
          privateKey : ownKeyPair.privateKey,
          publicKey  : otherPartyKeyPair.publicKey
        });
        expect(sharedSecret).to.be.instanceOf(Uint8Array);
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

    describe('validatePublicKey()', () => {
      it('throws a not implemented error', async () => {
        await expect(
          X25519.validatePublicKey({ key: new Uint8Array(32) })
        ).to.eventually.be.rejectedWith(Error, 'Not implemented');
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
        const ciphertext = Convert.hex('789e9689e5208d7fd9e1').toUint8Array();
        const tag = Convert.hex('09701fb9f36ab77a0f136ca539229a34').toUint8Array();
        const ciphertextAndTag = new Uint8Array([...ciphertext, ...tag]);

        const plaintext = await XChaCha20Poly1305.decrypt({
          data  : ciphertextAndTag,
          key   : new Uint8Array(32),
          nonce : new Uint8Array(24),
        });
        expect(plaintext).to.be.an('Uint8Array');
        expect(plaintext.byteLength).to.equal(10);
      });

      it('passes test vectors', async () => {
        const ciphertext = Convert.hex('80246ca517c0fb5860c19090a7e7a2b030dde4882520102cbc64fad937916596ca9d').toUint8Array();
        const tag = Convert.hex('9e10a121d990e6a290f6b534516aa32f').toUint8Array();
        const ciphertextAndTag = new Uint8Array([...ciphertext, ...tag]);

        const input = {
          data  : ciphertextAndTag,
          key   : Convert.hex('79c99798ac67300bbb2704c95c341e3245f3dcb21761b98e52ff45b24f304fc4').toUint8Array(),
          nonce : Convert.hex('b33ffd3096479bcfbc9aee49417688a0a2554f8d95389419').toUint8Array(),
        };
        const output = Convert.string(`Are You There Bob? It's Me, Alice.`).toUint8Array();

        const plaintext = await XChaCha20Poly1305.decrypt({
          data  : input.data,
          key   : input.key,
          nonce : input.nonce
        });

        expect(plaintext).to.deep.equal(output);
      });

      it('throws an error if the wrong tag is given', async () => {
        const ciphertext = new Uint8Array(10);
        const tag = new Uint8Array(16);
        const ciphertextWithWrongTag =  new Uint8Array([...ciphertext, ...tag]);
        await expect(
          XChaCha20Poly1305.decrypt({
            data  : ciphertextWithWrongTag,
            key   : new Uint8Array(32),
            nonce : new Uint8Array(24)
          })
        ).to.eventually.be.rejectedWith(Error, 'Wrong tag');
      });
    });

    describe('encrypt()', () => {
      it('returns Uint8Array ciphertext and tag', async () => {
        const ciphertext = await XChaCha20Poly1305.encrypt({
          data  : new Uint8Array(10),
          key   : new Uint8Array(32),
          nonce : new Uint8Array(24)
        });
        expect(ciphertext).to.be.an('Uint8Array');
        expect(ciphertext.byteLength).to.equal(26);
      });

      it('accepts additional authenticated data', async () => {
        const ciphertextAadAndTag = await XChaCha20Poly1305.encrypt({
          associatedData : new Uint8Array(64),
          data           : new Uint8Array(10),
          key            : new Uint8Array(32),
          nonce          : new Uint8Array(24)
        });

        const ciphertextWithAad = ciphertextAadAndTag.subarray(0, -XChaCha20Poly1305.TAG_LENGTH);
        const tagWithAad = ciphertextAadAndTag.subarray(-XChaCha20Poly1305.TAG_LENGTH);

        const ciphertextWithoutAadAndTag = await XChaCha20Poly1305.encrypt({
          data  : new Uint8Array(10),
          key   : new Uint8Array(32),
          nonce : new Uint8Array(24)
        });

        const ciphertextWithoutAad = ciphertextWithoutAadAndTag.subarray(0, -XChaCha20Poly1305.TAG_LENGTH);
        const tagWithoutAad = ciphertextWithoutAadAndTag.subarray(-XChaCha20Poly1305.TAG_LENGTH);

        expect(ciphertextWithAad.byteLength).to.equal(10);
        expect(ciphertextWithoutAad.byteLength).to.equal(10);
        expect(ciphertextWithAad).to.deep.equal(ciphertextWithoutAad);
        expect(tagWithAad).to.not.deep.equal(tagWithoutAad);
      });

      it('passes test vectors', async () => {
        const input = {
          data  : Convert.string(`Are You There Bob? It's Me, Alice.`).toUint8Array(),
          key   : Convert.hex('79c99798ac67300bbb2704c95c341e3245f3dcb21761b98e52ff45b24f304fc4').toUint8Array(),
          nonce : Convert.hex('b33ffd3096479bcfbc9aee49417688a0a2554f8d95389419').toUint8Array()
        };


        const output = new Uint8Array([
          ...Convert.hex('80246ca517c0fb5860c19090a7e7a2b030dde4882520102cbc64fad937916596ca9d').toUint8Array(),
          ...Convert.hex('9e10a121d990e6a290f6b534516aa32f').toUint8Array()
        ]);

        const ciphertextAndTag = await XChaCha20Poly1305.encrypt({
          data  : input.data,
          key   : input.key,
          nonce : input.nonce
        });

        expect(ciphertextAndTag).to.deep.equal(output);
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