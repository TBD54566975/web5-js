import type { Signer } from './signer.js';
import type { KeyIdentifier } from './identifier.js';
import type { KeyImporterExporter } from './key-io.js';
import type { AsymmetricKeyGenerator } from './key-generator.js';
import type {
  KmsSignParams,
  KmsVerifyParams,
  KmsGetKeyUriParams,
  KmsExportKeyParams,
  KmsImportKeyParams,
  KmsGenerateKeyParams,
  KmsGetPublicKeyParams,
} from './params-kms.js';

export interface CryptoApi<
  GenerateKeyInput = KmsGenerateKeyParams,
  GenerateKeyOutput = KeyIdentifier,
  GetPublicKeyInput = KmsGetPublicKeyParams,
  ImportKeyInput = KmsImportKeyParams,
  ImportKeyOutput = KeyIdentifier,
  ExportKeyInput = KmsExportKeyParams,
  SignInput = KmsSignParams,
  VerifyInput = KmsVerifyParams
> extends AsymmetricKeyGenerator<GenerateKeyInput, GenerateKeyOutput, GetPublicKeyInput>,
          KeyImporterExporter<ImportKeyInput, ImportKeyOutput, ExportKeyInput>,
          Signer<SignInput, VerifyInput> {
  /**
   *
   * @param params - The parameters for getting the key URI.
   * @param params.key - The key to get the URI for.
   * @returns The key URI.
   */
  getKeyUri(params: KmsGetKeyUriParams): Promise<KeyIdentifier>;
}