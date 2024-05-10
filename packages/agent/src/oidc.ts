import { DidResolver } from '@web5/dids';
import { Convert, RequireOnly } from '@web5/common';
import { Hkdf, Jose, JoseHeaderParams, Sha256, utils as cryptoUtils } from '@web5/crypto';

import { appendPathToUrl } from './utils.js';
import { CryptoManager } from './types/managed-key.js';
import { AuthorizationRequestObject, AuthorizationResponseObject, IdentityProvider } from './connect.js';

export async function discoverProvider({ connectEndpoint }: {
  connectEndpoint: string
}): Promise<IdentityProvider> {
  const localProvider = false;
  // ! TODO: Implement discovery of a local Connect Provider listening on ports 55555-55599:
  // !       - Connect Client will attempt to connect via HTTP to the Connect Provider.
  // !       - Connect Provider must begin listening for HTTP requests.

  // If a local provider is discovered, use its endpoint for authorization.
  if (localProvider) {
    return {
      authorizationEndpoint              : 'http://localhost:55555/connect',
      pushedAuthorizationRequestEndpoint : 'http://localhost:55555/connect/par'
    };
  }

  /** Otherwise, push the Request Object to specified Connect Endpoint and use a custom URL scheme
   * to initiate the authorization request. */
  return {
    authorizationEndpoint              : 'web5://connect',
    pushedAuthorizationRequestEndpoint : appendPathToUrl({ url: connectEndpoint, path: 'par' })
  };
}


/**
 * Generates a random string value used to associate a Client authorization
 * request with the Identity Provider's response callback.
 *
 * @returns A random state as a Base64Url encoded string.
 */
