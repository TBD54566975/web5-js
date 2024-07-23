import { utils } from '@web5/crypto';
import { DwnProtocolDefinition, DwnRecordsPermissionScope } from './index.js';
import {
  Web5ConnectAuthResponse,
  Oidc,
  type PushedAuthResponse,
} from './oidc-v2.js';
import { pollWithTtl } from './utils.js';
import { Convert } from '@web5/common';
import { DidDht } from '@web5/dids';

async function initClient({
  connectServerUrl,
  walletUri,
  permissionRequests,
  onWalletUriReady,
  validatePin,
}: WalletConnectOptions) {
  // ephemeral client did for ECDH, signing, verification
  // TODO: use separate keys for ECDH vs. sign/verify. could maybe use secp256k1.
  const clientDid = await DidDht.create();

  // Hash the code verifier to use as a code challenge and to encrypt the Request Object.
  const { codeVerifierBytes } = Oidc.generateRandomCodeVerifier();

  // Derive the code challenge based on the code verifier
  const { codeChallengeBytes, codeChallengeBase64Url } =
    await Oidc.deriveCodeChallenge(codeVerifierBytes);

  // build callback URL to pass into the auth request
  const callbackEndpoint = Oidc.buildOidcUrl({
    baseURL  : connectServerUrl,
    endpoint : 'callback',
  });

  // build the PAR request
  const request = await Oidc.createAuthRequest({
    client_id             : clientDid.uri,
    scope                 : 'web5', // TODO: clear with frank
    code_challenge        : codeChallengeBase64Url,
    code_challenge_method : 'S256',
    permissionRequests    : permissionRequests,
    redirect_uri          : callbackEndpoint,
    // TBD known-customer-credential defines these
    client_metadata       : {
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
  // Encrypt the Request Object JWT using the code challenge.
  const requestObjectJwe = await Oidc.encryptAuthRequest({
    jwt           : requestJwt,
    codeChallenge : codeChallengeBytes,
  });

  // Convert the encrypted Request Object to URLSearchParams for form encoding.
  const formEncodedRequest = new URLSearchParams({ request: requestObjectJwe });

  const pushedAuthorizationRequestEndpoint = Oidc.buildOidcUrl({
    baseURL  : connectServerUrl,
    endpoint : 'pushedAuthorizationRequest',
  });


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
  const generatedWalletUri = new URL(walletUri);
  generatedWalletUri.searchParams.set('request_uri', parData.request_uri);
  generatedWalletUri.searchParams.set('code_challenge', codeChallengeBase64Url);

  // call user's callback so they can send the URI to the wallet as they see fit
  onWalletUriReady(generatedWalletUri.toString());

  // subscribe to receiving a response from the wallet with default TTL
  const tokenUrl = Oidc.buildOidcUrl({
    baseURL    : connectServerUrl,
    endpoint   : 'token',
    tokenParam : request.state,
  });

  /** ciphertext of {@link Web5ConnectAuthResponse} */
  const authResponse = await pollWithTtl(() => fetch(tokenUrl));

  if (authResponse) {
    const jwe = await authResponse?.text();

    // get the pin from the user and use it as AAD to decrypt
    const pin = await validatePin();
    const jwt = await Oidc.decryptAuthResponse(clientDid, jwe, pin);
    const verifiedAuthResponse = (await Oidc.verifyJwt({
      jwt,
    })) as Web5ConnectAuthResponse;

    // return the grants for liran to ingest into the DWN SDK / agent
    return {
      delegatedGrants : verifiedAuthResponse.delegatedGrants,
      didToImport     : [{
        didUri         : verifiedAuthResponse.aud,
        privateKeyJwks : verifiedAuthResponse.privateKeyJwks
      }]
    };
  }
}

/**
 * Initiates the wallet connect process. Used when the app (client) wants to import
 * a delegated identity DID from a wallet (provider).
 */
export type WalletConnectOptions = {
  /** The URL of the intermediary server which relays messages between the client and provider */
  connectServerUrl: string;

  /**
   * The URI of the Provider (wallet).The `onWalletUriReady` will take this wallet
   * uri and add a payload to it which will be used to obtain and decrypt from the `request_uri`.
   * @example `web5://` or `http://localhost:3000/`.
   */
  walletUri: string;

  /**
   * The protocols of permissions requested, along with the definition and
   * permission scopes for each protocol. The key is the protocol URL and
   * the value is an object with the protocol definition and the permission scopes.
   */
  permissionRequests: ConnectPermissionRequests;

  /**
   * The Web5 API provides a URI to the wallet based on the `walletUri` plus a query params payload valid for 5 minutes.
   * The link can either be used as a deep link on the same device or a QR code for cross device or both.
   * The query params are `{ request_uri: string; code_challenge: string; }`
   * The wallet will use the `request_uri to contact the intermediary server's `authorize` endpoint
   * and pull down the {@link Web5ConnectAuthRequest} and use the `code_challenge` to decrypt it.
   *
   * @param uri - The URI returned by the web5 connect API to be passed to a provider.
   */
  onWalletUriReady: (uri: string) => void;

  /**
   * Function that must be provided to submit the pin entered by the user on the client.
   * The pin is used to decrypt the {@link Web5ConnectAuthResponse} that was retrieved from the
   * token endpoint by the client inside of web5 connect.
   *
   * @returns A promise that resolves to the PIN as a string.
   */
  validatePin: () => Promise<string>;
};

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

export const WalletConnect = { initClient };
