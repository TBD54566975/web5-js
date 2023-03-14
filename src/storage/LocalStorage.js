import { Storage } from './Storage';

class LocalStorage extends Storage {
  async get(key) {
    return JSON.parse(localStorage.getItem(key));
  }

  async set(key, value) {
    return localStorage.setItem(key, JSON.stringify(value));
  }
}

export {
  LocalStorage,
};
