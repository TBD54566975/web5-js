import type { Jwk } from '@web5/crypto';

import sinon from 'sinon';
import { expect } from 'chai';
import { Convert } from '@web5/common';
import { LocalKmsCrypto } from '@web5/crypto';

import type { DidResolutionResult } from '../../src/index.js';
import type { PortableDid } from '../../src/methods/did-method.js';

import { DidErrorCode } from '../../src/did-error.js';
import { DidDht, DidDhtRegisteredDidType } from '../../src/methods/did-dht.js';

// Helper function to create a mocked fetch response that fails and returns a 404 Not Found.
const fetchNotFoundResponse = () => ({
  status     : 404,
  statusText : 'Not Found',
  ok         : false
});

// Helper function to create a mocked fetch response that is successful and returns the given
// response.
const fetchOkResponse = (response?: any) => ({
  status      : 200,
  statusText  : 'OK',
  ok          : true,
  arrayBuffer : async () => Promise.resolve(response)
});

describe('DidDht', () => {
  let fetchStub: sinon.SinonStub;

  beforeEach(() => {
    // Setup stub so that a mocked response is returned rather than calling over the network.
    fetchStub = sinon.stub(globalThis as any, 'fetch');

    // By default, return a 200 OK response when fetch is called by publish().
    fetchStub.resolves(fetchOkResponse());
  });

  afterEach(() => {
    fetchStub.restore();
  });

  describe('create', () => {
    it('creates a DID with a single verification method, by default', async () => {
      const did = await DidDht.create();

      expect(did).to.have.property('didDocument');
      expect(did).to.have.property('getSigner');
      expect(did).to.have.property('keyManager');
      expect(did).to.have.property('metadata');
      expect(did).to.have.property('uri');

      expect(did.didDocument).to.have.property('verificationMethod');
      expect(did.didDocument.verificationMethod).to.have.length(1);
    });

    it('handles creating DIDs with additional verification methods', async () => {
      const did = await DidDht.create({
        options: {
          verificationMethods: [
            {
              algorithm : 'Ed25519',
              purposes  : ['authentication', 'assertionMethod']
            }
          ]
        }
      });

      expect(did.didDocument.verificationMethod).to.have.length(2);
    });

    it('allows one or more DID controller identifiers to be specified', async () => {
      let did = await DidDht.create({
        options: {
          controllers: 'did:example:1234'
        }
      });

      expect(did.didDocument).to.have.property('controller', 'did:example:1234');

      did = await DidDht.create({
        options: {
          controllers: ['did:example:1234', 'did:example:5678']
        }
      });

      expect(did.didDocument.controller).to.deep.equal(['did:example:1234', 'did:example:5678']);
    });

    it('allows one or more Also Known As identifiers to be specified', async () => {
      let did = await DidDht.create({
        options: {
          alsoKnownAs: ['did:example:1234']
        }
      });

      expect(did.didDocument.alsoKnownAs).to.deep.equal(['did:example:1234']);

      did = await DidDht.create({
        options: {
          alsoKnownAs: ['did:example:1234', 'did:example:5678']
        }
      });

      expect(did.didDocument.alsoKnownAs).to.deep.equal(['did:example:1234', 'did:example:5678']);
    });

    it('handles creating DIDs with additional verification methods', async () => {
      const did = await DidDht.create({
        options: {
          verificationMethods: [
            {
              algorithm : 'Ed25519',
              purposes  : ['authentication', 'assertionMethod']
            }
          ]
        }
      });

      expect(did.didDocument.verificationMethod).to.have.length(2);
    });

    it('assigns 0 as the ID of the Identity Key verification method ', async () => {
      const did = await DidDht.create();

      expect(did.didDocument.verificationMethod?.[0].id).to.include('#0');
    });

    it('uses the JWK thumbprint as the ID for additional verification methods, by default', async () => {
      const did = await DidDht.create({
        options: {
          verificationMethods: [
            {
              algorithm : 'Ed25519',
              purposes  : ['authentication', 'assertionMethod']
            }
          ]
        }
      });

      expect(did.didDocument.verificationMethod?.[1].id).to.include(`#${did?.didDocument?.verificationMethod?.[1]?.publicKeyJwk?.kid}`);
    });

    it('allows a custom ID to be specified for additional verification methods', async () => {
      const did = await DidDht.create({
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

      expect(did.didDocument.verificationMethod?.[1]).to.have.property('id', `${did.uri}#1`);
    });

    it('handles creating DIDs with one service', async () => {
      const did = await DidDht.create({
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
      expect(did.didDocument.service?.[0]).to.have.property('id', `${did.uri}#dwn`);
      expect(did.didDocument.service?.[0]).to.have.property('type', 'DecentralizedWebNode');
      expect(did.didDocument.service?.[0]).to.have.property('serviceEndpoint', 'https://example.com/dwn');
    });

    it('handles creating DIDs with multiple services', async () => {
      const did = await DidDht.create({
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
      expect(did.didDocument.service?.[0]).to.have.property('id', `${did.uri}#dwn`);
      expect(did.didDocument.service?.[1]).to.have.property('id', `${did.uri}#oid4vci`);
    });

    it('accepts a custom controller for the Identity Key verification method', async () => {
      const did = await DidDht.create({
        options: {
          verificationMethods: [
            {
              algorithm  : 'Ed25519',
              id         : '0',
              controller : 'did:example:1234',
            }
          ]
        }
      });

      const identityKeyVerificationMethod = did.didDocument?.verificationMethod?.find(
        (method) => method.id.endsWith('#0')
      );
      expect(identityKeyVerificationMethod).to.have.property('controller', 'did:example:1234');
    });

    it('accepts custom properties for services', async () => {
      const did = await DidDht.create({
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
              serviceEndpoint : 'https://example.com/dwn',
              enc             : '#enc',
              sig             : '#sig'
            }
          ]
        }
      });

      expect(did.didDocument.verificationMethod).to.have.length(3);
      expect(did.didDocument.verificationMethod?.[1]).to.have.property('id', `${did.uri}#sig`);
      expect(did.didDocument.verificationMethod?.[2]).to.have.property('id', `${did.uri}#enc`);
      expect(did.didDocument.service).to.have.length(1);
      expect(did.didDocument.service?.[0]).to.have.property('id', `${did.uri}#dwn`);
      expect(did.didDocument.service?.[0]).to.have.property('type', 'DecentralizedWebNode');
      expect(did.didDocument.service?.[0]).to.have.property('serviceEndpoint', 'https://example.com/dwn');
      expect(did.didDocument.service?.[0]).to.have.property('enc', '#enc');
      expect(did.didDocument.service?.[0]).to.have.property('sig', '#sig');
    });

    it('accepts one or more DID DHT registered types', async () => {
      const did = await DidDht.create({
        options: {
          types: [DidDhtRegisteredDidType.FinancialInstitution, DidDhtRegisteredDidType.WebApp]
        }
      });

      expect(did.metadata).to.have.property('types');
      expect(did.metadata.types).to.have.length(2);
      expect(did.metadata.types).to.include(DidDhtRegisteredDidType.FinancialInstitution);
      expect(did.metadata.types).to.include(DidDhtRegisteredDidType.WebApp);
    });

    it('publishes DIDs, by default', async () => {
      await DidDht.create();

      expect(fetchStub.calledOnce).to.be.true;
    });

    it('allows publishing of DIDs to optionally be disabled', async () => {
      await DidDht.create({ options: { publish: false } });

      expect(fetchStub.called).to.be.false;
    });

    it('returns a DID with a getSigner function that can sign and verify data', async () => {
      const did = await DidDht.create();

      const signer = await did.getSigner();
      const data = new Uint8Array([1, 2, 3]);
      const signature = await signer.sign({ data });
      const isValid = await signer.verify({ data, signature });

      expect(signature).to.have.length(64);
      expect(isValid).to.be.true;
    });

    it('throws an error if a verification method algorithm is not supported', async () => {
      try {
        await DidDht.create({
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
        await DidDht.create({ options: { services: [{ type: 'b', serviceEndpoint: 'c' }] } });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('services are missing required properties');
      }

      try {
        // @ts-expect-error - Testing service with missing 'type' property.
        await DidDht.create({ options: { services: [{ id: 'a', serviceEndpoint: 'c' }] } });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('services are missing required properties');
      }

      try {
        // @ts-expect-error - Testing service with missing 'serviceEndpoint' property.
        await DidDht.create({ options: { services: [{ id: 'a', type: 'b' }] } });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('services are missing required properties');
      }
    });

    it('throws an error if the resulting DID document would exceed the 1000 byte maximum', async () => {
      try {
        // Attempt to create a DID with 6 verification methods (Identity Key plus 5 additional).
        await DidDht.create({
          options: {
            verificationMethods: [
              { algorithm: 'Ed25519' },
              { algorithm: 'Ed25519' },
              { algorithm: 'Ed25519' },
              { algorithm: 'Ed25519' },
              { algorithm: 'Ed25519' }
            ]
          }
        });

        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.code).to.equal(DidErrorCode.InvalidDidDocumentLength);
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
      didUri = 'did:dht:cf69rrqpanddbhkqecuwia314hfawfua9yr6zx433jmgm39ez57y';

      privateKey = {
        crv : 'Ed25519',
        d   : 'PISwJgl1nOlURuaqo144O1eXuGDWggYo7XX1X8oxPJs',
        kty : 'OKP',
        x   : 'YX3yEc3AhjDxTkMnSuMy1wuKFnj4Ceu_WcpWZefovvo',
        kid : 'un6C53LHsjSmjFmZsEKZKwrz0gO_LBg2nSV3a54CNoo'
      };
    });

    it('returns a DID from existing keys present in a key manager', async () => {
      // Mock the response from the Pkarr relay rather than calling over the network.
      fetchStub.resolves(fetchOkResponse(
        Convert.hex('28a37dbbf9692e2930696ade738f85a757a508442a9a454946e9a6e11a4ccd6d47e4f1839791' +
                    'e7085d836e343d71726ed77fbad48760128e8a749cd61fcf3d0d0000000065b14cbe00008400' +
                    '0000000200000000035f6b30045f646964346366363972727170616e646462686b7165637577' +
                    '696133313468666177667561397972367a783433336a6d676d3339657a353779000010000100' +
                    '001c2000373669643d303b743d303b6b3d5958337945633341686a4478546b4d6e53754d7931' +
                    '77754b466e6a344365755f576370575a65666f76766f045f646964346366363972727170616e' +
                    '646462686b7165637577696133313468666177667561397972367a783433336a6d676d333965' +
                    '7a353779000010000100001c20002726763d303b766d3d6b303b617574683d6b303b61736d3d' +
                    '6b303b64656c3d6b303b696e763d6b30').toArrayBuffer()
      ));

      // Import the test DID's keys into the key manager.
      await keyManager.importKey({ key: privateKey });

      const did = await DidDht.fromKeyManager({ didUri, keyManager });

      expect(did).to.have.property('didDocument');
      expect(did).to.have.property('getSigner');
      expect(did).to.have.property('keyManager');
      expect(did).to.have.property('metadata');
      expect(did).to.have.property('uri', 'did:dht:cf69rrqpanddbhkqecuwia314hfawfua9yr6zx433jmgm39ez57y');
    });

    it('returns a DID from existing keys present in a key manager, with types', async () => {
      const portableDid: PortableDid = {
        uri                 : 'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo',
        verificationMethods : [
          {
            id           : 'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo#0',
            type         : 'JsonWebKey',
            controller   : 'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo',
            publicKeyJwk : {
              crv : 'Ed25519',
              kty : 'OKP',
              x   : 'VYKm2SCIV9Vz3BRy-v5R9GHz3EOJCPvZ1_gP1e3XiB0',
              kid : 'cyvOypa6k-4ffsRWcza37s5XVOh1kO9ICUeo1ZxHVM8',
              alg : 'EdDSA',
            },
            privateKeyJwk: {
              crv : 'Ed25519',
              d   : 'hdSIwbQwVD-fNOVEgt-k3mMl44Ip1iPi58Ex6VDGxqY',
              kty : 'OKP',
              x   : 'VYKm2SCIV9Vz3BRy-v5R9GHz3EOJCPvZ1_gP1e3XiB0',
              kid : 'cyvOypa6k-4ffsRWcza37s5XVOh1kO9ICUeo1ZxHVM8',
              alg : 'EdDSA',
            },
            purposes: [
              'authentication',
              'assertionMethod',
              'capabilityDelegation',
              'capabilityInvocation',
            ],
          },
        ],
      };

      const mockDidResolutionResult: DidResolutionResult = {
        didDocument: {
          id                 : 'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo',
          verificationMethod : [
            {
              id           : 'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo#0',
              type         : 'JsonWebKey',
              controller   : 'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo',
              publicKeyJwk : {
                crv : 'Ed25519',
                kty : 'OKP',
                x   : 'VYKm2SCIV9Vz3BRy-v5R9GHz3EOJCPvZ1_gP1e3XiB0',
                kid : 'cyvOypa6k-4ffsRWcza37s5XVOh1kO9ICUeo1ZxHVM8',
                alg : 'EdDSA'
              },
            },
          ],
          authentication: [
            'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo#0'
          ],
          assertionMethod: [
            'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo#0'
          ],
          capabilityDelegation: [
            'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo#0'
          ],
          capabilityInvocation: [
            'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo#0'
          ],
        },
        didDocumentMetadata: {
          types: [6, 7]
        },
        didResolutionMetadata: {}
      };

      // Stub the DID resolve method to return the expected DID document and metadata.
      const resolveStub = sinon.stub(DidDht, 'resolve').returns(Promise.resolve(mockDidResolutionResult));

      // Import the test DID's keys into the key manager.
      await keyManager.importKey({ key: portableDid.verificationMethods![0].privateKeyJwk! });

      const did = await DidDht.fromKeyManager({ didUri: portableDid.uri!, keyManager });

      expect(did.uri).to.equal(portableDid.uri);
      expect(did.didDocument).to.deep.equal(mockDidResolutionResult.didDocument);
      expect(did.metadata).to.have.property('types');
      expect(did.metadata.types).to.deep.equal([6, 7]);

      resolveStub.restore();
    });

    it('returns a DID with a getSigner function that can sign and verify data', async () => {
      const keyManager = new LocalKmsCrypto();

      // Create a DID to use for the test.
      const testDid = await DidDht.create({ keyManager });

      // Stub the DID resolve method to return the expected DID document and metadata.
      const resolveStub = sinon.stub(DidDht, 'resolve').returns(Promise.resolve({
        didDocument           : testDid.didDocument,
        didDocumentMetadata   : testDid.metadata,
        didResolutionMetadata : {}
      }));

      const did = await DidDht.fromKeyManager({ didUri: testDid.uri, keyManager });

      const signer = await did.getSigner();
      const data = new Uint8Array([1, 2, 3]);
      const signature = await signer.sign({ data });
      const isValid = await signer.verify({ data, signature });

      expect(signature).to.have.length(64);
      expect(isValid).to.be.true;

      resolveStub.restore();
    });

    it('returns a DID with a getSigner function that accepts a specific keyUri', async () => {
      const keyManager = new LocalKmsCrypto();

      // Create a DID to use for the test.
      const testDid = await DidDht.create({ keyManager });

      // Stub the DID resolve method to return the expected DID document and metadata.
      const resolveStub = sinon.stub(DidDht, 'resolve').returns(Promise.resolve({
        didDocument           : testDid.didDocument,
        didDocumentMetadata   : testDid.metadata,
        didResolutionMetadata : {}
      }));

      const did = await DidDht.fromKeyManager({ didUri: testDid.uri, keyManager });

      // Retrieve the key URI of the verification method's public key.
      const keyUri = await did.keyManager.getKeyUri({
        key: testDid.didDocument.verificationMethod![0].publicKeyJwk!
      });

      const signer = await did.getSigner({ keyUri });
      const data = new Uint8Array([1, 2, 3]);
      const signature = await signer.sign({ data });
      const isValid = await signer.verify({ data, signature });

      expect(signature).to.have.length(64);
      expect(isValid).to.be.true;

      resolveStub.restore();
    });

    it('throws an error if an unsupported DID method is given', async () => {
      try {
        await DidDht.fromKeyManager({ didUri: 'did:example:1234', keyManager });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('Method not supported');
        expect(error.code).to.equal(DidErrorCode.MethodNotSupported);
      }
    });

    it('throws an error if the resolved DID document lacks any verification methods', async () => {
      // Stub the DID resolve method to return a DID document without a verificationMethod property.
      sinon.stub(DidDht, 'resolve').returns(Promise.resolve({
        didDocument           : { id: 'did:dht:...' },
        didDocumentMetadata   : {},
        didResolutionMetadata : {}
      }));

      const didUri = 'did:dht:...';
      try {
        await DidDht.fromKeyManager({ didUri, keyManager });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('missing verification methods');
      } finally {
        sinon.restore();
      }

      // Stub the DID resolve method to return a DID document an empty verificationMethod property.
      sinon.stub(DidDht, 'resolve').returns(Promise.resolve({
        didDocument           : { id: 'did:dht:...', verificationMethod: [] },
        didDocumentMetadata   : {},
        didResolutionMetadata : {}
      }));

      try {
        await DidDht.fromKeyManager({ didUri, keyManager });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('missing verification methods');
      } finally {
        sinon.restore();
      }
    });

    it('throws an error if the resolved DID document is missing a public key', async () => {
      // Stub the DID resolution method to return a DID document with no verification methods.
      sinon.stub(DidDht, 'resolve').returns(Promise.resolve({
        didDocument: {
          id                 : 'did:dht:...',
          verificationMethod : [{
            id         : 'did:dht:...#0',
            type       : 'JsonWebKey',
            controller : 'did:dht:...'
          }],
        },
        didDocumentMetadata   : {},
        didResolutionMetadata : {}
      }));

      const didUri = 'did:dht:...';
      try {
        await DidDht.fromKeyManager({ didUri, keyManager });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('does not contain a public key');
      } finally {
        sinon.restore();
      }
    });
  });

  describe('fromKeys', () => {
    let portableDid: PortableDid;

    beforeEach(() => {
      // Define a DID to use for the test.
      portableDid =  {
        uri                 : 'did:dht:urex8kbn3ewbdrjq36obf3rpg8joomzpu1gb4cfkhj3ey4y9fqgo',
        verificationMethods : [
          {
            id           : 'did:dht:urex8kbn3ewbdrjq36obf3rpg8joomzpu1gb4cfkhj3ey4y9fqgo#0',
            type         : 'JsonWebKey',
            controller   : 'did:dht:urex8kbn3ewbdrjq36obf3rpg8joomzpu1gb4cfkhj3ey4y9fqgo',
            publicKeyJwk : {
              crv : 'Ed25519',
              kty : 'OKP',
              x   : 'mRDzqCLKKBGRLs-gEuSNMdMILu2cjB0wquJygGgfK40',
              kid : 'FuIkkMgnsq-XRX8gWp3HJpqwoIbyNNsx4Uk-tdDSqbE',
              alg : 'EdDSA'
            },
            privateKeyJwk: {
              crv : 'Ed25519',
              d   : '3OQkejC7rNiGQSPAugN8CFrIjHGemZh5hbtgD8GXUVw',
              kty : 'OKP',
              x   : 'mRDzqCLKKBGRLs-gEuSNMdMILu2cjB0wquJygGgfK40',
              kid : 'FuIkkMgnsq-XRX8gWp3HJpqwoIbyNNsx4Uk-tdDSqbE',
              alg : 'EdDSA'
            },
            purposes: [
              'authentication',
              'assertionMethod',
              'capabilityDelegation',
              'capabilityInvocation'
            ],
          },
        ],
      };
    });

    it('returns a previously created DID from the URI and imported key material', async () => {
      const mockDidResolutionResult: DidResolutionResult = {
        didDocument: {
          id                 : 'did:dht:urex8kbn3ewbdrjq36obf3rpg8joomzpu1gb4cfkhj3ey4y9fqgo',
          verificationMethod : [
            {
              id           : 'did:dht:urex8kbn3ewbdrjq36obf3rpg8joomzpu1gb4cfkhj3ey4y9fqgo#0',
              type         : 'JsonWebKey',
              controller   : 'did:dht:urex8kbn3ewbdrjq36obf3rpg8joomzpu1gb4cfkhj3ey4y9fqgo',
              publicKeyJwk : {
                crv : 'Ed25519',
                kty : 'OKP',
                x   : 'mRDzqCLKKBGRLs-gEuSNMdMILu2cjB0wquJygGgfK40',
                kid : 'FuIkkMgnsq-XRX8gWp3HJpqwoIbyNNsx4Uk-tdDSqbE',
                alg : 'EdDSA',
              },
            },
          ],
          authentication: [
            'did:dht:urex8kbn3ewbdrjq36obf3rpg8joomzpu1gb4cfkhj3ey4y9fqgo#0',
          ],
          assertionMethod: [
            'did:dht:urex8kbn3ewbdrjq36obf3rpg8joomzpu1gb4cfkhj3ey4y9fqgo#0',
          ],
          capabilityDelegation: [
            'did:dht:urex8kbn3ewbdrjq36obf3rpg8joomzpu1gb4cfkhj3ey4y9fqgo#0',
          ],
          capabilityInvocation: [
            'did:dht:urex8kbn3ewbdrjq36obf3rpg8joomzpu1gb4cfkhj3ey4y9fqgo#0',
          ],
        },
        didDocumentMetadata   : {},
        didResolutionMetadata : {}
      };

      // Stub the DID resolve method to return the expected DID document and metadata.
      const resolveStub = sinon.stub(DidDht, 'resolve').returns(Promise.resolve(mockDidResolutionResult));

      const did = await DidDht.fromKeys(portableDid);

      expect(did).to.have.property('didDocument');
      expect(did).to.have.property('getSigner');
      expect(did).to.have.property('keyManager');
      expect(did).to.have.property('metadata');
      expect(did).to.have.property('uri', portableDid.uri);

      resolveStub.restore();
    });

    it('returns a previously created DID from the URI and imported key material, with types', async () => {
      portableDid = {
        uri                 : 'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo',
        verificationMethods : [
          {
            id           : 'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo#0',
            type         : 'JsonWebKey',
            controller   : 'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo',
            publicKeyJwk : {
              crv : 'Ed25519',
              kty : 'OKP',
              x   : 'VYKm2SCIV9Vz3BRy-v5R9GHz3EOJCPvZ1_gP1e3XiB0',
              kid : 'cyvOypa6k-4ffsRWcza37s5XVOh1kO9ICUeo1ZxHVM8',
              alg : 'EdDSA',
            },
            privateKeyJwk: {
              crv : 'Ed25519',
              d   : 'hdSIwbQwVD-fNOVEgt-k3mMl44Ip1iPi58Ex6VDGxqY',
              kty : 'OKP',
              x   : 'VYKm2SCIV9Vz3BRy-v5R9GHz3EOJCPvZ1_gP1e3XiB0',
              kid : 'cyvOypa6k-4ffsRWcza37s5XVOh1kO9ICUeo1ZxHVM8',
              alg : 'EdDSA',
            },
            purposes: [
              'authentication',
              'assertionMethod',
              'capabilityDelegation',
              'capabilityInvocation',
            ],
          },
        ],
      };

      const mockDidResolutionResult: DidResolutionResult = {
        didDocument: {
          id                 : 'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo',
          verificationMethod : [
            {
              id           : 'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo#0',
              type         : 'JsonWebKey',
              controller   : 'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo',
              publicKeyJwk : {
                crv : 'Ed25519',
                kty : 'OKP',
                x   : 'VYKm2SCIV9Vz3BRy-v5R9GHz3EOJCPvZ1_gP1e3XiB0',
                kid : 'cyvOypa6k-4ffsRWcza37s5XVOh1kO9ICUeo1ZxHVM8',
                alg : 'EdDSA'
              },
            },
          ],
          authentication: [
            'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo#0'
          ],
          assertionMethod: [
            'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo#0'
          ],
          capabilityDelegation: [
            'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo#0'
          ],
          capabilityInvocation: [
            'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo#0'
          ],
        },
        didDocumentMetadata: {
          types: [6, 7]
        },
        didResolutionMetadata: {}
      };

      // Stub the DID resolve method to return the expected DID document and metadata.
      const resolveStub = sinon.stub(DidDht, 'resolve').returns(Promise.resolve(mockDidResolutionResult));

      const did = await DidDht.fromKeys(portableDid);

      expect(did.metadata).to.deep.equal({ types: [6, 7] });

      resolveStub.restore();
    });

    it('returns a new DID created from the given verification material', async () => {
      // Remove the URI from the test portable DID so that fromKeys() creates the DID object
      // using only the key material.
      const { uri, ...didWithOnlyKeys } = portableDid;

      const did = await DidDht.fromKeys(didWithOnlyKeys);

      expect(did).to.have.property('didDocument');
      expect(did).to.have.property('getSigner');
      expect(did).to.have.property('keyManager');
      expect(did).to.have.property('metadata');
      expect(did).to.have.property('uri', uri);
    });

    it('throws an error if no verification methods are given', async () => {
      try {
        // @ts-expect-error - Testing invalid argument.
        await DidDht.fromKeys({});
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('one verification method');
      }
    });

    it('throws an error if the given key set is empty', async () => {
      try {
        await DidDht.fromKeys({ verificationMethods: [] });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('one verification method');
      }
    });

    it('throws an error if the given key set is missing a public key', async () => {
      delete portableDid.verificationMethods![0].publicKeyJwk;

      try {
        await DidDht.fromKeys(portableDid);
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('must contain a public and private key');
      }
    });

    it('throws an error if the given key set is missing a private key', async () => {
      delete portableDid.verificationMethods![0].privateKeyJwk;

      try {
        await DidDht.fromKeys(portableDid);
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('must contain a public and private key');
      }
    });

    it('throws an error if an Identity Key is not included in the given verification methods', async () => {
      // Change the ID of the verification method to something other than 0.
      portableDid.verificationMethods![0].id = 'did:dht:urex8kbn3ewbdrjq36obf3rpg8joomzpu1gb4cfkhj3ey4y9fqgo#1';

      try {
        await DidDht.fromKeys(portableDid);
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('missing an Identity Key');
      }
    });
  });

  describe('resolve', () => {
    it('resolves a published DID with a single verification method', async () => {
      // Mock the response from the Pkarr relay rather than calling over the network.
      fetchStub.resolves(fetchOkResponse(
        Convert.hex('5f011403ca8a3dbf0935a4f598b47c965b66bc67c86c7b665fbbfa6a31013075f512bbf68ca5' +
                    'c1b6f6ddde45b6645366a7234e204ae6f7c2d0bf4b9b99efae050000000065b0123100008400' +
                    '0000000200000000035f6b30045f64696434706a6969773769626e3674396b316d6b6b6e6b6f' +
                    '776a6b6574613863686b7367777a6b7435756b3837393865707578313338366f000010000100' +
                    '001c2000373669643d303b743d303b6b3d616d7461647145586f5f564a616c4356436956496a' +
                    '67374f4b73616c3152334e522d5f4f68733379796630045f64696434706a6969773769626e36' +
                    '74396b316d6b6b6e6b6f776a6b6574613863686b7367777a6b7435756b383739386570757831' +
                    '3338366f000010000100001c20002726763d303b766d3d6b303b617574683d6b303b61736d3d' +
                    '6b303b64656c3d6b303b696e763d6b30').toArrayBuffer()
      ));

      const did = 'did:dht:pjiiw7ibn6t9k1mkknkowjketa8chksgwzkt5uk8798epux1386o';
      const didResolutionResult = await DidDht.resolve(did);

      expect(didResolutionResult).to.have.property('didDocument');
      expect(didResolutionResult).to.have.property('didDocumentMetadata');
      expect(didResolutionResult).to.have.property('didResolutionMetadata');

      expect(didResolutionResult.didDocument).to.have.property('id', did);
      expect(didResolutionResult.didDocument?.verificationMethod).to.have.length(1);
    });

    it('resolves a published DID with services', async () => {
      // Mock the response from the Pkarr relay rather than calling over the network.
      fetchStub.resolves(fetchOkResponse(
        Convert.hex('19c356a57605e7be8d101e211137dec2bbb875f076a60866529eff68372380c63e435c852bf3' +
                    'dbc6fa4bbda014c561af361cace90c91350477c010769a9910060000000065b035ce00008400' +
                    '0000000300000000035f6b30045f646964343177696161616f61677a63656767736e77667a6d' +
                    '78356377656f67356d736734753533366d627938737179336d6b703377796b6f000010000100' +
                    '001c2000373669643d303b743d303b6b3d6c53754d5968673132494d6177714675742d325552' +
                    '413231324e7165382d574542374f426c616d356f4255035f7330045f64696434317769616161' +
                    '6f61677a63656767736e77667a6d78356377656f67356d736734753533366d62793873717933' +
                    '6d6b703377796b6f000010000100001c2000393869643d64776e3b743d446563656e7472616c' +
                    '697a65645765624e6f64653b73653d68747470733a2f2f6578616d706c652e636f6d2f64776e' +
                    '045f646964343177696161616f61677a63656767736e77667a6d78356377656f67356d736734' +
                    '753533366d627938737179336d6b703377796b6f000010000100001c20002e2d763d303b766d' +
                    '3d6b303b617574683d6b303b61736d3d6b303b64656c3d6b303b696e763d6b303b7376633d73' +
                    '30').toArrayBuffer()
      ));

      const did = 'did:dht:1wiaaaoagzceggsnwfzmx5cweog5msg4u536mby8sqy3mkp3wyko';
      const didResolutionResult = await DidDht.resolve(did);

      expect(didResolutionResult.didDocument?.service).to.have.length(1);
      expect(didResolutionResult.didDocument?.service?.[0]).to.have.property('id', `${did}#dwn`);
    });

    it('resolves a published DID with a DID Controller identifier', async () => {
      fetchStub.resolves(fetchOkResponse(
        Convert.hex('980110156ea686d159d62952c43a151e9fc8f69d9edf0ed38ae78505a3a340f4508de2adad29' +
                    '342e4acf9f3149b976234c6157272b28937e9b217a03e5a66e0f0000000065b0f2db00008400' +
                    '0000000300000000045f636e740364696434663464366267336331676a7368716f31656b3364' +
                    '3935347a336d79316f65686f6e31746b6a6863366a3466356d3666646839346f000010000100' +
                    '001c200011106469643a6578616d706c653a31323334035f6b30045f64696434663464366267' +
                    '336331676a7368716f31656b33643935347a336d79316f65686f6e31746b6a6863366a346635' +
                    '6d3666646839346f000010000100001c2000373669643d303b743d303b6b3d4c6f66676d7979' +
                    '526b323436456b4b79502d39587973456f493541556f7154786e6b364c7466696a355f55045f' +
                    '64696434663464366267336331676a7368716f31656b33643935347a336d79316f65686f6e31' +
                    '746b6a6863366a3466356d3666646839346f000010000100001c20002726763d303b766d3d6b' +
                    '303b617574683d6b303b61736d3d6b303b64656c3d6b303b696e763d6b30').toArrayBuffer()
      ));

      const did = 'did:dht:f4d6bg3c1gjshqo1ek3d954z3my1oehon1tkjhc6j4f5m6fdh94o';
      const didResolutionResult = await DidDht.resolve(did);

      expect(didResolutionResult.didDocument).to.have.property('controller');
    });

    it('resolves a published DID with an Also Known As identifier', async () => {
      fetchStub.resolves(fetchOkResponse(
        Convert.hex('802d44499e456cdee25fef5ffe6f6fbc56201be836d8d44bcb1332a6414529a5503e514230e0' +
                    'd0ec63a33d12a79aa06c3b8212160f514e40c9ac1b0f479128040000000065b0f37c00008400' +
                    '0000000300000000045f616b6103646964346b6e66356e37713568666e657a356b636d6d3439' +
                    '67346b6e716a356d727261393737337266756e73776f3578747269656f716d6f000010000100' +
                    '001c200011106469643a6578616d706c653a31323334035f6b30045f646964346b6e66356e37' +
                    '713568666e657a356b636d6d343967346b6e716a356d727261393737337266756e73776f3578' +
                    '747269656f716d6f000010000100001c2000373669643d303b743d303b6b3d55497578646476' +
                    '68524976745446723138326c43636e617945785f76636b4c4d567151322d4a4b6f673563045f' +
                    '646964346b6e66356e37713568666e657a356b636d6d343967346b6e716a356d727261393737' +
                    '337266756e73776f3578747269656f716d6f000010000100001c20002726763d303b766d3d6b' +
                    '303b617574683d6b303b61736d3d6b303b64656c3d6b303b696e763d6b30').toArrayBuffer()
      ));

      const did = 'did:dht:knf5n7q5hfnez5kcmm49g4knqj5mrra9773rfunswo5xtrieoqmo';
      const didResolutionResult = await DidDht.resolve(did);

      expect(didResolutionResult.didDocument).to.have.property('alsoKnownAs');
    });

    it('resolves a published DID with types', async () => {
      // Mock the response from the Pkarr relay rather than calling over the network.
      fetchStub.resolves(fetchOkResponse(
        Convert.hex('ea33e704f3a48a3392f54b28744cdfb4e24780699f92ba7df62fd486d2a2cda3f263e1c6bcbd' +
                    '75d438be7316e5d6e94b13e98151f599cfecefad0b37432bd90a0000000065b0ed1600008400' +
                    '0000000300000000035f6b30045f6469643439746a6f6f773435656631686b736f6f3936626d' +
                    '7a6b777779336d686d653935643766736933657a6a796a67686d70373571796f000010000100' +
                    '001c2000373669643d303b743d303b6b3d5f464d49553174425a63566145502d437536715542' +
                    '6c66466f5f73665332726c4630675362693239323445045f747970045f6469643439746a6f6f' +
                    '773435656631686b736f6f3936626d7a6b777779336d686d653935643766736933657a6a796a' +
                    '67686d70373571796f000010000100001c2000070669643d372c36045f6469643439746a6f6f' +
                    '773435656631686b736f6f3936626d7a6b777779336d686d653935643766736933657a6a796a' +
                    '67686d70373571796f000010000100001c20002726763d303b766d3d6b303b617574683d6b30' +
                    '3b61736d3d6b303b64656c3d6b303b696e763d6b30').toArrayBuffer()
      ));

      const did = 'did:dht:9tjoow45ef1hksoo96bmzkwwy3mhme95d7fsi3ezjyjghmp75qyo';
      const didResolutionResult = await DidDht.resolve(did);

      expect(didResolutionResult.didDocumentMetadata).to.have.property('types');
      expect(didResolutionResult.didDocumentMetadata.types).to.have.length(2);
      expect(didResolutionResult.didDocumentMetadata.types).to.include(DidDhtRegisteredDidType.FinancialInstitution);
      expect(didResolutionResult.didDocumentMetadata.types).to.include(DidDhtRegisteredDidType.WebApp);
    });

    it('returns a notFound error if the DID is not published', async () => {
      // Mock the response from the Pkarr relay rather than calling over the network.
      fetchStub.resolves(fetchNotFoundResponse());

      const did = 'did:dht:5634graogy41ow91cc78up6i45a9mcscccruwer9o4ah5wcc1xmy';
      const didResolutionResult = await DidDht.resolve(did);

      expect(didResolutionResult.didResolutionMetadata).to.have.property('error', 'notFound');
    });

    it('returns a invalidDidDocumentLength error if the Pkarr relay returns smaller than the 72 byte minimum', async () => {
      // Mock the response from the Pkarr relay rather than calling over the network.
      fetchStub.resolves(fetchOkResponse(
        new Uint8Array(71).buffer
      ));

      const did = 'did:dht:pjiiw7ibn6t9k1mkknkowjketa8chksgwzkt5uk8798epux1386o';
      const didResolutionResult = await DidDht.resolve(did);

      expect(didResolutionResult.didResolutionMetadata).to.have.property('error', 'invalidDidDocumentLength');
    });

    it('returns a invalidDidDocumentLength error if the Pkarr relay returns larger than the 1072 byte maximum', async () => {
      // Mock the response from the Pkarr relay rather than calling over the network.
      fetchStub.resolves(fetchOkResponse(
        new Uint8Array(1073).buffer
      ));

      const did = 'did:dht:pjiiw7ibn6t9k1mkknkowjketa8chksgwzkt5uk8798epux1386o';
      const didResolutionResult = await DidDht.resolve(did);

      expect(didResolutionResult.didResolutionMetadata).to.have.property('error', 'invalidDidDocumentLength');
    });
  });

  describe('toKeys()', () => {
    it('returns a single verification method for a DID, by default', async () => {
      // Create a DID to use for the test.
      const did = await DidDht.create();

      const portableDid = await DidDht.toKeys({ did });

      expect(portableDid).to.have.property('verificationMethods');
      expect(portableDid.verificationMethods).to.have.length(1);
      expect(portableDid.verificationMethods[0]).to.have.property('publicKeyJwk');
      expect(portableDid.verificationMethods[0]).to.have.property('privateKeyJwk');
      expect(portableDid.verificationMethods[0]).to.have.property('purposes');
      expect(portableDid.verificationMethods[0]).to.have.property('type');
      expect(portableDid.verificationMethods[0]).to.have.property('id');
      expect(portableDid.verificationMethods[0]).to.have.property('controller');
    });

    it('output can be used to instantiate a DID object', async () => {
      // Create a DID to use for the test.
      const did = await DidDht.create();

      // Convert the DID to a portable format.
      const portableDid = await DidDht.toKeys({ did });

      // Stub the DID resolve method to return the expected DID document and metadata.
      const resolveStub = sinon.stub(DidDht, 'resolve').returns(Promise.resolve({
        didDocument           : did.didDocument,
        didDocumentMetadata   : did.metadata,
        didResolutionMetadata : {}
      }));

      // Create a DID object from the portable format.
      const didFromPortable = await DidDht.fromKeys(portableDid);

      expect(didFromPortable.didDocument).to.deep.equal(did.didDocument);
      expect(didFromPortable.metadata).to.deep.equal(did.metadata);

      resolveStub.restore();
    });
  });
});