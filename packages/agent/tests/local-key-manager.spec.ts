import type { Jwk } from '@web5/crypto';

import { expect } from 'chai';
import { Convert } from '@web5/common';

import type { Web5PlatformAgent } from '../src/types/agent.js';

import { LocalKeyManager } from '../src/local-key-manager.js';
import { CryptoErrorCode } from '../src/prototyping/crypto-error.js';

describe('LocalKeyManager', () => {
  let keyManager: LocalKeyManager;

  beforeEach(() => {
    keyManager = new LocalKeyManager({ agent: {} as Web5PlatformAgent });
  });

  describe('generateKey()', () => {
    it('generates a key and returns a key URI', async () => {
      const keyUri = await keyManager.generateKey({ algorithm: 'secp256k1' });

      expect(keyUri).to.exist;
      expect(keyUri).to.be.a.string;
      expect(keyUri.indexOf('urn:jwk:')).to.equal(0);
    });

    it(`supports generating 'secp256k1' keys`, async () => {
      const keyUri = await keyManager.generateKey({ algorithm: 'secp256k1' });
      expect(keyUri).to.be.a.string;
    });

    it(`supports generating 'Ed25519' keys`, async () => {
      const keyUri = await keyManager.generateKey({ algorithm: 'Ed25519' });

      expect(keyUri).to.exist;
      expect(keyUri).to.be.a.string;
      expect(keyUri.indexOf('urn:jwk:')).to.equal(0);
    });

    it(`supports generating 'AES-KW' keys`, async () => {
      let keyUri = await keyManager.generateKey({ algorithm: 'A128KW' });
      expect(keyUri).to.be.a.string;

      keyUri = await keyManager.generateKey({ algorithm: 'A192KW' });
      expect(keyUri).to.be.a.string;

      keyUri = await keyManager.generateKey({ algorithm: 'A256KW' });
      expect(keyUri).to.be.a.string;
    });

    it(`supports generating 'AES-GCM' keys`, async () => {
      let keyUri = await keyManager.generateKey({ algorithm: 'A128GCM' });
      expect(keyUri).to.be.a.string;

      keyUri = await keyManager.generateKey({ algorithm: 'A192GCM' });
      expect(keyUri).to.be.a.string;

      keyUri = await keyManager.generateKey({ algorithm: 'A256GCM' });
      expect(keyUri).to.be.a.string;
    });

    it('throws an error if the algorithm is not supported', async () => {
      // Setup.
      const algorithm = 'unsupported-algorithm';

      // Test the method.
      try {
        // @ts-expect-error because an unsupported algorithm is being tested.
        await keyManager.generateKey({ algorithm });
        expect.fail('Expected an error to be thrown.');

      } catch (error: any) {
        // Validate the result.
        expect(error).to.exist;
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.include(`Algorithm not supported`);
        expect(error.code).to.equal(CryptoErrorCode.AlgorithmNotSupported);
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

      const encryptionKeyUri = await keyManager.generateKey({ algorithm: 'A256KW' });

      const wrappedKeyBytes = await keyManager.wrapKey({ encryptionKeyUri, unwrappedKey: unwrappedKeyInput });

      const unwrappedKey = await keyManager.unwrapKey({ wrappedKeyBytes, wrappedKeyAlgorithm: 'A256GCM', decryptionKeyUri: encryptionKeyUri });

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

      const decryptionKeyUri = await keyManager.importKey({ key: decryptionKey });

      const unwrappedKey = await keyManager.unwrapKey({ wrappedKeyBytes, wrappedKeyAlgorithm: 'A256GCM', decryptionKeyUri });

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
      const privateKeyUri = await keyManager.generateKey({ algorithm: 'secp256k1' });
      const publicKey = await keyManager.getPublicKey({ keyUri: privateKeyUri });
      const data = new Uint8Array([0, 1, 2, 3, 4]);
      const signature = await keyManager.sign({ keyUri: privateKeyUri, data });

      // Test the method.
      const isValid = await keyManager.verify({ key: publicKey, signature, data });

      // Validate the result.
      expect(isValid).to.be.true;
    });

    it('returns false for an invalid signature', async () => {
      // Setup.
      const privateKeyUri = await keyManager.generateKey({ algorithm: 'secp256k1' });
      const publicKey = await keyManager.getPublicKey({ keyUri: privateKeyUri });
      const data = new Uint8Array([0, 1, 2, 3, 4]);
      const signature = new Uint8Array(64);

      // Test the method.
      const isValid = await keyManager.verify({ key: publicKey, signature, data });

      // Validate the result.
      expect(isValid).to.be.false;
    });


    it('throws an error when public key algorithm and curve are unsupported', async () => {
      // Setup.
      const key: Jwk = { kty: 'EC', alg: 'unsupported-algorithm', crv: 'unsupported-curve', x: 'x', y: 'y' };
      const signature = new Uint8Array(64);
      const data = new Uint8Array(0);

      // Test the method.
      try {
        await keyManager.verify({ key, signature, data });
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
    it('returns a wrapped key as a byte array', async () => {
      const unwrappedKey: Jwk = {
        kty : 'oct',
        k   : 'hX-1yAAU6aZCwGqViYfAhIiaTyu1PURMswoI4IQmiY4',
        alg : 'A256GCM',
        kid : '-TssSnJNgh10-YTwuBtyZTnv0LY6sdT-TQl9WFTSetI',
      };
      const encryptionKeyUri = await keyManager.generateKey({ algorithm: 'A256KW' });

      const wrappedKeyBytes = await keyManager.wrapKey({ unwrappedKey, encryptionKeyUri });

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

      const encryptionKeyUri = await keyManager.importKey({ key: encryptionKey });

      const wrappedKeyBytes = await keyManager.wrapKey({ encryptionKeyUri, unwrappedKey });

      const expectedOutput = Convert.hex('8c55fb6fc4c7bb0b6b483df65ba52bee7ed6e0f861ac8097b2394f61067d1157901295aba72c514b').toUint8Array(); // raw format
      expect(wrappedKeyBytes).to.deep.equal(expectedOutput);
    });
  });
});