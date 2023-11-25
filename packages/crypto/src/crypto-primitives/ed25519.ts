import { Convert } from '@web5/common';
import { ed25519, edwardsToMontgomeryPub, edwardsToMontgomeryPriv, x25519 } from '@noble/curves/ed25519';

import type { PrivateKeyJwk, PublicKeyJwk } from '../jose.js';

import { Jose } from '../jose.js';

/**
 * The `Ed25519` class provides an interface for generating Ed25519 private
 * keys, computing public keys from private keys, and signing and verifying
 * messages.
 *
 * The class uses the '@noble/curves' package for the cryptographic operations.
 *
 * The methods of this class are all asynchronous and return Promises. They all
 * use the Uint8Array type for keys, signatures, and data, providing a
 * consistent interface for working with binary data.
 *
 * Example usage:
 *
 * ```ts
 * const privateKey = await Ed25519.generateKey();
 * const message = new TextEncoder().encode('Hello, world!');
 * const signature = await Ed25519.sign({
 *   key: privateKey,
 *   data: message
 * });
 * const publicKey = await Ed25519.getPublicKey({ privateKey });
 * const isValid = await Ed25519.verify({
 *   key: publicKey,
 *   signature,
 *   data: message
 * });
 * console.log(isValid); // true
 * ```
 */
export class Ed25519 {
  /**
   * Converts a raw private key in bytes to its corresponding JSON Web Key (JWK) format.
   *
   * This method accepts a private key as a byte array (Uint8Array) for the Curve25519 curve in
   * Twisted Edwards form and transforms it into a JWK object. The process involves first deriving
   * the public key from the private key, then encoding both the private and public keys into
   * base64url format.
   *
   * The resulting JWK object includes the following properties:
   * - `kty`: Key Type, set to 'OKP' for Octet Key Pair.
   * - `crv`: Curve Name, set to 'Ed25519'.
   * - `d`: The private key component, base64url-encoded.
   * - `x`: The computed public key, base64url-encoded.
   *
   * This method is useful for converting raw public keys into a standardized
   * JSON format, facilitating their use in cryptographic operations and making
   * them easy to share and store.
   *
   * Example usage:
   *
   * ```ts
   * const privateKeyBytes = new Uint8Array([...]); // Replace with actual private key bytes
   * const privateKey = await Ed25519.bytesToPrivateKey({ privateKeyBytes });
   * ```
   *
   * @param options - The options for the private key conversion.
   * @param options.privateKeyBytes - The raw private key as a Uint8Array.
   *
   * @returns A Promise that resolves to the private key in JWK format.
   */
  public static async bytesToPrivateKey(options: {
    privateKeyBytes: Uint8Array
  }): Promise<PrivateKeyJwk> {
    const { privateKeyBytes } = options;

    // Derive the public key from the private key.
    const publicKeyBytes  = ed25519.getPublicKey(privateKeyBytes);

    // Construct the private key in JWK format.
    const privateKey: PrivateKeyJwk = {
      crv : 'Ed25519',
      d   : Convert.uint8Array(privateKeyBytes).toBase64Url(),
      kty : 'OKP',
      x   : Convert.uint8Array(publicKeyBytes).toBase64Url(),
    };

    // Compute the JWK thumbprint and set as the key ID.
    privateKey.kid = await Jose.jwkThumbprint({ key: privateKey });

    return privateKey;
  }

