import { expect } from 'chai';
import { isXmlSchema112Timestamp } from '../src/utils.js';

describe('Utils', async () => {
  describe('isXmlSchema112Timestamp', () => {
    it('returns false for invalid timestamp string', () => {
      expect(isXmlSchema112Timestamp('0')).to.be.false;
      expect(isXmlSchema112Timestamp('2023-06-14')).to.be.false;
      expect(isXmlSchema112Timestamp('2023-06-14T11:29')).to.be.false;
      expect(isXmlSchema112Timestamp('January 20')).to.be.false;
      expect(isXmlSchema112Timestamp('Sun, 26 Feb 2023 01:22:14 +0000')).to.be.false;
      expect(isXmlSchema112Timestamp('"2022-13-01T12:34:56Z"')).to.be.false;
      expect(isXmlSchema112Timestamp('2023-06-16T19:34:52.589Z')).to.be.false;
    });

    it('returns true for valid timestamp string', () => {
      expect(isXmlSchema112Timestamp('2023-06-16T14:45:30Z')).to.be.true;
      expect(isXmlSchema112Timestamp('2000-01-01T00:00:00Z')).to.be.true;
      expect(isXmlSchema112Timestamp('2022-12-31T23:59:59Z')).to.be.true;
      expect(isXmlSchema112Timestamp('1996-02-29T12:34:56Z')).to.be.true;
      expect(isXmlSchema112Timestamp('2021-05-30T01:23:45Z')).to.be.true;
      expect(isXmlSchema112Timestamp('2023-06-16T19:34:52Z')).to.be.true;
    });
  });
});