import { Convert, RequireOnly } from '@web5/common';
import {
  Ed25519,
  EdDsaAlgorithm,
  JoseHeaderParams,
  Jwk,
  Sha256,
  X25519,
  CryptoUtils,
} from '@web5/crypto';
import { concatenateUrl } from './utils.js';
import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import type { ConnectPermissionRequest } from './connect.js';
import { DidDocument, DidJwk, PortableDid, type BearerDid } from '@web5/dids';
import { DwnDataEncodedRecordsWriteMessage, DwnInterface, DwnPermissionScope, DwnProtocolDefinition } from './types/dwn.js';
import { AgentPermissionsApi } from './permissions-api.js';
import type { Web5Agent } from './types/agent.js';
import { isRecordPermissionScope } from './dwn-api.js';
import { DwnInterfaceName, DwnMethodName } from '@tbd54566975/dwn-sdk-js';

/**
 * Sent to an OIDC server to authorize a client. Allows clients
 * to securely send authorization request parameters directly to
 * the server via POST. This avoids exposing sensitive data in URLs
 * and ensures the server validates the request before user interaction.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc9126.html | OAuth 2.0 Pushed Authorization Requests}
 */
export type PushedAuthRequest = {
  /** The JWT which contains the {@link Web5ConnectAuthRequest} */
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

/**
 * Used in decentralized apps. The SIOPv2 Auth Request is created by a client relying party (RP)
 * often a web service or an app who wants to obtain information from a provider
 * The contents of this are inserted into a JWT inside of the {@link PushedAuthRequest}.
 * @see {@link https://github.com/TBD54566975/known-customer-credential | TBD OIDC Documentation for SIOPv2 }
 */
export type SIOPv2AuthRequest = {
  /** The DID of the client (RP) */
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
  code_challenge?: string;

  /** The method used for the PKCE challenge (typically `S256`). Must be present if `code_challenge` is included. */
  code_challenge_method?: 'S256';

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
  response_mode: 'direct_post';

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

/**
 * An auth request that is compatible with both Web5 Connect and (hopefully, WIP) OIDC SIOPv2
 * The contents of this are inserted into a JWT inside of the {@link PushedAuthRequest}.
 */
export type Web5ConnectAuthRequest = {
  /** PermissionGrants that are to be sent to the provider */
  permissionRequests: ConnectPermissionRequest[];
} & SIOPv2AuthRequest;

/** The fields for an OIDC SIOPv2 Auth Repsonse */
export type SIOPv2AuthResponse = {
  /** Issuer MUST match the value of sub (Applicant's DID) */
  iss: string;
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
  /** b64url encoded nonce used to associate a Client session with an ID Token, and to
   * mitigate replay attacks. */
  nonce?: string;
  /** Custom claims. */
  [key: string]: any;
};

/** An auth response that is compatible with both Web5 Connect and (hopefully, WIP) OIDC SIOPv2 */
export type Web5ConnectAuthResponse = {
  delegateGrants: DwnDataEncodedRecordsWriteMessage[];
  delegatePortableDid: PortableDid;
} & SIOPv2AuthResponse;

/** Represents the different OIDC endpoint types.
 * 1. `pushedAuthorizationRequest`: client sends {@link PushedAuthRequest} receives {@link PushedAuthResponse}
 * 2. `authorize`: provider gets the {@link Web5ConnectAuthRequest} JWT that was stored by the PAR
 * 3. `callback`: provider sends {@link Web5ConnectAuthResponse} to this endpoint
 * 4. `token`: client gets {@link Web5ConnectAuthResponse} from this endpoint
 */
type OidcEndpoint =
  | 'pushedAuthorizationRequest'
  | 'authorize'
  | 'callback'
  | 'token';

/**
 * Gets the correct OIDC endpoint out of the {@link OidcEndpoint} options provided.
 * Handles a trailing slash on baseURL
 *
 * @param {Object} options the options object
 * @param {string} options.baseURL for example `http://foo.com/connect/
 * @param {OidcEndpoint} options.endpoint the OIDC endpoint desired
 * @param {string} options.authParam this is the unique id which must be provided when getting the `authorize` endpoint
 * @param {string} options.tokenParam this is the random state as b64url which must be provided with the `token` endpoint
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
    /** 1. client sends {@link PushedAuthRequest} & client receives {@link PushedAuthResponse} */
    case 'pushedAuthorizationRequest':
      return concatenateUrl(baseURL, 'par');
    /** 2. provider gets {@link Web5ConnectAuthRequest} */
    case 'authorize':
      if (!authParam)
        throw new Error(
          `authParam must be providied when building a token URL`
        );
      return concatenateUrl(baseURL, `authorize/${authParam}.jwt`);
    /** 3. provider sends {@link Web5ConnectAuthResponse} */
    case 'callback':
      return concatenateUrl(baseURL, `callback`);
    /**  4. client gets {@link Web5ConnectAuthResponse */
    case 'token':
      if (!tokenParam)
        throw new Error(
          `tokenParam must be providied when building a token URL`
        );
      return concatenateUrl(baseURL, `token/${tokenParam}.jwt`);
    // TODO: metadata endpoints?
    default:
      throw new Error(`No matches for endpoint specified: ${endpoint}`);
  }
}

