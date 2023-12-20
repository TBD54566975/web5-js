import type { Signer } from './signer.js';
import type { Jwk } from '../jose/jwk.js';
import type { AsymmetricKeyGenerator } from './key-generator.js';
import type { AlgorithmIdentifier, KeyIdentifier } from './identifier.js';
import { KeyImporterExporter } from './key-io.js';

export interface KmsComputePublicKeyParams {
  keyUri: KeyIdentifier;
}

export interface KmsDecryptParams {
  keyUri: KeyIdentifier;
  data: Uint8Array;
}

export interface KmsDeriveBitsParams {
  keyUri: KeyIdentifier;
  length: number;
}

export interface KmsDeriveKeyParams {
  keyUri: KeyIdentifier;
  derivedKeyParams: unknown
}

export interface KmsDigestParams {
  algorithm: AlgorithmIdentifier;
  data: Uint8Array;
}

export interface KmsEncryptParams {
  keyUri: KeyIdentifier;
  data: Uint8Array;
}

export interface KmsExportKeyParams {
  keyUri: KeyIdentifier;
}

export interface KmsGenerateKeyParams {
  algorithm: AlgorithmIdentifier;
}

export interface KmsGetKeyUriParams {
  key: Jwk;
}

export interface KmsImportKeyParams {
  key: Jwk;
}

export interface KmsSignParams {
  keyUri: KeyIdentifier;
  data: Uint8Array;
}

export interface KmsVerifyParams {
  key: Jwk;
  signature: Uint8Array;
  data: Uint8Array;
}

export interface KmsWrapKeyParams {
  key: Jwk;
  wrappingKeyId: KeyIdentifier;
  wrapAlgorithm: AlgorithmIdentifier;
}

export interface KmsUnwrapKeyParams {
  wrappedKey: Uint8Array;
  unwrappingKeyId: KeyIdentifier;
  unwrapAlgorithm: AlgorithmIdentifier;
}

export interface KmsCryptoApi<
  GenerateKeyInput = KmsGenerateKeyParams,
  GenerateKeyResult = KeyIdentifier,
  ComputePublicKeyInput = KmsComputePublicKeyParams,
  ImportKeyInput = KmsImportKeyParams,
  ImportKeyResult = KeyIdentifier,
  ExportKeyInput = KmsExportKeyParams,
  SignInput = KmsSignParams,
  VerifyInput = KmsVerifyParams
> extends AsymmetricKeyGenerator<GenerateKeyInput, GenerateKeyResult, ComputePublicKeyInput>,
          KeyImporterExporter<ImportKeyInput, ImportKeyResult, ExportKeyInput>,
          Signer<SignInput, VerifyInput> {
  getKeyUri(params: KmsGetKeyUriParams): Promise<KeyIdentifier>;
}