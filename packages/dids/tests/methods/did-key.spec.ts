import type { Jwk } from '@web5/crypto';

import { expect } from 'chai';
import { LocalKeyManager } from '@web5/crypto';

import type { DidDocument } from '../../src/types/did-core.js';
import type { PortableDid } from '../../src/types/portable-did.js';

import { DidErrorCode } from '../../src/did-error.js';
import { DidKey, DidKeyUtils } from '../../src/methods/did-key.js';

describe('DidKey', () => {
  let keyManager: LocalKeyManager;

  before(() => {
    keyManager = new LocalKeyManager();
  });

  describe('create()', () => {
    it('creates a did:key DID', async () => {
      const did = await DidKey.create({ keyManager, options: { algorithm: 'Ed25519' } });

      expect(did).to.have.property('document');
      expect(did).to.have.property('getSigner');
      expect(did).to.have.property('keyManager');
      expect(did).to.have.property('metadata');
      expect(did).to.have.property('uri');
      expect(did.uri.startsWith('did:key:')).to.be.true;
      expect(did.document.verificationMethod).to.have.length(1);
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
      const keyUri = await keyManager.getKeyUri({ key: did.document.verificationMethod![0]!.publicKeyJwk! });
      const publicKey = await keyManager.getPublicKey({ keyUri });

      // Verify the public key is an secp256k1 key.
      expect(publicKey).to.have.property('crv', 'secp256k1');
    });

    it('creates a DID using the verificationMethods algorithm property, if given', async () => {
      const did = await DidKey.create({ keyManager, options: { verificationMethods: [{ algorithm: 'secp256k1' }] } });

      // Retrieve the public key from the key manager.
      const keyUri = await keyManager.getKeyUri({ key: did.document.verificationMethod![0]!.publicKeyJwk! });
      const publicKey = await keyManager.getPublicKey({ keyUri });

      // Verify the public key is an secp256k1 key.
      expect(publicKey).to.have.property('crv', 'secp256k1');
    });

    it('creates a DID with an Ed25519 key, by default', async () => {
      const did = await DidKey.create({ keyManager });

      // Retrieve the public key from the key manager.
      const keyUri = await keyManager.getKeyUri({ key: did.document.verificationMethod![0]!.publicKeyJwk! });
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

    it('supports multibase and JWK public key format', async () => {
      let did = await DidKey.create({ keyManager, options: { publicKeyFormat: 'JsonWebKey2020' } });
      expect(did.document.verificationMethod![0]!.publicKeyJwk).to.exist;
      expect(did.document.verificationMethod![0]!.publicKeyMultibase).to.not.exist;

      did = await DidKey.create({ keyManager, options: { publicKeyFormat: 'Ed25519VerificationKey2020' } });
      expect(did.document.verificationMethod![0]!.publicKeyJwk).to.not.exist;
      expect(did.document.verificationMethod![0]!.publicKeyMultibase).to.exist;
    });

    it('accepts an alternate default context', async () => {
      const did = await DidKey.create({
        options: {
          defaultContext  : 'https://www.w3.org/ns/did/v99',
          publicKeyFormat : 'JsonWebKey2020'
        }
      });

      expect(did.document['@context']).to.not.include('https://www.w3.org/ns/did/v1');
      expect(did.document['@context']).to.include('https://www.w3.org/ns/did/v99');
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

    it('throws an error if zero verificationMethods are given', async () => {
      try {
        await DidKey.create({ keyManager, options: { verificationMethods: [] } });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('must contain exactly one entry');
      }
    });

    it('throws an error if two or more verificationMethods are given', async () => {
      try {
        await DidKey.create({
          keyManager,
          options: { verificationMethods: [{ algorithm: 'secp256k1' }, { algorithm: 'Ed25519' }] }
        });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('must contain exactly one entry');
      }
    });
  });

  describe('export()', () => {
    it('returns a single verification method for a DID', async () => {
      // Create a DID to use for the test.
      const did = await DidKey.create();

      const portableDid = await did.export();

      expect(portableDid.document).to.have.property('verificationMethod');
      expect(portableDid.document.verificationMethod).to.have.length(1);
      expect(portableDid.document.verificationMethod![0]).to.have.property('publicKeyJwk');
      expect(portableDid.document.verificationMethod![0]).to.have.property('type');
      expect(portableDid.document.verificationMethod![0]).to.have.property('id');
      expect(portableDid.document.verificationMethod![0]).to.have.property('controller');
      expect(portableDid.privateKeys).to.have.length(1);
      expect(portableDid.privateKeys![0]).to.have.property('crv');
      expect(portableDid.privateKeys![0]).to.have.property('x');
      expect(portableDid.privateKeys![0]).to.have.property('d');
    });
  });

  describe('getSigningMethod()', () => {
    it('returns the signing method for a DID', async () => {
      // Create a DID to use for the test.
      const did = await DidKey.create();

      const signingMethod = await DidKey.getSigningMethod({ didDocument: did.document });

      expect(signingMethod).to.have.property('type', 'JsonWebKey2020');
      expect(signingMethod).to.have.property('id');
      expect(signingMethod!.id).to.include(did.uri);
      expect(signingMethod).to.have.property('controller', did.uri);
    });

    it('returns the first assertionMethod verification method', async function () {
      const verificationMethod = await DidKey.getSigningMethod({
        didDocument: {
          id                 : 'did:key:123',
          verificationMethod : [
            {
              id           : 'did:key:123#0',
              type         : 'JsonWebKey2020',
              controller   : 'did:key:123',
              publicKeyJwk : {} as Jwk
            }
          ],
          assertionMethod: ['did:key:123#0']
        }
      });

      expect(verificationMethod).to.exist;
      expect(verificationMethod).to.have.property('id', 'did:key:123#0');
    });

    it('throws an error if the DID document is missing verification methods', async function () {
      try {
        await DidKey.getSigningMethod({
          didDocument: { id: 'did:key:123' }
        });
        expect.fail('Error should have been thrown');
      } catch (error: any) {
        expect(error.message).to.include('verification method intended for signing could not be determined');
      }
    });

    it('throws an error if there is no assertionMethod verification method', async function () {
      try {
        await DidKey.getSigningMethod({
          didDocument: {
            id                 : 'did:key:123',
            verificationMethod : [
              {
                id           : 'did:key:123#0',
                type         : 'JsonWebKey2020',
                controller   : 'did:key:123',
                publicKeyJwk : {} as Jwk
              }
            ],
            authentication: ['did:key:123#0']
          }
        });
        expect.fail('Error should have been thrown');
      } catch (error: any) {
        expect(error.message).to.include('verification method intended for signing could not be determined');
      }
    });

    it('throws an error if the only assertionMethod method is embedded', async function () {
      try {
        await DidKey.getSigningMethod({
          didDocument: {
            id                 : 'did:key:123',
            verificationMethod : [
              {
                id           : 'did:key:123#0',
                type         : 'JsonWebKey2020',
                controller   : 'did:key:123',
                publicKeyJwk : {} as Jwk
              }
            ],
            assertionMethod: [
              {
                id           : 'did:key:123#1',
                type         : 'JsonWebKey2020',
                controller   : 'did:key:123',
                publicKeyJwk : {} as Jwk
              }
            ],
            authentication: ['did:key:123#0']
          }
        });
        expect.fail('Error should have been thrown');
      } catch (error: any) {
        expect(error.message).to.include('verification method intended for signing could not be determined');
      }
    });

    it('throws an error if a non-key method is used', async function () {
      // Example DID Document with a non-key method
      const didDocument: DidDocument = {
        '@context'         : 'https://www.w3.org/ns/did/v1',
        id                 : 'did:example:123',
        verificationMethod : [
          {
            id           : 'did:example:123#0',
            type         : 'JsonWebKey2020',
            controller   : 'did:example:123',
            publicKeyJwk : {} as Jwk
          }
        ],
      };

      try {
        await DidKey.getSigningMethod({ didDocument });
        expect.fail('Error should have been thrown');
      } catch (error: any) {
        expect(error.message).to.equal('Method not supported: example');
      }
    });
  });

  describe('import()', () => {
    let portableDid: PortableDid;

    beforeEach(() => {
      // Define a DID to use for the test.
      portableDid = {
        uri      : 'did:key:z6MkfEC95uQzsxT6E6oERYyY5UMqgYugQ5YdxCw5h9RPPSGU',
        document : {
          id                 : 'did:key:z6MkfEC95uQzsxT6E6oERYyY5UMqgYugQ5YdxCw5h9RPPSGU',
          verificationMethod : [
            {
              id           : 'did:key:z6MkfEC95uQzsxT6E6oERYyY5UMqgYugQ5YdxCw5h9RPPSGU#z6MkfEC95uQzsxT6E6oERYyY5UMqgYugQ5YdxCw5h9RPPSGU',
              type         : 'JsonWebKey2020',
              controller   : 'did:key:z6MkfEC95uQzsxT6E6oERYyY5UMqgYugQ5YdxCw5h9RPPSGU',
              publicKeyJwk : {
                kty : 'OKP',
                crv : 'Ed25519',
                x   : 'C4K4f9q7m-ObUYEZBZm4bD9maKUYnjcIzUI-JWkai9U',
                kid : 'bSmUGl3783WDG3U8uGxKw6Vh1ikHJ-qoap2EEw4VhKA',
              },
            },
          ],
          authentication: [
            'did:key:z6MkfEC95uQzsxT6E6oERYyY5UMqgYugQ5YdxCw5h9RPPSGU#z6MkfEC95uQzsxT6E6oERYyY5UMqgYugQ5YdxCw5h9RPPSGU',
          ],
          assertionMethod: [
            'did:key:z6MkfEC95uQzsxT6E6oERYyY5UMqgYugQ5YdxCw5h9RPPSGU#z6MkfEC95uQzsxT6E6oERYyY5UMqgYugQ5YdxCw5h9RPPSGU',
          ],
          capabilityInvocation: [
            'did:key:z6MkfEC95uQzsxT6E6oERYyY5UMqgYugQ5YdxCw5h9RPPSGU#z6MkfEC95uQzsxT6E6oERYyY5UMqgYugQ5YdxCw5h9RPPSGU',
          ],
          capabilityDelegation: [
            'did:key:z6MkfEC95uQzsxT6E6oERYyY5UMqgYugQ5YdxCw5h9RPPSGU#z6MkfEC95uQzsxT6E6oERYyY5UMqgYugQ5YdxCw5h9RPPSGU',
          ],
          '@context': [
            'https://www.w3.org/ns/did/v1',
            'https://w3id.org/security/suites/jws-2020/v1',
          ],
        },
        metadata: {
        },
        privateKeys: [
          {
            crv : 'Ed25519',
            d   : 'a-pqjsKCMFnbFZSyg8GKXfDgop1G2kvp910f3WRvuVs',
            kty : 'OKP',
            x   : 'C4K4f9q7m-ObUYEZBZm4bD9maKUYnjcIzUI-JWkai9U',
            kid : 'bSmUGl3783WDG3U8uGxKw6Vh1ikHJ-qoap2EEw4VhKA',
            alg : 'EdDSA',
          },
        ],
      };
    });

    it('returns a BearerDid from the given DID JWK PortableDid', async () => {
      const did = await DidKey.import({ portableDid });

      expect(did).to.have.property('document');
      expect(did).to.have.property('getSigner');
      expect(did).to.have.property('keyManager');
      expect(did).to.have.property('metadata');
      expect(did).to.have.property('uri', portableDid.uri);
      expect(did.document).to.deep.equal(portableDid.document);
    });

    it('returns a DID with a getSigner function that can sign and verify data', async () => {
      const did = await DidKey.import({ portableDid });
      const signer = await did.getSigner();
      const data = new Uint8Array([1, 2, 3]);
      const signature = await signer.sign({ data });
      const isValid = await signer.verify({ data, signature });

      expect(signature).to.have.length(64);
      expect(isValid).to.be.true;
    });

    it('throws an error if the DID method is not supported', async () => {
      // Change the method to something other than 'key'.
      portableDid.uri = 'did:unknown:abc123';

      try {
        await DidKey.import({ portableDid });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.code).to.equal(DidErrorCode.MethodNotSupported);
        expect(error.message).to.include('Method not supported');
      }
    });

    it('throws an error if the DID method cannot be determined', async () => {
      // An unparsable DID URI.
      portableDid.uri = 'did:abc123';

      try {
        await DidKey.import({ portableDid });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.code).to.equal(DidErrorCode.MethodNotSupported);
        expect(error.message).to.include('Method not supported');
      }
    });

    it('throws an error if the DID document contains two or more verification methods', async () => {
      // Add a second verification method to the DID document.
      portableDid.document.verificationMethod?.push(portableDid.document.verificationMethod[0]);

      try {
        await DidKey.import({ portableDid });
        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.code).to.equal(DidErrorCode.InvalidDidDocument);
        expect(error.message).to.include('DID document must contain exactly one verification method');
      }
    });
  });

  describe('resolve()', () => {
    it('derives a key agreement verification method when enableEncryptionKeyDerivation is true', async function () {
      const did = 'did:key:z6MkpUzNmYVTGpqhStxK8yRKXWCRNm1bGYz8geAg2zmjYHKX';
      const resolutionResult = await DidKey.resolve(did, { enableEncryptionKeyDerivation: true });

      expect(resolutionResult.didDocument?.verificationMethod).to.have.length(2);
      expect(resolutionResult.didDocument?.verificationMethod![0]!.publicKeyJwk).to.have.property('crv', 'Ed25519');
      expect(resolutionResult.didDocument?.verificationMethod![1]!.publicKeyJwk).to.have.property('crv', 'X25519');
      expect(resolutionResult.didDocument?.verificationMethod![1]!.id).to.equal(resolutionResult.didDocument?.keyAgreement![0]);
    });

    it('returns an error due to DID parsing failing', async function () {
      const invalidDidUri = 'did:invalidFormat';
      const resolutionResult = await DidKey.resolve(invalidDidUri);
      expect(resolutionResult.didResolutionMetadata.error).to.equal('invalidDid');
    });

    it('returns an error due to failing to decode the multibase identifier', async function () {
      const didUriWithInvalidEncoding = 'did:key:invalidEncoding';
      const resolutionResult = await DidKey.resolve(didUriWithInvalidEncoding);
      expect(resolutionResult.didResolutionMetadata.error).to.equal('invalidDid');
    });

    it('returns an error because the DID method is not "key"', async function () {
      const didUriWithDifferentMethod = 'did:notkey:eyJmb28iOiJiYXIifQ';
      const resolutionResult = await DidKey.resolve(didUriWithDifferentMethod);
      expect(resolutionResult.didResolutionMetadata.error).to.equal(DidErrorCode.MethodNotSupported);
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