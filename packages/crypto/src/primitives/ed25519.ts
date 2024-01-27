import { Convert } from '@web5/common';
import { ed25519, edwardsToMontgomeryPub, edwardsToMontgomeryPriv, x25519 } from '@noble/curves/ed25519';

import type { Jwk } from '../jose/jwk.js';
import type { ComputePublicKeyParams, GetPublicKeyParams, SignParams, VerifyParams } from '../types/params-direct.js';

import { computeJwkThumbprint, isOkpPrivateJwk, isOkpPublicJwk } from '../jose/jwk.js';

/**
 * The `Ed25519` class provides a comprehensive suite of utilities for working with the Ed25519
 * elliptic curve, widely used in modern cryptographic applications. This class includes methods for
 * key generation, conversion, signing, verification, and public key derivation.
 *
 * The class supports conversions between raw byte formats and JSON Web Key (JWK) formats. It
 * follows the guidelines and specifications outlined in RFC8032 for EdDSA (Edwards-curve Digital
 * Signature Algorithm) operations.
 *
 * Key Features:
 * - Key Generation: Generate Ed25519 private keys in JWK format.
 * - Key Conversion: Transform keys between raw byte arrays and JWK formats.
 * - Public Key Derivation: Derive public keys from private keys.
 * - Signing and Verification: Sign data and verify signatures with Ed25519 keys.
 * - Key Validation: Validate the mathematical correctness of Ed25519 keys.
 *
 * The methods in this class are asynchronous, returning Promises to accommodate various
 * JavaScript environments, and use `Uint8Array` for binary data handling.
 *
 * @example
 * ```ts
 * // Key Generation
 * const privateKey = await Ed25519.generateKey();
 *
 * // Public Key Derivation
 * const publicKey = await Ed25519.computePublicKey({ key: privateKey });
 * console.log(publicKey === await Ed25519.getPublicKey({ key: privateKey })); // Output: true
 *
 * // EdDSA Signing
 * const signature = await Ed25519.sign({
 *   key: privateKey,
 *   data: new TextEncoder().encode('Message')
 * });
 *
 * // EdDSA Signature Verification
 * const isValid = await Ed25519.verify({
 *   key: publicKey,
 *   signature: signature,
 *   data: new TextEncoder().encode('Message')
 * });
 *
 * // Key Conversion
 * const privateKeyBytes = await Ed25519.privateKeyToBytes({ privateKey });
 * const publicKeyBytes = await Ed25519.publicKeyToBytes({ publicKey });
 *
 * // Key Validation
 * const isPublicKeyValid = await Ed25519.validatePublicKey({ publicKeyBytes });
 * ```
 */
export class Ed25519 {
  /**
   * Converts a raw private key in bytes to its corresponding JSON Web Key (JWK) format.
   *
   * @remarks
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
   * @example
   * ```ts
   * const privateKeyBytes = new Uint8Array([...]); // Replace with actual private key bytes
   * const privateKey = await Ed25519.bytesToPrivateKey({ privateKeyBytes });
   * ```
   *
   * @param params - The parameters for the private key conversion.
   * @param params.privateKeyBytes - The raw private key as a Uint8Array.
   *
   * @returns A Promise that resolves to the private key in JWK format.
   */
  public static async bytesToPrivateKey({ privateKeyBytes }: {
    privateKeyBytes: Uint8Array;
  }): Promise<Jwk> {
    // Derive the public key from the private key.
    const publicKeyBytes  = ed25519.getPublicKey(privateKeyBytes);

    // Construct the private key in JWK format.
    const privateKey: Jwk = {
      crv : 'Ed25519',
      d   : Convert.uint8Array(privateKeyBytes).toBase64Url(),
      kty : 'OKP',
      x   : Convert.uint8Array(publicKeyBytes).toBase64Url(),
    };

    // Compute the JWK thumbprint and set as the key ID.
    privateKey.kid = await computeJwkThumbprint({ jwk: privateKey });

    return privateKey;
  }

