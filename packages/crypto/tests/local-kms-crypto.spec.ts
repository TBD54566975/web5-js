import sinon from 'sinon';
import { expect } from 'chai';
import { Convert, MemoryStore } from '@web5/common';

import type { Jwk } from '../src/jose/jwk.js';
import type { KeyIdentifier } from '../src/types/identifier.js';

import { EcdsaAlgorithm } from '../src/algorithms/ecdsa.js';
import { LocalKmsCrypto } from '../src/local-kms-crypto.js';

describe('LocalKmsCrypto', () => {
  let crypto: LocalKmsCrypto;

  beforeEach(() => {
    crypto = new LocalKmsCrypto();
  });

  describe('constructor', () => {
    it('initializes with default parameters', () => {
      const crypto = new LocalKmsCrypto();
      expect(crypto).to.exist;
      expect(crypto).to.be.an.instanceOf(LocalKmsCrypto);
    });

    it('initializes with a custom in-memory key store', () => {
      const keyStore = new MemoryStore<KeyIdentifier, Jwk>();
      const crypto = new LocalKmsCrypto({ keyStore });

      expect(crypto).to.exist;
      expect(crypto).to.be.an.instanceOf(LocalKmsCrypto);
    });
  });

  describe('digest()', () => {
    it('computes and returns a digest as a Uint8Array', async () => {
      // Setup.
      const data = new Uint8Array([0, 1, 2, 3, 4]);

      // Test the method.
      const digest = await crypto.digest({ algorithm: 'SHA-256', data });

      // Validate the result.
      expect(digest).to.exist;
      expect(digest).to.be.an.instanceOf(Uint8Array);
    });

    it('supports SHA-256', async () => {
      // Setup.
      const data = Convert.string('abc').toUint8Array();
      const expectedOutput = Convert.hex('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad').toUint8Array();

      // Test the method.
      const digest = await crypto.digest({ algorithm: 'SHA-256', data });

      // Validate the result.
      expect(digest).to.exist;
      expect(digest).to.be.an.instanceOf(Uint8Array);
      expect(digest).to.have.lengthOf(32);
      expect(digest).to.deep.equal(expectedOutput);
    });
  });

  describe('exportKey()', () => {
    it('exports a private key as a JWK', async () => {
      const keyUri = await crypto.generateKey({ algorithm: 'ES256K' });

      const jwk = await crypto.exportKey({ keyUri });

      expect(jwk).to.exist;
      expect(jwk).to.be.an('object');
      expect(jwk).to.have.property('kty');
      expect(jwk).to.have.property('d');
    });

    it('throws an error if the key does not exist', async () => {
      const keyUri = 'urn:jwk:does-not-exist';

      try {
        await crypto.exportKey({ keyUri });
        expect.fail('Expected an error to be thrown.');

      } catch (error: any) {
        expect(error).to.exist;
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.include('Key not found');
      }
    });
  });

  describe('generateKey()', () => {
    it('generates a key and returns a key URI', async () => {
      const keyUri = await crypto.generateKey({ algorithm: 'ES256K' });

      expect(keyUri).to.exist;
      expect(keyUri).to.be.a.string;
      expect(keyUri.indexOf('urn:jwk:')).to.equal(0);
    });

    it(`supports generating 'ES256K' keys`, async () => {
      const keyUri = await crypto.generateKey({ algorithm: 'ES256K' });

      expect(keyUri).to.exist;
      expect(keyUri).to.be.a.string;
      expect(keyUri.indexOf('urn:jwk:')).to.equal(0);
    });

    it(`supports generating 'Ed25519' keys`, async () => {
      const keyUri = await crypto.generateKey({ algorithm: 'Ed25519' });

      expect(keyUri).to.exist;
      expect(keyUri).to.be.a.string;
      expect(keyUri.indexOf('urn:jwk:')).to.equal(0);
    });

    it('throws an error if the algorithm is not supported', async () => {
      // Setup.
      const algorithm = 'unsupported-algorithm';

      // Test the method.
      try {
        // @ts-expect-error because an unsupported algorithm is being tested.
        await crypto.generateKey({ algorithm });
        expect.fail('Expected an error to be thrown.');

      } catch (error: any) {
        // Validate the result.
        expect(error).to.exist;
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.include(`Algorithm not supported: ${algorithm}`);
      }
    });

    it('throws an error if the generated key does not have a kid property', async () => {
      // Setup.
      const mockKeyGenerator = { generateKey: sinon.stub() };
      // @ts-expect-error because we're accessing a private property.
      crypto._algorithmInstances.set(EcdsaAlgorithm, mockKeyGenerator); // Replace the algorithm instance with the mock.

      // Test the method.
      try {
        await crypto.generateKey({ algorithm: 'ES256K' });
        expect.fail('Expected an error to be thrown.');

      } catch (error: any) {
        // Validate the result.
        expect(error).to.exist;
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.include('key is missing a required property');
      } finally {
        // Cleanup.
        sinon.restore();
      }
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
      const keyUri = await crypto.getKeyUri({ key });

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
      const keyUri = await crypto.getKeyUri({ key });

      expect(keyUri).to.equal(expectedKeyUri);
    });
  });

  describe('getPublicKey()', () => {
    it('computes the public key and returns a JWK', async () => {
      const keyUri = await crypto.generateKey({ algorithm: 'ES256K' });

      const publicKey = await crypto.getPublicKey({ keyUri });

      expect(publicKey).to.exist;
      expect(publicKey).to.be.an('object');
      expect(publicKey).to.have.property('kty');
    });

    it('supports ECDSA using secp256k1 curve and SHA-256', async () => {
      const keyUri = await crypto.generateKey({ algorithm: 'ES256K' });

      const publicKey = await crypto.getPublicKey({ keyUri });

      expect(publicKey).to.exist;
      expect(publicKey).to.be.an('object');
      expect(publicKey).to.have.property('kty', 'EC');
      expect(publicKey).to.have.property('alg', 'ES256K');
      expect(publicKey).to.have.property('crv', 'secp256k1');
      expect(publicKey).to.have.property('x');
      expect(publicKey).to.have.property('y');
      expect(publicKey).to.not.have.property('d');
    });

    it('supports EdDSA using Ed25519 curve', async () => {
      // Setup.
      const keyUri = await crypto.generateKey({ algorithm: 'Ed25519' });

      // Test the method.
      const publicKey = await crypto.getPublicKey({ keyUri });

      expect(publicKey).to.exist;
      expect(publicKey).to.be.an('object');
      expect(publicKey).to.have.property('kty', 'OKP');
      expect(publicKey).to.have.property('alg', 'EdDSA');
      expect(publicKey).to.have.property('crv', 'Ed25519');
      expect(publicKey).to.have.property('x');
      expect(publicKey).to.not.have.property('y');
      expect(publicKey).to.not.have.property('d');
    });
  });

  describe('importKey()', () => {
    it('imports a private key and return a key URI', async () => {
      // Setup.
      const memoryStore = new MemoryStore<KeyIdentifier, Jwk>();
      const crypto = new LocalKmsCrypto({ keyStore: memoryStore });
      const privateKey: Jwk = {
        kty : 'EC',
        crv : 'secp256k1',
        kid : 'vO8jHDKD8dynDvVp8Ea2szjIRz2V-hCMhtmJYOxO4oY',
        x   : '1SRPl0oKoKPFJ5FLSWnvftE13QD9GtYKldOj7GNKe8o',
        y   : 'EuCLyOvrsp10-rdi1PEiKSCF9DJIN-2PzR7zP14AqIw',
        d   : 'v5YrWhgfoSpXvE7Oqz9WfLavsFzvMuHBPL2kDLRuWoI'
      };
      const expectedThumbprint = 'vO8jHDKD8dynDvVp8Ea2szjIRz2V-hCMhtmJYOxO4oY';
      const expectedKeyUri = 'urn:jwk:' + expectedThumbprint;

      // Test the method.
      const keyUri = await crypto.importKey({ key: privateKey });

      // Validate the result.
      expect(keyUri).to.equal(expectedKeyUri);
      const storedKey = await memoryStore.get(keyUri);
      expect(storedKey).to.deep.equal(privateKey);
    });

    it('does not modify the kid property, if provided', async () => {
      // Setup.
      const memoryStore = new MemoryStore<KeyIdentifier, Jwk>();
      const crypto = new LocalKmsCrypto({ keyStore: memoryStore });
      const privateKey: Jwk = {
        kty : 'EC',
        crv : 'secp256k1',
        kid : 'custom-kid',
        x   : '1SRPl0oKoKPFJ5FLSWnvftE13QD9GtYKldOj7GNKe8o',
        y   : 'EuCLyOvrsp10-rdi1PEiKSCF9DJIN-2PzR7zP14AqIw',
        d   : 'v5YrWhgfoSpXvE7Oqz9WfLavsFzvMuHBPL2kDLRuWoI'
      };

      // Test the method.
      const keyUri = await crypto.importKey({ key: privateKey });

      // Validate the result.
      const storedKey = await memoryStore.get(keyUri);
      expect(storedKey).to.have.property('kid', 'custom-kid');
    });

    it('adds the kid property, if missing', async () => {
      // Setup.
      const memoryStore = new MemoryStore<KeyIdentifier, Jwk>();
      const crypto = new LocalKmsCrypto({ keyStore: memoryStore });
      const privateKey: Jwk = {
        kty : 'EC',
        crv : 'secp256k1',
        x   : '1SRPl0oKoKPFJ5FLSWnvftE13QD9GtYKldOj7GNKe8o',
        y   : 'EuCLyOvrsp10-rdi1PEiKSCF9DJIN-2PzR7zP14AqIw',
        d   : 'v5YrWhgfoSpXvE7Oqz9WfLavsFzvMuHBPL2kDLRuWoI'
      };

      // Test the method.
      const keyUri = await crypto.importKey({ key: privateKey });

      // Validate the result.
      const storedKey = await memoryStore.get(keyUri);
      expect(storedKey).to.have.property('kid');
    });

    it('does not mutate the provided key', async () => {
      // Setup.
      const privateKey: Jwk = {
        kty : 'EC',
        crv : 'secp256k1',
        x   : '1SRPl0oKoKPFJ5FLSWnvftE13QD9GtYKldOj7GNKe8o',
        y   : 'EuCLyOvrsp10-rdi1PEiKSCF9DJIN-2PzR7zP14AqIw',
        d   : 'v5YrWhgfoSpXvE7Oqz9WfLavsFzvMuHBPL2kDLRuWoI'
      };
      const privateKeyCopy = structuredClone(privateKey);

      // Test the method.
      await crypto.importKey({ key: privateKey });

      // Validate the result.
      expect(privateKey).to.deep.equal(privateKeyCopy);
    });

    it('throws an error if the key is invalid', async () => {
      // Setup.
      // @ts-expect-error because an invalid JWK is being used to trigger the error.
      const invalidJwk: Jwk = {};

      // Test the method.
      try {
        await crypto.importKey({ key: invalidJwk });
        expect.fail('Should have thrown an error');

      } catch (error: any) {
        // Validate the result.
        expect(error.message).to.include('Invalid key provided');
      }
    });

    it('throws an error if a public key is provided', async () => {
      // Setup.
      const publicKey: Jwk = {
        kty : 'EC',
        crv : 'secp256k1',
        x   : '1SRPl0oKoKPFJ5FLSWnvftE13QD9GtYKldOj7GNKe8o',
        y   : 'EuCLyOvrsp10-rdi1PEiKSCF9DJIN-2PzR7zP14AqIw'
      };

      // Test the method.
      try {
        await crypto.importKey({ key: publicKey });
        expect.fail('Should have thrown an error');

      } catch (error: any) {
        // Validate the result.
        expect(error.message).to.include('Invalid key provided');
      }
    });
  });

  describe('sign()', () => {
    it('generates signatures as Uint8Array', async () => {
      // Setup.
      const privateKeyUri = await crypto.generateKey({ algorithm: 'ES256K' });
      const data = new Uint8Array([0, 1, 2, 3, 4]);

      // Test the method.
      const signature = await crypto.sign({ keyUri: privateKeyUri, data });

      // Validate the result.
      expect(signature).to.be.a('Uint8Array');
    });
  });

  describe('verify()', () => {
    it('returns true for a valid signature', async () => {
      // Setup.
      const privateKeyUri = await crypto.generateKey({ algorithm: 'ES256K' });
      const publicKey = await crypto.getPublicKey({ keyUri: privateKeyUri });
      const data = new Uint8Array([0, 1, 2, 3, 4]);
      const signature = await crypto.sign({ keyUri: privateKeyUri, data });

      // Test the method.
      const isValid = await crypto.verify({ key: publicKey, signature, data });

      // Validate the result.
      expect(isValid).to.be.true;
    });

    it('returns false for an invalid signature', async () => {
      // Setup.
      const privateKeyUri = await crypto.generateKey({ algorithm: 'ES256K' });
      const publicKey = await crypto.getPublicKey({ keyUri: privateKeyUri });
      const data = new Uint8Array([0, 1, 2, 3, 4]);
      const signature = new Uint8Array(64);

      // Test the method.
      const isValid = await crypto.verify({ key: publicKey, signature, data });

      // Validate the result.
      expect(isValid).to.be.false;
    });


    it('throws an error when public key algorithm and curve are unsupported', async () => {
      // Setup.
      // @ts-expect-error because an unsupported algorithm and currve is being tested.
      const key: Jwk = { kty: 'EC', alg: 'unsupported-algorithm', crv: 'unsupported-curve', x: 'x', y: 'y' };
      const signature = new Uint8Array(64);
      const data = new Uint8Array(0);

      // Test the method.
      try {
        await crypto.verify({ key, signature, data });
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