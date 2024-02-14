import type { PortableDid } from '@web5/dids';
import type { Web5Crypto } from '@web5/crypto';

import chai, { expect } from 'chai';
import { DidKeyMethod } from '@web5/dids';
import chaiAsPromised from 'chai-as-promised';
import { EdDsaAlgorithm, Jose } from '@web5/crypto';

import type { ManagedKey, ManagedKeyPair, ManagedPrivateKey } from '../src/types/managed-key.js';

import { LocalKms } from '../src/kms-local.js';
import { TestAgent } from './utils/test-agent.js';
import { KeyManager } from '../src/key-manager.js';
import { cryptoToPortableKeyPair, isManagedKeyPair } from '../src/utils.js';
import {
  KeyStoreDwn,
  KeyStoreMemory,
  PrivateKeyStoreDwn,
  PrivateKeyStoreMemory
} from '../src/store-managed-key.js';

chai.use(chaiAsPromised);

describe('KeyStoreDwn', () => {
  const testConfigurations = [
    {
      name           : 'KeyManager',
      keyStoreDwn    : new KeyStoreDwn({ schema: 'https://identity.foundation/schemas/web5/managed-key' }),
      keyStoreMemory : new KeyStoreMemory(),
    },
    {
      name           : 'LocalKms',
      keyStoreDwn    : new KeyStoreDwn({ schema: 'https://identity.foundation/schemas/web5/kms-key' }),
      keyStoreMemory : new KeyStoreMemory(),
    }
  ];

  let agentSigningKey: Web5Crypto.CryptoKeyPair;
  let agentDid: PortableDid;
  let testAgent: TestAgent;

  before(async () => {
    testAgent = await TestAgent.create();
  });

  beforeEach(async () => {
    agentDid = await DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });
    const privateCryptoKey = await Jose.jwkToCryptoKey({ key: agentDid.keySet.verificationMethodKeys![0].privateKeyJwk! });
    const publicCryptoKey = await Jose.jwkToCryptoKey({ key: agentDid.keySet.verificationMethodKeys![0].publicKeyJwk! });

    agentSigningKey = {
      privateKey : privateCryptoKey,
      publicKey  : publicCryptoKey
    };
  });

  afterEach(async () => {
    await testAgent.clearStorage();
  });

  after(async () => {
    await testAgent.closeStorage();
  });

  testConfigurations.forEach((testConfiguration) => {
    describe(`with ${testConfiguration.name}`, () => {
      let keyStoreDwn: KeyStoreDwn;
      let kmsKeyStoreMemory: KeyStoreMemory;
      let kmsPrivateKeyStoreMemory: PrivateKeyStoreMemory;

      beforeEach(async () => {
        // Instantiate a local KMS with in-memory key stores.
        kmsKeyStoreMemory = new KeyStoreMemory();
        const localKmsMemory = new LocalKms({
          kmsName  : 'memory',
          keyStore : kmsKeyStoreMemory
        });

        kmsPrivateKeyStoreMemory = new PrivateKeyStoreMemory();
        keyStoreDwn = testConfiguration.keyStoreDwn;

        if (testConfiguration.name === 'KeyManager') {
          const localKmsDwn = new LocalKms({
            kmsName         : 'local',
            keyStore        : testConfiguration.keyStoreMemory,
            privateKeyStore : kmsPrivateKeyStoreMemory
          });

          const keyManager = new KeyManager({
            kms: {
              local  : localKmsDwn,
              memory : localKmsMemory
            },
            store: testConfiguration.keyStoreDwn
          });
          keyManager.agent = testAgent;
          testAgent.keyManager = keyManager;
        }

        if (testConfiguration.name === 'LocalKms') {
          const localKmsDwn = new LocalKms({
            kmsName         : 'local',
            keyStore        : testConfiguration.keyStoreDwn,
            privateKeyStore : kmsPrivateKeyStoreMemory
          });

          const keyManager = new KeyManager({
            kms: {
              local  : localKmsDwn,
              memory : localKmsMemory
            },
            store: testConfiguration.keyStoreMemory
          });
          keyManager.agent = testAgent;
          testAgent.keyManager = keyManager;
        }

        // Convert the CryptoKeyPair object to a PortableKeyPair.
        const defaultSigningKey = cryptoToPortableKeyPair({
          cryptoKeyPair : agentSigningKey,
          keyData       : {
            alias : await testAgent.didManager.getDefaultSigningKey({ did: agentDid.did }),
            kms   : 'memory'
          }
        });

        // Import the Agent's signing key pair to the in-memory KMS key stores.
        await testAgent.keyManager.setDefaultSigningKey({ key: defaultSigningKey });

        // Set the Agent's DID
        testAgent.agentDid = agentDid.did;
      });

      describe('deleteKey()', () => {
        let importedKeyPairId: string;

        beforeEach(async () => {
          // Generate a key pair to import.
          const randomKeyPair = await new EdDsaAlgorithm().generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
            extractable : true,
            keyUsages   : ['sign', 'verify']
          });

          // Import the private key to the in-memory private key store.
          const importedPrivateKeyId = await kmsPrivateKeyStoreMemory.importKey({ key: {
            material : randomKeyPair.privateKey.material,
            type     : 'private'
          }});

          // And finally, attempt to import the key into the DWN-backed key store.
          importedKeyPairId = await keyStoreDwn.importKey({
            agent : testAgent,
            key   : {
              privateKey : { ...randomKeyPair.privateKey, id: importedPrivateKeyId, kms: 'local', state: 'Enabled' },
              publicKey  : { ...randomKeyPair.publicKey, id: importedPrivateKeyId, kms: 'local', material: randomKeyPair.publicKey.material, state: 'Enabled' }
            }
          });
        });

        it('deletes key and returns true if key exists', async () => {
          // Test deleting the key and validate the result.
          const deleteResult = await keyStoreDwn.deleteKey({ id: importedKeyPairId, agent: testAgent });
          expect(deleteResult).to.be.true;

          // Verify the key is no longer in the store.
          const storedKey = await keyStoreDwn.getKey({ id: importedKeyPairId, agent: testAgent });
          expect(storedKey).to.be.undefined;
        });

        it('returns false if key does not exist', async () => {
          // Test deleting the key.
          const deleteResult = await keyStoreDwn.deleteKey({ id: 'non-existent', agent: testAgent });

          // Validate the key was not deleted.
          expect(deleteResult).to.be.false;
        });

        it('throws an error if Agent DID is undefined and no context was specified', async () => {
          // Unset the Agent DID.
          testAgent.agentDid = undefined;
          await expect(
            keyStoreDwn.deleteKey({ id: importedKeyPairId, agent: testAgent })
          ).to.eventually.be.rejectedWith(Error, `Agent property 'agentDid' is undefined and no context was specified`);
        });
      });

      describe('findKey()', () => {
        let importedKeyPairId: string;

        beforeEach(async () => {
          // Generate a key pair to import.
          const randomKeyPair = await new EdDsaAlgorithm().generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
            extractable : true,
            keyUsages   : ['sign', 'verify']
          });

          // Import the private key to the in-memory private key store.
          const importedPrivateKeyId = await kmsPrivateKeyStoreMemory.importKey({ key: {
            material : randomKeyPair.privateKey.material,
            type     : 'private'
          }});

          // And finally, attempt to import the key into the DWN-backed key store.
          importedKeyPairId = await keyStoreDwn.importKey({
            agent : testAgent,
            key   : {
              privateKey : { ...randomKeyPair.privateKey, id: importedPrivateKeyId, kms: 'local', alias: 'external-id', state: 'Enabled' },
              publicKey  : { ...randomKeyPair.publicKey, id: importedPrivateKeyId, kms: 'local', alias: 'external-id', material: randomKeyPair.publicKey.material, state: 'Enabled' }
            }
          });
        });

        it('returns a key by ID if it exists', async () => {
          // Test finding the key.
          const storedKey = await keyStoreDwn.findKey({ id: importedKeyPairId, agent: testAgent});

          // Verify the key is in the store.
          if (!(storedKey && 'publicKey' in storedKey)) throw Error(); // Type guard.
          expect(storedKey.publicKey.id).to.equal(importedKeyPairId);
        });

        it('returns a key by alias if it exists', async () => {
          // Test finding the key.
          const storedKey = await keyStoreDwn.findKey({ alias: 'external-id', agent: testAgent});

          // Verify the key is in the store.
          if (!(storedKey && 'publicKey' in storedKey)) throw Error(); // Type guard.
          expect(storedKey.publicKey.id).to.equal(importedKeyPairId);
        });

        it('returns undefined when attempting to get a non-existent key', async () => {
          // Test finding the key by ID.
          expect(
            await keyStoreDwn.findKey({ id: 'non-existent-did', agent: testAgent })
          ).to.be.undefined;

          // Test finding the key by alias.
          expect(
            await keyStoreDwn.findKey({ alias: 'non-existent-did', agent: testAgent })
          ).to.be.undefined;
        });

        it('throws an error if Agent DID is undefined and no context was specified', async () => {
          // Unset the Agent DID.
          testAgent.agentDid = undefined;
          await expect(
            keyStoreDwn.findKey({ id: importedKeyPairId, agent: testAgent })
          ).to.eventually.be.rejectedWith(Error, `Agent property 'agentDid' is undefined and no context was specified`);
        });

        it('throws an error if Agent DID is undefined when searching by alias', async () => {
          // Unset the Agent DID.
          testAgent.agentDid = undefined;
          await expect(
            keyStoreDwn.findKey({ alias: 'external-id', agent: testAgent })
          ).to.eventually.be.rejectedWith(Error, `Agent property 'agentDid' is undefined`);
        });
      });

      describe('getKey()', () => {
        let importedKeyPairId: string;

        beforeEach(async () => {
          // Generate a key pair to import.
          const randomKeyPair = await new EdDsaAlgorithm().generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
            extractable : true,
            keyUsages   : ['sign', 'verify']
          });

          // Import the private key to the in-memory private key store.
          const importedPrivateKeyId = await kmsPrivateKeyStoreMemory.importKey({ key: {
            material : randomKeyPair.privateKey.material,
            type     : 'private'
          }});

          // And finally, attempt to import the key into the DWN-backed key store.
          importedKeyPairId = await keyStoreDwn.importKey({
            agent : testAgent,
            key   : {
              privateKey : { ...randomKeyPair.privateKey, id: importedPrivateKeyId, kms: 'local', alias: 'external-id', state: 'Enabled' },
              publicKey  : { ...randomKeyPair.publicKey, id: importedPrivateKeyId, kms: 'local', alias: 'external-id', material: randomKeyPair.publicKey.material, state: 'Enabled' }
            }
          });
        });

        it('returns a key by ID if it exists', async () => {
          // Test getting the key.
          const storedKey = await keyStoreDwn.getKey({ id: importedKeyPairId, agent: testAgent });

          // Verify the key is in the store.
          if (!(storedKey && 'publicKey' in storedKey)) throw Error(); // Type guard.
          expect(storedKey.publicKey.id).to.equal(importedKeyPairId);
        });

        it('returns undefined when attempting to get a non-existent DID', async () => {
          // Test getting the key.
          const storedKey = await keyStoreDwn.getKey({ id: 'non-existent', agent: testAgent });

          // Verify the result is undefined.
          expect(storedKey).to.be.undefined;
        });

        it('throws an error if Agent DID is undefined and no context was specified', async () => {
          // Unset the Agent DID.
          testAgent.agentDid = undefined;
          await expect(
            keyStoreDwn.getKey({ id: importedKeyPairId, agent: testAgent })
          ).to.eventually.be.rejectedWith(Error, `Agent property 'agentDid' is undefined and no context was specified`);
        });
      });

      describe('importKey()', () => {
        it('imports a key after Agent signing key is stored by in-memory KMS', async () => {
          // Generate a key pair to import.
          const randomKeyPair = await new EdDsaAlgorithm().generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
            extractable : true,
            keyUsages   : ['sign', 'verify']
          });

          // Import the private key to the in-memory private key store.
          const importedPrivateKeyId = await kmsPrivateKeyStoreMemory.importKey({ key: {
            material : randomKeyPair.privateKey.material,
            type     : 'private'
          }});

          // And finally, attempt to import the key into the DWN-backed key store.
          const importedKeyPairId = await keyStoreDwn.importKey({
            agent : testAgent,
            key   : {
              privateKey : { ...randomKeyPair.privateKey, id: importedPrivateKeyId, kms: 'local', state: 'Enabled' },
              publicKey  : { ...randomKeyPair.publicKey, id: importedPrivateKeyId, kms: 'local', material: randomKeyPair.publicKey.material, state: 'Enabled' }
            }
          });

          // Verify the key is present in the DWN-backed key store.
          const storedKeyPair = await keyStoreDwn.getKey({ id: importedKeyPairId, agent: testAgent });
          if (!isManagedKeyPair(storedKeyPair)) throw new Error('Type guard unexpectedly threw'); // Type guard.
          expect(storedKeyPair.publicKey.id).to.equal(importedKeyPairId);
          expect(storedKeyPair.privateKey.id).to.equal(importedKeyPairId);
          expect(storedKeyPair.publicKey.kms).to.equal('local');
          expect(storedKeyPair.privateKey.kms).to.equal('local');
        });

        it('uses the specified ID for the imported key', async () => {
          const testKey: ManagedKey = {
            id          : 'test123',
            algorithm   : { name: 'AES', length: 256 },
            extractable : true,
            kms         : 'testKms',
            state       : 'Enabled',
            type        : 'secret',
            usages      : ['encrypt', 'decrypt'],
          };

          // Test importing the key and validate the result.
          const importedKeyId = await keyStoreDwn.importKey({ key: testKey, agent: testAgent });
          expect(importedKeyId).to.equal(testKey.id);
        });

        it('generates and return an ID if one is not provided', async () => {
          const testKey = {
            algorithm   : { name: 'AES', length: 256 },
            extractable : true,
            kms         : 'testKms',
            state       : 'Enabled',
            type        : 'secret',
            usages      : ['encrypt', 'decrypt'],
          };

          // Test importing the key and validate the result.
          // @ts-expect-error because the ID property was intentionally omitted from the key object to be imported.
          const importedKeyId = await keyStoreDwn.importKey({ key: testKey, agent: testAgent });
          expect(importedKeyId).to.be.a.string;

          // Verify the key is present in the key store.
          const storedKey = await keyStoreDwn.getKey({ id: importedKeyId, agent: testAgent }) as ManagedKey;
          expect(storedKey.id).to.equal(importedKeyId);
        });

        it('throws an error when attempting to import a key that already exists', async () => {
          const testKey: ManagedKey = {
            id          : 'test123',
            algorithm   : { name: 'AES', length: 256 },
            extractable : true,
            kms         : 'testKms',
            state       : 'Enabled',
            type        : 'secret',
            usages      : ['encrypt', 'decrypt'],
          };

          // Test importing the key and validate the result.
          const importedKeyId = await keyStoreDwn.importKey({ key: testKey, agent: testAgent });
          expect(importedKeyId).to.equal(testKey.id);

          // Test importing the same key again and assert it throws an error.
          await expect(
            keyStoreDwn.importKey({ key: testKey, agent: testAgent })
          ).to.eventually.be.rejectedWith(Error, 'Key with ID already exists');
        });

        it('throws an error if Agent DID is undefined and no context was specified', async () => {
          // Unset the Agent DID.
          testAgent.agentDid = undefined;
          await expect(
            keyStoreDwn.importKey({ key: { id: undefined } as any, agent: testAgent })
          ).to.eventually.be.rejectedWith(Error, `Agent property 'agentDid' is undefined and no context was specified`);
        });
      });

      describe('listKeys()', () => {
        it('returns an array of all keys in the store', async () => {
          // Create key pair to import.
          const randomKeyPair = await new EdDsaAlgorithm().generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
            extractable : true,
            keyUsages   : ['sign', 'verify']
          });
          const portableKeyPair = cryptoToPortableKeyPair({
            cryptoKeyPair : randomKeyPair,
            keyData       : { kms: 'local' }
          });

          // Import the key material three times.
          const importedKey1 = await testAgent.keyManager.importKey(structuredClone(portableKeyPair));
          const importedKey2 = await testAgent.keyManager.importKey(structuredClone(portableKeyPair));
          const importedKey3 = await testAgent.keyManager.importKey(structuredClone(portableKeyPair));

          // List keys and verify the result.
          const storedKeys = await keyStoreDwn.listKeys({ agent: testAgent });
          expect(storedKeys).to.have.length(3);
          const importedKeys = [importedKey1.publicKey.id, importedKey2.publicKey.id, importedKey3.publicKey.id];
          for (const storedKey of storedKeys) {
            if (!isManagedKeyPair(storedKey)) throw Error(); // Type guard.
            expect(importedKeys).to.include(storedKey.publicKey.id);
          }
        });

        it('should return an empty array if the store contains no keys', async function() {
          // List keys and verify the result is empty.
          const storedKeys = await keyStoreDwn.listKeys({ agent: testAgent });
          expect(storedKeys).to.be.empty;
        });

        it('throws an error if Agent DID is undefined and no context was specified', async () => {
          // Unset the Agent DID.
          testAgent.agentDid = undefined;
          await expect(
            keyStoreDwn.listKeys({ agent: testAgent })
          ).to.eventually.be.rejectedWith(Error, `Agent property 'agentDid' is undefined and no context was specified`);
        });
      });

      describe('updateKey()', () => {
        let importedKeyPairId: string;

        beforeEach(async () => {
          // Generate a key pair to import.
          const randomKeyPair = await new EdDsaAlgorithm().generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
            extractable : true,
            keyUsages   : ['sign', 'verify']
          });

          // Import the private key to the in-memory private key store.
          const importedPrivateKeyId = await kmsPrivateKeyStoreMemory.importKey({ key: {
            material : randomKeyPair.privateKey.material,
            type     : 'private'
          }});

          // And finally, attempt to import the key into the DWN-backed key store.
          importedKeyPairId = await keyStoreDwn.importKey({
            agent : testAgent,
            key   : {
              privateKey : { ...randomKeyPair.privateKey, id: importedPrivateKeyId, kms: 'local', state: 'Enabled' },
              publicKey  : { ...randomKeyPair.publicKey, id: importedPrivateKeyId, kms: 'local', material: randomKeyPair.publicKey.material, state: 'Enabled' }
            }
          });
        });

        it('updates key alias and return true if key exists', async () => {
          // Test updating the key and validate the result.
          const updateResult = await keyStoreDwn.updateKey({ id: importedKeyPairId, alias: 'new-alias', agent: testAgent });
          expect(updateResult).to.be.true;

          const storedKey = await keyStoreDwn.getKey({ id: importedKeyPairId, agent: testAgent });
          if (!isManagedKeyPair(storedKey)) throw new Error('Type guard unexpectedly threw'); // Type guard.
          expect(storedKey.privateKey.alias).to.equal('new-alias');
        });

        it('updates key metadata and return true if key exists', async () => {
          // Test updating the key and validate the result.
          const updateResult = await keyStoreDwn.updateKey({ id: importedKeyPairId, metadata: { foo: 'bar' }, agent: testAgent });
          expect(updateResult).to.be.true;

          const storedKey = await keyStoreDwn.getKey({ id: importedKeyPairId, agent: testAgent });
          if (!isManagedKeyPair(storedKey)) throw new Error('Type guard unexpectedly threw'); // Type guard.
          expect(storedKey.privateKey.metadata).to.deep.equal({ foo: 'bar' });
        });

        it('returns false when attempting to update a non-existent key', async () => {
          // Test updating the key and validate the result.
          const updateResult = await keyStoreDwn.updateKey({ id: 'non-existent', metadata: { foo: 'bar' }, agent: testAgent });
          expect(updateResult).to.be.false;
        });
      });

      describe('data integrity', () => {
        it('imports and gets stored key metadata without any alterations', async () => {
          const randomKeyPair = await new EdDsaAlgorithm().generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
            extractable : true,
            keyUsages   : ['sign', 'verify']
          });
          const originalPublicKey = structuredClone(randomKeyPair.publicKey.material);
          const originalPrivateKey = structuredClone(randomKeyPair.privateKey.material);

          // Import the private key to the in-memory private key store.
          const importedPrivateKeyId = await kmsPrivateKeyStoreMemory.importKey({
            key: {
              material : randomKeyPair.privateKey.material,
              type     : 'private'
            }
          });

          // Import the key into the key store.
          const importedKeyPairId = await keyStoreDwn.importKey({
            agent : testAgent,
            key   : {
              privateKey : { ...randomKeyPair.privateKey, id: importedPrivateKeyId, kms: 'local', alias: 'external-id', state: 'Enabled' },
              publicKey  : { ...randomKeyPair.publicKey, id: importedPrivateKeyId, kms: 'local', alias: 'external-id', material: randomKeyPair.publicKey.material, state: 'Enabled' }
            }
          });

          // Retrieve the private key.
          const storedPrivateKey = await kmsPrivateKeyStoreMemory.getKey({ id: importedPrivateKeyId });
          expect(storedPrivateKey?.material).to.deep.equal(originalPrivateKey);

          // Retrieve the key metadata.
          const storedKey = await keyStoreDwn.getKey({ id: importedKeyPairId, agent: testAgent }) as ManagedKeyPair;
          expect(storedKey?.publicKey.material).to.deep.equal(originalPublicKey);
        });

        it('finds key without any alterations', async () => {
          const randomKeyPair = await new EdDsaAlgorithm().generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
            extractable : true,
            keyUsages   : ['sign', 'verify']
          });
          const originalPublicKey = structuredClone(randomKeyPair.publicKey.material);

          // Import the private key to the in-memory private key store.
          const importedPrivateKeyId = await kmsPrivateKeyStoreMemory.importKey({
            key: {
              material : randomKeyPair.privateKey.material,
              type     : 'private'
            }
          });

          // Import the key into the key store.
          const importedKeyPairId = await keyStoreDwn.importKey({
            agent : testAgent,
            key   : {
              privateKey : { ...randomKeyPair.privateKey, id: importedPrivateKeyId, kms: 'local', alias: 'external-id', state: 'Enabled' },
              publicKey  : { ...randomKeyPair.publicKey, id: importedPrivateKeyId, kms: 'local', alias: 'external-id', material: randomKeyPair.publicKey.material, state: 'Enabled' }
            }
          });

          // Find the key.
          const storedKey = await keyStoreDwn.findKey({ id: importedKeyPairId, agent: testAgent }) as ManagedKeyPair;
          expect(storedKey?.publicKey.material).to.deep.equal(originalPublicKey);
        });

        it('updates keys without any alterations', async () => {
          const randomKeyPair = await new EdDsaAlgorithm().generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
            extractable : true,
            keyUsages   : ['sign', 'verify']
          });
          const originalPublicKey = structuredClone(randomKeyPair.publicKey.material);

          // Import the private key to the in-memory private key store.
          const importedPrivateKeyId = await kmsPrivateKeyStoreMemory.importKey({
            key: {
              material : randomKeyPair.privateKey.material,
              type     : 'private'
            }
          });

          // Import the key into the key store.
          const importedKeyPairId = await keyStoreDwn.importKey({
            agent : testAgent,
            key   : {
              privateKey : { ...randomKeyPair.privateKey, id: importedPrivateKeyId, kms: 'local', alias: 'external-id', state: 'Enabled' },
              publicKey  : { ...randomKeyPair.publicKey, id: importedPrivateKeyId, kms: 'local', alias: 'external-id', material: randomKeyPair.publicKey.material, state: 'Enabled' }
            }
          });

          // Update the key.
          const updateResult = await keyStoreDwn.updateKey({ id: importedKeyPairId, alias: 'new-alias', agent: testAgent });
          expect(updateResult).to.be.true;

          // Retrieve the key.
          const storedKey = await keyStoreDwn.getKey({ id: importedKeyPairId, agent: testAgent });
          if (!isManagedKeyPair(storedKey)) throw new Error('Type guard unexpectedly threw'); // Type guard.
          expect(storedKey?.publicKey.material).to.deep.equal(originalPublicKey);
          expect(storedKey?.publicKey.alias).to.equal('new-alias');
        });
      });
    });
  });
});

