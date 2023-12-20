import chai, { expect } from 'chai';
import { Convert } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';

import type { Jwk, JwkParamsEcPrivate } from '../../src/jose/jwk.js';

import secp256k1GetCurvePoints from '../fixtures/test-vectors/secp256k1/get-curve-points.json' assert { type: 'json' };
import secp256k1BytesToPublicKey from '../fixtures/test-vectors/secp256k1/bytes-to-public-key.json' assert { type: 'json' };
import secp256k1PublicKeyToBytes from '../fixtures/test-vectors/secp256k1/public-key-to-bytes.json' assert { type: 'json' };
import secp256k1ValidatePublicKey from '../fixtures/test-vectors/secp256k1/validate-public-key.json' assert { type: 'json' };
import secp256k1BytesToPrivateKey from '../fixtures/test-vectors/secp256k1/bytes-to-private-key.json' assert { type: 'json' };
import secp256k1PrivateKeyToBytes from '../fixtures/test-vectors/secp256k1/private-key-to-bytes.json' assert { type: 'json' };
import secp256k1ValidatePrivateKey from '../fixtures/test-vectors/secp256k1/validate-private-key.json' assert { type: 'json' };

import { Secp256k1 } from '../../src/primitives/secp256k1.js';

chai.use(chaiAsPromised);

// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;

