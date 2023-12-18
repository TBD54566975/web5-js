import type { Jwk } from '../jose/jwk.js';
import type { KeyIdentifier } from './identifier.js';

export interface ExportKeyParams {
  keyUri: KeyIdentifier;
}

export interface ImportKeyParams {
  algorithm: AlgorithmIdentifier;
  key: JsonWebKey;
}

export interface KeyImporterExporter {
  exportKey(options: ExportKeyParams): Promise<Jwk>;
  importKey(options: ImportKeyParams): Promise<KeyIdentifier>;
}