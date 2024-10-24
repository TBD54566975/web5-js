import type { PushedAuthResponse } from './oidc.js';
import type {
  DwnPermissionScope,
  DwnProtocolDefinition,
  Web5ConnectAuthResponse,
} from './index.js';

import { Oidc } from './oidc.js';
import { pollWithTtl } from './utils.js';

import { Convert, logger } from '@web5/common';
import { CryptoUtils } from '@web5/crypto';
import { DidJwk } from '@web5/dids';
import { DwnInterfaceName, DwnMethodName } from '@tbd54566975/dwn-sdk-js';

/**
 * Settings provided by users who wish to allow their DWA to connect to a wallet
 * and either transfer their DID to that wallet (when `exported: true`)
 * or transfer a DID from their wallet (without `exported: true`).
 */
export type WalletConnectOptions = {
  /** The user friendly name of the app to be displayed when prompting end-user with permission requests. */
  displayName: string;

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
   * permission scopes for each protocol.
   * If `exported` is true these will be created automatically.
   */
  permissionRequests: ConnectUserPermissionRequest[];

  /**
   * Can be set to true if the DWA wants to transfer its identity to the wallet
   * instead of get an identity from the wallet
   */
  exported?: boolean;

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

/** Used by the WalletConnect protocol to provision a Wallet for the exact permissions its needs */
export type ConnectPermissionRequest = {
  /**
   * The definition of the protocol the permissions are being requested for.
   * In the event that the protocol is not already installed, the wallet will install this given protocol definition.
   */
  protocolDefinition: DwnProtocolDefinition;

  /** The scope of the permissions being requested for the given protocol */
  permissionScopes: DwnPermissionScope[];
};

/** Convenience object passed in by users and normalized to the internally used {@link ConnectPermissionRequest}  */
export type ConnectUserPermissionRequest = Omit<
  ConnectPermissionRequest,
  'permissionScopes'
> & {
  /**
   * Used to create a {@link DwnPermissionScope} for each option provided in this param.
   * If undefined defaults to requesting all permissions.
   * `configure` is not included by default, as this gives the application a lot of control over the protocol.
   */
  permissions?: Permission[];
};

/** Shorthand for the types of permissions that can be requested. */
type Permission =
  | 'write'
  | 'read'
  | 'delete'
  | 'query'
  | 'subscribe'
  | 'configure';

/**
 * Called by the DWA. In this workflow the wallet provisions a DID to the DWA.
 * The DWA will have access to the data of the DID and be able to act as that DID.
 */
async function initClient({
  displayName,
  connectServerUrl,
  walletUri,
  permissionRequests,
  onWalletUriReady,
  validatePin,
}: WalletConnectOptions) {
  const normalizedPermissionRequests = permissionRequests.map(
    ({ protocolDefinition, permissions }) =>
      WalletConnect.createPermissionRequestForProtocol({
        definition: protocolDefinition,
        permissions,
      })
  );

  // ephemeral did used for signing, verification
  const clientSigningDid = await DidJwk.create();

  // ephemeral did used for ECDH only
  const clientEcdhDid = await DidJwk.create();

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
    client_id          : clientSigningDid.uri,
    scope              : 'openid did:jwk',
    redirect_uri       : callbackEndpoint,
    client_name        : displayName,
    // code_challenge        : codeChallengeBase64Url,
    // code_challenge_method : 'S256',
    // custom properties:
    permissionRequests : normalizedPermissionRequests,
  });

  // Sign the Request Object using the Client DID's signing key.
  const requestJwt = await Oidc.signJwt({
    did  : clientSigningDid,
    data : request,
  });

  if (!requestJwt) {
    throw new Error('Unable to sign requestObject');
  }

  // Encrypt with symmetric randomBytes and tell counterparty about the future ecdh pub did kid
  const requestObjectJwe = await Oidc.encryptAuthRequest({
    jwt : requestJwt,
    kid : clientEcdhDid.document.verificationMethod![0].id,
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
  logger.log(`Wallet URI: ${walletUri}`);
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
    const jwt = await Oidc.decryptWithPin(clientEcdhDid, jwe, pin);
    const verifiedAuthResponse = (await Oidc.verifyJwt({
      jwt,
    })) as Web5ConnectAuthResponse;

    // TODO: export insertion point

    return {
      delegateGrants      : verifiedAuthResponse.delegateGrants,
      delegatePortableDid : verifiedAuthResponse.delegatePortableDid,
      connectedDid        : verifiedAuthResponse.iss,
    };
  }
}

/**
 * An internal utility that simplifies the API for permission requests by allowing
 * users to pass simple strings (any of {@link Permission}) and will create the
 * appropriate {@link DwnPermissionScope} for each string provided.
 */
function createPermissionRequestForProtocol({
  definition,
  permissions,
}: {
  /** The protocol definition for the protocol being requested */
  definition: DwnProtocolDefinition;

  /** The permissions being requested for the protocol. Defaults to all. */
  permissions?: Permission[];
}) {
  permissions ??= ['read', 'write', 'delete', 'query', 'subscribe'];

  const requests: DwnPermissionScope[] = [];

  // Add the ability to query for the specific protocol
  requests.push({
    protocol  : definition.protocol,
    interface : DwnInterfaceName.Protocols,
    method    : DwnMethodName.Query,
  });

  // In order to enable sync, we must request permissions for `MessagesQuery`, `MessagesRead` and `MessagesSubscribe`
  requests.push(
    {
      protocol  : definition.protocol,
      interface : DwnInterfaceName.Messages,
      method    : DwnMethodName.Read,
    },
    {
      protocol  : definition.protocol,
      interface : DwnInterfaceName.Messages,
      method    : DwnMethodName.Query,
    },
    {
      protocol  : definition.protocol,
      interface : DwnInterfaceName.Messages,
      method    : DwnMethodName.Subscribe,
    }
  );

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

export const WalletConnect = {
  initClient,
  createPermissionRequestForProtocol,
};
