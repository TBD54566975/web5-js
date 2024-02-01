import type { UnwrapPromise } from '@web5/common';

import sinon from 'sinon';
import { expect } from 'chai';

import { DidWeb } from '../../src/methods/did-web.js';
import DidWebResolveTestVector from '../../../../web5-spec/test-vectors/did_web/resolve.json' assert { type: 'json' };

// Helper function to create a mocked fetch response that fails and returns a 404 Not Found.
const fetchNotFoundResponse = () => ({
  status     : 404,
  statusText : 'Not Found',
  ok         : false
});

// Helper function to create a mocked fetch response that is successful and returns the given
// response.
const fetchOkResponse = (response: any) => ({
  status     : 200,
  statusText : 'OK',
  ok         : true,
  json       : async () => Promise.resolve(response)
});

describe('DidWeb', () => {
  describe('resolve()', () => {
    it(`returns a 'notFound' error if the HTTP GET response is not status code 200`, async () => {
      // Setup stub so that a mocked response is returned rather than calling over the network.
      let fetchStub = sinon.stub(globalThis as any, 'fetch');
      fetchStub.callsFake(() => Promise.resolve(fetchNotFoundResponse()));

      const resolutionResult = await DidWeb.resolve('did:web:non-existent-domain.com');

      expect(resolutionResult.didResolutionMetadata.error).to.equal('notFound');

      fetchStub.restore();
    });
  });

  describe('Web5TestVectorsDidWeb', () => {
    let fetchStub: sinon.SinonStub;

    beforeEach(() => {
      // Setup stub so that a mocked response is returned rather than calling over the network.
      fetchStub = sinon.stub(globalThis as any, 'fetch');
    });

    afterEach(() => {
      fetchStub.restore();
    });

    it('resolve', async () => {
      type TestVector = {
        description: string;
        input: {
          didUri: Parameters<typeof DidWeb.resolve>[0];
          mockServer: { [url: string]: any };
        };
        output: UnwrapPromise<ReturnType<typeof DidWeb.resolve>>;
        errors: boolean;
      };

      for (const vector of DidWebResolveTestVector.vectors as unknown as TestVector[]) {

        // Only mock the response if the test vector contains a `mockServer` property.
        if (vector.input.mockServer) {
          const mockResponses = vector.input.mockServer;
          fetchStub.callsFake((url: string) => {
            if (url in mockResponses) return Promise.resolve(fetchOkResponse(mockResponses[url]));
          });
        }

        const didResolutionResult = await DidWeb.resolve(vector.input.didUri);

        expect(didResolutionResult.didDocument).to.deep.equal(vector.output.didDocument);
        expect(didResolutionResult.didDocumentMetadata).to.deep.equal(vector.output.didDocumentMetadata);
        expect(didResolutionResult.didResolutionMetadata).to.deep.equal(vector.output.didResolutionMetadata);
      }
    });
  });
});