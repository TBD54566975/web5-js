var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Level } from 'level';
export class LevelStore {
    constructor({ db, location = 'DATASTORE' } = {}) {
        this.store = db !== null && db !== void 0 ? db : new Level(location);
    }
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.store.clear();
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.store.close();
        });
    }
    delete(key) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.store.del(key);
        });
    }
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.store.get(key);
            }
            catch (error) {
                // Don't throw when a key wasn't found.
                if (error.notFound)
                    return undefined;
                throw error;
            }
        });
    }
    set(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.store.put(key, value);
        });
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
export class MemoryStore {
    constructor() {
        /**
         * A private field that contains the Map used as the key-value store.
         */
        this.store = new Map();
    }
    /**
     * Clears all entries in the key-value store.
     *
     * @returns A Promise that resolves when the operation is complete.
     */
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            this.store.clear();
        });
    }
    /**
     * This operation is no-op for `MemoryStore`
     * and will log a warning if called.
     */
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            /** no-op */
        });
    }
    /**
     * Deletes an entry from the key-value store by its key.
     *
     * @param id - The key of the entry to delete.
     * @returns A Promise that resolves to a boolean indicating whether the entry was successfully deleted.
     */
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.store.delete(id);
        });
    }
    /**
     * Retrieves the value of an entry by its key.
     *
     * @param id - The key of the entry to retrieve.
     * @returns A Promise that resolves to the value of the entry, or `undefined` if the entry does not exist.
     */
    get(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.store.get(id);
        });
    }
    /**
     * Checks for the presence of an entry by key.
     *
     * @param id - The key to check for the existence of.
     * @returns A Promise that resolves to a boolean indicating whether an element with the specified key exists or not.
     */
    has(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.store.has(id);
        });
    }
    /**
     * Retrieves all values in the key-value store.
     *
     * @returns A Promise that resolves to an array of all values in the store.
     */
    list() {
        return __awaiter(this, void 0, void 0, function* () {
            return Array.from(this.store.values());
        });
    }
    /**
     * Sets the value of an entry in the key-value store.
     *
     * @param id - The key of the entry to set.
     * @param key - The new value for the entry.
     * @returns A Promise that resolves when the operation is complete.
     */
    set(id, key) {
        return __awaiter(this, void 0, void 0, function* () {
            this.store.set(id, key);
        });
    }
}
//# sourceMappingURL=stores.js.map