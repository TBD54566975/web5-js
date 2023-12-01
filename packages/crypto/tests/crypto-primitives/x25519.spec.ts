import chai, { expect } from 'chai';
import { Convert } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';

import type { JwkParamsOkpPrivate, PrivateKeyJwk, PublicKeyJwk } from '../../src/jose.js';

import x25519BytesToPublicKey from '../fixtures/test-vectors/x25519/bytes-to-public-key.json' assert { type: 'json' };
import x25519BytesToPrivateKey from '../fixtures/test-vectors/x25519/bytes-to-private-key.json' assert { type: 'json' };
import x25519PrivateKeyToBytes from '../fixtures/test-vectors/x25519/private-key-to-bytes.json' assert { type: 'json' };
import x25519PublicKeyToBytes from '../fixtures/test-vectors/x25519/public-key-to-bytes.json' assert { type: 'json' };

import { X25519 } from '../../src/crypto-primitives/x25519.js';

chai.use(chaiAsPromised);

// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;

describe('X25519', () => {
  let privateKey: PrivateKeyJwk;
  let publicKey: PublicKeyJwk;

  before(async () => {
    privateKey = await X25519.generateKey();
    publicKey = await X25519.computePublicKey({ privateKey });
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

  describe('computePublicKey()', () => {
    it('returns a public key in JWK format', async () => {
      const publicKey = await X25519.computePublicKey({ privateKey });

      expect(publicKey).to.have.property('kty', 'OKP');
      expect(publicKey).to.have.property('crv', 'X25519');
      expect(publicKey).to.have.property('x');
      expect(publicKey).to.not.have.property('d');
    });
  });

  describe('privateKeyToBytes()', () => {
    it('returns a private key as a byte array', async () => {
      const privateKey: PrivateKeyJwk = {
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
      const publicKey: PublicKeyJwk = {
        kty : 'OKP',
        crv : 'X25519',
        x   : 'U2kX2FckTAoTAjMBUadwOpftdXk-Kx8pZMeyG3QZsy8',
        kid : 'PPgSyqA-j9sc9vmsvpSCpy2uLg_CUfGoKHhPzQ5Gkog'
      };

      await expect(
        // @ts-expect-error because a public key is being passed to a method that expects a private key.
        X25519.privateKeyToBytes({ privateKey: publicKey })
      ).to.eventually.be.rejectedWith(Error, 'provided key is not a valid OKP private key');
    });

    for (const vector of x25519PrivateKeyToBytes.vectors) {
      it(vector.description, async () => {
        const privateKeyBytes = await X25519.privateKeyToBytes({
          privateKey: vector.input.privateKey as PrivateKeyJwk
        });
        expect(privateKeyBytes).to.deep.equal(Convert.hex(vector.output).toUint8Array());
      });
    }
  });

  describe('publicKeyToBytes()', () => {
    it('returns a public key in JWK format', async () => {
      const publicKey: PublicKeyJwk = {
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
      const privateKey: PrivateKeyJwk = {
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
          publicKey: vector.input.publicKey as PublicKeyJwk
        });
        expect(publicKeyBytes).to.deep.equal(Convert.hex(vector.output).toUint8Array());
      });
    }
  });

  describe('sharedSecret()', () => {
    let ownPrivateKey: PrivateKeyJwk;
    let ownPublicKey: PublicKeyJwk;
    let otherPartyPrivateKey: PrivateKeyJwk;
    let otherPartyPublicKey: PublicKeyJwk;

    before(async () => {
      ownPrivateKey = privateKey;
      ownPublicKey = publicKey;
      otherPartyPrivateKey = await X25519.generateKey();
      otherPartyPublicKey = await X25519.computePublicKey({ privateKey: otherPartyPrivateKey });
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

  describe('validatePublicKey()', () => {
    it('throws a not implemented error', async () => {
      await expect(
        // @ts-expect-error because validatePublicKey is a private method.
        X25519.validatePublicKey({ key: new Uint8Array(32) })
      ).to.eventually.be.rejectedWith(Error, 'Not implemented');
    });
  });
});