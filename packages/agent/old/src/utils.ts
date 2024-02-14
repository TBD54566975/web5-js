import type { JsonWebKey, Web5Crypto } from '@web5/crypto';

import { Jose } from '@web5/crypto';
import { RequireOnly } from '@web5/common';
import { Readable } from 'readable-stream';
import { ReadableWebToNodeStream } from 'readable-web-to-node-stream';

import { ManagedKey, ManagedKeyPair, PortableKey, PortableKeyPair } from './types/managed-key.js';

export function blobToIsomorphicNodeReadable(blob: Blob): Readable {
  return webReadableToIsomorphicNodeReadable(blob.stream() as ReadableStream<any>);
}

export function cryptoToManagedKey(options: {
  cryptoKey: Web5Crypto.CryptoKey,
    keyData: RequireOnly<ManagedKey, 'kms'>
  }): ManagedKey {
  const { cryptoKey, keyData } = options;

  const managedKey: ManagedKey = {
    id          : keyData.id ?? '',
    algorithm   : cryptoKey.algorithm,
    alias       : keyData.alias,
    extractable : cryptoKey.extractable,
    kms         : keyData.kms,
    material    : (cryptoKey.type === 'public') ? cryptoKey.material : undefined,
    metadata    : keyData.metadata,
    state       : 'Enabled',
    type        : cryptoKey.type,
    usages      : cryptoKey.usages
  };

  return managedKey;
}

export function cryptoToManagedKeyPair(options: {
  cryptoKeyPair: Web5Crypto.CryptoKeyPair,
    keyData: RequireOnly<ManagedKey, 'kms' | 'state'>
  }): ManagedKeyPair {
  const { cryptoKeyPair, keyData } = options;

  const privateKey = cryptoKeyPair.privateKey;
  const publicKey = cryptoKeyPair.publicKey;

  const managedKeyPair = {
    privateKey: {
      id          : keyData.id ?? '',
      algorithm   : privateKey.algorithm,
      alias       : keyData.alias,
      extractable : privateKey.extractable,
      kms         : keyData.kms,
      metadata    : keyData.metadata,
      state       : keyData.state,
      type        : privateKey.type,
      usages      : privateKey.usages
    },

    publicKey: {
      id          : keyData.id ?? '',
      algorithm   : publicKey.algorithm,
      alias       : keyData.alias,
      extractable : publicKey.extractable,
      kms         : keyData.kms,
      material    : publicKey.material,
      metadata    : keyData.metadata,
      state       : keyData.state,
      type        : publicKey.type,
      usages      : publicKey.usages
    },
  };

  return managedKeyPair;
}

export function cryptoToPortableKey(options: {
  cryptoKey: Web5Crypto.CryptoKey,
    keyData: RequireOnly<ManagedKey, 'kms'>
  }): PortableKey {
  const { cryptoKey, keyData } = options;

  const portableKey = {
    id          : keyData.id ?? '',
    algorithm   : cryptoKey.algorithm,
    alias       : keyData.alias,
    extractable : cryptoKey.extractable,
    kms         : keyData.kms,
    material    : cryptoKey.material,
    metadata    : keyData.metadata,
    type        : cryptoKey.type,
    usages      : cryptoKey.usages
  };

  return portableKey;
}

export function cryptoToPortableKeyPair(options: {
  cryptoKeyPair: Web5Crypto.CryptoKeyPair,
    keyData: RequireOnly<ManagedKey, 'kms'>
  }): PortableKeyPair {
  const { cryptoKeyPair, keyData } = options;

  const privateKey = cryptoKeyPair.privateKey;
  const publicKey = cryptoKeyPair.publicKey;

  const portableKeyPair = {
    privateKey: {
      id          : keyData.id ?? '',
      algorithm   : privateKey.algorithm,
      alias       : keyData.alias,
      extractable : privateKey.extractable,
      kms         : keyData.kms,
      material    : privateKey.material,
      metadata    : keyData.metadata,
      type        : privateKey.type,
      usages      : privateKey.usages
    },

    publicKey: {
      id          : keyData.id ?? '',
      algorithm   : publicKey.algorithm,
      alias       : keyData.alias,
      extractable : publicKey.extractable,
      kms         : keyData.kms,
      material    : publicKey.material,
      metadata    : keyData.metadata,
      type        : publicKey.type,
      usages      : publicKey.usages
    },
  };

  return portableKeyPair;
}

/**
 * Type guard function to check if the given key is a ManagedKey.
 *
 * @param key The key to check.
 * @returns True if the key is a ManagedKeyPair, false otherwise.
 */
export function isManagedKey(key: ManagedKey | ManagedKeyPair | undefined): key is ManagedKey {
  return key !== undefined && 'algorithm' in key && 'extractable' in key && 'type' in key && 'usages' in key;
}

/**
 * Type guard function to check if the given key is a ManagedKeyPair.
 *
 * @param key The key to check.
 * @returns True if the key is a ManagedKeyPair, false otherwise.
 */
export function isManagedKeyPair(key: ManagedKey | ManagedKeyPair | undefined): key is ManagedKeyPair {
  return key !== undefined && 'privateKey' in key && 'publicKey' in key;
}

export async function managedKeyToJwk({ key }: {
  key: RequireOnly<ManagedKey, 'algorithm' | 'extractable' | 'material' | 'type' | 'usages'>
}): Promise<JsonWebKey> {
  if (key.material === undefined) {
    throw new Error(`Could not convert to JWK: 'material' is undefined.`);
  }

  const cryptoKey: Web5Crypto.CryptoKey = {
    algorithm   : key.algorithm,
    extractable : key.extractable,
    material    : key.material,
    type        : key.type,
    usages      : key.usages
  };

  const jwk = await Jose.cryptoKeyToJwk({ key: cryptoKey });

  return jwk;
}

export function managedToCryptoKey({ key }: {
  key: RequireOnly<ManagedKey, 'algorithm' | 'extractable' | 'material' | 'type' | 'usages'>
}): Web5Crypto.CryptoKey {
  const cryptoKey: Web5Crypto.CryptoKey = {
    algorithm   : key.algorithm,
    extractable : key.extractable,
    material    : key.material,
    type        : key.type,
    usages      : key.usages
  };

  return cryptoKey;
}

export function webReadableToIsomorphicNodeReadable(webReadable: ReadableStream<any>) {
  return new ReadableWebToNodeStream(webReadable);
}