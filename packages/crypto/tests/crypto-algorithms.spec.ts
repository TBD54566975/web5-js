import sinon from 'sinon';
import chai, { expect } from 'chai';
import { Convert } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';

import type { Jwk, JwkParamsOctPrivate } from '../src/jose/jwk.js';

import { aesCtrTestVectors } from './fixtures/test-vectors/aes.js';
import { AesCtr, Ed25519, Secp256k1, X25519 } from '../src/crypto-primitives/index.js';
import { InvalidAccessError, NotSupportedError, OperationError } from '../src/algorithms-api/index.js';
import {
  EcdhAlgorithm,
  EcdsaAlgorithm,
  EdDsaAlgorithm,
  AesCtrAlgorithm,
  Pbkdf2Algorithm,
} from '../src/crypto-algorithms/index.js';

chai.use(chaiAsPromised);

describe('Default Crypto Algorithm Implementations', () => {

  describe('AesCtrAlgorithm', () => {
    let aesCtr: AesCtrAlgorithm;

    before(() => {
      aesCtr = AesCtrAlgorithm.create();
    });

    describe('decrypt()', () => {
      let dataEncryptionKey: Jwk;

      before(async () => {
        dataEncryptionKey = await aesCtr.generateKey({
          algorithm     : { name: 'A128CTR' },
          keyOperations : ['encrypt', 'decrypt']
        });
      });

      it('returns plaintext as a Uint8Array', async () => {
        const plaintext = await aesCtr.decrypt({
          algorithm: {
            name    : 'A128CTR',
            counter : new Uint8Array(16),
            length  : 128
          },
          key  : dataEncryptionKey,
          data : new Uint8Array([1, 2, 3, 4])
        });

        expect(plaintext).to.be.instanceOf(Uint8Array);
        expect(plaintext.byteLength).to.equal(4);
      });

      it('returns expected plaintext given ciphertext input', async () => {
        let dataEncryptionKey: Jwk;

        for (const vector of aesCtrTestVectors) {
          dataEncryptionKey = await AesCtr.bytesToPrivateKey({ privateKeyBytes: Convert.hex(vector.key).toUint8Array() });

          const plaintext = await aesCtr.decrypt({
            algorithm: {
              name    : 'A128CTR',
              counter : Convert.hex(vector.counter).toUint8Array(),
              length  : vector.length
            },
            key  : dataEncryptionKey,
            data : Convert.hex(vector.ciphertext).toUint8Array()
          });
          expect(Convert.uint8Array(plaintext).toHex()).to.deep.equal(vector.data);
        }
      });

      describe('encrypt()', () => {
        let dataEncryptionKey: Jwk;

        before(async () => {
          dataEncryptionKey = await aesCtr.generateKey({
            algorithm     : { name: 'A128CTR' },
            keyOperations : ['encrypt', 'decrypt']
          });
        });

        it('returns ciphertext as a Uint8Array', async () => {
          const ciphertext = await aesCtr.encrypt({
            algorithm: {
              name    : 'A128CTR',
              counter : new Uint8Array(16),
              length  : 128
            },
            key  : dataEncryptionKey,
            data : new Uint8Array([1, 2, 3, 4])
          });

          expect(ciphertext).to.be.instanceOf(Uint8Array);
          expect(ciphertext.byteLength).to.equal(4);
        });

        it('returns expected ciphertext given plaintext input', async () => {
          for (const vector of aesCtrTestVectors) {
            dataEncryptionKey = await AesCtr.bytesToPrivateKey({ privateKeyBytes: Convert.hex(vector.key).toUint8Array() });

            const ciphertext = await aesCtr.encrypt({
              algorithm: {
                name    : 'A128CTR',
                counter : Convert.hex(vector.counter).toUint8Array(),
                length  : vector.length
              },
              key  : dataEncryptionKey,
              data : Convert.hex(vector.data).toUint8Array()
            });
            expect(Convert.uint8Array(ciphertext).toHex()).to.deep.equal(vector.ciphertext);
          }
        });
      });
    });

    describe('generateKey()', () => {
      it('returns a private key in JWK format', async () => {
        const privateKey = await aesCtr.generateKey({
          algorithm     : { name: 'A128CTR' },
          keyOperations : ['encrypt', 'decrypt']
        });

        expect(privateKey).to.have.property('alg', 'A128CTR');
        expect(privateKey).to.have.property('k');
        expect(privateKey).to.have.property('kid');
        expect(privateKey).to.have.property('kty', 'oct');

        expect(privateKey.key_ops).to.deep.equal(['encrypt', 'decrypt']);
      });

      it(`supports 'A128CTR', 'A192CTR', and 'A256CTR' algorithms`, async () => {
        const algorithms = ['A128CTR', 'A192CTR', 'A256CTR'];
        for (const algorithm of algorithms) {
          await expect(aesCtr.generateKey({
            algorithm     : { name: algorithm },
            keyOperations : ['encrypt', 'decrypt']
          })).to.eventually.be.fulfilled;
        }
      });

      it(`returns keys with the correct bit length`, async () => {
        const algorithms = ['A128CTR', 'A192CTR', 'A256CTR'];
        for (const algorithm of algorithms) {
          const privateKey = await aesCtr.generateKey({
            algorithm     : { name: algorithm },
            keyOperations : ['encrypt', 'decrypt']
          }) as JwkParamsOctPrivate;
          const privateKeyBytes = Convert.base64Url(privateKey.k).toUint8Array();
          expect(privateKeyBytes.byteLength * 8).to.equal(parseInt(algorithm.slice(1, 4)));
        }
      });

      it(`throws an error if operation fails`, async function() {
        const checkGenerateKeyOptionsStub = sinon.stub(aesCtr, 'checkGenerateKeyOptions').returns(undefined);
        // @ts-expect-error because method is being intentionally stubbed to return undefined.
        const checkGenerateKeyStub = sinon.stub(AesCtr, 'generateKey').returns(Promise.resolve(undefined));

        try {
          // @ts-expect-error because no generateKey operations are defined.
          await aesCtr.generateKey({ algorithm: {} });
          expect.fail('Expected aesCtr.generateKey() to throw an error');
        } catch (error) {
          expect(error).to.be.an('error');
          expect((error as Error).message).to.include('Operation failed: generateKey');
        } finally {
          checkGenerateKeyOptionsStub.restore();
          checkGenerateKeyStub.restore();
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

      let secp256k1PrivateKeyA: Jwk;
      let secp256k1PublicKeyA: Jwk;
      let secp256k1PrivateKeyB: Jwk;
      let secp256k1PublicKeyB: Jwk;

      let x25519PrivateKeyA: Jwk;
      let x25519PublicKeyA: Jwk;
      let x25519PrivateKeyB: Jwk;
      let x25519PublicKeyB: Jwk;

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
          baseKey   : secp256k1PrivateKeyA
        });
        expect(sharedSecret).to.be.instanceOf(Uint8Array);
        expect(sharedSecret.byteLength).to.equal(32);
      });

      it(`supports 'X25519' curve`, async () => {
        const sharedSecret = await ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey: x25519PublicKeyB },
          baseKey   : x25519PrivateKeyA
        });
        expect(sharedSecret).to.be.instanceOf(Uint8Array);
        expect(sharedSecret.byteLength).to.equal(32);
      });

      it('throws an error when base or public key is an unsupported curve', async () => {
        // Manually change the key's curve to trigger an error.
        // @ts-expect-error because an unknown 'crv' value is manually set.
        const baseKey = { ...secp256k1PrivateKeyA, crv: 'non-existent-curve' } as Jwk;
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
          baseKey   : secp256k1PrivateKeyA
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
          baseKey   : secp256k1PrivateKeyA
        });
        const sharedSecretSecp256k1Reversed = await ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey: secp256k1PublicKeyA },
          baseKey   : secp256k1PrivateKeyB
        });
        expect(sharedSecretSecp256k1).to.deep.equal(sharedSecretSecp256k1Reversed);

        const sharedSecretX25519 = await ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey: x25519PublicKeyB },
          baseKey   : x25519PrivateKeyA
        });
        const sharedSecretX25519Reversed = await ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey: x25519PublicKeyA },
          baseKey   : x25519PrivateKeyB
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
        const baseKey = { ...secp256k1PrivateKeyA, key_ops: undefined } as Jwk;

        await expect(ecdh.deriveBits({
          algorithm: { name: 'ECDH', publicKey: secp256k1PublicKeyB },
          baseKey
        })).to.eventually.be.fulfilled;
      });

      it(`accepts public key without 'key_ops' set`, async () => {
        const publicKey = { ...secp256k1PublicKeyB, key_ops: undefined } as Jwk;

        await expect(ecdh.deriveBits({
          algorithm : { name: 'ECDH', publicKey },
          baseKey   : secp256k1PrivateKeyA
        })).to.eventually.be.fulfilled;
      });

      it(`if specified, validates base key operations includes 'deriveBits'`, async () => {
        // Manually specify the base key operations array to exclude the 'deriveBits' operation.
        const baseKey = { ...secp256k1PrivateKeyA, key_ops: ['sign'] } as Jwk;

        await expect(ecdh.deriveBits({
          algorithm: { name: 'ECDH', publicKey: secp256k1PublicKeyB },
          baseKey
        })).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for the provided key');
      });

      it(`if specified, validates public key operations includes 'deriveBits'`, async () => {
        // Manually specify the private key operations array to exclude the 'deriveBits' operation.
        const publicKey = { ...secp256k1PublicKeyB, key_ops: ['sign'] } as Jwk;

        await expect(
          ecdh.deriveBits({
            algorithm : { name: 'ECDH', publicKey },
            baseKey   : secp256k1PrivateKeyA
          })
        ).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for the provided key');
      });

      it('throws an error if the public/private keys from the same key pair are specified', async () => {
        await expect(
          ecdh.deriveBits({
            algorithm : { name: 'ECDH', publicKey: secp256k1PublicKeyA },
            baseKey   : secp256k1PrivateKeyA
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

      it(`throws an error if 'secp256k1' key generation fails`, async function() {
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
          expect((error as Error).message).to.include('Operation failed: generateKey');
        } finally {
          secp256k1Stub.restore();
        }
      });

      it(`throws an error if 'X25519' key generation fails`, async function() {
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
          expect((error as Error).message).to.include('Operation failed: generateKey');
        } finally {
          x25519Stub.restore();
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
      it('returns a private key in JWK format', async () => {
        const privateKey = await ecdsa.generateKey({
          algorithm     : { name: 'ES256K', curve: 'secp256k1' },
          keyOperations : ['sign']
        });

        expect(privateKey).to.have.property('crv', 'secp256k1');
        expect(privateKey).to.have.property('d');
        expect(privateKey).to.have.property('kid');
        expect(privateKey).to.have.property('kty', 'EC');
        expect(privateKey).to.have.property('x');

        expect(privateKey.key_ops).to.deep.equal(['sign']);
      });

      it(`supports 'secp256k1' curve`, async () => {
        const privateKey = await ecdsa.generateKey({
          algorithm     : { name: 'ES256K', curve: 'secp256k1' },
          keyOperations : ['sign']
        });

        if (!('crv' in privateKey)) throw new Error; // TS type guard
        expect(privateKey.crv).to.equal('secp256k1');
      });

      it(`supports 'sign' and/or 'verify' key operations`, async () => {
        await expect(ecdsa.generateKey({
          algorithm     : { name: 'ES256K', curve: 'secp256k1' },
          keyOperations : ['sign']
        })).to.eventually.be.fulfilled;

        await expect(ecdsa.generateKey({
          algorithm     : { name: 'ES256K', curve: 'secp256k1' },
          keyOperations : ['verify']
        })).to.eventually.be.fulfilled;

        await expect(ecdsa.generateKey({
          algorithm     : { name: 'ES256K', curve: 'secp256k1' },
          keyOperations : ['sign', 'verify']
        })).to.eventually.be.fulfilled;
      });

      it('validates algorithm name and curve', async () => {
        // Invalid (algorithm name, curve) results in algorithm name check failing first.
        await expect(ecdsa.generateKey({
          algorithm: { name: 'foo', curve: 'bar' }
        })).to.eventually.be.rejectedWith(NotSupportedError, 'Algorithm not supported');

        // Valid (algorithm name) + Invalid (curve) results in curve check failing first.
        await expect(ecdsa.generateKey({
          algorithm: { name: 'ES256K', curve: 'bar' }
        })).to.eventually.be.rejectedWith(TypeError, 'Out of range');
      });

      it(`accepts 'keyOperations' as undefined`, async () => {
        const privateKey = await ecdsa.generateKey({
          algorithm: { name: 'ES256K', curve: 'secp256k1' },
        });

        expect(privateKey).to.exist;
        expect(privateKey.key_ops).to.be.undefined;
        expect(privateKey).to.have.property('kty', 'EC');
        expect(privateKey).to.have.property('crv', 'secp256k1');
      });

      it(`throws an error if operation fails`, async function() {
        const checkGenerateKeyOptionsStub = sinon.stub(ecdsa, 'checkGenerateKeyOptions').returns(undefined);

        try {
          // @ts-expect-error because no generateKey operations are defined.
          await ecdsa.generateKey({ algorithm: {} });
          expect.fail('Expected ecdsa.generateKey() to throw an error');
        } catch (error) {
          expect(error).to.be.an('error');
          expect((error as Error).message).to.include('Operation failed: generateKey');
        } finally {
          checkGenerateKeyOptionsStub.restore();
        }
      });
    });

    describe('sign()', () => {
      let privateKey: Jwk;
      let data = new Uint8Array([51, 52, 53]);

      beforeEach(async () => {
        privateKey = await ecdsa.generateKey({
          algorithm     : { name: 'ES256K', curve: 'secp256k1' },
          keyOperations : ['sign', 'verify']
        });
      });

      it(`returns a signature for 'secp256k1' keys`, async () => {
        const signature = await ecdsa.sign({
          algorithm : { name: 'ES256K' },
          key       : privateKey,
          data      : data
        });

        expect(signature).to.be.instanceOf(Uint8Array);
        expect(signature.byteLength).to.equal(64);
      });

      it(`throws an error if sign operation fails`, async function() {
        // @ts-ignore because the method is being intentionally stubbed to return undefined.
        const checkSignOptionsStub = sinon.stub(ecdsa, 'checkSignOptions').returns(undefined);

        try {
          // @ts-expect-error because no sign operations are defined.
          await ecdsa.sign({ algorithm: {}, key: {}, data: undefined });
          expect.fail('Expected ecdsa.sign() to throw an error');
        } catch (error) {
          expect(error).to.be.an('error');
          expect((error as Error).message).to.include('Operation failed: sign');
        } finally {
          checkSignOptionsStub.restore();
        }
      });
    });

    describe('verify()', () => {
      let privateKey: Jwk;
      let publicKey: Jwk;
      let signature: Uint8Array;
      let data = new Uint8Array([51, 52, 53]);

      beforeEach(async () => {
        privateKey = await ecdsa.generateKey({
          algorithm     : { name: 'ES256K', curve: 'secp256k1' },
          keyOperations : ['sign']
        });

        publicKey = await Secp256k1.computePublicKey({ privateKey });

        signature = await ecdsa.sign({
          algorithm : { name: 'ES256K' },
          key       : privateKey,
          data      : data
        });
      });

      it(`returns a boolean verification result`, async () => {
        const isValid = await ecdsa.verify({
          algorithm : { name: 'ES256K' },
          key       : publicKey,
          signature : signature,
          data      : data
        });

        expect(isValid).to.be.a('boolean');
      });

      it(`validates 'secp256k1' signatures`, async () => {
        const isValid = await ecdsa.verify({
          algorithm : { name: 'ES256K' },
          key       : publicKey,
          signature : signature,
          data      : data
        });

        expect(isValid).to.be.true;
      });

      it(`throws an error if verify operation fails`, async function() {
        // @ts-ignore because the method is being intentionally stubbed to return undefined.
        const checkVerifyOptionsStub = sinon.stub(ecdsa, 'checkVerifyOptions').returns(undefined);

        try {
          // @ts-expect-error because no verify operations are defined.
          await ecdsa.verify({ algorithm: {}, key: {}, data: undefined, signature: undefined });
          expect.fail('Expected ecdsa.verify() to throw an error');
        } catch (error) {
          expect(error).to.be.an('error');
          expect((error as Error).message).to.include('Operation failed: verify');
        } finally {
          checkVerifyOptionsStub.restore();
        }
      });
    });
  });

  describe('EdDsaAlgorithm', () => {
    let eddsa: EdDsaAlgorithm;

    before(() => {
      eddsa = EdDsaAlgorithm.create();
    });

    describe('generateKey()', () => {
      it('returns a private key in JWK format', async () => {
        const privateKey = await eddsa.generateKey({
          algorithm     : { name: 'EdDSA', curve: 'Ed25519' },
          keyOperations : ['sign']
        });

        expect(privateKey).to.have.property('crv', 'Ed25519');
        expect(privateKey).to.have.property('d');
        expect(privateKey).to.have.property('kid');
        expect(privateKey).to.have.property('kty', 'OKP');
        expect(privateKey).to.have.property('x');

        expect(privateKey.key_ops).to.deep.equal(['sign']);
      });

      it(`supports 'Ed25519' curve`, async () => {
        const privateKey = await eddsa.generateKey({
          algorithm     : { name: 'EdDSA', curve: 'Ed25519' },
          keyOperations : ['sign']
        });

        if (!('crv' in privateKey)) throw new Error; // TS type guard
        expect(privateKey.crv).to.equal('Ed25519');
      });

      it(`supports 'sign' and/or 'verify' key operations`, async () => {
        await expect(eddsa.generateKey({
          algorithm     : { name: 'EdDSA', curve: 'Ed25519' },
          keyOperations : ['sign']
        })).to.eventually.be.fulfilled;

        await expect(eddsa.generateKey({
          algorithm     : { name: 'EdDSA', curve: 'Ed25519' },
          keyOperations : ['verify']
        })).to.eventually.be.fulfilled;

        await expect(eddsa.generateKey({
          algorithm     : { name: 'EdDSA', curve: 'Ed25519' },
          keyOperations : ['sign', 'verify']
        })).to.eventually.be.fulfilled;
      });

      it('validates algorithm name and curve', async () => {
        // Invalid (algorithm name, curve) results in algorithm name check failing first.
        await expect(eddsa.generateKey({
          algorithm: { name: 'foo', curve: 'bar' }
        })).to.eventually.be.rejectedWith(NotSupportedError, 'Algorithm not supported');

        // Valid (algorithm name) + Invalid (curve) results in curve check failing first.
        await expect(eddsa.generateKey({
          algorithm: { name: 'EdDSA', curve: 'bar' }
        })).to.eventually.be.rejectedWith(TypeError, 'Out of range');
      });

      it(`accepts 'keyOperations' as undefined`, async () => {
        const privateKey = await eddsa.generateKey({
          algorithm: { name: 'EdDSA', curve: 'Ed25519' },
        });

        expect(privateKey).to.exist;
        expect(privateKey.key_ops).to.be.undefined;
        expect(privateKey).to.have.property('kty', 'OKP');
        expect(privateKey).to.have.property('crv', 'Ed25519');
      });

      it(`throws an error if operation fails`, async function() {
        const checkGenerateKeyOptionsStub = sinon.stub(eddsa, 'checkGenerateKeyOptions').returns(undefined);

        try {
          // @ts-expect-error because no generateKey operations are defined.
          await eddsa.generateKey({ algorithm: {} });
          expect.fail('Expected eddsa.generateKey() to throw an error');
        } catch (error) {
          expect(error).to.be.an('error');
          expect((error as Error).message).to.include('Operation failed: generateKey');
        } finally {
          checkGenerateKeyOptionsStub.restore();
        }
      });
    });

    describe('sign()', () => {
      let privateKey: Jwk;
      let data = new Uint8Array([51, 52, 53]);

      beforeEach(async () => {
        privateKey = await eddsa.generateKey({
          algorithm     : { name: 'EdDSA', curve: 'Ed25519' },
          keyOperations : ['sign', 'verify']
        });
      });

      it(`returns a signature for 'Ed25519' keys`, async () => {
        const signature = await eddsa.sign({
          algorithm : { name: 'EdDSA' },
          key       : privateKey,
          data      : data
        });

        expect(signature).to.be.instanceOf(Uint8Array);
        expect(signature.byteLength).to.equal(64);
      });

      it(`throws an error if sign operation fails`, async function() {
        // @ts-ignore because the method is being intentionally stubbed to return undefined.
        const checkSignOptionsStub = sinon.stub(eddsa, 'checkSignOptions').returns(undefined);

        try {
          // @ts-expect-error because no sign operations are defined.
          await eddsa.sign({ algorithm: {}, key: {}, data: undefined });
          expect.fail('Expected eddsa.sign() to throw an error');
        } catch (error) {
          expect(error).to.be.an('error');
          expect((error as Error).message).to.include('Operation failed: sign');
        } finally {
          checkSignOptionsStub.restore();
        }
      });
    });

    describe('verify()', () => {
      let privateKey: Jwk;
      let publicKey: Jwk;
      let signature: Uint8Array;
      let data = new Uint8Array([51, 52, 53]);

      beforeEach(async () => {
        privateKey = await eddsa.generateKey({
          algorithm     : { name: 'EdDSA', curve: 'Ed25519' },
          keyOperations : ['sign']
        });

        publicKey = await Ed25519.computePublicKey({ privateKey });

        signature = await eddsa.sign({
          algorithm : { name: 'EdDSA' },
          key       : privateKey,
          data      : data
        });
      });

      it(`returns a boolean verification result`, async () => {
        const isValid = await eddsa.verify({
          algorithm : { name: 'EdDSA' },
          key       : publicKey,
          signature : signature,
          data      : data
        });

        expect(isValid).to.be.a('boolean');
      });

      it(`validates 'secp256k1' signatures`, async () => {
        const isValid = await eddsa.verify({
          algorithm : { name: 'EdDSA' },
          key       : publicKey,
          signature : signature,
          data      : data
        });

        expect(isValid).to.be.true;
      });

      it(`throws an error if verify operation fails`, async function() {
        // @ts-ignore because the method is being intentionally stubbed to return undefined.
        const checkVerifyOptionsStub = sinon.stub(eddsa, 'checkVerifyOptions').returns(undefined);

        try {
          // @ts-expect-error because no verify operations are defined.
          await eddsa.verify({ algorithm: {}, key: {}, data: undefined, signature: undefined });
          expect.fail('Expected eddsa.verify() to throw an error');
        } catch (error) {
          expect(error).to.be.an('error');
          expect((error as Error).message).to.include('Operation failed: verify');
        } finally {
          checkVerifyOptionsStub.restore();
        }
      });
    });
  });

  describe('Pbkdf2Algorithm', () => {
    let pbkdf2: Pbkdf2Algorithm;

    before(() => {
      pbkdf2 = Pbkdf2Algorithm.create();
    });

    describe('deriveBits()', () => {
      let inputKey: Jwk;

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