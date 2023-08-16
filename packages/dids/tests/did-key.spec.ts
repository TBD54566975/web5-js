import { expect } from 'chai';

import type { DidKeyCreateOptions, DidKeyCreateDocumentOptions } from '../src/did-key.js';

import { DidKeyMethod } from '../src/did-key.js';
import { didKeyCreateTestVectors, didKeyCreateDocumentTestVectors, } from './fixtures/test-vectors/did-key.js';
import { DidDocument } from '../src/types.js';

describe('DidKeyMethod', () => {
  describe('create()', () => {
    it('creates a DID with Ed25519 keys, by default', async () => {
      const portableDid = await DidKeyMethod.create();

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
      const portableDid = await DidKeyMethod.create({ keyAlgorithm: 'secp256k1' });

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

    for (const vector of didKeyCreateTestVectors ) {
      it(`passes test vector ${vector.id}`, async () => {
        const portableDid = await DidKeyMethod.create(vector.input as DidKeyCreateOptions);

        expect(portableDid).to.deep.equal(vector.output);
      });
    }
  });

  describe('createDocument()', () => {
    it('accepts an alternate default context', async () => {
      const didDocument = await DidKeyMethod.createDocument({
        did             : 'did:key:z6MkjVM3rLLh9KCFBfKPNA5oEBq6KXXsPu72FDX7cZzYJN3y',
        defaultContext  : 'https://www.w3.org/ns/did/v99',
        publicKeyFormat : 'JsonWebKey2020'
      });

      expect(didDocument['@context']).to.include('https://www.w3.org/ns/did/v99');
    });

    for (const vector of didKeyCreateDocumentTestVectors ) {
      it(`passes test vector ${vector.id}`, async () => {
        const didDocument = await DidKeyMethod.createDocument(vector.input as DidKeyCreateDocumentOptions);
        expect(didDocument).to.deep.equal(vector.output);
      });
    }
  });

  describe('getDefaultSigningKey()', () => {
    it('returns the did:key default signing key, when present', async () => {
      const partialDidDocument = {
        authentication: [
          'did:key:z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk#z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk'
        ]
      } as unknown as DidDocument;

      const defaultSigningKeyId = await DidKeyMethod.getDefaultSigningKey({
        didDocument: partialDidDocument
      });

      expect(defaultSigningKeyId).to.equal('did:key:z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk#z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk');
    });

    it('returns undefined if the did:key default signing key is not present', async () => {
      const partialDidDocument = {
        authentication: [{
          id           : 'did:key:z6LSgmjjYTAffdKWLmBbYxe5d5fgLzuZxi6PEbHZNt3Cifvg#z6LSgmjjYTAffdKWLmBbYxe5d5fgLzuZxi6PEbHZNt3Cifvg',
          type         : 'JsonWebKey2020',
          controller   : 'did:key:z6LSgmjjYTAffdKWLmBbYxe5d5fgLzuZxi6PEbHZNt3Cifvg',
          publicKeyJwk : {
            kty : 'OKP',
            crv : 'X25519',
            x   : 'S7cqN2_-PIPK6fVjR6PrQ1YZyyw61ajVnAJClFcXVhk'
          }
        }],
        keyAgreement: [
          'did:key:z6LSqCkip7X19obTwRpWc8ZLLCiXLzVQBFpcBAsTW38m6Rzs#z6LSqCkip7X19obTwRpWc8ZLLCiXLzVQBFpcBAsTW38m6Rzs'
        ]
      } as unknown as DidDocument;

      const defaultSigningKeyId = await DidKeyMethod.getDefaultSigningKey({
        didDocument: partialDidDocument
      });

      expect(defaultSigningKeyId).to.be.undefined;
    });
  });
});