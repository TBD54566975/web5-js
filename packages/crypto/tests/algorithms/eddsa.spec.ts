import { expect } from 'chai';

import type { Jwk } from '../../src/jose/jwk.js';

import { EdDsaAlgorithm } from '../../src/algorithms/eddsa.js';

describe('EdDsaAlgorithm', () => {
  let eddsa: EdDsaAlgorithm;
  let privateKey: Jwk;
  let publicKey: Jwk;

  before(() => {
    eddsa = new EdDsaAlgorithm();
  });

  beforeEach(async () => {
    privateKey = await eddsa.generateKey({ algorithm: 'Ed25519' });
    publicKey = await eddsa.getPublicKey({ key: privateKey });
  });

  describe('computePublicKey()', () => {
    it('returns a public key in JWK format', async () => {
      // Test the method.
      const publicKey = await eddsa.computePublicKey({ key: privateKey });

      // Validate the result.
      expect(publicKey).to.have.property('kid');
      expect(publicKey).to.have.property('kty');
      expect(publicKey).to.have.property('x');
      expect(publicKey).to.not.have.property('d');
      expect(publicKey).to.not.have.property('y');
    });

    it('computes and adds a kid property, if missing', async () => {
      // Setup.
      const { kid, ...privateKeyWithoutKid } = privateKey;

      // Test the method.
      const publicKey = await eddsa.computePublicKey({ key: privateKeyWithoutKid });

      // Validate the result.
      expect(publicKey).to.have.property('kid', kid);
    });

    it('supports EdDSA using Ed25519 curve', async () => {
      // Setup.
      const privateKey = await eddsa.generateKey({ algorithm: 'Ed25519' });

      // Test the method.
      const publicKey = await eddsa.computePublicKey({ key: privateKey });

      // Validate the result.
      expect(publicKey).to.have.property('kty', 'OKP');
      expect(publicKey).to.have.property('alg', 'EdDSA');
      expect(publicKey).to.have.property('crv', 'Ed25519');
    });

    it('throws an error if the key provided is not an OKP private key', async () => {
      // Setup.
      const privateKey: Jwk = {
        crv : 'secp256k1',
        d   : 'd',
        kty : 'EC',
        x   : 'x',
        y   : 'y'
      };

      // Test the method.
      try {
        await eddsa.computePublicKey({ key: privateKey });
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
        kty : 'OKP',
        x   : 'x'
      };

      // Test the method.
      try {
        await eddsa.computePublicKey({ key: privateKey });
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
      const privateKey = await eddsa.generateKey({ algorithm: 'Ed25519' });

      // Validate the result.
      expect(privateKey).to.have.property('kty', 'OKP');
      expect(privateKey).to.have.property('kid');
    });

    it('supports EdDSA using Ed25519 curve', async () => {
      // Test the method.
      const privateKey = await eddsa.generateKey({ algorithm: 'Ed25519' });

      expect(privateKey).to.have.property('alg', 'EdDSA');
      expect(privateKey).to.have.property('crv', 'Ed25519');
    });
  });

  describe('getPublicKey()', () => {
    it('returns a public key in JWK format', async () => {
      // Test the method.
      const publicKey = await eddsa.getPublicKey({ key: privateKey });

      // Validate the result.
      expect(publicKey).to.not.have.property('d');
      expect(publicKey).to.have.property('kid');
      expect(publicKey).to.have.property('kty');
      expect(publicKey).to.have.property('x');
    });

    it('computes and adds a kid property, if missing', async () => {
      // Setup.
      const { kid, ...privateKeyWithoutKid } = privateKey;

      // Test the method.
      const publicKey = await eddsa.getPublicKey({ key: privateKeyWithoutKid });

      // Validate the result.
      expect(publicKey).to.have.property('kid', kid);
    });

    it('supports EdDSA using Ed25519 curve', async () => {
      // Setup.
      const privateKey = await eddsa.generateKey({ algorithm: 'Ed25519' });

      // Test the method.
      const publicKey = await eddsa.getPublicKey({ key: privateKey });

      // Validate the result.
      expect(publicKey).to.have.property('kty', 'OKP');
      expect(publicKey).to.have.property('alg', 'EdDSA');
      expect(publicKey).to.have.property('crv', 'Ed25519');
    });

    it('throws an error if the key provided is not an OKP private key', async () => {
      // Setup.
      const privateKey: Jwk = {
        crv : 'secp256k1',
        d   : 'd',
        kty : 'EC',
        x   : 'x',
        y   : 'y'
      };

      // Test the method.
      try {
        await eddsa.getPublicKey({ key: privateKey });
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
        kty : 'OKP',
        x   : 'x'
      };

      // Test the method.
      try {
        await eddsa.getPublicKey({ key: privateKey });
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
      const signature = await eddsa.sign({ key: privateKey, data });

      // Validate the result.
      expect(signature).to.exist;
      expect(signature).to.be.a('Uint8Array');
    });

    it('generates signatures in compact R+S format', async () => {
      // Test the method.
      const signature = await eddsa.sign({ key: privateKey, data });

      // Validate the result.
      expect(signature).to.have.length(64);
    });

    it('throws an error if the key provided is not an OKP private key', async () => {
      // Setup.
      const privateKey: Jwk = {
        crv : 'secp256k1',
        d   : 'd',
        kty : 'EC',
        x   : 'x',
        y   : 'y'
      };

      // Test the method.
      try {
        await eddsa.sign({ key: privateKey, data });
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
        kty : 'OKP',
        x   : 'x'
      };

      // Test the method.
      try {
      // Test the method.
        await eddsa.sign({ key: privateKey, data });
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
      signature = await eddsa.sign({ key: privateKey, data });
    });

    it(`returns a boolean verification result`, async () => {
      const isValid = await eddsa.verify({
        key: publicKey,
        signature,
        data
      });

      expect(isValid).to.be.a('boolean');
    });

    it('returns true for a valid signature', async () => {
      // Test the method.
      const isValid = await eddsa.verify({ key: publicKey, signature, data });

      // Validate the result.
      expect(isValid).to.be.true;
    });

    it('returns false for an invalid signature', async () => {
      // Setup.
      const signature = new Uint8Array(64);

      // Test the method.
      const isValid = await eddsa.verify({ key: publicKey, signature, data });

      // Validate the result.
      expect(isValid).to.be.false;
    });

    it('throws an error if the key provided is not an OKP public key', async () => {
      // Setup.
      const publicKey: Jwk = {
        crv : 'secp256k1',
        kty : 'EC',
        x   : 'x',
        y   : 'y'
      };

      // Test the method.
      try {
        await eddsa.verify({ key: publicKey, signature, data });
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
        kty : 'OKP',
        x   : 'x'
      };

      // Test the method.
      try {
      // Test the method.
        await eddsa.verify({ key: publicKey, signature, data });
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