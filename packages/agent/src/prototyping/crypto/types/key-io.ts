import type { Jwk } from '@web5/crypto';

/**
 * The `KeyExporter` interface provides a method for exporting cryptographic keys.
 */
export interface KeyExporter<ExportKeyInput, ExportKeyOutput = Jwk> {
  /**
   * Exports a cryptographic key to an external JWK object.
   *
   * @remarks
   * The `exportKey()` method of the {@link KeyImporterExporter | `KeyImporterExporter`} interface
   * returns a cryptographic key in JWK format, facilitating interoperability and backup.
   *
   * @param params - The parameters for the key export operation.
   *
   * @returns A Promise resolving to the exported key in JWK format.
   */
  exportKey(params: ExportKeyInput): Promise<ExportKeyOutput>;
}

/**
 * The `KeyImporter` interface provides a method for importing cryptographic keys.
 */
export interface KeyImporter<ImportKeyInput, ImportKeyOutput = void> {
  /**
   * Imports an external key in JWK format.
   *
   * @remarks
   * The `importKey()` method of the {@link KeyImporterExporter | `KeyImporterExporter`} interface
   * takes as input an external key in JWK format and typically returns a key identifier reference
   * for the imported key.
   *
   * @param params - The parameters for the key import operation.
   *
   * @returns A Promise resolving to the key identifier of the imported key.
   */
  importKey(params: ImportKeyInput): Promise<ImportKeyOutput>;
}