import type { PortableDid } from '@web5/dids';
import type { JwtHeader, JwtPayload } from 'jwt-decode';
import type {
  Web5Crypto,
  PublicKeyJwk,
  PrivateKeyJwk,
  CryptoAlgorithm,
  JwkParamsEcPrivate,
  JwkParamsOkpPrivate,
} from '@web5/crypto';

import { Convert } from '@web5/common';
import { EdDsaAlgorithm, EcdsaAlgorithm  } from '@web5/crypto';
import { DidDhtMethod, DidIonMethod, DidKeyMethod, DidResolver, utils as didUtils } from '@web5/dids';

/**
 * Parameters for creating a JWT.
 */
export type CreateJwtParams = {
  signerDid: PortableDid
  payload: JwtPayload & Record<string, any>
}

/**
 * Parameters for verifying a JWT.
 */
export type VerifyJwtParams = {
  compactJwt: string
}

/**
 * Parameters for parsing a JWT.
 * used in {@link CompactJwt.parse}
 */
export type ParseJwtParams = {
  compactJwt: string
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
export class CompactJwt {
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
  static didResolver: DidResolver = new DidResolver({ didResolvers: [DidIonMethod, DidKeyMethod, DidDhtMethod] });

  /**
   * Creates a JWT.
   * @param params - Parameters for JWT creation including signer DID and payload.
   * @returns The compact JWT as a string.
   * @example
   * ```ts
   * const jwt = await CompactJwt.create({ signerDid: myDid, payload: myPayload });
   * ```
   */
  static async create(params: CreateJwtParams) {
    const { signerDid, payload } = params;
    const privateKeyJwk = signerDid.keySet.verificationMethodKeys![0].privateKeyJwk! as JwkParamsEcPrivate | JwkParamsOkpPrivate;

    let vmId = signerDid.document.verificationMethod![0].id;
    if (vmId.charAt(0) === '#') {
      vmId = `${signerDid.did}${vmId}`;
    }

    const header: JwtHeader = {
      typ : 'JWT',
      alg : privateKeyJwk.alg,
      kid : vmId
    };

    const base64UrlEncodedHeader = Convert.object(header).toBase64Url();
    const base64UrlEncodedPayload = Convert.object(payload).toBase64Url();

    const toSign = `${base64UrlEncodedHeader}.${base64UrlEncodedPayload}`;
    const toSignBytes = Convert.string(toSign).toUint8Array();

    const algorithmId = `${header.alg}:${privateKeyJwk['crv'] || ''}`;
    if (!(algorithmId in CompactJwt.algorithms)) {
      throw new Error(`Signing failed: ${algorithmId} not supported`);
    }

    const { signer, options } = CompactJwt.algorithms[algorithmId];

    const signatureBytes = await signer.sign({ key: privateKeyJwk as PrivateKeyJwk, data: toSignBytes, algorithm: options! });
    const base64UrlEncodedSignature = Convert.uint8Array(signatureBytes).toBase64Url();

    return `${toSign}.${base64UrlEncodedSignature}`;
  }

  /**
   * Verifies a JWT.
   * @param params - Parameters for JWT verification
   * @returns Verified JWT information including signer DID, header, and payload.
   * @example
   * ```
   * const verifiedJwt = await CompactJwt.verify({ compactJwt: myJwt });
   * ```
   */
  static async verify(params: VerifyJwtParams) {
    const { decoded: decodedJwt, encoded: encodedJwt } = CompactJwt.parse({ compactJwt: params.compactJwt });

    // TODO: should really be looking for verificationMethod with authentication verification relationship
    const dereferenceResult = await CompactJwt.didResolver.dereference({ didUrl: decodedJwt.header.kid! });
    if (dereferenceResult.dereferencingMetadata.error) {
      throw new Error(`Failed to resolve ${decodedJwt.header.kid}`);
    }

    const verificationMethod = dereferenceResult.contentStream;
    if (!verificationMethod || !didUtils.isVerificationMethod(verificationMethod)) { // ensure that appropriate verification method was found
      throw new Error('Verification failed: Expected kid in JWT header to dereference a DID Document Verification Method');
    }

    // will be used to verify signature
    const publicKeyJwk = verificationMethod.publicKeyJwk as JwkParamsEcPrivate | JwkParamsOkpPrivate;
    if (!publicKeyJwk) { // ensure that Verification Method includes public key as a JWK.
      throw new Error('Verification failed: Expected kid in JWT header to dereference to a DID Document Verification Method with publicKeyJwk');
    }

    const signedData = `${encodedJwt.header}.${encodedJwt.payload}`;
    const signedDataBytes = Convert.string(signedData).toUint8Array();

    const signatureBytes = Convert.base64Url(encodedJwt.signature).toUint8Array();

    const algorithmId = `${decodedJwt.header.alg}:${publicKeyJwk['crv'] || ''}`;
    if (!(algorithmId in CompactJwt.algorithms)) {
      throw new Error(`Verification failed: ${algorithmId} not supported`);
    }

    const { signer, options } = CompactJwt.algorithms[algorithmId];

    const isSignatureValid = await signer.verify({
      algorithm : options!,
      key       : publicKeyJwk as PublicKeyJwk,
      data      : signedDataBytes,
      signature : signatureBytes
    });

    if (!isSignatureValid) {
      throw new Error('Signature verification failed: Integrity mismatch');
    }

    return {
      signerDid : verificationMethod.controller,
      header    : decodedJwt.header,
      payload   : decodedJwt.payload,
    };
  }

  /**
   * Parses a JWT without verifying its signature.
   * @param params - Parameters for JWT decoding, including the JWT string.
   * @returns both encoded and decoded JWT parts
   * @example
   * const { encoded: encodedJwt, decoded: decodedJwt } = CompactJwt.parse({ compactJwt: myJwt });
   */
  static parse(params: ParseJwtParams) {
    const splitJwt = params.compactJwt.split('.');
    if (splitJwt.length !== 3) {
      throw new Error(`Verification failed: Malformed JWT. expected 3 parts. got ${splitJwt.length}`);
    }

    const [base64urlEncodedJwtHeader, base64urlEncodedJwtPayload, base64urlEncodedSignature] = splitJwt;
    let jwtHeader: JwtHeader;
    let jwtPayload: JwtPayload;

    try {
      jwtHeader = Convert.base64Url(base64urlEncodedJwtHeader).toObject();
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
      jwtPayload = Convert.base64Url(base64urlEncodedJwtPayload).toObject();
    } catch(e) {
      throw new Error('Verification failed: Malformed JWT. Invalid base64url encoding for JWT payload');
    }

    return {
      decoded: {
        header  : jwtHeader,
        payload : jwtPayload as JwtPayload & Record<string, any>,
      },
      encoded: {
        header    : base64urlEncodedJwtHeader,
        payload   : base64urlEncodedJwtPayload,
        signature : base64urlEncodedSignature
      }
    };
  }
}