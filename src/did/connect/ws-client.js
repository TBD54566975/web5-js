/**
 * WebSocketClient class for managing WebSocket connections.
 */
export class WebSocketClient {
  #port;
  #requestID = 0;
  #socket;
  #web5;

  /**
   * Creates a new WebSocketClient instance.
   *
   * @param {WebSocket} socket - A WebSocket instance.
   * @param {Web5} web5 - A Web5 instance.
   */
  constructor(socket, web5) {
    this.#port = (new URL(socket.url)).port;
    this.#socket = socket;
    this.#web5 = web5;
  }

  /**
   * Gets the port number of the WebSocket connection.
   *
   * @returns {number} The port number.
   */
  get port() {
    return this.#port;
  }

  /**
   * Checks if the WebSocket connection is open.
   *
   * @returns {boolean} True if the connection is open, otherwise false.
   */
  get connected() {
    return this.#socket.readyState === WebSocket.OPEN;
  }

  /**
   * Gets the next request ID and increments the internal counter.
   *
   * @returns {number} The next request ID.
   */
  get requestID() {
    return ++this.#requestID;
  }

  /**
   * Adds an event listener to the WebSocket.
   *
   * @param {string} event - The event type for which the listener is called.
   * @param {function} callback - The function to call when the event occurs.
   * @param {Object} [options] - Optional configuration parameters for the event listener.
   */
  addEventListener(event, callback, options = undefined) {
    this.#socket.addEventListener(event, callback, options);
  }

  /**
   * Closes the WebSocket connection and resets the instance.
   *
   * @returns {boolean} True if the connection was closed successfully, otherwise false.
   */
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
   * Creates a new WebSocketClient instance by connecting to the provided URL.
   * 
   * @param {string} url The WebSocket server URL to connect to.protocol://hostname or protocol://hostname:port to connect to
   * @param {Web5} web5 Web5 instance
   * @returns {Promise<WebSocketClient>}
   * 
   * @example
   * const web5 = new Web5();
   * const url = 'ws://localhost:8080';
   *
   * const wsClient = await WebSocketClient.create(url, web5);
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

  /**
   * Sets the onmessage event listener for the WebSocket.
   *
   * @param {function} callback - The function to call when a message is received.
   */
  onmessage(callback) {
    this.#socket.onmessage = callback;
  }

  /**
   * Removes an event listener from the WebSocket.
   *
   * @param {string} event - The event type for which the listener was called.
   * @param {function} callback - The listener function to remove.
   */
  removeEventListener(event, callback) {
    this.#socket.removeEventListener(event, callback);
  }

  /**
   * Transmits JSON RPC Request using the WebSocket connection
   *
   * @param {string} method - The method name to be called on the server.
   * @param {Object} [params] - The parameters to be passed to the method (optional).
   */
  sendRequest(method, params = undefined) {
    this.#socket.send(JSON.stringify({ id: this.requestID, method, params }));
  }
}
