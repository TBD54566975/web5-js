import type { Jwk } from '@web5/crypto';
import type { BearerDid } from '@web5/dids';

import sinon from 'sinon';
import { expect } from 'chai';
import { Convert } from '@web5/common';
import { utils as cryptoUtils } from '@web5/crypto';

import type { KeyManager } from '../src/types/key-manager.js';
import type { Web5PlatformAgent } from '../src/types/agent.js';

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
          } as KeyManager;

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
          } as KeyManager;

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

      describe('unwrapKey()', () => {
        it('returns the expected wrapped key for given input', async () => {
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
          } as KeyManager;

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
        it('returns a wrapped key as a byte array', async () => {
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
          } as KeyManager;

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