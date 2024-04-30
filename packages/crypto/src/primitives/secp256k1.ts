import type { AffinePoint } from '@noble/curves/abstract/weierstrass';

import { Convert } from '@web5/common';
import { sha256 } from '@noble/hashes/sha256';
import { secp256k1 } from '@noble/curves/secp256k1';
import { numberToBytesBE } from '@noble/curves/abstract/utils';

import type { Jwk } from '../jose/jwk.js';
import type { ComputePublicKeyParams, GetPublicKeyParams, SignParams, VerifyParams } from '../types/params-direct.js';

import { computeJwkThumbprint, isEcPrivateJwk, isEcPublicJwk } from '../jose/jwk.js';

/**
 * The `Secp256k1` class provides a comprehensive suite of utilities for working with
 * the secp256k1 elliptic curve, commonly used in blockchain and cryptographic applications.
 * This class includes methods for key generation, conversion, signing, verification, and
 * Elliptic Curve Diffie-Hellman (ECDH) key agreement.
 *
 * The class supports conversions between raw byte formats and JSON Web Key (JWK) formats. It
 * adheres to RFC6979 for ECDSA signing and verification and RFC6090 for ECDH.
 *
 * Key Features:
 * - Key Generation: Generate secp256k1 private keys in JWK format.
 * - Key Conversion: Transform keys between raw byte arrays and JWK formats.
 * - Public Key Derivation: Derive public keys from private keys.
 * - ECDH Shared Secret Computation: Securely derive shared secrets using private and public keys.
 * - ECDSA Signing and Verification: Sign data and verify signatures with secp256k1 keys.
 * - Key Validation: Validate the mathematical correctness of secp256k1 keys.
 *
 * The methods in this class are asynchronous, returning Promises to accommodate various
 * JavaScript environments, and use `Uint8Array` for binary data handling.
 *
 * @example
 * ```ts
 * // Key Generation
 * const privateKey = await Secp256k1.generateKey();
 *
 * // Public Key Derivation
 * const publicKey = await Secp256k1.computePublicKey({ key: privateKey });
 * console.log(publicKey === await Secp256k1.getPublicKey({ key: privateKey })); // Output: true
 *
 * // ECDH Shared Secret Computation
 * const sharedSecret = await Secp256k1.sharedSecret({
 *   privateKeyA: privateKey,
 *   publicKeyB: anotherPublicKey
 * });
 *
 * // ECDSA Signing
 * const signature = await Secp256k1.sign({
 *   key: privateKey,
 *   data: new TextEncoder().encode('Message')
 * });
 *
 * // ECDSA Signature Verification
 * const isValid = await Secp256k1.verify({
 *   key: publicKey,
 *   signature: signature,
 *   data: new TextEncoder().encode('Message')
 * });
 *
 * // Key Conversion
 * const publicKeyBytes = await Secp256k1.publicKeyToBytes({ publicKey });
 * const privateKeyBytes = await Secp256k1.privateKeyToBytes({ privateKey });
 * const compressedPublicKey = await Secp256k1.compressPublicKey({ publicKeyBytes });
 * const uncompressedPublicKey = await Secp256k1.decompressPublicKey({ publicKeyBytes });
 *
 * // Key Validation
 * const isPrivateKeyValid = await Secp256k1.validatePrivateKey({ privateKeyBytes });
 * const isPublicKeyValid = await Secp256k1.validatePublicKey({ publicKeyBytes });
 * ```
 */
