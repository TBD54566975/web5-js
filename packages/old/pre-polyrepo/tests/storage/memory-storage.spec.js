import { expect } from 'chai';
import sinon from 'sinon';

import { MemoryStorage } from '../../src/storage/memory-storage.js';

describe('MemoryStorage', async () => {
  before(function () {
    this.clock = sinon.useFakeTimers();
  });

  after(function () {
    this.clock.restore();
  });

  it('should set a per-entry custom TTL when specified', async function () {
    const storage = new MemoryStorage();

    await storage.set('key1', 'aValue');
    let valueInCache = await storage.get('key1');
    expect(valueInCache).to.equal('aValue');

    await storage.set('key2', 'bValue', { timeout: 10 });
    valueInCache = await storage.get('key2');
    expect(valueInCache).to.equal('bValue');

    this.clock.tick(10); // Time travel 10 milliseconds

    valueInCache = await storage.get('key1');
    expect(valueInCache).to.equal('aValue');
    valueInCache = await storage.get('key2');
    expect(valueInCache).to.be.undefined;
  });

  it('should not expire entries if timeout is `Infinity`', async function () {
    const storage = new MemoryStorage();

    await storage.set('key1', 'aValue');
    let valueInCache = await storage.get('key1');
    expect(valueInCache).to.equal('aValue');

    await storage.set('key2', 'bValue', { timeout: Infinity });
    valueInCache = await storage.get('key2');
    expect(valueInCache).to.equal('bValue');

    this.clock.tick(1000 * 60 * 60); // Time travel 1 hour

    valueInCache = await storage.get('key1');
    expect(valueInCache).to.equal('aValue');
    valueInCache = await storage.get('key2');
    expect(valueInCache).to.equal('bValue');

    this.clock.tick(2147483647); // Time travel 23.85 days

    valueInCache = await storage.get('key1');
    expect(valueInCache).to.equal('aValue');
    valueInCache = await storage.get('key2');
    expect(valueInCache).to.equal('bValue');
  });

  it('should delete specified entry', async () => {
    const storage = new MemoryStorage();

    await storage.set('key1', 'aValue');
    await storage.set('key2', 'aValue');
    await storage.set('key3', 'aValue');

    await storage.delete('key1');

    let valueInCache = await storage.get('key1');
    expect(valueInCache).to.be.undefined;
    valueInCache = await storage.get('key2');
    expect(valueInCache).to.equal('aValue');
  });

  it('should delete all entries after `clear()`', async () => {
    const storage = new MemoryStorage();

    await storage.set('key1', 'aValue');
    await storage.set('key2', 'aValue');
    await storage.set('key3', 'aValue');

    await storage.clear();

    let valueInCache = await storage.get('key1');
    expect(valueInCache).to.be.undefined;
    valueInCache = await storage.get('key2');
    expect(valueInCache).to.be.undefined;
    valueInCache = await storage.get('key3');
    expect(valueInCache).to.be.undefined;
  });
});
