import type { KeyValueStore } from './common/types.d.js';

/**
 * An implementation of `KeyValueStore` that holds data in memory.
 *
 * This implementation can be used by a `ManagedKeyStore` to store
 * `ManagedKey` and `ManagedKeyPair` objects or by a `ManagedPrivateKeyStore`
 * to store `ManagedPrivateKey` objects.
 *
 * @public
 */
export class MemoryKeyStore<K, V> implements KeyValueStore<K, V> {
  #store: Map<K, V> = new Map();

  async clear(): Promise<void> {
    this.#store.clear();
  }

  async close(): Promise<void> {
    throw new Error('MemoryKeyStore does not support the close() method.');
  }

  async delete(id: K): Promise<boolean> {
    return this.#store.delete(id);
  }

  async get(id: K): Promise<V | undefined> {
    return this.#store.get(id);
  }

  /**
   * Checks for the presence of an entry by key.
   *
   * @param id - The key to check for the existence of.
   * @returns a boolean indicating whether an element with the specified key exists or not.
   */
  async has(id: K): Promise<boolean> {
    return this.#store.has(id);
  }

  async list(): Promise<V[]> {
    return Array.from(this.#store.values());
  }

  async set(id: K, key: V): Promise<void> {
    this.#store.set(id, key);
  }
}