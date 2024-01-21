import sinon from 'sinon';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { DidResolverCacheLevel } from '../src/resolver-cache-level.js';

chai.use(chaiAsPromised);

describe('DidResolverCacheLevel', () => {
  let cache: DidResolverCacheLevel;
  let cacheStoreLocation = '__TESTDATA__/DID_RESOLVERCACHE';
  let clock: sinon.SinonFakeTimers;

  before(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(async () => {
    await cache.close();
  });

  after(() => {
    clock.restore();
  });

  describe('constructor', () => {
    it('uses default options if none are specified', async () => {
      cache = new DidResolverCacheLevel();
      expect(cache).to.exist;
    });

    it('uses a 15 minute TTL, by default', async () => {
      cache = new DidResolverCacheLevel({ location: cacheStoreLocation });

      const testDid = 'did:example:alice';

      const testDidResolutionResult = {
        didResolutionMetadata : {},
        didDocument           : { id: 'abc123' },
        didDocumentMetadata   : {}
      };

      // Write an entry into the cache.
      await cache.set(testDid, testDidResolutionResult);

      // Confirm a cache hit.
      let valueInCache = await cache.get(testDid);
      expect(valueInCache).to.deep.equal(testDidResolutionResult);

      // Time travel 16 minutes.
      clock.tick(1000 * 60 * 16);

      // Confirm a cache miss.
      valueInCache = await cache.get(testDid);
      expect(valueInCache).to.be.undefined;
    });

    it('uses a custom TTL, when specified', async () => {
      // Instantiate DID resolution cache with custom TTL of 60 seconds.
      cache = new DidResolverCacheLevel({ ttl: '1m', location: cacheStoreLocation });

      const testDid = 'did:example:alice';

      const testDidResolutionResult = {
        didResolutionMetadata : {},
        didDocument           : { id: 'abc123' },
        didDocumentMetadata   : {}
      };

      // Write an entry into the cache.
      await cache.set(testDid, testDidResolutionResult);

      // Confirm a cache hit.
      let valueInCache = await cache.get(testDid);
      expect(valueInCache).to.deep.equal(testDidResolutionResult);

      // Time travel 61 seconds.
      clock.tick(1000 * 61);

      // Confirm a cache miss.
      valueInCache = await cache.get(testDid);
      expect(valueInCache).to.be.undefined;
    });
  });

  describe('clear()', () => {
    it('removes all entries from cache', async () => {
      // Instantiate DID resolution cache with default TTL of 15 minutes.
      cache = new DidResolverCacheLevel({ location: cacheStoreLocation });

      const testDid1 = 'did:example:alice';
      const testDid2 = 'did:example:bob';

      const testDidResolutionResult = {
        didResolutionMetadata : {},
        didDocument           : { id: 'abc123' },
        didDocumentMetadata   : {}
      };

      await cache.set(testDid1, testDidResolutionResult);
      await cache.set(testDid2, testDidResolutionResult);

      await cache.clear();

      let valueInCache = await cache.get(testDid1);
      expect(valueInCache).to.be.undefined;
      valueInCache = await cache.get(testDid2);
      expect(valueInCache).to.be.undefined;
    });
  });

  describe('delete()', () => {
    it('removes specified entry from cache', async () => {
    // Instantiate DID resolution cache with default TTL of 15 minutes.
      cache = new DidResolverCacheLevel({ location: cacheStoreLocation });

      const testDid1 = 'did:example:alice';
      const testDid2 = 'did:example:bob';

      const testDidResolutionResult = {
        didResolutionMetadata : {},
        didDocument           : { id: 'abc123' },
        didDocumentMetadata   : {}
      };

      await cache.set(testDid1, testDidResolutionResult);
      await cache.set(testDid2, testDidResolutionResult);

      await cache.delete(testDid1);

      // Confirm cache miss for deleted entry.
      let valueInCache = await cache.get(testDid1);
      expect(valueInCache).to.be.undefined;

      // Time travel 14 minutes.
      clock.tick(1000 * 60 * 14);

      // Confirm cache hit for entry that hasn't yet expired.
      valueInCache = await cache.get(testDid2);
      expect(valueInCache).to.deep.equal(testDidResolutionResult);
    });
  });

  describe('get()', () => {
    it('does not throw an error given DID that is not in the cache', async () => {
      // Instantiate DID resolution cache with default TTL of 15 minutes.
      cache = new DidResolverCacheLevel({ location: cacheStoreLocation });

      const valueInCache = await cache.get('did:method:not-present');
      expect(valueInCache).to.be.undefined;
    });

    it('throws an error if the given DID is null or undefined', async () => {
      // Instantiate DID resolution cache with default TTL of 15 minutes.
      cache = new DidResolverCacheLevel({ location: cacheStoreLocation });

      await expect(
        cache.get(null)
      ).to.eventually.be.rejectedWith(Error, 'Key cannot be null or undefine');

      await expect(
        cache.get(undefined)
      ).to.eventually.be.rejectedWith(Error, 'Key cannot be null or undefine');
    });
  });
});