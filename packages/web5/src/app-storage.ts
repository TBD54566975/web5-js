import { LevelFactory, LevelType } from '@tbd54566975/storage';

// simple isomorphic key/value store
// TODO: create KeyValueStore interface that this class implements
export class AppStorage {
  private store: LevelType;

  constructor(location = 'data/app/storage', store?: LevelType) {
    if (!store) {
      store = LevelFactory.createLevel(location);
    }
    this.store = store;
  }

  async get(key: string): Promise<string | undefined> {
    try {
      return await this.store.get(key);
    } catch(e: any) {
      if (e.code === 'LEVEL_NOT_FOUND') {
        return;
      } else {
        throw e;
      }
    }
  }

  set(key: string, value: string): Promise<void> {
    return this.store.put(key, value);
  }

  async delete(key: string): Promise<void> {
    return this.store.del(key);
  }

  async clear(): Promise<void> {
    return this.store.clear();
  }

  async close(): Promise<void> {
    return this.store.close();
  }
}