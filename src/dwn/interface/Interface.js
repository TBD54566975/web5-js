class Interface {
  #dwn;
  #name;

  constructor(dwn, name) {
    this.#dwn = dwn;
    this.#name = name;
  }

  get dwn() {
    return this.#dwn;
  }

  async send(method, target, request) {
    return this.#dwn.web5.send(target, {
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
