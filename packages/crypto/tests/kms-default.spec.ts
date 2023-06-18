import { expect } from 'chai';

import { MemoryKeyStore } from '../src/key-store-memory.js';
import { ManagedKey, ManagedKeyPair, ManagedPrivateKey } from '../src/types-key-manager.js';
import { DefaultKms, DefaultEcdsaAlgorithm, DefaultEdDsaAlgorithm, KmsKeyStore, KmsPrivateKeyStore } from '../src/kms/default/index.js';

describe('DefaultKms', () => {
  describe('KMS', () => {
    describe('generateKey()', () => {
      let kms: DefaultKms;

      beforeEach(() => {
        const memoryKeyStore = new MemoryKeyStore<string, ManagedKey | ManagedKeyPair>();
        const kmsKeyStore = new KmsKeyStore(memoryKeyStore);
        const memoryPrivateKeyStore = new MemoryKeyStore<string, ManagedPrivateKey>();
        const kmsPrivateKeyStore = new KmsPrivateKeyStore(memoryPrivateKeyStore);
        kms = new DefaultKms('default', kmsKeyStore, kmsPrivateKeyStore);
      });

      it('creates ECDSA key pairs with compressed public keys, by default', async () => {
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
        if (!('namedCurve' in keys.privateKey.algorithm)) throw new Error; // type guard
        expect(keys.privateKey.algorithm.namedCurve).to.equal('secp256k1');
        if (!('namedCurve' in keys.publicKey.algorithm)) throw new Error; // type guard
        expect(keys.publicKey.algorithm.namedCurve).to.equal('secp256k1');
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

      it('creates ECDSA key pairs with uncompressed public keys, if specified', async () => {
        const keys = await kms.generateKey({
          algorithm : { name: 'ECDSA', namedCurve: 'secp256k1', compressedPublicKey: false },
          keyUsages : ['sign', 'verify']
        });

        // Check values that are identical for both keys in the pair.
        expect(keys.privateKey.algorithm.name).to.equal('ECDSA');
        expect(keys.publicKey.algorithm.name).to.equal('ECDSA');
        if (!('namedCurve' in keys.privateKey.algorithm)) throw new Error; // type guard
        expect(keys.privateKey.algorithm.namedCurve).to.equal('secp256k1');
        if (!('namedCurve' in keys.publicKey.algorithm)) throw new Error; // type guard
        expect(keys.publicKey.algorithm.namedCurve).to.equal('secp256k1');

        // Check values unique to the public key.
        if (!keys.publicKey.material) throw new Error; // type guard
        expect(keys.publicKey.material.byteLength).to.equal(65);
      });

      it('creates EdDSA key pairs', async () => {
        const keys = await kms.generateKey({
          algorithm : { name: 'EdDSA', namedCurve: 'Ed25519' },
          keyUsages : ['sign', 'verify']
        });

        expect(keys).to.have.property('privateKey');
        expect(keys).to.have.property('publicKey');
        expect(keys.privateKey.id).to.equal(keys.publicKey.id);

        // Check values that are identical for both keys in the pair.
        expect(keys.privateKey.algorithm.name).to.equal('EdDSA');
        expect(keys.publicKey.algorithm.name).to.equal('EdDSA');
        if (!('namedCurve' in keys.privateKey.algorithm)) throw new Error; // type guard
        expect(keys.privateKey.algorithm.namedCurve).to.equal('Ed25519');
        if (!('namedCurve' in keys.publicKey.algorithm)) throw new Error; // type guard
        expect(keys.publicKey.algorithm.namedCurve).to.equal('Ed25519');
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
        expect(keys.publicKey.material.byteLength).to.equal(32);
        expect(keys.publicKey.type).to.equal('public');
        expect(keys.publicKey.usages).to.deep.equal(['verify']);
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
  });

  describe('Supported Crypto Algorithms', () => {

    describe('DefaultEcdsaAlgorithm', () => {
      let ecdsa: DefaultEcdsaAlgorithm;

      before(() => {
        ecdsa = DefaultEcdsaAlgorithm.create();
      });

      describe('generateKey()', async () => {
        it('returns a key pair', async () => {
          const keys = await ecdsa.generateKey({
            algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
            extractable : false,
            keyUsages   : ['sign', 'verify']
          });

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
          keys = await ecdsa.generateKey({
            algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1'  },
            extractable : false,
            keyUsages   : ['sign', 'verify']
          });
          expect(keys.publicKey.extractable).to.be.true;

          // publicKey is extractable if generateKey() called with extractable = true
          keys = await ecdsa.generateKey({
            algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1'  },
            extractable : true,
            keyUsages   : ['sign', 'verify']
          });
          expect(keys.publicKey.extractable).to.be.true;
        });

        it('private key is selectively extractable', async () => {
          let keys: CryptoKeyPair;
          // privateKey is NOT extractable if generateKey() called with extractable = false
          keys = await ecdsa.generateKey({
            algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1'  },
            extractable : false,
            keyUsages   : ['sign', 'verify']
          });
          expect(keys.privateKey.extractable).to.be.false;

          // privateKey is extractable if generateKey() called with extractable = true
          keys = await ecdsa.generateKey({
            algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1'  },
            extractable : true,
            keyUsages   : ['sign', 'verify']
          });
          expect(keys.privateKey.extractable).to.be.true;
        });

        it(`supports 'secp256k1' curve`, async () => {
          const keys = await ecdsa.generateKey({
            algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
            extractable : false,
            keyUsages   : ['sign', 'verify']
          });

          if (!('namedCurve' in keys.privateKey.algorithm)) throw new Error; // type guard
          expect(keys.privateKey.algorithm.namedCurve).to.equal('secp256k1');
          if (!('namedCurve' in keys.publicKey.algorithm)) throw new Error; // type guard
          expect(keys.publicKey.algorithm.namedCurve).to.equal('secp256k1');
        });
      });
    });
    describe('DefaultEdDsaAlgorithm', () => {
      let eddsa: DefaultEdDsaAlgorithm;

      before(() => {
        eddsa = DefaultEdDsaAlgorithm.create();
      });

      describe('generateKey()', async () => {
        it('returns a key pair', async () => {
          const keys = await eddsa.generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
            extractable : false,
            keyUsages   : ['sign', 'verify']
          });

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
          keys = await eddsa.generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519'  },
            extractable : false,
            keyUsages   : ['sign', 'verify']
          });
          expect(keys.publicKey.extractable).to.be.true;

          // publicKey is extractable if generateKey() called with extractable = true
          keys = await eddsa.generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519'  },
            extractable : true,
            keyUsages   : ['sign', 'verify']
          });
          expect(keys.publicKey.extractable).to.be.true;
        });

        it('private key is selectively extractable', async () => {
          let keys: CryptoKeyPair;
          // privateKey is NOT extractable if generateKey() called with extractable = false
          keys = await eddsa.generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519'  },
            extractable : false,
            keyUsages   : ['sign', 'verify']
          });
          expect(keys.privateKey.extractable).to.be.false;

          // privateKey is extractable if generateKey() called with extractable = true
          keys = await eddsa.generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519'  },
            extractable : true,
            keyUsages   : ['sign', 'verify']
          });
          expect(keys.privateKey.extractable).to.be.true;
        });

        it(`supports 'Ed25519' curve`, async () => {
          const keys = await eddsa.generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
            extractable : false,
            keyUsages   : ['sign', 'verify']
          });

          if (!('namedCurve' in keys.privateKey.algorithm)) throw new Error; // type guard
          expect(keys.privateKey.algorithm.namedCurve).to.equal('Ed25519');
          if (!('namedCurve' in keys.publicKey.algorithm)) throw new Error; // type guard
          expect(keys.publicKey.algorithm.namedCurve).to.equal('Ed25519');
        });
      });
    });
  });
});