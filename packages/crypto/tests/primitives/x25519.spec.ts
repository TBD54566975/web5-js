import chai, { expect } from 'chai';
import { Convert } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';

import type { Jwk, JwkParamsOkpPrivate } from '../../src/jose/jwk.js';

import x25519BytesToPublicKey from '../fixtures/test-vectors/x25519/bytes-to-public-key.json' assert { type: 'json' };
import x25519BytesToPrivateKey from '../fixtures/test-vectors/x25519/bytes-to-private-key.json' assert { type: 'json' };
import x25519PrivateKeyToBytes from '../fixtures/test-vectors/x25519/private-key-to-bytes.json' assert { type: 'json' };
import x25519PublicKeyToBytes from '../fixtures/test-vectors/x25519/public-key-to-bytes.json' assert { type: 'json' };

import { X25519 } from '../../src/primitives/x25519.js';

chai.use(chaiAsPromised);

describe('X25519', () => {
  let privateKey: Jwk;
  let publicKey: Jwk;

  before(async () => {
    privateKey = await X25519.generateKey();
    publicKey = await X25519.computePublicKey({ key: privateKey });
  });

  describe('bytesToPrivateKey()', () => {
    it('returns a private key in JWK format', async () => {
      const privateKeyBytes = Convert.hex('c8a9d5a91091ad851c668b0736c1c9a02936c0d3ad62670858088047ba057475').toUint8Array();
      const privateKey = await X25519.bytesToPrivateKey({ privateKeyBytes });

      expect(privateKey).to.have.property('crv', 'X25519');
      expect(privateKey).to.have.property('d');
      expect(privateKey).to.have.property('kid');
      expect(privateKey).to.have.property('kty', 'OKP');
      expect(privateKey).to.have.property('x');
    });

    for (const vector of x25519BytesToPrivateKey.vectors) {
      it(vector.description, async () => {
        const privateKey = await X25519.bytesToPrivateKey({
          privateKeyBytes: Convert.hex(vector.input.privateKeyBytes).toUint8Array()
        });

        expect(privateKey).to.deep.equal(vector.output);
      });
    }
  });

  describe('bytesToPublicKey()', () => {
    it('returns a public key in JWK format', async () => {
      const publicKeyBytes = Convert.hex('504a36999f489cd2fdbc08baff3d88fa00569ba986cba22548ffde80f9806829').toUint8Array();
      const publicKey = await X25519.bytesToPublicKey({ publicKeyBytes });

      expect(publicKey).to.have.property('crv', 'X25519');
      expect(publicKey).to.have.property('kid');
      expect(publicKey).to.have.property('kty', 'OKP');
      expect(publicKey).to.have.property('x');
      expect(publicKey).to.not.have.property('d');
    });

    for (const vector of x25519BytesToPublicKey.vectors) {
      it(vector.description, async () => {
        const publicKey = await X25519.bytesToPublicKey({
          publicKeyBytes: Convert.hex(vector.input.publicKeyBytes).toUint8Array()
        });

        expect(publicKey).to.deep.equal(vector.output);
      });
    }
  });

  describe('computePublicKey()', () => {
    it('returns a public key in JWK format', async () => {
      const publicKey = await X25519.computePublicKey({ key: privateKey });

      expect(publicKey).to.have.property('kty', 'OKP');
      expect(publicKey).to.have.property('crv', 'X25519');
      expect(publicKey).to.have.property('kid');
      expect(publicKey).to.have.property('x');
      expect(publicKey).to.not.have.property('d');
    });

    it('computes and adds a kid property, if missing', async () => {
      const { kid, ...privateKeyWithoutKid } = privateKey;
      const publicKey = await X25519.computePublicKey({ key: privateKeyWithoutKid });

      expect(publicKey).to.have.property('kid', kid);
    });
  });

  describe('generateKey()', () => {
    it('returns a private key in JWK format', async () => {
      const privateKey = await X25519.generateKey();

      expect(privateKey).to.have.property('crv', 'X25519');
      expect(privateKey).to.have.property('d');
      expect(privateKey).to.have.property('kid');
      expect(privateKey).to.have.property('kty', 'OKP');
      expect(privateKey).to.have.property('x');
    });

    it('returns a 32-byte private key', async () => {
      const privateKey = await X25519.generateKey() as JwkParamsOkpPrivate;

      const privateKeyBytes = Convert.base64Url(privateKey.d).toUint8Array();
      expect(privateKeyBytes.byteLength).to.equal(32);
    });
  });

  describe('getPublicKey()', () => {
    it('returns a public key in JWK format', async () => {
      const publicKey = await X25519.getPublicKey({ key: privateKey });

      expect(publicKey).to.have.property('kty', 'OKP');
      expect(publicKey).to.have.property('crv', 'X25519');
      expect(publicKey).to.have.property('x');
      expect(publicKey).to.not.have.property('d');
    });

    it('computes and adds a kid property, if missing', async () => {
      const { kid, ...privateKeyWithoutKid } = privateKey;
      const publicKey = await X25519.getPublicKey({ key: privateKeyWithoutKid });

      expect(publicKey).to.have.property('kid', kid);
    });

    it('returns the same output as computePublicKey()', async () => {
      const publicKey = await X25519.getPublicKey({ key: privateKey });
      expect(publicKey).to.deep.equal(await X25519.computePublicKey({ key: privateKey }));
    });

    it('throws an error when provided an X25519 public key', async () => {
      await expect(
        X25519.getPublicKey({ key: publicKey })
      ).to.eventually.be.rejectedWith(Error, 'key is not an X25519 private JWK');
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
        X25519.getPublicKey({ key: ed25519PrivateKey })
      ).to.eventually.be.rejectedWith(Error, 'key is not an X25519 private JWK');
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
        X25519.getPublicKey({ key: secp256k1PrivateKey })
      ).to.eventually.be.rejectedWith(Error, 'key is not an X25519 private JWK');
    });
  });

  describe('privateKeyToBytes()', () => {
    it('returns a private key as a byte array', async () => {
      const privateKey: Jwk = {
        kty : 'OKP',
        crv : 'X25519',
        d   : 'jxSSX_aM49m6E4MaSd-hcizIM33rXzLltuev9oBw1V8',
        x   : 'U2kX2FckTAoTAjMBUadwOpftdXk-Kx8pZMeyG3QZsy8',
        kid : 'PPgSyqA-j9sc9vmsvpSCpy2uLg_CUfGoKHhPzQ5Gkog'
      };
      const privateKeyBytes = await X25519.privateKeyToBytes({ privateKey });

      expect(privateKeyBytes).to.be.an.instanceOf(Uint8Array);
      const expectedOutput = Convert.hex('8f14925ff68ce3d9ba13831a49dfa1722cc8337deb5f32e5b6e7aff68070d55f').toUint8Array();
      expect(privateKeyBytes).to.deep.equal(expectedOutput);
    });

    it('throws an error when provided an X25519 public key', async () => {
      const publicKey: Jwk = {
        kty : 'OKP',
        crv : 'X25519',
        x   : 'U2kX2FckTAoTAjMBUadwOpftdXk-Kx8pZMeyG3QZsy8',
        kid : 'PPgSyqA-j9sc9vmsvpSCpy2uLg_CUfGoKHhPzQ5Gkog'
      };

      await expect(
        X25519.privateKeyToBytes({ privateKey: publicKey })
      ).to.eventually.be.rejectedWith(Error, 'provided key is not a valid OKP private key');
    });

    for (const vector of x25519PrivateKeyToBytes.vectors) {
      it(vector.description, async () => {
        const privateKeyBytes = await X25519.privateKeyToBytes({
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
        crv : 'X25519',
        x   : 'U2kX2FckTAoTAjMBUadwOpftdXk-Kx8pZMeyG3QZsy8',
        kid : 'PPgSyqA-j9sc9vmsvpSCpy2uLg_CUfGoKHhPzQ5Gkog'
      };

      const publicKeyBytes = await X25519.publicKeyToBytes({ publicKey });

      expect(publicKeyBytes).to.be.an.instanceOf(Uint8Array);
      const expectedOutput = Convert.hex('536917d857244c0a1302330151a7703a97ed75793e2b1f2964c7b21b7419b32f').toUint8Array();
      expect(publicKeyBytes).to.deep.equal(expectedOutput);
    });

    it('throws an error when provided an X25519 private key', async () => {
      const privateKey: Jwk = {
        kty : 'OKP',
        crv : 'X25519',
        d   : 'jxSSX_aM49m6E4MaSd-hcizIM33rXzLltuev9oBw1V8',
        x   : 'U2kX2FckTAoTAjMBUadwOpftdXk-Kx8pZMeyG3QZsy8',
        kid : 'PPgSyqA-j9sc9vmsvpSCpy2uLg_CUfGoKHhPzQ5Gkog'
      };

      await expect(
        X25519.publicKeyToBytes({ publicKey: privateKey })
      ).to.eventually.be.rejectedWith(Error, 'provided key is not a valid OKP public key');
    });

    for (const vector of x25519PublicKeyToBytes.vectors) {
      it(vector.description, async () => {
        const publicKeyBytes = await X25519.publicKeyToBytes({
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

    before(async () => {
      ownPrivateKey = privateKey;
      ownPublicKey = publicKey;
      otherPartyPrivateKey = await X25519.generateKey();
      otherPartyPublicKey = await X25519.computePublicKey({ key: otherPartyPrivateKey });
    });

    it('generates a 32-byte compressed secret', async () => {
      const sharedSecret = await X25519.sharedSecret({
        privateKeyA : ownPrivateKey,
        publicKeyB  : otherPartyPublicKey
      });
      expect(sharedSecret).to.be.instanceOf(Uint8Array);
      expect(sharedSecret.byteLength).to.equal(32);
    });

    it('is commutative', async () => {
      const sharedSecretOwnOther = await X25519.sharedSecret({
        privateKeyA : ownPrivateKey,
        publicKeyB  : otherPartyPublicKey
      });

      const sharedSecretOtherOwn = await X25519.sharedSecret({
        privateKeyA : otherPartyPrivateKey,
        publicKeyB  : ownPublicKey
      });

      expect(sharedSecretOwnOther).to.deep.equal(sharedSecretOtherOwn);
    });

    it('throws an error if the public/private keys from the same key pair are specified', async () => {
      await expect(
        X25519.sharedSecret({
          privateKeyA : ownPrivateKey,
          publicKeyB  : ownPublicKey
        })
      ).to.eventually.be.rejectedWith(Error, 'shared secret cannot be computed from a single key pair');
    });
  });
});