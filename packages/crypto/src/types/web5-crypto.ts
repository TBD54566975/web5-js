import type { Jwk } from '../jose/jwk.js';

export namespace Web5Crypto {
  export interface AesCtrOptions extends Algorithm {
    counter: Uint8Array;
    length: number;
  }

  export interface AesGenerateKeyOptions extends Algorithm { }

  export interface AesGcmOptions extends Algorithm {
    additionalData?: Uint8Array;
    iv: Uint8Array;
    tagLength?: number;
  }

  export interface Algorithm {
    name: string;
  }

  export type AlgorithmIdentifier = Algorithm;

  export interface EcdsaOptions extends Algorithm {}

  export interface EcGenerateKeyOptions extends Algorithm {
    curve: NamedCurve;
  }
  export interface EcdhDeriveKeyOptions extends Algorithm {
    publicKey: Jwk;
  }

  export interface EcdsaGenerateKeyOptions extends EcGenerateKeyOptions { }

  export type EdDsaGenerateKeyOptions = EcGenerateKeyOptions

  export type EdDsaOptions = Algorithm

  export type GenerateKeyOptions = AesGenerateKeyOptions | EcGenerateKeyOptions | HmacGenerateKeyOptions;

  export interface HmacGenerateKeyOptions extends Algorithm {
    hash: AlgorithmIdentifier;
    length?: number;
  }

  export interface KeyAlgorithm {
    name: string;
  }

  export type KeyFormat = 'jwk' | 'pkcs8' | 'raw' | 'spki';

  export type NamedCurve = string;

  export interface Pbkdf2Options extends Algorithm {
    hash: string;
    iterations: number;
    salt: Uint8Array;
  }
}