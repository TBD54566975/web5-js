import nacl from 'tweetnacl';
import * as DwnSDK from '@tbd54566975/dwn-sdk-js';

import { Protocols } from './interfaces/Protocols';
import { Records } from './interfaces/Records';
import { LocalStorage } from './storage/LocalStorage';
import { AppTransport } from './transports/AppTransport';
import { HTTPTransport } from './transports/HTTPTransport';
import { decodePin, triggerProtocolHandler } from './utils';

class Web5 extends EventTarget {
  #interfaces;
  #transports;

  #keys = null;
  #connection = null;

  constructor() {
    super();

    this.#interfaces = {
      protocols: new Protocols(this),
      records: new Records(this),
    };

    this.#transports = {
      app: new AppTransport(),
      http: new HTTPTransport(),
      https: new HTTPTransport(),
    };
  }

  get protocols() { return this.#interfaces.protocols; }
  get records() { return this.#interfaces.records; }

  /**
   * @param {string} target DID to route the message to
   * @param {{author: string, data: any, message: {}}} request
   * @returns
   */
  async send(target, request) {
    let { author, data, message } = request;

    // If a local key chain is not available to sign messages, transport the message to the specified agent.
    if (!author?.keyChain) {
      if (author?.connected) {
        return this.#send(author.endpoint, { author, data, message, target });
      }

      // TODO: Is this sufficient or might we improve how the calling app can respond by initiating a connect/re-connect flow?
      return { error: { code: 99, message: 'Local key chain not available and remote agent not connected' } };
    }

    message = await this.#createSignedMessage(author, message, data);

    if (target?.connected) {
      return this.#send(author.endpoint, { author, data, message, target });
    }

    // TODO: Add functionality to resolve the DWN endpoint of the target DID and send a message using the endpoint's transport protocol (HTTP or WS).
    return { };
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
            publicKey: DwnSDK.Encoder.base64UrlToBytes(keys.publicKey),
            secretKey: DwnSDK.Encoder.base64UrlToBytes(keys.secretKey),
          },
        };
      } else {
        const keys = nacl.box.keyPair();
        this.#keys = {
          encoded: {
            publicKey: DwnSDK.Encoder.bytesToBase64Url(keys.publicKey),
            secretKey: DwnSDK.Encoder.bytesToBase64Url(keys.secretKey),
          },
          decoded: keys,
        };
        await storage.set(keysLocation, this.#keys.encoded);
      }
    }

    const encodedOrigin = DwnSDK.Encoder.bytesToBase64Url(location.origin);
    triggerProtocolHandler(`web5://connect/${this.#keys.encoded.publicKey}/${encodedOrigin}`);

    function destroySocket(socket) {
      socket.close();
      socket.removeEventListener('open', handleOpen);
      socket.removeEventListener('message', handleMessage);
    }

    function handleOpen(event) {
      const socket = event.target;
      socket.addEventListener('message', handleMessage);
      sockets.add(socket);
    }

    const handleMessage = async (event) => {
      const socket = event.target;

      let json;
      try {
        json = JSON.parse(event.data);
      } catch { }

      switch (json?.type) {
      case 'connected':
        if (!json.data) {
          destroySocket(socket);
          sockets.delete(socket);
          return;
        }

        this.#connection = json.data;
        await storage.set(connectionLocation, this.#connection);
        this.dispatchEvent(new CustomEvent('connection', { detail: this.#connection }));
        break;

      case 'requested':
        if (!json.data) {
          destroySocket(socket);
          sockets.delete(socket);
          return;
        }

        try {
          await decodePin(json.data, this.#keys.decoded.secretKey);
        } catch (e) {
          console.log(e);
          destroySocket(socket);
          sockets.delete(socket);
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
      }

      sockets.forEach(destroySocket);
      sockets.clear();
    };

    const sockets = new Set();
    for (let port = 55_500; port <= 55_600; ++port) {
      const socket = new WebSocket(`ws://localhost:${port}/connections/${this.#keys.encoded.publicKey}`);
      socket.addEventListener('open', handleOpen);
    }
  }

  async #createSignedMessage(author, message, data) {
    const signedMessage = await DwnSDK[message.interface + message.method].create({
      ...message,
      authorizationSignatureInput: DwnSDK.Jws.createSignatureInput({
        keyId: author.did + '#key-1',
        keyPair: author.keypair
      }),
      data,
    });
    delete signedMessage.data;
    return signedMessage;
  }

  async #send(endpoint, request) {
    const scheme = endpoint.split(':')[0];
    return this.#transports[scheme]?.send(endpoint, request);
  }
}

export {
  Web5
};