  /**
   * Converts a raw private key in bytes to its corresponding JSON Web Key (JWK) format.
   *
   * This method accepts a public key as a byte array (Uint8Array) for the Curve25519 curve in
   * Twisted Edwards form and transforms it into a JWK object. The process involves encoding the
   * public key bytes into base64url format.
   *
   * The resulting JWK object includes the following properties:
   * - `kty`: Key Type, set to 'OKP' for Octet Key Pair.
   * - `crv`: Curve Name, set to 'X25519'.
   * - `x`: The public key, base64url-encoded.
   *
   * This method is useful for converting raw public keys into a standardized
   * JSON format, facilitating their use in cryptographic operations and making
   * them easy to share and store.
   *
   * Example usage:
   *
   * ```ts
   * const publicKeyBytes = new Uint8Array([...]); // Replace with actual public key bytes
   * const publicKey = await X25519.bytesToPublicKey({ publicKeyBytes });
   * ```
   *
   * @param options - The options for the public key conversion.
   * @param options.publicKeyBytes - The raw public key as a Uint8Array.
   *
   * @returns A Promise that resolves to the public key in JWK format.
   */
  public static async bytesToPublicKey(options: {
    publicKeyBytes: Uint8Array
  }): Promise<PublicKeyJwk> {
    const { publicKeyBytes } = options;

    // Construct the public key in JWK format.
    const publicKey: PublicKeyJwk = {
      kty : 'OKP',
      crv : 'Ed25519',
      x   : Convert.uint8Array(publicKeyBytes).toBase64Url(),
    };

    // Compute the JWK thumbprint and set as the key ID.
    publicKey.kid = await Jose.jwkThumbprint({ key: publicKey });

    return publicKey;
  }

  /**
   * Converts an Ed25519 private key to its X25519 counterpart.
   *
   * This method enables the use of the same key pair for both digital signature (Ed25519)
   * and key exchange (X25519) operations. It takes an Ed25519 private key and converts it
   * to the corresponding X25519 format, facilitating interoperability between signing
   * and encryption protocols.
   *
   * Example usage:
   *
   * ```ts
   * const ed25519PrivateKey = { ... }; // An Ed25519 private key in JWK format
   * const x25519PrivateKey = await Ed25519.convertPrivateKeyToX25519({
   *   privateKey: ed25519PrivateKey
   * });
   * ```
   *
   * @param options - The options for the conversion.
   * @param options.privateKey - The Ed25519 private key to convert, in JWK format.
   *
   * @returns A Promise that resolves to the X25519 private key in JWK format.
   */
  public static async convertPrivateKeyToX25519(options: {
    privateKey: PrivateKeyJwk
  }): Promise<PrivateKeyJwk> {
    const { privateKey } = options;

    // Convert the provided Ed25519 private key to bytes.
    const ed25519PrivateKeyBytes = await Ed25519.privateKeyToBytes({ privateKey });

    // Convert the Ed25519 private key to an X25519 private key.
    const x25519PrivateKeyBytes = edwardsToMontgomeryPriv(ed25519PrivateKeyBytes);

    // Derive the X25519 public key from the X25519 private key.
    const x25519PublicKeyBytes = x25519.getPublicKey(x25519PrivateKeyBytes);

    // Construct the X25519 private key in JWK format.
    const x25519PrivateKey: PrivateKeyJwk = {
      kty : 'OKP',
      crv : 'X25519',
      d   : Convert.uint8Array(x25519PrivateKeyBytes).toBase64Url(),
      x   : Convert.uint8Array(x25519PublicKeyBytes).toBase64Url(),
    };

    // Compute the JWK thumbprint and set as the key ID.
    x25519PrivateKey.kid = await Jose.jwkThumbprint({ key: x25519PrivateKey });

    return x25519PrivateKey;
  }

