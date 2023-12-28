import type { Jwk } from '../jose/jwk.js';

/**
 * The `KeyImporterExporter` interface provides methods for importing and exporting cryptographic
 * keys. It includes `importKey()` for importing external keys, and `exportKey()` for exporting a
 * cryptographic key to an external JWK object.
 *
 * This interface is designed to handle various key formats and is adaptable for different
 * cryptographic environments and requirements.
 */
export interface KeyImporterExporter<
  ImportKeyInput,
  ImportKeyOutput,
  ExportKeyInput
> {
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
  exportKey(params: ExportKeyInput): Promise<Jwk>;

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