  /**
   * Converts a raw private key in bytes to its corresponding JSON Web Key (JWK) format.
   *
   * @remarks
   * This method accepts a public key as a byte array (Uint8Array) for the Curve25519 curve in
   * Twisted Edwards form and transforms it into a JWK object. The process involves encoding the
   * public key bytes into base64url format.
   *
   * The resulting JWK object includes the following properties:
   * - `kty`: Key Type, set to 'OKP' for Octet Key Pair.
   * - `crv`: Curve Name, set to 'X25519'.
   * - `x`: The public key, base64url-encoded.
   *
   * @example
   * ```ts
   * const publicKeyBytes = new Uint8Array([...]); // Replace with actual public key bytes
   * const publicKey = await X25519.bytesToPublicKey({ publicKeyBytes });
   * ```
   *
   * @param params - The parameters for the public key conversion.
   * @param params.publicKeyBytes - The raw public key as a `Uint8Array`.
   *
   * @returns A Promise that resolves to the public key in JWK format.
   */
  public static async bytesToPublicKey({ publicKeyBytes }: {
    publicKeyBytes: Uint8Array;
  }): Promise<Jwk> {
    // Construct the public key in JWK format.
    const publicKey: Jwk = {
      kty : 'OKP',
      crv : 'Ed25519',
      x   : Convert.uint8Array(publicKeyBytes).toBase64Url(),
    };

    // Compute the JWK thumbprint and set as the key ID.
    publicKey.kid = await computeJwkThumbprint({ jwk: publicKey });

    return publicKey;
  }

  /**
   * Derives the public key in JWK format from a given Ed25519 private key.
   *
   * @remarks
   * This method takes a private key in JWK format and derives its corresponding public key,
   * also in JWK format.  The derivation process involves converting the private key to a
   * raw byte array and then computing the corresponding public key on the Curve25519 curve in
   * Twisted Edwards form. The public key is then encoded into base64url format to construct
   * a JWK representation.
   *
   * @example
   * ```ts
   * const privateKey = { ... }; // A Jwk object representing an Ed25519 private key
   * const publicKey = await Ed25519.computePublicKey({ key: privateKey });
   * ```
   *
   * @param params - The parameters for the public key derivation.
   * @param params.key - The private key in JWK format from which to derive the public key.
   *
   * @returns A Promise that resolves to the computed public key in JWK format.
   */
  public static async computePublicKey({ key }:
    ComputePublicKeyParams
  ): Promise<Jwk> {
    // Convert the provided private key to a byte array.
    const privateKeyBytes  = await Ed25519.privateKeyToBytes({ privateKey: key });

    // Derive the public key from the private key.
    const publicKeyBytes  = ed25519.getPublicKey(privateKeyBytes);

    // Construct the public key in JWK format.
    const publicKey: Jwk = {
      kty : 'OKP',
      crv : 'Ed25519',
      x   : Convert.uint8Array(publicKeyBytes).toBase64Url()
    };

    // Compute the JWK thumbprint and set as the key ID.
    publicKey.kid = await computeJwkThumbprint({ jwk: publicKey });

    return publicKey;
  }

  /**
   * Converts an Ed25519 private key to its X25519 counterpart.
   *
   * @remarks
   * This method enables the use of the same key pair for both digital signature (Ed25519)
   * and key exchange (X25519) operations. It takes an Ed25519 private key and converts it
   * to the corresponding X25519 format, facilitating interoperability between signing
   * and encryption protocols.
   *
   * @example
   * ```ts
   * const ed25519PrivateKey = { ... }; // An Ed25519 private key in JWK format
   * const x25519PrivateKey = await Ed25519.convertPrivateKeyToX25519({
   *   privateKey: ed25519PrivateKey
   * });
   * ```
   *
   * @param params - The parameters for the private key conversion.
   * @param params.privateKey - The Ed25519 private key to convert, in JWK format.
   *
   * @returns A Promise that resolves to the X25519 private key in JWK format.
   */
  public static async convertPrivateKeyToX25519({ privateKey }: {
    privateKey: Jwk;
  }): Promise<Jwk> {
    // Convert the provided Ed25519 private key to bytes.
    const ed25519PrivateKeyBytes = await Ed25519.privateKeyToBytes({ privateKey });

    // Convert the Ed25519 private key to an X25519 private key.
    const x25519PrivateKeyBytes = edwardsToMontgomeryPriv(ed25519PrivateKeyBytes);

    // Derive the X25519 public key from the X25519 private key.
    const x25519PublicKeyBytes = x25519.getPublicKey(x25519PrivateKeyBytes);

    // Construct the X25519 private key in JWK format.
    const x25519PrivateKey: Jwk = {
      kty : 'OKP',
      crv : 'X25519',
      d   : Convert.uint8Array(x25519PrivateKeyBytes).toBase64Url(),
      x   : Convert.uint8Array(x25519PublicKeyBytes).toBase64Url(),
    };

    // Compute the JWK thumbprint and set as the key ID.
    x25519PrivateKey.kid = await computeJwkThumbprint({ jwk: x25519PrivateKey });

    return x25519PrivateKey;
  }

