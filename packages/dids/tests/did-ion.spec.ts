import type { JwkKeyPair } from '@web5/crypto';

import * as sinon from 'sinon';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

import { DidDocument, DidKeySetVerificationMethodKey, DidService } from '../src/types.js';
import { didIonCreateTestVectors } from './fixtures/test-vectors/did-ion.js';
import { DidIonCreateOptions, DidIonKeySet, DidIonMethod } from '../src/did-ion.js';

describe('DidIonMethod', () => {
  let testRecoveryKey: JwkKeyPair;
  let testUpdateKey: JwkKeyPair;
  let testVerificationMethodKeys: DidKeySetVerificationMethodKey[];
  let testKeySet: DidIonKeySet;

  beforeEach(() => {
    testRecoveryKey = structuredClone(didIonCreateTestVectors[0].input.keySet.recoveryKey) as JwkKeyPair;
    testRecoveryKey.privateKeyJwk.kid = 'test-recovery-1';
    testRecoveryKey.publicKeyJwk.kid = 'test-recovery-1';

    testUpdateKey = structuredClone(didIonCreateTestVectors[0].input.keySet.updateKey) as JwkKeyPair;
    testUpdateKey.privateKeyJwk.kid = 'test-update-1';
    testUpdateKey.publicKeyJwk.kid = 'test-update-1';

    testVerificationMethodKeys = structuredClone(didIonCreateTestVectors[0].input.keySet.verificationMethodKeys) as DidKeySetVerificationMethodKey[];
    testVerificationMethodKeys[0].publicKeyJwk!.kid = 'test-kid';

    testKeySet = {
      recoveryKey            : testRecoveryKey,
      updateKey              : testUpdateKey,
      verificationMethodKeys : testVerificationMethodKeys
    };
  });

  describe('anchor()', () => {
    it('accepts a custom operations endpoint', async () => {
      // Setup stub so that a mocked response is returned rather than calling over the network.
      const mockResult = { mock: 'data' };
      const fetchStub = sinon.stub(global, 'fetch');
      // @ts-expect-error because we're only mocking ok and json() from global.fetch().
      fetchStub.returns(Promise.resolve({
        ok   : true,
        json : () => Promise.resolve(mockResult)
      }));

      const resolutionResult = await DidIonMethod.anchor({
        challengeEnabled   : false,
        keySet             : testKeySet,
        operationsEndpoint : 'https://ion-service.com/operations',
        services           : []
      });
      fetchStub.restore();

      expect(resolutionResult).to.deep.equal(mockResult);
      expect(fetchStub.calledOnceWith(
        'https://ion-service.com/operations',
        sinon.match({
          method  : 'POST',
          mode    : 'cors',
          body    : sinon.match.string,
          headers : {
            'Content-Type': 'application/json'
          }
        })
      )).to.be.true;
    });

    it('supports disabling POW/challenge', async () => {
      // Setup stub so that a mocked response is returned rather than calling over the network.
      const mockResult = { mock: 'data' };
      const fetchStub = sinon.stub(global, 'fetch');
      // @ts-expect-error because we're only mocking ok and json() from global.fetch().
      fetchStub.returns(Promise.resolve({
        ok   : true,
        json : () => Promise.resolve(mockResult)
      }));

      const resolutionResult = await DidIonMethod.anchor({
        challengeEnabled   : false,
        keySet             : testKeySet,
        operationsEndpoint : 'https://ion-service.com/operations',
        services           : []
      });
      fetchStub.restore();

      expect(resolutionResult).to.deep.equal(mockResult);
    });
  });

  describe('create()', () => {
    it('creates a DID with Ed25519 keys, by default', async () => {
      const portableDid = await DidIonMethod.create();

      // Verify expected result.
      expect(portableDid).to.have.property('did');
      expect(portableDid).to.have.property('canonicalId');
      expect(portableDid).to.have.property('document');
      expect(portableDid).to.have.property('keySet');

      const keySet = portableDid.keySet as DidIonKeySet;

      expect(keySet).to.have.property('verificationMethodKeys');
      expect(keySet.verificationMethodKeys).to.have.length(1);
      expect(keySet.verificationMethodKeys?.[0]).to.have.property('publicKeyJwk');
      expect(keySet.verificationMethodKeys?.[0]).to.have.property('privateKeyJwk');
      expect(keySet.verificationMethodKeys?.[0].publicKeyJwk).to.have.property('alg', 'EdDSA');
      expect(keySet.verificationMethodKeys?.[0].publicKeyJwk).to.have.property('crv', 'Ed25519');

      expect(keySet).to.have.property('recoveryKey');
      expect(keySet.recoveryKey).to.have.property('publicKeyJwk');
      expect(keySet.recoveryKey).to.have.property('privateKeyJwk');

      expect(keySet).to.have.property('updateKey');
      expect(keySet.recoveryKey).to.have.property('publicKeyJwk');
      expect(keySet.recoveryKey).to.have.property('privateKeyJwk');
    });

    it('creates a DID with secp256k1 keys, if specified', async () => {
      const portableDid = await DidIonMethod.create({ keyAlgorithm: 'secp256k1' });

      // Verify expected result.
      expect(portableDid).to.have.property('did');
      expect(portableDid).to.have.property('canonicalId');
      expect(portableDid).to.have.property('document');
      expect(portableDid).to.have.property('keySet');

      const keySet = portableDid.keySet as DidIonKeySet;

      expect(keySet).to.have.property('verificationMethodKeys');
      expect(keySet.verificationMethodKeys).to.have.length(1);
      expect(keySet.verificationMethodKeys?.[0]).to.have.property('publicKeyJwk');
      expect(keySet.verificationMethodKeys?.[0]).to.have.property('privateKeyJwk');
      expect(keySet.verificationMethodKeys?.[0].publicKeyJwk).to.have.property('alg', 'ES256K');
      expect(keySet.verificationMethodKeys?.[0].publicKeyJwk).to.have.property('crv', 'secp256k1');

      expect(keySet).to.have.property('recoveryKey');
      expect(keySet.recoveryKey).to.have.property('publicKeyJwk');
      expect(keySet.recoveryKey).to.have.property('privateKeyJwk');

      expect(keySet).to.have.property('updateKey');
      expect(keySet.recoveryKey).to.have.property('publicKeyJwk');
      expect(keySet.recoveryKey).to.have.property('privateKeyJwk');
    });

    it('uses specified key ID values for key set, if given', async () => {
      const portableDid = await DidIonMethod.create({
        keyAlgorithm : 'Ed25519',
        keySet       : testKeySet
      });

      const keySet = portableDid.keySet as DidIonKeySet;
      expect(keySet.recoveryKey?.privateKeyJwk.kid).to.equal('test-recovery-1');
      expect(keySet.recoveryKey?.publicKeyJwk.kid).to.equal('test-recovery-1');
      expect(keySet.updateKey?.privateKeyJwk.kid).to.equal('test-update-1');
      expect(keySet.updateKey?.publicKeyJwk.kid).to.equal('test-update-1');
      expect(keySet.verificationMethodKeys?.[0].publicKeyJwk?.kid).to.equal('test-kid');
      expect(keySet.verificationMethodKeys?.[0].publicKeyJwk?.kid).to.equal('test-kid');
    });

    it('generates key ID values for key set, if missing', async () => {
      delete testRecoveryKey.privateKeyJwk.kid;
      delete testRecoveryKey.publicKeyJwk.kid;
      delete testUpdateKey.privateKeyJwk.kid;
      delete testUpdateKey.publicKeyJwk.kid;
      delete testVerificationMethodKeys[0].publicKeyJwk!.kid;

      const portableDid = await DidIonMethod.create({
        keyAlgorithm : 'Ed25519',
        keySet       : testKeySet
      });

      const keySet = portableDid.keySet as DidIonKeySet;
      expect(keySet.recoveryKey?.privateKeyJwk.kid).to.equal('AEOG_sxXHhCA1Fel8fpheyLxAcW89D7V86lMcJXc500');
      expect(keySet.recoveryKey?.publicKeyJwk.kid).to.equal('AEOG_sxXHhCA1Fel8fpheyLxAcW89D7V86lMcJXc500');
      expect(keySet.updateKey?.privateKeyJwk.kid).to.equal('_1CySHVtk6tNXke3t_7NLI2nvaVlH5GFyuO9HjQCRKs');
      expect(keySet.updateKey?.publicKeyJwk.kid).to.equal('_1CySHVtk6tNXke3t_7NLI2nvaVlH5GFyuO9HjQCRKs');
      expect(keySet.verificationMethodKeys?.[0].publicKeyJwk?.kid).to.equal('OAPj7ObrEJFgVNA2rrkPM5A-vYVsH_lyz4LgOUdJBa8');
      expect(keySet.verificationMethodKeys?.[0].publicKeyJwk?.kid).to.equal('OAPj7ObrEJFgVNA2rrkPM5A-vYVsH_lyz4LgOUdJBa8');
    });

    it('given key IDs are automatically prefixed with hash symbol (#) in DID document', async () => {
      testVerificationMethodKeys[0].publicKeyJwk!.kid = 'noPrefixInput';

      const portableDid = await DidIonMethod.create({
        keyAlgorithm : 'Ed25519',
        keySet       : testKeySet
      });

      expect(portableDid.document.authentication).includes(`#noPrefixInput`);
      expect(portableDid.document.verificationMethod![0].id).to.equal(`#noPrefixInput`);
    });

    it('accepts recovery and update key IDs that include a hash symbol (#)', async () => {
      testRecoveryKey.privateKeyJwk.kid = '#test-recovery-1';
      testRecoveryKey.publicKeyJwk.kid = '#test-recovery-1';

      await expect(
        DidIonMethod.create({ keySet: { recoveryKey: testRecoveryKey } })
      ).to.eventually.be.fulfilled;

      testUpdateKey.privateKeyJwk.kid = '#test-update-1';
      testUpdateKey.publicKeyJwk.kid = '#test-update-1';

      await expect(
        DidIonMethod.create({ keySet: { updateKey: testUpdateKey } })
      ).to.eventually.eventually.be.fulfilled;
    });

    it('accepts verification method key IDs that start with a hash symbol (#)', async () => {
      testVerificationMethodKeys[0].publicKeyJwk!.kid = '#prefixedKid';

      const portableDid = await DidIonMethod.create({
        keyAlgorithm : 'Ed25519',
        keySet       : testKeySet
      });

      expect(portableDid.document.authentication).includes(`#prefixedKid`);
      expect(portableDid.document.verificationMethod![0].id).to.equal(`#prefixedKid`);
    });

    it('throws an error if verification method key IDs contain a hash symbol (#)', async () => {
      testVerificationMethodKeys[0].publicKeyJwk!.kid = 'test#kid';

      await expect(
        DidIonMethod.create({ keySet: { verificationMethodKeys: testVerificationMethodKeys } })
      ).to.eventually.eventually.be.rejectedWith(Error, 'IdNotUsingBase64UrlCharacterSet');
    });

    it('creates a DID with service entries, if specified', async () => {
      const dwnEndpoints = [
        'https://dwn.tbddev.test/dwn0',
        'https://dwn.tbddev.test/dwn1'
      ];

      const services: DidService[] = [{
        'id'              : 'dwn',
        'type'            : 'DecentralizedWebNode',
        'serviceEndpoint' : {
          'nodes'          : dwnEndpoints,
          'signingKeys'    : ['#dwn-sig'],
          'encryptionKeys' : ['#dwn-enc']
        }
      }];

      const portableDid = await DidIonMethod.create({ services });

      const dwnService = portableDid.document.service?.[0];
      expect(dwnService).to.have.property('type', 'DecentralizedWebNode');
      expect(dwnService?.serviceEndpoint).to.have.property('nodes');
      expect(dwnService?.serviceEndpoint).to.have.property('signingKeys');
      expect(dwnService?.serviceEndpoint).to.have.property('encryptionKeys');
    });

    it('given service IDs are automatically prefixed with hash symbol (#) in DID document', async () => {
      const dwnEndpoints = ['https://dwn.tbddev.test/dwn0'];

      const services: DidService[] = [{
        'id'              : 'dwn',
        'type'            : 'DecentralizedWebNode',
        'serviceEndpoint' : {
          'nodes': dwnEndpoints
        }
      }];

      const portableDid = await DidIonMethod.create({ services });

      const dwnService = portableDid.document.service?.[0];
      expect(dwnService).to.have.property('id', '#dwn');
    });

    it('accepts service IDs that start with a hash symbol (#)', async () => {
      const services: DidService[] = [{
        'id'              : '#dwn',
        'type'            : 'DecentralizedWebNode',
        'serviceEndpoint' : { }
      }];

      const portableDid = await DidIonMethod.create({ services });

      const dwnService = portableDid.document.service?.[0];
      expect(dwnService).to.have.property('id', '#dwn');
    });

    it('throws an error if verification method key IDs contain a hash symbol (#)', async () => {
      const services = [{
        'id'              : 'foo#bar',
        'type'            : 'DecentralizedWebNode',
        'serviceEndpoint' : { }
      }];

      await expect(
        DidIonMethod.create({ services })
      ).to.eventually.eventually.be.rejectedWith(Error, 'IdNotUsingBase64UrlCharacterSet');
    });

    for (const vector of didIonCreateTestVectors ) {
      it(`passes test vector ${vector.id}`, async () => {
        const portableDid = await DidIonMethod.create(vector.input as DidIonCreateOptions);

        expect(portableDid).to.deep.equal(vector.output);
      });
    }
  });

  describe('decodeLongFormDid()', () => {
    it('returns ION create request with services', async () => {
      const longFormDid = 'did:ion:EiC94n5yoQEpRfmT6Co7Q4GCUWmuAK4UzDFpk5W4_BzP4A:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJkd24tc2lnIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoiSl9lek5jT2pqNTIxbWEtN18tanFWdC1JODRzendSRTJzMGFCN3h2R1ljYyJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbeyJpZCI6ImR3biIsInNlcnZpY2VFbmRwb2ludCI6eyJub2RlcyI6WyJodHRwczovL2R3bi50YmRkZXYudGVzdC9kd24wIl19LCJ0eXBlIjoiRGVjZW50cmFsaXplZFdlYk5vZGUifV19fV0sInVwZGF0ZUNvbW1pdG1lbnQiOiJFaUR2WHJNV3V0LTNIUWpsTm5JbHlKR2F0WVBsNWo2MFp3SnB4cG9wOHk2RGxBIn0sInN1ZmZpeERhdGEiOnsiZGVsdGFIYXNoIjoiRWlEd2VVOG82clVZY1lCNHQzaHBoaXdtZFpxZWRVdm5zQ251a2xMdWVfOVFOUSIsInJlY292ZXJ5Q29tbWl0bWVudCI6IkVpREhIb3E0bFhoMndjWUZNSnNuNkZBN3otVk9sTHBiU20xcnRNOXlJMUQzd3cifX0';

      const createRequest = await DidIonMethod.decodeLongFormDid({ didUrl: longFormDid});

      expect(createRequest).to.have.property('delta');
      expect(createRequest).to.have.property('suffixData');
      expect(createRequest).to.have.property('type', 'create');

      expect(createRequest.delta).to.have.property('updateCommitment', 'EiDvXrMWut-3HQjlNnIlyJGatYPl5j60ZwJpxpop8y6DlA');
      expect(createRequest.suffixData).to.have.property('recoveryCommitment', 'EiDHHoq4lXh2wcYFMJsn6FA7z-VOlLpbSm1rtM9yI1D3ww');

      expect(createRequest.delta.patches[0].document.services).to.deep.equal([{
        'id'              : 'dwn',
        'type'            : 'DecentralizedWebNode',
        'serviceEndpoint' : {
          'nodes': ['https://dwn.tbddev.test/dwn0']
        }
      }]);
    });

    it('returns output that matches ION create request', async () => {
      const services: DidService[] = [{
        'id'              : 'dwn',
        'type'            : 'DecentralizedWebNode',
        'serviceEndpoint' : {
          'nodes': ['https://dwn.tbddev.test/dwn0']
        }
      }];

      const { did } = await DidIonMethod.create({
        keySet: testKeySet,
        services
      });

      // @ts-expect-error because we're intentionally accessing a private method.
      const ionDocument = await DidIonMethod.createIonDocument({
        keySet: testKeySet,
        services
      });

      if (!testKeySet.recoveryKey) throw new Error('Type guard');
      if (!testKeySet.updateKey) throw new Error('Type guard');
      // @ts-expect-error because we're intentionally accessing a private method.
      const createRequest = await DidIonMethod.getIonCreateRequest({
        ionDocument,
        recoveryPublicKeyJwk : testKeySet.recoveryKey.publicKeyJwk,
        updatePublicKeyJwk   : testKeySet.updateKey.publicKeyJwk
      });

      if (!did) throw Error('Type guard');
      const decodedLongFormDid = await DidIonMethod.decodeLongFormDid({ didUrl: did });

      expect(decodedLongFormDid).to.deep.equal(createRequest);
    });
  });

  describe('generateJwkKeyPair()', () => {
    it('generates an Ed25519 JwkKeyPair', async () => {
      const jwkKeyPair = await DidIonMethod.generateJwkKeyPair({ keyAlgorithm: 'Ed25519' });
      expect(jwkKeyPair).to.be.an('object');
      expect(jwkKeyPair.privateKeyJwk.kty).to.equal('OKP');
      if (!('crv' in jwkKeyPair.privateKeyJwk)) throw new Error('Type guard');
      expect(jwkKeyPair.privateKeyJwk.crv).to.equal('Ed25519');
      if (!('crv' in jwkKeyPair.publicKeyJwk)) throw new Error('Type guard');
      expect(jwkKeyPair.publicKeyJwk.kty).to.equal('OKP');
      expect(jwkKeyPair.publicKeyJwk.crv).to.equal('Ed25519');
    });

    it('generates a secp256k1 JwkKeyPair', async () => {
      const jwkKeyPair = await DidIonMethod.generateJwkKeyPair({ keyAlgorithm: 'secp256k1' });
      expect(jwkKeyPair).to.be.an('object');
      expect(jwkKeyPair.privateKeyJwk.kty).to.equal('EC');
      if (!('crv' in jwkKeyPair.privateKeyJwk)) throw new Error('Type guard');
      expect(jwkKeyPair.privateKeyJwk.crv).to.equal('secp256k1');
      expect(jwkKeyPair.publicKeyJwk.kty).to.equal('EC');
      if (!('crv' in jwkKeyPair.publicKeyJwk)) throw new Error('Type guard');
      expect(jwkKeyPair.publicKeyJwk.crv).to.equal('secp256k1');
    });

    it('generates a JwkKeyPair with a custom key ID', async () => {
      const keyId = 'custom-key-id';
      const jwkKeyPair = await DidIonMethod.generateJwkKeyPair({ keyAlgorithm: 'Ed25519', keyId });
      expect(jwkKeyPair.privateKeyJwk.kid).to.equal(keyId);
      expect(jwkKeyPair.publicKeyJwk.kid).to.equal(keyId);
    });

    it('throws an error for unsupported key algorithm', async () => {
      await expect(
        // @ts-expect-error because an invalid algorithm is being intentionally specified.
        DidIonMethod.generateJwkKeyPair({ keyAlgorithm: 'unsupported-algorithm' })
      ).to.eventually.be.rejectedWith(Error, 'Unsupported crypto algorithm');
    });
  });

  describe('getDefaultSigningKey()', () => {
    it('returns the did:ion default signing key from long form DID, when present', async () => {
      const partialDidDocument: Partial<DidDocument> = {
        id      : 'did:ion:EiAO3IAedMSHaGOZIuIVwLEBHd0SEuWwt2h00dbiGD7Hww:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJkd24tc2lnIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoicnBLbkRQOEY0X2p3dlE3eERra3VLeDE2NU9Td2N5clF2bUVXbDJlaWdJVSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRFZyOHUzVWxvOGtNVUx3WEh6VUdSMFdGdy1ROU14el8zRGQyQXEwVF9KR3cifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUJOX1JaeXZka1lmb2tkRlV5MTNiWnFwR2gzdmhZU3IxVnh3MmVieE5uQzZRIiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlEOEQtdjlsVjdqTzZ3ajVjSXVsRXRwZEFqaHE5NEFnTm54SlozWThVUnlrZyJ9fQ',
        service : [
          {
            id              : '#dwn',
            type            : 'DecentralizedWebNode',
            serviceEndpoint : {
              encryptionKeys: [
                '#dwn-enc'
              ],
              nodes: [
                'https://dwn.tbddev.test/dwn0',
                'https://dwn.tbddev.test/dwn1'
              ],
              signingKeys: [
                '#dwn-sig'
              ]
            }
          }
        ],
      };

      const defaultSigningKeyId = await DidIonMethod.getDefaultSigningKey({
        didDocument: partialDidDocument as DidDocument
      });

      expect(defaultSigningKeyId).to.equal('did:ion:EiAO3IAedMSHaGOZIuIVwLEBHd0SEuWwt2h00dbiGD7Hww:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJkd24tc2lnIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoicnBLbkRQOEY0X2p3dlE3eERra3VLeDE2NU9Td2N5clF2bUVXbDJlaWdJVSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRFZyOHUzVWxvOGtNVUx3WEh6VUdSMFdGdy1ROU14el8zRGQyQXEwVF9KR3cifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUJOX1JaeXZka1lmb2tkRlV5MTNiWnFwR2gzdmhZU3IxVnh3MmVieE5uQzZRIiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlEOEQtdjlsVjdqTzZ3ajVjSXVsRXRwZEFqaHE5NEFnTm54SlozWThVUnlrZyJ9fQ#dwn-sig');
    });

    it('returns the did:ion default signing key from short form DID, when present', async () => {
      const partialDidDocument: Partial<DidDocument> = {
        id      : 'did:ion:EiAO3IAedMSHaGOZIuIVwLEBHd0SEuWwt2h00dbiGD7Hww:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJkd24tc2lnIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoicnBLbkRQOEY0X2p3dlE3eERra3VLeDE2NU9Td2N5clF2bUVXbDJlaWdJVSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRFZyOHUzVWxvOGtNVUx3WEh6VUdSMFdGdy1ROU14el8zRGQyQXEwVF9KR3cifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUJOX1JaeXZka1lmb2tkRlV5MTNiWnFwR2gzdmhZU3IxVnh3MmVieE5uQzZRIiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlEOEQtdjlsVjdqTzZ3ajVjSXVsRXRwZEFqaHE5NEFnTm54SlozWThVUnlrZyJ9fQ',
        service : [
          {
            id              : '#dwn',
            type            : 'DecentralizedWebNode',
            serviceEndpoint : {
              encryptionKeys: [
                '#dwn-enc'
              ],
              nodes: [
                'https://dwn.tbddev.test/dwn0',
                'https://dwn.tbddev.test/dwn1'
              ],
              signingKeys: [
                '#dwn-sig'
              ]
            }
          }
        ],
      };

      const defaultSigningKeyId = await DidIonMethod.getDefaultSigningKey({
        didDocument: partialDidDocument as DidDocument
      });

      expect(defaultSigningKeyId).to.equal('did:ion:EiAO3IAedMSHaGOZIuIVwLEBHd0SEuWwt2h00dbiGD7Hww:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJkd24tc2lnIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoicnBLbkRQOEY0X2p3dlE3eERra3VLeDE2NU9Td2N5clF2bUVXbDJlaWdJVSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRFZyOHUzVWxvOGtNVUx3WEh6VUdSMFdGdy1ROU14el8zRGQyQXEwVF9KR3cifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUJOX1JaeXZka1lmb2tkRlV5MTNiWnFwR2gzdmhZU3IxVnh3MmVieE5uQzZRIiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlEOEQtdjlsVjdqTzZ3ajVjSXVsRXRwZEFqaHE5NEFnTm54SlozWThVUnlrZyJ9fQ#dwn-sig');
    });

    it(`returns first 'authentication' key if DID document is missing 'signingKeys'`, async () => {
      const partialDidDocument: Partial<DidDocument> = {
        id                   : 'did:ion:EiAO3IAedMSHaGOZIuIVwLEBHd0SEuWwt2h00dbiGD7Hww:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJkd24tc2lnIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoicnBLbkRQOEY0X2p3dlE3eERra3VLeDE2NU9Td2N5clF2bUVXbDJlaWdJVSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRFZyOHUzVWxvOGtNVUx3WEh6VUdSMFdGdy1ROU14el8zRGQyQXEwVF9KR3cifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUJOX1JaeXZka1lmb2tkRlV5MTNiWnFwR2gzdmhZU3IxVnh3MmVieE5uQzZRIiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlEOEQtdjlsVjdqTzZ3ajVjSXVsRXRwZEFqaHE5NEFnTm54SlozWThVUnlrZyJ9fQ',
        'verificationMethod' : [
          {
            id           : '#OAPj7ObrEJFgVNA2rrkPM5A-vYVsH_lyz4LgOUdJBa8',
            type         : 'JsonWebKey2020',
            controller   : 'did:ion:EiBP6JaGhwYye4zz-wdeXR2JWl1JclaVDPA7FDgpzM8-ig:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJPQVBqN09ickVKRmdWTkEycnJrUE01QS12WVZzSF9seXo0TGdPVWRKQmE4IiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoicnBLbkRQOEY0X2p3dlE3eERra3VLeDE2NU9Td2N5clF2bUVXbDJlaWdJVSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRFZyOHUzVWxvOGtNVUx3WEh6VUdSMFdGdy1ROU14el8zRGQyQXEwVF9KR3cifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUNUMEh4ZGNTRHkwQ0t5eHV4VkZ3d3A3N3YteEJkSkVRLUVtSXhZUGR4VnV3IiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlEOEQtdjlsVjdqTzZ3ajVjSXVsRXRwZEFqaHE5NEFnTm54SlozWThVUnlrZyJ9fQ',
            publicKeyJwk : {
              crv : 'Ed25519',
              kty : 'OKP',
              x   : 'rpKnDP8F4_jwvQ7xDkkuKx165OSwcyrQvmEWl2eigIU'
            }
          }
        ],
        service: [
          {
            id              : '#dwn',
            type            : 'DecentralizedWebNode',
            serviceEndpoint : {
              encryptionKeys: [
                '#dwn-enc'
              ],
              nodes: [
                'https://dwn.tbddev.test/dwn0',
                'https://dwn.tbddev.test/dwn1'
              ]
            }
          }
        ],
        authentication: [
          '#OAPj7ObrEJFgVNA2rrkPM5A-vYVsH_lyz4LgOUdJBa8'
        ],
      };

      const defaultSigningKeyId = await DidIonMethod.getDefaultSigningKey({
        didDocument: partialDidDocument as DidDocument
      });

      expect(defaultSigningKeyId).to.equal('did:ion:EiAO3IAedMSHaGOZIuIVwLEBHd0SEuWwt2h00dbiGD7Hww:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJkd24tc2lnIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoicnBLbkRQOEY0X2p3dlE3eERra3VLeDE2NU9Td2N5clF2bUVXbDJlaWdJVSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRFZyOHUzVWxvOGtNVUx3WEh6VUdSMFdGdy1ROU14el8zRGQyQXEwVF9KR3cifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUJOX1JaeXZka1lmb2tkRlV5MTNiWnFwR2gzdmhZU3IxVnh3MmVieE5uQzZRIiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlEOEQtdjlsVjdqTzZ3ajVjSXVsRXRwZEFqaHE5NEFnTm54SlozWThVUnlrZyJ9fQ#OAPj7ObrEJFgVNA2rrkPM5A-vYVsH_lyz4LgOUdJBa8');
    });

    it(`returns short form DID when DID has been anchored/published`, async () => {
      let partialDidDocument: Partial<DidDocument> = {
        id      : 'did:ion:EiAO3IAedMSHaGOZIuIVwLEBHd0SEuWwt2h00dbiGD7Hww',
        service : [
          {
            id              : '#dwn',
            type            : 'DecentralizedWebNode',
            serviceEndpoint : {
              encryptionKeys: [
                '#dwn-enc'
              ],
              nodes: [
                'https://dwn.tbddev.test/dwn0',
                'https://dwn.tbddev.test/dwn1'
              ],
              signingKeys: [
                '#dwn-sig'
              ]
            }
          }
        ],
      };

      let defaultSigningKeyId = await DidIonMethod.getDefaultSigningKey({
        didDocument: partialDidDocument as DidDocument
      });

      expect(defaultSigningKeyId).to.equal('did:ion:EiAO3IAedMSHaGOZIuIVwLEBHd0SEuWwt2h00dbiGD7Hww#dwn-sig');

      partialDidDocument = {
        'id'                 : 'did:ion:EiCab9QRUcUTKKIM-W2SMCwnOPxa4y0q7emoWJDSOSz3HQ',
        'service'            : [],
        'verificationMethod' : [
          {
            'id'           : '#dwn-sig',
            'controller'   : 'did:ion:EiCab9QRUcUTKKIM-W2SMCwnOPxa4y0q7emoWJDSOSz3HQ',
            'type'         : 'JsonWebKey2020',
            'publicKeyJwk' : {
              'crv' : 'Ed25519',
              'kty' : 'OKP',
              'x'   : 'Sy0lk6pMXC10WyIh4g8sLz1loL8ImzLcqmFW2267IXc'
            }
          }
        ],
        'authentication': [
          '#dwn-sig'
        ]
      };

      defaultSigningKeyId = await DidIonMethod.getDefaultSigningKey({
        didDocument: partialDidDocument as DidDocument
      });

      expect(defaultSigningKeyId).to.equal('did:ion:EiCab9QRUcUTKKIM-W2SMCwnOPxa4y0q7emoWJDSOSz3HQ#dwn-sig');
    });

    it(`returns undefined if DID document is missing 'signingKeys' and 'authentication'`, async () => {
      const partialDidDocument: Partial<DidDocument> = {
        id      : 'did:ion:EiAO3IAedMSHaGOZIuIVwLEBHd0SEuWwt2h00dbiGD7Hww:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJkd24tc2lnIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoicnBLbkRQOEY0X2p3dlE3eERra3VLeDE2NU9Td2N5clF2bUVXbDJlaWdJVSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRFZyOHUzVWxvOGtNVUx3WEh6VUdSMFdGdy1ROU14el8zRGQyQXEwVF9KR3cifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUJOX1JaeXZka1lmb2tkRlV5MTNiWnFwR2gzdmhZU3IxVnh3MmVieE5uQzZRIiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlEOEQtdjlsVjdqTzZ3ajVjSXVsRXRwZEFqaHE5NEFnTm54SlozWThVUnlrZyJ9fQ',
        service : [
          {
            id              : '#dwn',
            type            : 'DecentralizedWebNode',
            serviceEndpoint : {
              encryptionKeys: [
                '#dwn-enc'
              ],
              nodes: [
                'https://dwn.tbddev.test/dwn0',
                'https://dwn.tbddev.test/dwn1'
              ]
            }
          }
        ],
      };

      const defaultSigningKeyId = await DidIonMethod.getDefaultSigningKey({
        didDocument: partialDidDocument as DidDocument
      });

      expect(defaultSigningKeyId).to.be.undefined;
    });

    it(`throws error if DID document is missing 'id' property`, async () => {
      const partialDidDocument: Partial<DidDocument> = {};

      await expect(
        DidIonMethod.getDefaultSigningKey({
          didDocument: partialDidDocument as DidDocument
        })
      ).to.eventually.be.rejectedWith(Error, `DID document is missing 'id' property`);
    });
  });

  describe('resolve()', () => {
    it('resolves published short form ION DIDs', async() => {
      const did = 'did:ion:EiCab9QRUcUTKKIM-W2SMCwnOPxa4y0q7emoWJDSOSz3HQ';
      const resolutionResult = await DidIonMethod.resolve({ didUrl: did });

      expect(resolutionResult).to.have.property('@context');
      expect(resolutionResult).to.have.property('didDocument');
      expect(resolutionResult).to.have.property('didDocumentMetadata');

      expect(resolutionResult.didDocument).to.have.property('id', did);
      expect(resolutionResult.didDocumentMetadata.method).to.have.property('published', true);
    });

    it('returns notFound error with unpublished short form ION DIDs', async() => {
      const did = 'did:ion:EiBCi7lnGtotBsFkbI_lQskQZLk_GPelU0C5-nRB4_nMfA';
      const resolutionResult = await DidIonMethod.resolve({ didUrl: did });

      expect(resolutionResult).to.have.property('@context');
      expect(resolutionResult).to.have.property('didDocument');
      expect(resolutionResult).to.have.property('didDocumentMetadata');

      expect(resolutionResult.didResolutionMetadata).to.have.property('error', 'notFound');
    });

    it('resolves published long form ION DIDs', async() => {
      const did = 'did:ion:EiAi68p2irCNQIzaui8gTjGDeOqSUusZS8jWVHfseSWZ5g:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJrZXktMSIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiI2MWlQWXVHZWZ4b3R6QmRRWnREdnY2Y1dIWm1YclRUc2NZLXU3WTJwRlpjIiwieSI6Ijg4blBDVkxmckFZOWktd2c1T1Jjd1ZiSFdDX3RiZUFkMUpFMmUwY28wbFUifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iXSwidHlwZSI6IkVjZHNhU2VjcDI1NmsxVmVyaWZpY2F0aW9uS2V5MjAxOSJ9XSwic2VydmljZXMiOlt7ImlkIjoiZHduIiwic2VydmljZUVuZHBvaW50Ijp7Im5vZGVzIjpbImh0dHA6Ly9sb2NhbGhvc3Q6ODA4NSJdfSwidHlwZSI6IkRlY2VudHJhbGl6ZWRXZWJOb2RlIn1dfX1dLCJ1cGRhdGVDb21taXRtZW50IjoiRWlCb1c2dGs4WlZRTWs3YjFubkF2R3F3QTQ2amlaaUc2dWNYemxyNTZDWWFiUSJ9LCJzdWZmaXhEYXRhIjp7ImRlbHRhSGFzaCI6IkVpQ3Y2cUhEMFV4TTBadmZlTHU4dDR4eU5DVjNscFBSaTl6a3paU3h1LW8wWUEiLCJyZWNvdmVyeUNvbW1pdG1lbnQiOiJFaUN0STM0ckdGNU9USkJETXRUYm14a1lQeC0ydFd3MldZLTU2UTVPNHR0WWJBIn19';
      const resolutionResult = await DidIonMethod.resolve({ didUrl: did });

      expect(resolutionResult).to.have.property('@context');
      expect(resolutionResult).to.have.property('didDocument');
      expect(resolutionResult).to.have.property('didDocumentMetadata');

      expect(resolutionResult.didDocument).to.have.property('id', did);
      expect(resolutionResult.didDocumentMetadata.method).to.have.property('published', true);
    });


    it('resolves unpublished long form ION DIDs', async() => {
      const did = 'did:ion:EiBCi7lnGtotBsFkbI_lQskQZLk_GPelU0C5-nRB4_nMfA:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJkd24tc2lnIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4Ijoib0xVQmdKUnA1dlVfSTdfOXB3UTFkb2IwSWg2VjUwT2FrenNOY2R6Uk1CbyJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpQlRRYlV6cmlTU3FEVVpPb0JvUTZWek5wWFRvQWNtSjNHMlBIZzJ3ZXpFcHcifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaURLSFlkRFRpT3lCTWRORWtBcGJtUklHU1ExOFctUHFUeGlrZ0IzX1RpSlVBIiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlBb2pZYzV6eTR2RFZFdElnS1lzWHgtdnBnZzNEeXBUOW0tRmtfMXZ0WHBkQSJ9fQ';
      const resolutionResult = await DidIonMethod.resolve({ didUrl: did });

      expect(resolutionResult).to.have.property('@context');
      expect(resolutionResult).to.have.property('didDocument');
      expect(resolutionResult).to.have.property('didDocumentMetadata');

      expect(resolutionResult.didDocument).to.have.property('id', did);
      expect(resolutionResult.didDocumentMetadata.method).to.have.property('published', false);
    });

    it('returns internalError if custom DID resolver returns invalid response', async () => {
      // Setup stub so that a mocked response is returned rather than calling over the network.
      const mockResult = `<html>
      <head><title>404 Not Found</title></head>
      <body>
      <center><h1>404 Not Found</h1></center>
      <hr><center>nginx/1.25.1</center>
      </body>
      </html>`;
      const fetchStub = sinon.stub(global, 'fetch');
      // @ts-expect-error because we're only mocking ok and json() from global.fetch().
      fetchStub.returns(Promise.resolve({
        ok   : false,
        json : () => Promise.reject(JSON.parse(mockResult))
      }));

      const did = 'did:ion:EiCab9QRUcUTKKIM-W2SMCwnOPxa4y0q7emoWJDSOSz3HQ';
      const resolutionResult = await DidIonMethod.resolve({
        didUrl            : did,
        resolutionOptions : { resolutionEndpoint: 'https://dev.uniresolver.io/7.5/identifiers' }
      });
      fetchStub.restore();

      expect(resolutionResult).to.have.property('@context');
      expect(resolutionResult).to.have.property('didDocument');
      expect(resolutionResult).to.have.property('didDocumentMetadata');

      expect(resolutionResult.didResolutionMetadata).to.have.property('error', 'internalError');
    });

    it(`returns methodNotSupported if DID method is not 'ion'`, async () => {
      const did = 'did:key:z6MkvEvogvhMEv9bXLyDXdqSSvvh5goAMtUruYwCbFpuhDjx';
      const resolutionResult = await DidIonMethod.resolve({ didUrl: did });
      expect(resolutionResult).to.have.property('@context');
      expect(resolutionResult).to.have.property('didDocument');
      expect(resolutionResult).to.have.property('didDocumentMetadata');

      expect(resolutionResult.didResolutionMetadata).to.have.property('error', 'methodNotSupported');
    });

    it('accepts custom DID resolver with trailing slash', async () => {
      const mockResult = { mock: 'data' };
      const fetchStub = sinon.stub(global, 'fetch');
      // @ts-expect-error because we're only mocking ok and json() from global.fetch().
      fetchStub.returns(Promise.resolve({
        ok   : true,
        json : () => Promise.resolve(mockResult)
      }));

      const did = 'did:ion:EiCab9QRUcUTKKIM-W2SMCwnOPxa4y0q7emoWJDSOSz3HQ';
      const resolutionResult = await DidIonMethod.resolve({
        didUrl            : did,
        resolutionOptions : { resolutionEndpoint: 'https://dev.uniresolver.io/1.0/identifiers/' }
      });
      fetchStub.restore();

      expect(resolutionResult).to.deep.equal(mockResult);
      expect(fetchStub.calledOnceWith(
        `https://dev.uniresolver.io/1.0/identifiers/${did}`
      )).to.be.true;
    });

    it('accepts custom DID resolver without trailing slash', async () => {
      const mockResult = { mock: 'data' };
      const fetchStub = sinon.stub(global, 'fetch');
      // @ts-expect-error because we're only mocking ok and json() from global.fetch().
      fetchStub.returns(Promise.resolve({
        ok   : true,
        json : () => Promise.resolve(mockResult)
      }));

      const did = 'did:ion:EiCab9QRUcUTKKIM-W2SMCwnOPxa4y0q7emoWJDSOSz3HQ';
      const resolutionResult = await DidIonMethod.resolve({
        didUrl            : did,
        resolutionOptions : { resolutionEndpoint: 'https://dev.uniresolver.io/1.0/identifiers' }
      });
      fetchStub.restore();

      expect(resolutionResult).to.deep.equal(mockResult);
      expect(fetchStub.calledOnceWith(
        `https://dev.uniresolver.io/1.0/identifiers/${did}`
      )).to.be.true;
    });
  });
});