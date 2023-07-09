import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

import { MemoryStore } from '../src/stores.js';

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
    it('should throw an error when trying to close the store', async () => {
      await expect(
        memoryStore.close()
      ).to.be.rejectedWith('MemoryStore does not support the close() method.');
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