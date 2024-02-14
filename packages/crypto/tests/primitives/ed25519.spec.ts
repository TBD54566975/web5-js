import chai, { expect } from 'chai';
import { Convert } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';

import type { Jwk, JwkParamsOkpPrivate } from '../../src/jose/jwk.js';

import CryptoEd25519SignTestVector from '../../../../web5-spec/test-vectors/crypto_ed25519/sign.json' assert { type: 'json' };
import ed25519ComputePublicKey from '../fixtures/test-vectors/ed25519/compute-public-key.json' assert { type: 'json' };
import CryptoEd25519VerifyTestVector from '../../../../web5-spec/test-vectors/crypto_ed25519/verify.json' assert { type: 'json' };
import ed25519BytesToPublicKey from '../fixtures/test-vectors/ed25519/bytes-to-public-key.json' assert { type: 'json' };
import ed25519PublicKeyToBytes from '../fixtures/test-vectors/ed25519/public-key-to-bytes.json' assert { type: 'json' };
import ed25519BytesToPrivateKey from '../fixtures/test-vectors/ed25519/bytes-to-private-key.json' assert { type: 'json' };
import ed25519PrivateKeyToBytes from '../fixtures/test-vectors/ed25519/private-key-to-bytes.json' assert { type: 'json' };
import ed25519ConvertPublicKeyToX25519 from '../fixtures/test-vectors/ed25519/convert-public-key-to-x25519.json' assert { type: 'json' };
import ed25519ConvertPrivateKeyToX25519 from '../fixtures/test-vectors/ed25519/convert-private-key-to-x25519.json' assert { type: 'json' };

import { Ed25519 } from '../../src/primitives/ed25519.js';

chai.use(chaiAsPromised);

