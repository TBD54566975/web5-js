// class ConnectProvider {
//   attemptDirectConnection(peerInfo: PeerInfo): boolean { /* ... */ }
//   fallbackToRelay(): void { /* ... */ }
//   // ... other methods
// }

// class ConnectClient {
//   attemptDirectConnection(peerInfo: PeerInfo): boolean { /* ... */ }
//   fallbackToRelay(): void { /* ... */ }
//   // ... other methods
// }

// class ConnectRelay {
//   registerProvider(provider: IdentityProvider): void { /* ... */ }
//   registerClient(client: IdentityClient): void { /* ... */ }
//   getPeerInfo(clientId: string): PeerInfo { /* ... */ }
//   // ... other methods
// }
import { hmac } from '@noble/hashes/hmac';
import { DidKeyMethod } from '@web5/dids';
import { Convert, RequireOnly } from '@web5/common';
import { Hkdf, JwkKeyPair, PublicKeyJwk, Sha256, utils as cryptoUtils, X25519, XChaCha20Poly1305 } from '@web5/crypto';

import { EventEmitter, type EventListener } from './events.js';
import { ConnectRpcMethods, type ConnectRpcRequest, type ConnectRpcResponse, Web5RpcClient } from './rpc-client.js';
import { Web5ManagedAgent } from './types/agent.js';

export class ConnectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConnnectError';
  }
}

// export enum ConnectErrors {
// }

export interface ConnectInitiatorEvents {
  'challenge': {
    validatePin: (pin: string) => Promise<void>;
  };

  'checkpoint': {
    handshakeState: HandshakeState;
    phase: ConnectPhase;
  };

  'chooseIdentity': {
    identities: string[];
    useIdentity: (did: string) => Promise<void>;
  };

  'connectLink' : {
    connectLink: string;
  };

  'connected': {
    appDid: string;
  };

  'done': undefined;
}

export interface ConnectProviderEvents {
  // 'challenge': {
  //   validatePin: (pin: string) => Promise<void>;
  // };

  // 'checkpoint': {
  //   handshakeState: HandshakeState;
  //   phase: ConnectPhase;
  // };

  // 'chooseIdentity': {
  //   identities: string[];
  //   useIdentity: (did: string) => Promise<void>;
  // };

  // 'connectLink' : {
  //   connectLink: string;
  // };

  // 'connected': {
  //   appDid: string;
  // };

  'done': undefined;
}

export type Maybe<T> = T | null;

export const ConnectPhases = {
  Initialization : 'Initialization',
  Handshake      : 'Handshake',
  Delegation     : 'Delegation'
} as const;

export type ConnectPhase = keyof typeof ConnectPhases;

export type ConnectState = {
  // The origin of the connection.
  origin?: string;
  // The current phase of the connection.
  phase: ConnectPhase;
}

export type ConnectInitiator = {
  on: <K extends keyof ConnectInitiatorEvents>(eventName: K, listener: EventListener<ConnectInitiatorEvents[ K ]>) => void;
  cancel: () => void;
}

export type ConnectProvider = {
  on: <K extends keyof ConnectProviderEvents>(eventName: K, listener: EventListener<ConnectProviderEvents[ K ]>) => void;
  cancel: () => void;
}

export class ConnectCipher {
  private _cipher = XChaCha20Poly1305;
  private _key?: Uint8Array;
  private _nonce = 0;

  get key(): Uint8Array {
    if (!this._key) throw new Error(`ConnectCipher: 'key' is undefined.`);
    return this._key;
  }

  get nonce(): number {
    return this._nonce;
  }

  set nonce(nonce: number) {
    this._nonce = nonce;
  }

  /** Convert from 32-bit integer to Uint8Array. */
  get nonceBytes(): Uint8Array {
    // Create a Uint8Array with 24 bytes.
    const uint8Array = new Uint8Array(24);
    // Write the 32-bit integer to the beginning (first 4 bytes) of the Uint8Array.
    new DataView(uint8Array.buffer).setUint32(0, this._nonce, true);

    return uint8Array;
  }