describe('KeyStoreMemory', () => {
  let keyStore: KeyStoreMemory;
  let testKey: ManagedKey;
  let testKeyPair: ManagedKeyPair;

  beforeEach(() => {
    keyStore = new KeyStoreMemory();

    testKey = {
      id          : 'testKey',
      alias       : 'did:method:abc123',
      algorithm   : { name: 'AES', length: 256 },
      extractable : true,
      kms         : 'testKms',
      state       : 'Enabled',
      type        : 'secret',
      usages      : ['encrypt', 'decrypt'],
    };

    testKeyPair = {
      privateKey: {
        ...testKey,
        alias : 'did:method:def456',
        id    : 'testKeyPair',
        type  : 'private',
      },

      publicKey: {
        ...testKey,
        alias : 'did:method:def456',
        id    : 'testKeyPair',
        type  : 'public',
      }
    };
  });

  describe('deleteKey()', () => {
    it('should delete key and return true if key exists', async () => {
      // Import the key.
      await keyStore.importKey({ key: testKey });

      // Test deleting the key and validate the result.
      const deleteResult = await keyStore.deleteKey({ id: testKey.id });
      expect(deleteResult).to.be.true;

      // Verify the key is no longer in the store.
      const storedKey = await keyStore.getKey({ id: testKey.id });
      expect(storedKey).to.be.undefined;
    });

    it('should return false if key does not exist', async () => {
      // Test deleting the key.
      const nonExistentId = '1234';
      const deleteResult = await keyStore.deleteKey({ id: nonExistentId });

      // Validate the key was not deleted.
      expect(deleteResult).to.be.false;
    });
  });

  describe('findKey()', () => {

    beforeEach(async () => {
      // Import the key.
      await keyStore.importKey({ key: testKey });
    });

    it('should return a key by ID if it exists', async () => {
      // Test finding the key.
      const storedKey = await keyStore.findKey({ id: testKey.id });

      // Verify the key is in the store.
      expect(storedKey).to.deep.equal(testKey);
    });

    it('should return a key by alias if it exists', async () => {
      // Test finding the key.
      const storedKey = await keyStore.findKey({ alias: 'did:method:abc123' });

      // Verify the key is in the store.
      expect(storedKey).to.deep.equal(testKey);
    });

    it('should return a key pair by alias if it exists', async () => {
      // Import the key pair.
      await keyStore.importKey({ key: testKeyPair });

      // Test finding the key pair.
      const storedKey = await keyStore.findKey({ alias: 'did:method:def456' });

      // Verify the key is in the store.
      expect(storedKey).to.deep.equal(testKeyPair);
    });

    it('should return undefined when attempting to get a non-existent key', async () => {
      // Test finding the key by ID.
      expect(
        await keyStore.findKey({ id: 'non-existent-key' })
      ).to.be.undefined;

      // Test finding the key by alias.
      expect(
        await keyStore.findKey({ alias: 'non-existent-key' })
      ).to.be.undefined;
    });
  });

  describe('getKey()', () => {
    it('should return a key if it exists', async () => {
      // Import the key.
      await keyStore.importKey({ key: testKey });

      // Test getting the key.
      const storedKey = await keyStore.getKey({ id: testKey.id });

      // Verify the key is in the store.
      expect(storedKey).to.deep.equal(testKey);
    });

    it('should return a key pair by ID if it exists', async () => {
      // Import the key pair.
      await keyStore.importKey({ key: testKeyPair });

      // Test finding the key pair.
      const storedKey = await keyStore.getKey({ id: testKeyPair.publicKey.id });

      // Verify the key is in the store.
      expect(storedKey).to.deep.equal(testKeyPair);
    });

    it('should return undefined when attempting to get a non-existent key', async () => {
      // Test getting the key.
      const storedKey = await keyStore.getKey({ id: 'non-existent-key' });

      // Verify the key is no longer in the store.
      expect(storedKey).to.be.undefined;
    });
  });

  describe('importKey()', () => {
    it('should import a key that does not already exist', async () => {
      // Test importing the key and validate the result.
      const importResult = await keyStore.importKey({ key: testKey });
      expect(importResult).to.equal(testKey.id);
      expect(importResult).to.be.a.string;

      // Verify the key is present in the key store.
      const storedKey = await keyStore.getKey({ id: testKey.id });
      expect(storedKey).to.deep.equal(testKey);
    });

    it('should generate and return an ID if one is not provided', async () => {
      // @ts-expect-error because the ID property was intentionally omitted from the key object to be imported.
      const testKey: ManagedKey = {
        algorithm   : { name: 'AES', length: 256 },
        extractable : true,
        kms         : 'testKms',
        state       : 'Enabled',
        type        : 'secret',
        usages      : ['encrypt', 'decrypt'],
      };

      // Test importing the key and validate the result.
      const importResult = await keyStore.importKey({ key: testKey });
      expect(importResult).to.be.a.string;

      // Verify the key is present in the key store.
      const storedKey = await keyStore.getKey({ id: importResult }) as ManagedKey;
      expect(storedKey.id).to.equal(importResult);
    });

    it('should throw an error when attempting to import a key that already exists', async () => {
      // Import the key and validate the result.
      const importResult = await keyStore.importKey({ key: testKey });
      expect(importResult).to.equal(testKey.id);

      // Test importing the key and assert it throws an error.
      const importKey = keyStore.importKey({ key: testKey });
      await expect(importKey).to.eventually.be.rejectedWith(Error, 'Key with ID already exists');
    });
  });

  describe('listKeys()', () => {
    it('should return an array of all keys in the store', async () => {
      // Define multiple keys to be added.
      const testKeys = [
        { ...testKey, ...{ id: 'key-1' }},
        { ...testKey, ...{ id: 'key-2' }},
        { ...testKey, ...{ id: 'key-3' }}
      ];

      // Import the keys into the store.
      for (let key of testKeys) {
        await keyStore.importKey({ key });
      }

      // List keys and verify the result.
      const storedKeys = await keyStore.listKeys();
      expect(storedKeys).to.deep.equal(testKeys);
    });

    it('should return an empty array if the store contains no keys', async () => {
      // List keys and verify the result is empty.
      const storedKeys = await keyStore.listKeys();
      expect(storedKeys).to.be.empty;
    });
  });

  describe('updateKey()', () => {
    it('should update the alias for a key when given', async () => {
      // Import a key so we have something to update.
      const importResult = await keyStore.importKey({ key: testKey });
      expect(importResult).to.equal(testKey.id);

      // Attempt to update the key.
      const newAlias = 'did:method:new';
      const updateResult = await keyStore.updateKey({ id: testKey.id, alias: newAlias });

      // Verify that the alias property was updated.
      expect(updateResult).to.be.true;
      const storedKey = await keyStore.getKey({ id: testKey.id });
      expect(storedKey).to.have.property('alias', newAlias);
    });

    it('should update the metadata for a key when given', async () => {
      // Import a key so we have something to update.
      const importResult = await keyStore.importKey({ key: testKey });
      expect(importResult).to.equal(testKey.id);

      // Attempt to update the key.
      const newMetadata = { foo: 'bar' };
      const updateResult = await keyStore.updateKey({ id: testKey.id, metadata: newMetadata });

      // Verify that the metadata property was updated.
      expect(updateResult).to.be.true;
      const storedKey = await keyStore.getKey({ id: testKey.id });
      if ('privateKey' in storedKey!) throw new Error('Expected ManagedKey and not ManagedKeyPair');
      expect(storedKey!.metadata).to.deep.equal(newMetadata);
    });

    it('should update the alias and metadata for a key when given', async () => {
      // Import a key so we have something to update.
      const importResult = await keyStore.importKey({ key: testKey });
      expect(importResult).to.equal(testKey.id);

      // Attempt to update the key.
      const newAlias = 'did:method:new';
      const newMetadata = { foo: 'bar' };
      const updateResult = await keyStore.updateKey({
        id       : testKey.id,
        alias    : newAlias,
        metadata : newMetadata
      });

      // Verify that the alias and metadata properties were updated.
      expect(updateResult).to.be.true;
      const storedKey = await keyStore.getKey({ id: testKey.id });
      if ('privateKey' in storedKey!) throw new Error('Expected ManagedKey and not ManagedKeyPair');
      expect(storedKey).to.have.property('alias', newAlias);
      expect(storedKey!.metadata).to.deep.equal(newMetadata);
    });

    it('should update the alias and metadata for a key pair when given', async () => {
      // Import a key pair so we have something to update.
      const importResult = await keyStore.importKey({ key: testKeyPair });
      expect(importResult).to.equal(testKeyPair.publicKey.id);

      // Attempt to update the key pair.
      const newAlias = 'did:method:new';
      const newMetadata = { foo: 'bar' };
      const updateResult = await keyStore.updateKey({
        id       : testKeyPair.publicKey.id,
        alias    : newAlias,
        metadata : newMetadata
      });

      // Verify that the alias and metadata properties were updated.
      expect(updateResult).to.be.true;
      const storedKeyPair = await keyStore.getKey({ id: testKeyPair.publicKey.id });
      if (!('publicKey' in storedKeyPair!)) throw new Error('Expected ManagedKeyPair and not ManagedKey');
      expect(storedKeyPair!.publicKey).to.have.property('alias', newAlias);
      expect(storedKeyPair!.publicKey.metadata).to.deep.equal(newMetadata);
    });

    it('should not ovewrite key properties if given values are undefined', async () => {
      // Import a key so we have something to update.
      const importResult = await keyStore.importKey({ key: testKey });
      expect(importResult).to.equal(testKey.id);

      // Attempt to update the key.
      const newAlias = undefined;
      const newMetadata = { /* empty */ };
      const updateResult = await keyStore.updateKey({
        id       : testKey.id,
        alias    : newAlias,
        metadata : newMetadata
      });

      // Verify that no properties were updated.
      expect(updateResult).to.be.true;
      const storedKey = await keyStore.getKey({ id: testKey.id });
      expect(storedKey).to.deep.equal(testKey);
    });

    it('should return false when attempting to update a non-existent key', async () => {
      // Attempt to update a non-existent key.
      const updateResult = await keyStore.updateKey({
        id       : 'non-existent',
        alias    : 'did:method:a1',
        metadata : { foo: 'bar' }
      });

      // Verify that the update operation was not successful.
      expect(updateResult).to.be.false;
    });
  });
});