export class Secp256k1 {
  /**
   * Adjusts an ECDSA signature to a normalized, low-S form.
   *
   * @remarks
   * All ECDSA signatures, regardless of the curve, consist of two components, `r` and `s`, both of
   * which are integers. The curve's order (the total number of points on the curve) is denoted by
   * `n`. In a valid ECDSA signature, both `r` and `s` must be in the range [1, n-1]. However, due
   * to the mathematical properties of ECDSA, if `(r, s)` is a valid signature, then `(r, n - s)` is
   * also a valid signature for the same message and public key. In other words, for every
   * signature, there's a "mirror" signature that's equally valid. For these elliptic curves:
   *
   * - Low S Signature: A signature where the `s` component is in the lower half of the range,
   *                    specifically less than or equal to `n/2`.
   *
   * - High S Signature: This is where the `s` component is in the upper half of the range, greater
   *                     than `n/2`.
   *
   * The practical implication is that a third-party can forge a second valid signature for the same
   * message by negating the `s` component of the original signature, without any knowledge of the
   * private key. This is known as a "signature malleability" attack.
   *
   * This type of forgery is not a problem in all systems, but it can be an issue in systems that
   * rely on digital signature uniqueness to ensure transaction integrity. For example, in Bitcoin,
   * transaction malleability is an issue because it allows for the modification of transaction
   * identifiers (and potentially, transactions themselves) after they're signed but before they're
   * confirmed in a block. By enforcing low `s` values, the Bitcoin network reduces the likelihood of
   * this occurring, making the system more secure and predictable.
   *
   * For this reason, it's common practice to normalize ECDSA signatures to a low-S form. This
   * form is considered standard and preferable in some systems and is known as the "normalized"
   * form of the signature.
   *
   * This method takes a signature, and if it's high-S, returns the normalized low-S form. If the
   * signature is already low-S, it's returned unmodified. It's important to note that this
   * method does not change the validity of the signature but makes it compliant with systems that
   * enforce low-S signatures.
   *
   * @example
   * ```ts
   * const signature = new Uint8Array([...]); // Your ECDSA signature
   * const adjustedSignature = await Secp256k1.adjustSignatureToLowS({ signature });
   * // Now 'adjustedSignature' is in the low-S form.
   * ```
   *
   * @param params - The parameters for the signature adjustment.
   * @param params.signature - The ECDSA signature as a `Uint8Array`.
   *
   * @returns A Promise that resolves to the adjusted signature in low-S form as a `Uint8Array`.
   */
  public static async adjustSignatureToLowS({ signature }: {
    signature: Uint8Array;
  }): Promise<Uint8Array> {
    // Convert the signature to a `secp256k1.Signature` object.
    const signatureObject = secp256k1.Signature.fromCompact(signature);

    if (signatureObject.hasHighS()) {
      // Adjust the signature to low-S format if it's high-S.
      const adjustedSignatureObject = signatureObject.normalizeS();

      // Convert the adjusted signature object back to a byte array.
      const adjustedSignature = adjustedSignatureObject.toCompactRawBytes();

      return adjustedSignature;

    } else {
      // Return the unmodified signature if it is already in low-S format.
      return signature;
    }
  }

