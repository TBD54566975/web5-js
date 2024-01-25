import * as sinon from 'sinon';
import { expect } from 'chai';

// import type { DidResolverCache } from '../../src/resolver/did-resolver.js';

import { DidJwk } from '../../src/methods/did-jwk.js';
import { DidResource } from '../../src/types/did-core.js';
import { isDidVerificationMethod } from '../../src/utils.js';
import { DidResolver } from '../../src/resolver/did-resolver.js';
// import { didResolverTestVectors } from './fixtures/test-vectors/did-resolver.js';

describe('DidResolver', () => {
  describe('resolve()', () => {
    let didResolver: DidResolver;

    beforeEach(() => {
      const didMethodApis = [DidJwk];
      didResolver = new DidResolver({ didResolvers: didMethodApis });
    });

    // it('passes test vectors', async () => {
    //   for (const vector of didResolverTestVectors) {
    //     const didResolutionResult = await didResolver.resolve(vector.input);
    //     expect(didResolutionResult.didDocument).to.deep.equal(vector.output);
    //   }
    // });

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

    // describe('with LevelDB cache', () => {
    //   let cache: DidResolverCache;

    //   before(() => {
    //     cache = new DidResolverCacheLevel();
    //   });

    //   beforeEach(async () => {
    //     await cache.clear();
    //     const didMethodApis = [DidKeyMethod];
    //     didResolver = new DidResolver({ cache, didResolvers: didMethodApis });
    //   });

    //   after(async () => {
    //     await cache.clear();
    //   });

    //   it('should cache miss for the first resolution attempt', async () => {
    //     const did = 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D';
    //     // Create a Sinon spy on the get method of the cache
    //     const cacheGetSpy = sinon.spy(cache, 'get');

    //     await didResolver.resolve(did);

    //     // Verify that cache.get() was called.
    //     expect(cacheGetSpy.called).to.be.true;

    //     // Verify the cache returned undefined.
    //     const getCacheResult = await cacheGetSpy.returnValues[0];
    //     expect(getCacheResult).to.be.undefined;

    //     cacheGetSpy.restore();
    //   });

    //   it('should cache hit for the second resolution attempt', async () => {
    //     const did = 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D';
    //     // Create a Sinon spy on the get method of the cache
    //     const cacheGetSpy = sinon.spy(cache, 'get');
    //     const cacheSetSpy = sinon.spy(cache, 'set');

    //     await didResolver.resolve(did);

    //     // Verify there was a cache miss.
    //     expect(cacheGetSpy.calledOnce).to.be.true;
    //     expect(cacheSetSpy.calledOnce).to.be.true;

    //     // Verify the cache returned undefined.
    //     let getCacheResult = await cacheGetSpy.returnValues[0];
    //     expect(getCacheResult).to.be.undefined;

    //     // Resolve the same DID again.
    //     await didResolver.resolve(did);

    //     // Verify that cache.get() was called.
    //     expect(cacheGetSpy.called).to.be.true;
    //     expect(cacheGetSpy.calledTwice).to.be.true;

    //     // Verify there was a cache hit this time.
    //     getCacheResult = await cacheGetSpy.returnValues[1];
    //     expect(getCacheResult).to.not.be.undefined;
    //     expect(getCacheResult).to.have.property('@context');
    //     expect(getCacheResult).to.have.property('didDocument');
    //     expect(getCacheResult).to.have.property('didDocumentMetadata');
    //     expect(getCacheResult).to.have.property('didResolutionMetadata');

    //     cacheGetSpy.restore();
    //   });
    // });
  });

  describe('dereference()', () => {
    let didResolver: DidResolver;

    beforeEach(() => {
      const didMethodApis = [DidJwk];
      didResolver = new DidResolver({ didResolvers: didMethodApis });
    });

    it('returns a result with contentStream set to null and dereferenceMetadata.error set if resolution fails', async () => {
      const result = await didResolver.dereference('abcd123;;;');
      expect(result.contentStream).to.be.null;
      expect(result.dereferencingMetadata.error).to.exist;
      expect(result.dereferencingMetadata.error).to.equal('invalidDidUrl');
    });

    it('returns a DID verification method resource as the value of contentStream if found', async () => {
      const did = await DidJwk.create();

      const result = await didResolver.dereference(did.didDocument!.verificationMethod![0].id);
      expect(result.contentStream).to.be.not.be.null;
      expect(result.dereferencingMetadata.error).to.not.exist;

      const didResource = result.contentStream;
      expect(isDidVerificationMethod(didResource)).to.be.true;
    });

    it('returns a DID service resource as the value of contentStream if found', async () => {
      // Create an instance of DidResolver
      const resolver = new DidResolver({ didResolvers: [] });

      // Stub the resolve method
      const mockDidResolutionResult = {
        '@context'  : 'https://w3id.org/did-resolution/v1',
        didDocument : {
          id      : 'did:example:123456789abcdefghi',
          service : [
            {
              id              : '#dwn',
              type            : 'DecentralizedWebNode',
              serviceEndpoint : {
                nodes: [ 'https://dwn.tbddev.test/dwn0' ]
              }
            }
          ],
        },
        didDocumentMetadata   : {},
        didResolutionMetadata : {}
      };

      const resolveStub = sinon.stub(resolver, 'resolve').resolves(mockDidResolutionResult);

      const testDidUrl = 'did:example:123456789abcdefghi#dwn';
      const result = await resolver.dereference(testDidUrl);

      expect(resolveStub.calledOnce).to.be.true;
      expect(result.contentStream).to.deep.equal(mockDidResolutionResult.didDocument.service[0]);

      // Restore the original resolve method
      resolveStub.restore();
    });

    it('returns the entire DID document as the value of contentStream if the DID URL contains no fragment', async () => {
      const did = await DidJwk.create();

      const result = await didResolver.dereference(did.uri);
      expect(result.contentStream).to.be.not.be.null;
      expect(result.dereferencingMetadata.error).to.not.exist;

      const didResource = result.contentStream as DidResource;
      if (!(!isDidVerificationMethod(didResource) && !isDidVerificationMethod(didResource))) throw new Error('Expected DidResource to be a DidDocument');
      expect(didResource['@context']).to.exist;
      expect(didResource['@context']).to.include('https://www.w3.org/ns/did/v1');
    });

    it('returns contentStream set to null and dereferenceMetadata.error set to notFound if resource is not found', async () => {
      const did = await DidJwk.create();

      const result = await didResolver.dereference(`${did.uri}#1`);
      expect(result.contentStream).to.be.null;
      expect(result.dereferencingMetadata.error).to.exist;
      expect(result.dereferencingMetadata.error).to.equal('notFound');
    });
  });
});