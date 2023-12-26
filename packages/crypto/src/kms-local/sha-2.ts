import type { Hasher } from '../types/hasher.js';
import type { DigestParams } from '../types/params-direct.js';

import { Sha256 } from '../primitives/sha256.js';

interface Sha2DigestParams extends DigestParams {
  algorithm: 'SHA-256';
}

export class Sha2Algorithm implements
    Hasher<Sha2DigestParams> {

  public readonly names = ['SHA-256'] as const;

  public async digest({ algorithm, data }: Sha2DigestParams): Promise<Uint8Array> {
    switch (algorithm) {

      case 'SHA-256': {
        const hash = await Sha256.digest({ data });
        return hash;
      }
    }

  }
}