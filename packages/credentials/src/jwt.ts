import { BearerDid } from '@web5/dids';
import type {
  JwtPayload,
  JwtHeaderParams,
  JwkParamsEcPublic,
  JwkParamsOkpPublic,
} from '@web5/crypto';

import { Convert } from '@web5/common';
import { LocalKeyManager as CryptoApi  } from '@web5/crypto';
import { DidDht, DidIon, DidKey, DidJwk, DidWeb, DidResolver, utils as didUtils } from '@web5/dids';
import { VcDataModel } from './verifiable-credential.js';
import { VpDataModel } from './verifiable-presentation.js';

const crypto = new CryptoApi();

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
 * Class for handling Compact JSON Web Tokens (JWTs).
 * This class provides methods to create, verify, and decode JWTs using various cryptographic algorithms.
 * More information on JWTs can be found [here](https://datatracker.ietf.org/doc/html/rfc7519)
 */
export class Jwt {
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
    const signer = await signerDid.getSigner();

    let vmId = signer.keyId;
    if (vmId.charAt(0) === '#') {
      vmId = `${signerDid.uri}${vmId}`;
    }

    const header: JwtHeaderParams = {
      typ : 'JWT',
      alg : signer.algorithm,
      kid : vmId,
    };

    const base64UrlEncodedHeader = Convert.object(header).toBase64Url();
    const base64UrlEncodedPayload = Convert.object(payload).toBase64Url();

    const toSign = `${base64UrlEncodedHeader}.${base64UrlEncodedPayload}`;
    const toSignBytes = Convert.string(toSign).toUint8Array();

    const signatureBytes = await signer.sign({ data: toSignBytes });

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
   * exp MUST represent the expirationDate property, encoded as a UNIX timestamp (NumericDate).
   * iss MUST represent the issuer property of a verifiable credential or the holder property of a verifiable presentation.
   * nbf MUST represent issuanceDate, encoded as a UNIX timestamp (NumericDate).
   * jti MUST represent the id property of the verifiable credential or verifiable presentation.
   * sub MUST represent the id property contained in the credentialSubject.

   * @param options - Parameters for JWT verification
   * @returns Verified JWT information including signer DID, header, and payload.
   */
  static async verify(options: VerifyJwtOptions): Promise<JwtVerifyResult> {
    const { decoded: decodedJwt, encoded: encodedJwt } = Jwt.parse({ jwt: options.jwt });

    // Ensure decodedJwt is defined and is an object
    if (!decodedJwt || typeof decodedJwt !== 'object' || !decodedJwt.payload) {
      throw new Error('Invalid JWT structure');
    }

    // Extract relevant properties for easier access
    const { exp, iss, nbf, jti, sub, vc, vp } = decodedJwt.payload;

    const vcTyped = vc as VcDataModel;
    const vpTyped = vp as VpDataModel;

    if (exp && Math.floor(Date.now() / 1000) > exp) {
      throw new Error('Verification failed: JWT is expired');
    }

    if (!iss) throw new Error('Verification failed: iss claim is required');

    if ((vcTyped && iss !== vcTyped.issuer) || (vpTyped && iss !== vpTyped.holder)) {
      throw new Error('Verification failed: iss claim does not match expected issuer/holder');
    }

    if (nbf) {
      if (vcTyped && nbf !== Math.floor(new Date(vcTyped.issuanceDate).getTime() / 1000)) {
        throw new Error('Verification failed: nbf claim does not match the expected issuanceDate');
      }
      // Note: VP does not have issuanceDate
    }

    if (jti && ((vcTyped && jti !== vcTyped.id) || (vpTyped && jti !== vpTyped.id))) {
      throw new Error('Verification failed: jti claim does not match the expected id');
    }

    if (!sub) throw new Error('Verification failed: sub claim is required');
    const credentialSubject = vcTyped?.credentialSubject as any;
    if (vcTyped && sub !== credentialSubject.id) {
      throw new Error('Verification failed: sub claim does not match the expected subject id');
      // Note: VP does not have subject id validation
    }

    // TODO: should really be looking for verificationMethod with authentication verification relationship
    const dereferenceResult = await Jwt.didResolver.dereference(decodedJwt.header.kid!);
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

    if(publicKeyJwk.alg && (publicKeyJwk.alg !== decodedJwt.header.alg)) {
      throw new Error('Verification failed: Expected alg in JWT header to match DID Document Verification Method alg');
    }

    const signedData = `${encodedJwt.header}.${encodedJwt.payload}`;
    const signedDataBytes = Convert.string(signedData).toUint8Array();

    const signatureBytes = Convert.base64Url(encodedJwt.signature).toUint8Array();

    const isSignatureValid = await crypto.verify({
      key       : publicKeyJwk,
      signature : signatureBytes,
      data      : signedDataBytes,
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