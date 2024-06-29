import { DidResolver } from "@web5/dids";
import { Convert, RequireOnly } from "@web5/common";

// TODO connect: Find new jose
import { JoseHeaderParams, Sha256, utils, EdDsaAlgorithm } from "@web5/crypto";

import { appendPathToUrl } from "./utils.js";
import { Hkdf } from "./prototyping/crypto/primitives/hkdf.js";
import { Web5PlatformAgent } from "./types/agent.js";
import { xchacha20poly1305 } from "@noble/ciphers/chacha";

/**
 * Sent to an OIDC server to authorize a client. Allows clients
 * to securely send authorization request parameters directly to
 * the server via POST. This avoids exposing sensitive data in URLs
 * and ensures the server validates the request before user interaction.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc9126.html | OAuth 2.0 Pushed Authorization Requests}
 */
type PushedAuthRequest = {
  /** The JWT which contains the {@link HybridAuthRequest} */
  request: string;
};

/**
 * Sent back by OIDC server in response to {@link PushedAuthRequest}
 * The server generates a TTL and a unique request_uri. The request_uri can be shared
 * with the Provider using a link or a QR code along with additional params
 * to access the url and decrypt the payload.
 */
export type PushedAuthResponse = {
  request_uri: string;
  expires_in: number;
};

/** An auth request that is compatible with both Web5 Connect and (hopefully, WIP) OIDC SIOPv2 */
type HybridAuthRequest = SIOPv2AuthRequest & Web5ConnectRequest;

/**
 * Used in decentralized apps. The SIOPv2 Auth Request is created by a client relying party (RP)
 * often a web service or an app who wants to obtain information from a provider
 * The contents of these are inserted into a JWT inside of the {@link PushedAuthRequest}.
 * @see {@link https://github.com/TBD54566975/known-customer-credential | TBD OIDC Documentation for SIOPv2 }
 */
type SIOPv2AuthRequest = {
  /** Often the same as the redirect_uri */
  client_id: string;

  /** The scope of the access request (e.g., `openid profile`). */
  scope: string;

  /** The type of response desired (e.g. `id_token`) */
  response_type: string;

  /** the URL to which the Identity Provider will post the Authorization Response */
  redirect_uri: string;

  /** The URI to which the SIOPv2 Authorization Response will be sent (Tim's note: not used with encrypted request JWT)*/
  response_uri?: string;

  /**
   * An opaque value used to maintain state between the request and the callback.
   * Recommended for security to prevent CSRF attacks.
   */
  state: string;

  /**
   * A string value used to associate a client session with an ID token to mitigate replay attacks.
   * Recommended when requesting ID tokens.
   */
  nonce: string;

  /**
   * The PKCE code challenge.
   * Required if `code_challenge_method` is used. Enhances security for public clients (e.g., single-page apps,
   * mobile apps) by requiring an additional verification step during token exchange.
   */
  code_challenge: string;

  /** The method used for the PKCE challenge (typically `S256`). Must be present if `code_challenge` is included. */
  code_challenge_method: "S256";

  /**
   * An ID token previously issued to the client, passed as a hint about the end-user’s current or past authenticated
   * session with the client. Can streamline user experience if already logged in.
   */
  id_token_hint?: string;

  /** A hint to the authorization server about the login identifier the user might use. Useful for pre-filling login information. */
  login_hint?: string;

  /** Requested Authentication Context Class Reference values. Specifies the authentication context requirements. */
  acr_values?: string;

  /** When using a PAR for secure cross device flows we use a "form_post" rather than a "direct_post" */
  response_mode: "direct_post";

  /** Used by PFI to request VCs as input to IDV process. If present, `response_type: "vp_token""` MUST also be present */
  presentation_definition?: any;

  /** A JSON object containing the Verifier metadata values (Tim's note: from TBD KCC Repo) */
  client_metadata?: {
    /** Array of strings, each a DID method supported for the subject of ID Token	*/
    subject_syntax_types_supported: string[];
    /** Human-readable string name of the client to be presented to the end-user during authorization */
    client_name?: string;
    /** URI of a web page providing information about the client */
    client_uri?: string;
    /** URI of an image logo for the client */
    logo_uri?: string;
    /** Array of strings representing ways to contact people responsible for this client, typically email addresses */
    contacts?: string[];
    /** URI that points to a terms of service document for the client */
    tos_uri?: string;
    /** URI that points to a privacy policy document */
    policy_uri?: string;
  };
};

