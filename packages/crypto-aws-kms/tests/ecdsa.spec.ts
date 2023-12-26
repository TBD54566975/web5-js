import type { Jwk } from '@web5/crypto';

import sinon from 'sinon';
import { expect } from 'chai';
import { CreateKeyCommand, DescribeKeyCommand, KMSClient, SignCommand } from '@aws-sdk/client-kms';

import { AwsKmsCrypto } from '../src/api.js';
import { EcdsaAlgorithm } from '../src/ecdsa.js';
import { mockEcdsaSecp256k1 } from './fixtures/mock-ecdsa-secp256k1.js';

describe('EcdsaAlgorithm', () => {
  let crypto: AwsKmsCrypto;
  let ecdsa: EcdsaAlgorithm;
  let kmsClientStub: sinon.SinonStubbedInstance<KMSClient>;

  beforeEach(() => {
    kmsClientStub = sinon.createStubInstance(KMSClient);
    crypto = new AwsKmsCrypto({ kmsClient: kmsClientStub as unknown as KMSClient });
    ecdsa = new EcdsaAlgorithm({ crypto, kmsClient: kmsClientStub as unknown as KMSClient });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('generateKey()', () => {
    it(`throws an error if 'KeyMetadata' is not returned in the AWS KMS response`, async () => {
      // Setup.
      kmsClientStub.send.withArgs(sinon.match.instanceOf(CreateKeyCommand)).resolves({});

      // Test the method.
      try {
        await ecdsa.generateKey({ algorithm: 'ES256K' });
        expect.fail('Expected an error to be thrown.');

      } catch (error: any) {
        // Validate the result.
        expect(error).to.exist;
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.include('metadata was not returned: KeyId');
        expect(kmsClientStub.send.calledOnce).to.be.true;
      }
    });

    it(`throws an error if 'KeyMetadata.KeyId' is not returned in the AWS KMS response`, async () => {
      // Setup.
      kmsClientStub.send.withArgs(sinon.match.instanceOf(CreateKeyCommand)).resolves({
        '$metadata' : {},
        KeyMetadata : {}
      });

      // Test the method.
      try {
        await ecdsa.generateKey({ algorithm: 'ES256K' });
        expect.fail('Expected an error to be thrown.');

      } catch (error: any) {
        // Validate the result.
        expect(error).to.exist;
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.include('metadata was not returned: KeyId');
        expect(kmsClientStub.send.calledOnce).to.be.true;
      }
    });
  });

  describe('sign()', () => {
    it('generates signatures that can be verified with Secp256k1.verify()', async () => {
      // Setup.
      kmsClientStub.send.withArgs(sinon.match.instanceOf(SignCommand)).resolves(mockEcdsaSecp256k1.sign.output);
      kmsClientStub.send.withArgs(sinon.match.instanceOf(DescribeKeyCommand)).resolves(mockEcdsaSecp256k1.getKeySpec.output);
      const key = mockEcdsaSecp256k1.verify.input.key as Jwk; // Public key generated with AWS KMS

      // Test the method.
      const signature = await crypto.sign(mockEcdsaSecp256k1.sign.input);

      // Validate the signature with crypto.verify() which uses Secp256k1.verify().
      const isValid = await crypto.verify({
        key,
        signature,
        data: mockEcdsaSecp256k1.sign.input.data
      });

      expect(isValid).to.be.true;
      expect(kmsClientStub.send.calledTwice).to.be.true;
    });

    it('throws an error if an unsupported algorithm is specified', async () => {
      // Setup.
      const keyUri = 'urn:jwk:U01_M3_A9vMLOWixG-rlfC-_f3LLdurttn7c7d3_upU';
      const algorithm = 'unsupported-algorithm';
      const data = new Uint8Array([0, 1, 2, 3, 4]);
      kmsClientStub.send.withArgs(sinon.match.instanceOf(SignCommand)).resolves({});

      // Test the method.
      try {
        // @ts-expect-error because unsupported algorithm is being tested.
        await ecdsa.sign({ keyUri, algorithm, data });
        expect.fail('Expected an error to be thrown.');

      } catch (error: any) {
        // Validate the result.
        expect(error).to.exist;
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.include(`Unsupported signature algorithm: ${algorithm}`);
        expect(kmsClientStub.send.notCalled).to.be.true;
      }
    });

    it('throws an error if the signature is not returned in the AWS KMS response', async () => {
      // Setup.
      const keyUri = 'urn:jwk:U01_M3_A9vMLOWixG-rlfC-_f3LLdurttn7c7d3_upU';
      const algorithm = 'ES256K';
      const data = new Uint8Array([0, 1, 2, 3, 4]);
      kmsClientStub.send.withArgs(sinon.match.instanceOf(SignCommand)).resolves({});

      // Test the method.
      try {
        await ecdsa.sign({ keyUri, algorithm, data });
        expect.fail('Expected an error to be thrown.');

      } catch (error: any) {
        // Validate the result.
        expect(error).to.exist;
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.include('property was not returned: Signature');
        expect(kmsClientStub.send.calledOnce).to.be.true;
      }
    });
  });

  describe('verify()', () => {
    it('throws an error if an invalid key type is specified', async () => {
      // Setup.
      const ed25519PublicKey: Jwk = {
        kty : 'OKP',
        crv : 'Ed25519',
        x   : 'xQzEeTR-697-DymiVWRUmsE5P1_L3WVNaNDrpMNxgJ4'
      };
      const signature = new Uint8Array(0);
      const data = new Uint8Array([0, 1, 2, 3, 4]);
      kmsClientStub.send.withArgs(sinon.match.instanceOf(SignCommand)).resolves({});

      // Test the method.
      try {
        await ecdsa.verify({ key: ed25519PublicKey, signature, data });
        expect.fail('Expected an error to be thrown.');

      } catch (error: any) {
        // Validate the result.
        expect(error).to.exist;
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.include('Invalid key type');
        expect(kmsClientStub.send.notCalled).to.be.true;
      }
    });

    it('throws an error if the curve of the EC public key specified is unsupported', async () => {
      // Setup.
      const unsupportedEcPublicKey: Jwk = {
        kty : 'EC',
        // @ts-expect-error because unsupported curve is being tested.
        crv : 'unsupported-curve',
        x   : 'oJDigSHQ3lb1Zg82KB6huToMeGPKDcSG1Z8i7u958M8',
        y   : 'xvkCbFcmo9tbyfphIxOa96dfqt9yJgab77J3qOcMYcE'
      };
      const signature = new Uint8Array(0);
      const data = new Uint8Array([0, 1, 2, 3, 4]);
      kmsClientStub.send.withArgs(sinon.match.instanceOf(SignCommand)).resolves({});

      // Test the method.
      try {
        await ecdsa.verify({ key: unsupportedEcPublicKey, signature, data });
        expect.fail('Expected an error to be thrown.');

      } catch (error: any) {
        // Validate the result.
        expect(error).to.exist;
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.include('Unsupported curve: unsupported-curve');
        expect(kmsClientStub.send.notCalled).to.be.true;
      }
    });
  });
});