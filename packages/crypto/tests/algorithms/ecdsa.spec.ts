import { expect } from 'chai';

import type { Jwk } from '../../src/jose/jwk.js';

import { EcdsaAlgorithm } from '../../src/algorithms/ecdsa.js';

describe('EcdsaAlgorithm', () => {
  let ecdsa: EcdsaAlgorithm;
  let privateKey: Jwk;
  let publicKey: Jwk;

  before(() => {
    ecdsa = new EcdsaAlgorithm();
  });

  beforeEach(async () => {
    privateKey = await ecdsa.generateKey({ algorithm: 'ES256K' });
    publicKey = await ecdsa.getPublicKey({ key: privateKey });
  });

  describe('computePublicKey()', () => {
    it('returns a public key in JWK format', async () => {
      // Test the method.
      const publicKey = await ecdsa.computePublicKey({ key: privateKey });

      // Validate the result.
      expect(publicKey).to.not.have.property('d');
      expect(publicKey).to.have.property('kid');
      expect(publicKey).to.have.property('kty');
      expect(publicKey).to.have.property('x');
      expect(publicKey).to.have.property('y');
    });

    it('computes and adds a kid property, if missing', async () => {
      // Setup.
      const { kid, ...privateKeyWithoutKid } = privateKey;

      // Test the method.
      const publicKey = await ecdsa.computePublicKey({ key: privateKeyWithoutKid });

      // Validate the result.
      expect(publicKey).to.have.property('kid', kid);
    });

    it('supports ECDSA using secp256k1 curve and SHA-256', async () => {
      // Setup.
      const privateKey = await ecdsa.generateKey({ algorithm: 'ES256K' });

      // Test the method.
      const publicKey = await ecdsa.computePublicKey({ key: privateKey });

      // Validate the result.
      expect(publicKey).to.have.property('kty', 'EC');
      expect(publicKey).to.have.property('alg', 'ES256K');
      expect(publicKey).to.have.property('crv', 'secp256k1');
    });

    it('accepts secp256k1 as an alias for the ES256K algorithm identifier', async () => {
      // Setup.
      const privateKey = await ecdsa.generateKey({ algorithm: 'secp256k1' });

      // Test the method.
      const publicKey = await ecdsa.computePublicKey({ key: privateKey });

      // Validate the result.
      expect(publicKey).to.have.property('kty', 'EC');
      expect(publicKey).to.have.property('alg', 'ES256K');
      expect(publicKey).to.have.property('crv', 'secp256k1');
    });

    it('supports ECDSA using secp256r1 curve and SHA-256', async () => {
      // Setup.
      const privateKey = await ecdsa.generateKey({ algorithm: 'ES256' });

      // Test the method.
      const publicKey = await ecdsa.computePublicKey({ key: privateKey });

      // Validate the result.
      expect(publicKey).to.have.property('kty', 'EC');
      expect(publicKey).to.have.property('alg', 'ES256');
      expect(publicKey).to.have.property('crv', 'P-256');
    });

    it('accepts secp256r1 as an alias for the ES256 algorithm identifier', async () => {
      // Setup.
      const privateKey = await ecdsa.generateKey({ algorithm: 'secp256r1' });

      // Test the method.
      const publicKey = await ecdsa.computePublicKey({ key: privateKey });

      // Validate the result.
      expect(publicKey).to.have.property('kty', 'EC');
      expect(publicKey).to.have.property('alg', 'ES256');
      expect(publicKey).to.have.property('crv', 'P-256');
    });

    it('throws an error if the key provided is not an EC private key', async () => {
      // Setup.
      const privateKey: Jwk = {
        crv : 'Ed25519',
        d   : 'd',
        kty : 'OKP',
        x   : 'x',
      };

      // Test the method.
      try {
        await ecdsa.computePublicKey({ key: privateKey });
        expect.fail('Expected an error to be thrown.');

      } catch (error: any) {
        // Validate the result.
        expect(error).to.exist;
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.include('Invalid key provided');
      }
    });

    it('throws an error for an unsupported curve', async () => {
      // Setup.
      const privateKey: Jwk = {
        crv : 'unsupported-curve',
        d   : 'd',
        kty : 'EC',
        x   : 'x',
        y   : 'y',
      };

      // Test the method.
      try {
        await ecdsa.computePublicKey({ key: privateKey });
        expect.fail('Expected an error to be thrown.');

      } catch (error: any) {
        // Validate the result.
        expect(error).to.exist;
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.include('Unsupported curve');
      }
    });
  });

  describe('generateKey()', () => {
    it('returns a private key in JWK format', async () => {
      // Test the method.
      const privateKey = await ecdsa.generateKey({ algorithm: 'ES256K' });

      // Validate the result.
      expect(privateKey).to.have.property('kty', 'EC');
      expect(privateKey).to.have.property('kid');
    });

    it('supports ECDSA using secp256k1 curve and SHA-256', async () => {
      // Test the method.
      const privateKey = await ecdsa.generateKey({ algorithm: 'ES256K' });

      expect(privateKey).to.have.property('alg', 'ES256K');
      expect(privateKey).to.have.property('crv', 'secp256k1');
    });

    it('accepts secp256k1 as an alias for the ES256K algorithm identifier', async () => {
      // Test the method.
      const privateKey = await ecdsa.generateKey({ algorithm: 'secp256k1' });

      expect(privateKey).to.have.property('alg', 'ES256K');
      expect(privateKey).to.have.property('crv', 'secp256k1');
    });

    it('supports ECDSA using secp256r1 curve and SHA-256', async () => {
      // Test the method.
      const privateKey = await ecdsa.generateKey({ algorithm: 'ES256' });

      expect(privateKey).to.have.property('alg', 'ES256');
      expect(privateKey).to.have.property('crv', 'P-256');
    });

    it('accepts secp256r1 as an alias for the ES256 algorithm identifier', async () => {
      // Test the method.
      const privateKey = await ecdsa.generateKey({ algorithm: 'secp256r1' });

      expect(privateKey).to.have.property('alg', 'ES256');
      expect(privateKey).to.have.property('crv', 'P-256');
    });
  });

  describe('getPublicKey()', () => {
    it('returns a public key in JWK format', async () => {
      // Test the method.
      const publicKey = await ecdsa.getPublicKey({ key: privateKey });

      // Validate the result.
      expect(publicKey).to.not.have.property('d');
      expect(publicKey).to.have.property('kid');
      expect(publicKey).to.have.property('kty');
      expect(publicKey).to.have.property('x');
      expect(publicKey).to.have.property('y');
    });

    it('computes and adds a kid property, if missing', async () => {
      // Setup.
      const { kid, ...privateKeyWithoutKid } = privateKey;

      // Test the method.
      const publicKey = await ecdsa.getPublicKey({ key: privateKeyWithoutKid });

      // Validate the result.
      expect(publicKey).to.have.property('kid', kid);
    });

    it('supports ECDSA using secp256k1 curve and SHA-256', async () => {
      // Setup.
      const privateKey = await ecdsa.generateKey({ algorithm: 'ES256K' });

      // Test the method.
      const publicKey = await ecdsa.getPublicKey({ key: privateKey });

      // Validate the result.
      expect(publicKey).to.have.property('kty', 'EC');
      expect(publicKey).to.have.property('alg', 'ES256K');
      expect(publicKey).to.have.property('crv', 'secp256k1');
    });

    it('supports ECDSA using secp256r1 curve and SHA-256', async () => {
      // Setup.
      const privateKey = await ecdsa.generateKey({ algorithm: 'ES256' });

      // Test the method.
      const publicKey = await ecdsa.getPublicKey({ key: privateKey });

      // Validate the result.
      expect(publicKey).to.have.property('kty', 'EC');
      expect(publicKey).to.have.property('alg', 'ES256');
      expect(publicKey).to.have.property('crv', 'P-256');
    });

    it('throws an error if the key provided is not an EC private key', async () => {
      // Setup.
      const privateKey: Jwk = {
        crv : 'Ed25519',
        d   : 'd',
        kty : 'OKP',
        x   : 'x',
      };

      // Test the method.
      try {
        await ecdsa.getPublicKey({ key: privateKey });
        expect.fail('Expected an error to be thrown.');

      } catch (error: any) {
        // Validate the result.
        expect(error).to.exist;
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.include('Invalid key provided');
      }
    });

    it('throws an error for an unsupported curve', async () => {
      // Setup.
      const privateKey: Jwk = {
        crv : 'unsupported-curve',
        d   : 'd',
        kty : 'EC',
        x   : 'x',
        y   : 'y',
      };

      // Test the method.
      try {
        await ecdsa.getPublicKey({ key: privateKey });
        expect.fail('Expected an error to be thrown.');

      } catch (error: any) {
        // Validate the result.
        expect(error).to.exist;
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.include('Unsupported curve');
      }
    });
  });

  describe('sign()', () => {
    let data = new Uint8Array([0, 1, 2, 3, 4]);

    it('generates signatures as Uint8Array', async () => {
      // Test the method.
      const signature = await ecdsa.sign({ key: privateKey, data });

      // Validate the result.
      expect(signature).to.exist;
      expect(signature).to.be.a('Uint8Array');
    });

    it('generates signatures in compact R+S format', async () => {
      // Test the method.
      const signature = await ecdsa.sign({ key: privateKey, data });

      // Validate the result.
      expect(signature).to.have.length(64);
    });

    it('supports ECDSA using secp256k1 curve and SHA-256', async () => {
      // Setup.
      const privateKey = await ecdsa.generateKey({ algorithm: 'ES256K'});

      // Test the method.
      const signature = await ecdsa.sign({ key: privateKey, data });

      // Validate the result.
      expect(signature).to.have.length(64);
    });

    it('supports ECDSA using secp256r1 curve and SHA-256', async () => {
      // Setup.
      const privateKey = await ecdsa.generateKey({ algorithm: 'ES256'});

      // Test the method.
      const signature = await ecdsa.sign({ key: privateKey, data });

      // Validate the result.
      expect(signature).to.have.length(64);
    });

    it('throws an error if the key provided is not an EC private key', async () => {
      // Setup.
      const privateKey: Jwk = {
        crv : 'Ed25519',
        d   : 'd',
        kty : 'OKP',
        x   : 'x',
      };

      // Test the method.
      try {
        await ecdsa.sign({ key: privateKey, data });
        expect.fail('Expected an error to be thrown.');

      } catch (error: any) {
        // Validate the result.
        expect(error).to.exist;
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.include('Invalid key provided');
      }
    });

    it('throws an error for an unsupported curve', async () => {
      // Setup.
      const privateKey: Jwk = {
        crv : 'unsupported-curve',
        d   : 'd',
        kty : 'EC',
        x   : 'x',
        y   : 'y',
      };

      // Test the method.
      try {
      // Test the method.
        await ecdsa.sign({ key: privateKey, data });
        expect.fail('Expected an error to be thrown.');

      } catch (error: any) {
        // Validate the result.
        expect(error).to.exist;
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.include('Unsupported curve');
      }
    });
  });

  describe('verify()', () => {
    let data = new Uint8Array([0, 1, 2, 3, 4]);
    let signature: Uint8Array;

    beforeEach(async () => {
      signature = await ecdsa.sign({ key: privateKey, data });
    });

    it(`returns a boolean verification result`, async () => {
      const isValid = await ecdsa.verify({
        key: publicKey,
        signature,
        data
      });

      expect(isValid).to.be.a('boolean');
    });

    it('returns true for a valid signature', async () => {
      // Test the method.
      const isValid = await ecdsa.verify({ key: publicKey, signature, data });

      // Validate the result.
      expect(isValid).to.be.true;
    });

    it('returns false for an invalid signature', async () => {
      // Setup.
      const signature = new Uint8Array(64);

      // Test the method.
      const isValid = await ecdsa.verify({ key: publicKey, signature, data });

      // Validate the result.
      expect(isValid).to.be.false;
    });

    it('supports ECDSA using secp256k1 curve and SHA-256', async () => {
      // Setup.
      privateKey = await ecdsa.generateKey({ algorithm: 'ES256K' });
      publicKey = await ecdsa.getPublicKey({ key: privateKey });
      signature = await ecdsa.sign({ key: privateKey, data });

      // Test the method.
      const isValid = await ecdsa.verify({ key: publicKey, signature, data });

      // Validate the result.
      expect(isValid).to.be.true;
    });

    it('supports ECDSA using secp256r1 curve and SHA-256', async () => {
      // Setup.
      privateKey = await ecdsa.generateKey({ algorithm: 'ES256' });
      publicKey = await ecdsa.getPublicKey({ key: privateKey });
      signature = await ecdsa.sign({ key: privateKey, data });

      // Test the method.
      const isValid = await ecdsa.verify({ key: publicKey, signature, data });

      // Validate the result.
      expect(isValid).to.be.true;
    });

    it('throws an error if the key provided is not an EC public key', async () => {
      // Setup.
      const publicKey: Jwk = {
        crv : 'Ed25519',
        kty : 'OKP',
        x   : 'x',
      };

      // Test the method.
      try {
        await ecdsa.verify({ key: publicKey, signature, data });
        expect.fail('Expected an error to be thrown.');

      } catch (error: any) {
        // Validate the result.
        expect(error).to.exist;
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.include('Invalid key provided');
      }
    });

    it('throws an error for an unsupported curve', async () => {
      // Setup.
      const publicKey: Jwk = {
        crv : 'unsupported-curve',
        kty : 'EC',
        x   : 'x',
        y   : 'y',
      };

      // Test the method.
      try {
      // Test the method.
        await ecdsa.verify({ key: publicKey, signature, data });
        expect.fail('Expected an error to be thrown.');

      } catch (error: any) {
        // Validate the result.
        expect(error).to.exist;
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.include('Unsupported curve');
      }
    });
  });
});