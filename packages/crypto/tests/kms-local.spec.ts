import type { ManagedKey, ManagedKeyPair, ManagedPrivateKey, Web5Crypto } from '../src/types/index.js';

import sinon from 'sinon';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { MemoryStore } from '@tbd54566975/common';

import { LocalKms, KmsKeyStore, KmsPrivateKeyStore } from '../src/kms-local/index.js';

chai.use(chaiAsPromised);

describe('LocalKms', () => {
  let kms: LocalKms;

  beforeEach(() => {
    const memoryKeyStore = new MemoryStore<string, ManagedKey | ManagedKeyPair>();
    const kmsKeyStore = new KmsKeyStore(memoryKeyStore);
    const memoryPrivateKeyStore = new MemoryStore<string, ManagedPrivateKey>();
    const kmsPrivateKeyStore = new KmsPrivateKeyStore(memoryPrivateKeyStore);
    kms = new LocalKms('local', kmsKeyStore, kmsPrivateKeyStore);
  });

  describe('decrypt()', () => {
    let key: ManagedKey;

    beforeEach(async () => {
      key = await kms.generateKey({
        algorithm   : { name: 'AES-CTR', length: 128 },
        extractable : false,
        keyUsages   : ['encrypt', 'decrypt']
      });
    });

    it('decrypts data', async () => {
      const plaintext = await kms.decrypt({
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
      plaintext = await kms.decrypt({ algorithm, keyRef: key.id, data: dataArrayBuffer });
      expect(plaintext).to.be.instanceOf(ArrayBuffer);

      // DataView
      const dataView = new DataView(dataArrayBuffer);
      plaintext = await kms.decrypt({ algorithm, keyRef: key.id, data: dataView });
      expect(plaintext).to.be.instanceOf(ArrayBuffer);

      // TypedArray - Uint8Array
      plaintext = await kms.decrypt({ algorithm, keyRef: key.id, data: dataU8A });
      expect(plaintext).to.be.instanceOf(ArrayBuffer);

      // TypedArray - Int32Array
      const dataI32A = new Int32Array([10, 20, 30, 40]);
      plaintext = await kms.decrypt({ algorithm, keyRef: key.id, data: dataI32A });
      expect(plaintext).to.be.instanceOf(ArrayBuffer);

      // TypedArray - Uint32Array
      const dataU32A = new Uint32Array([8, 7, 6, 5, 4, 3, 2, 1]);
      plaintext = await kms.decrypt({ algorithm, keyRef: key.id, data: dataU32A });
      expect(plaintext).to.be.instanceOf(ArrayBuffer);
    });

    it('decrypts data with AES-CTR', async () => {
      const plaintext = await kms.decrypt({
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
      await expect(kms.decrypt({
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

  describe('deriveBites()', () => {
    let otherPartyPublicKey: ManagedKey;
    let otherPartyPublicCryptoKey: Web5Crypto.CryptoKey;
    let ownPrivateKey: ManagedKey;

    beforeEach(async () => {
      const otherPartyKeyPair = await kms.generateKey({
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

      const ownKeyPair = await kms.generateKey({
        algorithm   : { name: 'ECDH', namedCurve: 'secp256k1' },
        extractable : false,
        keyUsages   : ['deriveBits']
      });
      ownPrivateKey = ownKeyPair.privateKey;
    });

    it('generates shared secrets', async () => {
      const sharedSecret = await kms.deriveBits({
        algorithm  : { name: 'ECDH', publicKey: otherPartyPublicCryptoKey },
        baseKeyRef : ownPrivateKey.id
      });
      expect(sharedSecret).to.be.an('ArrayBuffer');
      expect(sharedSecret.byteLength).to.equal(32);
    });

    it('returns shared secrets with maximum bit length when length is null', async () => {
      const sharedSecret = await kms.deriveBits({
        algorithm  : { name: 'ECDH', publicKey: otherPartyPublicCryptoKey },
        baseKeyRef : ownPrivateKey.id
      });
      expect(sharedSecret).to.be.an('ArrayBuffer');
      expect(sharedSecret.byteLength).to.equal(32);
    });

    it('returns shared secrets with specified length, if possible', async () => {
      const sharedSecret = await kms.deriveBits({
        algorithm  : { name: 'ECDH', publicKey: otherPartyPublicCryptoKey },
        baseKeyRef : ownPrivateKey.id,
        length     : 64
      });
      expect(sharedSecret).to.be.an('ArrayBuffer');
      expect(sharedSecret.byteLength).to.equal(64 / 8);
    });

    it(`accepts 'id' as a baseKey reference`, async () => {
      const sharedSecret = await kms.deriveBits({
        algorithm  : { name: 'ECDH', publicKey: otherPartyPublicCryptoKey },
        baseKeyRef : ownPrivateKey.id
      });
      expect(sharedSecret).to.be.an('ArrayBuffer');
      expect(sharedSecret.byteLength).to.equal(32);
    });

    it('generates ECDH secp256k1 shared secrets', async () => {
      const sharedSecret = await kms.deriveBits({
        algorithm  : { name: 'ECDH', publicKey: otherPartyPublicCryptoKey },
        baseKeyRef : ownPrivateKey.id
      });
      expect(sharedSecret).to.be.an('ArrayBuffer');
      expect(sharedSecret.byteLength).to.equal(32);
    });

    it('generates ECDH X25519 shared secrets', async () => {
      const otherPartyKeyPair = await kms.generateKey({
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

      const ownKeyPair = await kms.generateKey({
        algorithm   : { name: 'ECDH', namedCurve: 'X25519' },
        extractable : false,
        keyUsages   : ['deriveBits']
      });
      ownPrivateKey = ownKeyPair.privateKey;

      const sharedSecret = await kms.deriveBits({
        algorithm  : { name: 'ECDH', publicKey: otherPartyPublicCryptoKey },
        baseKeyRef : ownPrivateKey.id
      });
      expect(sharedSecret.byteLength).to.equal(32);
    });

    it('throws an error when baseKey reference is not found', async () => {
      await expect(kms.deriveBits({
        algorithm  : { name: 'ECDH', publicKey: otherPartyPublicCryptoKey },
        baseKeyRef : 'non-existent-id'
      })).to.eventually.be.rejectedWith(Error, 'Key not found');
    });
  });

  describe('encrypt()', () => {
    let key: ManagedKey;

    beforeEach(async () => {
      key = await kms.generateKey({
        algorithm   : { name: 'AES-CTR', length: 128 },
        extractable : false,
        keyUsages   : ['encrypt', 'decrypt']
      });
    });

    it('encrypts data', async () => {
      const ciphertext = await kms.encrypt({
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
      ciphertext = await kms.encrypt({ algorithm, keyRef: key.id, data: dataArrayBuffer });
      expect(ciphertext).to.be.instanceOf(ArrayBuffer);

      // DataView
      const dataView = new DataView(dataArrayBuffer);
      ciphertext = await kms.encrypt({ algorithm, keyRef: key.id, data: dataView });
      expect(ciphertext).to.be.instanceOf(ArrayBuffer);

      // TypedArray - Uint8Array
      ciphertext = await kms.encrypt({ algorithm, keyRef: key.id, data: dataU8A });
      expect(ciphertext).to.be.instanceOf(ArrayBuffer);

      // TypedArray - Int32Array
      const dataI32A = new Int32Array([10, 20, 30, 40]);
      ciphertext = await kms.encrypt({ algorithm, keyRef: key.id, data: dataI32A });
      expect(ciphertext).to.be.instanceOf(ArrayBuffer);

      // TypedArray - Uint32Array
      const dataU32A = new Uint32Array([8, 7, 6, 5, 4, 3, 2, 1]);
      ciphertext = await kms.encrypt({ algorithm, keyRef: key.id, data: dataU32A });
      expect(ciphertext).to.be.instanceOf(ArrayBuffer);
    });

    it('encrypts data with AES-CTR', async () => {
      const ciphertext = await kms.encrypt({
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
      await expect(kms.encrypt({
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
      const keys = await kms.generateKey({
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
      const keys = await kms.generateKey({
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
      const keys = await kms.generateKey({
        algorithm : { name: 'ECDH', namedCurve: 'secp256k1', compressedPublicKey: false },
        keyUsages : ['deriveBits', 'deriveKey']
      });

      // Check values unique to the public key.
      if (!keys.publicKey.material) throw new Error; // type guard
      expect(keys.publicKey.material.byteLength).to.equal(65);
    });

    it('creates ECDSA secp256k1 key pairs with compressed public keys, by default', async () => {
      const keys = await kms.generateKey({
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
      const keys = await kms.generateKey({
        algorithm : { name: 'ECDSA', namedCurve: 'secp256k1', compressedPublicKey: false },
        keyUsages : ['sign', 'verify']
      });

      // Check values unique to the public key.
      if (!keys.publicKey.material) throw new Error; // type guard
      expect(keys.publicKey.material.byteLength).to.equal(65);
    });

    it('creates EdDSA Ed25519 key pairs', async () => {
      const keys = await kms.generateKey({
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
        keys = await kms.generateKey({
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

  describe('importKey()', () => {
    it('imports asymmetric key pairs', async () => {
      const testKeyBase = {
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : true,
        kms         : 'testKms',
      };

      // Test importing the key and validate the result.
      const importedKeyPair = await kms.importKey({
        privateKey: {
          ...testKeyBase,
          material : new Uint8Array([1, 2, 3, 4]),
          type     : 'private',
          usages   : ['sign'],
        },
        publicKey: {
          ...testKeyBase,
          material : new Uint8Array([1, 2, 3, 4]),
          type     : 'public',
          usages   : ['verify'],
        }
      });
      expect(importedKeyPair).to.exist;

      // Verify the key is present in the key store.
      const storedKeyPair = await kms.getKey({ keyRef: importedKeyPair.privateKey.id }) as ManagedKeyPair;
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
      const importedPrivateKey = await kms.importKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : true,
        kms         : 'testKms',
        material    : new Uint8Array([1, 2, 3, 4]),
        type        : 'private',
        usages      : ['sign'],
      });
      expect(importedPrivateKey.kms).to.equal('local');
      expect(importedPrivateKey).to.exist;

      // Verify the key is present in the key store.
      const storedPrivateKey = await kms.getKey({ keyRef: importedPrivateKey.id }) as ManagedKey;
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
      const importedPublicKey = await kms.importKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : true,
        kms         : 'testKms',
        material    : new Uint8Array([1, 2, 3, 4]),
        type        : 'public',
        usages      : ['verify'],
      });
      expect(importedPublicKey.kms).to.equal('local');
      expect(importedPublicKey).to.exist;

      // Verify the key is present in the key store.
      const storedPublicKey = await kms.getKey({ keyRef: importedPublicKey.id }) as ManagedKey;
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
      const importedSecretKey = await kms.importKey({
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
      const storedSecretKey = await kms.getKey({ keyRef: importedSecretKey.id }) as ManagedKey;
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

    it(`ignores the 'kms' property and overwrites with configured value`, async () => {
      // Test importing the key and validate the result.
      const importedPrivateKey = await kms.importKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : true,
        kms         : 'incorrect-kms-name',
        material    : new Uint8Array([1, 2, 3, 4]),
        type        : 'private',
        usages      : ['sign'],
      });
      expect(importedPrivateKey.kms).to.equal('local');
    });

    it(`ignores the 'id' property and overwrites with internally generated unique identifier`, async () => {
      // Test importing a private key and validate the result.
      // @ts-expect-error because an 'id' property is being specified even though it should not be.
      const importedPrivateKey = await kms.importKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : true,
        id          : '1234',
        kms         : 'testKms',
        material    : new Uint8Array([1, 2, 3, 4]),
        type        : 'private',
        usages      : ['sign'],
      });
      expect(importedPrivateKey.id).to.be.a.string;
      expect(importedPrivateKey.id).to.not.equal('1234');

      // Test importing a public key and validate the result.
      // @ts-expect-error because an 'id' property is being specified even though it should not be.
      const importedPublicKey = await kms.importKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : true,
        id          : '1234',
        kms         : 'testKms',
        material    : new Uint8Array([1, 2, 3, 4]),
        type        : 'public',
        usages      : ['sign'],
      });
      expect(importedPublicKey.id).to.be.a.string;
      expect(importedPublicKey.id).to.not.equal('1234');

      // Test importing the asymmetric key pair and validate the result.
      const importedKeyPair = await kms.importKey({
        // @ts-expect-error because an 'id' property is being specified even though it should not be.
        privateKey: {
          algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
          extractable : true,
          id          : '1234',
          kms         : 'testKms',
          material    : new Uint8Array([1, 2, 3, 4]),
          type        : 'private',
          usages      : ['sign'],
        },
        publicKey: {
          algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
          extractable : true,
          id          : '1234',
          kms         : 'testKms',
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
      const importedPrivateKey = await kms.importKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : true,
        kms         : 'testKms',
        material    : new Uint8Array([1, 2, 3, 4]),
        type        : 'private',
        usages      : ['sign'],
      });
      expect(importedPrivateKey.material).to.not.exist;
    });

    it('returns key material for public keys', async () => {
      // Test importing the key and validate the result.
      const importedPrivateKey = await kms.importKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : true,
        kms         : 'testKms',
        material    : new Uint8Array([1, 2, 3, 4]),
        type        : 'public',
        usages      : ['verify'],
      });
      expect(importedPrivateKey.material).to.exist;
      expect(importedPrivateKey.material).to.be.an.instanceOf(ArrayBuffer);
    });

    it('throws an error if public and private keys are swapped', async () => {
      const testKeyBase = {
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : true,
        kms         : 'testKms',
      };

      // Test importing the key and validate the result.
      await expect(kms.importKey({
        privateKey: {
          ...testKeyBase,
          material : new Uint8Array([1, 2, 3, 4]),
          type     : 'public',
          usages   : ['verify'],
        },
        publicKey: {
          ...testKeyBase,
          material : new Uint8Array([1, 2, 3, 4]),
          type     : 'private',
          usages   : ['sign'],
        }
      })).to.eventually.be.rejectedWith(Error, 'failed due to private and public key mismatch');
    });

    it(`throws an error if key pair types are not 'private, public'`, async () => {
      const testKeyBase = {
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : true,
        kms         : 'testKms',
      };

      // Test importing the key and validate the result.
      await expect(kms.importKey({
        privateKey: {
          ...testKeyBase,
          material : new Uint8Array([1, 2, 3, 4]),
          type     : 'secret',
          usages   : ['verify'],
        },
        publicKey: {
          ...testKeyBase,
          material : new Uint8Array([1, 2, 3, 4]),
          type     : 'public',
          usages   : ['sign'],
        }
      })).to.eventually.be.rejectedWith(Error, `Must be 'private, public'`);
    });

    it(`throws an error if key type is not 'public', 'private', or 'secret'`, async () => {
      // Test importing the key and validate the result.
      // @ts-expect-error because `type` is being intentionally set to an invalid value to trigger an error.
      await expect(kms.importKey({
        algorithm   : { name: 'AES-CTR', length: 128 },
        extractable : true,
        kms         : 'local',
        material    : new Uint8Array([1, 2, 3, 4]),
        type        : 'invalid',
        usages      : ['encrypt', 'decrypt'],
      })).to.eventually.be.rejectedWith(Error, `Must be one of 'private, public, secret'`);
    });
  });

  describe('sign()', () => {
    it('generates signatures', async () => {
      const keyPair = await kms.generateKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : false,
        keyUsages   : ['sign', 'verify']
      });

      const signature = await kms.sign({
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
      const keyPair = await kms.generateKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : false,
        keyUsages   : ['sign', 'verify']
      });
      const key = keyPair.privateKey;
      let signature: ArrayBuffer;

      // ArrayBuffer
      const dataArrayBuffer = dataU8A.buffer;
      signature = await kms.sign({ algorithm, keyRef: key.id, data: dataArrayBuffer });
      expect(signature).to.be.instanceOf(ArrayBuffer);

      // DataView
      const dataView = new DataView(dataArrayBuffer);
      signature = await kms.sign({ algorithm, keyRef: key.id, data: dataView });
      expect(signature).to.be.instanceOf(ArrayBuffer);

      // TypedArray - Uint8Array
      signature = await kms.sign({ algorithm, keyRef: key.id, data: dataU8A });
      expect(signature).to.be.instanceOf(ArrayBuffer);

      // TypedArray - Int32Array
      const dataI32A = new Int32Array([10, 20, 30, 40]);
      signature = await kms.sign({ algorithm, keyRef: key.id, data: dataI32A });
      expect(signature).to.be.instanceOf(ArrayBuffer);

      // TypedArray - Uint32Array
      const dataU32A = new Uint32Array([8, 7, 6, 5, 4, 3, 2, 1]);
      signature = await kms.sign({ algorithm, keyRef: key.id, data: dataU32A });
      expect(signature).to.be.instanceOf(ArrayBuffer);
    });

    it('generates ECDSA secp256k1 signatures', async () => {
      const keyPair = await kms.generateKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : false,
        keyUsages   : ['sign', 'verify']
      });

      const signature = await kms.sign({
        algorithm : { name: 'ECDSA', hash: 'SHA-256' },
        keyRef    : keyPair.privateKey.id,
        data      : new Uint8Array([51, 52, 53]),
      });

      expect(signature).to.be.instanceOf(ArrayBuffer);
      expect(signature.byteLength).to.equal(64);
    });

    it('generates EdDSA Ed25519 signatures', async () => {
      const keyPair = await kms.generateKey({
        algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
        extractable : false,
        keyUsages   : ['sign', 'verify']
      });

      const signature = await kms.sign({
        algorithm : { name: 'EdDSA' },
        keyRef    : keyPair.privateKey.id,
        data      : new Uint8Array([51, 52, 53]),
      });

      expect(signature).to.be.instanceOf(ArrayBuffer);
      expect(signature.byteLength).to.equal(64);
    });

    it('throws an error when key reference is not found', async () => {
      await expect(kms.sign({
        algorithm : { name: 'ECDSA', hash: 'SHA-256' },
        keyRef    : 'non-existent-key',
        data      : new Uint8Array([51, 52, 53])
      })).to.eventually.be.rejectedWith(Error, 'Key not found');
    });
  });

  describe('verify()', () => {
    it('returns a boolean result', async () => {
      const dataU8A = new Uint8Array([51, 52, 53]);
      const keyPair = await kms.generateKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : false,
        keyUsages   : ['sign', 'verify']
      });

      const signature = await kms.sign({
        algorithm : { name: 'ECDSA', hash: 'SHA-256' },
        keyRef    : keyPair.privateKey.id,
        data      : dataU8A,
      });

      const isValid = await kms.verify({
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
      const keyPair = await kms.generateKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : false,
        keyUsages   : ['sign', 'verify']
      });
      let signature: ArrayBuffer;
      let isValid: boolean;

      // ArrayBuffer
      const dataArrayBuffer = dataU8A.buffer;
      signature = await kms.sign({ algorithm, keyRef: keyPair.privateKey.id, data: dataArrayBuffer });
      isValid = await kms.verify({ algorithm, keyRef: keyPair.publicKey.id, signature, data: dataArrayBuffer });
      expect(isValid).to.be.true;

      // DataView
      const dataView = new DataView(dataArrayBuffer);
      signature = await kms.sign({ algorithm, keyRef: keyPair.privateKey.id, data: dataView });
      isValid = await kms.verify({ algorithm, keyRef: keyPair.publicKey.id, signature, data: dataView });
      expect(isValid).to.be.true;

      // TypedArray - Uint8Array
      signature = await kms.sign({ algorithm, keyRef: keyPair.privateKey.id, data: dataU8A });
      isValid = await kms.verify({ algorithm, keyRef: keyPair.publicKey.id, signature, data: dataU8A });
      expect(isValid).to.be.true;

      // TypedArray - Int32Array
      const dataI32A = new Int32Array([10, 20, 30, 40]);
      signature = await kms.sign({ algorithm, keyRef: keyPair.privateKey.id, data: dataI32A });
      isValid = await kms.verify({ algorithm, keyRef: keyPair.publicKey.id, signature, data: dataI32A });
      expect(isValid).to.be.true;

      // TypedArray - Uint32Array
      const dataU32A = new Uint32Array([8, 7, 6, 5, 4, 3, 2, 1]);
      signature = await kms.sign({ algorithm, keyRef: keyPair.privateKey.id, data: dataU32A });
      isValid = await kms.verify({ algorithm, keyRef: keyPair.publicKey.id, signature, data: dataU32A });
      expect(isValid).to.be.true;
    });

    it('verifies ECDSA secp256k1 signatures', async () => {
      const keyPair = await kms.generateKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : false,
        keyUsages   : ['sign', 'verify']
      });

      const algorithm = { name: 'ECDSA', hash: 'SHA-256' };
      const dataU8A = new Uint8Array([51, 52, 53]);

      const signature = await kms.sign({ algorithm, keyRef: keyPair.privateKey.id, data: dataU8A });
      const isValid = await kms.verify({ algorithm, keyRef: keyPair.publicKey.id, signature, data: dataU8A });

      expect(isValid).to.be.true;
    });

    it('verifies EdDSA Ed25519 signatures', async () => {
      const keyPair = await kms.generateKey({
        algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
        extractable : false,
        keyUsages   : ['sign', 'verify']
      });

      const algorithm = { name: 'EdDSA' };
      const dataU8A = new Uint8Array([51, 52, 53]);

      const signature = await kms.sign({ algorithm, keyRef: keyPair.privateKey.id, data: dataU8A });
      const isValid = await kms.verify({ algorithm, keyRef: keyPair.publicKey.id, signature, data: dataU8A });

      expect(isValid).to.be.true;
    });

    it('throws an error when key reference is not found', async () => {
      await expect(kms.verify({
        algorithm : { name: 'ECDSA', hash: 'SHA-256' },
        keyRef    : 'non-existent-key',
        signature : (new Uint8Array([51, 52, 53])).buffer,
        data      : new Uint8Array([51, 52, 53])
      })).to.eventually.be.rejectedWith(Error, 'Key not found');
    });
  });

  describe('#getAlgorithm', function() {
    /**
       * We can't directly test private methods, but we can indirectly
       * test their behavior through the methods that use them. Since
       * #getAlgorithm() is used in the generateKey() method, we can
       * test this methods with known algorithm names.
       */
    it('does not throw an error when a supported algorithm is specified', async () => {
      await expect(kms.generateKey({
        algorithm : { name: 'ECDSA', namedCurve: 'secp256k1' },
        keyUsages : ['sign', 'verify']
      })).to.eventually.be.fulfilled;
    });

    it('throws error when an unsupported algorithm is specified', async () => {
      await expect(kms.generateKey({
        algorithm : { name: 'not-valid' },
        keyUsages : []
      })).to.eventually.be.rejectedWith(Error, 'is not supported');
    });
  });

  describe('#toCryptoKey', function() {
    /**
       * We can't directly test private methods, but we can indirectly
       * test their behavior through the methods that use them. Since
       * #toCryptoKey() is used in the verify() method, we can
       * test this methods with known algorithm names.
       */

    let getKeyStub: sinon.SinonStub<any[], any>;
    let kms: LocalKms;
    let kmsKeyStore: KmsKeyStore;

    beforeEach(() => {
      const kmsMemoryStore = new MemoryStore<string, ManagedKey | ManagedKeyPair>();
      kmsKeyStore = new KmsKeyStore(kmsMemoryStore);
      const kmsPrivateMemoryStore = new MemoryStore<string, ManagedPrivateKey>();
      const kmsPrivateKeyStore = new KmsPrivateKeyStore(kmsPrivateMemoryStore);
      kms = new LocalKms('local', kmsKeyStore, kmsPrivateKeyStore);
    });

    afterEach(() => {
      // Restore the original KmsKeyStore getKey() method after each test.
      getKeyStub.restore();
    });

    it('throws error when key material is missing', async () => {
      const keyPair = await kms.generateKey({
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : false,
        keyUsages   : ['sign', 'verify']
      });

      getKeyStub = sinon.stub(kmsKeyStore, 'getKey');
      getKeyStub.returns(Promise.resolve({ privateKey: {}, publicKey: {} }));
      await expect(kms.verify({
        algorithm : { name: 'ECDSA', hash: 'SHA-256' },
        keyRef    : keyPair.publicKey.id,
        signature : new ArrayBuffer(64),
        data      : new Uint8Array([51, 52, 53])
      })).to.eventually.be.rejectedWith(Error, `Required property missing: 'material'`);
    });
  });
});

describe('KmsKeyStore', () => {
  let kmsKeyStore: KmsKeyStore;
  let testKey: ManagedKey;

  beforeEach(() => {
    const memoryStore = new MemoryStore<string, ManagedKey | ManagedKeyPair>();

    kmsKeyStore = new KmsKeyStore(memoryStore);

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
      await kmsKeyStore.importKey({ key: testKey });

      // Test deleting the key and validate the result.
      const deleteResult = await kmsKeyStore.deleteKey({ id: testKey.id });
      expect(deleteResult).to.be.true;

      // Verify the key is no longer in the store.
      const storedKey = await kmsKeyStore.getKey({ id: testKey.id });
      expect(storedKey).to.be.undefined;
    });

    it('should return false if key does not exist', async () => {
      // Test deleting the key.
      const nonExistentId = '1234';
      const deleteResult = await kmsKeyStore.deleteKey({ id: nonExistentId });

      // Validate the key was not deleted.
      expect(deleteResult).to.be.false;
    });
  });

  describe('getKey()', () => {
    it('should return a key if it exists', async () => {
      // Import the key.
      await kmsKeyStore.importKey({ key: testKey });

      // Test getting the key.
      const storedKey = await kmsKeyStore.getKey({ id: testKey.id });

      // Verify the key is in the store.
      expect(storedKey).to.deep.equal(testKey);
    });

    it('should return undefined when attempting to get a non-existent key', async () => {
      // Test getting the key.
      const storedKey = await kmsKeyStore.getKey({ id: 'non-existent-key' });

      // Verify the key is no longer in the store.
      expect(storedKey).to.be.undefined;
    });
  });

  describe('importKey()', () => {
    it('should import a key that does not already exist', async () => {
      // Test importing the key and validate the result.
      const importResult = await kmsKeyStore.importKey({ key: testKey });
      expect(importResult).to.equal(testKey.id);
      expect(importResult).to.be.a.string;

      // Verify the key is present in the key store.
      const storedKey = await kmsKeyStore.getKey({ id: testKey.id });
      expect(storedKey).to.deep.equal(testKey);
    });

    it('should generate and return an ID if one is not provided', async () => {
      const     testKey = {
        algorithm   : { name: 'AES', length: 256 },
        extractable : true,
        kms         : 'testKms',
        state       : 'Enabled',
        type        : 'secret',
        usages      : ['encrypt', 'decrypt'],
      };

      // Test importing the key and validate the result.
      // @ts-expect-error because the ID property was intentionally omitted from the key object to be imported.
      const importResult = await kmsKeyStore.importKey({ key: testKey });
      expect(importResult).to.be.a.string;

      // Verify the key is present in the key store.
      const storedKey = await kmsKeyStore.getKey({ id: importResult }) as ManagedKey;
      expect(storedKey.id).to.equal(importResult);
    });

    it('should throw an error when attempting to import a key that already exists', async () => {
      // Import the key and validate the result.
      const importResult = await kmsKeyStore.importKey({ key: testKey });
      expect(importResult).to.equal(testKey.id);

      // Test importing the key and assert it throws an error.
      const importKey = kmsKeyStore.importKey({ key: testKey });
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
        await kmsKeyStore.importKey({ key });
      }

      // List keys and verify the result.
      const storedKeys = await kmsKeyStore.listKeys();
      expect(storedKeys).to.deep.equal(testKeys);
    });

    it('should return an empty array if the store contains no keys', async () => {
      // List keys and verify the result is empty.
      const storedKeys = await kmsKeyStore.listKeys();
      expect(storedKeys).to.be.empty;
    });
  });
});

describe('KmsPrivateKeyStore', () => {
  let kmsPrivateKeyStore: KmsPrivateKeyStore;
  let testKey: Omit<ManagedPrivateKey, 'id'>;
  let keyMaterial: ArrayBuffer;

  beforeEach(() => {
    const memoryStore = new MemoryStore<string, ManagedPrivateKey>();

    kmsPrivateKeyStore = new KmsPrivateKeyStore(memoryStore);

    keyMaterial = (new Uint8Array([1, 2, 3])).buffer;
    testKey = {
      material : (new Uint8Array([1, 2, 3])).buffer,
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

  describe('getKey()', () => {
    it('sshould return a key if it exists', async () => {
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
      })).to.eventually.be.rejectedWith(TypeError, `Required parameter was missing: 'material'`);

      // Missing 'type'.
      const keyMissingType = { material: new ArrayBuffer(8) };
      await expect(kmsPrivateKeyStore.importKey({
        // @ts-expect-error because the type property is intentionally omitted to trigger an error.
        key: keyMissingType
      })).to.eventually.be.rejectedWith(TypeError, `Required parameter was missing: 'type'`);
    });
  });

  describe('listKeys()', function() {
    it('should return an array of all keys in the store', async function() {
      // Define multiple keys to be added.
      const testKeys = [
        { ...testKey, material: (new Uint8Array([1, 2, 3])).buffer},
        { ...testKey, material: (new Uint8Array([1, 2, 3])).buffer},
        { ...testKey, material: (new Uint8Array([1, 2, 3])).buffer}
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
});