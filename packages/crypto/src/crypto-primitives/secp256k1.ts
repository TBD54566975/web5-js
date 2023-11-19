import { sha256 } from '@noble/hashes/sha256';
import { secp256k1 } from '@noble/curves/secp256k1';
import { numberToBytesBE } from '@noble/curves/abstract/utils';

/**
 * The `Secp256k1` class provides an interface for generating secp256k1 private keys,
 * computing public keys from private keys, generating shared secrets, and
 * signing and verifying messages.
 *
 * The class uses the '@noble/secp256k1' package for the cryptographic operations,
 * and the '@noble/hashes/sha256' package for generating the hash digests needed
 * for the signing and verification operations.
 *
 * The methods of this class are all asynchronous and return Promises. They all use
 * the Uint8Array type for keys, signatures, and data, providing a consistent
 * interface for working with binary data.
 *
 * Example usage:
 *
 * ```ts
 * const privateKey = await Secp256k1.generateKey();
 * const message = new TextEncoder().encode('Hello, world!');
 * const signature = await Secp256k1.sign({
 *   algorithm: { hash: 'SHA-256' },
 *   key: privateKey,
 *   data: message
 * });
 * const publicKey = await Secp256k1.getPublicKey({ privateKey });
 * const isValid = await Secp256k1.verify({
 *   algorithm: { hash: 'SHA-256' },
 *   key: publicKey,
 *   signature,
 *   data: message
 * });
 * console.log(isValid); // true
 * ```
 */
export class Secp256k1 {
  /**
   * Converts a public key between its compressed and uncompressed forms.
   *
   * Given a public key, this method can either compress or decompress it
   * depending on the provided `compressedPublicKey` option. The conversion
   * process involves decoding the Weierstrass points from the key bytes
   * and then returning the key in the desired format.
   *
   * This is useful in scenarios where space is a consideration or when
   * interfacing with systems that expect a specific public key format.
   *
   * @param options - The options for the public key conversion.
   * @param options.publicKey - The original public key, represented as a Uint8Array.
   * @param options.compressedPublicKey - A boolean indicating whether the output
   *                                      should be in compressed form. If true, the
   *                                      method returns the compressed form of the
   *                                      provided public key. If false, it returns
   *                                      the uncompressed form.
   *
   * @returns A Promise that resolves to the converted public key as a Uint8Array.
   */
  public static async convertPublicKey(options: {
    publicKey: Uint8Array,
    compressedPublicKey: boolean
  }): Promise<Uint8Array> {
    let { publicKey, compressedPublicKey } = options;

    // Decode Weierstrass points from key bytes.
    const point = secp256k1.ProjectivePoint.fromHex(publicKey);

    // Return either the compressed or uncompressed form of hte public key.
    return point.toRawBytes(compressedPublicKey);
  }

  /**
   * Generates a secp256k1 private key.
   *
   * @returns A Promise that resolves to an object containing the private key as a Uint8Array.
   */
  public static async generateKey(): Promise<Uint8Array> {
    // Generate a random private key.
    const privateKey = secp256k1.utils.randomPrivateKey();

    return privateKey;
  }

  /**
   * Returns the elliptic curve points (x and y coordinates) for a given secp256k1 key.
   *
   * In the case of a private key, the public key is first computed from the private key,
   * then the x and y coordinates of the public key point on the elliptic curve are returned.
   *
   * In the case of a public key, the x and y coordinates of the key point on the elliptic
   * curve are returned directly.
   *
   * The returned coordinates can be used to perform various operations on the elliptic curve,
   * such as addition and multiplication of points, which can be used in various cryptographic
   * schemes and protocols.
   *
   * @param options - The options for the operation.
   * @param options.key - The key for which to get the elliptic curve points.
   *                      Can be either a private key or a public key.
   *                      The key should be passed as a Uint8Array.
   * @returns A Promise that resolves to an object with properties 'x' and 'y',
   *          each being a Uint8Array representing the x and y coordinates of the key point on the elliptic curve.
   */
  public static async getCurvePoints(options: {
    key: Uint8Array
  }): Promise<{ x: Uint8Array, y: Uint8Array }> {
    let { key } = options;

    // If key is a private key, first compute the public key.
    if (key.byteLength === 32) {
      key = await Secp256k1.getPublicKey({ privateKey: key });
    }

    // Decode Weierstrass points from key bytes.
    const point = secp256k1.ProjectivePoint.fromHex(key);

    // Get x- and y-coordinate values and convert to Uint8Array.
    const x = numberToBytesBE(point.x, 32);
    const y = numberToBytesBE(point.y, 32);

    return { x, y };
  }

  /**
   * Computes the public key from a given private key.
   * If compressedPublicKey=true then the output is a 33-byte public key.
   * If compressedPublicKey=false then the output is a 65-byte public key.
   *
   * @param options - The options for the public key computation.
   * @param options.privateKey - The 32-byte private key from which to compute the public key.
   * @param options.compressedPublicKey - If true, returns a compressed public key. Defaults to true.
   * @returns A Promise that resolves to the computed public key as a Uint8Array.
   */
  public static async getPublicKey(options: {
    privateKey: Uint8Array,
    compressedPublicKey?: boolean
  }): Promise<Uint8Array> {
    let { privateKey, compressedPublicKey } = options;

    compressedPublicKey ??= true; // Default to compressed public key, matching the default of @noble/secp256k1.

    // Compute public key.
    const publicKey  = secp256k1.getPublicKey(privateKey, compressedPublicKey);

    return publicKey;
  }

