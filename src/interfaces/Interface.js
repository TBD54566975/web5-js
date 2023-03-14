class Interface {
  #web5;
  #name;

  constructor(web5, name) {
    this.#web5 = web5;
    this.#name = name;
  }

  async send(method, target, request) {
    return this.#web5.send(target, {
      ...request,
      message: {
        ...request.message,
        interface: this.#name,
        method,
      },
    });
  }
}

export {
  Interface,
};
