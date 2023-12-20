import type { Jwk } from '../jose/jwk.js';
import type { Signer } from './signer.js';
import type { AsymmetricKeyGenerator } from './key-generator.js';
import type { ComputePublicKeyParams, GenerateKeyParams, SignParams, VerifyParams } from './direct-params.js';

export interface CryptoApi<
  GenerateKeyInput = GenerateKeyParams,
  GenerateKeyResult = Jwk,
  ComputePublicKeyInput = ComputePublicKeyParams,
  SignInput = SignParams,
  VerifyInput = VerifyParams
> extends AsymmetricKeyGenerator<GenerateKeyInput, GenerateKeyResult, ComputePublicKeyInput>,
          Signer<SignInput, VerifyInput> {}