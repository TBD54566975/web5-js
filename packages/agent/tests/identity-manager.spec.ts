import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { DidKeyMethod } from '@web5/dids';

import type { ManagedDid } from '../src/did-manager.js';
import type { Web5ManagedAgent } from '../src/types/agent.js';
import type { ManagedIdentity } from '../src/identity-manager.js';

import { TestAgent } from './utils/test-agent.js';
import { IdentityManager } from '../src/identity-manager.js';
import { TestManagedAgent } from '../src/test-managed-agent.js';
import { IdentityStoreDwn, IdentityStoreMemory } from '../src/store-managed-identity.js';

chai.use(chaiAsPromised);

describe('IdentityManager', () => {
  describe('get agent', () => {
    it(`returns the 'agent' instance property`, async () => {
      // @ts-expect-error because we are only mocking a single property.
      const mockAgent: Web5ManagedAgent = {
        agentDid: 'did:method:abc123'
      };
      const identityManager = new IdentityManager({ agent: mockAgent });
      const agent = identityManager.agent;
      expect(agent).to.exist;
      expect(agent.agentDid).to.equal('did:method:abc123');
    });

    it(`throws an error if the 'agent' instance property is undefined`, () => {
      const identityManager = new IdentityManager();
      expect(() =>
        identityManager.agent
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

      afterEach(async () => {
        await testAgent.clearStorage();
      });

      after(async () => {
        await testAgent.clearStorage();
        await testAgent.closeStorage();
      });

      describe('create()', () => {
        it('creates a ManagedIdentity with new DID and keys', async () => {
          // Create a ManagedIdentity.
          const managedIdentity = await testAgent.agent.identityManager.create({
            didMethod : 'key',
            name      : 'Alice',
            kms       : 'local'
          });

          // Verify the ManagedIdentity was created with the expected properties.
          expect(managedIdentity).to.have.property('did');
          expect(managedIdentity).to.have.property('name');

          // Confirm the DID was stored in the DidManager store.
          const managedDid = await testAgent.agent.didManager.get({
            didRef  : managedIdentity.did,
            context : managedIdentity.did
          });
          expect(managedDid).to.exist;

          // Confirm the keys were stored in the KeyManager store.
          if (managedDid === undefined) throw new Error();
          const signingKeyId = await testAgent.agent.didManager.getDefaultSigningKey({
            did: managedDid.did
          });
          if (!signingKeyId) throw new Error('Type guard');
          const keyPair = await testAgent.agent.keyManager.getKey({ keyRef: signingKeyId });
          expect(keyPair).to.exist;
          expect(keyPair).to.have.property('privateKey');
          expect(keyPair).to.have.property('publicKey');
        });

        it('creates a ManagedIdentity using an existing DID and key set', async () => {
          // Create did:key DID with key set to use to attempt import.
          const portableDid = await DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });

          // Create a ManagedIdentity.
          const managedIdentity = await testAgent.agent.identityManager.create({
            did  : portableDid,
            name : 'Alice',
            kms  : 'local'
          });

          // Verify the ManagedIdentity was created with the expected properties.
          expect(managedIdentity).to.have.property('did', portableDid.did);
          expect(managedIdentity).to.have.property('name');

          // Confirm the DID was stored in the DidManager store.
          const managedDid = await testAgent.agent.didManager.get({
            didRef  : managedIdentity.did,
            context : managedIdentity.did
          });
          expect(managedDid).to.exist;

          // Confirm the keys were stored in the KeyManager store.
          if (managedDid === undefined) throw new Error('Type guard unexpectedly threw'); // Type guard.
          const signingKeyId = await testAgent.agent.didManager.getDefaultSigningKey({
            did: managedDid.did
          });
          if (!signingKeyId) throw new Error('Type guard');
          const keyPair = await testAgent.agent.keyManager.getKey({
            keyRef: signingKeyId
          });
          expect(keyPair).to.exist;
          expect(keyPair).to.have.property('privateKey');
          expect(keyPair).to.have.property('publicKey');
        });

        // Tests that should only run for DWN-backed stores that provide multi-tenancy.
        if (agentStoreType === 'dwn') {
          it('creates Identities under the tenant of the new Identity, by default', async () => {
            // Create a ManagedDid.
            const managedIdentity = await testAgent.agent.identityManager.create({
              didMethod : 'key',
              name      : 'Alice',
              kms       : 'local'
            });

            // Verify that the Identity was NOT stored under the Agent's tenant.
            let storedIdentity = await testAgent.agent.identityManager.get({ did: managedIdentity.did });
            expect(storedIdentity).to.not.exist;

            // Verify that the Identity WAS stored under the new Identity's tenant.
            storedIdentity = await testAgent.agent.identityManager.get({ did: managedIdentity.did, context: managedIdentity.did });
            expect(storedIdentity).to.exist;
          });

          it('creates Identities under the context of the specified DID', async () => {
            // Create a ManagedDid.
            const managedDid = await testAgent.agent.identityManager.create({
              didMethod : 'key',
              name      : 'Alice',
              kms       : 'local',
              context   : testAgent.agent.agentDid
            });

            // Verify that the Identity WAS stored under the Agent's tenant.
            let storedIdentity = await testAgent.agent.identityManager.get({ did: managedDid.did });
            expect(storedIdentity).to.exist;

            // Verify that the Identity was NOT stored under the new Identity's tenant.
            storedIdentity = await testAgent.agent.identityManager.get({ did: managedDid.did, context: managedDid.did });
            expect(storedIdentity).to.not.exist;
          });

          it('supports creating a new Identity and importing to Agent tenant', async () => {
            // Create a ManagedDid, stored under the new Identity's tenant.
            const managedIdentity = await testAgent.agent.identityManager.create({
              didMethod : 'key',
              name      : 'Alice',
              kms       : 'local'
            });

            // Attempt to import just the Identity (not DID/keys) to the Agent tenant.
            const importedIdentity = await testAgent.agent.identityManager.import({
              context  : testAgent.agent.agentDid,
              identity : managedIdentity,
              kms      : 'local'
            });
            expect(importedIdentity).to.deep.equal(managedIdentity);

            // Verify that the Identity is stored under the Agent's tenant.
            let storedIdentity = await testAgent.agent.identityManager.get({ did: managedIdentity.did });
            expect(storedIdentity).to.exist;

            // Verify that the Identity is also stored under the new Identity's tenant.
            storedIdentity = await testAgent.agent.identityManager.get({ did: managedIdentity.did, context: managedIdentity.did });
            expect(storedIdentity).to.exist;

            // Verify the DID ONLY exists under the new Identity's tenant.
            let storedDidAgent = await testAgent.agent.didManager.get({ didRef: managedIdentity.did });
            let storedDidNewIdentity = await testAgent.agent.didManager.get({ didRef: managedIdentity.did, context: managedIdentity.did });
            expect(storedDidAgent).to.not.exist;
            expect(storedDidNewIdentity).to.exist;
          });
        }
      });

      describe('export()', () => {
        xit('should be implemented');
      });

      describe('import()', () => {
        it('imports Identity, DID and key set', async () => {
          // Create did:key DID with key set to use to attempt import.
          const portableDid = await DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });

          // Create ManagedIdentity to use to attempt import.
          const managedIdentity: ManagedIdentity = {
            did  : portableDid.did,
            name : 'Test'
          };

          // Attempt to import the Identity.
          const importedIdentity = await testAgent.agent.identityManager.import({
            did      : portableDid,
            identity : managedIdentity,
            kms      : 'local'
          });
          expect(importedIdentity).to.deep.equal(managedIdentity);
        });

        it('supports importing Identity without DID', async () => {
          // Define a DID to use for the test.
          const did = 'did:key:z6MkwcqjW8kmk23GVYHRdyfNr4e7eEoKs3MyuGia1TeSd9hk';

          // Create ManagedIdentity to use to attempt import.
          const managedIdentity: ManagedIdentity = { did, name: 'Test' };

          // Attempt to import the Identity.
          const importedIdentity = await testAgent.agent.identityManager.import({
            context  : testAgent.agent.agentDid,
            identity : managedIdentity,
            kms      : 'local'
          });
          expect(importedIdentity).to.deep.equal(managedIdentity);

          // Verify that Identity WAS stored under the Agent's tenant.
          let storedIdentity = await testAgent.agent.identityManager.get({ did: importedIdentity.did });
          expect(storedIdentity).to.exist;
          expect(storedIdentity?.did).to.equal(did);

          // Verify no DID exists matching the specified identifier.
          let storedDid = await testAgent.agent.didManager.get({ didRef: did });
          expect(storedDid).to.not.exist;
        });

        it('supports importing multiple Identities to the same Identity/tenant', async () => {
          // Create and import the first Identity and DID.
          const portableDid1 = await DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });
          const managedIdentity1: ManagedIdentity = { did: portableDid1.did, name: 'Test' };
          const importedIdentity1 = await testAgent.agent.identityManager.import({
            context  : testAgent.agent.agentDid,
            did      : portableDid1,
            identity : managedIdentity1,
            kms      : 'local'
          });

          // Create and import a second DID.
          const portableDid2 = await DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });
          const managedIdentity2: ManagedIdentity = { did: portableDid2.did, name: 'Test' };
          const importedIdentity2 = await testAgent.agent.identityManager.import({
            context  : testAgent.agent.agentDid,
            did      : portableDid2,
            identity : managedIdentity2,
            kms      : 'local'
          });

          // Verify that Identity 1 WAS stored under the Agent's tenant.
          let storedIdentity1 = await testAgent.agent.identityManager.get({ did: importedIdentity1.did });
          expect(storedIdentity1).to.exist;
          expect(storedIdentity1?.did).to.equal(portableDid1.did);

          // Verify that Identity 2 WAS stored under the Agent's tenant.
          let storedIdentity2 = await testAgent.agent.identityManager.get({ did: importedIdentity2.did });
          expect(storedIdentity2).to.exist;
          expect(storedIdentity2?.did).to.equal(portableDid2.did);
        });

        // Tests that should only run for DWN-backed stores that provide multi-tenancy.
        if (agentStoreType === 'dwn') {
          it('imports Identities under the tenant of the new Identity, by default', async () => {
            // Create did:key DID with key set to use to attempt import.
            const portableDid = await DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });

            // Create ManagedIdentity to use to attempt import.
            const managedIdentity: ManagedIdentity = {
              did  : portableDid.did,
              name : 'Test'
            };

            // Attempt to import the Identity.
            const importedIdentity = await testAgent.agent.identityManager.import({
              did      : portableDid,
              identity : managedIdentity,
              kms      : 'local'
            });
            expect(importedIdentity).to.deep.equal(managedIdentity);

            // Verify that the Identity was NOT stored under the Agent's tenant.
            let storedIdentity = await testAgent.agent.identityManager.get({ did: managedIdentity.did });
            expect(storedIdentity).to.not.exist;

            // Verify that the Identity WAS stored under the new Identity's tenant.
            storedIdentity = await testAgent.agent.identityManager.get({ did: managedIdentity.did, context: managedIdentity.did });
            expect(storedIdentity).to.exist;
          });

          it('imports Identities under the context of the specified DID', async () => {
            // Create did:key DID with key set to use to attempt import.
            const portableDid = await DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });

            // Create ManagedIdentity to use to attempt import.
            const managedIdentity: ManagedIdentity = {
              did  : portableDid.did,
              name : 'Test'
            };

            // Attempt to import the Identity.
            const importedIdentity = await testAgent.agent.identityManager.import({
              context  : testAgent.agent.agentDid,
              did      : portableDid,
              identity : managedIdentity,
              kms      : 'local'
            });
            expect(importedIdentity).to.deep.equal(managedIdentity);

            // Verify that the Identity was stored under the Agent's tenant.
            let storedIdentity = await testAgent.agent.identityManager.get({ did: managedIdentity.did });
            expect(storedIdentity).to.exist;

            // Verify that the Identity was NOT stored under the new Identity's tenant.
            storedIdentity = await testAgent.agent.identityManager.get({ did: managedIdentity.did, context: managedIdentity.did });
            expect(storedIdentity).to.not.exist;
          });

          it('throws error if importing Identity without DID if keys for DID not present', async () => {
          // Define a DID to use for the test.
            const did = 'did:key:z6MkwcqjW8kmk23GVYHRdyfNr4e7eEoKs3MyuGia1TeSd9hk';

            // Create ManagedIdentity to use to attempt import.
            const managedIdentity: ManagedIdentity = { did, name: 'Test' };

            // Attempt to import the Identity.
            await expect(
              testAgent.agent.identityManager.import({
                identity : managedIdentity,
                kms      : 'local'
              })
            ).to.eventually.be.rejectedWith(Error, `Signing key not found for author: '${did}'`);
          });
        }
      });

      describe('list()', () => {
        it('should return an array of all identities', async () => {
          // Create three new identities all under the Agent's tenant.
          const managedIdentity1 = await testAgent.agent.identityManager.create({
            didMethod : 'key',
            name      : 'Alice',
            kms       : 'local',
            context   : testAgent.agent.agentDid
          });
          const managedIdentity2 = await testAgent.agent.identityManager.create({
            didMethod : 'key',
            name      : 'Alice',
            kms       : 'local',
            context   : testAgent.agent.agentDid
          });
          const managedIdentity3 = await testAgent.agent.identityManager.create({
            didMethod : 'key',
            name      : 'Alice',
            kms       : 'local',
            context   : testAgent.agent.agentDid
          });

          // List identities and verify the result.
          const storedIdentities = await testAgent.agent.identityManager.list();
          expect(storedIdentities).to.have.length(3);

          const createdIdentities = [managedIdentity1.did, managedIdentity2.did, managedIdentity3.did];
          for (const storedIdentity of storedIdentities) {
            expect(createdIdentities).to.include(storedIdentity.did);
          }
        });

        it('should return an empty array if the store contains no Identities', async () => {
          // List identities and verify the result is empty.
          const storedIdentities = await testAgent.agent.identityManager.list();
          expect(storedIdentities).to.be.empty;
        });
      });
    });
  });
});

