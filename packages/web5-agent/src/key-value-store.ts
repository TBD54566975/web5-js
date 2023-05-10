/**
 * simple interface for a Key/Value store. Can be implemented to override default implementations wherever
 * they're used
 * TODO: add references to concrete implementations in other packages
 */
export interface KeyValueStore<K, V> {
  get(key: K): Promise<V>;
  set(key: K, value: V): Promise<void>;
  delete(key: K): Promise<void>;
  clear(): Promise<void>;
  close(): Promise<void>;
}