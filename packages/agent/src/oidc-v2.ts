import { DidResolver } from "@web5/dids";
import { Convert, RequireOnly } from "@web5/common";

// TODO connect: Find new jose
import { JoseHeaderParams, Sha256, utils, EdDsaAlgorithm } from "@web5/crypto";

import { appendPathToUrl } from "./utils.js";

import {
  AuthorizationRequestObject,
  AuthorizationResponseObject,
  IdentityProvider,
} from "./connect-v2.js";
import { Hkdf } from "./prototyping/crypto/primitives/hkdf.js";
import { Web5PlatformAgent } from "./types/agent.js";
import { xchacha20poly1305 } from "@noble/ciphers/chacha";

/**
 * OIDC URL used for Web5 connect (through OIDC Claims) or OIDC
 *
 * @param {string} connectURL as `scheme://foo`
 */
function buildRoutes(connectURL: string) {
  return {
    authorizationEndpoint: connectURL,
    pushedAuthorizationRequestEndpoint: `${connectURL}/par`,
  };
}

/**
 * Generates a random string value used to associate a Client authorization
 * request with the Identity Provider's response callback.
 *
 * @returns A random state as a Base64Url encoded string.
 */
function generateRandomState() {
  const randomStateu8a = utils.randomBytes(12);
  const ramdomStateb64url = Convert.uint8Array(randomStateu8a).toBase64Url();

  return { randomStateu8a, ramdomStateb64url };
}

/**
 * Calculates a value based on the given input that can be used to associate a
 * Client session with an ID Token, and to mitigate replay attacks. Per the
 * OpenID Connect Core 1.0 specification, the nonce parameter value should
 * include per-session state and be unguessable to attackers.
 *
 * @see {@link https://openid.net/specs/openid-connect-core-1_0.html#NonceNotes | OpenID Connect Core 1.0, Nonce Implementation Notes}
 * @returns A derived nonce as a Base64Url encoded string.
 */
async function deriveNonceFromInput(state: Uint8Array) {
  const nonceBytes = await Hkdf.deriveKeyBytes({
    hash: "SHA-256",
    // TODO: verify this is correct
    baseKeyBytes: state,
    length: 16,
    // TODO: verify this is correct
    salt: utils.randomBytes(12),
  });
  // const { hash, info, inputKeyingMaterial, length, salt } = options;

  const nonce = Convert.uint8Array(nonceBytes).toBase64Url();

  return nonce;
}

/**
 * Generates a cryptographically random key called a "code verifier" in
 * accordance with the RFC 7636 PKCE specification. A unique code verifier
 * should be created for every authorization request.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc7636#section-4.1 | RFC 7636, Client Creates a Code Verifier}
 *
 * @returns A random code verifier as a Base64Url encoded string.
 */
export function generateRandomCodeVerifier() {
  const codeVerifieru8a = utils.randomBytes(32);
  const codeVerifierb64url = Convert.uint8Array(codeVerifieru8a).toBase64Url();

  return { codeVerifieru8a, codeVerifierb64url };
}

/**
 * Calculates the PKCE `code_verifier` value to send with an authorization request using the S256
 * PKCE Code Challenge Method transformation.
 *
 * @param codeVerifier `code_verifier` value generated e.g. from {@link generateRandomCodeVerifier}.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc7636#section-4.2 | RFC 7636, Client Creates the Code Challenge}
 */
export async function deriveCodeChallenge(codeVerifier: Uint8Array) {
  const codeChallengeBytes = await Sha256.digest({ data: codeVerifier });

  return codeChallengeBytes;
}

