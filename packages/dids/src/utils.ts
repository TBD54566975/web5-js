import type { Jwk } from '@web5/crypto';
import type { RequireOnly } from '@web5/common';

import { Convert, Multicodec } from '@web5/common';
import { computeJwkThumbprint } from '@web5/crypto';

import type { KeyWithMulticodec } from './types/multibase.js';

import { DidError, DidErrorCode } from './did-error.js';
import {
  DidService,
  DidDocument,
  DidVerificationMethod,
  DidVerificationRelationship,
} from './types/did-core.js';

/**
 * Represents a Decentralized Web Node (DWN) service in a DID Document.
 *
 * A DWN DID service is a specialized type of DID service with the `type` set to
 * `DecentralizedWebNode`. It includes specific properties `enc` and `sig` that are used to identify
 * the public keys that can be used to interact with the DID Subject. The values of these properties
 * are strings or arrays of strings containing one or more verification method `id` values present in
 * the same DID document. If the `enc` and/or `sig` properties are an array of strings, an entity
 * interacting with the DID subject is expected to use the verification methods in the order they
 * are listed.
 *
 * @example
 * ```ts
 * const service: DwnDidService = {
 *   id: 'did:example:123#dwn',
 *   type: 'DecentralizedWebNode',
 *   serviceEndpoint: 'https://dwn.tbddev.org/dwn0',
 *   enc: 'did:example:123#key-1',
 *   sig: 'did:example:123#key-2'
 * }
 * ```
 *
 * @see {@link https://identity.foundation/decentralized-web-node/spec/ | DIF Decentralized Web Node (DWN) Specification}
 */
export interface DwnDidService extends DidService {
  /**
   * One or more verification method `id` values that can be used to encrypt information
   * intended for the DID subject.
   */
  enc?: string | string[];

  /**
   * One or more verification method `id` values that will be used by the DID subject to sign data
   * or by another entity to verify signatures created by the DID subject.
   */
  sig: string | string[];
}

/**
 * Extracts the fragment part of a Decentralized Identifier (DID) verification method identifier.
 *
 * This function takes any input and aims to return only the fragment of a DID identifier,
 * which comes after the '#' symbol in a DID string. It's designed specifically for handling
 * DID verification method identifiers. The function returns undefined for non-string inputs, inputs
 * that do not contain a '#', or complex data structures like objects or arrays, ensuring that only
 * the fragment part of a DID string is extracted when present.
 *
 * @example
 * ```ts
 * console.log(extractDidFragment("did:example:123#key-1")); // Output: "key-1"
 * console.log(extractDidFragment("did:example:123")); // Output: undefined
 * console.log(extractDidFragment({ id: "did:example:123#0", type: "JsonWebKey" })); // Output: undefined
 * console.log(extractDidFragment(undefined)); // Output: undefined
 * ```
 *
 * @param input - The input to be processed. Can be of any type, but the function is designed
 *                to work with strings that represent DID verification method identifiers.
 * @returns The fragment part of the DID identifier if the input is a string containing a '#'.
 *          Returns an empty string for all other inputs, including non-string types, strings
 *          without a '#', and complex data structures.
 */
export function extractDidFragment(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  if (input.length === 0) return undefined;
  return input.split('#').pop();
}

/**
 * Retrieves services from a given DID document, optionally filtered by `id` or `type`.
 *
 * If no `id` or `type` filters are provided, all defined services are returned.
 *
 * The given DID Document must adhere to the
 * {@link https://www.w3.org/TR/did-core/ | W3C DID Core Specification}.
 *
 * @example
 * ```ts
 * const didDocument = { ... }; // W3C DID document
 * const services = getServices({ didDocument, type: 'DecentralizedWebNode' });
 * ```
 *
 * @param params - An object containing input parameters for retrieving services.
 * @param params.didDocument - The DID document from which services are retrieved.
 * @param params.id - Optional. A string representing the specific service ID to match. If provided, only the service with this ID will be returned.
 * @param params.type - Optional. A string representing the specific service type to match. If provided, only the service(s) of this type will be returned.
 * @returns An array of services. If no matching service is found, an empty array is returned.
 */
