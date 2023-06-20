import type { KeyManagerOptions } from '../src/key-manager.js';
import type { ManagedKey, ManagedKeyPair, ManagedPrivateKey } from '../src/types-key-manager.js';

import { expect } from 'chai';

import { KeyManager } from '../src/key-manager.js';
import { MemoryKeyStore } from '../src/key-store-memory.js';
import { KeyManagerStore } from '../src/key-manager-store.js';
import { DefaultKms, KmsKeyStore, KmsPrivateKeyStore } from '../src/kms/default/index.js';

describe('KeyManager', () => {
  let keyManager: KeyManager;
  let keyManagerStore: KeyManagerStore;
  let defaultKms: DefaultKms;
  let kmsKeyStore: KmsKeyStore;
  let kmsPrivateKeyStore: KmsPrivateKeyStore;

  beforeEach(() => {
    // Instantiate in-memory store for KMS key metadata and public keys.
    const kmsMemoryKeyStore = new MemoryKeyStore<string, ManagedKey | ManagedKeyPair>();
    kmsKeyStore = new KmsKeyStore(kmsMemoryKeyStore);

    // Instantiate in-memory store for KMS private keys.
    const memoryPrivateKeyStore = new MemoryKeyStore<string, ManagedPrivateKey>();
    kmsPrivateKeyStore = new KmsPrivateKeyStore(memoryPrivateKeyStore);

    // Instantiate default KMS using key stores.
    defaultKms = new DefaultKms('default', kmsKeyStore, kmsPrivateKeyStore);

    // Instantiate in-memory store for KeyManager key metadata.
    const kmMemoryKeyStore = new MemoryKeyStore<string, ManagedKey | ManagedKeyPair>();
    keyManagerStore = new KeyManagerStore({ store: kmMemoryKeyStore });

    const options: KeyManagerOptions = {
      store : keyManagerStore,
      kms   : { default: defaultKms },
    };

    keyManager = new KeyManager(options);
  });

  describe('constructor', () => {
    it('throws an exception if store and kms inputs are missing', async () => {
      // @ts-expect-error because KeyManager is intentionally instantiated without required properties.
      expect(() => new KeyManager()).to.throw(TypeError);
    });

    it('throws an exception if store is missing', async () => {
      // @ts-expect-error because KeyManager is intentionally instantiated without required properties.
      expect(() => new KeyManager({ kms: { default: defaultKms } })).to.throw(TypeError, 'Required parameter was missing');
    });

    it('will use a default KMS if kms is not specified', async () => {
      keyManager = new KeyManager({ store: keyManagerStore });

      const kmsList = keyManager.listKms();
      expect(kmsList[0]).to.equal('default');
    });
  });

  describe('instances', () => {
    it('should not be possible to externally access the KeyManager store', async () => {
      /**
       * Note: It isn't possible to test that trying to access keyMgr.#store will throw a SyntaxError.
       * In JavaScript, a SyntaxError is thrown when parsing code before it is executed. This makes it
       * different from runtime exceptions (like TypeError, ReferenceError, etc.), which occur during
       * the execution of the code. This means you can't catch a SyntaxError with a try-catch block in
       * the same script, because the error is thrown before the script is run.
       */
      const hasPrivateStoreField = Object.getOwnPropertyNames(keyManager).includes('#store');
      expect(hasPrivateStoreField).to.be.false;
    });
  });

  describe('generateKey()', () => {
    it('creates key pairs', async () => {
      const keys = await keyManager.generateKey({
        algorithm : { name: 'ECDSA', namedCurve: 'secp256k1' },
        keyUsages : ['sign', 'verify']
      }) as ManagedKeyPair;

      expect(keys).to.have.property('privateKey');
      expect(keys).to.have.property('publicKey');
      expect(keys.privateKey.id).to.equal(keys!.publicKey!.id);

      // Check values that are identical for both keys in the pair.
      expect(keys.privateKey.algorithm.name).to.equal('ECDSA');
      expect(keys.publicKey.algorithm.name).to.equal('ECDSA');
      if (!('namedCurve' in keys.privateKey.algorithm)) throw new Error; // type guard
      if (!('namedCurve' in keys.publicKey.algorithm)) throw new Error; // type guard
      expect(keys.privateKey.algorithm.namedCurve).to.equal('secp256k1');
      expect(keys.publicKey.algorithm.namedCurve).to.equal('secp256k1');
      if (!('compressedPublicKey' in keys.privateKey.algorithm)) throw new Error; // type guard
      if (!('compressedPublicKey' in keys.publicKey.algorithm)) throw new Error; // type guard
      expect(keys.privateKey.algorithm.compressedPublicKey).to.be.true;
      expect(keys.publicKey.algorithm.compressedPublicKey).to.be.true;
      expect(keys.privateKey.kms).to.equal('default');
      expect(keys.publicKey.kms).to.equal('default');
      expect(keys.privateKey.spec).to.be.undefined;
      expect(keys.publicKey.spec).to.be.undefined;
      expect(keys.privateKey.state).to.equal('Enabled');
      expect(keys.publicKey.state).to.equal('Enabled');

      // Check values unique to the private key.
      expect(keys.privateKey.material).to.be.undefined;
      expect(keys.privateKey.type).to.equal('private');
      expect(keys.privateKey.usages).to.deep.equal(['sign']);

      // Check values unique to the public key.
      expect(keys.publicKey.material).to.be.an.instanceOf(ArrayBuffer);
      if (!keys.publicKey.material) throw new Error; // type guard
      expect(keys.publicKey.material.byteLength).to.equal(33);
      expect(keys.publicKey.type).to.equal('public');
      expect(keys.publicKey.usages).to.deep.equal(['verify']);
    });
  });
});