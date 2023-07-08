import type { KeyPair, Jwk, PublicKeyJwk, PrivateKeyJwk, KeyPairJwk } from './types.js';

import nacl from 'tweetnacl';
import ed2curve from 'ed2curve';
import { Convert } from '@tbd54566975/common';

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

  const encodedPublicKey = Convert.uint8Array(keyPair.publicKey).toBase64Url();
  const publicKeyJwk: PublicKeyJwk = { ...jwk, x: encodedPublicKey };

  const encodedSecretKey = Convert.uint8Array(keyPair.privateKey).toBase64Url();
  const privateKeyJwk: PrivateKeyJwk = { ...publicKeyJwk, d: encodedSecretKey };

  return { publicKeyJwk, privateKeyJwk };
}

export type SignOptions = {
  /** the data being signed */
  payload: Uint8Array;
  /** the key being used to sign */
  privateKeyJwk: PrivateKeyJwk;
};

export function sign(options: SignOptions) {
  const { payload, privateKeyJwk } = options;
  const privateKeyBytes = Convert.base64Url(privateKeyJwk.d).toUint8Array();

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
  publicKeyJwk: PublicKeyJwk;
}

export async function verify(options: VerifyOptions) {
  const { signature, payload, publicKeyJwk } = options;
  const publicKeyBytes = Convert.base64Url(publicKeyJwk.x).toUint8Array();

  if (publicKeyJwk.crv !== 'Ed25519') {
    throw new Error('crv must be Ed25519');
  }

  const signedData = new Uint8Array(signature.length + payload.length);
  signedData.set(signature);
  signedData.set(payload, signature.length);

  const result = nacl.sign.open(signedData, publicKeyBytes);


  return !!result;
}