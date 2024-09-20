import { expect } from 'chai';

import { activatePolyfills } from '../src/web-features.js';

describe('web features', () => {
  describe('activatePolyfills', () => {
    it('does not throw', () => {
      expect(() => activatePolyfills()).to.not.throw();
    });
  });
});
