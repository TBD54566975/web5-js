import chai, { expect } from 'chai';
import { Convert } from '@web5/common';
import chaiAsPromised from 'chai-as-promised';

import type { Web5Crypto } from '../src/types/web5-crypto.js';
import type {
  JwkType,
  JwkOperation,
  PublicKeyJwk,
  PrivateKeyJwk,
  JwkParamsEcPublic,
  JwkParamsEcPrivate,
  JwkParamsOkpPublic,
  JwkParamsOctPrivate,
} from '../src/jose.js';

import {
  OperationError,
  CryptoAlgorithm,
  BaseAesAlgorithm,
  BaseEcdhAlgorithm,
  NotSupportedError,
  BaseEcdsaAlgorithm,
  BaseEdDsaAlgorithm,
  InvalidAccessError,
  BaseAesCtrAlgorithm,
  BasePbkdf2Algorithm,
  BaseEllipticCurveAlgorithm,
} from '../src/algorithms-api/index.js';

chai.use(chaiAsPromised);

describe('Algorithms API', () => {
  describe('CryptoAlgorithm', () => {

    class TestCryptoAlgorithm extends CryptoAlgorithm {
      public names = ['TestAlgorithm'] as const;
      public keyOperations: JwkOperation[] = ['decrypt', 'deriveBits', 'deriveKey', 'encrypt', 'sign', 'unwrapKey', 'verify', 'wrapKey'];
      public async decrypt(): Promise<Uint8Array> {
        return null as any;
      }
      public async deriveBits(): Promise<Uint8Array> {
        return null as any;
      }
      public async encrypt(): Promise<Uint8Array> {
        return null as any;
      }
      public async generateKey(): Promise<PrivateKeyJwk> {
        return null as any;
      }
      public async sign(): Promise<Uint8Array> {
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
        expect(() => alg.checkAlgorithmName({} as any)).to.throw(TypeError, 'Required parameter missing');
      });
    });

    describe('checkKeyAlgorithm()', () => {
      it('throws an error when keyAlgorithmName is undefined', async () => {
        expect(() => alg.checkKeyAlgorithm({} as any)).to.throw(TypeError, 'Required parameter missing');
      });

      it('throws an error when keyAlgorithmName does not match', async () => {
        const wrongName = 'wrongName';
        expect(() => alg.checkKeyAlgorithm({ keyAlgorithmName: wrongName })).to.throw(InvalidAccessError, `Algorithm '${alg.names.join(', ')}' does not match the provided '${wrongName}' key.`);
      });

      it('does not throw an error when keyAlgorithmName matches', async () => {
        const [ correctName ] = alg.names;
        expect(() => alg.checkKeyAlgorithm({ keyAlgorithmName: correctName })).not.to.throw();
      });
    });

    describe('checkKeyType()', () => {
      it('throws an error when keyType or allowedKeyType is undefined', async () => {
        expect(() => alg.checkKeyType({} as any)).to.throw(TypeError, 'One or more required parameters missing');
        expect(() => alg.checkKeyType({ keyType: 'public' } as any)).to.throw(TypeError, 'One or more required parameters missing');
        expect(() => alg.checkKeyType({ allowedKeyType: 'public' } as any)).to.throw(TypeError, 'One or more required parameters missing');
      });

      it('throws an error when keyType does not match allowedKeyType', async () => {
        const keyType: JwkType = 'oct';
        const allowedKeyTypes: JwkType[] = ['OKP'];
        expect(() => alg.checkKeyType({ keyType, allowedKeyTypes })).to.throw(InvalidAccessError, 'Key type of the provided key must be');
      });

      it('throws an error when allowedKeyTypes is not an array', () => {
        expect(
          () => alg.checkKeyType({
            keyType         : 'oct',
            allowedKeyTypes : {} as any // Intentionally incorrect type
          })
        ).to.throw(TypeError, `'allowedKeyTypes' is not of type Array.`);
      });

      it('does not throw an error when keyType matches allowedKeyType', async () => {
        const keyType: JwkType = 'EC';
        const allowedKeyTypes: JwkType[] = ['EC'];
        expect(() => alg.checkKeyType({ keyType, allowedKeyTypes })).not.to.throw();
      });
    });

    describe('checkKeyOperations()', () => {
      it('does not throw an error when keyOperations are in allowedKeyOperations', async () => {
        const keyOperations: JwkOperation[] = ['sign', 'verify'];
        const allowedKeyOperations: JwkOperation[] = ['sign', 'verify', 'encrypt', 'decrypt'];
        expect(() => alg.checkKeyOperations({ keyOperations, allowedKeyOperations })).not.to.throw();
      });

      it('throws an error when keyOperations is undefined or empty', async () => {
        expect(() => alg.checkKeyOperations({ allowedKeyOperations: ['sign'] } as any)).to.throw(TypeError, 'Required parameter missing or empty');
        expect(() => alg.checkKeyOperations({ keyOperations: [], allowedKeyOperations: ['sign'] })).to.throw(TypeError, 'Required parameter missing or empty');
      });

      it('throws an error when keyOperations are not in allowedKeyOperations', async () => {
        const keyOperations: JwkOperation[] = ['encrypt', 'decrypt'];
        const allowedKeyOperations: JwkOperation[] = ['sign', 'verify'];
        expect(() => alg.checkKeyOperations({ keyOperations, allowedKeyOperations })).to.throw(InvalidAccessError, 'is not valid for the provided key');
      });

      it('throws an error when allowedKeyOperations is not an Array', async () => {
        const keyOperations: JwkOperation[] = ['encrypt', 'decrypt'];
        const allowedKeyOperations = 'sign' as any; // Intentionally incorrect type';
        expect(() => alg.checkKeyOperations({ keyOperations, allowedKeyOperations })).to.throw(TypeError, 'is not of type Array');
      });
    });
  });

  describe('BaseAesAlgorithm', () => {
    class TestAesAlgorithm extends BaseAesAlgorithm {
      public names = ['TestAlgorithm'] as const;
      public keyOperations: JwkOperation[] = ['decrypt', 'encrypt'];
      public async decrypt(): Promise<Uint8Array> {
        return null as any;
      }
      public async encrypt(): Promise<Uint8Array> {
        return null as any;
      }
      public async generateKey(): Promise<PrivateKeyJwk> {
        return null as any;
      }
    }

    let alg: TestAesAlgorithm;

    beforeEach(() => {
      alg = TestAesAlgorithm.create();
    });

    describe('checkGenerateKeyOptions()', () => {
      it('does not throw with supported algorithm and key operation', () => {
        expect(() => alg.checkGenerateKeyOptions({
          algorithm     : { name: 'TestAlgorithm' },
          keyOperations : ['encrypt']
        })).to.not.throw();
      });

      it('throws an error when unsupported algorithm specified', () => {
        expect(() => alg.checkGenerateKeyOptions({
          algorithm     : { name: 'ECDSA' },
          keyOperations : ['encrypt']
        })).to.throw(NotSupportedError, 'Algorithm not supported');
      });

      it('throws an error when the requested operation is not valid', () => {
        ['sign', 'verify'].forEach((operation) => {
          expect(() => alg.checkGenerateKeyOptions({
            algorithm     : { name: 'TestAlgorithm' },
            keyOperations : [operation as JwkOperation]
          })).to.throw(InvalidAccessError, 'Requested operation');
        });
      });
    });

    describe('checkSecretKey()', () => {
      let dataEncryptionKey: PrivateKeyJwk;

      beforeEach(() => {
        dataEncryptionKey = { kty: 'oct', k: Convert.uint8Array(new Uint8Array(16)).toBase64Url() };
      });

      it('does not throw with a valid secret key', () => {
        const key: PrivateKeyJwk = {
          kty : 'oct',
          k   : Convert.uint8Array(new Uint8Array(16)).toBase64Url()
        };
        expect(() => alg.checkSecretKey({ key })).to.not.throw();
      });

      it('throws an error when the key is not a JWK', () => {
        const key = 'foo' as any; // Intentionally incorrect type.
        expect(() => alg.checkSecretKey({ key })).to.throw(TypeError, 'is not a JSON Web Key');
      });

      it('throws an error if the key property is missing', () => {
        // @ts-expect-error because key property was intentionally omitted.
        expect(() => alg.checkSecretKey({})).to.throw(TypeError, `Required parameter missing: 'key'`);
      });

      it('throws an error if the given key is not valid', () => {
        const { kty, ...keyMissingKeyType } = dataEncryptionKey as JwkParamsOctPrivate;
        expect(() => alg.checkSecretKey({
          // @ts-ignore-error because a required property is being intentionally deleted to trigger the check to throw.
          key: keyMissingKeyType
        })).to.throw(TypeError, 'Object is not a JSON Web Key');

        const { k, ...keyMissingK } = dataEncryptionKey as JwkParamsOctPrivate;
        expect(() => alg.checkSecretKey({
          // @ts-ignore-error because a required property is being intentionally deleted to trigger the check to throw.
          key: keyMissingK
        })).to.throw(InvalidAccessError, 'Requested operation is only valid for oct private keys');
      });

      it('if specified, throws an error if the algorithm of the key does not match', () => {
        // @ts-expect-error because alg property is intentionally set to an invalid value.
        const key: PrivateKeyJwk = { ...dataEncryptionKey, alg: 'invalid-alg' };
        expect(() => alg.checkSecretKey({
          key
        })).to.throw(InvalidAccessError, 'does not match');
      });

      it('throws an error if an EC private key is specified as the key', () => {
        const secp256k1PrivateKey: PrivateKeyJwk = { kty: 'EC', crv: 'secp256k1', d: '', x: '', y: '' };
        expect(() => alg.checkSecretKey({
          key: secp256k1PrivateKey
        })).to.throw(InvalidAccessError, 'operation is only valid');
      });

      it('throws an error if a public key is specified as the key', () => {
        const secp256k1PublicKey: PublicKeyJwk = { kty: 'EC', crv: 'secp256k1', x: '', y: '' };
        expect(() => alg.checkSecretKey({
          // @ts-expect-error because a public key is being intentionally specified as the key.
          key: secp256k1PublicKey
        })).to.throw(InvalidAccessError, 'operation is only valid');
      });
    });

    describe('deriveBits()', () => {
      it(`throws an error because 'deriveBits' operation is valid for AES-CTR keys`, async () => {
        const alg = TestAesAlgorithm.create();
        await expect(alg.deriveBits()).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for');
      });
    });

    describe('sign()', () => {
      it(`throws an error because 'sign' operation is valid for AES-CTR keys`, async () => {
        await expect(alg.sign()).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for');
      });
    });

    describe('verify()', () => {
      it(`throws an error because 'verify' operation is valid for AES-CTR keys`, async () => {
        await expect(alg.verify()).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for');
      });
    });
  });

  describe('BaseAesCtrAlgorithm', () => {
    let alg: BaseAesCtrAlgorithm;

    before(() => {
      alg = Reflect.construct(BaseAesCtrAlgorithm, []) as BaseAesCtrAlgorithm;
      // @ts-expect-error because the `names` property is readonly.
      alg.names = ['A128CTR', 'A192CTR', 'A256CTR'] as const;
    });

    describe('checkAlgorithmOptions()', () => {
      it('does not throw with matching algorithm name and valid counter and length', () => {
        expect(() => alg.checkAlgorithmOptions({
          algorithm: {
            name    : 'A128CTR',
            counter : new Uint8Array(16),
            length  : 128
          }
        })).to.not.throw();
      });

      it('throws an error when unsupported algorithm specified', () => {
        expect(() => alg.checkAlgorithmOptions({
          algorithm: {
            name    : 'invalid-name',
            counter : new Uint8Array(16),
            length  : 128
          }
        })).to.throw(NotSupportedError, 'Algorithm not supported');
      });

      it('throws an error if the counter property is missing', () => {
        // @ts-expect-error because `counter` property is intentionally omitted.
        expect(() => alg.checkAlgorithmOptions({ algorithm: {
          name   : 'A128CTR',
          length : 128
        }})).to.throw(TypeError, 'Required parameter missing');
      });

      it('accepts counter as Uint8Array', () => {
        const data = new Uint8Array(16);
        const algorithm: { name?: string, counter?: any, length?: number } = {};
        algorithm.name = 'A128CTR';
        algorithm.length = 128;

        // TypedArray - Uint8Array
        algorithm.counter = data;
        expect(() => alg.checkAlgorithmOptions({
          algorithm: algorithm as Web5Crypto.AesCtrOptions,
        })).to.not.throw();
      });

      it('throws error if counter is not acceptable data type', () => {
        expect(() => alg.checkAlgorithmOptions({
          algorithm: {
            name    : 'A128CTR',
            // @ts-expect-error because counter is being intentionally set to the wrong data type to trigger an error.
            counter : new Set([...Array(16).keys()].map(n => n.toString(16))),
            length  : 128
          },
        })).to.throw(TypeError, 'is not of type');
      });

      it('throws error if initial value of the counter block is not 16 bytes', () => {
        expect(() => alg.checkAlgorithmOptions({
          algorithm: {
            name    : 'A128CTR',
            counter : new Uint8Array(128),
            length  : 128
          }
        })).to.throw(OperationError, 'must have length');
      });

      it('throws an error if the length property is missing', () => {
        // @ts-expect-error because lengthy property was intentionally omitted.
        expect(() => alg.checkAlgorithmOptions({ algorithm: {
          name    : 'A128CTR',
          counter : new Uint8Array(16)
        }})).to.throw(TypeError, `Required parameter missing: 'length'`);
      });

      it('throws an error if length is not a Number', () => {
        expect(() => alg.checkAlgorithmOptions({ algorithm: {
          name    : 'A128CTR',
          counter : new Uint8Array(16),
          // @ts-expect-error because length is being intentionally specified as a string instead of a number.
          length  : '128'
        }})).to.throw(TypeError, 'is not of type');
      });

      it('throws an error if length is not between 1 and 128', () => {
        expect(() => alg.checkAlgorithmOptions({
          algorithm: {
            name    : 'A128CTR',
            counter : new Uint8Array(16),
            length  : 0
          }
        })).to.throw(OperationError, 'should be in the range');

        expect(() => alg.checkAlgorithmOptions({
          algorithm: {
            name    : 'A128CTR',
            counter : new Uint8Array(16),
            length  : 256
          }
        })).to.throw(OperationError, 'should be in the range');
      });
    });

    describe('checkDecryptOptions()', () => {
      let algorithm: Web5Crypto.AesCtrOptions;
      let dataEncryptionKey: PrivateKeyJwk;

      beforeEach(() => {
        algorithm = { name: 'A128CTR', counter: new Uint8Array(16), length: 128 };
        dataEncryptionKey = { kty: 'oct', k: Convert.uint8Array(new Uint8Array(16)).toBase64Url() };
      });

      it('validates that data is a Uint8Array', async () => {
        expect(() => alg.checkDecryptOptions({
          algorithm,
          key  : dataEncryptionKey,
          // @ts-expect-error because invalid data type intentionally specified.
          data : 'baz'
        })).to.throw(TypeError, `data must be of type Uint8Array`);
      });

      it(`if specified, validates that 'key_opts' includes 'decrypt'`, async () => {
        // Exclude the 'decrypt' operation.
        dataEncryptionKey.key_ops = ['encrypt'];

        expect(() => alg.checkDecryptOptions({
          algorithm,
          key  : dataEncryptionKey,
          data : new Uint8Array([1, 2, 3, 4])
        })).to.throw(InvalidAccessError, 'is not valid for the provided key');
      });
    });

    describe('checkEncryptOptions()', () => {
      let algorithm: Web5Crypto.AesCtrOptions;
      let dataEncryptionKey: PrivateKeyJwk;

      beforeEach(() => {
        algorithm = { name: 'A128CTR', counter: new Uint8Array(16), length: 128 };
        dataEncryptionKey = { kty: 'oct', k: Convert.uint8Array(new Uint8Array(16)).toBase64Url() };
      });

      it('validates that data is a Uint8Array', async () => {
        expect(() => alg.checkEncryptOptions({
          algorithm,
          key  : dataEncryptionKey,
          // @ts-expect-error because invalid data type intentionally specified.
          data : 'baz'
        })).to.throw(TypeError, `data must be of type Uint8Array`);
      });

      it(`if specified, validates that 'key_opts' includes 'encrypt'`, async () => {
        // Exclude the 'encrypt' operation.
        dataEncryptionKey.key_ops = ['decrypt'];

        expect(() => alg.checkEncryptOptions({
          algorithm,
          key  : dataEncryptionKey,
          data : new Uint8Array([1, 2, 3, 4])
        })).to.throw(InvalidAccessError, 'is not valid for the provided key');
      });
    });
  });

  describe('BaseEllipticCurveAlgorithm', () => {
    class TestEllipticCurveAlgorithm extends BaseEllipticCurveAlgorithm {
      public names = ['TestAlgorithm'] as const;
      public curves = ['secp256k1'] as const;
      public keyOperations: JwkOperation[] = ['decrypt'];
      public async deriveBits(): Promise<Uint8Array> {
        return null as any;
      }
      public async generateKey(): Promise<PrivateKeyJwk> {
        return null as any;
      }
      public async sign(): Promise<Uint8Array> {
        return null as any;
      }
      public async verify(): Promise<boolean> {
        return null as any;
      }
    }

    describe('checkGenerateKeyOptions()', () => {
      let alg: TestEllipticCurveAlgorithm;

      beforeEach(() => {
        alg = TestEllipticCurveAlgorithm.create();
      });

      it('does not throw with supported algorithm, named curve, and key operation', () => {
        expect(() => alg.checkGenerateKeyOptions({
          algorithm     : { name: 'TestAlgorithm', curve: 'secp256k1' },
          keyOperations : ['decrypt']
        })).to.not.throw();
      });

      it('throws an error when unsupported algorithm specified', () => {
        expect(() => alg.checkGenerateKeyOptions({
          algorithm     : { name: 'invalid-algorithm', curve: 'secp256k1' },
          keyOperations : ['sign']
        })).to.throw(NotSupportedError, 'Algorithm not supported');
      });

      it('throws an error when unsupported named curve specified', () => {
        expect(() => alg.checkGenerateKeyOptions({
          algorithm     : { name: 'TestAlgorithm', curve: 'invalid-curve' },
          keyOperations : ['sign']
        })).to.throw(TypeError, 'Out of range');
      });

      it('throws an error when the requested operation is not valid', () => {
        ['sign', 'verify'].forEach((operation) => {
          expect(() => alg.checkGenerateKeyOptions({
            algorithm     : { name: 'TestAlgorithm', curve: 'secp256k1' },
            keyOperations : [operation as JwkOperation]
          })).to.throw(InvalidAccessError, 'Requested operation');
        });
      });
    });

    describe('checkSignOptions()', () => {
      let alg: TestEllipticCurveAlgorithm;

      beforeEach(() => {
        alg = TestEllipticCurveAlgorithm.create();
      });

      it('validates algorithm name and key algorithm name', async () => {
        // Invalid (algorithm name, private key) result in algorithm name check failing first.
        expect(() => alg.checkSignOptions({
          algorithm : { name: 'invalid-name' },
          // @ts-expect-error because invalid key intentionally specified.
          key       : { foo: 'bar '},
          data      : new Uint8Array([1, 2, 3, 4])
        })).to.throw(NotSupportedError, 'Algorithm not supported');

        // Valid (algorithm name) + Invalid (private key) result in private key check failing first.
        expect(() => alg.checkSignOptions({
          algorithm : { name: 'TestAlgorithm' },
          // @ts-expect-error because invalid key intentionally specified.
          key       : { foo: 'bar '},
          data      : new Uint8Array([1, 2, 3, 4])
        })).to.throw(InvalidAccessError, 'operation is only valid for private keys');

        // Valid (algorithm name) + Invalid (private key alg) result in private key algorithm check failing first.
        expect(() => alg.checkSignOptions({
          algorithm : { name: 'TestAlgorithm' },
          // @ts-expect-error because invalid key algorithm intentionally specified.
          key       : { kty: 'EC', crv: 'secp256k1', d: '', x: '', y: '', alg: 'invalid-alg' },
          data      : new Uint8Array([1, 2, 3, 4])
        })).to.throw(InvalidAccessError, `does not match the provided 'invalid-alg' key`);
      });

      it('validates that data is a Uint8Array', async () => {
        const privateKey: PrivateKeyJwk = {
          kty : 'EC',
          crv : 'secp256k1',
          d   : Convert.uint8Array(new Uint8Array(32)).toBase64Url(),
          x   : Convert.uint8Array(new Uint8Array(32)).toBase64Url(),
          y   : Convert.uint8Array(new Uint8Array(32)).toBase64Url()
        };

        // Valid (algorithm name, private key) + Invalid (data) result in the data check failing first.
        expect(() => alg.checkSignOptions({
          algorithm : { name: 'TestAlgorithm' },
          key       : privateKey,
          // @ts-expect-error because invalid data type intentionally specified.
          data      : 'baz'
        })).to.throw(TypeError, `data must be of type Uint8Array`);
      });

      it('validates that key is not a public key', async () => {
        const publicKey: PublicKeyJwk = {
          kty : 'EC',
          crv : 'secp256k1',
          x   : Convert.uint8Array(new Uint8Array(32)).toBase64Url(),
          y   : Convert.uint8Array(new Uint8Array(32)).toBase64Url()
        };

        // Valid (algorithm name, data) + Invalid (private key) result in key type check failing first.
        expect(() => alg.checkSignOptions({
          algorithm : { name: 'TestAlgorithm' },
          // @ts-expect-error because invalid key intentionally specified.
          key       : publicKey,
          data      : new Uint8Array([1, 2, 3, 4])
        })).to.throw(InvalidAccessError, 'operation is only valid for private keys');
      });

      it(`if specified, validates that 'key_opts' includes 'sign'`, async () => {
        // Exclude the 'sign' operation.
        const privateKey: PrivateKeyJwk = {
          kty     : 'EC',
          crv     : 'secp256k1',
          d       : Convert.uint8Array(new Uint8Array(32)).toBase64Url(),
          x       : Convert.uint8Array(new Uint8Array(32)).toBase64Url(),
          y       : Convert.uint8Array(new Uint8Array(32)).toBase64Url(),
          key_ops : ['verify']
        };

        expect(() => alg.checkSignOptions({
          algorithm : { name: 'TestAlgorithm' },
          key       : privateKey,
          data      : new Uint8Array([1, 2, 3, 4])
        })).to.throw(InvalidAccessError, 'is not valid for the provided key');
      });

      it('throws an error when key is an unsupported curve', async () => {
        const privateKey: PrivateKeyJwk = {
          kty     : 'EC',
          // @ts-expect-error because an invalid curve is being intentionally specified.
          crv     : 'invalid-curve',
          d       : Convert.uint8Array(new Uint8Array(32)).toBase64Url(),
          x       : Convert.uint8Array(new Uint8Array(32)).toBase64Url(),
          y       : Convert.uint8Array(new Uint8Array(32)).toBase64Url(),
          key_ops : ['verify']
        };

        expect(() => alg.checkSignOptions({
          algorithm : { name: 'TestAlgorithm' },
          key       : privateKey,
          data      : new Uint8Array([1, 2, 3, 4])
        })).to.throw(TypeError, 'Out of range');
      });
    });

    describe('checkVerifyOptions()', () => {
      let alg: TestEllipticCurveAlgorithm;
      let privateKey: PrivateKeyJwk;
      let publicKey: PublicKeyJwk;
      let signature: Uint8Array;
      let data = new Uint8Array([51, 52, 53]);

      beforeEach(() => {
        alg = TestEllipticCurveAlgorithm.create();

        privateKey = {
          kty     : 'EC',
          crv     : 'secp256k1',
          d       : 'XwsSwwmtfxgooR2XsWsvZxeacO1W4koDw3iXxmUivcE',
          x       : 'Ldwc5EnadPCf-pXe_qWmM7i2-qfYrQXkSCm4aOJ09UQ',
          y       : 'vL7LbN7q072aRJ5TSpz63cOetIzEDmBR_LwKciPfHZE',
          kid     : 'ukuZTjeoTyhQk5pScZwj3PDHLUmMffmV5Fey4cS2sMk',
          key_ops : [ 'sign' ]
        };
        publicKey = {
          kty     : 'EC',
          crv     : 'secp256k1',
          x       : 'Ldwc5EnadPCf-pXe_qWmM7i2-qfYrQXkSCm4aOJ09UQ',
          y       : 'vL7LbN7q072aRJ5TSpz63cOetIzEDmBR_LwKciPfHZE',
          kid     : 'ukuZTjeoTyhQk5pScZwj3PDHLUmMffmV5Fey4cS2sMk',
          key_ops : [ 'sign' ]
        };
        signature = Convert.base64Url('jikTSNWducZQBBDCjonE-OnQaUc3A0oFnCcWWF5N2OV2AYID4iGSTrdPw9jgXISBhojZ1kYeeu4_6YvV26A6GQ').toUint8Array();
      });

      it('validates algorithm name and key algorithm name', async () => {
        // Invalid (algorithm name, public key) result in algorithm name check failing first.
        expect(() => alg.checkVerifyOptions({
          algorithm : { name: 'invalid-name' },
          // @ts-expect-error because invalid key intentionally specified.
          key       : { foo: 'bar '},
          signature,
          data
        })).to.throw(NotSupportedError, 'Algorithm not supported');

        // Valid (algorithm name) + Invalid (public key) result in public key check failing first.
        expect(() => alg.checkVerifyOptions({
          algorithm : { name: 'TestAlgorithm' },
          // @ts-expect-error because invalid key intentionally specified.
          key       : { foo: 'bar '},
          signature,
          data
        })).to.throw(InvalidAccessError, 'operation is only valid for public keys');

        // Valid (algorithm name) + Invalid (public key alg) result in public key algorithm check failing first.
        expect(() => alg.checkVerifyOptions({
          algorithm : { name: 'TestAlgorithm' },
          // @ts-expect-error because invalid key intentionally specified.
          key       : { ...publicKey, alg: 'invalid-alg' },
          signature,
          data
        })).to.throw(InvalidAccessError, `does not match the provided 'invalid-alg' key`);
      });

      it('validates that key is not a private key', async () => {
        // Valid (algorithm name, hash algorithm, signature, data) + Invalid (public key) result in key type check failing first.
        expect(() => alg.checkVerifyOptions({
          algorithm : { name: 'TestAlgorithm' },
          // @ts-expect-error because invalid key intentionally specified.
          key       : privateKey,
          signature : signature,
          data      : data
        })).to.throw(InvalidAccessError, 'operation is only valid for public keys');
      });

      it(`if specified, validates that 'key_ops' includes 'verify'`, async () => {
        // Manually specify the public key operations to exclude the 'verify' operation.
        const key: PublicKeyJwk = { ...publicKey, key_ops: ['sign'] };

        expect(() => alg.checkVerifyOptions({
          algorithm : { name: 'TestAlgorithm' },
          key,
          signature : signature,
          data      : data
        })).to.throw(InvalidAccessError, 'is not valid for the provided key');
      });

      it('throws an error when key is an unsupported curve', async () => {
        // Manually change the key's curve to trigger an error.
        // @ts-expect-error because an invalid curve is being intentionally specified.
        const key: PublicKeyJwk = { ...publicKey, crv: 'invalid-curve' };

        expect(() => alg.checkVerifyOptions({
          algorithm : { name: 'TestAlgorithm' },
          data      : data,
          key,
          signature
        })).to.throw(TypeError, 'Out of range');
      });

      it('validates that data is a Uint8Array', async () => {
        expect(() => alg.checkVerifyOptions({
          algorithm : { name: 'TestAlgorithm' },
          key       : publicKey,
          // @ts-expect-error because invalid data type intentionally specified.
          data      : 'baz',
          signature
        })).to.throw(TypeError, `data must be of type Uint8Array`);
      });

      it('validates that signature is a Uint8Array', async () => {
        expect(() => alg.checkVerifyOptions({
          algorithm : { name: 'TestAlgorithm' },
          key       : publicKey,
          data,
          // @ts-expect-error because invalid data type intentionally specified.
          signature : 'baz'
        })).to.throw(TypeError, `signature must be of type Uint8Array`);
      });
    });

    describe('decrypt()', () => {
      it(`throws an error because 'decrypt' operation is valid for Elliptic Curve algorithms`, async () => {
        const alg = TestEllipticCurveAlgorithm.create();
        await expect(alg.decrypt()).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for');
      });
    });

    describe('encrypt()', () => {
      it(`throws an error because 'encrypt' operation is valid for Elliptic Curve algorithms`, async () => {
        const alg = TestEllipticCurveAlgorithm.create();
        await expect(alg.encrypt()).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for');
      });
    });
  });

  describe('BaseEcdhAlgorithm', () => {
    let alg: BaseEcdhAlgorithm;

    before(() => {
      alg = Reflect.construct(BaseEcdhAlgorithm, []) as BaseEcdhAlgorithm;
      // @ts-expect-error because the `names` property is readonly.
      alg.names = ['ECDH'] as const;
    });

    describe('checkDeriveBitsOptions()', () => {
      let otherPartyPublicKey: PublicKeyJwk;
      let ownPrivateKey: PrivateKeyJwk;

      beforeEach(() => {
        otherPartyPublicKey = {
          kty : 'OKP',
          crv : 'X25519',
          x   : Convert.uint8Array(new Uint8Array(32)).toBase64Url()
        };
        ownPrivateKey = {
          kty : 'OKP',
          crv : 'X25519',
          x   : Convert.uint8Array(new Uint8Array(32)).toBase64Url(),
          d   : Convert.uint8Array(new Uint8Array(32)).toBase64Url()
        };
      });

      it('does not throw with matching algorithm name and valid publicKey and baseKey', () => {
        expect(() => alg.checkDeriveBitsOptions({
          algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
          baseKey   : ownPrivateKey
        })).to.not.throw();
      });

      it('throws an error when unsupported algorithm specified', () => {
        expect(() => alg.checkDeriveBitsOptions({
          algorithm : { name: 'non-existent-algorithm', publicKey: otherPartyPublicKey },
          baseKey   : ownPrivateKey
        })).to.throw(NotSupportedError, 'Algorithm not supported');
      });

      it('throws an error if the publicKey property is missing', () => {
        expect(() => alg.checkDeriveBitsOptions({
          // @ts-expect-error because `publicKey` property is intentionally omitted.
          algorithm : { name: 'ECDH' },
          baseKey   : ownPrivateKey
        })).to.throw(TypeError, `Required parameter missing: 'publicKey'`);
      });

      it('throws an error if the given publicKey is not valid', () => {
        const { kty, ...otherPartyPublicKeyMissingKeyType } = otherPartyPublicKey as JwkParamsEcPublic;
        expect(() => alg.checkDeriveBitsOptions({
          // @ts-ignore-error because a required property is being intentionally deleted to trigger the check to throw.
          algorithm : { name: 'ECDH', publicKey: otherPartyPublicKeyMissingKeyType },
          baseKey   : ownPrivateKey
        })).to.throw(TypeError, 'Object is not a JSON Web Key');

        const { crv, ...otherPartyPublicKeyMissingCurve } = otherPartyPublicKey as JwkParamsEcPublic;
        expect(() => alg.checkDeriveBitsOptions({
          // @ts-ignore-error because a required property is being intentionally deleted to trigger the check to throw.
          algorithm : { name: 'ECDH', publicKey: otherPartyPublicKeyMissingCurve },
          baseKey   : ownPrivateKey
        })).to.throw(InvalidAccessError, 'Requested operation is only valid for public keys');

        const { x, ...otherPartyPublicKeyMissingX } = otherPartyPublicKey as JwkParamsEcPublic;
        expect(() => alg.checkDeriveBitsOptions({
          // @ts-ignore-error because a required property is being intentionally deleted to trigger the check to throw.
          algorithm : { name: 'ECDH', publicKey: otherPartyPublicKeyMissingX },
          baseKey   : ownPrivateKey
        })).to.throw(InvalidAccessError, 'Requested operation is only valid for public keys');
      });

      it('throws an error if the key type of the publicKey is not EC or OKP', () => {
        otherPartyPublicKey.kty = 'RSA';
        expect(() => alg.checkDeriveBitsOptions({
          algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
          baseKey   : ownPrivateKey
        })).to.throw(InvalidAccessError, 'Key type of the provided key must be');
      });

      it(`does not throw if publicKey 'key_ops' is undefined`, async () => {
        delete otherPartyPublicKey.key_ops;
        expect(() => alg.checkDeriveBitsOptions({
          algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
          baseKey   : ownPrivateKey
        })).to.not.throw();
      });

      it('throws an error if a private key is specified as the publicKey', () => {
        expect(() => alg.checkDeriveBitsOptions({
          // @ts-expect-error since a private key is being intentionally provided to trigger the error.
          algorithm : { name: 'ECDH', publicKey: ownPrivateKey },
          baseKey   : ownPrivateKey
        })).to.throw(InvalidAccessError, 'Requested operation is only valid');
      });

      it('throws an error if the baseKey property is missing', () => {
        // @ts-expect-error because `baseKey` property is intentionally omitted.
        expect(() => alg.checkDeriveBitsOptions({
          algorithm: { name: 'ECDH', publicKey: otherPartyPublicKey  }
        })).to.throw(TypeError, `Required parameter missing: 'baseKey'`);
      });

      it('throws an error if the given baseKey is not valid', () => {
        const { kty, ...ownPrivateKeyMissingKeyType } = ownPrivateKey as JwkParamsEcPrivate;
        expect(() => alg.checkDeriveBitsOptions({
          algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
          // @ts-ignore-error because a required property is being intentionally deleted to trigger the check to throw.
          baseKey   : ownPrivateKeyMissingKeyType
        })).to.throw(TypeError, 'Object is not a JSON Web Key');

        const { crv, ...ownPrivateKeyMissingCurve } = ownPrivateKey as JwkParamsEcPrivate;
        expect(() => alg.checkDeriveBitsOptions({
          algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
          // @ts-ignore-error because a required property is being intentionally deleted to trigger the check to throw.
          baseKey   : ownPrivateKeyMissingCurve
        })).to.throw(InvalidAccessError, 'Requested operation is only valid for private keys');

        const { x, ...ownPrivateKeyMissingX } = ownPrivateKey as JwkParamsEcPrivate;
        expect(() => alg.checkDeriveBitsOptions({
          algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
          // @ts-ignore-error because a required property is being intentionally deleted to trigger the check to throw.
          baseKey   : ownPrivateKeyMissingX
        })).to.throw(InvalidAccessError, 'Requested operation is only valid for private keys');

        const { d, ...ownPrivateKeyMissingD } = ownPrivateKey as JwkParamsEcPrivate;
        expect(() => alg.checkDeriveBitsOptions({
          algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
          // @ts-ignore-error because a required property is being intentionally deleted to trigger the check to throw.
          baseKey   : ownPrivateKeyMissingD
        })).to.throw(InvalidAccessError, 'Requested operation is only valid for private keys');
      });

      it('throws an error if the key type of the baseKey is not EC or OKP', () => {
        ownPrivateKey.kty = 'RSA';
        expect(() => alg.checkDeriveBitsOptions({
          algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
          baseKey   : ownPrivateKey
        })).to.throw(InvalidAccessError, 'Key type of the provided key must be');
      });

      it(`does not throw if baseKey 'key_ops' is undefined`, async () => {
        delete ownPrivateKey.key_ops;
        expect(() => alg.checkDeriveBitsOptions({
          algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
          baseKey   : ownPrivateKey
        })).to.not.throw();
      });

      it('throws an error if a public key is specified as the baseKey', () => {
        expect(() => alg.checkDeriveBitsOptions({
          algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
          // @ts-expect-error because public key is being provided instead of private key.
          baseKey   : otherPartyPublicKey
        })).to.throw(InvalidAccessError, 'Requested operation is only valid for private keys');
      });

      it('throws an error if the key type of the public and base keys does not match', () => {
        ownPrivateKey.kty = 'EC';
        otherPartyPublicKey.kty = 'OKP';
        expect(() => alg.checkDeriveBitsOptions({
          algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
          baseKey   : ownPrivateKey
        })).to.throw(InvalidAccessError, `key type of the publicKey and baseKey must match`);
      });

      it('throws an error if the curve of the public and base keys does not match', () => {
        (ownPrivateKey as JwkParamsEcPrivate).crv = 'secp256k1';
        (otherPartyPublicKey as JwkParamsOkpPublic).crv = 'X25519';
        expect(() => alg.checkDeriveBitsOptions({
          algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
          baseKey   : ownPrivateKey
        })).to.throw(InvalidAccessError, `curve of the publicKey and baseKey must match`);
      });

      ['baseKey', 'publicKey'].forEach(keyType => {
        describe(`if ${keyType} 'key_ops' is specified`, () => {
          it(`does not throw if 'key_ops' is valid`, () => {
            const key = keyType === 'baseKey' ? ownPrivateKey : otherPartyPublicKey;
            key.key_ops = ['deriveBits'];
            expect(() => alg.checkDeriveBitsOptions({
              algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
              baseKey   : ownPrivateKey
            })).to.not.throw();
          });

          it(`throws an error if 'key_ops' property is an empty array`, () => {
            const key = keyType === 'baseKey' ? ownPrivateKey : otherPartyPublicKey;
            key.key_ops = [];
            expect(() => alg.checkDeriveBitsOptions({
              algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
              baseKey   : ownPrivateKey
            })).to.throw(InvalidAccessError, `is not valid for the provided key`);
          });

          it(`throws an error if the 'key_ops' property is not an array`, () => {
            const key = keyType === 'baseKey' ? ownPrivateKey : otherPartyPublicKey;
            key.key_ops = 'deriveBits' as any; // Intentionally incorrect type
            expect(() => alg.checkDeriveBitsOptions({
              algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
              baseKey   : ownPrivateKey
            })).to.throw(TypeError, `is not of type Array.`);
          });

          it(`throws an error if the 'key_ops' property contains an invalid operation`, () => {
            const key = keyType === 'baseKey' ? ownPrivateKey : otherPartyPublicKey;
            key.key_ops = ['sign'];
            expect(() => alg.checkDeriveBitsOptions({
              algorithm : { name: 'ECDH', publicKey: otherPartyPublicKey },
              baseKey   : ownPrivateKey,
            })).to.throw(InvalidAccessError, `is not valid for the provided key`);
          });
        });
      });
    });

    describe('sign()', () => {
      it(`throws an error because 'sign' operation is not valid for ECDH`, async () => {
        await expect(alg.sign()).to.eventually.be.rejectedWith(InvalidAccessError, `is not valid for ECDH`);
      });
    });

    describe('verify()', () => {
      it(`throws an error because 'verify' operation is not valid for ECDH`, async () => {
        await expect(alg.verify()).to.eventually.be.rejectedWith(InvalidAccessError, `is not valid for ECDH`);
      });
    });
  });

  describe('BaseEcdsaAlgorithm', () => {
    let alg: BaseEcdsaAlgorithm;

    before(() => {
      alg = Reflect.construct(BaseEcdsaAlgorithm, []) as BaseEcdsaAlgorithm;
      // @ts-expect-error because the `names` property is readonly.
      alg.names = ['ES256K'] as const;
      // @ts-expect-error because the `curves` property is readonly.
      alg.curves = ['secp256k1'] as const;
    });

    describe('checkSignOptions()', () => {
      it('validates that key is an EC private key', async () => {
        const ed25519PrivateKey: PrivateKeyJwk = {
          kty : 'OKP',
          crv : 'Ed25519',
          x   : 'k-DgyL6dBSdblokVYrYfJhSAEbf3gx68YSTwtqAaMis',
          d   : 'VF2v7AbPoDwuuTcV-M6mB_C7SYIDB4E0ImvGM3t0VAE'
        };

        expect(() => alg.checkSignOptions({
          algorithm : { name: 'ES256K' },
          key       : ed25519PrivateKey,
          data      : new Uint8Array([51, 52, 53])
        })).to.throw(InvalidAccessError, 'operation is only valid for EC private keys');
      });
    });

    describe('checkVerifyOptions()', () => {
      it('validates that key is an EC public key', async () => {
        const ed25519PublicKey: PublicKeyJwk = {
          kty : 'OKP',
          crv : 'Ed25519',
          x   : 'k-DgyL6dBSdblokVYrYfJhSAEbf3gx68YSTwtqAaMis',
        };

        expect(() => alg.checkVerifyOptions({
          algorithm : { name: 'ES256K' },
          key       : ed25519PublicKey,
          data      : new Uint8Array(),
          signature : new Uint8Array()
        })).to.throw(InvalidAccessError, 'operation is only valid for EC public keys');
      });
    });

    describe('deriveBits()', () => {
      it(`throws an error because 'deriveBits' operation is not valid for ECDSA algorithm`, async () => {
        await expect(alg.deriveBits()).to.eventually.be.rejectedWith(InvalidAccessError, `is not valid for ECDSA`);
      });
    });
  });

  describe('BaseEdDsaAlgorithm', () => {
    let alg: BaseEdDsaAlgorithm;

    before(() => {
      alg = Reflect.construct(BaseEdDsaAlgorithm, []) as BaseEdDsaAlgorithm;
      // @ts-expect-error because the `names` property is readonly.
      alg.names = ['EdDSA'] as const;
      // @ts-expect-error because the `curves` property is readonly.
      alg.curves = ['Ed25519'] as const;
    });

    describe('checkSignOptions()', () => {
      it('validates that key is an OKP private key', async () => {
        const secp256k1PrivateKey: PrivateKeyJwk = {
          kty : 'EC',
          crv : 'secp256k1',
          x   : 'UxYbeCQo17viyn9Bb5frn80_icQ0dHaRNsjfjZDaxDo',
          y   : '5vg_APq25qhV1wkbEqT3Z1H8vt57iHDhQqsw9TN0M1E',
          d   : 'O2-jjd6m16BXjxTp-UudzZNIkRHQwUYN0KJg3i5Ndko'
        };

        expect(() => alg.checkSignOptions({
          algorithm : { name: 'EdDSA' },
          key       : secp256k1PrivateKey,
          data      : new Uint8Array([51, 52, 53])
        })).to.throw(InvalidAccessError, 'operation is only valid for OKP private keys');
      });
    });

    describe('checkVerifyOptions()', () => {
      it('validates that key is an OKP public key', async () => {
        const secp256k1PublicKey: PublicKeyJwk = {
          kty : 'EC',
          crv : 'secp256k1',
          x   : 'UxYbeCQo17viyn9Bb5frn80_icQ0dHaRNsjfjZDaxDo',
          y   : '5vg_APq25qhV1wkbEqT3Z1H8vt57iHDhQqsw9TN0M1E'
        };

        expect(() => alg.checkVerifyOptions({
          algorithm : { name: 'EdDSA' },
          key       : secp256k1PublicKey,
          data      : new Uint8Array(),
          signature : new Uint8Array()
        })).to.throw(InvalidAccessError, 'operation is only valid for OKP public keys');
      });
    });

    describe('deriveBits()', () => {
      it(`throws an error because 'deriveBits' operation is not valid for EdDSA keys`, async () => {
        await expect(alg.deriveBits()).to.eventually.be.rejectedWith(InvalidAccessError, `is not valid for EdDSA`);
      });
    });
  });

  describe('BasePbkdf2Algorithm', () => {
    let alg: BasePbkdf2Algorithm;

    before(() => {
      alg = Reflect.construct(BasePbkdf2Algorithm, []) as BasePbkdf2Algorithm;
      // @ts-expect-error because the `names` property is readonly.
      alg.names = ['PBKDF2' as const];
      // @ts-expect-error because `hashAlgorithms` is a read-only property.
      alg.hashAlgorithms = ['SHA-256'];
    });

    describe('checkAlgorithmOptions()', () => {

      let baseKey: PrivateKeyJwk;

      beforeEach(() => {
        baseKey = {
          kty     : 'oct',
          k       : Convert.uint8Array(new Uint8Array(32)).toBase64Url(),
          key_ops : ['deriveBits', 'deriveKey']
        };
      });

      it('does not throw with matching algorithm name and valid hash, iterations, and salt', () => {
        expect(() => alg.checkAlgorithmOptions({
          algorithm: {
            name       : 'PBKDF2',
            hash       : 'SHA-256',
            iterations : 1000,
            salt       : new Uint8Array(16)
          },
          baseKey
        })).to.not.throw();
      });

      it('throws an error when unsupported algorithm specified', () => {
        expect(() => alg.checkAlgorithmOptions({
          algorithm: {
            name       : 'invalid-name',
            hash       : 'SHA-256',
            iterations : 1000,
            salt       : new Uint8Array(16)
          },
          baseKey
        })).to.throw(NotSupportedError, 'Algorithm not supported');
      });

      it('throws an error if the hash property is missing', () => {
        expect(() => alg.checkAlgorithmOptions({
          // @ts-expect-error because `hash` property is intentionally omitted.
          algorithm: {
            name       : 'PBKDF2',
            iterations : 1000,
            salt       : new Uint8Array(16)
          },
          baseKey
        })).to.throw(TypeError, 'Required parameter missing');
      });

      it('throws an error if the given hash algorithm is not supported', () => {
        expect(() => alg.checkAlgorithmOptions({
          algorithm: {
            name       : 'PBKDF2',
            hash       : 'SHA-1',
            iterations : 1000,
            salt       : new Uint8Array(16)
          },
          baseKey
        })).to.throw(TypeError, 'Out of range');
      });

      it('throws an error if the iterations property is missing', () => {
        expect(() => alg.checkAlgorithmOptions({
          // @ts-expect-error because `iterations` property is intentionally omitted.
          algorithm: {
            name : 'PBKDF2',
            hash : 'SHA-256',
            salt : new Uint8Array(16)
          },
          baseKey
        })).to.throw(TypeError, 'Required parameter missing');
      });

      it('throws error if iterations is not a number', () => {
        expect(() => alg.checkAlgorithmOptions({
          algorithm: {
            name       : 'PBKDF2',
            hash       : 'SHA-256',
            // @ts-expect-error because `iterations` is intentionally defined as a string instead of a number.
            iterations : '1000',
            salt       : new Uint8Array(16)
          },
          baseKey
        })).to.throw(TypeError, 'is not of type');
      });

      it('throws error if iterations is not 1 or greater', () => {
        expect(() => alg.checkAlgorithmOptions({
          algorithm: {
            name       : 'PBKDF2',
            hash       : 'SHA-256',
            iterations : 0,
            salt       : new Uint8Array(16)
          },
          baseKey
        })).to.throw(OperationError, 'must be > 0');
      });

      it('throws an error if the salt property is missing', () => {
        expect(() => alg.checkAlgorithmOptions({
          // @ts-expect-error because `salt` property is intentionally omitted.
          algorithm: {
            name : 'PBKDF2',
            hash : 'SHA-256',

          },
          baseKey
        })).to.throw(TypeError, 'Required parameter missing');
      });

      it('throws error if salt is not a Uint8Array', () => {
        expect(() => alg.checkAlgorithmOptions({
          algorithm: {
            name       : 'PBKDF2',
            hash       : 'SHA-256',
            iterations : 1000,
            // @ts-expect-error because counter is being intentionally set to the wrong data type to trigger an error.
            salt       : new Set([...Array(16).keys()].map(n => n.toString(16)))
          },
          baseKey
        })).to.throw(TypeError, 'is not of type');
      });

      it('throws an error if the baseKey property is missing', () => {
        // @ts-expect-error because baseKey property was intentionally omitted.
        expect(() => alg.checkAlgorithmOptions({
          algorithm: {
            name       : 'PBKDF2',
            hash       : 'SHA-256',
            iterations : 1000,
            salt       : new Uint8Array(16)
          },
        })).to.throw(TypeError, `Required parameter missing: 'baseKey'`);
      });

      it('throws an error if the given key is not valid', () => {
        // @ts-ignore-error because a required property is being intentionally deleted to trigger the check to throw.
        delete baseKey.kty;
        expect(() => alg.checkAlgorithmOptions({
          algorithm: {
            name       : 'PBKDF2',
            hash       : 'SHA-256',
            iterations : 1000,
            salt       : new Uint8Array(16)
          },
          baseKey
        })).to.throw(TypeError, 'Object is not a JSON Web Key');
      });

      it('throws an error if the key type of the key is not valid', () => {
        const baseKey: PrivateKeyJwk = {
          kty : 'OKP',
          // @ts-expect-error because OKP JWKs don't have a k parameter.
          k   : Convert.uint8Array(new Uint8Array(32)).toBase64Url()
        };
        expect(() => alg.checkAlgorithmOptions({
          algorithm: {
            name       : 'PBKDF2',
            hash       : 'SHA-256',
            iterations : 1000,
            salt       : new Uint8Array(16)
          },
          baseKey
        })).to.throw(InvalidAccessError, 'Key type of the provided key must be');
      });
    });

    describe('decrypt()', () => {
      it(`throws an error because 'decrypt' operation is valid for PBKDF2 keys`, async () => {
        await expect(alg.decrypt()).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for');
      });
    });

    describe('encrypt()', () => {
      it(`throws an error because 'encrypt' operation is valid for PBKDF2 keys`, async () => {
        await expect(alg.encrypt()).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for');
      });
    });

    describe('generateKey()', () => {
      it(`throws an error because 'generateKey' operation is valid for PBKDF2 keys`, async () => {
        await expect(alg.generateKey()).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for');
      });
    });

    describe('sign()', () => {
      it(`throws an error because 'sign' operation is valid for PBKDF2 keys`, async () => {
        await expect(alg.sign()).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for');
      });
    });

    describe('verify()', () => {
      it(`throws an error because 'verify' operation is valid for PBKDF2 keys`, async () => {
        await expect(alg.verify()).to.eventually.be.rejectedWith(InvalidAccessError, 'is not valid for');
      });
    });

  });
});