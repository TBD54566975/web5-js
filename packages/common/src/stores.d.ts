/// <reference types="node" resolution-mode="require"/>
import type { AbstractLevel } from 'abstract-level';
import type { KeyValueStore } from './types.js';
export declare class LevelStore<K = string, V = any> implements KeyValueStore<K, V> {
    private store;
    constructor({ db, location }?: {
        db?: AbstractLevel<string | Buffer | Uint8Array, K, V>;
        location?: string;
    });
    clear(): Promise<void>;
    close(): Promise<void>;
    delete(key: K): Promise<void>;
    get(key: K): Promise<V | undefined>;
    set(key: K, value: V): Promise<void>;
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
export declare class MemoryStore<K, V> implements KeyValueStore<K, V> {
    /**
     * A private field that contains the Map used as the key-value store.
     */
    private store;
    /**
     * Clears all entries in the key-value store.
     *
     * @returns A Promise that resolves when the operation is complete.
     */
    clear(): Promise<void>;
    /**
     * This operation is no-op for `MemoryStore`
     * and will log a warning if called.
     */
    close(): Promise<void>;
    /**
     * Deletes an entry from the key-value store by its key.
     *
     * @param id - The key of the entry to delete.
     * @returns A Promise that resolves to a boolean indicating whether the entry was successfully deleted.
     */
    delete(id: K): Promise<boolean>;
    /**
     * Retrieves the value of an entry by its key.
     *
     * @param id - The key of the entry to retrieve.
     * @returns A Promise that resolves to the value of the entry, or `undefined` if the entry does not exist.
     */
    get(id: K): Promise<V | undefined>;
    /**
     * Checks for the presence of an entry by key.
     *
     * @param id - The key to check for the existence of.
     * @returns A Promise that resolves to a boolean indicating whether an element with the specified key exists or not.
     */
    has(id: K): Promise<boolean>;
    /**
     * Retrieves all values in the key-value store.
     *
     * @returns A Promise that resolves to an array of all values in the store.
     */
    list(): Promise<V[]>;
    /**
     * Sets the value of an entry in the key-value store.
     *
     * @param id - The key of the entry to set.
     * @param key - The new value for the entry.
     * @returns A Promise that resolves when the operation is complete.
     */
    set(id: K, key: V): Promise<void>;
}
//# sourceMappingURL=stores.d.ts.map