export function getServices({ didDocument, id, type }: {
  didDocument: DidDocument;
  id?: string;
  type?: string;
}): DidService[] {
  return didDocument?.service?.filter(service => {
    if (id && service.id !== id) return false;
    if (type && service.type !== type) return false;
    return true;
  }) ?? [];
}

/**
 * Retrieves a verification method object from a DID document if there is a match for the given
 * public key.
 *
 * This function searches the verification methods in a given DID document for a match with the
 * provided public key (either in JWK or multibase format). If a matching verification method is
 * found it is returned. If no match is found `null` is returned.
 *
 *
 * @example
 * ```ts
 * const didDocument = {
 *   // ... contents of a DID document ...
 * };
 * const publicKeyJwk = { kty: 'OKP', crv: 'Ed25519', x: '...' };
 *
 * const verificationMethod = await getVerificationMethodByKey({
 *   didDocument,
 *   publicKeyJwk
 * });
 * ```
 *
 * @param params - An object containing input parameters for retrieving the verification method ID.
 * @param params.didDocument - The DID document to search for the verification method.
 * @param params.publicKeyJwk - The public key in JSON Web Key (JWK) format to match against the verification methods in the DID document.
 * @param params.publicKeyMultibase - The public key as a multibase encoded string to match against the verification methods in the DID document.
 * @returns A promise that resolves with the matching verification method, or `null` if no match is found.
 * @throws Throws an `Error` if the `didDocument` parameter is missing or if the `didDocument` does not contain any verification methods.
 */
export async function getVerificationMethodByKey({ didDocument, publicKeyJwk, publicKeyMultibase }: {
  didDocument: DidDocument;
  publicKeyJwk?: Jwk;
  publicKeyMultibase?: string;
}): Promise<DidVerificationMethod | null> {
  // Collect all verification methods from the DID document.
  const verificationMethods = getVerificationMethods({ didDocument });

  for (let method of verificationMethods) {
    if (publicKeyJwk && method.publicKeyJwk) {
      const publicKeyThumbprint = await computeJwkThumbprint({ jwk: publicKeyJwk });
      if (publicKeyThumbprint === await computeJwkThumbprint({ jwk: method.publicKeyJwk })) {
        return method;
      }
    } else if (publicKeyMultibase && method.publicKeyMultibase) {
      if (publicKeyMultibase === method.publicKeyMultibase) {
        return method;
      }
    }
  }

  return null;
}

/**
 * Retrieves all verification methods from a given DID document, including embedded methods.
 *
 * This function consolidates all verification methods into a single array for easy access and
 * processing. It checks both the primary `verificationMethod` array and the individual verification
 * relationship properties `authentication`, `assertionMethod`, `keyAgreement`,
 * `capabilityInvocation`, and `capabilityDelegation` for embedded methods.
 *
 * The given DID Document must adhere to the
 * {@link https://www.w3.org/TR/did-core/ | W3C DID Core Specification}.
 *
 * @example
 * ```ts
 * const didDocument = { ... }; // W3C DID document
 * const verificationMethods = getVerificationMethods({ didDocument });
 * ```
 *
 * @param params - An object containing input parameters for retrieving verification methods.
 * @param params.didDocument - The DID document from which verification methods are retrieved.
 * @returns An array of `DidVerificationMethod`. If no verification methods are found, an empty array is returned.
 * @throws Throws an `TypeError` if the `didDocument` parameter is missing.
 */
export function getVerificationMethods({ didDocument }: {
  didDocument: DidDocument;
}): DidVerificationMethod[] {
  if (!didDocument) throw new TypeError(`Required parameter missing: 'didDocument'`);

  const verificationMethods: DidVerificationMethod[] = [];

  // Check the 'verificationMethod' array.
  verificationMethods.push(...didDocument.verificationMethod?.filter(isDidVerificationMethod) ?? []);

  // Check verification relationship properties for embedded verification methods.
  Object.keys(DidVerificationRelationship).forEach((relationship) => {
    verificationMethods.push(
      ...(didDocument[relationship as keyof DidDocument] as (string | DidVerificationMethod)[])
        ?.filter(isDidVerificationMethod) ?? []
    );
  });

  return verificationMethods;
}

