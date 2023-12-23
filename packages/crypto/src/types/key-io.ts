import type { Jwk } from '../jose/jwk.js';

export interface KeyImporterExporter<
  ImportKeyInput,
  ImportKeyOutput,
  ExportKeyInput
> {
  exportKey(params: ExportKeyInput): Promise<Jwk>;

  importKey(params: ImportKeyInput): Promise<ImportKeyOutput>;
}