export function generateRandomState(): string {
  const stateBytes = cryptoUtils.randomBytes({ length: 12 });
  const state = Convert.uint8Array(stateBytes).toBase64Url();

  return state;
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
export async function deriveNonce({ input }: { input: string }): Promise<string> {
  const nonceBytes = await Hkdf.deriveKey({
    hash                : 'SHA-256',
    inputKeyingMaterial : input,
    length              : 16
  });

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
export function generateRandomCodeVerifier(): string {
  const codeVerifierBytes = cryptoUtils.randomBytes({ length: 32 });
  const codeVerifier = Convert.uint8Array(codeVerifierBytes).toBase64Url();

  return codeVerifier;
}

/**
 * Calculates the PKCE `code_verifier` value to send with an authorization request using the S256
 * PKCE Code Challenge Method transformation.
 *
 * @param codeVerifier `code_verifier` value generated e.g. from {@link generateRandomCodeVerifier}.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc7636#section-4.2 | RFC 7636, Client Creates the Code Challenge}
 */
export async function deriveCodeChallenge({ codeVerifier }: {
  codeVerifier: string
}): Promise<string> {
  const codeVerifierBytes = Convert.string(codeVerifier).toUint8Array();
  const codeChallengeBytes = await Sha256.digest({ data: codeVerifierBytes });
  const codeChallenge = Convert.uint8Array(codeChallengeBytes).toBase64Url();

  return codeChallenge;
}

export async function createRequestObject(options:
  RequireOnly<AuthorizationRequestObject, 'claims' | 'client_id' | 'redirect_uri'>
): Promise<AuthorizationRequestObject> {
  // Generate a random state value to associate the authorization request with the response.
  const state = generateRandomState();

  // Generate a random nonce value to associate the ID Token with the authorization request.
  const nonce = await deriveNonce({ input: state });

  // Define the Request Object properties.
  const requestObject: AuthorizationRequestObject = {
    ...options,
    nonce,
    response_mode : 'form_post',
    response_type : 'id_token',
    state
  };

  return requestObject;
}


export async function signRequestObject({ keyId, request, dependencies }: {
  keyId: string,
  request: AuthorizationRequestObject,
  dependencies: { crypto: CryptoManager }
}): Promise<string> {
  const header = Convert.object({
    alg : 'EdDSA',
    kid : keyId,
    typ : 'JWT'
  }).toBase64Url();

  const payload = Convert.object(request).toBase64Url();

  const signature = Convert.uint8Array(
    await dependencies.crypto.sign({
      algorithm : { name: 'EdDSA' },
      keyRef    : keyId,
      data      : Convert.string(`${header}.${payload}`).toUint8Array()
    })
  ).toBase64Url();

  const jwt = `${header}.${payload}.${signature}`;

  return jwt;
}

export async function verifyRequestObject({ jwt, dependencies }: {
  jwt: string,
  dependencies: { crypto: CryptoManager, didResolver: DidResolver }
}): Promise<AuthorizationRequestObject> {

  const [headerB64U, payloadB64U, signatureB64U] = jwt.split('.');

  // Convert the header back to a JOSE object and verify that the 'kid' header value is present.
  const header = Convert.base64Url(headerB64U).toObject() as JoseHeaderParams;
  if (!header.kid) throw new Error(`OIDC: Request Object could not be verified due to missing 'kid' header value.`);

  // Resolve the Client DID document.
  const { didDocument } = await dependencies.didResolver.resolve(header.kid);
  if (!didDocument) throw new Error('OIDC: Request Object could not be verified due to Client DID resolution issue.');

  // Get the public key used to sign the Request Object from the DID document.
  const { publicKeyJwk } = didDocument.verificationMethod?.find(method => method.id === header.kid) ?? {};
  if (!publicKeyJwk) throw new Error('OIDC: Request Object could not be verified due to missing public key in DID document.');

  // Import the code challenge as a crypto key to use for verification.
  const signingKey = await Jose.jwkToKey({ key: publicKeyJwk });
  await dependencies.crypto.importKey({
    algorithm   : { name: 'EdDSA' },
    alias       : header.kid,
    extractable : true,
    material    : signingKey.keyMaterial,
    type        : 'public',
    usages      : ['verify']
  });

  const isValid = await dependencies.crypto.verify({
    algorithm : { name: 'EdDSA' },
    keyRef    : header.kid,
    signature : Convert.base64Url(signatureB64U).toUint8Array(),
    data      : Convert.string(`${headerB64U}.${payloadB64U}`).toUint8Array()
  });

  if (!isValid) throw new Error('OIDC: Request Object failed verification due to invalid signature.');

  const request = Convert.base64Url(payloadB64U).toObject() as AuthorizationRequestObject;

  return request;
}

export async function decryptRequestJwt({ jwe, keyId, dependencies }: {
  jwe: string,
  keyId: string,
  dependencies: { crypto: CryptoManager }
}): Promise<string> {

  const [protectedHeaderB64U, , nonceB64U, ciphertextB64U, authenticationTagB64U] = jwe.split('.');

  const protectedHeader = Convert.base64Url(protectedHeaderB64U).toUint8Array();
  const additionalData = protectedHeader;
  const nonce = Convert.base64Url(nonceB64U).toUint8Array();
  const ciphertext = Convert.base64Url(ciphertextB64U).toUint8Array();
  const authenticationTag = Convert.base64Url(authenticationTagB64U).toUint8Array();

  // The cipher expects the encrypted data and tag to be concatenated.
  const ciphertextAndTag = new Uint8Array([...ciphertext, ...authenticationTag]);

  const jwtBytes = await dependencies.crypto.decrypt({
    algorithm : { name: 'XCHACHA20-POLY1305', additionalData, nonce },
    data      : ciphertextAndTag,
    keyRef    : keyId
  });

  const jwt = Convert.uint8Array(jwtBytes).toString();

  return jwt;
}

export async function encryptRequestJwt({ jwt, keyId, dependencies }: {
  jwt: string,
  keyId: string,
  dependencies: { crypto: CryptoManager }
}): Promise<string> {
  const protectedHeader = {
    alg : 'dir',
    cty : 'JWT',
    enc : 'XC20P',
    typ : 'JWT'
  };

  const additionalData = Convert.object(protectedHeader).toUint8Array();
  const nonce = cryptoUtils.randomBytes({ length: 24 });

  let ciphertextAndTag = await dependencies.crypto.encrypt({
    algorithm : { name: 'XCHACHA20-POLY1305', additionalData, nonce },
    data      : Convert.string(jwt).toUint8Array(),
    keyRef    : keyId
  });

  /** The cipher output concatenates the encrypted data and tag
     * so we need to extract the values for use in the JWE. */
  const ciphertext = ciphertextAndTag.subarray(0, -16);
  const authenticationTag = ciphertextAndTag.subarray(-16);

  const compactJwe = [
    Convert.object(protectedHeader).toBase64Url(),
    '', // Empty string since there is no wrapped key.
    Convert.uint8Array(nonce).toBase64Url(),
    Convert.uint8Array(ciphertext).toBase64Url(),
    Convert.uint8Array(authenticationTag).toBase64Url()
  ].join('.');

  return compactJwe;
}

export async function createResponseObject(options:
  RequireOnly<AuthorizationResponseObject, 'iss' | 'sub' | 'aud'>
): Promise<AuthorizationResponseObject> {
  const currentTimeInSeconds = Math.floor(Date.now() / 1000);

  // Define the Response Object properties.
  const responseObject: AuthorizationResponseObject = {
    ...options,
    iat : currentTimeInSeconds,
    exp : currentTimeInSeconds + 600 // Expires in 10 minutes.
  };

  return responseObject;
}

export async function signResponseObject({ keyId, response, dependencies }: {
  keyId: string,
  response: AuthorizationResponseObject,
  dependencies: { crypto: CryptoManager }
}): Promise<string> {
  const header = Convert.object({
    alg : 'EdDSA',
    kid : keyId,
    typ : 'JWT'
  }).toBase64Url();

  const payload = Convert.object(response).toBase64Url();

  const signature = Convert.uint8Array(
    await dependencies.crypto.sign({
      algorithm : { name: 'EdDSA' },
      keyRef    : keyId,
      data      : Convert.string(`${header}.${payload}`).toUint8Array()
    })
  ).toBase64Url();

  const jwt = `${header}.${payload}.${signature}`;

  return jwt;
}