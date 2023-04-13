import chaiAsPromised from 'chai-as-promised';
import chai, { expect } from 'chai';

import * as DidUtils from '../../src/did/didUtils.js';
import * as didDocuments from '../data/didDocuments.js';

chai.use(chaiAsPromised);

describe('Web5DID', async () => {

  describe('DID Utils Tests', () => {

    describe('decodeMultibaseBase58', () => {
      it('should pass the Multibase Data Format example', async () => {
        // Example from https://datatracker.ietf.org/doc/html/draft-multiformats-multibase-03#section-2.1
        const testVectorInput = 'z2NEpo7TZRRrLZSi2U';
        const testVectorResult = 'Hello World!';
        const NO_HEADER = new Uint8Array([]);
        const resultBytes = await DidUtils.decodeMultibaseBase58(testVectorInput, NO_HEADER);
        const resultString = new TextDecoder().decode(resultBytes);
        expect(resultString).to.equal(testVectorResult);
      });

      it('should pass the Multibase Data Format test vector', async () => {
        // Test Vector from https://datatracker.ietf.org/doc/html/draft-multiformats-multibase-03#appendix-B.3
        const testVectorInput = 'zYAjKoNbau5KiqmHPmSxYCvn66dA1vLmwbt';
        const testVectorResult = 'Multibase is awesome! \\o/';
        const NO_HEADER = new Uint8Array([]);
        const resultBytes = await DidUtils.decodeMultibaseBase58(testVectorInput, NO_HEADER);
        const resultString = new TextDecoder().decode(resultBytes);
        expect(resultString).to.equal(testVectorResult);
      });
    });

    describe('findVerificationMethods', () => {

      it('should throw error if didDocument is missing', () => {
        expect(() => DidUtils.findVerificationMethods({ methodId: 'did:key:abcd1234' })).to.throw('didDocument is a required parameter');
      });

      it('should not throw an error if purpose and methodId are both missing', () => {
        expect(() => DidUtils.findVerificationMethods({ didDocument: {} })).to.not.throw();
      });

      it('should throw error if purpose and methodId are both specified', () => {
        expect(() => DidUtils.findVerificationMethods({ didDocument: {}, methodId: ' ', purpose: ' ' })).to.throw('Specify methodId or purpose but not both');
      });

      describe('by methodId', () => {
        it('should return single verification method when defined in single method DID document', () => {
          const didDocument = didDocuments.key.oneVerificationMethodJwk.didDocument;
          const methodId = didDocuments.key.oneVerificationMethodJwk.didDocument.verificationMethod[0].id;

          const verificationMethods = DidUtils.findVerificationMethods({ didDocument, methodId });
          
          expect(verificationMethods).to.have.lengthOf(1);
          expect(verificationMethods[0]).to.be.an('object');
          expect(verificationMethods[0]).to.have.property('id', methodId);
        });

        it('should return single verification method when defined in multi method DID document', () => {
          const didDocument = didDocuments.key.manyVerificationMethodsJwk.didDocument;
          const methodId = didDocuments.key.manyVerificationMethodsJwk.didDocument.verificationMethod[1].id;

          const verificationMethods = DidUtils.findVerificationMethods({ didDocument, methodId });
          
          expect(verificationMethods).to.have.lengthOf(1);
          expect(verificationMethods[0]).to.be.an('object');
          expect(verificationMethods[0]).to.have.property('id', methodId);
        });

        it('should return single verification method when embedded in purpose', () => {
          const didDocument = didDocuments.key.manyVerificationMethodsJwk.didDocument;
          const methodId = didDocuments.key.manyVerificationMethodsJwk.didDocument['keyAgreement'][1].id;

          const verificationMethods = DidUtils.findVerificationMethods({ didDocument, methodId });
          
          expect(verificationMethods).to.have.lengthOf(1);
          expect(verificationMethods[0]).to.be.an('object');
          expect(verificationMethods[0]).to.have.property('id', methodId);
        });

        it('should return null if verification method ID not found', () => {
          const didDocument = didDocuments.key.oneVerificationMethodJwk.didDocument;

          const verificationMethods = DidUtils.findVerificationMethods({ didDocument, methodId: 'did:key:abcd1234#def980' });
    
          expect(verificationMethods).to.be.null;
        });

        it('should return one verification method when no method ID is specified in single method DID document', () => {
          const didDocument = didDocuments.key.oneVerificationMethodJwk.didDocument;

          const verificationMethods = DidUtils.findVerificationMethods({ didDocument });
          
          expect(verificationMethods).to.have.lengthOf(1);
          expect(verificationMethods[0]).to.be.an('object');
        });

        it('should return all verification methods when no method ID is specified in single method DID document', () => {
          const didDocument = didDocuments.key.manyVerificationMethodsJwk.didDocument;

          const verificationMethods = DidUtils.findVerificationMethods({ didDocument });
          
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
          const didDocument = didDocuments.key.twoAuthenticationReferencedKeysJwk.didDocument;
          const purpose = 'authentication';

          const verificationMethods = DidUtils.findVerificationMethods({ didDocument, purpose });
          
          expect(verificationMethods).to.be.an('Array');
          expect(verificationMethods).to.have.lengthOf(2);
          const keyId1 = didDocuments.key.twoAuthenticationReferencedKeysJwk.didDocument.verificationMethod[0].id;
          expect(verificationMethods[0]).to.have.property('id', keyId1);
          const keyId2 = didDocuments.key.twoAuthenticationReferencedKeysJwk.didDocument.verificationMethod[1].id;
          expect(verificationMethods[1]).to.have.property('id', keyId2);
        });

        it('should return an array of verification methods if multiple embedded methods are defined', () => {
          const didDocument = didDocuments.key.manyVerificationMethodsJwk.didDocument;
          const purpose = 'keyAgreement';

          const verificationMethods = DidUtils.findVerificationMethods({ didDocument, purpose });
          
          expect(verificationMethods).to.be.an('Array');
          expect(verificationMethods).to.have.lengthOf(2);
          const keyId1 = didDocuments.key.manyVerificationMethodsJwk.didDocument['keyAgreement'][0].id;
          expect(verificationMethods[0]).to.have.property('id', keyId1);
          const keyId2 = didDocuments.key.manyVerificationMethodsJwk.didDocument['keyAgreement'][1].id;
          expect(verificationMethods[1]).to.have.property('id', keyId2);
        });

        it('should return an array of verification methods if referenced and embedded methods are defined', () => {
          const didDocument = didDocuments.key.manyVerificationMethodsJwk.didDocument;
          const purpose = 'authentication';

          const verificationMethods = DidUtils.findVerificationMethods({ didDocument, purpose });
          
          expect(verificationMethods).to.be.an('Array');
          expect(verificationMethods).to.have.lengthOf(3);
          const keyId1 = didDocuments.key.manyVerificationMethodsJwk.didDocument.verificationMethod[0].id;
          expect(verificationMethods[0]).to.have.property('id', keyId1);
          const keyId2 = didDocuments.key.manyVerificationMethodsJwk.didDocument['authentication'][1].id;
          expect(verificationMethods[1]).to.have.property('id', keyId2);
          const keyId3 = didDocuments.key.manyVerificationMethodsJwk.didDocument['authentication'][2].id;
          expect(verificationMethods[2]).to.have.property('id', keyId3);
        });

        it('should return null if purpose not found', () => {
          const didDocument = didDocuments.key.twoAuthenticationReferencedKeysJwk.didDocument;
          const purpose = 'keyAgreement';

          const verificationMethods = DidUtils.findVerificationMethods({ didDocument, purpose });
    
          expect(verificationMethods).to.be.null;
        });
      });
    });

    describe('verificationMethodToPublicKeyBytes', () => {
      it('should produce 32-byte key from JsonWebKey2020 Ed25519', async () => {
        const testVectorInput = {
          id: 'did:key:z6MkvWGGZCXi3F7rY6ZLvaq5dGYMbvpLg95XFX3srkqdFVXE#z6MkvWGGZCXi3F7rY6ZLvaq5dGYMbvpLg95XFX3srkqdFVXE',
          type: 'JsonWebKey2020',
          controller: 'did:key:z6MkvWGGZCXi3F7rY6ZLvaq5dGYMbvpLg95XFX3srkqdFVXE',
          publicKeyJwk: {
            kty: 'OKP',
            crv: 'Ed25519',
            x: '7n_8aiGRMBlsJHQd4t35n307na7TZNElysEBREpvRnk',
          },
        };
        const resultBytes = await DidUtils.verificationMethodToPublicKeyBytes(testVectorInput);
        expect(resultBytes).to.have.length(32);
      });

      it('should produce 65-byte key from JsonWebKey2020 secp256k1', async () => {
        const testVectorInput = {
          id: 'did:key:zQ3shvj64zaZJnx4dGrW2Hys6xC9UFMEjz4nkzEJmH1Vh9fGf#zQ3shvj64zaZJnx4dGrW2Hys6xC9UFMEjz4nkzEJmH1Vh9fGf',
          type: 'JsonWebKey2020',
          controller: 'did:key:zQ3shvj64zaZJnx4dGrW2Hys6xC9UFMEjz4nkzEJmH1Vh9fGf',
          publicKeyJwk: {
            kty: 'EC',
            crv: 'secp256k1',
            x: '7wGy8EIWkdDOnDHWT7e8R8tkKYbYCurodKQNtLAeaiQ',
            y: '7CnORxKJqon8qscaGY_nWROEn2B4oSBxtEryIUn3buc',
          },
        };
        const resultBytes = await DidUtils.verificationMethodToPublicKeyBytes(testVectorInput);
        expect(resultBytes).to.have.length(65);
      });

      it('should produce 32-byte key from Ed25519VerificationKey2018', async () => {
        const testVectorInput = {
          id: 'did:key:z6MkowGxLDf5oVh8FUXHEo2GG2RsyvS4jNHFWoDeM96aU7pR#z6MkowGxLDf5oVh8FUXHEo2GG2RsyvS4jNHFWoDeM96aU7pR',
          type: 'Ed25519VerificationKey2018',
          controller: 'did:key:z6MkowGxLDf5oVh8FUXHEo2GG2RsyvS4jNHFWoDeM96aU7pR',
          publicKeyBase58: 'AV1ujyQeTxCf8ygaZE4RQvstAMADKV2tpnJiWs8ZYu33',
        };
        const resultBytes = await DidUtils.verificationMethodToPublicKeyBytes(testVectorInput);
        expect(resultBytes).to.have.length(32);
      });

      it('should produce 32-byte key from Ed25519VerificationKey2020', async () => {
        const testVectorInput = {
          id: 'did:key:z6MkuBzvPSJafL9JZEj3Cp5CuG1rPyXsZbynHqtYjecxR2pe#z6MkuBzvPSJafL9JZEj3Cp5CuG1rPyXsZbynHqtYjecxR2pe',
          controller: 'did:key:z6MkuBzvPSJafL9JZEj3Cp5CuG1rPyXsZbynHqtYjecxR2pe',
          type: 'Ed25519VerificationKey2020',
          publicKeyMultibase: 'z6MkuBzvPSJafL9JZEj3Cp5CuG1rPyXsZbynHqtYjecxR2pe',
        };
        const resultBytes = await DidUtils.verificationMethodToPublicKeyBytes(testVectorInput);
        expect(resultBytes).to.have.length(32);
      });

      it('should produce 32-byte key from X25519KeyAgreementKey2019', async () => {
        const testVectorInput = {
          id: 'did:key:z6LSi7dU7FZfD8P71j5PJrBugYuhvWgPTP8kt9SvXM2moGCy#z6LSi7dU7FZfD8P71j5PJrBugYuhvWgPTP8kt9SvXM2moGCy',
          type: 'X25519KeyAgreementKey2019',
          controller: 'did:key:z6LSi7dU7FZfD8P71j5PJrBugYuhvWgPTP8kt9SvXM2moGCy',
          publicKeyBase58: '7STJawko7ffMvLhcnCfxMxhE5N9Gkmxc1AjF2tPF5tSD',
        };
        const resultBytes = await DidUtils.verificationMethodToPublicKeyBytes(testVectorInput);
        expect(resultBytes).to.have.length(32);
      });

      it('should produce 32-byte key from X25519KeyAgreementKey2020', async () => {
        const testVectorInput = {
          id: 'did:key:z6MkuBzvPSJafL9JZEj3Cp5CuG1rPyXsZbynHqtYjecxR2pe#z6LSmWBeTmbc52MeApriadmSupqXqAjvqEQ64TY2bVjmbiw3',
          controller: 'did:key:z6MkuBzvPSJafL9JZEj3Cp5CuG1rPyXsZbynHqtYjecxR2pe',
          type: 'X25519KeyAgreementKey2020',
          publicKeyMultibase: 'z6LSmWBeTmbc52MeApriadmSupqXqAjvqEQ64TY2bVjmbiw3',
        };
        const resultBytes = await DidUtils.verificationMethodToPublicKeyBytes(testVectorInput);
        expect(resultBytes).to.have.length(32);
      });

      it('should throw an error for unsupported verification method type', async () => {
        const testVectorInput = {
          id: 'did:key:z5TcEqLQRZagxohf4kbuku7tX1UfNKR3FawBUKuWMu12tKzEeAzjHcjHk2ewc7esb6f1izCBVrzTF16ec2fC95fzbMMtcPpvg4BY3uyfp6f89JdBZCLEtzfJtTM7p2MQF7hgtiUnuKFVcJKpL32cUta7Vr8vZ3uPYNoXgUCdbFEZgMre3AKSxHTjSPDqBSHLQdYeFzLaL#z3tEGLqaQnrqx1KbDNSEdyV7C8Mz5bkPMF2TfvL7tcSrutXCJL9ehWjahbvfNdbkFBPdA4',
          type: 'Bls12381G1Key2020',
          controller: 'did:key:z5TcEqLQRZagxohf4kbuku7tX1UfNKR3FawBUKuWMu12tKzEeAzjHcjHk2ewc7esb6f1izCBVrzTF16ec2fC95fzbMMtcPpvg4BY3uyfp6f89JdBZCLEtzfJtTM7p2MQF7hgtiUnuKFVcJKpL32cUta7Vr8vZ3uPYNoXgUCdbFEZgMre3AKSxHTjSPDqBSHLQdYeFzLaL',
          publicKeyBase58: '7SV3YJ2vwE1jHfqvJTgjBoGH44gepRzahyafHJF1kW23sc1FeUtYD4EU3pSBo8mVp8',
        };
        await expect(DidUtils.verificationMethodToPublicKeyBytes(testVectorInput)).to.be.rejectedWith('Unsupported verification method type: Bls12381G1Key2020');
      });
    });
  });
});
