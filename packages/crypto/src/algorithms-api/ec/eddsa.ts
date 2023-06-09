import { Web5Crypto } from '../../types-new.js';
import { EllipticCurveAlgorithm } from './base.js';

export abstract class EdDsaAlgorithm extends EllipticCurveAlgorithm {

  public readonly name: string = 'EdDSA';

  public usages: Web5Crypto.KeyPairUsage = {
    privateKey : ['sign'],
    publicKey  : ['verify'],
  };
}