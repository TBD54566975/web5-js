import type { DidDocument, DidResolutionOptions, DidResolutionResult } from '../types/did-core.js';

import { Did } from '../did.js';
import { DidMethod } from './did-method.js';
import { EMPTY_DID_RESOLUTION_RESULT } from '../types/did-resolution.js';

/**
 * The `DidWeb` class provides an implementation of the `did:web` DID method.
 *
 * Features:
 * - DID Resolution: Resolve a `did:web` to its corresponding DID Document.
 *
 * @remarks
 * The `did:web` method uses a web domain's existing reputation and aims to integrate decentralized
 * identities with the existing web infrastructure to drive adoption. It leverages familiar web
 * security models and domain ownership to provide accessible, interoperable digital identity
 * management.
 *
 * @see {@link https://w3c-ccg.github.io/did-method-web/ | DID Web Specification}
 *
 * @example
 * ```ts
 * // DID Resolution
 * const resolutionResult = await DidWeb.resolve({ did: did.uri });
 * ```
 */
export class DidWeb extends DidMethod {

  /**
   * Name of the DID method, as defined in the DID Web specification.
   */
  public static methodName = 'web';

  /**
   * Resolves a `did:web` identifier to a DID Document.
   *
   * @param didUri - The DID to be resolved.
   * @param _options - Optional parameters for resolving the DID. Unused by this DID method.
   * @returns A Promise resolving to a {@link DidResolutionResult} object representing the result of the resolution.
   */
  public static async resolve(didUri: string, _options?: DidResolutionOptions): Promise<DidResolutionResult> {
    // Attempt to parse the DID URI.
    const parsedDid = Did.parse(didUri);

    // If parsing failed, the DID is invalid.
    if (!parsedDid) {
      return {
        ...EMPTY_DID_RESOLUTION_RESULT,
        didResolutionMetadata: { error: 'invalidDid' }
      };
    }

    // If the DID method is not "web", return an error.
    if (parsedDid.method !== DidWeb.methodName) {
      return {
        ...EMPTY_DID_RESOLUTION_RESULT,
        didResolutionMetadata: { error: 'methodNotSupported' }
      };
    }

    // Replace ":" with "/" in the identifier and prepend "https://" to obtain the fully qualified
    // domain name and optional path.
    let baseUrl = `https://${parsedDid.id.replace(/:/g, '/')}`;

    // If the domain contains a percent encoded port value, decode the colon.
    baseUrl = decodeURIComponent(baseUrl);

    // Append the expected location of the DID document depending on whether a path was specified.
    const didDocumentUrl = parsedDid.id.includes(':') ?
      `${baseUrl}/did.json` :
      `${baseUrl}/.well-known/did.json`;

    try {
      // Perform an HTTP GET request to obtain the DID document.
      const response = await fetch(didDocumentUrl);

      // If the response status code is not 200, return an error.
      if (!response.ok) throw new Error('HTTP error status code returned');

      // Parse the DID document.
      const didDocument = await response.json() as DidDocument;

      return {
        ...EMPTY_DID_RESOLUTION_RESULT,
        didDocument,
      };

    } catch (error: any) {
      // If the DID document could not be retrieved, return an error.
      return {
        ...EMPTY_DID_RESOLUTION_RESULT,
        didResolutionMetadata: { error: 'notFound' }
      };
    }
  }
}