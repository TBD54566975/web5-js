import type { DidResolutionResult } from './types/did-core.js';

export const EMPTY_DID_RESOLUTION_RESULT: DidResolutionResult = {
  '@context'            : 'https://w3id.org/did-resolution/v1',
  didResolutionMetadata : {},
  didDocument           : null,
  didDocumentMetadata   : {},
};