import { base64url } from 'multiformats/bases/base64';
import { base58btc } from 'multiformats/bases/base58';
import * as secp256k1 from '@noble/secp256k1';


// See https://github.com/multiformats/multicodec/blob/master/table.csv
export const MULTICODEC_HEADERS = {
  ED25519: {
    PUB  : new Uint8Array([0xed, 0x01]),
    PRIV : new Uint8Array([0x80, 0x26])
  },
  X25519: {
    PUB  : new Uint8Array([0xec, 0x01]),
    PRIV : new Uint8Array([0x82, 0x26])
  },
  NOOP: new Uint8Array([])
};

export function base64UrlToBytes(base64urlString: string): Uint8Array {
  return base64url.baseDecode(base64urlString);
}

export function bytesToBase58btcMultibase(header: Uint8Array, bytes: Uint8Array): string {
  const multibaseBytes = new Uint8Array(header.length + bytes.length);
  multibaseBytes.set(header);
  multibaseBytes.set(bytes);

  return base58btc.encode(multibaseBytes);
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  return base64url.baseEncode(bytes);
}

export function randomBytes(bytesLength: number): Uint8Array {
  return secp256k1.utils.randomBytes(bytesLength);
}