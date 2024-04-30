import chai, { expect } from 'chai';
import { Convert } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';

import type { Jwk } from '../../src/jose/jwk.js';

import { XChaCha20 } from '../../src/primitives/xchacha20.js';

chai.use(chaiAsPromised);

describe('XChaCha20', () => {
  describe('bytesToPrivateKey()', () => {
    it('returns a private key in JWK format', async () => {
      const privateKeyBytes = Convert.hex('ffbd52af5980bd3870cdc3f3634980ae9d15b33440f63f79799eb8ca2329117f').toUint8Array();
      const privateKey = await XChaCha20.bytesToPrivateKey({ privateKeyBytes });

      expect(privateKey).to.have.property('k');
      expect(privateKey).to.have.property('kid');
      expect(privateKey).to.have.property('kty', 'oct');
    });

    it('returns the expected JWK given byte array input', async () => {
      const privateKeyBytes = Convert.hex('2fbd52af5980bd3870cdc3f3634980ae9d15b33440f63f79799eb8ca2329117f').toUint8Array();
      const privateKey = await XChaCha20.bytesToPrivateKey({ privateKeyBytes });

      const expectedOutput: Jwk = {
        k   : 'L71Sr1mAvThwzcPzY0mArp0VszRA9j95eZ64yiMpEX8',
        kty : 'oct',
        kid : '6oEQ2tFk2QI4_Lz8uxQpT4_Qce6f9ceS3ZD76nqd_qg'
      };
      expect(privateKey).to.deep.equal(expectedOutput);
    });
  });

  describe('decrypt()', () => {
    it('returns Uint8Array plaintext with length matching input', async () => {
      const privateKey = await XChaCha20.generateKey();

      const plaintext = await XChaCha20.decrypt({
        data  : new Uint8Array(10),
        key   : privateKey,
        nonce : new Uint8Array(24)
      });
      expect(plaintext).to.be.an('Uint8Array');
      expect(plaintext.byteLength).to.equal(10);
    });

    it('passes test vectors', async () => {
      const privateKeyBytes =  Convert.hex('79c99798ac67300bbb2704c95c341e3245f3dcb21761b98e52ff45b24f304fc4').toUint8Array();
      const privateKey = await XChaCha20.bytesToPrivateKey({ privateKeyBytes });

      const input = {
        data  : Convert.hex('879b10a139674fe65087f59577ee2c1ab54655d900697fd02d953f53ddcc1ae476e8').toUint8Array(),
        key   : privateKey,
        nonce : Convert.hex('b33ffd3096479bcfbc9aee49417688a0a2554f8d95389419').toUint8Array()
      };
      const output = Convert.string(`Are You There Bob? It's Me, Alice.`).toUint8Array();

      const ciphertext = await XChaCha20.decrypt({
        data  : input.data,
        key   : input.key,
        nonce : input.nonce
      });

      expect(ciphertext).to.deep.equal(output);
    });
  });

  describe('encrypt()', () => {
    it('returns Uint8Array ciphertext with length matching input', async () => {
      const privateKey = await XChaCha20.generateKey();

      const ciphertext = await XChaCha20.encrypt({
        data  : new Uint8Array(10),
        key   : privateKey,
        nonce : new Uint8Array(24)
      });
      expect(ciphertext).to.be.an('Uint8Array');
      expect(ciphertext.byteLength).to.equal(10);
    });

    it('passes test vectors', async () => {
      const privateKeyBytes =  Convert.hex('79c99798ac67300bbb2704c95c341e3245f3dcb21761b98e52ff45b24f304fc4').toUint8Array();
      const privateKey = await XChaCha20.bytesToPrivateKey({ privateKeyBytes });

      const input = {
        data  : Convert.string(`Are You There Bob? It's Me, Alice.`).toUint8Array(),
        key   : privateKey,
        nonce : Convert.hex('b33ffd3096479bcfbc9aee49417688a0a2554f8d95389419').toUint8Array()
      };
      const output = Convert.hex('879b10a139674fe65087f59577ee2c1ab54655d900697fd02d953f53ddcc1ae476e8').toUint8Array();

      const ciphertext = await XChaCha20.encrypt({
        data  : input.data,
        key   : input.key,
        nonce : input.nonce
      });

      expect(ciphertext).to.deep.equal(output);
    });
  });

  describe('generateKey()', () => {
    it('returns a private key in JWK format', async () => {
      const privateKey = await XChaCha20.generateKey();

      expect(privateKey).to.have.property('k');
      expect(privateKey).to.have.property('kid');
      expect(privateKey).to.have.property('kty', 'oct');
    });
  });

  describe('privateKeyToBytes()', () => {
    it('returns a private key as a byte array', async () => {
      const privateKey = await XChaCha20.generateKey();
      const privateKeyBytes = await XChaCha20.privateKeyToBytes({ privateKey });

      expect(privateKeyBytes).to.be.an.instanceOf(Uint8Array);
    });

    it('returns the expected byte array for JWK input', async () => {
      const privateKey: Jwk = {
        k   : 'L71Sr1mAvThwzcPzY0mArp0VszRA9j95eZ64yiMpEX8',
        kty : 'oct',
        kid : '6oEQ2tFk2QI4_Lz8uxQpT4_Qce6f9ceS3ZD76nqd_qg'
      };
      const privateKeyBytes = await XChaCha20.privateKeyToBytes({ privateKey });

      expect(privateKeyBytes).to.be.an.instanceOf(Uint8Array);
      const expectedOutput = Convert.hex('2fbd52af5980bd3870cdc3f3634980ae9d15b33440f63f79799eb8ca2329117f').toUint8Array();
      expect(privateKeyBytes).to.deep.equal(expectedOutput);
    });

    it('throws an error when provided an asymmetric public key', async () => {
      const publicKey: Jwk = {
        crv : 'Ed25519',
        kty : 'OKP',
        x   : 'PUAXw-hDiVqStwqnTRt-vJyYLM8uxJaMwM1V8Sr0Zgw',
      };

      await expect(
        XChaCha20.privateKeyToBytes({ privateKey: publicKey })
      ).to.eventually.be.rejectedWith(Error, 'provided key is not a valid oct private key');
    });
  });
});