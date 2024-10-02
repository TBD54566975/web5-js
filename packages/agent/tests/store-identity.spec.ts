import { expect } from 'chai';
import { DidJwk } from '@web5/dids';
import { Convert } from '@web5/common';

import type { AgentDataStore, DwnDataStore } from '../src/store-data.js';
import type { IdentityMetadata } from '../src/types/identity.js';

import { TestAgent } from './utils/test-agent.js';
import { DwnInterface } from '../src/types/dwn.js';
import { AgentIdentityApi } from '../src/identity-api.js';
import { PlatformAgentTestHarness } from '../src/test-harness.js';
import { DwnIdentityStore, InMemoryIdentityStore } from '../src/store-identity.js';
import { IdentityProtocolDefinition } from '../src/store-data-protocols.js';

describe('IdentityStore', () => {
  let testHarness: PlatformAgentTestHarness;

  before(async () => {
    testHarness = await PlatformAgentTestHarness.setup({
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

  [DwnIdentityStore, InMemoryIdentityStore].forEach((IdentityStore) => {
    describe(IdentityStore.name, () => {
      let identityStore: AgentDataStore<IdentityMetadata>;

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
          const deleteResult = await identityStore.delete({
            id    : identity.did.uri,
            agent : testHarness.agent
          });
          expect(deleteResult).to.be.true;

          // Verify the Identity is no longer in the store.
          const storedIdentity = await identityStore.get({
            id    : identity.did.uri,
            agent : testHarness.agent
          });
          expect(storedIdentity).to.be.undefined;
        });

        it('should return false if Identity does not exist', async () => {
          // Test deleting a non-existent Identity using the context of the only DID with keys.
          const deleteResult = await identityStore.delete({ id: 'non-existent',  agent: testHarness.agent });

          // Validate that a delete could not be carried out.
          expect(deleteResult).to.be.false;
        });

        it('throws an error if no keys exist for specified DID', async function() {
          // Skip this test for InMemoryIdentityStore, as checking for keys to sign DWN messages is not
          // relevant given that the store is in-memory.
          if (IdentityStore.name === 'InMemoryIdentityStore') this.skip();

          try {
            await identityStore.delete({
              id     : 'did:jwk:eyJrdHkiOiJPS1AiLCJjcnYiOiJFZDI1NTE5IiwieCI6IjNFQmFfRUxvczJhbHZMb2pxSVZjcmJLcGlyVlhqNmNqVkQ1djJWaHdMejgifQ',
              tenant : 'did:jwk:eyJrdHkiOiJPS1AiLCJjcnYiOiJFZDI1NTE5IiwieCI6IjNFQmFfRUxvczJhbHZMb2pxSVZjcmJLcGlyVlhqNmNqVkQ1djJWaHdMejgifQ',
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
          const storedIdentity = await identityStore.get({ id: identity.did.uri, agent: testHarness.agent });

          // Verify the Identity is in the store.
          expect(storedIdentity).to.exist;
          expect(storedIdentity!.uri).to.equal(identity.did.uri);
          expect(storedIdentity!).to.deep.equal(identity.metadata);
        });

        it('should return undefined when attempting to get a non-existent DID', async () => {
          // Test retrieving a non-existent Identity using the context of the only DID with keys.
          const storedIdentity = await identityStore.get({ id: 'non-existent', agent: testHarness.agent });

          // Verify the result is undefined.
          expect(storedIdentity).to.be.undefined;
        });

        it('throws an error if no keys exist for specified DID', async function() {
          // Skip this test for InMemoryIdentityStore, as checking for keys to sign DWN messages is not
          // relevant given that the store is in-memory.
          if (IdentityStore.name === 'InMemoryIdentityStore') this.skip();

          try {
            await identityStore.get({
              id     : 'did:jwk:eyJrdHkiOiJPS1AiLCJjcnYiOiJFZDI1NTE5IiwieCI6IjNFQmFfRUxvczJhbHZMb2pxSVZjcmJLcGlyVlhqNmNqVkQ1djJWaHdMejgifQ',
              tenant : 'did:jwk:eyJrdHkiOiJPS1AiLCJjcnYiOiJFZDI1NTE5IiwieCI6IjNFQmFfRUxvczJhbHZMb2pxSVZjcmJLcGlyVlhqNmNqVkQ1djJWaHdMejgifQ',
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
          // Generate three new Identities that are stored under the Agent's context.
          const bearerIdentity1 = await testHarness.agent.identity.create({ didMethod: 'jwk', metadata: { name: 'Test Identity 1' } });
          const bearerIdentity2 = await testHarness.agent.identity.create({ didMethod: 'jwk', metadata: { name: 'Test Identity 2' } });
          const bearerIdentity3 = await testHarness.agent.identity.create({ didMethod: 'jwk', metadata: { name: 'Test Identity 3' } });

          // List Identities and verify the result.
          const storedDids = await identityStore.list({ agent: testHarness.agent });
          expect(storedDids).to.have.length(3);
          const importedDids = [bearerIdentity1.did.uri, bearerIdentity2.did.uri, bearerIdentity3.did.uri];
          for (const storedIdentity of storedDids) {
            expect(importedDids).to.include(storedIdentity.uri);
          }
        });

        it('returns an empty array if there are no Identities in the store', async () => {
          // List Identities and verify there are no results.
          const storedDids = await identityStore.list({ agent: testHarness.agent });
          expect(storedDids).to.have.length(0);
        });

        it('uses the context, if specified', async () => {
          // Generate a new DID to author all of the writes to the store.
          const did = await DidJwk.create();
          const authorDid = await did.export();

          // Import the DID's private key material into the Agent's key manager.
          await testHarness.agent.keyManager.importKey({ key: authorDid.privateKeys![0] });

          // Generate three new Identities that are stored under the custom author context.
          const bearerIdentity1 = await testHarness.agent.identity.create({ didMethod: 'jwk', metadata: { name: 'Test Identity 1' } });
          const bearerIdentity2 = await testHarness.agent.identity.create({ didMethod: 'jwk', metadata: { name: 'Test Identity 2' } });
          const bearerIdentity3 = await testHarness.agent.identity.create({ didMethod: 'jwk', metadata: { name: 'Test Identity 3' } });

          // List Identities and verify the result.
          const storedDids = await identityStore.list({ agent: testHarness.agent });
          expect(storedDids).to.have.length(3);
          const importedDids = [bearerIdentity1.did.uri, bearerIdentity2.did.uri, bearerIdentity3.did.uri];
          for (const storedIdentity of storedDids) {
            expect(importedDids).to.include(storedIdentity.uri);
          }
        });

        it('throws an error if the Identity records exceed the DWN maximum data size for query results', async function() {
          // Skip this test for InMemoryIdentityStore, as the in-memory store returns all records
          // regardless of the size of the data.
          if (IdentityStore.name === 'InMemoryIdentityStore') this.skip();

          // since we are writing directly to the dwn we first initialize the storage protocol
          await (identityStore as DwnDataStore<IdentityMetadata>)['initialize']({ agent: testHarness.agent });

          const identityBytes = Convert.string(new Array(102400 + 1).join('0')).toUint8Array();

          // Store the Identity in the DWN.
          const response = await testHarness.agent.dwn.processRequest({
            author        : testHarness.agent.agentDid.uri,
            target        : testHarness.agent.agentDid.uri,
            messageType   : DwnInterface.RecordsWrite,
            messageParams : {
              dataFormat   : 'application/json',
              protocol     : IdentityProtocolDefinition.protocol,
              protocolPath : 'identityMetadata',
              schema       : IdentityProtocolDefinition.types.identityMetadata.schema,
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
    });
  });
});