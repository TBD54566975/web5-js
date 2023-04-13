import { DIDConnectRPCMethods, DIDConnectStep, JSONRPCErrorCodes, findWebSocket } from './utils.js';
import { WebSocketClient } from './ws-client.js';
import { parseJSON } from '../../utils.js';
import { LocalStorage } from '../../storage/LocalStorage.js';

export class DIDConnect {
  #web5;

  #client = null;
  #connection = null;
  #did = null;
  #permissionsRequests = [];

  
  // TEMP
  // TODO: Replace this once the DID Manager and Keystore have been implemented
  #storage = null;
  #didStoreName = null;

  constructor(web5) {
    this.#web5 = web5;
  }

  get web5() {
    return this.#web5;
  }

  async connect(options = { }) {
    // DID Connection configuration
    const host = options?.host ?? 'web5://localhost'; // Default to local agent deep link (desktop or mobile)
    this.#storage = options?.storage ?? new LocalStorage();
    this.#didStoreName = options?.didStoreName ?? 'web5-dids';

    // Pre-Flight Check: Ensure that the app has a DID
    await this.#pfcAppDid();

    const protocol = (new URL(host)).protocol;
    switch (protocol) {
    case 'did:':
      // TODO: Implement resolve target DID and attempt to connect to endpoints
      throw new Error (`DIDConnect protocol not implemented: ${protocol}`);
      // break;

    case 'http:':
    case 'https:':
      // TODO: implement
      throw new Error (`DIDConnect protocol not implemented: ${protocol}`);
      // break;

    case 'web5:':
      this.#initiateWeb5Client();
      break;

    case 'ws:':
    case 'wss:':
      // TODO: implement
      throw new Error (`DIDConnect protocol not implemented: ${protocol}`);
      // break;
    }
  }

  async permissionsRequest(target, request) {
    const permissionsRequest = structuredClone(request.message);

    // Request permissions for this app's DID
    permissionsRequest.grantedTo = this.#did.id;

    // If the app previously connected, request permission to access resources
    // of the MRU (most recently used) remote Provider Profile DID.
    if (this.#did?.endpoint?.mruDid) {
      permissionsRequest.grantedBy = this.#did.endpoint.mruDid;
    }

    if (!this.#connection) {
      // Queue the request so that it can be processed DIDConnect reaches the Delegation step
      this.#permissionsRequests.push(permissionsRequest);
    } else {
      // TODO: Handle post-connection permissions requests
      //       Send a message to the Provider requesting adds/removes/changes to permissions granted
    }
  }