  /**
   * Converts an Ed25519 public key to its X25519 counterpart.
   *
   * This method enables the use of the same key pair for both digital signature (Ed25519)
   * and key exchange (X25519) operations. It takes an Ed25519 public key and converts it
   * to the corresponding X25519 format, facilitating interoperability between signing
   * and encryption protocols.
   *
   * Example usage:
   *
   * ```ts
   * const ed25519PublicKey = { ... }; // An Ed25519 public key in JWK format
   * const x25519PublicKey = await Ed25519.convertPublicKeyToX25519({
   *   publicKey: ed25519PublicKey
   * });
   *
   * @param options - The options for the conversion.
   * @param options.publicKey - The Ed25519 public key to convert, in JWK format.
   *
   * @returns A Promise that resolves to the X25519 public key in JWK format.
   */
  public static async convertPublicKeyToX25519(options: {
    publicKey: PublicKeyJwk
  }): Promise<PublicKeyJwk> {
    const { publicKey } = options;

    // Convert the provided private key to a byte array.
    const ed25519PublicKeyBytes = await Ed25519.publicKeyToBytes({ publicKey });

    // Verify Edwards public key is valid.
    const isValid = await Ed25519.validatePublicKey({ key: ed25519PublicKeyBytes });
    if (!isValid) {
      throw new Error('Ed25519: Invalid public key.');
    }

    // Convert the Ed25519 public key to an X25519 private key.
    const x25519PublicKeyBytes = edwardsToMontgomeryPub(ed25519PublicKeyBytes);

    // Construct the X25519 private key in JWK format.
    const x25519PublicKey: PublicKeyJwk = {
      kty : 'OKP',
      crv : 'X25519',
      x   : Convert.uint8Array(x25519PublicKeyBytes).toBase64Url(),
    };

    // Compute the JWK thumbprint and set as the key ID.
    x25519PublicKey.kid = await Jose.jwkThumbprint({ key: x25519PublicKey });

    return x25519PublicKey;
  }

  /**
   * Derives the public key in JWK format from a given Ed25519 private key.
   *
   * This method takes a private key in JWK format and derives its corresponding public key,
   * also in JWK format.  The derivation process involves converting the private key to a
   * raw byte array and then computing the corresponding public key on the Curve25519 curve in
   * Twisted Edwards form. The public key is then encoded into base64url format to construct
   * a JWK representation.
   *
   * The process ensures that the derived public key correctly corresponds to the given private key,
   * adhering to the Curve25519 elliptic curve standards. This method is useful in cryptographic
   * operations where a public key is necessary for tasks like key agreement, but only the
   * private key is available.
   *
   * Example usage:
   *
   * ```ts
   * const privateKey = { ... }; // A PrivateKeyJwk object representing an Ed25519 private key
   * const publicKey = await Ed25519.computePublicKey({ privateKey });
   * ```
   *
   * @param options - The options for the public key derivation.
   * @param options.privateKey - The private key in JWK format from which to derive the public key.
   *
   * @returns A Promise that resolves to the computed public key in JWK format.
   */
  public static async computePublicKey(options: {
    privateKey: PrivateKeyJwk
  }): Promise<PublicKeyJwk> {
    let { privateKey } = options;

    // Convert the provided private key to a byte array.
    const privateKeyBytes  = await Ed25519.privateKeyToBytes({ privateKey });

    // Derive the public key from the private key.
    const publicKeyBytes  = ed25519.getPublicKey(privateKeyBytes);

    // Construct the public key in JWK format.
    const publicKey: PublicKeyJwk = {
      kty : 'OKP',
      crv : 'Ed25519',
      x   : Convert.uint8Array(publicKeyBytes).toBase64Url()
    };

    // Compute the JWK thumbprint and set as the key ID.
    publicKey.kid = await Jose.jwkThumbprint({ key: publicKey });

    return publicKey;
  }

