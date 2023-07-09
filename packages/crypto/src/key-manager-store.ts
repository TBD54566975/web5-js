import type { ManagedKeyStore, ManagedKey, ManagedKeyPair } from './types-key-manager.js';

import { isManagedKeyPair } from './utils-key-manager.js';
import { MemoryKeyStore } from './key-store-memory.js';

/**
 * An implementation of `ManagedKeyStore` that stores key metadata and
 * public key material in memory.
 *
 * An instance of this class can be used by `KeyManager`.`
 *
 * This class must be initialized with a {@link MemoryKeyStore}, which serves
 * as the key/value store.
 */
export class KeyManagerStore implements ManagedKeyStore<string, ManagedKey | ManagedKeyPair> {
  #store: MemoryKeyStore<string, ManagedKey | ManagedKeyPair>;

  constructor(options: { store: MemoryKeyStore<string, ManagedKey | ManagedKeyPair> }) {
    this.#store = options.store;
  }

  async deleteKey({ id }: { id: string }) {
    if (await this.#store.has(id)) {
      await this.#store.delete(id);
      return true;
    } else {
      return false;
    }
  }

  async getKey({ id }: { id: string }): Promise<ManagedKey | ManagedKeyPair | undefined> {
    return this.#store.get(id);
  }

  async importKey({ key }: { key: ManagedKey | ManagedKeyPair }): Promise<boolean> {
    const id = isManagedKeyPair(key) ? key.publicKey!.id : key.id;
    if (await this.#store.has(id)) {
      throw new Error(`Key with ID already exists: '${id}'`);
    }

    // Make a deep copy of the key so that the object stored does not share the same references as the input key.
    const clonedKey = structuredClone(key);
    await this.#store.set(id, clonedKey );

    return true;
  }

  async listKeys(): Promise<Array<ManagedKey | ManagedKeyPair>> {
    return this.#store.list();
  }
}