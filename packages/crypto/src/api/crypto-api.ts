import type { KeyIdentifier } from './identifier.js';
import type { AsymmetricKeyGenerator, ComputePublicKeyParams, GenerateKeyParams } from './key-generator.js';
import type { SignParams, Signer, VerifyParams } from './signer.js';

export interface CryptoApi<
  GenerateKeyInput = GenerateKeyParams,
  GenerateKeyResult = KeyIdentifier,
  ComputePublicKeyInput = ComputePublicKeyParams,
  SignInput = SignParams,
  VerifyInput = VerifyParams
> extends AsymmetricKeyGenerator<GenerateKeyInput, GenerateKeyResult, ComputePublicKeyInput>,
          Signer<SignInput, VerifyInput> {}