  /**
   * Generates an Ed25519 private key in JSON Web Key (JWK) format.
   *
   * This method creates a new private key suitable for use with the Curve25519 elliptic curve in
   * Twisted Edwards form. The key generation process involves using cryptographically secure
   * random number generation to ensure the uniqueness and security of the key. The resulting
   * private key adheres to the JWK format making it compatible with common cryptographic
   * standards and easy to use in various cryptographic processes.
   *
   * The generated private key in JWK format includes the following components:
   * - `kty`: Key Type, set to 'OKP' for Octet Key Pair.
   * - `crv`: Curve Name, set to 'Ed25519'.
   * - `d`: The private key component, base64url-encoded.
   * - `x`: The derived public key, base64url-encoded.
   *
   * The key is returned in a format suitable for direct use in signing operations.
   *
   * Example usage:
   *
   * ```ts
   * const privateKey = await X25519.generateKey();
   * ```
   *
   * @returns A Promise that resolves to the generated private key in JWK format.
   */
  public static async generateKey(): Promise<PrivateKeyJwk> {
    // Generate a random private key.
    const privateKeyBytes = ed25519.utils.randomPrivateKey();

    // Convert private key from bytes to JWK format.
    const privateKey = await Ed25519.bytesToPrivateKey({ privateKeyBytes });

    // Compute the JWK thumbprint and set as the key ID.
    privateKey.kid = await Jose.jwkThumbprint({ key: privateKey });

    return privateKey;
  }

  /**
   * Converts a private key from JSON Web Key (JWK) format to a raw byte array (Uint8Array).
   *
   * This method accepts a private key in JWK format and extracts its raw byte representation.
   *
   * This method accepts a public key in JWK format and converts it into its raw binary
   * form. The conversion process involves decoding the 'd' parameter of the JWK
   * from base64url format into a byte array.
   *
   * This conversion is essential for operations that require the private key in its raw
   * binary form, such as certain low-level cryptographic operations or when interfacing
   * with systems and libraries that expect keys in a byte array format.
   *
   * Example usage:
   *
   * ```ts
   * const privateKey = { ... }; // An Ed25519 private key in JWK format
   * const privateKeyBytes = await Ed25519.privateKeyToBytes({ privateKey });
   * ```
   *
   * @param options - The options for the private key conversion.
   * @param options.privateKey - The private key in JWK format.
   *
   * @returns A Promise that resolves to the private key as a Uint8Array.
   */
  public static async privateKeyToBytes(options: {
    privateKey: PrivateKeyJwk
  }): Promise<Uint8Array> {
    const { privateKey } = options;

    // Verify the provided JWK represents a valid OKP private key.
    if (!Jose.isOkpPrivateKeyJwk(privateKey)) {
      throw new Error(`Ed25519: The provided key is not a valid OKP private key.`);
    }

    // Decode the provided private key to bytes.
    const privateKeyBytes = Convert.base64Url(privateKey.d).toUint8Array();

    return privateKeyBytes;
  }

  /**
   * Converts a public key from JSON Web Key (JWK) format to a raw byte array (Uint8Array).
   *
   * This method accepts a public key in JWK format and converts it into its raw binary form.
   * The conversion process involves decoding the 'x' parameter of the JWK (which represent the
   * x coordinate of the elliptic curve point) from base64url format into a byte array.
   *
   * This conversion is essential for operations that require the public key in its raw
   * binary form, such as certain low-level cryptographic operations or when interfacing
   * with systems and libraries that expect keys in a byte array format.
   *
   * Example usage:
   *
   * ```ts
   * const publicKey = { ... }; // An Ed25519 public key in JWK format
   * const publicKeyBytes = await Ed25519.publicKeyToBytes({ publicKey });
   * ```
   *
   * @param options - The options for the public key conversion.
   * @param options.publicKey - The public key in JWK format.
   *
   * @returns A Promise that resolves to the public key as a Uint8Array.
   */
  public static async publicKeyToBytes(options: {
    publicKey: PublicKeyJwk
  }): Promise<Uint8Array> {
    const { publicKey } = options;

    // Verify the provided JWK represents a valid OKP public key.
    if (!Jose.isOkpPublicKeyJwk(publicKey)) {
      throw new Error(`Ed25519: The provided key is not a valid OKP public key.`);
    }

    // Decode the provided public key to bytes.
    const publicKeyBytes = Convert.base64Url(publicKey.x).toUint8Array();

    return publicKeyBytes;
  }

