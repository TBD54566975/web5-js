import type { BearerDid } from '@web5/dids';
import type {
  JwtPayload,
  Web5Crypto,
  CryptoAlgorithm,
  JwtHeaderParams,
  JwkParamsEcPublic,
  JwkParamsOkpPublic,
} from '@web5/crypto';

import { Convert } from '@web5/common';
import { EdDsaAlgorithm, EcdsaAlgorithm  } from '@web5/crypto';
import { DidDht, DidIon, DidKey, DidJwk, DidWeb, DidResolver, utils as didUtils } from '@web5/dids';

/**
 * Result of parsing a JWT.
 */
export type JwtParseResult = {
  decoded: JwtVerifyResult
  encoded: {
    header: string
    payload: string
    signature: string
  }
}

/**
 * Result of verifying a JWT.
 */
export interface JwtVerifyResult {
  /** JWT Protected Header */
  header: JwtHeaderParams;

  /** JWT Claims Set */
  payload: JwtPayload;
}

/**
 * Parameters for parsing a JWT.
 * used in {@link Jwt.parse}
 */
export type ParseJwtOptions = {
  jwt: string
}

/**
 * Parameters for signing a JWT.
 */
export type SignJwtOptions = {
  signerDid: BearerDid
  payload: JwtPayload
}

/**
 * Parameters for verifying a JWT.
 */
export type VerifyJwtOptions = {
  jwt: string
}

/**
 * Represents a signer with a specific cryptographic algorithm and options.
 * @template T - The type of cryptographic options.
 */
type Signer<T extends Web5Crypto.Algorithm> = {
  signer: CryptoAlgorithm,
  options?: T | undefined
  alg: string
  crv: string
}

const secp256k1Signer: Signer<Web5Crypto.EcdsaOptions> = {
  signer  : new EcdsaAlgorithm(),
  options : { name: 'ES256K'},
  alg     : 'ES256K',
  crv     : 'secp256k1'
};

const ed25519Signer: Signer<Web5Crypto.EdDsaOptions> = {
  signer  : new EdDsaAlgorithm(),
  options : { name: 'EdDSA' },
  alg     : 'EdDSA',
  crv     : 'Ed25519'
};

/**
 * Class for handling Compact JSON Web Tokens (JWTs).
 * This class provides methods to create, verify, and decode JWTs using various cryptographic algorithms.
 * More information on JWTs can be found [here](https://datatracker.ietf.org/doc/html/rfc7519)
 */
export class Jwt {
  /** supported cryptographic algorithms. keys are `${alg}:${crv}`. */
  static algorithms: { [alg: string]: Signer<Web5Crypto.EcdsaOptions | Web5Crypto.EdDsaOptions> } = {
    'ES256K:'          : secp256k1Signer,
    'ES256K:secp256k1' : secp256k1Signer,
    ':secp256k1'       : secp256k1Signer,
    'EdDSA:Ed25519'    : ed25519Signer
  };

  /**
   * DID Resolver instance for resolving decentralized identifiers.
   */
  static didResolver: DidResolver = new DidResolver({ didResolvers: [DidDht, DidIon, DidKey, DidJwk, DidWeb] });

  /**
   * Creates a signed JWT.
   *
   * @example
   * ```ts
   * const jwt = await Jwt.sign({ signerDid: myDid, payload: myPayload });
   * ```
   *
   * @param options - Parameters for JWT creation including signer DID and payload.
   * @returns The compact JWT as a string.
   */
  static async sign(options: SignJwtOptions): Promise<string> {
    const { signerDid, payload } = options;

    let vmId = signerDid.didDocument.verificationMethod![0].id!;
    if (vmId.charAt(0) === '#') {
      vmId = `${signerDid.uri}${vmId}`;
    }

    // TODO: Change once signer has a method to get the alg and kid
    // const header = {
    //   typ : 'JWT',
    //   alg: signer.alg,
    //   kid: signer.kid
    // }

    let alg;
    if(signerDid.didDocument.verificationMethod![0].publicKeyJwk?.crv === 'Ed25519') {
      alg = 'EdDSA';
    } else if(signerDid.didDocument.verificationMethod![0].publicKeyJwk?.crv === 'secp256k1'){
      alg = 'ES256K';
    } else {
      throw new Error(`Signing failed: alg not supported`);
    }

    const header: JwtHeaderParams = {
      typ : 'JWT',
      alg : alg!,
      kid : vmId,
    };

    const base64UrlEncodedHeader = Convert.object(header).toBase64Url();
    const base64UrlEncodedPayload = Convert.object(payload).toBase64Url();

    const toSign = `${base64UrlEncodedHeader}.${base64UrlEncodedPayload}`;
    const toSignBytes = Convert.string(toSign).toUint8Array();

    const signer = await signerDid.getSigner();

    const signatureBytes = await signer.sign({data: toSignBytes});

    const base64UrlEncodedSignature = Convert.uint8Array(signatureBytes).toBase64Url();

    return `${toSign}.${base64UrlEncodedSignature}`;
  }

