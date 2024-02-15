import { expect } from 'chai';

import type { IdentityStore } from '../src/types/identity.js';

import { AgentIdentityApi } from '../src/identity-api.js';
import { TestAgent } from './utils/test-agent.js';
import { ManagedAgentTestHarness } from '../src/test-harness.js';
import { DwnIdentityStore, InMemoryIdentityStore } from '../src/store-identity.js';
import { DidJwk } from '@web5/dids';
import { Convert } from '@web5/common';
import { DwnInterface } from '../src/types/agent-dwn.js';

describe('IdentityStore', () => {
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

  [DwnIdentityStore, InMemoryIdentityStore].forEach((IdentityStore) => {
    describe(IdentityStore.name, () => {
      let identityStore: IdentityStore;

      beforeEach(async () => {
        identityStore = new IdentityStore();

        const identityApi = new AgentIdentityApi({
          agent : testHarness.agent,
          store : identityStore
        });

        testHarness.agent.identity = identityApi;
      });

      describe('constructor', () => {
        it(`creates a ${IdentityStore.name}`, () => {
          const store = new IdentityStore();
          expect(store).to.be.instanceOf(IdentityStore);
        });
      });

      describe('delete()', () => {
        it('should delete Identity and return true if Identity exists', async () => {
          // Create an Identity.
          const identity = await testHarness.agent.identity.create({
            didMethod : 'jwk',
            metadata  : { name: 'Test Identity' }
          });

          // Test deleting the Identity and validate the result.
          const deleteResult = await identityStore.delete({ didUri: identity.did.uri, agent: testHarness.agent });
          expect(deleteResult).to.be.true;

          // Verify the Identity is no longer in the store.
          const storedIdentity = await identityStore.get({ didUri: identity.did.uri, agent: testHarness.agent });
          expect(storedIdentity).to.be.undefined;
        });

        it('should return false if Identity does not exist', async () => {
          // If the store being tested is DWN-backed, generate a DID for the Agent so that keys
          // will exist to sign DWN messages.
          if (IdentityStore.name === 'DwnIdentityStore') await testHarness.createAgentDid();

          // Test deleting a non-existent Identity using the context of the only DID with keys.
          const deleteResult = await identityStore.delete({ didUri: 'non-existent',  agent: testHarness.agent });

          // Validate that a delete could not be carried out.
          expect(deleteResult).to.be.false;
        });

        it('throws an error if Agent DID is undefined and no keys exist for specified DID', async function() {
          // Skip this test for InMemoryIdentityStore, as checking for keys to sign DWN messages is not
          // relevant given that the store is in-memory.
          if (IdentityStore.name === 'InMemoryIdentityStore') this.skip();

          try {
            await identityStore.delete({
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
          // Create an Identity.
          const identity = await testHarness.agent.identity.create({
            didMethod : 'jwk',
            metadata  : { name: 'Test Identity' }
          });

          // Test getting the Identity.
          const storedIdentity = await identityStore.get({ didUri: identity.did.uri, agent: testHarness.agent });

          // Verify the Identity is in the store.
          expect(storedIdentity).to.exist;
          expect(storedIdentity!.did.uri).to.equal(identity.did.uri);
          expect(storedIdentity!.metadata).to.deep.equal(identity.metadata);
        });

        it('should return undefined when attempting to get a non-existent DID', async () => {
          // If the store being tested is DWN-backed, generate a DID for the Agent so that keys
          // will exist to sign DWN messages.
          if (IdentityStore.name === 'DwnIdentityStore') await testHarness.createAgentDid();

          // Test retrieving a non-existent Identity using the context of the only DID with keys.
          const storedIdentity = await identityStore.get({ didUri: 'non-existent', agent: testHarness.agent });

          // Verify the result is undefined.
          expect(storedIdentity).to.be.undefined;
        });

        it('throws an error if Agent DID is undefined and no keys exist for specified DID', async function() {
          // Skip this test for InMemoryIdentityStore, as checking for keys to sign DWN messages is not
          // relevant given that the store is in-memory.
          if (IdentityStore.name === 'InMemoryIdentityStore') this.skip();

          try {
            await identityStore.get({
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
        it('should return an array of all Identities in the store', async () => {
          await testHarness.createAgentDid();

          // Generate three new Identities that are stored under the Agent's context.
          const bearerIdentity1 = await testHarness.agent.identity.create({ didMethod: 'jwk', metadata: { name: 'Test Identity 1' }, context: testHarness.agent.agentDid!.uri });
          const bearerIdentity2 = await testHarness.agent.identity.create({ didMethod: 'jwk', metadata: { name: 'Test Identity 2' }, context: testHarness.agent.agentDid!.uri });
          const bearerIdentity3 = await testHarness.agent.identity.create({ didMethod: 'jwk', metadata: { name: 'Test Identity 3' }, context: testHarness.agent.agentDid!.uri });

          // List Identities and verify the result.
          const storedDids = await identityStore.list({ agent: testHarness.agent });
          expect(storedDids).to.have.length(3);
          const importedDids = [bearerIdentity1.did.uri, bearerIdentity2.did.uri, bearerIdentity3.did.uri];
          for (const storedIdentity of storedDids) {
            expect(importedDids).to.include(storedIdentity.did.uri);
          }
        });

        it('returns an empty array if there are no Identities in the store', async () => {
          await testHarness.createAgentDid();

          // List Identities and verify there are no results.
          const storedDids = await identityStore.list({ agent: testHarness.agent });
          expect(storedDids).to.have.length(0);
        });

        it('uses the context, if specified', async () => {
          // Generate a new DID to author all of the writes to the store.
          const did = await DidJwk.create();
          const authorDid = await did.export();

          // Import the DID's private key material into the Agent's key manager.
          await testHarness.agent.crypto.importKey({ key: authorDid.privateKeys![0] });

          // Generate three new Identities that are stored under the custom author context.
          const bearerIdentity1 = await testHarness.agent.identity.create({ didMethod: 'jwk', metadata: { name: 'Test Identity 1' }, context: authorDid.uri });
          const bearerIdentity2 = await testHarness.agent.identity.create({ didMethod: 'jwk', metadata: { name: 'Test Identity 2' }, context: authorDid.uri });
          const bearerIdentity3 = await testHarness.agent.identity.create({ didMethod: 'jwk', metadata: { name: 'Test Identity 3' }, context: authorDid.uri });

          // List Identities and verify the result.
          const storedDids = await identityStore.list({ context: authorDid.uri, agent: testHarness.agent });
          expect(storedDids).to.have.length(3);
          const importedDids = [bearerIdentity1.did.uri, bearerIdentity2.did.uri, bearerIdentity3.did.uri];
          for (const storedIdentity of storedDids) {
            expect(importedDids).to.include(storedIdentity.did.uri);
          }
        });

        it('throws an error if Agent DID and context are undefined', async function() {
          try {
            await identityStore.list({ agent: testHarness.agent });
            expect.fail('Expected an error to be thrown');

          } catch (error: any) {
            expect(error.message).to.include('Failed to determine author');
          }
        });

        it('throws an error if the Identity records exceed the DWN maximum data size for query results', async function() {
          // Skip this test for InMemoryIdentityStore, as the in-memory store returns all records
          // regardless of the size of the data.
          if (IdentityStore.name === 'InMemoryIdentityStore') this.skip();

          await testHarness.createAgentDid();

          const identityBytes = Convert.string(new Array(102400 + 1).join('0')).toUint8Array();

          // Store the Identity in the DWN.
          const response = await testHarness.agent.dwn.processRequest({
            author        : testHarness.agent.agentDid!.uri,
            target        : testHarness.agent.agentDid!.uri,
            messageType   : DwnInterface.RecordsWrite,
            messageParams : {
              dataFormat : 'application/json',
              schema     : 'https://identity.foundation/schemas/web5/portable-identity'
            },
            dataStream: new Blob([identityBytes], { type: 'application/json' })
          });

          expect(response.reply.status.code).to.equal(202);

          try {
            await identityStore.list({ agent: testHarness.agent });
            expect.fail('Expected an error to be thrown');

          } catch (error: any) {
            expect(error.message).to.include(`Expected 'encodedData' to be present in the DWN query result entry`);
          }
        });
      });

      // describe('set()', () => {
      //   it('stores a DID', async () => {
      //     // Generate a new DID.
      //     let bearerDid = await DidJwk.create();

      //     // Export the DID including its private key material.
      //     const portableDid = await bearerDid.export();

      //     // Import the DID's private key material into the Agent's key manager.
      //     await testHarness.agent.crypto.importKey({ key: portableDid.privateKeys![0] });

      //     // Store the DID in the store.
      //     await identityStore.set({ didUri: portableDid.uri, value: portableDid, agent: testHarness.agent });

      //     // Try to retrieve the DID from the DidManager store to verify it was imported.
      //     const storedIdentity = await identityStore.get({ didUri: portableDid.uri, agent: testHarness.agent });

      //     // Verify the Identity in the store matches the DID that was imported.
      //     expect(storedIdentity!.uri).to.equal(bearerDid.uri);
      //     expect(storedIdentity!.document).to.deep.equal(bearerDid.document);
      //   });

      //   it('authors multiple entries in the store with the Agent DID', async () => {
      //     // Create and import the Agent DID which will be used to author all writes to the store.
      //     await testHarness.createAgentDid();

      //     // Create three did:jwk DIDs to test import.
      //     let bearerDid1 = await DidJwk.create();
      //     let bearerDid2 = await DidJwk.create();

      //     // Import the two DIDs.
      //     await identityStore.set({ didUri: bearerDid1.uri, value: await bearerDid1.export(), agent: testHarness.agent });
      //     await identityStore.set({ didUri: bearerDid2.uri, value: await bearerDid2.export(), agent: testHarness.agent });

      //     // Get each DID and verify that they were written under the Agent's DID tenant.
      //     const storedDid2 = await identityStore.get({ didUri: bearerDid1.uri, agent: testHarness.agent });
      //     const storedDid3 = await identityStore.get({ didUri: bearerDid2.uri, agent: testHarness.agent });

      //     expect(storedDid2!.uri).to.equal(bearerDid1.uri);
      //     expect(storedDid3!.uri).to.equal(bearerDid2.uri);
      //   });

      //   it('uses the context, if specified', async () => {
      //     // Generate a DID for the Agent so that we have another DID Store tenant to check.
      //     await testHarness.createAgentDid();

      //     // Generate a new DID to author writes to the store.
      //     const did = await DidJwk.create();
      //     const authorDid = await did.export();

      //     // Import the DID's private key material into the Agent's key manager.
      //     await testHarness.agent.crypto.importKey({ key: authorDid.privateKeys![0] });

      //     // Generate a DID and import it under the custom author context.
      //     const bearerDid = await DidJwk.create();
      //     await identityStore.set({ didUri: bearerDid.uri, value: await bearerDid.export(), context: authorDid.uri, agent: testHarness.agent });

      //     // Verify the Identity was written under the custom author context.
      //     let storedIdentity = await identityStore.get({ didUri: bearerDid.uri, context: authorDid.uri, agent: testHarness.agent });
      //     expect(storedIdentity!.uri).to.equal(bearerDid.uri);

      //     // Verify the Identity was not written under the Agent's DID tenant.
      //     storedIdentity = await identityStore.get({ didUri: bearerDid.uri, agent: testHarness.agent });
      //     expect(storedIdentity).to.be.undefined;
      //   });

      //   it('throws an error when attempting to import a DID that already exists', async () => {
      //     // Generate a new DID.
      //     let bearerDid = await DidJwk.create();

      //     // Export the DID including its private key material.
      //     const portableDid = await bearerDid.export();

      //     // Import the DID's private key material into the Agent's key manager.
      //     await testHarness.agent.crypto.importKey({ key: portableDid.privateKeys![0] });

      //     // Store the DID in the store.
      //     await identityStore.set({ didUri: portableDid.uri, value: portableDid, agent: testHarness.agent });

      //     // Try to import the same key again.
      //     try {
      //       await identityStore.set({ didUri: portableDid.uri, value: portableDid, agent: testHarness.agent });
      //       expect.fail('Expected an error to be thrown');

      //     } catch (error: any) {
      //       expect(error.message).to.include('Import failed due to duplicate DID');
      //     }
      //   });

      //   it('throws an error if Agent DID is undefined and no keys exist for specified DID', async function() {
      //     // Skip this test for InMemoryIdentityStore, as checking for keys to sign DWN messages is not
      //     // relevant given that the store is in-memory.
      //     if (IdentityStore.name === 'InMemoryIdentityStore') this.skip();

      //     // Generate a new DID.
      //     let bearerDid = await DidJwk.create();

      //     // Export the DID including its private key material.
      //     const portableDid = await bearerDid.export();

      //     try {
      //       await identityStore.set({ didUri: portableDid.uri, value: portableDid, agent: testHarness.agent });
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