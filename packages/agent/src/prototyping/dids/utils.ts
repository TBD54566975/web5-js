import type { DidService, PortableDid } from '@web5/dids';

export function isPortableDid(obj: unknown): obj is PortableDid {
  // Validate that the given value is an object that has the necessary properties of PortableDid.
  return !(!obj || typeof obj !== 'object' || obj === null)
    && 'uri' in obj
    && 'document' in obj
    && 'metadata' in obj
    && (!('keyManager' in obj) || obj.keyManager === undefined);
}

/**
 * Move this type from `src/utils.ts` to `types/extensions.ts`
 */

/**
 * Represents a Decentralized Web Node (DWN) service in a DID Document.
 *
 * A DWN DID service is a specialized type of DID service with the `type` set to
 * `DecentralizedWebNode`. It includes specific properties `enc` and `sig` that are used to identify
 * the public keys that can be used to interact with the DID Subject. The values of these properties
 * are strings or arrays of strings containing one or more verification method `id` values present in
 * the same DID document. If the `enc` and/or `sig` properties are an array of strings, an entity
 * interacting with the DID subject is expected to use the verification methods in the order they
 * are listed.
 *
 * @example
 * ```ts
 * const service: DwnDidService = {
 *   id: 'did:example:123#dwn',
 *   type: 'DecentralizedWebNode',
 *   serviceEndpoint: 'https://dwn.tbddev.org/dwn0',
 *   enc: 'did:example:123#key-1',
 *   sig: 'did:example:123#key-2'
 * }
 * ```
 *
 * @see {@link https://identity.foundation/decentralized-web-node/spec/ | DIF Decentralized Web Node (DWN) Specification}
 */
export interface DwnDidService extends DidService {
  /**
   * One or more verification method `id` values that can be used to encrypt information
   * intended for the DID subject.
   */
  enc?: string | string[];

  /**
   * One or more verification method `id` values that will be used by the DID subject to sign data
   * or by another entity to verify signatures created by the DID subject.
   */
  sig: string | string[];
}