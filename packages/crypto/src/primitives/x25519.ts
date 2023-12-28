import { Convert } from '@web5/common';
import { x25519 } from '@noble/curves/ed25519';

import type { Jwk } from '../jose/jwk.js';
import type { ComputePublicKeyParams, GetPublicKeyParams } from '../types/params-direct.js';

import { computeJwkThumbprint, isOkpPrivateJwk, isOkpPublicJwk } from '../jose/jwk.js';

/**
 * The `X25519` class provides a comprehensive suite of utilities for working with the X25519
 * elliptic curve, widely used for key agreement protocols and cryptographic applications. It
 * provides methods for key generation, conversion, and Elliptic Curve Diffie-Hellman (ECDH)
 * key agreement,  all aligned with standard cryptographic practices.
 *
 * The class supports conversions between raw byte formats and JSON Web Key (JWK) formats,
 * making it versatile for various cryptographic tasks. It adheres to RFC6090 for ECDH, ensuring
 * secure and effective handling of keys and cryptographic operations.
 *
 * Key Features:
 * - Key Generation: Generate X25519 private keys in JWK format.
 * - Key Conversion: Transform keys between raw byte arrays and JWK formats.
 * - Public Key Derivation: Derive public keys from private keys.
 * - ECDH Shared Secret Computation: Securely derive shared secrets using private and public keys.
 *
 * The methods in this class are asynchronous, returning Promises to accommodate various
 * JavaScript environments.
 *
 * @example
 * ```ts
 * // Key Generation
 * const privateKey = await X25519.generateKey();
 *
 * // Public Key Derivation
 * const publicKey = await X25519.computePublicKey({ key: privateKey });
 * console.log(publicKey === await X25519.getPublicKey({ key: privateKey })); // Output: true
 *
 * // ECDH Shared Secret Computation
 * const sharedSecret = await X25519.sharedSecret({
 *   privateKeyA: privateKey,
 *   publicKeyB: anotherPublicKey
 * });
 *
 * // Key Conversion
 * const publicKeyBytes = await X25519.publicKeyToBytes({ publicKey });
 * const privateKeyBytes = await X25519.privateKeyToBytes({ privateKey });
 * ```
 */
export class X25519 {
  /**
   * Converts a raw private key in bytes to its corresponding JSON Web Key (JWK) format.
   *
   * @remarks
   * This method accepts a private key as a byte array (Uint8Array) for the X25519 elliptic curve
   * and transforms it into a JWK object. The process involves first deriving the public key from
   * the private key, then encoding both the private and public keys into base64url format.
   *
   * The resulting JWK object includes the following properties:
   * - `kty`: Key Type, set to 'OKP' for Octet Key Pair.
   * - `crv`: Curve Name, set to 'X25519'.
   * - `d`: The private key component, base64url-encoded.
   * - `x`: The derived public key, base64url-encoded.
   *
   * This method is useful for converting raw public keys into a standardized
   * JSON format, facilitating their use in cryptographic operations and making
   * them easy to share and store.
   *
   * @example
   * ```ts
   * const privateKeyBytes = new Uint8Array([...]); // Replace with actual private key bytes
   * const privateKey = await X25519.bytesToPrivateKey({ privateKeyBytes });
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
    const publicKeyBytes  = x25519.getPublicKey(privateKeyBytes);

    // Construct the private key in JWK format.
    const privateKey: Jwk = {
      kty : 'OKP',
      crv : 'X25519',
      d   : Convert.uint8Array(privateKeyBytes).toBase64Url(),
      x   : Convert.uint8Array(publicKeyBytes).toBase64Url(),
    };

    // Compute the JWK thumbprint and set as the key ID.
    privateKey.kid = await computeJwkThumbprint({ jwk: privateKey });

    return privateKey;
  }

  /**
   * Converts a raw public key in bytes to its corresponding JSON Web Key (JWK) format.
   *
   * @remarks
   * This method accepts a public key as a byte array (Uint8Array) for the X25519 elliptic curve
   * and transforms it into a JWK object. The conversion process involves encoding the public
   * key bytes into base64url format.
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
   * @example
   * ```ts
   * const publicKeyBytes = new Uint8Array([...]); // Replace with actual public key bytes
   * const publicKey = await X25519.bytesToPublicKey({ publicKeyBytes });
   * ```
   *
   * @param params - The parameters for the public key conversion.
   * @param params.publicKeyBytes - The raw public key as a Uint8Array.
   *
   * @returns A Promise that resolves to the public key in JWK format.
   */
  public static async bytesToPublicKey({ publicKeyBytes }: {
    publicKeyBytes: Uint8Array;
  }): Promise<Jwk> {
    // Construct the public key in JWK format.
    const publicKey: Jwk = {
      kty : 'OKP',
      crv : 'X25519',
      x   : Convert.uint8Array(publicKeyBytes).toBase64Url(),
    };

    // Compute the JWK thumbprint and set as the key ID.
    publicKey.kid = await computeJwkThumbprint({ jwk: publicKey });

    return publicKey;
  }

