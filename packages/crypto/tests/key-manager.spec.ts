import type { KeyManagerOptions } from '../src/key-manager.js';
import type { ManagedKey, ManagedKeyPair, ManagedPrivateKey, Web5Crypto } from '../src/types-key-manager.js';

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
    xit('returns the key if it exists in the store', async function() {
      const keyRef = 'testKey';
      const expectedKey = { id: keyRef, kms: 'default' };

      // Prepopulate the store with a key.
      //! TODO: Enable this test once the importKey() method has been added to KeyManager.
      // await keyManager.importKey({ key: expectedKey });

      const storedKey = await keyManager.getKey({ keyRef });

      expect(storedKey).to.deep.equal(expectedKey);
    });

    it('should return undefined if the key does not exist in the store', async function() {
      const keyRef = 'non-existent-key';

      const storedKey = await keyManager.getKey({ keyRef });

      expect(storedKey).to.be.undefined;
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
      const keyPair = await keyManager.generateKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : false,
        keyUsages   : ['sign', 'verify']
      });
      const key = keyPair.privateKey;
      let signature: ArrayBuffer;

      const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      signature = await keyManager.sign({ algorithm, keyRef: key.id, data: dataU8A });
      expect(signature).to.be.instanceOf(ArrayBuffer);

      const dataArrayBuffer = dataU8A.buffer;
      signature = await keyManager.sign({ algorithm, keyRef: key.id, data: dataArrayBuffer });
      expect(signature).to.be.instanceOf(ArrayBuffer);

      const dataView = new DataView(dataArrayBuffer);
      signature = await keyManager.sign({ algorithm, keyRef: key.id, data: dataView });
      expect(signature).to.be.instanceOf(ArrayBuffer);

      const dataI32A = new Int32Array([10, 20, 30, 40]);
      signature = await keyManager.sign({ algorithm, keyRef: key.id, data: dataI32A });
      expect(signature).to.be.instanceOf(ArrayBuffer);

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
      const keyPair = await keyManager.generateKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : false,
        keyUsages   : ['sign', 'verify']
      });
      let signature: ArrayBuffer;
      let isValid: boolean;

      const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      signature = await keyManager.sign({ algorithm, keyRef: keyPair.privateKey.id, data: dataU8A });
      isValid = await keyManager.verify({ algorithm, keyRef: keyPair.publicKey.id, signature, data: dataU8A });
      expect(isValid).to.be.true;

      const dataArrayBuffer = dataU8A.buffer;
      signature = await keyManager.sign({ algorithm, keyRef: keyPair.privateKey.id, data: dataArrayBuffer });
      isValid = await keyManager.verify({ algorithm, keyRef: keyPair.publicKey.id, signature, data: dataArrayBuffer });
      expect(isValid).to.be.true;

      const dataView = new DataView(dataArrayBuffer);
      signature = await keyManager.sign({ algorithm, keyRef: keyPair.privateKey.id, data: dataView });
      isValid = await keyManager.verify({ algorithm, keyRef: keyPair.publicKey.id, signature, data: dataView });
      expect(isValid).to.be.true;

      const dataI32A = new Int32Array([10, 20, 30, 40]);
      signature = await keyManager.sign({ algorithm, keyRef: keyPair.privateKey.id, data: dataI32A });
      isValid = await keyManager.verify({ algorithm, keyRef: keyPair.publicKey.id, signature, data: dataI32A });
      expect(isValid).to.be.true;

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
    xit('tests missing');
  });

  describe('#useDefaultKms()', () => {
    xit('tests missing');
  });
});