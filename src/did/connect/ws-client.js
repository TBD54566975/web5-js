import { parseJSON } from '../../utils.js';

export class WebSocketClient {
  #port;
  #requestID = 0;
  #socket;

  /**
   * 
   * @param {WebSocket} socket 
   */
  constructor(socket) {
    this.#port = (new URL(socket.url)).port;
    this.#socket = socket;
  }

  get port() {
    return this.#port;
  }

  get connected() {
    return this.#socket.readyState === WebSocket.OPEN;
  }

  get requestID() {
    return ++this.#requestID;
  }

  addEventListener(event, callback, options = undefined) {
    this.#socket.addEventListener(event, callback, options);
  }

  close() {
    if (!this.connected) {
      return false;
    }

    this.#socket.close();
    this.#socket = null;
    this.#requestID = 0;

    return true;
  }

  /**
   * 
   * @param {string} host protocol://hostname or protocol://hostname:port to connect to
   * @returns 
   */
  static async create(url) {
    return new Promise((resolve, _reject) => {
      const socket = new WebSocket(url);
      
      socket.onopen = _event => {
        const client = new WebSocketClient(socket);
        return resolve(client);
      };
    });
  }

  onmessage(callback) {
    this.#socket.onmessage = callback;
  }

  removeEventListener(event, callback) {
    this.#socket.removeEventListener(event, callback);
  }

  sendRequest(method, params = undefined) {
    this.#socket.send(JSON.stringify({ id: this.requestID, method, params }));
  }
}