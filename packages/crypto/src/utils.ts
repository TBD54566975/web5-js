import type { Jwk } from './jose/jwk.js';

import { crypto } from '@noble/hashes/crypto';
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
 * Determines the JOSE algorithm identifier of the digital signature algorithm based on the `alg` or
 * `crv` property of a {@link Jwk | JWK}.
 *
 * If the `alg` property is present, its value takes precedence and is returned. Otherwise, the
 * `crv` property is used to determine the algorithm.
 *
 * @see {@link https://www.iana.org/assignments/jose/jose.xhtml#web-signature-encryption-algorithms | JOSE Algorithms}
 * @see {@link https://datatracker.ietf.org/doc/draft-ietf-jose-fully-specified-algorithms/ | Fully-Specified Algorithms for JOSE and COSE}
 *
 * @example
 * ```ts
 * const publicKey: Jwk = {
 *   "kty": "OKP",
 *   "crv": "Ed25519",
 *   "x": "FEJG7OakZi500EydXxuE8uMc8uaAzEJkmQeG8khXANw"
 * }
 * const algorithm = getJoseSignatureAlgorithmFromPublicKey(publicKey);
 * console.log(algorithm); // Output: "EdDSA"
 * ```
 *
 * @param publicKey - A JWK containing the `alg` and/or `crv` properties.
 * @returns The name of the algorithm associated with the key.
 * @throws Error if the algorithm cannot be determined from the provided input.
 */
export function getJoseSignatureAlgorithmFromPublicKey(publicKey: Jwk): string {
  const curveToJoseAlgorithm: Record<string, string> = {
    'Ed25519'   : 'EdDSA',
    'P-256'     : 'ES256',
    'P-384'     : 'ES384',
    'P-521'     : 'ES512',
    'secp256k1' : 'ES256K',
  };

  // If the key contains an `alg` property that matches a JOSE registered algorithm identifier,
  // return its value.
  if (publicKey.alg && Object.values(curveToJoseAlgorithm).includes(publicKey.alg)) {
    return publicKey.alg;
  }

  // If the key contains a `crv` property, return the corresponding algorithm.
  if (publicKey.crv && Object.keys(curveToJoseAlgorithm).includes(publicKey.crv)) {
    return curveToJoseAlgorithm[publicKey.crv];
  }

  throw new Error(
    `Unable to determine algorithm based on provided input: alg=${publicKey.alg}, crv=${publicKey.crv}. ` +
    `Supported 'alg' values: ${Object.values(curveToJoseAlgorithm).join(', ')}. ` +
    `Supported 'crv' values: ${Object.keys(curveToJoseAlgorithm).join(', ')}.`
  );
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
 * const pin = randomPin({ length: 4 });
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
    throw new Error('randomPin() can securely generate a PIN between 3 to 10 digits.');
  }

  const max = Math.pow(10, length) - 1;

  let pin;

  if (length <= 6) {
    const rejectionRange = Math.pow(10, length);
    do {
      // Adjust the byte generation based on length.
      const randomBuffer = randomBytes(Math.ceil(length / 2) );  // 2 digits per byte.
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
 * Utility functions for cryptographic operations.
 */
export const CryptoUtils = {
  /** Generates a secure random PIN (Personal Identification Number) of a specified length. */
  randomPin,
  /** Generates a UUID following the version 4 format, as specified in RFC 4122. */
  randomUuid,
  /** Generates secure pseudorandom values of the specified length using `crypto.getRandomValues`, which defers to the operating system. */
  randomBytes,
  /** Checks if the Web Crypto API is supported in the current runtime environment. */
  isWebCryptoSupported,
  /** Determines the JOSE algorithm identifier of the digital signature algorithm based on the `alg` or `crv` property of a {@link Jwk | JWK}. */
  getJoseSignatureAlgorithmFromPublicKey,
  /** Checks whether the property specified is a member of the list of valid properties. */
  checkValidProperty,
  /** Checks whether the properties object provided contains the specified property. */
  checkRequiredProperty
};