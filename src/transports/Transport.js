class Transport {
  async send(_endpoint, _request) {
    throw 'subclass must override';
  }
}

export {
  Transport,
};
