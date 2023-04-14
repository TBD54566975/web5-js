import nacl from 'tweetnacl';

import { Encoder } from '@tbd54566975/dwn-sdk-js';
import { ed25519PrivateKeyToX25519, ed25519PublicKeyToX25519, verificationMethodToPublicKeyBytes } from '../../did/didUtils.js';
import { bytesToObject, objectValuesBase64UrlToBytes, objectValuesBytesToBase64Url } from '../../utils.js';

export class X25519Xsalsa20Poly1305 {
  #web5;
  #ALG = 'x25519-xsalsa20-poly1305';

  constructor(web5) {
    this.#web5 = web5;
  }

  get web5() {
    return this.#web5;
  }

  /**
   * This algorithm converts the recipients Ed25519 signing private key to a Curve25519/X25519 key, and uses that key to decrypt.
   * 
   * @param {object} options Object containing the decryption parameters
   * @param {string} options.did DID of the recipient, whose private key is used to decrypt the data
   * @param {Web5EncryptionResult} options.payload Encryption algorithm output, including the ciphertext, to be decryted
   * @returns {Promise<Uint8Array>} A Promise that fulfills with a Uint8Array containing the plaintext.
   */
  async decrypt(options = {}) {
    const { did, payload } = options;

    const { header: headerString, ciphertext, ephemeralPublicKey, nonce } = objectValuesBase64UrlToBytes(payload);

    // Decode the header
    const header = bytesToObject(headerString);

    // Resolve the recipient's DID 
    const verificationMethod = await this.#verificationMethodFromDid(did, header.kid);
    // TODO: Replace this with a call to the Web5 JS keystore once it has been implemented
    // For now, we'll temporarily require that the privateKey be passed in with `options` to facilitate decryption
    const recipientPrivateKey = Encoder.base64UrlToBytes(options.privateKey);
    
    // Convert recipient's Ed25519 private key to X25519
    const recipientDHPrivateKey = ed25519PrivateKeyToX25519(recipientPrivateKey);

    // Decrypt the payload
    return nacl.box.open(ciphertext, nonce, ephemeralPublicKey, recipientDHPrivateKey);
  }

  /**
   * This algorithm converts the recipients Ed25519 signing public key to a Curve25519/X25519 key, and uses that key to encrypt.
   * 
   * @param {object} options Object containing the encryption parameters
   * @param {string} options.did DID of the recipient, whose public key is used to encrypt the data
   * @param {string} options.keyId Key identifier to use from the recipient's DID document
   * @param {ArrayBuffer | Uint8Array} options.payload The data to be encrypted (also know as the plaintext)
   * @returns {Promise<Web5EncryptionResult>} A Promise that fulfills with the output of the encryption algorithm
   */
  async encrypt(options = {}) {
    const { did, payload: u8aOrBuffer } = options;

    // If payload is an ArrayBuffer, convert to Uint8Array
    const payload = (u8aOrBuffer instanceof ArrayBuffer) ? new Uint8Array(u8aOrBuffer) : u8aOrBuffer;
    
    // Get the recipient's Ed25519 verification method from the DID by specified keyId or purpose ('assertionMethod')
    const verificationMethod = await this.#verificationMethodFromDid(did, options?.keyId);

    // Decode the public key to bytes, whether it is in JWK or multibase format.
    const recipientPublicKey = await verificationMethodToPublicKeyBytes(verificationMethod);

    // Convert recipient's Ed25519 public key to X25519
    const recipientDHPublicKey = ed25519PublicKeyToX25519(recipientPublicKey);

    // Generate ephemeral keypair
    const ephemeralKeyPair = nacl.box.keyPair();

    // Generate new nonce for every operation
    const nonce = nacl.randomBytes(nacl.box.nonceLength);

    // Encrypt the payload
    const ciphertext = nacl.box(payload, nonce, recipientDHPublicKey, ephemeralKeyPair.secretKey);

    // Assemble the header
    const header = Encoder.objectToBytes({ alg: this.#ALG, kid: verificationMethod.id });

    // Pack the results into an object and base64url encode each value
    let output = { header, ciphertext, ephemeralPublicKey: ephemeralKeyPair.publicKey, nonce };
    return objectValuesBytesToBase64Url(output);
  }

  async #verificationMethodFromDid(did, keyId) {
    // Get assertion method(s) from the DID either using the specified keyId or by purpose (assertionMethod)
    const didAssertionMethods = (keyId) ?
      await this.web5.did.getKeys(did, { methodId: keyId }) :
      await this.web5.did.getKeys(did, { purpose: 'assertionMethod' });
    if (!didAssertionMethods) throw new Error('Ed25519 verification method not found in DID document');
    
    // If more than one assertionMethod key is referenced or embedded in the DID document, throw an error rather than
    // guessing which one to use or taking the naive path of always using the first one. In this case, a keyId should
    // be specified to disambiguate, so the error serves to inform the developer that they need to specify a keyId.
    if (didAssertionMethods.length !== 1) throw new Error('Multiple assertionMethod entries in DID document. Specify a keyId to indicate which to use.');
    return didAssertionMethods[0];
  }
}