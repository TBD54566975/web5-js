class JSONRPCError extends Error {
  #code;
  #data;

  static InvalidRequest = new JSONRPCError(-32600, 'Invalid Request');
  static MethodNotFound = new JSONRPCError(-32601, 'Method not found');
  static InvalidParams = new JSONRPCError(-32602, 'Invalid params');
  static InternalError = new JSONRPCError(-32603, 'Internal error');
  static ParseError = new JSONRPCError(-32700, 'Parse error');

  constructor(code, message, data = { }) {
    super(message);

    this.name = 'JSONRPCError';

    this.#code = code;
    this.#data = data;
  }

  get code() {
    return this.#code;
  }

  get data() {
    return this.#data;
  }

  toJSON() {
    return {
      code: this.#code,
      message: this.message,
      data: this.#data,
    };
  }
}

export {
  JSONRPCError,
};
