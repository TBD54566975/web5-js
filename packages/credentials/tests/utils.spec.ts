import { expect } from 'chai';

import {
  isValidXmlSchema112Timestamp,
  getFutureXmlSchema112Timestamp,
  getCurrentXmlSchema112Timestamp,
  isValidRFC3339Timestamp,
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

  describe('isValidRFC3339Timestamp', () => {
    it('validates correctly formatted timestamps without fractional seconds and with Z timezone', () => {
      const timestamp = '2023-07-31T12:34:56Z';
      const result = isValidRFC3339Timestamp(timestamp);
      expect(result).to.be.true;
    });

    it('validates correctly formatted timestamps with fractional seconds and Z timezone', () => {
      const timestampWithFractionalSeconds = '2023-07-31T12:34:56.789Z';
      const result = isValidRFC3339Timestamp(timestampWithFractionalSeconds);
      expect(result).to.be.true;
    });

    it('validates correctly formatted timestamps with timezone offset', () => {
      const timestampWithOffset = '2023-07-31T12:34:56-07:00';
      const result = isValidRFC3339Timestamp(timestampWithOffset);
      expect(result).to.be.true;
    });

    it('rejects incorrectly formatted timestamps', () => {
      const badTimestamp = '2023-07-31 12:34:56';
      const result = isValidRFC3339Timestamp(badTimestamp);
      expect(result).to.be.false;
    });

    it('rejects non-timestamp strings', () => {
      const notATimestamp = 'This is definitely not a timestamp';
      const result = isValidRFC3339Timestamp(notATimestamp);
      expect(result).to.be.false;
    });

    it('rejects empty string', () => {
      const emptyString = '';
      const result = isValidRFC3339Timestamp(emptyString);
      expect(result).to.be.false;
    });

    it('validates correctly formatted timestamps with fractional seconds and timezone offset', () => {
      const timestampWithFractionalSecondsAndOffset = '2023-07-31T12:34:56.789+02:00';
      const result = isValidRFC3339Timestamp(timestampWithFractionalSecondsAndOffset);
      expect(result).to.be.true;
    });
  });
});