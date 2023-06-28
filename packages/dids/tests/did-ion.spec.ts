import { expect } from 'chai';

import { DidIonApi } from '../src/did-ion.js';

// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;

const DidIon = new DidIonApi();

describe('DidIonApi', () => {
  describe('create()', () => {
    it('returns a valid didState', async () => {
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
  });
});