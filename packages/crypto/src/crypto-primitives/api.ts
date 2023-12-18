import type { Jwk } from '../jose/jwk.js';
import type { EnclosedSignParams, EnclosedVerifyParams } from '../api/signer.js';

export namespace PrimitiveApi {
  /**
   * Cipher Types
   */
  export interface DecryptParams {
    privateKey: Jwk;
    data: Uint8Array;
  }

  export interface EncryptParams {
    privateKey: Jwk;
    data: Uint8Array;
  }

  export interface Cipher<EncryptInput = EncryptParams, DecryptInput = DecryptParams> {
    encrypt(options: EncryptInput): Promise<Uint8Array>;

    decrypt(options: DecryptInput): Promise<Uint8Array>;
  }

  /**
   * Key Conversion Types
   */
  export interface KeyConverter {
    bytesToPrivateKey(options: { privateKeyBytes: Uint8Array }): Promise<Jwk>;

    privateKeyToBytes(options: { privateKey: Jwk }): Promise<Uint8Array>;
  }

  export interface AsymmetricKeyConverter extends KeyConverter {
    bytesToPublicKey(options: { publicKeyBytes: Uint8Array }): Promise<Jwk>;

    publicKeyToBytes(options: { publicKey: Jwk }): Promise<Uint8Array>;
  }

  /**
   * Key Generation Types
   */
  export interface AsymmetricKeyGenerator<
    GenerateKeyInput = never,
    ComputePublicKeyInput = ComputePublicKeyParams
  > extends KeyGenerator<GenerateKeyInput> {
    computePublicKey(params: ComputePublicKeyInput): Promise<Jwk>;
  }

  export interface ComputePublicKeyParams {
    privateKey: Jwk;
  }

  export interface KeyGenerator<
    GenerateKeyInput = never,
  > {
    generateKey(params?: GenerateKeyInput): Promise<Jwk>;
  }

  /**
   * Signature Algorithm Types
   */
  export interface SignParams extends EnclosedSignParams {
    privateKey: Jwk;
  }

  export interface VerifyParams extends EnclosedVerifyParams {
    publicKey: Jwk;
  }

  export interface Signer<SignInput = SignParams, VerifyInput = VerifyParams> {
    sign(params: SignInput): Promise<Uint8Array>;

    verify(params: VerifyInput): Promise<boolean>;
  }
}