  /**
   * Converts a raw private key in bytes to its corresponding JSON Web Key (JWK) format.
   *
   * @remarks
   * This method takes a private key represented as a byte array (Uint8Array) and
   * converts it into a JWK object. The conversion involves extracting the
   * elliptic curve point (x and y coordinates) from the private key and encoding
   * them into base64url format, alongside other JWK parameters.
   *
   * The resulting JWK object includes the following properties:
   * - `kty`: Key Type, set to 'EC' for Elliptic Curve.
   * - `crv`: Curve Name, set to 'secp256k1'.
   * - `d`: The private key component, base64url-encoded.
   * - `x`: The x-coordinate of the public key point, base64url-encoded.
   * - `y`: The y-coordinate of the public key point, base64url-encoded.
   *
   * This method is useful for converting raw public keys into a standardized
   * JSON format, facilitating their use in cryptographic operations and making
   * them easy to share and store.
   *
   * @example
   * ```ts
   * const privateKeyBytes = new Uint8Array([...]); // Replace with actual private key bytes
   * const privateKey = await Secp256k1.bytesToPrivateKey({ privateKeyBytes });
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
    // Get the elliptic curve point (x and y coordinates) for the provided private key.
    const point = await Secp256k1.getCurvePoint({ keyBytes: privateKeyBytes });

    // Construct the private key in JWK format.
    const privateKey: Jwk = {
      kty : 'EC',
      crv : 'secp256k1',
      d   : Convert.uint8Array(privateKeyBytes).toBase64Url(),
      x   : Convert.uint8Array(point.x).toBase64Url(),
      y   : Convert.uint8Array(point.y).toBase64Url()
    };

    // Compute the JWK thumbprint and set as the key ID.
    privateKey.kid = await computeJwkThumbprint({ jwk: privateKey });

    return privateKey;
  }

  /**
   * Converts a raw public key in bytes to its corresponding JSON Web Key (JWK) format.
   *
   * @remarks
   * This method accepts a public key in a byte array (Uint8Array) format and
   * transforms it to a JWK object. It involves decoding the elliptic curve point
   * (x and y coordinates) from the raw public key bytes and encoding them into
   * base64url format, along with setting appropriate JWK parameters.
   *
   * The resulting JWK object includes the following properties:
   * - `kty`: Key Type, set to 'EC' for Elliptic Curve.
   * - `crv`: Curve Name, set to 'secp256k1'.
   * - `x`: The x-coordinate of the public key point, base64url-encoded.
   * - `y`: The y-coordinate of the public key point, base64url-encoded.
   *
   * This method is useful for converting raw public keys into a standardized
   * JSON format, facilitating their use in cryptographic operations and making
   * them easy to share and store.
   *
   * @example
   * ```ts
   * const publicKeyBytes = new Uint8Array([...]); // Replace with actual public key bytes
   * const publicKey = await Secp256k1.bytesToPublicKey({ publicKeyBytes });
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
    // Get the elliptic curve point (x and y coordinates) for the provided public key.
    const point = await Secp256k1.getCurvePoint({ keyBytes: publicKeyBytes });

    // Construct the public key in JWK format.
    const publicKey: Jwk = {
      kty : 'EC',
      crv : 'secp256k1',
      x   : Convert.uint8Array(point.x).toBase64Url(),
      y   : Convert.uint8Array(point.y).toBase64Url()
    };

    // Compute the JWK thumbprint and set as the key ID.
    publicKey.kid = await computeJwkThumbprint({ jwk: publicKey });

    return publicKey;
  }

  /**
   * Converts a public key to its compressed form.
   *
   * @remarks
   * This method takes a public key represented as a byte array and compresses it. Public key
   * compression is a process that reduces the size of the public key by removing the y-coordinate,
   * making it more efficient for storage and transmission. The compressed key retains the same
   * level of security as the uncompressed key.
   *
   * @example
   * ```ts
   * const uncompressedPublicKeyBytes = new Uint8Array([...]); // Replace with actual uncompressed public key bytes
   * const compressedPublicKey = await Secp256k1.compressPublicKey({
   *   publicKeyBytes: uncompressedPublicKeyBytes
   * });
   * ```
   *
   * @param params - The parameters for the public key compression.
   * @param params.publicKeyBytes - The public key as a Uint8Array.
   *
   * @returns A Promise that resolves to the compressed public key as a Uint8Array.
   */
  public static async compressPublicKey({ publicKeyBytes }: {
    publicKeyBytes: Uint8Array;
  }): Promise<Uint8Array> {
    // Decode Weierstrass points from the public key byte array.
    const point = secp256k1.ProjectivePoint.fromHex(publicKeyBytes);

    // Return the compressed form of the public key.
    return point.toRawBytes(true);
  }

