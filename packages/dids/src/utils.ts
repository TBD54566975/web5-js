import type { KeyPairJwk } from '@tbd54566975/crypto';
import type { DidDocument, VerificationMethod, VerificationMethodWithPrivateKeyJwk, ServiceEndpoint } from './types.js';

export function createVerificationMethodWithPrivateKeyJwk(id: string, keyPairJwk: KeyPairJwk): VerificationMethodWithPrivateKeyJwk {
  const { publicKeyJwk, privateKeyJwk } = keyPairJwk;

  return {
    id         : `${id}#${keyPairJwk.publicKeyJwk.kid}`,
    type       : 'JsonWebKey2020',
    controller : id,
    publicKeyJwk,
    privateKeyJwk
  };
}

export type ParsedDid = {
  method: string;
  id: string;
}

export function parseDid(did: string): ParsedDid {
  if (!DID_REGEX.test(did)) {
    throw new Error('Invalid DID');
  }

  const [didString,] = did.split('#');
  const [, method, id] = didString.split(':', 3);

  return { method, id };
}

export type FindVerificationMethodsOptions = {
  id?: string;
  purpose?: string;
};

/**
 *
 * @param {object} options Object containing search parameters
 * @param {string} options.id Method ID to search by
 * @param {string} options.purpose Purpose to search by
 * @returns {VerificationMethod[] | null}
 */
export function findVerificationMethods(didDocument: DidDocument, options?: FindVerificationMethodsOptions): VerificationMethod[] | null {
  if (!didDocument?.verificationMethod) throw new Error('DID Document with `verificationMethod` is a required argument');
  if (options?.purpose && options?.id) throw new Error('Specify method ID or purpose but not both');

  function findMethodById(methodId?: string): VerificationMethod[] {
    let results = [];

    // First try to find the ID in the verification methods array
    const verificationMethodsResult = didDocument?.verificationMethod?.filter(method => {
      if (methodId && method.id !== methodId) return false;
      return true;
    });
    if (verificationMethodsResult) results.push(...verificationMethodsResult);

    // If the ID wasn't found, search in each of the verification relationships / purposes
    DID_VERIFICATION_RELATIONSHIPS.forEach(purpose => {
      if (Array.isArray(didDocument[purpose])) {
        const verificationRelationshipsResult = didDocument[purpose].filter(method => {
          if (methodId && method.id !== methodId) return false; // If methodId specified, match on `id` value
          if (typeof method === 'string') return false; // Ignore verification method references
          return true;
        });
        if (verificationRelationshipsResult) results.push(...verificationRelationshipsResult);
      }
    });
    return results;
  }

  // Find by verification method ID
  if (options?.purpose === undefined) {
    const results = findMethodById(options?.id);
    return (results.length > 0) ? results : null;
  }

  // Find by verification relationship / purpose (e.g., authentication, keyAgreement, etc.)
  if (options?.purpose !== undefined) {
    let results = [];
    const methods = didDocument[options.purpose] || [];
    methods.forEach(method => {
      if (typeof method === 'string') {
        // Find full description for referenced verification methods
        const result = findMethodById(method);
        if (result) results.push(...result);
      } else {
        results.push(method);
      }
    });
    return (results.length > 0) ? results : null;
  }
}

export type GetServicesOptions = {
  id?: string;
  type?: string;
};

/**
 * returns services from the provided DID Document based on the filter. will return all services if no filter is provided
 * @param didDocument the did document to search
 * @param options search filter
 * @returns matched services
 */
export function getServices(didDocument: DidDocument, options: GetServicesOptions = {}): ServiceEndpoint[] {
  return didDocument?.service?.filter(service => {
    if (options?.id && service.id !== options.id) return false;
    if (options?.type && service.type !== options.type) return false;
    return true;
  }) ?? [ ];
}

export const DID_REGEX = /^did:([a-z0-9]+):((?:(?:[a-zA-Z0-9._-]|(?:%[0-9a-fA-F]{2}))*:)*((?:[a-zA-Z0-9._-]|(?:%[0-9a-fA-F]{2}))+))((;[a-zA-Z0-9_.:%-]+=[a-zA-Z0-9_.:%-]*)*)(\/[^#?]*)?([?][^#]*)?(#.*)?$/;

export const DID_VERIFICATION_RELATIONSHIPS = [
  'assertionMethod',
  'authentication',
  'capabilityDelegation',
  'capabilityInvocation',
  'keyAgreement',
];