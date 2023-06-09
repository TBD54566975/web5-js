import type { Web5Crypto } from '../../../types-new.js';

import * as Ed25519 from '@noble/ed25519';

import { InternalCryptoKey } from '../crypto-key.js';
import { EdDsaAlgorithm } from '../../../algorithms-api/index.js';

export class DefaultEdDsaAlgorithm extends EdDsaAlgorithm {
  public readonly namedCurves = ['Ed25519', 'Ed448'];

  public async generateKey(algorithm: Web5Crypto.EcKeyGenParams, extractable: boolean, keyUsages: Web5Crypto.KeyUsage[]): Promise<Web5Crypto.CryptoKeyPair> {
    this.checkGenerateKey(algorithm, keyUsages);

    const privateKeyBytes = Ed25519.utils.randomPrivateKey();
    const publicKeyBytes = Ed25519.getPublicKey(privateKeyBytes);

    const privateKey = new InternalCryptoKey(algorithm, extractable, privateKeyBytes.buffer, 'private', this.usages.privateKey);
    const publicKey = new InternalCryptoKey(algorithm, extractable, publicKeyBytes.buffer, 'public', this.usages.publicKey);

    return { privateKey, publicKey };
  }
}