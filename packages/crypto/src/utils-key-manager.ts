import type { BufferKeyPair, ManagedKey, ManagedKeyPair, Web5Crypto } from './types-key-manager.js';

import { universalTypeOf } from './common/type-utils.js';

/**
 * Checks whether the property specified is a member of the list of valid properties.
 *
 * @param property Property key to check for.
 * @param allowedProperties Properties Array, Map, or Set to check within.
 * @returns void
 * @throws {SyntaxError} If the property is not a member of the allowedProperties Array, Map, or Set.
 */
export function checkValidProperty(options: {
  property: string, allowedProperties: Array<string> | Map<string, unknown> | Set<string>
}): void {
  if (!options || options.property === undefined || options.allowedProperties === undefined) {
    throw new TypeError(`One or more required arguments missing: 'property, allowedProperties'`);
  }
  const { property, allowedProperties } = options;
  if (
    (Array.isArray(allowedProperties) && !allowedProperties.includes(property)) ||
    (allowedProperties instanceof Set && !allowedProperties.has(property)) ||
    (allowedProperties instanceof Map && !allowedProperties.has(property))
  ) {
    const validProperties = Array.from((allowedProperties instanceof Map) ? allowedProperties.keys() : allowedProperties).join(', ');
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
export function checkRequiredProperty(options: {
  property: string,
  inObject: object
}): void {
  if (!options || options.property === undefined || options.inObject === undefined) {
    throw new TypeError(`One or more required arguments missing: 'property, properties'`);
  }
  const { property, inObject } = options;
  if (!(property in inObject)) {
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
 * Type guard function to check if the given key is a ManagedKey.
 *
 * @param key The key to check.
 * @returns True if the key is a ManagedKeyPair, false otherwise.
 */
export function isManagedKey(key: ManagedKey | ManagedKeyPair | undefined): key is ManagedKey {
  return key !== undefined && 'algorithm' in key && 'extractable' in key && 'type' in key && 'usages' in key;
}

/**
 * Type guard function to check if the given key is a ManagedKeyPair.
 *
 * @param key The key to check.
 * @returns True if the key is a ManagedKeyPair, false otherwise.
 */
export function isManagedKeyPair(key: ManagedKey | ManagedKeyPair | undefined): key is ManagedKeyPair {
  return key !== undefined && 'privateKey' in key && 'publicKey' in key;
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