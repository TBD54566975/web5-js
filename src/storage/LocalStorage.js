import { Storage } from './Storage.js';

class LocalStorage extends Storage {
  async get(key) {
    return JSON.parse(localStorage.getItem(key));
  }

  async set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async delete(key) {
    localStorage.removeItem(key);
  }

  async clear() {
    localStorage.clear();
  }
}

export {
  LocalStorage,
};
