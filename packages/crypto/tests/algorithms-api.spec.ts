import type { Web5Crypto } from '../src/types-key-manager.js';

import { expect } from 'chai';

import { CryptoKey } from '../src/kms/default/crypto-key.js';
import {
  EcdhAlgorithm,
  EcdsaAlgorithm,
  EdDsaAlgorithm,
  CryptoAlgorithm,
  NotSupportedError,
  InvalidAccessError,
  EllipticCurveAlgorithm,
} from '../src/algorithms-api/index.js';

describe('Algorithms API', () => {
  describe('CryptoAlgorithm', () => {

    class TestCryptoAlgorithm extends CryptoAlgorithm {
      public name = 'TestAlgorithm';
      public keyUsages: KeyUsage[] = ['decrypt', 'deriveBits', 'deriveKey', 'encrypt', 'sign', 'unwrapKey', 'verify', 'wrapKey'];
      public async generateKey(): Promise<Web5Crypto.CryptoKeyPair> {
        return { publicKey: {} as any, privateKey: {} as any };
      }
      public async sign(): Promise<ArrayBuffer> {
        return null as any;
      }
      public async verify(): Promise<boolean> {
        return null as any;
      }
    }

    let alg: TestCryptoAlgorithm;

    beforeEach(() => {
      alg = TestCryptoAlgorithm.create();
    });

    describe('checkAlgorithmName()', () => {
      it('does not throw with matching algorithm name', () => {
        expect(() => alg.checkAlgorithmName({
          algorithmName: 'TestAlgorithm'
        })).to.not.throw();
      });

      it('throws an error if the algorithm name does not match', () => {
        expect(() => alg.checkAlgorithmName({
          algorithmName: 'SomeOtherAlgorithm'
        })).to.throw(NotSupportedError, 'Algorithm not supported');
      });

      it('throws an error if the algorithm name is missing', () => {
        expect(() => alg.checkAlgorithmName({} as any)).to.throw(TypeError, 'Required argument missing');
      });
    });

    describe('checkCryptoKey()', () => {
      it('does not throw with a valid CryptoKey object', () => {
        const mockCryptoKey = {
          algorithm   : null,
          extractable : null,
          type        : null,
          usages      : null
        };
        expect(() => alg.checkCryptoKey({
          // @ts-expect-error because 'handle' property is intentionally omitted to support WebCrypto API CryptoKeys.
          key: mockCryptoKey
        })).to.not.throw();
      });

      it('throws an error if the algorithm name does not match', () => {
        const mockCryptoKey = {
          algorithm : null,
          type      : null,
          usages    : null
        };
        expect(() => alg.checkCryptoKey({
          // @ts-expect-error because 'extractable' property is intentionally ommitted to trigger check to throw.
          key: mockCryptoKey
        })).to.throw(TypeError, 'Object is not a CryptoKey');
      });
    });

    describe('checkKeyAlgorithm()', () => {
      it('throws an error when keyAlgorithmName is undefined', async () => {
        expect(() => alg.checkKeyAlgorithm({} as any)).to.throw(TypeError, 'Required argument missing');
      });

      it('throws an error when keyAlgorithmName does not match', async () => {
        const wrongName = 'wrongName';
        expect(() => alg.checkKeyAlgorithm({ keyAlgorithmName: wrongName })).to.throw(InvalidAccessError, `Algorithm '${alg.name}' does not match the provided '${wrongName}' key.`);
      });

      it('does not throw an error when keyAlgorithmName matches', async () => {
        const correctName = alg.name;
        expect(() => alg.checkKeyAlgorithm({ keyAlgorithmName: correctName })).not.to.throw();
      });
    });

    describe('checkKeyType()', () => {
      it('throws an error when keyType or allowedKeyType is undefined', async () => {
        expect(() => alg.checkKeyType({} as any)).to.throw(TypeError, 'One or more required arguments missing');
        expect(() => alg.checkKeyType({ keyType: 'public' } as any)).to.throw(TypeError, 'One or more required arguments missing');
        expect(() => alg.checkKeyType({ allowedKeyType: 'public' } as any)).to.throw(TypeError, 'One or more required arguments missing');
      });

      it('throws an error when keyType does not match allowedKeyType', async () => {
        const keyType = 'public';
        const allowedKeyType = 'private';
        expect(() => alg.checkKeyType({ keyType, allowedKeyType })).to.throw(InvalidAccessError, 'Requested operation is not valid');
      });

      it('does not throw an error when keyType matches allowedKeyType', async () => {
        const keyType = 'public';
        const allowedKeyType = 'public';
        expect(() => alg.checkKeyType({ keyType, allowedKeyType })).not.to.throw();
      });
    });

    describe('checkKeyUsages()', () => {
      it('throws an error when keyUsages is undefined or empty', async () => {
        expect(() => alg.checkKeyUsages({ allowedKeyUsages: ['sign'] } as any)).to.throw(TypeError, 'required parameter was missing or empty');
        expect(() => alg.checkKeyUsages({ keyUsages: [], allowedKeyUsages: ['sign'] })).to.throw(TypeError, 'required parameter was missing or empty');
      });

      it('throws an error when keyUsages are not in allowedKeyUsages', async () => {
        const keyUsages: Web5Crypto.KeyUsage[] = ['encrypt', 'decrypt'];
        const allowedKeyUsages: Web5Crypto.KeyUsage[] = ['sign', 'verify'];
        expect(() => alg.checkKeyUsages({ keyUsages, allowedKeyUsages })).to.throw(InvalidAccessError, 'is not valid for the provided key');

        const keyPairUsages: Web5Crypto.KeyPairUsage = { privateKey: ['sign'], publicKey: ['verify'] };
        expect(() => alg.checkKeyUsages({ keyUsages, allowedKeyUsages: keyPairUsages })).to.throw(InvalidAccessError, 'is not valid for the provided key');
      });

      it('does not throw an error when keyUsages are in allowedKeyUsages', async () => {
        const keyUsages: Web5Crypto.KeyUsage[] = ['sign', 'verify'];
        const allowedKeyUsages: Web5Crypto.KeyUsage[] = ['sign', 'verify', 'encrypt', 'decrypt'];
        expect(() => alg.checkKeyUsages({ keyUsages, allowedKeyUsages })).not.to.throw();

        const keyPairUsages: Web5Crypto.KeyPairUsage = { privateKey: ['sign'], publicKey: ['verify'] };
        expect(() => alg.checkKeyUsages({ keyUsages, allowedKeyUsages: keyPairUsages })).to.not.throw;
      });
    });
  });

  describe('EllipticCurveAlgorithm', () => {

    describe('checkGenerateKey()', () => {
      class TestEllipticCurveAlgorithm extends EllipticCurveAlgorithm {
        public name = 'TestAlgorithm';
        public namedCurves = ['curveA'];
        public keyUsages: KeyUsage[] = ['decrypt']; // Intentionally specify no permitted key usages for this test.
        public async generateKey(): Promise<Web5Crypto.CryptoKeyPair> {
          return { publicKey: {} as any, privateKey: {} as any };
        }
        public async sign(): Promise<ArrayBuffer> {
          return null as any;
        }
        public async verify(): Promise<boolean> {
          return null as any;
        }
      }

      let alg: TestEllipticCurveAlgorithm;

      beforeEach(() => {
        alg = TestEllipticCurveAlgorithm.create();
      });

      it('does not throw with supported algorithm, named curve, and key usage', () => {
        expect(() => alg.checkGenerateKey({
          algorithm : { name: 'TestAlgorithm', namedCurve: 'curveA' },
          keyUsages : ['decrypt']
        })).to.not.throw();
      });

      it('throws an error when unsupported algorithm specified', () => {
        expect(() => alg.checkGenerateKey({
          algorithm : { name: 'ECDH', namedCurve: 'X25519' },
          keyUsages : ['sign']
        })).to.throw(NotSupportedError, 'Algorithm not supported');
      });

      it('throws an error when unsupported named curve specified', () => {
        expect(() => alg.checkGenerateKey({
          algorithm : { name: 'TestAlgorithm', namedCurve: 'X25519' },
          keyUsages : ['sign']
        })).to.throw(TypeError, 'Out of range');
      });

      it('throws an error when the requested operation is not valid', () => {
        ['sign', 'verify'].forEach((operation) => {
          expect(() => alg.checkGenerateKey({
            algorithm : { name: 'TestAlgorithm', namedCurve: 'curveA' },
            keyUsages : [operation as KeyUsage]
          })).to.throw(InvalidAccessError, 'Requested operation');
        });
      });
    });

    describe('EcdhAlgorithm', () => {
      describe('checkAlgorithmOptions()', () => {

        const testEcdhAlgorithm = Reflect.construct(EcdhAlgorithm, []) as EcdhAlgorithm;

        it('does not throw with matching algorithm name and valid publicKey', () => {
          const ecdhPublicKey = new CryptoKey({ name: 'ECDH', namedCurve: 'X25519' }, false, new ArrayBuffer(32), 'public', ['deriveBits', 'deriveKey']);
          testEcdhAlgorithm.checkAlgorithmOptions({ algorithm: {
            name      : 'ECDH',
            publicKey : ecdhPublicKey
          }});
        });

        it('throws an error when unsupported algorithm specified', () => {
          const ecdhPublicKey = new CryptoKey({ name: 'ECDH', namedCurve: 'X25519' }, false, new ArrayBuffer(32), 'public', ['deriveBits', 'deriveKey']);
          expect(() => testEcdhAlgorithm.checkAlgorithmOptions({ algorithm: {
            name      : 'Nope',
            publicKey : ecdhPublicKey
          }})).to.throw(NotSupportedError, 'Algorithm not supported');
        });

        it('throws an error if the publicKey property is missing', () => {
          // @ts-expect-error because `publicKey` property is intentionally omitted.
          expect(() => testEcdhAlgorithm.checkAlgorithmOptions({ algorithm: {
            name: 'ECDH'
          }})).to.throw(TypeError, 'Required parameter was missing');
        });

        it('throws an error if the given publicKey is not valid', () => {
          const ecdhPublicKey = new CryptoKey({ name: 'ECDH', namedCurve: 'X25519' }, false, new ArrayBuffer(32), 'public', ['deriveBits', 'deriveKey']);
          // @ts-ignore-error because a required property is being intentionally deleted to trigger the check to throw.
          delete ecdhPublicKey.extractable;
          expect(() => testEcdhAlgorithm.checkAlgorithmOptions({ algorithm: {
            name      : 'ECDH',
            publicKey : ecdhPublicKey
          }})).to.throw(TypeError, 'Object is not a CryptoKey');
        });

        it('throws an error if the algorithm of the publicKey does not match', () => {
          const ecdhPublicKey = new CryptoKey({ name: 'Nope', namedCurve: 'X25519' }, false, new ArrayBuffer(32), 'public', ['deriveBits', 'deriveKey']);
          expect(() => testEcdhAlgorithm.checkAlgorithmOptions({ algorithm: {
            name      : 'ECDH',
            publicKey : ecdhPublicKey
          }})).to.throw(InvalidAccessError, 'does not match');
        });

        it('throws an error if a private key is specified as the publicKey', () => {
          const ecdhPrivateKey = new CryptoKey({ name: 'ECDH', namedCurve: 'X25519' }, false, new ArrayBuffer(32), 'private', ['deriveBits', 'deriveKey']);
          expect(() => testEcdhAlgorithm.checkAlgorithmOptions({ algorithm: {
            name      : 'ECDH',
            publicKey : ecdhPrivateKey
          }})).to.throw(InvalidAccessError, 'Requested operation is not valid');
        });
      });
    });

    describe('EcdsaAlgorithm', () => {
      describe('checkAlgorithmOptions()', () => {
        const testEcdsaAlgorithm = Reflect.construct(EcdsaAlgorithm, []) as EcdsaAlgorithm;
        // @ts-expect-error because `hashAlgorithms` is a read-only property.
        testEcdsaAlgorithm.hashAlgorithms = ['SHA-256'];

        it('does not throw with matching algorithm name and valid hash algorithm', () => {
          testEcdsaAlgorithm.checkAlgorithmOptions({ algorithm: {
            name : 'ECDSA',
            hash : 'SHA-256'
          }});
        });

        it('throws an error when unsupported algorithm specified', () => {
          expect(() => testEcdsaAlgorithm.checkAlgorithmOptions({ algorithm: {
            name : 'Nope',
            hash : 'SHA-256'
          }})).to.throw(NotSupportedError, 'Algorithm not supported');
        });

        it('throws an error if the hash property is missing', () => {
          // @ts-expect-error because `hash` property is intentionally omitted.
          expect(() => testEcdsaAlgorithm.checkAlgorithmOptions({ algorithm: {
            name: 'ECDSA',
          }})).to.throw(TypeError, 'Required parameter was missing');
        });

        it('throws an error if the given hash algorithm is not supported', () => {
          const ecdhPublicKey = new CryptoKey({ name: 'ECDH', namedCurve: 'X25519' }, false, new ArrayBuffer(32), 'public', ['deriveBits', 'deriveKey']);
          // @ts-ignore-error because a required property is being intentionally deleted to trigger the check to throw.
          delete ecdhPublicKey.extractable;
          expect(() => testEcdsaAlgorithm.checkAlgorithmOptions({ algorithm: {
            name : 'ECDSA',
            hash : 'SHA-1234'
          }})).to.throw(TypeError, 'Out of range');
        });
      });
    });

    describe('EdDsaAlgorithm', () => {
      describe('checkAlgorithmOptions()', () => {
        const testEdDsaAlgorithm = Reflect.construct(EdDsaAlgorithm, []) as EdDsaAlgorithm;

        it('does not throw with matching algorithm name', () => {
          testEdDsaAlgorithm.checkAlgorithmOptions({ algorithm: {
            name: 'EdDSA'
          }});
        });

        it('throws an error when unsupported algorithm specified', () => {
          expect(() => testEdDsaAlgorithm.checkAlgorithmOptions({ algorithm: {
            name: 'Nope'
          }})).to.throw(NotSupportedError, 'Algorithm not supported');
        });
      });
    });
  });
});