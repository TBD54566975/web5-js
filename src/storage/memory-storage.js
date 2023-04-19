import { Storage } from './storage.js';

class MemoryStorage extends Storage {
  #dataForKey = new Map;
  #timeoutForKey = new Map;

  async get(key) {
    return this.#dataForKey.get(key);
  }

  async set(key, value, options = { }) {
    this.#dataForKey.set(key, value);

    if (Number.isFinite(options?.timeout)) {
      const timeout = setTimeout(() => {
        this.remove(key);
      }, options.timeout);
      this.#timeoutForKey.set(key, timeout);
    }
  }

  async remove(key) {
    this.#dataForKey.delete(key);

    clearTimeout(this.#timeoutForKey.get(key));
    this.#timeoutForKey.delete(key);
  }

  async clear() {
    this.#dataForKey.clear();

    for (const timeout of this.#timeoutForKey.values()) {
      clearTimeout(timeout);
    }
    this.#timeoutForKey.clear();
  }
}

export {
  MemoryStorage,
};