  /**
   * Derives the public key in JWK format from a given private key.
   *
   * @remarks
   * This method takes a private key in JWK format and derives its corresponding public key,
   * also in JWK format. The derivation process involves converting the private key to a raw
   * byte array, then computing the elliptic curve point (x and y coordinates) from this private
   * key. These coordinates are then encoded into base64url format to construct the public key in
   * JWK format.
   *
   * The process ensures that the derived public key correctly corresponds to the given private key,
   * adhering to the secp256k1 elliptic curve standards. This method is useful in cryptographic
   * operations where a public key is needed for operations like signature verification, but only
   * the private key is available.
   *
   * @example
   * ```ts
   * const privateKey = { ... }; // A Jwk object representing a secp256k1 private key
   * const publicKey = await Secp256k1.computePublicKey({ key: privateKey });
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
    const privateKeyBytes  = await Secp256k1.privateKeyToBytes({ privateKey: key });

    // Get the elliptic curve point (x and y coordinates) for the provided private key.
    const point = await Secp256k1.getCurvePoint({ keyBytes: privateKeyBytes });

    // Construct the public key in JWK format.
    const publicKey: Jwk = {
      kty : 'EC',
      crv : 'secp256k1',
      x   : Convert.uint8Array(point.x).toBase64Url(),
      y   : Convert.uint8Array(point.y).toBase64Url()
    };

    // Compute the JWK thumbprint and set as the key ID.
    publicKey.kid = await computeJwkThumbprint({ jwk: publicKey });

    return publicKey;
  }

  /**
   * Converts an ASN.1 DER encoded ECDSA signature to a compact R+S format.
   *
   * @remarks
   * This method is used for converting an ECDSA signature from the ASN.1 DER encoding to the more
   * compact R+S format. This conversion is often required when dealing with ECDSA signatures in
   * certain cryptographic standards such as JWS (JSON Web Signature).
   *
   * The method decodes the DER-encoded signature, extracts the R and S values, and concatenates
   * them into a single byte array. This process involves handling the ASN.1 structure to correctly
   * parse the R and S values, considering padding and integer encoding specifics of DER.
   *
   * @example
   * ```ts
   * const derSignature = new Uint8Array([...]); // Replace with your DER-encoded signature
   * const signature = await Secp256k1.convertDerToCompactSignature({ derSignature });
   * ```
   *
   * @param params - The parameters for the signature conversion.
   * @param params.derSignature - The signature in ASN.1 DER format as a `Uint8Array`.
   *
   * @returns A Promise that resolves to the signature in compact R+S format as a `Uint8Array`.
   */
  public static async convertDerToCompactSignature({ derSignature }: {
    derSignature: Uint8Array;
  }): Promise<Uint8Array> {
    // Convert the DER-encoded signature into a `secp256k1.Signature` object.
    // This involves parsing the ASN.1 DER structure to extract the R and S components.
    const signatureObject = secp256k1.Signature.fromDER(derSignature);

    // Convert the signature object into compact R+S format, which concatenates the R and S values
    // into a single byte array.
    const compactSignature = signatureObject.toCompactRawBytes();

    return  compactSignature;
  }

  /**
   * Converts a public key to its uncompressed form.
   *
   * @remarks
   * This method takes a compressed public key represented as a byte array and decompresses it.
   * Public key decompression involves reconstructing the y-coordinate from the x-coordinate,
   * resulting in the full public key. This method is used when the uncompressed key format is
   * required for certain cryptographic operations or interoperability.
   *
   * @example
   * ```ts
   * const compressedPublicKeyBytes = new Uint8Array([...]); // Replace with actual compressed public key bytes
   * const decompressedPublicKey = await Secp256k1.decompressPublicKey({
   *   publicKeyBytes: compressedPublicKeyBytes
   * });
   * ```
   *
   * @param params - The parameters for the public key decompression.
   * @param params.publicKeyBytes - The public key as a Uint8Array.
   *
   * @returns A Promise that resolves to the uncompressed public key as a Uint8Array.
   */
  public static async decompressPublicKey({ publicKeyBytes }: {
    publicKeyBytes: Uint8Array;
  }): Promise<Uint8Array> {
    // Decode Weierstrass points from the public key byte array.
    const point = secp256k1.ProjectivePoint.fromHex(publicKeyBytes);

    // Return the uncompressed form of the public key.
    return point.toRawBytes(false);
  }