/**
 * Retrieves all DID verification method types from a given DID document.
 *
 * The given DID Document must adhere to the
 * {@link https://www.w3.org/TR/did-core/ | W3C DID Core Specification}.
 *
 * @example
 * ```ts
 * const didDocument = {
 *   verificationMethod: [
 *     {
 *       'id'              : 'did:example:123#key-0',
 *       'type'            : 'Ed25519VerificationKey2018',
 *       'controller'      : 'did:example:123',
 *       'publicKeyBase58' : '3M5RCDjPTWPkKSN3sxUmmMqHbmRPegYP1tjcKyrDbt9J'
 *     },
 *     {
 *       'id'              : 'did:example:123#key-1',
 *       'type'            : 'X25519KeyAgreementKey2019',
 *       'controller'      : 'did:example:123',
 *       'publicKeyBase58' : 'FbQWLPRhTH95MCkQUeFYdiSoQt8zMwetqfWoxqPgaq7x'
 *     },
 *     {
 *       'id'           : 'did:example:123#key-3',
 *       'type'         : 'JsonWebKey2020',
 *       'controller'   : 'did:example:123',
 *       'publicKeyJwk' : {
 *         'kty' : 'EC',
 *         'crv' : 'P-256',
 *         'x'   : 'Er6KSSnAjI70ObRWhlaMgqyIOQYrDJTE94ej5hybQ2M',
 *         'y'   : 'pPVzCOTJwgikPjuUE6UebfZySqEJ0ZtsWFpj7YSPGEk'
 *       }
 *     }
 *   ]
 * },
 * const vmTypes = getVerificationMethodTypes({ didDocument });
 * console.log(vmTypes);
 * // Output: ['Ed25519VerificationKey2018', 'X25519KeyAgreementKey2019', 'JsonWebKey2020']
 * ```
 *
 * @param params - An object containing input parameters for retrieving types.
 * @param params.didDocument - The DID document from which types are retrieved.
 * @returns An array of types. If no types were found, an empty array is returned.
 */
export function getVerificationMethodTypes({ didDocument }: {
  didDocument: DidDocument;
}): string[] {
  // Collect all verification methods from the DID document.
  const verificationMethods = getVerificationMethods({ didDocument });

  // Map to extract 'type' from each verification method.
  const types = verificationMethods.map(method => method.type);

  return [...new Set(types)]; // Return only unique types.
}

/**
 * Retrieves a list of DID verification relationships by a specific method ID from a DID document.
 *
 * This function examines the specified DID document to identify any verification relationships
 * (e.g., `authentication`, `assertionMethod`) that reference a verification method by its method ID
 * or contain an embedded verification method matching the method ID. The method ID is typically a
 * fragment of a DID (e.g., `did:example:123#key-1`) that uniquely identifies a verification method
 * within the DID document.
 *
 * The search considers both direct references to verification methods by their IDs and verification
 * methods embedded within the verification relationship arrays. It returns an array of
 * `DidVerificationRelationship` enums corresponding to the verification relationships that contain
 * the specified method ID.
 *
 * @param params - An object containing input parameters for retrieving verification relationships.
 * @param params.didDocument - The DID document to search for verification relationships.
 * @param params.methodId - The method ID to search for within the verification relationships.
 * @returns An array of `DidVerificationRelationship` enums representing the types of verification
 *          relationships that reference the specified method ID.
 *
 * @example
 * ```ts
 * const didDocument: DidDocument = {
 *   // ...contents of a DID document...
 * };
 *
 * const relationships = getVerificationRelationshipsById({
 *   didDocument,
 *   methodId: 'key-1'
 * });
 * console.log(relationships);
 * // Output might include ['authentication', 'assertionMethod'] if those relationships
 * // reference or contain the specified method ID.
 * ```
 */
