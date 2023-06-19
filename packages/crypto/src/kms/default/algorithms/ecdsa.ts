import type { BufferKeyPair, Web5Crypto } from '../../../types-key-manager.js';

import { CryptoKey } from '../crypto-key.js';
import { isBufferKeyPair } from '../../../utils.js';
import { Secp256k1 } from '../../../crypto-algorithms/index.js';
import { EcdsaAlgorithm } from '../../../algorithms-api/index.js';
export class DefaultEcdsaAlgorithm extends EcdsaAlgorithm {
  public readonly hashAlgorithms = ['SHA-256'];
  public readonly namedCurves = ['secp256k1'];

  public async generateKey(options: {
    algorithm: Web5Crypto.EcdsaGenerateKeyOptions,
    extractable: boolean,
    keyUsages: Web5Crypto.KeyUsage[]
  }): Promise<Web5Crypto.CryptoKeyPair> {
    const { algorithm, extractable, keyUsages } = options;

    this.checkGenerateKey({ algorithm, keyUsages });

    let keyPair: BufferKeyPair | undefined;
    let cryptoKeyPair: Web5Crypto.CryptoKeyPair;

    switch (algorithm.namedCurve) {

      case 'secp256k1': {
        keyPair = await Secp256k1.generateKeyPair({ compressedPublicKey: algorithm.compressedPublicKey });
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
    algorithm: Web5Crypto.EcdsaOptions,
    key: Web5Crypto.CryptoKey,
    data: BufferSource
  }): Promise<ArrayBuffer> {
    const { algorithm, key, data } = options;

    this.checkAlgorithmOptions({ algorithm });
    this.checkKeyAlgorithm({ keyAlgorithmName: key.algorithm.name });
    this.checkKeyType({ keyType: key.type, allowedKeyType: 'private' });
    this.checkKeyUsages({ keyUsages: key.usages, allowedKeyUsages: ['sign'] });

    let signature: ArrayBuffer;

    const keyAlgorithm = key.algorithm as Web5Crypto.EcdsaGenerateKeyOptions; // Type guard.

    switch (keyAlgorithm.namedCurve) {

      case 'secp256k1': {
        signature = await Secp256k1.sign({ algorithm, key: key.handle, data });
        break;
      }

      default:
        throw new TypeError(`Out of range: '${keyAlgorithm.namedCurve}'. Must be one of '${this.namedCurves.join(', ')}'`);
    }

    return signature;
  }

  public async verify(options: {
    algorithm: Web5Crypto.EcdsaOptions;
    key: Web5Crypto.CryptoKey;
    signature: ArrayBuffer;
    data: BufferSource;
  }): Promise<boolean> {
    const { algorithm, key, signature, data } = options;

    this.checkAlgorithmOptions({ algorithm });
    this.checkKeyAlgorithm({ keyAlgorithmName: key.algorithm.name });
    this.checkKeyType({ keyType: key.type, allowedKeyType: 'public' });
    this.checkKeyUsages({ keyUsages: key.usages, allowedKeyUsages: ['verify'] });

    let isValid: boolean;

    const keyAlgorithm = key.algorithm as Web5Crypto.EcdsaGenerateKeyOptions; // Type guard.

    switch (keyAlgorithm.namedCurve) {

      case 'secp256k1': {
        isValid = await Secp256k1.verify({ algorithm, key: key.handle, signature, data });
        break;
      }

      default:
        throw new TypeError(`Out of range: '${keyAlgorithm.namedCurve}'. Must be one of '${this.namedCurves.join(', ')}'`);
    }

    return isValid;
  }
}