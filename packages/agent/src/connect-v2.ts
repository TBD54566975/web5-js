import { Oidc, type PushedAuthResponse } from './oidc-v2.js';
import { type Web5PlatformAgent } from './types/agent.js';
import { pollWithTTL } from './utils.js';

type ClientWalletConnectOptions = {
  /** The client app DID public key to connect to the wallet */
  clientDid: string;
  /** URL of the connect server */
  baseURL: string;
  /** An optional webpage providing information about the client */
  client_uri?: string;
  /** PermissionRequest for the Identity Provider (provider will respond with PermissionGrants) */
  permissionRequests: string[];
  /** An instance of a Web5 agent used for getting keys and signing with them */
  agent: Web5PlatformAgent;
};

/**
 * Description placeholder
 *
 * @async
 * @param {Object} options The options object
 * @param {string} options.clientDid The client app DID public key to connect to the wallet
 * @param {string} options.baseURL The URL of the connect server
 * @param {string[]} options.permissionRequests The PermissionRequests for the Identity Provider (Provider will respond with PermissionGrants)
 * @param {string} options.client_uri An optional webpage providing information about the client
 * @param {Web5PlatformAgent} options.agent An instance of a Web5 agent used for getting keys and signing with them
 */
async function init({
  clientDid,
  baseURL,
  permissionRequests,
  client_uri,
  agent,
}: ClientWalletConnectOptions) {
  /** bifurcated desktop flow disabled, possibly permanently */
  // if (!provider.authorizationEndpoint.startsWith("web5:")) {
  //   baseURL = provider.authorizationEndpoint;
  // }

  // Hash the code verifier to use as a code challenge and to encrypt the Request Object.
  const { codeVerifieru8a } =
    Oidc.generateRandomCodeVerifier();

  // Derive the code challenge based on the code verifier
  const { codeChallengeu8a, codeChallengeb64url } =
    await Oidc.deriveCodeChallenge(codeVerifieru8a);

  // get callback buildOidcUrl to pass into the connect auth request
  const callbackEndpoint = Oidc.buildOidcUrl({ baseURL, endpoint: 'callback' });

  // build the PAR request
  const request = await Oidc.createAuthRequest({
    client_id             : callbackEndpoint,
    scope                 : 'web5', // TODO: clear with frank
    code_challenge        : codeChallengeb64url,
    code_challenge_method : 'S256',
    permission_requests   : permissionRequests,
    redirect_uri          : callbackEndpoint,
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
    baseURL,
    endpoint: 'pushedAuthorizationRequest',
  });

  const postPar = await pollWithTTL<PushedAuthResponse>(() =>
    fetch(pushedAuthorizationRequestEndpoint, {
      body    : formEncodedRequest,
      method  : 'POST',
      headers : {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
  );

  if (postPar?.request_uri) {
    // pass the link back
  }

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
}

export const ClientWalletConnect = { init };
