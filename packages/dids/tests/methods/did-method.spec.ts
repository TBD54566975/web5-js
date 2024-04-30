import { expect } from 'chai';

import { DidMethod } from '../../src/methods/did-method.js';

describe('DidMethod', () => {
  describe('getSigningMethod()', () => {
    it('throws an error if the DID method implementation does not provide a getSigningMethod() function', async () => {
      class DidTest extends DidMethod {}

      try {
        await DidTest.getSigningMethod({ didDocument: { id: 'did:method:example' } });
        expect.fail('Error should have been thrown');
      } catch (error: any) {
        expect(error.message).to.include('must implement getSigningMethod()');
      }
    });
  });

  describe('resolve()', () => {
    it('throws an error if the DID method implementation does not provide a resolve() function', async () => {
      class DidTest extends DidMethod {}

      try {
        await DidTest.resolve('did:method:example');
        expect.fail('Error should have been thrown');
      } catch (error: any) {
        expect(error.message).to.include('must implement resolve()');
      }
    });
  });
});