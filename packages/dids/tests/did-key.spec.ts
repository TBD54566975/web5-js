import { expect } from 'chai';
import { DidKeyApi } from '../src/did-key.js';

const DidKey = new DidKeyApi();

describe('DidKeyApi', () => {
  it('works', async () => {
    const didState = await DidKey.create();

    expect(didState.id).to.exist;
    expect(didState.internalId).to.exist;
    expect(didState.keys).to.exist;

    expect(didState.methodData).to.exist;
    expect(Object.keys(didState.methodData).length).to.equal(0);

    expect((didState as any).services).to.not.exist;

    for (let key of didState.keys) {
      expect(key.id).to.exist;
      expect(key.controller).to.exist;
      expect(key.publicKeyJwk).to.exist;
      expect(key.privateKeyJwk).to.exist;
      expect(key.type).to.exist;
    }
  });
});