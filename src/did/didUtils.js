import { base58btc } from 'multiformats/bases/base58';
import { Encoder } from '@tbd54566975/dwn-sdk-js';
import ed2curve from 'ed2curve';
const { convertKeyPair, convertPublicKey, convertSecretKey } = ed2curve;

// See https://github.com/multiformats/multicodec/blob/master/table.csv
// multicodec ed25519-pub header 0xed as varint
export const MULTICODEC_ED25519_PUB_HEADER = new Uint8Array([0xed, 0x01]);
// multicodec ed25519-priv header 0x1300 as varint
export const MULTICODEC_ED25519_PRIV_HEADER = new Uint8Array([0x80, 0x26]);
// multicodec x25519-pub header 0xec as varint
export const MULTICODEC_X25519_PUB_HEADER = new Uint8Array([0xec, 0x01]);
// multicodec x25519-priv header 0x1302 as varint
export const MULTICODEC_X25519_PRIV_HEADER = new Uint8Array([0x82, 0x26]);
// empty for formats that don't use a multicodec header
export const NO_HEADER = new Uint8Array([]);

export const DID_VERIFICATION_RELATIONSHIPS = [
  'assertionMethod',
  'authentication',
  'capabilityDelegation',
  'capabilityInvocation',
  'keyAgreement',
];

/**
 * Given a DID, key ID, cryptographic curve, and key pair, return a JSON Web Key 2020 object.
 * 
 * @param {object} options Object containing the JWK parameters
 * @param {string} options.id DID identifier (e.g., 'did:key:abcd1234')
 * @param {string} options.kid Key ID
 * @param {string} options.kty Key type
 * @param {string} options.crv Cryptographic curve
 * @param {Uint8Array} options.publicKey Public key bytes
 * @param {Uint8Array} options.privateKey Private key bytes
 * @returns {{ id: string, type: string, controller: string, keypair: Object}}
 */
export async function createJWK(options) {
  const { id, crv, kty, kid, publicKey, privateKey } = options;
  const jsonWebKey = {
    id: `${id}#${kid}`,
    type: 'JsonWebKey2020',
    controller: id,
    keypair: {},
  };

  const jwk = { crv, kid, kty };

  jsonWebKey.keypair.publicKeyJwk = { ...jwk };
  jsonWebKey.keypair.publicKeyJwk.x = Encoder.bytesToBase64Url(publicKey);
  
  jsonWebKey.keypair.privateKeyJwk = { ...jsonWebKey.keypair.publicKeyJwk };
  jsonWebKey.keypair.privateKeyJwk.d = Encoder.bytesToBase64Url(privateKey);
  
  return jsonWebKey;
}

/**
 * 
 * @param {string} mbString Multibase encoded string with 'z' prefix
 * @param {Uint8Array} header Multicodec header
 * @returns {Uint8Array} Decoded key
 */
export async function decodeMultibaseBase58(mbString, header) {
  const multibaseKey = base58btc.decode(mbString);
  return multibaseKey.slice(header.length);
}

/**
 * Given a DID (did:method:identifier), return an object with the method and identifier.
 * @param {string} did DID (e.g., 'did:key:abcd1234')
 * @returns {object} For example, { method: 'key', id: 'abcd1234' }
 */
export async function didToMethodIdentifier(did) {
  let result;
  try {
    // Converts 'did:key:abc1234#efg0987' to ['did', 'key', 'abc1234']
    const didArray = did.split('#')[0].split(':');
    // Converts ['did', 'key', 'abc1234'] to { method: 'key', id: 'abc1234' }
    result = (([, method, id]) => ({ method, id }))(didArray);
  } catch (error) {
    throw new Error(`Malformed did: ${did}`);
  }
  return result;
}

/**
 * Converts Ed25519 key pair to Curve25519 key pair.
 * @param {{publicKey: Uint8Array, secretKey: Uint8Array}} keyPair Ed25519 key pair
 * @returns {{publicKey: Uint8Array, secretKey: Uint8Array}} Curve25519 key pair derived from input key pair
 */
export function ed25519KeyPairToX25519(keyPair) {
  return convertKeyPair(keyPair);
}

/**
 * Converts Ed25519 private key to Curve25519 private key.
 * 
 * @param {Uint8Array} privateKey Ed25519 private key
 * @returns {Uint8Array} X25519 private key derived from input private key
 */
export function ed25519PrivateKeyToX25519(privateKey) {
  return convertSecretKey(privateKey);
}

