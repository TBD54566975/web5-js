import type { Web5Crypto } from '../types/web5-crypto.js';
import type { BytesKeyPair } from '../types/crypto-key.js';

import { isBytesKeyPair } from '../utils.js';
import { Secp256k1 } from '../crypto-primitives/index.js';
import { CryptoKey, BaseEcdsaAlgorithm } from '../algorithms-api/index.js';
export class EcdsaAlgorithm extends BaseEcdsaAlgorithm {
  public readonly hashAlgorithms = ['SHA-256'];
  public readonly namedCurves = ['secp256k1'];

  public async generateKey(options: {
    algorithm: Web5Crypto.EcdsaGenerateKeyOptions,
    extractable: boolean,
    keyUsages: Web5Crypto.KeyUsage[]
  }): Promise<Web5Crypto.CryptoKeyPair> {
    const { algorithm, extractable, keyUsages } = options;

    this.checkGenerateKey({ algorithm, keyUsages });

    let keyPair: BytesKeyPair | undefined;
    let cryptoKeyPair: Web5Crypto.CryptoKeyPair;

    switch (algorithm.namedCurve) {

      case 'secp256k1': {
        algorithm.compressedPublicKey ??= true;
        keyPair = await Secp256k1.generateKeyPair({ compressedPublicKey: algorithm.compressedPublicKey });
        break;
      }
      // Default case not needed because checkGenerateKey() already validates the specified namedCurve is supported.
    }

    if (!isBytesKeyPair(keyPair)) {
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
    data: Uint8Array
  }): Promise<Uint8Array> {
    const { algorithm, key, data } = options;

    this.checkAlgorithmOptions({ algorithm });
    // The key's algorithm must match the algorithm implementation processing the operation.
    this.checkKeyAlgorithm({ keyAlgorithmName: key.algorithm.name });
    // The key must be a private key.
    this.checkKeyType({ keyType: key.type, allowedKeyType: 'private' });
    // The key must be allowed to be used for sign operations.
    this.checkKeyUsages({ keyUsages: ['sign'], allowedKeyUsages: key.usages });

    let signature: Uint8Array;

    const keyAlgorithm = key.algorithm as Web5Crypto.EcdsaGenerateKeyOptions; // Type guard.

    switch (keyAlgorithm.namedCurve) {

      case 'secp256k1': {
        signature = await Secp256k1.sign({ hash: algorithm.hash, key: key.material, data });
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
    signature: Uint8Array;
    data: Uint8Array;
  }): Promise<boolean> {
    const { algorithm, key, signature, data } = options;

    this.checkAlgorithmOptions({ algorithm });
    // The key's algorithm must match the algorithm implementation processing the operation.
    this.checkKeyAlgorithm({ keyAlgorithmName: key.algorithm.name });
    // The key must be a public key.
    this.checkKeyType({ keyType: key.type, allowedKeyType: 'public' });
    // The key must be allowed to be used for verify operations.
    this.checkKeyUsages({ keyUsages: ['verify'], allowedKeyUsages: key.usages });

    let isValid: boolean;

    const keyAlgorithm = key.algorithm as Web5Crypto.EcdsaGenerateKeyOptions; // Type guard.

    switch (keyAlgorithm.namedCurve) {

      case 'secp256k1': {
        isValid = await Secp256k1.verify({ hash: algorithm.hash, key: key.material, signature, data });
        break;
      }

      default:
        throw new TypeError(`Out of range: '${keyAlgorithm.namedCurve}'. Must be one of '${this.namedCurves.join(', ')}'`);
    }

    return isValid;
  }
}