  public async decrypt({ associatedData, ciphertext }: {
    associatedData?: Uint8Array,
    ciphertext: Uint8Array
  }): Promise<Uint8Array> {
    console.group('ConnectCipher.decrypt()');
    console.log('associatedData:', associatedData);
    console.log('ciphertext:', ciphertext);
    console.log('key:', this.key);
    console.log('nonce:', this.nonceBytes);
    console.groupEnd();
    const plaintext = await this._cipher.decrypt({
      associatedData : associatedData,
      data           : ciphertext,
      key            : this.key,
      nonce          : this.nonceBytes
    });

    // Increment the nonce to prevent reuse of (key, nonce) pairs.
    this._nonce++;

    return plaintext;
  }

  public async encrypt({ associatedData, plaintext }: {
    associatedData?: Uint8Array,
    plaintext: Uint8Array
  }): Promise<Uint8Array> {
    const ciphertext = await this._cipher.encrypt({
      associatedData : associatedData,
      data           : plaintext,
      key            : this.key,
      nonce          : this.nonceBytes
    });

    console.group('ConnectCipher.encrypt()');
    console.log('associatedData:', associatedData);
    console.log('ciphertext:', ciphertext);
    console.log('key:', this.key);
    console.log('nonce:', this.nonceBytes);
    console.groupEnd();

    // Increment the nonce to prevent reuse of (key, nonce) pairs.
    this._nonce++;

    return ciphertext;
  }

  public initializeKey({ key }: { key: Uint8Array }): void {
    this._key = key;
    /** Resetting nonce ensures unique (key, nonce) pairs, prevents reuse, and ensures
     * cryptographic integrity. */
    this._nonce = 0;
  }
}

export type HandshakeState = {
  /** Running digest where each hash is built upon previous data and hash results. */
  chainedHash?: string;
  /** Current key used by the ConnectCipher object in hexadecimal string format. */
  cipherKey?: string;
  /** Current nonce used by the ConnectCipher object. */
  cipherNonce?: number;
  /** Unique identifier for this handshake session in hexadecimal string format. */
  handshakeId?: string;
  /** Whether this end is the initiator of the connection. */
  initiator?: boolean;
  /** Ephemeral DID used to identify this end of the connection. */
  localEphemeralDid?: string;
  /** This ends ephemeral key pair used for key exchange with the remote end. */
  localEphemeralKeyPair?: JwkKeyPair;
  /** The ephemeral DID provided by the remote end. */
  remoteEphemeralDid?: string;
}

export class ConnectHandshake {
  /** Running digest where each hash is built upon previous data and hash results. */
  private _chainedHash?: Uint8Array;
  /** Current key used by the ConnectCipher object in hexadecimal string format. */
  private _cipher = new ConnectCipher();
  /** Unique identifier for this handshake session in hexadecimal string format. */
  private _handshakeId?: Uint8Array;
  /** Whether this end is the initiator of the connection. */
  private _initiator?: boolean;
  /** Ephemeral DID used to identify this end of the connection. */
  private _localEphemeralDid?: string;
  /** This ends ephemeral key pair used for key exchange with the remote end. */
  private _localEphemeralKeyPair?: JwkKeyPair;
  /** The ephemeral DID provided by the remote end. */
  private _remoteEphemeralDid?: string;

  constructor(options?: HandshakeState) {
    const {
      chainedHash, cipherKey, cipherNonce, handshakeId, initiator, localEphemeralDid,
      localEphemeralKeyPair, remoteEphemeralDid
    } = options ?? {};

    // HandshakeState values can optionally be provided to restore the prior state.
    if (chainedHash) this._chainedHash = Convert.hex(chainedHash).toUint8Array();
    if (cipherKey) this._cipher.initializeKey({ key: Convert.hex(cipherKey).toUint8Array() });
    if (cipherNonce) this._cipher.nonce = cipherNonce;
    if (handshakeId) this._handshakeId = Convert.hex(handshakeId).toUint8Array();
    this._initiator = initiator;
    this._localEphemeralDid = localEphemeralDid;
    this._localEphemeralKeyPair = localEphemeralKeyPair;
    this._remoteEphemeralDid = remoteEphemeralDid;
  }

