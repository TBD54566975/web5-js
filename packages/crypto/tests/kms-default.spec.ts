import type { Web5Crypto } from '../src/types-key-manager.js';

import sinon from 'sinon';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { MemoryKeyStore } from '../src/key-store-memory.js';
import { Ed25519, Secp256k1, X25519 } from '../src/crypto-algorithms/index.js';
import { InvalidAccessError, NotSupportedError } from '../src/algorithms-api/errors.js';
import { ManagedKey, ManagedKeyPair, ManagedPrivateKey } from '../src/types-key-manager.js';
import {
  DefaultKms,
  KmsKeyStore,
  KmsPrivateKeyStore,
  DefaultEcdhAlgorithm,
  DefaultEcdsaAlgorithm,
  DefaultEdDsaAlgorithm,
} from '../src/kms/default/index.js';

chai.use(chaiAsPromised);

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

      it('creates ECDSA secp256k1 key pairs with compressed public keys, by default', async () => {
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

      it('creates ECDSA secp256k1 key pairs with uncompressed public keys, if specified', async () => {
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

    describe('DefaultEcdhAlgorithm', () => {
      let ecdh: DefaultEcdhAlgorithm;

      before(() => {
        ecdh = DefaultEcdhAlgorithm.create();
      });

      describe('generateKey()', () => {
        it('returns a key pair', async () => {
          const keys = await ecdh.generateKey({
            algorithm   : { name: 'ECDH', namedCurve: 'X25519' },
            extractable : false,
            keyUsages   : ['deriveBits', 'deriveKey']
          });

          expect(keys).to.have.property('privateKey');
          expect(keys.privateKey.type).to.equal('private');
          expect(keys.privateKey.usages).to.deep.equal(['deriveBits', 'deriveKey']);

          expect(keys).to.have.property('publicKey');
          expect(keys.publicKey.type).to.equal('public');
          expect(keys.publicKey.usages).to.deep.equal(['deriveBits', 'deriveKey']);
        });

        it('public key is always extractable', async () => {
          let keys: CryptoKeyPair;
          // publicKey is extractable if generateKey() called with extractable = false
          keys = await ecdh.generateKey({
            algorithm   : { name: 'ECDH', namedCurve: 'X25519'  },
            extractable : false,
            keyUsages   : ['deriveBits', 'deriveKey']
          });
          expect(keys.publicKey.extractable).to.be.true;

          // publicKey is extractable if generateKey() called with extractable = true
          keys = await ecdh.generateKey({
            algorithm   : { name: 'ECDH', namedCurve: 'X25519'  },
            extractable : true,
            keyUsages   : ['deriveBits', 'deriveKey']
          });
          expect(keys.publicKey.extractable).to.be.true;
        });

        it('private key is selectively extractable', async () => {
          let keys: CryptoKeyPair;
          // privateKey is NOT extractable if generateKey() called with extractable = false
          keys = await ecdh.generateKey({
            algorithm   : { name: 'ECDH', namedCurve: 'X25519'  },
            extractable : false,
            keyUsages   : ['deriveBits', 'deriveKey']
          });
          expect(keys.privateKey.extractable).to.be.false;

          // privateKey is extractable if generateKey() called with extractable = true
          keys = await ecdh.generateKey({
            algorithm   : { name: 'ECDH', namedCurve: 'X25519'  },
            extractable : true,
            keyUsages   : ['deriveBits', 'deriveKey']
          });
          expect(keys.privateKey.extractable).to.be.true;
        });

        it(`supports 'secp256k1' curve with compressed public keys, by default`, async () => {
          const keys = await ecdh.generateKey({
            algorithm   : { name: 'ECDH', namedCurve: 'secp256k1' },
            extractable : false,
            keyUsages   : ['deriveBits', 'deriveKey']
          });

          if (!('namedCurve' in keys.privateKey.algorithm)) throw new Error; // type guard
          expect(keys.privateKey.algorithm.namedCurve).to.equal('secp256k1');
          if (!('namedCurve' in keys.publicKey.algorithm)) throw new Error; // type guard
          expect(keys.publicKey.algorithm.namedCurve).to.equal('secp256k1');
          if (!('compressedPublicKey' in keys.publicKey.algorithm)) throw new Error; // type guard
          expect(keys.publicKey.algorithm.compressedPublicKey).to.be.true;
        });

        it(`supports 'secp256k1' curve with compressed public keys`, async () => {
          const keys = await ecdh.generateKey({
            algorithm   : { name: 'ECDH', namedCurve: 'secp256k1', compressedPublicKey: true },
            extractable : false,
            keyUsages   : ['deriveBits', 'deriveKey']
          });

          if (!('namedCurve' in keys.privateKey.algorithm)) throw new Error; // type guard
          expect(keys.privateKey.algorithm.namedCurve).to.equal('secp256k1');
          if (!('namedCurve' in keys.publicKey.algorithm)) throw new Error; // type guard
          expect(keys.publicKey.algorithm.namedCurve).to.equal('secp256k1');
          if (!('compressedPublicKey' in keys.publicKey.algorithm)) throw new Error; // type guard
          expect(keys.publicKey.algorithm.compressedPublicKey).to.be.true;
        });

        it(`supports 'secp256k1' curve with uncompressed public keys`, async () => {
          const keys = await ecdh.generateKey({
            algorithm   : { name: 'ECDH', namedCurve: 'secp256k1', compressedPublicKey: false },
            extractable : false,
            keyUsages   : ['deriveBits', 'deriveKey']
          });

          if (!('namedCurve' in keys.privateKey.algorithm)) throw new Error; // type guard
          expect(keys.privateKey.algorithm.namedCurve).to.equal('secp256k1');
          if (!('namedCurve' in keys.publicKey.algorithm)) throw new Error; // type guard
          expect(keys.publicKey.algorithm.namedCurve).to.equal('secp256k1');
          if (!('compressedPublicKey' in keys.publicKey.algorithm)) throw new Error; // type guard
          expect(keys.publicKey.algorithm.compressedPublicKey).to.be.false;
        });

        it(`supports 'X25519' curve`, async () => {
          const keys = await ecdh.generateKey({
            algorithm   : { name: 'ECDH', namedCurve: 'X25519' },
            extractable : false,
            keyUsages   : ['deriveBits', 'deriveKey']
          });

          if (!('namedCurve' in keys.privateKey.algorithm)) throw new Error; // type guard
          expect(keys.privateKey.algorithm.namedCurve).to.equal('X25519');
          if (!('namedCurve' in keys.publicKey.algorithm)) throw new Error; // type guard
          expect(keys.publicKey.algorithm.namedCurve).to.equal('X25519');
        });

        it(`supports 'deriveBits' and/or 'deriveKey' key usages`, async () => {
          await expect(ecdh.generateKey({
            algorithm   : { name: 'ECDH', namedCurve: 'X25519' },
            extractable : false,
            keyUsages   : ['deriveBits']
          })).to.eventually.be.fulfilled;

          await expect(ecdh.generateKey({
            algorithm   : { name: 'ECDH', namedCurve: 'X25519' },
            extractable : false,
            keyUsages   : ['deriveKey']
          })).to.eventually.be.fulfilled;

          await expect(ecdh.generateKey({
            algorithm   : { name: 'ECDH', namedCurve: 'X25519' },
            extractable : false,
            keyUsages   : ['deriveBits', 'deriveKey']
          })).to.eventually.be.fulfilled;
        });

        it('validates algorithm, named curve, and key usages', async () => {
          // Invalid (algorithm name, named curve, and key usages) result in algorithm name check failing first.
          await expect(ecdh.generateKey({
            algorithm   : { name: 'foo', namedCurve: 'bar' },
            extractable : false,
            keyUsages   : ['encrypt']
          })).to.eventually.be.rejectedWith(NotSupportedError, 'Algorithm not supported');

          // Valid (algorithm name) + Invalid (named curve, key usages) result named curve check failing first.
          await expect(ecdh.generateKey({
            algorithm   : { name: 'ECDH', namedCurve: 'bar' },
            extractable : false,
            keyUsages   : ['encrypt']
          })).to.eventually.be.rejectedWith(TypeError, 'Out of range');

          // Valid (algorithm name, named curve) + Invalid (key usages) result key usages check failing first.
          await expect(ecdh.generateKey({
            algorithm   : { name: 'ECDH', namedCurve: 'X25519' },
            extractable : false,
            keyUsages   : ['encrypt']
          })).to.eventually.be.rejectedWith(InvalidAccessError, 'Requested operation');
        });

        it(`should throw an error if 'X25519' key pair generation fails`, async function() {
          // @ts-ignore because the method is being intentionally stubbed to return null.
          const x25519Stub = sinon.stub(X25519, 'generateKeyPair').returns(Promise.resolve(null));

          try {
            await ecdh.generateKey({
              algorithm   : { name: 'ECDH', namedCurve: 'X25519' },
              extractable : false,
              keyUsages   : ['deriveBits', 'deriveKey']
            });
            x25519Stub.restore();
            expect.fail('Expect generateKey() to throw an error');
          } catch (error) {
            x25519Stub.restore();
            expect(error).to.be.an('error');
            expect((error as Error).message).to.equal('Operation failed to generate key pair.');
          }
        });
      });

      describe('sign()', () => {
        it(`throws an error because 'sign' operation is valid for ECDH keys`, async () => {
          await expect(ecdh.sign()).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for ECDH keys');
        });
      });

      describe('verify()', () => {
        it(`throws an error because 'verify' operation is valid for ECDH keys`, async () => {
          await expect(ecdh.verify()).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for ECDH keys');
        });
      });
    });

    describe('DefaultEcdsaAlgorithm', () => {
      let ecdsa: DefaultEcdsaAlgorithm;

      before(() => {
        ecdsa = DefaultEcdsaAlgorithm.create();
      });

      describe('generateKey()', () => {
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

        it(`supports 'secp256k1' curve with compressed public keys, by default`, async () => {
          const keys = await ecdsa.generateKey({
            algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
            extractable : false,
            keyUsages   : ['sign', 'verify']
          });

          if (!('namedCurve' in keys.privateKey.algorithm)) throw new Error; // type guard
          expect(keys.privateKey.algorithm.namedCurve).to.equal('secp256k1');
          if (!('namedCurve' in keys.publicKey.algorithm)) throw new Error; // type guard
          expect(keys.publicKey.algorithm.namedCurve).to.equal('secp256k1');
          if (!('compressedPublicKey' in keys.publicKey.algorithm)) throw new Error; // type guard
          expect(keys.publicKey.algorithm.compressedPublicKey).to.be.true;
        });

        it(`supports 'secp256k1' curve with compressed public keys`, async () => {
          const keys = await ecdsa.generateKey({
            algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1', compressedPublicKey: true },
            extractable : false,
            keyUsages   : ['sign', 'verify']
          });

          if (!('namedCurve' in keys.privateKey.algorithm)) throw new Error; // type guard
          expect(keys.privateKey.algorithm.namedCurve).to.equal('secp256k1');
          if (!('namedCurve' in keys.publicKey.algorithm)) throw new Error; // type guard
          expect(keys.publicKey.algorithm.namedCurve).to.equal('secp256k1');
          if (!('compressedPublicKey' in keys.publicKey.algorithm)) throw new Error; // type guard
          expect(keys.publicKey.algorithm.compressedPublicKey).to.be.true;
        });

        it(`supports 'secp256k1' curve with uncompressed public keys`, async () => {
          const keys = await ecdsa.generateKey({
            algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1', compressedPublicKey: false },
            extractable : false,
            keyUsages   : ['sign', 'verify']
          });

          if (!('namedCurve' in keys.privateKey.algorithm)) throw new Error; // type guard
          expect(keys.privateKey.algorithm.namedCurve).to.equal('secp256k1');
          if (!('namedCurve' in keys.publicKey.algorithm)) throw new Error; // type guard
          expect(keys.publicKey.algorithm.namedCurve).to.equal('secp256k1');
          if (!('compressedPublicKey' in keys.publicKey.algorithm)) throw new Error; // type guard
          expect(keys.publicKey.algorithm.compressedPublicKey).to.be.false;
        });

        it(`supports 'sign' and/or 'verify' key usages`, async () => {
          await expect(ecdsa.generateKey({
            algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
            extractable : false,
            keyUsages   : ['sign']
          })).to.eventually.be.fulfilled;

          await expect(ecdsa.generateKey({
            algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
            extractable : false,
            keyUsages   : ['verify']
          })).to.eventually.be.fulfilled;

          await expect(ecdsa.generateKey({
            algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
            extractable : false,
            keyUsages   : ['sign', 'verify']
          })).to.eventually.be.fulfilled;
        });

        it('validates algorithm, named curve, and key usages', async () => {
          // Invalid (algorithm name, named curve, and key usages) result in algorithm name check failing first.
          await expect(ecdsa.generateKey({
            algorithm   : { name: 'foo', namedCurve: 'bar' },
            extractable : false,
            keyUsages   : ['encrypt']
          })).to.eventually.be.rejectedWith(NotSupportedError, 'Algorithm not supported');

          // Valid (algorithm name) + Invalid (named curve, key usages) result named curve check failing first.
          await expect(ecdsa.generateKey({
            algorithm   : { name: 'ECDSA', namedCurve: 'bar' },
            extractable : false,
            keyUsages   : ['encrypt']
          })).to.eventually.be.rejectedWith(TypeError, 'Out of range');

          // Valid (algorithm name, named curve) + Invalid (key usages) result key usages check failing first.
          await expect(ecdsa.generateKey({
            algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
            extractable : false,
            keyUsages   : ['encrypt']
          })).to.eventually.be.rejectedWith(InvalidAccessError, 'Requested operation');
        });

        it(`should throw an error if 'secp256k1' key pair generation fails`, async function() {
          // @ts-ignore because the method is being intentionally stubbed to return null.
          const secp256k1Stub = sinon.stub(Secp256k1, 'generateKeyPair').returns(Promise.resolve(null));

          try {
            await ecdsa.generateKey({
              algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
              extractable : true,
              keyUsages   : ['sign']
            });
            secp256k1Stub.restore();
            expect.fail('Expect generateKey() to throw an error');
          } catch (error) {
            secp256k1Stub.restore();
            expect(error).to.be.an('error');
            expect((error as Error).message).to.equal('Operation failed to generate key pair.');
          }
        });
      });

      describe('sign()', () => {

        let keyPair: Web5Crypto.CryptoKeyPair;
        let dataU8A = new Uint8Array([51, 52, 53]);

        beforeEach(async () => {
          keyPair = await ecdsa.generateKey({
            algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
            extractable : false,
            keyUsages   : ['sign', 'verify']
          });
        });

        it(`returns a signature for 'secp256k1' keys`, async () => {
          const signature = await ecdsa.sign({
            algorithm : { name: 'ECDSA', hash: 'SHA-256' },
            key       : keyPair.privateKey,
            data      : dataU8A
          });

          expect(signature).to.be.instanceOf(ArrayBuffer);
          expect(signature.byteLength).to.equal(64);
        });

        it('validates algorithm name and key algorithm name', async () => {
          // Invalid (algorithm name, hash algorithm, private key, and data) result in algorithm name check failing first.
          await expect(ecdsa.sign({
            algorithm : { name: 'Nope', hash: 'nope' },
            // @ts-expect-error because invalid key intentionally specified.
            key       : { foo: 'bar '},
            // @ts-expect-error because invalid data type intentionally specified.
            data      : 'baz'
          })).to.eventually.be.rejectedWith(NotSupportedError, 'Algorithm not supported');

          // Valid (algorithm name) + Invalid (hash algorithm, private key, and data) result in hash algorithm check failing first.
          await expect(ecdsa.sign({
            algorithm : { name: 'ECDSA', hash: 'nope' },
            // @ts-expect-error because invalid key intentionally specified.
            key       : { foo: 'bar '},
            // @ts-expect-error because invalid data type intentionally specified.
            data      : 'baz'
          })).to.eventually.be.rejectedWith(TypeError, 'Out of range');

          // Valid (algorithm name, hash algorithm) + Invalid (private key, and data) result in key algorithm name check failing first.
          await expect(ecdsa.sign({
            algorithm : { name: 'ECDSA', hash: 'SHA-256' },
            // @ts-expect-error because invalid key intentionally specified.
            key       : { algorithm: { name: 'bar '} },
            // @ts-expect-error because invalid data type intentionally specified.
            data      : 'baz'
          })).to.eventually.be.rejectedWith(InvalidAccessError, 'does not match');
        });

        it('validates that key is not a public key', async () => {
          // Valid (algorithm name, hash algorithm, data) + Invalid (private key) result in key type check failing first.
          await expect(ecdsa.sign({
            algorithm : { name: 'ECDSA', hash: 'SHA-256' },
            key       : keyPair.publicKey,
            data      : dataU8A
          })).to.eventually.be.rejectedWith(InvalidAccessError, 'Requested operation is not valid');
        });

        it(`validates that key usage is 'sign'`, async () => {
          // Manually specify the private key usages to exclude the 'sign' operation.
          keyPair.privateKey.usages = ['verify'];

          await expect(ecdsa.sign({
            algorithm : { name: 'ECDSA', hash: 'SHA-256' },
            key       : keyPair.privateKey,
            data      : dataU8A
          })).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for the provided key');
        });

        it('throws an error when key is an unsupported curve', async () => {
          // Manually change the key's named curve to trigger an error.
          // @ts-expect-error because TS can't determine the type of key.
          keyPair.privateKey.algorithm.namedCurve = 'nope';

          await expect(ecdsa.sign({
            algorithm : { name: 'ECDSA', hash: 'SHA-256' },
            key       : keyPair.privateKey,
            data      : dataU8A
          })).to.eventually.be.rejectedWith(TypeError, 'Out of range');
        });
      });

      describe('verify()', () => {
        let keyPair: Web5Crypto.CryptoKeyPair;
        let signature: ArrayBuffer;
        let dataU8A = new Uint8Array([51, 52, 53]);

        beforeEach(async () => {
          keyPair = await ecdsa.generateKey({
            algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
            extractable : false,
            keyUsages   : ['sign', 'verify']
          });

          signature = await ecdsa.sign({
            algorithm : { name: 'ECDSA', hash: 'SHA-256' },
            key       : keyPair.privateKey,
            data      : dataU8A
          });
        });

        it(`returns a verification result for 'secp256k1' keys`, async () => {
          const isValid = await ecdsa.verify({
            algorithm : { name: 'ECDSA', hash: 'SHA-256' },
            key       : keyPair.publicKey,
            signature : signature,
            data      : dataU8A
          });

          expect(isValid).to.be.a('boolean');
          expect(isValid).to.be.true;
        });

        it('validates algorithm name and key algorithm name', async () => {
          // Invalid (algorithm name, hash algorithm, public key, signature, and data) result in algorithm name check failing first.
          await expect(ecdsa.verify({
            algorithm : { name: 'Nope', hash: 'nope' },
            // @ts-expect-error because invalid key intentionally specified.
            key       : { foo: 'bar '},
            // @ts-expect-error because invalid signature intentionally specified.
            signature : 57,
            // @ts-expect-error because invalid data type intentionally specified.
            data      : 'baz'
          })).to.eventually.be.rejectedWith(NotSupportedError, 'Algorithm not supported');

          // Valid (algorithm name) + Invalid (hash algorithm, public key, signature and data) result in hash algorithm check failing first.
          await expect(ecdsa.verify({
            algorithm : { name: 'ECDSA', hash: 'nope' },
            // @ts-expect-error because invalid key intentionally specified.
            key       : { foo: 'bar '},
            // @ts-expect-error because invalid signature intentionally specified.
            signature : 57,
            // @ts-expect-error because invalid data type intentionally specified.
            data      : 'baz'
          })).to.eventually.be.rejectedWith(TypeError, 'Out of range');

          // Valid (algorithm name, hash algorithm) + Invalid (public key, signature, and data) result in key algorithm name check failing first.
          await expect(ecdsa.verify({
            algorithm : { name: 'ECDSA', hash: 'SHA-256' },
            // @ts-expect-error because invalid key intentionally specified.
            key       : { algorithm: { name: 'bar '} },
            // @ts-expect-error because invalid signature intentionally specified.
            signature : 57,
            // @ts-expect-error because invalid data type intentionally specified.
            data      : 'baz'
          })).to.eventually.be.rejectedWith(InvalidAccessError, 'does not match');
        });

        it('validates that key is not a private key', async () => {
          // Valid (algorithm name, hash algorithm, signature, data) + Invalid (public key) result in key type check failing first.
          await expect(ecdsa.verify({
            algorithm : { name: 'ECDSA', hash: 'SHA-256' },
            key       : keyPair.privateKey,
            signature : signature,
            data      : dataU8A
          })).to.eventually.be.rejectedWith(InvalidAccessError, 'Requested operation is not valid');
        });

        it(`validates that key usage is 'verify'`, async () => {
          // Manually specify the private key usages to exclude the 'verify' operation.
          keyPair.publicKey.usages = ['sign'];

          await expect(ecdsa.verify({
            algorithm : { name: 'ECDSA', hash: 'SHA-256' },
            key       : keyPair.publicKey,
            signature : signature,
            data      : dataU8A
          })).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for the provided key');
        });

        it('throws an error when key is an unsupported curve', async () => {
          // Manually change the key's named curve to trigger an error.
          // @ts-expect-error because TS can't determine the type of key.
          keyPair.publicKey.algorithm.namedCurve = 'nope';

          await expect(ecdsa.verify({
            algorithm : { name: 'ECDSA', hash: 'SHA-256' },
            key       : keyPair.publicKey,
            signature : signature,
            data      : dataU8A
          })).to.eventually.be.rejectedWith(TypeError, 'Out of range');
        });
      });
    });

    describe('DefaultEdDsaAlgorithm', () => {
      let eddsa: DefaultEdDsaAlgorithm;

      before(() => {
        eddsa = DefaultEdDsaAlgorithm.create();
      });

      describe('generateKey()', () => {
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

        it(`supports 'sign' and/or 'verify' key usages`, async () => {
          await expect(eddsa.generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
            extractable : false,
            keyUsages   : ['sign']
          })).to.eventually.be.fulfilled;

          await expect(eddsa.generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
            extractable : false,
            keyUsages   : ['verify']
          })).to.eventually.be.fulfilled;

          await expect(eddsa.generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
            extractable : false,
            keyUsages   : ['sign', 'verify']
          })).to.eventually.be.fulfilled;
        });

        it('validates algorithm, named curve, and key usages', async () => {
          // Invalid (algorithm name, named curve, and key usages) result in algorithm name check failing first.
          await expect(eddsa.generateKey({
            algorithm   : { name: 'foo', namedCurve: 'bar' },
            extractable : false,
            keyUsages   : ['encrypt']
          })).to.eventually.be.rejectedWith(NotSupportedError, 'Algorithm not supported');

          // Valid (algorithm name) + Invalid (named curve, key usages) result named curve check failing first.
          await expect(eddsa.generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'bar' },
            extractable : false,
            keyUsages   : ['encrypt']
          })).to.eventually.be.rejectedWith(TypeError, 'Out of range');

          // Valid (algorithm name, named curve) + Invalid (key usages) result key usages check failing first.
          await expect(eddsa.generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
            extractable : false,
            keyUsages   : ['encrypt']
          })).to.eventually.be.rejectedWith(InvalidAccessError, 'Requested operation');
        });

        it(`should throw an error if 'Ed25519' key pair generation fails`, async function() {
          // @ts-ignore because the method is being intentionally stubbed to return null.
          const ed25519Stub = sinon.stub(Ed25519, 'generateKeyPair').returns(Promise.resolve(null));

          try {
            await eddsa.generateKey({
              algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
              extractable : false,
              keyUsages   : ['sign', 'verify']
            });
            ed25519Stub.restore();
            expect.fail('Expect generateKey() to throw an error');
          } catch (error) {
            ed25519Stub.restore();
            expect(error).to.be.an('error');
            expect((error as Error).message).to.equal('Operation failed to generate key pair.');
          }
        });
      });

      describe('sign()', () => {

        let keyPair: Web5Crypto.CryptoKeyPair;
        let dataU8A = new Uint8Array([51, 52, 53]);

        beforeEach(async () => {
          keyPair = await eddsa.generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
            extractable : false,
            keyUsages   : ['sign', 'verify']
          });
        });

        it(`returns a signature for 'Ed25519' keys`, async () => {
          const signature = await eddsa.sign({
            algorithm : { name: 'EdDSA' },
            key       : keyPair.privateKey,
            data      : dataU8A
          });

          expect(signature).to.be.instanceOf(ArrayBuffer);
          expect(signature.byteLength).to.equal(64);
        });

        it('validates algorithm name and key algorithm name', async () => {
          // Invalid (algorithm name, private key, and data) result in algorithm name check failing first.
          await expect(eddsa.sign({
            algorithm : { name: 'Nope' },
            // @ts-expect-error because invalid key intentionally specified.
            key       : { foo: 'bar '},
            // @ts-expect-error because invalid data type intentionally specified.
            data      : 'baz'
          })).to.eventually.be.rejectedWith(NotSupportedError, 'Algorithm not supported');

          // Valid (algorithm name) + Invalid (private key, and data) result in key algorithm name check failing first.
          await expect(eddsa.sign({
            algorithm : { name: 'EdDSA' },
            // @ts-expect-error because invalid key intentionally specified.
            key       : { algorithm: { name: 'bar '} },
            // @ts-expect-error because invalid data type intentionally specified.
            data      : 'baz'
          })).to.eventually.be.rejectedWith(InvalidAccessError, 'does not match');
        });

        it('validates that key is not a public key', async () => {
          // Valid (algorithm name, data) + Invalid (private key) result in key type check failing first.
          await expect(eddsa.sign({
            algorithm : { name: 'EdDSA' },
            key       : keyPair.publicKey,
            data      : dataU8A
          })).to.eventually.be.rejectedWith(InvalidAccessError, 'Requested operation is not valid');
        });

        it(`validates that key usage is 'sign'`, async () => {
          // Manually specify the private key usages to exclude the 'sign' operation.
          keyPair.privateKey.usages = ['verify'];

          await expect(eddsa.sign({
            algorithm : { name: 'EdDSA' },
            key       : keyPair.privateKey,
            data      : dataU8A
          })).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for the provided key');
        });

        it('throws an error when key is an unsupported curve', async () => {
          // Manually change the key's named curve to trigger an error.
          // @ts-expect-error because TS can't determine the type of key.
          keyPair.privateKey.algorithm.namedCurve = 'nope';

          await expect(eddsa.sign({
            algorithm : { name: 'EdDSA' },
            key       : keyPair.privateKey,
            data      : dataU8A
          })).to.eventually.be.rejectedWith(TypeError, 'Out of range');
        });
      });

      describe('verify()', () => {
        let keyPair: Web5Crypto.CryptoKeyPair;
        let signature: ArrayBuffer;
        let dataU8A = new Uint8Array([51, 52, 53]);

        beforeEach(async () => {
          keyPair = await eddsa.generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
            extractable : false,
            keyUsages   : ['sign', 'verify']
          });

          signature = await eddsa.sign({
            algorithm : { name: 'EdDSA' },
            key       : keyPair.privateKey,
            data      : dataU8A
          });
        });

        it(`returns a verification result for 'Ed25519' keys`, async () => {
          const isValid = await eddsa.verify({
            algorithm : { name: 'EdDSA' },
            key       : keyPair.publicKey,
            signature : signature,
            data      : dataU8A
          });

          expect(isValid).to.be.a('boolean');
          expect(isValid).to.be.true;
        });

        it('validates algorithm name and key algorithm name', async () => {
          // Invalid (algorithm name, public key, signature, and data) result in algorithm name check failing first.
          await expect(eddsa.verify({
            algorithm : { name: 'Nope' },
            // @ts-expect-error because invalid key intentionally specified.
            key       : { foo: 'bar '},
            // @ts-expect-error because invalid signature intentionally specified.
            signature : 57,
            // @ts-expect-error because invalid data type intentionally specified.
            data      : 'baz'
          })).to.eventually.be.rejectedWith(NotSupportedError, 'Algorithm not supported');

          // Valid (algorithm name) + Invalid (public key, signature, and data) result in key algorithm name check failing first.
          await expect(eddsa.verify({
            algorithm : { name: 'EdDSA' },
            // @ts-expect-error because invalid key intentionally specified.
            key       : { algorithm: { name: 'bar '} },
            // @ts-expect-error because invalid signature intentionally specified.
            signature : 57,
            // @ts-expect-error because invalid data type intentionally specified.
            data      : 'baz'
          })).to.eventually.be.rejectedWith(InvalidAccessError, 'does not match');
        });

        it('validates that key is not a private key', async () => {
          // Valid (algorithm name, signature, data) + Invalid (public key) result in key type check failing first.
          await expect(eddsa.verify({
            algorithm : { name: 'EdDSA' },
            key       : keyPair.privateKey,
            signature : signature,
            data      : dataU8A
          })).to.eventually.be.rejectedWith(InvalidAccessError, 'Requested operation is not valid');
        });

        it(`validates that key usage is 'verify'`, async () => {
          // Manually specify the private key usages to exclude the 'verify' operation.
          keyPair.publicKey.usages = ['sign'];

          await expect(eddsa.verify({
            algorithm : { name: 'EdDSA' },
            key       : keyPair.publicKey,
            signature : signature,
            data      : dataU8A
          })).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for the provided key');
        });

        it('throws an error when key is an unsupported curve', async () => {
          // Manually change the key's named curve to trigger an error.
          // @ts-expect-error because TS can't determine the type of key.
          keyPair.publicKey.algorithm.namedCurve = 'nope';

          await expect(eddsa.verify({
            algorithm : { name: 'EdDSA' },
            key       : keyPair.publicKey,
            signature : signature,
            data      : dataU8A
          })).to.eventually.be.rejectedWith(TypeError, 'Out of range');
        });
      });
    });
  });
});

