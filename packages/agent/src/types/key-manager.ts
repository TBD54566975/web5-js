import type { Cipher, Jwk, KeyIdentifier, KeyWrapper, KmsExportKeyParams, KmsImportKeyParams } from '@web5/crypto';

import type { Web5PlatformAgent } from './agent.js';
import type { KeyManager } from '../prototyping/crypto/types/key-manager.js';
import type { KeyDeleter, KeyExporter, KeyImporter } from '../prototyping/crypto/types/key-io.js';
import type { KmsCipherParams, KmsDeleteKeyParams, KmsUnwrapKeyParams, KmsWrapKeyParams } from '../prototyping/crypto/types/params-kms.js';
export interface AgentKeyManager extends KeyManager,
  Cipher<KmsCipherParams, KmsCipherParams>,
  KeyImporter<KmsImportKeyParams, KeyIdentifier>,
  KeyExporter<KmsExportKeyParams, Jwk>,
  KeyDeleter<KmsDeleteKeyParams>,
  KeyWrapper<KmsWrapKeyParams, KmsUnwrapKeyParams> {

  agent: Web5PlatformAgent;
}