  /**
   * Derives the public key in JWK format from a given X25519 private key.
   *
   * @remarks
   * This method takes a private key in JWK format and derives its corresponding public key,
   * also in JWK format.  The derivation process involves converting the private key to a
   * raw byte array and then computing the corresponding public key on the Curve25519 curve.
   * The public key is then encoded into base64url format to construct a JWK representation.
   *
   * The process ensures that the derived public key correctly corresponds to the given private key,
   * adhering to the Curve25519 elliptic curve in Twisted Edwards form standards. This method is
   * useful in cryptographic operations where a public key is needed for operations like signature
   * verification, but only the private key is available.
   *
   * @example
   * ```ts
   * const privateKey = { ... }; // A Jwk object representing an X25519 private key
   * const publicKey = await X25519.computePublicKey({ key: privateKey });
   * ```
   *
   * @param params - The parameters for the public key derivation.
   * @param params.key - The private key in JWK format from which to derive the public key.
   *
   * @returns A Promise that resolves to the derived public key in JWK format.
   */
  public static async computePublicKey({ key }:
    ComputePublicKeyParams
  ): Promise<Jwk> {
    // Convert the provided private key to a byte array.
    const privateKeyBytes  = await X25519.privateKeyToBytes({ privateKey: key });

    // Derive the public key from the private key.
    const publicKeyBytes = x25519.getPublicKey(privateKeyBytes);

    // Construct the public key in JWK format.
    const publicKey: Jwk = {
      kty : 'OKP',
      crv : 'X25519',
      x   : Convert.uint8Array(publicKeyBytes).toBase64Url()
    };

    // Compute the JWK thumbprint and set as the key ID.
    publicKey.kid = await computeJwkThumbprint({ jwk: publicKey });

    return publicKey;
  }

  /**
   * Generates an X25519 private key in JSON Web Key (JWK) format.
   *
   * @remarks
   * This method creates a new private key suitable for use with the X25519 elliptic curve.
   * The key generation process involves using cryptographically secure random number generation
   * to ensure the uniqueness and security of the key. The resulting private key adheres to the
   * JWK format making it compatible with common cryptographic standards and easy to use in various
   * cryptographic processes.
   *
   * The generated private key in JWK format includes the following components:
   * - `kty`: Key Type, set to 'OKP' for Octet Key Pair.
   * - `crv`: Curve Name, set to 'X25519'.
   * - `d`: The private key component, base64url-encoded.
   * - `x`: The derived public key, base64url-encoded.
   *
   * The key is returned in a format suitable for direct use in key agreement operations.
   *
   * @example
   * ```ts
   * const privateKey = await X25519.generateKey();
   * ```
   *
   * @returns A Promise that resolves to the generated private key in JWK format.
   */
  public static async generateKey(): Promise<Jwk> {
    // Generate a random private key.
    const privateKeyBytes = x25519.utils.randomPrivateKey();

    // Convert private key from bytes to JWK format.
    const privateKey = await X25519.bytesToPrivateKey({ privateKeyBytes });

    // Compute the JWK thumbprint and set as the key ID.
    privateKey.kid = await computeJwkThumbprint({ jwk: privateKey });

    return privateKey;
  }

