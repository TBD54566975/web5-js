import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import type { PrivateKeyJwk, PublicKeyJwk, Web5Crypto } from '@web5/crypto';
import type { DidKeySet, PortableDid } from '@web5/dids';

import { DidKeyMethod } from '@web5/dids';
import { Jose, EdDsaAlgorithm } from '@web5/crypto';

import type { ManagedDid } from '../src/did-manager.js';
import type { Web5ManagedAgent } from '../src/types/agent.js';

import { TestAgent } from './utils/test-agent.js';
import { DidManager } from '../src/did-manager.js';
import { TestManagedAgent } from '../src/test-managed-agent.js';
import { DidStoreDwn, DidStoreMemory } from '../src/store-managed-did.js';

chai.use(chaiAsPromised);
describe('DidManager', () => {

  describe('constructor', () => {
    it('accepts an array of DID method implementations', () => {
      expect(
        new DidManager({ didMethods: [DidKeyMethod] })
      ).to.not.throw;
    });

    it('throws an exception if didMethods input is missing', () => {
      expect(() =>
        // @ts-expect-error because an empty object is intentionally specified to trigger the error.
        new DidManager({})
      ).to.throw(TypeError, `Required parameter missing: 'didMethods'`);
    });
  });

  describe('get agent', () => {
    it(`returns the 'agent' instance property`, async () => {
      // @ts-expect-error because we are only mocking a single property.
      const mockAgent: Web5ManagedAgent = {
        agentDid: 'did:method:abc123'
      };
      const didManager = new DidManager({ didMethods: [DidKeyMethod], agent: mockAgent });
      const agent = didManager.agent;
      expect(agent).to.exist;
      expect(agent.agentDid).to.equal('did:method:abc123');
    });

    it(`throws an error if the 'agent' instance property is undefined`, () => {
      const didManager = new DidManager({ didMethods: [DidKeyMethod] });
      expect(() =>
        didManager.agent
      ).to.throw(Error, 'Unable to determine agent execution context');
    });
  });

  const agentStoreTypes = ['dwn', 'memory'] as const;
  agentStoreTypes.forEach((agentStoreType) => {

    describe(`with ${agentStoreType} data stores`, () => {
      let testAgent: TestManagedAgent;

      before(async () => {
        testAgent = await TestManagedAgent.create({
          agentClass  : TestAgent,
          agentStores : agentStoreType
        });
      });

      beforeEach(async () => {
        await testAgent.clearStorage();
        await testAgent.createAgentDid();
      });

      after(async () => {
        await testAgent.clearStorage();
        await testAgent.closeStorage();
      });

      describe('create()', () => {
        it('creates a did:key ManagedDid with keys if keySet is not given', async () => {
          // Create a ManagedDid.
          const managedDid = await testAgent.agent.didManager.create({
            method : 'key',
            kms    : 'local'
          });

          // Verify the result.
          expect(managedDid).to.have.property('alias');
          expect(managedDid).to.have.property('did');
          expect(managedDid).to.have.property('document');
          expect(managedDid).to.have.property('metadata');
          expect(managedDid).to.have.property('method');
        });

        it('creates a did:ion ManagedDid with keys if keySet is not given', async () => {
          // Create a ManagedDid.
          const managedDid = await testAgent.agent.didManager.create({
            method : 'ion',
            kms    : 'local'
          });

          // Verify the result.
          expect(managedDid).to.have.property('alias');
          expect(managedDid).to.have.property('did');
          expect(managedDid).to.have.property('document');
          expect(managedDid).to.have.property('metadata');
          expect(managedDid).to.have.property('method');
        }).timeout(100000);

        it('adds generated keys to KeyManager if keySet is not given', async () => {
          // Create a ManagedDid.
          const managedDid = await testAgent.agent.didManager.create({ method: 'key', kms: 'local' });

          // Attempt to retrieve the ManagedKeyPair from the KeyManager.
          const signingKeyId = await testAgent.agent.didManager.getDefaultSigningKey({ did: managedDid.did });
          if (!signingKeyId) throw new Error('Type guard');
          const storedKeyPair = await testAgent.agent.keyManager.getKey({ keyRef: signingKeyId });

          // Verify the key was found.
          expect(storedKeyPair).to.exist;
          expect(storedKeyPair).to.have.property('privateKey');
          expect(storedKeyPair).to.have.property('publicKey');
        });

        it('updates KeyManager alias if keySet previously stored in KeyManager', async () => {
          // Generate an Ed25519 signing key pair.
          const keyPair = await testAgent.agent.keyManager.generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
            extractable : true,
            keyUsages   : ['sign', 'verify'],
            kms         : 'local'
          });

          // Create a ManagedDid using the keySet.
          const keySet: DidKeySet = {
            verificationMethodKeys: [{
              keyManagerId  : keyPair.publicKey.id,
              relationships : ['authentication']
            }]
          };
          const managedDid = await testAgent.agent.didManager.create({ method: 'key', keySet, kms: 'local' });

          // Attempt to retrieve the ManagedKeyPair from the KeyManager.
          const signingKeyId = await testAgent.agent.didManager.getDefaultSigningKey({ did: managedDid.did });
          if (!signingKeyId) throw new Error('Type guard');
          const storedKeyPair = await testAgent.agent.keyManager.getKey({ keyRef: signingKeyId });

          // Verify the key was found.
          expect(storedKeyPair).to.exist;
          expect(storedKeyPair).to.have.property('privateKey');
          expect(storedKeyPair).to.have.property('publicKey');
        });

        it('updates KeyManager alias if keySet key pair not present in KeyManager', async () => {
          // Generate an Ed25519 signing key pair.
          const keyPair = await new EdDsaAlgorithm().generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
            extractable : true,
            keyUsages   : ['sign', 'verify']
          });

          // Convert the key pair to JSON Web Key format.
          const publicKeyJwk = await Jose.cryptoKeyToJwk({ key: keyPair.publicKey as Web5Crypto.CryptoKey }) as PublicKeyJwk;
          const privateKeyJwk = await Jose.cryptoKeyToJwk({ key: keyPair.privateKey as Web5Crypto.CryptoKey }) as PrivateKeyJwk;

          // Create a ManagedDid using the keySet.
          const keySet: DidKeySet = {
            verificationMethodKeys: [{
              privateKeyJwk,
              publicKeyJwk,
              relationships: ['authentication']
            }]
          };
          const managedDid = await testAgent.agent.didManager.create({ method: 'key', keySet, kms: 'local' });

          // Attempt to retrieve the ManagedKeyPair from the KeyManager.
          const signingKeyId = await testAgent.agent.didManager.getDefaultSigningKey({ did: managedDid.did });
          if (!signingKeyId) throw new Error('Type guard');
          const storedKeyPair = await testAgent.agent.keyManager.getKey({ keyRef: signingKeyId });

          // Verify the key was found.
          expect(storedKeyPair).to.exist;
          expect(storedKeyPair).to.have.property('privateKey');
          expect(storedKeyPair).to.have.property('publicKey');
        });

        it('updates KeyManager alias if keySet public key not present in KeyManager', async () => {
          // Generate an Ed25519 signing key pair.
          const keyPair = await new EdDsaAlgorithm().generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
            extractable : true,
            keyUsages   : ['sign', 'verify']
          });

          // Convert the public key to JSON Web Key format.
          const publicKeyJwk = await Jose.cryptoKeyToJwk({ key: keyPair.publicKey as Web5Crypto.CryptoKey }) as PublicKeyJwk;

          // Create a ManagedDid using the keySet.
          const keySet: DidKeySet = {
            verificationMethodKeys: [{
              publicKeyJwk,
              relationships: ['authentication']
            }]
          };
          const managedDid = await testAgent.agent.didManager.create({
            method  : 'key',
            keySet,
            kms     : 'local',
            context : testAgent.agent.agentDid
          });

          // Attempt to retrieve the ManagedKey from the KeyManager.
          const signingKeyId = await testAgent.agent.didManager.getDefaultSigningKey({ did: managedDid.did });
          if (!signingKeyId) throw new Error('Type guard');
          const storedPublicKey = await testAgent.agent.keyManager.getKey({ keyRef: signingKeyId });

          // Verify the key was found.
          expect(storedPublicKey).to.exist;
          expect(storedPublicKey).to.have.property('type', 'public');
        });

        it('throws an exception if keySet is missing publicKeyJwk and not present in KeyManager', async () => {
          const keySet: DidKeySet = { verificationMethodKeys: [{ relationships: ['authentication'] }]
          };

          await expect(
            testAgent.agent.didManager.create({ method: 'key', keySet })
          ).to.eventually.be.rejectedWith(Error, 'Required parameter(s) missing');
        });

        it('throws an exception if keySet with privateKeyJwk is missing publicKeyJwk and not present in KeyManager', async () => {
          // Generate an Ed25519 signing key pair.
          const keyPair = await new EdDsaAlgorithm().generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
            extractable : true,
            keyUsages   : ['sign', 'verify']
          });

          // Convert private key to JWK format.
          const privateKeyJwk = await Jose.cryptoKeyToJwk({ key: keyPair.privateKey as Web5Crypto.CryptoKey }) as PrivateKeyJwk;

          const keySet: DidKeySet = { verificationMethodKeys: [{ privateKeyJwk, relationships: ['authentication'] }]
          };

          await expect(
            testAgent.agent.didManager.create({ method: 'key', keySet })
          ).to.eventually.be.rejectedWith(Error, 'Required parameter(s) missing');
        });

        // Tests that should only run for DWN-backed stores that provide multi-tenancy.
        if (agentStoreType === 'dwn') {
          it('creates DIDs under the tenant of the new DID, by default', async () => {
            // Create a ManagedDid.
            const managedDid = await testAgent.agent.didManager.create({
              method : 'key',
              kms    : 'local'
            });

            // Verify that the DID was NOT stored under the Agent's tenant.
            let storedDid = await testAgent.agent.didManager.get({ didRef: managedDid.did });
            expect(storedDid).to.not.exist;

            // Verify that the DID WAS stored under the new DID's tenant.
            storedDid = await testAgent.agent.didManager.get({ didRef: managedDid.did, context: managedDid.did });
            expect(storedDid).to.exist;
          });

          it('creates DIDs under the context of the specified DID', async () => {
            // Create a ManagedDid.
            const managedDid = await testAgent.agent.didManager.create({
              method  : 'key',
              kms     : 'local',
              context : testAgent.agent.agentDid
            });

            // Verify that the DID WAS stored under the Agent's tenant.
            let storedDid = await testAgent.agent.didManager.get({ didRef: managedDid.did });
            expect(storedDid).to.exist;

            // Verify that the DID was NOT stored under the new DID's tenant.
            storedDid = await testAgent.agent.didManager.get({ didRef: managedDid.did, context: managedDid.did });
            expect(storedDid).to.not.exist;
          }).timeout(30000);
        }
      });

      describe('delete()', () => {
        xit('should be implemented');
      });

      describe('export()', () => {
        xit('should be implemented');
      });

      describe('import()', () => {
        it('imports did:key DID and key set', async () => {
          // Create did:key DID with key set to use to attempt import.
          const portableDid = await DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });

          // Attempt to import the DID with DidManager under the Agent's context.
          const managedDid = await testAgent.agent.didManager.import({
            did     : portableDid,
            kms     : 'local',
            context : testAgent.agent.agentDid
          });

          // Try to retrieve the DID from the DidManager store to verify it was imported.
          const storedDid = await testAgent.agent.didManager.get({ didRef: managedDid.did });

          if (storedDid === undefined) throw new Error('Type guard unexpectedly threw'); // Type guard.
          expect(storedDid.did).to.equal(portableDid.did);
          expect(storedDid.document).to.deep.equal(portableDid.document);
        });

        it('supports importing multiple DIDs to the same Identity/tenant', async () => {
          // Create and import the first DID.
          const did1 = await DidKeyMethod.create();
          const did1Import = await testAgent.agent.didManager.import({
            did     : did1,
            kms     : 'local',
            context : testAgent.agent.agentDid
          });

          // Create and import a second DID.
          const did2 = await DidKeyMethod.create();
          const did2Import = await testAgent.agent.didManager.import({
            did     : did2,
            kms     : 'local',
            context : testAgent.agent.agentDid
          });

          // Verify that DID 1 WAS stored under the Agent's tenant.
          let storedDid1 = await testAgent.agent.didManager.get({ didRef: did1Import.did });
          expect(storedDid1).to.exist;
          expect(storedDid1?.did).to.equal(did1.did);

          // Verify that DID 2 WAS stored under the Agent's tenant.
          let storedDid2 = await testAgent.agent.didManager.get({ didRef: did2Import.did });
          expect(storedDid2).to.exist;
          expect(storedDid2?.did).to.equal(did2.did);
        });

        it('does not return private key JWK after import', async () => {
          // Create did:key DID with key set to use to attempt import.
          const portableDid = await DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });

          // Attempt to import the DID with DidManager.
          const managedDid = await testAgent.agent.didManager.import({ did: portableDid, kms: 'local' });

          // Verify private key material is not returned.
          if (managedDid.keySet.verificationMethodKeys === undefined) throw new Error('Type guard unexpectedly threw'); // Type guard.
          for (const key of managedDid.keySet.verificationMethodKeys) {
            expect(key.privateKeyJwk).to.not.exist;
          }
        });

        it('does not mutate DID input during import', async () => {
          // Create did:key DID with key set to use to attempt import.
          const portableDid = await DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });

          // Create a deep clone to use to check for side effects.
          const portableDidClone = structuredClone(portableDid);

          // Import the DID with DidManager.
          await testAgent.agent.didManager.import({ did: portableDid, kms: 'local' });

          // Verify the input object was not mutated during import.
          expect(portableDid).to.deep.equal(portableDidClone);
        });

        // Tests that should only run for DWN-backed stores that provide multi-tenancy.
        if (agentStoreType === 'dwn') {
          it('imports DIDs under the tenant of the new DID, by default', async () => {
            // Create did:key DID with key set to use to attempt import.
            const portableDid = await DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });

            // Attempt to import the DID with DidManager.
            const managedDid = await testAgent.agent.didManager.import({
              did : portableDid,
              kms : 'local'
            });

            // Verify that the DID was NOT stored under the Agent's tenant.
            let storedDid = await testAgent.agent.didManager.get({ didRef: managedDid.did });
            expect(storedDid).to.not.exist;

            // Verify that the DID WAS stored under the new DID's tenant.
            storedDid = await testAgent.agent.didManager.get({ didRef: managedDid.did, context: managedDid.did });
            expect(storedDid).to.exist;
          });

          it('imports DIDs under the context of the specified DID', async () => {
            // Create did:key DID with key set to use to attempt import.
            const portableDid = await DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });

            // Attempt to import the DID with DidManager.
            const managedDid = await testAgent.agent.didManager.import({
              did     : portableDid,
              kms     : 'local',
              context : testAgent.agent.agentDid
            });

            // Verify that the DID was stored under the Agent's tenant.
            let storedDid = await testAgent.agent.didManager.get({ didRef: managedDid.did });
            expect(storedDid).to.exist;

            // Verify that the DID was NOT stored under the new DID's tenant.
            storedDid = await testAgent.agent.didManager.get({ didRef: managedDid.did, context: managedDid.did });
            expect(storedDid).to.not.exist;
          });
        }
      });

      describe('update()', () => {
        xit('should be implemented');
      });
    });
  });
});

