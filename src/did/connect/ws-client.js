export class WebSocketClient {
  #port;
  #requestID = 0;
  #socket;
  #web5;

  /**
   * 
   * @param {WebSocket} socket 
   */
  constructor(socket, web5) {
    this.#port = (new URL(socket.url)).port;
    this.#socket = socket;
    this.#web5 = web5;
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
   * @param {Web5} web5 Web5 instance
   * @returns 
   */
  static async create(url, web5) {
    return new Promise((resolve, _reject) => {
      const socket = new WebSocket(url);
      
      socket.onopen = _event => {
        const client = new WebSocketClient(socket, web5);
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