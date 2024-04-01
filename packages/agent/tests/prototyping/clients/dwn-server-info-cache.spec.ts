import sinon from 'sinon';

import { expect } from 'chai';

import { DwnServerInfoCache, ServerInfo } from '../../../src/prototyping/clients/web5-rpc-types.js';
import { DwnServerInfoCacheMemory } from '../../../src/prototyping/clients/dwn-server-info-cache-memory.js';
import { DwnServerInfoCacheLevel } from '../../../src/prototyping/clients/dwn-server-info-cache-level.js';
import { DwnServerInfoCacheNoOp } from '../../../src/prototyping/clients/dwn-server-info-cache-no-op.js';
import { AbstractLevel } from 'abstract-level';

describe('DwnServerInfoCache', () => {

  const cacheImplementations = [ DwnServerInfoCacheMemory, DwnServerInfoCacheLevel ];

  // basic cache tests for all caching interface implementations
  for (const Cache of cacheImplementations) {
    describe(`interface ${Cache.name}`, () => {
      let cache: DwnServerInfoCache;
      let clock: sinon.SinonFakeTimers;
      const exampleInfo:ServerInfo = {
        maxFileSize              : 100,
        webSocketSupport         : true,
        registrationRequirements : []
      };

      after(() => {
        sinon.restore();
      });

      beforeEach(() => {
        clock = sinon.useFakeTimers();
        cache = new Cache();
      });

      afterEach(async () => {
        await cache.clear();
        await cache.close();
        clock.restore();
      });

      it('sets server info in cache', async () => {
        const key1 = 'some-key1';
        const key2 = 'some-key2';
        await cache.set(key1, { ...exampleInfo });
        await cache.set(key2, { ...exampleInfo, webSocketSupport: false }); // set to false

        const result1 = await cache.get(key1);
        expect(result1!.webSocketSupport).to.deep.equal(true);
        expect(result1).to.deep.equal(exampleInfo);

        const result2 = await cache.get(key2);
        expect(result2!.webSocketSupport).to.deep.equal(false);
      });

      it('deletes from cache', async () => {
        const key1 = 'some-key1';
        const key2 = 'some-key2';
        await cache.set(key1, { ...exampleInfo });
        await cache.set(key2, { ...exampleInfo, webSocketSupport: false }); // set to false

        const result1 = await cache.get(key1);
        expect(result1!.webSocketSupport).to.deep.equal(true);
        expect(result1).to.deep.equal(exampleInfo);

        const result2 = await cache.get(key2);
        expect(result2!.webSocketSupport).to.deep.equal(false);

        // delete one of the keys
        await cache.delete(key1);

        // check results after delete
        const resultAfterDelete = await cache.get(key1);
        expect(resultAfterDelete).to.equal(undefined);

        // key 2 still exists
        const result2AfterDelete = await cache.get(key2);
        expect(result2AfterDelete!.webSocketSupport).to.equal(false);
      });

      it('clears cache', async () => {
        const key1 = 'some-key1';
        const key2 = 'some-key2';
        await cache.set(key1, { ...exampleInfo });
        await cache.set(key2, { ...exampleInfo, webSocketSupport: false }); // set to false

        const result1 = await cache.get(key1);
        expect(result1!.webSocketSupport).to.deep.equal(true);
        expect(result1).to.deep.equal(exampleInfo);

        const result2 = await cache.get(key2);
        expect(result2!.webSocketSupport).to.deep.equal(false);

        // delete one of the keys
        await cache.clear();

        // check results after delete
        const resultAfterDelete = await cache.get(key1);
        expect(resultAfterDelete).to.equal(undefined);
        const result2AfterDelete = await cache.get(key2);
        expect(result2AfterDelete).to.equal(undefined);
      });

      it('returns undefined after ttl', async () => {
        const key = 'some-key1';
        await cache.set(key, { ...exampleInfo });

        const result = await cache.get(key);
        expect(result!.webSocketSupport).to.deep.equal(true);
        expect(result).to.deep.equal(exampleInfo);

        // wait until 15m default ttl is up
        await clock.tickAsync('15:01');

        const resultAfter = await cache.get(key);
        expect(resultAfter).to.be.undefined;
      });
    });
  }

  describe('DwnServerInfoCacheLevel', () => {
    it('should throw on unknown level error', async () => {
      const mockLevel = sinon.createStubInstance(AbstractLevel);
      mockLevel.get.throws('test error');
      const cache = new DwnServerInfoCacheLevel({ db: mockLevel });

      try {
        await cache.get('key');
        expect.fail('Expected an error to be thrown');
      } catch(error: any) {
        expect(error.message).to.contain('test error');
      }
    });
  });

  describe('DwnServerInfoCacheNoOp', () => {
    // for test coverage
    const cache = new DwnServerInfoCacheNoOp();

    it('sets', async () => {
      await cache.set('test', {
        webSocketSupport         : true,
        maxFileSize              : 100,
        registrationRequirements : []
      });
    });
    it('gets', async () => {
      await cache.get('test');
    });
    it('delete', async () => {
      await cache.delete('test');
    });
    it('clear', async () => {
      await cache.clear();
    });
  });
});