  /**
   * Retrieves the public key properties from a given private key in JWK format.
   *
   * @remarks
   * This method extracts the public key portion from an X25519 private key in JWK format. It does
   * so by removing the private key property 'd' and making a shallow copy, effectively yielding the
   * public key. The method sets the 'kid' (key ID) property using the JWK thumbprint if it is not
   * already defined. This approach is used under the assumption that a private key in JWK format
   * always contains the corresponding public key properties.
   *
   * Note: This method offers a significant performance advantage, being about 500 times faster
   * than `computePublicKey()`. However, it does not mathematically validate the private key, nor
   * does it derive the public key from the private key. It simply extracts existing public key
   * properties from the private key object. This makes it suitable for scenarios where speed is
   * critical and the private key's integrity is already assured.
   *
   * @example
   * ```ts
   * const privateKey = { ... }; // A Jwk object representing an X25519 private key
   * const publicKey = await X25519.getPublicKey({ key: privateKey });
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
  // Verify the provided JWK represents an octet key pair (OKP) X25519 private key.
    if (!(isOkpPrivateJwk(key) && key.crv === 'X25519')) {
      throw new Error(`X25519: The provided key is not an X25519 private JWK.`);
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
   * This conversion is essential for operations that require the private key in its raw
   * binary form, such as certain low-level cryptographic operations or when interfacing
   * with systems and libraries that expect keys in a byte array format.
   *
   * @example
   * ```ts
   * const privateKey = { ... }; // An X25519 private key in JWK format
   * const privateKeyBytes = await X25519.privateKeyToBytes({ privateKey });
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
      throw new Error(`X25519: The provided key is not a valid OKP private key.`);
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
   * This conversion is essential for operations that require the public key in its raw
   * binary form, such as certain low-level cryptographic operations or when interfacing
   * with systems and libraries that expect keys in a byte array format.
   *
   * @example
   * ```ts
   * const publicKey = { ... }; // An X25519 public key in JWK format
   * const publicKeyBytes = await X25519.publicKeyToBytes({ publicKey });
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
      throw new Error(`X25519: The provided key is not a valid OKP public key.`);
    }

    // Decode the provided public key to bytes.
    const publicKeyBytes = Convert.base64Url(publicKey.x).toUint8Array();

    return publicKeyBytes;
  }

  /**
   * Computes an RFC6090-compliant Elliptic Curve Diffie-Hellman (ECDH) shared secret
   * using secp256k1 private and public keys in JSON Web Key (JWK) format.
   *
   * @remarks
   * This method facilitates the ECDH key agreement protocol, which is a method of securely
   * deriving a shared secret between two parties based on their private and public keys.
   * It takes the private key of one party (privateKeyA) and the public key of another
   * party (publicKeyB) to compute a shared secret. The shared secret is derived from the
   * x-coordinate of the elliptic curve point resulting from the multiplication of the
   * public key with the private key.
   *
   * Note: When performing Elliptic Curve Diffie-Hellman (ECDH) key agreement,
   * the resulting shared secret is a point on the elliptic curve, which
   * consists of an x-coordinate and a y-coordinate. With a 256-bit curve like
   * secp256k1, each of these coordinates is 32 bytes (256 bits) long. However,
   * in the ECDH process, it's standard practice to use only the x-coordinate
   * of the shared secret point as the resulting shared key. This is because
   * the y-coordinate does not add to the entropy of the key, and both parties
   * can independently compute the x-coordinate.  Consquently, this implementation
   * omits the y-coordinate for simplicity and standard compliance.
   *
   * @example
   * ```ts
   * const privateKeyA = { ... }; // A Jwk object for party A
   * const publicKeyB = { ... }; // A PublicKeyJwk object for party B
   * const sharedSecret = await Secp256k1.sharedSecret({
   *   privateKeyA,
   *   publicKeyB
   * });
   * ```
   *
   * @param params - The parameters for the shared secret computation.
   * @param params.privateKeyA - The private key in JWK format of one party.
   * @param params.publicKeyB - The public key in JWK format of the other party.
   *
   * @returns A Promise that resolves to the computed shared secret as a Uint8Array.
   */
  public static async sharedSecret({ privateKeyA, publicKeyB }: {
    privateKeyA: Jwk;
    publicKeyB: Jwk;
  }): Promise<Uint8Array> {
    // Ensure that keys from the same key pair are not specified.
    if ('x' in privateKeyA && 'x' in publicKeyB && privateKeyA.x === publicKeyB.x) {
      throw new Error(`X25519: ECDH shared secret cannot be computed from a single key pair's public and private keys.`);
    }

    // Convert the provided private and public keys to bytes.
    const privateKeyABytes = await X25519.privateKeyToBytes({ privateKey: privateKeyA });
    const publicKeyBBytes = await X25519.publicKeyToBytes({ publicKey: publicKeyB });

    // Compute the shared secret between the public and private keys.
    const sharedSecret = x25519.getSharedSecret(privateKeyABytes, publicKeyBBytes);

    return sharedSecret;
  }
}