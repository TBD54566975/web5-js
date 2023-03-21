import { expect } from 'chai';
import sinon from 'sinon';

import { Web5DID } from '../../src/did/Web5DID.js';
import * as didDocuments from '../data/didDocuments.js';

describe('Web5DID', async () => {
  let web5did;

  beforeEach(function () {
    web5did = new Web5DID();
  });

  before(function () {
    this.clock = sinon.useFakeTimers();
  });

  after(function () {
    this.clock.restore();
  });

  describe('getKeys', async () => {
    it('should return array of keys when defined in DID document', async () => {
      sinon.stub(web5did, 'resolve').resolves(didDocuments.ion.oneKey);

      const didKeys = await web5did.getKeys('response-stubbed');

      expect(didKeys).to.have.lengthOf(1);
      expect(didKeys[0]).to.have.property('type', 'EcdsaSecp256k1VerificationKey2019');
    });

    it('should return empty array when keys not defined DID document', async () => {
      sinon.stub(web5did, 'resolve').resolves(didDocuments.ion.noKeys);

      const didKeys = await web5did.getKeys('response-stubbed');

      expect(didKeys).to.have.lengthOf(0);
    });
  });

  describe('register', async () => {
    it('should never expire registered DIDs', async function () {
      let resolved;
      const did = 'did:ion:abcd1234';
      const didData = {
        connected: true,
        did: did,
        endpoint: 'http://localhost:55500',
      };
  
      web5did.register(didData);
  
      resolved = await web5did.resolve(did);
      expect(resolved.did).to.equal(did);
  
      this.clock.tick(2147483647); // Time travel 23.85 days
  
      resolved = await web5did.resolve(did);
      expect(resolved.did).to.equal(did);
    });

    it('should return object with keys undefined if key data not provided', async () => {
      const did = 'did:ion:abcd1234';
      const didData = {
        connected: true,
        did: did,
        endpoint: 'http://localhost:55500',
      };
  
      web5did.register(didData);
  
      const resolved = await web5did.resolve(did);
      expect(resolved.keys).to.be.undefined;
    }); 
  });
});