async function createRequestObject(
  options: RequireOnly<
    AuthorizationRequestObject,
    "claims" | "client_id" | "redirect_uri"
  >
) {
  // Generate a random state value to associate the authorization request with the response.
  const randomState = generateRandomState();

  // Generate a random nonce value to associate the ID Token with the authorization request.
  const nonce = await deriveNonceFromInput(randomState.randomStateu8a);

  // Define the Request Object properties.
  const requestObject: AuthorizationRequestObject = {
    ...options,
    nonce,
    response_uri: null, // TODO?
    response_mode: "form_post",
    response_type: "id_token",
    randomState: randomState.ramdomStateb64url,
  };

  return requestObject;
}

async function signRequestObject({
  keyId,
  keyUri,
  request,
  agent,
}: {
  keyId: string;
  keyUri: string;
  request: AuthorizationRequestObject;
  agent: Web5PlatformAgent;
}) {
  try {
    const header = Convert.object({
      alg: "EdDSA",
      kid: keyId,
      typ: "JWT",
    }).toBase64Url();

    const payload = Convert.object(request).toBase64Url();

    const signature = await agent.keyManager.sign({
      keyUri,
      data: Convert.string(`${header}.${payload}`).toUint8Array(),
    });
    const signatureBase64Url = Convert.uint8Array(signature).toBase64Url();

    const jwt = `${header}.${payload}.${signatureBase64Url}`;

    return jwt;
  } catch (e) {
    console.error(e);
  }
}

// async function verifyRequestObject({
//   jwt,
//   dependencies,
// }: {
//   jwt: string;
//   dependencies: { crypto: CryptoManager; didResolver: DidResolver };
// }): Promise<AuthorizationRequestObject> {
//   const [headerB64U, payloadB64U, signatureB64U] = jwt.split(".");

//   // Convert the header back to a JOSE object and verify that the 'kid' header value is present.
//   const header = Convert.base64Url(headerB64U).toObject() as JoseHeaderParams;
//   if (!header.kid)
//     throw new Error(
//       `OIDC: Request Object could not be verified due to missing 'kid' header value.`
//     );

//   // Resolve the Client DID document.
//   const { didDocument } = await dependencies.didResolver.resolve(header.kid);
//   if (!didDocument)
//     throw new Error(
//       "OIDC: Request Object could not be verified due to Client DID resolution issue."
//     );

//   // Get the public key used to sign the Request Object from the DID document.
//   const { publicKeyJwk } =
//     didDocument.verificationMethod?.find(
//       (method) => method.id === header.kid
//     ) ?? {};
//   if (!publicKeyJwk)
//     throw new Error(
//       "OIDC: Request Object could not be verified due to missing public key in DID document."
//     );

//   // Import the code challenge as a crypto key to use for verification.
//   const signingKey = await Jose.jwkToKey({ key: publicKeyJwk });
//   await dependencies.crypto.importKey({
//     algorithm: { name: "EdDSA" },
//     alias: header.kid,
//     extractable: true,
//     material: signingKey.keyMaterial,
//     type: "public",
//     usages: ["verify"],
//   });

//   const isValid = await dependencies.crypto.verify({
//     algorithm: { name: "EdDSA" },
//     keyRef: header.kid,
//     signature: Convert.base64Url(signatureB64U).toUint8Array(),
//     data: Convert.string(`${headerB64U}.${payloadB64U}`).toUint8Array(),
//   });

//   if (!isValid)
//     throw new Error(
//       "OIDC: Request Object failed verification due to invalid signature."
//     );

//   const request = Convert.base64Url(
//     payloadB64U
//   ).toObject() as AuthorizationRequestObject;

//   return request;
// }

// async function decryptRequestJwt({
//   jwe,
//   keyId,
//   dependencies,
// }: {
//   jwe: string;
//   keyId: string;
//   dependencies: { crypto: CryptoManager };
// }): Promise<string> {
//   const [
//     protectedHeaderB64U,
//     ,
//     nonceB64U,
//     ciphertextB64U,
//     authenticationTagB64U,
//   ] = jwe.split(".");