export function getVerificationRelationshipsById({ didDocument, methodId }: {
  didDocument: DidDocument;
  methodId: string;
}): DidVerificationRelationship[] {
  const relationships: DidVerificationRelationship[] = [];

  Object.keys(DidVerificationRelationship).forEach((relationship) => {
    if (Array.isArray(didDocument[relationship as keyof DidDocument])) {
      const relationshipMethods = didDocument[relationship as keyof DidDocument] as (string | DidVerificationMethod)[];

      const methodIdFragment = extractDidFragment(methodId);

      // Check if the verification relationship property contains a matching method ID either
      // directly referenced or as an embedded verification method.
      const containsMethodId = relationshipMethods.some(method => {
        const isByReferenceMatch = extractDidFragment(method) === methodIdFragment;
        const isEmbeddedMethodMatch = isDidVerificationMethod(method) && extractDidFragment(method.id) === methodIdFragment;
        return isByReferenceMatch || isEmbeddedMethodMatch;
      });

      if (containsMethodId) {
        relationships.push(relationship as DidVerificationRelationship);
      }
    }
  });

  return relationships;
}

/**
 * Checks if a given object is a {@link DidService}.
 *
 * A {@link DidService} in the context of DID resources must include the properties `id`, `type`,
 * and `serviceEndpoint`. The `serviceEndpoint` can be a `DidServiceEndpoint` or an array of
 * `DidServiceEndpoint` objects.
 *
 * @example
 * ```ts
 * const service = {
 *   id: "did:example:123#service-1",
 *   type: "OidcService",
 *   serviceEndpoint: "https://example.com/oidc"
 * };
 *
 * if (isDidService(service)) {
 *   console.log('The object is a DidService');
 * } else {
 *   console.log('The object is not a DidService');
 * }
 * ```
 *
 * @param obj - The object to be checked.
 * @returns `true` if `obj` is a `DidService`; otherwise, `false`.
 */
export function isDidService(obj: unknown): obj is DidService {
  // Validate that the given value is an object.
  if (!obj || typeof obj !== 'object' || obj === null) return false;

  // Validate that the object has the necessary properties of DidService.
  return 'id' in obj && 'type' in obj && 'serviceEndpoint' in obj;
}

/**
 * Checks if a given object is a {@link DwnDidService}.
 *
 * A {@link DwnDidService} is defined as {@link DidService} object with a `type` of
 * "DecentralizedWebNode" and `enc` and `sig` properties, where both properties are either strings
 * or arrays of strings.
 *
 * @example
 * ```ts
 * const didDocument: DidDocument = {
 *   id: 'did:example:123',
 *   verificationMethod: [
 *     {
 *       id: 'did:example:123#key-1',
 *       type: 'JsonWebKey2020',
 *       controller: 'did:example:123',
 *       publicKeyJwk: { ... }
 *     },
 *     {
 *       id: 'did:example:123#key-2',
 *       type: 'JsonWebKey2020',
 *       controller: 'did:example:123',
 *       publicKeyJwk: { ... }
 *     }
 *   ],
 *   service: [
 *     {
 *       id: 'did:example:123#dwn',
 *       type: 'DecentralizedWebNode',
 *       serviceEndpoint: 'https://dwn.tbddev.org/dwn0',
 *       enc: 'did:example:123#key-1',
 *       sig: 'did:example:123#key-2'
 *     }
 *   ]
 * };
 *
 * if (isDwnService(didDocument.service[0])) {
 *   console.log('The object is a DwnDidService');
 * } else {
 *   console.log('The object is not a DwnDidService');
 * }
 * ```
 *
 * @see {@link https://identity.foundation/decentralized-web-node/spec/ | Decentralized Web Node (DWN) Specification}
 *
 * @param obj - The object to be checked.
 * @returns `true` if `obj` is a DwnDidService; otherwise, `false`.
 */
export function isDwnDidService(obj: unknown): obj is DwnDidService {
  // Validate that the given value is a {@link DidService}.
  if (!isDidService(obj)) return false;

  // Validate that the `type` property is `DecentralizedWebNode`.
  if (obj.type !== 'DecentralizedWebNode') return false;

  // Validate that the given object has the `enc` and `sig` properties.
  if (!('enc' in obj && 'sig' in obj)) return false;

  // Validate that the `enc` and `sig` properties are either strings or arrays of strings.
  const isStringOrStringArray = (prop: any): boolean =>
    typeof prop === 'string' || Array.isArray(prop) && prop.every(item => typeof item === 'string');
  return (isStringOrStringArray(obj.enc)) && (isStringOrStringArray(obj.sig));
}

