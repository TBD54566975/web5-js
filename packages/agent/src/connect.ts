import type { DidResolver, PortableDid } from '@web5/dids';
import type { JwkKeyPair, PublicKeyJwk, PrivateKeyJwk } from '@web5/crypto';

import { DidKeyMethod, utils as didUtils  } from '@web5/dids';
import { Convert, RequireOnly } from '@web5/common';
import { utils as cryptoUtils, XChaCha20Poly1305, Jose, EcdhAlgorithm } from '@web5/crypto';

import type { EventListener } from './events.js';
import type { CryptoManager } from './types/managed-key.js';

import { appendPathToUrl, poll } from './utils.js';
import * as oidc from './oidc.js';
import { EventEmitter } from './events.js';

export interface ConnectClientEvents {
  'authorizationRequest' : {
    authorizationRequest: string;
  };

  'challenge': {
    validatePin: ({ pin }: { pin: string }) => Promise<void>;
  };

  'connected': {
    grants: AuthorizationResponse[];
  };

  'error': {
    message: string
  };

  'done': undefined;
}

export interface ConnectProviderEvents {
  'authorizationRequest': {
    authorizeRequest: ({ delegationGrants }: { delegationGrants: DelegationGrant[] }) => Promise<void>;
    denyRequest: () => Promise<void>;
    delegationGrantRequest: DelegationGrantRequest;
    origin: string;
  };

  'challenge': {
    pin: string;
  }

  'error': {
    code?: number;
    message: string;
  };

  'done': undefined;
}

export type Maybe<T> = T | null;

export const ConnectPhase = {
  Initialization : 'Initialization',
  Request        : 'Request',
  Response       : 'Response'
} as const;

export type ConnectPhase = keyof typeof ConnectPhase;

export type ConnectState = {
  // The origin of the connection.
  origin?: string;
  // The current phase of the connection.
  phase: ConnectPhase;
}

export interface ConnectClient {
  on: <K extends keyof ConnectClientEvents>(eventName: K, listener: EventListener<ConnectClientEvents[ K ]>) => void;
  cancel: () => void;
}

export interface ConnectProvider {
  on: <K extends keyof ConnectProviderEvents>(eventName: K, listener: EventListener<ConnectProviderEvents[ K ]>) => void;
  cancel: () => void;
}



export type ConnectDependencies = {
  /** Channel factory function. */
  createChannel: (options: ChannelOptions) => Promise<Channel>;
  /** CryptoManager implementation that provides basic cryptographic functions. */
  crypto: CryptoManager;
  /** DID Resolver implementation that supports the DID methods `key` and `jwk`. */
  didResolver: DidResolver;
}

export interface CreateClientOptions {
  /** The DID provided by the connecting app used to sign and encrypt requests and responses. */
  clientDid: string;
  /** The base URL of the server that requests and responses will be relayed through if the
   * Identity Provider's authorization endpoint is not directly accessible. */
  connectEndpoint: string;
  /** The origin of the connecting app. */
  origin: string;
  /** The delegation request(s) to be granted by the Identity Provider. */
  delegationGrantRequest: DelegationGrantRequest;
}



export class ConnectProtocol {
  // External component dependencies.
  private _dependencies: ConnectDependencies;
  // The current phase of the connection.
  private _phase: ConnectPhase;

  constructor({ phase, dependencies }: {
    phase?: ConnectPhase,
    dependencies: RequireOnly<ConnectDependencies, 'crypto' | 'didResolver'>
  }) {
    // Configure dependencies.
    this._dependencies = {
      // Use the specified channel factory function, if defined, or use the default.
      createChannel: createHttpChannel,
      ...dependencies
    };

    // If any state variables are defined, restore a previous state.
    this._phase = phase ?? ConnectPhase.Initialization;
  }

