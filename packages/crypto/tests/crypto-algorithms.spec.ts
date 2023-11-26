import sinon from 'sinon';
import chai, { expect } from 'chai';
import { Convert } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';

import type { JsonWebKey, PrivateKeyJwk, PublicKeyJwk } from '../src/jose.js';
import type { Web5Crypto } from '../src/types/web5-crypto.js';

import { aesCtrTestVectors } from './fixtures/test-vectors/aes.js';
import { AesCtr, Ed25519, Secp256k1, X25519 } from '../src/crypto-primitives/index.js';
import { CryptoKey, InvalidAccessError, NotSupportedError, OperationError } from '../src/algorithms-api/index.js';
import {
  EcdhAlgorithm,
  // EcdsaAlgorithm,
  // EdDsaAlgorithm,
  // AesCtrAlgorithm,
  Pbkdf2Algorithm,
} from '../src/crypto-algorithms/index.js';
import { beforeEach } from 'mocha';

chai.use(chaiAsPromised);

describe('Default Crypto Algorithm Implementations', () => {

  // describe('AesCtrAlgorithm', () => {
  //   let aesCtr: AesCtrAlgorithm;

  //   before(() => {
  //     aesCtr = AesCtrAlgorithm.create();
  //   });

  //   describe('decrypt()', () => {
  //     let secretCryptoKey: Web5Crypto.CryptoKey;

  //     beforeEach(async () => {
  //       secretCryptoKey = await aesCtr.generateKey({
  //         algorithm   : { name: 'AES-CTR', length: 128 },
  //         extractable : false,
  //         keyOperations   : ['encrypt', 'decrypt']
  //       });
  //     });

  //     it('returns plaintext as a Uint8Array', async () => {
  //       const plaintext = await aesCtr.decrypt({
  //         algorithm: {
  //           name    : 'AES-CTR',
  //           counter : new Uint8Array(16),
  //           length  : 128
  //         },
  //         key  : secretCryptoKey,
  //         data : new Uint8Array([1, 2, 3, 4])
  //       });

  //       expect(plaintext).to.be.instanceOf(Uint8Array);
  //       expect(plaintext.byteLength).to.equal(4);
  //     });

  //     it('returns plaintext given ciphertext', async () => {
  //       let secretCryptoKey: Web5Crypto.CryptoKey;

  //       for (const vector of aesCtrTestVectors) {
  //         secretCryptoKey = new CryptoKey(
  //           { name: 'AES-CTR', length: 128 },
  //           false,
  //           Convert.hex(vector.key).toUint8Array(),
  //           'secret',
  //           ['encrypt', 'decrypt']
  //         );
  //         const plaintext = await aesCtr.decrypt({
  //           algorithm: {
  //             name    : 'AES-CTR',
  //             counter : Convert.hex(vector.counter).toUint8Array(),
  //             length  : vector.length
  //           },
  //           key  : secretCryptoKey,
  //           data : Convert.hex(vector.ciphertext).toUint8Array()
  //         });
  //         expect(Convert.uint8Array(plaintext).toHex()).to.deep.equal(vector.data);
  //       }
  //     });

  //     it('validates algorithm, counter, and length', async () => {
  //       const secretCryptoKey: Web5Crypto.CryptoKey = new CryptoKey(
  //         { name: 'AES-CTR', length: 128 },
  //         false,
  //         new Uint8Array(16),
  //         'secret',
  //         ['encrypt', 'decrypt']
  //       );

  //       // Invalid (algorithm name, counter, length) result in algorithm name check failing first.
  //       await expect(aesCtr.decrypt({
  //         algorithm : { name: 'foo', counter: new Uint8Array(64), length: 512 },
  //         key       : secretCryptoKey,
  //         data      : new Uint8Array([1, 2, 3, 4])
  //       })).to.eventually.be.rejectedWith(NotSupportedError, 'Algorithm not supported');

  //       // Valid (algorithm name) + Invalid (counter, length) result counter check failing first.
  //       await expect(aesCtr.decrypt({
  //         algorithm : { name: 'AES-CTR', counter: new Uint8Array(64), length: 512 },
  //         key       : secretCryptoKey,
  //         data      : new Uint8Array([1, 2, 3, 4])
  //       })).to.eventually.be.rejectedWith(OperationError, `'counter' must have length`);

  //       // Valid (algorithm name, counter) + Invalid (length) result length check failing first.
  //       await expect(aesCtr.decrypt({
  //         algorithm : { name: 'AES-CTR', counter: new Uint8Array(16), length: 512 },
  //         key       : secretCryptoKey,
  //         data      : new Uint8Array([1, 2, 3, 4])
  //       })).to.eventually.be.rejectedWith(OperationError, `'length' should be in the range`);
  //     });

  //     it(`validates that key operation is 'decrypt'`, async () => {
  //       // Manually specify the secret key operations to exclude the 'decrypt' operation.
  //       secretCryptoKey.usages = ['encrypt'];

  //       await expect(aesCtr.decrypt({
  //         algorithm : { name: 'AES-CTR', counter: new Uint8Array(16), length: 128 },
  //         key       : secretCryptoKey,
  //         data      : new Uint8Array([1, 2, 3, 4])
  //       })).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for the provided key');
  //     });
  //   });

  //   describe('encrypt()', () => {
  //     let secretCryptoKey: Web5Crypto.CryptoKey;

  //     before(async () => {
  //       secretCryptoKey = await aesCtr.generateKey({
  //         algorithm   : { name: 'AES-CTR', length: 128 },
  //         extractable : false,
  //         keyOperations   : ['encrypt', 'decrypt']
  //       });
  //     });

  //     it('returns ciphertext as a Uint8Array', async () => {
  //       const ciphertext = await aesCtr.encrypt({
  //         algorithm: {
  //           name    : 'AES-CTR',
  //           counter : new Uint8Array(16),
  //           length  : 128
  //         },
  //         key  : secretCryptoKey,
  //         data : new Uint8Array([1, 2, 3, 4])
  //       });

  //       expect(ciphertext).to.be.instanceOf(Uint8Array);
  //       expect(ciphertext.byteLength).to.equal(4);
  //     });

  //     it('returns ciphertext given plaintext', async () => {
  //       let secretCryptoKey: Web5Crypto.CryptoKey;
  //       for (const vector of aesCtrTestVectors) {
  //         secretCryptoKey = new CryptoKey(
  //           { name: 'AES-CTR', length: 128 },
  //           false,
  //           Convert.hex(vector.key).toUint8Array(),
  //           'secret',
  //           ['encrypt', 'decrypt']
  //         );
  //         const ciphertext = await aesCtr.encrypt({
  //           algorithm: {
  //             name    : 'AES-CTR',
  //             counter : Convert.hex(vector.counter).toUint8Array(),
  //             length  : vector.length
  //           },
  //           key  : secretCryptoKey,
  //           data : Convert.hex(vector.data).toUint8Array()
  //         });
  //         expect(Convert.uint8Array(ciphertext).toHex()).to.deep.equal(vector.ciphertext);
  //       }
  //     });

  //     it('validates algorithm, counter, and length', async () => {
  //       const secretCryptoKey: Web5Crypto.CryptoKey = new CryptoKey(
  //         { name: 'AES-CTR', length: 128 },
  //         false,
  //         new Uint8Array(16),
  //         'secret',
  //         ['encrypt', 'decrypt']
  //       );

  //       // Invalid (algorithm name, counter, length) result in algorithm name check failing first.
  //       await expect(aesCtr.encrypt({
  //         algorithm : { name: 'foo', counter: new Uint8Array(64), length: 512 },
  //         key       : secretCryptoKey,
  //         data      : new Uint8Array([1, 2, 3, 4])
  //       })).to.eventually.be.rejectedWith(NotSupportedError, 'Algorithm not supported');

  //       // Valid (algorithm name) + Invalid (counter, length) result counter check failing first.
  //       await expect(aesCtr.encrypt({
  //         algorithm : { name: 'AES-CTR', counter: new Uint8Array(64), length: 512 },
  //         key       : secretCryptoKey,
  //         data      : new Uint8Array([1, 2, 3, 4])
  //       })).to.eventually.be.rejectedWith(OperationError, `'counter' must have length`);

  //       // Valid (algorithm name, counter) + Invalid (length) result length check failing first.
  //       await expect(aesCtr.encrypt({
  //         algorithm : { name: 'AES-CTR', counter: new Uint8Array(16), length: 512 },
  //         key       : secretCryptoKey,
  //         data      : new Uint8Array([1, 2, 3, 4])
  //       })).to.eventually.be.rejectedWith(OperationError, `'length' should be in the range`);
  //     });

  //     it(`validates that key usage is 'encrypt'`, async () => {
  //       // Manually specify the secret key usages to exclude the 'encrypt' operation.
  //       secretCryptoKey.usages = ['decrypt'];

  //       await expect(aesCtr.encrypt({
  //         algorithm : { name: 'AES-CTR', counter: new Uint8Array(16), length: 128 },
  //         key       : secretCryptoKey,
  //         data      : new Uint8Array([1, 2, 3, 4])
  //       })).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for the provided key');
  //     });
  //   });

  //   describe('generateKey()', () => {
  //     it('returns a secret key', async () => {
  //       const key = await aesCtr.generateKey({
  //         algorithm   : { name: 'AES-CTR', length: 128 },
  //         extractable : false,
  //         keyOperations   : ['encrypt', 'decrypt']
  //       });

  //       expect(key.algorithm.name).to.equal('AES-CTR');
  //       expect(key.usages).to.deep.equal(['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']);
  //       expect(key.material.byteLength).to.equal(128 / 8);
  //     });

  //     it('secret key is selectively extractable', async () => {
  //       let key: CryptoKey;
  //       // key is NOT extractable if generateKey() called with extractable = false
  //       key = await aesCtr.generateKey({
  //         algorithm   : { name: 'AES-CTR', length: 128 },
  //         extractable : false,
  //         keyOperations   : ['encrypt', 'decrypt']
  //       });
  //       expect(key.extractable).to.be.false;

  //       // key is extractable if generateKey() called with extractable = true
  //       key = await aesCtr.generateKey({
  //         algorithm   : { name: 'AES-CTR', length: 128 },
  //         extractable : true,
  //         keyOperations   : ['encrypt', 'decrypt']
  //       });
  //       expect(key.extractable).to.be.true;
  //     });

  //     it(`supports 'encrypt', 'decrypt', 'wrapKey', and/or 'unWrapKey' key usages`, async () => {
  //       const operations = ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'];
  //       for (const operation of operations) {
  //         await expect(aesCtr.generateKey({
  //           algorithm   : { name: 'AES-CTR', length: 128 },
  //           extractable : true,
  //           keyOperations   : [operation as KeyUsage]
  //         })).to.eventually.be.fulfilled;
  //       }
  //     });

  //     it('validates algorithm, length, and key usages', async () => {
  //       // Invalid (algorithm name, length, and key usages) result in algorithm name check failing first.
  //       await expect(aesCtr.generateKey({
  //         algorithm   : { name: 'foo', length: 512 },
  //         extractable : false,
  //         keyOperations   : ['sign']
  //       })).to.eventually.be.rejectedWith(NotSupportedError, 'Algorithm not supported');

  //       // Valid (algorithm name) + Invalid (length, key usages) result length check failing first.
  //       await expect(aesCtr.generateKey({
  //         algorithm   : { name: 'AES-CTR', length: 512 },
  //         extractable : false,
  //         keyOperations   : ['sign']
  //       })).to.eventually.be.rejectedWith(OperationError, `'length' must be 128, 192, or 256`);

  //       // Valid (algorithm name, length) + Invalid (key usages) result key usages check failing first.
  //       await expect(aesCtr.generateKey({
  //         algorithm   : { name: 'AES-CTR', length: 256 },
  //         extractable : false,
  //         keyOperations   : ['sign']
  //       })).to.eventually.be.rejectedWith(InvalidAccessError, 'Requested operation');
  //     });

  //     it(`should throw an error if 'AES-CTR' key generation fails`, async function() {
  //       // @ts-ignore because the method is being intentionally stubbed to return null.
  //       const aesCtrStub = sinon.stub(AesCtr, 'generateKey').returns(Promise.resolve(null));

  //       try {
  //         await aesCtr.generateKey({
  //           algorithm   : { name: 'AES-CTR', length: 128 },
  //           extractable : false,
  //           keyOperations   : ['encrypt', 'decrypt']
  //         });
  //         aesCtrStub.restore();
  //         expect.fail('Expect generateKey() to throw an error');
  //       } catch (error) {
  //         aesCtrStub.restore();
  //         expect(error).to.be.an('error');
  //         expect((error as Error).message).to.equal('Operation failed to generate key.');
  //       }
  //     });
  //   });
  // });

  describe('EcdhAlgorithm', () => {
    let ecdh: EcdhAlgorithm;

    before(() => {
      ecdh = EcdhAlgorithm.create();
    });

    describe('deriveBits()', () => {

      let secp256k1PrivateKeyA: PrivateKeyJwk;
      let secp256k1PublicKeyA: PublicKeyJwk;
      let secp256k1PrivateKeyB: PrivateKeyJwk;
      let secp256k1PublicKeyB: PublicKeyJwk;

      let x25519PrivateKeyA: PrivateKeyJwk;
      let x25519PublicKeyA: PublicKeyJwk;
      let x25519PrivateKeyB: PrivateKeyJwk;
      let x25519PublicKeyB: PublicKeyJwk;

      before(async () => {
        secp256k1PrivateKeyA = await ecdh.generateKey({ algorithm: { name: 'ECDH', curve: 'secp256k1' } });
        secp256k1PublicKeyA = await Secp256k1.computePublicKey({ privateKey: secp256k1PrivateKeyA });
        secp256k1PrivateKeyB = await ecdh.generateKey({ algorithm: { name: 'ECDH', curve: 'secp256k1' } });
        secp256k1PublicKeyB = await Secp256k1.computePublicKey({ privateKey: secp256k1PrivateKeyB });

        x25519PrivateKeyA = await ecdh.generateKey({ algorithm: { name: 'ECDH', curve: 'X25519' } });
        x25519PublicKeyA = await X25519.computePublicKey({ privateKey: x25519PrivateKeyA });
        x25519PrivateKeyB = await ecdh.generateKey({ algorithm: { name: 'ECDH', curve: 'X25519' } });
        x25519PublicKeyB = await X25519.computePublicKey({ privateKey: x25519PrivateKeyB });
      });

      it(`supports 'secp256k1' curve`, async () => {
        const sharedSecret = await ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey: secp256k1PublicKeyB },
          baseKey   : secp256k1PrivateKeyA,
          length    : null
        });
        expect(sharedSecret).to.be.instanceOf(Uint8Array);
        expect(sharedSecret.byteLength).to.equal(32);
      });

      it(`supports 'X25519' curve`, async () => {
        const sharedSecret = await ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey: x25519PublicKeyB },
          baseKey   : x25519PrivateKeyA,
          length    : null
        });
        expect(sharedSecret).to.be.instanceOf(Uint8Array);
        expect(sharedSecret.byteLength).to.equal(32);
      });

      it('throws an error when base or public key is an unsupported curve', async () => {
        // Manually change the key's curve to trigger an error.
        // @ts-expect-error because an unknown 'crv' value is manually set.
        const baseKey = { ...secp256k1PrivateKeyA, crv: 'non-existent-curve' } as PrivateKeyJwk;
        // @ts-expect-error because an unknown 'crv' value is manually set.
        const publicKey = { ...secp256k1PublicKeyB, crv: 'non-existent-curve' } as PublicKeyJwk;

        await expect(ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey },
          baseKey,
          length    : 40
        })).to.eventually.be.rejectedWith(TypeError, 'Out of range');
      });

      it('returns shared secret with maximum bit length when length is null', async () => {
        const sharedSecretSecp256k1 = await ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey: secp256k1PublicKeyB },
          baseKey   : secp256k1PrivateKeyA,
          length    : null
        });
        expect(sharedSecretSecp256k1.byteLength).to.equal(32);
      });

      it('returns shared secret with specified length, if possible', async () => {
        [16, 32, 256].forEach(async length => {
          let sharedSecretSecp256k1 = await ecdh.deriveBits({
            algorithm : { name: 'ECDH', publicKey: secp256k1PublicKeyB },
            baseKey   : secp256k1PrivateKeyA,
            length
          });
          expect(sharedSecretSecp256k1.byteLength).to.equal(length / 8);
        });
      });

      it('is commutative', async () => {
        const sharedSecretSecp256k1 = await ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey: secp256k1PublicKeyB },
          baseKey   : secp256k1PrivateKeyA,
          length    : null
        });
        const sharedSecretSecp256k1Reversed = await ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey: secp256k1PublicKeyA },
          baseKey   : secp256k1PrivateKeyB,
          length    : null
        });
        expect(sharedSecretSecp256k1).to.deep.equal(sharedSecretSecp256k1Reversed);

        const sharedSecretX25519 = await ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey: x25519PublicKeyB },
          baseKey   : x25519PrivateKeyA,
          length    : null
        });
        const sharedSecretX25519Reversed = await ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey: x25519PublicKeyA },
          baseKey   : x25519PrivateKeyB,
          length    : null
        });
        expect(sharedSecretX25519).to.deep.equal(sharedSecretX25519Reversed);
      });

      it('throws error if requested length exceeds that of the generated shared secret', async () => {
        await expect(
          ecdh.deriveBits({
            algorithm : { name: 'ECDH', publicKey: secp256k1PublicKeyB },
            baseKey   : secp256k1PrivateKeyA,
            length    : 264
          })
        ).to.eventually.be.rejectedWith(OperationError, `Requested 'length' exceeds the byte length of the derived secret`);
      });

      it('throws an error if the given length is not a multiple of 8', async () => {
        await expect(ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey: secp256k1PublicKeyB },
          baseKey   : secp256k1PrivateKeyA,
          length    : 127
        })).to.eventually.be.rejectedWith(OperationError, `'length' must be a multiple of 8`);
      });

      it(`accepts base key without 'key_ops' set`, async () => {
        const baseKey = { ...secp256k1PrivateKeyA, key_ops: undefined } as PrivateKeyJwk;

        await expect(ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey: secp256k1PublicKeyB },
          baseKey,
          length    : null
        })).to.eventually.be.fulfilled;
      });

      it(`accepts public key without 'key_ops' set`, async () => {
        const publicKey = { ...secp256k1PublicKeyB, key_ops: undefined } as PublicKeyJwk;

        await expect(ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey },
          baseKey   : secp256k1PrivateKeyA,
          length    : null
        })).to.eventually.be.fulfilled;
      });

      it(`if specified, validates base key operations includes 'deriveBits'`, async () => {
        // Manually specify the base key operations array to exclude the 'deriveBits' operation.
        const baseKey = { ...secp256k1PrivateKeyA, key_ops: ['sign'] } as PrivateKeyJwk;

        await expect(ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey: secp256k1PublicKeyB },
          baseKey,
          length    : null
        })).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for the provided key');
      });

      it(`if specified, validates public key operations includes 'deriveBits'`, async () => {
        // Manually specify the private key operations array to exclude the 'deriveBits' operation.
        const publicKey = { ...secp256k1PublicKeyB, key_ops: ['sign'] } as PublicKeyJwk;

        await expect(
          ecdh.deriveBits({
            algorithm : { name: 'ECDH', publicKey },
            baseKey   : secp256k1PrivateKeyA,
            length    : null
          })
        ).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for the provided key');
      });

      it('throws an error if the public/private keys from the same key pair are specified', async () => {
        await expect(
          ecdh.deriveBits({
            algorithm : { name: 'ECDH', publicKey: secp256k1PublicKeyA },
            baseKey   : secp256k1PrivateKeyA,
            length    : null
          })
        ).to.eventually.be.rejectedWith(Error, 'shared secret cannot be computed from a single key pair');
      });
    });

    describe('generateKey()', () => {
      it('returns a private key in JWK format', async () => {
        const privateKey = await ecdh.generateKey({
          algorithm     : { name: 'ECDH', curve: 'X25519' },
          keyOperations : ['deriveBits', 'deriveKey']
        });

        expect(privateKey).to.have.property('crv', 'X25519');
        expect(privateKey).to.have.property('d');
        expect(privateKey).to.have.property('kid');
        expect(privateKey).to.have.property('kty', 'OKP');
        expect(privateKey).to.have.property('x');

        expect(privateKey.key_ops).to.deep.equal(['deriveBits', 'deriveKey']);
      });

      it(`supports 'secp256k1' curve`, async () => {
        const privateKey = await ecdh.generateKey({
          algorithm     : { name: 'ECDH', curve: 'secp256k1' },
          keyOperations : ['deriveBits', 'deriveKey']
        });

        if (!('crv' in privateKey)) throw new Error; // TS type guard
        expect(privateKey.crv).to.equal('secp256k1');
      });

      it(`supports 'X25519' curve`, async () => {
        const privateKey = await ecdh.generateKey({
          algorithm     : { name: 'ECDH', curve: 'X25519' },
          keyOperations : ['deriveBits', 'deriveKey']
        });

        if (!('crv' in privateKey)) throw new Error; // TS type guard
        expect(privateKey.crv).to.equal('X25519');
      });

      it(`supports 'deriveBits' and/or 'deriveKey' key operations`, async () => {
        await expect(ecdh.generateKey({
          algorithm     : { name: 'ECDH', curve: 'X25519' },
          keyOperations : ['deriveBits']
        })).to.eventually.be.fulfilled;

        await expect(ecdh.generateKey({
          algorithm     : { name: 'ECDH', curve: 'X25519' },
          keyOperations : ['deriveKey']
        })).to.eventually.be.fulfilled;

        await expect(ecdh.generateKey({
          algorithm     : { name: 'ECDH', curve: 'X25519' },
          keyOperations : ['deriveBits', 'deriveKey']
        })).to.eventually.be.fulfilled;
      });

      it(`accepts 'keyOperations' as undefined`, async () => {
        const privateKey = await ecdh.generateKey({
          algorithm: { name: 'ECDH', curve: 'X25519' },
        });

        expect(privateKey).to.exist;
        expect(privateKey.key_ops).to.be.undefined;
        expect(privateKey).to.have.property('kty', 'OKP');
        expect(privateKey).to.have.property('crv', 'X25519');
      });

      it('validates algorithm, curve, and key operations', async () => {
        // Invalid (algorithm name, named curve, and key operations) result in algorithm name check failing first.
        await expect(ecdh.generateKey({
          algorithm     : { name: 'foo', curve: 'bar' },
          keyOperations : ['encrypt']
        })).to.eventually.be.rejectedWith(NotSupportedError, 'Algorithm not supported');

        // Valid (algorithm name) + Invalid (named curve, key operations) result named curve check failing first.
        await expect(ecdh.generateKey({
          algorithm     : { name: 'ECDH', curve: 'bar' },
          keyOperations : ['encrypt']
        })).to.eventually.be.rejectedWith(TypeError, 'Out of range');

        // Valid (algorithm name, named curve) + Invalid (key operations) result key operations check failing first.
        await expect(ecdh.generateKey({
          algorithm     : { name: 'ECDH', curve: 'X25519' },
          keyOperations : ['encrypt']
        })).to.eventually.be.rejectedWith(InvalidAccessError, 'Requested operation');
      });

      it(`throws an error if 'secp256k1' key pair generation fails`, async function() {
        // @ts-ignore because the method is being intentionally stubbed to return undefined.
        const secp256k1Stub = sinon.stub(Secp256k1, 'generateKey').returns(Promise.resolve(undefined));

        try {
          await ecdh.generateKey({
            algorithm     : { name: 'ECDH', curve: 'secp256k1' },
            keyOperations : ['deriveBits', 'deriveKey']
          });
          expect.fail('Expected ecdh.generateKey() to throw an error');
        } catch (error) {
          expect(error).to.be.an('error');
          expect((error as Error).message).to.include('failed to generate key');
        } finally {
          secp256k1Stub.restore();
        }
      });

      it(`should throw an error if 'X25519' key pair generation fails`, async function() {
        // @ts-ignore because the method is being intentionally stubbed to return undefined.
        const x25519Stub = sinon.stub(X25519, 'generateKey').returns(Promise.resolve(undefined));

        try {
          await ecdh.generateKey({
            algorithm     : { name: 'ECDH', curve: 'X25519' },
            keyOperations : ['deriveBits', 'deriveKey']
          });
          expect.fail('Expected ecdh.generateKey() to throw an error');
        } catch (error) {
          expect(error).to.be.an('error');
          expect((error as Error).message).to.include('failed to generate key');
        } finally {
          x25519Stub.restore();
        }
      });
    });
  });

  // describe('EcdsaAlgorithm', () => {
  //   let ecdsa: EcdsaAlgorithm;

  //   before(() => {
  //     ecdsa = EcdsaAlgorithm.create();
  //   });

  //   describe('generateKey()', () => {
  //     it('returns a key pair', async () => {
  //       const keys = await ecdsa.generateKey({
  //         algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
  //         extractable : false,
  //         keyOperations   : ['sign', 'verify']
  //       });

  //       expect(keys).to.have.property('privateKey');
  //       expect(keys.privateKey.type).to.equal('private');
  //       expect(keys.privateKey.usages).to.deep.equal(['sign']);

  //       expect(keys).to.have.property('publicKey');
  //       expect(keys.publicKey.type).to.equal('public');
  //       expect(keys.publicKey.usages).to.deep.equal(['verify']);
  //     });

  //     it('public key is always extractable', async () => {
  //       let keys: CryptoKeyPair;
  //       // publicKey is extractable if generateKey() called with extractable = false
  //       keys = await ecdsa.generateKey({
  //         algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1'  },
  //         extractable : false,
  //         keyOperations   : ['sign', 'verify']
  //       });
  //       expect(keys.publicKey.extractable).to.be.true;

  //       // publicKey is extractable if generateKey() called with extractable = true
  //       keys = await ecdsa.generateKey({
  //         algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1'  },
  //         extractable : true,
  //         keyOperations   : ['sign', 'verify']
  //       });
  //       expect(keys.publicKey.extractable).to.be.true;
  //     });

  //     it('private key is selectively extractable', async () => {
  //       let keys: CryptoKeyPair;
  //       // privateKey is NOT extractable if generateKey() called with extractable = false
  //       keys = await ecdsa.generateKey({
  //         algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1'  },
  //         extractable : false,
  //         keyOperations   : ['sign', 'verify']
  //       });
  //       expect(keys.privateKey.extractable).to.be.false;

  //       // privateKey is extractable if generateKey() called with extractable = true
  //       keys = await ecdsa.generateKey({
  //         algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1'  },
  //         extractable : true,
  //         keyOperations   : ['sign', 'verify']
  //       });
  //       expect(keys.privateKey.extractable).to.be.true;
  //     });

  //     it(`supports 'secp256k1' curve with compressed public keys, by default`, async () => {
  //       const keys = await ecdsa.generateKey({
  //         algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
  //         extractable : false,
  //         keyOperations   : ['sign', 'verify']
  //       });

  //       if (!('namedCurve' in keys.privateKey.algorithm)) throw new Error; // type guard
  //       expect(keys.privateKey.algorithm.namedCurve).to.equal('secp256k1');
  //       if (!('namedCurve' in keys.publicKey.algorithm)) throw new Error; // type guard
  //       expect(keys.publicKey.algorithm.namedCurve).to.equal('secp256k1');
  //       if (!('compressedPublicKey' in keys.publicKey.algorithm)) throw new Error; // type guard
  //       expect(keys.publicKey.algorithm.compressedPublicKey).to.be.true;
  //     });

  //     it(`supports 'secp256k1' curve with compressed public keys`, async () => {
  //       const keys = await ecdsa.generateKey({
  //         algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1', compressedPublicKey: true },
  //         extractable : false,
  //         keyOperations   : ['sign', 'verify']
  //       });

  //       if (!('namedCurve' in keys.privateKey.algorithm)) throw new Error; // type guard
  //       expect(keys.privateKey.algorithm.namedCurve).to.equal('secp256k1');
  //       if (!('namedCurve' in keys.publicKey.algorithm)) throw new Error; // type guard
  //       expect(keys.publicKey.algorithm.namedCurve).to.equal('secp256k1');
  //       if (!('compressedPublicKey' in keys.publicKey.algorithm)) throw new Error; // type guard
  //       expect(keys.publicKey.algorithm.compressedPublicKey).to.be.true;
  //     });

  //     it(`supports 'secp256k1' curve with uncompressed public keys`, async () => {
  //       const keys = await ecdsa.generateKey({
  //         algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1', compressedPublicKey: false },
  //         extractable : false,
  //         keyOperations   : ['sign', 'verify']
  //       });

  //       if (!('namedCurve' in keys.privateKey.algorithm)) throw new Error; // type guard
  //       expect(keys.privateKey.algorithm.namedCurve).to.equal('secp256k1');
  //       if (!('namedCurve' in keys.publicKey.algorithm)) throw new Error; // type guard
  //       expect(keys.publicKey.algorithm.namedCurve).to.equal('secp256k1');
  //       if (!('compressedPublicKey' in keys.publicKey.algorithm)) throw new Error; // type guard
  //       expect(keys.publicKey.algorithm.compressedPublicKey).to.be.false;
  //     });

  //     it(`supports 'sign' and/or 'verify' key usages`, async () => {
  //       await expect(ecdsa.generateKey({
  //         algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
  //         extractable : false,
  //         keyOperations   : ['sign']
  //       })).to.eventually.be.fulfilled;

  //       await expect(ecdsa.generateKey({
  //         algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
  //         extractable : false,
  //         keyOperations   : ['verify']
  //       })).to.eventually.be.fulfilled;

  //       await expect(ecdsa.generateKey({
  //         algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
  //         extractable : false,
  //         keyOperations   : ['sign', 'verify']
  //       })).to.eventually.be.fulfilled;
  //     });

  //     it('validates algorithm, named curve, and key usages', async () => {
  //       // Invalid (algorithm name, named curve, and key usages) result in algorithm name check failing first.
  //       await expect(ecdsa.generateKey({
  //         algorithm   : { name: 'foo', namedCurve: 'bar' },
  //         extractable : false,
  //         keyOperations   : ['encrypt']
  //       })).to.eventually.be.rejectedWith(NotSupportedError, 'Algorithm not supported');

  //       // Valid (algorithm name) + Invalid (named curve, key usages) result named curve check failing first.
  //       await expect(ecdsa.generateKey({
  //         algorithm   : { name: 'ECDSA', namedCurve: 'bar' },
  //         extractable : false,
  //         keyOperations   : ['encrypt']
  //       })).to.eventually.be.rejectedWith(TypeError, 'Out of range');

  //       // Valid (algorithm name, named curve) + Invalid (key usages) result key usages check failing first.
  //       await expect(ecdsa.generateKey({
  //         algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
  //         extractable : false,
  //         keyOperations   : ['encrypt']
  //       })).to.eventually.be.rejectedWith(InvalidAccessError, 'Requested operation');
  //     });

  //     it(`should throw an error if 'secp256k1' key pair generation fails`, async function() {
  //       // @ts-ignore because the method is being intentionally stubbed to return null.
  //       const secp256k1Stub = sinon.stub(Secp256k1, 'generateKeyPair').returns(Promise.resolve(null));

  //       try {
  //         await ecdsa.generateKey({
  //           algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
  //           extractable : true,
  //           keyOperations   : ['sign']
  //         });
  //         secp256k1Stub.restore();
  //         expect.fail('Expect generateKey() to throw an error');
  //       } catch (error) {
  //         secp256k1Stub.restore();
  //         expect(error).to.be.an('error');
  //         expect((error as Error).message).to.equal('Operation failed to generate key pair.');
  //       }
  //     });
  //   });

  //   describe('sign()', () => {

  //     let keyPair: Web5Crypto.CryptoKeyPair;
  //     let data = new Uint8Array([51, 52, 53]);

  //     beforeEach(async () => {
  //       keyPair = await ecdsa.generateKey({
  //         algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
  //         extractable : false,
  //         keyOperations   : ['sign', 'verify']
  //       });
  //     });

  //     it(`returns a signature for 'secp256k1' keys`, async () => {
  //       const signature = await ecdsa.sign({
  //         algorithm : { name: 'ECDSA', hash: 'SHA-256' },
  //         key       : keyPair.privateKey,
  //         data      : data
  //       });

  //       expect(signature).to.be.instanceOf(Uint8Array);
  //       expect(signature.byteLength).to.equal(64);
  //     });

  //     it('validates algorithm name and key algorithm name', async () => {
  //       // Invalid (algorithm name, hash algorithm, private key, and data) result in algorithm name check failing first.
  //       await expect(ecdsa.sign({
  //         algorithm : { name: 'Nope', hash: 'nope' },
  //         // @ts-expect-error because invalid key intentionally specified.
  //         key       : { foo: 'bar '},
  //         // @ts-expect-error because invalid data type intentionally specified.
  //         data      : 'baz'
  //       })).to.eventually.be.rejectedWith(NotSupportedError, 'Algorithm not supported');

  //       // Valid (algorithm name) + Invalid (hash algorithm, private key, and data) result in hash algorithm check failing first.
  //       await expect(ecdsa.sign({
  //         algorithm : { name: 'ECDSA', hash: 'nope' },
  //         // @ts-expect-error because invalid key intentionally specified.
  //         key       : { foo: 'bar '},
  //         // @ts-expect-error because invalid data type intentionally specified.
  //         data      : 'baz'
  //       })).to.eventually.be.rejectedWith(TypeError, 'Out of range');

  //       // Valid (algorithm name, hash algorithm) + Invalid (private key, and data) result in key algorithm name check failing first.
  //       await expect(ecdsa.sign({
  //         algorithm : { name: 'ECDSA', hash: 'SHA-256' },
  //         // @ts-expect-error because invalid key intentionally specified.
  //         key       : { algorithm: { name: 'bar '} },
  //         // @ts-expect-error because invalid data type intentionally specified.
  //         data      : 'baz'
  //       })).to.eventually.be.rejectedWith(InvalidAccessError, 'does not match');
  //     });

  //     it('validates that key is not a public key', async () => {
  //       // Valid (algorithm name, hash algorithm, data) + Invalid (private key) result in key type check failing first.
  //       await expect(ecdsa.sign({
  //         algorithm : { name: 'ECDSA', hash: 'SHA-256' },
  //         key       : keyPair.publicKey,
  //         data      : data
  //       })).to.eventually.be.rejectedWith(InvalidAccessError, 'Requested operation is not valid');
  //     });

  //     it(`validates that key usage is 'sign'`, async () => {
  //       // Manually specify the private key usages to exclude the 'sign' operation.
  //       keyPair.privateKey.usages = ['verify'];

  //       await expect(ecdsa.sign({
  //         algorithm : { name: 'ECDSA', hash: 'SHA-256' },
  //         key       : keyPair.privateKey,
  //         data      : data
  //       })).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for the provided key');
  //     });

  //     it('throws an error when key is an unsupported curve', async () => {
  //       // Manually change the key's named curve to trigger an error.
  //       // @ts-expect-error because TS can't determine the type of key.
  //       keyPair.privateKey.algorithm.namedCurve = 'nope';

  //       await expect(ecdsa.sign({
  //         algorithm : { name: 'ECDSA', hash: 'SHA-256' },
  //         key       : keyPair.privateKey,
  //         data      : data
  //       })).to.eventually.be.rejectedWith(TypeError, 'Out of range');
  //     });
  //   });

  //   describe('verify()', () => {
  //     let keyPair: Web5Crypto.CryptoKeyPair;
  //     let signature: Uint8Array;
  //     let data = new Uint8Array([51, 52, 53]);

  //     beforeEach(async () => {
  //       keyPair = await ecdsa.generateKey({
  //         algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
  //         extractable : false,
  //         keyOperations   : ['sign', 'verify']
  //       });

  //       signature = await ecdsa.sign({
  //         algorithm : { name: 'ECDSA', hash: 'SHA-256' },
  //         key       : keyPair.privateKey,
  //         data      : data
  //       });
  //     });

  //     it(`returns a verification result for 'secp256k1' keys`, async () => {
  //       const isValid = await ecdsa.verify({
  //         algorithm : { name: 'ECDSA', hash: 'SHA-256' },
  //         key       : keyPair.publicKey,
  //         signature : signature,
  //         data      : data
  //       });

  //       expect(isValid).to.be.a('boolean');
  //       expect(isValid).to.be.true;
  //     });

  //     it('validates algorithm name and key algorithm name', async () => {
  //       // Invalid (algorithm name, hash algorithm, public key, signature, and data) result in algorithm name check failing first.
  //       await expect(ecdsa.verify({
  //         algorithm : { name: 'Nope', hash: 'nope' },
  //         // @ts-expect-error because invalid key intentionally specified.
  //         key       : { foo: 'bar '},
  //         // @ts-expect-error because invalid signature intentionally specified.
  //         signature : 57,
  //         // @ts-expect-error because invalid data type intentionally specified.
  //         data      : 'baz'
  //       })).to.eventually.be.rejectedWith(NotSupportedError, 'Algorithm not supported');

  //       // Valid (algorithm name) + Invalid (hash algorithm, public key, signature and data) result in hash algorithm check failing first.
  //       await expect(ecdsa.verify({
  //         algorithm : { name: 'ECDSA', hash: 'nope' },
  //         // @ts-expect-error because invalid key intentionally specified.
  //         key       : { foo: 'bar '},
  //         // @ts-expect-error because invalid signature intentionally specified.
  //         signature : 57,
  //         // @ts-expect-error because invalid data type intentionally specified.
  //         data      : 'baz'
  //       })).to.eventually.be.rejectedWith(TypeError, 'Out of range');

  //       // Valid (algorithm name, hash algorithm) + Invalid (public key, signature, and data) result in key algorithm name check failing first.
  //       await expect(ecdsa.verify({
  //         algorithm : { name: 'ECDSA', hash: 'SHA-256' },
  //         // @ts-expect-error because invalid key intentionally specified.
  //         key       : { algorithm: { name: 'bar '} },
  //         // @ts-expect-error because invalid signature intentionally specified.
  //         signature : 57,
  //         // @ts-expect-error because invalid data type intentionally specified.
  //         data      : 'baz'
  //       })).to.eventually.be.rejectedWith(InvalidAccessError, 'does not match');
  //     });

  //     it('validates that key is not a private key', async () => {
  //       // Valid (algorithm name, hash algorithm, signature, data) + Invalid (public key) result in key type check failing first.
  //       await expect(ecdsa.verify({
  //         algorithm : { name: 'ECDSA', hash: 'SHA-256' },
  //         key       : keyPair.privateKey,
  //         signature : signature,
  //         data      : data
  //       })).to.eventually.be.rejectedWith(InvalidAccessError, 'Requested operation is not valid');
  //     });

  //     it(`validates that key usage is 'verify'`, async () => {
  //       // Manually specify the private key usages to exclude the 'verify' operation.
  //       keyPair.publicKey.usages = ['sign'];

  //       await expect(ecdsa.verify({
  //         algorithm : { name: 'ECDSA', hash: 'SHA-256' },
  //         key       : keyPair.publicKey,
  //         signature : signature,
  //         data      : data
  //       })).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for the provided key');
  //     });

  //     it('throws an error when key is an unsupported curve', async () => {
  //       // Manually change the key's named curve to trigger an error.
  //       // @ts-expect-error because TS can't determine the type of key.
  //       keyPair.publicKey.algorithm.namedCurve = 'nope';

  //       await expect(ecdsa.verify({
  //         algorithm : { name: 'ECDSA', hash: 'SHA-256' },
  //         key       : keyPair.publicKey,
  //         signature : signature,
  //         data      : data
  //       })).to.eventually.be.rejectedWith(TypeError, 'Out of range');
  //     });
  //   });
  // });

  // describe('EdDsaAlgorithm', () => {
  //   let eddsa: EdDsaAlgorithm;

  //   before(() => {
  //     eddsa = EdDsaAlgorithm.create();
  //   });

  //   describe('generateKey()', () => {
  //     it('returns a key pair', async () => {
  //       const keys = await eddsa.generateKey({
  //         algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
  //         extractable : false,
  //         keyOperations   : ['sign', 'verify']
  //       });

  //       expect(keys).to.have.property('privateKey');
  //       expect(keys.privateKey.type).to.equal('private');
  //       expect(keys.privateKey.usages).to.deep.equal(['sign']);

  //       expect(keys).to.have.property('publicKey');
  //       expect(keys.publicKey.type).to.equal('public');
  //       expect(keys.publicKey.usages).to.deep.equal(['verify']);
  //     });

  //     it('public key is always extractable', async () => {
  //       let keys: CryptoKeyPair;
  //       // publicKey is extractable if generateKey() called with extractable = false
  //       keys = await eddsa.generateKey({
  //         algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519'  },
  //         extractable : false,
  //         keyOperations   : ['sign', 'verify']
  //       });
  //       expect(keys.publicKey.extractable).to.be.true;

  //       // publicKey is extractable if generateKey() called with extractable = true
  //       keys = await eddsa.generateKey({
  //         algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519'  },
  //         extractable : true,
  //         keyOperations   : ['sign', 'verify']
  //       });
  //       expect(keys.publicKey.extractable).to.be.true;
  //     });

  //     it('private key is selectively extractable', async () => {
  //       let keys: CryptoKeyPair;
  //       // privateKey is NOT extractable if generateKey() called with extractable = false
  //       keys = await eddsa.generateKey({
  //         algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519'  },
  //         extractable : false,
  //         keyOperations   : ['sign', 'verify']
  //       });
  //       expect(keys.privateKey.extractable).to.be.false;

  //       // privateKey is extractable if generateKey() called with extractable = true
  //       keys = await eddsa.generateKey({
  //         algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519'  },
  //         extractable : true,
  //         keyOperations   : ['sign', 'verify']
  //       });
  //       expect(keys.privateKey.extractable).to.be.true;
  //     });

  //     it(`supports 'Ed25519' curve`, async () => {
  //       const keys = await eddsa.generateKey({
  //         algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
  //         extractable : false,
  //         keyOperations   : ['sign', 'verify']
  //       });

  //       if (!('namedCurve' in keys.privateKey.algorithm)) throw new Error; // type guard
  //       expect(keys.privateKey.algorithm.namedCurve).to.equal('Ed25519');
  //       if (!('namedCurve' in keys.publicKey.algorithm)) throw new Error; // type guard
  //       expect(keys.publicKey.algorithm.namedCurve).to.equal('Ed25519');
  //     });

  //     it(`supports 'sign' and/or 'verify' key usages`, async () => {
  //       await expect(eddsa.generateKey({
  //         algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
  //         extractable : false,
  //         keyOperations   : ['sign']
  //       })).to.eventually.be.fulfilled;

  //       await expect(eddsa.generateKey({
  //         algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
  //         extractable : false,
  //         keyOperations   : ['verify']
  //       })).to.eventually.be.fulfilled;

  //       await expect(eddsa.generateKey({
  //         algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
  //         extractable : false,
  //         keyOperations   : ['sign', 'verify']
  //       })).to.eventually.be.fulfilled;
  //     });

  //     it('validates algorithm, named curve, and key usages', async () => {
  //       // Invalid (algorithm name, named curve, and key usages) result in algorithm name check failing first.
  //       await expect(eddsa.generateKey({
  //         algorithm   : { name: 'foo', namedCurve: 'bar' },
  //         extractable : false,
  //         keyOperations   : ['encrypt']
  //       })).to.eventually.be.rejectedWith(NotSupportedError, 'Algorithm not supported');

  //       // Valid (algorithm name) + Invalid (named curve, key usages) result named curve check failing first.
  //       await expect(eddsa.generateKey({
  //         algorithm   : { name: 'EdDSA', namedCurve: 'bar' },
  //         extractable : false,
  //         keyOperations   : ['encrypt']
  //       })).to.eventually.be.rejectedWith(TypeError, 'Out of range');

  //       // Valid (algorithm name, named curve) + Invalid (key usages) result key usages check failing first.
  //       await expect(eddsa.generateKey({
  //         algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
  //         extractable : false,
  //         keyOperations   : ['encrypt']
  //       })).to.eventually.be.rejectedWith(InvalidAccessError, 'Requested operation');
  //     });

  //     it(`should throw an error if 'Ed25519' key pair generation fails`, async function() {
  //       // @ts-ignore because the method is being intentionally stubbed to return null.
  //       const ed25519Stub = sinon.stub(Ed25519, 'generateKeyPair').returns(Promise.resolve(null));

  //       try {
  //         await eddsa.generateKey({
  //           algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
  //           extractable : false,
  //           keyOperations   : ['sign', 'verify']
  //         });
  //         ed25519Stub.restore();
  //         expect.fail('Expect generateKey() to throw an error');
  //       } catch (error) {
  //         ed25519Stub.restore();
  //         expect(error).to.be.an('error');
  //         expect((error as Error).message).to.equal('Operation failed to generate key pair.');
  //       }
  //     });
  //   });

  //   describe('sign()', () => {

  //     let keyPair: Web5Crypto.CryptoKeyPair;
  //     let data = new Uint8Array([51, 52, 53]);

  //     beforeEach(async () => {
  //       keyPair = await eddsa.generateKey({
  //         algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
  //         extractable : false,
  //         keyOperations   : ['sign', 'verify']
  //       });
  //     });

  //     it(`returns a signature for 'Ed25519' keys`, async () => {
  //       const signature = await eddsa.sign({
  //         algorithm : { name: 'EdDSA' },
  //         key       : keyPair.privateKey,
  //         data      : data
  //       });

  //       expect(signature).to.be.instanceOf(Uint8Array);
  //       expect(signature.byteLength).to.equal(64);
  //     });

  //     it('validates algorithm name and key algorithm name', async () => {
  //       // Invalid (algorithm name, private key, and data) result in algorithm name check failing first.
  //       await expect(eddsa.sign({
  //         algorithm : { name: 'Nope' },
  //         // @ts-expect-error because invalid key intentionally specified.
  //         key       : { foo: 'bar '},
  //         // @ts-expect-error because invalid data type intentionally specified.
  //         data      : 'baz'
  //       })).to.eventually.be.rejectedWith(NotSupportedError, 'Algorithm not supported');

  //       // Valid (algorithm name) + Invalid (private key, and data) result in key algorithm name check failing first.
  //       await expect(eddsa.sign({
  //         algorithm : { name: 'EdDSA' },
  //         // @ts-expect-error because invalid key intentionally specified.
  //         key       : { algorithm: { name: 'bar '} },
  //         // @ts-expect-error because invalid data type intentionally specified.
  //         data      : 'baz'
  //       })).to.eventually.be.rejectedWith(InvalidAccessError, 'does not match');
  //     });

  //     it('validates that key is not a public key', async () => {
  //       // Valid (algorithm name, data) + Invalid (private key) result in key type check failing first.
  //       await expect(eddsa.sign({
  //         algorithm : { name: 'EdDSA' },
  //         key       : keyPair.publicKey,
  //         data      : data
  //       })).to.eventually.be.rejectedWith(InvalidAccessError, 'Requested operation is not valid');
  //     });

  //     it(`validates that key usage is 'sign'`, async () => {
  //       // Manually specify the private key usages to exclude the 'sign' operation.
  //       keyPair.privateKey.usages = ['verify'];

  //       await expect(eddsa.sign({
  //         algorithm : { name: 'EdDSA' },
  //         key       : keyPair.privateKey,
  //         data      : data
  //       })).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for the provided key');
  //     });

  //     it('throws an error when key is an unsupported curve', async () => {
  //       // Manually change the key's named curve to trigger an error.
  //       // @ts-expect-error because TS can't determine the type of key.
  //       keyPair.privateKey.algorithm.namedCurve = 'nope';

  //       await expect(eddsa.sign({
  //         algorithm : { name: 'EdDSA' },
  //         key       : keyPair.privateKey,
  //         data      : data
  //       })).to.eventually.be.rejectedWith(TypeError, 'Out of range');
  //     });
  //   });

  //   describe('verify()', () => {
  //     let keyPair: Web5Crypto.CryptoKeyPair;
  //     let signature: Uint8Array;
  //     let data = new Uint8Array([51, 52, 53]);

  //     beforeEach(async () => {
  //       keyPair = await eddsa.generateKey({
  //         algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
  //         extractable : false,
  //         keyOperations   : ['sign', 'verify']
  //       });

  //       signature = await eddsa.sign({
  //         algorithm : { name: 'EdDSA' },
  //         key       : keyPair.privateKey,
  //         data      : data
  //       });
  //     });

  //     it(`returns a verification result for 'Ed25519' keys`, async () => {
  //       const isValid = await eddsa.verify({
  //         algorithm : { name: 'EdDSA' },
  //         key       : keyPair.publicKey,
  //         signature : signature,
  //         data      : data
  //       });

  //       expect(isValid).to.be.a('boolean');
  //       expect(isValid).to.be.true;
  //     });

  //     it('validates algorithm name and key algorithm name', async () => {
  //       // Invalid (algorithm name, public key, signature, and data) result in algorithm name check failing first.
  //       await expect(eddsa.verify({
  //         algorithm : { name: 'Nope' },
  //         // @ts-expect-error because invalid key intentionally specified.
  //         key       : { foo: 'bar '},
  //         // @ts-expect-error because invalid signature intentionally specified.
  //         signature : 57,
  //         // @ts-expect-error because invalid data type intentionally specified.
  //         data      : 'baz'
  //       })).to.eventually.be.rejectedWith(NotSupportedError, 'Algorithm not supported');

  //       // Valid (algorithm name) + Invalid (public key, signature, and data) result in key algorithm name check failing first.
  //       await expect(eddsa.verify({
  //         algorithm : { name: 'EdDSA' },
  //         // @ts-expect-error because invalid key intentionally specified.
  //         key       : { algorithm: { name: 'bar '} },
  //         // @ts-expect-error because invalid signature intentionally specified.
  //         signature : 57,
  //         // @ts-expect-error because invalid data type intentionally specified.
  //         data      : 'baz'
  //       })).to.eventually.be.rejectedWith(InvalidAccessError, 'does not match');
  //     });

  //     it('validates that key is not a private key', async () => {
  //       // Valid (algorithm name, signature, data) + Invalid (public key) result in key type check failing first.
  //       await expect(eddsa.verify({
  //         algorithm : { name: 'EdDSA' },
  //         key       : keyPair.privateKey,
  //         signature : signature,
  //         data      : data
  //       })).to.eventually.be.rejectedWith(InvalidAccessError, 'Requested operation is not valid');
  //     });

  //     it(`validates that key usage is 'verify'`, async () => {
  //       // Manually specify the private key usages to exclude the 'verify' operation.
  //       keyPair.publicKey.usages = ['sign'];

  //       await expect(eddsa.verify({
  //         algorithm : { name: 'EdDSA' },
  //         key       : keyPair.publicKey,
  //         signature : signature,
  //         data      : data
  //       })).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for the provided key');
  //     });

  //     it('throws an error when key is an unsupported curve', async () => {
  //       // Manually change the key's named curve to trigger an error.
  //       // @ts-expect-error because TS can't determine the type of key.
  //       keyPair.publicKey.algorithm.namedCurve = 'nope';

  //       await expect(eddsa.verify({
  //         algorithm : { name: 'EdDSA' },
  //         key       : keyPair.publicKey,
  //         signature : signature,
  //         data      : data
  //       })).to.eventually.be.rejectedWith(TypeError, 'Out of range');
  //     });
  //   });
  // });

  describe('Pbkdf2Algorithm', () => {
    let pbkdf2: Pbkdf2Algorithm;

    before(() => {
      pbkdf2 = Pbkdf2Algorithm.create();
    });

    describe('deriveBits()', () => {
      let inputKey: PrivateKeyJwk;

      beforeEach(async () => {
        inputKey = {
          kty : 'oct',
          k   : Convert.uint8Array(new Uint8Array([51, 52, 53])).toBase64Url()
        };
      });

      it('returns derived key as a Uint8Array', async () => {
        const derivedKey = await pbkdf2.deriveBits({
          algorithm : { name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array([54, 55, 56]), iterations: 1 },
          baseKey   : inputKey,
          length    : 256
        });

        expect(derivedKey).to.be.instanceOf(Uint8Array);
        expect(derivedKey.byteLength).to.equal(256 / 8);
      });

      it('returns derived key with specified length, if possible', async () => {
        let derivedKey = await pbkdf2.deriveBits({
          algorithm : { name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array([54, 55, 56]), iterations: 1 },
          baseKey   : inputKey,
          length    : 16
        });
        expect(derivedKey.byteLength).to.equal(16 / 8);

        derivedKey = await pbkdf2.deriveBits({
          algorithm : { name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array([54, 55, 56]), iterations: 1 },
          baseKey   : inputKey,
          length    : 512
        });
        expect(derivedKey.byteLength).to.equal(512 / 8);

        derivedKey = await pbkdf2.deriveBits({
          algorithm : { name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array([54, 55, 56]), iterations: 1 },
          baseKey   : inputKey,
          length    : 1024
        });
        expect(derivedKey.byteLength).to.equal(1024 / 8);
      });

      it('does not throw if the specified key operations are valid', async () => {
        inputKey.key_ops = ['deriveBits'];
        await expect(pbkdf2.deriveBits({
          algorithm : { name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array([54, 55, 56]), iterations: 1 },
          baseKey   : inputKey,
          length    : 256
        })).to.eventually.be.fulfilled;
      });

      it('throws error if requested length is 0', async () => {
        await expect(pbkdf2.deriveBits({
          algorithm : { name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array([54, 55, 56]), iterations: 1 },
          baseKey   : inputKey,
          length    : 0
        })).to.eventually.be.rejectedWith(OperationError, `cannot be zero`);
      });

      it('throws an error if the given length is not a multiple of 8', async () => {
        await expect(pbkdf2.deriveBits({
          algorithm : { name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array([54, 55, 56]), iterations: 1 },
          baseKey   : inputKey,
          length    : 12
        })).to.eventually.be.rejectedWith(OperationError, `'length' must be a multiple of 8`);
      });

      it('throws an error if the specified key operations are invalid', async () => {
        inputKey.key_ops = ['encrypt', 'sign'];
        await expect(pbkdf2.deriveBits({
          algorithm : { name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array([54, 55, 56]), iterations: 1 },
          baseKey   : inputKey,
          length    : 256
        })).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for the provided key');
      });

      it(`supports 'SHA-256' hash function`, async () => {
        const derivedKey = await pbkdf2.deriveBits({
          algorithm : { name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array([54, 55, 56]), iterations: 1 },
          baseKey   : inputKey,
          length    : 256
        });
        expect(derivedKey).to.be.instanceOf(Uint8Array);
        expect(derivedKey.byteLength).to.equal(32);
      });

      it(`supports 'SHA-384' hash function`, async () => {
        const derivedKey = await pbkdf2.deriveBits({
          algorithm : { name: 'PBKDF2', hash: 'SHA-384', salt: new Uint8Array([54, 55, 56]), iterations: 1 },
          baseKey   : inputKey,
          length    : 256
        });
        expect(derivedKey).to.be.instanceOf(Uint8Array);
        expect(derivedKey.byteLength).to.equal(32);
      });

      it(`supports 'SHA-512' hash function`, async () => {
        const derivedKey = await pbkdf2.deriveBits({
          algorithm : { name: 'PBKDF2', hash: 'SHA-512', salt: new Uint8Array([54, 55, 56]), iterations: 1 },
          baseKey   : inputKey,
          length    : 256
        });
        expect(derivedKey).to.be.instanceOf(Uint8Array);
        expect(derivedKey.byteLength).to.equal(32);
      });

      it(`throws an error for 'SHA-1' hash function`, async () => {
        await expect(pbkdf2.deriveBits({
          algorithm : { name: 'PBKDF2', hash: 'SHA-1', salt: new Uint8Array([54, 55, 56]), iterations: 1 },
          baseKey   : inputKey,
          length    : 256
        })).to.eventually.be.rejectedWith(TypeError, 'Out of range');
      });
    });
  });
});