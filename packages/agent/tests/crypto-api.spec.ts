import type { Jwk } from '@web5/crypto';

import { expect } from 'chai';
import { Convert } from '@web5/common';
import { CryptoUtils, isOctPrivateJwk } from '@web5/crypto';

import { isChrome } from './utils/runtimes.js';
import { AgentCryptoApi } from '../src/crypto-api.js';

describe('AgentCryptoApi', () => {
  let cryptoApi: AgentCryptoApi;

  before(async () => {
    cryptoApi = new AgentCryptoApi();
  });

  describe('bytesToPrivateKey()', () => {
    it('returns a private key as a JWK', async () => {
      // Setup.
      const privateKeyBytes = Convert.hex('857fb5c80014e9a642c06a958987c084').toUint8Array();

      // Test the method.
      const privateKey = await cryptoApi.bytesToPrivateKey({ algorithm: 'A128KW', privateKeyBytes });

      // Validate the result.
      expect(privateKey).to.have.property('kty', 'oct');
      expect(privateKey).to.have.property('k');
      expect(privateKey).to.have.property('alg', 'A128KW');
      if (!isOctPrivateJwk(privateKey)) throw new Error('Invalid key type'); // type guard
      const privateKeyBytesResult = Convert.base64Url(privateKey.k).toUint8Array();
      expect(privateKeyBytesResult).to.deep.equal(privateKeyBytes);
    });

    it('returns a private key as a JWK', async () => {
      // Setup.
      const privateKeyBytes = Convert.hex('857fb5c80014e9a642c06a958987c084').toUint8Array();

      // Test the method.
      const privateKey = await cryptoApi.bytesToPrivateKey({ algorithm: 'A128KW', privateKeyBytes });

      // Validate the result.
      expect(privateKey).to.have.property('kty', 'oct');
      expect(privateKey).to.have.property('k');
      expect(privateKey).to.have.property('alg', 'A128KW');
      if (!isOctPrivateJwk(privateKey)) throw new Error('Invalid key type'); // type guard
      const privateKeyBytesResult = Convert.base64Url(privateKey.k).toUint8Array();
      expect(privateKeyBytesResult).to.deep.equal(privateKeyBytes);
    });

    it('supports A128GCM and A256GCM in all supported runtimes', async function () {
      for (const algorithm of ['A128GCM', 'A256GCM'] as const) {
        // Setup.
        const privateKeyInput = await cryptoApi.generateKey({ algorithm });
        const privateKeyBytes = Convert.base64Url(privateKeyInput.k!).toUint8Array();

        // Test the method.
        const privateKey = await cryptoApi.bytesToPrivateKey({ algorithm, privateKeyBytes });

        // Validate the result.
        expect(privateKey).to.have.property('alg', algorithm);
        const privateKeyBytesResult = Convert.base64Url(privateKey.k!).toUint8Array();
        expect(privateKeyBytesResult).to.deep.equal(privateKeyBytes);
      }
    });

    it('supports A192GCM in all supported runtimes except Chrome browser', async function () {
      // Google Chrome does not support AES with 192-bit keys.
      if (isChrome) this.skip();

      for (const algorithm of ['A192GCM'] as const) {
        // Setup.
        const privateKeyInput = await cryptoApi.generateKey({ algorithm });
        const privateKeyBytes = Convert.base64Url(privateKeyInput.k!).toUint8Array();

        // Test the method.
        const privateKey = await cryptoApi.bytesToPrivateKey({ algorithm, privateKeyBytes });

        // Validate the result.
        expect(privateKey).to.have.property('alg', algorithm);
        const privateKeyBytesResult = Convert.base64Url(privateKey.k!).toUint8Array();
        expect(privateKeyBytesResult).to.deep.equal(privateKeyBytes);
      }
    });

    it('supports A128KW and A256KW in all supported runtimes', async () => {
      for (const algorithm of ['A128KW', 'A256KW'] as const) {
        // Setup.
        const privateKeyInput = await cryptoApi.generateKey({ algorithm });
        const privateKeyBytes = Convert.base64Url(privateKeyInput.k!).toUint8Array();

        // Test the method.
        const privateKey = await cryptoApi.bytesToPrivateKey({ algorithm, privateKeyBytes });

        // Validate the result.
        expect(privateKey).to.have.property('alg', algorithm);
        const privateKeyBytesResult = Convert.base64Url(privateKey.k!).toUint8Array();
        expect(privateKeyBytesResult).to.deep.equal(privateKeyBytes);
      }
    });

    it('supports A192KW in all supported runtimes except Chrome browser', async function () {
      // Google Chrome does not support AES with 192-bit keys.
      if (isChrome) this.skip();

      for (const algorithm of ['A192KW'] as const) {
        // Setup.
        const privateKeyInput = await cryptoApi.generateKey({ algorithm });
        const privateKeyBytes = Convert.base64Url(privateKeyInput.k!).toUint8Array();

        // Test the method.
        const privateKey = await cryptoApi.bytesToPrivateKey({ algorithm, privateKeyBytes });

        // Validate the result.
        expect(privateKey).to.have.property('alg', algorithm);
        const privateKeyBytesResult = Convert.base64Url(privateKey.k!).toUint8Array();
        expect(privateKeyBytesResult).to.deep.equal(privateKeyBytes);
      }
    });
  });

  describe('bytesToPublicKey()', () => {
    it('returns a public key as a JWK', async () => {
      // Setup.
      const publicKeyBytes = Convert.hex('d8d6e4ecd1126ca6bd02610f5698063dbce05ec92ef12543d191810d879b9297').toUint8Array();

      // Test the method.
      const publicKey = await cryptoApi.bytesToPublicKey({ algorithm: 'Ed25519', publicKeyBytes });

      // Validate the result.
      expect(publicKey).to.have.property('kty', 'OKP');
      expect(publicKey).to.have.property('x');
      expect(publicKey).to.not.have.property('d');
      expect(publicKey).to.have.property('alg', 'EdDSA');
    });

    it('supports Ed25519, ES256K, secp256k1, ES256, and secp256r1', async () => {
      for (const algorithm of ['Ed25519', 'ES256K', 'secp256k1', 'ES256', 'secp256r1'] as const) {
        // Setup.
        const privateKey = await cryptoApi.generateKey({ algorithm });
        const publicKeyInput = await cryptoApi.getPublicKey({ key: privateKey });
        const publicKeyBytes = await cryptoApi.publicKeyToBytes({ publicKey: publicKeyInput });

        // Test the method.
        const publicKey = await cryptoApi.bytesToPublicKey({ algorithm, publicKeyBytes });

        // Validate the result.
        expect(publicKey).to.have.property('alg');
        expect(publicKey).to.have.property('kty');
        expect(publicKey).to.have.property('crv');
      }
    });
  });

  describe('decrypt()', () => {
    it('accepts a private JWK to decrypt the data', async () => {
      // Setup.
      const privateKey: Jwk = {
        alg : 'A128GCM',
        k   : '3k6i3iaSl7-_S-NH3N1GMQ',
        kty : 'oct',
        kid : 'HLYc5oFZYs3OfBfOa-dWL5md__xFUIpx1BJ6ueCPQQQ'
      };
      const ciphertext = Convert.hex('f27e81aa63c315a5cd03e2abcbc62a5665').toUint8Array();

      // Test the method.
      const plaintext = await cryptoApi.decrypt({
        key  : privateKey,
        data : ciphertext,
        iv   : new Uint8Array(12)
      });

      // Validate the results.
      expect(plaintext).to.be.instanceOf(Uint8Array);
      const expectedPlaintext = Convert.hex('01').toUint8Array();
      expect(plaintext).to.deep.equal(expectedPlaintext);
    });
  });

  describe('deriveKey()', () => {
    it('returns a derived key as a JWK', async () => {
      // Setup.
      const privateKeyHex = '857fb5c80014e9a642c06a958987c084889a4f2bb53d444cb30a08e08426898e'; // 32-bytes / 256-bits
      const privateKeyBytes = Convert.hex(privateKeyHex).toUint8Array();

      // Test the method.
      const derivedKey = await cryptoApi.deriveKey({
        algorithm           : 'HKDF-256',
        baseKeyBytes        : privateKeyBytes,
        info                : new Uint8Array(0),
        salt                : new Uint8Array(0),
        derivedKeyAlgorithm : 'A128KW'
      });

      // Validate the result.
      expect(derivedKey).to.have.property('kty', 'oct');
      expect(derivedKey).to.have.property('k');
      expect(derivedKey).to.have.property('alg', 'A128KW');
      if (!isOctPrivateJwk(derivedKey)) throw new Error('Invalid key type'); // type guard
      const derivedKeyBytes = Convert.base64Url(derivedKey.k).toUint8Array();
      expect(derivedKeyBytes.byteLength).to.equal(128 / 8);
    });

    it('supports HKDF-256 with A128KW, A192KW, and A256KW', async () => {
      // Setup.
      const privateKeyHex = '857fb5c80014e9a642c06a958987c084889a4f2bb53d444cb30a08e08426898e'; // 32-bytes / 256-bits
      const privateKeyBytes = Convert.hex(privateKeyHex).toUint8Array();

      for (const derivedKeyAlgorithm of ['A128KW', 'A192KW', 'A256KW'] as const) {
        // Test the method.
        const derivedKey = await cryptoApi.deriveKey({
          algorithm    : 'HKDF-256',
          baseKeyBytes : privateKeyBytes,
          info         : new Uint8Array(0),
          salt         : new Uint8Array(0),
          derivedKeyAlgorithm
        });

        // Validate the result.
        expect(derivedKey).to.have.property('alg', derivedKeyAlgorithm);
        if (!isOctPrivateJwk(derivedKey)) throw new Error('Invalid key type'); // type guard
        const derivedKeyBytes = Convert.base64Url(derivedKey.k).toUint8Array();
        const expectedKeyLength = parseInt(derivedKeyAlgorithm.slice(1, 4), 10);
        expect(derivedKeyBytes.byteLength).to.equal(expectedKeyLength / 8);
      }
    });

    it('supports PBES with HMAC-256/A128KW, HMAC-384/A192KW, HMAC-512/A256KW', async () => {
      // Setup.
      const privateKeyHex = '857fb5c80014e9a642c06a958987c084889a4f2bb53d444cb30a08e08426898e'; // 32-bytes / 256-bits
      const privateKeyBytes = Convert.hex(privateKeyHex).toUint8Array();

      for (const algorithm of ['PBES2-HS256+A128KW', 'PBES2-HS384+A192KW', 'PBES2-HS512+A256KW'] as const) {
        // Test the method.
        const derivedKey = await cryptoApi.deriveKey({
          algorithm    : algorithm,
          baseKeyBytes : privateKeyBytes,
          iterations   : 1,
          salt         : new Uint8Array(0)
        });

        // Validate the result.
        const [, , derivedKeyAlgorithm] = algorithm.split(/[-+]/);
        expect(derivedKey).to.have.property('alg', derivedKeyAlgorithm);
        if (!isOctPrivateJwk(derivedKey)) throw new Error('Invalid key type'); // type guard
        const derivedKeyBytes = Convert.base64Url(derivedKey.k).toUint8Array();
        const expectedKeyLength = parseInt(derivedKeyAlgorithm.slice(1, 4), 10);
        expect(derivedKeyBytes.byteLength).to.equal(expectedKeyLength / 8);
      }
    });

    it(`throws an error if the "algorithm" is unsupported`, async () => {
      try {
        await cryptoApi.deriveKey({
          // @ts-expect-error because an unsupported algorithm is being tested.
          algorithm           : 'unsupported-algorithm',
          baseKeyBytes        : new Uint8Array(0),
          info                : new Uint8Array(0),
          salt                : new Uint8Array(0),
          derivedKeyAlgorithm : 'A128KW'
        });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        // Validate the result.
        expect(error.message).to.include('Algorithm not supported');
      }
    });

    it(`throws an error if the "derivedKeyAlgorithm" is unsupported`, async () => {
      // Setup.
      const privateKeyHex = '857fb5c80014e9a642c06a958987c084889a4f2bb53d444cb30a08e08426898e'; // 32-bytes / 256-bits
      const privateKeyBytes = Convert.hex(privateKeyHex).toUint8Array();

      try {
        // Test the method.
        await cryptoApi.deriveKey({
          algorithm           : 'HKDF-256',
          baseKeyBytes        : privateKeyBytes,
          info                : new Uint8Array(0),
          salt                : new Uint8Array(0),
          // @ts-expect-error because an unsupported algorithm is being tested.
          derivedKeyAlgorithm : 'unsupported-algorithm'
        });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        // Validate the result.
        expect(error.message).to.include('is not supported');
      }
    });
  });

  describe('deriveKeyBytes()', () => {
    it('returns a derived key as a byte array', async () => {
      // Setup.
      const privateKeyHex = '857fb5c80014e9a642c06a958987c084889a4f2bb53d444cb30a08e08426898e'; // 32-bytes / 256-bits
      const privateKeyBytes = Convert.hex(privateKeyHex).toUint8Array();

      // Test the method.
      const derivedKeyBytes = await cryptoApi.deriveKeyBytes({
        algorithm    : 'HKDF-256',
        baseKeyBytes : privateKeyBytes,
        length       : 256,
        info         : new Uint8Array(0),
        salt         : new Uint8Array(0),
      });

      // Validate the result.
      expect(derivedKeyBytes).to.be.an.instanceOf(Uint8Array);
      expect(derivedKeyBytes.byteLength).to.equal(32);
    });
  });

  describe('digest()', () => {
    it('computes and returns a digest as a Uint8Array', async () => {
      // Setup.
      const data = new Uint8Array([0, 1, 2, 3, 4]);

      // Test the method.
      const digest = await cryptoApi.digest({ algorithm: 'SHA-256', data });

      // Validate the result.
      expect(digest).to.exist;
      expect(digest).to.be.an.instanceOf(Uint8Array);
    });

    it('accepts an algorithm identifier as a string parameter', async () => {
      // Setup.
      const data = new Uint8Array([0, 1, 2, 3, 4]);

      // Test the method.
      const algorithm = 'SHA-256';
      const digest = await cryptoApi.digest({ algorithm, data });

      // Validate the result.
      expect(digest).to.exist;
      expect(digest).to.be.an.instanceOf(Uint8Array);
    });

    it('supports SHA-256', async () => {
      // Setup.
      const data = Convert.string('abc').toUint8Array();
      const expectedOutput = Convert.hex('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad').toUint8Array();

      // Test the method.
      const digest = await cryptoApi.digest({ algorithm: 'SHA-256', data });

      // Validate the result.
      expect(digest).to.exist;
      expect(digest).to.be.an.instanceOf(Uint8Array);
      expect(digest).to.have.lengthOf(32);
      expect(digest).to.deep.equal(expectedOutput);
    });

    it('throws an error if the algorithm is not supported', async () => {
      // Setup.
      const algorithm = 'unsupported-algorithm';

      // Test the method.
      try {
        // @ts-expect-error because an unsupported algorithm is being tested.
        await cryptoApi.digest({ algorithm });
        expect.fail('Expected an error to be thrown.');

      } catch (error: any) {
        // Validate the result.
        expect(error).to.exist;
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.include(`Algorithm not supported: ${algorithm}`);
      }
    });
  });

  describe('encrypt()', () => {
    it('accepts a private JWK to encrypt the data', async () => {
      // Setup.
      const privateKey: Jwk = {
        kty : 'oct',
        k   : 'n0Q35vyMl-2Dc87Nu6xx9Q',
        alg : 'A128GCM',
        kid : 'kpI8W6JS7O5ncakbn5dUOgP7uCuHGtZnkNOX2ZnRiss',
      };
      const plaintext = new Uint8Array([1, 2, 3, 4]);
      const iv = CryptoUtils.randomBytes(12); // Initialization vector.
      const tagLength = 128; // Size in bits of the authentication tag.

      // Test the method.
      const ciphertext = await cryptoApi.encrypt({
        key  : privateKey,
        data : plaintext,
        iv,
        tagLength
      });

      // Validate the results.
      expect(ciphertext).to.be.instanceOf(Uint8Array);
      expect(ciphertext.byteLength).to.equal(plaintext.byteLength + tagLength / 8);
    });
  });

  describe('generateKey()', () => {
    it('returns a Key URI', async () => {
      const keyUri = await cryptoApi.generateKey({ algorithm: 'Ed25519' });

      expect(keyUri).to.be.a.string;
    });

    it('accepts an algorithm identifier as a string parameter', async () => {
      const algorithm = 'Ed25519';
      const keyUri = await cryptoApi.generateKey({ algorithm });

      expect(keyUri).to.be.a.string;
    });
  });

  describe('privateKeyToBytes()', () => {
    it('returns a private key as a byte array', async () => {
      const privateKey: Jwk = {
        crv : 'Ed25519',
        d   : 'TM0Imyj_ltqdtsNG7BFOD1uKMZ81q6Yk2oz27U-4pvs',
        kty : 'OKP',
        x   : 'PUAXw-hDiVqStwqnTRt-vJyYLM8uxJaMwM1V8Sr0Zgw',
        kid : 'FtIu-VbGrfe_KB6CH7GNwODB72MNxj_ml11dEvO-7kk'
      };
      const privateKeyBytes = await cryptoApi.privateKeyToBytes({ privateKey });

      expect(privateKeyBytes).to.be.an.instanceOf(Uint8Array);
      const expectedOutput = Convert.hex('4ccd089b28ff96da9db6c346ec114e0f5b8a319f35aba624da8cf6ed4fb8a6fb').toUint8Array();
      expect(privateKeyBytes).to.deep.equal(expectedOutput);
    });
  });

  describe('publicKeyToBytes()', () => {
    it('returns a public key in JWK format', async () => {
      const publicKey: Jwk = {
        kty : 'OKP',
        crv : 'Ed25519',
        x   : 'PUAXw-hDiVqStwqnTRt-vJyYLM8uxJaMwM1V8Sr0Zgw',
        kid : 'FtIu-VbGrfe_KB6CH7GNwODB72MNxj_ml11dEvO-7kk'
      };

      const publicKeyBytes = await cryptoApi.publicKeyToBytes({ publicKey });

      expect(publicKeyBytes).to.be.an.instanceOf(Uint8Array);
      const expectedOutput = Convert.hex('3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c').toUint8Array();
      expect(publicKeyBytes).to.deep.equal(expectedOutput);
    });
  });

  describe('unwrapKey()', () => {
    it('returns the expected key given a wrapped key and decryption JWK', async () => {
      const wrappedKeyBytes = Convert.hex('8c55fb6fc4c7bb0b6b483df65ba52bee7ed6e0f861ac8097b2394f61067d1157901295aba72c514b').toUint8Array(); // raw format

      const decryptionKey: Jwk = {
        kty : 'oct',
        k   : '47Fn3ZXGbmntoAKErKN5-d7yuwMejCJtOqgAeq_Ojk0',
        alg : 'A256KW',
        kid : 'izA6N7g3xmPWStB6Qe6BbGgfrXvrptzuH2eJ1wmdrtk',
      };

      const unwrappedKey = await cryptoApi.unwrapKey({ wrappedKeyBytes, wrappedKeyAlgorithm: 'A256GCM', decryptionKey });

      const expectedPrivateKey: Jwk = {
        kty : 'oct',
        k   : 'hX-1yAAU6aZCwGqViYfAhIiaTyu1PURMswoI4IQmiY4',
        alg : 'A256GCM',
        kid : '-TssSnJNgh10-YTwuBtyZTnv0LY6sdT-TQl9WFTSetI',
      };

      expect(unwrappedKey).to.deep.equal(expectedPrivateKey);
    });
  });

  describe('verify()', () => {
    it('returns true for a valid signature', async () => {
      // Setup.
      const privateKey = await cryptoApi.generateKey({ algorithm: 'secp256k1' });
      const publicKey = await cryptoApi.getPublicKey({ key: privateKey });
      const data = new Uint8Array([0, 1, 2, 3, 4]);
      const signature = await cryptoApi.sign({ key: privateKey, data });

      // Test the method.
      const isValid = await cryptoApi.verify({ key: publicKey, signature, data });

      // Validate the result.
      expect(isValid).to.be.true;
    });

    it('returns false for an invalid signature', async () => {
      // Setup.
      const privateKey = await cryptoApi.generateKey({ algorithm: 'secp256k1' });
      const publicKey = await cryptoApi.getPublicKey({ key: privateKey });
      const data = new Uint8Array([0, 1, 2, 3, 4]);
      const signature = new Uint8Array(64);

      // Test the method.
      const isValid = await cryptoApi.verify({ key: publicKey, signature, data });

      // Validate the result.
      expect(isValid).to.be.false;
    });

    it('handles public keys missing alg property', async () => {
      // Setup.
      const privateKey = await cryptoApi.generateKey({ algorithm: 'secp256k1' });
      const publicKey = await cryptoApi.getPublicKey({ key: privateKey });
      const data = new Uint8Array([0, 1, 2, 3, 4]);
      const signature = await cryptoApi.sign({ key: privateKey, data });
      // Intentionally remove the alg property from the public key.
      delete publicKey.alg;

      // Test the method.
      const isValid = await cryptoApi.verify({ key: publicKey, signature, data });

      // Validate the result.
      expect(isValid).to.be.true;
    });

    it('throws an error when public key algorithm and curve are unsupported', async () => {
      // Setup.
      const key: Jwk = { kty: 'EC', alg: 'unsupported-algorithm', crv: 'unsupported-curve', x: 'x', y: 'y' };
      const signature = new Uint8Array(64);
      const data = new Uint8Array(0);

      // Test the method.
      try {
        await cryptoApi.verify({ key, signature, data });
        expect.fail('Expected an error to be thrown.');

      } catch (error: any) {
        // Validate the result.
        expect(error).to.exist;
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.include('Algorithm not supported');
      }
    });
  });

  describe('wrapKey()', () => {
    it('returns a wrapped key as a byte array given an encryption JWK', async () => {
      const unwrappedKey: Jwk = {
        kty : 'oct',
        k   : 'hX-1yAAU6aZCwGqViYfAhIiaTyu1PURMswoI4IQmiY4',
        alg : 'A256GCM',
        kid : '-TssSnJNgh10-YTwuBtyZTnv0LY6sdT-TQl9WFTSetI',
      };
      const encryptionKey = await cryptoApi.generateKey({ algorithm: 'A256KW' });

      const wrappedKeyBytes = await cryptoApi.wrapKey({ unwrappedKey, encryptionKey });

      expect(wrappedKeyBytes).to.be.an.instanceOf(Uint8Array);
      expect(wrappedKeyBytes.byteLength).to.equal(32 + 8); // 32 bytes for the wrapped private key, 8 bytes for the initialization vector
    });

    it('returns the expected wrapped key for given input', async () => {
      const unwrappedKey: Jwk = {
        kty : 'oct',
        k   : 'hX-1yAAU6aZCwGqViYfAhIiaTyu1PURMswoI4IQmiY4',
        alg : 'A256GCM',
        kid : '-TssSnJNgh10-YTwuBtyZTnv0LY6sdT-TQl9WFTSetI',
      };

      const encryptionKey: Jwk = {
        kty : 'oct',
        k   : '47Fn3ZXGbmntoAKErKN5-d7yuwMejCJtOqgAeq_Ojk0',
        alg : 'A256KW',
        kid : 'izA6N7g3xmPWStB6Qe6BbGgfrXvrptzuH2eJ1wmdrtk',
      };

      const wrappedKeyBytes = await cryptoApi.wrapKey({ encryptionKey, unwrappedKey });

      const expectedOutput = Convert.hex('8c55fb6fc4c7bb0b6b483df65ba52bee7ed6e0f861ac8097b2394f61067d1157901295aba72c514b').toUint8Array(); // raw format
      expect(wrappedKeyBytes).to.deep.equal(expectedOutput);
    });
  });
});