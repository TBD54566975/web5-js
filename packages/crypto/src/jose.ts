import { Multicodec, MulticodecCode, MulticodecDefinition } from '@web5/common';

import type { Jwk } from './jose/jwk.js';

import { keyToMultibaseId } from './utils.js';
import { X25519 } from './primitives/x25519.js';
import { Ed25519 } from './primitives/ed25519.js';
import { Secp256k1 } from './primitives/secp256k1.js';

/**
 * A mapping from multicodec names to their corresponding JOSE (JSON Object Signing and Encryption)
 * representations. This mapping facilitates the conversion of multicodec key formats to
 * JWK (JSON Web Key) formats.
 *
 * @example
 * ```ts
 * const joseKey = multicodecToJoseMapping['ed25519-pub'];
 * // Returns a partial JWK for an Ed25519 public key
 * ```
 *
 * @remarks
 * The keys of this object are multicodec names, such as 'ed25519-pub', 'ed25519-priv', etc.
 * The values are objects representing the corresponding JWK properties for that key type.
 */
const multicodecToJoseMapping: { [key: string]: Jwk } = {
  'ed25519-pub'    : { crv: 'Ed25519',   kty: 'OKP', x: '' },
  'ed25519-priv'   : { crv: 'Ed25519',   kty: 'OKP', x: '',        d: '' },
  'secp256k1-pub'  : { crv: 'secp256k1', kty: 'EC',  x: '', y: ''},
  'secp256k1-priv' : { crv: 'secp256k1', kty: 'EC',  x: '', y: '', d: '' },
  'x25519-pub'     : { crv: 'X25519',    kty: 'OKP', x: '' },
  'x25519-priv'    : { crv: 'X25519',    kty: 'OKP', x: '',        d: '' },
};

/**
 * A mapping from JOSE property descriptors to multicodec names.
 * This mapping is used to convert keys in JWK (JSON Web Key) format to multicodec format.
 *
 * @example
 * ```ts
 * const multicodecName = joseToMulticodecMapping['Ed25519:public'];
 * // Returns 'ed25519-pub', the multicodec name for an Ed25519 public key
 * ```
 *
 * @remarks
 * The keys of this object are strings that describe the JOSE key type and usage,
 * such as 'Ed25519:public', 'Ed25519:private', etc.
 * The values are the corresponding multicodec names used to represent these key types.
 */
const joseToMulticodecMapping: { [key: string]: string } = {
  'Ed25519:public'    : 'ed25519-pub',
  'Ed25519:private'   : 'ed25519-priv',
  'secp256k1:public'  : 'secp256k1-pub',
  'secp256k1:private' : 'secp256k1-priv',
  'X25519:public'     : 'x25519-pub',
  'X25519:private'    : 'x25519-priv',
};

/**
 * The `Jose` class provides utility functions for converting between JOSE (JSON Object Signing and
 * Encryption) formats and multicodec representations.
 */
export class Jose {
  /**
   * Converts a JWK (JSON Web Key) to a Multicodec code and name.
   *
   * @example
   * ```ts
   * const jwk: Jwk = { crv: 'Ed25519', kty: 'OKP', x: '...' };
   * const { code, name } = await Jose.jwkToMulticodec({ jwk });
   * ```
   *
   * @param params - The parameters for the conversion.
   * @param params.jwk - The JSON Web Key to be converted.
   * @returns A promise that resolves to a Multicodec definition.
   */
  public static async jwkToMulticodec({ jwk }: {
    jwk: Jwk
  }): Promise<MulticodecDefinition<MulticodecCode>> {
    const params: string[] = [];

    if (jwk.crv) {
      params.push(jwk.crv);
      if (jwk.d) {
        params.push('private');
      } else {
        params.push('public');
      }
    }

    const lookupKey = params.join(':');
    const name = joseToMulticodecMapping[lookupKey];

    if (name === undefined) {
      throw new Error(`Unsupported JOSE to Multicodec conversion: '${lookupKey}'`);
    }

    const code = Multicodec.getCodeFromName({ name });

    return { code, name };
  }

