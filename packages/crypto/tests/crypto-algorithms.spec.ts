import type { Web5Crypto } from '../src/types/index.js';

import sinon from 'sinon';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { Convert } from '@tbd54566975/common';

import { aesCtrTestVectors } from './fixtures/test-vectors/aes.js';
import { AesCtr, Ed25519, Secp256k1, X25519 } from '../src/crypto-primitives/index.js';
import { CryptoKey, InvalidAccessError, NotSupportedError, OperationError } from '../src/algorithms-api/index.js';
import {
  EcdhAlgorithm,
  EcdsaAlgorithm,
  EdDsaAlgorithm,
  AesCtrAlgorithm,
} from '../src/crypto-algorithms/index.js';

chai.use(chaiAsPromised);

describe('Default Crypto Algorithm Implementations', () => {

  describe('AesCtrAlgorithm', () => {
    let aesCtr: AesCtrAlgorithm;

    before(() => {
      aesCtr = AesCtrAlgorithm.create();
    });

    describe('decrypt()', () => {
      let secretCryptoKey: Web5Crypto.CryptoKey;

      beforeEach(async () => {
        secretCryptoKey = await aesCtr.generateKey({
          algorithm   : { name: 'AES-CTR', length: 128 },
          extractable : false,
          keyUsages   : ['encrypt', 'decrypt']
        });
      });

      it('returns plaintext as an ArrayBuffer', async () => {
        const plaintext = await aesCtr.decrypt({
          algorithm: {
            name    : 'AES-CTR',
            counter : new ArrayBuffer(16),
            length  : 128
          },
          key  : secretCryptoKey,
          data : new Uint8Array([1, 2, 3, 4])
        });

        expect(plaintext).to.be.instanceOf(ArrayBuffer);
        expect(plaintext.byteLength).to.equal(4);
      });

      it('returns plaintext given ciphertext', async () => {
        let secretCryptoKey: Web5Crypto.CryptoKey;

        for (const vector of aesCtrTestVectors) {
          secretCryptoKey = new CryptoKey(
            { name: 'AES-CTR', length: 128 },
            false,
            Convert.hex(vector.key).toArrayBuffer(),
            'secret',
            ['encrypt', 'decrypt']
          );
          const plaintext = await aesCtr.decrypt({
            algorithm: {
              name    : 'AES-CTR',
              counter : Convert.hex(vector.counter).toUint8Array(),
              length  : vector.length
            },
            key  : secretCryptoKey,
            data : Convert.hex(vector.ciphertext).toUint8Array()
          });
          expect(Convert.arrayBuffer(plaintext).toHex()).to.deep.equal(vector.data);
        }
      });

      it('validates algorithm, counter, and length', async () => {
        const secretCryptoKey: Web5Crypto.CryptoKey = new CryptoKey(
          { name: 'AES-CTR', length: 128 },
          false,
          new ArrayBuffer(16),
          'secret',
          ['encrypt', 'decrypt']
        );

        // Invalid (algorithm name, counter, length) result in algorithm name check failing first.
        await expect(aesCtr.decrypt({
          algorithm : { name: 'foo', counter: new ArrayBuffer(64), length: 512 },
          key       : secretCryptoKey,
          data      : new Uint8Array([1, 2, 3, 4])
        })).to.eventually.be.rejectedWith(NotSupportedError, 'Algorithm not supported');

        // Valid (algorithm name) + Invalid (counter, length) result counter check failing first.
        await expect(aesCtr.decrypt({
          algorithm : { name: 'AES-CTR', counter: new ArrayBuffer(64), length: 512 },
          key       : secretCryptoKey,
          data      : new Uint8Array([1, 2, 3, 4])
        })).to.eventually.be.rejectedWith(OperationError, `'counter' must have length`);

        // Valid (algorithm name, counter) + Invalid (length) result length check failing first.
        await expect(aesCtr.decrypt({
          algorithm : { name: 'AES-CTR', counter: new ArrayBuffer(16), length: 512 },
          key       : secretCryptoKey,
          data      : new Uint8Array([1, 2, 3, 4])
        })).to.eventually.be.rejectedWith(OperationError, `'length' should be in the range`);
      });

      it(`validates that key usage is 'decrypt'`, async () => {
        // Manually specify the secret key usages to exclude the 'decrypt' operation.
        secretCryptoKey.usages = ['encrypt'];

        await expect(aesCtr.decrypt({
          algorithm : { name: 'AES-CTR', counter: new ArrayBuffer(16), length: 128 },
          key       : secretCryptoKey,
          data      : new Uint8Array([1, 2, 3, 4])
        })).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for the provided key');
      });
    });

    describe('encrypt()', () => {
      let secretCryptoKey: Web5Crypto.CryptoKey;

      before(async () => {
        secretCryptoKey = await aesCtr.generateKey({
          algorithm   : { name: 'AES-CTR', length: 128 },
          extractable : false,
          keyUsages   : ['encrypt', 'decrypt']
        });
      });

      it('returns ciphertext as an ArrayBuffer', async () => {
        const ciphertext = await aesCtr.encrypt({
          algorithm: {
            name    : 'AES-CTR',
            counter : new ArrayBuffer(16),
            length  : 128
          },
          key  : secretCryptoKey,
          data : new Uint8Array([1, 2, 3, 4])
        });

        expect(ciphertext).to.be.instanceOf(ArrayBuffer);
        expect(ciphertext.byteLength).to.equal(4);
      });

      it('returns ciphertext given plaintext', async () => {
        let secretCryptoKey: Web5Crypto.CryptoKey;
        for (const vector of aesCtrTestVectors) {
          secretCryptoKey = new CryptoKey(
            { name: 'AES-CTR', length: 128 },
            false,
            Convert.hex(vector.key).toArrayBuffer(),
            'secret',
            ['encrypt', 'decrypt']
          );
          const ciphertext = await aesCtr.encrypt({
            algorithm: {
              name    : 'AES-CTR',
              counter : Convert.hex(vector.counter).toUint8Array(),
              length  : vector.length
            },
            key  : secretCryptoKey,
            data : Convert.hex(vector.data).toUint8Array()
          });
          expect(Convert.arrayBuffer(ciphertext).toHex()).to.deep.equal(vector.ciphertext);
        }
      });

      it('validates algorithm, counter, and length', async () => {
        const secretCryptoKey: Web5Crypto.CryptoKey = new CryptoKey(
          { name: 'AES-CTR', length: 128 },
          false,
          new ArrayBuffer(16),
          'secret',
          ['encrypt', 'decrypt']
        );

        // Invalid (algorithm name, counter, length) result in algorithm name check failing first.
        await expect(aesCtr.encrypt({
          algorithm : { name: 'foo', counter: new ArrayBuffer(64), length: 512 },
          key       : secretCryptoKey,
          data      : new Uint8Array([1, 2, 3, 4])
        })).to.eventually.be.rejectedWith(NotSupportedError, 'Algorithm not supported');

        // Valid (algorithm name) + Invalid (counter, length) result counter check failing first.
        await expect(aesCtr.encrypt({
          algorithm : { name: 'AES-CTR', counter: new ArrayBuffer(64), length: 512 },
          key       : secretCryptoKey,
          data      : new Uint8Array([1, 2, 3, 4])
        })).to.eventually.be.rejectedWith(OperationError, `'counter' must have length`);

        // Valid (algorithm name, counter) + Invalid (length) result length check failing first.
        await expect(aesCtr.encrypt({
          algorithm : { name: 'AES-CTR', counter: new ArrayBuffer(16), length: 512 },
          key       : secretCryptoKey,
          data      : new Uint8Array([1, 2, 3, 4])
        })).to.eventually.be.rejectedWith(OperationError, `'length' should be in the range`);
      });

      it(`validates that key usage is 'encrypt'`, async () => {
        // Manually specify the secret key usages to exclude the 'encrypt' operation.
        secretCryptoKey.usages = ['decrypt'];

        await expect(aesCtr.encrypt({
          algorithm : { name: 'AES-CTR', counter: new ArrayBuffer(16), length: 128 },
          key       : secretCryptoKey,
          data      : new Uint8Array([1, 2, 3, 4])
        })).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for the provided key');
      });
    });

    describe('generateKey()', () => {
      it('returns a secret key', async () => {
        const key = await aesCtr.generateKey({
          algorithm   : { name: 'AES-CTR', length: 128 },
          extractable : false,
          keyUsages   : ['encrypt', 'decrypt']
        });

        expect(key.algorithm.name).to.equal('AES-CTR');
        expect(key.usages).to.deep.equal(['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']);
        expect(key.handle.byteLength).to.equal(128 / 8);
      });

      it('secret key is selectively extractable', async () => {
        let key: CryptoKey;
        // key is NOT extractable if generateKey() called with extractable = false
        key = await aesCtr.generateKey({
          algorithm   : { name: 'AES-CTR', length: 128 },
          extractable : false,
          keyUsages   : ['encrypt', 'decrypt']
        });
        expect(key.extractable).to.be.false;

        // key is extractable if generateKey() called with extractable = true
        key = await aesCtr.generateKey({
          algorithm   : { name: 'AES-CTR', length: 128 },
          extractable : true,
          keyUsages   : ['encrypt', 'decrypt']
        });
        expect(key.extractable).to.be.true;
      });

      it(`supports 'encrypt', 'decrypt', 'wrapKey', and/or 'unWrapKey' key usages`, async () => {
        const operations = ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'];
        for (const operation of operations) {
          await expect(aesCtr.generateKey({
            algorithm   : { name: 'AES-CTR', length: 128 },
            extractable : true,
            keyUsages   : [operation as KeyUsage]
          })).to.eventually.be.fulfilled;
        }
      });

      it('validates algorithm, length, and key usages', async () => {
        // Invalid (algorithm name, length, and key usages) result in algorithm name check failing first.
        await expect(aesCtr.generateKey({
          algorithm   : { name: 'foo', length: 512 },
          extractable : false,
          keyUsages   : ['sign']
        })).to.eventually.be.rejectedWith(NotSupportedError, 'Algorithm not supported');

        // Valid (algorithm name) + Invalid (length, key usages) result length check failing first.
        await expect(aesCtr.generateKey({
          algorithm   : { name: 'AES-CTR', length: 512 },
          extractable : false,
          keyUsages   : ['sign']
        })).to.eventually.be.rejectedWith(OperationError, `'length' must be 128, 192, or 256`);

        // Valid (algorithm name, length) + Invalid (key usages) result key usages check failing first.
        await expect(aesCtr.generateKey({
          algorithm   : { name: 'AES-CTR', length: 256 },
          extractable : false,
          keyUsages   : ['sign']
        })).to.eventually.be.rejectedWith(InvalidAccessError, 'Requested operation');
      });

      it(`should throw an error if 'AES-CTR' key generation fails`, async function() {
        // @ts-ignore because the method is being intentionally stubbed to return null.
        const aesCtrStub = sinon.stub(AesCtr, 'generateKey').returns(Promise.resolve(null));

        try {
          await aesCtr.generateKey({
            algorithm   : { name: 'AES-CTR', length: 128 },
            extractable : false,
            keyUsages   : ['encrypt', 'decrypt']
          });
          aesCtrStub.restore();
          expect.fail('Expect generateKey() to throw an error');
        } catch (error) {
          aesCtrStub.restore();
          expect(error).to.be.an('error');
          expect((error as Error).message).to.equal('Operation failed to generate key.');
        }
      });
    });
  });

  describe('EcdhAlgorithm', () => {
    let ecdh: EcdhAlgorithm;

    before(() => {
      ecdh = EcdhAlgorithm.create();
    });

    describe('deriveBits()', () => {

      let otherPartyPublicKey: Web5Crypto.CryptoKey;
      let ownPrivateKey: Web5Crypto.CryptoKey;

      beforeEach(async () => {
        const otherPartyKeyPair = await ecdh.generateKey({
          algorithm   : { name: 'ECDH', namedCurve: 'secp256k1' },
          extractable : false,
          keyUsages   : ['deriveBits']
        });
        otherPartyPublicKey = otherPartyKeyPair.publicKey;

        const ownKeyPair = await ecdh.generateKey({
          algorithm   : { name: 'ECDH', namedCurve: 'secp256k1' },
          extractable : false,
          keyUsages   : ['deriveBits']
        });
        ownPrivateKey = ownKeyPair.privateKey;
      });

      it('returns shared secrets with maximum bit length when length is null', async () => {
        const sharedSecretSecp256k1 = await ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
          baseKey   : ownPrivateKey,
          length    : null
        });

        const otherPartyKeyPair = await ecdh.generateKey({
          algorithm   : { name: 'ECDH', namedCurve: 'X25519' },
          extractable : false,
          keyUsages   : ['deriveBits']
        });
        otherPartyPublicKey = otherPartyKeyPair.publicKey;

        const ownKeyPair = await ecdh.generateKey({
          algorithm   : { name: 'ECDH', namedCurve: 'X25519' },
          extractable : false,
          keyUsages   : ['deriveBits']
        });
        ownPrivateKey = ownKeyPair.privateKey;

        const sharedSecretX25519 = await ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
          baseKey   : ownPrivateKey,
          length    : null
        });
        expect(sharedSecretSecp256k1.byteLength).to.equal(32);
        expect(sharedSecretX25519.byteLength).to.equal(32);
      });

      it('returns shared secrets with specified length, if possible', async () => {
        let sharedSecretSecp256k1 = await ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
          baseKey   : ownPrivateKey,
          length    : 16
        });
        expect(sharedSecretSecp256k1.byteLength).to.equal(16 / 8);

        sharedSecretSecp256k1 = await ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
          baseKey   : ownPrivateKey,
          length    : 256
        });
        expect(sharedSecretSecp256k1.byteLength).to.equal(256 / 8);

        const otherPartyKeyPair = await ecdh.generateKey({
          algorithm   : { name: 'ECDH', namedCurve: 'X25519' },
          extractable : false,
          keyUsages   : ['deriveBits']
        });
        otherPartyPublicKey = otherPartyKeyPair.publicKey;

        const ownKeyPair = await ecdh.generateKey({
          algorithm   : { name: 'ECDH', namedCurve: 'X25519' },
          extractable : false,
          keyUsages   : ['deriveBits']
        });
        ownPrivateKey = ownKeyPair.privateKey;

        const sharedSecretX25519 = await ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
          baseKey   : ownPrivateKey,
          length    : 32
        });
        expect(sharedSecretX25519.byteLength).to.equal(32 / 8);
      });

      it('throws error if requested length exceeds that of the generated shared secret', async () => {
        await expect(ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
          baseKey   : ownPrivateKey,
          length    : 264
        })).to.eventually.be.rejectedWith(OperationError, `Requested 'length' exceeds the byte length of the derived secret`);
      });

      it('throws an error if the given length is not a multiple of 8', async () => {
        await expect(ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
          baseKey   : ownPrivateKey,
          length    : 127
        })).to.eventually.be.rejectedWith(OperationError, `'length' must be a multiple of 8`);
      });

      it(`supports 'secp256k1' curve`, async () => {
        const sharedSecret = await ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
          baseKey   : ownPrivateKey,
          length    : null
        });
        expect(sharedSecret).to.be.instanceOf(ArrayBuffer);
        expect(sharedSecret.byteLength).to.equal(32);
      });

      it(`supports 'X25519' curve`, async () => {
        const otherPartyKeyPair = await ecdh.generateKey({
          algorithm   : { name: 'ECDH', namedCurve: 'X25519' },
          extractable : false,
          keyUsages   : ['deriveBits']
        });
        otherPartyPublicKey = otherPartyKeyPair.publicKey;

        const ownKeyPair = await ecdh.generateKey({
          algorithm   : { name: 'ECDH', namedCurve: 'X25519' },
          extractable : false,
          keyUsages   : ['deriveBits']
        });
        ownPrivateKey = ownKeyPair.privateKey;

        const sharedSecret = await ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
          baseKey   : ownPrivateKey,
          length    : null
        });

        expect(sharedSecret).to.be.instanceOf(ArrayBuffer);
        expect(sharedSecret.byteLength).to.equal(32);
      });

      it(`validates that key usage is 'deriveBits'`, async () => {
        // Manually specify the private key usages to exclude the 'deriveBits' operation.
        otherPartyPublicKey.usages = ['sign'];

        await expect(ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
          baseKey   : ownPrivateKey,
          length    : null
        })).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for the provided key');
      });

      it('throws an error when key(s) is an unsupported curve', async () => {
        // Manually change the key's named curve to trigger an error.
        // @ts-expect-error because TS can't determine the type of key.
        otherPartyPublicKey.algorithm.namedCurve = 'non-existent-curve';
        // @ts-expect-error because TS can't determine the type of key.
        ownPrivateKey.algorithm.namedCurve = 'non-existent-curve';

        await expect(ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
          baseKey   : ownPrivateKey,
          length    : 40
        })).to.eventually.be.rejectedWith(TypeError, 'Out of range');
      });
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

      it(`should throw an error if 'secp256k1' key pair generation fails`, async function() {
        // @ts-ignore because the method is being intentionally stubbed to return null.
        const secp256k1Stub = sinon.stub(Secp256k1, 'generateKeyPair').returns(Promise.resolve(null));

        try {
          await ecdh.generateKey({
            algorithm   : { name: 'ECDH', namedCurve: 'secp256k1' },
            extractable : false,
            keyUsages   : ['deriveBits', 'deriveKey']
          });
          secp256k1Stub.restore();
          expect.fail('Expect generateKey() to throw an error');
        } catch (error) {
          secp256k1Stub.restore();
          expect(error).to.be.an('error');
          expect((error as Error).message).to.equal('Operation failed to generate key pair.');
        }
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
  });

  describe('EcdsaAlgorithm', () => {
    let ecdsa: EcdsaAlgorithm;

    before(() => {
      ecdsa = EcdsaAlgorithm.create();
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

  describe('EdDsaAlgorithm', () => {
    let eddsa: EdDsaAlgorithm;

    before(() => {
      eddsa = EdDsaAlgorithm.create();
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