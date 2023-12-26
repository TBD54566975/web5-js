import type { Jwk } from '../jose/jwk.js';
import type { Cipher } from '../types/cipher.js';
import type { KeyGenerator } from '../types/key-generator.js';
import type { DecryptParams, EncryptParams } from '../types/params-direct.js';

export class AesCtrAlgorithm implements KeyGenerator<never, Jwk>, Cipher<EncryptParams, DecryptParams> {
  public async decrypt({ key, data }: DecryptParams): Promise<Uint8Array> {
    console.log(key, data);
    return null as any;
  }

  public async encrypt({ key, data }: EncryptParams): Promise<Uint8Array> {
    console.log(key, data);
    return null as any;
  }

  public async generateKey(params?: undefined): Promise<Jwk> {
    console.log(params);
    return null as any;
  }
}