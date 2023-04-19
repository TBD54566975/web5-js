class Transport {
  #web5;

  constructor(web5) {
    this.#web5 = web5;
  }

  get web5() {
    return this.#web5;
  }

  async send(_endpoint, _request) {
    throw 'subclass must override';
  }
}

export {
  Transport,
};
