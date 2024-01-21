import type { PublicKeyJwk } from '@web5/crypto';
import { type ParsedDID } from 'did-resolver';
import type { DidDocument, DidResource, VerificationMethod, DidService, DidServiceEndpoint, DwnServiceEndpoint } from './types.js';
export interface ParsedDid {
    did: string;
    didUrl: string;
    method: string;
    id: string;
    path?: string;
    fragment?: string;
    query?: string;
    params?: ParsedDID['params'];
}
export declare const DID_REGEX: RegExp;
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
export declare function getServices(options: {
    didDocument: DidDocument;
    id?: string;
    type?: string;
}): DidService[];
export declare function getVerificationMethodIds(options: {
    didDocument: DidDocument;
    publicKeyJwk?: PublicKeyJwk;
    publicKeyMultibase?: string;
}): string | undefined;
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
export declare function getVerificationMethodTypes(options: {
    didDocument: Record<string, any>;
}): string[];
/**
 * Type guard function to check if the given endpoint is a DwnServiceEndpoint.
 *
 * @param key The endpoint to check.
 * @returns True if the endpoint is a DwnServiceEndpoint, false otherwise.
 */
export declare function isDwnServiceEndpoint(endpoint: string | DidServiceEndpoint | DidServiceEndpoint[]): endpoint is DwnServiceEndpoint;
export declare function parseDid({ didUrl }: {
    didUrl: string;
}): ParsedDid | undefined;
/**
 * type guard for {@link VerificationMethod}
 * @param didResource - the resource to check
 * @returns true if the didResource is a `VerificationMethod`
 */
export declare function isVerificationMethod(didResource: DidResource): didResource is VerificationMethod;
//# sourceMappingURL=utils.d.ts.map