  /**
   * Generates a secp256k1 private key in JSON Web Key (JWK) format.
   *
   * @remarks
   * This method creates a new private key suitable for use with the secp256k1
   * elliptic curve. The key is generated using cryptographically secure random
   * number generation to ensure its uniqueness and security. The resulting
   * private key adheres to the JWK format, specifically tailored for secp256k1,
   * making it compatible with common cryptographic standards and easy to use in
   * various cryptographic processes.
   *
   * The private key generated by this method includes the following components:
   * - `kty`: Key Type, set to 'EC' for Elliptic Curve.
   * - `crv`: Curve Name, set to 'secp256k1'.
   * - `d`: The private key component, base64url-encoded.
   * - `x`: The x-coordinate of the public key point, derived from the private key, base64url-encoded.
   * - `y`: The y-coordinate of the public key point, derived from the private key, base64url-encoded.
   *
   * The key is returned in a format suitable for direct use in signin and key agreement operations.
   *
   * @example
   * ```ts
   * const privateKey = await Secp256k1.generateKey();
   * ```
   *
   * @returns A Promise that resolves to the generated private key in JWK format.
   */
  public static async generateKey(): Promise<Jwk> {
    // Generate a random private key.
    const privateKeyBytes = secp256k1.utils.randomPrivateKey();

    // Convert private key from bytes to JWK format.
    const privateKey = await Secp256k1.bytesToPrivateKey({ privateKeyBytes });

    // Compute the JWK thumbprint and set as the key ID.
    privateKey.kid = await computeJwkThumbprint({ jwk: privateKey });

    return privateKey;
  }

