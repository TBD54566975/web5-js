import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { SendCache } from '../src/send-cache.js';

chai.use(chaiAsPromised);

describe('SendCache', () => {
  it('sets and checks an item in the cache', async () => {
    // checks for 'id' and 'target', returns false because we have not set them yet
    expect(SendCache.check('id', 'target')).to.equal(false);

    // set 'id' and 'target, and then check
    SendCache.set('id', 'target');
    expect(SendCache.check('id', 'target')).to.equal(true);

    // check for 'id' with a different target
    expect(SendCache.check('id', 'target2')).to.equal(false);
  });

  it('purges the first item in the cache when the target cache is full (100 items)', async () => {
    const recordId = 'id';
    // set 100 items in the cache to the same id
    for (let i = 0; i < 100; i++) {
      SendCache.set(recordId, `target-${i}`);
    }

    // check that the first item is in the cache
    expect(SendCache.check(recordId, 'target-0')).to.equal(true);

    // set another item in the cache
    SendCache.set(recordId, 'target-new');

    // check that the first item is no longer in the cache but the one after it is as well as the new one.
    expect(SendCache.check(recordId, 'target-0')).to.equal(false);
    expect(SendCache.check(recordId, 'target-1')).to.equal(true);
    expect(SendCache.check(recordId, 'target-new')).to.equal(true);

    // add another item
    SendCache.set(recordId, 'target-new2');
    expect(SendCache.check(recordId, 'target-1')).to.equal(false);
    expect(SendCache.check(recordId, 'target-2')).to.equal(true);
    expect(SendCache.check(recordId, 'target-new2')).to.equal(true);
  });

  it('purges the first item in the cache when the record cache is full (100 items)', async () => {
    const target = 'target';
    // set 100 items in the cache to the same id
    for (let i = 0; i < 100; i++) {
      SendCache.set(`record-${i}`, target);
    }

    // check that the first item is in the cache
    expect(SendCache.check('record-0', target)).to.equal(true);

    // set another item in the cache
    SendCache.set('record-new', target);

    // check that the first item is no longer in the cache but the one after it is as well as the new one.
    expect(SendCache.check('record-0', target)).to.equal(false);
    expect(SendCache.check('record-1', target)).to.equal(true);
    expect(SendCache.check('record-new', target)).to.equal(true);

    // add another item
    SendCache.set('record-new2', target);
    expect(SendCache.check('record-1', target)).to.equal(false);
    expect(SendCache.check('record-2', target)).to.equal(true);
    expect(SendCache.check('record-new2', target)).to.equal(true);
  });
});