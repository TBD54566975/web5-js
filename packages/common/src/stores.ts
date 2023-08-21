import { Level } from 'level';

import type { KeyValueStore } from './types.js';

export class LevelStore implements KeyValueStore<string, any> {
  private store: Level<string, string>;

  constructor(location = 'DATASTORE') {
    this.store = new Level(location);
  }

  async clear(): Promise<void> {
    await this.store.clear();
  }

  async close(): Promise<void> {
    await this.store.close();
  }

  async delete(key: string): Promise<boolean> {
    await this.store.del(key);
    return true;
  }

  async get(key: string): Promise<any> {
    return await this.store.get(key);
  }

  async set(key: string, value: any): Promise<void> {
    await this.store.put(key, value);
  }
}

/**
 * The `MemoryStore` class is an implementation of
 * `KeyValueStore` that holds data in memory.
 *
 * It provides a basic key-value store that works synchronously and keeps all
 * data in memory. This can be used for testing, or for handling small amounts
 * of data with simple key-value semantics.
 *
 * Example usage:
 *
 * ```ts
 * const memoryStore = new MemoryStore<string, number>();
 * await memoryStore.set("key1", 1);
 * const value = await memoryStore.get("key1");
 * console.log(value); // 1
 * ```
 *
 * @public
 */
export class MemoryStore<K, V> implements KeyValueStore<K, V> {
  /**
   * A private field that contains the Map used as the key-value store.
   */
  private store: Map<K, V> = new Map();

  /**
   * Clears all entries in the key-value store.
   *
   * @returns A Promise that resolves when the operation is complete.
   */
  async clear(): Promise<void> {
    this.store.clear();
  }

  /**
   * This operation is no-op for `MemoryStore`
   * and will log a warning if called.
   */
  async close(): Promise<void> {
    /** no-op */
  }

  /**
   * Deletes an entry from the key-value store by its key.
   *
   * @param id - The key of the entry to delete.
   * @returns A Promise that resolves to a boolean indicating whether the entry was successfully deleted.
   */
  async delete(id: K): Promise<boolean> {
    return this.store.delete(id);
  }

  /**
   * Retrieves the value of an entry by its key.
   *
   * @param id - The key of the entry to retrieve.
   * @returns A Promise that resolves to the value of the entry, or `undefined` if the entry does not exist.
   */
  async get(id: K): Promise<V | undefined> {
    return this.store.get(id);
  }

  /**
   * Checks for the presence of an entry by key.
   *
   * @param id - The key to check for the existence of.
   * @returns A Promise that resolves to a boolean indicating whether an element with the specified key exists or not.
   */
  async has(id: K): Promise<boolean> {
    return this.store.has(id);
  }

  /**
   * Retrieves all values in the key-value store.
   *
   * @returns A Promise that resolves to an array of all values in the store.
   */
  async list(): Promise<V[]> {
    return Array.from(this.store.values());
  }

  /**
   * Sets the value of an entry in the key-value store.
   *
   * @param id - The key of the entry to set.
   * @param key - The new value for the entry.
   * @returns A Promise that resolves when the operation is complete.
   */
  async set(id: K, key: V): Promise<void> {
    this.store.set(id, key);
  }
}