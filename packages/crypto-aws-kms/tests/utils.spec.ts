import sinon from 'sinon';
import { expect } from 'chai';
import { CreateAliasCommand, DescribeKeyCommand, KMSClient } from '@aws-sdk/client-kms';

import { convertSpkiToPublicKey, createKeyAlias, getKeySpec } from '../src/utils.js';
import { Convert } from '@web5/common';
import { mockEcdsaSecp256k1 } from './fixtures/mock-ecdsa-secp256k1.js';

describe('AWS KMS Utils', () => {
  describe('convertSpkiToPublicKey()', () => {
    it('converts DER-encoded SPKI public key to JWK', () => {
      // Setup.
      const spkiHex = '3056301006072a8648ce3d020106052b8104000a03420004b603854cf45250fa8c2eef69053cf974b1cd87fa29e1267ace673a6661740b34eaa8eee0dc1916a9415bbf1f28c0782b4cc96df5d8577480f143c023ea562ded';
      const spki = Convert.hex(spkiHex).toUint8Array();

      // Test the method.
      const publicKey = convertSpkiToPublicKey({ spki });

      // Validate the result.
      expect(publicKey).to.be.an('object');
      expect(publicKey).to.have.property('kty');
    });

    it('supports secp256k1 public keys', () => {
      // Setup.
      const spkiHex = '3056301006072a8648ce3d020106052b8104000a03420004b603854cf45250fa8c2eef69053cf974b1cd87fa29e1267ace673a6661740b34eaa8eee0dc1916a9415bbf1f28c0782b4cc96df5d8577480f143c023ea562ded';
      const spki = Convert.hex(spkiHex).toUint8Array();

      // Test the method.
      const publicKey = convertSpkiToPublicKey({ spki });

      // Validate the result.
      expect(publicKey).to.have.property('kty', 'EC');
      expect(publicKey).to.have.property('crv', 'secp256k1');
      expect(publicKey).to.have.property('x');
      expect(publicKey).to.have.property('y');
    });
  });

  describe('createKeyAlias()', () => {
    it('creates a new alias and associates it with a target AWS KMS Key ID', async () => {
      // Setup.
      const kmsClientStub = sinon.createStubInstance(KMSClient);
      kmsClientStub.send.withArgs(sinon.match.instanceOf(CreateAliasCommand)).resolves(mockEcdsaSecp256k1.createKeyAlias.output);

      // Test the method.
      await createKeyAlias({
        alias     : mockEcdsaSecp256k1.createKeyAlias.input.alias,
        awsKeyId  : mockEcdsaSecp256k1.createKeyAlias.input.awsKeyId,
        kmsClient : kmsClientStub
      });

      // Validate the result.
      expect(kmsClientStub.send.calledOnce).to.be.true;
    });
  });

  describe('getKeySpec()', () => {
    it(`throws an error if 'KeyMetadata' is not returned in the AWS KMS response`, async () => {
      // Setup.
      const keyUri = 'urn:jwk:U01_M3_A9vMLOWixG-rlfC-_f3LLdurttn7c7d3_upU';
      const kmsClientStub = sinon.createStubInstance(KMSClient);
      kmsClientStub.send.withArgs(sinon.match.instanceOf(DescribeKeyCommand)).resolves({});

      // Test the method.
      try {
        await getKeySpec({ keyUri, kmsClient: kmsClientStub as unknown as KMSClient });
        expect.fail('Expected an error to be thrown.');

      } catch (error: any) {
        // Validate the result.
        expect(error).to.exist;
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.include('metadata was not returned: KeySpec');
        expect(kmsClientStub.send.calledOnce).to.be.true;
      }
    });

    it(`throws an error if 'KeyMetadata.KeySpec' is not returned in the AWS KMS response`, async () => {
      // Setup.
      const keyUri = 'urn:jwk:U01_M3_A9vMLOWixG-rlfC-_f3LLdurttn7c7d3_upU';
      const kmsClientStub = sinon.createStubInstance(KMSClient);
      kmsClientStub.send.withArgs(sinon.match.instanceOf(DescribeKeyCommand)).resolves({
        '$metadata' : {},
        KeyMetadata : {}
      });

      // Test the method.
      try {
        await getKeySpec({ keyUri, kmsClient: kmsClientStub as unknown as KMSClient });
        expect.fail('Expected an error to be thrown.');

      } catch (error: any) {
        // Validate the result.
        expect(error).to.exist;
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.include('metadata was not returned: KeySpec');
        expect(kmsClientStub.send.calledOnce).to.be.true;
      }
    });
  });
});