import type { Jwk } from '../jose/jwk.js';
import type { KeyIdentifier } from './identifier.js';

export interface ExportKeyParams {
  keyUri: KeyIdentifier;
}

export interface ImportKeyParams {
  algorithm: AlgorithmIdentifier;
  key: Jwk;
}

export interface KeyImporterExporter<
  ExportKeyInput = ExportKeyParams,
  ImportKeyInput = ImportKeyParams,
  ImportKeyResult = KeyIdentifier
> {
  exportKey(options: ExportKeyInput): Promise<Jwk>;
  importKey(options: ImportKeyInput): Promise<ImportKeyResult>;
}