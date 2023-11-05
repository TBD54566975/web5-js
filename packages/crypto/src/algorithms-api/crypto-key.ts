import type { Web5Crypto } from '../types/web5-crypto.js';

export class CryptoKey implements Web5Crypto.CryptoKey {
  public algorithm: Web5Crypto.KeyAlgorithm | Web5Crypto.GenerateKeyOptions;
  public extractable: boolean;
  public material: Uint8Array;
  public type: Web5Crypto.KeyType;
  public usages: Web5Crypto.KeyUsage[];

  constructor (algorithm: Web5Crypto.Algorithm | Web5Crypto.GenerateKeyOptions, extractable: boolean, material: Uint8Array, type: Web5Crypto.KeyType, usages: Web5Crypto.KeyUsage[]) {
    this.algorithm = algorithm;
    this.extractable = extractable;
    this.material = material;
    this.type = type;
    this.usages = usages;

    // ensure values are not writeable
    Object.defineProperties(this, {
      // TODO
      // These properties can't be fixed immediately on creation of the
      // object because the implementation may build it up in stages.
      // At some point in the operations before returning a key we should
      // freeze the object to prevent further manipulation.

      type: {
        enumerable : true,
        writable   : false,
        value      : type
      },
      extractable: {
        enumerable : true,
        writable   : true,
        value      : extractable
      },
      algorithm: {
        enumerable : true,
        writable   : false,
        value      : algorithm
      },
      usages: {
        enumerable : true,
        writable   : true,
        value      : usages
      },

      // this is the "key material" used internally
      // it is not enumerable, but we need it to be
      // accessible by algorithm implementations
      material: {
        enumerable : false,
        writable   : false,
        value      : material
      }
    });
  }
}