  /**
   * Verifies a JWT.
   *
   * @example
   * ```ts
   * const verifiedJwt = await Jwt.verify({ jwt: myJwt });
   * ```
   *
   * @param options - Parameters for JWT verification
   * @returns Verified JWT information including signer DID, header, and payload.
   */
  static async verify(options: VerifyJwtOptions): Promise<JwtVerifyResult> {
    const { decoded: decodedJwt, encoded: encodedJwt } = Jwt.parse({ jwt: options.jwt });

    if (decodedJwt.payload.exp && Math.floor(Date.now() / 1000) > decodedJwt.payload.exp) {
      throw new Error(`Verification failed: JWT is expired`);
    }

    // TODO: should really be looking for verificationMethod with authentication verification relationship
    const dereferenceResult = await Jwt.didResolver.dereference( decodedJwt.header.kid! );
    if (dereferenceResult.dereferencingMetadata.error) {
      throw new Error(`Failed to resolve ${decodedJwt.header.kid}`);
    }

    const verificationMethod = dereferenceResult.contentStream;
    if (!verificationMethod || !didUtils.isDidVerificationMethod(verificationMethod)) { // ensure that appropriate verification method was found
      throw new Error('Verification failed: Expected kid in JWT header to dereference a DID Document Verification Method');
    }

    // will be used to verify signature
    const publicKeyJwk = verificationMethod.publicKeyJwk as JwkParamsEcPublic | JwkParamsOkpPublic;
    if (!publicKeyJwk) { // ensure that Verification Method includes public key as a JWK.
      throw new Error('Verification failed: Expected kid in JWT header to dereference to a DID Document Verification Method with publicKeyJwk');
    }

    const signedData = `${encodedJwt.header}.${encodedJwt.payload}`;
    const signedDataBytes = Convert.string(signedData).toUint8Array();

    const signatureBytes = Convert.base64Url(encodedJwt.signature).toUint8Array();

    const algorithmId = `${decodedJwt.header.alg}:${publicKeyJwk['crv'] || ''}`;
    if (!(algorithmId in Jwt.algorithms)) {
      throw new Error(`Verification failed: ${algorithmId} not supported`);
    }

    const { signer, options: signatureAlgorithm } = Jwt.algorithms[algorithmId];

    const isSignatureValid = await signer.verify({
      algorithm : signatureAlgorithm!,
      key       : publicKeyJwk,
      data      : signedDataBytes,
      signature : signatureBytes
    });

    if (!isSignatureValid) {
      throw new Error('Signature verification failed: Integrity mismatch');
    }

    return decodedJwt;
  }

  /**
   * Parses a JWT without verifying its signature.
   *
   * @example
   * ```ts
   * const { encoded: encodedJwt, decoded: decodedJwt } = Jwt.parse({ jwt: myJwt });
   * ```
   *
   * @param options - Parameters for JWT decoding, including the JWT string.
   * @returns both encoded and decoded JWT parts
   */
  static parse(options: ParseJwtOptions): JwtParseResult {
    const splitJwt = options.jwt.split('.');
    if (splitJwt.length !== 3) {
      throw new Error(`Verification failed: Malformed JWT. expected 3 parts. got ${splitJwt.length}`);
    }

    const [base64urlEncodedJwtHeader, base64urlEncodedJwtPayload, base64urlEncodedSignature] = splitJwt;
    let jwtHeader: JwtHeaderParams;
    let jwtPayload: JwtPayload;

    try {
      jwtHeader = Convert.base64Url(base64urlEncodedJwtHeader).toObject() as JwtHeaderParams;
    } catch(e) {
      throw new Error('Verification failed: Malformed JWT. Invalid base64url encoding for JWT header');
    }

    if (!jwtHeader.typ || jwtHeader.typ !== 'JWT') {
      throw new Error('Verification failed: Expected JWT header to contain typ property set to JWT');
    }

    if (!jwtHeader.alg || !jwtHeader.kid) { // ensure that JWT header has required properties
      throw new Error('Verification failed: Expected JWT header to contain alg and kid');
    }

    // TODO: validate optional payload fields: https://datatracker.ietf.org/doc/html/rfc7519#section-4.1
    try {
      jwtPayload = Convert.base64Url(base64urlEncodedJwtPayload).toObject() as JwtPayload;
    } catch(e) {
      throw new Error('Verification failed: Malformed JWT. Invalid base64url encoding for JWT payload');
    }

    return {
      decoded: {
        header  : jwtHeader,
        payload : jwtPayload,
      },
      encoded: {
        header    : base64urlEncodedJwtHeader,
        payload   : base64urlEncodedJwtPayload,
        signature : base64urlEncodedSignature
      }
    };
  }
}