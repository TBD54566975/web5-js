import nacl from 'tweetnacl';

import { Web5DID } from './did/Web5DID.js';
import { Web5DWN } from './dwn/Web5DWN.js';
import { LocalStorage } from './storage/LocalStorage.js';
import { AppTransport } from './transport/AppTransport.js';
import { HTTPTransport } from './transport/HTTPTransport.js';
import {
  decodePin,
  isUnsignedMessage,
  parseJSON,
  parseURL,
  promiseSeriesAny,
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
   * @param {string} target DID to route the message to
   * @param {{author: string, data: any, message: {}}} request
   * @returns
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
        return { status: { code: 97, detail: 'Local keys not available and remote agent not connected' } };
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
      return { status: { code: 98, detail: 'No DWN endpoints present in DID document. Request cannot be sent.' } };
    }

    return { status: { code: 99, detail: 'Target DID could not be resolved' } };
  }

  async connect(options = { }) {
    const storage = options?.storage ?? new LocalStorage();
    const connectionLocation = options?.connectionLocation ?? 'web5-connection';
    const keysLocation = options?.keysLocation ?? 'web5-keys';

    if (this.#connection) {
      return;
    }

    this.#connection = await storage.get(connectionLocation);
    if (this.#connection) {
      // Register DID on reconnection
      await this.#did.register({
        connected: true,
        did: this.#connection.did,
        endpoint: `http://localhost:${this.#connection.port}/dwn`,
      });

      this.dispatchEvent(new CustomEvent('connection', { detail: this.#connection }));
      return;
    }

    if (options?.silent) {
      return;
    }

    if (!this.#keys) {
      const keys = await storage.get(keysLocation);
      if (keys) {
        this.#keys = {
          encoded: keys,
          decoded: {
            publicKey: this.#dwn.SDK.Encoder.base64UrlToBytes(keys.publicKey),
            secretKey: this.#dwn.SDK.Encoder.base64UrlToBytes(keys.secretKey),
          },
        };
      } else {
        const keys = nacl.box.keyPair();
        this.#keys = {
          encoded: {
            publicKey: this.#dwn.SDK.Encoder.bytesToBase64Url(keys.publicKey),
            secretKey: this.#dwn.SDK.Encoder.bytesToBase64Url(keys.secretKey),
          },
          decoded: keys,
        };
        await storage.set(keysLocation, this.#keys.encoded);
      }
    }

    const encodedOrigin = this.#dwn.SDK.Encoder.bytesToBase64Url(location.origin);
    triggerProtocolHandler(`web5://connect/${this.#keys.encoded.publicKey}/${encodedOrigin}`);

    function destroySocket(socket) {
      socket.close();
      socket.removeEventListener('open', handleOpen);
      socket.removeEventListener('error', handleError);
      socket.removeEventListener('message', handleMessage);
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

      socket.addEventListener('message', handleMessage);
    }

    function handleError(event) {
      const socket = event.target;

      removeSocket(socket);
    }

    const handleMessage = async (event) => {
      const socket = event.target;

      const json = parseJSON(event.data);

      switch (json?.type) {
      case 'connected':
        if (!json.data) {
          removeSocket(socket);
          return;
        }

        this.#connection = json.data;
        await storage.set(connectionLocation, this.#connection);

        // Register DID on initial connection
        await this.#did.register({
          connected: true,
          did: this.#connection.did,
          endpoint: `http://localhost:${this.#connection.port}/dwn`,
        });

        this.dispatchEvent(new CustomEvent('connection', { detail: this.#connection }));
        break;

      case 'requested':
        if (!json.data) {
          removeSocket(socket);
          return;
        }

        try {
          await decodePin(json.data, this.#keys.decoded.secretKey);
        } catch {
          removeSocket(socket);
          return;
        }

        this.dispatchEvent(new CustomEvent('open', { detail: json.data }));
        return;

      case 'blocked':
      case 'denied':
      case 'closed':
        this.dispatchEvent(new CustomEvent('close'));
        break;

      case 'unknown':
        return;

      default:
        removeSocket(socket);
        return;
      }

      sockets.forEach(destroySocket);
      sockets.clear();
    };

    const sockets = new Set();
    for (let port = 55_500; port <= 55_600; ++port) {
      const socket = new WebSocket(`ws://localhost:${port}/connections/${this.#keys.encoded.publicKey}`);
      sockets.add(socket);

      socket.addEventListener('open', handleOpen);
      socket.addEventListener('error', handleError);
    }
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

  async #send(endpoints, request) {
    // Convert each endpoint to a function that returns a promise.
    const sendRequests = endpoints.map(endpoint => () => {
      const url = parseURL(endpoint);
      return this.#transports[url?.protocol?.slice(0, -1)]?.send(url.href, request);
    });

    // Try to send to each endpoint serially until the first one fulfills or all reject
    return promiseSeriesAny(sendRequests)
      .then(result => {
        return result;
      })
      .catch(error => {
        console.error('All service endpoints were unreachable.', error);
        return { status: { code: 503, detail: 'Service Unavailable' } };
      });
  }
}

export {
  Web5,
};
