import type { DidDocument, DidMethod, DidResolutionOptions, DidResolutionResult } from './types.js';

import * as didUtils from './utils.js';
import { URL } from 'url';

import path from 'path';

export class DidWebMethod implements DidMethod {
  public static methodName: string = 'web';
  public static async resolve(options: { didUrl: string; resolutionOptions?: DidResolutionOptions; }): Promise<DidResolutionResult> {
    const parsedDid = didUtils.parseDid({ didUrl: options.didUrl });
    if (!parsedDid) {
      return {
        '@context'            : 'https://w3id.org/did-resolution/v1',
        didDocument           : undefined,
        didDocumentMetadata   : {},
        didResolutionMetadata : {
          contentType  : 'application/did+ld+json',
          error        : 'invalidDid',
          errorMessage : `Cannot parse DID: ${options.didUrl}`
        }
      };
    }

    if (parsedDid.method !== DidWebMethod.methodName) {
      return {
        '@context'            : 'https://w3id.org/did-resolution/v1',
        didDocument           : undefined,
        didDocumentMetadata   : {},
        didResolutionMetadata : {
          contentType  : 'application/did+ld+json',
          error        : 'methodNotSupported',
          errorMessage : `Method not supported: ${parsedDid.method}`
        }
      };
    }

    let resolutionUrl = `https://${parsedDid.id.replace(/\:/g, '/')}`;
    resolutionUrl = decodeURIComponent(resolutionUrl);

    const parsedResolutionUrl = new URL(resolutionUrl);
    if (parsedResolutionUrl.pathname.length > 1) { // pathname is set to '/' if one doesnt exist
      parsedResolutionUrl.pathname = path.join(parsedResolutionUrl.pathname, 'did.json');
    } else {
      parsedResolutionUrl.pathname = path.join(parsedResolutionUrl.pathname, '.well-known/did.json');
    }

    resolutionUrl = parsedResolutionUrl.toString();

    try {
      const response = await fetch(resolutionUrl);
      if (!response.ok) {
        throw new Error('TODO: Return DID Resolution Result w/ Error instead of throwing Error');
        // TODO: return DID RESOLUTION RESULT w/ ERROR
      }

      const didDocument = await response.json() as DidDocument;

      return {
        '@context'            : 'https://w3id.org/did-resolution/v1',
        didDocument,
        didDocumentMetadata   : {},
        didResolutionMetadata : {
          contentType : 'application/did+ld+json',
          did         : {
            didString        : parsedDid.did,
            methodSpecificId : parsedDid.id,
            method           : parsedDid.method
          }
        }
      };
    } catch (e) {
      return {
        '@context'            : 'https://w3id.org/did-resolution/v1',
        didDocument           : undefined,
        didDocumentMetadata   : {},
        didResolutionMetadata : {
          contentType  : 'application/did+ld+json',
          error        : 'failedResolution', // TODO: figure out appropriate error name
          errorMessage : `Failed to fetch ${resolutionUrl}`
        }
      };
    }
  }
}