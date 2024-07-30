import sinon from 'sinon';

import { expect } from 'chai';

import { DwnServerInfoCache, ServerInfo } from '../../../src/prototyping/clients/server-info-types.js';
import { DwnServerInfoCacheMemory } from '../../../src/prototyping/clients/dwn-server-info-cache-memory.js';

describe('DwnServerInfoCache', () => {

  describe(`DwnServerInfoCacheMemory`, () => {
    let cache: DwnServerInfoCache;

    const exampleInfo:ServerInfo = {
      maxFileSize              : 100,
      webSocketSupport         : true,
      registrationRequirements : []
    };

    after(() => {
      sinon.restore();
    });

    beforeEach(() => {
      cache = new DwnServerInfoCacheMemory();
    });

    afterEach(async () => {
      await cache.clear();
      await cache.close();
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

    it('returns undefined after ttl', async function () {
      // NOTE: tried very hard to use sinon.useFakeTimers() but couldn't get it to work with `TtlCache` implementation in `DwnServerInfoCacheMemory`.
      // I sanity added a setInterval here, and it obeys the fake time ticks and its callback is fired, but the `TtlCache` just ignores the fake timer ticks.
      cache = new DwnServerInfoCacheMemory({ ttl: '100ms'});

      const key = 'some-key1';
      await cache.set(key, { ...exampleInfo });

      const result = await cache.get(key);
      expect(result!.webSocketSupport).to.deep.equal(true);
      expect(result).to.deep.equal(exampleInfo);

      // sleep for 100ms
      await new Promise((resolve) => setTimeout(resolve, 100));

      const resultAfter = await cache.get(key);
      expect(resultAfter).to.be.undefined;
    });
  });
});