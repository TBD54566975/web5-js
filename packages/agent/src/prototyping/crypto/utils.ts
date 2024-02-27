import type { KeyWrapper } from '@web5/crypto';

import type { KeyExporter, KeyImporter } from './types/key-io.js';

export function isKeyExporter<ExportKeyInput, ExportKeyOutput>(
  obj: unknown
): obj is KeyExporter<ExportKeyInput, ExportKeyOutput> {
  return (
    obj !== null && typeof obj === 'object'
    && 'exportKey' in obj && typeof obj.exportKey === 'function'
  );
}

export function isKeyImporter<ImportKeyInput, ImportKeyExport>(
  obj: unknown
): obj is KeyImporter<ImportKeyInput, ImportKeyExport> {
  return (
    obj !== null && typeof obj === 'object'
    && 'importKey' in obj && typeof obj.importKey === 'function'
  );
}

export function isKeyWrapper<WrapKeyInput, UnwrapKeyInput>(
  obj: unknown
): obj is KeyWrapper<WrapKeyInput, UnwrapKeyInput> {
  return (
    obj !== null && typeof obj === 'object'
    && 'wrapKey' in obj && typeof obj.wrapKey === 'function'
    && 'unwrapKey' in obj && typeof obj.unwrapKey === 'function'
  );
}