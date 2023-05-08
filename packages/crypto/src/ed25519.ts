import type { KeyPair, Jwk, PublicJwk, PrivateJwk, KeyPairJwk } from './types.js';

import nacl from 'tweetnacl';
import ed2curve from 'ed2curve';
import { base64UrlToBytes, bytesToBase64Url } from './utils.js';

// TODO: (not important) decide if we want to use tweetnacl or @noble/ed25519. is there a functional difference?
//       dwn-sdk-js also has ed25519 cryptosuite stuff

export function generateKeyPair(): KeyPair {
  const ed25519KeyPair = nacl.sign.keyPair();

  return { publicKey: ed25519KeyPair.publicKey, privateKey: ed25519KeyPair.secretKey };
}

export function deriveX25519KeyPair(ed25519KeyPair: KeyPair): KeyPair {
  // for some reason tweetnacl chose the term `secretKey` instead of `privateKey` even though ed25519 is asymmetric
  const x25519KeyPair = ed2curve.convertKeyPair({ publicKey: ed25519KeyPair.publicKey, secretKey: ed25519KeyPair.privateKey });

  // apparently the return value of `convertKeyPair` can return null
  if (!x25519KeyPair) {
    throw new Error('failed to derive x25519 key pair.');
  }

  return { publicKey: x25519KeyPair.publicKey, privateKey: x25519KeyPair.secretKey };
}

export type JwkOverrides = { crv: 'Ed25519' | 'X25519' };

export function keyPairToJwk(keyPair: KeyPair, kid: string, overrides: JwkOverrides = { crv: 'Ed25519' }): KeyPairJwk {
  const jwk: Jwk = { kty: 'OKP', crv: overrides.crv, kid };

  const encodedPublicKey = bytesToBase64Url(keyPair.publicKey);
  const publicKeyJwk: PublicJwk = { ...jwk, x: encodedPublicKey };

  const encodedSecretKey = bytesToBase64Url(keyPair.privateKey);
  const privateKeyJwk: PrivateJwk = { ...publicKeyJwk, d: encodedSecretKey };

  return { publicKeyJwk, privateKeyJwk };
}

export type SignOptions = {
  /** the data being signed */
  payload: Uint8Array;
  /** the key being used to sign */
  privateKeyJwk: PrivateJwk;
};

export function sign(options: SignOptions) {
  const { payload, privateKeyJwk } = options;
  const privateKeyBytes = base64UrlToBytes(privateKeyJwk.d);

  if (privateKeyJwk.crv !== 'Ed25519') {
    throw new Error('crv must be Ed25519');
  }

  const signedData = nacl.sign(payload, privateKeyBytes);

  return signedData.slice(0, nacl.sign.signatureLength);
}

export type VerifyOptions = {
  /** the signature to verify */
  signature: Uint8Array;
  /** the payload that was signed */
  payload: Uint8Array;
  /** the key to verify the signature with */
  publicKeyJwk: PublicJwk;
}

export async function verify(options: VerifyOptions) {
  const { signature, payload, publicKeyJwk } = options;
  const publicKeyBytes = base64UrlToBytes(publicKeyJwk.x);

  if (publicKeyJwk.crv !== 'Ed25519') {
    throw new Error('crv must be Ed25519');
  }

  const signedData = new Uint8Array(signature.length + payload.length);
  signedData.set(signature);
  signedData.set(payload, signature.length);

  const result = nacl.sign.open(signedData, publicKeyBytes);


  return !!result;
}