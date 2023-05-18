import { expect } from 'chai';

import { DidIonApi } from '../src/did-ion.js';

const DidIon = new DidIonApi();

describe('DidIonApi', () => {
  it('works', async () => {
    const didState = await DidIon.create();

    expect(didState.id).to.exist;
    expect(didState.internalId).to.exist;
    expect(didState.keys).to.exist;

    for (let key of didState.keys) {
      expect(key.id).to.exist;
      expect(key.controller).to.exist;
      expect(key.publicKeyJwk).to.exist;
      expect(key.privateKeyJwk).to.exist;
      expect(key.type).to.exist;
    }
  });

  it('works when using dwn configuration', async () => {
    const ionCreateOptions = await DidIonApi.generateDwnConfiguration(['https://dwn.tbddev.org/dwn0']);

    try {
      // TODO: write specific assertions
      const _didState = await DidIon.create(ionCreateOptions);
    } catch(e) {
      expect.fail(e.message);
    }
  });
});