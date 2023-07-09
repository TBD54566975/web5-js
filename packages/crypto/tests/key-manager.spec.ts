import type { KeyManagerOptions } from '../src/key-manager/index.js';
import type { ManagedKey, ManagedKeyPair, ManagedPrivateKey, Web5Crypto } from '../src/types/index.js';

import { expect } from 'chai';
import { MemoryStore } from '@tbd54566975/common';

import { KeyManager, KeyManagerStore } from '../src/key-manager/index.js';
import { LocalKms, KmsKeyStore, KmsPrivateKeyStore } from '../src/kms-local/index.js';

describe('KeyManager', () => {
  let keyManager: KeyManager;
  let keyManagerStore: KeyManagerStore;
  let localKms: LocalKms;
  let kmsKeyStore: KmsKeyStore;
  let kmsPrivateKeyStore: KmsPrivateKeyStore;

  beforeEach(() => {
    // Instantiate in-memory store for KMS key metadata and public keys.
    const kmsMemoryStore = new MemoryStore<string, ManagedKey | ManagedKeyPair>();
    kmsKeyStore = new KmsKeyStore(kmsMemoryStore);

    // Instantiate in-memory store for KMS private keys.
    const memoryPrivateKeyStore = new MemoryStore<string, ManagedPrivateKey>();
    kmsPrivateKeyStore = new KmsPrivateKeyStore(memoryPrivateKeyStore);

    // Instantiate local KMS using key stores.
    localKms = new LocalKms('local', kmsKeyStore, kmsPrivateKeyStore);

    // Instantiate in-memory store for KeyManager key metadata.
    const kmMemoryStore = new MemoryStore<string, ManagedKey | ManagedKeyPair>();
    keyManagerStore = new KeyManagerStore({ store: kmMemoryStore });

    const options: KeyManagerOptions = {
      store : keyManagerStore,
      kms   : { local: localKms },
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
      expect(() => new KeyManager({ kms: { local: localKms } })).to.throw(TypeError, 'Required parameter was missing');
    });

    it('will use a local KMS if kms is not specified', async () => {
      keyManager = new KeyManager({ store: keyManagerStore });

      const kmsList = keyManager.listKms();
      expect(kmsList[0]).to.equal('local');
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

  describe('decrypt()', () => {
    let key: ManagedKey;

    beforeEach(async () => {
      key = await keyManager.generateKey({
        algorithm   : { name: 'AES-CTR', length: 128 },
        extractable : false,
        keyUsages   : ['encrypt', 'decrypt']
      });
    });

    it('decrypts data', async () => {
      const plaintext = await keyManager.decrypt({
        algorithm: {
          name    : 'AES-CTR',
          counter : new ArrayBuffer(16),
          length  : 128
        },
        keyRef : key.id,
        data   : new Uint8Array([1, 2, 3, 4])
      });

      expect(plaintext).to.be.instanceOf(ArrayBuffer);
      expect(plaintext.byteLength).to.equal(4);
    });

    it('accepts input data as ArrayBuffer, DataView, and TypedArray', async () => {
      const algorithm = { name: 'AES-CTR', counter: new ArrayBuffer(16), length: 128 };
      const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      let plaintext: ArrayBuffer;

      // ArrayBuffer
      const dataArrayBuffer = dataU8A.buffer;
      plaintext = await keyManager.decrypt({ algorithm, keyRef: key.id, data: dataArrayBuffer });
      expect(plaintext).to.be.instanceOf(ArrayBuffer);

      // DataView
      const dataView = new DataView(dataArrayBuffer);
      plaintext = await keyManager.decrypt({ algorithm, keyRef: key.id, data: dataView });
      expect(plaintext).to.be.instanceOf(ArrayBuffer);

      // TypedArray - Uint8Array
      plaintext = await keyManager.decrypt({ algorithm, keyRef: key.id, data: dataU8A });
      expect(plaintext).to.be.instanceOf(ArrayBuffer);

      // TypedArray - Int32Array
      const dataI32A = new Int32Array([10, 20, 30, 40]);
      plaintext = await keyManager.decrypt({ algorithm, keyRef: key.id, data: dataI32A });
      expect(plaintext).to.be.instanceOf(ArrayBuffer);

      // TypedArray - Uint32Array
      const dataU32A = new Uint32Array([8, 7, 6, 5, 4, 3, 2, 1]);
      plaintext = await keyManager.decrypt({ algorithm, keyRef: key.id, data: dataU32A });
      expect(plaintext).to.be.instanceOf(ArrayBuffer);
    });

    it('decrypts data with AES-CTR', async () => {
      const plaintext = await keyManager.decrypt({
        algorithm: {
          name    : 'AES-CTR',
          counter : new ArrayBuffer(16),
          length  : 128
        },
        keyRef : key.id,
        data   : new Uint8Array([1, 2, 3, 4])
      });

      expect(plaintext).to.be.instanceOf(ArrayBuffer);
      expect(plaintext.byteLength).to.equal(4);
    });

    it('throws an error when key reference is not found', async () => {
      await expect(keyManager.decrypt({
        algorithm: {
          name    : 'AES-CTR',
          counter : new ArrayBuffer(16),
          length  : 128
        },
        keyRef : 'non-existent-key',
        data   : new Uint8Array([1, 2, 3, 4])
      })).to.eventually.be.rejectedWith(Error, 'Key not found');
    });
  });

  describe('deriveBits()', () => {
    let otherPartyPublicKey: ManagedKey;
    let otherPartyPublicCryptoKey: Web5Crypto.CryptoKey;
    let ownPrivateKey: ManagedKey;

    beforeEach(async () => {
      const otherPartyKeyPair = await keyManager.generateKey({
        algorithm   : { name: 'ECDH', namedCurve: 'secp256k1' },
        extractable : false,
        keyUsages   : ['deriveBits']
      });
      otherPartyPublicKey = otherPartyKeyPair.publicKey;

      otherPartyPublicCryptoKey = {
        algorithm   : otherPartyPublicKey.algorithm,
        extractable : otherPartyPublicKey.extractable,
        handle      : otherPartyPublicKey.material!,
        type        : otherPartyPublicKey.type,
        usages      : otherPartyPublicKey.usages
      };

      const ownKeyPair = await keyManager.generateKey({
        algorithm   : { name: 'ECDH', namedCurve: 'secp256k1' },
        extractable : false,
        keyUsages   : ['deriveBits', 'deriveKey']
      });
      ownPrivateKey = ownKeyPair.privateKey;
    });

    it('generates shared secrets', async () => {
      const sharedSecret = await keyManager.deriveBits({
        algorithm  : { name: 'ECDH', publicKey: otherPartyPublicCryptoKey },
        baseKeyRef : ownPrivateKey.id
      });
      expect(sharedSecret).to.be.an('ArrayBuffer');
      expect(sharedSecret.byteLength).to.equal(32);
    });

    it(`accepts 'id' as a baseKey reference`, async () => {
      const sharedSecret = await keyManager.deriveBits({
        algorithm  : { name: 'ECDH', publicKey: otherPartyPublicCryptoKey },
        baseKeyRef : ownPrivateKey.id
      });
      expect(sharedSecret).to.be.an('ArrayBuffer');
      expect(sharedSecret.byteLength).to.equal(32);
    });

    it('generates ECDH secp256k1 shared secrets', async () => {
      const sharedSecret = await keyManager.deriveBits({
        algorithm  : { name: 'ECDH', publicKey: otherPartyPublicCryptoKey },
        baseKeyRef : ownPrivateKey.id
      });
      expect(sharedSecret).to.be.an('ArrayBuffer');
      expect(sharedSecret.byteLength).to.equal(32);
    });

    it('generates ECDH X25519 shared secrets', async () => {
      const otherPartyKeyPair = await keyManager.generateKey({
        algorithm   : { name: 'ECDH', namedCurve: 'X25519' },
        extractable : false,
        keyUsages   : ['deriveBits']
      });
      otherPartyPublicKey = otherPartyKeyPair.publicKey;

      otherPartyPublicCryptoKey = {
        algorithm   : otherPartyPublicKey.algorithm,
        extractable : otherPartyPublicKey.extractable,
        handle      : otherPartyPublicKey.material!,
        type        : otherPartyPublicKey.type,
        usages      : otherPartyPublicKey.usages
      };

      const ownKeyPair = await keyManager.generateKey({
        algorithm   : { name: 'ECDH', namedCurve: 'X25519' },
        extractable : false,
        keyUsages   : ['deriveBits']
      });
      ownPrivateKey = ownKeyPair.privateKey;

      const sharedSecret = await keyManager.deriveBits({
        algorithm  : { name: 'ECDH', publicKey: otherPartyPublicCryptoKey },
        baseKeyRef : ownPrivateKey.id
      });
      expect(sharedSecret.byteLength).to.equal(32);
    });

    it('throws an error when baseKey reference is not found', async () => {
      await expect(keyManager.deriveBits({
        algorithm  : { name: 'ECDH', publicKey: otherPartyPublicCryptoKey },
        baseKeyRef : 'non-existent-id'
      })).to.eventually.be.rejectedWith(Error, 'Key not found');
    });
  });

  describe('encrypt()', () => {
    let key: ManagedKey;

    beforeEach(async () => {
      key = await keyManager.generateKey({
        algorithm   : { name: 'AES-CTR', length: 128 },
        extractable : false,
        keyUsages   : ['encrypt', 'decrypt']
      });
    });

    it('encrypts data', async () => {
      const ciphertext = await keyManager.encrypt({
        algorithm: {
          name    : 'AES-CTR',
          counter : new ArrayBuffer(16),
          length  : 128
        },
        keyRef : key.id,
        data   : new Uint8Array([1, 2, 3, 4])
      });

      expect(ciphertext).to.be.instanceOf(ArrayBuffer);
      expect(ciphertext.byteLength).to.equal(4);
    });

    it('accepts input data as ArrayBuffer, DataView, and TypedArray', async () => {
      const algorithm = { name: 'AES-CTR', counter: new ArrayBuffer(16), length: 128 };
      const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      let ciphertext: ArrayBuffer;

      // ArrayBuffer
      const dataArrayBuffer = dataU8A.buffer;
      ciphertext = await keyManager.encrypt({ algorithm, keyRef: key.id, data: dataArrayBuffer });
      expect(ciphertext).to.be.instanceOf(ArrayBuffer);

      // DataView
      const dataView = new DataView(dataArrayBuffer);
      ciphertext = await keyManager.encrypt({ algorithm, keyRef: key.id, data: dataView });
      expect(ciphertext).to.be.instanceOf(ArrayBuffer);

      // TypedArray - Uint8Array
      ciphertext = await keyManager.encrypt({ algorithm, keyRef: key.id, data: dataU8A });
      expect(ciphertext).to.be.instanceOf(ArrayBuffer);

      // TypedArray - Int32Array
      const dataI32A = new Int32Array([10, 20, 30, 40]);
      ciphertext = await keyManager.encrypt({ algorithm, keyRef: key.id, data: dataI32A });
      expect(ciphertext).to.be.instanceOf(ArrayBuffer);

      // TypedArray - Uint32Array
      const dataU32A = new Uint32Array([8, 7, 6, 5, 4, 3, 2, 1]);
      ciphertext = await keyManager.encrypt({ algorithm, keyRef: key.id, data: dataU32A });
      expect(ciphertext).to.be.instanceOf(ArrayBuffer);
    });

    it('encrypts data with AES-CTR', async () => {
      const ciphertext = await keyManager.encrypt({
        algorithm: {
          name    : 'AES-CTR',
          counter : new ArrayBuffer(16),
          length  : 128
        },
        keyRef : key.id,
        data   : new Uint8Array([1, 2, 3, 4])
      });

      expect(ciphertext).to.be.instanceOf(ArrayBuffer);
      expect(ciphertext.byteLength).to.equal(4);
    });

    it('throws an error when key reference is not found', async () => {
      await expect(keyManager.encrypt({
        algorithm: {
          name    : 'AES-CTR',
          counter : new ArrayBuffer(16),
          length  : 128
        },
        keyRef : 'non-existent-key',
        data   : new Uint8Array([1, 2, 3, 4])
      })).to.eventually.be.rejectedWith(Error, 'Key not found');
    });
  });

  describe('generateKey()', () => {
    it('creates valid key pairs', async () => {
      const keys = await keyManager.generateKey({
        algorithm : { name: 'ECDSA', namedCurve: 'secp256k1' },
        keyUsages : ['sign', 'verify']
      });

      expect(keys).to.have.property('privateKey');
      expect(keys).to.have.property('publicKey');
      expect(keys.privateKey.id).to.equal(keys.publicKey.id);

      // Check values that are identical for both keys in the pair.
      expect(keys.privateKey.algorithm.name).to.equal('ECDSA');
      expect(keys.publicKey.algorithm.name).to.equal('ECDSA');
      expect(keys.privateKey.kms).to.equal('local');
      expect(keys.publicKey.kms).to.equal('local');
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
      expect(keys.publicKey.type).to.equal('public');
      expect(keys.publicKey.usages).to.deep.equal(['verify']);
    });


    it('creates ECDH secp256k1 key pairs with compressed public keys, by default', async () => {
      const keys = await keyManager.generateKey({
        algorithm : { name: 'ECDH', namedCurve: 'secp256k1' },
        keyUsages : ['deriveBits', 'deriveKey']
      });

      // Check values that are identical for both keys in the pair.
      expect(keys.privateKey.algorithm.name).to.equal('ECDH');
      expect(keys.publicKey.algorithm.name).to.equal('ECDH');
      if (!('namedCurve' in keys.privateKey.algorithm)) throw new Error; // type guard
      if (!('namedCurve' in keys.publicKey.algorithm)) throw new Error; // type guard
      expect(keys.privateKey.algorithm.namedCurve).to.equal('secp256k1');
      expect(keys.publicKey.algorithm.namedCurve).to.equal('secp256k1');

      // Check values unique to the public key.
      if (!keys.publicKey.material) throw new Error; // type guard
      expect(keys.publicKey.material.byteLength).to.equal(33);
    });

    it('creates ECDH secp256k1 key pairs with uncompressed public keys, if specified', async () => {
      const keys = await keyManager.generateKey({
        algorithm : { name: 'ECDH', namedCurve: 'secp256k1', compressedPublicKey: false },
        keyUsages : ['deriveBits', 'deriveKey']
      });

      // Check values unique to the public key.
      if (!keys.publicKey.material) throw new Error; // type guard
      expect(keys.publicKey.material.byteLength).to.equal(65);
    });

    it('creates ECDSA secp256k1 key pairs with compressed public keys, by default', async () => {
      const keys = await keyManager.generateKey({
        algorithm : { name: 'ECDSA', namedCurve: 'secp256k1' },
        keyUsages : ['sign', 'verify']
      });

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

      // Check values unique to the public key.
      if (!keys.publicKey.material) throw new Error; // type guard
      expect(keys.publicKey.material.byteLength).to.equal(33);
    });

    it('creates ECDSA secp256k1 key pairs with uncompressed public keys, if specified', async () => {
      const keys = await keyManager.generateKey({
        algorithm : { name: 'ECDSA', namedCurve: 'secp256k1', compressedPublicKey: false },
        keyUsages : ['sign', 'verify']
      });

      // Check values unique to the public key.
      if (!keys.publicKey.material) throw new Error; // type guard
      expect(keys.publicKey.material.byteLength).to.equal(65);
    });

    it('creates EdDSA Ed25519 key pairs', async () => {
      const keys = await keyManager.generateKey({
        algorithm : { name: 'EdDSA', namedCurve: 'Ed25519' },
        keyUsages : ['sign', 'verify']
      });

      // Check values that are identical for both keys in the pair.
      expect(keys.privateKey.algorithm.name).to.equal('EdDSA');
      expect(keys.publicKey.algorithm.name).to.equal('EdDSA');
      if (!('namedCurve' in keys.privateKey.algorithm)) throw new Error; // type guard
      if (!('namedCurve' in keys.publicKey.algorithm)) throw new Error; // type guard
      expect(keys.privateKey.algorithm.namedCurve).to.equal('Ed25519');
      expect(keys.publicKey.algorithm.namedCurve).to.equal('Ed25519');

      // Check values unique to the public key.
      if (!keys.publicKey.material) throw new Error; // type guard
      expect(keys.publicKey.material.byteLength).to.equal(32);
    });

    it('ignores case of algorithm name', () => {
      let keys: ManagedKeyPair;

      ['eCdSa', 'ecdsa'].forEach(async (algorithmName) => {
        keys = await keyManager.generateKey({
          algorithm   : { name: algorithmName, namedCurve: 'secp256k1' },
          keyUsages   : ['sign', 'verify'],
          extractable : true,
        }) as ManagedKeyPair;

        expect(keys.privateKey.algorithm.name).to.equal('ECDSA');
        expect(keys.publicKey.algorithm.name).to.equal('ECDSA');
        if (!('namedCurve' in keys.privateKey.algorithm)) throw new Error; // type guard
        expect(keys.privateKey.algorithm.namedCurve).to.equal('secp256k1');
      });
    });
  });

  describe('getKey()', function() {
    it('returns the key if it exists in the store', async function() {
      // Prepopulate the store with a key.
      const importedPrivateKey = await keyManager.importKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : true,
        kms         : 'local',
        material    : new Uint8Array([1, 2, 3, 4]),
        type        : 'private',
        usages      : ['sign'],
      });

      const storedPrivateKey = await keyManager.getKey({ keyRef: importedPrivateKey.id });

      expect(storedPrivateKey).to.deep.equal(importedPrivateKey);
    });

    it('should return undefined if the key does not exist in the store', async function() {
      const keyRef = 'non-existent-key';

      const storedKey = await keyManager.getKey({ keyRef });

      expect(storedKey).to.be.undefined;
    });
  });

  describe('importKey()', () => {
    it('imports asymmetric key pairs', async () => {
      // Test importing the key and validate the result.
      const importedKeyPair = await keyManager.importKey({
        privateKey: {
          algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
          extractable : true,
          kms         : 'local',
          material    : new Uint8Array([1, 2, 3, 4]),
          type        : 'private',
          usages      : ['sign'],
        },
        publicKey: {
          algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
          extractable : true,
          kms         : 'local',
          material    : new Uint8Array([1, 2, 3, 4]),
          type        : 'public',
          usages      : ['verify'],
        }
      });
      expect(importedKeyPair).to.exist;

      // Verify the key is present in the key store.
      const storedKeyPair = await keyManager.getKey({ keyRef: importedKeyPair.privateKey.id }) as ManagedKeyPair;
      expect(storedKeyPair).to.deep.equal(importedKeyPair);

      expect(storedKeyPair).to.have.property('privateKey');
      expect(storedKeyPair).to.have.property('publicKey');
      expect(storedKeyPair.privateKey.id).to.equal(storedKeyPair.publicKey.id);

      // Check values that are identical for both storedKeyPair in the pair.
      expect(storedKeyPair.privateKey.algorithm.name).to.equal('ECDSA');
      expect(storedKeyPair.publicKey.algorithm.name).to.equal('ECDSA');
      expect(storedKeyPair.privateKey.kms).to.equal('local');
      expect(storedKeyPair.publicKey.kms).to.equal('local');
      expect(storedKeyPair.privateKey.spec).to.be.undefined;
      expect(storedKeyPair.publicKey.spec).to.be.undefined;
      expect(storedKeyPair.privateKey.state).to.equal('Enabled');
      expect(storedKeyPair.publicKey.state).to.equal('Enabled');

      // Check values unique to the private key.
      expect(storedKeyPair.privateKey.material).to.be.undefined;
      expect(storedKeyPair.privateKey.type).to.equal('private');
      expect(storedKeyPair.privateKey.usages).to.deep.equal(['sign']);

      // Check values unique to the public key.
      expect(storedKeyPair.publicKey.material).to.be.an.instanceOf(ArrayBuffer);
      expect(storedKeyPair.publicKey.type).to.equal('public');
      expect(storedKeyPair.publicKey.usages).to.deep.equal(['verify']);
    });

    it('imports asymmetric private keys', async () => {
      // Test importing the key and validate the result.
      const importedPrivateKey = await keyManager.importKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : true,
        kms         : 'local',
        material    : new Uint8Array([1, 2, 3, 4]),
        type        : 'private',
        usages      : ['sign'],
      });
      expect(importedPrivateKey.kms).to.equal('local');
      expect(importedPrivateKey).to.exist;

      // Verify the key is present in the key store.
      const storedPrivateKey = await keyManager.getKey({ keyRef: importedPrivateKey.id }) as ManagedKey;
      expect(storedPrivateKey).to.deep.equal(importedPrivateKey);

      // Validate the expected values.
      expect(storedPrivateKey.algorithm.name).to.equal('ECDSA');
      expect(storedPrivateKey.kms).to.equal('local');
      expect(storedPrivateKey.spec).to.be.undefined;
      expect(storedPrivateKey.state).to.equal('Enabled');
      expect(storedPrivateKey.material).to.be.undefined;
      expect(storedPrivateKey.type).to.equal('private');
      expect(storedPrivateKey.usages).to.deep.equal(['sign']);
    });

    it('imports asymmetric public keys', async () => {
      // Test importing the key and validate the result.
      const importedPublicKey = await keyManager.importKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : true,
        kms         : 'local',
        material    : new Uint8Array([1, 2, 3, 4]),
        type        : 'public',
        usages      : ['verify'],
      });
      expect(importedPublicKey.kms).to.equal('local');
      expect(importedPublicKey).to.exist;

      // Verify the key is present in the key store.
      const storedPublicKey = await keyManager.getKey({ keyRef: importedPublicKey.id }) as ManagedKey;
      expect(storedPublicKey).to.deep.equal(importedPublicKey);

      // Validate the expected values.
      expect(storedPublicKey.algorithm.name).to.equal('ECDSA');
      expect(storedPublicKey.kms).to.equal('local');
      expect(storedPublicKey.spec).to.be.undefined;
      expect(storedPublicKey.state).to.equal('Enabled');
      expect(storedPublicKey.material).to.be.an.instanceOf(ArrayBuffer);
      expect(storedPublicKey.type).to.equal('public');
      expect(storedPublicKey.usages).to.deep.equal(['verify']);
    });

    it('imports symmetric keys', async () => {
      // Test importing the key and validate the result.
      const importedSecretKey = await keyManager.importKey({
        algorithm   : { name: 'AES-CTR', length: 128 },
        extractable : true,
        kms         : 'local',
        material    : new Uint8Array([1, 2, 3, 4]),
        type        : 'secret',
        usages      : ['encrypt', 'decrypt'],
      });
      expect(importedSecretKey.kms).to.equal('local');
      expect(importedSecretKey).to.exist;

      // Verify the key is present in the key store.
      const storedSecretKey = await keyManager.getKey({ keyRef: importedSecretKey.id }) as ManagedKey;
      expect(storedSecretKey).to.deep.equal(importedSecretKey);

      // Validate the expected values.
      expect(storedSecretKey.algorithm.name).to.equal('AES-CTR');
      expect(storedSecretKey.kms).to.equal('local');
      expect(storedSecretKey.spec).to.be.undefined;
      expect(storedSecretKey.state).to.equal('Enabled');
      expect(storedSecretKey.material).to.be.undefined;
      expect(storedSecretKey.type).to.equal('secret');
      expect(storedSecretKey.usages).to.deep.equal(['encrypt', 'decrypt']);
    });

    xit('imports HMAC keys');

    it(`ignores the 'id' property and overwrites with internally generated unique identifier`, async () => {
      // Test importing a private key and validate the result.
      // @ts-expect-error because an 'id' property is being specified even though it should not be.
      const importedPrivateKey = await keyManager.importKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : true,
        id          : '1234',
        kms         : 'local',
        material    : new Uint8Array([1, 2, 3, 4]),
        type        : 'private',
        usages      : ['sign'],
      });
      expect(importedPrivateKey.id).to.be.a.string;
      expect(importedPrivateKey.id).to.not.equal('1234');

      // Test importing a public key and validate the result.
      // @ts-expect-error because an 'id' property is being specified even though it should not be.
      const importedPublicKey = await keyManager.importKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : true,
        id          : '1234',
        kms         : 'local',
        material    : new Uint8Array([1, 2, 3, 4]),
        type        : 'public',
        usages      : ['sign'],
      });
      expect(importedPublicKey.id).to.be.a.string;
      expect(importedPublicKey.id).to.not.equal('1234');

      // Test importing the asymmetric key pair and validate the result.
      const importedKeyPair = await keyManager.importKey({
        // @ts-expect-error because an 'id' property is being specified even though it should not be.
        privateKey: {
          algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
          extractable : true,
          id          : '1234',
          kms         : 'local',
          material    : new Uint8Array([1, 2, 3, 4]),
          type        : 'private',
          usages      : ['sign'],
        },
        publicKey: {
          algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
          extractable : true,
          id          : '1234',
          kms         : 'local',
          material    : new Uint8Array([1, 2, 3, 4]),
          type        : 'public',
          usages      : ['verify'],
        }
      });
      expect(importedKeyPair.privateKey.id).to.be.a.string;
      expect(importedKeyPair.privateKey.id).to.not.equal('1234');
      expect(importedKeyPair.publicKey.id).to.be.a.string;
      expect(importedKeyPair.publicKey.id).to.not.equal('1234');
    });

    it('never returns key material for private keys', async () => {
      // Test importing the key and validate the result.
      const importedPrivateKey = await keyManager.importKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : true,
        kms         : 'local',
        material    : new Uint8Array([1, 2, 3, 4]),
        type        : 'private',
        usages      : ['sign'],
      });
      expect(importedPrivateKey.material).to.not.exist;
    });

    it('returns key material for public keys', async () => {
      // Test importing the key and validate the result.
      const importedPrivateKey = await keyManager.importKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : true,
        kms         : 'local',
        material    : new Uint8Array([1, 2, 3, 4]),
        type        : 'public',
        usages      : ['verify'],
      });
      expect(importedPrivateKey.material).to.exist;
      expect(importedPrivateKey.material).to.be.an.instanceOf(ArrayBuffer);
    });

    it('throws an error if public and private keys are swapped', async () => {
      // Test importing the key and validate the result.
      await expect(keyManager.importKey({
        privateKey: {
          algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
          extractable : true,
          kms         : 'local',
          material    : new Uint8Array([1, 2, 3, 4]),
          type        : 'public',
          usages      : ['verify'],
        },
        publicKey: {
          algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
          extractable : true,
          kms         : 'local',
          material    : new Uint8Array([1, 2, 3, 4]),
          type        : 'private',
          usages      : ['sign'],
        }
      })).to.eventually.be.rejectedWith(Error, 'failed due to private and public key mismatch');
    });
  });

  describe('listKms()', function() {
    it('should return an empty array if no KMSs are specified', function() {
      const keyManager = new KeyManager({ store: keyManagerStore, kms: {}, });
      const kmsList = keyManager.listKms();
      expect(kmsList).to.be.an('array').that.is.empty;
    });

    it('should return the names of all KMSs present', function() {
      const keyManager = new KeyManager({
        store : keyManagerStore,
        // @ts-expect-error because dummy KMS objects are intentionally used as input.
        kms   : { 'dummy1': {}, 'dummy2': {} }
      });
      const kmsList = keyManager.listKms();
      expect(kmsList).to.be.an('array').that.includes.members(['dummy1', 'dummy2']);
    });
  });

  describe('sign()', () => {
    it('generates signatures', async () => {
      const keyPair = await keyManager.generateKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : false,
        keyUsages   : ['sign', 'verify']
      });

      const signature = await keyManager.sign({
        algorithm : { name: 'ECDSA', hash: 'SHA-256' },
        keyRef    : keyPair.privateKey.id,
        data      : new Uint8Array([51, 52, 53]),
      });

      expect(signature).to.be.instanceOf(ArrayBuffer);
      expect(signature.byteLength).to.equal(64);
    });

    it('accepts input data as ArrayBuffer, DataView, and TypedArray', async () => {
      const algorithm = { name: 'ECDSA', hash: 'SHA-256' };
      const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const keyPair = await keyManager.generateKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : false,
        keyUsages   : ['sign', 'verify']
      });
      const key = keyPair.privateKey;
      let signature: ArrayBuffer;

      // ArrayBuffer
      const dataArrayBuffer = dataU8A.buffer;
      signature = await keyManager.sign({ algorithm, keyRef: key.id, data: dataArrayBuffer });
      expect(signature).to.be.instanceOf(ArrayBuffer);

      // DataView
      const dataView = new DataView(dataArrayBuffer);
      signature = await keyManager.sign({ algorithm, keyRef: key.id, data: dataView });
      expect(signature).to.be.instanceOf(ArrayBuffer);

      // TypedArray - Uint8Array
      signature = await keyManager.sign({ algorithm, keyRef: key.id, data: dataU8A });
      expect(signature).to.be.instanceOf(ArrayBuffer);

      // TypedArray - Int32Array
      const dataI32A = new Int32Array([10, 20, 30, 40]);
      signature = await keyManager.sign({ algorithm, keyRef: key.id, data: dataI32A });
      expect(signature).to.be.instanceOf(ArrayBuffer);

      // TypedArray - Uint32Array
      const dataU32A = new Uint32Array([8, 7, 6, 5, 4, 3, 2, 1]);
      signature = await keyManager.sign({ algorithm, keyRef: key.id, data: dataU32A });
      expect(signature).to.be.instanceOf(ArrayBuffer);
    });

    it('generates ECDSA secp256k1 signatures', async () => {
      const keyPair = await keyManager.generateKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : false,
        keyUsages   : ['sign', 'verify']
      });

      const signature = await keyManager.sign({
        algorithm : { name: 'ECDSA', hash: 'SHA-256' },
        keyRef    : keyPair.privateKey.id,
        data      : new Uint8Array([51, 52, 53]),
      });

      expect(signature).to.be.instanceOf(ArrayBuffer);
      expect(signature.byteLength).to.equal(64);
    });

    it('generates EdDSA Ed25519 signatures', async () => {
      const keyPair = await keyManager.generateKey({
        algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
        extractable : false,
        keyUsages   : ['sign', 'verify']
      });

      const signature = await keyManager.sign({
        algorithm : { name: 'EdDSA' },
        keyRef    : keyPair.privateKey.id,
        data      : new Uint8Array([51, 52, 53]),
      });

      expect(signature).to.be.instanceOf(ArrayBuffer);
      expect(signature.byteLength).to.equal(64);
    });

    it('throws an error when key reference is not found', async () => {
      await expect(keyManager.sign({
        algorithm : { name: 'ECDSA', hash: 'SHA-256' },
        keyRef    : 'non-existent-key',
        data      : new Uint8Array([51, 52, 53])
      })).to.eventually.be.rejectedWith(Error, 'Key not found');
    });
  });

  describe('verify()', () => {
    it('returns a boolean result', async () => {
      const dataU8A = new Uint8Array([51, 52, 53]);
      const keyPair = await keyManager.generateKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : false,
        keyUsages   : ['sign', 'verify']
      });

      const signature = await keyManager.sign({
        algorithm : { name: 'ECDSA', hash: 'SHA-256' },
        keyRef    : keyPair.privateKey.id,
        data      : dataU8A,
      });

      const isValid = await keyManager.verify({
        algorithm : { name: 'ECDSA', hash: 'SHA-256' },
        keyRef    : keyPair.publicKey.id,
        signature : signature,
        data      : dataU8A
      });

      expect(isValid).to.exist;
      expect(isValid).to.be.true;
    });

    it('accepts input data as ArrayBuffer, DataView, and TypedArray', async () => {
      const algorithm = { name: 'ECDSA', hash: 'SHA-256' };
      const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const keyPair = await keyManager.generateKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : false,
        keyUsages   : ['sign', 'verify']
      });
      let signature: ArrayBuffer;
      let isValid: boolean;

      // ArrayBuffer
      const dataArrayBuffer = dataU8A.buffer;
      signature = await keyManager.sign({ algorithm, keyRef: keyPair.privateKey.id, data: dataArrayBuffer });
      isValid = await keyManager.verify({ algorithm, keyRef: keyPair.publicKey.id, signature, data: dataArrayBuffer });
      expect(isValid).to.be.true;

      // DataView
      const dataView = new DataView(dataArrayBuffer);
      signature = await keyManager.sign({ algorithm, keyRef: keyPair.privateKey.id, data: dataView });
      isValid = await keyManager.verify({ algorithm, keyRef: keyPair.publicKey.id, signature, data: dataView });
      expect(isValid).to.be.true;

      // TypedArray - Uint8Array
      signature = await keyManager.sign({ algorithm, keyRef: keyPair.privateKey.id, data: dataU8A });
      isValid = await keyManager.verify({ algorithm, keyRef: keyPair.publicKey.id, signature, data: dataU8A });
      expect(isValid).to.be.true;

      // TypedArray - Int32Array
      const dataI32A = new Int32Array([10, 20, 30, 40]);
      signature = await keyManager.sign({ algorithm, keyRef: keyPair.privateKey.id, data: dataI32A });
      isValid = await keyManager.verify({ algorithm, keyRef: keyPair.publicKey.id, signature, data: dataI32A });
      expect(isValid).to.be.true;

      // TypedArray - Uint32Array
      const dataU32A = new Uint32Array([8, 7, 6, 5, 4, 3, 2, 1]);
      signature = await keyManager.sign({ algorithm, keyRef: keyPair.privateKey.id, data: dataU32A });
      isValid = await keyManager.verify({ algorithm, keyRef: keyPair.publicKey.id, signature, data: dataU32A });
      expect(isValid).to.be.true;
    });

    it('verifies ECDSA secp256k1 signatures', async () => {
      const keyPair = await keyManager.generateKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : false,
        keyUsages   : ['sign', 'verify']
      });

      const algorithm = { name: 'ECDSA', hash: 'SHA-256' };
      const dataU8A = new Uint8Array([51, 52, 53]);

      const signature = await keyManager.sign({ algorithm, keyRef: keyPair.privateKey.id, data: dataU8A });
      const isValid = await keyManager.verify({ algorithm, keyRef: keyPair.publicKey.id, signature, data: dataU8A });

      expect(isValid).to.be.true;
    });

    it('verifies EdDSA Ed25519 signatures', async () => {
      const keyPair = await keyManager.generateKey({
        algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
        extractable : false,
        keyUsages   : ['sign', 'verify']
      });

      const algorithm = { name: 'EdDSA' };
      const dataU8A = new Uint8Array([51, 52, 53]);

      const signature = await keyManager.sign({ algorithm, keyRef: keyPair.privateKey.id, data: dataU8A });
      const isValid = await keyManager.verify({ algorithm, keyRef: keyPair.publicKey.id, signature, data: dataU8A });

      expect(isValid).to.be.true;
    });

    it('throws an error when key reference is not found', async () => {
      await expect(keyManager.verify({
        algorithm : { name: 'ECDSA', hash: 'SHA-256' },
        keyRef    : 'non-existent-key',
        signature : (new Uint8Array([51, 52, 53])).buffer,
        data      : new Uint8Array([51, 52, 53])
      })).to.eventually.be.rejectedWith(Error, 'Key not found');
    });
  });

  describe('#getKms()', () => {
    it(`if 'kms' is not specified and there is only one, use it automatically`, async () => {
      const key = await keyManager.generateKey({
        algorithm : { name: 'EdDSA', namedCurve: 'Ed25519' },
        keyUsages : ['sign', 'verify']
      });

      expect(key.privateKey.kms).to.equal('local');
    });

    it(`throws an error if 'kms' is not specified and there is more than 1`, async () => {
      // Instantiate KeyManager with two KMSs.
      const options: KeyManagerOptions = {
        store : keyManagerStore,
        kms   : {
          one : localKms,
          two : localKms
        },
      };
      keyManager = new KeyManager(options);

      await expect(keyManager.generateKey({
        algorithm : { name: 'EdDSA', namedCurve: 'Ed25519' },
        keyUsages : ['sign', 'verify']
      })).to.eventually.be.rejectedWith(Error, 'Unknown key management system');
    });

    it('throws an error if the KMS is not found', async () => {
      await expect(keyManager.generateKey({
        algorithm : { name: 'EdDSA', namedCurve: 'Ed25519' },
        keyUsages : ['sign', 'verify'],
        kms       : 'non-existent-kms'
      })).to.eventually.be.rejectedWith(Error, 'Unknown key management system');
    });
  });
});

