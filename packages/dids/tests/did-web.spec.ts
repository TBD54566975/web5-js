import * as sinon from 'sinon';
import { DidWebMethod } from '../src/did-web.js';
import { expect } from 'chai';

import DidWebResolveTestVector from '../../../test-vectors/did_web/resolve.json' assert { type: 'json' };

describe('DidWebMethod', () => {
  describe('create()', () => {
    it('creates a DID with Ed25519 keys, by default', async () => {
      const portableDid = await DidWebMethod.create({ didWebId: 'did:web:example.com'});

      // Verify expected result.
      expect(portableDid).to.have.property('did', 'did:web:example.com');
      expect(portableDid).to.have.property('document');
      expect(portableDid.document).to.have.property('id', 'did:web:example.com');
      expect(portableDid).to.have.property('keySet');
      expect(portableDid.keySet).to.have.property('verificationMethodKeys');
      expect(portableDid.keySet.verificationMethodKeys).to.have.length(1);
      expect(portableDid.keySet.verificationMethodKeys?.[0]).to.have.property('publicKeyJwk');
      expect(portableDid.keySet.verificationMethodKeys?.[0]).to.have.property('privateKeyJwk');
      expect(portableDid.keySet.verificationMethodKeys?.[0].publicKeyJwk).to.have.property('alg', 'EdDSA');
      expect(portableDid.keySet.verificationMethodKeys?.[0].publicKeyJwk).to.have.property('crv', 'Ed25519');
    });

    it('creates a DID with secp256k1 keys, if specified', async () => {
      const portableDid = await DidWebMethod.create({ didWebId: 'did:web:example.com', keyAlgorithm: 'secp256k1' });

      // Verify expected result.
      expect(portableDid).to.have.property('did', 'did:web:example.com');
      expect(portableDid).to.have.property('document');
      expect(portableDid.document).to.have.property('id', 'did:web:example.com');
      expect(portableDid).to.have.property('keySet');
      expect(portableDid.keySet).to.have.property('verificationMethodKeys');
      expect(portableDid.keySet.verificationMethodKeys).to.have.length(1);
      expect(portableDid.keySet.verificationMethodKeys?.[0]).to.have.property('publicKeyJwk');
      expect(portableDid.keySet.verificationMethodKeys?.[0]).to.have.property('privateKeyJwk');
      expect(portableDid.keySet.verificationMethodKeys?.[0].publicKeyJwk).to.have.property('alg', 'ES256K');
      expect(portableDid.keySet.verificationMethodKeys?.[0].publicKeyJwk).to.have.property('crv', 'secp256k1');
    });

    it('resolves a simple did:web', async () => {
      // Setup stub so that a mocked response is returned rather than calling over the network.
      const didUrl = 'did:web:example.com';
      const didDocMockResult = { id: 'did-doc-id' };
      const expectedResult = {
        '@context'            : 'https://w3id.org/did-resolution/v1',
        didDocument           : didDocMockResult,
        didDocumentMetadata   : {},
        didResolutionMetadata : {
          did: {
            didString        : 'did:web:example.com',
            methodSpecificId : 'example.com',
            method           : 'web'
          }
        }
      };

      const fetchStub = sinon.stub(global, 'fetch');
      // @ts-expect-error because we're only mocking ok and json() from global.fetch().
      fetchStub.returns(Promise.resolve({
        ok   : true,
        json : () => Promise.resolve(didDocMockResult)
      }));

      const resolutionResult = await DidWebMethod.resolve({didUrl: didUrl});
      fetchStub.restore();

      expect(resolutionResult).to.deep.equal(expectedResult);
      expect(fetchStub.calledOnceWith(
        'https://example.com/.well-known/did.json'
      )).to.be.true;
    });


    // it('resolves a real linkedin did:web', async () => {
    //   const didUrl = 'did:web:www.linkedin.com';

    //   const resolutionResult = await DidWebMethod.resolve({didUrl: didUrl});
    //   expect(resolutionResult.didDocument).to.have.property('id', 'did:web:www.linkedin.com');

    //   expect(JSON.stringify(resolutionResult)).to.deep.equal(JSON.stringify({'@context': 'https://w3id.org/did-resolution/v1','didDocument': {'id': 'did:web:www.linkedin.com','@context': ['https://www.w3.org/ns/did/v1',{'@base': 'did:web:www.linkedin.com'}],'service': [{'id': '#linkeddomains','type': 'LinkedDomains','serviceEndpoint': {'origins': ['https://www.linkedin.com/']}},{'id': '#hub','type': 'IdentityHub','serviceEndpoint': {'instances': ['https://hub.did.msidentity.com/v1.0/658728e7-1632-412a-9815-fe53f53ec58b']}}],'verificationMethod': [{'id': '#074cfbf193f046bcba5841ac4751e91bvcSigningKey-46682','controller': 'did:web:www.linkedin.com','type': 'EcdsaSecp256k1VerificationKey2019','publicKeyJwk': {'crv': 'secp256k1','kty': 'EC','x': 'NHIQivVR0HX7c0flpxgWQ7vRtbWDvr0UPN1nJ--0lyU','y': 'hYiIldgLRShym7vzflFrEkg6NYkayUHkDpV0RMjUEYE'}}],'authentication': ['#074cfbf193f046bcba5841ac4751e91bvcSigningKey-46682'],'assertionMethod': ['#074cfbf193f046bcba5841ac4751e91bvcSigningKey-46682']},'didDocumentMetadata': {},'didResolutionMetadata': {'did': {'didString': 'did:web:www.linkedin.com','methodSpecificId': 'www.linkedin.com','method': 'web'}}}));
    // });
  });

  describe('createDocument()', () => {
    it('accepts an alternate default context', async () => {

      const keySet = await DidWebMethod.generateKeySet({ keyAlgorithm: 'Ed25519' });

      const didDocument = await DidWebMethod.createDocument({
        did             : 'did:web:example.com',
        keySet          : keySet,
        defaultContext  : 'https://www.w3.org/ns/did/v99',
        publicKeyFormat : 'JsonWebKey2020'
      });

      expect(didDocument['@context']).to.include('https://www.w3.org/ns/did/v99');
    });
  });

  describe('Web5TestVectorsDidWeb', () => {
    it('resolve', async () => {
      const vectors = DidWebResolveTestVector.vectors;

      for (const vector of vectors) {
        const { input, errors, output } = vector;

        if (errors) {
          const resolutionResult = await DidWebMethod.resolve({ didUrl: input.didUri });
          expect(resolutionResult.didResolutionMetadata.error).to.deep.equal(output.didResolutionMetadata.error);
        } else {
          const didUrl = input.didUri;

          const fetchStub = sinon.stub(global, 'fetch');

          // @ts-expect-error because we're only mocking ok and json() from global.fetch().
          fetchStub.returns(Promise.resolve({
            ok   : true,
            json : () => Promise.resolve(output.didDocument)
          }));

          const resolutionResult = await DidWebMethod.resolve({ didUrl: didUrl });
          fetchStub.restore();

          expect(resolutionResult.didDocument).to.deep.equal(output.didDocument);
          expect(fetchStub.calledOnceWith(Object.keys(input.mockServer)[0])).to.be.true;
        }
      }
    });
  });
});