  /**
   * Retrieves the public key properties from a given private key in JWK format.
   *
   * @remarks
   * This method extracts the public key portion from a secp256k1 private key in JWK format. It does
   * so by removing the private key property 'd' and making a shallow copy, effectively yielding the
   * public key. The method sets the 'kid' (key ID) property using the JWK thumbprint if it is not
   * already defined. This approach is used under the assumption that a private key in JWK format
   * always contains the corresponding public key properties.
   *
   * Note: This method offers a significant performance advantage, being about 200 times faster
   * than `computePublicKey()`. However, it does not mathematically validate the private key, nor
   * does it derive the public key from the private key. It simply extracts existing public key
   * properties from the private key object. This makes it suitable for scenarios where speed is
   * critical and the private key's integrity is already assured.
   *
   * @example
   * ```ts
   * const privateKey = { ... }; // A Jwk object representing a secp256k1 private key
   * const publicKey = await Secp256k1.getPublicKey({ key: privateKey });
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
    // Verify the provided JWK represents an elliptic curve (EC) secp256k1 private key.
    if (!(isEcPrivateJwk(key) && key.crv === 'secp256k1')) {
      throw new Error(`Secp256k1: The provided key is not a secp256k1 private JWK.`);
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
   * This method takes a private key in JWK format and extracts its raw byte representation.
   * It specifically focuses on the 'd' parameter of the JWK, which represents the private
   * key component in base64url encoding. The method decodes this value into a byte array.
   *
   * This conversion is essential for operations that require the private key in its raw
   * binary form, such as certain low-level cryptographic operations or when interfacing
   * with systems and libraries that expect keys in a byte array format.
   *
   * @example
   * ```ts
   * const privateKey = { ... }; // An X25519 private key in JWK format
   * const privateKeyBytes = await Secp256k1.privateKeyToBytes({ privateKey });
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
    // Verify the provided JWK represents a valid EC secp256k1 private key.
    if (!isEcPrivateJwk(privateKey)) {
      throw new Error(`Secp256k1: The provided key is not a valid EC private key.`);
    }

    // Decode the provided private key to bytes.
    const privateKeyBytes = Convert.base64Url(privateKey.d).toUint8Array();

    return privateKeyBytes;
  }

  /**
   * Converts a public key from JSON Web Key (JWK) format to a raw byte array (Uint8Array).
   *
   * @remarks
   * This method accepts a public key in JWK format and converts it into its raw binary
   * form. The conversion process involves decoding the 'x' and 'y' parameters of the JWK
   * (which represent the x and y coordinates of the elliptic curve point, respectively)
   * from base64url format into a byte array. The method then concatenates these values,
   * along with a prefix indicating the key format, to form the full public key.
   *
   * This function is particularly useful for use cases where the public key is needed
   * in its raw byte format, such as for certain cryptographic operations or when
   * interfacing with systems that require raw key formats.
   *
   * @example
   * ```ts
   * const publicKey = { ... }; // A Jwk public key object
   * const publicKeyBytes = await Secp256k1.publicKeyToBytes({ publicKey });
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
    // Verify the provided JWK represents a valid EC secp256k1 public key, which must have a 'y' value.
    if (!(isEcPublicJwk(publicKey) && publicKey.y)) {
      throw new Error(`Secp256k1: The provided key is not a valid EC public key.`);
    }

    // Decode the provided public key to bytes.
    const prefix = new Uint8Array([0x04]); // Designates an uncompressed key.
    const x = Convert.base64Url(publicKey.x).toUint8Array();
    const y = Convert.base64Url(publicKey.y).toUint8Array();

    // Concatenate the prefix, x-coordinate, and y-coordinate as a single byte array.
    const publicKeyBytes = new Uint8Array([...prefix, ...x, ...y]);

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
   * const privateKeyA = { ... }; // A Jwk private key object for party A
   * const publicKeyB = { ... }; // A Jwk public key object for party B
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
      throw new Error(`Secp256k1: ECDH shared secret cannot be computed from a single key pair's public and private keys.`);
    }

    // Convert the provided private and public keys to bytes.
    const privateKeyABytes = await Secp256k1.privateKeyToBytes({ privateKey: privateKeyA });
    const publicKeyBBytes = await Secp256k1.publicKeyToBytes({ publicKey: publicKeyB });

    // Compute the compact representation shared secret between the public and private keys.
    const sharedSecret = secp256k1.getSharedSecret(privateKeyABytes, publicKeyBBytes, true);

    // Remove the leading byte that indicates the sign of the y-coordinate
    // of the point on the elliptic curve.  See note above.
    return sharedSecret.slice(1);
  }

  /**
   * Generates an RFC6979-compliant ECDSA signature of given data using a secp256k1 private key.
   *
   * @remarks
   * This method signs the provided data with a specified private key using the ECDSA
   * (Elliptic Curve Digital Signature Algorithm) signature algorithm, as defined in RFC6979.
   * The data to be signed is first hashed using the SHA-256 algorithm, and this hash is then
   * signed using the private key. The output is a digital signature in the form of a
   * Uint8Array, which uniquely corresponds to both the data and the private key used for signing.
   *
   * This method is commonly used in cryptographic applications to ensure data integrity and
   * authenticity. The signature can later be verified by parties with access to the corresponding
   * public key, ensuring that the data has not been tampered with and was indeed signed by the
   * holder of the private key.
   *
   * @example
   * ```ts
   * const data = new TextEncoder().encode('Messsage'); // Data to be signed
   * const privateKey = { ... }; // A Jwk object representing a secp256k1 private key
   * const signature = await Secp256k1.sign({
   *   key: privateKey,
   *   data
   * });
   * ```
   *
   * @param params - The parameters for the signing operation.
   * @param params.key - The private key to use for signing, represented in JWK format.
   * @param params.data - The data to sign, represented as a Uint8Array.
   *
   * @returns A Promise that resolves to the signature as a Uint8Array.
   */
  public static async sign({ data, key }:
    SignParams
  ): Promise<Uint8Array> {
    // Convert the private key from JWK format to bytes.
    const privateKeyBytes = await Secp256k1.privateKeyToBytes({ privateKey: key });

    // Generate a digest of the data using the SHA-256 hash function.
    const digest = sha256(data);

    // Sign the provided data using the ECDSA algorithm.
    // The `secp256k1.sign` operation returns a signature object with { r, s, recovery } properties.
    const signatureObject = secp256k1.sign(digest, privateKeyBytes);

    // Convert the signature object to Uint8Array.
    const signature = signatureObject.toCompactRawBytes();

    return signature;
  }