describe('KmsKeyStore', () => {
  let memoryKeyStore: MemoryKeyStore<string, ManagedKey | ManagedKeyPair>;
  let kmsKeyStore: KmsKeyStore;
  let testKey: ManagedKey;

  beforeEach(() => {
    memoryKeyStore = new MemoryKeyStore();

    kmsKeyStore = new KmsKeyStore(memoryKeyStore);

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
      // Spy on the underlying memory store.
      const hasSpy = sinon.spy(memoryKeyStore, 'has');
      const deleteSpy = sinon.spy(memoryKeyStore, 'delete');

      // Add a key to the memory store directly.
      await memoryKeyStore.set('testKey', testKey);

      // Test deleting the key.
      const result = await kmsKeyStore.deleteKey({ id: 'testKey' });

      // Assert the key was deleted.
      expect(result).to.be.true;

      // Check the underlying store methods were called.
      expect(hasSpy.calledOnce).to.be.true;
      expect(deleteSpy.calledOnce).to.be.true;

      // Check the key is no longer in the store.
      const keyExists = await memoryKeyStore.has('test-key');
      expect(keyExists).to.be.false;
    });

    it('should return false if key does not exist', async () => {
      // Spy on the underlying memory store.
      const hasSpy = sinon.spy(memoryKeyStore, 'has');
      const deleteSpy = sinon.spy(memoryKeyStore, 'delete');

      // Test deleting the key.
      const result = await kmsKeyStore.deleteKey({ id: 'test-key' });

      // Assert the key was not deleted.
      expect(result).to.be.false;

      // Check the underlying store methods were called.
      expect(hasSpy.calledOnce).to.be.true;
      expect(deleteSpy.calledOnce).to.be.false;
    });
  });

  describe('getKey()', () => {
    it('should return a key if it exists', async () => {
      // Spy on the underlying memory store.
      const getSpy = sinon.spy(memoryKeyStore, 'get');

      // Add a key to the memory store directly.
      await memoryKeyStore.set('test-key', testKey);

      // Test getting the key.
      const result = await kmsKeyStore.getKey({ id: 'test-key' });

      // Assert the key was returned.
      expect(result).to.deep.equal(testKey);

      // Check the underlying store method was called.
      expect(getSpy.calledOnce).to.be.true;
    });

    it('should throw an error when attempting to get a non-existent key', async () => {
      // Spy on the underlying memory store.
      const getSpy = sinon.spy(memoryKeyStore, 'get');

      // Test getting the key.
      await expect(kmsKeyStore.getKey({ id: 'non-existent-key' })).to.eventually.be.rejectedWith(Error, 'Key not found');

      // Check the underlying store method was called.
      expect(getSpy.calledOnce).to.be.true;
    });
  });
});