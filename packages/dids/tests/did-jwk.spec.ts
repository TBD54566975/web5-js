import type { Jwk } from '@web5/crypto';
import type { UnwrapPromise } from '@web5/common';

import sinon from 'sinon';
import { expect } from 'chai';
import { LocalKmsCrypto } from '@web5/crypto';

import type { DidDocument } from '../src/types/did-core.js';
import type { DidKeySet, DidKeySetVerificationMethod } from '../src/methods/did-method.js';

import { DidErrorCode } from '../src/did-error.js';
import { DidJwk } from '../src/methods/did-jwk.js';
import DidJwkResolveTestVector from '../../../test-vectors/did_jwk/resolve.json' assert { type: 'json' };

describe('DidJwk', () => {
  let keyManager: LocalKmsCrypto;

  before(() => {
    keyManager = new LocalKmsCrypto();
  });

  describe('create()', () => {
    it('creates a did:jwk DID', async () => {
      const did = await DidJwk.create({ keyManager, options: { algorithm: 'Ed25519' } });

      expect(did).to.have.property('didDocument');
      expect(did).to.have.property('getSigner');
      expect(did).to.have.property('keyManager');
      expect(did).to.have.property('metadata');
      expect(did).to.have.property('uri');
      expect(did.uri.startsWith('did:jwk:')).to.be.true;
      expect(did.didDocument.verificationMethod).to.have.length(1);
    });

    it('uses a default key manager and key generation algorithm if neither is given', async () => {
      // Create a DID with no params.
      let did = await DidJwk.create();
      expect(did.uri.startsWith('did:jwk:')).to.be.true;

      // Create a DID with an empty options object.
      did = await DidJwk.create({ options: {} });
      expect(did.uri.startsWith('did:jwk:')).to.be.true;

      // Create a DID with an empty options object and undefined key manager.
      did = await DidJwk.create({});
      expect(did.uri.startsWith('did:jwk:')).to.be.true;
    });

    it('creates a DID using the top-level algorithm property, if given', async () => {
      const did = await DidJwk.create({ keyManager, options: { algorithm: 'ES256K' } });

      // Retrieve the public key from the key manager.
      const keyUri = await keyManager.getKeyUri({ key: did.didDocument.verificationMethod![0]!.publicKeyJwk! });
      const publicKey = await keyManager.getPublicKey({ keyUri });

      // Verify the public key is an secp256k1 key.
      expect(publicKey).to.have.property('crv', 'secp256k1');
    });

    it('creates a DID using the verificationMethods algorithm property, if given', async () => {
      const did = await DidJwk.create({ keyManager, options: { verificationMethods: [{ algorithm: 'ES256K' }] } });

      // Retrieve the public key from the key manager.
      const keyUri = await keyManager.getKeyUri({ key: did.didDocument.verificationMethod![0]!.publicKeyJwk! });
      const publicKey = await keyManager.getPublicKey({ keyUri });

      // Verify the public key is an secp256k1 key.
      expect(publicKey).to.have.property('crv', 'secp256k1');
    });

    it('creates a DID with an Ed25519 key, by default', async () => {
      const did = await DidJwk.create({ keyManager });

      // Retrieve the public key from the key manager.
      const keyUri = await keyManager.getKeyUri({ key: did.didDocument.verificationMethod![0]!.publicKeyJwk! });
      const publicKey = await keyManager.getPublicKey({ keyUri });

      // Verify the public key is an Ed25519 key.
      expect(publicKey).to.have.property('crv', 'Ed25519');
    });

    it('creates a DID using any signature algorithm supported by the provided KMS', async () => {
      expect(
        await DidJwk.create({ keyManager, options: { algorithm: 'ES256K' } })
      ).to.have.property('uri');

      expect(
        await DidJwk.create({ keyManager, options: { algorithm: 'Ed25519' } })
      ).to.have.property('uri');
    });

    it('returns a getSigner() function that creates valid signatures that can be verified', async () => {
      const did = await DidJwk.create({ keyManager, options: { algorithm: 'Ed25519' } });

      const signer = await did.getSigner();
      const data = new Uint8Array([1, 2, 3]);
      const signature = await signer.sign({ data });
      const isValid = await signer.verify({ data, signature });

      expect(signature).to.have.length(64);
      expect(isValid).to.be.true;
    });

    it('returns a getSigner() function handles undefined params', async function () {
      // Create a `did:jwk` DID.
      const did = await DidJwk.create({ keyManager, options: { algorithm: 'Ed25519' } });

      // Simulate the creation of a signer with undefined params
      const signer = await did.getSigner({ });

      // Note: Since this test does not interact with an actual keyManager, it primarily ensures
      // that the method doesn't break with undefined params.
      expect(signer).to.have.property('sign');
      expect(signer).to.have.property('verify');
    });

    it('throws an error if both algorithm and verificationMethods are provided', async () => {
      try {
        await DidJwk.create({
          keyManager,
          options: {
            algorithm           : 'Ed25519',
            verificationMethods : [{ algorithm: 'Ed25519' }]
          }
        });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('options are mutually exclusive');
      }
    });
  });

  describe('fromKeyManager()', () => {
    let didUri: string;
    let keyManager: LocalKmsCrypto;
    let privateKey: Jwk;

    before(() => {
      keyManager = new LocalKmsCrypto();
    });

    beforeEach(() => {
      didUri = 'did:jwk:eyJrdHkiOiJPS1AiLCJjcnYiOiJFZDI1NTE5IiwieCI6IjNFQmFfRUxvczJhbHZMb2pxSVZjcmJLcGlyVlhqNmNqVkQ1djJWaHdMejgifQ';

      privateKey = {
        kty : 'OKP',
        crv : 'Ed25519',
        x   : '3EBa_ELos2alvLojqIVcrbKpirVXj6cjVD5v2VhwLz8',
        d   : 'hMqv-FAvhVWz2nxobesO7TzI0-GN0kvzkUGYdnZt_TA'
      };
    });

    it('returns a DID JWK from existing keys present in a key manager', async () => {
      // Import the test DID's keys into the key manager.
      await keyManager.importKey({ key: privateKey });

      const did = await DidJwk.fromKeyManager({ didUri, keyManager });

      expect(did).to.have.property('didDocument');
      expect(did).to.have.property('getSigner');
      expect(did).to.have.property('keyManager');
      expect(did).to.have.property('metadata');
      expect(did).to.have.property('uri', 'did:jwk:eyJrdHkiOiJPS1AiLCJjcnYiOiJFZDI1NTE5IiwieCI6IjNFQmFfRUxvczJhbHZMb2pxSVZjcmJLcGlyVlhqNmNqVkQ1djJWaHdMejgifQ');
    });

    it('returns a DID with a getSigner function that can sign and verify data', async () => {
      // Import the test DID's keys into the key manager.
      await keyManager.importKey({ key: privateKey });

      const did = await DidJwk.fromKeyManager({ didUri, keyManager });

      const signer = await did.getSigner();
      const data = new Uint8Array([1, 2, 3]);
      const signature = await signer.sign({ data });
      const isValid = await signer.verify({ data, signature });

      expect(signature).to.have.length(64);
      expect(isValid).to.be.true;
    });

    it('returns a DID with a getSigner function that accepts a specific keyUri', async () => {
      // Import the test DID's keys into the key manager.
      await keyManager.importKey({ key: privateKey });

      const did = await DidJwk.fromKeyManager({ didUri, keyManager });

      // Retrieve the key URI of the verification method's public key.
      const { d, ...publicKey } = privateKey; // Remove the private key component
      const keyUri = await did.keyManager.getKeyUri({ key: publicKey });

      const signer = await did.getSigner({ keyUri });
      const data = new Uint8Array([1, 2, 3]);
      const signature = await signer.sign({ data });
      const isValid = await signer.verify({ data, signature });

      expect(signature).to.have.length(64);
      expect(isValid).to.be.true;
    });

    it(`does not include the 'keyAgreement' relationship when JWK use is 'sig'`, async () => {
      // Add the `sig` key use property to the test DID's private key.
      privateKey.use = 'sig';

      // Redefine the DID URI that is based on inclusion of the `use: 'sig'` property.
      didUri = 'did:jwk:eyJrdHkiOiJPS1AiLCJjcnYiOiJFZDI1NTE5IiwieCI6IjNFQmFfRUxvczJhbHZMb2pxSVZjcmJLcGlyVlhqNmNqVkQ1djJWaHdMejgiLCJ1c2UiOiJzaWcifQ';

      // Import the private key into the key manager.
      await keyManager.importKey({ key: privateKey });

      // Instantiate the DID object using the existing key.
      let did = await DidJwk.fromKeyManager({ didUri, keyManager });

      // Verify the DID document does not contain the `keyAgreement` relationship.
      expect(did.didDocument).to.not.have.property('keyAgreement');
    });

    it(`only specifies 'keyAgreement' relationship when JWK use is 'enc'`, async () => {
      // Redefine the test DID's private key to be a secp256k1 key with the `enc` key use property.
      privateKey = {
        kty : 'EC',
        crv : 'secp256k1',
        d   : 'WJPT7YKR12IulMa2cCQIoQXEK3YL3K4bBDmd684gnEY',
        x   : 'ORyV-OYLFV0C7Vv9ky-j90Yi4nDTkaYdF2-hObR71SM',
        y   : 'D2EyTbAkVfaBa9khVngdqwLfSy6hnIYAz3lLxdvJmEc',
        kid : '_BuKVglXMSv5OLbiRABKQPXDwmDoHucVPpwdnhdUwEU',
        alg : 'ES256K',
        use : 'enc',
      };

      // Redefine the DID URI that is based on inclusion of the `use: 'enc'` property.
      didUri = 'did:jwk:eyJrdHkiOiJFQyIsImNydiI6InNlY3AyNTZrMSIsIngiOiJPUnlWLU9ZTEZWMEM3VnY5a3ktajkwWWk0bkRUa2FZZEYyLWhPYlI3MVNNIiwieSI6IkQyRXlUYkFrVmZhQmE5a2hWbmdkcXdMZlN5NmhuSVlBejNsTHhkdkptRWMiLCJraWQiOiJfQnVLVmdsWE1TdjVPTGJpUkFCS1FQWER3bURvSHVjVlBwd2RuaGRVd0VVIiwiYWxnIjoiRVMyNTZLIiwidXNlIjoiZW5jIn0';

      // Import the private key into the key manager.
      await keyManager.importKey({ key: privateKey });

      // Instantiate the DID object using the existing key.
      const did = await DidJwk.fromKeyManager({ didUri, keyManager });

      // Verrify the DID document does not contain any verification relationships other than
      // `keyAgreement`.
      expect(did.didDocument).to.have.property('keyAgreement');
      expect(did.didDocument).to.not.have.property('assertionMethod');
      expect(did.didDocument).to.not.have.property('authentication');
      expect(did.didDocument).to.not.have.property('capabilityDelegation');
      expect(did.didDocument).to.not.have.property('capabilityInvocation');
    });

    it('throws an error if the given DID URI cannot be resolved', async () => {
      const didUri = 'did:jwk:...';
      try {
        await DidJwk.fromKeyManager({ didUri, keyManager });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('missing verification methods');
      }
    });

    it('throws an error if an unsupported DID method is given', async () => {
      try {
        await DidJwk.fromKeyManager({ didUri: 'did:example:e30', keyManager });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('Method not supported');
        expect(error.code).to.equal(DidErrorCode.MethodNotSupported);
      }
    });

    it('throws an error if the resolved DID document lacks any verification methods', async () => {
      // Stub the DID resolve method to return a DID document without a verificationMethod property.
      sinon.stub(DidJwk, 'resolve').returns(Promise.resolve({
        didDocument           : { id: 'did:jwk:...' },
        didDocumentMetadata   : {},
        didResolutionMetadata : {}
      }));

      const didUri = 'did:jwk:...';
      try {
        await DidJwk.fromKeyManager({ didUri, keyManager });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('missing verification methods');
      } finally {
        sinon.restore();
      }

      // Stub the DID resolve method to return a DID document an empty verificationMethod property.
      sinon.stub(DidJwk, 'resolve').returns(Promise.resolve({
        didDocument           : { id: 'did:jwk:...', verificationMethod: [] },
        didDocumentMetadata   : {},
        didResolutionMetadata : {}
      }));

      try {
        await DidJwk.fromKeyManager({ didUri, keyManager });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('missing verification methods');
      } finally {
        sinon.restore();
      }
    });

    it('throws an error if the resolved DID document is missing a public key', async () => {
      // Stub the DID resolution method to return a DID document with no verification methods.
      sinon.stub(DidJwk, 'resolve').returns(Promise.resolve({
        didDocument: {
          id                 : 'did:jwk:...',
          verificationMethod : [{
            id         : 'did:jwk:...#0',
            type       : 'JsonWebKey2020',
            controller : 'did:jwk:...'
          }],
        },
        didDocumentMetadata   : {},
        didResolutionMetadata : {}
      }));

      const didUri = 'did:jwk:...';
      try {
        await DidJwk.fromKeyManager({ didUri, keyManager });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('does not contain a public key');
      } finally {
        sinon.restore();
      }
    });
  });

  describe('fromKeys()', () => {
    let didUri: string;
    let keySet: DidKeySet;

    beforeEach(() => {
      // Define a DID to use for the test.
      didUri = 'did:jwk:eyJrdHkiOiJPS1AiLCJjcnYiOiJFZDI1NTE5IiwieCI6IjNFQmFfRUxvczJhbHZMb2pxSVZjcmJLcGlyVlhqNmNqVkQ1djJWaHdMejgifQ';

      // Define a key set to use for the test.
      keySet = {
        verificationMethods: [{
          publicKeyJwk: {
            kty : 'OKP',
            crv : 'Ed25519',
            x   : '3EBa_ELos2alvLojqIVcrbKpirVXj6cjVD5v2VhwLz8'
          },
          privateKeyJwk: {
            kty : 'OKP',
            crv : 'Ed25519',
            x   : '3EBa_ELos2alvLojqIVcrbKpirVXj6cjVD5v2VhwLz8',
            d   : 'hMqv-FAvhVWz2nxobesO7TzI0-GN0kvzkUGYdnZt_TA'
          },
          purposes: ['authentication']
        }]
      };
    });

    it('returns a DID JWK from the given set of verification method keys', async () => {
      const did = await DidJwk.fromKeys(keySet);

      expect(did).to.have.property('didDocument');
      expect(did).to.have.property('getSigner');
      expect(did).to.have.property('keyManager');
      expect(did).to.have.property('metadata');
      expect(did).to.have.property('uri', didUri);
    });

    it('returns a DID with a getSigner function that can sign and verify data', async () => {
      const did = await DidJwk.fromKeys(keySet);
      const signer = await did.getSigner();
      const data = new Uint8Array([1, 2, 3]);
      const signature = await signer.sign({ data });
      const isValid = await signer.verify({ data, signature });

      expect(signature).to.have.length(64);
      expect(isValid).to.be.true;
    });

    it('returns a DID with a getSigner function that accepts a specific keyUri', async () => {
      const did = await DidJwk.fromKeys(keySet);

      // Retrieve the key URI of the verification method's public key.
      const keyUri = await did.keyManager.getKeyUri({ key: keySet.verificationMethods![0].publicKeyJwk! });

      const signer = await did.getSigner({ keyUri });
      const data = new Uint8Array([1, 2, 3]);
      const signature = await signer.sign({ data });
      const isValid = await signer.verify({ data, signature });

      expect(signature).to.have.length(64);
      expect(isValid).to.be.true;
    });

    it(`does not include the 'keyAgreement' relationship when JWK use is 'sig'`, async () => {
      // Add the `sig` key use property.
      keySet.verificationMethods![0].privateKeyJwk!.use = 'sig';
      keySet.verificationMethods![0].publicKeyJwk!.use = 'sig';

      // Import the private key into a key manager.
      const keyManager = new LocalKmsCrypto();
      await keyManager.importKey({ key: keySet.verificationMethods![0].privateKeyJwk! });

      // Create the DID using the key set.
      let did = await DidJwk.fromKeys(keySet);

      // Verify the DID document does not contain the `keyAgreement` relationship.
      expect(did.didDocument).to.not.have.property('keyAgreement');
    });

    it(`only specifies 'keyAgreement' relationship when JWK use is 'enc'`, async () => {
      // Generate a random secp256k1 private key.
      const keyUri = await keyManager.generateKey({ algorithm: 'ES256K' });
      const publicKey = await keyManager.getPublicKey({ keyUri });
      const privateKey = await keyManager.exportKey({ keyUri });

      // Add the `enc` key use property.
      privateKey.use = 'enc';
      publicKey.use = 'enc';

      // Swap the keys in the key set with the newly generated secp256k1 keys.
      keySet.verificationMethods![0].privateKeyJwk = privateKey;
      keySet.verificationMethods![0].publicKeyJwk = publicKey;

      // Create the DID using the key set.
      let did = await DidJwk.fromKeys({
        keyManager,
        verificationMethods: keySet.verificationMethods!
      });

      // Verrify the DID document does not contain any verification relationships other than
      // `keyAgreement`.
      expect(did.didDocument).to.have.property('keyAgreement');
      expect(did.didDocument).to.not.have.property('assertionMethod');
      expect(did.didDocument).to.not.have.property('authentication');
      expect(did.didDocument).to.not.have.property('capabilityDelegation');
      expect(did.didDocument).to.not.have.property('capabilityInvocation');
    });

    it('throws an error if no verification methods are given', async () => {
      try {
        await DidJwk.fromKeys({});
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('one verification method');
      }
    });

    it('throws an error if the given key set is empty', async () => {
      try {
        await DidJwk.fromKeys({ verificationMethods: [] });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('one verification method');
      }
    });

    it('throws an error if the given key set is missing a public key', async () => {
      delete keySet.verificationMethods![0].publicKeyJwk;

      try {
        await DidJwk.fromKeys(keySet);
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('does not contain a public and private key');
      }
    });

    it('throws an error if the given key set is missing a private key', async () => {
      delete keySet.verificationMethods![0].privateKeyJwk;

      try {
        await DidJwk.fromKeys(keySet);
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('does not contain a public and private key');
      }
    });

    it('throws an error if the key set contains two or more keys', async () => {
      const verificationMethod: DidKeySetVerificationMethod = {
        publicKeyJwk: {
          kty : 'OKP',
          crv : 'Ed25519',
          x   : '3EBa_ELos2alvLojqIVcrbKpirVXj6cjVD5v2VhwLz8'
        },
        privateKeyJwk: {
          kty : 'OKP',
          crv : 'Ed25519',
          x   : '3EBa_ELos2alvLojqIVcrbKpirVXj6cjVD5v2VhwLz8',
          d   : 'hMqv-FAvhVWz2nxobesO7TzI0-GN0kvzkUGYdnZt_TA'
        },
        purposes: ['authentication']
      };

      try {
        await DidJwk.fromKeys({
          verificationMethods: [verificationMethod, verificationMethod]
        });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('one verification method');
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
        expect(error.message).to.equal('Method not supported: example');
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

  describe('toKeys()', () => {
    it('returns a single verification method for a DID', async () => {
      // Create a DID to use for the test.
      const did = await DidJwk.create();

      const keySet = await DidJwk.toKeys({ did });

      expect(keySet).to.have.property('verificationMethods');
      expect(keySet.verificationMethods).to.have.length(1);
      expect(keySet.verificationMethods![0]).to.have.property('publicKeyJwk');
      expect(keySet.verificationMethods![0]).to.have.property('privateKeyJwk');
      expect(keySet.verificationMethods![0]).to.have.property('purposes');
      expect(keySet.verificationMethods![0]).to.have.property('type');
      expect(keySet.verificationMethods![0]).to.have.property('id');
      expect(keySet.verificationMethods![0]).to.have.property('controller');
    });
  });

  describe('Web5TestVectorsDidJwk', () => {
    it('resolve', async () => {
      type TestVector = {
        description: string;
        input: Parameters<typeof DidJwk.resolve>[0];
        output: UnwrapPromise<ReturnType<typeof DidJwk.resolve>>;
        errors: boolean;
      };

      for (const vector of DidJwkResolveTestVector.vectors as unknown as TestVector[]) {
        const didResolutionResult = await DidJwk.resolve(vector.input);

        expect(didResolutionResult).to.deep.equal(vector.output);
      }
    });
  });
});