describe('PrivateKeyStoreDwn', () => {
  let agentDid: PortableDid;
  let agentSigningKey: Web5Crypto.CryptoKeyPair;
  let keyMaterial: Uint8Array;
  let kmsKeyStore: KeyStoreDwn;
  let kmsPrivateKeyStore: PrivateKeyStoreDwn;
  let testAgent: TestAgent;
  let testKey: Omit<ManagedPrivateKey, 'id'>;

  before(async () => {
    testAgent = await TestAgent.create();
  });

  beforeEach(async () => {
    agentDid = await DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });
    const privateCryptoKey = await Jose.jwkToCryptoKey({ key: agentDid.keySet.verificationMethodKeys![0].privateKeyJwk! });
    const publicCryptoKey = await Jose.jwkToCryptoKey({ key: agentDid.keySet.verificationMethodKeys![0].publicKeyJwk! });

    agentSigningKey = {
      privateKey : privateCryptoKey,
      publicKey  : publicCryptoKey
    };

    // Instantiate a local KMS with in-memory key stores.
    const localKmsMemory = new LocalKms({ kmsName: 'memory' });

    // Instantiate a local KMS with DWN-backed key stores.
    kmsKeyStore = new KeyStoreDwn({ schema: 'https://identity.foundation/schemas/web5/kms-key' });
    kmsPrivateKeyStore = new PrivateKeyStoreDwn();
    const localKmsDwn = new LocalKms({
      kmsName         : 'local',
      keyStore        : kmsKeyStore,
      privateKeyStore : kmsPrivateKeyStore
    });

    // Insntiate KeyManager with in-memory and DWN-backed KMSs.
    const keyManagerStore = new KeyStoreDwn({ schema: 'https://identity.foundation/schemas/web5/managed-key' });
    const keyManager = new KeyManager({
      kms: {
        local  : localKmsDwn,
        memory : localKmsMemory
      },
      store: keyManagerStore
    });
    // Set the agent context for KeyManager and all KMSs.
    keyManager.agent = testAgent;

    // Replace the TestAgent's KeyManager instance with the custom instance.
    testAgent.keyManager = keyManager;

    // Convert the CryptoKeyPair object to a PortableKeyPair.
    const defaultSigningKey = cryptoToPortableKeyPair({
      cryptoKeyPair : agentSigningKey,
      keyData       : {
        alias : await testAgent.didManager.getDefaultSigningKey({ did: agentDid.did }),
        kms   : 'memory'
      }
    });

    // Import the Agent's signing key pair to the in-memory KMS key stores.
    await testAgent.keyManager.setDefaultSigningKey({ key: defaultSigningKey });

    // Set the Agent's DID
    testAgent.agentDid = agentDid.did;

    // Key to use for testing.
    keyMaterial = new Uint8Array([1, 2, 3]);
    testKey = {
      material : new Uint8Array([1, 2, 3]),
      type     : 'private',
    };
  });

  afterEach(async () => {
    await testAgent.clearStorage();
  });

  after(async () => {
    await testAgent.closeStorage();
  });

  describe('deleteKey()', () => {
    let importedKeyPairId: string;

    beforeEach(async () => {
      // Generate a key pair to import.
      const randomKeyPair = await new EdDsaAlgorithm().generateKey({
        algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
        extractable : true,
        keyUsages   : ['sign', 'verify']
      });

      // Import the private key to the in-memory private key store.
      const importedPrivateKeyId = await kmsPrivateKeyStore.importKey({
        agent : testAgent,
        key   : {
          material : randomKeyPair.privateKey.material,
          type     : 'private'
        }
      });

      // And finally, attempt to import the key into the DWN-backed key store.
      importedKeyPairId = await kmsKeyStore.importKey({
        agent : testAgent,
        key   : {
          privateKey : { ...randomKeyPair.privateKey, id: importedPrivateKeyId, kms: 'local', state: 'Enabled' },
          publicKey  : { ...randomKeyPair.publicKey, id: importedPrivateKeyId, kms: 'local', material: randomKeyPair.publicKey.material, state: 'Enabled' }
        }
      });
    });

    it('deletes key and returns true if key exists', async () => {
      // Import the key and get back the assigned ID.
      const id = await kmsPrivateKeyStore.importKey({ key: testKey, agent: testAgent });

      // Test deleting the key and validate the result.
      const deleteResult = await kmsPrivateKeyStore.deleteKey({ id, agent: testAgent });
      expect(deleteResult).to.be.true;

      // Verify the key is no longer in the store.
      const storedKey = await kmsPrivateKeyStore.getKey({ id, agent: testAgent });
      expect(storedKey).to.be.undefined;
    });

    it('returns false if key does not exist', async () => {
      // Test deleting the key.
      const deleteResult = await kmsPrivateKeyStore.deleteKey({ id: 'non-existent-key', agent: testAgent });

      // Validate the key was deleted.
      expect(deleteResult).to.be.false;
    });

    it('throws an error if Agent DID is undefined and no context was specified', async () => {
      // Unset the Agent DID.
      testAgent.agentDid = undefined;
      await expect(
        kmsPrivateKeyStore.deleteKey({ id: importedKeyPairId, agent: testAgent })
      ).to.eventually.be.rejectedWith(Error, `Agent property 'agentDid' is undefined and no context was specified`);
    });
  });

  describe('findKey()', async () => {
    it('throws a not implemented error', async () => {
      await expect(
        kmsPrivateKeyStore.findKey()
      ).to.eventually.be.rejectedWith(Error, 'Method not implemented');
    });
  });

  describe('getKey()', () => {
    let importedPrivateKeyId: string;

    beforeEach(async () => {
      // Import the private key to the in-memory private key store.
      importedPrivateKeyId = await kmsPrivateKeyStore.importKey({
        agent : testAgent,
        key   : testKey
      });
    });

    it('should return a key if it exists', async () => {
      // Test getting the key.
      const storedKey = await kmsPrivateKeyStore.getKey({ id: importedPrivateKeyId, agent: testAgent });

      // Verify the key is in the store.
      expect(storedKey).to.deep.equal({ id: importedPrivateKeyId, material: keyMaterial, type: 'private' });
    });

    it('should return undefined if the specified key does not exist', async () => {
      // Test getting the key.
      const storedKey = await kmsPrivateKeyStore.getKey({ id: 'non-existent-key', agent: testAgent });

      // Verify the key is no longer in the store.
      expect(storedKey).to.be.undefined;
    });

    it('throws an error if Agent DID is undefined and no context was specified', async () => {
      // Unset the Agent DID.
      testAgent.agentDid = undefined;
      await expect(
        kmsPrivateKeyStore.getKey({ id: importedPrivateKeyId, agent: testAgent })
      ).to.eventually.be.rejectedWith(Error, `Agent property 'agentDid' is undefined and no context was specified`);
    });
  });

  describe('importKey()', () => {
    it('should import a private key and return its ID', async () => {
      // Import the private key to the in-memory private key store.
      const importedPrivateKeyId = await kmsPrivateKeyStore.importKey({
        agent : testAgent,
        key   : testKey
      });

      // Validate the returned id.
      expect(importedPrivateKeyId).to.be.a('string');

      // Verify the key is present in the private key store.
      const storedKey = await kmsPrivateKeyStore.getKey({ id: importedPrivateKeyId, agent: testAgent });
      expect(storedKey).to.deep.equal({ id: importedPrivateKeyId, material: keyMaterial, type: 'private' });
    });

    it('should throw an error if required parameters are missing', async () => {
      // Missing 'material'.
      const keyMissingMaterial = { type: 'private' };
      await expect(kmsPrivateKeyStore.importKey({
        agent : testAgent,
        // @ts-expect-error because the material property is intentionally omitted to trigger an error.
        key   : keyMissingMaterial
      })).to.eventually.be.rejectedWith(TypeError, `Required parameter missing: 'material'`);

      // Missing 'type'.
      const keyMissingType = { material: new Uint8Array(8) };
      await expect(kmsPrivateKeyStore.importKey({
        agent : testAgent,
        // @ts-expect-error because the type property is intentionally omitted to trigger an error.
        key   : keyMissingType
      })).to.eventually.be.rejectedWith(TypeError, `Required parameter missing: 'type'`);
    });

    it('throws an error if Agent DID is undefined and no context was specified', async () => {
      // Unset the Agent DID.
      testAgent.agentDid = undefined;
      await expect(
        kmsPrivateKeyStore.importKey({ key: testKey, agent: testAgent })
      ).to.eventually.be.rejectedWith(Error, `Agent property 'agentDid' is undefined and no context was specified`);
    });
  });

  describe('listKeys()', function() {
    it('should return an array of all keys in the store', async function() {
      // Define multiple keys to be added.
      const testKeys = [
        { ...testKey, material: (new Uint8Array([1, 2, 3]))},
        { ...testKey, material: (new Uint8Array([1, 2, 3]))},
        { ...testKey, material: (new Uint8Array([1, 2, 3]))}
      ];

      // Import the keys into the store.
      const importedKeys: Map<string, ManagedPrivateKey> = new Map();
      for (let key of testKeys) {
        const id = await kmsPrivateKeyStore.importKey({ key, agent: testAgent });
        importedKeys.set(id, { ...key, id });
      }

      const storedKeys = await kmsPrivateKeyStore.listKeys({ agent: testAgent });
      expect(storedKeys).to.have.length(3);
      for (const storedKey of storedKeys) {
        expect(importedKeys.get(storedKey.id)).to.deep.equal(storedKey);
      }
    });

    it('should return an empty array if the store contains no keys', async function() {
      // List keys and verify the result is empty.
      const storedKeys = await kmsPrivateKeyStore.listKeys({ agent: testAgent });
      expect(storedKeys).to.be.empty;
    });

    it('throws an error if Agent DID is undefined and no context was specified', async () => {
      // Unset the Agent DID.
      testAgent.agentDid = undefined;
      await expect(
        kmsPrivateKeyStore.listKeys({ agent: testAgent })
      ).to.eventually.be.rejectedWith(Error, `Agent property 'agentDid' is undefined and no context was specified`);
    });
  });

  describe('updateKey()', async () => {
    it('throws a not implemented error', async () => {
      await expect(
        kmsPrivateKeyStore.updateKey()
      ).to.eventually.be.rejectedWith(Error, 'Method not implemented');
    });
  });

  describe('data integrity', () => {
    it('imports and gets stored private key data without any alterations', async () => {
      // Generate a key pair to import.
      const randomKeyPair = await new EdDsaAlgorithm().generateKey({
        algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
        extractable : true,
        keyUsages   : ['sign', 'verify']
      });

      // Import the private key to the in-memory private key store.
      const importedPrivateKeyId = await kmsPrivateKeyStore.importKey({
        agent : testAgent,
        key   : {
          material : randomKeyPair.privateKey.material,
          type     : 'private'
        }
      });

      // Retrieve the private key.
      const storedPrivateKey = await kmsPrivateKeyStore.getKey({ id: importedPrivateKeyId, agent: testAgent });
      expect(storedPrivateKey?.material).to.deep.equal(randomKeyPair.privateKey.material);
    });
  });

  describe('with LocalKms', () => {
    it('imports private key data', async () => {
      // Generate a key pair to import.
      const randomKeyPair = await new EdDsaAlgorithm().generateKey({
        algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
        extractable : true,
        keyUsages   : ['sign', 'verify']
      });
      const portableKeyPair = cryptoToPortableKeyPair({
        cryptoKeyPair : randomKeyPair,
        keyData       : {
          kms: 'local'
        }
      });
      const importedKeyPair = await testAgent.keyManager.importKey(portableKeyPair);
      if (!isManagedKeyPair(importedKeyPair)) throw new Error('Type guard unexpectedly threw'); // Type guard.
      expect(importedKeyPair.privateKey.id).to.be.a.string;
      expect(importedKeyPair.publicKey.id).to.be.a.string;
      expect(importedKeyPair.publicKey.material).to.deep.equal(randomKeyPair.publicKey.material);
    });
  });
});

