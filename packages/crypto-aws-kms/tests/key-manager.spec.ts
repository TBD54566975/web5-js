import type { Jwk } from '@web5/crypto';

import sinon from 'sinon';
import { expect } from 'chai';
import { Convert } from '@web5/common';
import { CreateAliasCommand, CreateKeyCommand, DescribeKeyCommand, GetPublicKeyCommand, KMSClient, SignCommand } from '@aws-sdk/client-kms';

import type { AwsKeyManagerGenerateKeyParams } from '../src/key-manager.js';

import { AwsKeyManager } from '../src/key-manager.js';
import { mockEcdsaSecp256k1 } from './fixtures/mock-ecdsa-secp256k1.js';

describe('AWS KMS Crypto API', () => {
  let keyManager: AwsKeyManager;
  let kmsClientStub: sinon.SinonStubbedInstance<KMSClient>;

  beforeEach(() => {
    kmsClientStub = sinon.createStubInstance(KMSClient);
    keyManager = new AwsKeyManager({ kmsClient: kmsClientStub as unknown as KMSClient });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('constructor', () => {
    it('instantiates a KMSClient if one is not given', () => {
      // Execute the test.
      const keyManager = new AwsKeyManager();

      // Validate the result.
      expect(keyManager).to.exist;
      expect(keyManager).to.be.an.instanceOf(AwsKeyManager);
    });

    it('accepts the KMSClient that is given', () => {
      // Setup.
      const kmsClient = new KMSClient({});

      // Execute the test.
      const keyManager = new AwsKeyManager({ kmsClient });

      // Validate the result.
      expect(keyManager).to.exist;
      expect(keyManager).to.be.an.instanceOf(AwsKeyManager);
    });
  });

  describe('digest()', () => {
    it('computes and returns a digest as a Uint8Array', async () => {
      const data = new Uint8Array([0, 1, 2, 3, 4]);

      const digest = await keyManager.digest({ algorithm: 'SHA-256', data });

      expect(digest).to.exist;
      expect(digest).to.be.an.instanceOf(Uint8Array);
    });

    it('supports SHA-256', async () => {
      // Setup.
      const data = Convert.string('abc').toUint8Array();
      const expectedOutput = Convert.hex('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad').toUint8Array();

      // Test the method.
      const digest = await keyManager.digest({ algorithm: 'SHA-256', data });

      // Validate the result.
      expect(digest).to.exist;
      expect(digest).to.be.an.instanceOf(Uint8Array);
      expect(digest).to.have.lengthOf(32);
      expect(digest).to.deep.equal(expectedOutput);
    });
  });

  describe('generateKey()', () => {
    it('generates a key and returns a key URI', async () => {
      // Setup.
      kmsClientStub.send.withArgs(sinon.match.instanceOf(CreateKeyCommand)).resolves(mockEcdsaSecp256k1.generateKey.output);
      kmsClientStub.send.withArgs(sinon.match.instanceOf(GetPublicKeyCommand)).resolves(mockEcdsaSecp256k1.getPublicKey.output);
      kmsClientStub.send.withArgs(sinon.match.instanceOf(CreateAliasCommand)).resolves(mockEcdsaSecp256k1.createKeyAlias.output);

      // Test the method.
      const keyUri = await keyManager.generateKey(mockEcdsaSecp256k1.generateKey.input as AwsKeyManagerGenerateKeyParams);

      // Validate the result.
      expect(keyUri).to.exist;
      expect(keyUri).to.be.a.string;
      expect(keyUri.indexOf('urn:jwk:')).to.equal(0);
      expect(kmsClientStub.send.callCount).to.equal(3);
    });

    it('supports ECDSA using secp256k1 curve and SHA-256', async () => {
      // Setup.
      kmsClientStub.send.withArgs(sinon.match.instanceOf(CreateKeyCommand)).resolves(mockEcdsaSecp256k1.generateKey.output);
      kmsClientStub.send.withArgs(sinon.match.instanceOf(GetPublicKeyCommand)).resolves(mockEcdsaSecp256k1.getPublicKey.output);
      kmsClientStub.send.withArgs(sinon.match.instanceOf(CreateAliasCommand)).resolves(mockEcdsaSecp256k1.createKeyAlias.output);

      // Test the method.
      const keyUri = await keyManager.generateKey({ algorithm: 'ES256K' });

      // Validate the result.
      expect(keyUri).to.exist;
      expect(kmsClientStub.send.callCount).to.equal(3);
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
        expect(error.message).to.include(`Algorithm not supported: ${algorithm}`);
      }
    });
  });

  describe('getKeyUri()', () => {
    it('returns a string with the expected prefix', async () => {
      // Setup.
      const key = mockEcdsaSecp256k1.verify.input.key as Jwk;

      // Test the method.
      const keyUri = await keyManager.getKeyUri({ key });

      // Validate the result.
      expect(keyUri).to.exist;
      expect(keyUri).to.be.a.string;
      expect(keyUri.indexOf('urn:jwk:')).to.equal(0);
    });

    it('computes the key URI correctly for a valid JWK', async () => {
      // Setup.
      const key = mockEcdsaSecp256k1.verify.input.key as Jwk;
      const expectedThumbprint = 'U01_M3_A9vMLOWixG-rlfC-_f3LLdurttn7c7d3_upU';
      const expectedKeyUri = 'urn:jwk:' + expectedThumbprint;

      // Test the method.
      const keyUri = await keyManager.getKeyUri({ key });

      expect(keyUri).to.equal(expectedKeyUri);
    });
  });

  describe('getPublicKey()', () => {
    it('retrieves the public key for a given JWK URI', async () => {
      // Setup.
      kmsClientStub.send.withArgs(sinon.match.instanceOf(GetPublicKeyCommand)).resolves(mockEcdsaSecp256k1.getPublicKey.output);

      // Test the method.
      const result = await keyManager.getPublicKey(mockEcdsaSecp256k1.getPublicKey.input);

      // Validate the result.
      expect(result).to.be.an('object');
      expect(result).to.have.property('kty');
      expect(result).to.have.property('kid');
      expect(kmsClientStub.send.calledOnce).to.be.true;
    });

    it('retrieves the public key for a given AWS KMS ARN', async () => {
      // Setup.
      kmsClientStub.send.withArgs(sinon.match.instanceOf(GetPublicKeyCommand)).resolves(mockEcdsaSecp256k1.getPublicKey.output);

      // Test the method.
      const publicKey = await keyManager.getPublicKey({ keyUri: 'arn:aws:kms:us-east-1:364764707041:key/bb48abe3-5948-48e0-80d8-605c04d68171' });

      // Validate the result.
      expect(publicKey).to.exist;
      expect(publicKey).to.be.an('object');
      expect(publicKey).to.have.property('kty');
      expect(kmsClientStub.send.calledOnce).to.be.true;
    });

    it('supports ECDSA using secp256k1 curve and SHA-256', async () => {
      // Setup.
      kmsClientStub.send.withArgs(sinon.match.instanceOf(GetPublicKeyCommand)).resolves(mockEcdsaSecp256k1.getPublicKey.output);

      // Test the method.
      const publicKey = await keyManager.getPublicKey(mockEcdsaSecp256k1.getPublicKey.input);

      // Validate the result.
      expect(publicKey).to.exist;
      expect(publicKey).to.be.an('object');
      expect(publicKey).to.have.property('kty', 'EC');
      expect(publicKey).to.have.property('alg', 'ES256K');
      expect(publicKey).to.have.property('crv', 'secp256k1');
      expect(publicKey).to.have.property('x');
      expect(publicKey).to.have.property('y');
      expect(publicKey).to.not.have.property('d');
      expect(kmsClientStub.send.calledOnce).to.be.true;
    });

    it('throws an error if the public key is not returned in the AWS KMS response', async () => {
      // Setup.
      kmsClientStub.send.withArgs(sinon.match.instanceOf(GetPublicKeyCommand)).resolves({});

      // Test the method.
      try {
        await keyManager.getPublicKey(mockEcdsaSecp256k1.getPublicKey.input);
        expect.fail('Expected an error to be thrown.');

      } catch (error: any) {
        // Validate the result.
        expect(error).to.exist;
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.include('Public key was not returned');
      }
    });
  });

  describe('sign()', () => {
    it('generates signatures as Uint8Array', async () => {
      // Setup.
      kmsClientStub.send.withArgs(sinon.match.instanceOf(SignCommand)).resolves(mockEcdsaSecp256k1.sign.output);
      kmsClientStub.send.withArgs(sinon.match.instanceOf(DescribeKeyCommand)).resolves(mockEcdsaSecp256k1.getKeySpec.output);

      // Test the method.
      const signature = await keyManager.sign(mockEcdsaSecp256k1.sign.input);

      // Validate the result.
      expect(signature).to.be.a('Uint8Array');
      expect(kmsClientStub.send.calledTwice).to.be.true;
    });

    it('generates signatures in compact R+S format', async () => {
      // Setup.
      kmsClientStub.send.withArgs(sinon.match.instanceOf(SignCommand)).resolves(mockEcdsaSecp256k1.sign.output);
      kmsClientStub.send.withArgs(sinon.match.instanceOf(DescribeKeyCommand)).resolves(mockEcdsaSecp256k1.getKeySpec.output);

      // Test the method.
      const signature = await keyManager.sign(mockEcdsaSecp256k1.sign.input);

      // Validate the result.
      expect(signature).to.have.length(64);
    });
  });

  describe('verify()', () => {
    it('returns true for a valid signature', async () => {
      // Setup.
      const key = mockEcdsaSecp256k1.verify.input.key as Jwk; // Public key generated with AWS KMS
      const signature = mockEcdsaSecp256k1.verify.input.signature;
      const data = mockEcdsaSecp256k1.verify.input.data;

      // Test the method.
      const isValid = await keyManager.verify({ key, signature, data });

      // Validate the result.
      expect(isValid).to.be.true;
    });

    it('returns false for an invalid signature', async () => {
      // Setup.
      const key = mockEcdsaSecp256k1.verify.input.key as Jwk; // Public key generated with AWS KMS
      const signature = new Uint8Array(64);
      const data = mockEcdsaSecp256k1.verify.input.data;

      // Test the method.
      const isValid = await keyManager.verify({ key, signature, data });

      // Validate the result.
      expect(isValid).to.be.false;
    });

    it('validates signatures with public keys lacking an alg property', async () => {
      // Setup.
      const { alg, ...key } = mockEcdsaSecp256k1.verify.input.key as Jwk; // Public key generated with AWS KMS
      const signature = new Uint8Array(64);
      const data = mockEcdsaSecp256k1.verify.input.data;

      // Test the method.
      const isValid = await keyManager.verify({ key, signature, data });

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
        expect(error.message).to.include('Unable to determine algorithm based on provided input');
      }
    });
  });
});