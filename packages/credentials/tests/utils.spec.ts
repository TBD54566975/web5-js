import { expect } from 'chai';
import {getCurrentXmlSchema112Timestamp, getFutureXmlSchema112Timestamp} from '../src/utils.js';

describe('credentials utils', () => {
  it('gets correct time', () => {
    expect(getCurrentXmlSchema112Timestamp()).to.not.be.undefined;
  });

  it('gets correct time', () => {
    expect(getFutureXmlSchema112Timestamp(123)).to.not.be.undefined;
  });
});