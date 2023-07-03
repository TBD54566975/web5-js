import type { ManagedKeyStore, ManagedKey, ManagedKeyPair, ManagedPrivateKey } from '../types-key-manager.js';

import { uuid } from '../utils-key-manager.js';
import { MemoryKeyStore } from '../key-store-memory.js';
import { isManagedKeyPair } from '../utils-key-manager.js';

/**
 * An implementation of `ManagedKeyStore` that stores key metadata and
 * public key material in memory.
 *
 * An instance of this class can be used by an implementation of
 * `KeyManagementSystem`.
 *
 * This class must be initialized with a {@link MemoryKeyStore}, which serves
 * as the key/value store.
 */
export class KmsKeyStore implements ManagedKeyStore<string, ManagedKey | ManagedKeyPair> {
  #keyStore: MemoryKeyStore<string, ManagedKey | ManagedKeyPair>;

  constructor(keyStore: MemoryKeyStore<string, ManagedKey | ManagedKeyPair>) {
    this.#keyStore = keyStore;
  }

  async deleteKey({ id }: { id: string }) {
    if (await this.#keyStore.has(id)) {
      await this.#keyStore.delete(id);
      return true;
    } else {
      return false;
    }
  }

  async getKey({ id }: { id: string }): Promise<ManagedKey | ManagedKeyPair | undefined> {
    return this.#keyStore.get(id);
  }

  async importKey({ key }: { key: ManagedKey | ManagedKeyPair }): Promise<string> {
    let id: string;
    if (isManagedKeyPair(key)) {
      id = key.publicKey.id;
    } else {
      key.id ??= uuid(); // If an ID wasn't specified, generate one.
      id = key.id;
    }

    if (await this.#keyStore.has(id)) {
      throw new Error(`Key with ID already exists: '${id}'`);
    }

    // Make a deep copy of the key so that the object stored does not share the same references as the input key.
    const clonedKey = structuredClone(key);
    await this.#keyStore.set(id, clonedKey);
    return id;
  }

  async listKeys(): Promise<Array<ManagedKey | ManagedKeyPair>> {
    return this.#keyStore.list();
  }
}

/**
 * An implementation of `ManagedKeyStore` that stores private key
 * material in memory.
 *
 * An instance of this class can be used by an implementation of
 * `KeyManagementSystem`.
 *
 * This class must be initialized with a {@link MemoryKeyStore}, which serves
 * as the key/value store.
 */
export class KmsPrivateKeyStore implements ManagedKeyStore<string, ManagedPrivateKey> {
  #keyStore: MemoryKeyStore<string, ManagedPrivateKey>;

  constructor(keyStore: MemoryKeyStore<string, ManagedPrivateKey>) {
    this.#keyStore = keyStore;
  }

  async deleteKey({ id }: { id: string }) {
    if (await this.#keyStore.has(id)) {
      await this.#keyStore.delete(id);
      return true;
    } else {
      return false;
    }
  }

  async getKey({ id }: { id: string }): Promise<ManagedPrivateKey | undefined> {
    return this.#keyStore.get(id);
  }

  async importKey({ key }: { key: Omit<ManagedPrivateKey, 'id'> }): Promise<string> {
    if (!key.material) throw new TypeError(`Required parameter was missing: 'material'`);
    if (!key.type) throw new TypeError(`Required parameter was missing: 'type'`);

    // Make a deep copy of the key so that the object stored does not share the same references as the input key.
    // The private key material is transferred to the new object, making the original obj.material unusable.
    const clonedKey = structuredClone(key, { transfer: [key.material] }) as ManagedPrivateKey;

    clonedKey.id = uuid();
    await this.#keyStore.set(clonedKey.id, clonedKey);

    return clonedKey.id;
  }

  async listKeys(): Promise<Array<ManagedPrivateKey>> {
    return this.#keyStore.list();
  }
}