describe('KeyManagerStore', () => {
  let keyManagerStore: KeyManagerStore;
  let testKey: ManagedKey;

  beforeEach(() => {
    const memoryStore = new MemoryStore<string, ManagedKey | ManagedKeyPair>();

    keyManagerStore = new KeyManagerStore({ store: memoryStore });

    testKey = {
      id          : 'testKey',
      algorithm   : { name: 'AES', length: 256 },
      extractable : true,
      kms         : 'testKms',
      state       : 'Enabled',
      type        : 'secret',
      usages      : ['encrypt', 'decrypt'],
    };
  });

  describe('deleteKey()', () => {
    it('should delete key and return true if key exists', async () => {
      // Import the key.
      await keyManagerStore.importKey({ key: testKey });

      // Test deleting the key and validate the result.
      const deleteResult = await keyManagerStore.deleteKey({ id: testKey.id });
      expect(deleteResult).to.be.true;

      // Verify the key is no longer in the store.
      const storedKey = await keyManagerStore.getKey({ id: testKey.id });
      expect(storedKey).to.be.undefined;
    });

    it('should return false if key does not exist', async () => {
      // Test deleting the key.
      const nonExistentId = '1234';
      const deleteResult = await keyManagerStore.deleteKey({ id: nonExistentId });

      // Validate the key was not deleted.
      expect(deleteResult).to.be.false;
    });
  });

  describe('getKey()', () => {
    it('should return a key if it exists', async () => {
      // Import the key.
      await keyManagerStore.importKey({ key: testKey });

      // Test getting the key.
      const storedKey = await keyManagerStore.getKey({ id: testKey.id });

      // Verify the key is in the store.
      expect(storedKey).to.deep.equal(testKey);
    });

    it('should return undefined when attempting to get a non-existent key', async () => {
      // Test getting the key.
      const storedKey = await keyManagerStore.getKey({ id: 'non-existent-key' });

      // Verify the key is no longer in the store.
      expect(storedKey).to.be.undefined;
    });
  });

  describe('importKey()', () => {
    it('should import a key that does not already exist', async () => {
      // Test importing the key and validate the result.
      const importResult = await keyManagerStore.importKey({ key: testKey });
      expect(importResult).to.be.true;

      // Verify the key is present in the key store.
      const storedKey = await keyManagerStore.getKey({ id: testKey.id });
      expect(storedKey).to.deep.equal(testKey);
    });

    it('should throw an error when attempting to import a key that already exists', async () => {
      // Import the key and validate the result.
      const importResult = await keyManagerStore.importKey({ key: testKey });
      expect(importResult).to.be.true;

      // Test importing the key again and assert it throws an error.
      const importKey = keyManagerStore.importKey({ key: testKey });
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
        await keyManagerStore.importKey({ key });
      }

      // List keys and verify the result.
      const storedKeys = await keyManagerStore.listKeys();
      expect(storedKeys).to.deep.equal(testKeys);
    });

    it('should return an empty array if the store contains no keys', async () => {
      // List keys and verify the result is empty.
      const storedKeys = await keyManagerStore.listKeys();
      expect(storedKeys).to.be.empty;
    });
  });
});