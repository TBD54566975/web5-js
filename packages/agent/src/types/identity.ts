import type { PortableDid } from '@web5/dids';

import { DidStore } from './did.js';

/**
 * Represents metadata about a Web5 Identity.
 */
export interface IdentityMetadata {
  name: string;
  tenant: string;
  uri: string;
}

export type IdentityStore = DidStore<IdentityMetadata>

export interface PortableIdentity {
  portableDid: PortableDid;

  /** {@inheritDoc IdentityMetadata} */
  metadata: IdentityMetadata;
}