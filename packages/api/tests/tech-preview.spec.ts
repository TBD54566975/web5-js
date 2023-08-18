import type { DwnServiceEndpoint } from '@web5/dids';

import sinon from 'sinon';
import chai, { expect } from 'chai';

import { chaiUrl } from './utils/chai-plugins.js';
import { generateDwnConfiguration, getTechPreviewDwnEndpoints } from '../src/tech-preview.js';

chai.use(chaiUrl);

describe('Tech Preview', () => {
  describe('generateDwnConfiguration()', () => {
    it('returns keys and services with two DWN URLs', async () => {
      const ionCreateOptions = await generateDwnConfiguration({
        dwnUrls: [
          'https://dwn.tbddev.test/dwn0',
          'https://dwn.tbddev.test/dwn1'
        ]});

      expect(ionCreateOptions).to.have.property('keySet');
      expect(ionCreateOptions.keySet.verificationMethodKeys).to.have.length(2);
      const authorizationKey = ionCreateOptions.keySet.verificationMethodKeys.find(key => key.privateKeyJwk.kid === '#dwn-sig');
      expect(authorizationKey).to.exist;
      const encryptionKey = ionCreateOptions.keySet.verificationMethodKeys.find(key => key.privateKeyJwk.kid === '#dwn-enc');
      expect(encryptionKey).to.exist;

      expect(ionCreateOptions).to.have.property('services');
      expect(ionCreateOptions.services).to.have.length(1);

      const [ service ] = ionCreateOptions.services;
      expect(service.id).to.equal('#dwn');
      expect(service).to.have.property('serviceEndpoint');

      const serviceEndpoint = service.serviceEndpoint as DwnServiceEndpoint;
      expect(serviceEndpoint).to.have.property('nodes');
      expect(serviceEndpoint.nodes).to.have.length(2);
      expect(serviceEndpoint).to.have.property('signingKeys');
      expect(serviceEndpoint.signingKeys[0]).to.equal(authorizationKey.publicKeyJwk.kid);
      expect(serviceEndpoint).to.have.property('encryptionKeys');
      expect(serviceEndpoint.encryptionKeys[0]).to.equal(encryptionKey.publicKeyJwk.kid);
    });

    it('returns keys and services with one DWN URLs', async () => {
      const ionCreateOptions = await generateDwnConfiguration({
        dwnUrls: [
          'https://dwn.tbddev.test/dwn0'
        ]});

      const [ service ] = ionCreateOptions.services!;
      expect(service.id).to.equal('#dwn');
      expect(service).to.have.property('serviceEndpoint');

      const serviceEndpoint = service.serviceEndpoint as DwnServiceEndpoint;
      expect(serviceEndpoint).to.have.property('nodes');
      expect(serviceEndpoint.nodes).to.have.length(1);
      expect(serviceEndpoint).to.have.property('signingKeys');
      expect(serviceEndpoint).to.have.property('encryptionKeys');
    });

    it('returns keys and services with 0 DWN URLs', async () => {
      const ionCreateOptions = await generateDwnConfiguration({ dwnUrls: [] });

      const [ service ] = ionCreateOptions.services!;
      expect(service.id).to.equal('#dwn');
      expect(service).to.have.property('serviceEndpoint');

      const serviceEndpoint = service.serviceEndpoint as DwnServiceEndpoint;
      expect(serviceEndpoint).to.have.property('nodes');
      expect(serviceEndpoint.nodes).to.have.length(0);
      expect(serviceEndpoint).to.have.property('signingKeys');
      expect(serviceEndpoint).to.have.property('encryptionKeys');
    });
  });

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