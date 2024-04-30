import { expect } from 'chai';

import { TtlCache } from '../src/cache.js';

describe('TTLCache', function () {
  it('should store and retrieve string values', function () {
    const cache = new TtlCache({ max: 10000, ttl: 1000 });
    cache.set('key1', 'value1');

    expect(cache.has('key1')).to.be.true;
    expect(cache.get('key1')).to.equal('value1');

    expect(cache.has('key1')).to.be.true;
    expect(cache.get('key1')).to.equal('value1');
  });

  it('should store and retrieve object values', function () {
    const cache = new TtlCache({ max: 10000, ttl: 1000 });
    const value = { prop: 'value' };
    cache.set('key2', value);

    expect(cache.has('key2')).to.be.true;
    expect(cache.get('key2')).to.deep.equal(value);

    expect(cache.has('key2')).to.be.true;
    expect(cache.get('key2')).to.deep.equal(value);
  });
});
