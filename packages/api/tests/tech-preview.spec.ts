import sinon from 'sinon';
import chai, { expect } from 'chai';

import { chaiUrl } from './utils/chai-plugins.js';
import { getTechPreviewDwnEndpoints } from '../src/tech-preview.js';

chai.use(chaiUrl);

describe('Tech Preview', () => {
  describe('getTechPreviewDwnEndpoints()', () => {
    let fetchStub: sinon.SinonStub;
    let mockDwnEndpoints: Array<string>;

    let tbdWellKnownOkResponse = {
      status     : 200,
      statusText : 'OK',
      ok         : true,
      json       : async () => Promise.resolve({
        id      : 'did:web:dwn.tbddev.org',
        service : [
          {
            id              : '#dwn',
            serviceEndpoint : {
              nodes: mockDwnEndpoints
            },
            type: 'DecentralizedWebNode'
          }
        ]
      })
    };

    let tbdWellKnownBadResponse = {
      status     : 400,
      statusText : 'Bad Request',
      ok         : false
    };

    let dwnServerHealthOkResponse = {
      status     : 200,
      statusText : 'OK',
      ok         : true,
      json       : async () => Promise.resolve({ok: true})
    };

    let dwnServerHealthBadResponse = {
      status     : 400,
      statusText : 'Bad Request',
      ok         : false
    };

    beforeEach(() => {
      mockDwnEndpoints = [
        'https://dwn.tbddev.test/dwn0',
        'https://dwn.tbddev.test/dwn1',
        'https://dwn.tbddev.test/dwn2',
        'https://dwn.tbddev.test/dwn3',
        'https://dwn.tbddev.test/dwn4',
        'https://dwn.tbddev.test/dwn5',
        'https://dwn.tbddev.test/dwn6'
      ];

      fetchStub = sinon.stub(globalThis as any, 'fetch');

      fetchStub.callsFake((url) => {
        if (url === 'https://dwn.tbddev.org/.well-known/did.json') {
          return Promise.resolve(tbdWellKnownOkResponse);
        } else if (url.endsWith('/health')) {
          return Promise.resolve(dwnServerHealthOkResponse);
        }
      });
    });

    afterEach(() => {
      fetchStub.restore();
    });

    it('returns an array', async () => {
      const dwnEndpoints = await getTechPreviewDwnEndpoints();

      expect(dwnEndpoints).to.be.an('array');
    });

    it('returns valid DWN endpoint URLs', async () => {
      const dwnEndpoints = await getTechPreviewDwnEndpoints();

      // There must be at one URL to check or else this test always passes.
      expect(dwnEndpoints).to.have.length.greaterThan(0);

      dwnEndpoints.forEach(endpoint => {
        expect(endpoint).to.be.a.url;
        expect(mockDwnEndpoints).to.include(endpoint);
      });
    });

    it('returns 2 DWN endpoints if at least 2 are healthy', async () => {
      const promises = Array(50).fill(0).map(() => getTechPreviewDwnEndpoints());

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result).to.be.an('array').that.has.length(2);
      });
    });

    it('returns 1 DWN endpoints if only 1 is healthy', async () => {
      mockDwnEndpoints = [
        'https://dwn.tbddev.test/dwn0'
      ];

      const promises = Array(50).fill(0).map(() => getTechPreviewDwnEndpoints());

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result).to.be.an('array').that.has.length(1);
      });
    });

    it('ignores health check failures and tries next endpooint', async () => {
      mockDwnEndpoints = [
        'https://dwn.tbddev.test/dwn0',
        'https://dwn.tbddev.test/dwn1',
      ];

      // Stub fetch to simulate dwn.tbddev.org responding but all of the hosted DWN Server reporting not healthy.
      fetchStub.restore();
      fetchStub = sinon.stub(globalThis as any, 'fetch');
      fetchStub.callsFake((url) => {
        if (url === 'https://dwn.tbddev.org/.well-known/did.json') {
          return Promise.resolve(tbdWellKnownOkResponse);
        } else if (url === 'https://dwn.tbddev.test/dwn0/health') {
          return Promise.reject(dwnServerHealthOkResponse);
        } else if (url === 'https://dwn.tbddev.test/dwn1/health') {
          return Promise.resolve(dwnServerHealthBadResponse);
        }
      });

      const dwnEndpoints = await getTechPreviewDwnEndpoints();

      expect(dwnEndpoints).to.be.an('array').that.has.length(0);
    });

    it('returns 0 DWN endpoints if none are healthy', async () => {
      // Stub fetch to simulate dwn.tbddev.org responding but all of the hosted DWN Server reporting not healthy.
      fetchStub.restore();
      fetchStub = sinon.stub(globalThis as any, 'fetch');
      fetchStub.callsFake((url) => {
        if (url === 'https://dwn.tbddev.org/.well-known/did.json') {
          return Promise.resolve(tbdWellKnownOkResponse);
        } else if (url.endsWith('/health')) {
          return Promise.resolve(dwnServerHealthBadResponse);
        }
      });

      const dwnEndpoints = await getTechPreviewDwnEndpoints();

      expect(dwnEndpoints).to.be.an('array').that.has.length(0);
    });

    it('returns 0 DWN endpoints if dwn.tbddev.org is not responding', async () => {
      // Stub fetch to simulate dwn.tbddev.org responding but all of the hosted DWN Server reporting not healthy.
      fetchStub.restore();
      fetchStub = sinon.stub(globalThis as any, 'fetch');
      fetchStub.callsFake((url) => {
        if (url === 'https://dwn.tbddev.org/.well-known/did.json') {
          return Promise.resolve(tbdWellKnownBadResponse);
        }
      });

      const dwnEndpoints = await getTechPreviewDwnEndpoints();

      expect(dwnEndpoints).to.be.an('array').that.has.length(0);
    });

    it('returns 0 DWN endpoints if fetching dwn.tbddev.org throws an exception', async () => {
      // Stub fetch to simulate fetching dwn.tbddev.org throwing an exception.
      fetchStub.restore();
      fetchStub = sinon.stub(globalThis as any, 'fetch');
      fetchStub.withArgs('https://dwn.tbddev.org/.well-known/did.json').rejects(new Error('Network error'));

      const dwnEndpoints = await getTechPreviewDwnEndpoints();

      expect(dwnEndpoints).to.be.an('array').that.has.length(0);
    });
  });
});