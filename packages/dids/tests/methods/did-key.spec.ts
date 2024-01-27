import type { Jwk } from '@web5/crypto';

import { expect } from 'chai';
import { LocalKeyManager } from '@web5/crypto';

import { DidKey, DidKeyUtils } from '../../src/methods/did-key.js';

describe.only('DidKey', () => {
  let keyManager: LocalKeyManager;

  before(() => {
    keyManager = new LocalKeyManager();
  });

  describe('create()', () => {
    it('creates a did:key DID', async () => {
      const did = await DidKey.create({ keyManager, options: { algorithm: 'Ed25519' } });

      expect(did).to.have.property('didDocument');
      expect(did).to.have.property('getSigner');
      expect(did).to.have.property('keyManager');
      expect(did).to.have.property('metadata');
      expect(did).to.have.property('uri');
      expect(did.uri.startsWith('did:key:')).to.be.true;
      expect(did.didDocument.verificationMethod).to.have.length(1);
    });

    it('uses a default key manager and key generation algorithm if neither is given', async () => {
      // Create a DID with no params.
      let did = await DidKey.create();
      expect(did.uri.startsWith('did:key:')).to.be.true;

      // Create a DID with an empty options object.
      did = await DidKey.create({ options: {} });
      expect(did.uri.startsWith('did:key:')).to.be.true;

      // Create a DID with an empty options object and undefined key manager.
      did = await DidKey.create({});
      expect(did.uri.startsWith('did:key:')).to.be.true;
    });

    it('creates a DID using the top-level algorithm property, if given', async () => {
      const did = await DidKey.create({ keyManager, options: { algorithm: 'secp256k1' } });

      // Retrieve the public key from the key manager.
      const keyUri = await keyManager.getKeyUri({ key: did.didDocument.verificationMethod![0]!.publicKeyJwk! });
      const publicKey = await keyManager.getPublicKey({ keyUri });

      // Verify the public key is an secp256k1 key.
      expect(publicKey).to.have.property('crv', 'secp256k1');
    });

    it('creates a DID using the verificationMethods algorithm property, if given', async () => {
      const did = await DidKey.create({ keyManager, options: { verificationMethods: [{ algorithm: 'secp256k1' }] } });

      // Retrieve the public key from the key manager.
      const keyUri = await keyManager.getKeyUri({ key: did.didDocument.verificationMethod![0]!.publicKeyJwk! });
      const publicKey = await keyManager.getPublicKey({ keyUri });

      // Verify the public key is an secp256k1 key.
      expect(publicKey).to.have.property('crv', 'secp256k1');
    });

    it('creates a DID with an Ed25519 key, by default', async () => {
      const did = await DidKey.create({ keyManager });

      // Retrieve the public key from the key manager.
      const keyUri = await keyManager.getKeyUri({ key: did.didDocument.verificationMethod![0]!.publicKeyJwk! });
      const publicKey = await keyManager.getPublicKey({ keyUri });

      // Verify the public key is an Ed25519 key.
      expect(publicKey).to.have.property('crv', 'Ed25519');
    });

    it('creates a DID using any signature algorithm supported by the provided KMS', async () => {
      expect(
        await DidKey.create({ keyManager, options: { algorithm: 'secp256k1' } })
      ).to.have.property('uri');

      expect(
        await DidKey.create({ keyManager, options: { algorithm: 'Ed25519' } })
      ).to.have.property('uri');
    });

    it('returns a getSigner() function that creates valid signatures that can be verified', async () => {
      const did = await DidKey.create({ keyManager, options: { algorithm: 'Ed25519' } });

      const signer = await did.getSigner();
      const data = new Uint8Array([1, 2, 3]);
      const signature = await signer.sign({ data });
      const isValid = await signer.verify({ data, signature });

      expect(signature).to.have.length(64);
      expect(isValid).to.be.true;
    });

    it('returns a getSigner() function handles undefined params', async function () {
      // Create a `did:key` DID.
      const did = await DidKey.create({ keyManager, options: { algorithm: 'Ed25519' } });

      // Simulate the creation of a signer with undefined params
      const signer = await did.getSigner({ });

      // Note: Since this test does not interact with an actual keyManager, it primarily ensures
      // that the method doesn't break with undefined params.
      expect(signer).to.have.property('sign');
      expect(signer).to.have.property('verify');
    });

    it('throws an error if both algorithm and verificationMethods are provided', async () => {
      try {
        await DidKey.create({
          keyManager,
          options: {
            algorithm           : 'Ed25519',
            verificationMethods : [{ algorithm: 'Ed25519' }]
          }
        });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('options are mutually exclusive');
      }
    });
  });

  describe('DidKeyUtils', () => {
    describe('joseToMulticodec()', () => {
      it('supports Ed25519 public keys', async () => {
        const multicoded = await DidKeyUtils.jwkToMulticodec({
          jwk: {
            alg : 'EdDSA',
            crv : 'Ed25519',
            kty : 'OKP',
            x   : 'lSPJrpccK4uv3f7IUCVYDz5qcUhSjiPHFyRcr5Z5VYg',
          }
        });

        expect(multicoded).to.deep.equal({ code: 237, name: 'ed25519-pub' });
      });

      it('supports Ed25519 private keys', async () => {
        const multicoded = await DidKeyUtils.jwkToMulticodec({
          jwk: {
            d   : 'fbGqifMN3h7tjLMd2gi5dggG-A2s7paNkBbdFAyGZyU',
            alg : 'EdDSA',
            crv : 'Ed25519',
            kty : 'OKP',
            x   : 'lSPJrpccK4uv3f7IUCVYDz5qcUhSjiPHFyRcr5Z5VYg',
          }
        });

        expect(multicoded).to.deep.equal({ code: 4864, name: 'ed25519-priv' });
      });

      it('supports secp256k1 public keys', async () => {
        const multicoded = await DidKeyUtils.jwkToMulticodec({
          jwk: {
            alg : 'ES256K',
            crv : 'secp256k1',
            kty : 'EC',
            x   : 'hEpfKD1BpSyoP9CYULUxD8JoTGB6Y8NNxe2cX0p_bQY',
            y   : 'SNP8nyU4iDWeu7nfcjpJ04htOgF8u94pFUzBYiPw75g',
          }
        });

        expect(multicoded).to.deep.equal({ code: 231, name: 'secp256k1-pub' });
      });

      it('supports secp256k1 private keys', async () => {
        const multicoded = await DidKeyUtils.jwkToMulticodec({
          jwk: {
            d   : 'KvnTJGCOHzsUHEaIj1gy5uOE22K-3Shpl6NYLG7TRGQ',
            alg : 'ES256K',
            crv : 'secp256k1',
            kty : 'EC',
            x   : 'hEpfKD1BpSyoP9CYULUxD8JoTGB6Y8NNxe2cX0p_bQY',
            y   : 'SNP8nyU4iDWeu7nfcjpJ04htOgF8u94pFUzBYiPw75g',
          }
        });

        expect(multicoded).to.deep.equal({ code: 4865, name: 'secp256k1-priv' });
      });

      it('supports X25519 public keys', async () => {
        const multicoded = await DidKeyUtils.jwkToMulticodec({
          jwk: {
            crv : 'X25519',
            kty : 'OKP',
            x   : 'Uszsfy4vkz9MKeflgUpQot7sJhDyco2aYWCRXKTrcQg',
          }
        });

        expect(multicoded).to.deep.equal({ code: 236, name: 'x25519-pub' });
      });

      it('supports X25519 private keys', async () => {
        const multicoded = await DidKeyUtils.jwkToMulticodec({
          jwk: {
            d   : 'MJf4AAqcwfBC68Wkb8nRbmnIdHb07zYM7vU_TAOgmtM',
            crv : 'X25519',
            kty : 'OKP',
            x   : 'Uszsfy4vkz9MKeflgUpQot7sJhDyco2aYWCRXKTrcQg',
          }
        });

        expect(multicoded).to.deep.equal({ code: 4866, name: 'x25519-priv' });
      });

      it('throws an error if unsupported JOSE has been passed', async () => {
        await expect(
          // @ts-expect-error because parameters are intentionally omitted to trigger an error.
          DidKeyUtils.jwkToMulticodec({ jwk: { crv: '123' } })
        ).to.eventually.be.rejectedWith(Error, `Unsupported JWK to Multicodec conversion: '123:public'`);
      });
    });

    describe('keyBytesToMultibaseId()', () => {
      it('returns a multibase encoded string', () => {
        const input = {
          keyBytes       : new Uint8Array(32),
          multicodecName : 'ed25519-pub',
        };
        const encoded = DidKeyUtils.keyBytesToMultibaseId({ keyBytes: input.keyBytes, multicodecName: input.multicodecName });
        expect(encoded).to.be.a.string;
        expect(encoded.substring(0, 1)).to.equal('z');
        expect(encoded.substring(1, 4)).to.equal('6Mk');
      });

      it('passes test vectors', () => {
        let input: { keyBytes: Uint8Array, multicodecName: string };
        let output: string;
        let encoded: string;

        // Test Vector 1.
        input = {
          keyBytes       : (new Uint8Array(32)).fill(0),
          multicodecName : 'ed25519-pub',
        };
        output = 'z6MkeTG3bFFSLYVU7VqhgZxqr6YzpaGrQtFMh1uvqGy1vDnP';
        encoded = DidKeyUtils.keyBytesToMultibaseId({ keyBytes: input.keyBytes, multicodecName: input.multicodecName });
        expect(encoded).to.equal(output);

        // Test Vector 2.
        input = {
          keyBytes       : (new Uint8Array(32)).fill(1),
          multicodecName : 'ed25519-pub',
        };
        output = 'z6MkeXBLjYiSvqnhFb6D7sHm8yKm4jV45wwBFRaatf1cfZ76';
        encoded = DidKeyUtils.keyBytesToMultibaseId({ keyBytes: input.keyBytes, multicodecName: input.multicodecName });
        expect(encoded).to.equal(output);

        // Test Vector 3.
        input = {
          keyBytes       : (new Uint8Array(32)).fill(9),
          multicodecName : 'ed25519-pub',
        };
        output = 'z6Mkf4XhsxSXfEAWNK6GcFu7TyVs21AfUTRjiguqMhNQeDgk';
        encoded = DidKeyUtils.keyBytesToMultibaseId({ keyBytes: input.keyBytes, multicodecName: input.multicodecName });
        expect(encoded).to.equal(output);
      });
    });

    describe('multicodecToJwk()', () => {
      it('converts ed25519 public key multicodec to JWK', async () => {
        const result = await DidKeyUtils.multicodecToJwk({ name: 'ed25519-pub' });
        expect(result).to.deep.equal({
          crv : 'Ed25519',
          kty : 'OKP',
          x   : '' // x value would be populated with actual key material in real use
        });
      });

      it('converts ed25519 private key multicodec to JWK', async () => {
        const result = await DidKeyUtils.multicodecToJwk({ name: 'ed25519-priv' });
        expect(result).to.deep.equal({
          crv : 'Ed25519',
          kty : 'OKP',
          x   : '', // x value would be populated with actual key material in real use
          d   : ''  // d value would be populated with actual key material in real use
        });
      });

      it('converts secp256k1 public key multicodec to JWK', async () => {
        const result = await DidKeyUtils.multicodecToJwk({ name: 'secp256k1-pub' });
        expect(result).to.deep.equal({
          crv : 'secp256k1',
          kty : 'EC',
          x   : '', // x value would be populated with actual key material in real use
          y   : ''  // y value would be populated with actual key material in real use
        });
      });

      it('converts secp256k1 private key multicodec to JWK', async () => {
        const result = await DidKeyUtils.multicodecToJwk({ name: 'secp256k1-priv' });
        expect(result).to.deep.equal({
          crv : 'secp256k1',
          kty : 'EC',
          x   : '', // x value would be populated with actual key material in real use
          y   : '', // y value would be populated with actual key material in real use
          d   : ''  // d value would be populated with actual key material in real use
        });
      });

      it('converts x25519 public key multicodec to JWK', async () => {
        const result = await DidKeyUtils.multicodecToJwk({ name: 'x25519-pub' });
        expect(result).to.deep.equal({
          crv : 'X25519',
          kty : 'OKP',
          x   : '' // x value would be populated with actual key material in real use
        });
      });

      it('converts x25519 private key multicodec to JWK', async () => {
        const result = await DidKeyUtils.multicodecToJwk({ name: 'x25519-priv' });
        expect(result).to.deep.equal({
          crv : 'X25519',
          kty : 'OKP',
          x   : '', // x value would be populated with actual key material in real use
          d   : ''  // d value would be populated with actual key material in real use
        });
      });

      it('throws an error when name is undefined and code is not provided', async () => {
        try {
          await DidKeyUtils.multicodecToJwk({});
          expect.fail('Should have thrown an error for undefined name and code');
        } catch (e: any) {
          expect(e.message).to.equal('Either \'name\' or \'code\' must be defined, but not both.');
        }
      });

      it('throws an error when both name and code are provided', async () => {
        try {
          await DidKeyUtils.multicodecToJwk({ name: 'ed25519-pub', code: 0xed });
          expect.fail('Should have thrown an error for both name and code being defined');
        } catch (e: any) {
          expect(e.message).to.equal('Either \'name\' or \'code\' must be defined, but not both.');
        }
      });

      it('throws an error for unsupported multicodec name', async () => {
        try {
          await DidKeyUtils.multicodecToJwk({ name: 'unsupported-key-type' });
          expect.fail('Should have thrown an error for unsupported multicodec name');
        } catch (e: any) {
          expect(e.message).to.include('Unsupported Multicodec to JWK conversion');
        }
      });

      it('throws an error for unsupported multicodec code', async () => {
        try {
          await DidKeyUtils.multicodecToJwk({ code: 0x9999 });
          expect.fail('Should have thrown an error for unsupported multicodec code');
        } catch (e: any) {
          expect(e.message).to.include('Unsupported multicodec');
        }
      });
    });

    describe('multibaseIdToKeyBytes()', () => {
      it('converts secp256k1-pub multibase identifiers', () => {
        const multibaseKeyId = 'zQ3shMrXA3Ah8h5asMM69USP8qRDnPaCLRV3nPmitAXVfWhgp';

        const { keyBytes, multicodecCode, multicodecName } = DidKeyUtils.multibaseIdToKeyBytes({ multibaseKeyId });

        expect(keyBytes).to.exist;
        expect(keyBytes).to.be.a('Uint8Array');
        expect(keyBytes).to.have.length(33);
        expect(multicodecCode).to.exist;
        expect(multicodecCode).to.equal(231);
        expect(multicodecName).to.exist;
        expect(multicodecName).to.equal('secp256k1-pub');
      });

      it('converts ed25519-pub multibase identifiers', () => {
        const multibaseKeyId = 'z6MkizSHspkM891CAnYZis1TJkB4fWwuyVjt4pV93rWPGYwW';

        const { keyBytes, multicodecCode, multicodecName } = DidKeyUtils.multibaseIdToKeyBytes({ multibaseKeyId });

        expect(keyBytes).to.exist;
        expect(keyBytes).to.be.a('Uint8Array');
        expect(keyBytes).to.have.length(32);
        expect(multicodecCode).to.exist;
        expect(multicodecCode).to.equal(237);
        expect(multicodecName).to.exist;
        expect(multicodecName).to.equal('ed25519-pub');
      });

      it('converts x25519-pub multibase identifiers', () => {
        const multibaseKeyId = 'z6LSfsF6tQA7j56WSzNPT4yrzZprzGEK8137DMeAVLgGBJEz';

        const { keyBytes, multicodecCode, multicodecName } = DidKeyUtils.multibaseIdToKeyBytes({ multibaseKeyId });

        expect(keyBytes).to.exist;
        expect(keyBytes).to.be.a('Uint8Array');
        expect(keyBytes).to.have.length(32);
        expect(multicodecCode).to.exist;
        expect(multicodecCode).to.equal(236);
        expect(multicodecName).to.exist;
        expect(multicodecName).to.equal('x25519-pub');
      });
    });

    describe('publicKeyToMultibaseId()', () => {
      it('supports Ed25519', async () => {
        const publicKey: Jwk = {
          crv : 'Ed25519',
          kty : 'OKP',
          x   : 'wwk7wOlocpOHDopgc0cZVCnl_7zFrp-JpvZe9vr5500'
        };

        const multibaseId = await DidKeyUtils.publicKeyToMultibaseId({ publicKey });

        expect(multibaseId).to.equal('z6MksabiHWJ5wQqJGDzxw1EiV5zi6BE6QRENTnHBcKHSqLaQ');
      });

      it('supports secp256k1', async () => {
        const publicKey: Jwk = {
          crv : 'secp256k1',
          kty : 'EC',
          x   : '_TihFv5t24hjWsRcdZBeEJa65hQB5aiOYmG6mMu1RZA',
          y   : 'UfiOGckhJuh9f3-Yi7g-jTILYP6vEWOSF1drwjBHebA',
        };

        const multibaseId = await DidKeyUtils.publicKeyToMultibaseId({ publicKey });

        expect(multibaseId).to.equal('zQ3sheTFzDvGpXAc9AXtwGF3MW1CusKovnwM4pSsUamqKCyLB');
      });

      it('supports X25519', async () => {
        const publicKey: Jwk = {
          crv : 'X25519',
          kty : 'OKP',
          x   : 'cuY-fEu_V1s4b8HbGzy_9VOaNtxiUPzLn6KOATdz0ks',
        };

        const multibaseId = await DidKeyUtils.publicKeyToMultibaseId({ publicKey });

        expect(multibaseId).to.equal('z6LSjQhGhqqYgrFsNFoZL9wzuKpS1xQ7YNE6fnLgSyW2hUt2');
      });

      it('throws an error for an unsupported public key type', async () => {
        await expect(
          DidKeyUtils.publicKeyToMultibaseId({
            publicKey: {
              kty : 'RSA',
              n   : 'r0YDzIV4GPJ1wFb1Gftdd3C3VE6YeknVq1C7jGypq5WTTmX0yRDBqzL6mBR3_c-mKRuE5Z5VMGniA1lFnFmv8m0A2engKfALXHPJqoL6WzqN1SyjSM2aI6v8JVTj4H0RdYV9R4jxIB-zK5X-ZyL6CwHx-3dKZkCvZSEp8b-5I8c2Fz8E8Hl7qKkD_qEz6ZOmKVhJLGiEag1qUQYJv2TcRdiyZfwwVsV3nI3IcVfMCTjDZTw2jI0YHJgLi7-MkP4DO7OJ4D4AFtL-7CkZ7V2xG0piBz4b02_-ZGnBZ5zHJxGoUZnTY6HX4V9bPQI_ME8qCjFXf-TcwCfDFcwMm70L2Q',
              e   : 'AQAB',
              alg : 'RS256'
            }
          })
        ).to.eventually.be.rejectedWith(Error, `unsupported key type`);
      });

      it('throws an error for an unsupported public key curve', async () => {
        await expect(
          DidKeyUtils.publicKeyToMultibaseId({
            publicKey: {
              kty : 'EC',
              crv : 'BLS12381_G1',
              x   : 'mIT3NuXBB_VeJUaV15hwBbMtBrMaTWcN4gnDfkzX-VuUZg3vnpB9RxxaC6vkTgJ2'
            }
          })
        ).to.eventually.be.rejectedWith(Error, `unsupported key type`);
      });
    });
  });
});
