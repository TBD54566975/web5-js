import type { Jwk } from '@web5/crypto';

import type { DidDocument, DidDocumentMetadata } from './did-core.js';

/**
 * Represents metadata about a DID resulting from create, update, or deactivate operations.
 */
export interface DidMetadata extends DidDocumentMetadata {
  /**
   * For DID methods that support publishing, the `published` property indicates whether the DID
   * document has been published to the respective network.
   *
   * A `true` value signifies that the DID document is publicly accessible on the network (e.g.,
   * Mainline DHT), allowing it to be resolved by others. A `false` value implies the DID document
   * is not published, limiting its visibility to public resolution.  Absence of this property
   * indicates that the DID method does not support publishing.
   */
  published?: boolean;
}

/**
 * Format to document a DID identifier, along with its associated data, which can be exported,
 * saved to a file, or imported. The intent is bundle all of the necessary metadata to enable usage
 * of the DID in different contexts.
 */
/**
 * Format that documents the key material and metadata of a Decentralized Identifier (DID) to enable
 * usage of the DID in different contexts.
 *
 * This format is useful for exporting, saving to a file, or importing a DID across process
 * boundaries or between different DID method implementations.
 *
 * @example
 * ```ts
 * // Generate a new DID.
 * const did = await DidExample.create();
 *
 * // Export to a PortableDid.
 * const portableDid = await did.export();
 *
 * // Instantiate a BearerDid object from a PortableDid.
 * const importedDid = await DidExample.import(portableDid);
 * // The `importedDid` object should be equivalent to the original `did` object.
 * ```
 */
export interface PortableDid {
  /** {@inheritDoc Did#uri} */
  uri: string;

  /**
   * The DID document associated with this DID.
   *
   * @see {@link https://www.w3.org/TR/did-core/#dfn-diddocument | DID Core Specification, § DID Document}
   */
  document: DidDocument;

  /** {@inheritDoc DidMetadata} */
  metadata: DidMetadata;

  /**
   * An optional array of private keys associated with the DID document's verification methods.
   */
  privateKeys?: Jwk[];
}