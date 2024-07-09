import { DwnProtocolDefinition, DwnRecordsPermissionScope } from './index.js';
import {
  HybridAuthResponse,
  Oidc,
  type PushedAuthResponse,
} from './oidc-v2.js';
import { type Web5PlatformAgent } from './types/agent.js';
import { pollWithTTL } from './utils.js';

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

type ClientWalletConnectOptions = {
  /** The client app DID public key to connect to the wallet */
  clientDid: string;
  /** URL of the connect server */
  connectServerUrl: string;
  /** An optional webpage providing information about the client */
  client_uri?: string;
  /** PermissionRequest for the Identity Provider (provider will respond with PermissionGrants) */
  permissionRequests: ConnectPermissionRequests;
  /** An instance of a Web5 agent used for getting keys and signing with them */
  agent: Web5PlatformAgent;
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
 * @param {string} options.clientDid The client app DID public key to connect to the wallet
 * @param {string} options.connectServerUrl URL of the connect server
 * @param {ConnectPermissionRequests} options.permissionRequests PermissionRequest for the Identity Provider (provider will respond with PermissionGrants)
 * @param {string} options.client_uri An optional webpage providing information about the client
 * @param {Web5PlatformAgent} options.agent An instance of a Web5 agent used for getting keys and signing with them
 */
async function init({
  clientDid,
  connectServerUrl,
  permissionRequests,
  client_uri,
  agent,
  onUriReady,
  pinCapture
}: ClientWalletConnectOptions) {
  /** bifurcated desktop flow disabled, possibly permanently */
  // if (!provider.authorizationEndpoint.startsWith("web5:")) {
  //   connectServerUrl = provider.authorizationEndpoint;
  // }

  // Hash the code verifier to use as a code challenge and to encrypt the Request Object.
  const { codeVerifieru8a } =
    Oidc.generateRandomCodeVerifier();

  // Derive the code challenge based on the code verifier
  const { codeChallengeu8a, codeChallengeb64url } =
    await Oidc.deriveCodeChallenge(codeVerifieru8a);

  // build callback URL to pass into the auth request
  const callbackEndpoint = Oidc.buildOidcUrl({ baseURL: connectServerUrl, endpoint: 'callback' });

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

  // Get the signingMethod for the clientDid
  const signingMethod = await agent.did.getSigningMethod({ didUri: clientDid });

  if (!signingMethod?.publicKeyJwk || !signingMethod?.id) {
    throw new Error('Unable to determine client signing key ID.');
  }

  // get the URI in the KMS
  const keyUri = await agent.keyManager.getKeyUri({
    key: signingMethod.publicKeyJwk,
  });

  // Sign the Request Object using the Client DID's signing key.
  const requestJwt = await Oidc.signRequestObject({
    keyId: signingMethod.id,
    keyUri,
    request,
    agent,
  });

  if (!requestJwt) {
    throw new Error('Unable to sign requestObject');
  }

  // Encrypt the Request Object JWT using the code challenge.
  const requestObjectJwe = await Oidc.encryptRequestJwt({
    jwt           : requestJwt,
    codeChallenge : codeChallengeu8a,
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

    // a universal link to a web5 compatible wallet. if the wallet scans this link it should receive
    // a route to its web5 connect provider flow and the params of where to fetch the auth request.
    const walletURI = new URL('https://tbd54566975.github.io/connect/');
    walletURI.searchParams.set('code_challenge', codeChallengeb64url);
    walletURI.searchParams.set('request_uri', parData.request_uri);

    // call user's callback so they can send the URI to the wallet as they see fit
    onUriReady(walletURI.toString());

    // subscribe to receiving a response from the wallet with default TTL
    const tokenURL = Oidc.buildOidcUrl({
      baseURL    : connectServerUrl,
      endpoint   : 'token',
      tokenParam : request.state,
    });

    /** ciphertext of {@link HybridAuthResponse} */
    const authResponse = await pollWithTTL<string>(() =>
      fetch(tokenURL)
    );

    if (authResponse) {
      const userPin = await pinCapture();

      // decrypt response using pin
    }

    console.log('authResponse', authResponse);
  } catch (e) {
    console.error('Could not generate connect link');
  }
}

export const ClientWalletConnect = { init };
