export class Storage {
  async get(_key) {
    throw 'subclass must override';
  }

  async set(_key, _value) {
    throw 'subclass must override';
  }

  async remove(_key) {
    throw 'subclass must override';
  }

  async clear() {
    throw 'subclass must override';
  }
}
