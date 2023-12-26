import { expect } from 'chai';
import { Convert } from '@web5/common';

import { LocalKmsCrypto } from '../../src/kms-local/api.js';

describe('LocalKmsCrypto', () => {
  let crypto: LocalKmsCrypto;

  beforeEach(() => {
    crypto = new LocalKmsCrypto();
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

  describe('generateKey', () => {
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
});