describe('DidStoreDwn', () => {
  let didStoreDwn: DidStoreDwn;
  let testAgent: TestAgent;
  let testManagedDid: ManagedDid;

  before(async () => {
    testAgent = await TestAgent.create();
  });

  beforeEach(async () => {
    didStoreDwn = new DidStoreDwn();

    const didManager = new DidManager({
      didMethods : [DidKeyMethod],
      store      : didStoreDwn,
      agent      : testAgent
    });

    testAgent.didManager = didManager;

    // Create did:key DID with key set.
    const portableDid = await DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });
    testManagedDid = { ...portableDid, method: 'key' };
  });

  afterEach(async () => {
    await testAgent.clearStorage();
  });

  after(async () => {
    await testAgent.closeStorage();
  });

  describe('deleteDid()', () => {
    let portableDid: PortableDid;

    beforeEach(async () => {
      // Create a DID for the test.
      portableDid = await DidKeyMethod.create();
    });

    it('should delete DID and return true if DID exists', async () => {
      // Import the first DID and set as the Agent DID.
      await testAgent.didManager.import({ did: portableDid });
      testAgent.agentDid = portableDid.did;

      // Test deleting the DID and validate the result.
      const deleteResult = await didStoreDwn.deleteDid({ did: portableDid.did, agent: testAgent });
      expect(deleteResult).to.be.true;

      // Verify the DID is no longer in the store.
      const storedDid = await didStoreDwn.getDid({ did: portableDid.did, agent: testAgent });
      expect(storedDid).to.be.undefined;
    });

    it('should return false if DID does not exist', async () => {
      // Import the first DID and set as the Agent DID.
      await testAgent.didManager.import({ did: portableDid });
      testAgent.agentDid = portableDid.did;

      // Test deleting the DID.
      const deleteResult = await didStoreDwn.deleteDid({ did: 'non-existent', agent: testAgent });

      // Validate the DID was not deleted.
      expect(deleteResult).to.be.false;
    });

    it('throws an error if Agent DID is undefined and no keys exist for specified DID', async () => {
      await expect(
        didStoreDwn.deleteDid({ did: 'did:key:z6Mkt3UrUJXwrMzzBwt6XZ91aZYWk2GKvZbSgkZoEGdrRnB5', agent: testAgent })
      ).to.eventually.be.rejectedWith(Error, `Agent property 'agentDid' is undefined and no keys were found for`);
    });
  });

  describe('findDid()', () => {
    let portableDid: PortableDid;

    beforeEach(async () => {
      // Create a DID for the test.
      portableDid = await DidKeyMethod.create();
    });

    it('should return a DID by identifier if it exists', async () => {
      // Import the DID to use for the test.
      const importedDid = await testAgent.didManager.import({ did: portableDid, alias: 'social' });
      testAgent.agentDid = importedDid.did;

      // Test finding the DID.
      const storedDid = await didStoreDwn.findDid({ did: importedDid.did, agent: testAgent});

      // Verify the DID is in the store.
      if (!storedDid) throw Error(); // Type guard.
      expect(storedDid.did).to.equal(importedDid.did);
    });

    it('should return a DID by alias if it exists', async () => {
      // Import the DID to use for the test.
      const importedDid = await testAgent.didManager.import({ did: portableDid, alias: 'social' });
      testAgent.agentDid = importedDid.did;

      // Test finding the DID.
      const storedDid = await didStoreDwn.findDid({ alias: 'social', agent: testAgent});

      // Verify the DID is in the store.
      if (!storedDid) throw Error(); // Type guard.
      expect(storedDid.did).to.equal(importedDid.did);
    });

    it('should return undefined when attempting to get a non-existent DID', async () => {
      // Import the first DID and set as the Agent DID.
      const importedDid = await testAgent.didManager.import({ did: portableDid, alias: 'social' });
      testAgent.agentDid = importedDid.did;

      // Test finding the DID by ID.
      expect(
        await didStoreDwn.findDid({ did: 'non-existent-did', agent: testAgent })
      ).to.be.undefined;

      // Test finding the DID by alias.
      expect(
        await didStoreDwn.findDid({ alias: 'non-existent-did', agent: testAgent })
      ).to.be.undefined;
    });

    it('throws an error if Agent DID is undefined and no keys exist for specified DID', async () => {
      await expect(
        didStoreDwn.findDid({ did: 'did:key:z6Mkt3UrUJXwrMzzBwt6XZ91aZYWk2GKvZbSgkZoEGdrRnB5', agent: testAgent })
      ).to.eventually.be.rejectedWith(Error, `Agent property 'agentDid' is undefined and no keys were found for`);
    });

    it('throws an error if Agent DID is undefined when searching by alias', async () => {
      await expect(
        didStoreDwn.findDid({ alias: 'external-id', agent: testAgent })
      ).to.eventually.be.rejectedWith(Error, `Agent property 'agentDid' is undefined`);
    });
  });

  describe('getDid()', () => {
    it('should return a DID by identifier if it exists', async () => {
      // Create did:key DID with key set.
      const portableDid = await DidKeyMethod.create();

      // Import the DID to the DidManager DWN store.
      const importedDid = await testAgent.didManager.import({ did: portableDid });

      // Set the Agent's DID to the imported DID.
      testAgent.agentDid = importedDid.did;

      // Test getting the DID.
      const storedDid = await didStoreDwn.getDid({ did: portableDid.did, agent: testAgent });

      // Verify the DID is in the store.
      if (storedDid === undefined) throw new Error('Type guard unexpectedly threw'); // Type guard.
      expect(storedDid.did).to.equal(importedDid.did);
      expect(storedDid.method).to.equal(importedDid.method);
      expect(storedDid.document).to.deep.equal(importedDid.document);
    });

    it('should return undefined when attempting to get a non-existent DID', async () => {
      // Create did:key DID with key set.
      const portableDid = await DidKeyMethod.create();

      // Import the DID to the DidManager DWN store.
      const importedDid = await testAgent.didManager.import({ did: portableDid });

      // Set the Agent's DID to the imported DID.
      testAgent.agentDid = importedDid.did;

      // Test getting the DID.
      const storedDid = await didStoreDwn.getDid({ did: 'non-existent', agent: testAgent });

      // Verify the result is undefined.
      expect(storedDid).to.be.undefined;
    });

    it('throws an error if Agent DID is undefined and no keys exist for specified DID', async () => {
      await expect(
        didStoreDwn.getDid({ did: 'did:key:z6MkmRUyE6ywoYV2zL9Nus2YuFchpnTGzPXToZWDbdag6tvB', agent: testAgent })
      ).to.eventually.be.rejectedWith(Error, `Agent property 'agentDid' is undefined and no keys were found for`);
    });
  });

  describe('importDid()', () => {
    it('imports did:key DID and key set', async () => {
      // Create did:key DID with key set.
      const portableDid = await DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });
      const managedDid = { ...portableDid, method: 'key' };

      // Import the key set into KeyManager.
      // @ts-expect-error because we're accessing a private method.
      managedDid.keySet = await testAgent.didManager.importOrGetKeySet({
        keySet : managedDid.keySet,
        kms    : 'memory'
      });

      // Set the alias for each key to the DID document method ID.
      // @ts-expect-error because we're accessing a private method.
      await testAgent.didManager.updateKeySet({
        canonicalId : managedDid.canonicalId,
        didDocument : managedDid.document,
        keySet      : managedDid.keySet
      });

      // Import the first DID into the store.
      await didStoreDwn.importDid({
        did   : managedDid,
        agent : testAgent
      });

      // Set the Agent's DID to the imported DID.
      testAgent.agentDid = managedDid.did;

      // Try to retrieve the DID from the DidManager store to verify it was imported.
      const storedDid = await didStoreDwn.getDid({ did: portableDid.did, agent: testAgent });

      // Verify the DID is in the store.
      if (storedDid === undefined) throw new Error('Type guard unexpectedly threw'); // Type guard.
      expect(storedDid.did).to.equal(managedDid.did);
      expect(storedDid.method).to.equal(managedDid.method);
      expect(storedDid.document).to.deep.equal(managedDid.document);
    });

    it('throws an error when attempting to import a DID that already exists', async () => {
      // Create did:key DID with key set.
      const portableDid = await DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });
      const managedDid = { ...portableDid, method: 'key' };

      // Import the key set into KeyManager.
      // @ts-expect-error because we're accessing a private method.
      managedDid.keySet = await testAgent.didManager.importOrGetKeySet({
        keySet : managedDid.keySet,
        kms    : 'memory'
      });

      // Set the alias for each key to the DID document method ID.
      // @ts-expect-error because we're accessing a private method.
      await testAgent.didManager.updateKeySet({
        canonicalId : managedDid.canonicalId,
        didDocument : managedDid.document,
        keySet      : managedDid.keySet
      });

      // Import the first DID into the store.
      await didStoreDwn.importDid({
        did   : managedDid,
        agent : testAgent
      });

      // Set the Agent's DID to the imported DID.
      testAgent.agentDid = managedDid.did;

      // Try to import the same key again.
      await expect(
        didStoreDwn.importDid({
          did   : managedDid,
          agent : testAgent
        })
      ).to.eventually.be.rejectedWith(Error, 'DID with ID already exists');
    });

    it('authors multiple imports with the same Agent DID', async () => {
      // Create and import the Agent DID which will be used to author all record writes.
      const portableAgentDid = await DidKeyMethod.create();
      await testAgent.didManager.import({ did: portableAgentDid });
      testAgent.agentDid = portableAgentDid.did;

      // Create two did:key DIDs with key sets to test import.
      const portableDid2 = await DidKeyMethod.create();
      const managedDid2 = { ...portableDid2, method: 'key' };
      const portableDid3 = await DidKeyMethod.create();
      const managedDid3 = { ...portableDid3, method: 'key' };

      // Import the two DIDs.
      await didStoreDwn.importDid({ did: managedDid2, agent: testAgent });
      await didStoreDwn.importDid({ did: managedDid3, agent: testAgent });

      // Get each DID and verify that all three were written under the Agent's DID tenant.
      const storedDid1 = await didStoreDwn.getDid({ did: portableAgentDid.did, agent: testAgent });
      const storedDid2 = await didStoreDwn.getDid({ did: portableDid2.did, agent: testAgent });
      const storedDid3 = await didStoreDwn.getDid({ did: portableDid3.did, agent: testAgent });
      if (!(storedDid1 && storedDid2 && storedDid3)) throw new Error('Type guard unexpectedly threw'); // Type guard.
      expect(storedDid1.did).to.equal(portableAgentDid.did);
      expect(storedDid2.did).to.equal(portableDid2.did);
      expect(storedDid3.did).to.equal(portableDid3.did);
    });

    it('throws an error if Agent DID is undefined and no keys exist for imported DID', async () => {
      await expect(
        didStoreDwn.importDid({ did: testManagedDid, agent: testAgent })
      ).to.eventually.be.rejectedWith(Error, `Agent property 'agentDid' is undefined and no keys were found for`);
    });
  });

  describe('listDids()', () => {
    it('should return an array of all DIDs in the store', async () => {
      // Create three did:key DIDs with key sets.
      const portableDid1 = await DidKeyMethod.create();
      const portableDid2 = await DidKeyMethod.create();
      const portableDid3 = await DidKeyMethod.create();

      // Import the first DID and set as the Agent DID.
      const importedDid1 = await testAgent.didManager.import({ did: portableDid1 });
      testAgent.agentDid = importedDid1.did;

      // Import the other two DIDs under the same DID context.
      const importedDid2 = await testAgent.didManager.import({ did: portableDid2, context: testAgent.agentDid });
      const importedDid3 = await testAgent.didManager.import({ did: portableDid3, context: testAgent.agentDid });

      // List DIDs and verify the result.
      const storedDids = await didStoreDwn.listDids({ agent: testAgent });
      expect(storedDids).to.have.length(3);
      const importedDids = [importedDid1.did, importedDid2.did, importedDid3.did];
      for (const storedDid of storedDids) {
        expect(importedDids).to.include(storedDid.did);
      }
    });

    it('throws an error if Agent DID is undefined', async () => {
      await expect(
        didStoreDwn.listDids({ agent: testAgent })
      ).to.eventually.be.rejectedWith(Error, `Agent property 'agentDid' is undefined`);
    });
  });
});