/**
 * Generates a cryptographically random "code challenge" in
 * accordance with the RFC 7636 PKCE specification.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc7636#section-4.2 | RFC 7636 }
 */
async function generateCodeChallenge() {
  const codeVerifierBytes = CryptoUtils.randomBytes(32);
  const codeChallengeBytes = await Sha256.digest({ data: codeVerifierBytes });
  const codeChallengeBase64Url =
    Convert.uint8Array(codeChallengeBytes).toBase64Url();

  return { codeChallengeBytes, codeChallengeBase64Url };
}

/** Client creates the {@link Web5ConnectAuthRequest} */
async function createAuthRequest(
  options: RequireOnly<
    Web5ConnectAuthRequest,
    'client_id' | 'scope' | 'redirect_uri' | 'permissionRequests'
  >
) {
  // Generate a random state value to associate the authorization request with the response.
  const stateBytes = CryptoUtils.randomBytes(16);

  // Generate a random nonce value to associate the ID Token with the authorization request.
  const nonceBytes = CryptoUtils.randomBytes(16);

  const requestObject: Web5ConnectAuthRequest = {
    ...options,
    nonce           : Convert.uint8Array(nonceBytes).toBase64Url(),
    response_type   : 'id_token',
    response_mode   : 'direct_post',
    state           : Convert.uint8Array(stateBytes).toBase64Url(),
    client_metadata : {
      subject_syntax_types_supported: ['did:dht', 'did:jwk'],
    },
  };

  return requestObject;
}

/** Encrypts the auth request with the key which will be passed through QR code */
async function encryptAuthRequest({
  jwt,
  encryptionKey,
}: {
  jwt: string;
  encryptionKey: Uint8Array;
}) {
  const protectedHeader = {
    alg : 'dir',
    cty : 'JWT',
    enc : 'XC20P',
    typ : 'JWT',
  };
  const nonce = CryptoUtils.randomBytes(24);
  const additionalData = Convert.object(protectedHeader).toUint8Array();
  const jwtBytes = Convert.string(jwt).toUint8Array();
  const chacha = xchacha20poly1305(encryptionKey, nonce, additionalData);
  const ciphertextAndTag = chacha.encrypt(jwtBytes);

  /** The cipher output concatenates the encrypted data and tag
   * so we need to extract the values for use in the JWE. */
  const ciphertext = ciphertextAndTag.subarray(0, -16);
  const authenticationTag = ciphertextAndTag.subarray(-16);

  const compactJwe = [
    Convert.object(protectedHeader).toBase64Url(),
    '', // Empty string since there is no wrapped key.
    Convert.uint8Array(nonce).toBase64Url(),
    Convert.uint8Array(ciphertext).toBase64Url(),
    Convert.uint8Array(authenticationTag).toBase64Url(),
  ].join('.');

  return compactJwe;
}

/** Create a response object compatible with Web5 Connect and OIDC SIOPv2 */
async function createResponseObject(
  options: RequireOnly<
    Web5ConnectAuthResponse,
    'iss' | 'sub' | 'aud' | 'delegateGrants' | 'delegatePortableDid'
  >
) {
  const currentTimeInSeconds = Math.floor(Date.now() / 1000);

  const responseObject: Web5ConnectAuthResponse = {
    ...options,
    iat : currentTimeInSeconds,
    exp : currentTimeInSeconds + 600, // Expires in 10 minutes.
  };

  return responseObject;
}