  public async createClient(options: CreateClientOptions ): Promise<ConnectClient> {
    let { clientDid, connectEndpoint, delegationGrantRequest, origin } = options;
    let provider: IdentityProvider;
    let requestObject: AuthorizationRequestObject | undefined;

    // Create a function to handle messages from the Identity Provider.
    const handleMessage = async (event: MessageEvent): Promise<void> => {
      switch (this._phase) {

        /******************
         * INITIALIZATION *
         ******************/
        case ConnectPhase.Initialization: {

          // Attempt to discover the Identity Provider's authorization endpoints.
          provider = await oidc.discoverProvider({ connectEndpoint });

          /** If a network-addressable provider was discovered, use it to relay
           * requests and responses between the client and provider. */
          if (!provider.authorizationEndpoint.startsWith('web5:')) {
            connectEndpoint = provider.authorizationEndpoint;
          }

          // Advance to the Request phase.
          this._phase = ConnectPhase.Request;
          handleMessage(new MessageEvent('message'));

          break;
        }

        /*************************
         * AUTHORIZATION REQUEST *
         *************************/
        case ConnectPhase.Request: {

          if (!requestObject) {

            /** Generate a random code verifier which will be used to prove that only this Client
           * could have initiated the authorization request. */
            const codeVerifier = oidc.generateRandomCodeVerifier();

            // Define the URL to which the Identity Provider will post the Authorization Response.
            const redirectUri = appendPathToUrl({ path: 'sessions', url: connectEndpoint });

            // Create the Request Object.
            requestObject = await oidc.createRequestObject({
              claims                   : { id_token: { delegation_grants: { essential: true } }},
              client_id                : redirectUri,
              client_metadata          : { client_uri: origin },
              code_verifier            : codeVerifier,
              delegation_grant_request : delegationGrantRequest,
              redirect_uri             : redirectUri,
            });

            // Resolve the Client DID document and extract the signing key ID.
            const { didDocument } = await this._dependencies.didResolver.resolve(clientDid);
            if (!didDocument) throw new Error('ConnectProtocol: Client DID could not be resolved.');
            const clientSigningKeyId = await DidKeyMethod.getDefaultSigningKey({ didDocument });
            if (!clientSigningKeyId) throw new Error('ConnectProtocol: Unable to determine Client signing key ID.');

            // Sign the Request Object using the Client DID's signing key.
            const requestObjectJwt = await oidc.signRequestObject({
              keyId        : clientSigningKeyId,
              request      : requestObject,
              dependencies : { crypto: this._dependencies.crypto }
            });

            // Hash the code verifier to use as a code challenge and to encrypt the Request Object.
            const codeChallenge = await oidc.deriveCodeChallenge({ codeVerifier });

            // Import the code challenge as a crypto key to use for encryption.
            const { id: codeChallengeKeyId } = await this._dependencies.crypto.importKey({
              algorithm   : { name: 'XCHACHA20-POLY1305' },
              extractable : true,
              material    : Convert.base64Url(codeChallenge).toUint8Array(),
              type        : 'secret',
              usages      : ['decrypt', 'encrypt']
            });

            // Encrypt the Request Object JWT using the code challenge.
            const requestObjectJwe = await oidc.encryptRequestJwt({
              jwt          : requestObjectJwt,
              keyId        : codeChallengeKeyId,
              dependencies : { crypto: this._dependencies.crypto }
            });

            // Convert the encrypted Request Object to URLSearchParams for form encoding.
            const formEncodedRequest = new URLSearchParams({ request: requestObjectJwe });

            // Push the encrypted Request Object to the Identity Provider.
            channel.send({
              data : formEncodedRequest,
              url  : provider.pushedAuthorizationRequestEndpoint
            });

          } else {

            let requestUri: string;

            /** Extract the "request_uri" from which the Provider will retrieve the Request object
               * once the Provider receives the Authorization Request. */
            const pushResponse: PushedAuthorizationResponse = event.data;
            requestUri = pushResponse.request_uri;
            if (!requestUri) throw new Error(`Connect Protocol: Missing required parameter: 'request_uri'.`);

            /** Subscribe to Authorization Responses in advance of transmitting the Authorization
             * Request to the Identity Provider to ensure a response isn't missed. */
            channel.subscribe({
              url: `${requestObject.redirect_uri}/${requestObject.state}.jwt`
            });

            /** Define the Authorization Request that will be transmitted to the Identity Provider
             * to initiate the authorization process. */
            const authorizationRequestUrl = new URL(provider.authorizationEndpoint);
            authorizationRequestUrl.searchParams.set('code_challenge',
              await oidc.deriveCodeChallenge({ codeVerifier: requestObject.code_verifier!})
            );
            authorizationRequestUrl.searchParams.set('request_uri', requestUri);
            const authorizationRequest = authorizationRequestUrl.toString();

            // Emit the Authorization Request to the caller.
            eventEmitter?.emit('authorizationRequest', { authorizationRequest });

            // Advance to the Response Phase.
            this._phase = ConnectPhase.Response;
          }

          break;
        }

        /**************************
         * AUTHORIZATION RESPONSE *
         **************************/
        case ConnectPhase.Response: {

          const message: ConnectMessage = event.data;

          if (message.messageType === ConnectMessageType.AuthorizationResponse) {
            const grantsCiphertext = message.payload;

            const validatePin = authenticateProvider({ grantsCiphertext });

            eventEmitter?.emit('challenge', { validatePin });
          }

          break;
        }
      }
    };

    const done = async () => {
      eventEmitter?.emit('done', undefined);
      eventEmitter = null;
      channel.close();
    };

    const authenticateProvider = ({ grantsCiphertext }: { grantsCiphertext: string }) => {
      return async ({ pin }: { pin: string }): Promise<void> => {
        console.log('PIN Entered:', pin);
        // // Decrypt the message.
        // const grantsBytes = await this._handshake.readMessage({
        //   additionalData : Convert.string(pin).toUint8Array(),
        //   ciphertext     : Convert.base64Url(grantsCiphertext).toUint8Array(),
        //   messageType    : ConnectMessageType.AuthorizationResponse
        // });

        // // Convert the decrypted message bytes to an Authorization Response object.
        // const grants = Convert.uint8Array(grantsBytes).toObject() as AuthorizationResponse[];

        // console.log('Client received Connect Grants:', grants);

        // console.log('Emitted connected event');
        // eventEmitter?.emit('connected', { grants });

        // console.log('Emitted done event');
        // eventEmitter?.emit('done', undefined);
      };
    };

    // Create event emitter to asynchronously interact with the function caller.
    let eventEmitter: Maybe<EventEmitter<ConnectClientEvents>> = new EventEmitter();

    // Create a channel to communicate with the Identity Provider either directly or via a relay.
    const channel = await this._dependencies.createChannel({ handleMessage });

    // Start handling messages.
    handleMessage(new MessageEvent('message'));

    return {
      on     : (...args) => eventEmitter?.on(...args),
      cancel : done
    };

  }

