var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as sinon from 'sinon';
import { expect } from 'chai';
import { DidKeyMethod } from '../src/did-key.js';
import { DidResolver } from '../src/did-resolver.js';
import { didResolverTestVectors } from './fixtures/test-vectors/did-resolver.js';
import { DidResolverCacheLevel } from '../src/resolver-cache-level.js';
import { isVerificationMethod } from '../src/utils.js';
describe('DidResolver', () => {
    describe('resolve()', () => {
        let didResolver;
        describe('with no-op cache', () => {
            beforeEach(() => {
                const didMethodApis = [DidKeyMethod];
                didResolver = new DidResolver({ didResolvers: didMethodApis });
            });
            it('returns an invalidDid error if the DID cannot be parsed', () => __awaiter(void 0, void 0, void 0, function* () {
                const didResolutionResult = yield didResolver.resolve('unparseable:did');
                expect(didResolutionResult).to.exist;
                expect(didResolutionResult).to.have.property('@context');
                expect(didResolutionResult).to.have.property('didDocument');
                expect(didResolutionResult).to.have.property('didDocumentMetadata');
                expect(didResolutionResult).to.have.property('didResolutionMetadata');
                expect(didResolutionResult.didResolutionMetadata).to.have.property('error', 'invalidDid');
            }));
            it('returns a methodNotSupported error if the DID method is not supported', () => __awaiter(void 0, void 0, void 0, function* () {
                const didResolutionResult = yield didResolver.resolve('did:unknown:abc123');
                expect(didResolutionResult).to.exist;
                expect(didResolutionResult).to.have.property('@context');
                expect(didResolutionResult).to.have.property('didDocument');
                expect(didResolutionResult).to.have.property('didDocumentMetadata');
                expect(didResolutionResult).to.have.property('didResolutionMetadata');
                expect(didResolutionResult.didResolutionMetadata).to.have.property('error', 'methodNotSupported');
            }));
            it('passes test vectors', () => __awaiter(void 0, void 0, void 0, function* () {
                for (const vector of didResolverTestVectors) {
                    const didResolutionResult = yield didResolver.resolve(vector.input);
                    expect(didResolutionResult.didDocument).to.deep.equal(vector.output);
                }
            }));
        });
        describe('with LevelDB cache', () => {
            let cache;
            before(() => {
                cache = new DidResolverCacheLevel();
            });
            beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
                yield cache.clear();
                const didMethodApis = [DidKeyMethod];
                didResolver = new DidResolver({ cache, didResolvers: didMethodApis });
            }));
            after(() => __awaiter(void 0, void 0, void 0, function* () {
                yield cache.clear();
            }));
            it('should cache miss for the first resolution attempt', () => __awaiter(void 0, void 0, void 0, function* () {
                const did = 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D';
                // Create a Sinon spy on the get method of the cache
                const cacheGetSpy = sinon.spy(cache, 'get');
                yield didResolver.resolve(did);
                // Verify that cache.get() was called.
                expect(cacheGetSpy.called).to.be.true;
                // Verify the cache returned undefined.
                const getCacheResult = yield cacheGetSpy.returnValues[0];
                expect(getCacheResult).to.be.undefined;
                cacheGetSpy.restore();
            }));
            it('should cache hit for the second resolution attempt', () => __awaiter(void 0, void 0, void 0, function* () {
                const did = 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D';
                // Create a Sinon spy on the get method of the cache
                const cacheGetSpy = sinon.spy(cache, 'get');
                const cacheSetSpy = sinon.spy(cache, 'set');
                yield didResolver.resolve(did);
                // Verify there was a cache miss.
                expect(cacheGetSpy.calledOnce).to.be.true;
                expect(cacheSetSpy.calledOnce).to.be.true;
                // Verify the cache returned undefined.
                let getCacheResult = yield cacheGetSpy.returnValues[0];
                expect(getCacheResult).to.be.undefined;
                // Resolve the same DID again.
                yield didResolver.resolve(did);
                // Verify that cache.get() was called.
                expect(cacheGetSpy.called).to.be.true;
                expect(cacheGetSpy.calledTwice).to.be.true;
                // Verify there was a cache hit this time.
                getCacheResult = yield cacheGetSpy.returnValues[1];
                expect(getCacheResult).to.not.be.undefined;
                expect(getCacheResult).to.have.property('@context');
                expect(getCacheResult).to.have.property('didDocument');
                expect(getCacheResult).to.have.property('didDocumentMetadata');
                expect(getCacheResult).to.have.property('didResolutionMetadata');
                cacheGetSpy.restore();
            }));
        });
    });
    describe('dereference()', () => {
        let didResolver;
        beforeEach(() => {
            const didMethodApis = [DidKeyMethod];
            didResolver = new DidResolver({ didResolvers: didMethodApis });
        });
        it('returns a result with contentStream set to null and dereferenceMetadata.error set if resolution fails', () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield didResolver.dereference({ didUrl: 'abcd123;;;' });
            expect(result.contentStream).to.be.null;
            expect(result.dereferencingMetadata.error).to.exist;
            expect(result.dereferencingMetadata.error).to.equal('invalidDidUrl');
        }));
        it('returns a DID verification method resource as the value of contentStream if found', () => __awaiter(void 0, void 0, void 0, function* () {
            const did = yield DidKeyMethod.create();
            const result = yield didResolver.dereference({ didUrl: did.document.verificationMethod[0].id });
            expect(result.contentStream).to.be.not.be.null;
            expect(result.dereferencingMetadata.error).to.not.exist;
            const didResource = result.contentStream;
            expect(isVerificationMethod(didResource)).to.be.true;
        }));
        it('returns a DID service resource as the value of contentStream if found', () => __awaiter(void 0, void 0, void 0, function* () {
            // Create an instance of DidResolver
            const resolver = new DidResolver({ didResolvers: [] });
            // Stub the resolve method
            const mockDidResolutionResult = {
                '@context': 'https://w3id.org/did-resolution/v1',
                didDocument: {
                    id: 'did:example:123456789abcdefghi',
                    service: [
                        {
                            id: '#dwn',
                            type: 'DecentralizedWebNode',
                            serviceEndpoint: {
                                nodes: ['https://dwn.tbddev.test/dwn0']
                            }
                        }
                    ],
                },
                didDocumentMetadata: {},
                didResolutionMetadata: {}
            };
            const resolveStub = sinon.stub(resolver, 'resolve').resolves(mockDidResolutionResult);
            const testDidUrl = 'did:example:123456789abcdefghi#dwn';
            const result = yield resolver.dereference({ didUrl: testDidUrl });
            expect(resolveStub.calledOnce).to.be.true;
            expect(result.contentStream).to.deep.equal(mockDidResolutionResult.didDocument.service[0]);
            // Restore the original resolve method
            resolveStub.restore();
        }));
        it('returns the entire DID document as the value of contentStream if the DID URL contains no fragment', () => __awaiter(void 0, void 0, void 0, function* () {
            const did = yield DidKeyMethod.create();
            const result = yield didResolver.dereference({ didUrl: did.did });
            expect(result.contentStream).to.be.not.be.null;
            expect(result.dereferencingMetadata.error).to.not.exist;
            const didResource = result.contentStream;
            expect(didResource['@context']).to.exist;
            expect(didResource['@context']).to.include('https://www.w3.org/ns/did/v1');
        }));
        it('returns contentStream set to null and dereferenceMetadata.error set to notFound if resource is not found', () => __awaiter(void 0, void 0, void 0, function* () {
            const did = yield DidKeyMethod.create();
            const result = yield didResolver.dereference({ didUrl: `${did.did}#0` });
            expect(result.contentStream).to.be.null;
            expect(result.dereferencingMetadata.error).to.exist;
            expect(result.dereferencingMetadata.error).to.equal('notFound');
        }));
    });
});
//# sourceMappingURL=did-resolver.spec.js.map