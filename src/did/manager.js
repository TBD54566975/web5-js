export class DidManager {
  #store;

  constructor(options) {
    this.#store = options.store;
  }

  async clear() {
    this.#store.clear();
  }
  
  async exists(id) {
    const value = await this.#store.get(id);
    return value !== undefined;
  }
  
  async get(id) {
    return this.#store.get(id);
  }
  
  async delete(id) {
    this.#store.delete(id);
  }
  
  async set(id, value) {
    this.#store.set(id, value);
  }
}
