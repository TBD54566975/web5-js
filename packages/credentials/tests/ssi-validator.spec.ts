import { expect } from 'chai';

import { SsiValidator } from '../src/validators.js';
import { DEFAULT_VC_CONTEXT, DEFAULT_VC_TYPE } from '../src/verifiable-credential.js';

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
});
