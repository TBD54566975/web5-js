import type { AbstractLevel } from 'abstract-level';
import type { LevelType } from '../../src/main.js';

import { LevelFactory } from '../../src/main.js';
import { MemoryLevel } from 'memory-level';
import { Level } from 'level';

export class TestAbstractLevel<T extends AbstractLevel<string | Buffer | Uint8Array, string, string>> {

  public storage: Record<string, LevelType<T>>;

  private constructor(storage: Record<string, LevelType<T>>) {
    this.storage = storage;
  }

  static createLevelStorage() {
    const storage: Record<string, Level<string>> = {
      appStorage   : LevelFactory.createLevel('./__TESTDATA__/level/appStorage'),
      did          : LevelFactory.createLevel('./__TESTDATA__/level/did'),
      profileIndex : LevelFactory.createLevel('./__TESTDATA__/level/profileIndex'),
      profileStore : LevelFactory.createLevel('./__TESTDATA__/level/profileStore'),
      syncApi      : LevelFactory.createLevel('./__TESTDATA__/level/syncApi'),
    };

    return new TestAbstractLevel(storage);
  }

  static createAbstractStorage() {
    const storage: Record<string, LevelType<AbstractLevel<string | Buffer | Uint8Array, string, string>>> = {
      appStorage   : LevelFactory.createAbstractLevel<MemoryLevel>(MemoryLevel, './__TESTDATA__/abstract/appStorage'),
      did          : LevelFactory.createAbstractLevel<MemoryLevel>(MemoryLevel, './__TESTDATA__/abstract/did'),
      profileIndex : LevelFactory.createAbstractLevel<MemoryLevel>(MemoryLevel, './__TESTDATA__/abstract/profileIndex'),
      profileStore : LevelFactory.createAbstractLevel<MemoryLevel>(MemoryLevel, './__TESTDATA__/abstract/profileStore'),
      syncApi      : LevelFactory.createAbstractLevel<MemoryLevel>(MemoryLevel, './__TESTDATA__/abstract/syncApi'),
    };

    return new TestAbstractLevel(storage);
  }

  public clearStorage() {
    if (!this.storage) return Promise.resolve();

    const promises = Object.values(this.storage).map(async (db) => {
      await db.clear();
    });
    return Promise.all(promises);
  }
}