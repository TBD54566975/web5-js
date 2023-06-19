import type { BufferKeyPair, ManagedKey, ManagedKeyPair, Web5Crypto } from './types-key-manager.js';

import { base64url } from 'multiformats/bases/base64';
import { base58btc } from 'multiformats/bases/base58';
import { universalTypeOf } from './common/type-utils.js';


// See https://github.com/multiformats/multicodec/blob/master/table.csv
export const MULTICODEC_HEADERS = {
  ED25519: {
    PUB  : new Uint8Array([0xed, 0x01]),
    PRIV : new Uint8Array([0x80, 0x26])
  },
  X25519: {
    PUB  : new Uint8Array([0xec, 0x01]),
    PRIV : new Uint8Array([0x82, 0x26])
  },
  NOOP: new Uint8Array([])
};


export function bytesToBase64Url(bytes: Uint8Array): string {
  return base64url.baseEncode(bytes);
}

export function base64UrlToBytes(base64urlString: string): Uint8Array {
  return base64url.baseDecode(base64urlString);
}

export function bytesToBase58btcMultibase(header: Uint8Array, bytes: Uint8Array): string {
  const multibaseBytes = new Uint8Array(header.length + bytes.length);
  multibaseBytes.set(header);
  multibaseBytes.set(bytes, header.length);

  return base58btc.encode(multibaseBytes);
}

/**
 * Checks whether the property specified is a member of the list of valid properties.
 *
 * @param property Property key to check for.
 * @param properties Properties Array, Map, or Set to check within.
 * @returns void
 * @throws {SyntaxError} If the property is not a member of the properties Array, Map, or Set.
 */
export function checkPropertyExists(property: string, properties: Array<string> | Map<string, unknown> | Set<string>): void {
  if (property === undefined || properties === undefined) {
    throw new TypeError(`One or more required arguments missing: 'property, properties'`);
  }
  if (
    (Array.isArray(properties) && !properties.includes(property)) ||
    (properties instanceof Set && !properties.has(property)) ||
    (properties instanceof Map && !properties.has(property))
  ) {
    const validProperties = Array.from((properties instanceof Map) ? properties.keys() : properties).join(', ');
    throw new TypeError(`Out of range: '${property}'. Must be one of '${validProperties}'`);
  }
}

/**
 * Checks whether the properties object provided contains the specified property.
 *
 * @param property Property key to check for.
 * @param properties Properties object to check within.
 * @returns void
 * @throws {SyntaxError} If the property is not a key in the properties object.
 */
export function checkRequiredProperty(property: string, properties: object): void {
  if (property === undefined || properties === undefined) {
    throw new TypeError(`One or more required arguments missing: 'property, properties'`);
  }
  if (!(property in properties)) {
    throw new TypeError(`Required parameter was missing: '${property}'`);
  }
}

/**
 * !TODO: Consider combining isCryptoKeyPair and isManagedKeyPair:
 * !  export function isKeyPair<K, KP>(key: K | KP): key is KP {
 * !    return (key as any).privateKey !== undefined && (key as any).publicKey !== undefined;
 * !  }
 * !  usage examples:
 * !    if (isKeyPair<Web5Crypto.CryptoKey, Web5Crypto.CryptoKeyPair>(key))...
 * !    if (isKeyPair<ManagedKey, ManagedKeyPair>(key))...
 */

/**
 * Type guard function to check if the given key is a
 * Web5Crypto.CryptoKeyPair.
 *
 * @param key The key to check.
 * @returns True if the key is a CryptoKeyPair, false otherwise.
 */
export function isCryptoKeyPair(key: Web5Crypto.CryptoKey | Web5Crypto.CryptoKeyPair): key is Web5Crypto.CryptoKeyPair {
  return key && 'privateKey' in key && 'publicKey' in key;
}

/**
 * Type guard function to check if the given key is a ManagedKeyPair.
 *
 * @param key The key to check.
 * @returns True if the key is a ManagedKeyPair, false otherwise.
 */
export function isManagedKeyPair(key: ManagedKey | ManagedKeyPair): key is ManagedKeyPair {
  return key && 'privateKey' in key && 'publicKey' in key;
}

/**
 * Type guard function to check if the given key is a raw key pair
 * of ArrayBuffers.
 *
 * @param key The key to check.
 * @returns True if the key is a pair of key ArrayBuffers, false otherwise.
 */
export function isBufferKeyPair(key: BufferKeyPair | undefined): key is BufferKeyPair {
  return (key && 'privateKey' in key && 'publicKey' in key &&
    universalTypeOf(key.privateKey) === 'ArrayBuffer' &&
    universalTypeOf(key.publicKey) === 'ArrayBuffer') ? true : false;
}