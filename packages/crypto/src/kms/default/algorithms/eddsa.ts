import type { BufferKeyPair, Web5Crypto } from '../../../types-key-manager.js';

import { CryptoKey } from '../crypto-key.js';
import { isBufferKeyPair } from '../../../utils.js';
import { Ed25519 } from '../../../crypto-algorithms/index.js';
import { EdDsaAlgorithm } from '../../../algorithms-api/index.js';

export class DefaultEdDsaAlgorithm extends EdDsaAlgorithm {
  public readonly namedCurves = ['Ed25519', 'Ed448'];

  public async generateKey(options: {
    algorithm: Web5Crypto.EdDsaGenerateKeyOptions,
    extractable: boolean,
    keyUsages: Web5Crypto.KeyUsage[]
  }): Promise<Web5Crypto.CryptoKeyPair> {
    const { algorithm, extractable, keyUsages } = options;

    this.checkGenerateKey({ algorithm, keyUsages });

    let keyPair: BufferKeyPair | undefined;
    let cryptoKeyPair: Web5Crypto.CryptoKeyPair;

    switch (algorithm.namedCurve) {

      case 'Ed25519': {
        keyPair = await Ed25519.generateKeyPair();
        break;
      }
      // Default case not needed because checkGenerateKey() already validates the specified namedCurve is supported.
    }

    if (!isBufferKeyPair(keyPair)) {
      throw new Error('Operation failed to generate key pair.');
    }

    cryptoKeyPair = {
      privateKey : new CryptoKey(algorithm, extractable, keyPair.privateKey, 'private', this.keyUsages.privateKey),
      publicKey  : new CryptoKey(algorithm, true, keyPair.publicKey, 'public', this.keyUsages.publicKey)
    };

    return cryptoKeyPair;
  }

  public async sign(options: {
    algorithm: Web5Crypto.EdDsaOptions,
    key: Web5Crypto.CryptoKey,
    data: BufferSource
  }): Promise<ArrayBuffer> {
    const { algorithm, key, data } = options;

    this.checkAlgorithmOptions(algorithm);
    this.checkKeyType(key.type, 'private');
    this.checkKeyUsages(key.usages, ['sign']);

    let signature: ArrayBuffer;

    const keyAlgorithm = key.algorithm as Web5Crypto.EdDsaGenerateKeyOptions; // Type guard.

    switch (keyAlgorithm.namedCurve) {

      case 'Ed25519': {
        signature = await Ed25519.sign({ key: key.handle, data });
        break;
      }

      default:
        throw new TypeError(`Out of range: '${keyAlgorithm.namedCurve}'. Must be one of '${this.namedCurves.join(', ')}'`);
    }

    return signature;
  }

  public async verify(options: {
    algorithm: Web5Crypto.EdDsaOptions;
    key: Web5Crypto.CryptoKey;
    signature: ArrayBuffer;
    data: BufferSource;
  }): Promise<boolean> {
    const { algorithm, key, signature, data } = options;

    this.checkAlgorithmOptions(algorithm);
    this.checkKeyType(key.type, 'public');
    this.checkKeyUsages(key.usages, ['verify']);

    let isValid: boolean;

    const keyAlgorithm = key.algorithm as Web5Crypto.EdDsaGenerateKeyOptions; // Type guard.

    switch (keyAlgorithm.namedCurve) {

      case 'Ed25519': {
        isValid = await Ed25519.verify({ key: key.handle, signature, data });
        break;
      }

      default:
        throw new TypeError(`Out of range: '${keyAlgorithm.namedCurve}'. Must be one of '${this.namedCurves.join(', ')}'`);
    }

    return isValid;
  }
}