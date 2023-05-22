import sinon from 'sinon';
import { expect } from 'chai';

import { DidResolutionCache } from '../src/did-resolution-cache.js';

describe('DidResolutionCache', () => {
  before(function () {
    this.clock = sinon.useFakeTimers();
  });

  after(function () {
    this.clock.restore();
  });

  it('uses a custom TTL when specified', async function () {
    // Instantiate DID resolution cache with custom TTL of 60 seconds.
    const cache = new DidResolutionCache({ ttl: '1m' });

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
    this.clock.tick(1000 * 61);

    // Confirm a cache miss.
    valueInCache = await cache.get(testDid);
    expect(valueInCache).to.be.undefined;

    await cache.close();
  });

  it('deletes specified entry', async function () {
    // Instantiate DID resolution cache with default TTL of 15 minutes.
    const cache = new DidResolutionCache();

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
    this.clock.tick(1000 * 60 * 14);

    // Confirm cache hit for entry that hasn't yet expired.
    valueInCache = await cache.get(testDid2);
    expect(valueInCache).to.deep.equal(testDidResolutionResult);

    await cache.close();
  });

  it('deletes all entries after clear()', async () => {
    // Instantiate DID resolution cache with default TTL of 15 minutes.
    const cache = new DidResolutionCache();

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