import type { Jwk } from '@web5/crypto';

import { expect } from 'chai';
import { Convert } from '@web5/common';

import type { AgentDataStore, DwnDataStore } from '../src/store-data.js';

import { TestAgent } from './utils/test-agent.js';
import { DwnInterface } from '../src/types/dwn.js';
import { LocalKeyManager } from '../src/local-key-manager.js';
import { PlatformAgentTestHarness } from '../src/test-harness.js';
import { DwnKeyStore, InMemoryKeyStore } from '../src/store-key.js';
import { JWKProtocolDefinition } from '../src/store-data-protocols.js';

describe('KeyStore', () => {
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

  [DwnKeyStore, InMemoryKeyStore].forEach((AgentDataStore) => {
    describe(AgentDataStore.name, () => {
      let keyStore: AgentDataStore<Jwk>;

      beforeEach(async () => {
        keyStore = new AgentDataStore();
        const keyManager = new LocalKeyManager({ agent: testHarness.agent, keyStore });
        testHarness.agent.keyManager = keyManager;
      });

      describe('constructor', () => {
        it(`creates a ${AgentDataStore.name}`, () => {
          const store = new AgentDataStore();
          expect(store).to.be.instanceOf(AgentDataStore);
        });
      });

      describe('delete()', () => {
        it('should delete Private Key and return true if Private Key exists', async () => {
          // Generate a Private Key.
          const keyUri = await testHarness.agent.keyManager.generateKey({
            algorithm: 'Ed25519'
          });

          // Test deleting the Private Key and validate the result.
          const deleteResult = await keyStore.delete({
            id    : keyUri,
            agent : testHarness.agent
          });
          expect(deleteResult).to.be.true;

          // Verify the Private Key is no longer in the store.
          const storedKey = await keyStore.get({
            id    : keyUri,
            agent : testHarness.agent
          });
          expect(storedKey).to.be.undefined;
        });

        it('should return false if Private Key does not exist', async () => {
          // Test deleting a non-existent Private Key using the context of the only DID with keys.
          const deleteResult = await keyStore.delete({ id: 'non-existent',  agent: testHarness.agent });

          // Validate that a delete could not be carried out.
          expect(deleteResult).to.be.false;
        });
      });

      describe('get()', () => {
        it('should return a Private Key by URI if it exists', async () => {
          // Generate a Private Key.
          const keyUri = await testHarness.agent.keyManager.generateKey({
            algorithm: 'Ed25519'
          });

          // Test getting the Private Key.
          const storedKey = await keyStore.get({ id: keyUri, agent: testHarness.agent });

          // Verify the Private Key is in the store.
          expect(storedKey).to.exist;
          expect(keyUri).to.include(storedKey!.kid);
        });

        it('should return undefined when attempting to get a non-existent DID', async () => {
          // Test retrieving a non-existent DID using the context of the only DID with keys.
          const storedKey = await keyStore.get({ id: 'non-existent', agent: testHarness.agent });

          // Verify the result is undefined.
          expect(storedKey).to.be.undefined;
        });
      });

      describe('list()', () => {
        it('should return an array of all Private Keys in the store', async () => {
          // Generate three Private Keys.
          const keyUri1 = await testHarness.agent.keyManager.generateKey({ algorithm: 'Ed25519' });
          const keyUri2 = await testHarness.agent.keyManager.generateKey({ algorithm: 'Ed25519' });
          const keyUri3 = await testHarness.agent.keyManager.generateKey({ algorithm: 'Ed25519' });

          // List DIDs and verify the result.
          const storedKeys = await keyStore.list({ agent: testHarness.agent });
          expect(storedKeys).to.have.length(3);
          const importedKeys = [keyUri1, keyUri2, keyUri3];
          for (const storedKey of storedKeys) {
            expect(importedKeys).to.include(`urn:jwk:${storedKey.kid}`);
          }
        });

        it('returns an empty array if there are no Private Keys in the store', async () => {
          // List Private Keys and verify there are no results.
          const storedKeys = await keyStore.list({ agent: testHarness.agent });
          expect(storedKeys).to.have.length(0);
        });

        it('throws an error if the DID records exceed the DWN maximum data size for query results', async function() {
          // Skip this test for InMemoryKeyStore, as the in-memory store returns all records
          // regardless of the size of the data.
          if (AgentDataStore.name === 'InMemoryKeyStore') this.skip();

          const keyBytes = Convert.string(new Array(102400 + 1).join('0')).toUint8Array();

          // since we are writing directly to the dwn we first initialize the storage protocol
          await (keyStore as DwnDataStore<Jwk>)['initialize']({ agent: testHarness.agent });

          // Store the DID in the DWN.
          const response = await testHarness.agent.dwn.processRequest({
            author        : testHarness.agent.agentDid.uri,
            target        : testHarness.agent.agentDid.uri,
            messageType   : DwnInterface.RecordsWrite,
            messageParams : {
              dataFormat   : 'application/json',
              protocol     : JWKProtocolDefinition.protocol,
              protocolPath : 'privateJwk',
              schema       : JWKProtocolDefinition.types.privateJwk.schema,
            },
            dataStream: new Blob([keyBytes], { type: 'application/json' })
          });

          expect(response.reply.status.code).to.equal(202);

          try {
            await keyStore.list({ agent: testHarness.agent });
            expect.fail('Expected an error to be thrown');

          } catch (error: any) {
            expect(error.message).to.include(`Expected 'encodedData' to be present in the DWN query result entry`);
          }
        });
      });

      describe('set()', () => {
        it('stores a Private Key', async () => {
          // Store a test key.
          await keyStore.set({
            id   : 'urn:jwk:test-key',
            data : {
              kid : 'test-key',
              kty : 'OKP',
              crv : 'Ed25519',
              alg : 'EdDSA',
              x   : 'x'
            },
            agent: testHarness.agent
          });

          // Test getting the test key.
          const storedKey = await keyStore.get({ id: 'urn:jwk:test-key', agent: testHarness.agent });

          // Verify the Private Key is in the store.
          expect(storedKey).to.exist;
          expect(storedKey!.kid).to.equal('test-key');
        });
      });
    });
  });
});