describe('Ed25519', () => {
  let privateKey: Jwk;
  let publicKey: Jwk;

  before(async () => {
    privateKey = await Ed25519.generateKey();
    publicKey = await Ed25519.computePublicKey({ key: privateKey });
  });

  describe('bytesToPrivateKey()', () => {
    it('returns a private key in JWK format', async () => {
      const privateKeyBytes = Convert.hex('4ccd089b28ff96da9db6c346ec114e0f5b8a319f35aba624da8cf6ed4fb8a6fb').toUint8Array();
      const privateKey = await Ed25519.bytesToPrivateKey({ privateKeyBytes });

      expect(privateKey).to.have.property('crv', 'Ed25519');
      expect(privateKey).to.have.property('d');
      expect(privateKey).to.have.property('kid');
      expect(privateKey).to.have.property('kty', 'OKP');
      expect(privateKey).to.have.property('x');
    });

    for (const vector of ed25519BytesToPrivateKey.vectors) {
      it(vector.description, async () => {
        const privateKey = await Ed25519.bytesToPrivateKey({
          privateKeyBytes: Convert.hex(vector.input.privateKeyBytes).toUint8Array()
        });
        expect(privateKey).to.deep.equal(vector.output);
      });
    }
  });

  describe('bytesToPublicKey()', () => {
    it('returns a public key in JWK format', async () => {
      const publicKeyBytes = Convert.hex('3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c').toUint8Array();
      const publicKey = await Ed25519.bytesToPublicKey({ publicKeyBytes });

      expect(publicKey).to.have.property('crv', 'Ed25519');
      expect(publicKey).to.have.property('kid');
      expect(publicKey).to.have.property('kty', 'OKP');
      expect(publicKey).to.have.property('x');
      expect(publicKey).to.not.have.property('d');
    });

    for (const vector of ed25519BytesToPublicKey.vectors) {
      it(vector.description, async () => {
        const publicKey = await Ed25519.bytesToPublicKey({
          publicKeyBytes: Convert.hex(vector.input.publicKeyBytes).toUint8Array()
        });
        expect(publicKey).to.deep.equal(vector.output);
      });
    }
  });

  describe('computePublicKey()', () => {
    it('returns a public key in JWK format', async () => {
      const publicKey = await Ed25519.computePublicKey({ key: privateKey });

      expect(publicKey).to.have.property('kty', 'OKP');
      expect(publicKey).to.have.property('crv', 'Ed25519');
      expect(publicKey).to.have.property('x');
      expect(publicKey).to.not.have.property('d');
    });

    it('computes and adds a kid property, if missing', async () => {
      const { kid, ...privateKeyWithoutKid } = privateKey;
      const publicKey = await Ed25519.computePublicKey({ key: privateKeyWithoutKid });

      expect(publicKey).to.have.property('kid', kid);
    });

    for (const vector of ed25519ComputePublicKey.vectors) {
      it(vector.description, async () => {
        const publicKey = await Ed25519.computePublicKey(vector.input as { key: Jwk });
        expect(publicKey).to.deep.equal(vector.output);
      });
    }
  });

  describe('convertPrivateKeyToX25519()', () => {
    for (const vector of ed25519ConvertPrivateKeyToX25519.vectors) {
      it(vector.description, async () => {
        const x25519PrivateKey = await Ed25519.convertPrivateKeyToX25519(
          vector.input as { privateKey: Jwk }
        );
        expect(x25519PrivateKey).to.deep.equal(vector.output);
      });
    }
  });

  describe('convertPublicKeyToX25519()', () => {
    it('throws an error when provided an invalid Ed25519 public key', async () => {
      const invalidEd25519PublicKeyBytes = Convert.hex('02fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f').toUint8Array();

      const invalidEd25519PublicKey: Jwk = {
        kty : 'OKP',
        crv : 'Ed25519',
        x   : Convert.uint8Array(invalidEd25519PublicKeyBytes).toBase64Url()
      };

      await expect(
        Ed25519.convertPublicKeyToX25519({ publicKey: invalidEd25519PublicKey })
      ).to.eventually.be.rejectedWith(Error, 'Invalid public key');
    });

    it('throws an error when provided an Ed25519 private key', async () => {
      const ed25519PrivateKey: Jwk = {
        kty : 'OKP',
        crv : 'Ed25519',
        d   : 'dwdtCnMYpX08FsFyUbJmRd9ML4frwJkqsXf7pR25LCo',
        x   : '0KTOwPi1C6HpNuxWFUVKqX37J4ZPXxdgivLLsQVI8bM'
      };

      await expect(
        Ed25519.convertPublicKeyToX25519({ publicKey: ed25519PrivateKey })
      ).to.eventually.be.rejectedWith(Error, 'provided key is not a valid OKP public key');
    });

    for (const vector of ed25519ConvertPublicKeyToX25519.vectors) {
      it(vector.description, async () => {
        const x25519PrivateKey = await Ed25519.convertPublicKeyToX25519(
          vector.input as { publicKey: Jwk }
        );
        expect(x25519PrivateKey).to.deep.equal(vector.output);
      });
    }
  });

  describe('generateKey()', () => {
    it('returns a private key in JWK format', async () => {
      const privateKey = await Ed25519.generateKey();

      expect(privateKey).to.have.property('crv', 'Ed25519');
      expect(privateKey).to.have.property('d');
      expect(privateKey).to.have.property('kid');
      expect(privateKey).to.have.property('kty', 'OKP');
      expect(privateKey).to.have.property('x');
    });

    it('returns a 32-byte private key', async () => {
      const privateKey = await Ed25519.generateKey() as JwkParamsOkpPrivate;

      const privateKeyBytes = Convert.base64Url(privateKey.d).toUint8Array();
      expect(privateKeyBytes.byteLength).to.equal(32);
    });
  });

  describe('getPublicKey()', () => {
    it('returns a public key in JWK format', async () => {
      const publicKey = await Ed25519.getPublicKey({ key: privateKey });

      expect(publicKey).to.have.property('kty', 'OKP');
      expect(publicKey).to.have.property('crv', 'Ed25519');
      expect(publicKey).to.have.property('x');
      expect(publicKey).to.not.have.property('d');
    });

    it('computes and adds a kid property, if missing', async () => {
      const { kid, ...privateKeyWithoutKid } = privateKey;
      const publicKey = await Ed25519.getPublicKey({ key: privateKeyWithoutKid });

      expect(publicKey).to.have.property('kid', kid);
    });

    it('returns the same output as computePublicKey()', async () => {
      const publicKey = await Ed25519.getPublicKey({ key: privateKey });
      expect(publicKey).to.deep.equal(await Ed25519.computePublicKey({ key: privateKey }));
    });

    it('throws an error when provided an Ed25519 public key', async () => {
      await expect(
        Ed25519.getPublicKey({ key: publicKey })
      ).to.eventually.be.rejectedWith(Error, 'key is not an Ed25519 private JWK');
    });

    it('throws an error when provided an secp256k1 private key', async () => {
      const secp256k1PrivateKey: Jwk = {
        kty : 'EC',
        crv : 'secp256k1',
        x   : 'N1KVEnQCMpbIp0sP_kL4L_S01LukMmR3QicD92H1klg',
        y   : 'wmp0ZbmnesDD8c7bE5xCiwsfu1UWhntSdjbzKG9wVVM',
        kid : 'iwwOeCqgvREo5xGeBS-obWW9ZGjv0o1M65gUYN6SYh4'
      };

      await expect(
        Ed25519.getPublicKey({ key: secp256k1PrivateKey })
      ).to.eventually.be.rejectedWith(Error, 'key is not an Ed25519 private JWK');
    });

    it('throws an error when provided an X25519 private key', async () => {
      const x25519PrivateKey: Jwk = {
        kty : 'OKP',
        crv : 'X25519',
        d   : 'jxSSX_aM49m6E4MaSd-hcizIM33rXzLltuev9oBw1V8',
        x   : 'U2kX2FckTAoTAjMBUadwOpftdXk-Kx8pZMeyG3QZsy8',
        kid : 'PPgSyqA-j9sc9vmsvpSCpy2uLg_CUfGoKHhPzQ5Gkog'
      };

      await expect(
        Ed25519.getPublicKey({ key: x25519PrivateKey })
      ).to.eventually.be.rejectedWith(Error, 'key is not an Ed25519 private JWK');
    });
  });

  describe('privateKeyToBytes()', () => {
    it('returns a private key as a byte array', async () => {
      const privateKey: Jwk = {
        crv : 'Ed25519',
        d   : 'TM0Imyj_ltqdtsNG7BFOD1uKMZ81q6Yk2oz27U-4pvs',
        kty : 'OKP',
        x   : 'PUAXw-hDiVqStwqnTRt-vJyYLM8uxJaMwM1V8Sr0Zgw',
        kid : 'FtIu-VbGrfe_KB6CH7GNwODB72MNxj_ml11dEvO-7kk'
      };
      const privateKeyBytes = await Ed25519.privateKeyToBytes({ privateKey });

      expect(privateKeyBytes).to.be.an.instanceOf(Uint8Array);
      const expectedOutput = Convert.hex('4ccd089b28ff96da9db6c346ec114e0f5b8a319f35aba624da8cf6ed4fb8a6fb').toUint8Array();
      expect(privateKeyBytes).to.deep.equal(expectedOutput);
    });

    it('throws an error when provided an Ed25519 public key', async () => {
      const publicKey: Jwk = {
        crv : 'Ed25519',
        kty : 'OKP',
        x   : 'PUAXw-hDiVqStwqnTRt-vJyYLM8uxJaMwM1V8Sr0Zgw',
      };

      await expect(
        Ed25519.privateKeyToBytes({ privateKey: publicKey })
      ).to.eventually.be.rejectedWith(Error, 'provided key is not a valid OKP private key');
    });

    for (const vector of ed25519PrivateKeyToBytes.vectors) {
      it(vector.description, async () => {
        const privateKeyBytes = await Ed25519.privateKeyToBytes({
          privateKey: vector.input.privateKey as Jwk
        });
        expect(privateKeyBytes).to.deep.equal(Convert.hex(vector.output).toUint8Array());
      });
    }
  });

  describe('publicKeyToBytes()', () => {
    it('returns a public key in JWK format', async () => {
      const publicKey: Jwk = {
        kty : 'OKP',
        crv : 'Ed25519',
        x   : 'PUAXw-hDiVqStwqnTRt-vJyYLM8uxJaMwM1V8Sr0Zgw',
        kid : 'FtIu-VbGrfe_KB6CH7GNwODB72MNxj_ml11dEvO-7kk'
      };

      const publicKeyBytes = await Ed25519.publicKeyToBytes({ publicKey });

      expect(publicKeyBytes).to.be.an.instanceOf(Uint8Array);
      const expectedOutput = Convert.hex('3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c').toUint8Array();
      expect(publicKeyBytes).to.deep.equal(expectedOutput);
    });

    it('throws an error when provided an Ed25519 private key', async () => {
      const privateKey: Jwk = {
        crv : 'Ed25519',
        d   : 'TM0Imyj_ltqdtsNG7BFOD1uKMZ81q6Yk2oz27U-4pvs',
        kty : 'OKP',
        x   : 'PUAXw-hDiVqStwqnTRt-vJyYLM8uxJaMwM1V8Sr0Zgw',
        kid : 'FtIu-VbGrfe_KB6CH7GNwODB72MNxj_ml11dEvO-7kk'
      };

      await expect(
        Ed25519.publicKeyToBytes({ publicKey: privateKey })
      ).to.eventually.be.rejectedWith(Error, 'provided key is not a valid OKP public key');
    });

    for (const vector of ed25519PublicKeyToBytes.vectors) {
      it(vector.description, async () => {
        const publicKeyBytes = await Ed25519.publicKeyToBytes({
          publicKey: vector.input.publicKey as Jwk
        });
        expect(publicKeyBytes).to.deep.equal(Convert.hex(vector.output).toUint8Array());
      });
    }
  });

  describe('sign()', () => {
    it('returns a 64-byte signature of type Uint8Array', async () => {
      const data = new Uint8Array([51, 52, 53]);
      const signature = await Ed25519.sign({ key: privateKey, data });
      expect(signature).to.be.instanceOf(Uint8Array);
      expect(signature.byteLength).to.equal(64);
    });

    it('accepts input data as Uint8Array', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      let signature: Uint8Array;

      signature = await Ed25519.sign({ key: privateKey, data: data });
      expect(signature).to.be.instanceOf(Uint8Array);
    });

    describe('Web5TestVectorsCryptoEd25519', () => {
      it('sign', async () => {
        for (const vector of CryptoEd25519SignTestVector.vectors) {
          let errorOccurred = false;
          try {
            const signature = await Ed25519.sign({
              key  : vector.input.key as Jwk,
              data : Convert.hex(vector.input.data).toUint8Array()
            });

            const signatureHex = Convert.uint8Array(signature).toHex();
            expect(signatureHex).to.deep.equal(vector.output, vector.description);

          } catch { errorOccurred = true; }
          expect(errorOccurred).to.equal(vector.errors, `Expected '${vector.description}' to${vector.errors ? ' ' : ' not '}throw an error`);
        }
      });
    });
  });

  describe('validatePublicKey()', () => {
    it('returns true for valid public keys', async () => {
      const publicKeyBytes = Convert.hex('a12c2beb77265f2aac953b5009349d94155a03ada416aad451319480e983ca4c').toUint8Array();
      const isValid = await Ed25519.validatePublicKey({ publicKeyBytes });
      expect(isValid).to.be.true;
    });

    it('returns false for invalid public keys', async () => {
      const publicKeyBytes = Convert.hex('02fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f').toUint8Array();
      const isValid = await Ed25519.validatePublicKey({ publicKeyBytes });
      expect(isValid).to.be.false;
    });

    it('returns false if a private key is given', async () => {
      const publicKeyBytes = Convert.hex('0a23a20072891237aa0864b5765139514908787878cd77135a0059881d313f00').toUint8Array();
      const isValid = await Ed25519.validatePublicKey({ publicKeyBytes });
      expect(isValid).to.be.false;
    });
  });

  describe('verify()', () => {
    it('returns a boolean result', async () => {
      const data = new Uint8Array([51, 52, 53]);
      const signature = await Ed25519.sign({ key: privateKey, data });

      const isValid = await Ed25519.verify({ key: publicKey, signature, data });
      expect(isValid).to.exist;
      expect(isValid).to.be.a('boolean');
    });

    it('accepts input data as Uint8Array', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const signature = await Ed25519.sign({ key: privateKey, data });

      const isValid = await Ed25519.verify({ key: publicKey, signature, data });
      expect(isValid).to.be.true;
    });

    describe('Web5TestVectorsCryptoEd25519', () => {
      it('verify', async () => {
        for (const vector of CryptoEd25519VerifyTestVector.vectors) {
          let errorOccurred = false;
          try {
            const isValid = await Ed25519.verify({
              key       : vector.input.key as Jwk,
              signature : Convert.hex(vector.input.signature).toUint8Array(),
              data      : Convert.hex(vector.input.data).toUint8Array()
            });

            expect(isValid).to.equal(vector.output);

          } catch { errorOccurred = true; }
          expect(errorOccurred).to.equal(vector.errors, `Expected '${vector.description}' to${vector.errors ? ' ' : ' not '}throw an error`);
        }
      });
    });
  });
});