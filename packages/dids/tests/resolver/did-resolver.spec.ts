import type { UnwrapPromise } from '@web5/common';

import { expect } from 'chai';
import * as sinon from 'sinon';

import { DidJwk } from '../../src/methods/did-jwk.js';
import { DidResource } from '../../src/types/did-core.js';
import { isDidVerificationMethod } from '../../src/utils.js';
import { DidResolver } from '../../src/resolver/did-resolver.js';
import DidJwkResolveTestVector from '../../../../web5-spec/test-vectors/did_jwk/resolve.json' assert { type: 'json' };

describe('DidResolver', () => {
  describe('resolve()', () => {
    let didResolver: DidResolver;

    beforeEach(() => {
      const didMethodApis = [DidJwk];
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

    it('pass DID JWK resolve test vectors', async () => {
        type TestVector = {
          description: string;
          input: Parameters<typeof DidJwk.resolve>[0];
          output: UnwrapPromise<ReturnType<typeof DidJwk.resolve>>;
          errors: boolean;
        };

        for (const vector of DidJwkResolveTestVector.vectors as unknown as TestVector[]) {
          const didResolutionResult = await DidJwk.resolve(vector.input);

          expect(didResolutionResult).to.deep.equal(vector.output);
        }
    });
  });

  describe('dereference()', () => {
    let didResolver: DidResolver;

    beforeEach(() => {
      const didMethodApis = [DidJwk];
      didResolver = new DidResolver({ didResolvers: didMethodApis });
    });

    it('returns a result with contentStream set to null and dereferenceMetadata.error set to invalidDidUrl, if the DID URL is invalid', async () => {
      const result = await didResolver.dereference('abcd123;;;');
      expect(result.contentStream).to.be.null;
      expect(result.dereferencingMetadata.error).to.exist;
      expect(result.dereferencingMetadata.error).to.equal('invalidDidUrl');
    });

    it('returns a result with contentStream set to null and dereferenceMetadata.error set to invalidDid, if the DID is invalid', async () => {
      const result = await didResolver.dereference('did:jwk:abcd123');
      expect(result.contentStream).to.be.null;
      expect(result.dereferencingMetadata.error).to.exist;
      expect(result.dereferencingMetadata.error).to.equal('invalidDid');
    });

    it('returns a DID verification method resource as the value of contentStream if found', async () => {
      const did = await DidJwk.create();

      const result = await didResolver.dereference(did.document!.verificationMethod![0].id);
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