  /**
   * Validates a given private key to ensure its compliance with the secp256k1 curve standards.
   *
   * @remarks
   * This method checks whether a provided private key is a valid 32-byte number and falls within
   * the range defined by the secp256k1 curve's order. It is essential for ensuring the private
   * key's mathematical correctness in the context of secp256k1-based cryptographic operations.
   *
   * Note that this validation strictly pertains to the key's format and numerical validity; it does
   * not assess whether the key corresponds to a known entity or its security status (e.g., whether
   * it has been compromised).
   *
   * @example
   * ```ts
   * const privateKeyBytes = new Uint8Array([...]); // A 32-byte private key
   * const isValid = await Secp256k1.validatePrivateKey({ privateKeyBytes });
   * console.log(isValid); // true or false based on the key's validity
   * ```
   *
   * @param params - The parameters for the key validation.
   * @param params.privateKeyBytes - The private key to validate, represented as a Uint8Array.
   *
   * @returns A Promise that resolves to a boolean indicating whether the private key is valid.
   */
  public static async validatePrivateKey({ privateKeyBytes }: {
    privateKeyBytes: Uint8Array;
  }): Promise<boolean> {
    return secp256k1.utils.isValidPrivateKey(privateKeyBytes);
  }

  /**
   * Validates a given public key to confirm its mathematical correctness on the secp256k1 curve.
   *
   * @remarks
   * This method checks if the provided public key represents a valid point on the secp256k1 curve.
   * It decodes the key's Weierstrass points (x and y coordinates) and verifies their validity
   * against the curve's parameters. A valid point must lie on the curve and meet specific
   * mathematical criteria defined by the curve's equation.
   *
   * It's important to note that this method does not verify the key's ownership or whether it has
   * been compromised; it solely focuses on the key's adherence to the curve's mathematical
   * principles.
   *
   * @example
   * ```ts
   * const publicKeyBytes = new Uint8Array([...]); // A public key in byte format
   * const isValid = await Secp256k1.validatePublicKey({ publicKeyBytes });
   * console.log(isValid); // true if the key is valid on the secp256k1 curve, false otherwise
   * ```
   *
   * @param params - The parameters for the key validation.
   * @param params.publicKeyBytes - The public key to validate, represented as a Uint8Array.
   *
   * @returns A Promise that resolves to a boolean indicating the public key's validity on
   *          the secp256k1 curve.
   */
  public static async validatePublicKey({ publicKeyBytes }: {
    publicKeyBytes: Uint8Array;
  }): Promise<boolean> {
    try {
      // Decode Weierstrass points from key bytes.
      const point = secp256k1.ProjectivePoint.fromHex(publicKeyBytes);

      // Check if points are on the Short Weierstrass curve.
      point.assertValidity();

    } catch(error: any) {
      return false;
    }

    return true;
  }

