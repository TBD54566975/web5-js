import type { Signer } from './signer.js';
import type { KeyIdentifier } from './identifier.js';
import type { AsymmetricKeyGenerator } from './key-generator.js';
import type {
  KmsSignParams,
  KmsDigestParams,
  KmsVerifyParams,
  KmsGetKeyUriParams,
  KmsGenerateKeyParams,
  KmsGetPublicKeyParams,
} from './params-kms.js';
import { Hasher } from './hasher.js';

export interface CryptoApi<
  GenerateKeyInput = KmsGenerateKeyParams,
  GenerateKeyOutput = KeyIdentifier,
  GetPublicKeyInput = KmsGetPublicKeyParams,
  DigestInput = KmsDigestParams,
  SignInput = KmsSignParams,
  VerifyInput = KmsVerifyParams
> extends AsymmetricKeyGenerator<GenerateKeyInput, GenerateKeyOutput, GetPublicKeyInput>,
          Hasher<DigestInput>,
          Signer<SignInput, VerifyInput> {
  /**
   *
   * @param params - The parameters for getting the key URI.
   * @param params.key - The key to get the URI for.
   * @returns The key URI.
   */
  getKeyUri(params: KmsGetKeyUriParams): Promise<KeyIdentifier>;
}