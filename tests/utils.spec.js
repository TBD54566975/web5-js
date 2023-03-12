import * as utils from '../src/utils.js';
import { expect } from 'chai';

describe('Utils Tests', () => {
  describe('encodeData', () => {
    it('sets dataFormat to text/plain if string is provided', () => {
      const { dataFormat } = utils.encodeData('hello');

      expect(dataFormat).to.equal('text/plain');
    });
  });
});