/**
 * Converts Ed25519 public key to Curve25519 public key.
 * 
 * @param {Uint8Array} publicKey Ed25519 public key
 * @returns {Uint8Array} X25519 public key derived from input public key
 */
export function ed25519PublicKeyToX25519(publicKey) {
  return convertPublicKey(publicKey);
}

/**
 * Encode a Multibase base58-btc encoded value
 * Concatenation of the Multicodec identifier for the key type and
 * the raw bytes associated with the key format.
 * 
 * @param {Uint8Array} header Muticodec identifier
 * @param {Uint8Array} key Raw bytes of the key
 * @returns {string} Multibase string with 'z' prefix
 */
export async function encodeMultibaseBase58(key, header) {
  const multibaseKey = new Uint8Array(header.length + key.length);

  multibaseKey.set(header);
  multibaseKey.set(key, header.length);

  return base58btc.encode(multibaseKey);
}

/**
 * 
 * @param {object} options Object containing search parameters
 * @param {object} options.didDocument DID document to search
 * @param {object} options.methodId Method ID to search by
 * @param {object} options.purpose Purpose to search by
 * @returns {object[] | null}
 */
export function findVerificationMethods(options) {
  const { didDocument = undefined, methodId = undefined, purpose = undefined } = options;
  if (!didDocument) throw new Error('didDocument is a required parameter');
  if (purpose && methodId) throw new Error('Specify methodId or purpose but not both');

  function findMethodById(methodId) {
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
  if (purpose === undefined) {
    const results = findMethodById(methodId);
    return (results.length > 0) ? results : null;
  }

  // Find by verification relationship / purpose (e.g., authentication, keyAgreement, etc.)
  if (purpose !== undefined) {
    let results = [];
    const methods = didDocument[purpose] || [];
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

/**
 * Extract the public key from JSON Web Key and convert to bytes.
 * 
 * @param {*} jwk JSON Web Key
 * @returns {Uint8Array} Public key
 */
export function publicKeyJwkToBytes(publicKeyJwk) {
  try {
    switch (publicKeyJwk?.crv) {

    case 'Ed25519': {
      if (!publicKeyJwk?.x) throw new Error('JWK missing x value');
      return Encoder.base64UrlToBytes(publicKeyJwk.x);
    }
    
    case 'secp256k1': {
      if (!publicKeyJwk?.x) throw new Error('JWK missing x value');
      if (!publicKeyJwk?.y) throw new Error('JWK missing y value');

      const xBytes = Encoder.base64UrlToBytes(publicKeyJwk.x);
      const yBytes = Encoder.base64UrlToBytes(publicKeyJwk.y);

      const publicKeyBytes = new Uint8Array(xBytes.length + yBytes.length + 1);

      // create an uncompressed public key using the x and y values from the provided JWK.
      // a leading byte of 0x04 indicates that the public key is uncompressed
      // (e.g. x and y values are both present)
      publicKeyBytes.set([ 0x04 ], 0);
      publicKeyBytes.set(xBytes, 1);
      publicKeyBytes.set(yBytes, xBytes.length + 1);

      return publicKeyBytes;
    }
  
    default:
      throw new Error(`Unsupport cryptographic curve: ${publicKeyJwk?.crv}`);
    }

  } catch (error) {
    console.error(error);
    throw new Error(`Error encountered while decoding public key: ${error}`);
  }
}

export async function verificationMethodToPublicKeyBytes(verificationMethod) {
  switch (verificationMethod?.type) {

  case 'JsonWebKey2020': {
    return publicKeyJwkToBytes(verificationMethod?.publicKeyJwk);
  }

  case 'Ed25519VerificationKey2018': {
    return base58btc.baseDecode(verificationMethod?.publicKeyBase58);
  }
  
  case 'Ed25519VerificationKey2020': {
    return decodeMultibaseBase58(verificationMethod?.publicKeyMultibase, MULTICODEC_ED25519_PUB_HEADER);
  }

  case 'X25519KeyAgreementKey2019': {
    return base58btc.baseDecode(verificationMethod?.publicKeyBase58);
  }

  case 'X25519KeyAgreementKey2020': {
    return decodeMultibaseBase58(verificationMethod?.publicKeyMultibase, MULTICODEC_X25519_PUB_HEADER);
  }

  default:
    throw new Error(`Unsupported verification method type: ${verificationMethod?.type}`);
  }
}