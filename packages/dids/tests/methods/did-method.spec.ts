import type { CryptoApi, Jwk } from '@web5/crypto';

import sinon from 'sinon';
import { expect } from 'chai';
import { LocalKeyManager } from '@web5/crypto';

import type { Did } from '../../src/methods/did-method.js';
import type { DidDocument, DidVerificationMethod } from '../../src/types/did-core.js';

import { DidMethod } from '../../src/methods/did-method.js';
import { DidJwk } from '../../src/methods/did-jwk.js';

class DidTest extends DidMethod {
  public static async getSigningMethod({ didDocument, methodId = '#0' }: {
    didDocument: DidDocument;
    methodId?: string;
  }): Promise<DidVerificationMethod | undefined> {
    // Attempt to find the verification method in the DID Document.
    return didDocument.verificationMethod?.find(vm => vm.id.endsWith(methodId));
  }
}

describe('DidMethod', () => {
  let keyManager: LocalKeyManager;

  before(() => {
    keyManager = new LocalKeyManager();
  });

  describe('fromKeyManager()', () => {
    it('throws an error if the DID method implementation does not provide a resolve() function', async () => {
      class DidTest extends DidMethod {}

      try {
        await DidTest.fromKeyManager({ didUri: 'did:method:example', keyManager });
        expect.fail('Error should have been thrown');
      } catch (error: any) {
        expect(error.message).to.include('must implement resolve()');
      }
    });
  });

  describe('getSigner()', () => {
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
      const signer = await DidTest.getSigner({ didDocument, keyManager: keyManagerMock });

      expect(signer).to.be.an('object');
      expect(signer).to.have.property('sign').that.is.a('function');
      expect(signer).to.have.property('verify').that.is.a('function');
    });

    it('sign function should call keyManager.sign with correct parameters', async () => {
      const signer = await DidTest.getSigner({ didDocument, keyManager: keyManagerMock });
      const dataToSign = new Uint8Array([0x00, 0x01]);

      await signer.sign({ data: dataToSign });

      expect(keyManagerMock.sign.calledOnce).to.be.true;
      expect(keyManagerMock.sign.calledWith(sinon.match({ data: dataToSign }))).to.be.true;
    });

    it('verify function should call keyManager.verify with correct parameters', async () => {
      const signer = await DidTest.getSigner({ didDocument, keyManager: keyManagerMock });
      const dataToVerify = new Uint8Array([0x00, 0x01]);
      const signature = new Uint8Array([0x01, 0x02]);

      await signer.verify({ data: dataToVerify, signature });

      expect(keyManagerMock.verify.calledOnce).to.be.true;
      expect(keyManagerMock.verify.calledWith(sinon.match({ data: dataToVerify, signature }))).to.be.true;
    });

    it('uses the provided keyUri to fetch the public key', async () => {
      const keyUri = 'some-key-uri';
      keyManagerMock.getPublicKey.withArgs({ keyUri }).resolves(publicKey);

      const signer = await DidTest.getSigner({ didDocument, keyManager: keyManagerMock, keyUri });

      expect(signer).to.be.an('object');
      expect(keyManagerMock.getPublicKey.calledWith({ keyUri })).to.be.true;
    });

    it('throws an error if the DID method implementation does not provide a getSigningMethod() function', async () => {
      class DidTest extends DidMethod {}

      try {
        await DidTest.getSigner({ didDocument, keyManager: keyManagerMock });
        expect.fail('Error should have been thrown');
      } catch (error: any) {
        expect(error.message).to.include('must implement getSigningMethod');
      }
    });

    it('throws an error if the keyUri does not match any key in the DID Document', async () => {
      const keyUri = 'nonexistent-key-uri';
      keyManagerMock.getPublicKey.withArgs({ keyUri }).resolves({ ...publicKey, x: 'def456' });

      try {
        await DidTest.getSigner({ didDocument, keyManager: keyManagerMock, keyUri });
        expect.fail('Error should have been thrown');
      } catch (error: any) {
        expect(error.message).to.include(`is not present in the provided DID Document for '${didDocument.id}'`);
      }
    });

    it('throws an error if no verification methods are found in the DID Document', async () => {
      // Example DID Document with no verification methods
      didDocument = {
        '@context'         : 'https://www.w3.org/ns/did/v1',
        id                 : 'did:test:...',
        verificationMethod : [], // Empty array indicates no verification methods
      };

      try {
        await DidTest.getSigner({ didDocument, keyManager: keyManagerMock });
        expect.fail('Error should have been thrown');
      } catch (error: any) {
        expect(error.message).to.include('No verification methods found');
      }
    });

    it('throws an error if the keys needed to create a signer are not determined', async function () {
      keyManagerMock.getKeyUri.resolves(undefined); // Resolves to undefined to simulate missing publicKey

      try {
        await DidTest.getSigner({ didDocument, keyManager: keyManagerMock });
        expect.fail('Error should have been thrown');
      } catch (error: any) {
        expect(error.message).to.include('Failed to determine the keys needed to create a signer');
      }
    });
  });

  describe('toKeys()', () => {
    let didJwk: Did;

    beforeEach(async () => {
      didJwk = {
        didDocument: {
          '@context': [
            'https://www.w3.org/ns/did/v1',
            'https://w3id.org/security/suites/jws-2020/v1',
          ],
          id                 : 'did:jwk:eyJjcnYiOiJFZDI1NTE5Iiwia3R5IjoiT0tQIiwieCI6Im0yN1d2VGVRY2hzS3NfWmZXY1dQd1FQcFRjRjJNa2M5UkpzNFpwTm9PWVkiLCJraWQiOiJvbnRkb0hSUVRxQ2RKekdfYWhzdnJGWG1MYkdMWFRrYTNTQVIweGRkNDlBIiwiYWxnIjoiRWREU0EifQ',
          verificationMethod : [
            {
              id           : 'did:jwk:eyJjcnYiOiJFZDI1NTE5Iiwia3R5IjoiT0tQIiwieCI6Im0yN1d2VGVRY2hzS3NfWmZXY1dQd1FQcFRjRjJNa2M5UkpzNFpwTm9PWVkiLCJraWQiOiJvbnRkb0hSUVRxQ2RKekdfYWhzdnJGWG1MYkdMWFRrYTNTQVIweGRkNDlBIiwiYWxnIjoiRWREU0EifQ#0',
              type         : 'JsonWebKey2020',
              controller   : 'did:jwk:eyJjcnYiOiJFZDI1NTE5Iiwia3R5IjoiT0tQIiwieCI6Im0yN1d2VGVRY2hzS3NfWmZXY1dQd1FQcFRjRjJNa2M5UkpzNFpwTm9PWVkiLCJraWQiOiJvbnRkb0hSUVRxQ2RKekdfYWhzdnJGWG1MYkdMWFRrYTNTQVIweGRkNDlBIiwiYWxnIjoiRWREU0EifQ',
              publicKeyJwk : {
                crv : 'Ed25519',
                kty : 'OKP',
                x   : 'm27WvTeQchsKs_ZfWcWPwQPpTcF2Mkc9RJs4ZpNoOYY',
                kid : 'ontdoHRQTqCdJzG_ahsvrFXmLbGLXTka3SAR0xdd49A',
                alg : 'EdDSA',
              },
            },
          ],
          authentication: [
            'did:jwk:eyJjcnYiOiJFZDI1NTE5Iiwia3R5IjoiT0tQIiwieCI6Im0yN1d2VGVRY2hzS3NfWmZXY1dQd1FQcFRjRjJNa2M5UkpzNFpwTm9PWVkiLCJraWQiOiJvbnRkb0hSUVRxQ2RKekdfYWhzdnJGWG1MYkdMWFRrYTNTQVIweGRkNDlBIiwiYWxnIjoiRWREU0EifQ#0',
          ],
          assertionMethod: [
            'did:jwk:eyJjcnYiOiJFZDI1NTE5Iiwia3R5IjoiT0tQIiwieCI6Im0yN1d2VGVRY2hzS3NfWmZXY1dQd1FQcFRjRjJNa2M5UkpzNFpwTm9PWVkiLCJraWQiOiJvbnRkb0hSUVRxQ2RKekdfYWhzdnJGWG1MYkdMWFRrYTNTQVIweGRkNDlBIiwiYWxnIjoiRWREU0EifQ#0',
          ],
          capabilityInvocation: [
            'did:jwk:eyJjcnYiOiJFZDI1NTE5Iiwia3R5IjoiT0tQIiwieCI6Im0yN1d2VGVRY2hzS3NfWmZXY1dQd1FQcFRjRjJNa2M5UkpzNFpwTm9PWVkiLCJraWQiOiJvbnRkb0hSUVRxQ2RKekdfYWhzdnJGWG1MYkdMWFRrYTNTQVIweGRkNDlBIiwiYWxnIjoiRWREU0EifQ#0',
          ],
          capabilityDelegation: [
            'did:jwk:eyJjcnYiOiJFZDI1NTE5Iiwia3R5IjoiT0tQIiwieCI6Im0yN1d2VGVRY2hzS3NfWmZXY1dQd1FQcFRjRjJNa2M5UkpzNFpwTm9PWVkiLCJraWQiOiJvbnRkb0hSUVRxQ2RKekdfYWhzdnJGWG1MYkdMWFRrYTNTQVIweGRkNDlBIiwiYWxnIjoiRWREU0EifQ#0',
          ],
          keyAgreement: [
            'did:jwk:eyJjcnYiOiJFZDI1NTE5Iiwia3R5IjoiT0tQIiwieCI6Im0yN1d2VGVRY2hzS3NfWmZXY1dQd1FQcFRjRjJNa2M5UkpzNFpwTm9PWVkiLCJraWQiOiJvbnRkb0hSUVRxQ2RKekdfYWhzdnJGWG1MYkdMWFRrYTNTQVIweGRkNDlBIiwiYWxnIjoiRWREU0EifQ#0',
          ],
        },
        getSigner : sinon.stub(),
        keyManager,
        metadata  : {},
        uri       : 'did:jwk:eyJjcnYiOiJFZDI1NTE5Iiwia3R5IjoiT0tQIiwieCI6Im0yN1d2VGVRY2hzS3NfWmZXY1dQd1FQcFRjRjJNa2M5UkpzNFpwTm9PWVkiLCJraWQiOiJvbnRkb0hSUVRxQ2RKekdfYWhzdnJGWG1MYkdMWFRrYTNTQVIweGRkNDlBIiwiYWxnIjoiRWREU0EifQ'
      };
    });

    it('returns a set of verification method keys for a DID', async () => {
      const did = await DidJwk.create();

      const keySet = await DidMethod.toKeys({ did });

      expect(keySet).to.have.property('verificationMethods');
      expect(keySet.verificationMethods).to.have.length(1);
      expect(keySet.verificationMethods![0]).to.have.property('publicKeyJwk');
      expect(keySet.verificationMethods![0]).to.have.property('privateKeyJwk');
      expect(keySet.verificationMethods![0]).to.have.property('purposes');
      expect(keySet.verificationMethods![0]).to.have.property('type');
      expect(keySet.verificationMethods![0]).to.have.property('id');
      expect(keySet.verificationMethods![0]).to.have.property('controller');
    });

    it('returns a key set with the expected key purposes', async () => {
      // Create a DID to use for the test.
      const did = await DidJwk.create();

      // Delete all verification relationships except `keyAgreement`.
      delete did.didDocument.assertionMethod;
      delete did.didDocument.authentication;
      delete did.didDocument.capabilityDelegation;
      delete did.didDocument.capabilityInvocation;

      const keySet = await DidMethod.toKeys({ did });

      expect(keySet.verificationMethods![0]).to.have.property('purposes');
      expect(keySet.verificationMethods![0].purposes).to.deep.equal(['keyAgreement']);
    });

    it('throws an error if the DID document lacks any verification methods', async () => {
      // Delete the verification method property from the DID document.
      delete didJwk.didDocument.verificationMethod;

      try {
        await DidMethod.toKeys({ did: didJwk });
        expect.fail('Error should have been thrown');
      } catch (error: any) {
        expect(error.message).to.include('missing verification methods');
      }
    });

    it('throws an error if the DID document does not contain a public key', async () => {
      // Delete the public key from the DID document.
      delete didJwk.didDocument.verificationMethod![0].publicKeyJwk;

      try {
        await DidMethod.toKeys({ did: didJwk });
        expect.fail('Error should have been thrown');
      } catch (error: any) {
        expect(error.message).to.include('does not contain a public key');
      }
    });

    it('throws an error if the key manager does not support exporting keys', async () => {
      // Create a key manager that does not support exporting keys.
      const keyManagerWithoutExport: CryptoApi = {
        digest       : sinon.stub(),
        generateKey  : sinon.stub(),
        getKeyUri    : sinon.stub(),
        getPublicKey : sinon.stub(),
        sign         : sinon.stub(),
        verify       : sinon.stub(),
      };

      // Create a DID to use for the test.
      const did: Did = {
        didDocument : { id: 'did:jwk:123' },
        keyManager  : keyManagerWithoutExport,
        getSigner   : sinon.stub(),
        metadata    : {},
        uri         : 'did:jwk:123',
      };

      try {
        await DidMethod.toKeys({ did });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('does not support exporting keys');
      }
    });
  });
});