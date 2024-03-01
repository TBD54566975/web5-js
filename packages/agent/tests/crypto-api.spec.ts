import type { Jwk } from '@web5/crypto';
import type { BearerDid } from '@web5/dids';

import sinon from 'sinon';
import { expect } from 'chai';
import { Convert } from '@web5/common';
import { utils as cryptoUtils, isOctPrivateJwk } from '@web5/crypto';

import type { Web5PlatformAgent } from '../src/types/agent.js';
import type { AgentKeyManager } from '../src/types/key-manager.js';

import { TestAgent } from './utils/test-agent.js';
import { AgentCryptoApi } from '../src/crypto-api.js';
import { ManagedAgentTestHarness } from '../src/test-harness.js';

describe('AgentCryptoApi', () => {
  describe('get agent', () => {
    it(`returns the 'agent' instance property`, async () => {
      // @ts-expect-error because we are only mocking a single property.
      const mockAgent: Web5PlatformAgent = {
        agentDid: { uri: 'did:method:abc123' } as BearerDid
      };
      const cryptoApi = new AgentCryptoApi({ agent: mockAgent });
      const agent = cryptoApi.agent;
      expect(agent).to.exist;
      expect(agent.agentDid.uri).to.equal('did:method:abc123');
    });

    it(`throws an error if the 'agent' instance property is undefined`, () => {
      const cryptoApi = new AgentCryptoApi({});
      expect(() =>
        cryptoApi.agent
      ).to.throw(Error, 'Unable to determine agent execution context');
    });
  });

  // Run tests for each supported data store type.
  const agentStoreTypes = ['dwn', 'memory'] as const;
  agentStoreTypes.forEach((agentStoreType) => {

    describe(`with ${agentStoreType} key store`, () => {
      let testHarness: ManagedAgentTestHarness;

      before(async () => {
        testHarness = await ManagedAgentTestHarness.setup({
          agentClass  : TestAgent,
          agentStores : agentStoreType
        });
      });

      beforeEach(async () => {
        await testHarness.clearStorage();
        await testHarness.createAgentDid();
      });

      after(async () => {
        await testHarness.clearStorage();
        await testHarness.closeStorage();
      });

      describe('bytesToPrivateKey()', () => {
        it('returns a private key as a JWK', async () => {
          // Setup.
          const privateKeyBytes = Convert.hex('857fb5c80014e9a642c06a958987c084').toUint8Array();

          // Test the method.
          const privateKey = await testHarness.agent.crypto.bytesToPrivateKey({ algorithm: 'A128KW', privateKeyBytes });

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
          const privateKey = await testHarness.agent.crypto.bytesToPrivateKey({ algorithm: 'A128KW', privateKeyBytes });

          // Validate the result.
          expect(privateKey).to.have.property('kty', 'oct');
          expect(privateKey).to.have.property('k');
          expect(privateKey).to.have.property('alg', 'A128KW');
          if (!isOctPrivateJwk(privateKey)) throw new Error('Invalid key type'); // type guard
          const privateKeyBytesResult = Convert.base64Url(privateKey.k).toUint8Array();
          expect(privateKeyBytesResult).to.deep.equal(privateKeyBytes);
        });

        it('supports A128GCM, A192GCM, and A256GCM', async () => {
          for (const algorithm of ['A128GCM', 'A192GCM', 'A256GCM'] as const) {
            // Setup.
            const privateKeyUri = await testHarness.agent.crypto.generateKey({ algorithm });
            const privateKeyInput = await testHarness.agent.crypto.exportKey({ keyUri: privateKeyUri });
            const privateKeyBytes = Convert.base64Url(privateKeyInput.k!).toUint8Array();

            // Test the method.
            const privateKey = await testHarness.agent.crypto.bytesToPrivateKey({ algorithm, privateKeyBytes });

            // Validate the result.
            expect(privateKey).to.have.property('alg', algorithm);
            const privateKeyBytesResult = Convert.base64Url(privateKey.k!).toUint8Array();
            expect(privateKeyBytesResult).to.deep.equal(privateKeyBytes);
          }
        });

        it('supports A128KW, A192KW, and A256KW', async () => {
          for (const algorithm of ['A128KW', 'A192KW', 'A256KW'] as const) {
            // Setup.
            const privateKeyUri = await testHarness.agent.crypto.generateKey({ algorithm });
            const privateKeyInput = await testHarness.agent.crypto.exportKey({ keyUri: privateKeyUri });
            const privateKeyBytes = Convert.base64Url(privateKeyInput.k!).toUint8Array();

            // Test the method.
            const privateKey = await testHarness.agent.crypto.bytesToPrivateKey({ algorithm, privateKeyBytes });

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
          const publicKey = await testHarness.agent.crypto.bytesToPublicKey({ algorithm: 'Ed25519', publicKeyBytes });

          // Validate the result.
          expect(publicKey).to.have.property('kty', 'OKP');
          expect(publicKey).to.have.property('x');
          expect(publicKey).to.not.have.property('d');
          expect(publicKey).to.have.property('alg', 'EdDSA');
        });

        it('supports Ed25519, ES256K, secp256k1, ES256, and secp256r1', async () => {
          for (const algorithm of ['Ed25519', 'ES256K', 'secp256k1', 'ES256', 'secp256r1'] as const) {
            // Setup.
            const privateKeyUri = await testHarness.agent.crypto.generateKey({ algorithm });
            const publicKeyInput = await testHarness.agent.crypto.getPublicKey({ keyUri: privateKeyUri });
            const publicKeyBytes = await testHarness.agent.crypto.publicKeyToBytes({ publicKey: publicKeyInput });

            // Test the method.
            const publicKey = await testHarness.agent.crypto.bytesToPublicKey({ algorithm, publicKeyBytes });

            // Validate the result.
            expect(publicKey).to.have.property('alg');
            expect(publicKey).to.have.property('kty');
            expect(publicKey).to.have.property('crv');
          }
        });
      });

      describe('decrypt()', () => {
        it('accepts a key identifier URI to decrypt the data', async () => {
          // Setup.
          const privateKey: Jwk = {
            alg : 'A128GCM',
            k   : '3k6i3iaSl7-_S-NH3N1GMQ',
            kty : 'oct',
            kid : 'HLYc5oFZYs3OfBfOa-dWL5md__xFUIpx1BJ6ueCPQQQ'
          };
          const ciphertext = Convert.hex('f27e81aa63c315a5cd03e2abcbc62a5665').toUint8Array();
          const decryptionKeyUri = await testHarness.agent.crypto.importKey({ key: privateKey });

          // Test the method.
          const plaintext = await testHarness.agent.crypto.decrypt({
            keyUri : decryptionKeyUri,
            data   : ciphertext,
            iv     : new Uint8Array(12)
          });

          // Validate the results.
          expect(plaintext).to.be.instanceOf(Uint8Array);
          const expectedPlaintext = Convert.hex('01').toUint8Array();
          expect(plaintext).to.deep.equal(expectedPlaintext);
        });

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
          const plaintext = await testHarness.agent.crypto.decrypt({
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
          const derivedKey = await testHarness.agent.crypto.deriveKey({
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
            const derivedKey = await testHarness.agent.crypto.deriveKey({
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
            const derivedKey = await testHarness.agent.crypto.deriveKey({
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
            await testHarness.agent.crypto.deriveKey({
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
            await testHarness.agent.crypto.deriveKey({
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
          const derivedKeyBytes = await testHarness.agent.crypto.deriveKeyBytes({
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
          const digest = await testHarness.agent.crypto.digest({ algorithm: 'SHA-256', data });

          // Validate the result.
          expect(digest).to.exist;
          expect(digest).to.be.an.instanceOf(Uint8Array);
        });

        it('accepts an algorithm identifier as a string parameter', async () => {
          // Setup.
          const data = new Uint8Array([0, 1, 2, 3, 4]);

          // Test the method.
          const algorithm = 'SHA-256';
          const digest = await testHarness.agent.crypto.digest({ algorithm, data });

          // Validate the result.
          expect(digest).to.exist;
          expect(digest).to.be.an.instanceOf(Uint8Array);
        });

        it('supports SHA-256', async () => {
          // Setup.
          const data = Convert.string('abc').toUint8Array();
          const expectedOutput = Convert.hex('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad').toUint8Array();

          // Test the method.
          const digest = await testHarness.agent.crypto.digest({ algorithm: 'SHA-256', data });

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
            await testHarness.agent.crypto.digest({ algorithm });
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
        it('accepts a key identifier URI to encrypt the data', async () => {
          // Setup.
          const encryptionKeyUri = await testHarness.agent.crypto.generateKey({ algorithm: 'A128GCM' });
          const plaintext = new Uint8Array([1, 2, 3, 4]);
          const iv = cryptoUtils.randomBytes(12); // Initialization vector.
          const tagLength = 128; // Size in bits of the authentication tag.

          // Test the method.
          const ciphertext = await testHarness.agent.crypto.encrypt({
            keyUri : encryptionKeyUri,
            data   : plaintext,
            iv,
            tagLength
          });

          // Validate the results.
          expect(ciphertext).to.be.instanceOf(Uint8Array);
          expect(ciphertext.byteLength).to.equal(plaintext.byteLength + tagLength / 8);
        });

        it('accepts a private JWK to encrypt the data', async () => {
          // Setup.
          const privateKey: Jwk = {
            kty : 'oct',
            k   : 'n0Q35vyMl-2Dc87Nu6xx9Q',
            alg : 'A128GCM',
            kid : 'kpI8W6JS7O5ncakbn5dUOgP7uCuHGtZnkNOX2ZnRiss',
          };
          const plaintext = new Uint8Array([1, 2, 3, 4]);
          const iv = cryptoUtils.randomBytes(12); // Initialization vector.
          const tagLength = 128; // Size in bits of the authentication tag.

          // Test the method.
          const ciphertext = await testHarness.agent.crypto.encrypt({
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

      describe('exportKey()', () => {
        it('returns a private key given a Key Uri', async () => {
          const keyUri = await testHarness.agent.crypto.generateKey({ algorithm: 'Ed25519' });

          const privateKey = await testHarness.agent.crypto.exportKey({ keyUri });

          expect(privateKey).to.have.property('crv');
          expect(privateKey).to.have.property('kty');
          expect(privateKey).to.have.property('d');
          expect(privateKey).to.have.property('x');
        });

        it('throws an error if the Key Manager does not support exporting private keys', async () => {
          const keyManagerMock = {
            agent        : {} as Web5PlatformAgent,
            decrypt      : sinon.stub(),
            digest       : sinon.stub(),
            encrypt      : sinon.stub(),
            generateKey  : sinon.stub().resolves('urn:jwk:abcd1234'),
            getKeyUri    : sinon.stub(),
            getPublicKey : sinon.stub(),
            importKey    : sinon.stub(),
            sign         : sinon.stub(),
            verify       : sinon.stub(),

          } as AgentKeyManager;
          const cryptoApi = new AgentCryptoApi({ keyManager: keyManagerMock });

          const keyUri = await cryptoApi.generateKey({ algorithm: 'Ed25519' });

          try {
            await cryptoApi.exportKey({ keyUri });
            expect.fail('Expected an error to be thrown');
          } catch (error: any) {
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.include('does not support exporting private keys');
          }
        });
      });

      describe('generateKey()', () => {
        it('returns a Key URI', async () => {
          const keyUri = await testHarness.agent.crypto.generateKey({ algorithm: 'Ed25519' });

          expect(keyUri).to.be.a.string;
        });

        it('accepts an algorithm identifier as a string parameter', async () => {
          const algorithm = 'Ed25519';
          const keyUri = await testHarness.agent.crypto.generateKey({ algorithm });

          expect(keyUri).to.be.a.string;
        });
      });

      describe('getKeyUri()', () => {
        it('returns a string with the expected prefix', async () => {
          // Setup.
          const key: Jwk = {
            kty : 'EC',
            crv : 'secp256k1',
            x   : '1SRPl0oKoKPFJ5FLSWnvftE13QD9GtYKldOj7GNKe8o',
            y   : 'EuCLyOvrsp10-rdi1PEiKSCF9DJIN-2PzR7zP14AqIw'
          };

          // Test the method.
          const keyUri = await testHarness.agent.crypto.getKeyUri({ key });

          // Validate the result.
          expect(keyUri).to.exist;
          expect(keyUri).to.be.a.string;
          expect(keyUri.indexOf('urn:jwk:')).to.equal(0);
        });

        it('computes the key URI correctly for a valid JWK', async () => {
          // Setup.
          const key: Jwk = {
            kty : 'EC',
            crv : 'secp256k1',
            x   : '1SRPl0oKoKPFJ5FLSWnvftE13QD9GtYKldOj7GNKe8o',
            y   : 'EuCLyOvrsp10-rdi1PEiKSCF9DJIN-2PzR7zP14AqIw'
          };
          const expectedThumbprint = 'vO8jHDKD8dynDvVp8Ea2szjIRz2V-hCMhtmJYOxO4oY';
          const expectedKeyUri = 'urn:jwk:' + expectedThumbprint;

          // Test the method.
          const keyUri = await testHarness.agent.crypto.getKeyUri({ key });

          expect(keyUri).to.equal(expectedKeyUri);
        });
      });

      describe('importKey()', () => {
        it('throws an error if the Key Manager does not support importing private keys', async () => {
          const keyManagerMock = {
            agent        : {} as Web5PlatformAgent,
            decrypt      : sinon.stub(),
            digest       : sinon.stub(),
            encrypt      : sinon.stub(),
            generateKey  : sinon.stub().resolves('urn:jwk:abcd1234'),
            getKeyUri    : sinon.stub(),
            getPublicKey : sinon.stub(),
            sign         : sinon.stub(),
            verify       : sinon.stub(),

          } as AgentKeyManager;
          const cryptoApi = new AgentCryptoApi({ keyManager: keyManagerMock });

          const privateKey: Jwk = {
            crv : 'Ed25519',
            kty : 'OKP',
            d   : 'abc123',
            x   : 'def456',
          };

          try {
            await cryptoApi.importKey({ key: privateKey });
            expect.fail('Expected an error to be thrown');
          } catch (error: any) {
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.include('does not support importing private keys');
          }
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
          const privateKeyBytes = await testHarness.agent.crypto.privateKeyToBytes({ privateKey });

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

          const publicKeyBytes = await testHarness.agent.crypto.publicKeyToBytes({ publicKey });

          expect(publicKeyBytes).to.be.an.instanceOf(Uint8Array);
          const expectedOutput = Convert.hex('3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c').toUint8Array();
          expect(publicKeyBytes).to.deep.equal(expectedOutput);
        });
      });

      describe('unwrapKey()', () => {
        it('returns the expected key given a wrapped key and decryption key identifier', async () => {
          const wrappedKeyBytes = Convert.hex('8c55fb6fc4c7bb0b6b483df65ba52bee7ed6e0f861ac8097b2394f61067d1157901295aba72c514b').toUint8Array(); // raw format

          const decryptionKey: Jwk = {
            kty : 'oct',
            k   : '47Fn3ZXGbmntoAKErKN5-d7yuwMejCJtOqgAeq_Ojk0',
            alg : 'A256KW',
            kid : 'izA6N7g3xmPWStB6Qe6BbGgfrXvrptzuH2eJ1wmdrtk',
          };

          const decryptionKeyUri = await testHarness.agent.crypto.importKey({ key: decryptionKey });

          const unwrappedKey = await testHarness.agent.crypto.unwrapKey({ wrappedKeyBytes, wrappedKeyAlgorithm: 'A256GCM', decryptionKeyUri });

          const expectedPrivateKey: Jwk = {
            kty : 'oct',
            k   : 'hX-1yAAU6aZCwGqViYfAhIiaTyu1PURMswoI4IQmiY4',
            alg : 'A256GCM',
            kid : '-TssSnJNgh10-YTwuBtyZTnv0LY6sdT-TQl9WFTSetI',
          };

          expect(unwrappedKey).to.deep.equal(expectedPrivateKey);
        });

        it('returns the expected key given a wrapped key and decryption JWK', async () => {
          const wrappedKeyBytes = Convert.hex('8c55fb6fc4c7bb0b6b483df65ba52bee7ed6e0f861ac8097b2394f61067d1157901295aba72c514b').toUint8Array(); // raw format

          const decryptionKey: Jwk = {
            kty : 'oct',
            k   : '47Fn3ZXGbmntoAKErKN5-d7yuwMejCJtOqgAeq_Ojk0',
            alg : 'A256KW',
            kid : 'izA6N7g3xmPWStB6Qe6BbGgfrXvrptzuH2eJ1wmdrtk',
          };

          const unwrappedKey = await testHarness.agent.crypto.unwrapKey({ wrappedKeyBytes, wrappedKeyAlgorithm: 'A256GCM', decryptionKey });

          const expectedPrivateKey: Jwk = {
            kty : 'oct',
            k   : 'hX-1yAAU6aZCwGqViYfAhIiaTyu1PURMswoI4IQmiY4',
            alg : 'A256GCM',
            kid : '-TssSnJNgh10-YTwuBtyZTnv0LY6sdT-TQl9WFTSetI',
          };

          expect(unwrappedKey).to.deep.equal(expectedPrivateKey);
        });

        it('throws an error if the Key Manager does not support key wrapping', async () => {
          const keyManagerMock = {
            agent        : {} as Web5PlatformAgent,
            decrypt      : sinon.stub(),
            digest       : sinon.stub(),
            encrypt      : sinon.stub(),
            generateKey  : sinon.stub(),
            getKeyUri    : sinon.stub(),
            getPublicKey : sinon.stub(),
            sign         : sinon.stub(),
            verify       : sinon.stub(),

          } as AgentKeyManager;
          const cryptoApi = new AgentCryptoApi({ keyManager: keyManagerMock });

          try {
            await cryptoApi.unwrapKey({ decryptionKeyUri: 'urn:jwk:abcd1234', wrappedKeyBytes: new Uint8Array(0), wrappedKeyAlgorithm: 'A256GCM' });
            expect.fail('Expected an error to be thrown');
          } catch (error: any) {
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.include('does not support key wrapping');
          }
        });
      });

      describe('verify()', () => {
        it('returns true for a valid signature', async () => {
          // Setup.
          const privateKeyUri = await testHarness.agent.crypto.generateKey({ algorithm: 'secp256k1' });
          const publicKey = await testHarness.agent.crypto.getPublicKey({ keyUri: privateKeyUri });
          const data = new Uint8Array([0, 1, 2, 3, 4]);
          const signature = await testHarness.agent.crypto.sign({ keyUri: privateKeyUri, data });

          // Test the method.
          const isValid = await testHarness.agent.crypto.verify({ key: publicKey, signature, data });

          // Validate the result.
          expect(isValid).to.be.true;
        });

        it('returns false for an invalid signature', async () => {
          // Setup.
          const privateKeyUri = await testHarness.agent.crypto.generateKey({ algorithm: 'secp256k1' });
          const publicKey = await testHarness.agent.crypto.getPublicKey({ keyUri: privateKeyUri });
          const data = new Uint8Array([0, 1, 2, 3, 4]);
          const signature = new Uint8Array(64);

          // Test the method.
          const isValid = await testHarness.agent.crypto.verify({ key: publicKey, signature, data });

          // Validate the result.
          expect(isValid).to.be.false;
        });

        it('handles public keys missing alg property', async () => {
          // Setup.
          const privateKeyUri = await testHarness.agent.crypto.generateKey({ algorithm: 'secp256k1' });
          const publicKey = await testHarness.agent.crypto.getPublicKey({ keyUri: privateKeyUri });
          const data = new Uint8Array([0, 1, 2, 3, 4]);
          const signature = await testHarness.agent.crypto.sign({ keyUri: privateKeyUri, data });
          // Intentionally remove the alg property from the public key.
          delete publicKey.alg;

          // Test the method.
          const isValid = await testHarness.agent.crypto.verify({ key: publicKey, signature, data });

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
            await testHarness.agent.crypto.verify({ key, signature, data });
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
        it('returns a wrapped key as a byte array given an encryption key identifier', async () => {
          const unwrappedKey: Jwk = {
            kty : 'oct',
            k   : 'hX-1yAAU6aZCwGqViYfAhIiaTyu1PURMswoI4IQmiY4',
            alg : 'A256GCM',
            kid : '-TssSnJNgh10-YTwuBtyZTnv0LY6sdT-TQl9WFTSetI',
          };
          const encryptionKeyUri = await testHarness.agent.crypto.generateKey({ algorithm: 'A256KW' });

          const wrappedKeyBytes = await testHarness.agent.crypto.wrapKey({ unwrappedKey, encryptionKeyUri });

          expect(wrappedKeyBytes).to.be.an.instanceOf(Uint8Array);
          expect(wrappedKeyBytes.byteLength).to.equal(32 + 8); // 32 bytes for the wrapped private key, 8 bytes for the initialization vector
        });

        it('returns a wrapped key as a byte array given an encryption JWK', async () => {
          const unwrappedKey: Jwk = {
            kty : 'oct',
            k   : 'hX-1yAAU6aZCwGqViYfAhIiaTyu1PURMswoI4IQmiY4',
            alg : 'A256GCM',
            kid : '-TssSnJNgh10-YTwuBtyZTnv0LY6sdT-TQl9WFTSetI',
          };
          const encryptionKeyUri = await testHarness.agent.crypto.generateKey({ algorithm: 'A256KW' });
          const encryptionKey = await testHarness.agent.crypto.exportKey({ keyUri: encryptionKeyUri });

          const wrappedKeyBytes = await testHarness.agent.crypto.wrapKey({ unwrappedKey, encryptionKey });

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

          const encryptionKeyUri = await testHarness.agent.crypto.importKey({ key: encryptionKey });

          const wrappedKeyBytes = await testHarness.agent.crypto.wrapKey({ encryptionKeyUri, unwrappedKey });

          const expectedOutput = Convert.hex('8c55fb6fc4c7bb0b6b483df65ba52bee7ed6e0f861ac8097b2394f61067d1157901295aba72c514b').toUint8Array(); // raw format
          expect(wrappedKeyBytes).to.deep.equal(expectedOutput);
        });

        it('throws an error if the Key Manager does not support key wrapping', async () => {
          const keyManagerMock = {
            agent        : {} as Web5PlatformAgent,
            decrypt      : sinon.stub(),
            digest       : sinon.stub(),
            encrypt      : sinon.stub(),
            generateKey  : sinon.stub(),
            getKeyUri    : sinon.stub(),
            getPublicKey : sinon.stub(),
            sign         : sinon.stub(),
            verify       : sinon.stub(),

          } as AgentKeyManager;
          const cryptoApi = new AgentCryptoApi({ keyManager: keyManagerMock });

          try {
            await cryptoApi.wrapKey({ encryptionKeyUri: 'urn:jwk:abcd1234', unwrappedKey: {} as Jwk });
            expect.fail('Expected an error to be thrown');
          } catch (error: any) {
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.include('does not support key wrapping');
          }
        });
      });
    });
  });
});