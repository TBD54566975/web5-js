import { Encoder } from '@tbd54566975/dwn-sdk-js';

import { DIDConnect } from './connect/connect.js';
import * as CryptoCiphers from './crypto/ciphers.js';
import * as Methods from './methods/methods.js';
import * as DidUtils from './didUtils.js';
import { MemoryStorage } from '../storage/MemoryStorage.js';
import { pascalToKebabCase } from '../utils.js';

class Web5DID {
  #web5;
  #cryptoCiphers = {};
  #didConnect;

  #registeredDIDs = new MemoryStorage();
  #resolvedDIDs = new MemoryStorage();

  constructor(web5) {
    this.#web5 = web5;

    for (const cipher in CryptoCiphers) {
      const cipherName = pascalToKebabCase(cipher);
      this.#cryptoCiphers[cipherName] = new CryptoCiphers[cipher](this.web5);
    }

    this.#didConnect = new DIDConnect(web5);
    // Bind functions to the instance of DIDConnect
    this.#didConnect.connect = this.#didConnect.connect.bind(this.#didConnect);
    this.#didConnect.permissionsRequest = this.#didConnect.permissionsRequest.bind(this.#didConnect);
  }
  
  get web5() {
    return this.#web5;
  }

  get connect() {
    return this.#didConnect.connect;
  }

  get permissionsRequest() {
    return this.#didConnect.permissionsRequest;
  }

  get util() {
    return this.#util;
  }

  async create(method, options = { }) {
    const api = await this.#getMethodAPI(method);
    return api.create(options);
  }

  /**
   * @typedef {X25519Xsalsa20Poly1305Result} Web5EncryptionResult
   */

  /**
   * @typedef {Object} X25519Xsalsa20Poly1305Result
   * @property {string} ciphertext Base64Url encoded encrypted data
   * @property {string} ephemeralPublicKey Base64Url encoded random public key
   * @property {string} header Base64Url encoded header containing stringified JSON {alg: string, kid: string}
   * @property {string} nonce Base64Url encoded random nonce
   */

  /**
   * 
   * @param {object} options Object containing the decryption parameters
   * @param {string} options.did DID of the recipient, whose private key is used to decrypt the data
   * @param {Web5EncryptionResult} options.payload Encryption algorithm output, including the ciphertext, to be decryted
   * @returns {Promise<Uint8Array>} A Promise that fulfills with a Uint8Array containing the plaintext.
   */
  async decrypt(options = { }) {
    // Decode the header to determine which algorithm to use
    const { alg } = Encoder.base64UrlToObject(options.payload.header);
    const api = this.#getCryptoCipherAPI(alg);
    return api.decrypt(options);
  }

  /**
   * 
   * @param {object} options Object containing the encryption parameters
   * @param {string} options.did DID of the recipient, whose public key is used to encrypt the data
   * @param {string} options.keyId Key identifier to use from the recipient's DID document
   * @param {ArrayBuffer | Uint8Array} options.payload The data to be encrypted (also know as the plaintext)
   * @param {object} options.algorithm An object specifying the algorithm to be used and any extra parameters, if required
   * @returns {Promise<Web5EncryptionResult>} A Promise that fulfills with the output of the encryption algorithm
   */
  async encrypt(options = { }) {
    // Default to X25519 / XSalsa20-Poly1305
    const algorithmName = options?.algorithm || 'x25519-xsalsa20-poly1305';
    const api = this.#getCryptoCipherAPI(algorithmName);
    return api.encrypt(options);
  }

  async register(data) {
    await this.#registeredDIDs.set(data.did, {
      connected: data.connected,
      did: data.did, // TODO: Consider removing if createAndSignMessage() no longer requires for Key ID
      endpoint: data.endpoint,
      keys: data.keys,
    });
  }

  async sign(method, options = { }) {
    const api = await this.#getMethodAPI(method);
    return api.sign(options);
  }

  async unregister(did) {
    await this.#registeredDIDs.delete(did);
  }

  async verify(method, options = { }) {
    const api = await this.#getMethodAPI(method);
    return api.verify(options);
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
    const result = await api.resolve(did);

    if (options.cache) {
      // store separately in case the DID is `register` after `resolve` was called
      await this.#resolvedDIDs.set(did, result, {
        timeout: 1000 * 60 * 60, // 1hr
      });
    }

    return result;
  }

  async getDidDocument(did, options = { }) {
    const { didDocument } = await this.resolve(did, options);
    return didDocument;
  }

  async getServices(did, options = { }) {
    const didDocument = await this.getDidDocument(did, options);
    return didDocument?.service?.filter(service => {
      if (options?.id && service.id !== options.id) return false;
      if (options?.type && service.type !== options.type) return false;
      return true;
    }) ?? [ ];
  }

  async getKeys(did, options = { }) {
    const didDocument = await this.getDidDocument(did, options);
    return DidUtils.findVerificationMethods({
      didDocument: didDocument,
      methodId: options?.methodId,
      purpose: options?.purpose,
    });
  }

  async #getMethodAPI(name) {
    name = name.split(':')[1] || name;
    const api = Methods[name];
    if (!api) throw `Unsupported DID method: ${name}`;
    return api;
  }

  #getCryptoCipherAPI(name) {
    const api = this.#cryptoCiphers[name];
    if (!api) throw `Unsupported cryptographic cipher: ${name}`;
    return api;
  }

  /**
   * Utility functions for working with DIDs
   */
  #util = { ...DidUtils };
}

export {
  Web5DID,
};
