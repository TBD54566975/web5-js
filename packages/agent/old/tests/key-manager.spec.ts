import type { Web5Crypto } from '@web5/crypto';

import sinon from 'sinon';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import type { KeyManagerOptions } from '../src/key-manager.js';
import type { ManagedKey, ManagedKeyPair } from '../src/types/managed-key.js';

import { LocalKms } from '../src/kms-local.js';
import { TestAgent } from './utils/test-agent.js';
import { KeyManager } from '../src/key-manager.js';
import { KeyStoreMemory } from '../src/store-managed-key.js';

chai.use(chaiAsPromised);

describe('KeyManager', () => {
  let keyManager: KeyManager;
  let localKms: LocalKms;
  let testAgent: TestAgent;

  before(async () => {
    testAgent = await TestAgent.create();
  });

  beforeEach(() => {
    // Instantiate local KMS using in-memory key stores.
    localKms = new LocalKms({ kmsName: 'memory', agent: testAgent });

    // Instantiate KeyManager with in-memory KMS and store.
    keyManager = new KeyManager({ kms: { memory: localKms }, agent: testAgent });
  });

  afterEach(async () => {
    await testAgent.clearStorage();
  });

  after(async () => {
    await testAgent.closeStorage();
  });

  describe('constructor', () => {
    it('will use an in-memory store and local KMS if store and kms inputs are missing', async () => {
      expect(() => new KeyManager()).to.not.throw;
      const kmsList = keyManager.listKms();
      expect(kmsList[0]).to.equal('memory');
    });

    it('will use a local KMS if kms is not specified', async () => {
      const store = new KeyStoreMemory();
      keyManager = new KeyManager({ store });

      const kmsList = keyManager.listKms();
      expect(kmsList[0]).to.equal('memory');
    });
  });

  describe('instances', () => {
    xit('should not be possible to externally access the KeyManager store', async () => {
      // TODO: This test should be re-enabled once we can use #private variables
      //       which won't be possible until after support for CJS is dropped.
      //       Dropping support for CJS is dependent on Electron supporting ESM.

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

  describe('get agent', () => {
    it(`returns the 'agent' instance property`, () => {
      const agent = testAgent.keyManager.agent;
      expect(agent).to.exist;
    });

    it(`throws an error if the 'agent' instance property is undefined`, () => {
      const keyManager = new KeyManager();
      expect(() =>
        keyManager.agent
      ).to.throw(Error, 'Unable to determine agent execution context');
    });
  });

  describe('with two KMS', () => {
    beforeEach(() => {
      // Instantiate two local KMSs using in-memory key stores.
      const localKms1 = new LocalKms({ kmsName: 'one', agent: testAgent });
      const localKms2 = new LocalKms({ kmsName: 'two', agent: testAgent });

      // Instantiate KeyManager with both KMS instances.
      keyManager = new KeyManager({
        kms: {
          one : localKms1,
          two : localKms2
        }
      });

      // Set the KeyManager's agent instance.
      keyManager.agent = testAgent;
    });

    it('should store keys in the specified KMS', async () => {
      const keyPair1 = await keyManager.generateKey({
        algorithm : { name: 'ECDSA', namedCurve: 'secp256k1' },
        keyUsages : ['sign', 'verify'],
        kms       : 'one'
      });

      const keyPair2 = await keyManager.generateKey({
        algorithm : { name: 'ECDSA', namedCurve: 'secp256k1' },
        keyUsages : ['sign', 'verify'],
        kms       : 'two'
      });

      // Verify that key pair 1 was stored with specified KMS name.
      const storedKeyPair1 = await keyManager.getKey({ keyRef: keyPair1.publicKey.id });
      if (!storedKeyPair1) throw new Error('Type guard unexpectedly threw'); // Type guard.
      if (!('publicKey' in storedKeyPair1)) throw new Error('Type guard unexpectedly threw'); // Type guard.
      expect(storedKeyPair1.publicKey.kms).to.equal('one');

      // Verify that key pair 2 was stored with specified KMS name.
      const storedKeyPair2 = await keyManager.getKey({ keyRef: keyPair2.publicKey.id });
      if (!storedKeyPair2) throw new Error('Type guard unexpectedly threw'); // Type guard.
      if (!('publicKey' in storedKeyPair2)) throw new Error('Type guard unexpectedly threw'); // Type guard.
      expect(storedKeyPair2.publicKey.kms).to.equal('two');
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
          counter : new Uint8Array(16),
          length  : 128
        },
        keyRef : key.id,
        data   : new Uint8Array([1, 2, 3, 4])
      });

      expect(plaintext).to.be.instanceOf(Uint8Array);
      expect(plaintext.byteLength).to.equal(4);
    });

    it('accepts input data as Uint8Array', async () => {
      const algorithm = { name: 'AES-CTR', counter: new Uint8Array(16), length: 128 };
      const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      let plaintext: Uint8Array;

      // TypedArray - Uint8Array
      plaintext = await keyManager.decrypt({ algorithm, keyRef: key.id, data: dataU8A });
      expect(plaintext).to.be.instanceOf(Uint8Array);
    });

    it('decrypts data with AES-CTR', async () => {
      const plaintext = await keyManager.decrypt({
        algorithm: {
          name    : 'AES-CTR',
          counter : new Uint8Array(16),
          length  : 128
        },
        keyRef : key.id,
        data   : new Uint8Array([1, 2, 3, 4])
      });

      expect(plaintext).to.be.instanceOf(Uint8Array);
      expect(plaintext.byteLength).to.equal(4);
    });

    it('throws an error when key reference is not found', async () => {
      await expect(keyManager.decrypt({
        algorithm: {
          name    : 'AES-CTR',
          counter : new Uint8Array(16),
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
    let ownKeyPair: ManagedKeyPair;

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
        material    : otherPartyPublicKey.material!,
        type        : otherPartyPublicKey.type,
        usages      : otherPartyPublicKey.usages
      };

      ownKeyPair = await keyManager.generateKey({
        algorithm   : { name: 'ECDH', namedCurve: 'secp256k1' },
        extractable : false,
        keyUsages   : ['deriveBits', 'deriveKey']
      });
    });

    it('generates shared secrets', async () => {
      const sharedSecret = await keyManager.deriveBits({
        algorithm  : { name: 'ECDH', publicKey: otherPartyPublicCryptoKey },
        baseKeyRef : ownKeyPair.privateKey.id
      });
      expect(sharedSecret).to.be.an('Uint8Array');
      expect(sharedSecret.byteLength).to.equal(32);
    });

    it(`accepts 'id' as a baseKey reference`, async () => {
      const sharedSecret = await keyManager.deriveBits({
        algorithm  : { name: 'ECDH', publicKey: otherPartyPublicCryptoKey },
        baseKeyRef : ownKeyPair.privateKey.id
      });
      expect(sharedSecret).to.be.an('Uint8Array');
      expect(sharedSecret.byteLength).to.equal(32);
    });

    it('generates ECDH secp256k1 shared secrets', async () => {
      const sharedSecret = await keyManager.deriveBits({
        algorithm  : { name: 'ECDH', publicKey: otherPartyPublicCryptoKey },
        baseKeyRef : ownKeyPair.privateKey.id
      });
      expect(sharedSecret).to.be.an('Uint8Array');
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
        material    : otherPartyPublicKey.material!,
        type        : otherPartyPublicKey.type,
        usages      : otherPartyPublicKey.usages
      };

      ownKeyPair = await keyManager.generateKey({
        algorithm   : { name: 'ECDH', namedCurve: 'X25519' },
        extractable : false,
        keyUsages   : ['deriveBits']
      });

      const sharedSecret = await keyManager.deriveBits({
        algorithm  : { name: 'ECDH', publicKey: otherPartyPublicCryptoKey },
        baseKeyRef : ownKeyPair.privateKey.id
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
          counter : new Uint8Array(16),
          length  : 128
        },
        keyRef : key.id,
        data   : new Uint8Array([1, 2, 3, 4])
      });

      expect(ciphertext).to.be.instanceOf(Uint8Array);
      expect(ciphertext.byteLength).to.equal(4);
    });

    it('accepts input data as Uint8Array', async () => {
      const algorithm = { name: 'AES-CTR', counter: new Uint8Array(16), length: 128 };
      const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      let ciphertext: Uint8Array;

      // TypedArray - Uint8Array
      ciphertext = await keyManager.encrypt({ algorithm, keyRef: key.id, data: dataU8A });
      expect(ciphertext).to.be.instanceOf(Uint8Array);
    });

    it('encrypts data with AES-CTR', async () => {
      const ciphertext = await keyManager.encrypt({
        algorithm: {
          name    : 'AES-CTR',
          counter : new Uint8Array(16),
          length  : 128
        },
        keyRef : key.id,
        data   : new Uint8Array([1, 2, 3, 4])
      });

      expect(ciphertext).to.be.instanceOf(Uint8Array);
      expect(ciphertext.byteLength).to.equal(4);
    });

    it('throws an error when key reference is not found', async () => {
      await expect(keyManager.encrypt({
        algorithm: {
          name    : 'AES-CTR',
          counter : new Uint8Array(16),
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
      expect(keys.privateKey.kms).to.equal('memory');
      expect(keys.publicKey.kms).to.equal('memory');
      expect(keys.privateKey.spec).to.be.undefined;
      expect(keys.publicKey.spec).to.be.undefined;
      expect(keys.privateKey.state).to.equal('Enabled');
      expect(keys.publicKey.state).to.equal('Enabled');

      // Check values unique to the private key.
      expect(keys.privateKey.material).to.be.undefined;
      expect(keys.privateKey.type).to.equal('private');
      expect(keys.privateKey.usages).to.deep.equal(['sign']);

      // Check values unique to the public key.
      expect(keys.publicKey.material).to.be.an.instanceOf(Uint8Array);
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
    it('returns the key by ID if it exists in the store', async function() {
      // Prepopulate the store with a key.
      const importedPrivateKey = await keyManager.importKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : true,
        kms         : 'memory',
        material    : new Uint8Array([1, 2, 3, 4]),
        type        : 'private',
        usages      : ['sign'],
      });

      const storedPrivateKey = await keyManager.getKey({ keyRef: importedPrivateKey.id });

      expect(storedPrivateKey).to.deep.equal(importedPrivateKey);
    });

    it('should return a key by alias if it exists', async () => {
      // Prepopulate the store with a key.
      const importedPrivateKey = await keyManager.importKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        alias       : 'did:method:abc123',
        extractable : true,
        kms         : 'memory',
        material    : new Uint8Array([1, 2, 3, 4]),
        type        : 'private',
        usages      : ['sign'],
      });

      // Test finding the key.
      const storedPrivateKey = await keyManager.getKey({ keyRef: 'did:method:abc123' });

      // Verify the key is in the store.
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
          kms         : 'memory',
          material    : new Uint8Array([1, 2, 3, 4]),
          type        : 'private',
          usages      : ['sign'],
        },
        publicKey: {
          algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
          extractable : true,
          kms         : 'memory',
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
      expect(storedKeyPair.privateKey.kms).to.equal('memory');
      expect(storedKeyPair.publicKey.kms).to.equal('memory');
      expect(storedKeyPair.privateKey.spec).to.be.undefined;
      expect(storedKeyPair.publicKey.spec).to.be.undefined;
      expect(storedKeyPair.privateKey.state).to.equal('Enabled');
      expect(storedKeyPair.publicKey.state).to.equal('Enabled');

      // Check values unique to the private key.
      expect(storedKeyPair.privateKey.material).to.be.undefined;
      expect(storedKeyPair.privateKey.type).to.equal('private');
      expect(storedKeyPair.privateKey.usages).to.deep.equal(['sign']);

      // Check values unique to the public key.
      expect(storedKeyPair.publicKey.material).to.be.an.instanceOf(Uint8Array);
      expect(storedKeyPair.publicKey.type).to.equal('public');
      expect(storedKeyPair.publicKey.usages).to.deep.equal(['verify']);
    });

    it('imports asymmetric private keys', async () => {
      // Test importing the key and validate the result.
      const importedPrivateKey = await keyManager.importKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : true,
        kms         : 'memory',
        material    : new Uint8Array([1, 2, 3, 4]),
        type        : 'private',
        usages      : ['sign'],
      });
      expect(importedPrivateKey.kms).to.equal('memory');
      expect(importedPrivateKey).to.exist;

      // Verify the key is present in the key store.
      const storedPrivateKey = await keyManager.getKey({ keyRef: importedPrivateKey.id }) as ManagedKey;
      expect(storedPrivateKey).to.deep.equal(importedPrivateKey);

      // Validate the expected values.
      expect(storedPrivateKey.algorithm.name).to.equal('ECDSA');
      expect(storedPrivateKey.kms).to.equal('memory');
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
        kms         : 'memory',
        material    : new Uint8Array([1, 2, 3, 4]),
        type        : 'public',
        usages      : ['verify'],
      });
      expect(importedPublicKey.kms).to.equal('memory');
      expect(importedPublicKey).to.exist;

      // Verify the key is present in the key store.
      const storedPublicKey = await keyManager.getKey({ keyRef: importedPublicKey.id }) as ManagedKey;
      expect(storedPublicKey).to.deep.equal(importedPublicKey);

      // Validate the expected values.
      expect(storedPublicKey.algorithm.name).to.equal('ECDSA');
      expect(storedPublicKey.kms).to.equal('memory');
      expect(storedPublicKey.spec).to.be.undefined;
      expect(storedPublicKey.state).to.equal('Enabled');
      expect(storedPublicKey.material).to.be.an.instanceOf(Uint8Array);
      expect(storedPublicKey.type).to.equal('public');
      expect(storedPublicKey.usages).to.deep.equal(['verify']);
    });

    it('imports symmetric keys', async () => {
      // Test importing the key and validate the result.
      const importedSecretKey = await keyManager.importKey({
        algorithm   : { name: 'AES-CTR', length: 128 },
        extractable : true,
        kms         : 'memory',
        material    : new Uint8Array([1, 2, 3, 4]),
        type        : 'secret',
        usages      : ['encrypt', 'decrypt'],
      });
      expect(importedSecretKey.kms).to.equal('memory');
      expect(importedSecretKey).to.exist;

      // Verify the key is present in the key store.
      const storedSecretKey = await keyManager.getKey({ keyRef: importedSecretKey.id }) as ManagedKey;
      expect(storedSecretKey).to.deep.equal(importedSecretKey);

      // Validate the expected values.
      expect(storedSecretKey.algorithm.name).to.equal('AES-CTR');
      expect(storedSecretKey.kms).to.equal('memory');
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
        kms         : 'memory',
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
        kms         : 'memory',
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
          kms         : 'memory',
          material    : new Uint8Array([1, 2, 3, 4]),
          type        : 'private',
          usages      : ['sign'],
        },
        publicKey: {
          algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
          extractable : true,
          id          : '1234',
          kms         : 'memory',
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
        kms         : 'memory',
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
        kms         : 'memory',
        material    : new Uint8Array([1, 2, 3, 4]),
        type        : 'public',
        usages      : ['verify'],
      });
      expect(importedPrivateKey.material).to.exist;
      expect(importedPrivateKey.material).to.be.an.instanceOf(Uint8Array);
    });

    it('throws an error if public and private keys are swapped', async () => {
      // Test importing the key and validate the result.
      await expect(keyManager.importKey({
        privateKey: {
          algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
          extractable : true,
          kms         : 'memory',
          material    : new Uint8Array([1, 2, 3, 4]),
          type        : 'public',
          usages      : ['verify'],
        },
        publicKey: {
          algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
          extractable : true,
          kms         : 'memory',
          material    : new Uint8Array([1, 2, 3, 4]),
          type        : 'private',
          usages      : ['sign'],
        }
      })).to.eventually.be.rejectedWith(Error, 'failed due to private and public key mismatch');
    });
  });

  describe('listKms()', function() {
    it('should return an empty array if no KMSs are specified', function() {
      const keyManager = new KeyManager({ kms: {}, });
      const kmsList = keyManager.listKms();
      expect(kmsList).to.be.an('array').that.is.empty;
    });

    it('should return the names of all KMSs present', function() {
      const keyManager = new KeyManager({
        // @ts-expect-error because dummy KMS objects are intentionally used as input.
        kms: { 'dummy1': {}, 'dummy2': {} }
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

      expect(signature).to.be.instanceOf(Uint8Array);
      expect(signature.byteLength).to.equal(64);
    });

    it('accepts input data as Uint8Array', async () => {
      const algorithm = { name: 'ECDSA', hash: 'SHA-256' };
      const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const keyPair = await keyManager.generateKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : false,
        keyUsages   : ['sign', 'verify']
      });
      const key = keyPair.privateKey;
      let signature: Uint8Array;

      // TypedArray - Uint8Array
      signature = await keyManager.sign({ algorithm, keyRef: key.id, data: dataU8A });
      expect(signature).to.be.instanceOf(Uint8Array);
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

      expect(signature).to.be.instanceOf(Uint8Array);
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

      expect(signature).to.be.instanceOf(Uint8Array);
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

  describe('updateKey()', () => {
    let testKey: ManagedKey;
    let testKeyPair: ManagedKeyPair;

    beforeEach(async () => {
      testKey = await keyManager.generateKey({
        algorithm   : { name: 'AES-CTR', length: 128 },
        alias       : 'test-key',
        extractable : false,
        keyUsages   : ['encrypt', 'decrypt'],
        metadata    : { foo: 'bar'}
      });

      testKeyPair = await keyManager.generateKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        alias       : 'test-key-pair',
        extractable : false,
        keyUsages   : ['sign', 'verify'],
        metadata    : { foo: 'bar'}
      });
    });

    it('should update a key by ID', async () => {
      // Attempt to update the key's alias.
      const newAlias = 'did:method:new';
      const updateResult = await keyManager.updateKey({ keyRef: testKey.id, alias: newAlias });

      // Verify that the alias property was updated.
      expect(updateResult).to.be.true;
      const storedKey = await keyManager.getKey({ keyRef: testKey.id });
      expect(storedKey).to.have.property('alias', newAlias);
    });

    it('should update a key pair by ID', async () => {
      // Attempt to update the key's alias.
      const newAlias = 'did:method:new';
      const updateResult = await keyManager.updateKey({ keyRef: testKeyPair.publicKey.id, alias: newAlias });

      // Verify that the alias property was updated.
      expect(updateResult).to.be.true;
      const storedKey = await keyManager.getKey({ keyRef: testKeyPair.publicKey.id });
      if (!('privateKey' in storedKey!)) throw new Error('Expected ManagedKeyPair and not ManagedKey');
      expect(storedKey.publicKey).to.have.property('alias', newAlias);
    });

    it('throws an error when key reference is not found', async () => {
      await expect(
        keyManager.updateKey({ keyRef: 'non-existent', alias: 'new-alias' })
      ).to.eventually.be.rejectedWith(Error, 'Key not found');
    });

    it('returns false if the update operation failed', async () => {
      // Stub the `updateKey()` method of LocalKms to simulate a failed update.
      sinon.stub(localKms, 'updateKey').returns(Promise.resolve(false));

      // Attempt to update the key's alias.
      const updateResult = await keyManager.updateKey({ keyRef: testKey.id, alias: '' });

      // Remove the instance method stub.
      sinon.restore();

      // Verify that the update failed.
      expect(updateResult).to.be.false;
      const storedKey = await keyManager.getKey({ keyRef: testKey.id });
      expect(storedKey).to.deep.equal(testKey);
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

    it('accepts input data as Uint8Array', async () => {
      const algorithm = { name: 'ECDSA', hash: 'SHA-256' };
      const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const keyPair = await keyManager.generateKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : false,
        keyUsages   : ['sign', 'verify']
      });
      let signature: Uint8Array;
      let isValid: boolean;

      // TypedArray - Uint8Array
      signature = await keyManager.sign({ algorithm, keyRef: keyPair.privateKey.id, data: dataU8A });
      isValid = await keyManager.verify({ algorithm, keyRef: keyPair.publicKey.id, signature, data: dataU8A });
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
        signature : (new Uint8Array([51, 52, 53])),
        data      : new Uint8Array([51, 52, 53])
      })).to.eventually.be.rejectedWith(Error, 'Key not found');
    });
  });

  describe('getKms()', () => {
    it(`if 'kms' is not specified and there is only one, use it automatically`, async () => {
      const key = await keyManager.generateKey({
        algorithm : { name: 'EdDSA', namedCurve: 'Ed25519' },
        keyUsages : ['sign', 'verify']
      });

      expect(key.privateKey.kms).to.equal('memory');
    });

    it(`throws an error if 'kms' is not specified and there is more than 1`, async () => {
      // Instantiate KeyManager with two KMSs.
      const options: KeyManagerOptions = {
        kms: {
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