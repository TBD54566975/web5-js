import { utils } from '@web5/crypto';
import { DwnProtocolDefinition, DwnRecordsPermissionScope } from './index.js';
import {
  HybridAuthResponse,
  Oidc,
  type PushedAuthResponse,
} from './oidc-v2.js';
import { pollWithTTL } from './utils.js';
import { Convert } from '@web5/common';
import { DidDht } from '@web5/dids';

/**
 * The protocols of permissions requested, along with the definition and permission scopes for each protocol.
 * The key is the protocol URL and the value is an object with the protocol definition and the permission scopes.
 */
export type ConnectPermissionRequests = Record<
  string,
  {
    /**
     * The definition of the protocol the permissions are being requested for.
     * In the event that the protocol is not already installed, the wallet will install this given protocol definition.
     */
    protocolDefinition: DwnProtocolDefinition;

    /** The scope of the permissions being requested for the given protocol */
    permissionScopes: DwnRecordsPermissionScope[];
  }
>;

type InitClientOptions = {
  /** URL of the connect server */
  connectServerUrl: string;
  /** An optional webpage providing information about the client */
  client_uri?: string;
  /** PermissionRequest for the Identity Provider (provider will respond with PermissionGrants) */
  permissionRequests: ConnectPermissionRequests;
  /** Provides the URI to the client  */
  onUriReady: (uri: string) => void;
  /** The user provided pin obtained asyncronously from the client */
  pinCapture: () => Promise<string>;
};

/**
 * Initializes the Web5 Wallet Connect flow on behalf of the client (dwa). Stays valid for 5 minutes.
 *
 * @async
 * @param {Object} options The options object
 * @param {string} options.connectServerUrl URL of the connect server
 * @param {ConnectPermissionRequests} options.permissionRequests PermissionRequest for the Identity Provider (provider will respond with PermissionGrants)
 * @param {string} options.client_uri An optional webpage providing information about the client
 * @param {Web5PlatformAgent} options.agent An instance of a Web5 agent used for getting keys and signing with them
 */
async function initClient({
  connectServerUrl,
  permissionRequests,
  client_uri,
  onUriReady,
  pinCapture,
}: InitClientOptions) {
  // ephemeral client did for ECDH, signing, verification
  // TODO: use separate keys for ECDH vs. sign/verify. could maybe use secp256k1.
  const clientDid = await DidDht.create();

  // Hash the code verifier to use as a code challenge and to encrypt the Request Object.
  const { codeVerifieru8a } = Oidc.generateRandomCodeVerifier();

  // Derive the code challenge based on the code verifier
  const { codeChallengeu8a, codeChallengeb64url } =
    await Oidc.deriveCodeChallenge(codeVerifieru8a);

  // build callback URL to pass into the auth request
  const callbackEndpoint = Oidc.buildOidcUrl({
    baseURL  : connectServerUrl,
    endpoint : 'callback',
  });

  // build the PAR request
  const request = await Oidc.createAuthRequest({
    client_id             : callbackEndpoint,
    scope                 : 'web5', // TODO: clear with frank
    code_challenge        : codeChallengeb64url,
    code_challenge_method : 'S256',
    permission_requests   : permissionRequests,
    redirect_uri          : callbackEndpoint,
    // known customer credential defines these
    client_metadata       : {
      client_uri,
      subject_syntax_types_supported: ['did:dht'],
    },
  });

  // Sign the Request Object using the Client DID's signing key.
  const requestJwt = await Oidc.signJwt({
    did  : clientDid,
    data : request,
  });

  if (!requestJwt) {
    throw new Error('Unable to sign requestObject');
  }

  // Encryption nonce
  const nonce = utils.randomBytes(24);

  // Encrypt the Request Object JWT using the code challenge.
  const requestObjectJwe = await Oidc.encryptAuthRequest({
    jwt           : requestJwt,
    codeChallenge : codeChallengeu8a,
    nonce,
  });

  // Convert the encrypted Request Object to URLSearchParams for form encoding.
  const formEncodedRequest = new URLSearchParams({ request: requestObjectJwe });

  const pushedAuthorizationRequestEndpoint = Oidc.buildOidcUrl({
    baseURL  : connectServerUrl,
    endpoint : 'pushedAuthorizationRequest',
  });

  try {
    const parResponse = await fetch(pushedAuthorizationRequestEndpoint, {
      body    : formEncodedRequest,
      method  : 'POST',
      headers : {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    if (!parResponse.ok) {
      throw new Error(`${parResponse.status}: ${parResponse.statusText}`);
    }

    const parData: PushedAuthResponse = await parResponse.json();

    // a deeplink to a web5 compatible wallet. if the wallet scans this link it should receive
    // a route to its web5 connect provider flow and the params of where to fetch the auth request.
    const walletURI = new URL('web5://connect/');
    walletURI.searchParams.set(
      'nonce',
      Convert.uint8Array(nonce).toBase64Url()
    );
    walletURI.searchParams.set('request_uri', parData.request_uri);
    walletURI.searchParams.set('client_did', clientDid.uri);
    walletURI.searchParams.set('code_challenge', codeChallengeb64url);

    // call user's callback so they can send the URI to the wallet as they see fit
    onUriReady(walletURI.toString());

    // subscribe to receiving a response from the wallet with default TTL
    const tokenURL = Oidc.buildOidcUrl({
      baseURL    : connectServerUrl,
      endpoint   : 'token',
      tokenParam : request.state,
    });

    /** ciphertext of {@link HybridAuthResponse} */
    const authResponse = await pollWithTTL(() => fetch(tokenURL));

    if (authResponse) {
      const jwe = await authResponse?.text();

      // get the pin from the user and use it as AAD to decrypt
      const pin = await pinCapture();
      const jwt = await Oidc.decryptAuthResponse(clientDid, jwe, pin);
      const verifiedAuthResponse = (await Oidc.verifyJwt({
        jwt,
      })) as HybridAuthResponse;

      // return the grants for liran to
      console.log(verifiedAuthResponse);
    }
  } catch (e) {
    console.error(e);
  }
}

export const WalletConnect = { initClient };
