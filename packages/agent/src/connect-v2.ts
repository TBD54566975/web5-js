// connectv2
import { DidDht, DidJwk, DidMethod, UniversalResolver } from "@web5/dids";
import { oidc } from "./oidc-v2.js";
import { appendPathToUrl, pollWithTTL } from "./utils.js";
import { Web5PlatformAgent } from "./types/agent.js";
import { Convert } from "@web5/common";
import { Sha256, utils } from "@web5/crypto";
import { AgentDidApi } from "./did-api.js";
import { PermissionScope, PermissionConditions } from "@tbd54566975/dwn-sdk-js";

// dApp: sends PAR to connect server
// connect server: accepts PAR, responds with connect endpoint
// dApp: gets back connect endpoint from connect server. provides OIDC params plus claims in a deep link (QR code).
// wallet: scan deep link
// wallet: display permission UI

// TODO: lifted from dwn-sdk-js. expose it from dwn-sdk-js.
/**
 * Type for the data payload of a permission grant message.
 */
type PermissionGrantData = {
  /**
   * Optional string that communicates what the grant would be used for
   */
  description?: string;

  /**
   * Optional CID of a permission request. This is optional because grants may be given without being officially requested
   * */
  requestId?: string;

  /**
   * Timestamp at which this grant will no longer be active.
   */
  dateExpires: string;

  /**
   * Whether this grant is delegated or not. If `true`, the `grantedTo` will be able to act as the `grantedTo` within the scope of this grant.
   */
  delegated?: boolean;

  /**
   * The scope of the allowed access.
   */
  scope: PermissionScope;

  conditions?: PermissionConditions;
};

interface CreateClientOptions {
  /** The DID provided by the connecting app used to sign and encrypt requests and responses. */
  clientDid: string;
  /** The base URL of the server that requests and responses will be relayed through if the
   * Identity Provider's authorization endpoint is not directly accessible. */
  connectEndpoint: string;
  /** The origin of the connecting app. */
  origin: string;
  /** The delegation request(s) to be granted by the Identity Provider. */
  delegationGrantRequest: {
    permissionsRequests: any[];
  };
  agent: Web5PlatformAgent;
}

export const connectClient = async ({
  clientDid,
  connectEndpoint,
  delegationGrantRequest,
  origin,
  agent,
}: CreateClientOptions) => {
  const connectRoutes = oidc.buildRoutes(connectEndpoint);
  /** bifurcated desttop flow disabled, possibly permanently */
  // if (!provider.authorizationEndpoint.startsWith("web5:")) {
  //   connectEndpoint = provider.authorizationEndpoint;
  // }

  // Hash the code verifier to use as a code challenge and to encrypt the Request Object.
  const { codeVerifieru8a, codeVerifierb64url } =
    oidc.generateRandomCodeVerifier();

  // TODO: figure out what this should be
  const redirectUri = "http://localhost:8080/connect/sessions";

  const mockDelegationGrants = ["foo", "bar"] as any;

  // build the PAR request
  const request = await oidc.createRequestObject({
    client_id: redirectUri,
    claims: { id_token: { delegation_grants: mockDelegationGrants } },
    scope: "web5", // TODO?
    client_metadata: { client_uri: origin },
    code_verifier: codeVerifierb64url,
    delegation_grant_request: delegationGrantRequest,
    redirect_uri: redirectUri,
  });

  // Hash the code verifier to use as a code challenge and to encrypt the Request Object.
  const codeChallenge = await oidc.deriveCodeChallenge(codeVerifieru8a);

  // Get the signingMethod for the clientDid
  const signingMethod = await agent.did.getSigningMethod({ didUri: clientDid });

  if (!signingMethod?.publicKeyJwk || !signingMethod?.id) {
    throw new Error(
      "ConnectProtocol: Unable to determine Client signing key ID."
    );
  }

  const keyId = signingMethod.id;

  // get the URI in the KMS
  const keyUri = await agent.keyManager.getKeyUri({
    key: signingMethod.publicKeyJwk,
  });

  // Sign the Request Object using the Client DID's signing key.
  const requestJwt = await oidc.signRequestObject({
    keyId,
    keyUri,
    request,
    agent,
  });

  if (!requestJwt) {
    throw new Error("Unable to sign requestObject");
  }

  // Encrypt the Request Object JWT using the code challenge.
  const requestObjectJwe = await oidc.encryptRequestJwt({
    jwt: requestJwt,
    codeChallenge,
  });

  // Convert the encrypted Request Object to URLSearchParams for form encoding.
  const formEncodedRequest = new URLSearchParams({ request: requestObjectJwe });

  const postPar = await pollWithTTL<string>(() =>
    fetch(connectRoutes.pushedAuthorizationRequestEndpoint, {
      body: formEncodedRequest,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    })
  );

  //! we can test up until here

  // !fix: separate this code
  /** Define the Authorization Request that will be transmitted to the Identity Provider
   * to initiate the authorization process. */
  // const authorizationRequestUrl = new URL(oidcEndpoints.authorizationEndpoint);
  // authorizationRequestUrl.searchParams.set("code_challenge", codeVerifier);
  // authorizationRequestUrl.searchParams.set("request_uri", request_uri);

  // Push the encrypted Request Object to the Identity Provider.

  // HERE
  // channel.send({
  //   data: formEncodedRequest,
  //   url: provider.pushedAuthorizationRequestEndpoint,
  // });

  // generateRequestedPermissions();
  // generateDeepLink();
  // startDwnServer();
  // pollToDwnServer();
};

// connectProvider();

export interface IdentityProvider {
  authorizationEndpoint: string;
  pushedAuthorizationRequestEndpoint: string;
}

export interface IdTokenClaims {
  // should be of type PermissionGrant[]?
  delegation_grants: PermissionGrantData;
  [key: string]: any;
}

export const SiopIssuerIdentifier = {
  SELF_ISSUED_V1: "https://self-issued.me",
  SELF_ISSUED_V2: "https://self-issued.me/v2",
} as const;

export interface AuthorizationRequestObject {
  claims?: { id_token: IdTokenClaims };
  client_id: string;
  client_metadata?: { client_uri?: string; [key: string]: any };
  code_verifier?: string;
  nonce: string;
  redirect_uri: string;
  state?: string;

  [key: string]: any;
}

export interface AuthorizationResponseObject {
  /** Issuer Identifier for the Issuer of the response. */
  iss: typeof SiopIssuerIdentifier | string;
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
}