//   const protectedHeader = Convert.base64Url(protectedHeaderB64U).toUint8Array();
//   const additionalData = protectedHeader;
//   const nonce = Convert.base64Url(nonceB64U).toUint8Array();
//   const ciphertext = Convert.base64Url(ciphertextB64U).toUint8Array();
//   const authenticationTag = Convert.base64Url(
//     authenticationTagB64U
//   ).toUint8Array();

//   // The cipher expects the encrypted data and tag to be concatenated.
//   const ciphertextAndTag = new Uint8Array([
//     ...ciphertext,
//     ...authenticationTag,
//   ]);

//   const jwtBytes = await dependencies.crypto.decrypt({
//     algorithm: { name: "XCHACHA20-POLY1305", additionalData, nonce },
//     data: ciphertextAndTag,
//     keyRef: keyId,
//   });

//   const jwt = Convert.uint8Array(jwtBytes).toString();

//   return jwt;
// }

async function encryptRequestJwt({
  jwt,
  codeChallenge,
}: {
  jwt: string;
  codeChallenge: Uint8Array;
}) {
  const protectedHeader = {
    alg: "dir",
    cty: "JWT",
    enc: "XC20P",
    typ: "JWT",
  };

  const additionalData = Convert.object(protectedHeader).toUint8Array();
  const nonce = utils.randomBytes(24);
  const jwtu8a = Convert.string(jwt).toUint8Array();
  const chacha = xchacha20poly1305(codeChallenge, nonce, additionalData);
  const ciphertextAndTag = chacha.encrypt(jwtu8a);

  /** The cipher output concatenates the encrypted data and tag
   * so we need to extract the values for use in the JWE. */
  const ciphertext = ciphertextAndTag.subarray(0, -16);
  const authenticationTag = ciphertextAndTag.subarray(-16);

  const compactJwe = [
    Convert.object(protectedHeader).toBase64Url(),
    "", // Empty string since there is no wrapped key.
    Convert.uint8Array(nonce).toBase64Url(),
    Convert.uint8Array(ciphertext).toBase64Url(),
    Convert.uint8Array(authenticationTag).toBase64Url(),
  ].join(".");

  return compactJwe;
}

// async function createResponseObject(
//   options: RequireOnly<AuthorizationResponseObject, "iss" | "sub" | "aud">
// ): Promise<AuthorizationResponseObject> {
//   const currentTimeInSeconds = Math.floor(Date.now() / 1000);

//   // Define the Response Object properties.
//   const responseObject: AuthorizationResponseObject = {
//     ...options,
//     iat: currentTimeInSeconds,
//     exp: currentTimeInSeconds + 600, // Expires in 10 minutes.
//   };

//   return responseObject;
// }

// async function signResponseObject({
//   keyId,
//   response,
//   dependencies,
// }: {
//   keyId: string;
//   response: AuthorizationResponseObject;
//   dependencies: { crypto: CryptoManager };
// }) {
//   const header = Convert.object({
//     alg: "EdDSA",
//     kid: keyId,
//     typ: "JWT",
//   }).toBase64Url();

//   const payload = Convert.object(response).toBase64Url();
//   const EdDsa = new EdDsaAlgorithm();
//   const signature = await EdDsa.sign({
//     key: "foo",
//     data: Convert.string(`${header}.${payload}`).toUint8Array(),
//   });
//   const singatureb64url = Convert.uint8Array(signature).toBase64Url();

//   // const signature = Convert.uint8Array(
//   //   await dependencies.crypto.sign({
//   //     algorithm: { name: "EdDSA" },
//   //     keyRef: keyId,
//   //     data: Convert.string(`${header}.${payload}`).toUint8Array(),
//   //   })
//   // ).toBase64Url();

//   const jwt = `${header}.${payload}.${singatureb64url}`;

//   return jwt;
// }

export const oidc = {
  generateRandomCodeVerifier,
  buildRoutes,
  createRequestObject,
  signRequestObject,
  deriveCodeChallenge,
  encryptRequestJwt,
};
