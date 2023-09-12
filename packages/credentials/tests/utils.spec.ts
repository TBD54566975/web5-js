import { expect } from 'chai';

import {
  isValidXmlSchema112Timestamp,
  getFutureXmlSchema112Timestamp,
  getCurrentXmlSchema112Timestamp,
} from '../src/utils.js';

describe('CredentialsUtils', () => {

  describe('getCurrentXmlSchema112Timestamp', () => {
    it('gets correct time', () => {
      const timestamp = getCurrentXmlSchema112Timestamp();
      expect(timestamp).to.not.be.undefined;
      expect(timestamp).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);

    });
  });

  describe('getFutureXmlSchema112Timestamp', () => {
    it('gets correct time', () => {
      const timestamp = getFutureXmlSchema112Timestamp(123);
      expect(timestamp).to.not.be.undefined;
      expect(timestamp).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    });
  });

  describe('validateXmlSchema112Timestamp', () => {
    it('validates correctly formatted timestamps', () => {
      const timestamp = '2023-07-31T12:34:56Z';
      const result = isValidXmlSchema112Timestamp(timestamp);
      expect(result).to.be.true;
    });

    it('rejects incorrectly formatted timestamps', () => {
      const badTimestamp = '2023-07-31T12:34:56.789Z'; // includes milliseconds
      const result = isValidXmlSchema112Timestamp(badTimestamp);
      expect(result).to.be.false;
    });

    it('rejects non-timestamps', () => {
      const notATimestamp = 'This is definitely not a timestamp';
      const result = isValidXmlSchema112Timestamp(notATimestamp);
      expect(result).to.be.false;
    });

    it('rejects empty string', () => {
      const emptyString = '';
      const result = isValidXmlSchema112Timestamp(emptyString);
      expect(result).to.be.false;
    });
  });
});