  /**
   * Converts an Ed25519 public key to its X25519 counterpart.
   *
   * @remarks
   * This method enables the use of the same key pair for both digital signature (Ed25519)
   * and key exchange (X25519) operations. It takes an Ed25519 public key and converts it
   * to the corresponding X25519 format, facilitating interoperability between signing
   * and encryption protocols.
   *
   * @example
   * ```ts
   * const ed25519PublicKey = { ... }; // An Ed25519 public key in JWK format
   * const x25519PublicKey = await Ed25519.convertPublicKeyToX25519({
   *   publicKey: ed25519PublicKey
   * });
   * ```
   *
   * @param params - The parameters for the public key conversion.
   * @param params.publicKey - The Ed25519 public key to convert, in JWK format.
   *
   * @returns A Promise that resolves to the X25519 public key in JWK format.
   */
  public static async convertPublicKeyToX25519({ publicKey }: {
    publicKey: Jwk;
  }): Promise<Jwk> {
    // Convert the provided private key to a byte array.
    const ed25519PublicKeyBytes = await Ed25519.publicKeyToBytes({ publicKey });

    // Verify Edwards public key is valid.
    const isValid = await Ed25519.validatePublicKey({ publicKeyBytes: ed25519PublicKeyBytes });
    if (!isValid) {
      throw new Error('Ed25519: Invalid public key.');
    }

    // Convert the Ed25519 public key to an X25519 private key.
    const x25519PublicKeyBytes = edwardsToMontgomeryPub(ed25519PublicKeyBytes);

    // Construct the X25519 private key in JWK format.
    const x25519PublicKey: Jwk = {
      kty : 'OKP',
      crv : 'X25519',
      x   : Convert.uint8Array(x25519PublicKeyBytes).toBase64Url(),
    };

    // Compute the JWK thumbprint and set as the key ID.
    x25519PublicKey.kid = await computeJwkThumbprint({ jwk: x25519PublicKey });

    return x25519PublicKey;
  }

  /**
   * Generates an Ed25519 private key in JSON Web Key (JWK) format.
   *
   * @remarks
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
   * @example
   * ```ts
   * const privateKey = await Ed25519.generateKey();
   * ```
   *
   * @returns A Promise that resolves to the generated private key in JWK format.
   */
  public static async generateKey(): Promise<Jwk> {
    // Generate a random private key.
    const privateKeyBytes = ed25519.utils.randomPrivateKey();

    // Convert private key from bytes to JWK format.
    const privateKey = await Ed25519.bytesToPrivateKey({ privateKeyBytes });

    // Compute the JWK thumbprint and set as the key ID.
    privateKey.kid = await computeJwkThumbprint({ jwk: privateKey });

    return privateKey;
  }

