import type { PortableDid } from '@web5/dids';

import type { DataStore } from '../store-data.js';

/**
 * Represents metadata about a Web5 Identity.
 */
export interface IdentityMetadata {
  name: string;
  tenant: string;
  uri: string;
}

export type IdentityStore = DataStore<IdentityMetadata>

export interface PortableIdentity {
  portableDid: PortableDid;

  /** {@inheritDoc IdentityMetadata} */
  metadata: IdentityMetadata;
}