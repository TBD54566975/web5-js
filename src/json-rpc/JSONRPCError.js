class JSONRPCError extends Error {
  #code;
  #data;

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
}

export {
  JSONRPCError,
};
