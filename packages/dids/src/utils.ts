import type { KeyPairJwk } from '@tbd54566975/crypto';
import type { DidDocument, InterestingVerificationMethod, ServiceEndpoint } from './types.js';

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

export function createInterestingVerificationMethod(id: string, keyPairJwk: KeyPairJwk): InterestingVerificationMethod {
  const { publicKeyJwk, privateKeyJwk } = keyPairJwk;

  return {
    id         : `${id}#${keyPairJwk.publicKeyJwk.kid}`,
    type       : 'JsonWebKey2020',
    controller : id,
    publicKeyJwk,
    privateKeyJwk
  };
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
