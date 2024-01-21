import { parse } from 'did-resolver';
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
export function getServices(options) {
    var _a, _b;
    const { didDocument, id, type } = options !== null && options !== void 0 ? options : {};
    return (_b = (_a = didDocument === null || didDocument === void 0 ? void 0 : didDocument.service) === null || _a === void 0 ? void 0 : _a.filter(service => {
        if (id && service.id !== id)
            return false;
        if (type && service.type !== type)
            return false;
        return true;
    })) !== null && _b !== void 0 ? _b : [];
}
export function getVerificationMethodIds(options) {
    const { didDocument, publicKeyJwk, publicKeyMultibase } = options;
    if (!didDocument)
        throw new Error(`Required parameter missing: 'didDocument'`);
    if (!didDocument.verificationMethod)
        throw new Error('Given `didDocument` is missing `verificationMethod` entries.');
    for (let method of didDocument.verificationMethod) {
        if (publicKeyMultibase && 'publicKeyMultibase' in method) {
            if (publicKeyMultibase === method.publicKeyMultibase) {
                return method.id;
            }
        }
        else if (publicKeyJwk && 'crv' in publicKeyJwk &&
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
export function getVerificationMethodTypes(options) {
    const { didDocument } = options;
    let types = [];
    for (let key in didDocument) {
        if (typeof didDocument[key] === 'object') {
            types = types.concat(getVerificationMethodTypes({
                didDocument: didDocument[key]
            }));
        }
        else if (key === 'type') {
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
export function isDwnServiceEndpoint(endpoint) {
    return endpoint !== undefined &&
        typeof endpoint !== 'string' &&
        !Array.isArray(endpoint) &&
        'nodes' in endpoint &&
        'signingKeys' in endpoint;
}
export function parseDid({ didUrl }) {
    const parsedDid = parse(didUrl);
    return parsedDid;
}
/**
 * type guard for {@link VerificationMethod}
 * @param didResource - the resource to check
 * @returns true if the didResource is a `VerificationMethod`
 */
export function isVerificationMethod(didResource) {
    return didResource && 'id' in didResource && 'type' in didResource && 'controller' in didResource;
}
//# sourceMappingURL=utils.js.map