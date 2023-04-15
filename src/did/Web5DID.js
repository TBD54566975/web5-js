import { Encoder } from '@tbd54566975/dwn-sdk-js';

import { DIDConnect } from './connect.js';
import { X25519Xsalsa20Poly1305 } from './crypto/x25519-xsalsa20-poly1305.js';
import * as DIDMethodION from './methods/ion.js';
import * as DIDMethodKey from './methods/key.js';
import * as DIDUtils from './utils.js';
import { MemoryStorage } from '../storage/MemoryStorage.js';

/**
  * @typedef { 'x25519-xsalsa20-poly1305' } CryptographicCipherName
  */
const CryptographicCipherName = {
  X25519Xsalsa20Poly1305: 'x25519-xsalsa20-poly1305',
};

/**
 * @typedef { 'key' | 'ion' } DIDMethodName
 */
const DIDMethodName = {
  Key: 'key',
  ION: 'ion',
};

class Web5DID {
  #web5;
  #cryptoCiphers = {};
  #didConnect;

  #registeredDIDs = new MemoryStorage();
  #resolvedDIDs = new MemoryStorage();

  CryptographicCipherName = CryptographicCipherName;
  DIDMethodName = DIDMethodName;

  constructor(web5) {
    this.#web5 = web5;
  }
  
  get web5() {
    return this.#web5;
  }

  get util() {
    return DIDUtils;
  }

  /**
   * @param { DIDMethodName } method
   */
  async create(method = this.DIDMethodName.Key, options = { }) {
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
   * @property {string} header Base64Url encoded header containing stringified JSON {alg: CryptographicCipherName, kid: string}
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
   * @param {CryptographicCipherName} options.algorithm A string specifying the algorithm to be used
   * @returns {Promise<Web5EncryptionResult>} A Promise that fulfills with the output of the encryption algorithm
   */
  async encrypt(options = { }) {
    const algorithmName = options?.algorithm || this.CryptographicCipherName.X25519Xsalsa20Poly1305;
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

  /**
   * @param { DIDMethodName } method
   */
  async sign(method, options = { }) {
    const api = await this.#getMethodAPI(method);
    return api.sign(options);
  }

  async unregister(did) {
    await this.#registeredDIDs.delete(did);
  }

  /**
   * @param { DIDMethodName } method
   */
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
    return this.util.findVerificationMethods({
      didDocument: didDocument,
      methodId: options?.methodId,
      purpose: options?.purpose,
    });
  }

  connect(...args) {
    this.#didConnect ??= new DIDConnect(this.#web5);
    return this.#didConnect.connect(...args);
  }

  permissionsRequest(...args) {
    this.#didConnect ??= new DIDConnect(this.#web5);
    return this.#didConnect.permissionsRequest(...args);
  }

  async #getMethodAPI(name) {
    name = name.split(':')[1] || name;

    switch (name) {
    case this.DIDMethodName.ION:
      return DIDMethodION;

    case this.DIDMethodName.Key:
      return DIDMethodKey;
    }

    throw `Unsupported DID method: ${name}`;
  }

  #getCryptoCipherAPI(name) {
    switch (name) {
    case this.CryptographicCipherName.X25519Xsalsa20Poly1305:
      return this.#cryptoCiphers[name] ??= new X25519Xsalsa20Poly1305(this.#web5);
    }

    throw `Unsupported cryptographic cipher: ${name}`;
  }
}

export {
  CryptographicCipherName,
  Web5DID,
};
