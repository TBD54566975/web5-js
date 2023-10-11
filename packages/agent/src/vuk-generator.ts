/** VUK Generation Options */
export interface VukOptions {
  /** The passphrase to use to generate the VUK */
  passphrase: string;

  /** The salt to use to generate the VUK */
  salt: Uint8Array;

  /** The key derivation work factor to use to generate the VUK */
  keyDerivationWorkFactor: number;
}

/** Generates the VUK with Crypto Subtle if present, otherwise fallback to node:crypto */
export const generateVaultUnlockKey = (options: VukOptions): Promise<Uint8Array> => {
  if (crypto && typeof crypto.subtle === 'object' && crypto.subtle != null) {
    return generateVaultUnlockKeyWithSubtleCrypto(options);
  } else {
    return generateVaultUnlockKeyWithNodeCrypto(options);
  }
};

/** Generates the VUK with Crypto Subtle */
export const generateVaultUnlockKeyWithSubtleCrypto = async (options: VukOptions): Promise<Uint8Array> => {
  const { passphrase, salt, keyDerivationWorkFactor } = options;

  const passwordBuffer = new TextEncoder().encode(passphrase);

  const importedKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const vaultUnlockKey = await crypto.subtle.deriveBits(
    {
      name       : 'PBKDF2',
      hash       : 'SHA-512',
      salt       : salt,
      iterations : keyDerivationWorkFactor,
    },
    importedKey,
    32 * 8, // 32 bytes
  );

  return new Uint8Array(vaultUnlockKey);
};

/** Generates the VUK with node:crypto */
export const generateVaultUnlockKeyWithNodeCrypto = async (options: VukOptions): Promise<Uint8Array> => {
  const { passphrase, salt, keyDerivationWorkFactor } = options;

  const { pbkdf2 } = await dynamicImports.getNodeCrypto();

  return new Promise((resolve, reject) => {
    pbkdf2(
      passphrase,
      salt,
      keyDerivationWorkFactor,
      32,
      'sha512',
      (err, derivedKey) => {
        if (err) {
          reject(err);
        } else {
          resolve(new Uint8Array(derivedKey));
        }
      }
    );
  });
};

export const dynamicImports = {
  getNodeCrypto: async () => await import('node:crypto'),
};