/** Claims specific to Web5 Connect rather than OIDC */
type Web5ConnectRequest = {
  /** PermissionGrants that are to be sent to the provider */
  permission_requests: string[];
};

// old, ignore, do not use. here for comparison.
// export interface AuthorizationRequestObject {
//   claims?: { id_token: { delegation_grants: any; [key: string]: any } };
//   client_id: string;
//   client_metadata?: { client_uri?: string; [key: string]: any };
//   code_verifier?: string;
//   nonce: string;
//   redirect_uri: string;
//   state?: string;

//   [key: string]: any;
// }

/** An auth response that is compatible with both Web5 Connect and (hopefully, WIP) OIDC SIOPv2 */
type HybridAuthResponse = SIOPv2AuthResponse & Web5ConnectAuthResponse;

/** The fields for an OIDC SIOPv2 Auth Repsonse */
type SIOPv2AuthResponse = {
  /** Issuer Identifier for the Issuer of the response. */
  iss: "https://self-issued.me" | "https://self-issued.me/v2" | string;
  /** Subject Identifier. A locally unique and never reassigned identifier
   * within the Issuer for the End-User, which is intended to be consumed
   * by the Client. */
  sub: string;
  /** Audience(s) that this ID Token is intended for. It MUST contain the
   * OAuth 2.0 client_id of the Relying Party as an audience value. */
  aud: string;
  /** Time at which the JWT was issued. */
  iat: number;
  /** Expiration time on or after which the ID Token MUST NOT be accepted
   * for processing. */
  exp: number;
  /** Time when the End-User authentication occurred. */
  auth_time?: number;
  /** String value used to associate a Client session with an ID Token, and to
   * mitigate replay attacks. */
  nonce?: string;
  /** Custom claims. */
  [key: string]: any;
};

/** The fields for an Web5 Connect Auth Repsonse */
type Web5ConnectAuthResponse = {};

// /**
//  * Used in decentralized apps.
//  * The SIOPv2 Auth Request is created by a client relying party (RP), often a web service or an app,
//  * who wants to obtain information from a provider. That provider will return a `SIOPv2AuthResponse`. // TODO: need to type this as well
//  *
//  * @see {@link https://github.com/TBD54566975/known-customer-credential | TBD OIDC Documentation for SIOPv2 }
//  */
// type SIOPv2AuthRequestData = {
//   /** The DID of the RP (client)	*/
//   client_id: string;
//   /** What's being requested. 'openid' indicates ID Token is being requested */
//   scope: string;
//   /** What sort of response the RP is expecting. MUST include id_token. MAY include vp_token */
//   response_type: string;
//   /** The URI to which the SIOPv2 Authorization Response will be sent (Tim's note: not used with encrypted request JWT)*/
//   response_uri: string;
//   /** The mode in which the SIOPv2 Authorization Response will be sent. MUST be direct_post */
//   response_mode: "direct_post";
//   /** Used by PFI to request VCs as input to IDV process. If present, `response_type: "vp_token""` MUST also be present */
//   presentation_definition?: any;
//   /** A nonce which MUST be included in the ID Token provided in the SIOPv2 Authorization Response */
//   nonce: string;
//   /** A JSON object containing the Verifier metadata values */
//   client_metadata: {
//     /** Array of strings, each a DID method supported for the subject of ID Token	*/
//     subject_syntax_types_supported: string[];
//     /** Human-readable string name of the client to be presented to the end-user during authorization */
//     client_name?: string;
//     /** URI of a web page providing information about the client */
//     client_uri?: string;
//     /** URI of an image logo for the client */
//     logo_uri?: string;
//     /** Array of strings representing ways to contact people responsible for this client, typically email addresses */
//     contacts?: string[];
//     /** URI that points to a terms of service document for the client */
//     tos_uri?: string;
//     /** URI that points to a privacy policy document */
//     policy_uri?: string;
//   };
// };

