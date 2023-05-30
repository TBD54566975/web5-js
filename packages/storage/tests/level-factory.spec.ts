import { expect } from 'chai';

import { MemoryLevel } from 'memory-level';
import { TestAbstractLevel } from './test-utils/test-abstract-level.js';
import { Level } from 'level';

let testAbstractLevel: TestAbstractLevel<MemoryLevel>;
let testLevel: TestAbstractLevel<Level>;

describe('level-factory', () => {
  before(async () => {
    testLevel = TestAbstractLevel.createLevelStorage();
    testAbstractLevel = TestAbstractLevel.createAbstractStorage();

    await testLevel.clearStorage();
    await testAbstractLevel.clearStorage();
  });

  beforeEach(async () => {
    await testLevel.clearStorage();
    await testAbstractLevel.clearStorage();
  });

  after(async () => {
    await testLevel.clearStorage();
    await testAbstractLevel.clearStorage();
  });

  describe('level storage', async () => {
    it('inits', () => {
      expect(testLevel.storage?.appStorage).to.be.an.instanceOf(Level);
      expect(testLevel.storage?.did).to.be.an.instanceOf(Level);
      expect(testLevel.storage?.profileIndex).to.be.an.instanceOf(Level);
      expect(testLevel.storage?.profileStore).to.be.an.instanceOf(Level);
      expect(testLevel.storage?.syncApi).to.be.an.instanceOf(Level);
    });

    it('reads / writes', async () => {
      const db = testLevel.storage?.appStorage;
      await db.put('key', 'value');
      const key = await db.get('key');
      expect(key).to.equal('value');
    }).timeout(10000);
  });


  describe('abstract-level storage', async () => {
    it('inits', () => {
      expect(testAbstractLevel.storage?.appStorage).to.be.an.instanceOf(MemoryLevel);
      expect(testAbstractLevel.storage?.did).to.be.an.instanceOf(MemoryLevel);
      expect(testAbstractLevel.storage?.profileIndex).to.be.an.instanceOf(MemoryLevel);
      expect(testAbstractLevel.storage?.profileStore).to.be.an.instanceOf(MemoryLevel);
      expect(testAbstractLevel.storage?.syncApi).to.be.an.instanceOf(MemoryLevel);
    });

    it('reads / writes', async () => {
      const db = testAbstractLevel.storage?.appStorage;
      await db.put('key', 'value');
      const key = await db.get('key');
      expect(key).to.equal('value');
    });
  });
});