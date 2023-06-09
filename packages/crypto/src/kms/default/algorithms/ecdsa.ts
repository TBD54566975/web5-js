import type { Web5Crypto } from '../../../types-new.js';

import * as secp256k1 from '@noble/secp256k1';

import { InternalCryptoKey } from '../crypto-key.js';
import { EcdsaAlgorithm } from '../../../algorithms-api/index.js';

export class DefaultEcdsaAlgorithm extends EcdsaAlgorithm {
  public readonly hashAlgorithms = ['SHA-256'];
  public readonly namedCurves = ['K-256'];

  public async generateKey(algorithm: Web5Crypto.EcKeyGenParams, extractable: boolean, keyUsages: Web5Crypto.KeyUsage[]): Promise<Web5Crypto.CryptoKeyPair> {
    this.checkGenerateKey(algorithm, keyUsages);

    const privateKeyBytes = secp256k1.utils.randomPrivateKey();
    const publicKeyBytes = secp256k1.getPublicKey(privateKeyBytes);

    const privateKey = new InternalCryptoKey(algorithm, extractable, privateKeyBytes.buffer, 'private', this.usages.privateKey);
    const publicKey = new InternalCryptoKey(algorithm, true, publicKeyBytes.buffer, 'public', this.usages.publicKey);

    return { privateKey, publicKey };
  }
}