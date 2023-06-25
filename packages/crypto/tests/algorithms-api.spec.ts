import type { Web5Crypto } from '../src/types-key-manager.js';

import { expect } from 'chai';

import {
  CryptoKey,
  AesAlgorithm,
  EcdhAlgorithm,
  EcdsaAlgorithm,
  EdDsaAlgorithm,
  OperationError,
  AesCtrAlgorithm,
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
      public async deriveBits(): Promise<ArrayBuffer> {
        return null as any;
      }
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
        expect(() => alg.checkKeyUsages({ keyUsages, allowedKeyUsages: keyPairUsages })).to.not.throw();
      });
    });
  });

  describe('AesAlgorithm', () => {
    describe('checkGenerateKey()', () => {
      class TestAesAlgorithm extends AesAlgorithm {
        public name = 'TestAlgorithm';
        public keyUsages: KeyUsage[] = ['encrypt'];
        public async deriveBits(): Promise<ArrayBuffer> {
          return null as any;
        }
        public async generateKey(): Promise<Web5Crypto.CryptoKey> {
          return null as any;
        }
        public async sign(): Promise<ArrayBuffer> {
          return null as any;
        }
        public async verify(): Promise<boolean> {
          return null as any;
        }
      }

      let alg: TestAesAlgorithm;

      beforeEach(() => {
        alg = TestAesAlgorithm.create();
      });

      it('does not throw with supported algorithm, length, and key usage', () => {
        expect(() => alg.checkGenerateKey({
          algorithm : { name: 'TestAlgorithm', length: 128 },
          keyUsages : ['encrypt']
        })).to.not.throw();
      });

      it('throws an error when unsupported algorithm specified', () => {
        expect(() => alg.checkGenerateKey({
          algorithm : { name: 'ECDSA', length: 128 },
          keyUsages : ['encrypt']
        })).to.throw(NotSupportedError, 'Algorithm not supported');
      });

      it('throws an error when the length property is missing', () => {
        expect(() => alg.checkGenerateKey({
          // @ts-expect-error because length was intentionally omitted.
          algorithm : { name: 'TestAlgorithm' },
          keyUsages : ['encrypt']
        })).to.throw(TypeError, 'Required parameter was missing');
      });

      it('throws an error when the specified length is not a Number', () => {
        expect(() => alg.checkGenerateKey({
          // @ts-expect-error because length is intentionally set as a string instead of number.
          algorithm : { name: 'TestAlgorithm', length: '256' },
          keyUsages : ['encrypt']
        })).to.throw(TypeError, `is not of type: Number`);
      });

      it('throws an error when the specified length is not valid', () => {
        [64, 96, 160, 224, 512].forEach((length) => {
          expect(() => alg.checkGenerateKey({
            algorithm : { name: 'TestAlgorithm', length },
            keyUsages : ['encrypt']
          })).to.throw(OperationError, `Algorithm 'length' must be 128, 192, or 256`);
        });
      });

      it('throws an error when the requested operation is not valid', () => {
        ['sign', 'verify'].forEach((operation) => {
          expect(() => alg.checkGenerateKey({
            algorithm : { name: 'TestAlgorithm', length: 128 },
            keyUsages : [operation as KeyUsage]
          })).to.throw(InvalidAccessError, 'Requested operation');
        });
      });
    });

    describe('AesCtrAlgorithm', () => {
      let alg: AesCtrAlgorithm;

      before(() => {
        alg = Reflect.construct(AesCtrAlgorithm, []) as AesCtrAlgorithm;
      });

      describe('checkAlgorithmOptions()', () => {
        it('does not throw with matching algorithm name and valid counter and length', () => {
          expect(() => alg.checkAlgorithmOptions({ algorithm: {
            name    : 'AES-CTR',
            counter : new ArrayBuffer(16),
            length  : 128
          }})).to.not.throw();
        });

        it('throws an error when unsupported algorithm specified', () => {
          expect(() => alg.checkAlgorithmOptions({ algorithm: {
            name    : 'Nope',
            counter : new ArrayBuffer(16),
            length  : 128
          }})).to.throw(NotSupportedError, 'Algorithm not supported');
        });

        it('throws an error if the counter property is missing', () => {
        // @ts-expect-error because `counter` property is intentionally omitted.
          expect(() => alg.checkAlgorithmOptions({ algorithm: {
            name   : 'AES-CTR',
            length : 128
          }})).to.throw(TypeError, 'Required parameter was missing');
        });

        it('accepts counter as ArrayBuffer, DataView, and TypedArray', () => {
          const dataU8A = new Uint8Array(16);

          // ArrayBuffer
          const dataArrayBuffer = dataU8A.buffer;
          expect(() => alg.checkAlgorithmOptions({ algorithm: {
            name    : 'AES-CTR',
            counter : dataArrayBuffer,
            length  : 128
          }})).to.not.throw();

          // DataView
          const dataView = new DataView(dataArrayBuffer);
          expect(() => alg.checkAlgorithmOptions({ algorithm: {
            name    : 'AES-CTR',
            counter : dataView,
            length  : 128
          }})).to.not.throw();

          // TypedArray - Uint8Array
          expect(() => alg.checkAlgorithmOptions({ algorithm: {
            name    : 'AES-CTR',
            counter : dataU8A,
            length  : 128
          }})).to.not.throw();

          // TypedArray - Int8Array
          const dataI8A = new Int8Array(16);
          expect(() => alg.checkAlgorithmOptions({ algorithm: {
            name    : 'AES-CTR',
            counter : dataI8A,
            length  : 128
          }})).to.not.throw();
        });

        it('throws error if counter is not acceptable data type', () => {
          expect(() => alg.checkAlgorithmOptions({ algorithm: {
            name    : 'AES-CTR',
            // @ts-expect-error because counter is being intentionally set to the wrong data type to trigger an error.
            counter : new Set([...Array(16).keys()].map(n => n.toString(16))),
            length  : 128
          }})).to.throw(TypeError, 'is not of type');
        });

        it('throws error if initial value of the counter block is not 16 bytes', () => {
          expect(() => alg.checkAlgorithmOptions({ algorithm: {
            name    : 'AES-CTR',
            counter : new ArrayBuffer(128),
            length  : 128
          }})).to.throw(OperationError, 'must have length');
        });

        it('throws an error if the length property is missing', () => {
          // @ts-expect-error because lengthy property was intentionally omitted.
          expect(() => alg.checkAlgorithmOptions({ algorithm: {
            name    : 'AES-CTR',
            counter : new ArrayBuffer(16)
          }})).to.throw(TypeError, 'Required parameter was missing');
        });

        it('throws an error if length is not a Number', () => {
          expect(() => alg.checkAlgorithmOptions({ algorithm: {
            name    : 'AES-CTR',
            counter : new ArrayBuffer(16),
            // @ts-expect-error because length is being intentionally specified as a string instead of a number.
            length  : '128'
          }})).to.throw(TypeError, 'is not of type');
        });

        it('throws an error if length is not between 1 and 128', () => {
          expect(() => alg.checkAlgorithmOptions({ algorithm: {
            name    : 'AES-CTR',
            counter : new ArrayBuffer(16),
            length  : 0
          }})).to.throw(OperationError, 'should be in the range');

          expect(() => alg.checkAlgorithmOptions({ algorithm: {
            name    : 'AES-CTR',
            counter : new ArrayBuffer(16),
            length  : 256
          }})).to.throw(OperationError, 'should be in the range');
        });
      });

      describe('deriveBits()', () => {
        it(`throws an error because 'deriveBits' operation is valid for AES-CTR keys`, async () => {
          await expect(alg.deriveBits()).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for AES-CTR');
        });
      });

      describe('sign()', () => {
        it(`throws an error because 'sign' operation is valid for AES-CTR keys`, async () => {
          await expect(alg.sign()).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for AES-CTR');
        });
      });

      describe('verify()', () => {
        it(`throws an error because 'verify' operation is valid for AES-CTR keys`, async () => {
          await expect(alg.verify()).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for AES-CTR');
        });
      });
    });
  });

  describe('EllipticCurveAlgorithm', () => {
    describe('checkGenerateKey()', () => {
      class TestEllipticCurveAlgorithm extends EllipticCurveAlgorithm {
        public name = 'TestAlgorithm';
        public namedCurves = ['curveA'];
        public keyUsages: KeyUsage[] = ['decrypt'];
        public async deriveBits(): Promise<ArrayBuffer> {
          return null as any;
        }
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
      let alg: EcdhAlgorithm;

      before(() => {
        alg = Reflect.construct(EcdhAlgorithm, []) as EcdhAlgorithm;
      });

      describe('checkAlgorithmOptions()', () => {

        let otherPartyPublicKey: Web5Crypto.CryptoKey;
        let ownPrivateKey: Web5Crypto.CryptoKey;

        beforeEach(() => {
          otherPartyPublicKey = new CryptoKey({ name: 'ECDH', namedCurve: 'X25519' }, false, new ArrayBuffer(32), 'public', ['deriveBits', 'deriveKey']);
          ownPrivateKey = new CryptoKey({ name: 'ECDH', namedCurve: 'X25519' }, false, new ArrayBuffer(32), 'private', ['deriveBits', 'deriveKey']);
        });

        it('does not throw with matching algorithm name and valid publicKey and baseKey', () => {
          expect(() => alg.checkAlgorithmOptions({
            algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
            baseKey   : ownPrivateKey
          })).to.not.throw();
        });

        it('throws an error when unsupported algorithm specified', () => {
          expect(() => alg.checkAlgorithmOptions({
            algorithm : { name: 'non-existent-algorithm', publicKey: otherPartyPublicKey },
            baseKey   : ownPrivateKey
          })).to.throw(NotSupportedError, 'Algorithm not supported');
        });

        it('throws an error if the publicKey property is missing', () => {
          expect(() => alg.checkAlgorithmOptions({
            // @ts-expect-error because `publicKey` property is intentionally omitted.
            algorithm : { name: 'ECDH' },
            baseKey   : ownPrivateKey
          })).to.throw(TypeError, `Required parameter was missing: 'publicKey'`);
        });

        it('throws an error if the given publicKey is not valid', () => {
          // @ts-ignore-error because a required property is being intentionally deleted to trigger the check to throw.
          delete otherPartyPublicKey.extractable;
          expect(() => alg.checkAlgorithmOptions({
            algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
            baseKey   : ownPrivateKey
          })).to.throw(TypeError, 'Object is not a CryptoKey');
        });

        it('throws an error if the algorithm of the publicKey does not match', () => {
          const otherPartyPublicKey = new CryptoKey({ name: 'Nope', namedCurve: 'X25519' }, false, new ArrayBuffer(32), 'public', ['deriveBits', 'deriveKey']);
          expect(() => alg.checkAlgorithmOptions({
            algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
            baseKey   : ownPrivateKey
          })).to.throw(InvalidAccessError, 'does not match');
        });

        it('throws an error if a private key is specified as the publicKey', () => {
          const ecdhPrivateKey = new CryptoKey({ name: 'ECDH', namedCurve: 'X25519' }, false, new ArrayBuffer(32), 'private', ['deriveBits', 'deriveKey']);
          expect(() => alg.checkAlgorithmOptions({
            algorithm : { name: 'ECDH', publicKey: ecdhPrivateKey },
            baseKey   : ownPrivateKey
          })).to.throw(InvalidAccessError, 'Requested operation is not valid');
        });

        it('throws an error if the baseKey property is missing', () => {
          // @ts-expect-error because `baseKey` property is intentionally omitted.
          expect(() => alg.checkAlgorithmOptions({
            algorithm: { name: 'ECDH', publicKey: otherPartyPublicKey  }
          })).to.throw(TypeError, `Required parameter was missing: 'baseKey'`);
        });

        it('throws an error if the given baseKey is not valid', () => {
          // @ts-ignore-error because a required property is being intentionally deleted to trigger the check to throw.
          delete ownPrivateKey.extractable;
          expect(() => alg.checkAlgorithmOptions({
            algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
            baseKey   : ownPrivateKey
          })).to.throw(TypeError, 'Object is not a CryptoKey');
        });

        it('throws an error if the algorithm of the baseKey does not match', () => {
          const ownPrivateKey = new CryptoKey({ name: 'non-existent-algorithm', namedCurve: 'X25519' }, false, new ArrayBuffer(32), 'private', ['deriveBits', 'deriveKey']);
          expect(() => alg.checkAlgorithmOptions({
            algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
            baseKey   : ownPrivateKey
          })).to.throw(InvalidAccessError, 'does not match');
        });

        it('throws an error if a public key is specified as the baseKey', () => {
          const ownPrivateKey = new CryptoKey({ name: 'ECDH', namedCurve: 'X25519' }, false, new ArrayBuffer(32), 'public', ['deriveBits', 'deriveKey']);
          expect(() => alg.checkAlgorithmOptions({
            algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
            baseKey   : ownPrivateKey
          })).to.throw(InvalidAccessError, 'Requested operation is not valid');
        });

        it('throws an error if the named curve of the public and base keys does not match', () => {
          const ownPrivateKey = new CryptoKey({ name: 'ECDH', namedCurve: 'secp256k1' }, false, new ArrayBuffer(32), 'private', ['deriveBits', 'deriveKey']);
          expect(() => alg.checkAlgorithmOptions({
            algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
            baseKey   : ownPrivateKey
          })).to.throw(InvalidAccessError, `named curve of the publicKey and baseKey must match`);
        });
      });

      describe('sign()', () => {
        it(`throws an error because 'sign' operation is valid for ECDH keys`, async () => {
          await expect(alg.sign()).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for ECDH');
        });
      });

      describe('verify()', () => {
        it(`throws an error because 'verify' operation is valid for ECDH keys`, async () => {
          await expect(alg.verify()).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for ECDH');
        });
      });
    });

    describe('EcdsaAlgorithm', () => {
      let alg: EcdsaAlgorithm;

      before(() => {
        alg = Reflect.construct(EcdsaAlgorithm, []) as EcdsaAlgorithm;
        // @ts-expect-error because `hashAlgorithms` is a read-only property.
        alg.hashAlgorithms = ['SHA-256'];
      });

      describe('checkAlgorithmOptions()', () => {
        it('does not throw with matching algorithm name and valid hash algorithm', () => {
          expect(() => alg.checkAlgorithmOptions({ algorithm: {
            name : 'ECDSA',
            hash : 'SHA-256'
          }})).to.not.throw();
        });

        it('throws an error when unsupported algorithm specified', () => {
          expect(() => alg.checkAlgorithmOptions({ algorithm: {
            name : 'Nope',
            hash : 'SHA-256'
          }})).to.throw(NotSupportedError, 'Algorithm not supported');
        });

        it('throws an error if the hash property is missing', () => {
          // @ts-expect-error because `hash` property is intentionally omitted.
          expect(() => alg.checkAlgorithmOptions({ algorithm: {
            name: 'ECDSA',
          }})).to.throw(TypeError, 'Required parameter was missing');
        });

        it('throws an error if the given hash algorithm is not supported', () => {
          const ecdhPublicKey = new CryptoKey({ name: 'ECDH', namedCurve: 'X25519' }, false, new ArrayBuffer(32), 'public', ['deriveBits', 'deriveKey']);
          // @ts-ignore-error because a required property is being intentionally deleted to trigger the check to throw.
          delete ecdhPublicKey.extractable;
          expect(() => alg.checkAlgorithmOptions({ algorithm: {
            name : 'ECDSA',
            hash : 'SHA-1234'
          }})).to.throw(TypeError, 'Out of range');
        });
      });

      describe('deriveBits()', () => {
        it(`throws an error because 'deriveBits' operation is valid for ECDSA keys`, async () => {
          await expect(alg.deriveBits()).to.eventually.be.rejectedWith(InvalidAccessError, `is not valid for ECDSA`);
        });
      });
    });

    describe('EdDsaAlgorithm', () => {
      let alg: EdDsaAlgorithm;

      before(() => {
        alg = Reflect.construct(EdDsaAlgorithm, []) as EdDsaAlgorithm;
      });

      describe('checkAlgorithmOptions()', () => {
        const testEdDsaAlgorithm = Reflect.construct(EdDsaAlgorithm, []) as EdDsaAlgorithm;

        it('does not throw with matching algorithm name', () => {
          expect(() => testEdDsaAlgorithm.checkAlgorithmOptions({ algorithm: {
            name: 'EdDSA'
          }})).to.not.throw();
        });

        it('throws an error when unsupported algorithm specified', () => {
          expect(() => testEdDsaAlgorithm.checkAlgorithmOptions({ algorithm: {
            name: 'Nope'
          }})).to.throw(NotSupportedError, 'Algorithm not supported');
        });
      });

      describe('deriveBits()', () => {
        it(`throws an error because 'deriveBits' operation is valid for EdDSA keys`, async () => {
          await expect(alg.deriveBits()).to.eventually.be.rejectedWith(InvalidAccessError, `is not valid for EdDSA`);
        });
      });
    });
  });
});