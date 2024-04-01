import type { Jwk } from '@web5/crypto';

import { expect } from 'chai';
import { Convert } from '@web5/common';

import { AesKwAlgorithm } from '../../../../src/prototyping/crypto/algorithms/aes-kw.js';
import { isChrome } from '../../../utils/runtimes.js';

describe('AesKwAlgorithm', () => {
  let aesKw: AesKwAlgorithm;

  before(async () => {
    aesKw = new AesKwAlgorithm();
  });

  describe('bytesToPrivateKey()', () => {
    it('returns a private key in JWK format', async () => {
      const privateKeyBytes = Convert.hex('dc5ace47f88a59c992f6ad05fa15ccbe').toUint8Array();
      const privateKey = await aesKw.bytesToPrivateKey({ privateKeyBytes });

      expect(privateKey).to.have.property('k');
      expect(privateKey).to.have.property('kid');
      expect(privateKey).to.have.property('kty', 'oct');
      expect(privateKey).to.have.property('alg', 'A128KW');
    });

    it('returns the expected JWK given byte array input', async () => {
      const privateKeyBytes = Convert.hex('dc5ace47f88a59c992f6ad05fa15ccbe').toUint8Array();

      const privateKey = await aesKw.bytesToPrivateKey({ privateKeyBytes });

      const expectedOutput: Jwk = {
        kty : 'oct',
        k   : '3FrOR_iKWcmS9q0F-hXMvg',
        alg : 'A128KW',
        kid : 'u09ksgd0kCHfNK1BDhzP_N7lOvljazw443nfbO7k6Fo',
      };
      expect(privateKey).to.deep.equal(expectedOutput);
    });
  });

  describe('generateKey()', () => {
    it('returns a private key in JWK format', async () => {
      const privateKey = await aesKw.generateKey({ algorithm: 'A256KW' });

      expect(privateKey).to.have.property('k');
      expect(privateKey).to.have.property('kid');
      expect(privateKey).to.have.property('kty', 'oct');
      expect(privateKey.alg).to.equal('A256KW');
    });

    it('supports key lengths of 128, 192, or 256 bits', async () => {
      let privateKey: Jwk;
      let privateKeyBytes: Uint8Array;

      // 128 bits
      privateKey = await aesKw.generateKey({ algorithm: 'A128KW' }) as Jwk;
      expect(privateKey.alg).to.equal('A128KW');
      privateKeyBytes = Convert.base64Url(privateKey.k!).toUint8Array();
      expect(privateKeyBytes.byteLength).to.equal(16);

      // Skip this test in Chrome browser because it does not support AES with 192-bit keys.
      if (!isChrome) {
        // 192 bits
        privateKey = await aesKw.generateKey({ algorithm: 'A192KW' }) as Jwk;
        expect(privateKey.alg).to.equal('A192KW');
        privateKeyBytes = Convert.base64Url(privateKey.k!).toUint8Array();
        expect(privateKeyBytes.byteLength).to.equal(24);
      }

      // 256 bits
      privateKey = await aesKw.generateKey({ algorithm: 'A256KW' }) as Jwk;
      expect(privateKey.alg).to.equal('A256KW');
      privateKeyBytes = Convert.base64Url(privateKey.k!).toUint8Array();
      expect(privateKeyBytes.byteLength).to.equal(32);
    });

    it('throws an error if the algorithm is unsupported', async () => {
      for (const length of [32, 64, 100, 512]) {
        try {
          // Test the method.
          // @ts-expect-error because invalid tag lengths are being tested
          await aesKw.generateKey({ length });
          expect.fail('expected an error to be thrown due to invalid key length');

        } catch (error: any) {
          // Validate the result.
          expect(error.message).to.include(`key length is invalid`);
        }
      }
    });
  });

  describe('privateKeyToBytes()', () => {
    it('returns a private key as a byte array', async () => {
      const privateKey = await aesKw.generateKey({ algorithm: 'A128KW' });
      const privateKeyBytes = await aesKw.privateKeyToBytes({ privateKey });

      expect(privateKeyBytes).to.be.an.instanceOf(Uint8Array);
    });

    it('returns the expected byte array for JWK input', async () => {
      const privateKey: Jwk = {
        kty : 'oct',
        k   : '3FrOR_iKWcmS9q0F-hXMvg',
        alg : 'A128KW',
        kid : 'u09ksgd0kCHfNK1BDhzP_N7lOvljazw443nfbO7k6Fo',
      };

      const privateKeyBytes = await aesKw.privateKeyToBytes({ privateKey });

      expect(privateKeyBytes).to.be.an.instanceOf(Uint8Array);
      const expectedOutput = Convert.hex('dc5ace47f88a59c992f6ad05fa15ccbe').toUint8Array();
      expect(privateKeyBytes).to.deep.equal(expectedOutput);
    });

    it('throws an error when provided an asymmetric private key', async () => {
      const privateKey: Jwk = {
        kty : 'OKP',
        crv : 'Ed25519',
        x   : 'mU8QoOKvOOPdqdSrpFwJlbv-YiAl7E-0Qqrp4ceIqCA',
        d   : 'nNSAn-qRZEAwu7JqG6lat4E7oU79KPEs-8cBypGyS6Y'
      };

      try {
        await aesKw.privateKeyToBytes({ privateKey });
        expect.fail('expected an error to be thrown');
      } catch (error: any) {
        expect(error.message).to.include('provided key is not a valid oct private key');
      }
    });

    it('throws an error when provided an asymmetric public key', async () => {
      const publicKey: Jwk = {
        kty : 'OKP',
        crv : 'Ed25519',
        x   : 'mU8QoOKvOOPdqdSrpFwJlbv-YiAl7E-0Qqrp4ceIqCA'
      };

      try {
        await aesKw.privateKeyToBytes({ privateKey: publicKey });
        expect.fail('expected an error to be thrown');
      } catch (error: any) {
        expect(error.message).to.include('provided key is not a valid oct private key');
      }
    });
  });

  describe('unwrapKey()', () => {
    it('returns an unwrapped key as a JWK', async () => {
      const unwrappedKeyInput: Jwk = {
        kty : 'oct',
        k   : 'hX-1yAAU6aZCwGqViYfAhIiaTyu1PURMswoI4IQmiY4',
        alg : 'A256GCM',
        kid : '-TssSnJNgh10-YTwuBtyZTnv0LY6sdT-TQl9WFTSetI',
      };
      const encryptionKey = await aesKw.generateKey({ algorithm: 'A256KW' });

      const wrappedKeyBytes = await aesKw.wrapKey({ unwrappedKey: unwrappedKeyInput, encryptionKey });

      const unwrappedKey = await aesKw.unwrapKey({ wrappedKeyBytes, wrappedKeyAlgorithm: 'A256GCM', decryptionKey: encryptionKey });

      expect(unwrappedKey).to.have.property('k');
      expect(unwrappedKey).to.have.property('kty', 'oct');
      expect(unwrappedKey).to.have.property('kid');
      expect(unwrappedKey).to.have.property('alg', 'A256GCM');
    });

    it('returns the expected wrapped key for given input', async () => {
      const wrappedKeyBytes = Convert.hex('8c55fb6fc4c7bb0b6b483df65ba52bee7ed6e0f861ac8097b2394f61067d1157901295aba72c514b').toUint8Array(); // raw format

      const decryptionKey: Jwk = {
        kty : 'oct',
        k   : '47Fn3ZXGbmntoAKErKN5-d7yuwMejCJtOqgAeq_Ojk0',
        alg : 'A256KW',
        kid : 'izA6N7g3xmPWStB6Qe6BbGgfrXvrptzuH2eJ1wmdrtk',
      };

      const unwrappedKey = await aesKw.unwrapKey({ wrappedKeyBytes, wrappedKeyAlgorithm: 'A256GCM', decryptionKey });

      const expectedPrivateKey: Jwk = {
        kty : 'oct',
        k   : 'hX-1yAAU6aZCwGqViYfAhIiaTyu1PURMswoI4IQmiY4',
        alg : 'A256GCM',
        kid : '-TssSnJNgh10-YTwuBtyZTnv0LY6sdT-TQl9WFTSetI',
      };

      expect(unwrappedKey).to.deep.equal(expectedPrivateKey);
    });
  });

  describe('wrapKey()', () => {
    it('returns a wrapped key as a byte array', async () => {
      const unwrappedKey: Jwk = {
        kty : 'oct',
        k   : 'hX-1yAAU6aZCwGqViYfAhIiaTyu1PURMswoI4IQmiY4',
        alg : 'A256GCM',
        kid : '-TssSnJNgh10-YTwuBtyZTnv0LY6sdT-TQl9WFTSetI',
      };
      const encryptionKey = await aesKw.generateKey({ algorithm: 'A256KW' });

      const wrappedKeyBytes = await aesKw.wrapKey({ encryptionKey, unwrappedKey });

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

      const wrappedKeyBytes = await aesKw.wrapKey({ unwrappedKey, encryptionKey });

      const expectedOutput = Convert.hex('8c55fb6fc4c7bb0b6b483df65ba52bee7ed6e0f861ac8097b2394f61067d1157901295aba72c514b').toUint8Array(); // raw format
      expect(wrappedKeyBytes).to.deep.equal(expectedOutput);
    });
  });
});