describe('Secp256k1', () => {
  let privateKey: Jwk;
  let publicKey: Jwk;

  before(async () => {
    privateKey = await Secp256k1.generateKey();
    publicKey = await Secp256k1.computePublicKey({ key: privateKey });
  });

  describe('bytesToPrivateKey()', () => {
    it('returns a private key in JWK format', async () => {
      const privateKeyBytes = Convert.hex('740ec69810de9ad1b8f298f1d2c0e6a52dd1e958dc2afc85764bec169c222e88').toUint8Array();
      const privateKey = await Secp256k1.bytesToPrivateKey({ privateKeyBytes });

      expect(privateKey).to.have.property('crv', 'secp256k1');
      expect(privateKey).to.have.property('d');
      expect(privateKey).to.have.property('kid');
      expect(privateKey).to.have.property('kty', 'EC');
      expect(privateKey).to.have.property('x');
      expect(privateKey).to.have.property('y');
    });

    for (const vector of secp256k1BytesToPrivateKey.vectors) {
      it(vector.description, async () => {
        const privateKey = await Secp256k1.bytesToPrivateKey({
          privateKeyBytes: Convert.hex(vector.input.privateKeyBytes).toUint8Array()
        });

        expect(privateKey).to.deep.equal(vector.output);
      });
    }
  });

  describe('bytesToPublicKey()', () => {
    it('returns a public key in JWK format', async () => {
      const publicKeyBytes = Convert.hex('043752951274023296c8a74b0ffe42f82ff4b4d4bba4326477422703f761f59258c26a7465b9a77ac0c3f1cedb139c428b0b1fbb5516867b527636f3286f705553').toUint8Array();
      const publicKey = await Secp256k1.bytesToPublicKey({ publicKeyBytes });

      expect(publicKey).to.have.property('crv', 'secp256k1');
      expect(publicKey).to.have.property('kid');
      expect(publicKey).to.have.property('kty', 'EC');
      expect(publicKey).to.have.property('x');
      expect(publicKey).to.have.property('y');
      expect(publicKey).to.not.have.property('d');
    });

    for (const vector of secp256k1BytesToPublicKey.vectors) {
      it(vector.description, async () => {
        const publicKey = await Secp256k1.bytesToPublicKey({
          publicKeyBytes: Convert.hex(vector.input.publicKeyBytes).toUint8Array()
        });
        expect(publicKey).to.deep.equal(vector.output);
      });
    }
  });

  describe('computePublicKey()', () => {
    it('returns a public key in JWK format', async () => {
      publicKey = await Secp256k1.computePublicKey({ key: privateKey });

      expect(publicKey).to.have.property('crv', 'secp256k1');
      expect(publicKey).to.not.have.property('d');
      expect(publicKey).to.have.property('kid');
      expect(publicKey).to.have.property('kty', 'EC');
      expect(publicKey).to.have.property('x');
      expect(publicKey).to.have.property('y');
    });
  });

  describe('compressPublicKey()', () => {
    it('converts an uncompressed public key to compressed format', async () => {
      const compressedPublicKeyBytes = Convert.hex('026bcdccc644b309921d3b0c266183a20786650c1634d34e8dfa1ed74cd66ce214').toUint8Array();
      const uncompressedPublicKeyBytes = Convert.hex('046bcdccc644b309921d3b0c266183a20786650c1634d34e8dfa1ed74cd66ce21465062296011dd076ae4e8ce5163ccf69d01496d3147656dcc96645b95211f3c6').toUint8Array();

      const output = await Secp256k1.compressPublicKey({
        publicKeyBytes: uncompressedPublicKeyBytes
      });

      // Confirm the length of the resulting public key is 33 bytes
      expect(output.byteLength).to.equal(33);

      // Confirm the output matches the expected compressed public key.
      expect(output).to.deep.equal(compressedPublicKeyBytes);
    });

    it('throws an error for an invalid uncompressed public key', async () => {
      // Invalid uncompressed public key.
      const invalidPublicKey = Convert.hex('dfebc16793a5737ac51f606a43524df8373c063e41d5a99b2f1530afd987284bd1c7cde1658a9a756e71f44a97b4783ea9dee5ccb7f1447eb4836d8de9bd4f81fd').toUint8Array();

      try {
        await Secp256k1.compressPublicKey({
          publicKeyBytes: invalidPublicKey,
        });
        expect.fail('Expected method to throw an error.');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('Point of length 65 was invalid');
      }
    });
  });

  describe('decompressPublicKey()', () => {
    it('converts a compressed public key to an uncompressed format', async () => {
      const compressedPublicKeyBytes = Convert.hex('026bcdccc644b309921d3b0c266183a20786650c1634d34e8dfa1ed74cd66ce214').toUint8Array();
      const uncompressedPublicKeyBytes = Convert.hex('046bcdccc644b309921d3b0c266183a20786650c1634d34e8dfa1ed74cd66ce21465062296011dd076ae4e8ce5163ccf69d01496d3147656dcc96645b95211f3c6').toUint8Array();

      const output = await Secp256k1.decompressPublicKey({
        publicKeyBytes: compressedPublicKeyBytes
      });

      // Confirm the length of the resulting public key is 65 bytes
      expect(output.byteLength).to.equal(65);

      // Confirm the output matches the expected uncompressed public key.
      expect(output).to.deep.equal(uncompressedPublicKeyBytes);
    });

    it('throws an error for an invalid compressed public key', async () => {
      // Invalid compressed public key.
      const invalidPublicKey = Convert.hex('fef0b998921eafb58f49efdeb0adc47123aa28a4042924236f08274d50c72fe7b0').toUint8Array();

      try {
        await Secp256k1.decompressPublicKey({
          publicKeyBytes: invalidPublicKey,
        });
        expect.fail('Expected method to throw an error.');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('Point of length 33 was invalid');
      }
    });
  });

  describe('generateKey()', () => {
    it('returns a private key in JWK format', async () => {
      const privateKey = await Secp256k1.generateKey();

      expect(privateKey).to.have.property('crv', 'secp256k1');
      expect(privateKey).to.have.property('d');
      expect(privateKey).to.have.property('kid');
      expect(privateKey).to.have.property('kty', 'EC');
      expect(privateKey).to.have.property('x');
      expect(privateKey).to.have.property('y');
    });

    it('returns a 32-byte private key', async () => {
      const privateKey = await Secp256k1.generateKey() as JwkParamsEcPrivate;

      const privateKeyBytes = Convert.base64Url(privateKey.d).toUint8Array();
      expect(privateKeyBytes.byteLength).to.equal(32);
    });
  });

  describe('getCurvePoints()', () => {
    for (const vector of secp256k1GetCurvePoints.vectors) {
      it(vector.description, async () => {
        const key = Convert.hex(vector.input.key).toUint8Array();
        // @ts-expect-error because getCurvePoints() is a private method.
        const points = await Secp256k1.getCurvePoints({ key });
        expect(points.x).to.deep.equal(Convert.hex(vector.output.x).toUint8Array());
        expect(points.y).to.deep.equal(Convert.hex(vector.output.y).toUint8Array());
      });
    }

    it('throws error with invalid input key length', async () => {
      await expect(
        // @ts-expect-error because getCurvePoints() is a private method.
        Secp256k1.getCurvePoints({ key: new Uint8Array(16) })
      ).to.eventually.be.rejectedWith(Error, 'Point of length 16 was invalid. Expected 33 compressed bytes or 65 uncompressed bytes');
    });
  });

  describe('privateKeyToBytes()', () => {
    it('returns a private key as a byte array', async () => {
      const privateKey: Jwk = {
        kty : 'EC',
        crv : 'secp256k1',
        d   : 'dA7GmBDemtG48pjx0sDmpS3R6VjcKvyFdkvsFpwiLog',
        x   : 'N1KVEnQCMpbIp0sP_kL4L_S01LukMmR3QicD92H1klg',
        y   : 'wmp0ZbmnesDD8c7bE5xCiwsfu1UWhntSdjbzKG9wVVM',
        kid : 'iwwOeCqgvREo5xGeBS-obWW9ZGjv0o1M65gUYN6SYh4'
      };
      const privateKeyBytes = await Secp256k1.privateKeyToBytes({ privateKey });

      expect(privateKeyBytes).to.be.an.instanceOf(Uint8Array);
      const expectedOutput = Convert.hex('740ec69810de9ad1b8f298f1d2c0e6a52dd1e958dc2afc85764bec169c222e88').toUint8Array();
      expect(privateKeyBytes).to.deep.equal(expectedOutput);
    });

    it('throws an error when provided a secp256k1 public key', async () => {
      const publicKey: Jwk = {
        kty : 'EC',
        crv : 'secp256k1',
        x   : 'N1KVEnQCMpbIp0sP_kL4L_S01LukMmR3QicD92H1klg',
        y   : 'wmp0ZbmnesDD8c7bE5xCiwsfu1UWhntSdjbzKG9wVVM'
      };

      await expect(
        Secp256k1.privateKeyToBytes({ privateKey: publicKey })
      ).to.eventually.be.rejectedWith(Error, 'provided key is not a valid EC private key');
    });

    for (const vector of secp256k1PrivateKeyToBytes.vectors) {
      it(vector.description, async () => {
        const privateKeyBytes = await Secp256k1.privateKeyToBytes({
          privateKey: vector.input.privateKey as Jwk
        });
        expect(privateKeyBytes).to.deep.equal(Convert.hex(vector.output).toUint8Array());
      });
    }
  });

  describe('publicKeyToBytes()', () => {
    it('returns a public key in JWK format', async () => {
      const publicKey: Jwk = {
        kty : 'EC',
        crv : 'secp256k1',
        x   : 'N1KVEnQCMpbIp0sP_kL4L_S01LukMmR3QicD92H1klg',
        y   : 'wmp0ZbmnesDD8c7bE5xCiwsfu1UWhntSdjbzKG9wVVM',
        kid : 'iwwOeCqgvREo5xGeBS-obWW9ZGjv0o1M65gUYN6SYh4'
      };

      const publicKeyBytes = await Secp256k1.publicKeyToBytes({ publicKey });

      expect(publicKeyBytes).to.be.an.instanceOf(Uint8Array);
      const expectedOutput = Convert.hex('043752951274023296c8a74b0ffe42f82ff4b4d4bba4326477422703f761f59258c26a7465b9a77ac0c3f1cedb139c428b0b1fbb5516867b527636f3286f705553').toUint8Array();
      expect(publicKeyBytes).to.deep.equal(expectedOutput);
    });

    it('throws an error when provided an Ed25519 private key', async () => {
      const privateKey: Jwk = {
        kty : 'EC',
        crv : 'secp256k1',
        d   : 'dA7GmBDemtG48pjx0sDmpS3R6VjcKvyFdkvsFpwiLog',
        x   : 'N1KVEnQCMpbIp0sP_kL4L_S01LukMmR3QicD92H1klg',
        y   : 'wmp0ZbmnesDD8c7bE5xCiwsfu1UWhntSdjbzKG9wVVM',
        kid : 'iwwOeCqgvREo5xGeBS-obWW9ZGjv0o1M65gUYN6SYh4'
      };

      await expect(
        Secp256k1.publicKeyToBytes({ publicKey: privateKey })
      ).to.eventually.be.rejectedWith(Error, 'provided key is not a valid EC public key');
    });

    for (const vector of secp256k1PublicKeyToBytes.vectors) {
      it(vector.description, async () => {
        const publicKeyBytes = await Secp256k1.publicKeyToBytes({
          publicKey: vector.input.publicKey as Jwk
        });
        expect(publicKeyBytes).to.deep.equal(Convert.hex(vector.output).toUint8Array());
      });
    }
  });

  describe('sharedSecret()', () => {
    let ownPrivateKey: Jwk;
    let ownPublicKey: Jwk;
    let otherPartyPrivateKey: Jwk;
    let otherPartyPublicKey: Jwk;

    beforeEach(async () => {
      ownPrivateKey = privateKey;
      ownPublicKey = publicKey;

      otherPartyPrivateKey = await Secp256k1.generateKey();
      otherPartyPublicKey = await Secp256k1.computePublicKey({ key: otherPartyPrivateKey });
    });

    it('generates a 32-byte shared secret', async () => {
      const sharedSecret = await Secp256k1.sharedSecret({
        privateKeyA : ownPrivateKey,
        publicKeyB  : otherPartyPublicKey
      });
      expect(sharedSecret).to.be.instanceOf(Uint8Array);
      expect(sharedSecret.byteLength).to.equal(32);
    });

    it('is commutative', async () => {
      const sharedSecretOwnOther = await Secp256k1.sharedSecret({
        privateKeyA : ownPrivateKey,
        publicKeyB  : otherPartyPublicKey
      });

      const sharedSecretOtherOwn = await Secp256k1.sharedSecret({
        privateKeyA : otherPartyPrivateKey,
        publicKeyB  : ownPublicKey
      });

      expect(sharedSecretOwnOther).to.deep.equal(sharedSecretOtherOwn);
    });

    it('throws an error if the public/private keys from the same key pair are specified', async () => {
      await expect(
        Secp256k1.sharedSecret({
          privateKeyA : ownPrivateKey,
          publicKeyB  : ownPublicKey
        })
      ).to.eventually.be.rejectedWith(Error, 'shared secret cannot be computed from a single key pair');
    });
  });

  describe('sign()', () => {
    it('returns a 64-byte signature of type Uint8Array', async () => {
      const data = new Uint8Array([51, 52, 53]);
      const signature = await Secp256k1.sign({ key: privateKey, data });
      expect(signature).to.be.instanceOf(Uint8Array);
      expect(signature.byteLength).to.equal(64);
    });

    it('accepts input data as Uint8Array', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const key = privateKey;
      let signature: Uint8Array;

      signature = await Secp256k1.sign({ key, data });
      expect(signature).to.be.instanceOf(Uint8Array);
    });
  });

  describe('validatePrivateKey()', () => {
    for (const vector of secp256k1ValidatePrivateKey.vectors) {
      it(vector.description, async () => {
        const key = Convert.hex(vector.input.key).toUint8Array();
        // @ts-expect-error because validatePrivateKey() is a private method.
        const isValid = await Secp256k1.validatePrivateKey({ key });
        expect(isValid).to.equal(vector.output);
      });
    }
  });

  describe('validatePublicKey()', () => {
    for (const vector of secp256k1ValidatePublicKey.vectors) {
      it(vector.description, async () => {
        const key = Convert.hex(vector.input.key).toUint8Array();
        // @ts-expect-error because validatePublicKey() is a private method.
        const isValid = await Secp256k1.validatePublicKey({ key });
        expect(isValid).to.equal(vector.output);
      });
    }
  });

  describe('verify()', () => {
    it('returns a boolean result', async () => {
      const data = new Uint8Array([51, 52, 53]);
      const signature = await Secp256k1.sign({ key: privateKey, data });

      const isValid = await Secp256k1.verify({ key: publicKey, signature, data });
      expect(isValid).to.exist;
      expect(isValid).to.be.true;
    });

    it('accepts input data as Uint8Array', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      let isValid: boolean;
      let signature: Uint8Array;

      // TypedArray - Uint8Array
      signature = await Secp256k1.sign({ key: privateKey, data });
      isValid = await Secp256k1.verify({ key: publicKey, signature, data });
      expect(isValid).to.be.true;
    });

    it('returns false if the signed data was mutated', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      let isValid: boolean;

      // Generate signature using the private key.
      const signature = await Secp256k1.sign({ key: privateKey, data });

      // Verification should return true with the data used to generate the signature.
      isValid = await Secp256k1.verify({ key: publicKey, signature, data });
      expect(isValid).to.be.true;

      // Make a copy and flip the least significant bit (the rightmost bit) in the first byte of the array.
      const mutatedData = new Uint8Array(data);
      mutatedData[0] ^= 1 << 0;

      // Verification should return false if the given data does not match the data used to generate the signature.
      isValid = await Secp256k1.verify({ key: publicKey, signature, data: mutatedData });
      expect(isValid).to.be.false;
    });

    it('returns false if the signature was mutated', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      let isValid: boolean;

      // Generate signature using the private key.
      const signature = await Secp256k1.sign({ key: privateKey, data });

      // Verification should return true with the data used to generate the signature.
      isValid = await Secp256k1.verify({ key: publicKey, signature, data });
      expect(isValid).to.be.true;

      // Make a copy and flip the least significant bit (the rightmost bit) in the first byte of the array.
      const mutatedSignature = new Uint8Array(signature);
      mutatedSignature[0] ^= 1 << 0;

      // Verification should return false if the signature was modified.
      isValid = await Secp256k1.verify({ key: publicKey, signature: signature, data: mutatedSignature });
      expect(isValid).to.be.false;
    });

    it('returns false with a signature generated using a different private key', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const publicKeyA = publicKey;
      const privateKeyB = await Secp256k1.generateKey();
      let isValid: boolean;

      // Generate a signature using private key B.
      const signatureB = await Secp256k1.sign({ key: privateKeyB, data });

      // Verification should return false with public key A.
      isValid = await Secp256k1.verify({ key: publicKeyA, signature: signatureB, data });
      expect(isValid).to.be.false;
    });
  });
});