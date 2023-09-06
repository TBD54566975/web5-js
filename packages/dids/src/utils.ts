import type { PublicKeyJwk } from '@web5/crypto';
import { parse, type ParsedDID } from 'did-resolver';

import type { DidDocument, DidService, DidServiceEndpoint, DwnServiceEndpoint } from './types.js';

export interface ParsedDid {
  did: string
  didUrl: string
  method: string
  id: string
  path?: string
  fragment?: string
  query?: string
  params?: ParsedDID['params']
}

export const DID_REGEX = /^did:([a-z0-9]+):((?:(?:[a-zA-Z0-9._-]|(?:%[0-9a-fA-F]{2}))*:)*((?:[a-zA-Z0-9._-]|(?:%[0-9a-fA-F]{2}))+))((;[a-zA-Z0-9_.:%-]+=[a-zA-Z0-9_.:%-]*)*)(\/[^#?]*)?([?][^#]*)?(#.*)?$/;

/**
 * Retrieves services from a given DID document based on provided options.
 * If no `id` or `type` filters are provided, all defined services are returned.
 *
 * Note: The DID document must adhere to the W3C DID specification.
 *
 * @param options - An object containing input parameters for retrieving services.
 * @param options.didDocument - The DID document from which services are retrieved.
 * @param options.id - Optional. A string representing the specific service ID to match. If provided, only the service with this ID will be returned.
 * @param options.type - Optional. A string representing the specific service type to match. If provided, only the service(s) of this type will be returned.
 *
 * @returns An array of services. If no matching service is found, an empty array is returned.
 *
 * @example
 *
 * const didDoc = { ... }; // W3C DID document
 * const services = getServices({ didDocument: didDoc, type: 'DecentralizedWebNode' });
 */
export function getServices(options: {
  didDocument: DidDocument,
  id?: string,
  type?: string
}): DidService[] {
  const { didDocument, id, type } = options ?? {};

  return didDocument?.service?.filter(service => {
    if (id && service.id !== id) return false;
    if (type && service.type !== type) return false;
    return true;
  }) ?? [ ];
}

export function getVerificationMethodIds(options: {
  didDocument: DidDocument,
  publicKeyJwk?: PublicKeyJwk,
  publicKeyMultibase?: string
}): string | undefined {
  const { didDocument, publicKeyJwk, publicKeyMultibase } = options;
  if (!didDocument) throw new Error(`Required parameter missing: 'didDocument'`);
  if (!didDocument.verificationMethod) throw new Error('Given `didDocument` is missing `verificationMethod` entries.');

  for (let method of didDocument.verificationMethod) {
    if (publicKeyMultibase && 'publicKeyMultibase' in method) {
      if (publicKeyMultibase === method.publicKeyMultibase) {
        return method.id;
      }
    } else if (publicKeyJwk && 'crv' in publicKeyJwk &&
               'publicKeyJwk' in method && 'crv' in method.publicKeyJwk) {
      if (publicKeyJwk.crv === method.publicKeyJwk.crv &&
            publicKeyJwk.x === method.publicKeyJwk.x) {
        return method.id;
      }
    }
  }
}

/**
 * Retrieves DID verification method types from a given DID document.
 *
 * Note: The DID document must adhere to the W3C DID specification.
 *
 * @param options - An object containing input parameters for retrieving types.
 * @param options.didDocument - The DID document from which types are retrieved.
 *
 * @returns An array of types. If no types were found, an empty array is returned.
 */
export function getVerificationMethodTypes(options: {
  didDocument: Record<string, any>
}): string[] {
  const { didDocument } = options;

  let types: string[] = [];

  for (let key in didDocument) {
    if (typeof didDocument[key] === 'object') {
      types = types.concat(getVerificationMethodTypes({
        didDocument: didDocument[key]
      }));

    } else if (key === 'type') {
      types.push(didDocument[key]);
    }
  }

  return [...new Set(types)]; // return only unique types
}

/**
 * Type guard function to check if the given endpoint is a DwnServiceEndpoint.
 *
 * @param key The endpoint to check.
 * @returns True if the endpoint is a DwnServiceEndpoint, false otherwise.
 */
export function isDwnServiceEndpoint(endpoint: string | DidServiceEndpoint | DidServiceEndpoint[]): endpoint is DwnServiceEndpoint {
  return endpoint !== undefined &&
    typeof endpoint !== 'string' &&
    !Array.isArray(endpoint) &&
    'nodes' in endpoint &&
    'signingKeys' in endpoint;
}

export function parseDid({ didUrl }: { didUrl: string }): ParsedDid | undefined {
  const parsedDid: ParsedDid = parse(didUrl);

  return parsedDid;
}