  /**
   * Gets the running digest where each hash is influenced by previous data and hash results.
   *
   * @throws Error if '_chainedHash' is undefined.
   * @returns The current value of the chained hash as a Uint8Array.
   */
  get chainedHash(): Uint8Array {
    if (this._chainedHash === undefined) {
      throw new Error(`ConnectHandshake: 'chainedHash' is undefined.`);
    }
    return this._chainedHash;
  }

  get handshakeId(): Uint8Array {
    if (this._handshakeId === undefined) {
      throw new Error(`ConnectHandshake: 'handshakeId' is undefined.`);
    }
    return this._handshakeId;
  }

  get localEphemeralDid(): string {
    if (this._localEphemeralDid === undefined) {
      throw new Error(`ConnectHandshake: 'localEphemeralDid' must first be generated.`);
    }
    return this._localEphemeralDid;
  }

  get remoteEphemeralDid(): string {
    if (this._remoteEphemeralDid === undefined) {
      throw new Error(`ConnectHandshake: 'remoteEphemeralDid' must first be learned from the initiator.`);
    }
    return this._remoteEphemeralDid;
  }

  public exportState(): HandshakeState {
    // Convert the chained hash to hexadecimal string format.
    const chainedHash = Convert.uint8Array(this.chainedHash).toHex();

    // Convert the ConnectCipher key to hexadecimal string format.
    const cipherKey = Convert.uint8Array(this._cipher.key).toHex();

    // Convert the handshake ID to hexadecimal string format.
    const handshakeId = Convert.uint8Array(this.handshakeId).toHex();

    return {
      chainedHash           : chainedHash,
      cipherNonce           : this._cipher.nonce,
      cipherKey             : cipherKey,
      handshakeId           : handshakeId,
      initiator             : this._initiator,
      localEphemeralDid     : this._localEphemeralDid,
      localEphemeralKeyPair : this._localEphemeralKeyPair,
      remoteEphemeralDid    : this._remoteEphemeralDid
    };
  }

  public async initialize({ initiator, remoteEphemeralDid }: {
    initiator: boolean,
    remoteEphemeralDid?: string
  }): Promise<void> {
    let keyDerivationInput: string;

    // If the local ephemeral DID is not yet defined, generate a new DID and key pair.
    if (this._localEphemeralDid === undefined) await this.generateKeyExchangeDid();

    // If this end is the initiator...
    if (initiator) {
      // Use the initiator's ephemeral DID as the key derivation input.
      keyDerivationInput = this.localEphemeralDid;

    // If this end is the responder...
    } else {
      if (!remoteEphemeralDid) throw new Error(`ConnectHandshake: 'remoteEphemeralDid' is required to initialize responder.`);

      // Initialize with the initiator's ephemeral DID.
      this._remoteEphemeralDid = remoteEphemeralDid;

      // Use the initiator's ephemeral DID as the key derivation input.
      keyDerivationInput = this.remoteEphemeralDid;
    }

    // Set the initial hash value.
    this._chainedHash = await Sha256.digest({
      data: Convert.string('connect_handshake_1.0').toUint8Array()
    });

    // Derive a unique identifier for this Connect session using the initiator's DID.
    this._handshakeId = await Hkdf.deriveKey({
      hash                : 'SHA-256',
      inputKeyingMaterial : keyDerivationInput,
      salt                : undefined,
      info                : 'handshake_id',
      length              : 32
    });

    // Derive a symmetric encryption key using the initiator's DID.
    const tempKey = await Hkdf.deriveKey({
      hash                : 'SHA-256',
      inputKeyingMaterial : keyDerivationInput,
      salt                : undefined,
      info                : 'handshake_encryption_key',
      length              : 32
    });

    // Initialize the ConnectCipher object with the derived symmetric encryption key.
    this._cipher.initializeKey({ key: tempKey });
  }

