
import { expect } from 'chai';
import { BearerDid, DidJwk } from '@web5/dids';

import type { Web5PlatformAgent } from '../src/types/agent.js';

import { TestAgent } from './utils/test-agent.js';
import { AgentDidApi, DidInterface } from '../src/did-api.js';
import { PlatformAgentTestHarness } from '../src/test-harness.js';

describe('AgentDidApi', () => {

  describe('constructor', () => {
    it('accepts an array of DID method implementations', () => {
      expect(
        new AgentDidApi({ didMethods: [DidJwk] })
      ).to.not.throw;
    });

    it('throws an exception if didMethods input is missing', () => {
      expect(() =>
        // @ts-expect-error because an empty object is intentionally specified to trigger the error.
        new AgentDidApi({})
      ).to.throw(TypeError, `Required parameter missing: 'didMethods'`);
    });
  });

  describe('get agent', () => {
    it(`returns the 'agent' instance property`, async () => {
      // @ts-expect-error because we are only mocking a single property.
      const mockAgent: Web5PlatformAgent = {
        agentDid: { uri: 'did:method:abc123' } as BearerDid
      };
      const didApi = new AgentDidApi({ didMethods: [DidJwk], agent: mockAgent });
      const agent = didApi.agent;
      expect(agent).to.exist;
      expect(agent.agentDid.uri).to.equal('did:method:abc123');
    });

    it(`throws an error if the 'agent' instance property is undefined`, () => {
      const didApi = new AgentDidApi({ didMethods: [DidJwk] });
      expect(() =>
        didApi.agent
      ).to.throw(Error, 'Unable to determine agent execution context');
    });
  });

  // Run tests for each supported data store type.
  const agentStoreTypes = ['dwn', 'memory'] as const;
  agentStoreTypes.forEach((agentStoreType) => {

    describe(`with ${agentStoreType} DID store`, () => {
      let testHarness: PlatformAgentTestHarness;

      before(async () => {
        testHarness = await PlatformAgentTestHarness.setup({
          agentClass  : TestAgent,
          agentStores : agentStoreType
        });
      });

      beforeEach(async () => {
        await testHarness.clearStorage();
        await testHarness.createAgentDid();
      });

      after(async () => {
        await testHarness.clearStorage();
        await testHarness.closeStorage();
      });

      describe('create()', () => {
        it('creates and returns a DID', async () => {
          // Generate a new DID.
          const did = await testHarness.agent.did.create({
            method  : 'jwk',
            options : {
              verificationMethods: [{
                algorithm: 'Ed25519'
              }]
            }
          });

          // Verify the result.
          expect(did).to.have.property('uri');
          expect(did).to.have.property('document');
          expect(did).to.have.property('metadata');
        });

        it('supports DID DHT', async () => {
          // Generate a new DID.
          const did = await testHarness.agent.did.create({
            method  : 'dht',
            options : {
              verificationMethods: [{
                algorithm: 'Ed25519'
              }],
              publish: false
            },
            tenant: testHarness.agent.agentDid.uri
          });

          // Verify the result.
          expect(did).to.have.property('uri');
          expect(did).to.have.property('document');
          expect(did).to.have.property('metadata');
        });

        it(`adds generated keys to the Agent's KeyManager`, async () => {
          // Generate a new DID.
          const did = await testHarness.agent.did.create({ method: 'jwk' });

          // Attempt to retrieve the DID's keys from the Agent's KeyManager.
          const signingMethod = await testHarness.agent.did.getSigningMethod({ didUri: did.uri });
          if (!signingMethod.publicKeyJwk) throw new Error('Public key not found'); // Type guard.
          const storedKeyUri = await testHarness.agent.keyManager.getKeyUri({ key: signingMethod.publicKeyJwk });
          const storedPublicKey = await testHarness.agent.keyManager.getPublicKey({ keyUri: storedKeyUri });

          // Verify the key was found.
          expect(storedPublicKey).to.exist;
          expect(storedPublicKey).to.have.property('kty', did.document.verificationMethod![0].publicKeyJwk!.kty);
          expect(storedPublicKey).to.have.property('crv', did.document.verificationMethod![0].publicKeyJwk!.crv);
          expect(storedPublicKey).to.have.property('x', did.document.verificationMethod![0].publicKeyJwk!.x);
        });

        it('creates DIDs under the tenant of the new DID, by default', async () => {
          // Generate a new DID.
          const did = await testHarness.agent.did.create({ method: 'jwk' });

          // Verify that the DID was NOT stored under the Agent's tenant.
          let storedDid = await testHarness.agent.did.get({ didUri: did.uri });
          expect(storedDid).to.not.exist;

          // Verify that the DID WAS stored under the new DID's tenant.
          storedDid = await testHarness.agent.did.get({ didUri: did.uri, tenant: did.uri });
          expect(storedDid).to.exist;
        });

        it('creates DIDs under the tenant of the specified DID', async () => {
          // Generate a new DID.
          const did = await testHarness.agent.did.create({
            method : 'jwk',
            tenant : testHarness.agent.agentDid.uri
          });

          // Verify that the DID WAS stored under the Agent's tenant.
          let storedDid = await testHarness.agent.did.get({ didUri: did.uri });
          expect(storedDid).to.exist;

          // Verify that the DID was NOT stored under the new DID's tenant.
          storedDid = await testHarness.agent.did.get({ didUri: did.uri, tenant: did.uri });
          expect(storedDid).to.not.exist;
        });

        it('throws an error if the DID method is an empty string', async () => {
          try {
            // @ts-expect-error because an empty method is intentionally specified to trigger the error.
            await testHarness.agent.did.create({ method: '' });
            expect.fail('Expected an error to be thrown');
          } catch (error: any) {
            expect(error.message).to.include('Method not supported');
          }
        });

        it('throws an error if the DID method is not supported', async () => {
          try {
            // @ts-expect-error because an unsupported method is intentionally specified to trigger the error.
            await testHarness.agent.did.create({ method: 'not-supported' });
            expect.fail('Expected an error to be thrown');
          } catch (error: any) {
            expect(error.message).to.include('Method not supported');
          }
        });
      });

      describe('delete()', () => {
        xit('should be implemented');
      });

      describe('export()', () => {
        xit('should be implemented');
      });

      describe('import()', () => {
        it('imports DID and private keys', async () => {
          // Generate a new DID.
          const did = await DidJwk.create();

          // Export the DID to a PortableDid object.
          const portableDid = await did.export();

          // Attempt to import the DID with Agent's DID API under the Agent's tenant.
          const importedDid = await testHarness.agent.did.import({
            portableDid,
            tenant: testHarness.agent.agentDid.uri
          });

          // Try to retrieve the DID from the AgentDidApi store to verify it was imported.
          const storedDid = await testHarness.agent.did.get({ didUri: importedDid.uri });

          if (storedDid === undefined) throw new Error('Type guard unexpectedly threw'); // Type guard.
          expect(storedDid.uri).to.equal(portableDid.uri);
          expect(storedDid.document).to.deep.equal(portableDid.document);
        });

        it('supports importing multiple DIDs to the same Identity/tenant', async () => {
          // Create and import the first DID.
          const did1 = await DidJwk.create();
          const did1Import = await testHarness.agent.did.import({
            portableDid : await did1.export(),
            tenant      : testHarness.agent.agentDid.uri
          });

          // Create and import a second DID.
          const did2 = await DidJwk.create();
          const did2Import = await testHarness.agent.did.import({
            portableDid : await did2.export(),
            tenant      : testHarness.agent.agentDid.uri
          });

          // Verify that DID 1 WAS stored under the Agent's tenant.
          let storedDid1 = await testHarness.agent.did.get({ didUri: did1Import.uri });
          expect(storedDid1).to.exist;
          expect(storedDid1?.uri).to.equal(did1.uri);

          // Verify that DID 2 WAS stored under the Agent's tenant.
          let storedDid2 = await testHarness.agent.did.get({ didUri: did2Import.uri });
          expect(storedDid2).to.exist;
          expect(storedDid2?.uri).to.equal(did2.uri);
        });

        it('does not mutate DID input during import', async () => {
          // Create did:jwk DID to use to attempt import.
          const bearerDid = await DidJwk.create();

          // Export the DID to a PortableDid object.
          const portableDid = await bearerDid.export();

          // Create a deep clone to use to check for side effects.
          const portableDidClone = structuredClone(portableDid);

          // Import the DID with Agent's DID API.
          await testHarness.agent.did.import({ portableDid });

          // Verify the input object was not mutated during import.
          expect(portableDid).to.deep.equal(portableDidClone);
        });

        it('imports DIDs under the tenant of the imported DID, by default', async () => {
          // Create did:jwk DID to use to attempt import.
          const did = await DidJwk.create();

          // Attempt to import the DID with Agent's DID API.
          const importedDid = await testHarness.agent.did.import({ portableDid: await did.export() });

          // Verify that the DID was NOT stored under the Agent's tenant.
          let storedDid = await testHarness.agent.did.get({ didUri: importedDid.uri });
          expect(storedDid).to.not.exist;

          // Verify that the DID WAS stored under the new DID's tenant.
          storedDid = await testHarness.agent.did.get({ didUri: importedDid.uri, tenant: importedDid.uri });
          expect(storedDid).to.exist;
        });

        it('imports DIDs under the tenant of the specified DID', async () => {
          // Create did:jwk DID to use to attempt import.
          const did = await DidJwk.create();

          // Attempt to import the DID with Agent's DID API.
          const importedDid = await testHarness.agent.did.import({
            portableDid : await did.export(),
            tenant      : testHarness.agent.agentDid.uri
          });

          // Verify that the DID was stored under the Agent's tenant.
          let storedDid = await testHarness.agent.did.get({ didUri: importedDid.uri });
          expect(storedDid).to.exist;

          // Verify that the DID was NOT stored under the new DID's tenant.
          storedDid = await testHarness.agent.did.get({ didUri: importedDid.uri, tenant: importedDid.uri });
          expect(storedDid).to.not.exist;
        });
      });

      describe('processRequest', () => {
        it('handles DID Create requests', async () => {
          const response = await testHarness.agent.did.processRequest({
            messageType   : DidInterface.Create,
            messageParams : {
              method: 'jwk'
            }
          });

          expect(response.ok).to.be.true;
          expect(response.status.code).to.equal(201);
          expect(response.result).to.have.property('uri');
          expect(response.result).to.have.property('document');
          expect(response.result).to.have.property('metadata');
        });

        it('returns an error response for unsupported DID Create method', async () => {
          const response = await testHarness.agent.did.processRequest({
            messageType   : DidInterface.Create,
            messageParams : {
              // @ts-expect-error because an unsupported method is intentionally specified to trigger the error.
              method: 'unsupported'
            }
          });

          expect(response.ok).to.be.false;
          expect(response.status.code).to.equal(500);
        });

        it('handles DID Resolve requests', async () => {
          // Generate a new DID.
          const did = await testHarness.agent.did.create({ method: 'jwk' });

          // Attempt to resolve the DID.
          const response = await testHarness.agent.did.processRequest({
            messageType   : DidInterface.Resolve,
            messageParams : {
              didUri: did.uri
            }
          });

          expect(response.ok).to.be.true;
          expect(response.status.code).to.equal(200);
          expect(response.result).to.have.property('didDocument');
          expect(response.result!.didDocument).to.have.property('id', did.uri);
          expect(response.result).to.have.property('didResolutionMetadata');
          expect(response.result).to.have.property('didDocumentMetadata');
        });

        it('returns a DID resolution error for unsupported DID Resolve method', async () => {
          const response = await testHarness.agent.did.processRequest({
            messageType   : DidInterface.Resolve,
            messageParams : {
              didUri: 'did:unsupported:abc123'
            }
          });

          expect(response.ok).to.be.true;
          expect(response.status.code).to.equal(200);
          expect(response.result).to.have.property('didDocument', null);
          expect(response.result).to.have.property('didResolutionMetadata');
          expect(response.result).to.have.property('didDocumentMetadata');
          expect(response.result!.didResolutionMetadata).to.have.property('error', 'methodNotSupported');
        });

        it('throws an error for unsupported request types', async () => {
          try {
            // @ts-expect-error because an unsupported message type is intentionally specified to trigger the error.
            await testHarness.agent.did.processRequest({ messageType: 'unsupported', messageParams: {} });
            expect.fail('Expected an error to be thrown');
          } catch (error: any) {
            expect(error.message).to.include('Unsupported request type');
          }
        });
      });

      describe('update()', () => {
        xit('should be implemented');
      });
    });
  });
});