  /**
   * Retrieves the public key properties from a given private key in JWK format.
   *
   * @remarks
   * This method extracts the public key portion from an Ed25519 private key in JWK format. It does
   * so by removing the private key property 'd' and making a shallow copy, effectively yielding the
   * public key. The method sets the 'kid' (key ID) property using the JWK thumbprint if it is not
   * already defined. This approach is used under the assumption that a private key in JWK format
   * always contains the corresponding public key properties.
   *
   * Note: This method offers a significant performance advantage, being about 100 times faster
   * than `computePublicKey()`. However, it does not mathematically validate the private key, nor
   * does it derive the public key from the private key. It simply extracts existing public key
   * properties from the private key object. This makes it suitable for scenarios where speed is
   * critical and the private key's integrity is already assured.
   *
   * @example
   * ```ts
   * const privateKey = { ... }; // A Jwk object representing an Ed25519 private key
   * const publicKey = await Ed25519.getPublicKey({ key: privateKey });
   * ```
   *
   * @param params - The parameters for retrieving the public key properties.
   * @param params.key - The private key in JWK format.
   *
   * @returns A Promise that resolves to the public key in JWK format.
   */
  public static async getPublicKey({ key }:
    GetPublicKeyParams
  ): Promise<Jwk> {
  // Verify the provided JWK represents an octet key pair (OKP) Ed25519 private key.
    if (!(isOkpPrivateJwk(key) && key.crv === 'Ed25519')) {
      throw new Error(`Ed25519: The provided key is not an Ed25519 private JWK.`);
    }

    // Remove the private key property ('d') and make a shallow copy of the provided key.
    let { d, ...publicKey } = key;

    // If the key ID is undefined, set it to the JWK thumbprint.
    publicKey.kid ??= await computeJwkThumbprint({ jwk: publicKey });

    return publicKey;
  }

  /**
   * Converts a private key from JSON Web Key (JWK) format to a raw byte array (Uint8Array).
   *
   * @remarks
   * This method accepts a private key in JWK format and extracts its raw byte representation.
   *
   * This method accepts a public key in JWK format and converts it into its raw binary
   * form. The conversion process involves decoding the 'd' parameter of the JWK
   * from base64url format into a byte array.
   *
   * @example
   * ```ts
   * const privateKey = { ... }; // An Ed25519 private key in JWK format
   * const privateKeyBytes = await Ed25519.privateKeyToBytes({ privateKey });
   * ```
   *
   * @param params - The parameters for the private key conversion.
   * @param params.privateKey - The private key in JWK format.
   *
   * @returns A Promise that resolves to the private key as a Uint8Array.
   */
  public static async privateKeyToBytes({ privateKey }: {
    privateKey: Jwk;
  }): Promise<Uint8Array> {
    // Verify the provided JWK represents a valid OKP private key.
    if (!isOkpPrivateJwk(privateKey)) {
      throw new Error(`Ed25519: The provided key is not a valid OKP private key.`);
    }

    // Decode the provided private key to bytes.
    const privateKeyBytes = Convert.base64Url(privateKey.d).toUint8Array();

    return privateKeyBytes;
  }

  /**
   * Converts a public key from JSON Web Key (JWK) format to a raw byte array (Uint8Array).
   *
   * @remarks
   * This method accepts a public key in JWK format and converts it into its raw binary form.
   * The conversion process involves decoding the 'x' parameter of the JWK (which represent the
   * x coordinate of the elliptic curve point) from base64url format into a byte array.
   *
   * @example
   * ```ts
   * const publicKey = { ... }; // An Ed25519 public key in JWK format
   * const publicKeyBytes = await Ed25519.publicKeyToBytes({ publicKey });
   * ```
   *
   * @param params - The parameters for the public key conversion.
   * @param params.publicKey - The public key in JWK format.
   *
   * @returns A Promise that resolves to the public key as a Uint8Array.
   */
  public static async publicKeyToBytes({ publicKey }: {
    publicKey: Jwk;
  }): Promise<Uint8Array> {
    // Verify the provided JWK represents a valid OKP public key.
    if (!isOkpPublicJwk(publicKey)) {
      throw new Error(`Ed25519: The provided key is not a valid OKP public key.`);
    }

    // Decode the provided public key to bytes.
    const publicKeyBytes = Convert.base64Url(publicKey.x).toUint8Array();

    return publicKeyBytes;
  }

