export namespace Web5Crypto {
  export interface AesCtrOptions extends Algorithm {
    counter: BufferSource;
    length: number;
  }

  export interface AesGenerateKeyOptions extends Algorithm {
    length: number;
  }

  export interface AesGcmOptions extends Algorithm {
    additionalData?: BufferSource;
    iv: BufferSource;
    tagLength?: number;
  }

  export interface Algorithm {
    name: string;
  }

  export type AlgorithmIdentifier = Algorithm;

  export interface CryptoKey {
    algorithm: Web5Crypto.GenerateKeyOptions;
    extractable: boolean;
    handle: ArrayBuffer;
    type: KeyType;
    usages: KeyUsage[];
  }

  export interface CryptoKeyPair {
    privateKey: CryptoKey;
    publicKey: CryptoKey;
  }

  export interface EcdsaOptions extends Algorithm {
    hash: string;
  }

  export interface EcGenerateKeyOptions extends Algorithm {
    namedCurve: NamedCurve;
  }

  export interface EcdhDeriveKeyOptions extends Algorithm {
    publicKey: CryptoKey;
  }

  export interface EcdsaGenerateKeyOptions extends EcGenerateKeyOptions {
    compressedPublicKey?: boolean;
  }

  export type EdDsaGenerateKeyOptions = EcGenerateKeyOptions

  export type EdDsaOptions = Algorithm

  export type GenerateKeyOptions = AesGenerateKeyOptions | EcGenerateKeyOptions;

  export interface KeyAlgorithm {
    name: string;
  }

  export interface KeyPairUsage {
    privateKey: KeyUsage[];
    publicKey: KeyUsage[];
  }

  /**
   * KeyType
   *
   * The read-only `type` property of the `ManagedKey` interface indicates which
   * kind of key is represented by the object.
   *
   * It can have the following string values:
   *
   *   "secret": This key is a secret key for use with a symmetric algorithm.
   *   "private": This key is the private half of an asymmetric algorithm's `ManagedKeyPair`.
   *   "public": This key is the public half of an asymmetric algorithm's `ManagedKeyPair`.
   */
  export type KeyType = 'private' | 'public' | 'secret';

  /**
   * KeyUsage
   *
   * The read-only usage property of the CryptoKey interface indicates what can be
   * done with the key.
   *
   * An Array of strings from the following list:
   *
   *   "encrypt": The key may be used to encrypt messages.
   *   "decrypt": The key may be used to decrypt messages.
   *   "sign": The key may be used to sign messages.
   *   "verify": The key may be used to verify signatures.
   *   "deriveKey": The key may be used in deriving a new key.
   *   "deriveBits": The key may be used in deriving bits.
   *   "wrapKey": The key may be used to wrap a key.
   *   "unwrapKey": The key may be used to unwrap a key.
   *
   * Reference: IANA "JSON Web Key Operations" registry
   *            https://www.iana.org/assignments/jose/jose.xhtml#web-key-operations
   */
  export type KeyUsage = 'encrypt' | 'decrypt' | 'sign' | 'verify' | 'deriveKey' | 'deriveBits' | 'wrapKey' | 'unwrapKey';

  export type NamedCurve = string;

  export type PrivateKeyType = 'private' | 'secret';
}