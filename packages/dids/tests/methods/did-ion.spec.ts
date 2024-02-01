import type { Jwk } from '@web5/crypto';

import sinon from 'sinon';
import { expect } from 'chai';
import { LocalKeyManager, computeJwkThumbprint } from '@web5/crypto';

import type { DidDocument } from '../../src/types/did-core.js';

import { DidIon } from '../../src/methods/did-ion.js';
import { vectors as CreateTestVector } from '../fixtures/test-vectors/did-ion/create.js';
import { vectors as ToKeysTestVector } from '../fixtures/test-vectors/did-ion/to-keys.js';
import { vectors as ResolveTestVector } from '../fixtures/test-vectors/did-ion/resolve.js';

// Helper function to create a mocked fetch response that fails and returns a 404 Not Found.
const fetchNotFoundResponse = () => ({
  status     : 404,
  statusText : 'Not Found',
  ok         : false
});

// Helper function to create a mocked fetch response that is successful and returns the given
// response.
const fetchOkResponse = (response?: any) => ({
  status     : 200,
  statusText : 'OK',
  ok         : true,
  json       : async () => Promise.resolve(response)
});

const ION_OPERATIONS_ENDPOINT = 'https://ion.tbd.engineering/operations';
const ION_RESOLUTION_ENDPOINT = 'https://ion.tbd.engineering/identifiers';

