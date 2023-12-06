import type { PublicKeyJwk } from '@web5/crypto';

import sinon from 'sinon';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import type { DidDhtKeySet } from '../src/did-dht.js';
import type { DidDocument, DidKeySetVerificationMethodKey, DidService, PortableDid } from '../src/types.js';

import { DidDht } from '../src/dht.js';
import { parseDid } from '../src/utils.js';
import { DidDhtMethod } from '../src/did-dht.js';
import { DidResolver } from '../src/did-resolver.js';

chai.use(chaiAsPromised);

describe('DidDhtMethod', () => {
  describe('generateJwkKeyPair()', () => {
    it('generates Ed25519 JWK key pairs', async () => {
      const ed25519KeyPair = await DidDhtMethod.generateJwkKeyPair({ keyAlgorithm: 'Ed25519' });

      expect(ed25519KeyPair).to.exist;
      expect(ed25519KeyPair).to.have.property('privateKeyJwk');
      expect(ed25519KeyPair).to.have.property('publicKeyJwk');
      expect(ed25519KeyPair.publicKeyJwk.kid).to.exist;
      expect(ed25519KeyPair.publicKeyJwk.alg).to.equal('EdDSA');
      expect(ed25519KeyPair.publicKeyJwk.kty).to.equal('OKP');
    });

    it('generates secp256k1 JWK key pairs', async () => {
      const secp256k1KeyPair = await DidDhtMethod.generateJwkKeyPair({ keyAlgorithm: 'secp256k1' });

      expect(secp256k1KeyPair).to.exist;
      expect(secp256k1KeyPair).to.have.property('privateKeyJwk');
      expect(secp256k1KeyPair).to.have.property('publicKeyJwk');
      expect(secp256k1KeyPair.publicKeyJwk.kid).to.exist;
      expect(secp256k1KeyPair.publicKeyJwk.alg).to.equal('ES256K');
      expect(secp256k1KeyPair.publicKeyJwk.kty).to.equal('EC');
    });

    it('throws an error if an unsupported key algorithm is passed in', async () => {
      await expect(
        DidDhtMethod.generateJwkKeyPair({ keyAlgorithm: 'unsupported' as any })
      ).to.be.rejectedWith(Error, 'unsupported');
    });
  });

  describe('getDidIdentifierFragment()', () => {
    it('should return the encoded identifier fragment for a given public key', async () => {
      const testPublicKey: PublicKeyJwk = {
        kty       : 'OKP',
        crv       : 'Ed25519',
        x         : '9ZOlXQ7pZw7voYfQsrPPzvd1dA4ktXB5VbD1PWvl_jg',
        ext       : 'true',
        'key_ops' : ['verify']
      };

      const result = await DidDhtMethod.getDidIdentifierFragment({ key: testPublicKey });

      expect(result).to.equal('6sj4kzeq7fuo757bo9emfc6x355zk7yqr14zy6kisd4u449f9ahy');
    });
  });

  describe('resolve()', () => {
    it(`should return 'internalError' if DHT request throws error`, async () => {
      const dhtDidResolutionStub = sinon.stub(DidDht, 'getDidDocument').rejects(new Error('Invalid SignedPacket bytes length, expected at least 72 bytes but got: 25'));

      const didResolutionResult = await DidDhtMethod.resolve({ didUrl: 'did:dht:h4d3ixkwt6q5a455tucw7j14jmqyghdtbr6cpiz6on5oxj5bpr3o' });
      const didResolutionMetadata = didResolutionResult.didResolutionMetadata;
      expect(didResolutionMetadata.error).to.equal('internalError');

      expect(dhtDidResolutionStub.calledOnce).to.be.true;
      sinon.restore();
    });
  });

  describe('key sets', () => {
    it('should generate a key set with the identity key if no keys are passed in', async () => {
      const keySet = await DidDhtMethod.generateKeySet();

      expect(keySet).to.exist;
      expect(keySet).to.have.property('verificationMethodKeys');
      expect(keySet).to.not.have.property('recoveryKey');
      expect(keySet).to.not.have.property('updateKey');
      expect(keySet).to.not.have.property('signingKey');
      expect(keySet.verificationMethodKeys).to.have.lengthOf(1);
      expect(keySet.verificationMethodKeys[0].publicKeyJwk.kid).to.equal('0');
    });

    it('should return the key set unmodified if only the identity key is passed in', async () => {
      const ed25519KeyPair = await DidDhtMethod.generateJwkKeyPair({ keyId: '0', keyAlgorithm: 'Ed25519' });
      const identityKey: DidKeySetVerificationMethodKey = {
        publicKeyJwk  : ed25519KeyPair.publicKeyJwk,
        privateKeyJwk : ed25519KeyPair.privateKeyJwk,
        relationships : ['authentication', 'assertionMethod', 'capabilityInvocation', 'capabilityDelegation']
      };

      const keySet = await DidDhtMethod.generateKeySet({ keySet: { verificationMethodKeys: [identityKey] } });

      expect(keySet).to.exist;
      expect(keySet).to.have.property('verificationMethodKeys');
      expect(keySet).to.not.have.property('recoveryKey');
      expect(keySet).to.not.have.property('updateKey');
      expect(keySet).to.not.have.property('signingKey');
      expect(keySet.verificationMethodKeys).to.have.lengthOf(1);
      expect(keySet.verificationMethodKeys[0]).to.deep.equal(identityKey);
    });

    it('should generate the identity key if non-identity keys are passed in', async () => {
      const ed25519KeyPair = await DidDhtMethod.generateJwkKeyPair({ keyAlgorithm: 'Ed25519' });
      const vm: DidKeySetVerificationMethodKey = {
        publicKeyJwk  : ed25519KeyPair.publicKeyJwk,
        privateKeyJwk : ed25519KeyPair.privateKeyJwk,
        relationships : ['authentication', 'assertionMethod', 'capabilityInvocation', 'capabilityDelegation']
      };

      const keySet = await DidDhtMethod.generateKeySet({ keySet: { verificationMethodKeys: [vm] } });

      expect(keySet).to.exist;
      expect(keySet).to.have.property('verificationMethodKeys');
      expect(keySet).to.not.have.property('recoveryKey');
      expect(keySet).to.not.have.property('updateKey');
      expect(keySet).to.not.have.property('signingKey');
      expect(keySet.verificationMethodKeys).to.have.lengthOf(2);

      if (keySet.verificationMethodKeys[0].publicKeyJwk.kid === '0') {
        expect(keySet.verificationMethodKeys[1].publicKeyJwk.kid).to.not.equal('0');
      } else {
        expect(keySet.verificationMethodKeys[1].publicKeyJwk.kid).to.equal('0');
      }
    });

    it('should generate key ID values for provided keys, if missing', async () => {
      const ed25519KeyPair = await DidDhtMethod.generateJwkKeyPair({ keyAlgorithm: 'Ed25519' });

      // Remove the kid values from the key pair.
      delete ed25519KeyPair.publicKeyJwk.kid;
      delete ed25519KeyPair.privateKeyJwk.kid;

      const vm: DidKeySetVerificationMethodKey = {
        publicKeyJwk  : ed25519KeyPair.publicKeyJwk,
        privateKeyJwk : ed25519KeyPair.privateKeyJwk,
        relationships : ['authentication', 'assertionMethod', 'capabilityInvocation', 'capabilityDelegation']
      };

      const keySet = await DidDhtMethod.generateKeySet({ keySet: { verificationMethodKeys: [vm] } });

      // Verify that the key ID values were generated.
      expect(keySet.verificationMethodKeys[0].publicKeyJwk.kid).to.exist;
      expect(keySet.verificationMethodKeys[0].privateKeyJwk.kid).to.exist;
      expect(keySet.verificationMethodKeys[1].publicKeyJwk.kid).to.exist;
      expect(keySet.verificationMethodKeys[1].privateKeyJwk.kid).to.exist;
    });
  });

  describe('DIDs', () => {
    it('should generate a DID identifier given a public key jwk', async () => {
      const ed25519KeyPair = await DidDhtMethod.generateJwkKeyPair({ keyAlgorithm: 'Ed25519' });
      const did = await DidDhtMethod.getDidIdentifier({ key: ed25519KeyPair.publicKeyJwk });

      expect(did).to.exist;
      expect(did).to.contain('did:dht:');
    });

    it('should create a DID document without options', async () => {
      const { document, keySet } = await DidDhtMethod.create();

      expect(document).to.exist;
      expect(document.id).to.contain('did:dht:');
      expect(document.verificationMethod).to.exist;
      expect(document.verificationMethod).to.have.lengthOf(1);
      expect(document.verificationMethod[0].id).to.equal(`${document.id}#0`);
      expect(document.verificationMethod[0].publicKeyJwk).to.exist;
      expect(document.verificationMethod[0].publicKeyJwk.kid).to.equal('0');

      expect(document.service).to.not.exist;
      expect(document.assertionMethod.length).to.equal(1);
      expect(document.assertionMethod[0]).to.equal(`#0`);
      expect(document.authentication.length).to.equal(1);
      expect(document.authentication[0]).to.equal(`#0`);
      expect(document.capabilityDelegation.length).to.equal(1);
      expect(document.capabilityDelegation[0]).to.equal(`#0`);
      expect(document.capabilityInvocation.length).to.equal(1);
      expect(document.capabilityInvocation[0]).to.equal(`#0`);

      const ks = keySet as DidDhtKeySet;
      expect(ks).to.exist;
      const identityKey = keySet.verificationMethodKeys.find(key => key.publicKeyJwk.kid === '0');
      expect(identityKey).to.exist;
      expect(identityKey.publicKeyJwk).to.exist;
      expect(identityKey.privateKeyJwk).to.exist;
      expect(identityKey.publicKeyJwk.kid).to.equal('0');
    });

    it('should create a DID document with a non identity key option', async () => {
      const ed25519KeyPair = await DidDhtMethod.generateJwkKeyPair({ keyAlgorithm: 'Ed25519' });
      const keySet: DidDhtKeySet = {
        verificationMethodKeys: [{
          publicKeyJwk  : ed25519KeyPair.publicKeyJwk,
          privateKeyJwk : ed25519KeyPair.privateKeyJwk,
          relationships : ['authentication', 'assertionMethod', 'capabilityInvocation', 'capabilityDelegation']
        }]
      };

      const { document } = await DidDhtMethod.create({ keySet });

      expect(document).to.exist;
      expect(document.id).to.contain('did:dht:');
      expect(document.verificationMethod).to.exist;
      expect(document.verificationMethod).to.have.lengthOf(2);
      expect(document.verificationMethod[1].id).to.equal(`${document.id}#0`);
      expect(document.verificationMethod[1].publicKeyJwk).to.exist;
      expect(document.verificationMethod[1].publicKeyJwk.kid).to.equal('0');

      expect(document.service).to.not.exist;
      expect(document.assertionMethod.length).to.equal(2);
      expect(document.assertionMethod[1]).to.equal(`#0`);
      expect(document.authentication.length).to.equal(2);
      expect(document.authentication[1]).to.equal(`#0`);
      expect(document.capabilityDelegation.length).to.equal(2);
      expect(document.capabilityDelegation[1]).to.equal(`#0`);
      expect(document.capabilityInvocation.length).to.equal(2);
      expect(document.capabilityInvocation[1]).to.equal(`#0`);

      expect(keySet).to.exist;
      const identityKey = keySet.verificationMethodKeys.find(key => key.publicKeyJwk.kid === '0');
      expect(identityKey).to.exist;
      expect(identityKey.publicKeyJwk).to.exist;
      expect(identityKey.privateKeyJwk).to.exist;
      expect(identityKey.publicKeyJwk.kid).to.equal('0');
    });

    it('should create a DID document with services', async () => {
      const services: DidService[] = [{
        id              : 'agentId',
        type            : 'agent',
        serviceEndpoint : 'https://example.com/agent'
      }];
      const { document } = await DidDhtMethod.create({ services });

      expect(document).to.exist;
      expect(document.id).to.contain('did:dht:');
      expect(document.verificationMethod).to.exist;
      expect(document.verificationMethod).to.have.lengthOf(1);
      expect(document.verificationMethod[0].id).to.equal(`${document.id}#0`);
      expect(document.verificationMethod[0].publicKeyJwk).to.exist;
      expect(document.verificationMethod[0].publicKeyJwk.kid).to.equal('0');

      expect(document.service).to.exist;
      expect(document.service).to.have.lengthOf(1);
      expect(document.service[0].id).to.equal(`${document.id}#agentId`);
      expect(document.assertionMethod.length).to.equal(1);
      expect(document.assertionMethod[0]).to.equal(`#0`);
      expect(document.authentication.length).to.equal(1);
      expect(document.authentication[0]).to.equal(`#0`);
      expect(document.capabilityDelegation.length).to.equal(1);
      expect(document.capabilityDelegation[0]).to.equal(`#0`);
      expect(document.capabilityInvocation.length).to.equal(1);
      expect(document.capabilityInvocation[0]).to.equal(`#0`);
    });
  });

  describe('DID publishing and resolving', function () {
    it('should publish and DID should be resolvable', async () => {
      const { document, keySet } = await DidDhtMethod.create();
      const identityKey = keySet.verificationMethodKeys.find(key => key.publicKeyJwk.kid === '0');

      const dhtDidPublishStub = sinon.stub(DidDht, 'publishDidDocument').resolves(true);
      const dhtDidResolutionStub = sinon.stub(DidDhtMethod, 'resolve').resolves({
        '@context'            : 'https://w3id.org/did-resolution/v1',
        didDocument           : document,
        didDocumentMetadata   : {},
        didResolutionMetadata : {
          contentType : 'application/did+json',
          did         : {
            didString        : document.id,
            methodSpecificId : parseDid({ didUrl: document.id }).id,
            method           : 'dht'
          }
        }
      });

      const isPublished = await DidDhtMethod.publish({ identityKey, didDocument: document });
      expect(isPublished).to.be.true;

      const didResolutionResult = await DidDhtMethod.resolve({ didUrl: document.id });
      const didDocument = didResolutionResult.didDocument;
      expect(didDocument.id).to.deep.equal(document.id);

      expect(dhtDidPublishStub.calledOnce).to.be.true;
      expect(dhtDidResolutionStub.calledOnce).to.be.true;
      sinon.restore();
    });

    it('should create with publish and return a DID document', async () => {
      const mockDocument: PortableDid = {
        keySet   : 'any' as any,
        did      : 'did:dht:123456789abcdefghi',
        document : {
          id                 : 'did:dht:123456789abcdefghi',
          verificationMethod : [{
            id           : 'did:dht:123456789abcdefghi#0',
            type         : 'JsonWebKey2020',
            controller   : 'did:dht:123456789abcdefghi',
            publicKeyJwk : {
              kty : 'OKP',
              crv : 'Ed25519',
              kid : '0',
              x   : 'O2onvM62pC1io6jQKm8Nc2UyFXcd4kOmOsBIoYtZ2ik'
            }
          }],
          assertionMethod      : ['did:dht:123456789abcdefghi#0'],
          authentication       : ['did:dht:123456789abcdefghi#0'],
          capabilityDelegation : ['did:dht:123456789abcdefghi#0'],
          capabilityInvocation : ['did:dht:123456789abcdefghi#0']
        }
      };
      const didDhtCreateStub = sinon.stub(DidDhtMethod, 'create').resolves(mockDocument);

      const { document } = await DidDhtMethod.create({ publish: true });
      const did = document.id;

      const dhtDidResolutionStub = sinon.stub(DidDhtMethod, 'resolve').resolves({
        '@context'            : 'https://w3id.org/did-resolution/v1',
        didDocument           : document,
        didDocumentMetadata   : {},
        didResolutionMetadata : {
          contentType : 'application/did+json',
          did         : {
            didString        : 'did:dht:123456789abcdefgh',
            methodSpecificId : '123456789abcdefgh',
            method           : 'dht'
          }
        }
      });

      const didResolutionResult = await DidDhtMethod.resolve({ didUrl: did });
      const resolvedDocument = didResolutionResult.didDocument;
      expect(resolvedDocument.id).to.deep.equal(document.id);
      expect(resolvedDocument.service).to.deep.equal(document.service);
      expect(resolvedDocument.verificationMethod[0].id).to.deep.equal(document.verificationMethod[0].id);
      expect(resolvedDocument.verificationMethod[0].type).to.deep.equal(document.verificationMethod[0].type);
      expect(resolvedDocument.verificationMethod[0].controller).to.deep.equal(document.verificationMethod[0].controller);
      expect(resolvedDocument.verificationMethod[0].publicKeyJwk.kid).to.deep.equal(document.verificationMethod[0].publicKeyJwk.kid);

      expect(didDhtCreateStub.calledOnce).to.be.true;
      expect(dhtDidResolutionStub.calledOnce).to.be.true;
      sinon.restore();
    });

    it('should create with publish and DID should be resolvable', async () => {
      const keySet: DidDhtKeySet = {
        verificationMethodKeys: [{
          'privateKeyJwk': {
            'd'       : '2dPyiFL-vd21lxLKoyylz1nEK5EMByABqB2Fqio76sU',
            'alg'     : 'EdDSA',
            'crv'     : 'Ed25519',
            'kty'     : 'OKP',
            'ext'     : 'true',
            'key_ops' : [
              'sign'
            ],
            'x'   : '5oeavVSPnbxre4zZTqZaStwDcHEJPMbW_oC3B6dhaTM',
            'kid' : '0'
          },
          'publicKeyJwk': {
            'alg'     : 'EdDSA',
            'crv'     : 'Ed25519',
            'kty'     : 'OKP',
            'ext'     : 'true',
            'key_ops' : [
              'verify'
            ],
            'x'   : '5oeavVSPnbxre4zZTqZaStwDcHEJPMbW_oC3B6dhaTM',
            'kid' : '0'
          },
          'relationships': [
            'authentication',
            'assertionMethod',
            'capabilityInvocation',
            'capabilityDelegation'
          ]
        }]
      };

      const didDocument: DidDocument = {
        'id'                 : 'did:dht:h4d3ixkwt6q5a455tucw7j14jmqyghdtbr6cpiz6on5oxj5bpr3o',
        'verificationMethod' : [
          {
            'id'           : 'did:dht:h4d3ixkwt6q5a455tucw7j14jmqyghdtbr6cpiz6on5oxj5bpr3o#0',
            'type'         : 'JsonWebKey2020',
            'controller'   : 'did:dht:h4d3ixkwt6q5a455tucw7j14jmqyghdtbr6cpiz6on5oxj5bpr3o',
            'publicKeyJwk' : {
              'alg'     : 'EdDSA',
              'crv'     : 'Ed25519',
              'kty'     : 'OKP',
              'ext'     : 'true',
              'key_ops' : [
                'verify'
              ],
              'x'   : '5oeavVSPnbxre4zZTqZaStwDcHEJPMbW_oC3B6dhaTM',
              'kid' : '0'
            }
          }
        ],
        'authentication': [
          '#0'
        ],
        'assertionMethod': [
          '#0'
        ],
        'capabilityInvocation': [
          '#0'
        ],
        'capabilityDelegation': [
          '#0'
        ]
      };

      const dhtDidPublishStub = sinon.stub(DidDhtMethod, 'publish').resolves(true);
      const dhtDidResolutionStub = sinon.stub(DidDhtMethod, 'resolve').resolves({
        '@context'            : 'https://w3id.org/did-resolution/v1',
        didDocument,
        didDocumentMetadata   : {},
        didResolutionMetadata : {
          contentType : 'application/did+json',
          did         : {
            didString        : 'did:dht:h4d3ixkwt6q5a455tucw7j14jmqyghdtbr6cpiz6on5oxj5bpr3o',
            methodSpecificId : 'h4d3ixkwt6q5a455tucw7j14jmqyghdtbr6cpiz6on5oxj5bpr3o',
            method           : 'dht'
          }
        }
      });

      const portableDid = await DidDhtMethod.create({ publish: true, keySet: keySet });
      expect(portableDid).to.exist;
      expect(portableDid.did).to.exist;
      expect(portableDid.document).to.exist;
      expect(portableDid.keySet).to.exist;
      expect(portableDid.document.id).to.deep.equal(didDocument.id);

      const didResolutionResult = await DidDhtMethod.resolve({ didUrl: didDocument.id });
      expect(didDocument.id).to.deep.equal(didResolutionResult.didDocument.id);

      expect(dhtDidPublishStub.calledOnce).to.be.true;
      expect(dhtDidResolutionStub.calledOnce).to.be.true;
      sinon.restore();
    });
  });

  describe('Integration with DidResolver', () => {
    it('DidResolver resolves a did:dht DID', async () => {
      // Previously published DID.
      const did = 'did:dht:h4d3ixkwt6q5a455tucw7j14jmqyghdtbr6cpiz6on5oxj5bpr3o';
      const didDocument: DidDocument = {
        'id'                 : 'did:dht:h4d3ixkwt6q5a455tucw7j14jmqyghdtbr6cpiz6on5oxj5bpr3o',
        'verificationMethod' : [
          {
            'id'           : 'did:dht:h4d3ixkwt6q5a455tucw7j14jmqyghdtbr6cpiz6on5oxj5bpr3o#0',
            'type'         : 'JsonWebKey2020',
            'controller'   : 'did:dht:h4d3ixkwt6q5a455tucw7j14jmqyghdtbr6cpiz6on5oxj5bpr3o',
            'publicKeyJwk' : {
              'alg'     : 'EdDSA',
              'crv'     : 'Ed25519',
              'kty'     : 'OKP',
              'ext'     : 'true',
              'key_ops' : [
                'verify'
              ],
              'x'   : '5oeavVSPnbxre4zZTqZaStwDcHEJPMbW_oC3B6dhaTM',
              'kid' : '0'
            }
          }
        ],
        'authentication': [
          '#0'
        ],
        'assertionMethod': [
          '#0'
        ],
        'capabilityInvocation': [
          '#0'
        ],
        'capabilityDelegation': [
          '#0'
        ]
      };

      const dhtDidResolutionStub = sinon.stub(DidDht, 'getDidDocument').resolves(didDocument);

      // Instantiate a DidResolver with the DidJwkMethod.
      const didResolver = new DidResolver({ didResolvers: [DidDhtMethod] });

      // Resolve the DID using the DidResolver.
      const { didDocument: resolvedDocument } = await didResolver.resolve(did);

      // Verify that the resolved document matches the created document.
      expect(resolvedDocument).to.deep.equal(didDocument);

      expect(dhtDidResolutionStub.calledOnce).to.be.true;
      sinon.restore();
    });

    it('returns an error for invalid didUrl', async () => {
      const result = await DidDhtMethod.resolve({ didUrl: 'invalid' });
      expect(result).to.have.property('didResolutionMetadata').which.has.property('error', 'invalidDid');
    });

    it('returns an error for unsupported method', async () => {
      const result = await DidDhtMethod.resolve({ didUrl: 'did:unsupported:xyz' });
      expect(result).to.have.property('didResolutionMetadata').which.has.property('error', 'methodNotSupported');
    });
  });

});