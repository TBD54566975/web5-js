/**
 * Interface for a generic key-value store.
 */
export interface KeyValueStore<K, V> {
  /**
   * Clears the store, removing all key-value pairs.
   *
   * @returns A promise that resolves when the store has been cleared.
   */
  clear(): Promise<void>;

  /**
   * Closes the store, freeing up any resources used. After calling this method, no other operations can be performed on the store.
   *
   * @returns A promise that resolves when the store has been closed.
   */
  close(): Promise<void>;

  /**
   * Deletes a key-value pair from the store.
   *
   * @param key - The key of the value to delete.
   * @returns A promise that resolves to true if the element existed and has been removed, or false if the element does not exist.
   */
  delete(key: K): Promise<boolean | void>;

  /**
   * Fetches a value from the store given its key.
   *
   * @param key - The key of the value to retrieve.
   * @returns A promise that resolves with the value associated with the key, or `undefined` if no value exists for that key.
   */
  get(key: K): Promise<V | undefined>;

  /**
   * Sets the value for a key in the store.
   *
   * @param key - The key under which to store the value.
   * @param value - The value to be stored.
   * @returns A promise that resolves when the value has been set.
   */
  set(key: K, value: V): Promise<void>;
}