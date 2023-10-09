// import type { BytesKeyPair, Web5Crypto } from './types/index.js';
import type { Web5Crypto } from './types/web5-crypto.js';
import type { BytesKeyPair } from './types/crypto-key.js';

import { Convert, Multicodec, universalTypeOf } from '@web5/common';
import { bytesToHex, randomBytes as nobleRandomBytes } from '@noble/hashes/utils';

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
    throw new TypeError(`One or more required parameters missing: 'property, properties'`);
  }
  const { property, inObject } = options;
  if (!(property in inObject)) {
    throw new TypeError(`Required parameter missing: '${property}'`);
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
    throw new TypeError(`One or more required parameters missing: 'property, allowedProperties'`);
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
 * of Uint8Array typed arrays.
 *
 * @param key The key to check.
 * @returns True if the key is a pair of Uint8Array typed arrays, false otherwise.
 */
export function isBytesKeyPair(key: BytesKeyPair | undefined): key is BytesKeyPair {
  return (key && 'privateKey' in key && 'publicKey' in key &&
    universalTypeOf(key.privateKey) === 'Uint8Array' &&
    universalTypeOf(key.publicKey) === 'Uint8Array') ? true : false;
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

export function keyToMultibaseId(options: {
  key: Uint8Array,
  multicodecCode?: number,
  multicodecName?: string
}): string {
  const { key, multicodecCode, multicodecName } = options;
  const prefixedKey = Multicodec.addPrefix({ code: multicodecCode, data: key, name: multicodecName });
  const prefixedKeyB58 = Convert.uint8Array(prefixedKey).toBase58Btc();
  const multibaseKeyId = Convert.base58Btc(prefixedKeyB58).toMultibase();

  return multibaseKeyId;
}

export function multibaseIdToKey(options: {
  multibaseKeyId: string
}): { key: Uint8Array, multicodecCode: number, multicodecName: string } {
  const { multibaseKeyId } = options;

  const prefixedKeyB58 = Convert.multibase(multibaseKeyId).toBase58Btc();
  const prefixedKey = Convert.base58Btc(prefixedKeyB58).toUint8Array();
  const { code, data, name } = Multicodec.removePrefix({ prefixedData: prefixedKey });

  return { key: data, multicodecCode: code, multicodecName: name };
}

/**
 * Generates secure pseudorandom values of the specified length using
 * `crypto.getRandomValues`, which defers to the operating system.
 *
 * This function is a wrapper around `randomBytes` from the '@noble/hashes'
 * package. It's designed to be cryptographically strong, suitable for
 * generating keys, initialization vectors, and other random values.
 *
 * @param bytesLength - The number of bytes to generate.
 * @returns A Uint8Array containing the generated random bytes.
 *
 * @example
 * const bytes = randomBytes(32); // Generates 32 random bytes
 *
 * @see {@link https://www.npmjs.com/package/@noble/hashes | @noble/hashes on NPM}
 * for more information about the underlying implementation.
 */
export function randomBytes(bytesLength: number): Uint8Array {
  return nobleRandomBytes(bytesLength);
}

/**
 * Generates a secure random PIN (Personal Identification Number) of a
 * specified length.
 *
 * This function ensures that the generated PIN is cryptographically secure and
 * uniformly distributed by using rejection sampling. It repeatedly generates
 * random numbers until it gets one in the desired range [0, max]. This avoids
 * bias introduced by simply taking the modulus or truncating the number.
 *
 * Note: The function can generate PINs of 3 to 10 digits in length.
 * Any request for a PIN outside this range will result in an error.
 *
 * Example usage:
 *
 * ```ts
 * const pin = generatePin({ length: 4 });
 * console.log(pin); // Outputs a 4-digit PIN, e.g., "0231"
 * ```
 *
 * @param options - The options object containing the desired length of the generated PIN.
 * @param options.length - The desired length of the generated PIN. The value should be
 *                         an integer between 3 and 8 inclusive.
 *
 * @returns A string representing the generated PIN. The PIN will be zero-padded
 *          to match the specified length, if necessary.
 *
 * @throws Will throw an error if the requested PIN length is less than 3 or greater than 8.
 */
export function randomPin({ length }: { length: number }): string {
  if (3 > length || length > 10) {
    throw new Error('generatePin() can securely generate a PIN between 3 to 10 digits.');
  }

  const max = Math.pow(10, length) - 1;

  let pin;

  if (length <= 6) {
    const rejectionRange = Math.pow(10, length);
    do {
      // Adjust the byte generation based on length.
      const randomBuffer = randomBytes(Math.ceil(length / 2));  // 2 digits per byte.
      const view = new DataView(randomBuffer.buffer);
      // Convert the buffer to integer and take modulus based on length.
      pin = view.getUint16(0, false) % rejectionRange;
    } while (pin > max);
  } else {
    const rejectionRange = Math.pow(10, 10); // For max 10 digit number.
    do {
    // Generates 4 random bytes.
      const randomBuffer = randomBytes(4);
      // Create a DataView to read from the randomBuffer.
      const view = new DataView(randomBuffer.buffer);
      // Transform bytes to number (big endian).
      pin = view.getUint32(0, false) % rejectionRange;
    } while (pin > max);  // Reject if the number is outside the desired range.
  }

  // Pad the PIN with leading zeros to the desired length.
  return pin.toString().padStart(length, '0');
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