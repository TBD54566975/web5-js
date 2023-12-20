import type { Jwk } from '../jose/jwk.js';

export interface KeyConverter {
  bytesToPrivateKey(params: { privateKeyBytes: Uint8Array }): Promise<Jwk>;

  privateKeyToBytes(params: { privateKey: Jwk }): Promise<Uint8Array>;
}

export interface AsymmetricKeyConverter extends KeyConverter {
  bytesToPublicKey(params: { publicKeyBytes: Uint8Array }): Promise<Jwk>;

  publicKeyToBytes(params: { publicKey: Jwk }): Promise<Uint8Array>;
}