describe('DidIon', () => {
  let fetchStub: sinon.SinonStub;

  beforeEach(() => {
    // Setup stub so that a mocked response is returned rather than calling over the network.
    fetchStub = sinon.stub(globalThis as any, 'fetch');
  });

  afterEach(() => {
    fetchStub.restore();
  });

  describe('create', () => {
    it('creates a DID with one verification method, by default', async () => {
      fetchStub.callsFake((url: string) => {
        if (url.startsWith(ION_RESOLUTION_ENDPOINT)) {
          return Promise.resolve(fetchOkResponse(CreateTestVector.oneMethodNoServices.didResolutionResult));
        } else if (url.startsWith(ION_OPERATIONS_ENDPOINT)) {
          return Promise.resolve(fetchOkResponse());
        }
      });

      const did = await DidIon.create();

      expect(did).to.have.property('didDocument');
      expect(did).to.have.property('getSigner');
      expect(did).to.have.property('keyManager');
      expect(did).to.have.property('metadata');
      expect(did).to.have.property('uri');

      expect(fetchStub.calledTwice).to.be.true;

      expect(did.didDocument).to.have.property('verificationMethod');
      expect(did.didDocument.verificationMethod).to.have.length(1);
      expect(did.metadata).to.have.property('canonicalId');
    });

    it('handles creating DIDs with multiple verification methods', async () => {
      fetchStub.callsFake((url: string) => {
        if (url.startsWith(ION_RESOLUTION_ENDPOINT)) {
          return Promise.resolve(fetchOkResponse(CreateTestVector.twoMethodsNoServices.didResolutionResult));
        } else if (url.startsWith(ION_OPERATIONS_ENDPOINT)) {
          return Promise.resolve(fetchOkResponse());
        }
      });

      const did = await DidIon.create({
        options: {
          verificationMethods: [
            {
              algorithm : 'Ed25519',
              purposes  : ['authentication', 'assertionMethod']
            },
            {
              algorithm : 'secp256k1',
              purposes  : ['authentication', 'assertionMethod']
            }
          ]
        }
      });

      expect(did.didDocument.verificationMethod).to.have.length(2);
      expect(did.didDocument.verificationMethod?.[0].publicKeyJwk).to.have.property('crv', 'Ed25519');
      expect(did.didDocument.verificationMethod?.[1].publicKeyJwk).to.have.property('crv', 'secp256k1');
    });

    it('uses the JWK thumbprint as the ID for verification methods, by default', async () => {
      fetchStub.callsFake((url: string) => {
        if (url.startsWith(ION_RESOLUTION_ENDPOINT)) {
          return Promise.resolve(fetchOkResponse(CreateTestVector.oneMethodNoServices.didResolutionResult));
        } else if (url.startsWith(ION_OPERATIONS_ENDPOINT)) {
          return Promise.resolve(fetchOkResponse());
        }
      });

      const did = await DidIon.create();

      const expectedKeyId = await computeJwkThumbprint({ jwk: did.didDocument.verificationMethod![0]!.publicKeyJwk! });
      expect(did.didDocument.verificationMethod?.[0].id).to.include(expectedKeyId);
    });

    it('allows a custom ID to be specified for additional verification methods', async () => {
      fetchStub.callsFake((url: string) => {
        if (url.startsWith(ION_RESOLUTION_ENDPOINT)) {
          return Promise.resolve(fetchOkResponse(CreateTestVector.oneMethodCustomId.didResolutionResult));
        } else if (url.startsWith(ION_OPERATIONS_ENDPOINT)) {
          return Promise.resolve(fetchOkResponse());
        }
      });

      const did = await DidIon.create({
        options: {
          verificationMethods: [
            {
              algorithm : 'Ed25519',
              id        : '1',
              purposes  : ['authentication', 'assertionMethod']
            }
          ]
        }
      });

      expect(did.didDocument.verificationMethod?.[0]).to.have.property('id', '#1');
    });

    it('retains only the ID fragment if verification method IDs contain a prefix before the hash symbol (#)', async () => {
      fetchStub.callsFake((url: string) => {
        if (url.startsWith(ION_RESOLUTION_ENDPOINT)) {
          return Promise.resolve(fetchOkResponse(CreateTestVector.oneMethodCustomId.didResolutionResult));
        } else if (url.startsWith(ION_OPERATIONS_ENDPOINT)) {
          return Promise.resolve(fetchOkResponse());
        }
      });

      const did = await DidIon.create({
        options: {
          verificationMethods: [
            {
              algorithm : 'Ed25519',
              id        : 'someprefix#1',
              purposes  : ['authentication', 'assertionMethod']
            }
          ]
        }
      });

      expect(did.didDocument.verificationMethod?.[0]).to.have.property('id', '#1');
    });

    it('handles creating DIDs with one service', async () => {
      fetchStub.callsFake((url: string) => {
        if (url.startsWith(ION_RESOLUTION_ENDPOINT)) {
          return Promise.resolve(fetchOkResponse(CreateTestVector.oneMethodOneService.didResolutionResult));
        } else if (url.startsWith(ION_OPERATIONS_ENDPOINT)) {
          return Promise.resolve(fetchOkResponse());
        }
      });

      const did = await DidIon.create({
        options: {
          services: [
            {
              id              : 'dwn',
              type            : 'DecentralizedWebNode',
              serviceEndpoint : 'https://example.com/dwn',
            }
          ]
        }
      });

      expect(did.didDocument.service).to.have.length(1);
      expect(did.didDocument.service?.[0]).to.have.property('id', `#dwn`);
      expect(did.didDocument.service?.[0]).to.have.property('type', 'DecentralizedWebNode');
      expect(did.didDocument.service?.[0]).to.have.property('serviceEndpoint', 'https://example.com/dwn');
    });

    it('handles creating DIDs with multiple services', async () => {
      fetchStub.callsFake((url: string) => {
        if (url.startsWith(ION_RESOLUTION_ENDPOINT)) {
          return Promise.resolve(fetchOkResponse(CreateTestVector.oneMethodTwoServices.didResolutionResult));
        } else if (url.startsWith(ION_OPERATIONS_ENDPOINT)) {
          return Promise.resolve(fetchOkResponse());
        }
      });

      const did = await DidIon.create({
        options: {
          services: [
            {
              id              : 'dwn',
              type            : 'DecentralizedWebNode',
              serviceEndpoint : 'https://example.com/dwn',
            },
            {
              id              : 'oid4vci',
              type            : 'OID4VCI',
              serviceEndpoint : 'https://issuer.example.com',
            }
          ]
        }
      });

      expect(did.didDocument.service).to.have.length(2);
      expect(did.didDocument.service?.[0]).to.have.property('id', `#dwn`);
      expect(did.didDocument.service?.[1]).to.have.property('id', `#oid4vci`);
    });

    it('given service IDs are automatically prefixed with hash symbol (#) in DID document', async () => {
      fetchStub.callsFake((url: string) => {
        if (url.startsWith(ION_RESOLUTION_ENDPOINT)) {
          return Promise.resolve(fetchOkResponse(CreateTestVector.oneMethodOneService.didResolutionResult));
        } else if (url.startsWith(ION_OPERATIONS_ENDPOINT)) {
          return Promise.resolve(fetchOkResponse());
        }
      });

      const did = await DidIon.create({
        options: {
          services: [
            {
              id              : 'dwn',
              type            : 'DecentralizedWebNode',
              serviceEndpoint : 'https://example.com/dwn',
            }
          ]
        }
      });

      expect(did.didDocument.service).to.have.length(1);
      expect(did.didDocument.service?.[0]).to.have.property('id', `#dwn`);
    });

    it('accepts service IDs that start with a hash symbol (#)', async () => {
      fetchStub.callsFake((url: string) => {
        if (url.startsWith(ION_RESOLUTION_ENDPOINT)) {
          return Promise.resolve(fetchOkResponse(CreateTestVector.oneMethodOneService.didResolutionResult));
        } else if (url.startsWith(ION_OPERATIONS_ENDPOINT)) {
          return Promise.resolve(fetchOkResponse());
        }
      });

      const did = await DidIon.create({
        options: {
          services: [
            {
              id              : '#dwn',
              type            : 'DecentralizedWebNode',
              serviceEndpoint : 'https://example.com/dwn',
            }
          ]
        }
      });

      expect(did.didDocument.service).to.have.length(1);
      expect(did.didDocument.service?.[0]).to.have.property('id', `#dwn`);
    });

    it('retains only the ID fragment if service IDs contain a prefix before the hash symbol (#)', async () => {
      fetchStub.callsFake((url: string) => {
        if (url.startsWith(ION_RESOLUTION_ENDPOINT)) {
          return Promise.resolve(fetchOkResponse(CreateTestVector.oneMethodOneService.didResolutionResult));
        } else if (url.startsWith(ION_OPERATIONS_ENDPOINT)) {
          return Promise.resolve(fetchOkResponse());
        }
      });

      const did = await DidIon.create({
        options: {
          services: [
            {
              id              : 'someprefix#dwn',
              type            : 'DecentralizedWebNode',
              serviceEndpoint : 'https://example.com/dwn',
            }
          ]
        }
      });

      expect(did.didDocument.service).to.have.length(1);
      expect(did.didDocument.service?.[0]).to.have.property('id', `#dwn`);
    });

    it('accepts custom properties for services', async () => {
      fetchStub.callsFake((url: string) => {
        if (url.startsWith(ION_RESOLUTION_ENDPOINT)) {
          return Promise.resolve(fetchOkResponse(CreateTestVector.dwnService.didResolutionResult));
        } else if (url.startsWith(ION_OPERATIONS_ENDPOINT)) {
          return Promise.resolve(fetchOkResponse());
        }
      });

      const did = await DidIon.create({
        options: {
          verificationMethods: [
            {
              algorithm : 'Ed25519',
              id        : 'sig',
              purposes  : ['authentication', 'assertionMethod']
            },
            {
              algorithm : 'secp256k1',
              id        : 'enc',
              purposes  : ['keyAgreement']
            }
          ],
          services: [
            {
              id              : 'dwn',
              type            : 'DecentralizedWebNode',
              serviceEndpoint : {
                'nodes'          : ['https://example.com/dwn0', 'https://example.com/dwn1'],
                'signingKeys'    : ['#sig'],
                'encryptionKeys' : ['#enc']
              }
            }
          ]
        }
      });

      expect(did.didDocument.verificationMethod).to.have.length(2);
      expect(did.didDocument.verificationMethod?.[0]).to.have.property('id', `#sig`);
      expect(did.didDocument.verificationMethod?.[1]).to.have.property('id', `#enc`);
      expect(did.didDocument.service).to.have.length(1);
      expect(did.didDocument.service?.[0]).to.have.property('id', `#dwn`);
      expect(did.didDocument.service?.[0]).to.have.property('type', 'DecentralizedWebNode');
      expect(did.didDocument.service?.[0]).to.have.property('serviceEndpoint');
      expect(did.didDocument.service?.[0]?.serviceEndpoint).to.have.property('nodes');
      expect(did.didDocument.service?.[0]?.serviceEndpoint).to.have.property('encryptionKeys');
      expect(did.didDocument.service?.[0]?.serviceEndpoint).to.have.property('signingKeys');
    });

    it('publishes DIDs, by default', async () => {
      fetchStub.callsFake((url: string) => {
        if (url.startsWith(ION_RESOLUTION_ENDPOINT)) {
          return Promise.resolve(fetchOkResponse(CreateTestVector.oneMethodNoServices.didResolutionResult));
        } else if (url.startsWith(ION_OPERATIONS_ENDPOINT)) {
          return Promise.resolve(fetchOkResponse());
        }
      });

      const did = await DidIon.create();

      expect(fetchStub.calledTwice).to.be.true;
      expect(did.metadata).to.have.property('published', true);
    });

    it('allows publishing of DIDs to optionally be disabled', async () => {
      fetchStub.callsFake((url: string) => {
        if (url.startsWith(ION_RESOLUTION_ENDPOINT)) {
          return Promise.resolve(fetchOkResponse(CreateTestVector.oneMethodNoServices.didResolutionResult));
        }
      });

      const did = await DidIon.create({ options: { publish: false } });

      expect(fetchStub.calledOnce).to.be.true;
      expect(did.metadata).to.have.property('published', false);
    });

    it('throws an error if a verification method algorithm is not supported', async () => {
      try {
        await DidIon.create({
          options: {
            verificationMethods: [
              {
                algorithm : 'Ed25519',
                purposes  : ['authentication', 'assertionMethod']
              },
              {
                // @ts-expect-error - Testing invalid algorithm.
                algorithm : 'Ed448',
                id        : 'dwn-sig',
                purposes  : ['authentication', 'assertionMethod']
              }
            ]
          }
        });

        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('algorithms are not supported');
      }
    });

    it('throws an error if services are missing required properties', async () => {
      try {
        // @ts-expect-error - Testing service with missing 'id' property.
        await DidIon.create({ options: { services: [{ type: 'b', serviceEndpoint: 'c' }] } });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('services are missing required properties');
      }

      try {
        // @ts-expect-error - Testing service with missing 'type' property.
        await DidIon.create({ options: { services: [{ id: 'a', serviceEndpoint: 'c' }] } });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('services are missing required properties');
      }

      try {
        // @ts-expect-error - Testing service with missing 'serviceEndpoint' property.
        await DidIon.create({ options: { services: [{ id: 'a', type: 'b' }] } });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('services are missing required properties');
      }
    });
  });

  describe('fromKeyManager()', () => {
    let keyManager: LocalKeyManager;

    before(() => {
      keyManager = new LocalKeyManager();
    });

    it('returns a DID from existing keys present in a key manager', async () => {
      // Stub the DID resolution method to return a DID document with no verification methods.
      sinon.stub(DidIon, 'resolve').returns(Promise.resolve(CreateTestVector.oneMethodNoServices.didResolutionResult));

      // Import the test DID's keys into the key manager.
      await keyManager.importKey({ key: CreateTestVector.oneMethodNoServices.privateKey[0] });

      const did = await DidIon.fromKeyManager({ didUri: CreateTestVector.oneMethodNoServices.didUri, keyManager });

      expect(did).to.have.property('didDocument');
      expect(did).to.have.property('getSigner');
      expect(did).to.have.property('keyManager');
      expect(did).to.have.property('metadata');
      expect(did).to.have.property('uri', CreateTestVector.oneMethodNoServices.didUri);

      sinon.restore();
    });
  });

  describe('getSigningMethod()', () => {
    it('returns the first authentication verification method', async function () {
      const verificationMethod = await DidIon.getSigningMethod({
        didDocument: {
          id                 : 'did:ion:123',
          verificationMethod : [
            {
              id           : 'did:ion:123#0',
              type         : 'JsonWebKey2020',
              controller   : 'did:ion:123',
              publicKeyJwk : {} as Jwk
            }
          ],
          authentication: ['did:ion:123#0']
        }
      });

      expect(verificationMethod).to.exist;
      expect(verificationMethod).to.have.property('id', 'did:ion:123#0');
    });

    it('returns undefined if there is no authentication verification method', async function () {
      const verificationMethod = await DidIon.getSigningMethod({
        didDocument: {
          id                 : 'did:ion:123',
          verificationMethod : [
            {
              id           : 'did:ion:123#0',
              type         : 'JsonWebKey2020',
              controller   : 'did:ion:123',
              publicKeyJwk : {} as Jwk
            }
          ],
          assertionMethod: ['did:ion:123#0']
        }
      });

      expect(verificationMethod).to.not.exist;
    });

    it('returns undefined if the only authentication method is embedded', async function () {
      const verificationMethod = await DidIon.getSigningMethod({
        didDocument: {
          id                 : 'did:ion:123',
          verificationMethod : [
            {
              id           : 'did:ion:123#0',
              type         : 'JsonWebKey2020',
              controller   : 'did:ion:123',
              publicKeyJwk : {} as Jwk
            }
          ],
          authentication: [
            {
              id           : 'did:ion:123#1',
              type         : 'JsonWebKey2020',
              controller   : 'did:ion:123',
              publicKeyJwk : {} as Jwk
            }
          ],
          assertionMethod: ['did:ion:123#0']
        }
      });

      expect(verificationMethod).to.not.exist;
    });

    it('handles didDocuments missing verification methods', async function () {
      const result = await DidIon.getSigningMethod({
        didDocument: { id: 'did:ion:123' }
      });

      expect(result).to.be.undefined;
    });

    it('throws an error if a non-key method is used', async function () {
      // Example DID Document with a non-key method
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
        await DidIon.getSigningMethod({ didDocument });
        expect.fail('Error should have been thrown');
      } catch (error: any) {
        expect(error.message).to.equal('Method not supported: example');
      }
    });
  });

  describe('resolve()', () => {
    it('resolves published short form ION DIDs', async() => {
      fetchStub.returns(Promise.resolve(fetchOkResponse(ResolveTestVector.publishedDid.didResolutionResult)));

      const resolutionResult = await DidIon.resolve(ResolveTestVector.publishedDid.didUri);

      expect(resolutionResult).to.have.property('didDocument');
      expect(resolutionResult).to.have.property('didDocumentMetadata');
      expect(resolutionResult).to.have.property('didResolutionMetadata');

      expect(resolutionResult.didDocument).to.have.property('id', ResolveTestVector.publishedDid.didUri);
      expect(resolutionResult.didDocumentMetadata).to.have.property('canonicalId', ResolveTestVector.publishedDid.didUri);
      expect(resolutionResult.didDocumentMetadata).to.have.property('published', true);
    });

    it('returns notFound error with unpublished short form ION DIDs', async() => {
      fetchStub.returns(Promise.resolve(fetchNotFoundResponse()));

      const didUri = 'did:ion:EiBCi7lnGtotBsFkbI_lQskQZLk_GPelU0C5-nRB4_nMfA';
      const resolutionResult = await DidIon.resolve(didUri);

      expect(resolutionResult).to.have.property('@context');
      expect(resolutionResult).to.have.property('didDocument');
      expect(resolutionResult).to.have.property('didDocumentMetadata');

      expect(resolutionResult.didResolutionMetadata).to.have.property('error', 'notFound');
    });

    it(`returns methodNotSupported error if DID method is not 'ion'`, async () => {
      const didUri = 'did:key:z6MkvEvogvhMEv9bXLyDXdqSSvvh5goAMtUruYwCbFpuhDjx';
      const resolutionResult = await DidIon.resolve(didUri);
      expect(resolutionResult).to.have.property('@context');
      expect(resolutionResult).to.have.property('didDocument');
      expect(resolutionResult).to.have.property('didDocumentMetadata');

      expect(resolutionResult.didResolutionMetadata).to.have.property('error', 'methodNotSupported');
    });

    it('accepts custom DID resolver with trailing slash', async () => {
      const mockResult = {
        '@context'            : 'https://w3id.org/did-resolution/v1',
        'didDocument'         : null,
        'didDocumentMetadata' : {
          'published': undefined
        },
        'didResolutionMetadata': {}
      };
      fetchStub.returns(Promise.resolve({
        ok   : true,
        json : () => Promise.resolve(mockResult)
      }));

      const didUri = 'did:ion:EiCab9QRUcUTKKIM-W2SMCwnOPxa4y0q7emoWJDSOSz3HQ';
      const resolutionResult = await DidIon.resolve(didUri, {
        gatewayUri: 'https://dev.uniresolver.io/1.0/'
      });

      expect(resolutionResult).to.deep.equal(mockResult);
      expect(fetchStub.calledOnceWith(
        `https://dev.uniresolver.io/1.0/identifiers/${didUri}`
      )).to.be.true;
    });
  });

  describe('toKeys()', () => {
    let keyManager: LocalKeyManager;

    before(() => {
      keyManager = new LocalKeyManager();
    });

    it('returns a single verification method for a DID, by default', async () => {
      // Import the test DID's key into the key manager.
      await keyManager.importKey({ key: ToKeysTestVector.oneMethodNoServices.privateKey[0] });

      // Use the DID object from the test vector but with the instantiated key manager.
      const did = ToKeysTestVector.oneMethodNoServices.did;
      did.keyManager = keyManager;

      // Convert the DID to a portable format.
      const portableDid = await DidIon.toKeys({ did });

      expect(portableDid).to.have.property('verificationMethods');
      expect(portableDid.verificationMethods).to.have.length(1);
      expect(portableDid.verificationMethods[0]).to.have.property('publicKeyJwk');
      expect(portableDid.verificationMethods[0]).to.have.property('privateKeyJwk');
      expect(portableDid.verificationMethods[0]).to.have.property('purposes');
      expect(portableDid.verificationMethods[0]).to.have.property('type');
      expect(portableDid.verificationMethods[0]).to.have.property('id');
      expect(portableDid.verificationMethods[0]).to.have.property('controller');
    });
  });
});