  public async createProvider({ authorizationRequest }: {
    authorizationRequest: string
  }): Promise<ConnectProvider> {
    let codeChallenge: string;
    let isPollingForRequestObject = false;
    let requestObject: AuthorizationRequestObject | undefined;
    let responseObject: AuthorizationResponseObject | undefined;

    // Create a function to handle messages from the Connect Provider.
    const handleMessage = async (event: MessageEvent): Promise<void> => {
      switch (this._phase) {

        /******************
         * INITIALIZATION *
         ******************/
        case ConnectPhase.Initialization: {

          // Advance to the Request phase.
          this._phase = ConnectPhase.Request;
          handleMessage(new MessageEvent('message'));

          break;
        }

        /*************************
         * AUTHORIZATION REQUEST *
         *************************/
        case ConnectPhase.Request: {

          if (!isPollingForRequestObject) {

            // Extract the code challenge and request URI from the Authorization Request.
            const authorizationRequestUrl = new URL(authorizationRequest);
            codeChallenge = authorizationRequestUrl.searchParams.get('code_challenge') ?? '';
            const requestUri = authorizationRequestUrl.searchParams.get('request_uri') ?? '';
            if (!codeChallenge || !requestUri) {
              throw new Error(`ConnectProtocol: Authorization Request is missing required parameters: 'code_challenge' and 'request_uri'.`);
            }

            // Subscribe to Pushed Authorization Request Object from the Client app.
            isPollingForRequestObject = true;
            channel.subscribe({
              url: requestUri
            });

          } else {

            const requestObjectJwe = event?.data;

            console.log('PROVIDER RECEIVED AUTHORIZATION REQUEST');

            // Import the code challenge as a crypto key to use for encryption.
            const { id: codeChallengeKeyId } = await this._dependencies.crypto.importKey({
              algorithm   : { name: 'XCHACHA20-POLY1305' },
              extractable : true,
              material    : Convert.base64Url(codeChallenge).toUint8Array(),
              type        : 'secret',
              usages      : ['decrypt', 'encrypt']
            });

            // Decrypt the Request Object using the code challenge.
            const requestObjectJwt = await oidc.decryptRequestJwt({
              jwe          : requestObjectJwe,
              keyId        : codeChallengeKeyId,
              dependencies : { crypto: this._dependencies.crypto }
            });

            // Verify the signed Request Object.
            requestObject = await oidc.verifyRequestObject({
              jwt          : requestObjectJwt,
              dependencies : this._dependencies
            });

            // If a `code_verify` value is present in the Request Object...
            if (requestObject.code_verifier) {
              // Hash the code verifier to derive the code challenge.
              const expectedCodeChallenge = await oidc.deriveCodeChallenge({
                codeVerifier: requestObject.code_verifier!
              });

              /** Verify that the derived code challenge matches the one
               * provided in the Authorization Request. */
              if (codeChallenge !== expectedCodeChallenge) {
                throw new Error(`Connect Protocol: Authorization Request failed verification due to invalid 'code_verifier'.`);
              }
            }

            const authorizeRequest = async ({ delegationGrants }: {
              delegationGrants: DelegationGrant[]
            }): Promise<void> => handleMessage(new MessageEvent('message', { data: delegationGrants }));

            const denyRequest = async (): Promise<void> => await done();

            eventEmitter?.emit('authorizationRequest', {
              authorizeRequest,
              denyRequest,
              delegationGrantRequest : requestObject!.delegation_grant_request as DelegationGrantRequest,
              origin                 : requestObject!.client_metadata?.client_uri ?? '',
            });

            // Advance to the Response Phase.
            this._phase = ConnectPhase.Response;
          }

          break;
        }

        /**************************
         * AUTHORIZATION RESPONSE *
         **************************/
        case ConnectPhase.Response: {

          /** Delegration Grants are specified by the connecting Client and
           * are received as a Message Event. */
          const delegationGrants = event?.data as DelegationGrant[];

          /** Generate a random ephemeral DID which will be used as the
           * issuer and subject of the Response Object and to encrypt
           * the response returned to the Client. */
          const ephemeralDid = await DidKeyMethod.create({ enableEncryptionKeyDerivation: true });

          // Create the Response Object.
          const responseObject = await oidc.createResponseObject({
            iss               : SiopIssuerIdentifier.SELF_ISSUED_V2,
            sub               : ephemeralDid.did,
            aud               : requestObject!.redirect_uri,
            nonce             : requestObject!.nonce,
            delegation_grants : delegationGrants
          });

          // Import the ephemeral DID's key to use for signing.
          const signingPrivateKeyJwk = ephemeralDid.keySet.verificationMethodKeys![0].privateKeyJwk!;
          const signingPublicKeyJwk = ephemeralDid.keySet.verificationMethodKeys![0].publicKeyJwk!;
          const signingKeyId = didUtils.getVerificationMethodIds({
            didDocument  : ephemeralDid.document,
            publicKeyJwk : signingPublicKeyJwk
          });
          const signingPrivateKey = await Jose.jwkToCryptoKey({ key: signingPrivateKeyJwk });
          const signingPublicKey = await Jose.jwkToCryptoKey({ key: signingPublicKeyJwk });
          await this._dependencies.crypto.importKey({
            privateKey : { ...signingPrivateKey, alias: signingKeyId, material: signingPrivateKey.material },
            publicKey  : { ...signingPublicKey, alias: signingKeyId, material: signingPublicKey.material }
          });

          // Sign the Response Object using the ephemeral DID's signing key.
          const responseObjectJwt = await oidc.signResponseObject({
            keyId        : signingKeyId!,
            response     : responseObject,
            dependencies : this._dependencies
          });

          // Import the ephemerl DID's key to use for ECDH key agreement.
          const keyAgreementPrivateKeyJwk = ephemeralDid.keySet.verificationMethodKeys![1].privateKeyJwk!;
          const keyAgreementPublicKeyJwk = ephemeralDid.keySet.verificationMethodKeys![1].publicKeyJwk!;
          const keyAgreementKeyId = didUtils.getVerificationMethodIds({
            didDocument  : ephemeralDid.document,
            publicKeyJwk : keyAgreementPublicKeyJwk
          });
          const keyAgreementPrivateKey = await Jose.jwkToKey({ key: keyAgreementPrivateKeyJwk });
          const keyAgreementPublicKey = await Jose.jwkToKey({ key: keyAgreementPublicKeyJwk });

          // const thing = this._dependencies.crypto.deriveBits({
          //   algorithm  : { name: 'ECDH', publicKey: signingPublicKey },
          //   baseKeyRef : signingKeyId!
          // });


          /** Generate a random 4-digit PIN, which will be used to detect and
           * prevent Man-in-the-Middle (MiTM) attacks. */
          const pin = cryptoUtils.randomPin({ length: 4 });

          // Convert the encrypted Request Object to URLSearchParams for form encoding.
          // const formEncodedRequest = new URLSearchParams({
          //   request : 'idTokenJwe',
          //   state   : requestObject!.state!
          // });

          // Push the encrypted Response Object to the connecting Client's redirect URI.
          // channel.send({
          //   data : formEncodedRequest,
          //   url  : requestObject!.redirect_uri
          // });

          eventEmitter?.emit('challenge', { pin });

          break;
        }
      }
    };

    const done = async () => {
      eventEmitter?.emit('done', undefined);
      eventEmitter = null;
      channel.close();
    };

    // Create event emitter to asynchronously interact with the caller.
    let eventEmitter: Maybe<EventEmitter<ConnectProviderEvents>> = new EventEmitter();

    // Create a channel to communicate with the Connect Client either directly or via a relay.
    const channel = await this._dependencies.createChannel({ handleMessage });

    // Start handling messages.
    handleMessage(new MessageEvent('message'));

    return {
      on     : (...args) => eventEmitter?.on(...args),
      cancel : done
    };
  }
}