/**
 * Checks if a given object is a DID Verification Method.
 *
 * A {@link DidVerificationMethod} in the context of DID resources must include the properties `id`,
 * `type`, and `controller`.
 *
 * @example
 * ```ts
 * const resource = {
 *  id           : "did:example:123#0",
 *  type         : "JsonWebKey2020",
 *  controller   : "did:example:123",
 *  publicKeyJwk : { ... }
 * };
 *
 * if (isDidVerificationMethod(resource)) {
 *   console.log('The resource is a DidVerificationMethod');
 * } else {
 *   console.log('The resource is not a DidVerificationMethod');
 * }
 * ```
 *
 * @param obj - The object to be checked.
 * @returns `true` if `obj` is a `DidVerificationMethod`; otherwise, `false`.
 */
export function isDidVerificationMethod(obj: unknown): obj is DidVerificationMethod {
  // Validate that the given value is an object.
  if (!obj || typeof obj !== 'object' || obj === null) return false;

  // Validate that the object has the necessary properties of a DidVerificationMethod.
  if (!('id' in obj && 'type' in obj && 'controller' in obj)) return false;

  if (typeof obj.id !== 'string') return false;
  if (typeof obj.type !== 'string') return false;
  if (typeof obj.controller !== 'string') return false;

  return true;
}

/**
 * Converts a cryptographic key to a multibase identifier.
 *
 * @remarks
 * This method provides a way to represent a cryptographic key as a multibase identifier.
 * It takes a `Uint8Array` representing the key, and either the multicodec code or multicodec name
 * as input. The method first adds the multicodec prefix to the key, then encodes it into Base58
 * format. Finally, it converts the Base58 encoded key into a multibase identifier.
 *
 * @example
 * ```ts
 * const key = new Uint8Array([...]); // Cryptographic key as Uint8Array
 * const multibaseId = keyBytesToMultibaseId({ key, multicodecName: 'ed25519-pub' });
 * ```
 *
 * @param params - The parameters for the conversion.
 * @returns The multibase identifier as a string.
 */
export function keyBytesToMultibaseId({ keyBytes, multicodecCode, multicodecName }:
  RequireOnly<KeyWithMulticodec, 'keyBytes'>
): string {
  const prefixedKey = Multicodec.addPrefix({
    code : multicodecCode,
    data : keyBytes,
    name : multicodecName
  });
  const prefixedKeyB58 = Convert.uint8Array(prefixedKey).toBase58Btc();
  const multibaseKeyId = Convert.base58Btc(prefixedKeyB58).toMultibase();

  return multibaseKeyId;
}

/**
 * Converts a multibase identifier to a cryptographic key.
 *
 * @remarks
 * This function decodes a multibase identifier back into a cryptographic key. It first decodes the
 * identifier from multibase format into Base58 format, and then converts it into a `Uint8Array`.
 * Afterward, it removes the multicodec prefix, extracting the raw key data along with the
 * multicodec code and name.
 *
 * @example
 * ```ts
 * const multibaseKeyId = '...'; // Multibase identifier of the key
 * const { key, multicodecCode, multicodecName } = multibaseIdToKey({ multibaseKeyId });
 * ```
 *
 * @param params - The parameters for the conversion.
 * @param params.multibaseKeyId - The multibase identifier string of the key.
 * @returns An object containing the key as a `Uint8Array` and its multicodec code and name.
 * @throws `DidError` if the multibase identifier is invalid.
 */
export function multibaseIdToKeyBytes({ multibaseKeyId }: {
  multibaseKeyId: string
}): Required<KeyWithMulticodec> {
  try {
    const prefixedKeyB58 = Convert.multibase(multibaseKeyId).toBase58Btc();
    const prefixedKey = Convert.base58Btc(prefixedKeyB58).toUint8Array();
    const { code, data, name } = Multicodec.removePrefix({ prefixedData: prefixedKey });

    return { keyBytes: data, multicodecCode: code, multicodecName: name };
  } catch (error: any) {
    throw new DidError(DidErrorCode.InvalidDid, `Invalid multibase identifier: ${multibaseKeyId}`);
  }
}