  /**
   * Verifies an RFC6979-compliant ECDSA signature against given data and a secp256k1 public key.
   *
   * @remarks
   * This method validates a digital signature to ensure that it was generated by the holder of the
   * corresponding private key and that the signed data has not been altered. The signature
   * verification is performed using the ECDSA (Elliptic Curve Digital Signature Algorithm) as
   * specified in RFC6979. The data to be verified is first hashed using the SHA-256 algorithm, and
   * this hash is then used along with the public key to verify the signature.
   *
   * The method returns a boolean value indicating whether the signature is valid. A valid signature
   * proves that the signed data was indeed signed by the owner of the private key corresponding to
   * the provided public key and that the data has not been tampered with since it was signed.
   *
   * Note: The verification process does not consider the malleability of low-s signatures, which
   * may be relevant in certain contexts, such as Bitcoin transactions.
   *
   * @example
   * ```ts
   * const data = new TextEncoder().encode('Messsage'); // Data that was signed
   * const publicKey = { ... }; // Public key in JWK format corresponding to the private key that signed the data
   * const signature = new Uint8Array([...]); // Signature to verify
   * const isSignatureValid = await Secp256k1.verify({
   *   key: publicKey,
   *   signature,
   *   data
   * });
   * console.log(isSignatureValid); // true if the signature is valid, false otherwise
   * ```
   *
   * @param params - The parameters for the signature verification.
   * @param params.key - The public key used for verification, represented in JWK format.
   * @param params.signature - The signature to verify, represented as a Uint8Array.
   * @param params.data - The data that was signed, represented as a Uint8Array.
   *
   * @returns A Promise that resolves to a boolean indicating whether the signature is valid.
   */
  public static async verify({ key, signature, data }:
    VerifyParams
  ): Promise<boolean> {
    // Convert the public key from JWK format to bytes.
    const publicKeyBytes = await Secp256k1.publicKeyToBytes({ publicKey: key });

    // Generate a digest of the data using the SHA-256 hash function.
    const digest = sha256(data);

    /** Perform the verification of the signature.
     * This verify operation has the malleability check disabled. Guaranteed support
     * for low-s signatures across languages is unlikely especially in the context
     * of SSI. Notable Cloud KMS providers do not natively support it either. It is
     * also worth noting that low-s signatures are a requirement for Bitcoin. */
    const isValid = secp256k1.verify(signature, digest, publicKeyBytes, { lowS: false });

    return isValid;
  }

  /**
   * Returns the elliptic curve point (x and y coordinates) for a given secp256k1 key.
   *
   * @remarks
   * This method extracts the elliptic curve point from a given secp256k1 key, whether
   * it's a private or a public key. For a private key, the method first computes the
   * corresponding public key and then extracts the x and y coordinates. For a public key,
   * it directly returns these coordinates. The coordinates are represented as Uint8Array.
   *
   * The x and y coordinates represent the key's position on the elliptic curve and can be
   * used in various cryptographic operations, such as digital signatures or key agreement
   * protocols.
   *
   * @example
   * ```ts
   * // For a private key
   * const privateKey = new Uint8Array([...]); // A 32-byte private key
   * const { x: xFromPrivateKey, y: yFromPrivateKey } = await Secp256k1.getCurvePoint({ keyBytes: privateKey });
   *
   * // For a public key
   * const publicKey = new Uint8Array([...]); // A 33-byte or 65-byte public key
   * const { x: xFromPublicKey, y: yFromPublicKey } = await Secp256k1.getCurvePoint({ keyBytes: publicKey });
   * ```
   *
   * @param params - The parameters for the curve point decoding operation.
   * @param params.keyBytes - The key for which to get the elliptic curve point.
   *                          Can be either a private key or a public key.
   *                          The key should be passed as a `Uint8Array`.
   *
   * @returns A Promise that resolves to an object with properties 'x' and 'y',
   *          each being a Uint8Array representing the x and y coordinates of the key point on the
   *          elliptic curve.
   */
  private static async getCurvePoint({ keyBytes }: {
    keyBytes: Uint8Array;
  }): Promise<AffinePoint<Uint8Array>> {
    // If key is a private key, first compute the public key.
    if (keyBytes.byteLength === 32) {
      keyBytes = secp256k1.getPublicKey(keyBytes);
    }

    // Decode Weierstrass affine point from key bytes.
    const point = secp256k1.ProjectivePoint.fromHex(keyBytes);

    // Get x- and y-coordinate values and convert to Uint8Array.
    const x = numberToBytesBE(point.x, 32);
    const y = numberToBytesBE(point.y, 32);

    return { x, y };
  }
}