  /**
   * Generates an RFC8032-compliant EdDSA signature of given data using an Ed25519 private key.
   *
   * This method signs the provided data with a specified private key using the EdDSA
   * (Edwards-curve Digital Signature Algorithm) as defined in RFC8032. It
   * involves converting the private key from JWK format to a byte array and then employing
   * the Ed25519 algorithm to sign the data. The output is a digital signature in the form
   * of a Uint8Array, uniquely corresponding to both the data and the private key used for
   * signing.
   *
   * This method is commonly used in cryptographic applications to ensure data integrity and
   * authenticity. The signature can later be verified by parties with access to the corresponding
   * public key, ensuring that the data has not been tampered with and was indeed signed by the
   * holder of the private key.
   *
   * Example usage:
   *
   * ```ts
   * const data = new TextEncoder().encode('Hello, world!'); // Data to be signed
   * const privateKey = { ... }; // A PrivateKeyJwk object representing an Ed25519 private key
   * const signature = await Ed25519.sign({
   *   data,
   *   key: privateKey
   * });
   * ```
   *
   * @param options - The options for the signing operation.
   * @param options.data - The data to sign, represented as a Uint8Array.
   * @param options.key - The private key to use for signing, represented in JWK format.
   *
   * @returns A Promise that resolves to the signature as a Uint8Array.
   */
  public static async sign(options: {
    data: Uint8Array,
    key: PrivateKeyJwk
  }): Promise<Uint8Array> {
    const { key, data } = options;

    // Convert the private key from JWK format to bytes.
    const privateKeyBytes = await Ed25519.privateKeyToBytes({ privateKey: key });

    // Sign the provided data using the EdDSA algorithm.
    const signature = ed25519.sign(data, privateKeyBytes);

    return signature;
  }

  /**
   * Verifies a RFC8032 EdDSA signature of given data with a given public key.
   *
   * @param options - The options for the verification operation.
   * @param options.key - The public key to use for verification.
   * @param options.signature - The signature to verify.
   * @param options.data - The data that was signed.
   *
   * @returns A Promise that resolves to a boolean indicating whether the signature is valid.
   */
  public static async verify(options: {
    data: Uint8Array,
    key: PublicKeyJwk,
    signature: Uint8Array
  }): Promise<boolean> {
    const { key, signature, data } = options;

    // Convert the public key from JWK format to bytes.
    const publicKeyBytes = await Ed25519.publicKeyToBytes({ publicKey: key });

    // Perform the verification of the signature.
    const isValid = ed25519.verify(signature, data, publicKeyBytes);

    return isValid;
  }

  /**
   * Validates a given public key to confirm its mathematical correctness on the Edwards curve.
   *
   * This method decodes the Edwards points from the key bytes and asserts their validity on the
   * Curve25519 curve in Twisted Edwards form. If the points are not valid, the method returns
   * false. If the points are valid, the method returns true.
   *
   * Note that this validation strictly pertains to the key's format and numerical validity; it does
   * not assess whether the key corresponds to a known entity or its security status (e.g., whether
   * it has been compromised).
   *
   * Example usage:
   *
   * ```ts
   * const publicKey = new Uint8Array([...]); // A public key in byte format
   * const isValid = await Secp256k1.validatePublicKey({ key: publicKey });
   * console.log(isValid); // true if the key is valid on the Edwards curve, false otherwise
   * ```
   *
   * @param options - The options for the public key validation.
   * @param options.key - The public key to validate, represented as a Uint8Array.
   *
   * @returns A Promise that resolves to a boolean indicating whether the key
   *          corresponds to a valid point on the Edwards curve.
   */
  private static async validatePublicKey(options: {
    key: Uint8Array
  }): Promise<boolean> {
    const { key } = options;

    try {
      // Decode Edwards points from key bytes.
      const point = ed25519.ExtendedPoint.fromHex(key);

      // Check if points are on the Twisted Edwards curve.
      point.assertValidity();

    } catch(error: any) {
      return false;
    }

    return true;
  }
}