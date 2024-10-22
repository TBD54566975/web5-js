import sinon from 'sinon';
import { expect } from 'chai';

import { TestAgent } from './utils/test-agent.js';
import { AgentIdentityApi } from '../src/identity-api.js';
import { PlatformAgentTestHarness } from '../src/test-harness.js';
import { PortableIdentity } from '../src/index.js';
import { BearerDid, PortableDid, UniversalResolver } from '@web5/dids';

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
        const testPortableDid: PortableDid = {
          uri      : 'did:dht:d71hju6wjeu5j7r5sbujqkubktds1kbtei8imkj859jr4hw77hdy',
          document : {
            id                 : 'did:dht:d71hju6wjeu5j7r5sbujqkubktds1kbtei8imkj859jr4hw77hdy',
            verificationMethod : [
              {
                id           : 'did:dht:d71hju6wjeu5j7r5sbujqkubktds1kbtei8imkj859jr4hw77hdy#0',
                type         : 'JsonWebKey',
                controller   : 'did:dht:d71hju6wjeu5j7r5sbujqkubktds1kbtei8imkj859jr4hw77hdy',
                publicKeyJwk : {
                  crv : 'Ed25519',
                  kty : 'OKP',
                  x   : 'H2XEz9RKJ7T0m7BmlyphVEdpKDFFT1WpJ9_STXKd7wY',
                  kid : '-2bXX6F3hvTHV5EBFX6oyKq11s7gtJdzUjjwdeUyBVA',
                  alg : 'EdDSA'
                }
              },
              {
                id           : 'did:dht:d71hju6wjeu5j7r5sbujqkubktds1kbtei8imkj859jr4hw77hdy#sig',
                type         : 'JsonWebKey',
                controller   : 'did:dht:d71hju6wjeu5j7r5sbujqkubktds1kbtei8imkj859jr4hw77hdy',
                publicKeyJwk : {
                  crv : 'Ed25519',
                  kty : 'OKP',
                  x   : 'T2rdfCxGubY_zta8Gy6SVxypcchfmZKJhbXB9Ia9xlg',
                  kid : 'Ogpmsy5VR3SET9WC0WZD9r5p1WAKdCt1fxT0GNSLE5c',
                  alg : 'EdDSA'
                }
              },
              {
                id           : 'did:dht:d71hju6wjeu5j7r5sbujqkubktds1kbtei8imkj859jr4hw77hdy#enc',
                type         : 'JsonWebKey',
                controller   : 'did:dht:d71hju6wjeu5j7r5sbujqkubktds1kbtei8imkj859jr4hw77hdy',
                publicKeyJwk : {
                  kty : 'EC',
                  crv : 'secp256k1',
                  x   : 'oTPWtNfN7e48p3n-VsoSp07kcHfCszSrJ1-qFx3diiI',
                  y   : '5KSDrAkg91yK19zxD6ESRPAI8v91F-QRXPbivZ-v-Ac',
                  kid : 'K0CBI00sEmYE6Av4PHqiwPNMzrBRA9dyIlzh1a9A2H8',
                  alg : 'ES256K'
                }
              }
            ],
            authentication: [
              'did:dht:d71hju6wjeu5j7r5sbujqkubktds1kbtei8imkj859jr4hw77hdy#0',
              'did:dht:d71hju6wjeu5j7r5sbujqkubktds1kbtei8imkj859jr4hw77hdy#sig'
            ],
            assertionMethod: [
              'did:dht:d71hju6wjeu5j7r5sbujqkubktds1kbtei8imkj859jr4hw77hdy#0',
              'did:dht:d71hju6wjeu5j7r5sbujqkubktds1kbtei8imkj859jr4hw77hdy#sig'
            ],
            capabilityDelegation: [
              'did:dht:d71hju6wjeu5j7r5sbujqkubktds1kbtei8imkj859jr4hw77hdy#0'
            ],
            capabilityInvocation: [
              'did:dht:d71hju6wjeu5j7r5sbujqkubktds1kbtei8imkj859jr4hw77hdy#0'
            ],
            keyAgreement: [
              'did:dht:d71hju6wjeu5j7r5sbujqkubktds1kbtei8imkj859jr4hw77hdy#enc'
            ],
            service: [
              {
                id              : 'did:dht:d71hju6wjeu5j7r5sbujqkubktds1kbtei8imkj859jr4hw77hdy#dwn',
                type            : 'DecentralizedWebNode',
                serviceEndpoint : [
                  'https://example.com/dwn'
                ],
                enc : '#enc',
                sig : '#sig'
              }
            ]
          },
          metadata: {
            published : true,
            versionId : '1729109527'
          },
          privateKeys: [
            {
              crv : 'Ed25519',
              d   : '7vRkinnXFRb2GkNVeY5yQ6TCnYwbtq9gJcbdqnzFR2o',
              kty : 'OKP',
              x   : 'H2XEz9RKJ7T0m7BmlyphVEdpKDFFT1WpJ9_STXKd7wY',
              kid : '-2bXX6F3hvTHV5EBFX6oyKq11s7gtJdzUjjwdeUyBVA',
              alg : 'EdDSA'
            },
            {
              crv : 'Ed25519',
              d   : 'YM-0lQkMc9mNr2NrBVMojpCG2MMAnYk6-4dwxlFeiuw',
              kty : 'OKP',
              x   : 'T2rdfCxGubY_zta8Gy6SVxypcchfmZKJhbXB9Ia9xlg',
              kid : 'Ogpmsy5VR3SET9WC0WZD9r5p1WAKdCt1fxT0GNSLE5c',
              alg : 'EdDSA'
            },
            {
              kty : 'EC',
              crv : 'secp256k1',
              d   : 'f4BngIzc_N-YDf04vXD5Ya-HdiVWB8Egk4QoSHKKJPg',
              x   : 'oTPWtNfN7e48p3n-VsoSp07kcHfCszSrJ1-qFx3diiI',
              y   : '5KSDrAkg91yK19zxD6ESRPAI8v91F-QRXPbivZ-v-Ac',
              kid : 'K0CBI00sEmYE6Av4PHqiwPNMzrBRA9dyIlzh1a9A2H8',
              alg : 'ES256K'
            }
          ]
        };

        beforeEach(async () => {
          // import the keys for the test portable DID
          await BearerDid.import({ keyManager: testHarness.agent.keyManager, portableDid: testPortableDid });
        });

        it('should set the DWN endpoints for a DID', async () => {
          // stub did.get to return the test DID
          sinon.stub(testHarness.agent.did, 'get').resolves(new BearerDid({ ...testPortableDid, keyManager: testHarness.agent.keyManager }));
          const updateSpy = sinon.stub(testHarness.agent.did, 'update').resolves();

          // set new endpoints
          const newEndpoints = ['https://example.com/dwn2'];
          await testHarness.agent.identity.setDwnEndpoints({ didUri: testPortableDid.uri, endpoints: newEndpoints });

          expect(updateSpy.calledOnce).to.be.true;
          // expect the updated DID to have the new DWN service
          expect(updateSpy.firstCall.args[0].portableDid.document.service).to.deep.equal([{
            id              : `${testPortableDid.uri}#dwn`,
            type            : 'DecentralizedWebNode',
            serviceEndpoint : newEndpoints,
            enc             : '#enc',
            sig             : '#sig'
          }]);
        });

        it('should throw an error if the service endpoints remain unchanged', async () => {
          // stub did.get to return the test DID
          sinon.stub(testHarness.agent.did, 'get').resolves(new BearerDid({ ...testPortableDid, keyManager: testHarness.agent.keyManager }));

          // set the same endpoints
          try {
            await testHarness.agent.identity.setDwnEndpoints({ didUri: testPortableDid.uri, endpoints: ['https://example.com/dwn'] });
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
          // stub the did.get to return a DID without any services
          const testPortableDidWithoutServices = { ...testPortableDid, document: { ...testPortableDid.document, service: undefined } };
          sinon.stub(testHarness.agent.did, 'get').resolves(new BearerDid({ ...testPortableDidWithoutServices, keyManager: testHarness.agent.keyManager }));
          sinon.stub(UniversalResolver.prototype, 'resolve').withArgs(testPortableDid.uri).resolves({ didDocument: testPortableDidWithoutServices.document, didDocumentMetadata: {}, didResolutionMetadata: {} });
          const updateSpy = sinon.stub(testHarness.agent.did, 'update').resolves();

          // control: get the service endpoints of the created DID, should fail
          try {
            await testHarness.agent.identity.getDwnEndpoints({ didUri: testPortableDid.uri });
            expect.fail('should have thrown an error');
          } catch(error: any) {
            expect(error.message).to.include('Failed to dereference');
          }

          // set new endpoints
          const newEndpoints = ['https://example.com/dwn2'];
          await testHarness.agent.identity.setDwnEndpoints({ didUri: testPortableDid.uri, endpoints: newEndpoints });

          expect(updateSpy.calledOnce).to.be.true;

          // expect the updated DID to have the new DWN service
          expect(updateSpy.firstCall.args[0].portableDid.document.service).to.deep.equal([{
            id              : 'dwn',
            type            : 'DecentralizedWebNode',
            serviceEndpoint : newEndpoints,
            enc             : '#enc',
            sig             : '#sig'
          }]);
        });

        it('should add a DWN service if one does not exist in the services list', async () => {
          // stub the did.get and resolver to return a DID with a different service
          const testPortableDidWithDifferentService = { ...testPortableDid, document: { ...testPortableDid.document, service: [{ id: 'other', type: 'Other', serviceEndpoint: ['https://example.com/other'] }] } };
          sinon.stub(testHarness.agent.did, 'get').resolves(new BearerDid({ ...testPortableDidWithDifferentService, keyManager: testHarness.agent.keyManager }));
          sinon.stub(UniversalResolver.prototype, 'resolve').withArgs(testPortableDid.uri).resolves({ didDocument: testPortableDidWithDifferentService.document, didDocumentMetadata: {}, didResolutionMetadata: {} });
          const updateSpy = sinon.stub(testHarness.agent.did, 'update').resolves();

          // control: get the service endpoints of the created DID, should fail
          try {
            await testHarness.agent.identity.getDwnEndpoints({ didUri: testPortableDidWithDifferentService.uri });
            expect.fail('should have thrown an error');
          } catch(error: any) {
            expect(error.message).to.include('Failed to dereference');
          }

          // set new endpoints
          const newEndpoints = ['https://example.com/dwn2'];
          await testHarness.agent.identity.setDwnEndpoints({ didUri: testPortableDidWithDifferentService.uri, endpoints: newEndpoints });

          // expect the updated DID to have the new DWN service as well as the existing service
          expect(updateSpy.calledOnce).to.be.true;
          expect(updateSpy.firstCall.args[0].portableDid.document.service).to.deep.equal([{
            id              : 'other',
            type            : 'Other',
            serviceEndpoint : ['https://example.com/other']
          }, {
            id              : 'dwn',
            type            : 'DecentralizedWebNode',
            serviceEndpoint : newEndpoints,
            enc             : '#enc',
            sig             : '#sig'
          }]);
        });
      });

      describe('setMetadataName', () => {
        it('should update the name of an Identity', async () => {
          const identity = await testHarness.agent.identity.create({
            metadata   : { name: 'Test Identity' },
            didMethod  : 'jwk',
            didOptions : {
              verificationMethods: [{
                algorithm: 'Ed25519'
              }]
            }
          });
          expect(identity.metadata.name).to.equal('Test Identity');

          // sanity fetch the identity
          let storedIdentity = await testHarness.agent.identity.get({ didUri: identity.did.uri });
          expect(storedIdentity).to.exist;
          expect(storedIdentity?.metadata.name).to.equal('Test Identity');

          // update the identity
          await testHarness.agent.identity.setMetadataName({ didUri: identity.did.uri, name: 'Updated Identity' });

          // fetch the updated identity
          storedIdentity = await testHarness.agent.identity.get({ didUri: identity.did.uri });
          expect(storedIdentity).to.exist;
          expect(storedIdentity?.metadata.name).to.equal('Updated Identity');
        });

        it('should throw if identity does not exist', async () => {
          try {
            await testHarness.agent.identity.setMetadataName({ didUri: 'did:method:xyz123', name: 'Updated Identity' });
            expect.fail('Expected an error to be thrown');
          } catch (error: any) {
            expect(error.message).to.include('AgentIdentityApi: Failed to set metadata name due to Identity not found');
          }
        });

        it('should throw if name is missing or empty', async () => {
          const storeSpy = sinon.spy(testHarness.agent.identity['_store'], 'set');
          const identity = await testHarness.agent.identity.create({
            metadata   : { name: 'Test Identity' },
            didMethod  : 'jwk',
            didOptions : {
              verificationMethods: [{
                algorithm: 'Ed25519'
              }]
            }
          });

          expect(storeSpy.callCount).to.equal(1);

          try {
            await testHarness.agent.identity.setMetadataName({ didUri: identity.did.uri, name: '' });
            expect.fail('Expected an error to be thrown');
          } catch (error: any) {
            expect(error.message).to.include('Failed to set metadata name due to missing name value');
          }

          try {
            await testHarness.agent.identity.setMetadataName({ didUri: identity.did.uri, name: undefined! });
            expect.fail('Expected an error to be thrown');
          } catch (error: any) {
            expect(error.message).to.include('Failed to set metadata name due to missing name value');
          }

          // call count should not have changed
          expect(storeSpy.callCount).to.equal(1);

          // sanity confirm the name did not change
          const storedIdentity = await testHarness.agent.identity.get({ didUri: identity.did.uri });
          expect(storedIdentity).to.exist;
          expect(storedIdentity?.metadata.name).to.equal('Test Identity');
        });

        it('should throw if the updated name is the same as the current name', async () => {
          const identity = await testHarness.agent.identity.create({
            metadata   : { name: 'Test Identity' },
            didMethod  : 'jwk',
            didOptions : {
              verificationMethods: [{
                algorithm: 'Ed25519'
              }]
            }
          });

          const storeSpy = sinon.spy(testHarness.agent.identity['_store'], 'set');

          try {
            await testHarness.agent.identity.setMetadataName({ didUri: identity.did.uri, name: 'Test Identity' });
            expect.fail('Expected an error to be thrown');
          } catch (error: any) {
            expect(error.message).to.include('AgentIdentityApi: No changes detected');
          }

          // confirm set has not been called
          expect(storeSpy.notCalled).to.be.true;

          // sanity update the name to something else
          await testHarness.agent.identity.setMetadataName({ didUri: identity.did.uri, name: 'Updated Identity' });

          // confirm set has been called
          expect(storeSpy.calledOnce).to.be.true;

          // confirm the name was updated
          const storedIdentity = await testHarness.agent.identity.get({ didUri: identity.did.uri });
          expect(storedIdentity).to.exist;
          expect(storedIdentity?.metadata.name).to.equal('Updated Identity');
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