import { parseJSON } from '../utils.js';
import { JSONRPCError } from './JSONRPCError.js';

class JSONRPCSocket extends EventTarget {
  #socket = null;
  #ready = false;

  #nextRequestID = 0;
  #requestHandlersForID = new Map();

  #bound = { };

  constructor() {
    super();

    this.#bound['open'] = this.#handleOpen.bind(this);
    this.#bound['message'] = this.#handleMessage.bind(this);
    this.#bound['close'] = this.#handleClose.bind(this);
    this.#bound['error'] = this.#handleError.bind(this);
  }

  open(url) {
    if (this.#ready) {
      return;
    }

    this.#socket = new WebSocket(url);
    this.#socket.addEventListener('open', this.#bound['open'], { capture: true, passive: true, once: true });
    this.#socket.addEventListener('message', this.#bound['message'], { capture: true, passive: true });
    this.#socket.addEventListener('close', this.#bound['close'], { capture: true, passive: true, once: true });
    this.#socket.addEventListener('error', this.#bound['error'], { capture: true, passive: true, once: true });
  }

  sendRequest(method, params = undefined, callback = undefined) {
    if (!this.#ready) {
      throw 'not ready';
    }

    const id = ++this.#nextRequestID;

    this.#socket.send(JSON.stringify({ id, method, params }));

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
    if (!this.#ready) {
      throw 'not ready';
    }

    this.#socket.send(JSON.stringify({ method, params }));
  }

  close() {
    const closed = this.#close();
    if (!closed) {
      return;
    }

    this.dispatchEvent(new CustomEvent('close'));
  }

  #close() {
    if (!this.#ready) {
      return false;
    }

    this.#ready = false;

    this.#socket.removeEventListener('open', this.#bound['open'], { capture: true });
    this.#socket.removeEventListener('message', this.#bound['message'], { capture: true });
    this.#socket.removeEventListener('close', this.#bound['close'], { capture: true });
    this.#socket.removeEventListener('error', this.#bound['error'], { capture: true });
    this.#socket.close();
    this.#socket = null;

    this.#nextRequestID = 0;

    for (const { reject } of Array.from(this.#requestHandlersForID.values())) {
      reject(new Error('closed'));
    }
    this.#requestHandlersForID.clear();

    return true;
  }

  #error(error) {
    const closed = this.#close();
    if (!closed) {
      return;
    }

    this.dispatchEvent(new CustomEvent('error'), { detail: error });
  }

  #handleOpen() {
    this.#ready = true;

    this.dispatchEvent(new CustomEvent('open'));
  }

  #handleMessage(event) {
    const json = parseJSON(event.data);
    if (!json) {
      // stop listening to this socket as it is missing required data
      this.#error('invalid message');
      return;
    }

    const id = json.id;
    if (!id) {
      if (!json.method) {
        // stop listening to this socket as it is missing required data
        this.#error('invalid notification');
        return;
      }

      this.dispatchEvent(new CustomEvent('notification', { detail: {
        method: json.method,
        params: json.params ?? { },
      } }));
      return;
    }

    const { resolve, reject } = this.#requestHandlersForID.get(id) ?? { };
    if (!resolve || !reject) {
      // stop listening to this socket as it is in an unexpected state
      this.#error('invalid id');
      return;
    }

    if (json.error) {
      if (!json.error.code || !json.error.message) {
        // stop listening to this socket as it is missing required data
        this.#error('invalid error');
        return;
      }

      reject(new JSONRPCError(json.error.code, json.error.message, json.error.data));
    } else {
      resolve(json.result);
    }
  }

  #handleClose() {
    this.close();
  }

  #handleError(event) {
    this.#error(event.error);
  }
}

export {
  JSONRPCSocket,
};
