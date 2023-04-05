import { base64url } from 'multiformats/bases/base64';
import { base58btc } from 'multiformats/bases/base58';
import { convertKeyPair } from 'ed2curve';
import nacl from 'tweetnacl';

// See https://github.com/multiformats/multicodec/blob/master/table.csv
// multicodec ed25519-pub header 0xed as varint
const MULTICODEC_ED25519_PUB_HEADER = new Uint8Array([0xed, 0x01]);
// multicodec ed25519-priv header 0x1300 as varint
const MULTICODEC_ED25519_PRIV_HEADER = new Uint8Array([0x80, 0x26]);
// multicodec x25519-pub header 0xec as varint
const MULTICODEC_X25519_PUB_HEADER = new Uint8Array([0xec, 0x01]);
// multicodec x25519-priv header 0x1302 as varint
const MULTICODEC_X25519_PRIV_HEADER = new Uint8Array([0x82, 0x26]);

async function create(options = { }) {
  // Generate new sign key pair.
  const verificationKeyPair = nacl.sign.keyPair();
  const keyAgreementKeyPair = convertKeyPair(verificationKeyPair);

  const verificationKeyId = await encodeMbBase58(MULTICODEC_ED25519_PUB_HEADER, verificationKeyPair.publicKey);
  const keyAgreementKeyId = await encodeMbBase58(MULTICODEC_X25519_PUB_HEADER, keyAgreementKeyPair.publicKey);
  
  const id = `did:key:${verificationKeyId}`;

  const verificationKey = await toJsonWebKey(id, verificationKeyId, 'Ed25519', verificationKeyPair.publicKey, verificationKeyPair.secretKey);
  const keyAgreementKey = await toJsonWebKey(id, keyAgreementKeyId, 'X25519', keyAgreementKeyPair.publicKey, keyAgreementKeyPair.secretKey);
  
  return {
    id,
    internalId: id,
    keys: [verificationKey, keyAgreementKey],
  };
}

async function resolve() {
  // TODO: Implement
  throw new Error('did:key resolve() not implemented');
}

/**
 * 
 * @param {Object} params - Object containing the signing parameters
 * @param {Uint8Array} params.data - The data to sign
 * @param {Object} params.privateKeyJwk - Private key as JSON Web Key (JWK)
 * @param {string} params.privateKeyJwk.crv - Cryptogrpahic curve
 * @param {string} params.privateKeyJwk.d - Base64url encoded private key
 * @param {string} params.privateKeyJwk.kid - Key ID
 * @param {string} params.privateKeyJwk.kty - Key type
 * @param {string} params.privateKeyJwk.x - Base64url encoded public key
 * @returns {Uint8Array} Signature
 */
async function sign(params) {
  const { data, privateKeyJwk } = params;
  const privateKeyBytes = base64url.baseDecode(privateKeyJwk.d);

  let signature, signedData;
  switch (privateKeyJwk.crv) {
  case 'Ed25519':
    signedData = nacl.sign(data, privateKeyBytes);
    signature = signedData.slice(0, nacl.sign.signatureLength);
    break;
  default:
    throw new Error('Unsupported cryptographic type');
  }

  return signature;
}

/**
 * 
 * @param {Object} params - Object containing the verification parameters
 * @param {Uint8Array} params.signature - The signature to verify
 * @param {Uint8Array} params.data - The data to verify
 * @param {Object} params.publicKeyJwk - Public key as JSON Web Key (JWK)
 * @param {string} params.publicKeyJwk.crv - Cryptogrpahic curve
 * @param {string} params.publicKeyJwk.kid - Key ID
 * @param {string} params.publicKeyJwk.kty - Key type
 * @param {string} params.publicKeyJwk.x - Base64url encoded public key
 * @returns {boolean}
 */
async function verify(params) {
  const { signature, data, publicKeyJwk } = params;
  const publicKeyBytes = base64url.baseDecode(publicKeyJwk.x);

  let signedData, result;
  switch (publicKeyJwk.crv) {
  case 'Ed25519':
    signedData = new Uint8Array(signature.length + data.length);
    signedData.set(signature);
    signedData.set(data, signature.length);
    result = nacl.sign.open(signedData, publicKeyBytes);
    break;
  default:
    throw new Error('Unsupported cryptographic type');
  }

  return (result === null) ? false : true;
}

/**
 * Given a DID, key ID, cryptographic curve, and key pair, return a JSON Web Key 2020 object.
 * 
 * @param {string} id 
 * @param {string} kid 
 * @param {string} crv 
 * @param {Uint8Array} publicKey 
 * @param {Uint8Array} privateKey 
 * @returns {{ id: string, type: string, controller: string, keypair: Object}}
 */
async function toJsonWebKey(id, kid, crv, publicKey, privateKey) {
  const jsonWebKey = {
    id: `${id}#${kid}`,
    type: 'JsonWebKey2020',
    controller: id,
    keypair: {},
  };

  const jwk = { crv, kid, kty: 'OKP' };

  jsonWebKey.keypair.publicKeyJwk = { ...jwk };
  jsonWebKey.keypair.publicKeyJwk.x = base64url.baseEncode(publicKey);
  
  jsonWebKey.keypair.privateKeyJwk = { ...jsonWebKey.keypair.publicKeyJwk };
  jsonWebKey.keypair.privateKeyJwk.d = base64url.baseEncode(privateKey);
  
  return jsonWebKey;
}

/**
 * Encode a Multibase base58-btc encoded value
 * Concatenation of the Multicodec identifier for the key type and
 * the raw bytes associated with the key format.
 * 
 * @param {Uint8Array} header Muticodec identifier
 * @param {Uint8Array} key Raw bytes of the key
 * @returns 
 */
async function encodeMbBase58(header, key) {
  const multibaseKey = new Uint8Array(header.length + key.length);

  multibaseKey.set(header);
  multibaseKey.set(key, header.length);

  return base58btc.encode(multibaseKey);
}

export {
  create,
  resolve,
  sign,
  verify,
};