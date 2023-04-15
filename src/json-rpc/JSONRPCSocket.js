import { JSONRPCError } from './JSONRPCError.js';
import { parseJSON } from '../utils.js';

class JSONRPCSocket extends EventTarget {
  #socket = null;

  #nextRequestID = 0;
  #requestHandlersForID = new Map();

  #readyQueue = [ ];

  #bound = { };

  constructor() {
    super();

    this.#bound['message'] = this.#handleMessage.bind(this);
    this.#bound['close'] = this.#handleClose.bind(this);
  }

  get ready() {
    return this.#socket?.readyState === WebSocket.OPEN;
  }

  open(url) {
    if (this.ready) {
      return Promise.resolve();
    }

    if (this.#socket) {
      return Promise.reject();
    }

    return new Promise((resolve, reject) => {
      this.#bound['open'] = () => {
        this.#socket.removeEventListener('error', this.#bound['error'], { capture: true });

        this.#bound['error'] = this.#handleError.bind(this);
        this.#socket.addEventListener('error', this.#bound['error'], { capture: true, passive: true, once: true });

        this.dispatchEvent(new CustomEvent('open'));
        resolve();

        for (const message of this.#readyQueue.splice(0, Infinity)) {
          this.#socket.send(message);
        }
      };

      this.#bound['error'] = (event) => {
        this.#close();

        this.dispatchEvent(new CustomEvent('error'), { detail: event.detail });
        reject(event.detail);
      };

      this.#socket = new WebSocket(url?.href ?? url);
      this.#socket.addEventListener('open', this.#bound['open'], { capture: true, passive: true, once: true });
      this.#socket.addEventListener('message', this.#bound['message'], { capture: true, passive: true });
      this.#socket.addEventListener('close', this.#bound['close'], { capture: true, passive: true, once: true });
      this.#socket.addEventListener('error', this.#bound['error'], { capture: true, passive: true, once: true });
    });
  }

  sendRequest(method, params = undefined, callback = undefined) {
    const id = ++this.#nextRequestID;

    const message = JSON.stringify({ id, method, params });
    if (this.ready) {
      this.#socket.send(message);
    } else {
      this.#readyQueue.push(message);
    }

    if (!callback) {
      return new Promise((resolve, reject) => {
        this.#requestHandlersForID.set(id, { resolve, reject });
      });
    }

    this.#requestHandlersForID.set(id, {
      resolve: callback,
      reject: callback,
    });
  }

  sendNotification(method, params = undefined) {
    const message = JSON.stringify({ method, params });
    if (this.ready) {
      this.#socket.send(message);
    } else {
      this.#readyQueue.push(message);
    }
  }

  close() {
    if (!this.ready) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.#socket.addEventListener('close', resolve, { capture: true, passive: true, once: true });

      this.#close();

      this.dispatchEvent(new CustomEvent('close'));
    });
  }

  #close() {
    this.#socket.removeEventListener('open', this.#bound['open'], { capture: true });
    this.#socket.removeEventListener('message', this.#bound['message'], { capture: true });
    this.#socket.removeEventListener('close', this.#bound['close'], { capture: true });
    this.#socket.removeEventListener('error', this.#bound['error'], { capture: true });
    this.#socket.close();
    this.#socket = null;

    this.#nextRequestID = 0;

    for (const { reject } of Array.from(this.#requestHandlersForID.values())) {
      reject(JSONRPCError.InternalError);
    }
    this.#requestHandlersForID.clear();
  }

  #error(error) {
    if (!this.ready) {
      return;
    }

    this.#close();

    this.dispatchEvent(new CustomEvent('error'), { detail: error });
  }

  #handleMessage(event) {
    const json = parseJSON(event.data);
    if (!json) {
      // stop listening to this socket as it is missing required data
      this.#error(JSONRPCError.ParseError);
      return;
    }

    const id = json.id;
    if (!id) {
      if (!json.method) {
        // stop listening to this socket as it is missing required data
        this.#error(JSONRPCError.ParseError);
        return;
      }

      this.dispatchEvent(new CustomEvent('notification', { detail: {
        method: json.method,
        params: json.params ?? { },
      } }));
      return;
    }

    const { resolve, reject } = this.#requestHandlersForID.get(id) ?? { };
    this.#requestHandlersForID.delete(id);

    if (!resolve || !reject) {
      // stop listening to this socket as it is in an unexpected state
      this.#error(JSONRPCError.ParseError);
      return;
    }

    if (json.error) {
      if (!json.error.code || !json.error.message) {
        // stop listening to this socket as it is missing required data
        this.#error(JSONRPCError.ParseError);
        return;
      }

      reject(new JSONRPCError(json.error.code, json.error.message, json.error.data));
    } else {
      resolve(json.result);
    }
  }

  #handleClose() {
    this.#close();

    this.dispatchEvent(new CustomEvent('close'));
  }

  #handleError(event) {
    this.#error(event.error);
  }
}

export {
  JSONRPCSocket,
};
