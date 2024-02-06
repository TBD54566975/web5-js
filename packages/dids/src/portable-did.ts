import type { Jwk } from '@web5/crypto';

import type { DidDocumentMetadata, DidVerificationMethod, DidVerificationRelationship } from './types/did-core.js';

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
 * // Export the DID to a PortableDid.
 * const portableDid = await DidExample.toKeys({ did });
 *
 * // Instantiate a BearerDid object from a PortableDid.
 * const didFromKeys = await DidExample.fromKeys({ ...portableDid });
 * // The `didFromKeys` object should be equivalent to the original `did` object.
 * ```
 */
export interface PortableDid {
  /** {@inheritDoc Did#uri} */
  uri?: string;

  /**
   * An array of verification methods, including the key material and key purpose, which are
   * included in the DID document.
   *
   * @see {@link https://www.w3.org/TR/did-core/#verification-methods | DID Core Specification, § Verification Methods}
   */
  verificationMethods: PortableDidVerificationMethod[];
}

/**
 * Represents a verification method within a {@link PortableDid}, including the private key and
 * the purposes for which the verification method can be used.
 *
 * This interface extends {@link DidVerificationMethod}, providing a structure to document the key
 * material and metadata associated with a DID's verification methods.
 */
export interface PortableDidVerificationMethod extends Partial<DidVerificationMethod> {
  /**
   * Express the private key in JWK format.
   *
   * (Optional) A JSON Web Key that conforms to {@link https://datatracker.ietf.org/doc/html/rfc7517 | RFC 7517}.
   */
  privateKeyJwk?: Jwk;

  /**
   * Optionally specify the purposes for which a verification method is intended to be used in a DID
   * document.
   *
   * The `purposes` property defines the specific
   * {@link DidVerificationRelationship | verification relationships} between the DID subject and
   * the verification method. This enables the verification method to be utilized for distinct
   * actions such as authentication, assertion, key agreement, capability delegation, and others. It
   * is important for verifiers to recognize that a verification method must be associated with the
   * relevant purpose in the DID document to be valid for that specific use case.
   *
   * @example
   * ```ts
   * const verificationMethod: PortableDidVerificationMethod = {
   *   publicKeyJwk: {
   *     kty: "OKP",
   *     crv: "X25519",
   *     x: "7XdJtNmJ9pV_O_3mxWdn6YjiHJ-HhNkdYQARzVU_mwY",
   *     kid: "xtsuKULPh6VN9fuJMRwj66cDfQyLaxuXHkMlmAe_v6I"
   *   },
   *   privateKeyJwk: {
   *     kty: "OKP",
   *     crv: "X25519",
   *     d: "qM1E646TMZwFcLwRAFwOAYnTT_AvbBd3NBGtGRKTyU8",
   *     x: "7XdJtNmJ9pV_O_3mxWdn6YjiHJ-HhNkdYQARzVU_mwY",
   *     kid: "xtsuKULPh6VN9fuJMRwj66cDfQyLaxuXHkMlmAe_v6I"
   *   },
   *   purposes: ['authentication', 'assertionMethod']
   * };
   * ```
   */
  purposes?: (DidVerificationRelationship | keyof typeof DidVerificationRelationship)[];
}