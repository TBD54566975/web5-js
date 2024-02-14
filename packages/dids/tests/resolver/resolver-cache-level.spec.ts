import sinon from 'sinon';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { Level } from 'level';
import { DidJwk } from '../../src/methods/did-jwk.js';
import { DidResolver, DidResolverCache } from '../../src/resolver/did-resolver.js';
import { DidResolverCacheLevel } from '../../src/resolver/resolver-cache-level.js';

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

    it('should initialize with a custom database', async function() {
      const db = new Level<string, string>('__TESTDATA__/customLocation');
      const cache = new DidResolverCacheLevel({ db });
      expect(cache).to.be.an.instanceof(DidResolverCacheLevel);
      await cache.close();
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
        // @ts-expect-error - Test invalid input.
        cache.get(null)
      ).to.eventually.be.rejectedWith(Error, 'Key cannot be null or undefine');

      await expect(
        // @ts-expect-error - Test invalid input.
        cache.get(undefined)
      ).to.eventually.be.rejectedWith(Error, 'Key cannot be null or undefine');
    });
  });

  describe('with DidResolver', () => {
    let cache: DidResolverCache;
    let didResolver: DidResolver;

    before(() => {
      cache = new DidResolverCacheLevel();
    });

    beforeEach(async () => {
      await cache.clear();
      const didMethodApis = [DidJwk];
      didResolver = new DidResolver({ cache, didResolvers: didMethodApis });
    });

    after(async () => {
      await cache.clear();
    });

    it('should cache miss for the first resolution attempt', async () => {
      const did = 'did:jwk:eyJrdHkiOiJPS1AiLCJjcnYiOiJFZDI1NTE5IiwieCI6IjNFQmFfRUxvczJhbHZMb2pxSVZjcmJLcGlyVlhqNmNqVkQ1djJWaHdMejgifQ';
      // Create a Sinon spy on the get method of the cache
      const cacheGetSpy = sinon.spy(cache, 'get');

      await didResolver.resolve(did);

      // Verify that cache.get() was called.
      expect(cacheGetSpy.called).to.be.true;

      // Verify the cache returned undefined.
      const getCacheResult = await cacheGetSpy.returnValues[0];
      expect(getCacheResult).to.be.undefined;

      cacheGetSpy.restore();
    });

    it('should cache hit for the second resolution attempt', async () => {
      const did = 'did:jwk:eyJrdHkiOiJPS1AiLCJjcnYiOiJFZDI1NTE5IiwieCI6IjNFQmFfRUxvczJhbHZMb2pxSVZjcmJLcGlyVlhqNmNqVkQ1djJWaHdMejgifQ';
      // Create a Sinon spy on the get method of the cache
      const cacheGetSpy = sinon.spy(cache, 'get');
      const cacheSetSpy = sinon.spy(cache, 'set');

      await didResolver.resolve(did);

      // Verify there was a cache miss.
      expect(cacheGetSpy.calledOnce).to.be.true;
      expect(cacheSetSpy.calledOnce).to.be.true;

      // Verify the cache returned undefined.
      let getCacheResult = await cacheGetSpy.returnValues[0];
      expect(getCacheResult).to.be.undefined;

      // Resolve the same DID again.
      await didResolver.resolve(did);

      // Verify that cache.get() was called.
      expect(cacheGetSpy.called).to.be.true;
      expect(cacheGetSpy.calledTwice).to.be.true;

      // Verify there was a cache hit this time.
      getCacheResult = await cacheGetSpy.returnValues[1];
      expect(getCacheResult).to.not.be.undefined;
      expect(getCacheResult).to.have.property('@context');
      expect(getCacheResult).to.have.property('didDocument');
      expect(getCacheResult).to.have.property('didDocumentMetadata');
      expect(getCacheResult).to.have.property('didResolutionMetadata');

      cacheGetSpy.restore();
    });
  });
});