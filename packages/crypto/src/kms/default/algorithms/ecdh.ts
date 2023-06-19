import type { BufferKeyPair, Web5Crypto } from '../../../types-key-manager.js';

import { CryptoKey } from '../crypto-key.js';
import { isBufferKeyPair } from '../../../utils.js';
import { Secp256k1, X25519 } from '../../../crypto-algorithms/index.js';
import { EcdhAlgorithm, InvalidAccessError } from '../../../algorithms-api/index.js';

export class DefaultEcdhAlgorithm extends EcdhAlgorithm {
  public readonly namedCurves = ['secp256k1', 'X25519'];

  public async generateKey(options: {
    algorithm: Web5Crypto.EcGenerateKeyOptions | Web5Crypto.EcdsaGenerateKeyOptions,
    extractable: boolean,
    keyUsages: Web5Crypto.KeyUsage[]
  }): Promise<Web5Crypto.CryptoKeyPair> {
    const { algorithm, extractable, keyUsages } = options;

    this.checkGenerateKey({ algorithm, keyUsages });

    let keyPair: BufferKeyPair | undefined;
    let cryptoKeyPair: Web5Crypto.CryptoKeyPair;

    switch (algorithm.namedCurve) {

      case 'secp256k1': {
        const compressedPublicKey = ('compressedPublicKey' in algorithm) ? algorithm.compressedPublicKey : undefined; // Type guard.
        keyPair = await Secp256k1.generateKeyPair({ compressedPublicKey });
        break;
      }

      case 'X25519': {
        keyPair = await X25519.generateKeyPair();
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

  public override async sign(): Promise<ArrayBuffer> {
    throw new InvalidAccessError(`Requested operation 'sign' is not valid for ECDH keys.`);
  }

  public override async verify(): Promise<boolean> {
    throw new InvalidAccessError(`Requested operation 'verify' is not valid for ECDH keys.`);
  }
}