import type { Web5Crypto } from '../../../types-key-manager.js';

import * as secp256k1 from '@noble/secp256k1';

import { CryptoKey } from '../crypto-key.js';
import { EcdhAlgorithm, InvalidAccessError } from '../../../algorithms-api/index.js';

export class DefaultEcdhAlgorithm extends EcdhAlgorithm {
  public readonly namedCurves = ['secp256k1', 'X25519'];

  public async generateKey(options: {
    algorithm: Web5Crypto.EcGenerateKeyOptions,
    extractable: boolean,
    keyUsages: Web5Crypto.KeyUsage[]
  }): Promise<Web5Crypto.CryptoKeyPair> {
    const { algorithm, extractable, keyUsages } = options;

    this.checkGenerateKey(algorithm, keyUsages);

    const privateKeyBytes = secp256k1.utils.randomPrivateKey();
    const publicKeyBytes = secp256k1.getPublicKey(privateKeyBytes);

    const privateKey = new CryptoKey(algorithm, extractable, privateKeyBytes.buffer, 'private', this.keyUsages.privateKey);
    const publicKey = new CryptoKey(algorithm, true, publicKeyBytes.buffer, 'public', this.keyUsages.publicKey);

    return { privateKey, publicKey };
  }

  public override async sign(): Promise<ArrayBuffer> {
    throw new InvalidAccessError(`Requested operation 'sign' is not valid for ECDH keys.`);
  }

  public override async verify(): Promise<boolean> {
    throw new InvalidAccessError(`Requested operation 'verify' is not valid for ECDH keys.`);
  }
}