describe('DidStoreMemory', () => {
  let didStore: DidStoreMemory;
  let testAgent: TestAgent;
  let testManagedDid: ManagedDid;

  before(async () => {
    testAgent = await TestAgent.create();
  });

  beforeEach(async () => {
    didStore = new DidStoreMemory();

    const didManager = new DidManager({
      didMethods : [DidKeyMethod],
      store      : didStore,
      agent      : testAgent
    });

    testAgent.didManager = didManager;

    // Create did:key DID with key set.
    const portableDid = await DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });
    testManagedDid = { ...portableDid, method: 'key' };
  });

  afterEach(async () => {
    await testAgent.clearStorage();
  });

  after(async () => {
    await testAgent.closeStorage();
  });

  describe('deleteIdentity()', () => {
    it('should delete identity and return true if key exists', async () => {
      // Import the identity.
      await didStore.importDid({ did: testManagedDid });

      // Test deleting the key and validate the result.
      const deleteResult = await didStore.deleteDid({ did: testManagedDid.did });
      expect(deleteResult).to.be.true;

      // Verify the key is no longer in the store.
      const storedKey = await didStore.getDid({ did: testManagedDid.did });
      expect(storedKey).to.be.undefined;
    });

    it('should return false if key does not exist', async () => {
      // Test deleting the key.
      const nonExistentId = '1234';
      const deleteResult = await didStore.deleteDid({ did: nonExistentId });

      // Validate the key was not deleted.
      expect(deleteResult).to.be.false;
    });
  });

  describe('getDid()', () => {
    xit('tests needed');
  });

  describe('findDid()', () => {
    xit('tests needed');
  });

  describe('importDid', () => {
    xit('tests needed');
  });

  describe('listDids', () => {
    xit('tests needed');
  });
});