import { expect } from 'chai';
import {getCurrentXmlSchema112Timestamp} from '../src/utils.js';

describe('example', () => {
  it('gets correct time', () => {
    expect(getCurrentXmlSchema112Timestamp()).to.not.be.undefined;
  });
});