import { expect } from 'chai';
import { DidResolverCacheNoop } from '../../src/resolver/resolver-cache-noop.js';

describe('DidResolverCacheNoop', function() {
  it('returns null for get method', async function() {
    const result = await DidResolverCacheNoop.get('someKey');
    expect(result).to.be.null;
  });

  it('returns null for set method', async function() {
    const result = await DidResolverCacheNoop.set('someKey', {
      didResolutionMetadata : {},
      didDocument           : null,
      didDocumentMetadata   : {},
    });
    expect(result).to.be.null;
  });

  it('returns null for delete method', async function() {
    const result = await DidResolverCacheNoop.delete('someKey');
    expect(result).to.be.null;
  });

  it('returns null for clear method', async function() {
    const result = await DidResolverCacheNoop.clear();
    expect(result).to.be.null;
  });

  it('returns null for close method', async function() {
    const result = await DidResolverCacheNoop.close();
    expect(result).to.be.null;
  });
});
