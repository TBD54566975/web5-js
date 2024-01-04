import { crypto } from '@noble/hashes/crypto';
import { Convert, Multicodec } from '@web5/common';
import { randomBytes as nobleRandomBytes } from '@noble/hashes/utils';

/**
 * Checks whether the properties object provided contains the specified property.
 *
 * @example
 * ```ts
 * const obj = { a: 'Bob', t: 30 };
 * checkRequiredProperty({ property: 'a', inObject: obj }); // No error
 * checkRequiredProperty({ property: 'z', inObject: obj }); // Throws TypeError
 * ```
 *
 * @param params - The parameters for the check.
 * @param params.property - Property key to check for.
 * @param params.properties - Properties object to check within.
 * @returns void
 * @throws {TypeError} If the property is not a key in the properties object.
 */
export function checkRequiredProperty(params: {
  property: string,
  inObject: object
}): void {
  if (!params || params.property === undefined || params.inObject === undefined) {
    throw new TypeError(`One or more required parameters missing: 'property, properties'`);
  }
  const { property, inObject } = params;
  if (!(property in inObject)) {
    throw new TypeError(`Required parameter missing: '${property}'`);
  }
}

/**
 * Checks whether the property specified is a member of the list of valid properties.
 *
 * @example
 * ```ts
 * const property = 'color';
 * const allowedProperties = ['size', 'shape', 'color'];
 * checkValidProperty({ property, allowedProperties }); // No error
 * checkValidProperty({ property: 'weight', allowedProperties }); // Throws TypeError
 * ```
 *
 * @param property Property key to check for.
 * @param allowedProperties Properties Array, Map, or Set to check within.
 * @returns void
 * @throws {TypeError} If the property is not a member of the allowedProperties Array, Map, or Set.
 */
export function checkValidProperty(params: {
  property: string, allowedProperties: ReadonlyArray<string> | Array<string> | Map<string, unknown> | Set<string>
}): void {
  if (!params || params.property === undefined || params.allowedProperties === undefined) {
    throw new TypeError(`One or more required parameters missing: 'property, allowedProperties'`);
  }
  const { property, allowedProperties } = params;
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
 * const multibaseId = keyToMultibaseId({ key, multicodecName: 'ed25519-pub' });
 * ```
 *
 * @param params - The parameters for the conversion.
 * @param params.key - The cryptographic key as a Uint8Array.
 * @param params.multicodecCode - Optional multicodec code to prefix the key with.
 * @param params.multicodecName - Optional multicodec name corresponding to the code.
 * @returns The multibase identifier as a string.
 */
export function keyToMultibaseId({ key, multicodecCode, multicodecName }: {
  key: Uint8Array,
  multicodecCode?: number,
  multicodecName?: string
}): string {
  const prefixedKey = Multicodec.addPrefix({ code: multicodecCode, data: key, name: multicodecName });
  const prefixedKeyB58 = Convert.uint8Array(prefixedKey).toBase58Btc();
  const multibaseKeyId = Convert.base58Btc(prefixedKeyB58).toMultibase();

  return multibaseKeyId;
}

/**
 * Checks if the Web Crypto API is supported in the current runtime environment.
 *
 * @remarks
 * The function uses `globalThis` to provide a universal reference to the global
 * scope, regardless of the environment. `globalThis` is a standard feature introduced
 * in ECMAScript 2020 that is agnostic to the underlying JavaScript environment, making
 * the code portable across browser, Node.js, and Web Workers environments.
 *
 * In a web browser, `globalThis` is equivalent to the `window` object. In Node.js, it
 * is equivalent to the `global` object, and in Web Workers, it corresponds to `self`.
 *
 * This method checks for the `crypto` object and its `subtle` property on the global scope
 * to determine the availability of the Web Crypto API. If both are present, the API is
 * supported; otherwise, it is not.
 *
 * @example
 * ```ts
 * if (isWebCryptoSupported()) {
 *   console.log('Crypto operations can be performed');
 * } else {
 *   console.log('Crypto operations are not supported in this environment');
 * }
 * ```
 *
 * @returns A boolean indicating whether the Web Crypto API is supported in the current environment.
 */
export function isWebCryptoSupported(): boolean {
  if (globalThis.crypto && globalThis.crypto.subtle) {
    return true;
  } else {
    return false;
  }
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
 */
export function multibaseIdToKey({ multibaseKeyId }: {
  multibaseKeyId: string
}): { key: Uint8Array, multicodecCode: number, multicodecName: string } {
  const prefixedKeyB58 = Convert.multibase(multibaseKeyId).toBase58Btc();
  const prefixedKey = Convert.base58Btc(prefixedKeyB58).toUint8Array();
  const { code, data, name } = Multicodec.removePrefix({ prefixedData: prefixedKey });

  return { key: data, multicodecCode: code, multicodecName: name };
}

/**
 * Generates secure pseudorandom values of the specified length using
 * `crypto.getRandomValues`, which defers to the operating system.
 *
 * @remarks
 * This function is a wrapper around `randomBytes` from the '@noble/hashes'
 * package. It's designed to be cryptographically strong, suitable for
 * generating initialization vectors, nonces, and other random values.
 *
 * @see {@link https://www.npmjs.com/package/@noble/hashes | @noble/hashes on NPM} for more
 * information about the underlying implementation.
 *
 * @example
 * ```ts
 * const bytes = randomBytes(32); // Generates 32 random bytes
 * ```
 *
 * @param bytesLength - The number of bytes to generate.
 * @returns A Uint8Array containing the generated random bytes.
 */
export function randomBytes(bytesLength: number): Uint8Array {
  return nobleRandomBytes(bytesLength);
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
 * @example
 * ```ts
 * const uuid = randomUuid();
 * console.log(uuid); // Outputs a version 4 UUID, e.g., '123e4567-e89b-12d3-a456-426655440000'
 * ```
 *
 * @returns A string containing a randomly generated, 36 character long v4 UUID.
 */
export function randomUuid(): string {
  const uuid = crypto.randomUUID();

  return uuid;
}