/** sign an object and transform it into a jwt using a did */
async function signJwt({
  did,
  data,
}: {
  did: BearerDid;
  data: Record<string, unknown>;
}) {
  const header = Convert.object({
    alg : 'EdDSA',
    kid : did.document.verificationMethod![0].id,
    typ : 'JWT',
  }).toBase64Url();

  const payload = Convert.object(data).toBase64Url();

  // signs using ed25519 EdDSA
  const signer = await did.getSigner();
  const signature = await signer.sign({
    data: Convert.string(`${header}.${payload}`).toUint8Array(),
  });

  const signatureBase64Url = Convert.uint8Array(signature).toBase64Url();

  const jwt = `${header}.${payload}.${signatureBase64Url}`;

  return jwt;
}

/** Take the decrypted JWT and verify it was signed by its public DID. Return parsed object. */
async function verifyJwt({ jwt }: { jwt: string }) {
  const [headerB64U, payloadB64U, signatureB64U] = jwt.split('.');

  // Convert the header back to a JOSE object and verify that the 'kid' header value is present.
  const header: JoseHeaderParams = Convert.base64Url(headerB64U).toObject();

  if (!header.kid)
    throw new Error(
      `OIDC: Object could not be verified due to missing 'kid' header value.`
    );

  // Resolve the Client DID document.
  const { didDocument } = await DidJwk.resolve(header.kid.split('#')[0]);

  if (!didDocument)
    throw new Error(
      'OIDC: Object could not be verified due to Client DID resolution issue.'
    );

  // Get the public key used to sign the Object from the DID document.
  const { publicKeyJwk } =
    didDocument.verificationMethod?.find((method: any) => {
      return method.id === header.kid;
    }) ?? {};

  if (!publicKeyJwk)
    throw new Error(
      'OIDC: Object could not be verified due to missing public key in DID document.'
    );

  const EdDsa = new EdDsaAlgorithm();
  const isValid = await EdDsa.verify({
    key       : publicKeyJwk,
    signature : Convert.base64Url(signatureB64U).toUint8Array(),
    data      : Convert.string(`${headerB64U}.${payloadB64U}`).toUint8Array(),
  });

  if (!isValid)
    throw new Error(
      'OIDC: Object failed verification due to invalid signature.'
    );

  const object = Convert.base64Url(payloadB64U).toObject();

  return object;
}

/**
 * Fetches the {@Web5ConnectAuthRequest} from the authorize endpoint and decrypts it
 * using the encryption key passed via QR code.
 */
const getAuthRequest = async (request_uri: string, encryption_key: string) => {
  const authRequest = await fetch(request_uri);
  const jwe = await authRequest.text();
  const jwt = decryptAuthRequest({
    jwe,
    encryption_key,
  });
  const web5ConnectAuthRequest = (await verifyJwt({
    jwt,
  })) as Web5ConnectAuthRequest;

  return web5ConnectAuthRequest;
};

/** Take the encrypted JWE, decrypt using the code challenge and return a JWT string which will need to be verified */
function decryptAuthRequest({
  jwe,
  encryption_key,
}: {
  jwe: string;
  encryption_key: string;
}) {
  const [
    protectedHeaderB64U,
    ,
    nonceB64U,
    ciphertextB64U,
    authenticationTagB64U,
  ] = jwe.split('.');

  const encryptionKeyBytes = Convert.base64Url(encryption_key).toUint8Array();
  const protectedHeader = Convert.base64Url(protectedHeaderB64U).toUint8Array();
  const additionalData = protectedHeader;
  const nonce = Convert.base64Url(nonceB64U).toUint8Array();
  const ciphertext = Convert.base64Url(ciphertextB64U).toUint8Array();
  const authenticationTag = Convert.base64Url(
    authenticationTagB64U
  ).toUint8Array();

  // The cipher expects the encrypted data and tag to be concatenated.
  const ciphertextAndTag = new Uint8Array([
    ...ciphertext,
    ...authenticationTag,
  ]);
  const chacha = xchacha20poly1305(encryptionKeyBytes, nonce, additionalData);
  const decryptedJwtBytes = chacha.decrypt(ciphertextAndTag);
  const jwt = Convert.uint8Array(decryptedJwtBytes).toString();

  return jwt;
}

