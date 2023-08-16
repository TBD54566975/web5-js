import { expect } from 'chai';
import sinon from 'sinon';

import { Web5Did } from '../../src/did/web5-did.js';

describe('DidManager', async () => {
  let web5did;

  beforeEach(function () {
    web5did = new Web5Did();
  });

  before(function () {
    this.clock = sinon.useFakeTimers();
  });

  after(function () {
    this.clock.restore();
  });

  it('should never expire managed DIDs', async function () {
    let resolved;
    const did = 'did:ion:abcd1234';
    const didData = {
      connected: true,
      endpoint: 'http://localhost:55500',
    };

    await web5did.manager.set(did, didData);

    resolved = await web5did.resolve(did);
    expect(resolved).to.not.be.undefined;
    expect(resolved).to.equal(didData);

    this.clock.tick(2147483647); // Time travel 23.85 days

    resolved = await web5did.resolve(did);
    expect(resolved).to.not.be.undefined;
    expect(resolved).to.equal(didData);
  });

  it('should return object with keys undefined if key data not provided', async () => {
    const did = 'did:ion:abcd1234';
    const didData = {
      connected: true,
      endpoint: 'http://localhost:55500',
    };

    await web5did.manager.set(did, didData);

    const resolved = await web5did.resolve(did);
    expect(resolved.keys).to.be.undefined;
  });
});
