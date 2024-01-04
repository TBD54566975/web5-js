import { Level } from 'level';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

import { LevelStore, MemoryStore } from '../src/stores.js';

describe('LevelStore', () => {
  let levelStore: LevelStore<string, string>;

  beforeEach(async () => {
    levelStore = new LevelStore<string, string>({ location: '__TESTDATA__' });
  });

  afterEach(async () => {
    await levelStore.close();
  });

  describe('constructor', function() {
    it('should initialize with default parameters', async function() {
      const store = new LevelStore();
      expect(store).to.be.an.instanceof(LevelStore);
      await store.close();
    });

    it('should initialize with a custom store location', async function() {
      const store = new LevelStore({ location: '__TESTDATA__/customLocation' });
      expect(store).to.be.an.instanceof(LevelStore);
      await store.close();
    });

    it('should initialize with a custom database', async function() {
      const db = new Level<string, string>('__TESTDATA__/customLocation');
      const store = new LevelStore({ db });
      expect(store).to.be.an.instanceof(LevelStore);
      await store.close();
    });
  });

  describe('clear()', () => {
    it('should clear all key-value pairs', async () => {
      // Populate the store with some data.
      await levelStore.set('key1', '1');
      await levelStore.set('key2', '2');

      // Clear the store.
      await levelStore.clear();

      // Validate that the store is empty.
      let value = await levelStore.get('key1');
      expect(value).to.be.undefined;
      value = await levelStore.get('key2');
      expect(value).to.be.undefined;
    });
  });

  describe('close()', () => {
    it('should close the store', async () => {
      // Create a new store.
      const store = new LevelStore({ location: '__TESTDATA__/customLocation' });

      // Close the store.
      await expect(
        store.close()
      ).to.be.fulfilled;

      // Try to set a value in the store and confirm it is no longer open.
      await expect(
        store.set('key', 'value')
      ).to.be.rejectedWith('Database is not open');
    });
  });

  describe('delete()', () => {
    it('should delete a key-value pair', async () => {
      // Populate the store with some data.
      await levelStore.set('key1', '1');
      await levelStore.set('key2', '2');

      // Delete a key-value pair.
      await levelStore.delete('key1');

      // Validate that the key-value pair was deleted.
      const value = await levelStore.get('key1');
      expect(value).to.be.undefined;
    });

    it('should not throw when deleting a non-existing key', async () => {
      // Delete a non-existent key-value pair.
      await expect(
        levelStore.delete('non-existing')
      ).to.eventually.be.fulfilled;
    });
  });

  describe('get()', () => {
    it('should retrieve the value for an existing key', async () => {
      await levelStore.set('key1', 'value1');
      const value = await levelStore.get('key1');
      expect(value).to.equal('value1');
    });

    it('should return undefined for a non-existing key', async () => {
      const value = await levelStore.get('nonExistingKey');
      expect(value).to.be.undefined;
    });

    it('should handle errors from the underlying store', async () => {
      // Close the store to force an error.
      await levelStore.close();

      // Try to get a value from the store and confirm an error is thrown.
      await expect(levelStore.get('key')).to.be.rejectedWith('Database is not open');
    });
  });

  describe('set()', () => {
    it('should set a new key-value pair', async () => {
      await levelStore.set('newKey', 'newValue');
      const value = await levelStore.get('newKey');
      expect(value).to.equal('newValue');
    });

    it('should overwrite an existing key-value pair', async () => {
      await levelStore.set('existingKey', 'oldValue');
      await levelStore.set('existingKey', 'newValue');
      const value = await levelStore.get('existingKey');
      expect(value).to.equal('newValue');
    });
  });

  describe('supported value types', () => {
    let store: LevelStore<string, any>;

    afterEach(async () => {
      await store.clear();
      await store.close();
    });

    it('should handle string values', async () => {
      const db = new Level<string, string>('__TESTDATA__/stringValues', { valueEncoding: 'utf8' });
      store = new LevelStore<string, string>({ db });
      await store.set('stringKey', 'stringValue');
      const value = await store.get('stringKey');
      expect(value).to.equal('stringValue');
    });

    it('should handle number values', async () => {
      const db = new Level<string, number>('__TESTDATA__/stringValues', { valueEncoding: 'json' });
      store = new LevelStore<string, number>({ db });
      await store.set('numberKey', 123);
      const value = await store.get('numberKey');
      expect(value).to.equal(123);
    });

    it('should handle boolean values', async () => {
      const db = new Level<string, boolean>('__TESTDATA__/stringValues', { valueEncoding: 'json' });
      store = new LevelStore<string, boolean>({ db });
      await store.set('booleanKey', true);
      const value = await store.get('booleanKey');
      expect(value).to.be.true;
    });

    it('should handle object values', async () => {
      const db = new Level<string, object>('__TESTDATA__/objectValues', { valueEncoding: 'json' });
      store = new LevelStore<string, object>({ db });
      const obj = { a: 1, b: 'test' };
      await store.set('objectKey', obj);
      const value = await store.get('objectKey');
      expect(value).to.deep.equal(obj);
    });

    it('should handle array values', async () => {
      const db = new Level<string, Array<any>>('__TESTDATA__/arrayValues', { valueEncoding: 'json' });
      store = new LevelStore<string, Array<any>>({ db });
      const arr = ['one', 'two', 'three'];
      await store.set('arrayKey', arr);
      const value = await store.get('arrayKey');
      expect(value).to.deep.equal(arr);
    });

    it('should handle Uint8Array values', async () => {
      const db = new Level<string, Uint8Array>('__TESTDATA__/uint8ArrayValues', { valueEncoding: 'binary' });
      store = new LevelStore<string, Uint8Array>({ db });
      const u8a = new Uint8Array([1, 2, 3]);
      await store.set('uint8ArrayKey', u8a);
      const value = await store.get('uint8ArrayKey');
      expect(value).to.deep.equal(u8a);
    });
  });
});

