import { DidKeyResolver, Encoder } from '@tbd54566975/dwn-sdk-js';
import nacl from 'tweetnacl';

import {
  ed25519KeyPairToX25519,
  encodeMultibaseBase58,
  MULTICODEC_ED25519_PUB_HEADER,
  MULTICODEC_X25519_PUB_HEADER,
  createJWK,
} from '../utils.js';

const didKeyResolver = new DidKeyResolver();

async function create(options = { }) {
  // Generate new sign key pair.
  const verificationKeyPair = nacl.sign.keyPair();
  const keyAgreementKeyPair = ed25519KeyPairToX25519(verificationKeyPair);

  const verificationKeyId = await encodeMultibaseBase58(verificationKeyPair.publicKey, MULTICODEC_ED25519_PUB_HEADER);
  const keyAgreementKeyId = await encodeMultibaseBase58(keyAgreementKeyPair.publicKey, MULTICODEC_X25519_PUB_HEADER);
  
  const id = `did:key:${verificationKeyId}`;

  const verificationKey = await createJWK({
    id,
    crv: 'Ed25519',
    kid: verificationKeyId,
    kty: 'OKP',
    publicKey: verificationKeyPair.publicKey,
    privateKey: verificationKeyPair.secretKey,
  });

  const keyAgreementKey = await createJWK({
    id,
    crv: 'X25519',
    kid: keyAgreementKeyId,
    kty: 'OKP',
    publicKey: keyAgreementKeyPair.publicKey,
    privateKey: keyAgreementKeyPair.secretKey,
  });
  
  return {
    id,
    internalId: id,
    keys: [verificationKey, keyAgreementKey],
  };
}

async function resolve(did) {
  return didKeyResolver.resolve(did);
}

/**
 * 
 * @param {object} options Object containing the signing parameters
 * @param {Uint8Array} options.data The data to sign
 * @param {object} options.privateKeyJwk Private key as JSON Web Key (JWK)
 * @param {string} options.privateKeyJwk.crv Cryptogrpahic curve
 * @param {string} options.privateKeyJwk.d Base64url encoded private key
 * @param {string} options.privateKeyJwk.kid Key ID
 * @param {string} options.privateKeyJwk.kty Key type
 * @param {string} options.privateKeyJwk.x Base64url encoded public key
 * @returns {Uint8Array} Signature
 */
async function sign(options) {
  const { data, privateKeyJwk } = options;
  const privateKeyBytes = Encoder.base64UrlToBytes(privateKeyJwk.d);

  let signature, signedData;
  switch (privateKeyJwk?.crv) {
  case 'Ed25519':
    signedData = nacl.sign(data, privateKeyBytes);
    signature = signedData.slice(0, nacl.sign.signatureLength);
    break;
  default:
    throw new Error(`Unsupported cryptographic curve: ${privateKeyJwk.crv}`);
  }

  return signature;
}

/**
 * 
 * @param {object} options Object containing the verification parameters
 * @param {Uint8Array} options.signature The signature to verify
 * @param {Uint8Array} options.data The data to verify
 * @param {object} options.publicKeyJwk Public key as JSON Web Key (JWK)
 * @param {string} options.publicKeyJwk.crv Cryptogrpahic curve
 * @param {string} options.publicKeyJwk.kid Key ID
 * @param {string} options.publicKeyJwk.kty Key type
 * @param {string} options.publicKeyJwk.x Base64url encoded public key
 * @returns {boolean}
 */
async function verify(options) {
  const { signature, data, publicKeyJwk } = options;
  const publicKeyBytes = Encoder.base64UrlToBytes(publicKeyJwk.x);

  let signedData, result;
  switch (publicKeyJwk?.crv) {
  case 'Ed25519':
    signedData = new Uint8Array(signature.length + data.length);
    signedData.set(signature);
    signedData.set(data, signature.length);
    result = nacl.sign.open(signedData, publicKeyBytes);
    break;
  default:
    throw new Error(`Unsupported cryptographic curve: ${publicKeyJwk?.crv}`);
  }

  return (result === null) ? false : true;
}

export {
  create,
  resolve,
  sign,
  verify,
};