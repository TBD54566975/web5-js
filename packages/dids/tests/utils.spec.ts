import { expect } from 'chai';

import type { DidDocument } from '../src/types/did-core.js';

import {
  getServices,
  isDidService,
  isDwnDidService,
  getVerificationMethodId,
  isDidVerificationMethod,
  getVerificationMethodTypes,
} from '../src/utils.js';
import {
  didDocumentIdTestVectors,
  didDocumentTypeTestVectors,
} from './fixtures/test-vectors/did-utils.js';

describe('DID Utils', () => {
  describe('getServices()', () => {
    let didDocument: DidDocument = {
      id      : 'did:example:123',
      service : [
        { id: 'service1', type: 'TypeA', serviceEndpoint: 'http://example.com/service1' },
        { id: 'service2', type: 'TypeB', serviceEndpoint: 'http://example.com/service2' },
        { id: 'service3', type: 'TypeA', serviceEndpoint: 'http://example.com/service3' }
      ]
    };

    it('returns all services if no id or type filter is provided', () => {
      const services = getServices({ didDocument });
      expect(services).to.have.lengthOf(3);
    });

    it('should filter services by id', () => {
      const services = getServices({ didDocument, id: 'service1' });
      expect(services).to.have.lengthOf(1);
      expect(services[0].id).to.equal('service1');
    });

    it('returns an empty array if no services are present', () => {
      const emptyDidDocument = {} as DidDocument;
      const services = getServices({ didDocument: emptyDidDocument });
      expect(services).to.be.an('array').that.is.empty;
    });

    it('should filter services by type', () => {
      const services = getServices({ didDocument, type: 'TypeA' });
      expect(services).to.have.lengthOf(2);
      services.forEach(service => expect(service.type).to.equal('TypeA'));
    });

    it('returns an empty array if no service matches the specified type', () => {
      const services = getServices({ didDocument, type: 'NonExistingType' });
      expect(services).to.be.an('array').that.is.empty;
    });

    it('should filter services by both id and type', () => {
      const services = getServices({ didDocument, id: 'service3', type: 'TypeA' });
      expect(services).to.have.lengthOf(1);
      expect(services[0].id).to.equal('service3');
      expect(services[0].type).to.equal('TypeA');
    });

    it('returns an empty array if no service matches both the specified id and type', () => {
      const services = getServices({ didDocument, id: 'service3', type: 'TypeB' });
      expect(services).to.be.an('array').that.is.empty;
    });

    it('returns an empty array if didDocument is null', () => {
      // @ts-expect-error - Testing invalid input
      const services = getServices({ didDocument: null });
      expect(services).to.be.an('array').that.is.empty;
    });

    it('returns an empty array if didDocument is undefined', () => {
      // @ts-expect-error - Testing invalid input
      const services = getServices({ didDocument: undefined });
      expect(services).to.be.an('array').that.is.empty;
    });
  });

  describe('getVerificationMethodId()', () => {
    for (const vector of didDocumentIdTestVectors) {
      it(`passes test vector ${vector.id}`, async () => {
        const methodIds = await getVerificationMethodId(vector.input as any);
        expect(methodIds).to.deep.equal(vector.output);
      });
    }
  });

  describe('getVerificationMethodTypes()', () => {
    for (const vector of didDocumentTypeTestVectors) {
      it(`passes test vector ${vector.id}`, () => {
        const types = getVerificationMethodTypes(vector.input);
        expect(types).to.deep.equal(vector.output);
      });
    }

    it('returns an empty array if no verification methods are present', () => {
      const emptyDidDocument = {} as DidDocument;
      const types = getVerificationMethodTypes({ didDocument: emptyDidDocument });
      expect(types).to.be.an('array').that.is.empty;
    });

    it('throws an error when didDocument is not provided', async () => {
      try {
        // @ts-expect-error - Testing invalid input
        await getVerificationMethodId({ });
        throw new Error('Test failed - error not thrown');
      } catch (error: any) {
        expect(error.message).to.include('parameter missing');
      }
    });

    it('throws an error when didDocument is missing verificationMethod entries', async () => {
      const didDocumentWithoutVerificationMethod = {
        id                 : 'did:example:123',
        verificationMethod : undefined
      };

      try {
        await getVerificationMethodId({ didDocument: didDocumentWithoutVerificationMethod, publicKeyJwk: undefined });
        throw new Error('Test failed - error not thrown');
      } catch (error: any) {
        expect(error.message).to.equal('Given `didDocument` is missing `verificationMethod` entries');
      }
    });
  });

  describe('isDidService', () => {
    it('returns true for a valid DidService object', () => {
      const validService = {
        id              : 'did:example:123#service-1',
        type            : 'OidcService',
        serviceEndpoint : 'https://example.com/oidc'
      };
      expect(isDidService(validService)).to.be.true;
    });

    it('returns false for an object missing the id property', () => {
      const noIdService = {
        type            : 'OidcService',
        serviceEndpoint : 'https://example.com/oidc'
      };
      expect(isDidService(noIdService)).to.be.false;
    });

    it('returns false for an object missing the type property', () => {
      const noTypeService = {
        id              : 'did:example:123#service-1',
        serviceEndpoint : 'https://example.com/oidc'
      };
      expect(isDidService(noTypeService)).to.be.false;
    });

    it('returns false for an object missing the serviceEndpoint property', () => {
      const noEndpointService = {
        id   : 'did:example:123#service-1',
        type : 'OidcService'
      };
      expect(isDidService(noEndpointService)).to.be.false;
    });

    it('returns false for a null object', () => {
      expect(isDidService(null)).to.be.false;
    });

    it('returns false for an undefined object', () => {
      expect(isDidService(undefined)).to.be.false;
    });

    it('returns false for a non-object value', () => {
      expect(isDidService('string')).to.be.false;
      expect(isDidService(123)).to.be.false;
      expect(isDidService(true)).to.be.false;
    });

    it('returns false for an empty object', () => {
      expect(isDidService({})).to.be.false;
    });

    it('returns false for an object with extra properties', () => {
      const extraPropsService = {
        id              : 'did:example:123#service-1',
        type            : 'OidcService',
        serviceEndpoint : 'https://example.com/oidc',
        extraProp       : 'extraValue'
      };
      expect(isDidService(extraPropsService)).to.be.true; // Note: Extra properties do not invalidate a DidService.
    });
  });

  describe('isDwnDidService', () => {
    it('returns true for a valid DwnDidService object', () => {
      const validDwnService = {
        id              : 'did:example:123#dwn',
        type            : 'DecentralizedWebNode',
        serviceEndpoint : 'https://dwn.example.org',
        enc             : 'did:example:123#key-1',
        sig             : 'did:example:123#key-2'
      };
      expect(isDwnDidService(validDwnService)).to.be.true;
    });

    it('returns false for a non-DwnDidService type', () => {
      const nonDwnService = {
        id              : 'did:example:123#service',
        type            : 'SomeOtherType',
        serviceEndpoint : 'https://service.example.org',
        enc             : 'did:example:123#key-1',
        sig             : 'did:example:123#key-2'
      };
      expect(isDwnDidService(nonDwnService)).to.be.false;
    });

    it('returns false for missing enc property', () => {
      const missingEncService = {
        id              : 'did:example:123#dwn',
        type            : 'DecentralizedWebNode',
        serviceEndpoint : 'https://dwn.example.org',
        sig             : 'did:example:123#key-2'
      };
      expect(isDwnDidService(missingEncService)).to.be.false;
    });

    it('returns false for missing sig property', () => {
      const missingSigService = {
        id              : 'did:example:123#dwn',
        type            : 'DecentralizedWebNode',
        serviceEndpoint : 'https://dwn.example.org',
        enc             : 'did:example:123#key-1'
      };
      expect(isDwnDidService(missingSigService)).to.be.false;
    });

    it('returns false for invalid enc property type', () => {
      const invalidEncService = {
        id              : 'did:example:123#dwn',
        type            : 'DecentralizedWebNode',
        serviceEndpoint : 'https://dwn.example.org',
        enc             : 123,
        sig             : 'did:example:123#key-2'
      };
      expect(isDwnDidService(invalidEncService)).to.be.false;
    });

    it('returns false for invalid sig property type', () => {
      const invalidSigService = {
        id              : 'did:example:123#dwn',
        type            : 'DecentralizedWebNode',
        serviceEndpoint : 'https://dwn.example.org',
        enc             : 'did:example:123#key-1',
        sig             : true
      };
      expect(isDwnDidService(invalidSigService)).to.be.false;
    });

    it('returns false for an array of non-string in enc', () => {
      const arrayEncService = {
        id              : 'did:example:123#dwn',
        type            : 'DecentralizedWebNode',
        serviceEndpoint : 'https://dwn.example.org',
        enc             : [123, 'did:example:123#key-1'],
        sig             : 'did:example:123#key-2'
      };
      expect(isDwnDidService(arrayEncService)).to.be.false;
    });

    it('returns false for an array of non-string in sig', () => {
      const arraySigService = {
        id              : 'did:example:123#dwn',
        type            : 'DecentralizedWebNode',
        serviceEndpoint : 'https://dwn.example.org',
        enc             : 'did:example:123#key-1',
        sig             : ['did:example:123#key-2', null]
      };
      expect(isDwnDidService(arraySigService)).to.be.false;
    });

    it('returns false for a null object', () => {
      expect(isDwnDidService(null)).to.be.false;
    });

    it('returns false for an undefined object', () => {
      expect(isDwnDidService(undefined)).to.be.false;
    });

    it('returns false for a non-object value', () => {
      expect(isDwnDidService('string')).to.be.false;
      expect(isDwnDidService(123)).to.be.false;
      expect(isDwnDidService(true)).to.be.false;
    });

    it('returns false for an object not adhering to DidService structure', () => {
      const invalidStructureService = {
        id            : 'did:example:123#dwn',
        type          : 'DecentralizedWebNode',
        wrongProperty : 'https://dwn.example.org',
        enc           : 'did:example:123#key-1',
        sig           : 'did:example:123#key-2'
      };
      expect(isDwnDidService(invalidStructureService)).to.be.false;
    });

    it('returns false for an empty object', () => {
      expect(isDwnDidService({})).to.be.false;
    });
  });

  describe('isDidVerificationMethod', () => {
    it('returns true for a valid DidVerificationMethod object', () => {
      const validVerificationMethod = {
        id           : 'did:example:123#0',
        type         : 'JsonWebKey2020',
        controller   : 'did:example:123',
        publicKeyJwk : {}
      };
      expect(isDidVerificationMethod(validVerificationMethod)).to.be.true;
    });

    it('returns false for an object missing the id property', () => {
      const missingId = {
        type         : 'JsonWebKey2020',
        controller   : 'did:example:123',
        publicKeyJwk : {}
      };
      expect(isDidVerificationMethod(missingId)).to.be.false;
    });

    it('returns false for an object missing the type property', () => {
      const missingType = {
        id           : 'did:example:123#0',
        controller   : 'did:example:123',
        publicKeyJwk : {}
      };
      expect(isDidVerificationMethod(missingType)).to.be.false;
    });

    it('returns false for an object missing the controller property', () => {
      const missingController = {
        id           : 'did:example:123#0',
        type         : 'JsonWebKey2020',
        publicKeyJwk : {}
      };
      expect(isDidVerificationMethod(missingController)).to.be.false;
    });

    it('returns false for an object with incorrect property types', () => {
      expect(isDidVerificationMethod({
        id         : 123,
        type       : {},
        controller : false
      })).to.be.false;
      expect(isDidVerificationMethod({
        id         : 'did:example:123',
        type       : {},
        controller : false
      })).to.be.false;
      expect(isDidVerificationMethod({
        id         : 'did:example:123',
        type       : 'JsonWebKey2020',
        controller : false
      })).to.be.false;
    });

    it('returns false for a null object', () => {
      expect(isDidVerificationMethod(null)).to.be.false;
    });

    it('returns false for an undefined object', () => {
      expect(isDidVerificationMethod(undefined)).to.be.false;
    });

    it('returns false for a non-object value', () => {
      expect(isDidVerificationMethod('string')).to.be.false;
      expect(isDidVerificationMethod(123)).to.be.false;
      expect(isDidVerificationMethod(true)).to.be.false;
    });

    it('returns false for an empty object', () => {
      expect(isDidVerificationMethod({})).to.be.false;
    });

    it('returns true for an object with extra properties', () => {
      const extraProps = {
        id           : 'did:example:123#0',
        type         : 'JsonWebKey2020',
        controller   : 'did:example:123',
        publicKeyJwk : {},
        extra        : 'extraValue'
      };
      expect(isDidVerificationMethod(extraProps)).to.be.true;
    });
  });
});