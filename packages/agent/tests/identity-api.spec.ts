import sinon from 'sinon';
import { expect } from 'chai';

import { TestAgent } from './utils/test-agent.js';
import { AgentIdentityApi } from '../src/identity-api.js';
import { PlatformAgentTestHarness } from '../src/test-harness.js';
import { PortableIdentity } from '../src/index.js';
import { BearerDid, PortableDid } from '@web5/dids';

describe('AgentIdentityApi', () => {

  describe('constructor', () => {
    it('returns instance if no parameters are given', () => {
      expect(
        new AgentIdentityApi()
      ).to.not.throw;
    });
  });

  describe('get agent', () => {
    it(`returns the 'agent' instance property`, async () => {
      // we are only mocking
      const mockAgent: any = {
        agentDid: 'did:method:abc123'
      };
      const identityApi = new AgentIdentityApi({ agent: mockAgent });
      const agent = identityApi.agent;
      expect(agent).to.exist;
      expect(agent.agentDid).to.equal('did:method:abc123');
    });

    it(`throws an error if the 'agent' instance property is undefined`, () => {
      const identityApi = new AgentIdentityApi();
      expect(() =>
        identityApi.agent
      ).to.throw(Error, 'Unable to determine agent execution context');
    });
  });

  describe('get tenant', () => {
    it('should throw if no agent is set', async () => {
      const identityApi = new AgentIdentityApi();
      expect(() =>
        identityApi.tenant
      ).to.throw(Error, 'The agent must be set to perform tenant specific actions.');
    });

    it('should return the did of the agent as the tenant', async () => {
      const mockAgent: any = {
        agentDid: { uri: 'did:method:abc123' }
      };
      const identityApi = new AgentIdentityApi({ agent: mockAgent });
      expect(identityApi.tenant).to.equal('did:method:abc123');
    });
  });

  // Run tests for each supported data store type.
  const agentStoreTypes = ['dwn'] as const;
  // const agentStoreTypes = ['dwn', 'memory'] as const;
  // agentStoreTypes.forEach((agentStoreType) => {
  for (const agentStoreType of agentStoreTypes) {

    describe(`with ${agentStoreType} DID store`, () => {
      let testHarness: PlatformAgentTestHarness;

      before(async () => {
        testHarness = await PlatformAgentTestHarness.setup({
          agentClass  : TestAgent,
          agentStores : agentStoreType
        });
      });

      beforeEach(async () => {
        sinon.restore();
        await testHarness.clearStorage();
        await testHarness.createAgentDid();
      });

      after(async () => {
        sinon.restore();
        await testHarness.clearStorage();
        await testHarness.closeStorage();
      });

      describe('export', () => {
        it('should fail to export a DID that is not found', async () => {
          const identityApi = new AgentIdentityApi({ agent: testHarness.agent });
          try {
            await identityApi.export({ didUri: 'did:method:xyz123' });
            expect.fail('Expected an error to be thrown');
          } catch (error: any) {
            expect(error.message).to.include('AgentIdentityApi: Failed to export due to Identity not found');
          }
        });

        it('should export a DID', async () => {
          // Create a new Identity.
          const identity = await testHarness.agent.identity.create({
            didMethod : 'jwk',
            metadata  : { name: 'Test Identity' },
            store     : true
          });

          // Export the Identity.
          const exportedIdentity = await testHarness.agent.identity.export({ didUri: identity.did.uri });

          // create a synthetic PortableIdentity based on the returned BearerIdentity without calling the export function.
          const portableIdentity:PortableIdentity = {
            portableDid : { uri: identity.did.uri, document: identity.did.document, metadata: identity.did.metadata },
            metadata    : { ...identity.metadata },
          };

          // the exported DID comes with private key material
          // those are not exposed in the returned BearIdentity object, so we add them to the rest of the identity we are comparing
          portableIdentity.portableDid.privateKeys = exportedIdentity.portableDid.privateKeys;

          expect(exportedIdentity).to.deep.equal(portableIdentity);
        });
      });

      describe('create()', () => {
        it('creates and returns an Identity', async () => {

          // Generate a new Identity.
          const identity = await testHarness.agent.identity.create({
            metadata   : { name: 'Test Identity' },
            didMethod  : 'jwk',
            didOptions : {
              verificationMethods: [{
                algorithm: 'Ed25519'
              }]
            }
          });

          // Verify the result.
          expect(identity).to.have.property('did');
          expect(identity).to.have.property('metadata');
        });
      });

      describe('list()', () => {
        it('returns an array of all identities', async () => {
          // Create three new identities all under the Agent's tenant.
          const alice = await testHarness.agent.identity.create({
            didMethod : 'jwk',
            metadata  : { name: 'Alice' },
          });
          const bob = await testHarness.agent.identity.create({
            didMethod : 'jwk',
            metadata  : { name: 'Bob' },
          });
          const carol = await testHarness.agent.identity.create({
            didMethod : 'jwk',
            metadata  : { name: 'Carol' },
          });

          // List identities and verify the result.
          const storedIdentities = await testHarness.agent.identity.list();
          expect(storedIdentities).to.have.length(3);

          const createdIdentities = [alice.did.uri, bob.did.uri, carol.did.uri];
          for (const storedIdentity of storedIdentities) {
            expect(createdIdentities).to.include(storedIdentity.did.uri);
          }
        });

        it('returns an empty array if the store contains no Identities', async () => {
          // List identities and verify the result is empty.
          const storedIdentities = await testHarness.agent.identity.list();
          expect(storedIdentities).to.be.empty;
        });
      });

      describe('delete()', () => {
        it('deletes an Identity', async () => {
          // Create a new Identity.
          const identity = await testHarness.agent.identity.create({
            didMethod : 'jwk',
            metadata  : { name: 'Test Identity' },
            store     : true
          });

          // Verify that the Identity exists.
          let storedIdentity = await testHarness.agent.identity.get({ didUri: identity.did.uri });
          expect(storedIdentity).to.exist;
          expect(storedIdentity?.did.uri).to.equal(identity.did.uri);

          // Delete the Identity.
          await testHarness.agent.identity.delete({ didUri: identity.did.uri });

          // Verify that the Identity no longer exists.
          storedIdentity = await testHarness.agent.identity.get({ didUri: identity.did.uri });
          expect(storedIdentity).to.not.exist;

          // Verify that the DID still exists
          const storedDid = await testHarness.agent.did.get({ didUri: identity.did.uri });
          expect(storedDid).to.not.be.undefined;
          expect(storedDid!.uri).to.equal(identity.did.uri);
        });

        it('fails with not found error if the Identity does not exist', async () => {
          // Delete an Identity that does not exist.
          const didUri = 'did:method:xyz123';
          try {
            await testHarness.agent.identity.delete({ didUri });
            expect.fail('Expected an error to be thrown');
          } catch (error: any) {
            expect(error.message).to.include('AgentIdentityApi: Failed to purge due to Identity not found');
          }
        });

        it('fails with not found error if the Identity does not exist', async () => {
          // Delete an Identity that does not exist.
          const didUri = 'did:method:xyz123';
          try {
            await testHarness.agent.identity.delete({ didUri });
            expect.fail('Expected an error to be thrown');
          } catch (error: any) {
            expect(error.message).to.include('AgentIdentityApi: Failed to purge due to Identity not found');
          }
        });
      });

      describe('setDwnEndpoints()', () => {
        it('should set the DWN endpoints for a DID', async () => {
          const initialEndpoints = ['https://example.com/dwn'];
          // create a new identity
          const identity = await testHarness.agent.identity.create({
            didMethod  : 'dht',
            didOptions : {
              services: [
                {
                  id              : 'dwn',
                  type            : 'DecentralizedWebNode',
                  serviceEndpoint : initialEndpoints,
                  enc             : '#enc',
                  sig             : '#sig',
                }
              ],
              verificationMethods: [
                {
                  algorithm : 'Ed25519',
                  id        : 'sig',
                  purposes  : ['assertionMethod', 'authentication']
                },
                {
                  algorithm : 'secp256k1',
                  id        : 'enc',
                  purposes  : ['keyAgreement']
                }
              ]
            },
            metadata: { name: 'Alice' },
          });

          // control: get the service endpoints of the created DID
          const initialDwnEndpoints = await testHarness.agent.identity.getDwnEndpoints({ didUri: identity.did.uri });
          expect(initialDwnEndpoints).to.deep.equal(initialEndpoints);

          // set new endpoints
          const newEndpoints = ['https://example.com/dwn2'];
          await testHarness.agent.identity.setDwnEndpoints({ didUri: identity.did.uri, endpoints: newEndpoints });

          // get the service endpoints of the updated DID
          const updatedDwnEndpoints = await testHarness.agent.identity.getDwnEndpoints({ didUri: identity.did.uri });
          expect(updatedDwnEndpoints).to.deep.equal(newEndpoints);
        });

        it('should throw an error if the service endpoints remain unchanged', async () => {
          const initialEndpoints = ['https://example.com/dwn'];
          // create a new identity
          const identity = await testHarness.agent.identity.create({
            didMethod  : 'dht',
            didOptions : {
              services: [
                {
                  id              : 'dwn',
                  type            : 'DecentralizedWebNode',
                  serviceEndpoint : initialEndpoints,
                  enc             : '#enc',
                  sig             : '#sig',
                }
              ],
              verificationMethods: [
                {
                  algorithm : 'Ed25519',
                  id        : 'sig',
                  purposes  : ['assertionMethod', 'authentication']
                },
                {
                  algorithm : 'secp256k1',
                  id        : 'enc',
                  purposes  : ['keyAgreement']
                }
              ]
            },
            metadata: { name: 'Alice' },
          });

          // control: get the service endpoints of the created DID
          const initialDwnEndpoints = await testHarness.agent.identity.getDwnEndpoints({ didUri: identity.did.uri });
          expect(initialDwnEndpoints).to.deep.equal(initialEndpoints);

          // set the same endpoints
          try {
            await testHarness.agent.identity.setDwnEndpoints({ didUri: identity.did.uri, endpoints: initialEndpoints });
            expect.fail('Expected an error to be thrown');
          } catch (error: any) {
            expect(error.message).to.include('AgentDidApi: No changes detected');
          }
        });

        it('should throw an error if the DID is not found', async () => {
          try {
            await testHarness.agent.identity.setDwnEndpoints({ didUri: 'did:method:xyz123', endpoints: ['https://example.com/dwn'] });
            expect.fail('Expected an error to be thrown');
          } catch (error: any) {
            expect(error.message).to.include('AgentIdentityApi: Failed to set DWN endpoints due to DID not found');
          }
        });

        it('should add a DWN service if no services exist', async () => {
          // create a new identity without any DWN endpoints or services
          const identity = await testHarness.agent.identity.create({
            didMethod : 'dht',
            metadata  : { name: 'Alice' },
          });

          // control: get the service endpoints of the created DID, should fail
          try {
            await testHarness.agent.identity.getDwnEndpoints({ didUri: identity.did.uri });
            expect.fail('should have thrown an error');
          } catch(error: any) {
            expect(error.message).to.include('Failed to dereference');
          }

          // set new endpoints
          const newEndpoints = ['https://example.com/dwn2'];
          await testHarness.agent.identity.setDwnEndpoints({ didUri: identity.did.uri, endpoints: newEndpoints });

          // get the service endpoints of the updated DID
          const updatedDwnEndpoints = await testHarness.agent.identity.getDwnEndpoints({ didUri: identity.did.uri });
          expect(updatedDwnEndpoints).to.deep.equal(newEndpoints);
        });

        it('should add a DWN service if one does not exist in the services list', async () => {
          // create a new identity without a DWN service
          const identity = await testHarness.agent.identity.create({
            didMethod  : 'dht',
            didOptions : {
              services: [{
                id              : 'some-service', // non DWN service
                type            : 'SomeService',
                serviceEndpoint : ['https://example.com/some-service'],
              }]
            },
            metadata: { name: 'Alice' },
          });

          // control: get the service endpoints of the created DID, should fail
          try {
            await testHarness.agent.identity.getDwnEndpoints({ didUri: identity.did.uri });
            expect.fail('should have thrown an error');
          } catch(error: any) {
            expect(error.message).to.include('Failed to dereference');
          }

          // set new endpoints
          const newEndpoints = ['https://example.com/dwn2'];
          await testHarness.agent.identity.setDwnEndpoints({ didUri: identity.did.uri, endpoints: newEndpoints });

          // get the service endpoints of the updated DID
          const updatedDwnEndpoints = await testHarness.agent.identity.getDwnEndpoints({ didUri: identity.did.uri });
          expect(updatedDwnEndpoints).to.deep.equal(newEndpoints);
        });
      });

      describe('connectedIdentity', () => {
        it('returns a connected Identity', async () => {
          // create multiple identities, some that are connected, and some that are not
          // an identity is determined to be connected if it has a connectedDid set in its metadata

          // no identities exist, return undefined
          const noIdentities = await testHarness.agent.identity.connectedIdentity();
          expect(noIdentities).to.be.undefined;

          // Create a non-connected Identity.
          await testHarness.agent.identity.create({
            didMethod : 'jwk',
            metadata  : { name: 'Alice' },
          });

          // attempt to get a connected identity when none exist
          const notConnected = await testHarness.agent.identity.connectedIdentity();
          expect(notConnected).to.be.undefined;

          // Create a connected Identity.
          const connectedDid1 = await testHarness.agent.identity.create({
            didMethod : 'jwk',
            metadata  : { name: 'Bob', connectedDid: 'did:method:abc123' },
          });

          // Create another connected Identity.
          const connectedDid2 = await testHarness.agent.identity.create({
            didMethod : 'jwk',
            metadata  : { name: 'Carol', connectedDid: 'did:method:def456' },
          });

          // get the first connected identity
          const connectedIdentity = await testHarness.agent.identity.connectedIdentity();
          expect(connectedIdentity).to.exist;
          expect(connectedIdentity!.did.uri).to.equal(connectedDid1.did.uri);

          // get the first identity connected to a specific connectedDid
          const connectedIdentity2 = await testHarness.agent.identity.connectedIdentity({ connectedDid: 'did:method:def456' });
          expect(connectedIdentity2).to.exist;
          expect(connectedIdentity2!.did.uri).to.equal(connectedDid2.did.uri);
        });
      });
    });
  }
});