describe('MemoryStore', () => {
  let memoryStore: MemoryStore<string, number>;

  beforeEach(async () => {
    memoryStore = new MemoryStore<string, number>();
    await memoryStore.set('key1', 1);
  });

  describe('clear()', () => {
    it('should clear all key-value pairs', async () => {
      await memoryStore.set('key2', 2);
      await memoryStore.clear();
      let value = await memoryStore.get('key1');
      expect(value).to.be.undefined;
      value = await memoryStore.get('key2');
      expect(value).to.be.undefined;
    });
  });

  describe('close()', () => {
    it('should no-op when trying to close the store', async () => {
      await expect(
        memoryStore.close()
      ).to.be.fulfilled;
    });
  });

  describe('delete()', () => {
    it('should delete a key-value pair', async () => {
      const wasDeleted = await memoryStore.delete('key1');
      expect(wasDeleted).to.be.true;
      const value = await memoryStore.get('key1');
      expect(value).to.be.undefined;
    });

    it('should return false when deleting a non-existing key', async () => {
      const wasDeleted = await memoryStore.delete('non-existing');
      expect(wasDeleted).to.be.false;
    });
  });

  describe('get()', () => {
    it('should get a value', async () => {
      const value = await memoryStore.get('key1');
      expect(value).to.equal(1);
    });

    it('should return undefined for a non-existing key', async () => {
      const value = await memoryStore.get('non-existing');
      expect(value).to.be.undefined;
    });
  });

  describe('has()', () => {
    it('should check the presence of an entry by key correctly', async () => {
      const hasKey = await memoryStore.has('key1');
      expect(hasKey).to.be.true;
    });

    it('should return false when checking the presence of a non-existing key', async () => {
      const hasKey = await memoryStore.has('non-existing');
      expect(hasKey).to.be.false;
    });
  });

  describe('list()', () => {
    it('should list all values in the store correctly', async () => {
      await memoryStore.set('key2', 2);
      const values = await memoryStore.list();
      expect(values).to.have.members([1, 2]);
    });
  });

  describe('set()', () => {
    it('should set a value', async () => {
      await memoryStore.set('key99', 99);
      const value = await memoryStore.get('key99');
      expect(value).to.equal(99);
    });
  });
});