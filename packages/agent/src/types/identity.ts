import type { PortableDid } from '@web5/dids';

import { DidStore } from './did.js';

/**
 * Represents metadata about a Web5 Identity.
 */
export interface IdentityMetadata {
  name: string;
}

export type IdentityStore = DidStore<PortableIdentity>

export interface PortableIdentity {
  did: PortableDid;

  /** {@inheritDoc IdentityMetadata} */
  metadata: IdentityMetadata;
}