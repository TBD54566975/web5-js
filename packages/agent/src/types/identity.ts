import type { PortableDid } from '@web5/dids';

/**
 * Represents metadata about a Web5 Identity.
 */
export interface IdentityMetadata {
  name: string;
  tenant: string;
  uri: string;
}

export interface PortableIdentity {
  portableDid: PortableDid;

  /** {@inheritDoc IdentityMetadata} */
  metadata: IdentityMetadata;
}