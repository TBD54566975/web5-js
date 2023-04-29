import { expect } from 'chai';
import sinon from 'sinon';

import { Web5Did } from '../../../src/did/web5-did.js';
import * as didDocuments from '../../fixtures/did-documents.js';

describe('did:key method', async () => {
  let web5did;

  beforeEach(function () {
    web5did = new Web5Did();
  });

  describe('create()', async () => {
    it('should return two keys when creating a did:key DID', async () => {
      const did = await web5did.create('key');
      expect(did.keys).to.have.lengthOf(2);
    });

    it('should return two keys with keyId in form `did:key:id#publicKeyKeyId` when creating a did:key DID', async () => {
      const did = await web5did.create('key');
      expect(did.keys[0].id).to.equal(`${did.id}#${did.keys[0].keyPair.publicKeyJwk.kid}`);
      expect(did.keys[1].id).to.equal(`${did.id}#${did.keys[1].keyPair.publicKeyJwk.kid}`);
    });

    it('should return keys in JWK format when creating a did:key DID', async () => {
      const did = await web5did.create('key');
      expect(did.keys[0].type).to.equal('JsonWebKey2020');
      expect(did.keys[1].type).to.equal('JsonWebKey2020');
      expect(did.keys[0].keyPair).to.have.property('privateKeyJwk');
      expect(did.keys[0].keyPair).to.have.property('publicKeyJwk');
      expect(did.keys[1].keyPair).to.have.property('privateKeyJwk');
      expect(did.keys[1].keyPair).to.have.property('publicKeyJwk');
    });

    it('should return first key using Ed25519 curve when creating a did:key DID', async () => {
      const did = await web5did.create('key');
      expect(did.keys[0].keyPair.publicKeyJwk.crv).to.equal('Ed25519');
    });

    it('should return second key using X25519 curve when creating a did:key DID', async () => {
      const did = await web5did.create('key');
      expect(did.keys[1].keyPair.publicKeyJwk.crv).to.equal('X25519');
    });
  });

  describe('getDidDocument()', async () => {
    it('should return a didDocument for a valid did:key DID', async () => {
      sinon.stub(web5did, 'resolve').resolves(didDocuments.key.oneVerificationMethodJwk);
  
      const didDocument = await web5did.getDidDocument('resolve-stubbed');

      expect(didDocument['@context'][0]).to.equal('https://www.w3.org/ns/did/v1');
      expect(didDocument).to.have.property('id', didDocuments.key.oneVerificationMethodJwk.didDocument.id);
    });

    it('should return null didDocument for an invalid did:key DID', async () => {
      sinon.stub(web5did, 'resolve').resolves(didDocuments.key.notFound);
  
      const didDocument = await web5did.getDidDocument('resolve-stubbed');
      
      expect(didDocument).to.be.null;
    });
  });

  describe('resolve()', async () => {
    it('should return a didResolutionResult for a valid DID', async () => {
      const did = 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9';
  
      const resolved = await web5did.resolve(did);

      expect(resolved['@context']).to.equal('https://w3id.org/did-resolution/v1');
      expect(resolved.didDocument).to.have.property('id', did);
    });

    it('should return undefined didDocument for an invalid DID', async () => {
      const did = 'did:key:invalid';
  
      const resolved = await web5did.resolve(did);
      
      expect(resolved.didDocument).to.be.undefined;
      expect(resolved.didResolutionMetadata.error).to.equal('invalidDid');
    });
  });
});
