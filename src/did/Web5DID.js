import * as Methods from './methods/index.js';
import { MemoryStorage } from '../storage/MemoryStorage.js';

class Web5DID {
  #web5;

  #registeredDIDs = new MemoryStorage();
  #resolvedDIDs = new MemoryStorage();

  constructor(web5) {
    this.#web5 = web5;
  }

  get web5() {
    return this.#web5;
  }

  async create(method, options = { }) {
    const api = await this.#getMethodAPI(method);
    return api.create(options);
  }

  async register(data) {
    await this.#registeredDIDs.set(data.did, {
      connected: data.connected,
      did: data.did, // TODO: Consider removing if createAndSignMessage() no longer requires for Key ID
      endpoint: data.endpoint,
      keys: data.keys,
    });
  }

  async unregister(did) {
    await this.#registeredDIDs.delete(did);
  }

  async resolve(did, options = { }) {
    const registered = await this.#registeredDIDs.get(did);
    if (registered) {
      return registered;
    }

    const resolved = await this.#resolvedDIDs.get(did);
    if (resolved) {
      return resolved;
    }

    const api = await this.#getMethodAPI(did);

    let result;
    try {
      result = await api.resolve(did);
    } catch {
      return null;
    }

    if (options.cache) {
      // store separately in case the DID is `register` after `resolve` was called
      await this.#resolvedDIDs.set(did, result, {
        timeout: 1000 * 60 * 60, // 1hr
      });
    }

    return result;
  }

  async getDidDocument(did, options = { }) {
    let resolved;
    try {
      resolved = await this.resolve(did, options);
    } catch {
      return null;
    }

    return resolved.didDocument;
  }

  async getServices(did, options = { }) {
    let didDocument = await this.getDidDocument(did, options);
    return didDocument?.services?.filter(service => {
      if (options?.id && service.id !== options.id) return false;
      if (options?.type && service.type !== options.type) return false;
      return true;
    }) ?? [ ];
  }

  async getKeys(did, options = { }) {
    let didDocument = await this.getDidDocument(did, options);
    return didDocument?.verificationMethods?.filter(method => {
      if (options?.id && method.id !== options.id) return false;
      return true;
    }) ?? [ ];
  }

  async #getMethodAPI(name) {
    name = name.split(':')[1] || name;
    let api = Methods[name];
    if (!api) throw `Unsupported DID method: ${name}`;
    return api;
  }
}

export {
  Web5DID,
};