  public async readMessage({ associatedData, ciphertext }: {
    associatedData?: Uint8Array,
    ciphertext: Uint8Array
  }): Promise<Uint8Array> {
    // Decrypt the message.
    const plaintext = await this._cipher.decrypt({ ciphertext });

    /** Update the rolling hash with the ciphertext to ensure both parties maintain consistent,
     * tamper-evident handshake integrity based on observable data. */
    this.updateHash({ data: ciphertext });

    return plaintext;
  }

  public async writeMessage({ associatedData, plaintext }: {
    associatedData?: Uint8Array,
    plaintext: Uint8Array
  }): Promise<Uint8Array> {
    // Encrypt the message.
    const ciphertext = await this._cipher.encrypt({ plaintext });

    /** Update the rolling hash with the ciphertext to ensure both parties maintain consistent,
     * tamper-evident handshake integrity based on observable data. */
    this.updateHash({ data: ciphertext });

    return ciphertext;
  }

  private async generateKeyExchangeDid(): Promise<void> {
    // Generate a DID and key set, including key agreement keys.
    const { did, keySet } = await DidKeyMethod.create({ enableEncryptionKeyDerivation: true });
    this._localEphemeralDid = did;

    // Get the key agreement (X25519) JWK pair from the key set.
    const keyAgreementKeys = keySet.verificationMethodKeys?.find(key => key.relationships.includes('keyAgreement'));

    // Store the key agreement JWK pair.
    this._localEphemeralKeyPair = {
      publicKeyJwk  : keyAgreementKeys!.publicKeyJwk!,
      privateKeyJwk : keyAgreementKeys!.privateKeyJwk!
    };
  }

  /**
   * Updates the running hash (`chainedHash`) by appending new data and recalculating.
   * Ensures handshake integrity based on a continuous digest of observable data.
   *
   * @param data - Data to be mixed into the current hash.
   */
  private async updateHash({ data }: { data: Uint8Array }) {
    this._chainedHash = await Sha256.digest({
      data: new Uint8Array([...this.chainedHash, ...data])
    });
  }
}

export class ConnectProtocol {
  // The ConnectHandshake object used during the handshake phase.
  private _handshake: ConnectHandshake;
  // The current phase of the connection.
  private _phase: ConnectPhase;

  constructor(options?: {
    handshakeState: HandshakeState,
    phase: ConnectPhase
  }) {
    const { handshakeState, phase } = options ?? {};
    // If any state variables are defined, restore a previous state.
    this._handshake = new ConnectHandshake(handshakeState);
    this._phase = phase ?? ConnectPhases.Initialization;
  }

