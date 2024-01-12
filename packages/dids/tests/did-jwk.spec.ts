import type { Jwk } from '@web5/crypto';

import sinon from 'sinon';
import { expect } from 'chai';
import { Ed25519, LocalKmsCrypto, Secp256k1 } from '@web5/crypto';

import type { DidDocument } from '../src/types/did-core.js';
import type { DidKeySet } from '../src/methods/did-method.js';

import { DidJwk } from '../src/methods/did-jwk.js';
import DidJwkResolveTestVector from '../../../test-vectors/did_jwk/resolve.json' assert { type: 'json' };

describe('DidJwk', () => {
  let keyManager: LocalKmsCrypto;

  before(() => {
    keyManager = new LocalKmsCrypto();
  });

  describe('create()', () => {
    it('creates a DID and generates keys using the given algorithm', async () => {
      const did = await DidJwk.create({ keyManager, options: { algorithm: 'Ed25519' } });

      // Verify expected result.
      expect(did).to.have.property('didDocument');
      expect(did).to.have.property('getSigner');
      expect(did).to.have.property('keyManager');
      expect(did).to.have.property('metadata');
      expect(did).to.have.property('uri');
      expect(did.metadata).to.have.property('keySet');
      expect(did.metadata.keySet).to.have.property('keys');
      expect(did.metadata.keySet.keys).to.have.length(1);
      expect(did.metadata.keySet.keys?.[0]).to.have.property('keyUri');
      expect(did.metadata.keySet.keys?.[0]).to.have.property('purposes');
    });

    it('creates a DID using any signature algorithm supported by the provided KMS', async () => {
      expect(
        await DidJwk.create({ keyManager, options: { algorithm: 'ES256K' } })
      ).to.have.property('uri');

      expect(
        await DidJwk.create({ keyManager, options: { algorithm: 'Ed25519' } })
      ).to.have.property('uri');
    });

    it('creates a DID using the given keySet', async () => {
      const keyUri = await keyManager.generateKey({ algorithm: 'Ed25519' });
      const keySet: DidKeySet = { keys: [{ keyUri, purposes: ['authentication'] }] };
      const did = await DidJwk.create({ keyManager, options: { keySet } });

      expect(did).to.have.property('uri');
      expect(did.metadata.keySet).to.deep.equal(keySet);
    });

    it(`does not include the 'keyAgreement' relationship when JWK use is 'sig'`, async () => {
      // Generate a random Ed25519 private key.
      let privateKey = await Ed25519.generateKey();

      // Add the `sig` key use property.
      privateKey.use = 'sig';

      // Import the private key into the key manager.
      const keyUri = await keyManager.importKey({ key: privateKey });

      // Create a key set with the imported key.
      const keySet: DidKeySet = { keys: [{ keyUri, purposes: ['authentication'] }] };

      // Create the DID using the key set.
      let did = await DidJwk.create({ keyManager, options: { keySet } });

      // Verify the DID document does not contain the `keyAgreement` relationship.
      expect(did.didDocument).to.not.have.property('keyAgreement');
    });

    it(`only specifies 'keyAgreement' relationship when JWK use is 'enc'`, async () => {
      // Generate a random secp256k1 private key.
      let privateKey = await Secp256k1.generateKey();

      // Add the `enc` key use property.
      privateKey.use = 'enc';

      // Import the private key into the key manager.
      const keyUri = await keyManager.importKey({ key: privateKey });

      // Create a key set with the imported key.
      const keySet: DidKeySet = { keys: [{ keyUri, purposes: ['authentication'] }] };

      // Create the DID using the key set.
      let did = await DidJwk.create({ keyManager, options: { keySet } });

      // Verrify the DID document does not contain any verification relationships other than
      // `keyAgreement`.
      expect(did.didDocument).to.have.property('keyAgreement');
      expect(did.didDocument).to.not.have.property('assertionMethod');
      expect(did.didDocument).to.not.have.property('authentication');
      expect(did.didDocument).to.not.have.property('capabilityDelegation');
      expect(did.didDocument).to.not.have.property('capabilityInvocation');
    });

    it('throws an error if the key set is empty', async () => {
      try {
        await DidJwk.create({ keyManager, options: { keySet: {} } });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('exactly one key');
      }
    });

    it('throws an error if the key set contains two or more keys', async () => {
      const keyUri = 'did:jwk:fake';

      try {
        await DidJwk.create({
          keyManager,
          options: {
            keySet: {
              keys: [
                { keyUri, purposes: ['authentication'] },
                { keyUri, purposes: ['authentication'] }
              ]
            }
          }
        });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('exactly one key');
      }
    });
  });

  describe('getSigner()', () => {
    it('creates valid signatures that can be verified', async () => {
      const did = await DidJwk.create({ keyManager, options: { algorithm: 'Ed25519' } });

      const signer = await did.getSigner();
      const data = new Uint8Array([1, 2, 3]);
      const signature = await signer.sign({ data });
      const isValid = await signer.verify({ data, signature });

      expect(signature).to.have.length(64);
      expect(isValid).to.be.true;
    });

    let keyManagerMock: any;
    let publicKey: Jwk;
    let didDocument: DidDocument;

    beforeEach(() => {
      // Mock for CryptoApi
      keyManagerMock = {
        digest       : sinon.stub(),
        generateKey  : sinon.stub(),
        getKeyUri    : sinon.stub(),
        getPublicKey : sinon.stub(),
        sign         : sinon.stub(),
        verify       : sinon.stub(),
      };

      // Example public key in JWK format
      publicKey = {
        kty : 'OKP',
        use : 'sig',
        crv : 'Ed25519',
        kid : '...',
        x   : 'abc123',
        alg : 'EdDSA'
      };

      // Example DID Document
      didDocument = {
        '@context'         : 'https://www.w3.org/ns/did/v1',
        id                 : 'did:jwk:example',
        verificationMethod : [{
          id           : 'did:jwk:example#0',
          type         : 'JsonWebKey2020',
          controller   : 'did:jwk:example',
          publicKeyJwk : publicKey,
        }],
      };

      keyManagerMock.getKeyUri.resolves('urn:jwk:example'); // Mock key URI retrieval
      keyManagerMock.getPublicKey.resolves(publicKey); // Mock public key retrieval
      keyManagerMock.sign.resolves(new Uint8Array(64).fill(0)); // Mock signature creation
      keyManagerMock.verify.resolves(true); // Mock verification result
    });

    it('returns a signer with sign and verify functions', async () => {
      const signer = await DidJwk.getSigner({ didDocument, keyManager: keyManagerMock });

      expect(signer).to.be.an('object');
      expect(signer).to.have.property('sign').that.is.a('function');
      expect(signer).to.have.property('verify').that.is.a('function');
    });

    it('sign function should call keyManager.sign with correct parameters', async () => {
      const signer = await DidJwk.getSigner({ didDocument, keyManager: keyManagerMock });
      const dataToSign = new Uint8Array([0x00, 0x01]);

      await signer.sign({ data: dataToSign });

      expect(keyManagerMock.sign.calledOnce).to.be.true;
      expect(keyManagerMock.sign.calledWith(sinon.match({ data: dataToSign }))).to.be.true;
    });

    it('verify function should call keyManager.verify with correct parameters', async () => {
      const signer = await DidJwk.getSigner({ didDocument, keyManager: keyManagerMock });
      const dataToVerify = new Uint8Array([0x00, 0x01]);
      const signature = new Uint8Array([0x01, 0x02]);

      await signer.verify({ data: dataToVerify, signature });

      expect(keyManagerMock.verify.calledOnce).to.be.true;
      expect(keyManagerMock.verify.calledWith(sinon.match({ data: dataToVerify, signature }))).to.be.true;
    });

    it('uses the provided keyUri to fetch the public key', async () => {
      const keyUri = 'some-key-uri';
      keyManagerMock.getPublicKey.withArgs({ keyUri }).resolves(publicKey);

      const signer = await DidJwk.getSigner({ didDocument, keyManager: keyManagerMock, keyUri });

      expect(signer).to.be.an('object');
      expect(keyManagerMock.getPublicKey.calledWith({ keyUri })).to.be.true;
    });

    it('handles undefined params', async function () {
      // Create a `did:jwk` DID.
      const did = await DidJwk.create({ keyManager, options: { algorithm: 'Ed25519' } });

      // Simulate the creation of a signer with undefined params
      const signer = await did.getSigner({ });

      // Note: Since this test does not interact with an actual keyManager, it primarily ensures
      // that the method doesn't break with undefined params.
      expect(signer).to.have.property('sign');
      expect(signer).to.have.property('verify');
    });

    it('throws an error if the keyUri does not match any key in the DID Document', async () => {
      const keyUri = 'nonexistent-key-uri';
      keyManagerMock.getPublicKey.withArgs({ keyUri }).resolves({ ...publicKey, x: 'def456' });

      try {
        await DidJwk.getSigner({ didDocument, keyManager: keyManagerMock, keyUri });
        expect.fail('Error should have been thrown');
      } catch (error: any) {
        expect(error.message).to.include(`is not present in the provided DID Document for '${didDocument.id}'`);
      }
    });

    it('throws an error if no verification methods are found in the DID Document', async () => {
      // Example DID Document with no verification methods
      didDocument = {
        '@context'         : 'https://www.w3.org/ns/did/v1',
        id                 : 'did:jwk:...',
        verificationMethod : [], // Empty array indicates no verification methods
      };

      try {
        await DidJwk.getSigner({ didDocument, keyManager: keyManagerMock });
        expect.fail('Error should have been thrown');
      } catch (error: any) {
        expect(error.message).to.include('No verification methods found');
      }
    });

    it('throws an error if the keys needed to create a signer are not determined', async function () {
      keyManagerMock.getKeyUri.resolves(undefined); // Resolves to undefined to simulate missing publicKey

      try {
        await DidJwk.getSigner({ didDocument, keyManager: keyManagerMock });
        expect.fail('Error should have been thrown');
      } catch (error: any) {
        expect(error.message).to.include('Failed to determine the keys needed to create a signer');
      }
    });
  });

  describe('getSigningMethod()', () => {
    it('handles didDocuments missing verification methods', async function () {
      const result = await DidJwk.getSigningMethod({
        didDocument: { id: 'did:jwk:123' }
      });

      expect(result).to.be.undefined;
    });

    it('throws an error if a non-jwk method is used', async function () {
      // Example DID Document with a non-jwk method
      const didDocument: DidDocument = {
        '@context'         : 'https://www.w3.org/ns/did/v1',
        id                 : 'did:example:123',
        verificationMethod : [
          {
            id           : 'did:example:123#0',
            type         : 'JsonWebKey2020',
            controller   : 'did:example:123',
            publicKeyJwk : {} as Jwk
          }
        ],
      };

      try {
        await DidJwk.getSigningMethod({ didDocument });
        expect.fail('Error should have been thrown');
      } catch (error: any) {
        expect(error.message).to.equal('DidJwk: Method not supported: example');
      }
    });
  });

  describe('resolve()', () => {
    it('returns an error due to DID parsing failing', async function () {
      const invalidDidUri = 'did:invalidFormat';
      const resolutionResult = await DidJwk.resolve(invalidDidUri);
      expect(resolutionResult.didResolutionMetadata.error).to.equal('invalidDid');
    });

    it('returns an error due to failing to decode the publicKeyJwk', async function () {
      const didUriWithInvalidEncoding = 'did:jwk:invalidEncoding';
      const resolutionResult = await DidJwk.resolve(didUriWithInvalidEncoding);
      expect(resolutionResult.didResolutionMetadata.error).to.equal('invalidDid');
    });

    it('returns an error because the DID method is not "jwk"', async function () {
      const didUriWithDifferentMethod = 'did:notjwk:eyJmb28iOiJiYXIifQ';
      const resolutionResult = await DidJwk.resolve(didUriWithDifferentMethod);
      expect(resolutionResult.didResolutionMetadata.error).to.equal('methodNotSupported');
    });
  });

  describe('Web5TestVectorsDidJwk', () => {
    it('resolve', async () => {
      for (const vector of DidJwkResolveTestVector.vectors) {
        const didResolutionResult = await DidJwk.resolve(vector.input);

        expect(didResolutionResult).to.deep.equal(vector.output);
      }
    });
  });
});