// export class ConnectLink {
//   private _baseUri: string;

//   constructor({ baseUri }: { baseUri: string }) {
//     this._baseUri = baseUri;
//   }

//   public static decode({ url }: { url: string}): {
//     codeChallenge: string,
//     requestUri: string
//   } {
//     // Parse the Connect Link URL.
//     const connectLink = new URL(url);

//     // Get the query parameters from the Connect Link URL.
//     const params = connectLink.searchParams;
//     const codeChallenge = params.get('code_challenge');
//     const requestUri = params.get('request_uri');

//     // Validate the query parameters.
//     if (!codeChallenge) throw new Error(`Connect Link: Missing required parameter 'clientId'.`);
//     if (!requestUri) throw new Error(`Connect Link: Missing required parameter 'connectEndpoint'.`);
//     if (connectLink.protocol !== 'web5:') throw new Error(`Connect Link: Invalid protocol.`);

//     return { codeChallenge, requestUri };
//   }

//   public static encode({ codeChallenge, requestUri }: {
//     codeChallenge: string,
//     requestUri: string
//   }): string {
//     // Construct the base URL for the Connect Link.
//     const baseUrl = 'web5://connect';
//     const connectLink = new URL(baseUrl);

//     // Add the query parameters to the Connect Link.
//     const params = new URLSearchParams();
//     params.append('code_challenge', codeChallenge);
//     params.append('request_uri', requestUri);
//     connectLink.search = params.toString();