describe('IdentityStoreDwn', () => {
  let identityStore: IdentityStoreDwn;
  let testAgent: TestAgent;
  let testManagedDid: ManagedDid;
  let testManagedIdentity: ManagedIdentity;

  before(async () => {
    testAgent = await TestAgent.create();
  });

  beforeEach(async () => {
    identityStore = new IdentityStoreDwn();
    const identityManager = new IdentityManager({ store: identityStore, agent: testAgent });
    testAgent.identityManager = identityManager;

    // Create did:key DID with key set.
    const portableDid = await DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });
    testManagedDid = { ...portableDid, method: 'key' };

    // Import the key set into KeyManager.
    // @ts-expect-error because we're accessing a private method.
    testManagedDid.keySet = await testAgent.didManager.importOrGetKeySet({
      keySet : testManagedDid.keySet,
      kms    : 'memory'
    });

    // Set the alias for each key to the DID document method ID.
    // @ts-expect-error because we're accessing a private method.
    await testAgent.didManager.updateKeySet({
      canonicalId : testManagedDid.canonicalId,
      didDocument : testManagedDid.document,
      keySet      : testManagedDid.keySet
    });

    // Create a ManagedIdentity to use for tests.
    testManagedIdentity = { did: portableDid.did, name: 'Test' };
  });

  afterEach(async () => {
    await testAgent.clearStorage();
  });

  after(async () => {
    await testAgent.closeStorage();
  });

  describe('deleteIdentity()', () => {
    it('should delete Identity and return true if Identity exists', async () => {
      // Import the first Identity and set as the Agent DID.
      await identityStore.importIdentity({
        identity : testManagedIdentity,
        agent    : testAgent
      });
      testAgent.agentDid = testManagedIdentity.did;

      // Test deleting the DID and validate the result.
      const deleteResult = await identityStore.deleteIdentity({ did: testManagedIdentity.did, agent: testAgent });
      expect(deleteResult).to.be.true;

      // Verify the DID is no longer in the store.
      const storedDid = await identityStore.getIdentity({ did: testManagedIdentity.did, agent: testAgent });
      expect(storedDid).to.be.undefined;
    });

    it('should return false if Identity does not exist', async () => {
      // Import the first Identity and set as the Agent DID.
      await identityStore.importIdentity({
        identity : testManagedIdentity,
        agent    : testAgent
      });
      testAgent.agentDid = testManagedIdentity.did;

      // Test deleting the DID.
      const deleteResult = await identityStore.deleteIdentity({ did: 'non-existent', agent: testAgent });

      // Validate the DID was not deleted.
      expect(deleteResult).to.be.false;
    });

    it('throws an error if Agent DID is undefined and no keys exist for specified DID', async () => {
      await expect(
        identityStore.deleteIdentity({ did: 'did:key:z6Mkt3UrUJXwrMzzBwt6XZ91aZYWk2GKvZbSgkZoEGdrRnB5', agent: testAgent })
      ).to.eventually.be.rejectedWith(Error, `Agent property 'agentDid' is undefined and no keys were found for`);
    });
  });

  describe('getIdentity()', () => {
    it('should return an Identity by DID if it exists', async () => {
      // Import the first Identity and set as the Agent DID.
      await identityStore.importIdentity({
        identity : testManagedIdentity,
        agent    : testAgent
      });
      testAgent.agentDid = testManagedIdentity.did;

      // Try to retrieve the Identity from the IdentityManager store to verify it was imported.
      const storedIdentity = await identityStore.getIdentity({ did: testManagedIdentity.did, agent: testAgent });

      // Verify the Identity is in the store.
      if (storedIdentity === undefined) throw new Error('Type guard unexpectedly threw'); // Type guard.
      expect(storedIdentity.did).to.equal(testManagedIdentity.did);
      expect(storedIdentity.name).to.equal(testManagedIdentity.name);
    });

    it('should return undefined when attempting to get a non-existent Identity', async () => {
      // Import the first Identity and set as the Agent DID.
      await identityStore.importIdentity({
        identity : testManagedIdentity,
        agent    : testAgent
      });
      testAgent.agentDid = testManagedIdentity.did;

      // Try to retrieve a non-existent Identity from the IdentityManager store.
      const storedIdentity = await identityStore.getIdentity({ did: 'non-existant', agent: testAgent });

      // Verify the result is undefined.
      expect(storedIdentity).to.be.undefined;
    });

    it('throws an error if Agent DID is undefined and no keys exist for specified DID', async () => {
      await expect(
        identityStore.getIdentity({
          did   : 'did:key:z6MkmRUyE6ywoYV2zL9Nus2YuFchpnTGzPXToZWDbdag6tvB',
          agent : testAgent
        })
      ).to.eventually.be.rejectedWith(Error, `Agent property 'agentDid' is undefined and no keys were found for`);
    });
  });

  describe('importIdentity()', () => {
    it('should import an identity that does not already exist', async () => {
      // Import the first Identity and set as the Agent DID.
      await identityStore.importIdentity({
        identity : testManagedIdentity,
        agent    : testAgent
      });
      testAgent.agentDid = testManagedIdentity.did;

      // Try to retrieve the Identity from the IdentityManager store to verify it was imported.
      const storedIdentity = await identityStore.getIdentity({ did: testManagedIdentity.did, agent: testAgent });

      // Verify the Identity is in the store.
      if (storedIdentity === undefined) throw new Error('Type guard unexpectedly threw'); // Type guard.
      expect(storedIdentity.did).to.equal(testManagedIdentity.did);
      expect(storedIdentity.name).to.equal(testManagedIdentity.name);
    });

    it('throws an error when attempting to import an identity that already exists', async () => {
      // Import the first Identity and set as the Agent DID.
      await identityStore.importIdentity({
        identity : testManagedIdentity,
        agent    : testAgent
      });
      testAgent.agentDid = testManagedIdentity.did;

      // Try to import the same key again.
      await expect(
        identityStore.importIdentity({
          identity : testManagedIdentity,
          agent    : testAgent
        })
      ).to.eventually.be.rejectedWith(Error, 'Identity with DID already exists');
    });

    it('should author multiple imports with the same Agent DID', async () => {
      // Define multiple identities to be added.
      const testIdentity2 = { did: 'did:key:456', name: 'Family' };
      const testIdentity3 = { did: 'did:key:789', name: 'Social' };

      // Import the first Identity and set as the Agent DID.
      await identityStore.importIdentity({
        identity : testManagedIdentity,
        agent    : testAgent
      });

      // Set the Agent's DID to the imported Identity's DID.
      testAgent.agentDid = testManagedIdentity.did;

      // Import the other two DIDs.
      await identityStore.importIdentity({
        identity : testIdentity2,
        agent    : testAgent
      });
      await identityStore.importIdentity({
        identity : testIdentity3,
        agent    : testAgent
      });

      // Get each Identity and verify that all three were written using the same author DID.
      const storedDid1 = await identityStore.getIdentity({ did: testManagedIdentity.did, agent: testAgent });
      const storedDid2 = await identityStore.getIdentity({ did: testIdentity2.did, agent: testAgent });
      const storedDid3 = await identityStore.getIdentity({ did: testIdentity3.did, agent: testAgent });
      if (!(storedDid1 && storedDid2 && storedDid3)) throw new Error('Type guard unexpectedly threw'); // Type guard.
      expect(storedDid1.did).to.equal(testManagedIdentity.did);
      expect(storedDid2.did).to.equal(testIdentity2.did);
      expect(storedDid3.did).to.equal(testIdentity3.did);
    });

    it('throws an error if Agent DID is undefined and no keys exist for imported DID', async () => {
      const testIdentity = { did: 'did:key:z6MkmRUyE6ywoYV2zL9Nus2YuFchpnTGzPXToZWDbdag6tvB', name: 'Test' };
      await expect(
        identityStore.importIdentity({ identity: testIdentity, agent: testAgent })
      ).to.eventually.be.rejectedWith(Error, `Agent property 'agentDid' is undefined and no keys were found for`);
    });
  });

  describe('listIdentities()', () => {
    it('should return an array of all DIDs in the store', async () => {
      // Define multiple identities to be added.
      const testIdentity2 = { did: 'did:key:456', name: 'Family' };
      const testIdentity3 = { did: 'did:key:789', name: 'Social' };

      // Import the first Identity and set as the Agent DID.
      await identityStore.importIdentity({
        identity : testManagedIdentity,
        agent    : testAgent
      });

      // Set the Agent's DID to the imported Identity's DID.
      testAgent.agentDid = testManagedIdentity.did;

      // Import the other two DIDs.
      await identityStore.importIdentity({
        identity : testIdentity2,
        agent    : testAgent
      });
      await identityStore.importIdentity({
        identity : testIdentity3,
        agent    : testAgent
      });

      // List DIDs and verify the result.
      const storedDids = await identityStore.listIdentities({ agent: testAgent });
      expect(storedDids).to.have.length(3);
      const importedDids = [testManagedIdentity.did, testIdentity2.did, testIdentity3.did];
      for (const storedDid of storedDids) {
        expect(importedDids).to.include(storedDid.did);
      }
    });

    it('throws an error if Agent DID is undefined', async () => {
      await expect(
        identityStore.listIdentities({ agent: testAgent })
      ).to.eventually.be.rejectedWith(Error, `Agent property 'agentDid' is undefined`);
    });
  });
});

