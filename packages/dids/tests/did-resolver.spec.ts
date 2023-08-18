import * as sinon from 'sinon';
import { expect } from 'chai';

import { DidKeyMethod } from '../src/did-key.js';
import { DidResolver } from '../src/did-resolver.js';
import { didResolverTestVectors } from './fixtures/test-vectors/did-resolver.js';
import { DidResolverCacheLevel } from '../src/resolver-cache-level.js';
import { DidResolverCache } from '../src/types.js';

describe('DidResolver', () => {
  describe('resolve()', () => {
    let didResolver: DidResolver;

    describe('with no-op cache', () => {
      beforeEach(() => {
        const didMethodApis = [DidKeyMethod];
        didResolver = new DidResolver({ didResolvers: didMethodApis });
      });

      it('returns an invalidDid error if the DID cannot be parsed', async () => {
        const didResolutionResult = await didResolver.resolve('unparseable:did');
        expect(didResolutionResult).to.exist;
        expect(didResolutionResult).to.have.property('@context');
        expect(didResolutionResult).to.have.property('didDocument');
        expect(didResolutionResult).to.have.property('didDocumentMetadata');
        expect(didResolutionResult).to.have.property('didResolutionMetadata');
        expect(didResolutionResult.didResolutionMetadata).to.have.property('error', 'invalidDid');
      });

      it('returns a methodNotSupported error if the DID method is not supported', async () => {
        const didResolutionResult = await didResolver.resolve('did:unknown:abc123');
        expect(didResolutionResult).to.exist;
        expect(didResolutionResult).to.have.property('@context');
        expect(didResolutionResult).to.have.property('didDocument');
        expect(didResolutionResult).to.have.property('didDocumentMetadata');
        expect(didResolutionResult).to.have.property('didResolutionMetadata');
        expect(didResolutionResult.didResolutionMetadata).to.have.property('error', 'methodNotSupported');
      });

      it('passes test vectors', async () => {
        for (const vector of didResolverTestVectors) {
          const didResolutionResult = await didResolver.resolve(vector.input);
          expect(didResolutionResult.didDocument).to.deep.equal(vector.output);
        }
      });
    });

    describe('with LevelDB cache', () => {
      let cache: DidResolverCache;

      before(() => {
        cache = new DidResolverCacheLevel();
      });

      beforeEach(async () => {
        await cache.clear();
        const didMethodApis = [DidKeyMethod];
        didResolver = new DidResolver({ cache, didResolvers: didMethodApis });
      });

      after(async () => {
        await cache.clear();
      });

      it('should cache miss for the first resolution attempt', async () => {
        const did = 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D';
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
        const did = 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D';
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
});