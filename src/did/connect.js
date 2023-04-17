import { JSONRPCSocket } from '../json-rpc/JSONRPCSocket.js';
import { LocalStorage } from '../storage/LocalStorage.js';
import { parseJSON, sleep, triggerProtocolHandler } from '../utils.js';

const DIDConnectMethod = {
  Ready: 'didconnect.ready',
  Initiation: 'didconnect.initiation',
  Delegation: 'didconnect.delegation',
};

const DIDConnectError = {
  BadRequest: -50400, // equivalent to HTTP Status 400
  Unauthorized: -50401, // equivalent to HTTP Status 401
  Forbidden: -50403, // equivalent to HTTP Status 403
};

export class DIDConnect {
  #web5;

  #socket = null;
  #did = null;
  #permissionsRequests = [];

  
  // TEMP
  // TODO: Replace this once the DID Manager and Keystore have been implemented
  #storage = null;
  #didStoreName = null;

  constructor(web5) {
    this.#web5 = web5;
  }

  async connect(options = { }) {
    // DID Connection configuration
    const host = options?.host ?? 'web5://localhost'; // Default to local agent deep link (desktop or mobile)
    this.#storage = options?.storage ?? new LocalStorage();
    this.#didStoreName = options?.didStoreName ?? 'web5-dids';

    // Pre-Flight Check: Ensure that the app has a DID
    await this.#appDidLoadOrCreate();

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

    // Queue the request so that it can be processed DIDConnect reaches the Delegation step
    this.#permissionsRequests.push(permissionsRequest);
  }

  async #initiateWeb5Client() {  
    // Pre-Flight Check: Is the Web5 Client already connected to the Provider? If NO, try to connect.
    let connectedToProvider = this.#alreadyConnected() || await this.#connectWeb5Provider();
    if (!connectedToProvider) return;

