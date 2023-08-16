import type { Web5Crypto } from '../types/web5-crypto.js';
import type { BytesKeyPair } from '../types/crypto-key.js';

import { isBytesKeyPair } from '../utils.js';
import { Secp256k1, X25519 } from '../crypto-primitives/index.js';
import { CryptoKey, BaseEcdhAlgorithm, OperationError } from '../algorithms-api/index.js';

export class EcdhAlgorithm extends BaseEcdhAlgorithm {
  public readonly namedCurves = ['secp256k1', 'X25519'];

  public async deriveBits(options: {
    algorithm: Web5Crypto.EcdhDeriveKeyOptions,
    baseKey: Web5Crypto.CryptoKey,
    length: number | null
  }): Promise<Uint8Array> {
    const { algorithm, baseKey, length } = options;

    this.checkAlgorithmOptions({ algorithm, baseKey });
    // The base key must be allowed to be used for deriveBits operations.
    this.checkKeyUsages({ keyUsages: ['deriveBits'], allowedKeyUsages: baseKey.usages });
    // The public key must be allowed to be used for deriveBits operations.
    this.checkKeyUsages({ keyUsages: ['deriveBits'], allowedKeyUsages: algorithm.publicKey.usages });

    let sharedSecret: Uint8Array;

    const ownKeyAlgorithm = baseKey.algorithm as Web5Crypto.EcGenerateKeyOptions; // Type guard.

    switch (ownKeyAlgorithm.namedCurve) {

      case 'secp256k1': {
        const ownPrivateKey = baseKey.material;
        const otherPartyPublicKey = algorithm.publicKey.material;
        sharedSecret = await Secp256k1.sharedSecret({
          privateKey : ownPrivateKey,
          publicKey  : otherPartyPublicKey
        });
        break;
      }

      case 'X25519': {
        const ownPrivateKey = baseKey.material;
        const otherPartyPublicKey = algorithm.publicKey.material;
        sharedSecret = await X25519.sharedSecret({
          privateKey : ownPrivateKey,
          publicKey  : otherPartyPublicKey
        });
        break;
      }

      default:
        throw new TypeError(`Out of range: '${ownKeyAlgorithm.namedCurve}'. Must be one of '${this.namedCurves.join(', ')}'`);
    }

    // Length is null, return the full derived secret.
    if (length === null)
      return sharedSecret;

    // If the length is not a multiple of 8, throw.
    if (length && length % 8 !== 0)
      throw new OperationError(`To be compatible with all browsers, 'length' must be a multiple of 8.`);

    // Convert length from bits to bytes.
    const lengthInBytes = length / 8;

    // If length (converted to bytes) is larger than the derived secret, throw.
    if (sharedSecret.byteLength < lengthInBytes)
      throw new OperationError(`Requested 'length' exceeds the byte length of the derived secret.`);

    // Otherwise, either return the secret or a truncated slice.
    return lengthInBytes === sharedSecret.byteLength ?
      sharedSecret :
      sharedSecret.slice(0, lengthInBytes);
  }

  public async generateKey(options: {
    algorithm: Web5Crypto.EcGenerateKeyOptions | Web5Crypto.EcdsaGenerateKeyOptions,
    extractable: boolean,
    keyUsages: Web5Crypto.KeyUsage[]
  }): Promise<Web5Crypto.CryptoKeyPair> {
    const { algorithm, extractable, keyUsages } = options;

    this.checkGenerateKey({ algorithm, keyUsages });

    let keyPair: BytesKeyPair | undefined;
    let cryptoKeyPair: Web5Crypto.CryptoKeyPair;

    switch (algorithm.namedCurve) {

      case 'secp256k1': {
        (algorithm as Web5Crypto.EcdsaGenerateKeyOptions).compressedPublicKey ??= true;
        keyPair = await Secp256k1.generateKeyPair({
          compressedPublicKey: (algorithm as Web5Crypto.EcdsaGenerateKeyOptions).compressedPublicKey
        });
        break;
      }

      case 'X25519': {
        keyPair = await X25519.generateKeyPair();
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
}