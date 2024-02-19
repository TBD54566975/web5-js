import type { Jwk } from '@web5/crypto';

import sinon from 'sinon';
import { expect } from 'chai';
import { Convert } from '@web5/common';

import type { KeyManager } from '../src/types/key-manager.js';
import type { Web5PlatformAgent } from '../src/types/agent.js';

import { TestAgent } from './utils/test-agent.js';
import { AgentCryptoApi } from '../src/crypto-api.js';
import { ManagedAgentTestHarness } from '../src/test-harness.js';

describe('AgentCryptoApi', () => {
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
            digest       : sinon.stub(),
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

      describe('importKey()', () => {
        it('throws an error if the Key Manager does not support importing private keys', async () => {
          const keyManagerMock = {
            agent        : {} as Web5PlatformAgent,
            digest       : sinon.stub(),
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
            expect(error.message).to.include('Unable to determine algorithm based on provided input');
          }
        });
      });
    });
  });
});