    try {
      // Send a request to the agent initiating the DIDConnect process.
      const verificationResult = await this.#socket.sendRequest(DIDConnectMethod.Initiation);

      // Decrypt the PIN challenge payload.
      const pinBytes = await this.#web5.did.decrypt({
        did: this.#did.id,
        payload: verificationResult,
        privateKey: this.#did.keys[0].keypair.privateKeyJwk.d, // TODO: Remove once a keystore has been implemented
      });
      const pin = this.#web5.dwn.SDK.Encoder.bytesToString(pinBytes);

      // Emit event notifying the DWA that the PIN can be displayed to the end user.
      this.#web5.dispatchEvent(new CustomEvent('challenge', { detail: { pin } }));

      // Advance DIDConnect to Delegation and wait for challenge response from DIDConect Provider.
      // Also send queued PermissionsRequest to Provider.
      const delegationResult = await this.#socket.sendRequest(DIDConnectMethod.Delegation, { message: this.#permissionsRequests.pop() });

      const authorizedDID = delegationResult.grantedBy;

      // Register DID now that the connection was authorized
      await this.#web5.did.register({
        connected: true,
        did: authorizedDID,
        endpoint: `http://localhost:${this.#did.endpoint.port}/dwn`,
      });

      this.#did.endpoint.authorized = true;
      this.#did.endpoint.mruDid = authorizedDID;
      this.#did.endpoint.permissions ??= { };
      this.#did.endpoint.permissions[authorizedDID] = delegationResult;
      this.#storage.set(this.#didStoreName, this.#did);

      // Emit event notifying the DWA that the connection was authorized and which DID the app was authorized
      // to use for interactions with the Provider.
      this.#web5.dispatchEvent(new CustomEvent('authorized', { detail: { did: authorizedDID } }));
    } catch (error) {
      // Clear authorization and permissions
      this.#did.endpoint.authorized = false;
      this.#did.endpoint.permissions = { };
      // Update DID store
      this.#storage.set(this.#didStoreName, this.#did);

      // Close and delete socket
      this.#socket.close();
      this.#socket = null;

      switch (error.code) {
      case DIDConnectError.Unauthorized:
        // Emit event notifying the DWA that the connection request was denied
        this.#web5.dispatchEvent(new CustomEvent('denied', { detail: { message: error.message } }));
        break;

      case DIDConnectError.Forbidden:
        // Emit event notifying the DWA that this app has been blocked from connecting
        this.#web5.dispatchEvent(new CustomEvent('blocked', { detail: { message: error.message } }));
        break;

      default:
        // Emit event notifying the DWA that an error occurred
        this.#web5.dispatchEvent(new CustomEvent('error', { detail: { message: error.message } }));
        break;
      }
    }
  }


  /**
   * PRE-FLIGHT CHECK FUNCTIONS
   */

  /**
   * APP IDENTITY & CONFIGURATION
   * Verify that the client has the necessary credentials (DID with keys) to connect.
   * Load existing DID material and settings from storage, if present. If not, create a new DID.
   * @returns {Promise<void>}
   */
  async #appDidLoadOrCreate() {
    // If the DID is already stored in memory, nothing to to
    if (this.#did !== null) return;

    // Try to load from storage;
    let didLoadOrCreate = await this.#storage.get(this.#didStoreName);
    if (!didLoadOrCreate) {
      // Could not load from storage, so create a new DID
      didLoadOrCreate = await this.#web5.did.create(this.#web5.did.DIDMethodName.Key);
      await this.#storage.set(this.#didStoreName, didLoadOrCreate);
    }
    this.#did = didLoadOrCreate;
  }

  /**
   * CLIENT READINESS
   * Check the client's state and if the client is already connected.
   * @returns {boolean} Is the client already connected?
  */
  #alreadyConnected() {
    return !!this.#socket?.ready;
  }

  /**
   * WEB5 PROVIDER AVAILABILITY
   * Check whether configuration settings (server address, ports, etc.) are available.
   * If Yes, attempt to reconnect and ensure the Provider is online and client is authorized to access resources.
   * If No, scan for local listening Provider and attempt to open socket and trigger custom URL scheme handler.
   * 
   * @returns {Promise<boolean>} True, if Provider was available and a connection was established. False, otherwise.
   */
  async #connectWeb5Provider() {
    // DID data and configuration should already be present at this stage but double-check
    if (this.#did === null) throw new Error('Unexpected state: DID data and configuration should have already been initialized');

    // Dynamically generate DID Connect path in case origin has changed.
    const encodedOrigin = this.#web5.dwn.SDK.Encoder.stringToBase64Url(location.origin);
    const path = `didconnect/${this.#did.id}/${encodedOrigin}`;

    let host, startPort, endPort, userInitiatedAction;

    // Check whether DID Connect configuration is available
    if (this.#did.endpoint !== undefined) {
      // If configuration is available, attempt to reconnect
      host = this.#did.endpoint.host;
      startPort = endPort = this.#did.endpoint.port;
      userInitiatedAction = !this.#did.endpoint.authorized;
    } else {
      host = 'localhost';
      startPort = 55_500, endPort = 55_550;
      userInitiatedAction = true;
    }

    try {
      const { port, socket } = await this.#findSocket(host, startPort, endPort, path, { userInitiatedAction });

      this.#socket = socket;

      // Update DID store
      this.#did.endpoint ??= { };
      this.#did.endpoint.host = host;
      this.#did.endpoint.port = port;
      this.#storage.set(this.#didStoreName, this.#did);
      return true;

    } catch (error) {
      console.error('Error:', error.message);
      // Emit event notifying the DWA that the connection attempt failed.
      this.#web5.dispatchEvent(new CustomEvent('error', { detail: error.message }));
    }
    return false;
  }

  async #findSocket(host, startPort, endPort, path, options = { }) {
    for (let port = startPort; port <= endPort; ++port) {
      try {
        const socket = await this.#trySocket(host, port, path, options);
        return { port, socket };
      } catch (error) {
        console.error(error.message);
        if (port !== endPort) {
          await sleep(options.delay ?? 5); // Wait between socket connection attempts.
        }
      }
    }

    throw new Error(`Failed to connect between ports ${startPort} and ${endPort}`);
  }

  async #trySocket(host, port, path, options = { }) {
    return new Promise((resolve, reject) => {
      const socket = new JSONRPCSocket();

      function removeListeners() {
        socket.removeEventListener('open', handleOpen, { capture: true });
        socket.removeEventListener('notification', handleNotification, { capture: true });
        socket.removeEventListener('close', handleClose, { capture: true });
        socket.removeEventListener('error', handleError, { capture: true });
      }

      function handleOpen() {
        if (options.userInitiatedAction) {
          triggerProtocolHandler(`web5://${path}`);
        }
      }

      function handleNotification(event) {
        removeListeners();

        const { method, params } = event.detail;
        if (method === DIDConnectMethod.Ready) {
          resolve(socket);
        } else {
          reject(new Error(`Unexpected notification on port ${port}: ${event.detail}`));
        }
      }

      function handleClose() {
        removeListeners();

        reject(new Error(`Connection closed on port ${port}`));
      }

      function handleError() {
        removeListeners();

        reject(new Error(`Connection failed on port ${port}`));
      }

      socket.addEventListener('open', handleOpen, { capture: true, passive: true, once: true });
      socket.addEventListener('notification', handleNotification, { capture: true, passive: true, once: true });
      socket.addEventListener('close', handleClose, { capture: true, passive: true, once: true });
      socket.addEventListener('error', handleError, { capture: true, passive: true, once: true });

      socket.open(`ws://${host}:${port}/${path}`).catch(reject);
    });
  }
}