  async #initiateWeb5Client() {  
    // Handler that will be used to step through the DIDConnect process phases
    const handleMessage = async (event) => {
      const rpcMessage = parseJSON(event.data);

      switch (connectStep) {

      case DIDConnectStep.Initiation: {
        // The Client App initiates the DIDConnect process, so no messages from the Provider are expected until the Verification step
        console.warn('Unexpected message received before Web5 Client was ready');
        break;
      }

      case DIDConnectStep.Verification: {
        const verificationResult = rpcMessage?.result;
        // Encrypted PIN challenge received from DIDConnect Provider
        if (verificationResult?.ok) {
          // Decrypt the PIN challenge payload
          const pinBytes = await this.web5.did.decrypt({
            did: this.#did.id,
            payload: verificationResult.payload,
            privateKey: this.#did.keys[0].keypair.privateKeyJwk.d, // TODO: Remove once a keystore has been implemented
          });
          const pin = this.web5.dwn.SDK.Encoder.bytesToString(pinBytes);

          // Emit event notifying the DWA that the PIN can be displayed to the end user
          this.web5.dispatchEvent(new CustomEvent('challenge', { detail: { pin } }));
          
          // Advance DIDConnect to Delegation and wait for challenge response from DIDConect Provider
          connectStep = DIDConnectStep.Delegation;
          
          // Send queued PermissionsRequest to Provider.
          this.#client.sendRequest(DIDConnectRPCMethods[connectStep], { message: this.#permissionsRequests.pop() });

        } else {
          // TODO: Remove socket listeners, destroy socket, destroy this.#client, and emit error to notify user of app
        }
        break;
      }

      case DIDConnectStep.Delegation: {
        const delegationResult = rpcMessage?.result;

        // Success
        if (delegationResult?.ok) {
          const authorizedDid = delegationResult?.message?.grantedBy;
          // Register DID now that the connection was authorized
          await this.web5.did.register({
            connected: true,
            did: authorizedDid,
            endpoint: `http://localhost:${this.#client.port}/dwn`,
          });

          this.#did.endpoint.authorized = true;
          this.#did.endpoint.mruDid = authorizedDid;
          this.#did.endpoint.permissions = { ...this.#did.endpoint?.permissions,
            [authorizedDid]: { ...delegationResult.message },
          };
          this.#storage.set(this.#didStoreName, { ...this.#did });

          // Emit event notifying the DWA that the connection was authorized and which DID the app was authorized
          // to use for interactions with the Provider.
          this.web5.dispatchEvent(new CustomEvent('authorized', { detail: { did: authorizedDid } }));

          // Stop handling messages since the DID Connect process has completed
          this.#client.removeEventListener('message', handleMessage);
        }
        
        // Handle errors
        const delegationError = rpcMessage?.error;
        if (delegationError) {
          // Clear authorization and permissions
          this.#did.endpoint.authorized = false;
          this.#did.endpoint.permissions = {};
          // Update DID store
          this.#storage.set(this.#didStoreName, { ...this.#did });

          // Close and delete socket
          this.#client.removeEventListener('message', handleMessage);
          this.#client.close();
          this.#client = null;

          const { code = undefined, message = undefined } = delegationError;
          if (code === JSONRPCErrorCodes.Unauthorized) {
            // Emit event notifying the DWA that the connection request was denied
            this.web5.dispatchEvent(new CustomEvent('denied', { detail: { message: message } }));
          } else if (code === JSONRPCErrorCodes.Forbidden) {
            // Emit event notifying the DWA that this app has been blocked from connecting
            this.web5.dispatchEvent(new CustomEvent('blocked', { detail: { message: message } }));
          }
        }

        // Reached terminal DID Connect state where connection was either authorized/denied/block
        // Reset DID Connect step to be ready for any future reconnects/switch account/change permission requests
        connectStep = DIDConnectStep.Initiation;

        break;
      }
      }
    };
    
    let connectStep = DIDConnectStep.Initiation;

    // Pre-Flight Check: Is the Web5 Client already connected to the Provider? If YES, discontinue further processing.
    const alreadyConnected = this.#pfcAlreadyConnected();

    if (!alreadyConnected) {
      // Pre-Flight Check: 
      await this.#pfcWeb5AgentAvailability();
    }
    // Start listening for messages from the DIDConnect Provider
    this.#client.addEventListener('message', handleMessage);

    // Send a request to the agent initiating the DIDConnect process
    this.#client.sendRequest(DIDConnectRPCMethods.Initiation);

    // Advance DIDConnect to Verification and wait for encrypted challenge PIN from DIDConnect Provider
    connectStep = DIDConnectStep.Verification;
  }


  /**
   * PRE-FLIGHT CHECK FUNCTIONS
   */

  /**
   * APP IDENTITY & CONFIGURATION
   * Verify that the client has the necessary credentials (DID with keys) to connect.
   * Restore existing settings from storage, if present.
   * @returns {Promise<void>}
   */
  async #pfcAppDid() {
    // If the DID is already stored in memory, nothing to to
    if (this.#did !== null) return;

    // Try to restore from storage;
    let didRestoreOrCreate = await this.#storage.get(this.#didStoreName);
    if (!didRestoreOrCreate) {
      // Could not restore from storage, so create a new DID
      didRestoreOrCreate = await this.#web5.did.create('key');
      await this.#storage.set(this.#didStoreName, didRestoreOrCreate);
    }
    this.#did = didRestoreOrCreate;
  }

  /**
   * CLIENT READINESS
   * Check the client's state and if the client is already connected.
   * @returns {boolean} Is the client already connected?
  */
  #pfcAlreadyConnected() {
    // Check whether the client is already instantiated
    const clientAvailable = (this.#client !== null);
    const alreadyConnected = this.#client?.connected;
    if (clientAvailable && alreadyConnected) {
      return true;
    }
    return false;
  }

  /**
   * WEB5 AGENT AVAILABILITY
   * Check whether configuration settings (server address, ports, etc.) are available.
   * If Yes, attempt to reconnect and ensure the agent is online and client is authorized to access resources.
   * If No, scan for local listening agent and attempt to open socket and trigger custom URL scheme handler.
   * 
   * @returns {Promise<boolean>} True, if Agent was available and a connection was established. False, otherwise.
   */
  async #pfcWeb5AgentAvailability() {
    // DID data and configuration should already be present at this stage but double-check
    if (this.#did === null) throw new Error('Unexpected state: DID data and configuration should have already been initialized');

    // Dynamically generate DID Connect path in case origin has changed.
    const encodedOrigin = this.#web5.dwn.SDK.Encoder.stringToBase64Url(location.origin);
    const connectPath = `didconnect/${this.#did.id}/${encodedOrigin}`;

    let socket, startPort, endPort, userInitiatedAction, host;

    // Check whether DID Connect configuration is available
    if (this.#did?.endpoint !== undefined) {
      // If configuration is available, attempt to reconnect
      host = this.#did.endpoint.host;
      startPort = endPort = this.#did.endpoint.port;
      userInitiatedAction = !this.#did.endpoint.authorized;
    } else {
      host = 'localhost';
      startPort = 55_500, endPort = 55_600;
      userInitiatedAction = true;
    }

    try {
      socket = await findWebSocket(startPort, endPort, connectPath, userInitiatedAction, host);

      // Instantiate a WebSocket Client instance with the already open socket
      this.#client = new WebSocketClient(socket, this.#web5);
      // Update DID store
      this.#did.endpoint = { ...this.#did?.endpoint,
        host,
        port: this.#client.port,
      };
      this.#storage.set(this.#didStoreName, { ...this.#did });
      return true;

    } catch (error) {
      console.error('Error:', error.message);
      // Emit event notifying the DWA that the connection attempt failed.
      this.web5.dispatchEvent(new CustomEvent('error', { detail: error.message }));
    }
    return false;
  }
}