//     return connectLink.toString();
//   }
// }

export type ChannelOptions = {
  handleMessage: (event: MessageEvent) => void;
}

export const ConnectMessageType = {
  AuthorizationRequest  : 'AuthorizationRequest',
  AuthorizationResponse : 'AuthorizationResponse',
} as const;

export type ConnectMessageType = keyof typeof ConnectMessageType;

export type ConnectMessage = {
  messageType: ConnectMessageType;
  payload: string;
  uuid: string;
}

export type Channel = {
  close: () => void;
  send: ({ data, url}: { data: string | URLSearchParams, url: string }) => void;
  subscribe: ({ url }: { url: string }) => void;
}

export const createHttpChannel = async (options: ChannelOptions): Promise<Channel> => {
  let { handleMessage } = options;

  const controller = new AbortController();

  const close = (): void => {
    console.log('Closing channel');
    controller.abort();
  };

  const send = async ({ data, url}: {
    data: string | URLSearchParams,
    url: string
  }): Promise<void> => {
    console.log(`Sending data to ${url}`);

    const httpRequest = new Request(url, {
      method  : 'POST',
      headers : {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: data,
    });

    try {
      const httpResponse = await fetch(httpRequest);

      if (!httpResponse.ok) {
        throw new Error(`HTTP (${httpResponse.status}) - ${httpResponse.statusText}`);
      }

      const contentType = httpResponse.headers.get('Content-Type');
      let data: string | object;
      if (contentType?.includes('application/json')) {
        data = await httpResponse.json();
      } else {
        data = await httpResponse.text();
      }

      handleMessage(new MessageEvent('message', { data }));

    } catch (error: any) {
      // ! TODO: Add 'Error' handling to message handler.
      handleMessage(new MessageEvent('message', {
        data: { error: `Error encountered while processing response from ${url}: ${error.message}` }
      }));
    }
  };

  const subscribe = async ({ url }: { url: string }): Promise<void> => {
    console.log(`Subscribing to ${url}`);

    // Continually poll until a valid response is received or abort is signaled.
    const httpResponse = await poll(
      () => fetch(url),
      {
        abortSignal : controller.signal,
        interval    : 1000,
        validate    : (response: Response): boolean => response.ok
      }
    );

    try {
      const contentType = httpResponse.headers.get('Content-Type');
      let data: string | object;
      if (contentType?.includes('application/json')) {
        data = await httpResponse.json();
      } else {
        data = await httpResponse.text();
      }

      // Pass the response to the Connect Protocol message handler.
      handleMessage(new MessageEvent('message', { data }));

    } catch (error: any) {
      // ! TODO: Add 'Error' handling to message handler.
      handleMessage(new MessageEvent('message', {
        data: { error: `Error encountered while processing response from subscribed URL: ${url}` }
      }));
    }
  };

  return {
    close,
    send,
    subscribe
  };
};










// export class SessionStoreDwn implements SessionStore<string, string> {
//   private _agent: Web5ManagedAgent;
//   private _sessionRecordProperties = {
//     dataFormat : 'application/json',
//     schema     : 'https://identity.foundation/schemas/web5/session'
//   };

//   constructor(options: { agent: Web5ManagedAgent }) {
//     this._agent = options.agent;
//   }

//   async deleteSession(options: { id: string }): Promise<boolean> {
//     return null as any;
//   }

//   async getSession(options: { id: string }): Promise<string | undefined> {
//     return null as any;
//   }

//   async importSession(options: { session: Session }): Promise<string> {
//     const { context } = options ?? {};

//     // Determine which DID to use to author DWN messages.
//     const authorDid = await this.getAuthor({ agent: this._agent, context });




//     return null as any;
//   }

//   async listSessions(options?: { context?: string }): Promise<string[]> {
//     return null as any;
//   }

//   async updateSession(options: { id: string } & Partial<string>): Promise<boolean> {
//     return null as any;
//   }

//   private async getAuthor(options: {
//     agent: Web5ManagedAgent,
//     context?: string
//   }): Promise<string> {
//     const { context, agent } = options;

//     // If `context` is specified, DWN messages will be signed by this DID.
//     if (context) return context;

//     // If Agent has an agentDid, use it to sign DWN messages.
//     if (agent.agentDid) return agent.agentDid;

//     // If `context` and `agent.agentDid` are undefined, throw error.
//     throw new Error(`SessionStoreDwn: Agent property 'agentDid' and 'context' are undefined.`);
//   }
// }




export const SiopIssuerIdentifier = {
  SELF_ISSUED_V1 : 'https://self-issued.me',
  SELF_ISSUED_V2 : 'https://self-issued.me/v2'
} as const;

export type SiopIssuerIdentifier = typeof SiopIssuerIdentifier;

export interface IdTokenClaims {
  delegation_grants: { essential: true };
  [key: string]: any;
}

export interface DelegationGrantRequest {
  permissionsRequests: Record<string, any>[];
}

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

export interface AuthorizationRequest {
  client_id: string;
  nonce: string;
  request_uri: string;
  code_challenge: string;

  [key: string]: string;
}

export interface AuthorizationResponseObject {
  /** Issuer Identifier for the Issuer of the response. */
  iss: SiopIssuerIdentifier | string;
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

export interface AuthorizationResponse {
  /** The signed ID token JWT or encrypted ID token JWE. */
  id_token: string;
  /** The state parameter echoed back from the authorization request. */
  state: string;
}

export type DelegationGrant = {
  did: PortableDid;
  permissionsGrants: Record<string, unknown>[];
}

export interface IdentityProvider {
  authorizationEndpoint: string;
  pushedAuthorizationRequestEndpoint: string;
}

export interface PushedAuthorizationResponse {
  expires_in: number;
  request_uri: string;
}