describe('IdentityStoreMemory', () => {
  let identityStore: IdentityStoreMemory;
  let testAgent: TestAgent;
  let testManagedDid: ManagedDid;
  let testManagedIdentity: ManagedIdentity;

  before(async () => {
    testAgent = await TestAgent.create();
  });

  beforeEach(async () => {
    identityStore = new IdentityStoreMemory();
    const identityManager = new IdentityManager({ store: identityStore, agent: testAgent });
    testAgent.identityManager = identityManager;

    // Create did:key DID with key set.
    const portableDid = await DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });
    testManagedDid = { ...portableDid, method: 'key' };

    // Create a ManagedIdentity to use for tests.
    testManagedIdentity = { did: portableDid.did, name: 'Test' };
  });

  afterEach(async () => {
    await testAgent.clearStorage();
  });

  after(async () => {
    await testAgent.closeStorage();
  });

  describe('deleteIdentity()', () => {
    it('should delete identity and return true if identity exists', async () => {
      // Import the identity.
      await identityStore.importIdentity({ identity: { did: testManagedDid.did, name: 'Test' } });

      // Test deleting the identity and validate the result.
      const deleteResult = await identityStore.deleteIdentity({ did: testManagedDid.did });
      expect(deleteResult).to.be.true;

      // Verify the identity is no longer in the store.
      const storedIdentity = await identityStore.getIdentity({ did: testManagedDid.did });
      expect(storedIdentity).to.be.undefined;
    });

    it('should return false if identity does not exist', async () => {
      // Test deleting the identity.
      const nonExistentId = '1234';
      const deleteResult = await identityStore.deleteIdentity({ did: nonExistentId });

      // Validate the identity was not deleted.
      expect(deleteResult).to.be.false;
    });
  });

  describe('getIdentity()', () => {
    it('should return a identity by DID if it exists', async () => {
      // Import the identity.
      await identityStore.importIdentity({ identity: { did: testManagedDid.did, name: 'Test' } });

      // Test getting the identity.
      const storedIdentity = await identityStore.getIdentity({ did: testManagedDid.did });

      // Verify the identity is in the store.
      if (!storedIdentity) throw Error(); // Type guard.
      expect(testManagedDid.did).to.equal(storedIdentity.did);
    });

    it('should return undefined when attempting to get a non-existent identity', async () => {
      // Test getting the identity.
      const storedIdentity = await identityStore.getIdentity({ did: 'non-existent-identity' });

      // Verify the identity is not in the store.
      expect(storedIdentity).to.be.undefined;
    });
  });

  describe('importIdentity', () => {
    it('should import an identity that does not already exist', async () => {
      // Test importing the identity and validate the result.
      await identityStore.importIdentity({ identity: { did: testManagedDid.did, name: 'Test' } });

      // Verify the identity is present in the identity store.
      const storedIdentity = await identityStore.getIdentity({ did: testManagedDid.did });
      if (!storedIdentity) throw Error(); // Type guard.
      expect(testManagedDid.did).to.equal(storedIdentity.did);
    });

    it('throws an error when attempting to import an identity that already exists', async () => {
      // Import the identity.
      await identityStore.importIdentity({ identity: { did: testManagedDid.did, name: 'Test' } });

      // Set the Agent's DID to the imported Identity's DID.
      testAgent.agentDid = testManagedIdentity.did;

      // Try to import the same Identity again.
      await expect(
        identityStore.importIdentity({ identity: testManagedIdentity })
      ).to.eventually.be.rejectedWith(Error, 'Identity with DID already exists');
    });
  });

  describe('listIdentities', () => {
    it('should return an array of all identities in the store', async () => {
      // Define multiple identities to be added.
      const testIdentities = [
        { did: 'did:key:123', name: 'Career' },
        { did: 'did:key:456', name: 'Family' },
        { did: 'did:key:789', name: 'Social' }
      ];

      // Import the identities into the store.
      for (let identity of testIdentities) {
        await identityStore.importIdentity({ identity });
      }

      // List identities and verify the result.
      const storedIdentities = await identityStore.listIdentities();
      expect(storedIdentities).to.deep.equal(testIdentities);
    });

    it('should return an empty array if the store contains no identities', async () => {
      // List identities and verify the result is empty.
      const storedIdentities = await identityStore.listIdentities();
      expect(storedIdentities).to.be.empty;
    });
  });
});