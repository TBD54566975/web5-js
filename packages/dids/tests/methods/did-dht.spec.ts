import type { PortableDid } from '../../src/types/portable-did.js';

import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import resolveTestVectors from '../../../../web5-spec/test-vectors/did_dht/resolve.json' assert { type: 'json' };
import officialTestVector1 from '../fixtures/test-vectors/did-dht/vector-1.json' assert { type: 'json' };
import officialTestVector2 from '../fixtures/test-vectors/did-dht/vector-2.json' assert { type: 'json' };
import officialTestVector3 from '../fixtures/test-vectors/did-dht/vector-3.json' assert { type: 'json' };

import { Answer } from '@dnsquery/dns-packet';
import { Convert } from '@web5/common';
import { DidDocument } from '../../src/index.js';
import { DidErrorCode } from '../../src/did-error.js';
import { DidDht, DidDhtDocument, DidDhtRegisteredDidType, DidDhtUtils } from '../../src/methods/did-dht.js';
import { expect, use } from 'chai';

use(chaiAsPromised);

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
    sinon.restore();
  });

  describe('create()', () => {
    it('creates a DID with a single verification method, by default', async () => {
      const did = await DidDht.create();

      expect(did).to.have.property('document');
      expect(did).to.have.property('getSigner');
      expect(did).to.have.property('keyManager');
      expect(did).to.have.property('metadata');
      expect(did).to.have.property('uri');

      expect(did.document).to.have.property('verificationMethod');
      expect(did.document.verificationMethod).to.have.length(1);
    });

    it('handles creating DIDs with additional Ed25519 verification methods', async () => {
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

      expect(did.document.verificationMethod).to.have.length(2);
      expect(did.document.verificationMethod?.[1].publicKeyJwk).to.have.property('crv', 'Ed25519');
    });

    it('handles creating DIDs with additional secp256k1 verification methods', async () => {
      const did = await DidDht.create({
        options: {
          verificationMethods: [
            {
              algorithm : 'secp256k1',
              purposes  : ['authentication', 'assertionMethod']
            }
          ]
        }
      });

      expect(did.document.verificationMethod).to.have.length(2);
      expect(did.document.verificationMethod?.[1].publicKeyJwk).to.have.property('crv', 'secp256k1');
    });

    it('handles creating DIDs with additional secp256r1 verification methods', async () => {
      const did = await DidDht.create({
        options: {
          verificationMethods: [
            {
              algorithm : 'secp256r1',
              purposes  : ['authentication', 'assertionMethod']
            }
          ]
        }
      });

      expect(did.document.verificationMethod).to.have.length(2);
      expect(did.document.verificationMethod?.[1].publicKeyJwk).to.have.property('crv', 'P-256');
    });

    it('allows one or more DID controller identifiers to be specified', async () => {
      let did = await DidDht.create({
        options: {
          controllers: 'did:example:1234'
        }
      });

      expect(did.document).to.have.property('controller', 'did:example:1234');

      did = await DidDht.create({
        options: {
          controllers: ['did:example:1234', 'did:example:5678']
        }
      });

      expect(did.document.controller).to.deep.equal(['did:example:1234', 'did:example:5678']);
    });

    it('allows one or more Also Known As identifiers to be specified', async () => {
      let did = await DidDht.create({
        options: {
          alsoKnownAs: ['did:example:1234']
        }
      });

      expect(did.document.alsoKnownAs).to.deep.equal(['did:example:1234']);

      did = await DidDht.create({
        options: {
          alsoKnownAs: ['did:example:1234', 'did:example:5678']
        }
      });

      expect(did.document.alsoKnownAs).to.deep.equal(['did:example:1234', 'did:example:5678']);
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

      expect(did.document.verificationMethod).to.have.length(2);
    });

    it('assigns 0 as the ID of the Identity Key verification method ', async () => {
      const did = await DidDht.create();

      expect(did.document.verificationMethod?.[0].id).to.include('#0');
    });

    it('uses the JWK thumbprint as the ID for additional verification methods if no id is provided', async () => {
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

      expect(did.document.verificationMethod?.[1].id).to.include(`#${did?.document?.verificationMethod?.[1]?.publicKeyJwk?.kid}`);
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

      expect(did.document.verificationMethod?.[1]).to.have.property('id', `${did.uri}#1`);
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

      expect(did.document.service).to.have.length(1);
      expect(did.document.service?.[0]).to.have.property('id', `${did.uri}#dwn`);
      expect(did.document.service?.[0]).to.have.property('type', 'DecentralizedWebNode');
      expect(did.document.service?.[0]).to.have.property('serviceEndpoint', 'https://example.com/dwn');
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

      expect(did.document.service).to.have.length(2);
      expect(did.document.service?.[0]).to.have.property('id', `${did.uri}#dwn`);
      expect(did.document.service?.[1]).to.have.property('id', `${did.uri}#oid4vci`);
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

      const identityKeyVerificationMethod = did.document?.verificationMethod?.find(
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

      expect(did.document.verificationMethod).to.have.length(3);
      expect(did.document.verificationMethod?.[1]).to.have.property('id', `${did.uri}#sig`);
      expect(did.document.verificationMethod?.[2]).to.have.property('id', `${did.uri}#enc`);
      expect(did.document.service).to.have.length(1);
      expect(did.document.service?.[0]).to.have.property('id', `${did.uri}#dwn`);
      expect(did.document.service?.[0]).to.have.property('type', 'DecentralizedWebNode');
      expect(did.document.service?.[0]).to.have.property('serviceEndpoint', 'https://example.com/dwn');
      expect(did.document.service?.[0]).to.have.property('enc', '#enc');
      expect(did.document.service?.[0]).to.have.property('sig', '#sig');
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
      const did = await DidDht.create();

      expect(did.metadata).to.have.property('published', true);
      expect(fetchStub.calledOnce).to.be.true;
    });

    it('allows DID publishing to optionally be disabled', async () => {
      const did = await DidDht.create({ options: { publish: false } });

      expect(did.metadata).to.have.property('published', false);
      expect(fetchStub.called).to.be.false;
    });

    it('returns a version ID in DID metadata when published', async () => {
      const did = await DidDht.create();
      expect(did.metadata).to.have.property('versionId');
      expect(did.metadata.versionId).to.be.a.string;
    });

    it('does not return a version ID in DID metadata when not published', async () => {
      const did = await DidDht.create({ options: { publish: false } });
      expect(did.metadata).to.not.have.property('versionId');
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

    it('throws an error if duplicate verification method IDs are given', async () => {
      try {
        await DidDht.create({
          options: {
            verificationMethods: [
              {
                algorithm : 'Ed25519',
                id        : '0',
                purposes  : ['authentication', 'assertionMethod']
              },
              {
                algorithm : 'secp256k1',
                id        : '0',
                purposes  : ['keyAgreement']
              }
            ]
          }
        });

        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('verification method IDs are not unique');
      }
    });

    it('throws an error if publishing fails', async () => {
      // Simulate a network error when attempting to publish the DID.
      fetchStub.rejects(new Error('Network error'));

      try {
        await DidDht.create();

        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.code).to.equal(DidErrorCode.InternalError);
        expect(error.message).to.include('Failed to put Pkarr record');
      }
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
        // Attempt to create a DID with DID Document that exceeds the maximum size.
        await DidDht.create({
          options: {
            verificationMethods: [
              { algorithm: 'Ed25519' },
              { algorithm: 'Ed25519' },
              { algorithm: 'Ed25519' },
              { algorithm: 'Ed25519' },
              { algorithm: 'Ed25519' },
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

  describe('getSigningMethod()', () => {
    it('returns an error if the DID method is not supported', async () => {
      try {
        await DidDht.getSigningMethod({ didDocument: { id: 'did:method:123' } });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.code).to.equal(DidErrorCode.MethodNotSupported);
        expect(error.message).to.include('Method not supported');
      }
    });

    it('throws an error if the DID Document does not any verification methods', async () => {
      try {
        await DidDht.getSigningMethod({
          didDocument: {
            id                 : 'did:dht:123',
            verificationMethod : []
          }
        });
        expect.fail('Error should have been thrown');
      } catch (error: any) {
        expect(error.message).to.include('method intended for signing could not be determined');
      }
    });
  });

  describe('import()', () => {
    let portableDid: PortableDid;

    beforeEach(() => {
      // Define a DID to use for the test.
      portableDid =  {
        uri      : 'did:dht:urex8kbn3ewbdrjq36obf3rpg8joomzpu1gb4cfkhj3ey4y9fqgo',
        document : {
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
        metadata    : {},
        privateKeys : [
          {
            crv : 'Ed25519',
            d   : '3OQkejC7rNiGQSPAugN8CFrIjHGemZh5hbtgD8GXUVw',
            kty : 'OKP',
            x   : 'mRDzqCLKKBGRLs-gEuSNMdMILu2cjB0wquJygGgfK40',
            kid : 'FuIkkMgnsq-XRX8gWp3HJpqwoIbyNNsx4Uk-tdDSqbE',
            alg : 'EdDSA'
          }
        ]
      };
    });

    it('returns a previously created DID from the URI and imported key material', async () => {
      const did = await DidDht.import({ portableDid });

      expect(did).to.have.property('document');
      expect(did).to.have.property('getSigner');
      expect(did).to.have.property('keyManager');
      expect(did).to.have.property('metadata');
      expect(did).to.have.property('uri', portableDid.uri);
    });

    it('returns a previously created DID from the URI and imported key material, with types', async () => {
      portableDid = {
        uri      : 'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo',
        document : {
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
        metadata: {
          types: [6, 7]
        },
        privateKeys: [
          {
            crv : 'Ed25519',
            d   : 'hdSIwbQwVD-fNOVEgt-k3mMl44Ip1iPi58Ex6VDGxqY',
            kty : 'OKP',
            x   : 'VYKm2SCIV9Vz3BRy-v5R9GHz3EOJCPvZ1_gP1e3XiB0',
            kid : 'cyvOypa6k-4ffsRWcza37s5XVOh1kO9ICUeo1ZxHVM8',
            alg : 'EdDSA',
          }
        ]
      };

      const did = await DidDht.import({ portableDid });

      expect(did.metadata).to.deep.equal({ types: [6, 7] });
    });

    it('can import exported PortableDid', async () => {
      // Create a DID to use for the test.
      const did = await DidDht.create();

      // Export the BearerDid to a portable format.
      const portableDid = await did.export();

      // Create a DID object from the portable format.
      const didFromPortable = await DidDht.import({ portableDid });

      expect(didFromPortable.document).to.deep.equal(did.document);
      expect(didFromPortable.metadata).to.deep.equal(did.metadata);
    });

    it('throws an error if the DID method is not supported', async () => {
      // Change the method to something other than 'dht'.
      portableDid.uri = 'did:unknown:abc123';

      try {
        await DidDht.import({ portableDid });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.code).to.equal(DidErrorCode.MethodNotSupported);
        expect(error.message).to.include('Method not supported');
      }
    });

    it('throws an error if an Identity Key is not included in the given verification methods', async () => {
      // Change the ID of the verification method to something other than 0.
      portableDid.document.verificationMethod![0].id = 'did:dht:urex8kbn3ewbdrjq36obf3rpg8joomzpu1gb4cfkhj3ey4y9fqgo#1';

      try {
        await DidDht.import({ portableDid });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('must contain an Identity Key');
      }
    });
  });

  describe('resolve()', () => {
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

    it('returns a version ID in DID document metadata', async () => {
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

      expect(didResolutionResult.didDocumentMetadata).to.have.property('versionId');
      expect(didResolutionResult.didDocumentMetadata.versionId).to.be.a.string;
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
});

describe('DidDhtDocument', () => {
  describe('fromDnsPacket()', () => {
    it('handles DID Resolution from DNS Packet', async () => {
      const didUri = 'did:dht:1ati6y645tprnm9nkqgguj718bmtqw5mbjq87ttbrntfokekzeso';

      const didResolutionResult = await DidDhtDocument.fromDnsPacket({
        didUri,
        dnsPacket: {
          id        : 0,
          type      : 'response',
          flags     : 1024,
          flag_qr   : true,
          opcode    : 'QUERY',
          flag_aa   : true,
          flag_tc   : false,
          flag_rd   : false,
          flag_ra   : false,
          flag_z    : false,
          flag_ad   : false,
          flag_cd   : false,
          rcode     : 'NOERROR',
          questions : [
          ],
          answers: [
            {
              name  : '_k0._did.1ati6y645tprnm9nkqgguj718bmtqw5mbjq87ttbrntfokekzeso',
              type  : 'TXT',
              ttl   : 7200,
              class : 'IN',
              data  : [
                new Uint8Array([105, 100, 61, 48, 59, 116, 61, 48, 59, 107, 61, 108, 105, 78, 102, 65, 57, 114, 99, 87, 107, 69, 118, 52, 108, 79, 77, 97, 97, 101, 121, 79, 70, 99, 88, 85, 50, 115, 75, 88, 72, 55, 71, 73, 83, 67, 105, 87, 67, 107, 75, 117, 105, 48]),
              ],
            },
            {
              name  : '_k1._did.1ati6y645tprnm9nkqgguj718bmtqw5mbjq87ttbrntfokekzeso',
              type  : 'TXT',
              ttl   : 7200,
              class : 'IN',
              data  : [
                new Uint8Array([105, 100, 61, 97, 117, 116, 104, 59, 116, 61, 48, 59, 107, 61, 97, 103, 66, 54, 55, 109, 113, 70, 88, 76, 45, 102, 79, 115, 95, 119, 122, 100, 74, 65, 85, 104, 86, 83, 53, 120, 90, 112, 70, 56, 50, 55, 55, 72, 88, 103, 86, 110, 121, 78, 103, 95, 99]),
              ],
            },
            {
              name  : '_k2._did.1ati6y645tprnm9nkqgguj718bmtqw5mbjq87ttbrntfokekzeso',
              type  : 'TXT',
              ttl   : 7200,
              class : 'IN',
              data  : [
                new Uint8Array([105, 100, 61, 97, 115, 115, 101, 114, 116, 59, 116, 61, 48, 59, 107, 61, 54, 121, 109, 110, 97, 118, 116, 77, 114, 98, 85, 71, 84, 65, 86, 45, 108, 86, 87, 108, 73, 115, 116, 73, 66, 121, 110, 86, 75, 50, 103, 114, 73, 95, 113, 68, 104, 109, 72, 100, 83, 113, 115]),
              ],
            },
            {
              name  : '_s0._did.1ati6y645tprnm9nkqgguj718bmtqw5mbjq87ttbrntfokekzeso',
              type  : 'TXT',
              ttl   : 7200,
              class : 'IN',
              data  : [
                new Uint8Array([105, 100, 61, 100, 119, 110, 59, 116, 61, 68, 101, 99, 101, 110, 116, 114, 97, 108, 105, 122, 101, 100, 87, 101, 98, 78, 111, 100, 101, 59, 115, 101, 61, 104, 116, 116, 112, 115, 58, 47, 47, 101, 120, 97, 109, 112, 108, 101, 46, 99, 111, 109, 47, 100, 119, 110, 59, 115, 105, 103, 61, 35, 97, 117, 116, 104, 44, 35, 97, 115, 115, 101, 114, 116]),
              ],
            },
            {
              name  : '_did.1ati6y645tprnm9nkqgguj718bmtqw5mbjq87ttbrntfokekzeso',
              type  : 'TXT',
              ttl   : 7200,
              class : 'IN',
              data  : [
                new Uint8Array([118, 61, 48, 59, 118, 109, 61, 107, 48, 44, 107, 49, 44, 107, 50, 59, 97, 117, 116, 104, 61, 107, 48, 44, 107, 49, 59, 97, 115, 109, 61, 107, 48, 44, 107, 50, 59, 100, 101, 108, 61, 107, 48, 59, 105, 110, 118, 61, 107, 48, 59, 115, 118, 99, 61, 115, 48]),
              ],
            },
          ],
          authorities: [
          ],
          additionals: [
          ],
        }
      });

      expect(didResolutionResult).to.have.property('didDocument');
      expect(didResolutionResult).to.have.property('didDocumentMetadata');
      expect(didResolutionResult).to.have.property('didResolutionMetadata');

      // Check the DID Document.
      expect(didResolutionResult.didDocument).to.have.property('id', didUri); // expected DID URI
      expect(didResolutionResult.didDocument?.verificationMethod).to.have.length(3); // expected 3 verification methods
      expect(didResolutionResult.didDocument?.verificationMethod![0].id).to.equal(`${didUri}#0`); // expected first verification method to be the identity key
      expect(didResolutionResult.didDocument?.verificationMethod![1].id).to.equal(`${didUri}#auth`); // expected second verification method to be #auth
      expect(didResolutionResult.didDocument?.verificationMethod![2].id).to.equal(`${didUri}#assert`); // expected third verification method to be #assert

      expect(didResolutionResult.didDocument?.service).to.have.length(1); // expected 1 service
      expect(didResolutionResult.didDocument?.service![0].id).to.equal(`${didUri}#dwn`); // expected service id
      expect(didResolutionResult.didDocument!.service![0].sig).to.have.length(2);
      expect(didResolutionResult.didDocument!.service![0].sig).to.deep.equal(['#auth', '#assert']);
    });
  });

  describe('DNS Packet e2e tests', () => {
    it('handles custom array for services', async () => {

      const didUri = 'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery';
      const dnsPacket = await DidDhtDocument.toDnsPacket({
        didDocument: {
          id                 : didUri,
          verificationMethod : [
            {
              id           : 'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#0',
              type         : 'JsonWebKey',
              controller   : 'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery',
              publicKeyJwk : {
                crv : 'Ed25519',
                kty : 'OKP',
                x   : '2zHGF5m_DhcPbBZB6ooIxIOR-Vw-yJVYSPo2NgCMkgg',
                kid : 'KDT9PKj4_z7gPk2s279Y-OGlMtt_L93oJzIaiVrrySU',
                alg : 'EdDSA',
              },
            },
            {
              id           : 'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#sig',
              type         : 'JsonWebKey',
              controller   : 'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery',
              publicKeyJwk : {
                crv : 'Ed25519',
                kty : 'OKP',
                x   : 'FrrBhqvAWxE4lstj-IWgN8_5-O4L1KuZjdNjn5bX_dw',
                kid : 'dRnxo2XQ7QT1is5WmpEefwEz3z4_4JdpGea6KWUn3ww',
                alg : 'EdDSA',
              },
            },
            {
              id           : 'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#enc',
              type         : 'JsonWebKey',
              controller   : 'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery',
              publicKeyJwk : {
                kty : 'EC',
                crv : 'secp256k1',
                x   : 'e1_pCWZwI9cxdrotVKIT8t75itk22XkpalDPx7pVpYQ',
                y   : '5cAlBmnzzuwRNuFtLhyFNdy9v1rVEqEgrFEiiwKMx5I',
                kid : 'jGYs9XgQMDH_PCDFWocTN0F06mTUOA1J1McVvluq4lM',
                alg : 'ES256K',
              },
            },
          ],
          authentication: [
            'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#0',
            'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#sig',
          ],
          assertionMethod: [
            'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#0',
            'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#sig',
          ],
          capabilityDelegation: [
            'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#0',
          ],
          capabilityInvocation: [
            'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#0',
          ],
          keyAgreement: [
            'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#enc',
          ],
          service: [
            {
              id              : 'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#dwn',
              type            : 'DecentralizedWebNode',
              serviceEndpoint : 'https://example.com/dwn',
              enc             : '#enc',
              sig             : ['#sig', '#0'],
            },
          ],
        },
        didMetadata: {
          published: false,
        }
      });

      for (const record of dnsPacket.answers ?? []) {
        if (record.name.startsWith('_s')) {
          expect(record.data).to.include('id=dwn');
          expect(record.data).to.include('t=DecentralizedWebNode');
          expect(record.data).to.include('se=https://example.com/dwn');
          expect(record.data).to.include('enc=#enc');
          expect(record.data).to.include('sig=#sig,#0');
        }
      }

      const didResolutionResult = await DidDhtDocument.fromDnsPacket({ didUri, dnsPacket });

      expect(didResolutionResult).to.have.property('didDocument');
      expect(didResolutionResult).to.have.property('didDocumentMetadata');
      expect(didResolutionResult).to.have.property('didResolutionMetadata');

      expect(didResolutionResult.didDocument).to.have.property('id', didUri);
      expect(didResolutionResult.didDocument!.service![0].sig).to.have.length(2);
      expect(didResolutionResult.didDocument!.service![0].sig).to.deep.equal(['#sig', '#0']);
    });

    it('handles custom string properties for services', async () => {
      const didUri = 'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery';

      const dnsPacket = await DidDhtDocument.toDnsPacket({
        didDocument: {
          id                 : didUri,
          verificationMethod : [
            {
              id           : 'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#0',
              type         : 'JsonWebKey',
              controller   : 'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery',
              publicKeyJwk : {
                crv : 'Ed25519',
                kty : 'OKP',
                x   : '2zHGF5m_DhcPbBZB6ooIxIOR-Vw-yJVYSPo2NgCMkgg',
                kid : 'KDT9PKj4_z7gPk2s279Y-OGlMtt_L93oJzIaiVrrySU',
                alg : 'EdDSA',
              },
            },
            {
              id           : 'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#sig',
              type         : 'JsonWebKey',
              controller   : 'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery',
              publicKeyJwk : {
                crv : 'Ed25519',
                kty : 'OKP',
                x   : 'FrrBhqvAWxE4lstj-IWgN8_5-O4L1KuZjdNjn5bX_dw',
                kid : 'dRnxo2XQ7QT1is5WmpEefwEz3z4_4JdpGea6KWUn3ww',
                alg : 'EdDSA',
              },
            },
            {
              id           : 'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#enc',
              type         : 'JsonWebKey',
              controller   : 'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery',
              publicKeyJwk : {
                kty : 'EC',
                crv : 'secp256k1',
                x   : 'e1_pCWZwI9cxdrotVKIT8t75itk22XkpalDPx7pVpYQ',
                y   : '5cAlBmnzzuwRNuFtLhyFNdy9v1rVEqEgrFEiiwKMx5I',
                kid : 'jGYs9XgQMDH_PCDFWocTN0F06mTUOA1J1McVvluq4lM',
                alg : 'ES256K',
              },
            },
          ],
          authentication: [
            'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#0',
            'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#sig',
          ],
          assertionMethod: [
            'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#0',
            'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#sig',
          ],
          capabilityDelegation: [
            'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#0',
          ],
          capabilityInvocation: [
            'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#0',
          ],
          keyAgreement: [
            'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#enc',
          ],
          service: [
            {
              id              : 'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#dwn',
              type            : 'DecentralizedWebNode',
              serviceEndpoint : 'https://example.com/dwn',
              enc             : '#enc',
              sig             : '#sig',
            },
          ],
        },
        didMetadata: {
          published: false,
        }
      });

      for (const record of dnsPacket.answers ?? []) {
        if (record.name.startsWith('_s')) {
          expect(record.data).to.include('id=dwn');
          expect(record.data).to.include('t=DecentralizedWebNode');
          expect(record.data).to.include('se=https://example.com/dwn');
          expect(record.data).to.include('enc=#enc');
          expect(record.data).to.include('sig=#sig');
        }
      }

      const didResolutionResult = await DidDhtDocument.fromDnsPacket({ didUri, dnsPacket });

      expect(didResolutionResult).to.have.property('didDocument');
      expect(didResolutionResult).to.have.property('didDocumentMetadata');
      expect(didResolutionResult).to.have.property('didResolutionMetadata');

      expect(didResolutionResult.didDocument).to.have.property('id', didUri);
      expect(didResolutionResult.didDocument!.service![0].sig).to.equal('#sig');
      expect(didResolutionResult.didDocument!.service![0].enc).to.equal('#enc');
    });

    it('handles user defined Key Ids', async () => {
      const didUri = 'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery';
      const dnsPacket = await DidDhtDocument.toDnsPacket({
        didDocument: {
          id                 : didUri,
          verificationMethod : [
            {
              id           : 'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#0',
              type         : 'JsonWebKey',
              controller   : 'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery',
              publicKeyJwk : {
                crv : 'Ed25519',
                kty : 'OKP',
                x   : '2zHGF5m_DhcPbBZB6ooIxIOR-Vw-yJVYSPo2NgCMkgg',
                kid : '0',
                alg : 'EdDSA',
              },
            },
            {
              id           : 'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#sig',
              type         : 'JsonWebKey',
              controller   : 'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery',
              publicKeyJwk : {
                crv : 'Ed25519',
                kty : 'OKP',
                x   : 'FrrBhqvAWxE4lstj-IWgN8_5-O4L1KuZjdNjn5bX_dw',
                kid : 'sig',
                alg : 'EdDSA',
              },
            },
            {
              id           : 'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#enc',
              type         : 'JsonWebKey',
              controller   : 'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery',
              publicKeyJwk : {
                kty : 'EC',
                crv : 'secp256k1',
                x   : 'e1_pCWZwI9cxdrotVKIT8t75itk22XkpalDPx7pVpYQ',
                y   : '5cAlBmnzzuwRNuFtLhyFNdy9v1rVEqEgrFEiiwKMx5I',
                kid : 'enc',
                alg : 'ES256K',
              },
            },
          ],
          authentication: [
            'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#0',
            'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#sig',
          ],
          assertionMethod: [
            'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#0',
            'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#sig',
          ],
          capabilityDelegation: [
            'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#0',
          ],
          capabilityInvocation: [
            'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#0',
          ],
          keyAgreement: [
            'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#enc',
          ],
        },
        didMetadata: {
          published: false,
        }
      });

      for (const record of dnsPacket.answers ?? []) {
        if (record.name.startsWith('_k1')) {
          expect(record.data).to.include('id=sig');
          expect(record.data).to.include('t=0');
        } else if (record.name.startsWith('_k2')) {
          expect(record.data).to.include('id=enc');
          expect(record.data).to.include('t=1');
        }
      }

      const didResolutionResult = await DidDhtDocument.fromDnsPacket({ didUri, dnsPacket });

      expect(didResolutionResult).to.have.property('didDocument');
      expect(didResolutionResult).to.have.property('didDocumentMetadata');
      expect(didResolutionResult).to.have.property('didResolutionMetadata');

      expect(didResolutionResult.didDocument).to.have.property('id', didUri);
      expect(didResolutionResult.didDocument!.verificationMethod![0].id).to.equal(`${didUri}#0`);
      expect(didResolutionResult.didDocument!.verificationMethod![1].id).to.equal(`${didUri}#sig`);
      expect(didResolutionResult.didDocument!.verificationMethod![2].id).to.equal(`${didUri}#enc`);
    });

    it('handles custom controller for verification methods', async () => {
      const didUri = 'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery';
      const customController = 'did:dht:i9xkp8ddcbcg8jwq54ox699wuzxyifsqx4jru45zodqu453ksz6y';
      const dnsPacket = await DidDhtDocument.toDnsPacket({
        didDocument: {
          id                 : didUri,
          verificationMethod : [
            {
              id           : 'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#0',
              type         : 'JsonWebKey',
              controller   : 'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery',
              publicKeyJwk : {
                crv : 'Ed25519',
                kty : 'OKP',
                x   : '2zHGF5m_DhcPbBZB6ooIxIOR-Vw-yJVYSPo2NgCMkgg',
                kid : '0',
                alg : 'EdDSA',
              },
            },
            {
              id           : 'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#0GkvkdCGu3DL7Mkv0W1DhTMCBT9-z0CkFqZoJQtw7vw',
              type         : 'JsonWebKey',
              controller   : customController,
              publicKeyJwk : {
                crv : 'secp256k1',
                kty : 'EC',
                x   : '1_o0IKHGNamet8-3VYNUTiKlhVK-LilcKrhJSPHSNP0',
                y   : 'qzU8qqh0wKB6JC_9HCu8pHE-ZPkDpw4AdJ-MsV2InVY',
                kid : '0GkvkdCGu3DL7Mkv0W1DhTMCBT9-z0CkFqZoJQtw7vw',
                alg : 'ES256K',
              },
            },
          ],
          authentication: [
            'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#0',
            'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#0GkvkdCGu3DL7Mkv0W1DhTMCBT9-z0CkFqZoJQtw7vw',
          ],
          assertionMethod: [
            'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#0',
            'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#0GkvkdCGu3DL7Mkv0W1DhTMCBT9-z0CkFqZoJQtw7vw',
          ],
          capabilityDelegation: [
            'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#0',
          ],
          capabilityInvocation: [
            'did:dht:5cahcfh3zh8bqd5cn3y6inoea1b3d6kh85rjksne9e5dcyrc1ery#0',
          ],
        },
        didMetadata: {
          published: false,
        }
      });

      // check for key controller controller
      for (const record of dnsPacket.answers ?? []) {
        if (record.name.startsWith('_k1')) {
          expect(record.data).to.include('t=1');
          expect(record.data).to.include(`c=${customController}`);
        }
      }

      const didResolutionResult = await DidDhtDocument.fromDnsPacket({ didUri, dnsPacket });

      expect(didResolutionResult).to.have.property('didDocument');
      expect(didResolutionResult).to.have.property('didDocumentMetadata');
      expect(didResolutionResult).to.have.property('didResolutionMetadata');

      expect(didResolutionResult.didDocument).to.have.property('id', didUri);
      expect(didResolutionResult.didDocument!.verificationMethod).to.have.length(2);
      expect(didResolutionResult.didDocument!.verificationMethod![0].controller).to.equal(didUri); // identity key
      expect(didResolutionResult.didDocument!.verificationMethod![1].controller).to.equal(customController); // custom controller
    });
  });

  describe('Web5TestVectorsDidDht', () => {
    it('resolve', async () => {
      for (const vector of resolveTestVectors.vectors as any[]) {
        const didResolutionResult = await DidDht.resolve(vector.input.didUri);
        expect(didResolutionResult.didResolutionMetadata.error).to.equal(vector.output.didResolutionMetadata.error);
      }
    }).timeout(30000); // Set timeout to 30 seconds for this test for did:dht resolution timeout test
  });
});

describe('DidDhtUtils', () => {
  it('validatePreviousDidProof()', async () => {
    // reuse an existing previous proof from the official test vector 3, but use a different new DID
    const previousDidProof = { ...officialTestVector3.previousDidProof };
    const newDid = (await DidDht.create()).document.id;

    await expect(DidDhtUtils.validatePreviousDidProof({ newDid, previousDidProof })).to.be.rejectedWith(DidErrorCode.InvalidPreviousDidProof);
  });
});

// vectors come from https://did-dht.com/#test-vectors
describe('Official DID:DHT Vector tests', () => {
  it('vector 1', async () => {
    const inputDidDocument = officialTestVector1.didDocument as DidDocument;
    const dnsPacket = await DidDhtDocument.toDnsPacket({
      didDocument : inputDidDocument,
      didMetadata : { published: false }
    });

    expect(dnsPacket.answers).to.have.length(officialTestVector1.dnsRecords.length);

    const normalizedConstructedRecords = normalizeDnsRecords(dnsPacket.answers!);
    expect(normalizedConstructedRecords).to.deep.include.members(officialTestVector1.dnsRecords);

    const didResolutionResult = await DidDhtDocument.fromDnsPacket({
      didUri    : inputDidDocument.id,
      dnsPacket : dnsPacket
    });

    expect(didResolutionResult.didDocument).to.deep.equal(inputDidDocument);
  });

  it('vector 2', async () => {
    const inputDidDocument = officialTestVector2.didDocument as DidDocument;
    const dnsPacket = await DidDhtDocument.toDnsPacket({
      didDocument : inputDidDocument,
      didMetadata : {
        published : false,
        types     : [DidDhtRegisteredDidType.Organization, DidDhtRegisteredDidType.Government, DidDhtRegisteredDidType.Corporation]
      },
      authoritativeGatewayUris: officialTestVector2.authoritativeGatewayUris,
    });

    expect(dnsPacket.answers).to.have.length(officialTestVector2.dnsRecords.length);

    const normalizedConstructedRecords = normalizeDnsRecords(dnsPacket.answers!);
    expect(normalizedConstructedRecords).to.deep.include.members(officialTestVector2.dnsRecords);

    const didResolutionResult = await DidDhtDocument.fromDnsPacket({
      didUri    : inputDidDocument.id,
      dnsPacket : dnsPacket
    });

    expect(didResolutionResult.didDocument).to.deep.equal(inputDidDocument);
  });

  it('vector 3', async () => {
    const inputDidDocument = officialTestVector3.didDocument as DidDocument;
    const dnsPacket = await DidDhtDocument.toDnsPacket({
      didDocument : inputDidDocument,
      didMetadata : {
        published: false
      },
      authoritativeGatewayUris : officialTestVector3.authoritativeGatewayUris,
      previousDidProof         : officialTestVector3.previousDidProof,
    });

    expect(dnsPacket.answers).to.have.length(officialTestVector3.dnsRecords.length);

    const normalizedConstructedRecords = normalizeDnsRecords(dnsPacket.answers!);
    expect(normalizedConstructedRecords).to.deep.include.members(officialTestVector3.dnsRecords);

    const didResolutionResult = await DidDhtDocument.fromDnsPacket({
      didUri    : inputDidDocument.id,
      dnsPacket : dnsPacket
    });

    expect(didResolutionResult.didDocument).to.deep.equal(inputDidDocument);
  });
});

/**
 * Normalizes the DNS records in the format of the DNS library we use to the format used in the test vectors.
 *
 *  NOTE: the DNS library we use uses name `data` instead of `rdata` used in DID:DHT spec,
 *  but prefer to keep the naming in test vector files identical to that of the DID:DHT spec hence this additional normalization step.
 */
function normalizeDnsRecords(dnsRecords: Answer[]): Record<string, any> {

  const normalizedRecords = dnsRecords.map(record => {
    const { data: rdata, ...otherProperties } = record;
    return {
      ...otherProperties,
      rdata
    };
  });

  return normalizedRecords;
}