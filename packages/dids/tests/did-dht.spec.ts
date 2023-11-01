import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import type { DidDhtKeySet } from '../src/did-dht.js';
import type { DidKeySetVerificationMethodKey, DidService } from '../src/types.js';

import { DidDhtMethod } from '../src/did-dht.js';

chai.use(chaiAsPromised);

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

describe.only('DidDhtMethod', () => {
  describe('keypairs', () => {
    it('should generate a key pair', async () => {
      const ed25519KeyPair = await DidDhtMethod.generateJwkKeyPair({ keyAlgorithm: 'Ed25519' });

      expect(ed25519KeyPair).to.exist;
      expect(ed25519KeyPair).to.have.property('privateKeyJwk');
      expect(ed25519KeyPair).to.have.property('publicKeyJwk');
      expect(ed25519KeyPair.publicKeyJwk.kid).to.exist;
      expect(ed25519KeyPair.publicKeyJwk.alg).to.equal('EdDSA');
      expect(ed25519KeyPair.publicKeyJwk.kty).to.equal('OKP');

      const secp256k1KeyPair = await DidDhtMethod.generateJwkKeyPair({ keyAlgorithm: 'secp256k1' });

      expect(secp256k1KeyPair).to.exist;
      expect(secp256k1KeyPair).to.have.property('privateKeyJwk');
      expect(secp256k1KeyPair).to.have.property('publicKeyJwk');
      expect(secp256k1KeyPair.publicKeyJwk.kid).to.exist;
      expect(secp256k1KeyPair.publicKeyJwk.alg).to.equal('ES256K');
      expect(secp256k1KeyPair.publicKeyJwk.kty).to.equal('EC');

    });
  });

  describe('keysets', () => {
    it('should generate a keyset with no keyset passed in', async () => {
      const keySet = await DidDhtMethod.generateKeySet();

      expect(keySet).to.exist;
      expect(keySet).to.have.property('identityKey');
      expect(keySet).to.have.property('verificationMethodKeys');
      expect(keySet).to.not.have.property('recoveryKey');
      expect(keySet).to.not.have.property('updateKey');
      expect(keySet).to.not.have.property('signingKey');
      expect(keySet.verificationMethodKeys).to.have.lengthOf(1);
      expect(keySet.verificationMethodKeys[0].publicKeyJwk.kid).to.equal('0');
    });

    it('should generate a keyset with an identity keyset passed in (wrong kid)', async () => {
      const ed25519KeyPair = await DidDhtMethod.generateJwkKeyPair({ keyAlgorithm: 'Ed25519' });

      expect(DidDhtMethod.generateKeySet({
        keySet: { identityKey: ed25519KeyPair }
      })).to.be.rejectedWith('The identity key must have a kid of 0');
    });

    it('should generate a keyset with an identity keyset passed in (correct kid)', async () => {
      const ed25519KeyPair = await DidDhtMethod.generateJwkKeyPair({ keyId: '0', keyAlgorithm: 'Ed25519' });
      const keySet = await DidDhtMethod.generateKeySet({ keySet: { identityKey: ed25519KeyPair } });

      expect(keySet).to.exist;
      expect(keySet).to.have.property('identityKey');
      expect(keySet).to.have.property('verificationMethodKeys');
      expect(keySet).to.not.have.property('recoveryKey');
      expect(keySet).to.not.have.property('updateKey');
      expect(keySet).to.not.have.property('signingKey');
      expect(keySet.verificationMethodKeys).to.have.lengthOf(1);
      expect(keySet.verificationMethodKeys[0].publicKeyJwk.kid).to.equal('0');
    });

    it('should generate a keyset with a non identity keyset passed in', async () => {
      const ed25519KeyPair = await DidDhtMethod.generateJwkKeyPair({ keyAlgorithm: 'Ed25519' });
      const vm: DidKeySetVerificationMethodKey = {
        publicKeyJwk  : ed25519KeyPair.publicKeyJwk,
        privateKeyJwk : ed25519KeyPair.privateKeyJwk,
        relationships : ['authentication', 'assertionMethod', 'capabilityInvocation', 'capabilityDelegation']
      };

      const keySet = await DidDhtMethod.generateKeySet({ keySet: { verificationMethodKeys: [vm] } });

      expect(keySet).to.exist;
      expect(keySet).to.have.property('identityKey');
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
  });

  describe('dids', () => {
    it('should generate a did identifier given a public key jwk', async () => {
      const ed25519KeyPair = await DidDhtMethod.generateJwkKeyPair({ keyAlgorithm: 'Ed25519' });
      const did = await DidDhtMethod.getDidIdentifier({ key: ed25519KeyPair.publicKeyJwk });

      expect(did).to.exist;
      expect(did).to.contain('did:dht:');
    });

    it('should create a did document without options', async () => {
      const {document, keySet} = await DidDhtMethod.create();

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
      expect(ks.identityKey).to.exist;
      expect(ks.identityKey.publicKeyJwk).to.exist;
      expect(ks.identityKey.privateKeyJwk).to.exist;
      expect(ks.identityKey.publicKeyJwk.kid).to.equal('0');
    });

    it('should create a did document with a non identity key option', async () => {
      const ed25519KeyPair = await DidDhtMethod.generateJwkKeyPair({ keyAlgorithm: 'Ed25519' });
      const vm: DidKeySetVerificationMethodKey = {
        publicKeyJwk  : ed25519KeyPair.publicKeyJwk,
        privateKeyJwk : ed25519KeyPair.privateKeyJwk,
        relationships : ['authentication', 'assertionMethod', 'capabilityInvocation', 'capabilityDelegation']
      };

      const keySet = await DidDhtMethod.generateKeySet({ keySet: { verificationMethodKeys: [vm] }});
      const {document} = await DidDhtMethod.create({keySet});

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
      expect(keySet.identityKey).to.exist;
      expect(keySet.identityKey.publicKeyJwk).to.exist;
      expect(keySet.identityKey.privateKeyJwk).to.exist;
      expect(keySet.identityKey.publicKeyJwk.kid).to.equal('0');
    });

    it('should create a did document with services', async () => {
      const services: DidService[] = [{
        id              : 'agentId',
        type            : 'agent',
        serviceEndpoint : 'https://example.com/agent'
      }];
      const {document} = await DidDhtMethod.create({ services });

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

  describe('did publishing and resolving', function () {
    this.timeout(20000); // 20 seconds

    it('should publish and get a did document', async () => {
      const { document, keySet } = await DidDhtMethod.create();
      const isPublished = await DidDhtMethod.publish({ keySet, didDocument: document });

      expect(isPublished).to.be.true;

      // wait for propagation
      await wait(1000*10);

      const didResolutionResult = await DidDhtMethod.resolve({ didUrl: document.id });
      const didDocument = didResolutionResult.didDocument;
      expect(didDocument.id).to.deep.equal(document.id);
      expect(didDocument.service).to.deep.equal(document.service);
      expect(didDocument.verificationMethod[0].id).to.deep.equal(document.verificationMethod[0].id);
      expect(didDocument.verificationMethod[0].type).to.deep.equal(document.verificationMethod[0].type);
      expect(didDocument.verificationMethod[0].controller).to.deep.equal(document.verificationMethod[0].controller);
      expect(didDocument.verificationMethod[0].publicKeyJwk.kid).to.deep.equal(document.verificationMethod[0].publicKeyJwk.kid);
    });

    it('should create with publish and get a did document', async () => {
      const { document } = await DidDhtMethod.create({ publish: true });
      const did = document.id;

      // wait for propagation
      await wait(1000*10);

      const didResolutionResult = await DidDhtMethod.resolve({ didUrl: did });
      const resolvedDocument = didResolutionResult.didDocument;
      expect(resolvedDocument.id).to.deep.equal(document.id);
      expect(resolvedDocument.service).to.deep.equal(document.service);
      expect(resolvedDocument.verificationMethod[0].id).to.deep.equal(document.verificationMethod[0].id);
      expect(resolvedDocument.verificationMethod[0].type).to.deep.equal(document.verificationMethod[0].type);
      expect(resolvedDocument.verificationMethod[0].controller).to.deep.equal(document.verificationMethod[0].controller);
      expect(resolvedDocument.verificationMethod[0].publicKeyJwk.kid).to.deep.equal(document.verificationMethod[0].publicKeyJwk.kid);
    });
  });
});
