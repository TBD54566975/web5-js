var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { DidKeyMethod } from '@web5/dids';
import { TestAgent } from './utils/test-agent.js';
import { IdentityManager } from '../src/identity-manager.js';
import { TestManagedAgent } from '../src/test-managed-agent.js';
import { IdentityStoreDwn, IdentityStoreMemory } from '../src/store-managed-identity.js';
chai.use(chaiAsPromised);
describe('IdentityManager', () => {
    describe('get agent', () => {
        it(`returns the 'agent' instance property`, () => __awaiter(void 0, void 0, void 0, function* () {
            // @ts-expect-error because we are only mocking a single property.
            const mockAgent = {
                agentDid: 'did:method:abc123'
            };
            const identityManager = new IdentityManager({ agent: mockAgent });
            const agent = identityManager.agent;
            expect(agent).to.exist;
            expect(agent.agentDid).to.equal('did:method:abc123');
        }));
        it(`throws an error if the 'agent' instance property is undefined`, () => {
            const identityManager = new IdentityManager();
            expect(() => identityManager.agent).to.throw(Error, 'Unable to determine agent execution context');
        });
    });
    const agentStoreTypes = ['dwn', 'memory'];
    agentStoreTypes.forEach((agentStoreType) => {
        describe(`with ${agentStoreType} data stores`, () => {
            let testAgent;
            before(() => __awaiter(void 0, void 0, void 0, function* () {
                testAgent = yield TestManagedAgent.create({
                    agentClass: TestAgent,
                    agentStores: agentStoreType
                });
            }));
            beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
                yield testAgent.clearStorage();
                yield testAgent.createAgentDid();
            }));
            afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
                yield testAgent.clearStorage();
            }));
            after(() => __awaiter(void 0, void 0, void 0, function* () {
                yield testAgent.clearStorage();
                yield testAgent.closeStorage();
            }));
            describe('create()', () => {
                it('creates a ManagedIdentity with new DID and keys', () => __awaiter(void 0, void 0, void 0, function* () {
                    // Create a ManagedIdentity.
                    const managedIdentity = yield testAgent.agent.identityManager.create({
                        didMethod: 'key',
                        name: 'Alice',
                        kms: 'local'
                    });
                    // Verify the ManagedIdentity was created with the expected properties.
                    expect(managedIdentity).to.have.property('did');
                    expect(managedIdentity).to.have.property('name');
                    // Confirm the DID was stored in the DidManager store.
                    const managedDid = yield testAgent.agent.didManager.get({
                        didRef: managedIdentity.did,
                        context: managedIdentity.did
                    });
                    expect(managedDid).to.exist;
                    // Confirm the keys were stored in the KeyManager store.
                    if (managedDid === undefined)
                        throw new Error();
                    const signingKeyId = yield testAgent.agent.didManager.getDefaultSigningKey({
                        did: managedDid.did
                    });
                    if (!signingKeyId)
                        throw new Error('Type guard');
                    const keyPair = yield testAgent.agent.keyManager.getKey({ keyRef: signingKeyId });
                    expect(keyPair).to.exist;
                    expect(keyPair).to.have.property('privateKey');
                    expect(keyPair).to.have.property('publicKey');
                }));
                it('creates a ManagedIdentity using an existing DID and key set', () => __awaiter(void 0, void 0, void 0, function* () {
                    // Create did:key DID with key set to use to attempt import.
                    const portableDid = yield DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });
                    // Create a ManagedIdentity.
                    const managedIdentity = yield testAgent.agent.identityManager.create({
                        did: portableDid,
                        name: 'Alice',
                        kms: 'local'
                    });
                    // Verify the ManagedIdentity was created with the expected properties.
                    expect(managedIdentity).to.have.property('did', portableDid.did);
                    expect(managedIdentity).to.have.property('name');
                    // Confirm the DID was stored in the DidManager store.
                    const managedDid = yield testAgent.agent.didManager.get({
                        didRef: managedIdentity.did,
                        context: managedIdentity.did
                    });
                    expect(managedDid).to.exist;
                    // Confirm the keys were stored in the KeyManager store.
                    if (managedDid === undefined)
                        throw new Error('Type guard unexpectedly threw'); // Type guard.
                    const signingKeyId = yield testAgent.agent.didManager.getDefaultSigningKey({
                        did: managedDid.did
                    });
                    if (!signingKeyId)
                        throw new Error('Type guard');
                    const keyPair = yield testAgent.agent.keyManager.getKey({
                        keyRef: signingKeyId
                    });
                    expect(keyPair).to.exist;
                    expect(keyPair).to.have.property('privateKey');
                    expect(keyPair).to.have.property('publicKey');
                }));
                // Tests that should only run for DWN-backed stores that provide multi-tenancy.
                if (agentStoreType === 'dwn') {
                    it('creates Identities under the tenant of the new Identity, by default', () => __awaiter(void 0, void 0, void 0, function* () {
                        // Create a ManagedDid.
                        const managedIdentity = yield testAgent.agent.identityManager.create({
                            didMethod: 'key',
                            name: 'Alice',
                            kms: 'local'
                        });
                        // Verify that the Identity was NOT stored under the Agent's tenant.
                        let storedIdentity = yield testAgent.agent.identityManager.get({ did: managedIdentity.did });
                        expect(storedIdentity).to.not.exist;
                        // Verify that the Identity WAS stored under the new Identity's tenant.
                        storedIdentity = yield testAgent.agent.identityManager.get({ did: managedIdentity.did, context: managedIdentity.did });
                        expect(storedIdentity).to.exist;
                    }));
                    it('creates Identities under the context of the specified DID', () => __awaiter(void 0, void 0, void 0, function* () {
                        // Create a ManagedDid.
                        const managedDid = yield testAgent.agent.identityManager.create({
                            didMethod: 'key',
                            name: 'Alice',
                            kms: 'local',
                            context: testAgent.agent.agentDid
                        });
                        // Verify that the Identity WAS stored under the Agent's tenant.
                        let storedIdentity = yield testAgent.agent.identityManager.get({ did: managedDid.did });
                        expect(storedIdentity).to.exist;
                        // Verify that the Identity was NOT stored under the new Identity's tenant.
                        storedIdentity = yield testAgent.agent.identityManager.get({ did: managedDid.did, context: managedDid.did });
                        expect(storedIdentity).to.not.exist;
                    }));
                    it('supports creating a new Identity and importing to Agent tenant', () => __awaiter(void 0, void 0, void 0, function* () {
                        // Create a ManagedDid, stored under the new Identity's tenant.
                        const managedIdentity = yield testAgent.agent.identityManager.create({
                            didMethod: 'key',
                            name: 'Alice',
                            kms: 'local'
                        });
                        // Attempt to import just the Identity (not DID/keys) to the Agent tenant.
                        const importedIdentity = yield testAgent.agent.identityManager.import({
                            context: testAgent.agent.agentDid,
                            identity: managedIdentity,
                            kms: 'local'
                        });
                        expect(importedIdentity).to.deep.equal(managedIdentity);
                        // Verify that the Identity is stored under the Agent's tenant.
                        let storedIdentity = yield testAgent.agent.identityManager.get({ did: managedIdentity.did });
                        expect(storedIdentity).to.exist;
                        // Verify that the Identity is also stored under the new Identity's tenant.
                        storedIdentity = yield testAgent.agent.identityManager.get({ did: managedIdentity.did, context: managedIdentity.did });
                        expect(storedIdentity).to.exist;
                        // Verify the DID ONLY exists under the new Identity's tenant.
                        let storedDidAgent = yield testAgent.agent.didManager.get({ didRef: managedIdentity.did });
                        let storedDidNewIdentity = yield testAgent.agent.didManager.get({ didRef: managedIdentity.did, context: managedIdentity.did });
                        expect(storedDidAgent).to.not.exist;
                        expect(storedDidNewIdentity).to.exist;
                    }));
                }
            });
            describe('export()', () => {
                xit('should be implemented');
            });
            describe('import()', () => {
                it('imports Identity, DID and key set', () => __awaiter(void 0, void 0, void 0, function* () {
                    // Create did:key DID with key set to use to attempt import.
                    const portableDid = yield DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });
                    // Create ManagedIdentity to use to attempt import.
                    const managedIdentity = {
                        did: portableDid.did,
                        name: 'Test'
                    };
                    // Attempt to import the Identity.
                    const importedIdentity = yield testAgent.agent.identityManager.import({
                        did: portableDid,
                        identity: managedIdentity,
                        kms: 'local'
                    });
                    expect(importedIdentity).to.deep.equal(managedIdentity);
                }));
                it('supports importing Identity without DID', () => __awaiter(void 0, void 0, void 0, function* () {
                    // Define a DID to use for the test.
                    const did = 'did:key:z6MkwcqjW8kmk23GVYHRdyfNr4e7eEoKs3MyuGia1TeSd9hk';
                    // Create ManagedIdentity to use to attempt import.
                    const managedIdentity = { did, name: 'Test' };
                    // Attempt to import the Identity.
                    const importedIdentity = yield testAgent.agent.identityManager.import({
                        context: testAgent.agent.agentDid,
                        identity: managedIdentity,
                        kms: 'local'
                    });
                    expect(importedIdentity).to.deep.equal(managedIdentity);
                    // Verify that Identity WAS stored under the Agent's tenant.
                    let storedIdentity = yield testAgent.agent.identityManager.get({ did: importedIdentity.did });
                    expect(storedIdentity).to.exist;
                    expect(storedIdentity === null || storedIdentity === void 0 ? void 0 : storedIdentity.did).to.equal(did);
                    // Verify no DID exists matching the specified identifier.
                    let storedDid = yield testAgent.agent.didManager.get({ didRef: did });
                    expect(storedDid).to.not.exist;
                }));
                it('supports importing multiple Identities to the same Identity/tenant', () => __awaiter(void 0, void 0, void 0, function* () {
                    // Create and import the first Identity and DID.
                    const portableDid1 = yield DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });
                    const managedIdentity1 = { did: portableDid1.did, name: 'Test' };
                    const importedIdentity1 = yield testAgent.agent.identityManager.import({
                        context: testAgent.agent.agentDid,
                        did: portableDid1,
                        identity: managedIdentity1,
                        kms: 'local'
                    });
                    // Create and import a second DID.
                    const portableDid2 = yield DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });
                    const managedIdentity2 = { did: portableDid2.did, name: 'Test' };
                    const importedIdentity2 = yield testAgent.agent.identityManager.import({
                        context: testAgent.agent.agentDid,
                        did: portableDid2,
                        identity: managedIdentity2,
                        kms: 'local'
                    });
                    // Verify that Identity 1 WAS stored under the Agent's tenant.
                    let storedIdentity1 = yield testAgent.agent.identityManager.get({ did: importedIdentity1.did });
                    expect(storedIdentity1).to.exist;
                    expect(storedIdentity1 === null || storedIdentity1 === void 0 ? void 0 : storedIdentity1.did).to.equal(portableDid1.did);
                    // Verify that Identity 2 WAS stored under the Agent's tenant.
                    let storedIdentity2 = yield testAgent.agent.identityManager.get({ did: importedIdentity2.did });
                    expect(storedIdentity2).to.exist;
                    expect(storedIdentity2 === null || storedIdentity2 === void 0 ? void 0 : storedIdentity2.did).to.equal(portableDid2.did);
                }));
                // Tests that should only run for DWN-backed stores that provide multi-tenancy.
                if (agentStoreType === 'dwn') {
                    it('imports Identities under the tenant of the new Identity, by default', () => __awaiter(void 0, void 0, void 0, function* () {
                        // Create did:key DID with key set to use to attempt import.
                        const portableDid = yield DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });
                        // Create ManagedIdentity to use to attempt import.
                        const managedIdentity = {
                            did: portableDid.did,
                            name: 'Test'
                        };
                        // Attempt to import the Identity.
                        const importedIdentity = yield testAgent.agent.identityManager.import({
                            did: portableDid,
                            identity: managedIdentity,
                            kms: 'local'
                        });
                        expect(importedIdentity).to.deep.equal(managedIdentity);
                        // Verify that the Identity was NOT stored under the Agent's tenant.
                        let storedIdentity = yield testAgent.agent.identityManager.get({ did: managedIdentity.did });
                        expect(storedIdentity).to.not.exist;
                        // Verify that the Identity WAS stored under the new Identity's tenant.
                        storedIdentity = yield testAgent.agent.identityManager.get({ did: managedIdentity.did, context: managedIdentity.did });
                        expect(storedIdentity).to.exist;
                    }));
                    it('imports Identities under the context of the specified DID', () => __awaiter(void 0, void 0, void 0, function* () {
                        // Create did:key DID with key set to use to attempt import.
                        const portableDid = yield DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });
                        // Create ManagedIdentity to use to attempt import.
                        const managedIdentity = {
                            did: portableDid.did,
                            name: 'Test'
                        };
                        // Attempt to import the Identity.
                        const importedIdentity = yield testAgent.agent.identityManager.import({
                            context: testAgent.agent.agentDid,
                            did: portableDid,
                            identity: managedIdentity,
                            kms: 'local'
                        });
                        expect(importedIdentity).to.deep.equal(managedIdentity);
                        // Verify that the Identity was stored under the Agent's tenant.
                        let storedIdentity = yield testAgent.agent.identityManager.get({ did: managedIdentity.did });
                        expect(storedIdentity).to.exist;
                        // Verify that the Identity was NOT stored under the new Identity's tenant.
                        storedIdentity = yield testAgent.agent.identityManager.get({ did: managedIdentity.did, context: managedIdentity.did });
                        expect(storedIdentity).to.not.exist;
                    }));
                    it('throws error if importing Identity without DID if keys for DID not present', () => __awaiter(void 0, void 0, void 0, function* () {
                        // Define a DID to use for the test.
                        const did = 'did:key:z6MkwcqjW8kmk23GVYHRdyfNr4e7eEoKs3MyuGia1TeSd9hk';
                        // Create ManagedIdentity to use to attempt import.
                        const managedIdentity = { did, name: 'Test' };
                        // Attempt to import the Identity.
                        yield expect(testAgent.agent.identityManager.import({
                            identity: managedIdentity,
                            kms: 'local'
                        })).to.eventually.be.rejectedWith(Error, `Signing key not found for author: '${did}'`);
                    }));
                }
            });
            describe('list()', () => {
                it('should return an array of all identities', () => __awaiter(void 0, void 0, void 0, function* () {
                    // Create three new identities all under the Agent's tenant.
                    const managedIdentity1 = yield testAgent.agent.identityManager.create({
                        didMethod: 'key',
                        name: 'Alice',
                        kms: 'local',
                        context: testAgent.agent.agentDid
                    });
                    const managedIdentity2 = yield testAgent.agent.identityManager.create({
                        didMethod: 'key',
                        name: 'Alice',
                        kms: 'local',
                        context: testAgent.agent.agentDid
                    });
                    const managedIdentity3 = yield testAgent.agent.identityManager.create({
                        didMethod: 'key',
                        name: 'Alice',
                        kms: 'local',
                        context: testAgent.agent.agentDid
                    });
                    // List identities and verify the result.
                    const storedIdentities = yield testAgent.agent.identityManager.list();
                    expect(storedIdentities).to.have.length(3);
                    const createdIdentities = [managedIdentity1.did, managedIdentity2.did, managedIdentity3.did];
                    for (const storedIdentity of storedIdentities) {
                        expect(createdIdentities).to.include(storedIdentity.did);
                    }
                }));
                it('should return an empty array if the store contains no Identities', () => __awaiter(void 0, void 0, void 0, function* () {
                    // List identities and verify the result is empty.
                    const storedIdentities = yield testAgent.agent.identityManager.list();
                    expect(storedIdentities).to.be.empty;
                }));
            });
        });
    });
});
describe('IdentityStoreDwn', () => {
    let identityStore;
    let testAgent;
    let testManagedDid;
    let testManagedIdentity;
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        testAgent = yield TestAgent.create();
    }));
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        identityStore = new IdentityStoreDwn();
        const identityManager = new IdentityManager({ store: identityStore, agent: testAgent });
        testAgent.identityManager = identityManager;
        // Create did:key DID with key set.
        const portableDid = yield DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });
        testManagedDid = Object.assign(Object.assign({}, portableDid), { method: 'key' });
        // Import the key set into KeyManager.
        // @ts-expect-error because we're accessing a private method.
        testManagedDid.keySet = yield testAgent.didManager.importOrGetKeySet({
            keySet: testManagedDid.keySet,
            kms: 'memory'
        });
        // Set the alias for each key to the DID document method ID.
        // @ts-expect-error because we're accessing a private method.
        yield testAgent.didManager.updateKeySet({
            canonicalId: testManagedDid.canonicalId,
            didDocument: testManagedDid.document,
            keySet: testManagedDid.keySet
        });
        // Create a ManagedIdentity to use for tests.
        testManagedIdentity = { did: portableDid.did, name: 'Test' };
    }));
    afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
        yield testAgent.clearStorage();
    }));
    after(() => __awaiter(void 0, void 0, void 0, function* () {
        yield testAgent.closeStorage();
    }));
    describe('deleteIdentity()', () => {
        it('should delete Identity and return true if Identity exists', () => __awaiter(void 0, void 0, void 0, function* () {
            // Import the first Identity and set as the Agent DID.
            yield identityStore.importIdentity({
                identity: testManagedIdentity,
                agent: testAgent
            });
            testAgent.agentDid = testManagedIdentity.did;
            // Test deleting the DID and validate the result.
            const deleteResult = yield identityStore.deleteIdentity({ did: testManagedIdentity.did, agent: testAgent });
            expect(deleteResult).to.be.true;
            // Verify the DID is no longer in the store.
            const storedDid = yield identityStore.getIdentity({ did: testManagedIdentity.did, agent: testAgent });
            expect(storedDid).to.be.undefined;
        }));
        it('should return false if Identity does not exist', () => __awaiter(void 0, void 0, void 0, function* () {
            // Import the first Identity and set as the Agent DID.
            yield identityStore.importIdentity({
                identity: testManagedIdentity,
                agent: testAgent
            });
            testAgent.agentDid = testManagedIdentity.did;
            // Test deleting the DID.
            const deleteResult = yield identityStore.deleteIdentity({ did: 'non-existent', agent: testAgent });
            // Validate the DID was not deleted.
            expect(deleteResult).to.be.false;
        }));
        it('throws an error if Agent DID is undefined and no keys exist for specified DID', () => __awaiter(void 0, void 0, void 0, function* () {
            yield expect(identityStore.deleteIdentity({ did: 'did:key:z6Mkt3UrUJXwrMzzBwt6XZ91aZYWk2GKvZbSgkZoEGdrRnB5', agent: testAgent })).to.eventually.be.rejectedWith(Error, `Agent property 'agentDid' is undefined and no keys were found for`);
        }));
    });
    describe('getIdentity()', () => {
        it('should return an Identity by DID if it exists', () => __awaiter(void 0, void 0, void 0, function* () {
            // Import the first Identity and set as the Agent DID.
            yield identityStore.importIdentity({
                identity: testManagedIdentity,
                agent: testAgent
            });
            testAgent.agentDid = testManagedIdentity.did;
            // Try to retrieve the Identity from the IdentityManager store to verify it was imported.
            const storedIdentity = yield identityStore.getIdentity({ did: testManagedIdentity.did, agent: testAgent });
            // Verify the Identity is in the store.
            if (storedIdentity === undefined)
                throw new Error('Type guard unexpectedly threw'); // Type guard.
            expect(storedIdentity.did).to.equal(testManagedIdentity.did);
            expect(storedIdentity.name).to.equal(testManagedIdentity.name);
        }));
        it('should return undefined when attempting to get a non-existent Identity', () => __awaiter(void 0, void 0, void 0, function* () {
            // Import the first Identity and set as the Agent DID.
            yield identityStore.importIdentity({
                identity: testManagedIdentity,
                agent: testAgent
            });
            testAgent.agentDid = testManagedIdentity.did;
            // Try to retrieve a non-existent Identity from the IdentityManager store.
            const storedIdentity = yield identityStore.getIdentity({ did: 'non-existant', agent: testAgent });
            // Verify the result is undefined.
            expect(storedIdentity).to.be.undefined;
        }));
        it('throws an error if Agent DID is undefined and no keys exist for specified DID', () => __awaiter(void 0, void 0, void 0, function* () {
            yield expect(identityStore.getIdentity({
                did: 'did:key:z6MkmRUyE6ywoYV2zL9Nus2YuFchpnTGzPXToZWDbdag6tvB',
                agent: testAgent
            })).to.eventually.be.rejectedWith(Error, `Agent property 'agentDid' is undefined and no keys were found for`);
        }));
    });
    describe('importIdentity()', () => {
        it('should import an identity that does not already exist', () => __awaiter(void 0, void 0, void 0, function* () {
            // Import the first Identity and set as the Agent DID.
            yield identityStore.importIdentity({
                identity: testManagedIdentity,
                agent: testAgent
            });
            testAgent.agentDid = testManagedIdentity.did;
            // Try to retrieve the Identity from the IdentityManager store to verify it was imported.
            const storedIdentity = yield identityStore.getIdentity({ did: testManagedIdentity.did, agent: testAgent });
            // Verify the Identity is in the store.
            if (storedIdentity === undefined)
                throw new Error('Type guard unexpectedly threw'); // Type guard.
            expect(storedIdentity.did).to.equal(testManagedIdentity.did);
            expect(storedIdentity.name).to.equal(testManagedIdentity.name);
        }));
        it('throws an error when attempting to import an identity that already exists', () => __awaiter(void 0, void 0, void 0, function* () {
            // Import the first Identity and set as the Agent DID.
            yield identityStore.importIdentity({
                identity: testManagedIdentity,
                agent: testAgent
            });
            testAgent.agentDid = testManagedIdentity.did;
            // Try to import the same key again.
            yield expect(identityStore.importIdentity({
                identity: testManagedIdentity,
                agent: testAgent
            })).to.eventually.be.rejectedWith(Error, 'Identity with DID already exists');
        }));
        it('should author multiple imports with the same Agent DID', () => __awaiter(void 0, void 0, void 0, function* () {
            // Define multiple identities to be added.
            const testIdentity2 = { did: 'did:key:456', name: 'Family' };
            const testIdentity3 = { did: 'did:key:789', name: 'Social' };
            // Import the first Identity and set as the Agent DID.
            yield identityStore.importIdentity({
                identity: testManagedIdentity,
                agent: testAgent
            });
            // Set the Agent's DID to the imported Identity's DID.
            testAgent.agentDid = testManagedIdentity.did;
            // Import the other two DIDs.
            yield identityStore.importIdentity({
                identity: testIdentity2,
                agent: testAgent
            });
            yield identityStore.importIdentity({
                identity: testIdentity3,
                agent: testAgent
            });
            // Get each Identity and verify that all three were written using the same author DID.
            const storedDid1 = yield identityStore.getIdentity({ did: testManagedIdentity.did, agent: testAgent });
            const storedDid2 = yield identityStore.getIdentity({ did: testIdentity2.did, agent: testAgent });
            const storedDid3 = yield identityStore.getIdentity({ did: testIdentity3.did, agent: testAgent });
            if (!(storedDid1 && storedDid2 && storedDid3))
                throw new Error('Type guard unexpectedly threw'); // Type guard.
            expect(storedDid1.did).to.equal(testManagedIdentity.did);
            expect(storedDid2.did).to.equal(testIdentity2.did);
            expect(storedDid3.did).to.equal(testIdentity3.did);
        }));
        it('throws an error if Agent DID is undefined and no keys exist for imported DID', () => __awaiter(void 0, void 0, void 0, function* () {
            const testIdentity = { did: 'did:key:z6MkmRUyE6ywoYV2zL9Nus2YuFchpnTGzPXToZWDbdag6tvB', name: 'Test' };
            yield expect(identityStore.importIdentity({ identity: testIdentity, agent: testAgent })).to.eventually.be.rejectedWith(Error, `Agent property 'agentDid' is undefined and no keys were found for`);
        }));
    });
    describe('listIdentities()', () => {
        it('should return an array of all DIDs in the store', () => __awaiter(void 0, void 0, void 0, function* () {
            // Define multiple identities to be added.
            const testIdentity2 = { did: 'did:key:456', name: 'Family' };
            const testIdentity3 = { did: 'did:key:789', name: 'Social' };
            // Import the first Identity and set as the Agent DID.
            yield identityStore.importIdentity({
                identity: testManagedIdentity,
                agent: testAgent
            });
            // Set the Agent's DID to the imported Identity's DID.
            testAgent.agentDid = testManagedIdentity.did;
            // Import the other two DIDs.
            yield identityStore.importIdentity({
                identity: testIdentity2,
                agent: testAgent
            });
            yield identityStore.importIdentity({
                identity: testIdentity3,
                agent: testAgent
            });
            // List DIDs and verify the result.
            const storedDids = yield identityStore.listIdentities({ agent: testAgent });
            expect(storedDids).to.have.length(3);
            const importedDids = [testManagedIdentity.did, testIdentity2.did, testIdentity3.did];
            for (const storedDid of storedDids) {
                expect(importedDids).to.include(storedDid.did);
            }
        }));
        it('throws an error if Agent DID is undefined', () => __awaiter(void 0, void 0, void 0, function* () {
            yield expect(identityStore.listIdentities({ agent: testAgent })).to.eventually.be.rejectedWith(Error, `Agent property 'agentDid' is undefined`);
        }));
    });
});
describe('IdentityStoreMemory', () => {
    let identityStore;
    let testAgent;
    let testManagedDid;
    let testManagedIdentity;
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        testAgent = yield TestAgent.create();
    }));
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        identityStore = new IdentityStoreMemory();
        const identityManager = new IdentityManager({ store: identityStore, agent: testAgent });
        testAgent.identityManager = identityManager;
        // Create did:key DID with key set.
        const portableDid = yield DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });
        testManagedDid = Object.assign(Object.assign({}, portableDid), { method: 'key' });
        // Create a ManagedIdentity to use for tests.
        testManagedIdentity = { did: portableDid.did, name: 'Test' };
    }));
    afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
        yield testAgent.clearStorage();
    }));
    after(() => __awaiter(void 0, void 0, void 0, function* () {
        yield testAgent.closeStorage();
    }));
    describe('deleteIdentity()', () => {
        it('should delete identity and return true if identity exists', () => __awaiter(void 0, void 0, void 0, function* () {
            // Import the identity.
            yield identityStore.importIdentity({ identity: { did: testManagedDid.did, name: 'Test' } });
            // Test deleting the identity and validate the result.
            const deleteResult = yield identityStore.deleteIdentity({ did: testManagedDid.did });
            expect(deleteResult).to.be.true;
            // Verify the identity is no longer in the store.
            const storedIdentity = yield identityStore.getIdentity({ did: testManagedDid.did });
            expect(storedIdentity).to.be.undefined;
        }));
        it('should return false if identity does not exist', () => __awaiter(void 0, void 0, void 0, function* () {
            // Test deleting the identity.
            const nonExistentId = '1234';
            const deleteResult = yield identityStore.deleteIdentity({ did: nonExistentId });
            // Validate the identity was not deleted.
            expect(deleteResult).to.be.false;
        }));
    });
    describe('getIdentity()', () => {
        it('should return a identity by DID if it exists', () => __awaiter(void 0, void 0, void 0, function* () {
            // Import the identity.
            yield identityStore.importIdentity({ identity: { did: testManagedDid.did, name: 'Test' } });
            // Test getting the identity.
            const storedIdentity = yield identityStore.getIdentity({ did: testManagedDid.did });
            // Verify the identity is in the store.
            if (!storedIdentity)
                throw Error(); // Type guard.
            expect(testManagedDid.did).to.equal(storedIdentity.did);
        }));
        it('should return undefined when attempting to get a non-existent identity', () => __awaiter(void 0, void 0, void 0, function* () {
            // Test getting the identity.
            const storedIdentity = yield identityStore.getIdentity({ did: 'non-existent-identity' });
            // Verify the identity is not in the store.
            expect(storedIdentity).to.be.undefined;
        }));
    });
    describe('importIdentity', () => {
        it('should import an identity that does not already exist', () => __awaiter(void 0, void 0, void 0, function* () {
            // Test importing the identity and validate the result.
            yield identityStore.importIdentity({ identity: { did: testManagedDid.did, name: 'Test' } });
            // Verify the identity is present in the identity store.
            const storedIdentity = yield identityStore.getIdentity({ did: testManagedDid.did });
            if (!storedIdentity)
                throw Error(); // Type guard.
            expect(testManagedDid.did).to.equal(storedIdentity.did);
        }));
        it('throws an error when attempting to import an identity that already exists', () => __awaiter(void 0, void 0, void 0, function* () {
            // Import the identity.
            yield identityStore.importIdentity({ identity: { did: testManagedDid.did, name: 'Test' } });
            // Set the Agent's DID to the imported Identity's DID.
            testAgent.agentDid = testManagedIdentity.did;
            // Try to import the same Identity again.
            yield expect(identityStore.importIdentity({ identity: testManagedIdentity })).to.eventually.be.rejectedWith(Error, 'Identity with DID already exists');
        }));
    });
    describe('listIdentities', () => {
        it('should return an array of all identities in the store', () => __awaiter(void 0, void 0, void 0, function* () {
            // Define multiple identities to be added.
            const testIdentities = [
                { did: 'did:key:123', name: 'Career' },
                { did: 'did:key:456', name: 'Family' },
                { did: 'did:key:789', name: 'Social' }
            ];
            // Import the identities into the store.
            for (let identity of testIdentities) {
                yield identityStore.importIdentity({ identity });
            }
            // List identities and verify the result.
            const storedIdentities = yield identityStore.listIdentities();
            expect(storedIdentities).to.deep.equal(testIdentities);
        }));
        it('should return an empty array if the store contains no identities', () => __awaiter(void 0, void 0, void 0, function* () {
            // List identities and verify the result is empty.
            const storedIdentities = yield identityStore.listIdentities();
            expect(storedIdentities).to.be.empty;
        }));
    });
});
//# sourceMappingURL=identity-manager.spec.js.map