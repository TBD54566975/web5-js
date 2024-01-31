import chai, { expect } from 'chai';
import { Convert } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';

import type { Jwk, JwkParamsEcPrivate } from '../../src/jose/jwk.js';

import secp256r1GetCurvePoints from '../fixtures/test-vectors/secp256r1/get-curve-points.json' assert { type: 'json' };
import secp256r1BytesToPublicKey from '../fixtures/test-vectors/secp256r1/bytes-to-public-key.json' assert { type: 'json' };
import secp256r1PublicKeyToBytes from '../fixtures/test-vectors/secp256r1/public-key-to-bytes.json' assert { type: 'json' };
import secp256r1ValidatePublicKey from '../fixtures/test-vectors/secp256r1/validate-public-key.json' assert { type: 'json' };
import secp256r1BytesToPrivateKey from '../fixtures/test-vectors/secp256r1/bytes-to-private-key.json' assert { type: 'json' };
import secp256r1PrivateKeyToBytes from '../fixtures/test-vectors/secp256r1/private-key-to-bytes.json' assert { type: 'json' };
import secp256r1ValidatePrivateKey from '../fixtures/test-vectors/secp256r1/validate-private-key.json' assert { type: 'json' };

import { Secp256r1 } from '../../src/primitives/secp256r1.js';

chai.use(chaiAsPromised);