describe('PrivateKeyStoreMemory', () => {
  let kmsPrivateKeyStore: PrivateKeyStoreMemory;
  let testKey: Omit<ManagedPrivateKey, 'id'>;
  let keyMaterial: Uint8Array;

  beforeEach(() => {
    kmsPrivateKeyStore = new PrivateKeyStoreMemory();

    keyMaterial = (new Uint8Array([1, 2, 3]));
    testKey = {
      material : (new Uint8Array([1, 2, 3])),
      type     : 'private',
    };
  });

  describe('deleteKey()', () => {
    it('should delete key and return true if key exists', async () => {
      // Import the key and get back the assigned ID.
      const id = await kmsPrivateKeyStore.importKey({ key: testKey });

      // Test deleting the key and validate the result.
      const deleteResult = await kmsPrivateKeyStore.deleteKey({ id });
      expect(deleteResult).to.be.true;

      // Verify the key is no longer in the store.
      const storedKey = await kmsPrivateKeyStore.getKey({ id });
      expect(storedKey).to.be.undefined;
    });

    it('should return false if key does not exist', async () => {
      // Test deleting the key.
      const deleteResult = await kmsPrivateKeyStore.deleteKey({ id: 'non-existent-key' });

      // Validate the key was deleted.
      expect(deleteResult).to.be.false;
    });
  });

  describe('findKey()', async () => {
    it('throws a not implemented error', async () => {
      await expect(
        kmsPrivateKeyStore.findKey()
      ).to.eventually.be.rejectedWith(Error, 'Method not implemented');
    });
  });

  describe('getKey()', () => {
    it('should return a key if it exists', async () => {
      // Import the key.
      const id = await kmsPrivateKeyStore.importKey({ key: testKey });

      // Test getting the key.
      const storedKey = await kmsPrivateKeyStore.getKey({ id });

      // Verify the key is in the store.
      expect(storedKey).to.deep.equal({ id, material: keyMaterial, type: 'private' });
    });

    it('should return undefined if the specified key does not exist', async () => {
      // Test getting the key.
      const storedKey = await kmsPrivateKeyStore.getKey({ id: 'non-existent-key' });

      // Verify the key is no longer in the store.
      expect(storedKey).to.be.undefined;
    });
  });

  describe('importKey()', () => {
    it('should import a private key and return its ID', async () => {
      // Test importing the key.
      const id = await kmsPrivateKeyStore.importKey({ key: testKey });

      // Validate the returned id.
      expect(id).to.be.a('string');

      // Verify the key is present in the private key store.
      const storedKey = await kmsPrivateKeyStore.getKey({ id });
      expect(storedKey).to.deep.equal({ id, material: keyMaterial, type: 'private' });
    });

    it('should permanently transfer the private key material', async () => {
      // Test importing the key.
      await kmsPrivateKeyStore.importKey({ key: testKey });

      // Verify that attempting to access the key material after import triggers an error.
      // Chrome, Firefox, Node.js, and Firefox report different error messages but all contain 'detached'.
      expect(() => new Uint8Array(testKey.material)).to.throw(TypeError, 'detached');
    });

    it('should throw an error if required parameters are missing', async () => {
      // Missing 'material'.
      const keyMissingMaterial = { type: 'private' };
      await expect(kmsPrivateKeyStore.importKey({
        // @ts-expect-error because the material property is intentionally omitted to trigger an error.
        key: keyMissingMaterial
      })).to.eventually.be.rejectedWith(TypeError, `Required parameter missing: 'material'`);

      // Missing 'type'.
      const keyMissingType = { material: new Uint8Array(8) };
      await expect(kmsPrivateKeyStore.importKey({
        // @ts-expect-error because the type property is intentionally omitted to trigger an error.
        key: keyMissingType
      })).to.eventually.be.rejectedWith(TypeError, `Required parameter missing: 'type'`);
    });
  });

  describe('listKeys()', function() {
    it('should return an array of all keys in the store', async function() {
      // Define multiple keys to be added.
      const testKeys = [
        { ...testKey, material: (new Uint8Array([1, 2, 3]))},
        { ...testKey, material: (new Uint8Array([1, 2, 3]))},
        { ...testKey, material: (new Uint8Array([1, 2, 3]))}
      ];

      // Import the keys into the store.
      const expectedTestKeys: ManagedPrivateKey[] = [];
      for (let key of testKeys) {
        const id = await kmsPrivateKeyStore.importKey({ key });
        expectedTestKeys.push({ id, material: keyMaterial, type: 'private', });
      }

      const storedKeys = await kmsPrivateKeyStore.listKeys();
      expect(storedKeys).to.deep.equal(expectedTestKeys);
    });

    it('should return an empty array if the store contains no keys', async function() {
      // List keys and verify the result is empty.
      const storedKeys = await kmsPrivateKeyStore.listKeys();
      expect(storedKeys).to.be.empty;
    });
  });

  describe('updateKey()', async () => {
    it('throws a not implemented error', async () => {
      await expect(
        kmsPrivateKeyStore.updateKey()
      ).to.eventually.be.rejectedWith(Error, 'Method not implemented');
    });
  });
});