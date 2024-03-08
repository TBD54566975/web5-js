import type { PortableDid } from '@web5/dids';

export function isPortableDid(obj: unknown): obj is PortableDid {
  // Validate that the given value is an object that has the necessary properties of PortableDid.
  return !(!obj || typeof obj !== 'object' || obj === null)
    && 'uri' in obj
    && 'document' in obj
    && 'metadata' in obj
    && (!('keyManager' in obj) || obj.keyManager === undefined);
}