import { expect } from 'chai';

import sinon from 'sinon';

import { SsiValidator } from '../src/validators.js';
import { DEFAULT_VC_CONTEXT, DEFAULT_VC_TYPE, VcDataModel } from '../src/verifiable-credential.js';
import { DEFAULT_VP_TYPE } from '../src/verifiable-presentation.js';

describe('SsiValidator', () => {


  describe('validateContext', () => {
    it('should throw an error if the default context is missing', () => {
      expect(() => SsiValidator.validateContext(['http://example.com'])).throw(`@context is missing default context "${DEFAULT_VC_CONTEXT}"`);
    });

    it('should not throw an error if the default context is present', () => {
      expect(() => SsiValidator.validateContext([DEFAULT_VC_CONTEXT, 'http://example.com'])).not.throw();
    });
  });

  describe('validateVcType', () => {
    it('should throw an error if the default VC type is missing', () => {
      expect(() => SsiValidator.validateVcType(['CustomType'])).throw(`type is missing default "${DEFAULT_VC_TYPE}"`);
    });

    it('should not throw an error if the default VC type is present', () => {
      expect(() => SsiValidator.validateVcType([DEFAULT_VC_TYPE, 'CustomType'])).not.throw();
    });
  });

  describe('validateVpType', () => {
    it('should throw an error if the default VP type is missing', () => {
      expect(() => SsiValidator.validateVpType(['CustomType'])).to.throw(`type is missing default "${DEFAULT_VP_TYPE}"`);
    });

    it('should not throw an error if the default VP type is present', () => {
      expect(() => SsiValidator.validateVpType([DEFAULT_VP_TYPE, 'CustomType'])).not.to.throw();
    });

    it('should throw an error if the input array is empty', () => {
      expect(() => SsiValidator.validateVpType([])).to.throw(`type is missing default "${DEFAULT_VP_TYPE}"`);
    });

    it('should throw an error if the input is not an array and does not contain the default VP type', () => {
      expect(() => SsiValidator.validateVpType('CustomType')).to.throw(`type is missing default "${DEFAULT_VP_TYPE}"`);
    });

    it('should not throw an error if the input is not an array but contains the default VP type', () => {
      expect(() => SsiValidator.validateVpType(DEFAULT_VP_TYPE)).not.to.throw();
    });
  });

  describe('validateCredentialSubject', () => {
    it('should throw an error if the credential subject is empty', () => {
      expect(() => SsiValidator.validateCredentialSubject({})).throw('credentialSubject must not be empty');
    });

    it('should not throw an error if the credential subject is not empty', () => {
      expect(() => SsiValidator.validateCredentialSubject({ id: 'did:example:123' })).not.throw();
    });
  });

  describe('validateTimestamp', () => {
    it('should throw an error if the timestamp is not valid', () => {
      expect(() => SsiValidator.validateTimestamp('invalid-timestamp')).throw('timestamp is not valid xml schema 112 timestamp');
    });

    it('should not throw an error if the timestamp is valid', () => {
      const validTimestamp = '2022-08-28T12:34:56Z';
      expect(() => SsiValidator.validateTimestamp(validTimestamp)).not.throw();
    });
  });

  describe('validateCredentialSchema', () => {
    // Mock VcDataModel and CredentialSchema
    const validVcDataModel = {
      credentialSchema: {
        id   : 'https://schema.org/PFI',
        type : 'JsonSchema'
      }
    } as VcDataModel;

    let fetchStub: sinon.SinonStub;

    beforeEach(() => {
      fetchStub = sinon.stub(globalThis, 'fetch');
    });

    afterEach(() => {
      fetchStub.restore();
      sinon.restore();
    });

    it('should throw an error if credential schema is missing', async () => {
      const invalidVcDataModel = { ...validVcDataModel, credentialSchema: undefined };

      try {
        await SsiValidator.validateCredentialSchema(invalidVcDataModel);
        expect.fail();
      } catch (error: any) {
        expect(error.message).to.equal('Credential schema is missing or empty');
      }
    });

    it('should throw an error if credential schema is an empty array', async () => {
      const invalidVcDataModel = { ...validVcDataModel, credentialSchema: [] };

      try {
        await SsiValidator.validateCredentialSchema(invalidVcDataModel);
        expect.fail();
      } catch (error: any) {
        expect(error.message).to.equal('Credential schema is missing or empty');
      }
    });

    it('should throw an error if fetch fails', async () => {
      fetchStub.rejects(new Error('Network error'));

      try {
        await SsiValidator.validateCredentialSchema(validVcDataModel);
        expect.fail();
      } catch (error: any) {
        expect(error.message).to.equal('Failed to fetch schema from https://schema.org/PFI: Network error');
      }
    });

    it('should throw an error if fetch returns non-200 status', async () => {
      fetchStub.resolves(new Response(null, { status: 404 }));

      try {
        await SsiValidator.validateCredentialSchema(validVcDataModel);
        expect.fail();
      } catch (error: any) {
        expect(error.message).to.contain('Failed to fetch schema from https://schema.org/PFI');
      }
    });

    it('should throw an error if schema validation fails', async () => {
      const mockSchema = {
        '$schema'    : 'http://json-schema.org/draft-07/schema#',
        'type'       : 'object',
        'properties' : {
          'credentialSubject': {
            'type'       : 'object',
            'properties' : {
              'id': {
                'type': 'string'
              },
              'country_of_residence': {
                'type'    : 'string',
                'pattern' : '^[A-Z]{2}$'
              },
            },
            'required': [
              'id',
              'country_of_residence'
            ]
          }
        },
        'required': [
          'issuer',
        ]
      };

      fetchStub.resolves(new Response(JSON.stringify(mockSchema), { status: 200 }));

      try {
        await SsiValidator.validateCredentialSchema(validVcDataModel);
        expect.fail();
      } catch (error: any) {
        expect(error.message).to.contain('Schema Validation Errors:');
      }
    });
  });
});