  /**
   * Converts a public key in JWK (JSON Web Key) format to a multibase identifier.
   *
   * @remarks
   * Note: All secp public keys are converted to compressed point encoding
   *       before the multibase identifier is computed.
   *
   * Per {@link https://github.com/multiformats/multicodec/blob/master/table.csv | Multicodec table}:
   *    Public keys for Elliptic Curve cryptography algorithms (e.g., secp256k1,
   *    secp256k1r1, secp384r1, etc.) are always represented with compressed point
   *    encoding (e.g., secp256k1-pub, p256-pub, p384-pub, etc.).
   *
   * Per {@link https://datatracker.ietf.org/doc/html/rfc8812#name-jose-and-cose-secp256k1-cur | RFC 8812}:
   *    "As a compressed point encoding representation is not defined for JWK
   *    elliptic curve points, the uncompressed point encoding defined there
   *    MUST be used. The x and y values represented MUST both be exactly
   *    256 bits, with any leading zeros preserved."
   *
   * @example
   * ```ts
   * const publicKey = { crv: 'Ed25519', kty: 'OKP', x: '...' };
   * const multibaseId = await Jose.publicKeyToMultibaseId({ publicKey });
   * ```
   *
   * @param params - The parameters for the conversion.
   * @param params.publicKey - The public key in JWK format.
   * @returns A promise that resolves to the multibase identifier.
   */
  public static async publicKeyToMultibaseId({ publicKey }: {
    publicKey: Jwk
  }): Promise<string> {
    if (!('crv' in publicKey)) {
      throw new Error(`Jose: Unsupported public key type: ${publicKey.kty}`);
    }

    let publicKeyBytes: Uint8Array;

    switch (publicKey.crv) {
      case 'Ed25519': {
        publicKeyBytes = await Ed25519.publicKeyToBytes({ publicKey });
        break;
      }

      case 'secp256k1': {
        publicKeyBytes = await Secp256k1.publicKeyToBytes({ publicKey });
        // Convert secp256k1 public keys to compressed format.
        publicKeyBytes = await Secp256k1.compressPublicKey({ publicKeyBytes });
        break;
      }

      case 'X25519': {
        publicKeyBytes = await X25519.publicKeyToBytes({ publicKey });
        break;
      }

      default: {
        throw new Error(`Jose: Unsupported public key curve: ${publicKey.crv}`);
      }
    }

    // Convert the JSON Web Key (JWK) parameters to a Multicodec name.
    const { name: multicodecName } = await Jose.jwkToMulticodec({ jwk: publicKey });

    // Compute the multibase identifier based on the provided key.
    const multibaseId = keyToMultibaseId({ key: publicKeyBytes, multicodecName });

    return multibaseId;
  }

  /**
   * Converts a Multicodec code or name to parial JWK (JSON Web Key).
   *
   * @example
   * ```ts
   * const partialJwk = await Jose.multicodecToJose({ name: 'ed25519-pub' });
   * ```
   *
   * @param params - The parameters for the conversion.
   * @param params.code - Optional Multicodec code to convert.
   * @param params.name - Optional Multicodec name to convert.
   * @returns A promise that resolves to a JOSE format key.
   */
  public static async multicodecToJose({ code, name }: {
    code?: MulticodecCode,
    name?: string
  }): Promise<Jwk> {
    // Either code or name must be specified, but not both.
    if (!(name ? !code : code)) {
      throw new Error(`Either 'name' or 'code' must be defined, but not both.`);
    }

    // If name is undefined, lookup by code.
    name = (name === undefined ) ? Multicodec.getNameFromCode({ code: code! }) : name;

    const lookupKey = name;
    const jose = multicodecToJoseMapping[lookupKey];

    if (jose === undefined) {
      throw new Error(`Unsupported Multicodec to JOSE conversion`);
    }

    return { ...jose };
  }
}