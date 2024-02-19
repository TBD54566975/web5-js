import type { Jwk } from '@web5/crypto';

import { expect } from 'chai';
import { DidJwk } from '@web5/dids';
import { Convert } from '@web5/common';

import type { DataStore } from '../src/store-data.js';

import { TestAgent } from './utils/test-agent.js';
import { DwnInterface } from '../src/types/agent-dwn.js';
import { ManagedAgentTestHarness } from '../src/test-harness.js';
import { DwnKeyStore, InMemoryKeyStore } from '../src/store-key.js';
import { AgentCryptoApi } from '../src/crypto-api.js';
import { LocalKeyManager } from '../src/local-key-manager.js';

describe('KeyStore', () => {
  let testHarness: ManagedAgentTestHarness;

  before(async () => {
    testHarness = await ManagedAgentTestHarness.setup({
      agentClass  : TestAgent,
      agentStores : 'memory'
    });
  });

  beforeEach(async () => {
    await testHarness.clearStorage();
    await testHarness.createAgentDid();
  });

  after(async () => {
    await testHarness.clearStorage();
    await testHarness.closeStorage();
  });

  [DwnKeyStore, InMemoryKeyStore].forEach((DataStore) => {
    describe(DataStore.name, () => {
      let keyStore: DataStore<Jwk>;

      beforeEach(async () => {
        keyStore = new DataStore();

        const keyManager = new LocalKeyManager({ agent: testHarness.agent, keyStore });

        const cryptoApi = new AgentCryptoApi({
          agent: testHarness.agent,
          keyManager
        });

        testHarness.agent.crypto = cryptoApi;
      });

      describe('constructor', () => {
        it(`creates a ${DataStore.name}`, () => {
          const store = new DataStore();
          expect(store).to.be.instanceOf(DataStore);
        });
      });

      // describe('delete()', () => {
      //   it('should delete DID and return true if DID exists', async () => {
      //     // Create and import a DID.
      //     let bearerDid = await DidJwk.create();
      //     await testHarness.agent.did.import({ portableDid: await bearerDid.export() });

      //     // Test deleting the DID and validate the result.
      //     const deleteResult = await keyStore.delete({ didUri: bearerDid.uri, tenant: bearerDid.uri, agent: testHarness.agent });
      //     expect(deleteResult).to.be.true;

      //     // Verify the DID is no longer in the store.
      //     const storedDid = await keyStore.get({ didUri: bearerDid.uri, tenant: bearerDid.uri, agent: testHarness.agent });
      //     expect(storedDid).to.be.undefined;
      //   });

      //   it('should return false if DID does not exist', async () => {
      //     // Test deleting a non-existent DID using the context of the only DID with keys.
      //     const deleteResult = await keyStore.delete({ didUri: 'non-existent',  agent: testHarness.agent });

      //     // Validate that a delete could not be carried out.
      //     expect(deleteResult).to.be.false;
      //   });

      //   it('throws an error if no keys exist for specified DID', async function() {
      //     // Skip this test for InMemoryDidStore, as checking for keys to sign DWN messages is not
      //     // relevant given that the store is in-memory.
      //     if (DataStore.name === 'InMemoryDidStore') this.skip();

      //     try {
      //       await keyStore.delete({
      //         didUri : 'did:jwk:eyJrdHkiOiJFQyIsInVzZSI6InNpZyIsImNydiI6InNlY3AyNTZrMSIsImtpZCI6ImkzU1BSQnRKS292SEZzQmFxTTkydGk2eFFDSkxYM0U3WUNld2lIVjJDU2ciLCJ4IjoidmRyYnoyRU96dmJMRFZfLWtMNGVKdDdWSS04VEZaTm1BOVlnV3p2aGg3VSIsInkiOiJWTEZxUU1aUF9Bc3B1Y1hvV1gyLWJHWHBBTzFmUTVMbjE5VjVSQXhyZ3ZVIiwiYWxnIjoiRVMyNTZLIn0',
      //         agent  : testHarness.agent,
      //         tenant : 'did:jwk:eyJrdHkiOiJFQyIsInVzZSI6InNpZyIsImNydiI6InNlY3AyNTZrMSIsImtpZCI6ImkzU1BSQnRKS292SEZzQmFxTTkydGk2eFFDSkxYM0U3WUNld2lIVjJDU2ciLCJ4IjoidmRyYnoyRU96dmJMRFZfLWtMNGVKdDdWSS04VEZaTm1BOVlnV3p2aGg3VSIsInkiOiJWTEZxUU1aUF9Bc3B1Y1hvV1gyLWJHWHBBTzFmUTVMbjE5VjVSQXhyZ3ZVIiwiYWxnIjoiRVMyNTZLIn0'
      //       });
      //       expect.fail('Expected an error to be thrown');

      //     } catch (error: any) {
      //       expect(error.message).to.include('Unable to get signer for author');
      //       expect(error.message).to.include('Key not found');
      //     }
      //   });
      // });

      // describe('get()', () => {
      //   it('should return a DID by identifier if it exists', async () => {
      //     // Create and import a DID.
      //     let bearerDid = await DidJwk.create();
      //     const importedDid = await testHarness.agent.did.import({ portableDid: await bearerDid.export() });

      //     // Test getting the DID.
      //     const storedDid = await keyStore.get({ didUri: bearerDid.uri, tenant: bearerDid.uri, agent: testHarness.agent });

      //     // Verify the DID is in the store.
      //     expect(storedDid).to.exist;
      //     expect(storedDid!.uri).to.equal(importedDid.uri);
      //     expect(storedDid!.document).to.deep.equal(importedDid.document);
      //   });

      //   it('should return undefined when attempting to get a non-existent DID', async () => {
      //     // Test retrieving a non-existent DID using the context of the only DID with keys.
      //     const storedDid = await keyStore.get({ didUri: 'non-existent', agent: testHarness.agent });

      //     // Verify the result is undefined.
      //     expect(storedDid).to.be.undefined;
      //   });

      //   it('throws an error if no keys exist for specified DID', async function() {
      //     // Skip this test for InMemoryDidStore, as checking for keys to sign DWN messages is not
      //     // relevant given that the store is in-memory.
      //     if (DataStore.name === 'InMemoryDidStore') this.skip();

      //     try {
      //       await keyStore.get({
      //         didUri : 'did:jwk:eyJrdHkiOiJPS1AiLCJjcnYiOiJFZDI1NTE5IiwieCI6IjNFQmFfRUxvczJhbHZMb2pxSVZjcmJLcGlyVlhqNmNqVkQ1djJWaHdMejgifQ',
      //         tenant : 'did:jwk:eyJrdHkiOiJPS1AiLCJjcnYiOiJFZDI1NTE5IiwieCI6IjNFQmFfRUxvczJhbHZMb2pxSVZjcmJLcGlyVlhqNmNqVkQ1djJWaHdMejgifQ',
      //         agent  : testHarness.agent
      //       });
      //       expect.fail('Expected an error to be thrown');

      //     } catch (error: any) {
      //       expect(error.message).to.include('Unable to get signer for author');
      //       expect(error.message).to.include('Key not found');
      //     }
      //   });
      // });

      // describe('list()', () => {
      //   it('should return an array of all DIDs in the store', async () => {
      //     // Generate three did:jwk DIDs.
      //     const bearerDid1 = await DidJwk.create();
      //     const bearerDid2 = await DidJwk.create();
      //     const bearerDid3 = await DidJwk.create();

      //     // Import all of the DIDs under the Agent's store.
      //     await keyStore.set({ didUri: bearerDid1.uri, value: await bearerDid1.export(), agent: testHarness.agent });
      //     await keyStore.set({ didUri: bearerDid2.uri, value: await bearerDid2.export(), agent: testHarness.agent });
      //     await keyStore.set({ didUri: bearerDid3.uri, value: await bearerDid3.export(), agent: testHarness.agent });

      //     // List DIDs and verify the result.
      //     const storedDids = await keyStore.list({ agent: testHarness.agent });
      //     expect(storedDids).to.have.length(3);
      //     const importedDids = [bearerDid1.uri, bearerDid2.uri, bearerDid3.uri];
      //     for (const storedDid of storedDids) {
      //       expect(importedDids).to.include(storedDid.uri);
      //     }
      //   });

      //   it('uses the context, if specified', async () => {
      //     // Generate a new DID to author all of the writes to the store.
      //     const did = await DidJwk.create();
      //     const authorDid = await did.export();

      //     // Import the DID's private key material into the Agent's key manager.
      //     await testHarness.agent.crypto.importKey({ key: authorDid.privateKeys![0] });

      //     // Generate three did:jwk DIDs.
      //     const bearerDid1 = await DidJwk.create();
      //     const bearerDid2 = await DidJwk.create();
      //     const bearerDid3 = await DidJwk.create();

      //     // Import all of the DIDs under the custom author context.
      //     await keyStore.set({ didUri: bearerDid1.uri, value: await bearerDid1.export(), tenant: authorDid.uri, agent: testHarness.agent });
      //     await keyStore.set({ didUri: bearerDid2.uri, value: await bearerDid2.export(), tenant: authorDid.uri, agent: testHarness.agent });
      //     await keyStore.set({ didUri: bearerDid3.uri, value: await bearerDid3.export(), tenant: authorDid.uri, agent: testHarness.agent });

      //     // List DIDs and verify the result.
      //     const storedDids = await keyStore.list({ tenant: authorDid.uri, agent: testHarness.agent });
      //     expect(storedDids).to.have.length(3);
      //     const importedDids = [bearerDid1.uri, bearerDid2.uri, bearerDid3.uri];
      //     for (const storedDid of storedDids) {
      //       expect(importedDids).to.include(storedDid.uri);
      //     }
      //   });

      //   it('returns empty array if no DIDs are present in the store', async function() {
      //     const storedDids = await keyStore.list({ agent: testHarness.agent });
      //     expect(storedDids).to.have.length(0);
      //   });

      //   it('throws an error if the DID records exceed the DWN maximum data size for query results', async function() {
      //     // Skip this test for InMemoryDidStore, as the in-memory store returns all records
      //     // regardless of the size of the data.
      //     if (DataStore.name === 'InMemoryDidStore') this.skip();

      //     const didBytes = Convert.string(new Array(102400 + 1).join('0')).toUint8Array();

      //     // Store the DID in the DWN.
      //     const response = await testHarness.agent.dwn.processRequest({
      //       author        : testHarness.agent.agentDid.uri,
      //       target        : testHarness.agent.agentDid.uri,
      //       messageType   : DwnInterface.RecordsWrite,
      //       messageParams : {
      //         dataFormat : 'application/json',
      //         schema     : 'https://identity.foundation/schemas/web5/portable-did'
      //       },
      //       dataStream: new Blob([didBytes], { type: 'application/json' })
      //     });

      //     expect(response.reply.status.code).to.equal(202);

      //     try {
      //       await keyStore.list({ agent: testHarness.agent });
      //       expect.fail('Expected an error to be thrown');

      //     } catch (error: any) {
      //       expect(error.message).to.include(`Expected 'encodedData' to be present in the DWN query result entry`);
      //     }
      //   });
      // });

      // describe('set()', () => {
      //   it('stores a DID', async () => {
      //     // Generate a new DID.
      //     let bearerDid = await DidJwk.create();

      //     // Export the DID including its private key material.
      //     const portableDid = await bearerDid.export();

      //     // Import the DID's private key material into the Agent's key manager.
      //     await testHarness.agent.crypto.importKey({ key: portableDid.privateKeys![0] });

      //     // Store the DID in the store.
      //     await keyStore.set({ didUri: portableDid.uri, value: portableDid, agent: testHarness.agent });

      //     // Try to retrieve the DID from the DidManager store to verify it was imported.
      //     const storedDid = await keyStore.get({ didUri: portableDid.uri, agent: testHarness.agent });

      //     // Verify the DID in the store matches the DID that was imported.
      //     expect(storedDid!.uri).to.equal(bearerDid.uri);
      //     expect(storedDid!.document).to.deep.equal(bearerDid.document);
      //   });

      //   it('authors multiple entries in the store with the Agent DID', async () => {
      //     // Create two did:jwk DIDs to test import.
      //     let bearerDid1 = await DidJwk.create();
      //     let bearerDid2 = await DidJwk.create();

      //     // Import the two DIDs.
      //     await keyStore.set({ didUri: bearerDid1.uri, value: await bearerDid1.export(), agent: testHarness.agent });
      //     await keyStore.set({ didUri: bearerDid2.uri, value: await bearerDid2.export(), agent: testHarness.agent });

      //     // Get each DID and verify that they were written under the Agent's DID tenant.
      //     const storedDid2 = await keyStore.get({ didUri: bearerDid1.uri, agent: testHarness.agent });
      //     const storedDid3 = await keyStore.get({ didUri: bearerDid2.uri, agent: testHarness.agent });

      //     expect(storedDid2!.uri).to.equal(bearerDid1.uri);
      //     expect(storedDid3!.uri).to.equal(bearerDid2.uri);
      //   });

      //   it('uses the context, if specified', async () => {
      //     // Generate a new DID to author writes to the store.
      //     const did = await DidJwk.create();
      //     const authorDid = await did.export();

      //     // Import the DID's private key material into the Agent's key manager.
      //     await testHarness.agent.crypto.importKey({ key: authorDid.privateKeys![0] });

      //     // Generate a DID and import it under the custom author context.
      //     const bearerDid = await DidJwk.create();
      //     await keyStore.set({ didUri: bearerDid.uri, value: await bearerDid.export(), tenant: authorDid.uri, agent: testHarness.agent });

      //     // Verify the DID was written under the custom author context.
      //     let storedDid = await keyStore.get({ didUri: bearerDid.uri, tenant: authorDid.uri, agent: testHarness.agent });
      //     expect(storedDid!.uri).to.equal(bearerDid.uri);

      //     // Verify the DID was not written under the Agent's DID tenant.
      //     storedDid = await keyStore.get({ didUri: bearerDid.uri, agent: testHarness.agent });
      //     expect(storedDid).to.be.undefined;
      //   });

      //   it('throws an error when attempting to import a DID that already exists', async () => {
      //     // Generate a new DID.
      //     let bearerDid = await DidJwk.create();

      //     // Export the DID including its private key material.
      //     const portableDid = await bearerDid.export();

      //     // Import the DID's private key material into the Agent's key manager.
      //     await testHarness.agent.crypto.importKey({ key: portableDid.privateKeys![0] });

      //     // Store the DID in the store.
      //     await keyStore.set({ didUri: portableDid.uri, value: portableDid, agent: testHarness.agent });

      //     // Try to import the same key again.
      //     try {
      //       await keyStore.set({ didUri: portableDid.uri, value: portableDid, agent: testHarness.agent });
      //       expect.fail('Expected an error to be thrown');

      //     } catch (error: any) {
      //       expect(error.message).to.include('Import failed due to duplicate DID');
      //     }
      //   });

      //   it('throws an error if no keys exist for specified DID', async function() {
      //     // Skip this test for InMemoryDidStore, as checking for keys to sign DWN messages is not
      //     // relevant given that the store is in-memory.
      //     if (DataStore.name === 'InMemoryDidStore') this.skip();

      //     // Generate a new DID.
      //     let bearerDid = await DidJwk.create();

      //     // Export the DID including its private key material.
      //     const portableDid = await bearerDid.export();

      //     try {
      //       await keyStore.set({
      //         didUri : portableDid.uri,
      //         value  : portableDid,
      //         tenant : portableDid.uri,
      //         agent  : testHarness.agent });
      //       expect.fail('Expected an error to be thrown');

      //     } catch (error: any) {
      //       expect(error.message).to.include('Unable to get signer for author');
      //       expect(error.message).to.include('Key not found');
      //     }
      //   });
      // });
    });
  });
});