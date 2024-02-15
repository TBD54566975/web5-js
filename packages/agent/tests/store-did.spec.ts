import { expect } from 'chai';
import { Convert } from '@web5/common';
import { DidJwk, PortableDid } from '@web5/dids';

import type { DidStore } from '../src/types/did.js';

import { AgentDidApi } from '../src/did-api.js';
import { TestAgent } from './utils/test-agent.js';
import { DwnInterface } from '../src/types/agent-dwn.js';
import { ManagedAgentTestHarness } from '../src/test-harness.js';
import { DwnDidStore, InMemoryDidStore } from '../src/store-did.js';

describe('DidStore', () => {
  let testHarness: ManagedAgentTestHarness;

  before(async () => {
    testHarness = await ManagedAgentTestHarness.setup({
      agentClass  : TestAgent,
      agentStores : 'memory'
    });
  });

  beforeEach(async () => {
    await testHarness.clearStorage();
  });

  after(async () => {
    await testHarness.clearStorage();
    await testHarness.closeStorage();
  });

  [DwnDidStore, InMemoryDidStore].forEach((DidStore) => {
    describe(DidStore.name, () => {
      let didStore: DidStore<PortableDid>;

      beforeEach(async () => {
        didStore = new DidStore();

        const didApi = new AgentDidApi({
          didMethods    : [DidJwk],
          agent         : testHarness.agent,
          resolverCache : testHarness.didResolverCache,
          store         : didStore
        });

        testHarness.agent.did = didApi;
      });

      describe('constructor', () => {
        it(`creates a ${DidStore.name}`, () => {
          const store = new DidStore();
          expect(store).to.be.instanceOf(DidStore);
        });
      });

      describe('delete()', () => {
        it('should delete DID and return true if DID exists', async () => {
          // Create and import a DID.
          let bearerDid = await DidJwk.create();
          await testHarness.agent.did.import({ portableDid: await bearerDid.export() });

          // Test deleting the DID and validate the result.
          const deleteResult = await didStore.delete({ didUri: bearerDid.uri, agent: testHarness.agent });
          expect(deleteResult).to.be.true;

          // Verify the DID is no longer in the store.
          const storedDid = await didStore.get({ didUri: bearerDid.uri, agent: testHarness.agent });
          expect(storedDid).to.be.undefined;
        });

        it('should return false if DID does not exist', async () => {
          // If the store being tested is DWN-backed, generate a DID for the Agent so that keys
          // will exist to sign DWN messages.
          if (DidStore.name === 'DwnDidStore') await testHarness.createAgentDid();

          // Test deleting a non-existent DID using the context of the only DID with keys.
          const deleteResult = await didStore.delete({ didUri: 'non-existent',  agent: testHarness.agent });

          // Validate that a delete could not be carried out.
          expect(deleteResult).to.be.false;
        });

        it('throws an error if Agent DID is undefined and no keys exist for specified DID', async function() {
          // Skip this test for InMemoryDidStore, as checking for keys to sign DWN messages is not
          // relevant given that the store is in-memory.
          if (DidStore.name === 'InMemoryDidStore') this.skip();

          try {
            await didStore.delete({
              didUri : 'did:jwk:eyJrdHkiOiJFQyIsInVzZSI6InNpZyIsImNydiI6InNlY3AyNTZrMSIsImtpZCI6ImkzU1BSQnRKS292SEZzQmFxTTkydGk2eFFDSkxYM0U3WUNld2lIVjJDU2ciLCJ4IjoidmRyYnoyRU96dmJMRFZfLWtMNGVKdDdWSS04VEZaTm1BOVlnV3p2aGg3VSIsInkiOiJWTEZxUU1aUF9Bc3B1Y1hvV1gyLWJHWHBBTzFmUTVMbjE5VjVSQXhyZ3ZVIiwiYWxnIjoiRVMyNTZLIn0',
              agent  : testHarness.agent
            });
            expect.fail('Expected an error to be thrown');

          } catch (error: any) {
            expect(error.message).to.include('Unable to get signer for author');
            expect(error.message).to.include('Key not found');
          }
        });
      });

      describe('get()', () => {
        it('should return a DID by identifier if it exists', async () => {
          // Create and import a DID.
          let bearerDid = await DidJwk.create();
          const importedDid = await testHarness.agent.did.import({ portableDid: await bearerDid.export() });

          // Test getting the DID.
          const storedDid = await didStore.get({ didUri: bearerDid.uri, agent: testHarness.agent });

          // Verify the DID is in the store.
          expect(storedDid).to.exist;
          expect(storedDid!.uri).to.equal(importedDid.uri);
          expect(storedDid!.document).to.deep.equal(importedDid.document);
        });

        it('should return undefined when attempting to get a non-existent DID', async () => {
          // If the store being tested is DWN-backed, generate a DID for the Agent so that keys
          // will exist to sign DWN messages.
          if (DidStore.name === 'DwnDidStore') await testHarness.createAgentDid();

          // Test retrieving a non-existent DID using the context of the only DID with keys.
          const storedDid = await didStore.get({ didUri: 'non-existent', agent: testHarness.agent });

          // Verify the result is undefined.
          expect(storedDid).to.be.undefined;
        });

        it('throws an error if Agent DID is undefined and no keys exist for specified DID', async function() {
          // Skip this test for InMemoryDidStore, as checking for keys to sign DWN messages is not
          // relevant given that the store is in-memory.
          if (DidStore.name === 'InMemoryDidStore') this.skip();

          try {
            await didStore.get({
              didUri : 'did:jwk:eyJrdHkiOiJFQyIsInVzZSI6InNpZyIsImNydiI6InNlY3AyNTZrMSIsImtpZCI6ImkzU1BSQnRKS292SEZzQmFxTTkydGk2eFFDSkxYM0U3WUNld2lIVjJDU2ciLCJ4IjoidmRyYnoyRU96dmJMRFZfLWtMNGVKdDdWSS04VEZaTm1BOVlnV3p2aGg3VSIsInkiOiJWTEZxUU1aUF9Bc3B1Y1hvV1gyLWJHWHBBTzFmUTVMbjE5VjVSQXhyZ3ZVIiwiYWxnIjoiRVMyNTZLIn0',
              agent  : testHarness.agent
            });
            expect.fail('Expected an error to be thrown');

          } catch (error: any) {
            expect(error.message).to.include('Unable to get signer for author');
            expect(error.message).to.include('Key not found');
          }
        });
      });

      describe('list()', () => {
        it('should return an array of all DIDs in the store', async () => {
          await testHarness.createAgentDid();

          // Generate three did:jwk DIDs.
          const bearerDid1 = await DidJwk.create();
          const bearerDid2 = await DidJwk.create();
          const bearerDid3 = await DidJwk.create();

          // Import all of the DIDs under the Agent's store.
          await didStore.set({ didUri: bearerDid1.uri, value: await bearerDid1.export(), agent: testHarness.agent });
          await didStore.set({ didUri: bearerDid2.uri, value: await bearerDid2.export(), agent: testHarness.agent });
          await didStore.set({ didUri: bearerDid3.uri, value: await bearerDid3.export(), agent: testHarness.agent });

          // List DIDs and verify the result.
          const storedDids = await didStore.list({ agent: testHarness.agent });
          expect(storedDids).to.have.length(3);
          const importedDids = [bearerDid1.uri, bearerDid2.uri, bearerDid3.uri];
          for (const storedDid of storedDids) {
            expect(importedDids).to.include(storedDid.uri);
          }
        });

        it('uses the context, if specified', async () => {
          // Generate a new DID to author all of the writes to the store.
          const did = await DidJwk.create();
          const authorDid = await did.export();

          // Import the DID's private key material into the Agent's key manager.
          await testHarness.agent.crypto.importKey({ key: authorDid.privateKeys![0] });

          // Generate three did:jwk DIDs.
          const bearerDid1 = await DidJwk.create();
          const bearerDid2 = await DidJwk.create();
          const bearerDid3 = await DidJwk.create();

          // Import all of the DIDs under the custom author context.
          await didStore.set({ didUri: bearerDid1.uri, value: await bearerDid1.export(), context: authorDid.uri, agent: testHarness.agent });
          await didStore.set({ didUri: bearerDid2.uri, value: await bearerDid2.export(), context: authorDid.uri, agent: testHarness.agent });
          await didStore.set({ didUri: bearerDid3.uri, value: await bearerDid3.export(), context: authorDid.uri, agent: testHarness.agent });

          // List DIDs and verify the result.
          const storedDids = await didStore.list({ context: authorDid.uri, agent: testHarness.agent });
          expect(storedDids).to.have.length(3);
          const importedDids = [bearerDid1.uri, bearerDid2.uri, bearerDid3.uri];
          for (const storedDid of storedDids) {
            expect(importedDids).to.include(storedDid.uri);
          }
        });

        it('throws an error if Agent DID and context are undefined', async function() {
          try {
            await didStore.list({ agent: testHarness.agent });
            expect.fail('Expected an error to be thrown');

          } catch (error: any) {
            expect(error.message).to.include('Failed to determine author');
          }
        });

        it('throws an error if the DID records exceed the DWN maximum data size for query results', async function() {
          // Skip this test for InMemoryDidStore, as the in-memory store returns all records
          // regardless of the size of the data.
          if (DidStore.name === 'InMemoryDidStore') this.skip();

          await testHarness.createAgentDid();

          const didBytes = Convert.string(new Array(102400 + 1).join('0')).toUint8Array();

          // Store the DID in the DWN.
          const response = await testHarness.agent.dwn.processRequest({
            author        : testHarness.agent.agentDid!.uri,
            target        : testHarness.agent.agentDid!.uri,
            messageType   : DwnInterface.RecordsWrite,
            messageParams : {
              dataFormat : 'application/json',
              schema     : 'https://identity.foundation/schemas/web5/portable-did'
            },
            dataStream: new Blob([didBytes], { type: 'application/json' })
          });

          expect(response.reply.status.code).to.equal(202);

          try {
            await didStore.list({ agent: testHarness.agent });
            expect.fail('Expected an error to be thrown');

          } catch (error: any) {
            expect(error.message).to.include(`Expected 'encodedData' to be present in the DWN query result entry`);
          }
        });
      });

      describe('set()', () => {
        it('stores a DID', async () => {
          // Generate a new DID.
          let bearerDid = await DidJwk.create();

          // Export the DID including its private key material.
          const portableDid = await bearerDid.export();

          // Import the DID's private key material into the Agent's key manager.
          await testHarness.agent.crypto.importKey({ key: portableDid.privateKeys![0] });

          // Store the DID in the store.
          await didStore.set({ didUri: portableDid.uri, value: portableDid, agent: testHarness.agent });

          // Try to retrieve the DID from the DidManager store to verify it was imported.
          const storedDid = await didStore.get({ didUri: portableDid.uri, agent: testHarness.agent });

          // Verify the DID in the store matches the DID that was imported.
          expect(storedDid!.uri).to.equal(bearerDid.uri);
          expect(storedDid!.document).to.deep.equal(bearerDid.document);
        });

        it('authors multiple entries in the store with the Agent DID', async () => {
          // Create and import the Agent DID which will be used to author all writes to the store.
          await testHarness.createAgentDid();

          // Create three did:jwk DIDs to test import.
          let bearerDid1 = await DidJwk.create();
          let bearerDid2 = await DidJwk.create();

          // Import the two DIDs.
          await didStore.set({ didUri: bearerDid1.uri, value: await bearerDid1.export(), agent: testHarness.agent });
          await didStore.set({ didUri: bearerDid2.uri, value: await bearerDid2.export(), agent: testHarness.agent });

          // Get each DID and verify that they were written under the Agent's DID tenant.
          const storedDid2 = await didStore.get({ didUri: bearerDid1.uri, agent: testHarness.agent });
          const storedDid3 = await didStore.get({ didUri: bearerDid2.uri, agent: testHarness.agent });

          expect(storedDid2!.uri).to.equal(bearerDid1.uri);
          expect(storedDid3!.uri).to.equal(bearerDid2.uri);
        });

        it('uses the context, if specified', async () => {
          // Generate a DID for the Agent so that we have another DID Store tenant to check.
          await testHarness.createAgentDid();

          // Generate a new DID to author writes to the store.
          const did = await DidJwk.create();
          const authorDid = await did.export();

          // Import the DID's private key material into the Agent's key manager.
          await testHarness.agent.crypto.importKey({ key: authorDid.privateKeys![0] });

          // Generate a DID and import it under the custom author context.
          const bearerDid = await DidJwk.create();
          await didStore.set({ didUri: bearerDid.uri, value: await bearerDid.export(), context: authorDid.uri, agent: testHarness.agent });

          // Verify the DID was written under the custom author context.
          let storedDid = await didStore.get({ didUri: bearerDid.uri, context: authorDid.uri, agent: testHarness.agent });
          expect(storedDid!.uri).to.equal(bearerDid.uri);

          // Verify the DID was not written under the Agent's DID tenant.
          storedDid = await didStore.get({ didUri: bearerDid.uri, agent: testHarness.agent });
          expect(storedDid).to.be.undefined;
        });

        it('throws an error when attempting to import a DID that already exists', async () => {
          // Generate a new DID.
          let bearerDid = await DidJwk.create();

          // Export the DID including its private key material.
          const portableDid = await bearerDid.export();

          // Import the DID's private key material into the Agent's key manager.
          await testHarness.agent.crypto.importKey({ key: portableDid.privateKeys![0] });

          // Store the DID in the store.
          await didStore.set({ didUri: portableDid.uri, value: portableDid, agent: testHarness.agent });

          // Try to import the same key again.
          try {
            await didStore.set({ didUri: portableDid.uri, value: portableDid, agent: testHarness.agent });
            expect.fail('Expected an error to be thrown');

          } catch (error: any) {
            expect(error.message).to.include('Import failed due to duplicate DID');
          }
        });

        it('throws an error if Agent DID is undefined and no keys exist for specified DID', async function() {
          // Skip this test for InMemoryDidStore, as checking for keys to sign DWN messages is not
          // relevant given that the store is in-memory.
          if (DidStore.name === 'InMemoryDidStore') this.skip();

          // Generate a new DID.
          let bearerDid = await DidJwk.create();

          // Export the DID including its private key material.
          const portableDid = await bearerDid.export();

          try {
            await didStore.set({ didUri: portableDid.uri, value: portableDid, agent: testHarness.agent });
            expect.fail('Expected an error to be thrown');

          } catch (error: any) {
            expect(error.message).to.include('Unable to get signer for author');
            expect(error.message).to.include('Key not found');
          }
        });
      });
    });
  });
});