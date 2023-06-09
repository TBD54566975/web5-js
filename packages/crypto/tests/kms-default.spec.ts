import { expect } from 'chai';

import { MemoryKeyStore } from '../src/key-store-memory.js';
import { DefaultKms, DefaultEcdsaAlgorithm, KmsKeyStore, KmsPrivateKeyStore } from '../src/kms/default/index.js';
import { ManagedKey, ManagedKeyPair, ManagedPrivateKey } from '../src/types-new.js';

describe('DefaultKms', () => {
  describe('KMS', () => {
    describe('createKey()', () => {
      let kms: DefaultKms;

      beforeEach(() => {
        const memoryKeyStore = new MemoryKeyStore<string, ManagedKey | ManagedKeyPair>();
        const kmsKeyStore = new KmsKeyStore(memoryKeyStore);
        const memoryPrivateKeyStore = new MemoryKeyStore<string, ManagedPrivateKey>();
        const kmsPrivateKeyStore = new KmsPrivateKeyStore(memoryPrivateKeyStore);
        kms = new DefaultKms(kmsKeyStore, kmsPrivateKeyStore);
      });

      it('creates ECDSA K-256 key pairs', async () => {
        const keys = await kms.createKey({
          spec        : 'ECDSA_K-256',
          usages      : ['sign', 'verify'],
          extractable : true,
        }) as ManagedKeyPair;

        expect(keys).to.have.property('privateKey');
        expect(keys).to.have.property('publicKey');
        if (!keys.privateKey || !keys.publicKey) throw new Error; // type guard
        expect(keys.privateKey.id).to.equal(keys!.publicKey!.id);

        expect(keys.privateKey.material).to.be.undefined;
        expect(keys.privateKey.spec).to.equal('ECDSA_K-256');
        expect(keys.privateKey.algorithm.name).to.equal('ECDSA');
        if (!('namedCurve' in keys.privateKey.algorithm)) throw new Error; // type guard
        expect(keys.privateKey.algorithm.namedCurve).to.equal('K-256');
        expect(keys.privateKey.type).to.equal('private');
        expect(keys.privateKey.usages).to.deep.equal(['sign']);

        expect(keys.publicKey.material).to.be.an.instanceOf(ArrayBuffer);
        if (!keys.publicKey.material) throw new Error; // type guard
        expect(keys.publicKey.material.byteLength).to.equal(33);
        expect(keys.publicKey.algorithm.name).to.equal('ECDSA');
        expect(keys.publicKey.type).to.equal('public');
        expect(keys.publicKey.usages).to.deep.equal(['verify']);
      });

      it('creates keys using aliases', async () => {
        const keys = await kms.createKey({
          spec        : 'secp256k1',
          usages      : ['sign', 'verify'],
          extractable : true,
        }) as ManagedKeyPair;

        if (!keys.privateKey || !keys.publicKey) throw new Error; // type guard
        expect(keys.privateKey.spec).to.equal('ECDSA_K-256');
        expect(keys.privateKey.algorithm.name).to.equal('ECDSA');
      });

      it('ignores case of algorithm spec names and aliases', () => {
        let keys: ManagedKeyPair;

        ['eCdSa_k-256', 'SECP256K1'].forEach(async (specName) => {
          keys = await kms.createKey({
            // @ts-expect-error because the spec name casing is being changed to test case-insensitivity.
            spec        : specName,
            usages      : ['sign', 'verify'],
            extractable : true,
          }) as ManagedKeyPair;

          if (!keys.privateKey || !keys.publicKey) throw new Error; // type guard
          expect(keys.privateKey.spec).to.equal('ECDSA_K-256');
          expect(keys.privateKey.algorithm.name).to.equal('ECDSA');
          if (!('namedCurve' in keys.privateKey.algorithm)) throw new Error; // type guard
          expect(keys.privateKey.algorithm.namedCurve).to.equal('K-256');
        });
      });
    });
  });

  describe('Supported Crypto Algorithms', () => {

    describe('DefaultEcdsaAlgorithm', () => {
      let ecdsa: DefaultEcdsaAlgorithm;

      before(() => {
        ecdsa = DefaultEcdsaAlgorithm.create();
      });

      describe('generateKey()', async () => {
        it('returns a key pair', async () => {
          const keys = await ecdsa.generateKey({ name: 'ECDSA', namedCurve: 'K-256' }, false, ['sign', 'verify']);

          expect(keys).to.have.property('privateKey');
          expect(keys.privateKey.type).to.equal('private');
          expect(keys.privateKey.usages).to.deep.equal(['sign']);

          expect(keys).to.have.property('publicKey');
          expect(keys.publicKey.type).to.equal('public');
          expect(keys.publicKey.usages).to.deep.equal(['verify']);
        });

        it('public key is always extractable', async () => {
          let keys: CryptoKeyPair;
          // publicKey is extractable if generateKey() called with extractable = false
          keys = await ecdsa.generateKey({ name: 'ECDSA', namedCurve: 'K-256'  }, false, ['sign', 'verify']);
          expect(keys.publicKey.extractable).to.be.true;

          // publicKey is extractable if generateKey() called with extractable = true
          keys = await ecdsa.generateKey({ name: 'ECDSA', namedCurve: 'K-256'  }, true, ['sign', 'verify']);
          expect(keys.publicKey.extractable).to.be.true;
        });

        it('private key is selectively extractable', async () => {
          let keys: CryptoKeyPair;
          // privateKey is NOT extractable if generateKey() called with extractable = false
          keys = await ecdsa.generateKey({ name: 'ECDSA', namedCurve: 'K-256'  }, false, ['sign', 'verify']);
          expect(keys.privateKey.extractable).to.be.false;

          // privateKey is extractable if generateKey() called with extractable = true
          keys = await ecdsa.generateKey({ name: 'ECDSA', namedCurve: 'K-256'  }, true, ['sign', 'verify']);
          expect(keys.privateKey.extractable).to.be.true;
        });
      });
    });

  });
});