import type { Web5Crypto } from '../src/types-key-manager.js';

import { expect } from 'chai';

import { CryptoAlgorithm, EllipticCurveAlgorithm, InvalidAccessError, NotSupportedError } from '../src/algorithms-api/index.js';

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
      it('throws an error if the algorithm name does not match', () => {
        expect(() => alg.checkAlgorithmName('SomeOtherAlgorithm')).to.throw('Algorithm not supported');
      });

      it('does not throw an error if the algorithm name matches', () => {
        expect(() => alg.checkAlgorithmName('TestAlgorithm')).to.not.throw();
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

      it('does not throw when supported algorithm, named curve, and key usage are specified', () => {
        expect(() => alg.checkGenerateKey({
          algorithm : { name: 'TestAlgorithm', namedCurve: 'curveA' },
          keyUsages : ['decrypt']
        })).to.not.throw();
      });

      it('throws an Error when unsupported algorithm specified', () => {
        expect(() => alg.checkGenerateKey({
          algorithm : { name: 'ECDH', namedCurve: 'X25519' },
          keyUsages : ['sign']
        })).to.throw(NotSupportedError, 'Algorithm not supported');
      });

      it('throws an Error when unsupported named curve specified', () => {
        expect(() => alg.checkGenerateKey({
          algorithm : { name: 'TestAlgorithm', namedCurve: 'X25519' },
          keyUsages : ['sign']
        })).to.throw(TypeError, 'Out of range');
      });

      it('throws an Error when the requested operation is not valid', () => {
        ['sign', 'verify'].forEach((operation) => {
          expect(() => alg.checkGenerateKey({
            algorithm : { name: 'TestAlgorithm', namedCurve: 'curveA' },
            keyUsages : [operation as KeyUsage]
          })).to.throw(InvalidAccessError, 'Requested operation');
        });
      });
    });
  });
});


// const testEccAlgorithm = Reflect.construct(EllipticCurveAlgorithm, []) as EllipticCurveAlgorithm;