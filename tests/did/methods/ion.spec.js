import { expect } from 'chai';
import sinon from 'sinon';

import { Web5DID } from '../../../src/did/Web5DID.js';
import * as didDocuments from '../../data/didDocuments.js';

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

  describe('getDidDocument', async () => {
    it('should return a didDocument for a valid did:ion DID', async () => {
      sinon.stub(web5did, 'resolve').resolves(didDocuments.ion.oneVerificationMethodJwk);
  
      const didDocument = await web5did.getDidDocument('resolve-stubbed');

      expect(didDocument['@context'][0]).to.equal('https://www.w3.org/ns/did/v1');
      expect(didDocument).to.have.property('id', didDocuments.ion.oneVerificationMethodJwk.didDocument.id);
    });

    it('should return null didDocument for an invalid did:ion DID', async () => {
      sinon.stub(web5did, 'resolve').resolves(didDocuments.ion.notFound);
  
      const didDocument = await web5did.getDidDocument('resolve-stubbed');

      expect(didDocument).to.be.null;
    });
  });

  describe('getServices', async () => {
    it('should return array of services when defined in DID document', async () => {
      sinon.stub(web5did, 'resolve').resolves(didDocuments.ion.oneService);

      const didServices = await web5did.getServices('resolve-stubbed');

      expect(didServices).to.have.lengthOf(1);
      expect(didServices[0]).to.have.property('type', 'DecentralizedWebNode');
    });

    it('should return empty array when services not defined DID document', async () => {
      sinon.stub(web5did, 'resolve').resolves(didDocuments.ion.noServices);

      const didServices = await web5did.getServices('resolve-stubbed');

      expect(didServices).to.have.lengthOf(0);
    });
  });

  describe('resolve', async () => {
    it('should not call ion-tools resolve() when registered DID is cached', async () => {
      // If registered DID isn't cached, the fetch() call to resolve over the network
      // will take far more than 10ms timeout, causing the test to fail.
      const did = 'did:ion:EiClkZMDxPKqC9c-umQfTkR8vvZ9JPhl_xLDI9Nfk38w5w';
      const didData = {
        connected: true,
        did: did,
        endpoint: 'http://localhost:55500',
      };
  
      web5did.register(didData);

      const _ = await web5did.resolve(did);
    }).timeout(10);

    it('should return a didResolutionResult for a valid DID', async () => {
      const did = 'did:ion:EiClkZMDxPKqC9c-umQfTkR8vvZ9JPhl_xLDI9Nfk38w5w';
  
      const resolved = await web5did.resolve(did);

      expect(resolved['@context']).to.equal('https://w3id.org/did-resolution/v1');
      expect(resolved.didDocument).to.have.property('id', did);
    });

    it('should return null didDocument for an invalid ION DID', async () => {
      const did = 'did:ion:invalid';
  
      const resolved = await web5did.resolve(did);
      
      expect(resolved.didDocument).to.be.null;
      expect(resolved.didResolutionMetadata.error).to.equal(`unable to resolve ${did}, got http status 404`);
    });
  });
});