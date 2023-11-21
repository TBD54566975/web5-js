import sinon from 'sinon';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { DidResolverCacheMemory } from '../src/resolver-cache-memory.js';

chai.use(chaiAsPromised);

describe('DidResolverCacheMemory', () => {
  let cache: DidResolverCacheMemory;
  let clock: sinon.SinonFakeTimers;

  before(() => {
    clock = sinon.useFakeTimers();
  });

  beforeEach(() => {
    cache = new DidResolverCacheMemory({ ttl: '15m' });
  });

  afterEach(() => {
    cache.close();
  });

  after(() => {
    clock.restore();
  });

  describe('get / set', () => {
    it('should return undefined for non-existent keys', async () => {
      const result = await cache.get('nonexistent');
      expect(result).to.be.undefined;
    });

    it('should return the cached value for existing keys', async () => {
      const testDidResolutionResult = {
        didResolutionMetadata : {},
        didDocument           : { id: 'abc123' },
        didDocumentMetadata   : {}
      };

      const testDid = 'did:example:alice';
      await cache.set(testDid, testDidResolutionResult);
      const result = await cache.get(testDid);
      expect(result).to.deep.equal(testDidResolutionResult);
    });

    it('should return undefined for expired keys', async () => {
      const testDidResolutionResult = {
        didResolutionMetadata : {},
        didDocument           : { id: 'abc123' },
        didDocumentMetadata   : {}
      };
      const testDid = 'did:garfield:hello';
      await cache.set(testDid, testDidResolutionResult);
      clock.tick(16 * 60 * 1000); // Advance time to past the TTL
      const result = await cache.get(testDid);
      expect(result).to.be.undefined;
    });
  });

  describe('delete', () => {
    it('should remove a stored value', async () => {
      const testDidResolutionResult = {
        didResolutionMetadata : {},
        didDocument           : { id: 'abc123' },
        didDocumentMetadata   : {}
      };
      const testDid = 'did:example:alice';
      await cache.set(testDid, testDidResolutionResult);
      await cache.delete(testDid);
      const result = await cache.get(testDid);
      expect(result).to.be.undefined;
    });
  });

  describe('clear', () => {
    it('should clear all stored values', async () => {
      const testDid1 = 'did:example:alice';
      const testDid2 = 'did:example:alice';

      await cache.set(testDid1, {
        didResolutionMetadata : {},
        didDocument           : { id: 'abc123' },
        didDocumentMetadata   : {}
      });
      await cache.set(testDid2, {
        didResolutionMetadata : {},
        didDocument           : { id: 'garfield' },
        didDocumentMetadata   : {}
      });
      await cache.clear();
      expect(await cache.get(testDid1)).to.be.undefined;
      expect(await cache.get(testDid2)).to.be.undefined;
    });
  });
});
