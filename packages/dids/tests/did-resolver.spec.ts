import { expect } from 'chai';

import { DidKeyMethod } from '../src/did-key.js';
import { DidResolver } from '../src/did-resolver.js';
import { didResolverTestVectors } from './fixtures/test-vectors/did-resolver.js';

describe('DidResolver', () => {
  describe('resolve()', () => {
    let didResolver: DidResolver;

    beforeEach(() => {
      const didMethodApis = [DidKeyMethod];
      didResolver = new DidResolver({ didResolvers: didMethodApis });
    });

    it('passes test vectors', async () => {
      for (const vector of didResolverTestVectors) {
        const didResolutionResult = await didResolver.resolve(vector.input);
        expect(didResolutionResult.didDocument).to.deep.equal(vector.output);
      }
    });
  });
});