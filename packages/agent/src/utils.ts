import type { JsonWebKey, Web5Crypto } from '@web5/crypto';

import { Jose } from '@web5/crypto';
import { RequireOnly } from '@web5/common';
import { Readable } from 'readable-stream';
import { ReadableWebToNodeStream } from 'readable-web-to-node-stream';

import { ManagedKey, ManagedKeyPair, PortableKey, PortableKeyPair } from './types/managed-key.js';

export function appendPathToUrl({ path, url }: { url: string, path: string }): string {
  const urlObject = new URL(url);
  const lastChar = urlObject.pathname.slice(-1);

  if (lastChar === '/') {
    urlObject.pathname += path;
  } else {
    urlObject.pathname += `/${path}`;
  }

  return urlObject.toString();
}

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
  key: ManagedKey
}): Web5Crypto.CryptoKey {
  if (key.material === undefined) {
    throw new Error(`Could not convert to CryptoKey: 'material' is undefined.`);
  }

  const cryptoKey: Web5Crypto.CryptoKey = {
    algorithm   : key.algorithm,
    extractable : key.extractable,
    material    : key.material,
    type        : key.type,
    usages      : key.usages
  };

  return cryptoKey;
}

export async function poll<T>(fn: () => Promise<T>, options: { interval: number, validate?: (result: T) => boolean, abortSignal?: AbortSignal }): Promise<T>;
export async function poll<T>(fn: () => Promise<T>, options: { interval: number, validate?: (result: T) => boolean, abortSignal?: AbortSignal, callback?: (result: T) => Promise<void> }): Promise<void>;
export async function poll<T>(
  fn: () => Promise<T>,
  {
    interval,
    validate = () => true,
    abortSignal,
    callback,
  }: {
    interval: number,
    validate?: (result: T) => boolean,
    abortSignal?: AbortSignal,
    callback?: (result: T) => Promise<void>
  }
): Promise<void | T> {
  while (!abortSignal?.aborted) {
    try {
      const result = await fn();
      // If the result is valid...
      if (validate(result)) {
        // ...and a `callback` function is not provided, return the result.
        if (!callback) return result;
        // ...otherwise, invoke the callback and continue polling.
        callback(result);
      }
    } catch (error) { /* Ignore errors and continue polling. */ }

    // Await the interval.
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Retries an asynchronous function a specified number of times at given intervals.
 *
 * @template T - The type of the result returned by the asynchronous function.
 * @param {() => Promise<T>} fn - The asynchronous function to retry.
 * @param {Object} options - An object specifying retry options.
 * @param {number} options.maxRetries - The maximum number of retry attempts.
 * @param {number} options.interval - The delay between retries in milliseconds.
 * @param {string} options.errorMsg - The error message to throw if all retries fail.
 * @param {(result: T) => boolean} [options.validate = () => true] - An optional validation function
 *                                                                   that returns a boolean
 *                                                                   indicating whether the result
 *                                                                   is valid.
 *
 * @returns {Promise<T>} - A Promise that resolves to the result of the asynchronous function if it
 *                         succeeds within the specified number of retries, or rejects with an error
 *                         if all retries fail.
 *
 * @throws Will throw an error if the function fails to produce a valid result after the specified
 *         number of retries, or if the validation function consistently returns `false`.
 *
 * @example
 * const result = await retry(
 *   () => someAsyncFunction(),
 *   {
 *     maxRetries: 3,
 *     interval: 100,
 *     errorMsg: 'Failed after 3 retries',
 *     validate: (result) => result !== undefined,
 *   }
 * );
 */
export async function retry<T>(
  fn: () => Promise<T>,
  {
    maxRetries,
    interval,
    errorMsg,
    validate = () => true,
  }: {
    maxRetries: number,
    interval: number,
    errorMsg: string,
    validate?: (result: T) => boolean
  }
): Promise<T> {
  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      const result = await fn();
      if (validate(result)) {
        return result;
      }
      throw new Error('Validation failed');
    } catch (error) {
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }
  throw new Error(errorMsg);
}

export function webReadableToIsomorphicNodeReadable(webReadable: ReadableStream<any>) {
  return new ReadableWebToNodeStream(webReadable);
}