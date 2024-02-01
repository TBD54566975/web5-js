import type { Jwk } from '@web5/crypto';

import sinon from 'sinon';
import { expect } from 'chai';
import { Convert } from '@web5/common';
import { CreateKeyCommand, DescribeKeyCommand, KMSClient, SignCommand } from '@aws-sdk/client-kms';

import { AwsKeyManager } from '../src/key-manager.js';
import { EcdsaAlgorithm } from '../src/ecdsa.js';
import { mockEcdsaSecp256k1, mockSignCommandOutput } from './fixtures/mock-ecdsa-secp256k1.js';

describe('EcdsaAlgorithm', () => {
  let keyManager: AwsKeyManager;
  let ecdsa: EcdsaAlgorithm;
  let kmsClientStub: sinon.SinonStubbedInstance<KMSClient>;

  beforeEach(() => {
    kmsClientStub = sinon.createStubInstance(KMSClient);
    keyManager = new AwsKeyManager({ kmsClient: kmsClientStub as unknown as KMSClient });
    ecdsa = new EcdsaAlgorithm({ keyManager, kmsClient: kmsClientStub as unknown as KMSClient });
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
      const signature = await keyManager.sign(mockEcdsaSecp256k1.sign.input);

      // Validate the signature with keyManager.verify() which uses Secp256k1.verify().
      const isValid = await keyManager.verify({
        key,
        signature,
        data: mockEcdsaSecp256k1.sign.input.data
      });

      expect(isValid).to.be.true;
      expect(kmsClientStub.send.calledTwice).to.be.true;
    });

    it('returns normalized, low-s form signatures', async () => {
      // Setup.
      const mockHighSSignCommandOutput = {
        ...mockSignCommandOutput,
        // Return the DER encoded signature from Wycheproof test case 1, which has a high-s value.
        signature: Convert.hex('3046022100813ef79ccefa9a56f7ba805f0e478584fe5f0dd5f567bc09b5123ccbc9832365022100900e75ad233fcc908509dbff5922647db37c21f4afd3203ae8dc4ae7794b0f87').toUint8Array()
      };
      kmsClientStub.send.withArgs(sinon.match.instanceOf(SignCommand)).resolves(mockHighSSignCommandOutput);
      kmsClientStub.send.withArgs(sinon.match.instanceOf(DescribeKeyCommand)).resolves(mockEcdsaSecp256k1.getKeySpec.output);

      // Test the method.
      const signature = await ecdsa.sign({
        algorithm : 'ES256K',
        data      : new Uint8Array([0, 1, 2, 3, 4]),
        keyUri    : 'urn:jwk:U01_M3_A9vMLOWixG-rlfC-_f3LLdurttn7c7d3_upU'
      });

      // Validate the signature returned by EcdsaAlgorithm.sign() has been adjust to low-s form.
      expect(signature).to.deep.equal(
        Convert.hex('8891914c431baae682defc57fe074c8cb700f790d72e2a51474cca0ee00faa8451e462395b70b51ae6b98d3fadc233ae4db15583e9b75ac32d94a697c71aa426').toUint8Array()
      );
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
        expect(error.message).to.include('Invalid key provided');
        expect(kmsClientStub.send.notCalled).to.be.true;
      }
    });

    it('throws an error if the curve of the EC public key specified is unsupported', async () => {
      // Setup.
      const unsupportedEcPublicKey: Jwk = {
        kty : 'EC',
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