  public async createInitiator({ connectRelay, origin, permissionsRequests }: {
    connectRelay: string,
    origin: string,
    permissionsRequests: string[]
  }): Promise<ConnectInitiator> {
    // Create event emitter to asynchronously interact with the caller.
    let eventEmitter: Maybe<EventEmitter<ConnectInitiatorEvents>> = new EventEmitter();

    // Create a function to handle messages from the Connect Provider.
    const handleMessage = async (event: MessageEvent): Promise<void> => {
      switch (this._phase) {

        /**
         * Initialization Phase
         */
        case ConnectPhases.Initialization: {
          // Initialize the Connect Handshake object.
          await this._handshake.initialize({ initiator: true });

          // Advance to the Handshake phase.
          this._phase = ConnectPhases.Handshake;
          handleMessage(new MessageEvent('Handshake'));

          break;
        }

        /**
         * Handshake Phase
         */
        case ConnectPhases.Handshake: {
          // Construct a request to connect to the Connect Provider.
          const connectRequest = {
            agentDid            : this._handshake.localEphemeralDid,
            origin              : origin,
            permissionsRequests : permissionsRequests
          };

          // Encrypt the request.
          const messageCiphertext = await this._handshake.writeMessage({
            plaintext: Convert.object(connectRequest).toUint8Array()
          });

          // Get the unique identifier for this Connect session.
          const handshakeId = this._handshake.handshakeId;

          // Send the request to the Connect Provider directly or via a Connect Relay.
          channel.createRequest({
            message : Convert.uint8Array(messageCiphertext).toBase64Url(),
            uuid    : Convert.uint8Array(handshakeId).toBase64Url()
          });

          // Attempt to retrieve the Identity Grant from the Connect Relay.
          channel.getGrant({ uuid: Convert.uint8Array(handshakeId).toBase64Url() });

          /** Emit a checkpoint event now that the Connect Request has been sent to the Connect
           * Provider, so that the caller can store the current state, if desired. */
          eventEmitter?.emit('checkpoint', {
            handshakeState : this._handshake.exportState(),
            phase          : this._phase
          });

          // Construct the Connect Link URL.
          const connectLink = ConnectLink.encode({
            connectRelay : connectRelay,
            temporaryDid : this._handshake.localEphemeralDid
          });

          // Emit the Connect Link to the caller.
          eventEmitter?.emit('connectLink', { connectLink });

          // Advance to the Delegation Phase.
          this._phase = ConnectPhases.Delegation;

          break;
        }

        /**
         * Delegation Phase
         */
        case ConnectPhases.Delegation: {
          const identityGrantCiphertext = event.data;
          console.log(identityGrantCiphertext);
          // let identityGrant: {
          //   grants: Record<string, { did: string, permissions: Record<string, { grantedBy: string, grantedTo: string }> }>
          // } = JSON.parse(event.data);

          break;
        }
      }
    };

    const done = async () => {
      eventEmitter?.emit('done', undefined);
      eventEmitter = null;
      // channel.close();
      // clearInterval(rsaExchangeInterval);
    };

    const useIdentity = async (did: string) => {
      console.log('Selected Identity:', did);
      eventEmitter?.emit('connected', { appDid: did });
    };

    const validatePin = async (pin: string) => {
      console.log('PIN:', pin);
      // Decrypt the JWE with the PIN as AAD
      const identities = [ 'did:method:123', 'did:method:456' ];
      console.log('Emitted chooseIdentity event');
      eventEmitter?.emit('chooseIdentity', { identities, useIdentity });
    };

    // Create a channel to communicate with the Connect Provider either directly or via a relay.
    const channel = await createChannel({ endpointUrl: connectRelay, handleMessage });

    // Start Initialization phase.
    handleMessage(new MessageEvent('Initialization'));

    return {
      on     : (...args) => eventEmitter?.on(...args),
      cancel : done
    };

  }

  public async createProvider({ connectLink }: { connectLink: string }): Promise<ConnectProvider> {
    // Create event emitter to asynchronously interact with the caller.
    let eventEmitter: Maybe<EventEmitter<ConnectProviderEvents>> = new EventEmitter();

    // Create a function to handle messages from the Connect Provider.
    const handleMessage = async (event: MessageEvent): Promise<void> => {
      switch (this._phase) {

        /**
         * Initialization Phase
         */
        case ConnectPhases.Initialization: {
          console.log('PROVIDER INITIALIZED');
          // Initialize the Connect Handshake object.
          await this._handshake.initialize({
            initiator          : false,
            remoteEphemeralDid : temporaryDid
          });

          // Get the unique identifier for this Connect session.
          const handshakeId = this._handshake.handshakeId;

          // Attempt to retrieve the Connect Request from the Connect Relay.
          channel.getRequest({ uuid: Convert.uint8Array(handshakeId).toBase64Url() });

          // Advance to the Handshake phase.
          this._phase = ConnectPhases.Handshake;

          break;
        }

        /**
         * Handshake Phase
         */
        case ConnectPhases.Handshake: {
          console.log('PROVIDER RECEIVED CONNECT REQUEST');
          const messageCiphertext = event.data;

          // ! TODO: Next step is for the provider to raise an event to the caller to ask the user to approve the request and select a DID to use.
          // ! then the Provider needs to assemble the Identity Grant and post it to the Connect Relay.

          // Decrypt the message.
          const messagePlaintext = await this._handshake.readMessage({
            ciphertext: Convert.base64Url(messageCiphertext).toUint8Array(),
          });

          // Convert the decrypted messages bytes to a Connect Request object.
          const connectRequest = Convert.uint8Array(messagePlaintext).toObject();
          console.log('Provider got Connect Request:', connectRequest);

          break;
        }

        /**
         * Delegation Phase
         */
        case ConnectPhases.Delegation: {
          // Nothing yet.

          break;
        }
      }
    };

    const cancel = async () => {
      eventEmitter?.emit('done', undefined);
      eventEmitter = null;
      // channel.close();
    };

    // Decode the Connect Link.
    const { connectRelay, temporaryDid } = ConnectLink.decode({ url: connectLink });

    // Create a channel to communicate with the Connect Initiator either directly or via a relay.
    const channel = await createChannel({ endpointUrl: connectRelay, handleMessage });

    // Start Initialization phase.
    handleMessage(new MessageEvent('Initialization'));

    return {
      on: (...args) => eventEmitter?.on(...args),
      cancel
    };
  }
}