  /**
   * Generates an RFC8032-compliant EdDSA signature of given data using an Ed25519 private key.
   *
   * @remarks
   * This method signs the provided data with a specified private key using the EdDSA
   * (Edwards-curve Digital Signature Algorithm) as defined in RFC8032. It
   * involves converting the private key from JWK format to a byte array and then employing
   * the Ed25519 algorithm to sign the data. The output is a digital signature in the form
   * of a Uint8Array, uniquely corresponding to both the data and the private key used for
   * signing.
   *
   * @example
   * ```ts
   * const data = new TextEncoder().encode('Messsage'); // Data to be signed
   * const privateKey = { ... }; // A Jwk object representing an Ed25519 private key
   * const signature = await Ed25519.sign({ key: privateKey, data });
   * ```
   *
   * @param params - The parameters for the signing operation.
   * @param params.key - The private key to use for signing, represented in JWK format.
   * @param params.data - The data to sign, represented as a Uint8Array.
   *
   * @returns A Promise that resolves to the signature as a Uint8Array.
   */
  public static async sign({ key, data }:
    SignParams
  ): Promise<Uint8Array> {
    // Convert the private key from JWK format to bytes.
    const privateKeyBytes = await Ed25519.privateKeyToBytes({ privateKey: key });

    // Sign the provided data using the EdDSA algorithm.
    const signature = ed25519.sign(data, privateKeyBytes);

    return signature;
  }

  /**
   * Validates a given public key to confirm its mathematical correctness on the Edwards curve.
   *
   * @remarks
   * This method decodes the Edwards points from the key bytes and asserts their validity on the
   * Curve25519 curve in Twisted Edwards form. If the points are not valid, the method returns
   * false. If the points are valid, the method returns true.
   *
   * Note that this validation strictly pertains to the key's format and numerical validity; it does
   * not assess whether the key corresponds to a known entity or its security status (e.g., whether
   * it has been compromised).
   *
   * @example
   * ```ts
   * const publicKeyBytes = new Uint8Array([...]); // A public key in byte format
   * const isValid = await Ed25519.validatePublicKey({ publicKeyBytes });
   * console.log(isValid); // true if the key is valid on the Edwards curve, false otherwise
   * ```
   *
   * @param params - The parameters for the public key validation.
   * @param params.publicKeyBytes - The public key to validate, represented as a Uint8Array.
   *
   * @returns A Promise that resolves to a boolean indicating whether the key
   *          corresponds to a valid point on the Edwards curve.
   */
  public static async validatePublicKey({ publicKeyBytes }: {
    publicKeyBytes: Uint8Array;
  }): Promise<boolean> {
    try {
    // Decode Edwards points from key bytes.
      const point = ed25519.ExtendedPoint.fromHex(publicKeyBytes);

      // Check if points are on the Twisted Edwards curve.
      point.assertValidity();

    } catch(error: any) {
      return false;
    }

    return true;
  }

  /**
   * Verifies an RFC8032-compliant EdDSA signature against given data using an Ed25519 public key.
   *
   * @remarks
   * This method validates a digital signature to ensure its authenticity and integrity.
   * It uses the EdDSA (Edwards-curve Digital Signature Algorithm) as specified in RFC8032.
   * The verification process involves converting the public key from JWK format to a raw
   * byte array and using the Ed25519 algorithm to validate the signature against the provided data.
   *
   * @example
   * ```ts
   * const data = new TextEncoder().encode('Messsage'); // Data that was signed
   * const publicKey = { ... }; // A Jwk object representing an Ed25519 public key
   * const signature = new Uint8Array([...]); // Signature to verify
   * const isValid = await Ed25519.verify({ key: publicKey, signature, data });
   * console.log(isValid); // true if the signature is valid, false otherwise
   * ```
   *
   * @param params - The parameters for the signature verification.
   * @param params.key - The public key in JWK format used for verification.
   * @param params.signature - The signature to verify, represented as a Uint8Array.
   * @param params.data - The data that was signed, represented as a Uint8Array.
   *
   * @returns A Promise that resolves to a boolean indicating whether the signature is valid.
   */
  public static async verify({ key, signature, data }:
    VerifyParams
  ): Promise<boolean> {
    // Convert the public key from JWK format to bytes.
    const publicKeyBytes = await Ed25519.publicKeyToBytes({ publicKey: key });

    // Perform the verification of the signature.
    const isValid = ed25519.verify(signature, data, publicKeyBytes);

    return isValid;
  }
}