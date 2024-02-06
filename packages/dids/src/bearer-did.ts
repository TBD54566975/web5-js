import type { CryptoApi, Signer } from '@web5/crypto';

import type { DidMetadata } from './portable-did.js';
import type { DidDocument } from './types/did-core.js';

/**
 * Represents a Decentralized Identifier (DID) along with its DID document, key manager, metadata,
 * and convenience functions.
 */
export interface BearerDid {
  /**
   * The DID document associated with this DID.
   */
  didDocument: DidDocument;

  /**
   * Returns a {@link @web5/crypto#Signer} that can be used to sign messages, credentials, or
   * arbitrary data.
   *
   * If given, the `keyUri` parameter is used to select a key from the verification methods present
   * in the DID Document. If `keyUri` is not given, each DID method implementation will select a
   * default verification method key from the DID Document.
   *
   * @param params - The parameters for the `getSigner` operation.
   * @param params.keyUri - Key URI of the key that will be used for sign and verify operations. Optional.
   * @returns An instantiated {@link Signer} that can be used to sign and verify data.
   */
  getSigner: (params?: { keyUri?: string }) => Promise<Signer>;

  /**
   * Key Management System (KMS) used to manage a DIDs keys and sign data.
   *
   * Each DID method requires at least one key be present in the provided `keyManager`.
   */
  keyManager: CryptoApi;

  /** {@inheritDoc DidMetadata} */
  metadata: DidMetadata;

  /** {@inheritDoc Did#uri} */
  uri: string;
}