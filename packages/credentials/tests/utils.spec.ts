import { expect } from 'chai';
import {getCurrentXmlSchema112Timestamp, getFutureXmlSchema112Timestamp} from '../src/utils.js';

describe('credentials utils', () => {
  it('gets correct time', () => {
    const timestamp = getCurrentXmlSchema112Timestamp();
    expect(timestamp).to.not.be.undefined;
    expect(timestamp).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);

  });

  it('gets correct time', () => {
    const timestamp = getFutureXmlSchema112Timestamp(123);
    expect(timestamp).to.not.be.undefined;
    expect(timestamp).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });
});