export class ConnectLink {
  public static decode({ url }: { url: string}): {
    temporaryDid: string,
    connectRelay: string
  } {
    // Parse the Connect Link URL.
    const connectLink = new URL(url);

    // Get the query parameters from the Connect Link URL.
    const params = connectLink.searchParams;
    const temporaryDid = params.get('temporaryDid');
    const connectRelay = params.get('connectRelay');

    // Validate the query parameters.
    if (!temporaryDid) throw new Error(`Connect Link: Missing required parameter 'temporaryDid'.`);
    if (!connectRelay) throw new Error(`Connect Link: Missing required parameter 'connectRelay'.`);
    if (connectLink.protocol !== 'web5:') throw new Error(`Connect Link: Invalid protocol.`);

    return {
      temporaryDid,
      connectRelay
    };
  }

  public static encode({ connectRelay, temporaryDid }: {
    connectRelay: string,
    temporaryDid: string
  }): string {
    // Construct the base URL for the Connect Link.
    const baseUrl = 'web5://connect';
    const connectLink = new URL(baseUrl);

    // Add the query parameters to the Connect Link.
    const params = new URLSearchParams();
    params.append('temporaryDid', temporaryDid);
    params.append('connectRelay', connectRelay);
    connectLink.search = params.toString();

    return connectLink.toString();
  }
}

export type ChannelOptions = {
  endpointUrl: string;
  handleMessage: (event: MessageEvent) => void;
}

export type ChannelData = {
  message: Omit<ConnectRpcRequest, 'endpointUrl'> | ConnectRpcResponse;
  type: 'request' | 'response';
}

export type Channel = {
  close: () => void;
  createGrant: () => void;
  createRequest: ({ message, uuid }: { message: string, uuid: string }) => void;
  endpoint: URL;
  getGrant: ({ uuid }: { uuid: string }) => void;
  getRequest: ({ uuid }: { uuid: string }) => void;
  send: ({ message, type }: ChannelData) => void;
}