/** Represents the different OIDC endpoint types.
 * 1. `pushedAuthorizationRequest`: client sends {@link PushedAuthRequest} receives {@link PushedAuthResponse}
 * 2. `authorize`: provider gets the {@link HybridAuthRequest} JWT that was stored by the PAR
 * 3. `callback`: provider sends {@link HybridAuthResponse} to this endpoint
 * 4. `token`: client gets {@link HybridAuthResponse} from this endpoint
 */
type OidcEndpoint =
  | "pushedAuthorizationRequest"
  | "authorize"
  | "callback"
  | "token";

/**
 * Gets the correct OIDC endpoint out of the {@link OidcEndpoint} options provided.
 * Handles a trailing slash on baseURL
 *
 * @param {Object} options the options object
 * @param {string} options.baseURL for example `http://foo.com/connect/
 * @param {OidcEndpoint} options.endpoint the OIDC endpoint desired
 * @param {string} options.authParam must be provided when getting the `authorize` endpoint
 * @param {string} options.tokenParam must be provided when getting the `token` endpoint
 */
function buildOidcUrl({
  baseURL,
  endpoint,
  authParam,
  tokenParam,
}: {
  baseURL: string;
  endpoint: OidcEndpoint;
  authParam?: string;
  tokenParam?: string;
}) {
  switch (endpoint) {
    /** 1. client sends {@link PushedAuthRequest} & receives {@link PushedAuthResponse} */
    case "pushedAuthorizationRequest":
      return appendPathToUrl({
        path: "par",
        url: baseURL,
      });
    /** 2. provider gets {@link HybridAuthRequest} */
    case "authorize":
      return authParam
        ? appendPathToUrl({
            path: `authorize/${authParam}`,
            url: baseURL,
          })
        : "";
    /** 3. provider sends {@link HybridAuthResponse} */
    case "callback":
      return appendPathToUrl({
        path: `callback`,
        url: baseURL,
      });
    /**  4. client gets {@link HybridAuthResponse */
    case "token":
      return tokenParam
        ? appendPathToUrl({
            path: `token/${tokenParam}`,
            url: baseURL,
          })
        : "";
    // TODO: metadata endpoints?
    default:
      return "";
  }
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
  const codeChallengeu8a = await Sha256.digest({ data: codeVerifier });
  const codeChallengeb64url =
    Convert.uint8Array(codeChallengeu8a).toBase64Url();

  return { codeChallengeu8a, codeChallengeb64url };
}

// TODO: when implementing pure OIDC split up the Web5 and OIDC params
async function createAuthRequest(
  options: RequireOnly<
    HybridAuthRequest,
    | "code_challenge"
    | "code_challenge_method"
    | "client_id"
    | "scope"
    | "redirect_uri"
    | "permission_requests"
  >
) {
  // Generate a random state value to associate the authorization request with the response.
  const { randomStateu8a, ramdomStateb64url } = generateRandomState();

  // Generate a random nonce value to associate the ID Token with the authorization request.
  const nonce = await deriveNonceFromInput(randomStateu8a);

  const requestObject: HybridAuthRequest = {
    ...options,
    nonce,
    response_type: "id_token",
    response_mode: "direct_post",
    state: ramdomStateb64url,
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
  request: HybridAuthRequest;
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

export const Oidc = {
  generateRandomCodeVerifier,
  buildOidcUrl,
  createAuthRequest,
  signRequestObject,
  deriveCodeChallenge,
  encryptRequestJwt,
};
