import type { Jwk } from '../jose/jwk.js';

export interface KeyImporterExporter<
  ImportKeyInput,
  ImportKeyResult,
  ExportKeyInput
> {
  exportKey(params: ExportKeyInput): Promise<Jwk>;

  importKey(params: ImportKeyInput): Promise<ImportKeyResult>;
}