/**
 * The client uses to decrypt the jwe obtained from the auth server which contains
 * the {@link Web5ConnectAuthResponse} that was sent by the provider to the auth server.
 *
 * @async
 * @param {BearerDid} clientDid - The did that was initially used by the client for ECDH at connect init.
 * @param {string} jwe - The encrypted data as a jwe.
 * @param {string} pin - The pin that was obtained from the user.
 */
async function decryptAuthResponse(
  clientDid: BearerDid,
  jwe: string,
  pin: string
) {
  const [
    protectedHeaderB64U,
    ,
    nonceB64U,
    ciphertextB64U,
    authenticationTagB64U,
  ] = jwe.split('.');

  // get the delegatedid public key from the header
  const header = Convert.base64Url(protectedHeaderB64U).toObject() as Jwk;
  const delegateResolvedDid = await DidJwk.resolve(header.kid!.split('#')[0]);

  // derive ECDH shared key using the provider's public key and our clientDid private key
  const sharedKey = await Oidc.deriveSharedKey(
    clientDid,
    delegateResolvedDid.didDocument!
  );

  // add the pin to the AAD
  const additionalData = { ...header, pin: pin };
  const AAD = Convert.object(additionalData).toUint8Array();

  const nonce = Convert.base64Url(nonceB64U).toUint8Array();
  const ciphertext = Convert.base64Url(ciphertextB64U).toUint8Array();
  const authenticationTag = Convert.base64Url(
    authenticationTagB64U
  ).toUint8Array();

  // The cipher expects the encrypted data and tag to be concatenated.
  const ciphertextAndTag = new Uint8Array([
    ...ciphertext,
    ...authenticationTag,
  ]);

  // decrypt using the sharedKey
  const chacha = xchacha20poly1305(sharedKey, nonce, AAD);
  const decryptedJwtBytes = chacha.decrypt(ciphertextAndTag);
  const jwt = Convert.uint8Array(decryptedJwtBytes).toString();

  return jwt;
}

/** Derives a shared ECDH private key in order to encrypt the {@link Web5ConnectAuthResponse} */
async function deriveSharedKey(
  privateKeyDid: BearerDid,
  publicKeyDid: DidDocument
) {
  const privatePortableDid = await privateKeyDid.export();

  const publicJwk = publicKeyDid.verificationMethod?.[0].publicKeyJwk!;
  const privateJwk = privatePortableDid.privateKeys?.[0]!;
  publicJwk.alg = 'EdDSA';

  const publicX25519 = await Ed25519.convertPublicKeyToX25519({
    publicKey: publicJwk,
  });
  const privateX25519 = await Ed25519.convertPrivateKeyToX25519({
    privateKey: privateJwk,
  });

  const sharedKey = await X25519.sharedSecret({
    privateKeyA : privateX25519,
    publicKeyB  : publicX25519,
  });

  const derivedKey = await crypto.subtle.importKey(
    'raw',
    sharedKey,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );
  const derivedKeyBits = await crypto.subtle.deriveBits(
    {
      name : 'HKDF',
      hash : 'SHA-256',
      info : new Uint8Array(),
      salt : new Uint8Array(),
    },
    derivedKey,
    256
  );
  const sharedEncryptionKey = new Uint8Array(derivedKeyBits);
  return sharedEncryptionKey;
}

/**
 * Encrypts the auth response jwt. Requires a randomPin is added to the AAD of the
 * encryption algorithm in order to prevent man in the middle and eavesdropping attacks.
 * The keyid of the delegate did is used to pass the public key to the client in order
 * for the client to derive the shared ECDH private key.
 */
function encryptAuthResponse({
  jwt,
  encryptionKey,
  delegateDidKeyId,
  randomPin,
}: {
  jwt: string;
  encryptionKey: Uint8Array;
  delegateDidKeyId: string;
  randomPin: string;
}) {
  const protectedHeader = {
    alg : 'dir',
    cty : 'JWT',
    enc : 'XC20P',
    typ : 'JWT',
    kid : delegateDidKeyId,
  };
  const nonce = CryptoUtils.randomBytes(24);
  const additionalData = Convert.object({
    ...protectedHeader,
    pin: randomPin,
  }).toUint8Array();

  const jwtBytes = Convert.string(jwt).toUint8Array();
  const chacha = xchacha20poly1305(encryptionKey, nonce, additionalData);
  const ciphertextAndTag = chacha.encrypt(jwtBytes);

  /** The cipher output concatenates the encrypted data and tag
   * so we need to extract the values for use in the JWE. */
  const ciphertext = ciphertextAndTag.subarray(0, -16);
  const authenticationTag = ciphertextAndTag.subarray(-16);

  const compactJwe = [
    Convert.object(protectedHeader).toBase64Url(),
    '', // Empty string since there is no wrapped key.
    Convert.uint8Array(nonce).toBase64Url(),
    Convert.uint8Array(ciphertext).toBase64Url(),
    Convert.uint8Array(authenticationTag).toBase64Url(),
  ].join('.');

  return compactJwe;
}

