import * as utils from '../src/utils.js';
import { expect } from 'chai';
import sinon from 'sinon';

describe('Utils Tests', () => {
  describe('dataToBytes', () => {
    it('sets dataFormat to text/plain if string is provided', () => {
      const { dataFormat } = utils.dataToBytes('hello');

      expect(dataFormat).to.equal('text/plain');
    });

    it('sets dataFormat to application/json if object is provided', () => {
      const { dataFormat } = utils.dataToBytes({ hello: 'world' });

      expect(dataFormat).to.equal('application/json');
    });

    it('sets dataFormat to `application/octet-stream` if data is not string or object and dataFormat not specified', () => {
      const { dataFormat } = utils.dataToBytes(new Uint8Array([10, 11, 12]));

      expect(dataFormat).to.equal('application/octet-stream');
    });

    it('does not change dataFormat if specified', () => {
      const { dataFormat } = utils.dataToBytes(new Uint8Array([10, 11, 12]), 'image/png');

      expect(dataFormat).to.equal('image/png');
    });
  });

  describe('memoryCache', () => {
    let clock = sinon.useFakeTimers();

    it('should return `undefined` when value expires after default TTL', () => {
      const cache = new utils.memoryCache(); // 1 hour default time-to-live
  
      cache.set('key', 'aValue');
      let valueInCache = cache.get('key');
      expect(valueInCache).to.equal('aValue');
  
      clock.tick(60*60*1000); // Time travel 1 hour

      valueInCache = cache.get('key');
      expect(valueInCache).to.be.undefined;
    });

    it('should return `undefined` when value expires after custom TTL', () => {
      const cache = new utils.memoryCache({ ttl: 10 }); // 10 millisecond time-to-live
  
      cache.set('key', 'aValue');
      let valueInCache = cache.get('key');
      expect(valueInCache).to.equal('aValue');
  
      clock.tick(10); // Time travel 10 milliseconds

      valueInCache = cache.get('key');
      expect(valueInCache).to.be.undefined;
    });

    it('should set a per-entry custom TTL when specified', () => {
      const cache = new utils.memoryCache(); // 1 hour default time-to-live
  
      cache.set('key1', 'aValue');
      let valueInCache = cache.get('key1');
      expect(valueInCache).to.equal('aValue');
      
      cache.set('key2', 'bValue', 10);
      valueInCache = cache.get('key2');
      expect(valueInCache).to.equal('bValue');
      
      clock.tick(10); // Time travel 10 milliseconds
      
      valueInCache = cache.get('key1');
      expect(valueInCache).to.equal('aValue');
      valueInCache = cache.get('key2');
      expect(valueInCache).to.be.undefined;
    });

    it('should not expire entries if timeout is `Infinity`', () => {
      const cache = new utils.memoryCache(); // 1 hour default time-to-live
  
      cache.set('key1', 'aValue');
      let valueInCache = cache.get('key1');
      expect(valueInCache).to.equal('aValue');
      
      cache.set('key2', 'bValue', Infinity);
      valueInCache = cache.get('key2');
      expect(valueInCache).to.equal('bValue');
      
      clock.tick(60*60*1000); // Time travel 1 hour
      
      valueInCache = cache.get('key1');
      expect(valueInCache).to.be.undefined;
      valueInCache = cache.get('key2');
      expect(valueInCache).to.equal('bValue');

      clock.tick(2147483647); // Time travel 23.85 days
      valueInCache = cache.get('key2');
      expect(valueInCache).to.equal('bValue');
    });

    it('should delete specified entry', () => {
      const cache = new utils.memoryCache();

      cache.set('key1', 'aValue');
      cache.set('key2', 'aValue');
      cache.set('key3', 'aValue');

      cache.del('key1');

      let valueInCache = cache.get('key1');
      expect(valueInCache).to.be.undefined;
      valueInCache = cache.get('key2');
      expect(valueInCache).to.equal('aValue');
    });

    it('should delete all entries after `reset()`', () => {
      const cache = new utils.memoryCache();

      cache.set('key1', 'aValue');
      cache.set('key2', 'aValue');
      cache.set('key3', 'aValue');

      cache.reset();

      let valueInCache = cache.get('key1');
      expect(valueInCache).to.be.undefined;
      valueInCache = cache.get('key2');
      expect(valueInCache).to.be.undefined;
      valueInCache = cache.get('key3');
      expect(valueInCache).to.be.undefined;
    });
  });
});