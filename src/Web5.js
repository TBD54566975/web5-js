import nacl from 'tweetnacl';

import { Web5DID } from './did/Web5DID.js';
import { Web5DWN } from './dwn/Web5DWN.js';
import { JSONRPCSocket } from './json-rpc/JSONRPCSocket.js';
import { LocalStorage } from './storage/LocalStorage.js';
import { AppTransport } from './transport/AppTransport.js';
import { HTTPTransport } from './transport/HTTPTransport.js';
import {
  decodePin,
  isUnsignedMessage,
  parseURL,
  triggerProtocolHandler,
} from './utils.js';

class Web5 extends EventTarget {
  #dwn;
  #did;
  #transports;

  #keys = null;
  #connection = null;

  constructor(options = { }) {
    super();

    this.#dwn = new Web5DWN(this, options?.dwn);
    this.#did = new Web5DID(this);
    this.#transports = {
      app: new AppTransport(this),
      http: new HTTPTransport(this),
      https: new HTTPTransport(this),
    };
  }

  get dwn() {
    return this.#dwn;
  }

  get did() {
    return this.#did;
  }

  get transports() {
    return this.#transports;
  }

  /**
   * @param {string} target The DID to send the message to.
   * @param {Object} request - Object containing the request parameters.
   * @param {string} request.author - The DID of the author of the message.
   * @param {*} request.data - The message data (if any).
   * @param {Object} request.message - The DWeb message.
   * @returns Promise
   */
  async send(target, request) {
    let { author, data, message } = request;

    if (isUnsignedMessage(message)) {
      const resolvedAuthor = await this.#did.resolve(author);

      // If keys are not available to sign messages, transport the message to the specified agent.
      if (!resolvedAuthor?.keys) {
        if (resolvedAuthor?.connected) {
          return this.#send([resolvedAuthor.endpoint], { author, data, message, target });
        }
  
        // TODO: Is this sufficient or might we improve how the calling app can respond by initiating a connect/re-connect flow?
        return { status: { code: 422, detail: 'Local keys not available and remote agent not connected' } };
      }
      
      message = await this.#createSignedMessage(resolvedAuthor, message, data);
    }

    const resolvedTarget = await this.#did.resolve(target);

    if (resolvedTarget?.connected) {
      return this.#send([resolvedTarget.endpoint], { author, data, message, target });
    } else if (resolvedTarget) {
      // Resolve the DWN endpoint(s) of the target and send using the endpoint's transport protocol (e.g., HTTP).
      const dwnServices = await this.#did.getServices(target, { cache: true, type: 'DecentralizedWebNode' });
      const dwnNodes = dwnServices[0]?.serviceEndpoint?.nodes;
      if (dwnNodes) {
        return this.#send(dwnNodes, { author, data, message, target });
      }
      return { status: { code: 422, detail: 'No DWN endpoints present in DID document. Request cannot be sent.' } };
    }

    return { status: { code: 422, detail: 'Target DID could not be resolved' } };
  }

  async connect(options = { }) {
    const storage = options?.storage ?? new LocalStorage();
    const connectionLocation = options?.connectionLocation ?? 'web5-connection';
    const keysLocation = options?.keysLocation ?? 'web5-keys';

    const permissionRequests = structuredClone(options?.permissionRequests);

    const connectionAlreadyExists = await this.#loadConnection({ storage, connectionLocation, keysLocation });
    if (connectionAlreadyExists) {
      return;
    }

    if (options?.silent) {
      return;
    }

    function destroySocket(socket) {
      socket.close();
      socket.removeEventListener('open', handleOpen);
      socket.removeEventListener('error', handleError);
      socket.removeEventListener('notification', handleNotification);
    }

    const removeSocket = (socket) => {
      destroySocket(socket);
      sockets.delete(socket);

      if (!sockets.size) {
        this.dispatchEvent(new CustomEvent('error'));
      }
    };

    function handleOpen(event) {
      const socket = event.target;

      socket.addEventListener('notification', handleNotification);
    }

    function handleError(event) {
      const socket = event.target;

      removeSocket(socket);
    }

    const handleNotification = async (event) => {
      const socket = event.target;
      const { method, params } = event.detail;

      switch (method) {
      case 'requested-web5':
        try {
          const connection = await socket.sendRequest('connect', { permissionRequests });
          if (!connection) {
            // stop listening to this socket as it is missing required data
            removeSocket(socket);
            return;
          }

          this.#connection = connection;
          await storage.set(connectionLocation, this.#connection);

          // Register DID on initial connection
          await this.#did.register({
            connected: true,
            did: this.#connection.did,
            endpoint: `http://localhost:${this.#connection.port}/dwn/${this.#keys.encoded.publicKey}`,
          });

          this.dispatchEvent(new CustomEvent('connection', { detail: this.#connection }));
        } catch {
          this.dispatchEvent(new CustomEvent('close'));
        }

        sockets.forEach(destroySocket);
        sockets.clear();
        return;

      case 'show-pin':
        if (!params) {
          // stop listening to this socket as it is missing required data
          removeSocket(socket);
          return;
        }

        try {
          await decodePin(params, this.#keys.decoded.secretKey);
        } catch {
          // stop listening to this socket as it has sent us invalid data
          removeSocket(socket);
          return;
        }

        this.dispatchEvent(new CustomEvent('open', { detail: params }));
        return;
      }

      // stop listening to this socket as it has sent us unexpected data
      removeSocket(socket);
    };

    const sockets = new Set();
    for (let port = 55_500; port <= 55_600; ++port) {
      const socket = new JSONRPCSocket();
      sockets.add(socket);

      socket.addEventListener('open', handleOpen);
      socket.addEventListener('error', handleError);

      socket.open(`ws://localhost:${port}/connections/${this.#keys.encoded.publicKey}`);
    }

    const encodedOrigin = this.#dwn.SDK.Encoder.stringToBase64Url(location.origin);
    triggerProtocolHandler(`web5://connect/${this.#keys.encoded.publicKey}/${encodedOrigin}`);
  }

  async #createSignedMessage(resolvedAuthor, message, data) {
    const authorizationSignatureInput = this.#dwn.SDK.Jws.createSignatureInput({
      keyId: resolvedAuthor.did + '#key-1',
      keyPair: resolvedAuthor.keys,
    });
    const signedMessage = await this.#dwn.SDK[message.interface + message.method].create({
      ...message,
      authorizationSignatureInput,
      data,
    });
    delete signedMessage.data;
    return signedMessage;
  }

  /**
   * Sends the message to one or more endpoint URIs
   * 
   * If more than one endpoint is passed, each endpoint is tried serially until one succeeds or all fail.
   * 
   * This strategy is used to account for cases like attempting to write large data streams to
   * the DWN endpoints listed in a DID document. It would be inefficient to attempt to write data to
   * multiple endpoints in parallel until the first one completes. Instead, we only try the next DWN if
   * there is a failure.  Additionally, per the DWN Specification, implementers SHOULD select from the
   * Service Endpoint URIs in the nodes array in index order, so this function makes that approach easy.
   * 
   * @param {string[]} endpoints - An array of one or more endpoints to send the message to.
   * @param {Object} request - Object containing the request parameters.
   * @param {string} request.author - The DID of the author of the message.
   * @param {*} request.data - The message data (if any).
   * @param {Object} request.message - The DWeb message.
   * @param {string} request.target - The DID to send the message to.
   * @returns Promise
   */
  async #send(endpoints, request) {
    let response;
    for (let endpoint of endpoints) {
      try {
        const url = parseURL(endpoint);
        response = await this.#transports[url?.protocol?.slice(0, -1)]?.send(url.href, request);
      } catch (error) {
        console.log(error);
        // Intentionally ignore exception and try the next endpoint.
      }
      if (response) break; // Stop looping and return after the first endpoint successfully responds.
    }

    return response ?? { status: { code: 503, detail: 'Service Unavailable' } };
  }

  async #loadKeys(options) {
    const storage = options.storage;
    const keysLocation = options.keysLocation;

    if (this.#keys) {
      return true;
    }

    const encoded = await storage.get(keysLocation);
    if (encoded) {
      this.#keys = {
        encoded,
        decoded: {
          publicKey: this.#dwn.SDK.Encoder.base64UrlToBytes(encoded.publicKey),
          secretKey: this.#dwn.SDK.Encoder.base64UrlToBytes(encoded.secretKey),
        },
      };
      return true;
    }

    if (!options.silent) {
      const decoded = nacl.box.keyPair();
      this.#keys = {
        encoded: {
          publicKey: this.#dwn.SDK.Encoder.bytesToBase64Url(decoded.publicKey),
          secretKey: this.#dwn.SDK.Encoder.bytesToBase64Url(decoded.secretKey),
        },
        decoded,
      };
      await storage.set(keysLocation, this.#keys.encoded);
    }

    return false;
  }

  async #loadConnection(options) {
    const storage = options.storage;
    const connectionLocation = options.connectionLocation;

    if (this.#connection) {
      return true;
    }

    const keysAlreadyExist = await this.#loadKeys(options);
    if (!keysAlreadyExist) {
      return false;
    }

    this.#connection = await storage.get(connectionLocation);
    if (!this.#connection) {
      return false;
    }

    // Register DID on reconnection
    await this.#did.register({
      connected: true,
      did: this.#connection.did,
      endpoint: `http://localhost:${this.#connection.port}/dwn/${this.#keys.encoded.publicKey}`,
    });

    this.dispatchEvent(new CustomEvent('connection', { detail: this.#connection }));
    return true;
  }
}

export {
  Web5,
};