  /**
   * Generates a RFC6090 ECDH shared secret given the private key of one party
   * and the public key another party.
   *
   * Note: When performing Elliptic Curve Diffie-Hellman (ECDH) key agreement,
   * the resulting shared secret is a point on the elliptic curve, which
   * consists of an x-coordinate and a y-coordinate. With a 256-bit curve like
   * secp256k1, each of these coordinates is 32 bytes (256 bits) long. However,
   * in the ECDH process, it's standard practice to use only the x-coordinate
   * of the shared secret point as the resulting shared key. This is because
   * the y-coordinate does not add to the entropy of the key, and both parties
   * can independently compute the x-coordinate, so using just the x-coordinate
   * simplifies matters.
   *
   * @param options - The options for the shared secret computation operation.
   * @param options.privateKey - The private key of one party.
   * @param options.publicKey - The public key of the other party.
   * @returns A Promise that resolves to the computed shared secret as a Uint8Array.
   */
  public static async sharedSecret(options: {
    privateKey: Uint8Array,
    publicKey: Uint8Array
  }): Promise<Uint8Array> {
    let { privateKey, publicKey } = options;

    // Compute the shared secret between the public and private keys.
    const sharedSecret = secp256k1.getSharedSecret(privateKey, publicKey);

    // Remove the leading byte that indicates the sign of the y-coordinate
    // of the point on the elliptic curve.  See note above.
    return sharedSecret.slice(1);
  }

  /**
   * Generates a RFC6979 ECDSA signature of given data with a given private key and hash algorithm.
   *
   * @param options - The options for the signing operation.
   * @param options.data - The data to sign.
   * @param options.key - The private key to use for signing.
   * @returns A Promise that resolves to the signature as a Uint8Array.
   */
  public static async sign(options: {
    data: Uint8Array,
    key: Uint8Array
  }): Promise<Uint8Array> {
    const { data, key } = options;

    // Generate a digest of the data using the SHA-256 hash function.
    const digest = sha256(data);

    // Signature operation returns a Signature instance with { r, s, recovery } properties.
    const signatureObject = secp256k1.sign(digest, key);

    // Convert Signature object to Uint8Array.
    const signature = signatureObject.toCompactRawBytes();

    return signature;
  }

  /**
   * Validates a given private key to ensure that it's a valid 32-byte number
   * that is less than the secp256k1 curve's order.
   *
   * This method checks the byte length of the key and its numerical validity
   * according to the secp256k1 curve's parameters. It doesn't verify whether
   * the key corresponds to a known or authorized entity or whether it has
   * been compromised.
   *
   * @param options - The options for the key validation.
   * @param options.key - The private key to validate, represented as a Uint8Array.
   * @returns A Promise that resolves to a boolean indicating whether the private
   *          key is a valid 32-byte number less than the secp256k1 curve's order.
   */
  public static async validatePrivateKey(options: {
    key: Uint8Array
  }): Promise<boolean> {
    const { key } = options;

    return secp256k1.utils.isValidPrivateKey(key);
  }

  /**
   * Validates a given public key to ensure that it corresponds to a
   * valid point on the secp256k1 elliptic curve.
   *
   * This method decodes the Weierstrass points from the key bytes and
   * asserts their validity on the curve. If the points are not valid,
   * the method returns false. If the points are valid, the method
   * returns true.
   *
   * Note: This method does not check whether the key corresponds to a
   * known or authorized entity, or whether it has been compromised.
   * It only checks the mathematical validity of the key.
   *
   * @param options - The options for the key validation.
   * @param options.key - The key to validate, represented as a Uint8Array.
   * @returns A Promise that resolves to a boolean indicating whether the key
   *          corresponds to a valid point on the secp256k1 elliptic curve.
   */
  public static async validatePublicKey(options: {
    key: Uint8Array
  }): Promise<boolean> {
    const { key } = options;

    try {
      // Decode Weierstrass points from key bytes.
      const point = secp256k1.ProjectivePoint.fromHex(key);

      // Check if points are on the Short Weierstrass curve.
      point.assertValidity();

    } catch(error: any) {
      return false;
    }

    return true;
  }

  /**
   * Verifies a RFC6979 ECDSA signature of given data with a given public key and hash algorithm.
   *
   * @param options - The options for the verification operation.
   * @param options.data - The data that was signed.
   * @param options.hash - The hash algorithm to use to generate a digest of the data.
   * @param options.key - The public key to use for verification.
   * @param options.signature - The signature to verify.
   * @returns A Promise that resolves to a boolean indicating whether the signature is valid.
   */
  public static async verify(options: {
    data: Uint8Array,
    key: Uint8Array,
    signature: Uint8Array
  }): Promise<boolean> {
    const { data, key, signature } = options;

    // Generate a digest of the data using the SHA-256 hash function.
    const digest = sha256(data);

    /** Verify operation with malleability check disabled. Guaranteed support for
     * low-s signatures across languages is unlikely especially in the context of
     * SSI. Notable Cloud KMS providers do not natively support it either. It is
     * also worth noting that low-s signatures are a requirement for Bitcoin. */
    const isValid = secp256k1.verify(signature, digest, key, { lowS: false });

    return isValid;
  }
}