function shouldUseDelegatePermission(scope: DwnPermissionScope): boolean {
  // Currently all record permissions are treated as delegated permissions
  // In the future only methods that modify state will be delegated and the rest will be normal permissions
  if (isRecordPermissionScope(scope)) {
    return true;
  } else if (scope.interface === DwnInterfaceName.Protocols && scope.method === DwnMethodName.Configure) {
    // ProtocolConfigure messages are also delegated, as they modify state
    return true;
  }

  // All other permissions are not treated as delegated
  return false;
}

/**
 * Creates the permission grants that assign to the selectedDid the level of
 * permissions that the web app requested in the {@link Web5ConnectAuthRequest}
 */
async function createPermissionGrants(
  selectedDid: string,
  delegateBearerDid: BearerDid,
  agent: Web5Agent,
  scopes: DwnPermissionScope[],
) {
  const permissionsApi = new AgentPermissionsApi({ agent });

  // TODO: cleanup all grants if one fails by deleting them from the DWN: https://github.com/TBD54566975/web5-js/issues/849
  const permissionGrants = await Promise.all(
    scopes.map((scope) => {
      // check if the scope is a records permission scope, or a protocol configure scope, if so it should use a delegated permission.
      const delegated = shouldUseDelegatePermission(scope);
      return permissionsApi.createGrant({
        delegated,
        store       : true,
        grantedTo   : delegateBearerDid.uri,
        scope,
        dateExpires : '2040-06-25T16:09:16.693356Z', // TODO: make dateExpires optional
        author      : selectedDid,
      });
    })
  );

  const messagePromises = permissionGrants.map(async (grant) => {
    // Quirk: we have to pull out encodedData out of the message the schema validator doesn't want it there
    const { encodedData, ...rawMessage } = grant.message;

    const data = Convert.base64Url(encodedData).toUint8Array();
    const { reply } = await agent.sendDwnRequest({
      author      : selectedDid,
      target      : selectedDid,
      messageType : DwnInterface.RecordsWrite,
      dataStream  : new Blob([data]),
      rawMessage,
    });

    // check if the message was sent successfully, if the remote returns 409 the message may have come through already via sync
    if (reply.status.code !== 202 && reply.status.code !== 409) {
      throw new Error(
        `Could not send the message. Error details: ${reply.status.detail}`
      );
    }

    return grant.message;
  });

  const messages = await Promise.all(messagePromises);

  return messages;
}

/**
 * Installs the protocol required by the Client on the Provider if it doesn't already exist.
 */
async function prepareProtocol(
  selectedDid: string,
  agent: Web5Agent,
  protocolDefinition: DwnProtocolDefinition
): Promise<void> {

  const queryMessage = await agent.processDwnRequest({
    author        : selectedDid,
    messageType   : DwnInterface.ProtocolsQuery,
    target        : selectedDid,
    messageParams : { filter: { protocol: protocolDefinition.protocol } },
  });

  if ( queryMessage.reply.status.code !== 200) {
    // if the query failed, throw an error
    throw new Error(
      `Could not fetch protocol: ${queryMessage.reply.status.detail}`
    );
  } else if (queryMessage.reply.entries === undefined || queryMessage.reply.entries.length === 0) {

    // send the protocol definition to the remote DWN first, if it passes we can process it locally
    const { reply: sendReply, message: configureMessage } = await agent.sendDwnRequest({
      author        : selectedDid,
      target        : selectedDid,
      messageType   : DwnInterface.ProtocolsConfigure,
      messageParams : { definition: protocolDefinition },
    });

    // check if the message was sent successfully, if the remote returns 409 the message may have come through already via sync
    if (sendReply.status.code !== 202 && sendReply.status.code !== 409) {
      throw new Error(`Could not send protocol: ${sendReply.status.detail}`);
    }

    // process the protocol locally, we don't have to check if it exists as this is just a convenience over waiting for sync.
    await agent.processDwnRequest({
      author      : selectedDid,
      target      : selectedDid,
      messageType : DwnInterface.ProtocolsConfigure,
      rawMessage  : configureMessage
    });

  } else {

    // the protocol already exists, let's make sure it exists on the remote DWN as the requesting app will need it
    const configureMessage = queryMessage.reply.entries![0];
    const { reply: sendReply } = await agent.sendDwnRequest({
      author      : selectedDid,
      target      : selectedDid,
      messageType : DwnInterface.ProtocolsConfigure,
      rawMessage  : configureMessage,
    });

    if (sendReply.status.code !== 202 && sendReply.status.code !== 409) {
      throw new Error(`Could not send protocol: ${sendReply.status.detail}`);
    }
  }
}

