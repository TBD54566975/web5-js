
import type { PushedAuthResponse } from './oidc.js';
import type { DwnPermissionScope, DwnProtocolDefinition, Web5Agent, Web5ConnectAuthResponse } from './index.js';

import {
  Oidc,
} from './oidc.js';
import { pollWithTtl } from './utils.js';

import { Convert } from '@web5/common';
import { CryptoUtils } from '@web5/crypto';
import { DidJwk } from '@web5/dids';
import { DwnInterfaceName, DwnMethodName } from '@tbd54566975/dwn-sdk-js';

/**
 * Initiates the wallet connect process. Used when a client wants to obtain
 * a did from a provider.
 */
async function initClient({
  connectServerUrl,
  walletUri,
  permissionRequests,
  onWalletUriReady,
  validatePin,
}: WalletConnectOptions) {
  // ephemeral client did for ECDH, signing, verification
  // TODO: use separate keys for ECDH vs. sign/verify. could maybe use secp256k1.
  const clientDid = await DidJwk.create();

  // TODO: properly implement PKCE. this implementation is lacking server side validations and more.
  // https://github.com/TBD54566975/web5-js/issues/829
  // Derive the code challenge based on the code verifier
  // const { codeChallengeBytes, codeChallengeBase64Url } =
  //   await Oidc.generateCodeChallenge();
  const encryptionKey = CryptoUtils.randomBytes(32);

  // build callback URL to pass into the auth request
  const callbackEndpoint = Oidc.buildOidcUrl({
    baseURL  : connectServerUrl,
    endpoint : 'callback',
  });

  // build the PAR request
  const request = await Oidc.createAuthRequest({
    client_id          : clientDid.uri,
    scope              : 'openid did:jwk',
    // code_challenge        : codeChallengeBase64Url,
    // code_challenge_method : 'S256',
    permissionRequests : permissionRequests,
    redirect_uri       : callbackEndpoint,
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
    jwt: requestJwt,
    encryptionKey,
  });

  // Convert the encrypted Request Object to URLSearchParams for form encoding.
  const formEncodedRequest = new URLSearchParams({
    request: requestObjectJwe,
  });

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
  generatedWalletUri.searchParams.set(
    'encryption_key',
    Convert.uint8Array(encryptionKey).toBase64Url()
  );

  // call user's callback so they can send the URI to the wallet as they see fit
  onWalletUriReady(generatedWalletUri.toString());

  const tokenUrl = Oidc.buildOidcUrl({
    baseURL    : connectServerUrl,
    endpoint   : 'token',
    tokenParam : request.state,
  });

  // subscribe to receiving a response from the wallet with default TTL. receive ciphertext of {@link Web5ConnectAuthResponse}
  const authResponse = await pollWithTtl(() => fetch(tokenUrl));

  if (authResponse) {
    const jwe = await authResponse?.text();

    // get the pin from the user and use it as AAD to decrypt
    const pin = await validatePin();
    const jwt = await Oidc.decryptAuthResponse(clientDid, jwe, pin);
    const verifiedAuthResponse = (await Oidc.verifyJwt({
      jwt,
    })) as Web5ConnectAuthResponse;

    return {
      delegateGrants      : verifiedAuthResponse.delegateGrants,
      delegatePortableDid : verifiedAuthResponse.delegatePortableDid,
      connectedDid        : verifiedAuthResponse.iss,
    };
  }
}

/**
 * Initiates the wallet connect process. Used when a client wants to obtain
 * a did from a provider.
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
  permissionRequests: ConnectPermissionRequest[];

  /**
   * The Web5 API provides a URI to the wallet based on the `walletUri` plus a query params payload valid for 5 minutes.
   * The link can either be used as a deep link on the same device or a QR code for cross device or both.
   * The query params are `{ request_uri: string; encryption_key: string; }`
   * The wallet will use the `request_uri to contact the intermediary server's `authorize` endpoint
   * and pull down the {@link Web5ConnectAuthRequest} and use the `encryption_key` to decrypt it.
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
 */
export type ConnectPermissionRequest = {
  /**
   * The definition of the protocol the permissions are being requested for.
   * In the event that the protocol is not already installed, the wallet will install this given protocol definition.
   */
  protocolDefinition: DwnProtocolDefinition;

  /** The scope of the permissions being requested for the given protocol */
  permissionScopes: DwnPermissionScope[];
};

/**
 * Shorthand for the types of permissions that can be requested.
 */
export type Permission = 'write' | 'read' | 'delete' | 'query' | 'subscribe' | 'configure';

/**
 * The options for creating a permission request for a given protocol.
 */
export type ProtocolPermissionOptions = {
  /** The protocol definition for the protocol being requested */
  definition: DwnProtocolDefinition;

  /** The permissions being requested for the protocol */
  permissions: Permission[];
};

/**
 * Creates a set of Dwn Permission Scopes to request for a given protocol.
 *
 * If no permissions are provided, the default is to request all relevant record permissions (write, read, delete, query, subscribe).
 * 'configure' is not included by default, as this gives the application a lot of control over the protocol.
 */
function createPermissionRequestForProtocol({ definition, permissions }: ProtocolPermissionOptions): ConnectPermissionRequest {
  const requests: DwnPermissionScope[] = [];

  // Add the ability to query for the specific protocol
  requests.push({
    protocol  : definition.protocol,
    interface : DwnInterfaceName.Protocols,
    method    : DwnMethodName.Query,
  });

  // In order to enable sync, we must request permissions for `MessagesQuery`, `MessagesRead` and `MessagesSubscribe`
  requests.push({
    protocol  : definition.protocol,
    interface : DwnInterfaceName.Messages,
    method    : DwnMethodName.Read,
  }, {
    protocol  : definition.protocol,
    interface : DwnInterfaceName.Messages,
    method    : DwnMethodName.Query,
  }, {
    protocol  : definition.protocol,
    interface : DwnInterfaceName.Messages,
    method    : DwnMethodName.Subscribe,
  });

  // We also request any additional permissions the user has requested for this protocol
  for (const permission of permissions) {
    switch (permission) {
      case 'write':
        requests.push({
          protocol  : definition.protocol,
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Write,
        });
        break;
      case 'read':
        requests.push({
          protocol  : definition.protocol,
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Read,
        });
        break;
      case 'delete':
        requests.push({
          protocol  : definition.protocol,
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Delete,
        });
        break;
      case 'query':
        requests.push({
          protocol  : definition.protocol,
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Query,
        });
        break;
      case 'subscribe':
        requests.push({
          protocol  : definition.protocol,
          interface : DwnInterfaceName.Records,
          method    : DwnMethodName.Subscribe,
        });
        break;
      case 'configure':
        requests.push({
          protocol  : definition.protocol,
          interface : DwnInterfaceName.Protocols,
          method    : DwnMethodName.Configure,
        });
        break;
    }
  }

  return {
    protocolDefinition : definition,
    permissionScopes   : requests,
  };
}

export const WalletConnect = { initClient, createPermissionRequestForProtocol };