export async function createChannel(options: ChannelOptions): Promise<Channel> {
  const { endpointUrl, handleMessage } = options;

  // ! TODO: Attempt to directly connect to a local Connect Provider:
  // !       - Connect Initiator will attempt to connect via HTTP to the Connect Provider.
  // !       - Connect Provider must begin listening to HTTP or WebSocketServer Connect Requests.

  // If direct connection succeeds, set the endpointUrl to the local Connect Provider.


  // If direct connection fails, fallback to a relay.
  const endpoint = new URL(endpointUrl);


  // ! TODO: Instantiate a Web5RpcClient.
  const rpcClient = new Web5RpcClient();

  const createGrant = (): void => {
    console.log('Creating grant');
  };

  const createRequest = async ({ message, uuid }: { message: string, uuid: string }): Promise<void> => {
    console.log(`Sending 'connect.createRequest' to ${endpoint}: ${uuid}`);
    const request: ConnectRpcRequest = {
      method  : ConnectRpcMethods.createRequest,
      message : message,
      url     : endpoint.toString(),
      uuid    : uuid
    };
    console.log('POSTING MESSAGE:', message);

    const response = await rpcClient.sendConnectRequest(request);
    // .then((response: ConnectRpcResponse) => {
    //   console.log('Response:', response);
    //   handleMessage(new MessageEvent('message', { data: response }));
    // });

    if (response.status.code  !== 200) {
      // ! TODO: Instead of throwing errors, return an error so that initiator can raise an event to the caller.
      throw new Error(`Connect Protocol: Failed to create Connect Request: (${response.status.code}) ${response.status.message}`);
    }
  };

  const close = (): () => void => {
    return function () {
      console.log('Closing channel');
    };
  };

  const getGrant = async ({ uuid }: { uuid: string }): Promise<void> => {
    let identityGrantCiphertext: string;
    let pollCounter = 0;
    const getGrantInterval = setInterval(async () => {
      if (!identityGrantCiphertext) {
        console.log(`Sending 'connect.getGrant' to ${endpoint}: ${uuid}`);

        const request: ConnectRpcRequest = {
          method  : ConnectRpcMethods.getGrant,
          message : '',
          url     : endpoint.toString(),
          uuid    : uuid
        };

        const response = await rpcClient.sendConnectRequest(request);
        pollCounter++;
        console.log('Response:', response);

        /** Silently ignore "Not Found" errors because the Connect Provider may not have sent
         * the grant yet. */
        if (response.status.code === 404) { /* Do nothing. */ }

        // Once the Identity Grant is retrieved...
        if (response.status.code  === 200 && response.message) {
          identityGrantCiphertext = response.message;
          // Pass the encrypted Identity Grant to the Connect Protocol message handler.
          handleMessage(new MessageEvent('Delegation', { data: identityGrantCiphertext }));
        }

      } else {
        clearInterval(getGrantInterval);
      }

      // If the Connect Provider has not sent the Identity Grant within 30 seconds, raise an error.
      // ! TODO: Change pollCounter to 30.
      if (pollCounter === 5) {
        clearInterval(getGrantInterval);
        // ! TODO: Instead of throwing errors, return an error so that initiator can raise an event to the caller.
        throw new Error(`Connect Protocol: Failed to receive Identity Grant from Connect Provider.`);
      }
    }, 1000);
  };

  const getRequest = async ({ uuid }: { uuid: string }): Promise<void> => {
    let connectRequestCiphertext: string;
    let pollCounter = 0;

    const getRequestInterval = setInterval(async () => {
      if (!connectRequestCiphertext) {
        console.log(`Sending 'connect.getRequest' to ${endpoint}: ${uuid}`);

        const request: ConnectRpcRequest = {
          method  : ConnectRpcMethods.getRequest,
          message : '',
          url     : endpoint.toString(),
          uuid    : uuid
        };

        const response = await rpcClient.sendConnectRequest(request);
        pollCounter++;
        console.log('GOT MESSAGE:', response.message);

        /** Silently ignore "Not Found" errors because the Connect Initiator may not have sent
         * the Connect Request yet. */
        if (response.status.code === 404) { /* Do nothing. */ }

        // Once the Connect Request is retrieved...
        if (response.status.code  === 200 && response.message) {
          connectRequestCiphertext = response.message;
          // Pass the encrypted Connect Request to the Connect Protocol message handler.
          handleMessage(new MessageEvent('Handshake', { data: connectRequestCiphertext }));
        }

      } else {
        clearInterval(getRequestInterval);
      }

      // If the Connect Request has not been retrieved within 15 seconds, raise an error.
      // ! TODO: Change pollCounter to 15.
      if (pollCounter === 5) {
        clearInterval(getRequestInterval);
        // ! TODO: Instead of throwing errors, return an error so that initiator can raise an event to the caller.
        throw new Error(`Connect Protocol: Failed to receive Connect Request from Connect Initiator.`);
      }
    }, 1000);
  };

  const send = (): ({ message, type }: ChannelData) => void => {
    return function ({ message, type }: ChannelData) {
      console.log(`Sending ${type}: ${message}`);
    };
  };

  return {
    close,
    createGrant,
    createRequest,
    endpoint,
    getGrant,
    getRequest,
    send
  };
}











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