/**
 * Creates a delegate did which the web app will use as its future indentity.
 * Assigns to that DID the level of permissions that the web app requested in
 * the {@link Web5ConnectAuthRequest}. Encrypts via ECDH key that the web app
 * will have access to because the web app has the public key which it provided
 * in the {@link Web5ConnectAuthRequest}. Then sends the ciphertext of this
 * {@link Web5ConnectAuthResponse} to the callback endpoint. Which the
 * web app will need to retrieve from the token endpoint and decrypt with the pin to access.
 */
async function submitAuthResponse(
  selectedDid: string,
  authRequest: Web5ConnectAuthRequest,
  randomPin: string,
  agent: Web5Agent
) {
  const delegateBearerDid = await DidJwk.create();
  const delegatePortableDid = await delegateBearerDid.export();

  // TODO: roll back permissions and protocol configurations if an error occurs. Need a way to delete protocols to achieve this.
  const delegateGrantPromises = authRequest.permissionRequests.map(
    async (permissionRequest) => {
      const { protocolDefinition, permissionScopes } = permissionRequest;

      // We validate that all permission scopes match the protocol uri of the protocol definition they are provided with.
      const grantsMatchProtocolUri = permissionScopes.every(scope => 'protocol' in scope && scope.protocol === protocolDefinition.protocol);
      if (!grantsMatchProtocolUri) {
        throw new Error('All permission scopes must match the protocol uri they are provided with.');
      }

      await prepareProtocol(selectedDid, agent, protocolDefinition);

      const permissionGrants = await Oidc.createPermissionGrants(
        selectedDid,
        delegateBearerDid,
        agent,
        permissionScopes
      );

      return permissionGrants;
    }
  );

  const delegateGrants = (await Promise.all(delegateGrantPromises)).flat();

  const responseObject = await Oidc.createResponseObject({
    //* the IDP's did that was selected to be connected
    iss   : selectedDid,
    //* the client's new identity
    sub   : delegateBearerDid.uri,
    //* the client's temporary ephemeral did used for connect
    aud   : authRequest.client_id,
    //* the nonce of the original auth request
    nonce : authRequest.nonce,
    delegateGrants,
    delegatePortableDid,
  });

  // Sign the Response Object using the ephemeral DID's signing key.
  const responseObjectJwt = await Oidc.signJwt({
    did  : delegateBearerDid,
    data : responseObject,
  });
  const clientDid = await DidJwk.resolve(authRequest.client_id);

  const sharedKey = await Oidc.deriveSharedKey(
    delegateBearerDid,
    clientDid?.didDocument!
  );

  const encryptedResponse = Oidc.encryptAuthResponse({
    jwt              : responseObjectJwt!,
    encryptionKey    : sharedKey,
    delegateDidKeyId : delegateBearerDid.document.verificationMethod![0].id,
    randomPin,
  });

  const formEncodedRequest = new URLSearchParams({
    id_token : encryptedResponse,
    state    : authRequest.state,
  }).toString();

  await fetch(authRequest.redirect_uri, {
    body    : formEncodedRequest,
    method  : 'POST',
    headers : {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
}

export const Oidc = {
  createAuthRequest,
  encryptAuthRequest,
  getAuthRequest,
  decryptAuthRequest,
  createPermissionGrants,
  createResponseObject,
  encryptAuthResponse,
  decryptAuthResponse,
  deriveSharedKey,
  signJwt,
  verifyJwt,
  buildOidcUrl,
  generateCodeChallenge,
  submitAuthResponse,
};
