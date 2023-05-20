import { DidDocument } from '../src/types.js';

import { expect } from 'chai';

import * as DidUtils from '../src/utils.js';
import * as didDocuments from './fixtures/did-documents.js';

describe('DID Utils', () => {
  describe('findVerificationMethods()', () => {

    it('throws an error if didDocument is missing', () => {
      expect(() => DidUtils.findVerificationMethods({ id: 'did:key:abcd1234' })).to.throw('required argument');
    });

    it('should not throw an error if purpose and method ID are both missing', () => {
      const didDocument = didDocuments.key.oneVerificationMethodJwk.didDocument;
      expect(() => DidUtils.findVerificationMethods(didDocument)).to.not.throw();
    });

    it('should throw error if purpose and method ID are both specified', () => {
      const didDocument = didDocuments.key.oneVerificationMethodJwk.didDocument;
      expect(() => DidUtils.findVerificationMethods(didDocument, { id: ' ', purpose: ' ' })).to.throw('Specify method ID or purpose but not both');
    });

    describe('by method ID', () => {
      it('should return single verification method when defined in single method DID document', () => {
        const didDocument = didDocuments.key.oneVerificationMethodJwk.didDocument;
        const id = didDocuments.key.oneVerificationMethodJwk.didDocument.verificationMethod[0].id;

        const verificationMethods = DidUtils.findVerificationMethods(didDocument, { id });

        if (verificationMethods === null) expect.fail();
        expect(verificationMethods).to.be.an('Array');
        expect(verificationMethods).to.have.lengthOf(1);
        expect(verificationMethods[0]).to.be.an('object');
        expect(verificationMethods[0]).to.have.property('id', id);
      });

      it('should return single verification method when defined in multi method DID document', () => {
        const didDocument = didDocuments.key.manyVerificationMethodsJwk.didDocument as DidDocument;
        const id = didDocuments.key.manyVerificationMethodsJwk.didDocument.verificationMethod[1].id;

        const verificationMethods = DidUtils.findVerificationMethods(didDocument, { id });

        if (verificationMethods === null) expect.fail();
        expect(verificationMethods).to.be.an('Array');
        expect(verificationMethods).to.have.lengthOf(1);
        expect(verificationMethods[0]).to.be.an('object');
        expect(verificationMethods[0]).to.have.property('id', id);
      });

      it('should return single verification method when embedded in purpose', () => {
        const didDocument = didDocuments.key.manyVerificationMethodsJwk.didDocument as DidDocument;
        const id = didDocuments.key.manyVerificationMethodsJwk.didDocument['keyAgreement'][1].id;

        const verificationMethods = DidUtils.findVerificationMethods(didDocument, { id });

        if (verificationMethods === null) expect.fail();
        expect(verificationMethods).to.be.an('Array');
        expect(verificationMethods).to.have.lengthOf(1);
        expect(verificationMethods[0]).to.be.an('object');
        expect(verificationMethods[0]).to.have.property('id', id);
      });

      it('should return null if verification method ID not found', () => {
        const didDocument = didDocuments.key.oneVerificationMethodJwk.didDocument;
        const verificationMethods = DidUtils.findVerificationMethods(didDocument, { id: 'did:key:abcd1234#def980' });
        expect(verificationMethods).to.be.null;
      });

      it('should return one verification method when no method ID is specified in single method DID document', () => {
        const didDocument = didDocuments.key.oneVerificationMethodJwk.didDocument as DidDocument;

        const verificationMethods = DidUtils.findVerificationMethods(didDocument);

        if (verificationMethods === null) expect.fail();
        expect(verificationMethods).to.be.an('Array');
        expect(verificationMethods).to.have.lengthOf(1);
        expect(verificationMethods[0]).to.be.an('object');
      });

      it('should return all verification methods when no method ID is specified in single method DID document', () => {
        const didDocument = didDocuments.key.manyVerificationMethodsJwk.didDocument as DidDocument;

        const verificationMethods = DidUtils.findVerificationMethods(didDocument);

        if (verificationMethods === null) expect.fail();
        expect(verificationMethods).to.be.an('Array');
        expect(verificationMethods).to.have.lengthOf(8);
        expect(verificationMethods[0]).to.have.property('id');
        expect(verificationMethods[1]).to.have.property('id');
        expect(verificationMethods[2]).to.have.property('id');
        expect(verificationMethods[3]).to.have.property('id');
        expect(verificationMethods[4]).to.have.property('id');
        expect(verificationMethods[5]).to.have.property('id');
        expect(verificationMethods[6]).to.have.property('id');
        expect(verificationMethods[7]).to.have.property('id');
      });
    });

    describe('by purpose', () => {
      it('should return an array of verification methods if multiple referenced methods are defined', () => {
        const didDocument = didDocuments.key.twoAuthenticationReferencedKeysJwk.didDocument as DidDocument;
        const purpose = 'authentication';

        const verificationMethods = DidUtils.findVerificationMethods(didDocument, { purpose });

        if (verificationMethods === null) expect.fail();
        expect(verificationMethods).to.be.an('Array');
        expect(verificationMethods).to.have.lengthOf(2);
        const keyId1 = didDocuments.key.twoAuthenticationReferencedKeysJwk.didDocument.verificationMethod[0].id;
        expect(verificationMethods[0]).to.have.property('id', keyId1);
        const keyId2 = didDocuments.key.twoAuthenticationReferencedKeysJwk.didDocument.verificationMethod[1].id;
        expect(verificationMethods[1]).to.have.property('id', keyId2);
      });

      it('should return an array of verification methods if multiple embedded methods are defined', () => {
        const didDocument = didDocuments.key.manyVerificationMethodsJwk.didDocument as DidDocument;
        const purpose = 'keyAgreement';

        const verificationMethods = DidUtils.findVerificationMethods(didDocument, { purpose });

        if (verificationMethods === null) expect.fail();
        expect(verificationMethods).to.be.an('Array');
        expect(verificationMethods).to.have.lengthOf(2);
        const keyId1 = didDocuments.key.manyVerificationMethodsJwk.didDocument['keyAgreement'][0].id;
        expect(verificationMethods[0]).to.have.property('id', keyId1);
        const keyId2 = didDocuments.key.manyVerificationMethodsJwk.didDocument['keyAgreement'][1].id;
        expect(verificationMethods[1]).to.have.property('id', keyId2);
      });

      it('should return an array of verification methods if referenced and embedded methods are defined', () => {
        const didDocument = didDocuments.key.manyVerificationMethodsJwk.didDocument as DidDocument;
        const purpose = 'authentication';

        const verificationMethods = DidUtils.findVerificationMethods(didDocument, { purpose });

        if (verificationMethods === null) expect.fail();
        expect(verificationMethods).to.be.an('Array');
        expect(verificationMethods).to.have.lengthOf(3);
        const keyId1 = didDocuments.key.manyVerificationMethodsJwk.didDocument.verificationMethod[0].id;
        expect(verificationMethods[0]).to.have.property('id', keyId1);
        // @ts-expect-error because the id a verification method could be a string and not object.
        const keyId2 = didDocuments.key.manyVerificationMethodsJwk.didDocument['authentication'][1].id;
        expect(verificationMethods[1]).to.have.property('id', keyId2);
        // @ts-expect-error because the id a verification method could be a string and not object.
        const keyId3 = didDocuments.key.manyVerificationMethodsJwk.didDocument['authentication'][2].id;
        expect(verificationMethods[2]).to.have.property('id', keyId3);
      });

      it('should return null if purpose not found', () => {
        const didDocument = didDocuments.key.twoAuthenticationReferencedKeysJwk.didDocument as DidDocument;
        const purpose = 'keyAgreement';

        const verificationMethods = DidUtils.findVerificationMethods(didDocument, { purpose });

        expect(verificationMethods).to.be.null;
      });
    });
  });
});