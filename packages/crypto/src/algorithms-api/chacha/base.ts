import type { Web5Crypto } from '../../types/web5-crypto.js';

import { InvalidAccessError } from '../errors.js';
import { CryptoAlgorithm } from '../crypto-algorithm.js';

export abstract class BaseChaChaAlgorithm extends CryptoAlgorithm {

  public checkGenerateKey(options: {
    algorithm: Web5Crypto.ChaChaGenerateKeyOptions,
    keyUsages: Web5Crypto.KeyUsage[]
  }): void {
    const { algorithm, keyUsages } = options;
    // Algorithm specified in the operation must match the algorithm implementation processing the operation.
    this.checkAlgorithmName({ algorithmName: algorithm.name });
    // The key usages specified must be permitted by the algorithm implementation processing the operation.
    this.checkKeyUsages({ keyUsages, allowedKeyUsages: this.keyUsages });
  }

  public abstract generateKey(options: {
    algorithm: Web5Crypto.ChaChaGenerateKeyOptions,
    extractable: boolean,
    keyUsages: Web5Crypto.KeyUsage[]
  }): Promise<Web5Crypto.CryptoKey>;

  public override async deriveBits(): Promise<Uint8Array> {
    throw new InvalidAccessError(`Requested operation 'deriveBits' is not valid for ${this.name} keys.`);
  }

  public override async sign(): Promise<Uint8Array> {
    throw new InvalidAccessError(`Requested operation 'sign' is not valid for ${this.name} keys.`);
  }

  public override async verify(): Promise<boolean> {
    throw new InvalidAccessError(`Requested operation 'verify' is not valid for ${this.name} keys.`);
  }
}