var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import sinon from 'sinon';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { DidResolverCacheLevel } from '../src/resolver-cache-level.js';
chai.use(chaiAsPromised);
describe('DidResolverCacheLevel', () => {
    let cache;
    let cacheStoreLocation = '__TESTDATA__/DID_RESOLVERCACHE';
    let clock;
    before(() => {
        clock = sinon.useFakeTimers();
    });
    afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
        yield cache.close();
    }));
    after(() => {
        clock.restore();
    });
    describe('constructor', () => {
        it('uses default options if none are specified', () => __awaiter(void 0, void 0, void 0, function* () {
            cache = new DidResolverCacheLevel();
            expect(cache).to.exist;
        }));
        it('uses a 15 minute TTL, by default', () => __awaiter(void 0, void 0, void 0, function* () {
            cache = new DidResolverCacheLevel({ location: cacheStoreLocation });
            const testDid = 'did:example:alice';
            const testDidResolutionResult = {
                didResolutionMetadata: {},
                didDocument: { id: 'abc123' },
                didDocumentMetadata: {}
            };
            // Write an entry into the cache.
            yield cache.set(testDid, testDidResolutionResult);
            // Confirm a cache hit.
            let valueInCache = yield cache.get(testDid);
            expect(valueInCache).to.deep.equal(testDidResolutionResult);
            // Time travel 16 minutes.
            clock.tick(1000 * 60 * 16);
            // Confirm a cache miss.
            valueInCache = yield cache.get(testDid);
            expect(valueInCache).to.be.undefined;
        }));
        it('uses a custom TTL, when specified', () => __awaiter(void 0, void 0, void 0, function* () {
            // Instantiate DID resolution cache with custom TTL of 60 seconds.
            cache = new DidResolverCacheLevel({ ttl: '1m', location: cacheStoreLocation });
            const testDid = 'did:example:alice';
            const testDidResolutionResult = {
                didResolutionMetadata: {},
                didDocument: { id: 'abc123' },
                didDocumentMetadata: {}
            };
            // Write an entry into the cache.
            yield cache.set(testDid, testDidResolutionResult);
            // Confirm a cache hit.
            let valueInCache = yield cache.get(testDid);
            expect(valueInCache).to.deep.equal(testDidResolutionResult);
            // Time travel 61 seconds.
            clock.tick(1000 * 61);
            // Confirm a cache miss.
            valueInCache = yield cache.get(testDid);
            expect(valueInCache).to.be.undefined;
        }));
    });
    describe('clear()', () => {
        it('removes all entries from cache', () => __awaiter(void 0, void 0, void 0, function* () {
            // Instantiate DID resolution cache with default TTL of 15 minutes.
            cache = new DidResolverCacheLevel({ location: cacheStoreLocation });
            const testDid1 = 'did:example:alice';
            const testDid2 = 'did:example:bob';
            const testDidResolutionResult = {
                didResolutionMetadata: {},
                didDocument: { id: 'abc123' },
                didDocumentMetadata: {}
            };
            yield cache.set(testDid1, testDidResolutionResult);
            yield cache.set(testDid2, testDidResolutionResult);
            yield cache.clear();
            let valueInCache = yield cache.get(testDid1);
            expect(valueInCache).to.be.undefined;
            valueInCache = yield cache.get(testDid2);
            expect(valueInCache).to.be.undefined;
        }));
    });
    describe('delete()', () => {
        it('removes specified entry from cache', () => __awaiter(void 0, void 0, void 0, function* () {
            // Instantiate DID resolution cache with default TTL of 15 minutes.
            cache = new DidResolverCacheLevel({ location: cacheStoreLocation });
            const testDid1 = 'did:example:alice';
            const testDid2 = 'did:example:bob';
            const testDidResolutionResult = {
                didResolutionMetadata: {},
                didDocument: { id: 'abc123' },
                didDocumentMetadata: {}
            };
            yield cache.set(testDid1, testDidResolutionResult);
            yield cache.set(testDid2, testDidResolutionResult);
            yield cache.delete(testDid1);
            // Confirm cache miss for deleted entry.
            let valueInCache = yield cache.get(testDid1);
            expect(valueInCache).to.be.undefined;
            // Time travel 14 minutes.
            clock.tick(1000 * 60 * 14);
            // Confirm cache hit for entry that hasn't yet expired.
            valueInCache = yield cache.get(testDid2);
            expect(valueInCache).to.deep.equal(testDidResolutionResult);
        }));
    });
    describe('get()', () => {
        it('does not throw an error given DID that is not in the cache', () => __awaiter(void 0, void 0, void 0, function* () {
            // Instantiate DID resolution cache with default TTL of 15 minutes.
            cache = new DidResolverCacheLevel({ location: cacheStoreLocation });
            const valueInCache = yield cache.get('did:method:not-present');
            expect(valueInCache).to.be.undefined;
        }));
        it('throws an error if the given DID is null or undefined', () => __awaiter(void 0, void 0, void 0, function* () {
            // Instantiate DID resolution cache with default TTL of 15 minutes.
            cache = new DidResolverCacheLevel({ location: cacheStoreLocation });
            yield expect(cache.get(null)).to.eventually.be.rejectedWith(Error, 'Key cannot be null or undefine');
            yield expect(cache.get(undefined)).to.eventually.be.rejectedWith(Error, 'Key cannot be null or undefine');
        }));
    });
});
//# sourceMappingURL=resolver-cache-level.spec.js.map