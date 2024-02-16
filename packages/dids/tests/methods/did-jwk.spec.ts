import type { Jwk } from '@web5/crypto';
import type { UnwrapPromise } from '@web5/common';

import { expect } from 'chai';
import { LocalKeyManager } from '@web5/crypto';

import type { DidDocument } from '../../src/types/did-core.js';
import type { PortableDid } from '../../src/types/portable-did.js';

import { DidErrorCode } from '../../src/did-error.js';
import { DidJwk } from '../../src/methods/did-jwk.js';
import DidJwkResolveTestVector from '../../../../web5-spec/test-vectors/did_jwk/resolve.json' assert { type: 'json' };

describe('DidJwk', () => {
  let keyManager: LocalKeyManager;

  before(() => {
    keyManager = new LocalKeyManager();
  });

  describe('create()', () => {
    it('creates a did:jwk DID', async () => {
      const did = await DidJwk.create({ keyManager, options: { algorithm: 'secp256k1' } });

      expect(did).to.have.property('document');
      expect(did).to.have.property('getSigner');
      expect(did).to.have.property('keyManager');
      expect(did).to.have.property('metadata');
      expect(did).to.have.property('uri');
      expect(did.uri.startsWith('did:jwk:')).to.be.true;
      expect(did.document.verificationMethod).to.have.length(1);
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
      const did = await DidJwk.create({ keyManager, options: { algorithm: 'secp256k1' } });

      // Retrieve the public key from the key manager.
      const keyUri = await keyManager.getKeyUri({ key: did.document.verificationMethod![0]!.publicKeyJwk! });
      const publicKey = await keyManager.getPublicKey({ keyUri });

      // Verify the public key is an secp256k1 key.
      expect(publicKey).to.have.property('crv', 'secp256k1');
    });

    it('creates a DID using the verificationMethods algorithm property, if given', async () => {
      const did = await DidJwk.create({ keyManager, options: { verificationMethods: [{ algorithm: 'secp256k1' }] } });

      // Retrieve the public key from the key manager.
      const keyUri = await keyManager.getKeyUri({ key: did.document.verificationMethod![0]!.publicKeyJwk! });
      const publicKey = await keyManager.getPublicKey({ keyUri });

      // Verify the public key is an secp256k1 key.
      expect(publicKey).to.have.property('crv', 'secp256k1');
    });

    it('creates a DID with an Ed25519 key, by default', async () => {
      const did = await DidJwk.create({ keyManager });

      // Retrieve the public key from the key manager.
      const keyUri = await keyManager.getKeyUri({ key: did.document.verificationMethod![0]!.publicKeyJwk! });
      const publicKey = await keyManager.getPublicKey({ keyUri });

      // Verify the public key is an Ed25519 key.
      expect(publicKey).to.have.property('crv', 'Ed25519');
    });

    it('creates a DID using any signature algorithm supported by the provided KMS', async () => {
      expect(
        await DidJwk.create({ keyManager, options: { algorithm: 'secp256k1' } })
      ).to.have.property('uri');

      expect(
        await DidJwk.create({ keyManager, options: { algorithm: 'Ed25519' } })
      ).to.have.property('uri');
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

    it('throws an error if zero verificationMethods are given', async () => {
      try {
        await DidJwk.create({ keyManager, options: { verificationMethods: [] } });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('must contain exactly one entry');
      }
    });

    it('throws an error if two or more verificationMethods are given', async () => {
      try {
        await DidJwk.create({
          keyManager,
          options: { verificationMethods: [{ algorithm: 'secp256k1' }, { algorithm: 'Ed25519' }] }
        });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('must contain exactly one entry');
      }
    });
  });

  describe('export()', () => {
    it('returns a single verification method for a DID', async () => {
      // Create a DID to use for the test.
      const did = await DidJwk.create();

      const portableDid = await did.export();

      expect(portableDid.document).to.have.property('verificationMethod');
      expect(portableDid.document.verificationMethod).to.have.length(1);
      expect(portableDid.document.verificationMethod![0]).to.have.property('publicKeyJwk');
      expect(portableDid.document.verificationMethod![0]).to.have.property('type');
      expect(portableDid.document.verificationMethod![0]).to.have.property('id');
      expect(portableDid.document.verificationMethod![0]).to.have.property('controller');
      expect(portableDid.privateKeys).to.have.length(1);
      expect(portableDid.privateKeys![0]).to.have.property('crv');
      expect(portableDid.privateKeys![0]).to.have.property('x');
      expect(portableDid.privateKeys![0]).to.have.property('d');
    });
  });

  describe('getSigningMethod()', () => {
    it('returns the signing method for a DID', async () => {
      // Create a DID to use for the test.
      const did = await DidJwk.create();

      const signingMethod = await DidJwk.getSigningMethod({ didDocument: did.document });

      expect(signingMethod).to.have.property('publicKeyJwk');
      expect(signingMethod).to.have.property('type', 'JsonWebKey2020');
      expect(signingMethod).to.have.property('id', `${did.uri}#0`);
      expect(signingMethod).to.have.property('controller', did.uri);
    });

    it('throws an error if the DID document is missing verification methods', async function () {
      try {
        await DidJwk.getSigningMethod({
          didDocument: { id: 'did:jwk:123' }
        });
        expect.fail('Error should have been thrown');
      } catch (error: any) {
        expect(error.message).to.include('verification method intended for signing could not be determined');
      }
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

  describe('import()', () => {
    let portableDid: PortableDid;

    beforeEach(() => {
      // Define a DID to use for the test.
      portableDid = {
        uri      : 'did:jwk:eyJjcnYiOiJFZDI1NTE5Iiwia3R5IjoiT0tQIiwieCI6Im80MHNoWnJzY28tQ2ZFcWs2bUZzWGZjUDk0bHkzQXozZ204NFB6QVVzWG8iLCJraWQiOiJCRHAweGltODJHc3dseG5QVjhUUHRCZFV3ODB3a0dJRjhnakZidzF4NWlRIiwiYWxnIjoiRWREU0EifQ',
        document : {
          '@context': [
            'https://www.w3.org/ns/did/v1',
            'https://w3id.org/security/suites/jws-2020/v1',
          ],
          id                 : 'did:jwk:eyJjcnYiOiJFZDI1NTE5Iiwia3R5IjoiT0tQIiwieCI6Im80MHNoWnJzY28tQ2ZFcWs2bUZzWGZjUDk0bHkzQXozZ204NFB6QVVzWG8iLCJraWQiOiJCRHAweGltODJHc3dseG5QVjhUUHRCZFV3ODB3a0dJRjhnakZidzF4NWlRIiwiYWxnIjoiRWREU0EifQ',
          verificationMethod : [
            {
              id           : 'did:jwk:eyJjcnYiOiJFZDI1NTE5Iiwia3R5IjoiT0tQIiwieCI6Im80MHNoWnJzY28tQ2ZFcWs2bUZzWGZjUDk0bHkzQXozZ204NFB6QVVzWG8iLCJraWQiOiJCRHAweGltODJHc3dseG5QVjhUUHRCZFV3ODB3a0dJRjhnakZidzF4NWlRIiwiYWxnIjoiRWREU0EifQ#0',
              type         : 'JsonWebKey2020',
              controller   : 'did:jwk:eyJjcnYiOiJFZDI1NTE5Iiwia3R5IjoiT0tQIiwieCI6Im80MHNoWnJzY28tQ2ZFcWs2bUZzWGZjUDk0bHkzQXozZ204NFB6QVVzWG8iLCJraWQiOiJCRHAweGltODJHc3dseG5QVjhUUHRCZFV3ODB3a0dJRjhnakZidzF4NWlRIiwiYWxnIjoiRWREU0EifQ',
              publicKeyJwk : {
                crv : 'Ed25519',
                kty : 'OKP',
                x   : 'o40shZrsco-CfEqk6mFsXfcP94ly3Az3gm84PzAUsXo',
                kid : 'BDp0xim82GswlxnPV8TPtBdUw80wkGIF8gjFbw1x5iQ',
                alg : 'EdDSA',
              },
            },
          ],
          authentication: [
            'did:jwk:eyJjcnYiOiJFZDI1NTE5Iiwia3R5IjoiT0tQIiwieCI6Im80MHNoWnJzY28tQ2ZFcWs2bUZzWGZjUDk0bHkzQXozZ204NFB6QVVzWG8iLCJraWQiOiJCRHAweGltODJHc3dseG5QVjhUUHRCZFV3ODB3a0dJRjhnakZidzF4NWlRIiwiYWxnIjoiRWREU0EifQ#0',
          ],
          assertionMethod: [
            'did:jwk:eyJjcnYiOiJFZDI1NTE5Iiwia3R5IjoiT0tQIiwieCI6Im80MHNoWnJzY28tQ2ZFcWs2bUZzWGZjUDk0bHkzQXozZ204NFB6QVVzWG8iLCJraWQiOiJCRHAweGltODJHc3dseG5QVjhUUHRCZFV3ODB3a0dJRjhnakZidzF4NWlRIiwiYWxnIjoiRWREU0EifQ#0',
          ],
          capabilityInvocation: [
            'did:jwk:eyJjcnYiOiJFZDI1NTE5Iiwia3R5IjoiT0tQIiwieCI6Im80MHNoWnJzY28tQ2ZFcWs2bUZzWGZjUDk0bHkzQXozZ204NFB6QVVzWG8iLCJraWQiOiJCRHAweGltODJHc3dseG5QVjhUUHRCZFV3ODB3a0dJRjhnakZidzF4NWlRIiwiYWxnIjoiRWREU0EifQ#0',
          ],
          capabilityDelegation: [
            'did:jwk:eyJjcnYiOiJFZDI1NTE5Iiwia3R5IjoiT0tQIiwieCI6Im80MHNoWnJzY28tQ2ZFcWs2bUZzWGZjUDk0bHkzQXozZ204NFB6QVVzWG8iLCJraWQiOiJCRHAweGltODJHc3dseG5QVjhUUHRCZFV3ODB3a0dJRjhnakZidzF4NWlRIiwiYWxnIjoiRWREU0EifQ#0',
          ],
          keyAgreement: [
            'did:jwk:eyJjcnYiOiJFZDI1NTE5Iiwia3R5IjoiT0tQIiwieCI6Im80MHNoWnJzY28tQ2ZFcWs2bUZzWGZjUDk0bHkzQXozZ204NFB6QVVzWG8iLCJraWQiOiJCRHAweGltODJHc3dseG5QVjhUUHRCZFV3ODB3a0dJRjhnakZidzF4NWlRIiwiYWxnIjoiRWREU0EifQ#0',
          ],
        },
        metadata: {
        },
        privateKeys: [
          {
            crv : 'Ed25519',
            d   : '628WwXicdWc0BULN1JG_ybSrhwWWnz9NFwxbG09Ecr0',
            kty : 'OKP',
            x   : 'o40shZrsco-CfEqk6mFsXfcP94ly3Az3gm84PzAUsXo',
            kid : 'BDp0xim82GswlxnPV8TPtBdUw80wkGIF8gjFbw1x5iQ',
            alg : 'EdDSA',
          },
        ],
      };
    });

    it('returns a BearerDid from the given DID JWK PortableDid', async () => {
      const did = await DidJwk.import({ portableDid });

      expect(did).to.have.property('document');
      expect(did).to.have.property('getSigner');
      expect(did).to.have.property('keyManager');
      expect(did).to.have.property('metadata');
      expect(did).to.have.property('uri', portableDid.uri);
      expect(did.document).to.deep.equal(portableDid.document);
    });

    it('returns a DID with a getSigner function that can sign and verify data', async () => {
      const did = await DidJwk.import({ portableDid });
      const signer = await did.getSigner();
      const data = new Uint8Array([1, 2, 3]);
      const signature = await signer.sign({ data });
      const isValid = await signer.verify({ data, signature });

      expect(signature).to.have.length(64);
      expect(isValid).to.be.true;
    });

    it('throws an error if the DID method is not supported', async () => {
      // Change the method to something other than 'jwk'.
      portableDid.uri = 'did:unknown:abc123';

      try {
        await DidJwk.import({ portableDid });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.code).to.equal(DidErrorCode.MethodNotSupported);
        expect(error.message).to.include('Method not supported');
      }
    });

    it('throws an error if the DID method cannot be determined', async () => {
      // An unparsable DID URI.
      portableDid.uri = 'did:abc123';

      try {
        await DidJwk.import({ portableDid });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.code).to.equal(DidErrorCode.MethodNotSupported);
        expect(error.message).to.include('Method not supported');
      }
    });

    it('throws an error if the DID document contains two or more verification methods', async () => {
      // Add a second verification method to the DID document.
      portableDid.document.verificationMethod?.push(portableDid.document.verificationMethod[0]);

      try {
        await DidJwk.import({ portableDid });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.code).to.equal(DidErrorCode.InvalidDidDocument);
        expect(error.message).to.include('DID document must contain exactly one verification method');
      }
    });
  });

  describe('resolve()', () => {
    it(`does not include the 'keyAgreement' relationship when JWK use is 'sig'`, async () => {
      const didWithSigKeyUse = 'did:jwk:eyJjcnYiOiJFZDI1NTE5Iiwia3R5IjoiT0tQIiwieCI6IkMxeUttMzhGYWdLamZRblpjLVFuVEdFYm5wSXUwTE8tTGNIbXZUbE01b0UiLCJraWQiOiJ6d1RvZVFpb0NkbGROV20wZEtZNG95T1dlb1BSRzZ2UG40SW1Hb0M5ekZNIiwiYWxnIjoiRWREU0EiLCJ1c2UiOiJzaWcifQ';

      const resolutionResult = await DidJwk.resolve(didWithSigKeyUse);

      // Verify the DID document does not contain the `keyAgreement` relationship.
      expect(resolutionResult.didDocument).to.not.have.property('keyAgreement');
    });

    it(`only specifies 'keyAgreement' relationship when JWK use is 'enc'`, async () => {
      const didWithEncKeyUse = 'did:jwk:eyJrdHkiOiJFQyIsImNydiI6InNlY3AyNTZrMSIsIngiOiJCTVcwQ2lnMjBuTFozTTV5NzkxTEFuY2RyZnl6WS1qTE95UnNVU29tX1g4IiwieSI6IlVrajU4N0VJcVk4cl9jYU1zUmNOZkI4MWxjbGJPNjRmUG4yOXRHOEJWbUkiLCJraWQiOiI5Yi1oUTVlc0NiQlpKNkl5Z0hFZ0Z6T21rUkM1U2QzSlZ5R2FLS0ZGZUVFIiwiYWxnIjoiRVMyNTZLIiwidXNlIjoiZW5jIn0';

      const resolutionResult = await DidJwk.resolve(didWithEncKeyUse);

      // Verrify the DID document does not contain any verification relationships other than `keyAgreement`.
      expect(resolutionResult.didDocument).to.have.property('keyAgreement');
      expect(resolutionResult.didDocument).to.not.have.property('assertionMethod');
      expect(resolutionResult.didDocument).to.not.have.property('authentication');
      expect(resolutionResult.didDocument).to.not.have.property('capabilityDelegation');
      expect(resolutionResult.didDocument).to.not.have.property('capabilityInvocation');
    });

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