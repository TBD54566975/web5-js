import type { PublicKeyJwk } from '@web5/crypto';

import { expect } from 'chai';

import type { DidJwkCreateOptions } from '../src/did-jwk.js';
import type { DidDocument, PortableDid } from '../src/types.js';

import { DidJwkMethod } from '../src/did-jwk.js';
import { DidResolver } from '../src/did-resolver.js';
import { didJwkCreateTestVectors, didJwkResolveTestVectors } from './fixtures/test-vectors/did-jwk.js';

describe('DidJwkMethod', () => {
  describe('create()', () => {
    it('creates a DID with Ed25519 keys, by default', async () => {
      const portableDid = await DidJwkMethod.create();

      // Verify expected result.
      expect(portableDid).to.have.property('did');
      expect(portableDid).to.have.property('document');
      expect(portableDid).to.have.property('keySet');
      expect(portableDid.keySet).to.have.property('verificationMethodKeys');
      expect(portableDid.keySet.verificationMethodKeys).to.have.length(1);
      expect(portableDid.keySet.verificationMethodKeys?.[0]).to.have.property('publicKeyJwk');
      expect(portableDid.keySet.verificationMethodKeys?.[0]).to.have.property('privateKeyJwk');
      expect(portableDid.keySet.verificationMethodKeys?.[0].publicKeyJwk).to.have.property('alg', 'EdDSA');
      expect(portableDid.keySet.verificationMethodKeys?.[0].publicKeyJwk).to.have.property('crv', 'Ed25519');
    });

    it('creates a DID with secp256k1 keys, if specified', async () => {
      const portableDid = await DidJwkMethod.create({ keyAlgorithm: 'secp256k1' });

      // Verify expected result.
      expect(portableDid).to.have.property('did');
      expect(portableDid).to.have.property('document');
      expect(portableDid).to.have.property('keySet');
      expect(portableDid.keySet).to.have.property('verificationMethodKeys');
      expect(portableDid.keySet.verificationMethodKeys).to.have.length(1);
      expect(portableDid.keySet.verificationMethodKeys?.[0]).to.have.property('publicKeyJwk');
      expect(portableDid.keySet.verificationMethodKeys?.[0]).to.have.property('privateKeyJwk');
      expect(portableDid.keySet.verificationMethodKeys?.[0].publicKeyJwk).to.have.property('alg', 'ES256K');
      expect(portableDid.keySet.verificationMethodKeys?.[0].publicKeyJwk).to.have.property('crv', 'secp256k1');
    });

    it('creates a DID with X25519 keys, if specified', async () => {
      const portableDid = await DidJwkMethod.create({ keyAlgorithm: 'X25519' });

      // Verify expected result.
      expect(portableDid).to.have.property('did');
      expect(portableDid).to.have.property('document');
      expect(portableDid).to.have.property('keySet');
      expect(portableDid.keySet).to.have.property('verificationMethodKeys');
      expect(portableDid.keySet.verificationMethodKeys).to.have.length(1);
      expect(portableDid.keySet.verificationMethodKeys?.[0]).to.have.property('publicKeyJwk');
      expect(portableDid.keySet.verificationMethodKeys?.[0]).to.have.property('privateKeyJwk');
      expect(portableDid.keySet.verificationMethodKeys?.[0].publicKeyJwk).to.not.have.property('alg');
      expect(portableDid.keySet.verificationMethodKeys?.[0].publicKeyJwk).to.have.property('crv', 'X25519');
    });

    it(`does not include the 'keyAgreement' relationship for Ed25519 and secp256k1 keys`, async () => {
      let portableDid: PortableDid;

      // Verify for Ed25519.
      portableDid = await DidJwkMethod.create({ keyAlgorithm: 'Ed25519' });
      expect(portableDid.document).to.not.have.property('keyAgreement');

      // Verify for secp256k1.
      portableDid = await DidJwkMethod.create({ keyAlgorithm: 'secp256k1' });
      expect(portableDid.document).to.not.have.property('keyAgreement');
    });

    it(`only specifies 'keyAgreement' relationship for X25519 keys`, async () => {
      const portableDid = await DidJwkMethod.create({ keyAlgorithm: 'X25519' });

      expect(portableDid.document).to.have.property('keyAgreement');
      expect(portableDid.document).to.not.have.property('assertionMethod');
      expect(portableDid.document).to.not.have.property('authentication');
      expect(portableDid.document).to.not.have.property('capabilityDelegation');
      expect(portableDid.document).to.not.have.property('capabilityInvocation');
    });

    it('throws an error if no public key is found', async () => {
      await expect(DidJwkMethod.create({ keySet: {} })).to.be.rejectedWith('Failed to create DID with given input.');
    });

    for (const vector of didJwkCreateTestVectors ) {
      it(`passes test vector ${vector.id}`, async () => {
        const portableDid = await DidJwkMethod.create(vector.input as DidJwkCreateOptions);

        expect(portableDid.did).to.deep.equal(vector.output.did);
        expect(portableDid.document).to.deep.equal(vector.output.document);
        expect(portableDid.keySet).to.deep.equal(vector.output.keySet);
      });
    }
  });

  describe('createDocument()', () => {
    it('creates a DidDocument from a public key', async () => {
      const publicKeyJwk: PublicKeyJwk = {
        alg     : 'EdDSA',
        crv     : 'Ed25519',
        kty     : 'OKP',
        ext     : 'true',
        key_ops : [ 'verify' ],
        x       : 'Tg1q17C1km4-YYDg-1z5JB_hbvc2vapyXihGi1dxZ7s',
        use     : 'sig'
      };
      const document = await DidJwkMethod.createDocument({ publicKeyJwk });

      expect(document).to.have.property('id');
      expect(document).to.have.property('verificationMethod');
      expect(document).to.have.property('authentication');
    });
  });

  describe('decodeJwk()', () => {
    it('decodes a didUrl to a public key JWK', async () => {
      const portableDid = await DidJwkMethod.create();
      const publicKeyJwk = await DidJwkMethod.decodeJwk({ didUrl: portableDid.did });

      expect(publicKeyJwk).to.be.an('object');
      expect(publicKeyJwk).to.have.property('alg');
      expect(publicKeyJwk).to.have.property('crv');
      expect(publicKeyJwk).to.have.property('kty');
      expect(publicKeyJwk).to.have.property('use');
      expect(publicKeyJwk).to.have.property('x');
    });

    it('throws an error for invalid didUrl', async () => {
      await expect(DidJwkMethod.decodeJwk({ didUrl: 'invalid' })).to.be.rejectedWith('Unable to decode DID: invalid');
    });
  });

  describe('encodeJwk()', () => {
    it('encodes a PublicKeyJwk to a DID string', async () => {
      const { keySet } = await DidJwkMethod.create();
      const publicKeyJwk = keySet.verificationMethodKeys?.[0]?.publicKeyJwk;
      const did = await DidJwkMethod.encodeJwk({ publicKeyJwk });
      expect(did).to.be.a('string').and.to.match(/^did:jwk:/);
    });

    it('throws an error for invalid JWK', async () => {
      const circularReference: any = {};
      circularReference.self = circularReference;
      await expect(DidJwkMethod.encodeJwk({ publicKeyJwk: circularReference })).to.be.rejectedWith('Unable to encode JWK');
    });
  });

  describe('generateKeySet()', () => {
    it('generates a DidJwkKeySet with default algorithm', async () => {
      const keySet = await DidJwkMethod.generateKeySet();
      expect(keySet).to.have.property('verificationMethodKeys');
      expect(keySet.verificationMethodKeys?.[0]).to.have.property('publicKeyJwk');
      expect(keySet.verificationMethodKeys?.[0]).to.have.property('privateKeyJwk');
    });

    it('throws an error for unsupported algorithm', async () => {
      await expect(DidJwkMethod.generateKeySet({ keyAlgorithm: 'unsupported' as any })).to.be.rejectedWith('Unsupported crypto algorithm');
    });
  });

  describe('getDefaultSigningKey()', () => {
    it('should return the default signing key ID constructed from the DID document ID', async () => {
      const didDocument: DidDocument = {
        id: 'did:jwk:example',
        // ... other properties
      };
      const expectedSigningKeyId = 'did:jwk:example#0';

      const signingKeyId = await DidJwkMethod.getDefaultSigningKey({ didDocument });

      expect(signingKeyId).to.equal(expectedSigningKeyId);
    });
  });

  describe('resolve()', () => {
    it('resolves a didUrl to a DidResolutionResult', async () => {
      const portableDid = await DidJwkMethod.create();
      const result = await DidJwkMethod.resolve({ didUrl: portableDid.did });
      expect(result).to.have.property('didDocument');
      expect(result).to.have.property('didResolutionMetadata').which.has.property('did');
    });

    it('resolves to alternate DID identifier but matching JWK due to canonicalization', async () => {
      const didResolutionResult = await DidJwkMethod.resolve({ didUrl: 'did:jwk:eyJrdHkiOiJPS1AiLCJjcnYiOiJYMjU1MTkiLCJ1c2UiOiJlbmMiLCJ4IjoiM3A3YmZYdDl3YlRUVzJIQzdPUTFOei1EUThoYmVHZE5yZngtRkctSUswOCJ9' });

      // JWK should match the did:jwk spec test vector.
      expect(didResolutionResult.didDocument.verificationMethod?.[0].publicKeyJwk).to.deep.equal({
        crv : 'X25519',
        kty : 'OKP',
        use : 'enc',
        x   : '3p7bfXt9wbTTW2HC7OQ1Nz-DQ8hbeGdNrfx-FG-IK08'
      });

      // But the DID identifier should be different due to canonicalization.
      expect(didResolutionResult.didDocument.id).to.not.equal('did:jwk:eyJrdHkiOiJPS1AiLCJjcnYiOiJYMjU1MTkiLCJ1c2UiOiJlbmMiLCJ4IjoiM3A3YmZYdDl3YlRUVzJIQzdPUTFOei1EUThoYmVHZE5yZngtRkctSUswOCJ9');
      expect(didResolutionResult.didDocument.id).to.equal('did:jwk:eyJjcnYiOiJYMjU1MTkiLCJrdHkiOiJPS1AiLCJ1c2UiOiJlbmMiLCJ4IjoiM3A3YmZYdDl3YlRUVzJIQzdPUTFOei1EUThoYmVHZE5yZngtRkctSUswOCJ9');
    });

    it('returns an error for invalid didUrl', async () => {
      const result = await DidJwkMethod.resolve({ didUrl: 'invalid' });
      expect(result).to.have.property('didResolutionMetadata').which.has.property('error', 'invalidDid');
    });

    it('returns an error for unsupported method', async () => {
      const result = await DidJwkMethod.resolve({ didUrl: 'did:unsupported:xyz' });
      expect(result).to.have.property('didResolutionMetadata').which.has.property('error', 'methodNotSupported');
    });

    for (const vector of didJwkResolveTestVectors ) {
      it(`passes test vector ${vector.id}`, async () => {
        const didResolutionResult = await DidJwkMethod.resolve(vector.input);

        expect(didResolutionResult).to.deep.equal(vector.output);
      });
    }
  });

  describe('Integration with DidResolver', () => {
    it('DidResolver resolves a did:jwk DID', async () => {
      // Create a DID using the DidJwkMethod.
      const { did, document: createdDocument } = await DidJwkMethod.create();

      // Instantiate a DidResolver with the DidJwkMethod.
      const didResolver = new DidResolver({ didResolvers: [DidJwkMethod] });

      // Resolve the DID using the DidResolver.
      const { didDocument: resolvedDocument } = await didResolver.resolve(did);

      // Verify that the resolved document matches the created document.
      expect(resolvedDocument).to.deep.equal(createdDocument);
    });
  });
});