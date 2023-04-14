class Interface {
  #dwn;
  #name;

  constructor(dwn, name) {
    this.#dwn = dwn;
    this.#name = name;
  }

  // TODO: Remove this once Permissions implemented in dwn-sdk-js
  permissionsRequest(...args) {
    return this.#dwn.web5.did.permissionsRequest(...args);
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
