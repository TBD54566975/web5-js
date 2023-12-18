import { Multicodec, MulticodecCode, MulticodecDefinition } from '@web5/common';

import { keyToMultibaseId } from './utils.js';
import { Ed25519, Secp256k1, X25519 } from './crypto-primitives/index.js';
import { Jwk, PublicKeyJwk } from './jose/jwk.js';

const multicodecToJoseMapping: { [key: string]: Jwk } = {
  'ed25519-pub'    : { crv: 'Ed25519',   kty: 'OKP', x: '' },
  'ed25519-priv'   : { crv: 'Ed25519',   kty: 'OKP', x: '',        d: '' },
  'secp256k1-pub'  : { crv: 'secp256k1', kty: 'EC',  x: '', y: ''},
  'secp256k1-priv' : { crv: 'secp256k1', kty: 'EC',  x: '', y: '', d: '' },
  'x25519-pub'     : { crv: 'X25519',    kty: 'OKP', x: '' },
  'x25519-priv'    : { crv: 'X25519',    kty: 'OKP', x: '',        d: '' },
};

const joseToMulticodecMapping: { [key: string]: string } = {
  'Ed25519:public'    : 'ed25519-pub',
  'Ed25519:private'   : 'ed25519-priv',
  'secp256k1:public'  : 'secp256k1-pub',
  'secp256k1:private' : 'secp256k1-priv',
  'X25519:public'     : 'x25519-pub',
  'X25519:private'    : 'x25519-priv',
};

export class Jose {
  public static async joseToMulticodec(options: {
    key: Jwk
  }): Promise<MulticodecDefinition<MulticodecCode>> {
    const jsonWebKey = options.key;

    const params: string[] = [];

    if ('crv' in jsonWebKey) {
      params.push(jsonWebKey.crv);
      if ('d' in jsonWebKey) {
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
   */
  public static async publicKeyToMultibaseId(options: {
    publicKey: PublicKeyJwk
  }): Promise<string> {
    const { publicKey } = options;

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
    const { name: multicodecName } = await Jose.joseToMulticodec({ key: publicKey });

    // Compute the multibase identifier based on the provided key.
    const multibaseId = keyToMultibaseId({ key: publicKeyBytes, multicodecName });

    return multibaseId;
  }

  public static async multicodecToJose(options: {
    code?: MulticodecCode,
    name?: string
  }): Promise<Jwk> {
    let { code, name } = options;

    // Either code or name must be specified, but not both.
    if (!(name ? !code : code)) {
      throw new Error(`Either 'name' or 'code' must be defined, but not both.`);
    }

    // If name is undefined, lookup by code.
    name = (name === undefined ) ? Multicodec.getNameFromCode({ code: code! }) : name;

    const lookupKey = name;
    const jose = multicodecToJoseMapping[lookupKey];

    if (jose === undefined) {
      throw new Error(`Unsupported Multicodec to JOSE conversion: '${options.name}'`);
    }

    return { ...jose };
  }
}