describe('Secp256r1', () => {
  let privateKey: Jwk;
  let publicKey: Jwk;

  before(async () => {
    privateKey = await Secp256r1.generateKey();
    publicKey = await Secp256r1.computePublicKey({ key: privateKey });
  });

  describe('adjustSignatureToLowS()', () => {
    it('returns a 64-byte signature of type Uint8Array', async () => {
      const data = new Uint8Array([51, 52, 53]);
      const signature = await Secp256r1.sign({ key: privateKey, data });

      const adjustedSignature = await Secp256r1.adjustSignatureToLowS({ signature });

      expect(adjustedSignature).to.be.instanceOf(Uint8Array);
      expect(adjustedSignature.byteLength).to.equal(64);
    });

    it('returns the low-S form given a high-S signature', async () => {
      // Source: https://github.com/paulmillr/noble-curves/blob/37eab5a28a43c35b87e9e95a12ae6086393ac38b/test/wycheproof/ecdsa_secp256r1_sha256_test.json#L209-L218
      const signatureHighS = Convert.hex('2ba3a8be6b94d5ec80a6d9d1190a436effe50d85a1eee859b8cc6af9bd5c2e18b329f479a2bbd0a5c384ee1493b1f5186a87139cac5df4087c134b49156847db').toUint8Array();

      const adjustedSignature = await Secp256r1.adjustSignatureToLowS({ signature: signatureHighS });

      expect(adjustedSignature).to.not.deep.equal(signatureHighS);
    });

    it('returns the signature unmodified if already in low-S form', async () => {
      // Source: https://github.com/paulmillr/noble-curves/blob/37eab5a28a43c35b87e9e95a12ae6086393ac38b/test/wycheproof/ecdsa_secp256r1_sha256_test.json#L189-L198
      const signatureLowS = Convert.hex('2ba3a8be6b94d5ec80a6d9d1190a436effe50d85a1eee859b8cc6af9bd5c2e184cd60b855d442f5b3c7b11eb6c4e0ae7525fe710fab9aa7c77a67f79e6fadd76').toUint8Array();

      const adjustedSignature = await Secp256r1.adjustSignatureToLowS({ signature: signatureLowS });

      expect(adjustedSignature).to.deep.equal(signatureLowS);
    });

    it('returns signatures that can be verified regardless of low- or high-S form', async () => {
      // Source: https://github.com/paulmillr/noble-curves/blob/37eab5a28a43c35b87e9e95a12ae6086393ac38b/test/wycheproof/ecdsa_secp256r1_sha256_test.json#L176-L198
      const publicKeyBytes = Convert.hex('042927b10512bae3eddcfe467828128bad2903269919f7086069c8c4df6c732838c7787964eaac00e5921fb1498a60f4606766b3d9685001558d1a974e7341513e').toUint8Array();
      const publicKey = await Secp256r1.bytesToPublicKey({ publicKeyBytes });
      const data = Convert.hex('313233343030').toUint8Array();
      const signatureLowS = Convert.hex('2ba3a8be6b94d5ec80a6d9d1190a436effe50d85a1eee859b8cc6af9bd5c2e184cd60b855d442f5b3c7b11eb6c4e0ae7525fe710fab9aa7c77a67f79e6fadd76').toUint8Array();
      const signatureHighS = Convert.hex('2ba3a8be6b94d5ec80a6d9d1190a436effe50d85a1eee859b8cc6af9bd5c2e18b329f479a2bbd0a5c384ee1493b1f5186a87139cac5df4087c134b49156847db').toUint8Array();

      // Verify that the returned signature is valid when input in low-S form.
      let adjustedSignature = await Secp256r1.adjustSignatureToLowS({ signature: signatureLowS });
      let isValid = await Secp256r1.verify({ key: publicKey, signature: adjustedSignature, data });
      expect(isValid).to.be.true;

      // Verify that the returned signature is valid when input in high-S form.
      adjustedSignature = await Secp256r1.adjustSignatureToLowS({ signature: signatureHighS });
      isValid = await Secp256r1.verify({ key: publicKey, signature: adjustedSignature, data });
      expect(isValid).to.be.true;
    });
  });

  describe('bytesToPrivateKey()', () => {
    it('returns a private key in JWK format', async () => {
      const privateKeyBytes = Convert.hex('08169cf81812f2e288a1131de246ebdf29b020c7625a98d098296a30a876d35a').toUint8Array();
      const privateKey = await Secp256r1.bytesToPrivateKey({ privateKeyBytes });

      expect(privateKey).to.have.property('crv', 'P-256');
      expect(privateKey).to.have.property('d');
      expect(privateKey).to.have.property('kid');
      expect(privateKey).to.have.property('kty', 'EC');
      expect(privateKey).to.have.property('x');
      expect(privateKey).to.have.property('y');
    });

    for (const vector of secp256r1BytesToPrivateKey.vectors) {
      it(vector.description, async () => {
        const privateKey = await Secp256r1.bytesToPrivateKey({
          privateKeyBytes: Convert.hex(vector.input.privateKeyBytes).toUint8Array()
        });

        expect(privateKey).to.deep.equal(vector.output);
      });
    }
  });

  describe('bytesToPublicKey()', () => {
    it('returns a public key in JWK format', async () => {
      const publicKeyBytes = Convert.hex('048b542fa180e78bc981e6671374a64413e0323b439d06870dc49cb56e97775d96a0e469310d10a8ff2cb253a08d46fd845ae330e3ac4e41d0d0a85fbeb8e15795').toUint8Array();
      const publicKey = await Secp256r1.bytesToPublicKey({ publicKeyBytes });

      expect(publicKey).to.have.property('crv', 'P-256');
      expect(publicKey).to.have.property('kid');
      expect(publicKey).to.have.property('kty', 'EC');
      expect(publicKey).to.have.property('x');
      expect(publicKey).to.have.property('y');
      expect(publicKey).to.not.have.property('d');
    });

    for (const vector of secp256r1BytesToPublicKey.vectors) {
      it(vector.description, async () => {
        const publicKey = await Secp256r1.bytesToPublicKey({
          publicKeyBytes: Convert.hex(vector.input.publicKeyBytes).toUint8Array()
        });
        expect(publicKey).to.deep.equal(vector.output);
      });
    }
  });

  describe('compressPublicKey()', () => {
    it('converts an uncompressed public key to compressed format', async () => {
      const compressedPublicKeyBytes = Convert.hex('02d7251f4572325f4b1a9642600427adfe11ea3bd4dfe1cd7f4932612129e18784').toUint8Array();
      const uncompressedPublicKeyBytes = Convert.hex('04d7251f4572325f4b1a9642600427adfe11ea3bd4dfe1cd7f4932612129e187844247b3c6302e7ecd611dbb666380e1117b198f37a9d183de422947f6b6183098').toUint8Array();

      const output = await Secp256r1.compressPublicKey({
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
        await Secp256r1.compressPublicKey({
          publicKeyBytes: invalidPublicKey,
        });
        expect.fail('Expected method to throw an error.');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('Point of length 65 was invalid');
      }
    });
  });

  describe('computePublicKey()', () => {
    it('returns a public key in JWK format', async () => {
      publicKey = await Secp256r1.computePublicKey({ key: privateKey });

      expect(publicKey).to.have.property('crv', 'P-256');
      expect(publicKey).to.not.have.property('d');
      expect(publicKey).to.have.property('kid');
      expect(publicKey).to.have.property('kty', 'EC');
      expect(publicKey).to.have.property('x');
      expect(publicKey).to.have.property('y');
    });

    it('computes and adds a kid property, if missing', async () => {
      const { kid, ...privateKeyWithoutKid } = privateKey;
      const publicKey = await Secp256r1.computePublicKey({ key: privateKeyWithoutKid });

      expect(publicKey).to.have.property('kid', kid);
    });
  });

  describe('convertDerToCompactSignature()', () => {
    it('returns compact R+S format signature as a Uint8Array', async () => {
      const derSignature = Convert.hex('3045022100b292a619339f6e567a305c951c0dcbcc42d16e47f219f9e98e76e09d8770b34a02200177e60492c5a8242f76f07bfe3661bde59ec2a17ce5bd2dab2abebdf89a62e2').toUint8Array();

      const compactSignature = await Secp256r1.convertDerToCompactSignature({ derSignature });

      expect(compactSignature).to.be.instanceOf(Uint8Array);
      expect(compactSignature.byteLength).to.equal(64);
    });

    it('converted ASN.1 DER encoded ECDSA signature matches the expected compact R+S signature', async () => {
      const derSignature = Convert.hex('3045022100b292a619339f6e567a305c951c0dcbcc42d16e47f219f9e98e76e09d8770b34a02200177e60492c5a8242f76f07bfe3661bde59ec2a17ce5bd2dab2abebdf89a62e2').toUint8Array();
      const expectedCompactSignature = Convert.hex('b292a619339f6e567a305c951c0dcbcc42d16e47f219f9e98e76e09d8770b34a0177e60492c5a8242f76f07bfe3661bde59ec2a17ce5bd2dab2abebdf89a62e2').toUint8Array();

      const compactSignature = await Secp256r1.convertDerToCompactSignature({ derSignature });

      expect(compactSignature).to.deep.equal(expectedCompactSignature);
    });

    it('passes Wycheproof test vector', async () => {
      // Source: https://github.com/paulmillr/noble-curves/blob/37eab5a28a43c35b87e9e95a12ae6086393ac38b/test/wycheproof/ecdsa_secp256r1_sha256_test.json#L189-L198
      const publicKeyBytes = Convert.hex('042927b10512bae3eddcfe467828128bad2903269919f7086069c8c4df6c732838c7787964eaac00e5921fb1498a60f4606766b3d9685001558d1a974e7341513e').toUint8Array();
      const publicKey = await Secp256r1.bytesToPublicKey({ publicKeyBytes });
      const message = Convert.hex('313233343030').toUint8Array();
      const derSignature = Convert.hex('304402202ba3a8be6b94d5ec80a6d9d1190a436effe50d85a1eee859b8cc6af9bd5c2e1802204cd60b855d442f5b3c7b11eb6c4e0ae7525fe710fab9aa7c77a67f79e6fadd76').toUint8Array();

      const compactSignature = await Secp256r1.convertDerToCompactSignature({ derSignature });

      const isValid = await Secp256r1.verify({
        key       : publicKey,
        signature : compactSignature,
        data      : message
      });

      expect(isValid).to.be.true;
    });

    it('throws an error for an invalid ASN.1 DER encoded ECDSA signature due to incorrect length', async () => {
      // Invalid ASN.1 DER encoded ECDSA signature.
      // Source: https://github.com/paulmillr/noble-curves/blob/37eab5a28a43c35b87e9e95a12ae6086393ac38b/test/wycheproof/ecdsa_secp256r1_sha256_test.json#L239-L248
      const invalidDerSignature = Convert.hex('304602202ba3a8be6b94d5ec80a6d9d1190a436effe50d85a1eee859b8cc6af9bd5c2e18022100b329f479a2bbd0a5c384ee1493b1f5186a87139cac5df4087c134b49156847db').toUint8Array();

      try {
        await Secp256r1.convertDerToCompactSignature({ derSignature: invalidDerSignature });
        expect.fail('Expected method to throw an error.');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('Invalid signature: incorrect length');
      }
    });

    it('throws an error for an invalid ASN.1 DER encoded ECDSA signature due to appending zeros to sequence', async () => {
      // Invalid ASN.1 DER encoded ECDSA signature.
      // Source: https://github.com/paulmillr/noble-curves/blob/37eab5a28a43c35b87e9e95a12ae6086393ac38b/test/wycheproof/ecdsa_secp256r1_sha256_test.json#L369-L378
      const invalidDerSignature = Convert.hex('304702202ba3a8be6b94d5ec80a6d9d1190a436effe50d85a1eee859b8cc6af9bd5c2e18022100b329f479a2bbd0a5c384ee1493b1f5186a87139cac5df4087c134b49156847db0000').toUint8Array();

      try {
        await Secp256r1.convertDerToCompactSignature({ derSignature: invalidDerSignature });
        expect.fail('Expected method to throw an error.');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('Invalid signature: left bytes after parsing');
      }
    });
  });

  describe('decompressPublicKey()', () => {
    it('converts a compressed public key to an uncompressed format', async () => {
      const compressedPublicKeyBytes = Convert.hex('02d7251f4572325f4b1a9642600427adfe11ea3bd4dfe1cd7f4932612129e18784').toUint8Array();
      const uncompressedPublicKeyBytes = Convert.hex('04d7251f4572325f4b1a9642600427adfe11ea3bd4dfe1cd7f4932612129e187844247b3c6302e7ecd611dbb666380e1117b198f37a9d183de422947f6b6183098').toUint8Array();

      const output = await Secp256r1.decompressPublicKey({
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
        await Secp256r1.decompressPublicKey({
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
      const privateKey = await Secp256r1.generateKey();

      expect(privateKey).to.have.property('crv', 'P-256');
      expect(privateKey).to.have.property('d');
      expect(privateKey).to.have.property('kid');
      expect(privateKey).to.have.property('kty', 'EC');
      expect(privateKey).to.have.property('x');
      expect(privateKey).to.have.property('y');
    });

    it('returns a 32-byte private key', async () => {
      const privateKey = await Secp256r1.generateKey() as JwkParamsEcPrivate;

      const privateKeyBytes = Convert.base64Url(privateKey.d).toUint8Array();
      expect(privateKeyBytes.byteLength).to.equal(32);
    });
  });

  describe('getCurvePoint()', () => {
    for (const vector of secp256r1GetCurvePoints.vectors) {
      it(vector.description, async () => {
        const keyBytes = Convert.hex(vector.input.keyBytes).toUint8Array();
        // @ts-expect-error because getCurvePoint() is a private method.
        const points = await Secp256r1.getCurvePoint({ keyBytes });
        expect(points.x).to.deep.equal(Convert.hex(vector.output.x).toUint8Array());
        expect(points.y).to.deep.equal(Convert.hex(vector.output.y).toUint8Array());
      });
    }

    it('throws error with invalid input key length', async () => {
      await expect(
        // @ts-expect-error because getCurvePoint() is a private method.
        Secp256r1.getCurvePoint({ keyBytes: new Uint8Array(16) })
      ).to.eventually.be.rejectedWith(Error, 'Point of length 16 was invalid. Expected 33 compressed bytes or 65 uncompressed bytes');
    });
  });

  describe('getPublicKey()', () => {
    it('returns a public key in JWK format', async () => {
      const publicKey = await Secp256r1.getPublicKey({ key: privateKey });

      expect(publicKey).to.have.property('kty', 'EC');
      expect(publicKey).to.have.property('crv', 'P-256');
      expect(publicKey).to.have.property('kid');
      expect(publicKey).to.have.property('x');
      expect(publicKey).to.have.property('y');
      expect(publicKey).to.not.have.property('d');
    });

    it('computes and adds a kid property, if missing', async () => {
      const { kid, ...privateKeyWithoutKid } = privateKey;
      const publicKey = await Secp256r1.getPublicKey({ key: privateKeyWithoutKid });

      expect(publicKey).to.have.property('kid', kid);
    });

    it('returns the same output as computePublicKey()', async () => {
      const publicKey = await Secp256r1.getPublicKey({ key: privateKey });
      expect(publicKey).to.deep.equal(await Secp256r1.computePublicKey({ key: privateKey }));
    });

    it('throws an error when provided a secp256r1 public key', async () => {
      const secp256r1PublicKey: Jwk = {
        kty : 'EC',
        crv : 'P-256',
        x   : 'FRHEAeCMFUIWsDR4POZZ_MEaSePdq5UhcvKTHXOmAHQ',
        y   : 'XWaWp9dkMUqQ5ourD1421YJLHQmu4bhbr2QSMnTR35o'
      };

      await expect(
        Secp256r1.getPublicKey({ key: secp256r1PublicKey })
      ).to.eventually.be.rejectedWith(Error, `key is not a 'P-256' private JWK`);
    });

    it('throws an error when provided an Ed25519 private key', async () => {
      const ed25519PrivateKey: Jwk = {
        crv : 'Ed25519',
        d   : 'TM0Imyj_ltqdtsNG7BFOD1uKMZ81q6Yk2oz27U-4pvs',
        kty : 'OKP',
        x   : 'PUAXw-hDiVqStwqnTRt-vJyYLM8uxJaMwM1V8Sr0Zgw',
        kid : 'FtIu-VbGrfe_KB6CH7GNwODB72MNxj_ml11dEvO-7kk'
      };

      await expect(
        Secp256r1.getPublicKey({ key: ed25519PrivateKey })
      ).to.eventually.be.rejectedWith(Error, `key is not a 'P-256' private JWK`);
    });

    it('throws an error when provided a secp256k1 private key', async () => {
      const secp256k1PrivateKey: Jwk = {
        kty : 'EC',
        crv : 'secp256k1',
        x   : 'oCdX60O5sBTvHjSHqp5Z2Ik-iKROm2TSNi9Z7SFNpRQ',
        y   : '31b9rwHHVyynXw632oTVW7f2xcczjxf6BRAF7UuzYsE',
        d   : 'ycNY9W7EY-0VmVMWPAgUMiXO0O7_OhzPjZKXzVi0xKY'
      };
      await expect(
        Secp256r1.getPublicKey({ key: secp256k1PrivateKey })
      ).to.eventually.be.rejectedWith(Error, `key is not a 'P-256' private JWK`);
    });

    it('throws an error when provided an Ed25519 private key', async () => {
      const ed25519PrivateKey: Jwk = {
        crv : 'Ed25519',
        d   : 'TM0Imyj_ltqdtsNG7BFOD1uKMZ81q6Yk2oz27U-4pvs',
        kty : 'OKP',
        x   : 'PUAXw-hDiVqStwqnTRt-vJyYLM8uxJaMwM1V8Sr0Zgw',
        kid : 'FtIu-VbGrfe_KB6CH7GNwODB72MNxj_ml11dEvO-7kk'
      };

      await expect(
        Secp256r1.getPublicKey({ key: ed25519PrivateKey })
      ).to.eventually.be.rejectedWith(Error, `key is not a 'P-256' private JWK`);
    });
  });

  describe('privateKeyToBytes()', () => {
    it('returns a private key as a byte array', async () => {
      const privateKey: Jwk = {
        kty : 'EC',
        crv : 'P-256',
        d   : 'xqQrTkJTX2GGbCW9V7Sp8ILlqzNlnbVF2BM4OkDqY3o',
        x   : 'uageVRxl4FPxSGXr5dXS4MfwiP56Ue-0qZmpM-VybJM',
        y   : 'cVm_UIPl7deVqHL-jXG5Ar1ZpHEVqwOyk-ugOg2W6ns'
      };
      const privateKeyBytes = await Secp256r1.privateKeyToBytes({ privateKey });

      expect(privateKeyBytes).to.be.an.instanceOf(Uint8Array);
      const expectedOutput = Convert.hex('c6a42b4e42535f61866c25bd57b4a9f082e5ab33659db545d813383a40ea637a').toUint8Array();
      expect(privateKeyBytes).to.deep.equal(expectedOutput);
    });

    it('throws an error when provided a secp256r1 public key', async () => {
      const publicKey: Jwk = {
        kty : 'EC',
        crv : 'P-256',
        x   : 'yRtzkBQdSfYwZ7EH6d9UMN-PV-r4ZZzXF3hGy8D9yy4',
        y   : 'bQUbIZeqUIUKV-N5265jD7_l2-xybjpFsr3kN4GdA_k'
      };

      await expect(
        Secp256r1.privateKeyToBytes({ privateKey: publicKey })
      ).to.eventually.be.rejectedWith(Error, 'provided key is not a valid EC private key');
    });

    for (const vector of secp256r1PrivateKeyToBytes.vectors) {
      it(vector.description, async () => {
        const privateKeyBytes = await Secp256r1.privateKeyToBytes({
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
        crv : 'P-256',
        x   : 'yRtzkBQdSfYwZ7EH6d9UMN-PV-r4ZZzXF3hGy8D9yy4',
        y   : 'bQUbIZeqUIUKV-N5265jD7_l2-xybjpFsr3kN4GdA_k'
      };

      const publicKeyBytes = await Secp256r1.publicKeyToBytes({ publicKey });

      expect(publicKeyBytes).to.be.an.instanceOf(Uint8Array);
      const expectedOutput = Convert.hex('04c91b7390141d49f63067b107e9df5430df8f57eaf8659cd7177846cbc0fdcb2e6d051b2197aa50850a57e379dbae630fbfe5dbec726e3a45b2bde437819d03f9').toUint8Array();
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
        Secp256r1.publicKeyToBytes({ publicKey: privateKey })
      ).to.eventually.be.rejectedWith(Error, 'provided key is not a valid EC public key');
    });

    for (const vector of secp256r1PublicKeyToBytes.vectors) {
      it(vector.description, async () => {
        const publicKeyBytes = await Secp256r1.publicKeyToBytes({
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

      otherPartyPrivateKey = await Secp256r1.generateKey();
      otherPartyPublicKey = await Secp256r1.computePublicKey({ key: otherPartyPrivateKey });
    });

    it('generates a 32-byte shared secret', async () => {
      const sharedSecret = await Secp256r1.sharedSecret({
        privateKeyA : ownPrivateKey,
        publicKeyB  : otherPartyPublicKey
      });
      expect(sharedSecret).to.be.instanceOf(Uint8Array);
      expect(sharedSecret.byteLength).to.equal(32);
    });

    it('is commutative', async () => {
      const sharedSecretOwnOther = await Secp256r1.sharedSecret({
        privateKeyA : ownPrivateKey,
        publicKeyB  : otherPartyPublicKey
      });

      const sharedSecretOtherOwn = await Secp256r1.sharedSecret({
        privateKeyA : otherPartyPrivateKey,
        publicKeyB  : ownPublicKey
      });

      expect(sharedSecretOwnOther).to.deep.equal(sharedSecretOtherOwn);
    });

    it('throws an error if the public/private keys from the same key pair are specified', async () => {
      await expect(
        Secp256r1.sharedSecret({
          privateKeyA : ownPrivateKey,
          publicKeyB  : ownPublicKey
        })
      ).to.eventually.be.rejectedWith(Error, 'shared secret cannot be computed from a single key pair');
    });
  });

  describe('sign()', () => {
    it('returns a 64-byte signature of type Uint8Array', async () => {
      const data = new Uint8Array([51, 52, 53]);
      const signature = await Secp256r1.sign({ key: privateKey, data });
      expect(signature).to.be.instanceOf(Uint8Array);
      expect(signature.byteLength).to.equal(64);
    });

    it('accepts input data as Uint8Array', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const key = privateKey;
      let signature: Uint8Array;

      signature = await Secp256r1.sign({ key, data });
      expect(signature).to.be.instanceOf(Uint8Array);
    });
  });

  describe('validatePrivateKey()', () => {
    for (const vector of secp256r1ValidatePrivateKey.vectors) {
      it(vector.description, async () => {
        const privateKeyBytes = Convert.hex(vector.input.privateKeyBytes).toUint8Array();
        const isValid = await Secp256r1.validatePrivateKey({ privateKeyBytes });
        expect(isValid).to.equal(vector.output);
      });
    }
  });

  describe('validatePublicKey()', () => {
    for (const vector of secp256r1ValidatePublicKey.vectors) {
      it(vector.description, async () => {
        const publicKeyBytes = Convert.hex(vector.input.publicKeyBytes).toUint8Array();
        const isValid = await Secp256r1.validatePublicKey({ publicKeyBytes });
        expect(isValid).to.equal(vector.output);
      });
    }
  });

  describe('verify()', () => {
    it('returns a boolean result', async () => {
      const data = new Uint8Array([51, 52, 53]);
      const signature = await Secp256r1.sign({ key: privateKey, data });

      const isValid = await Secp256r1.verify({ key: publicKey, signature, data });
      expect(isValid).to.exist;
      expect(isValid).to.be.true;
    });

    it('accepts input data as Uint8Array', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      let isValid: boolean;
      let signature: Uint8Array;

      // TypedArray - Uint8Array
      signature = await Secp256r1.sign({ key: privateKey, data });
      isValid = await Secp256r1.verify({ key: publicKey, signature, data });
      expect(isValid).to.be.true;
    });
  });
});