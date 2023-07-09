import type { BufferKeyPair, ManagedKey, ManagedKeyPair, Web5Crypto } from './types/index.js';

import { universalTypeOf } from '@tbd54566975/common';
import { bytesToHex, randomBytes } from '@noble/hashes/utils';

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
 * Generates a UUID (Universally Unique Identifier) using a
 * cryptographically strong random number generator following
 * the version 4 format, as specified in RFC 4122.
 *
 * A version 4 UUID is a randomly generated UUID. The 13th character
 * is set to '4' to denote version 4, and the 17th character is one
 * of '8', '9', 'A', or 'B' to comply with the variant 1 format of
 * UUIDs (the high bits are set to '10').
 *
 * The UUID is a 36 character string, including hyphens, and looks like this:
 * xxxxxxxx-xxxx-4xxx-axxx-xxxxxxxxxxxx
 *
 * Note that while UUIDs are not guaranteed to be unique, they are
 * practically unique" given the large number of possible UUIDs and
 * the randomness of generation.
 *
 * After generating the UUID, the function securely wipes the memory
 * areas used to hold temporary values to prevent any possibility of
 * the random values being unintentionally leaked or retained in memory.
 *
 * @returns A UUID string in version 4 format.
 */
export function randomUuid(): string {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // set version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // set variant 1
  const hex = bytesToHex(bytes);
  bytes.fill(0); // wipe the random values array
  const segments = [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ];
  const uuid = segments.join('-');
  segments.fill('0'); // wipe the segments array

  return uuid;
}