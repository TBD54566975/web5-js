import sinon from 'sinon';
import { expect } from 'chai';

import type { SyncEngine } from '../src/types/sync.js';
import type { BearerIdentity } from '../src/bearer-identity.js';
import type { PortableIdentity } from '../src/types/identity.js';

import { randomUuid } from '@web5/crypto/utils';
import { AgentSyncApi } from '../src/sync-api.js';
import { TestAgent } from './utils/test-agent.js';
import { DwnInterface } from '../src/types/dwn.js';
import { testDwnUrl } from './utils/test-config.js';
import { SyncEngineLevel } from '../src/sync-engine-level.js';
import { ManagedAgentTestHarness } from '../src/test-harness.js';

let testDwnUrls: string[] = [testDwnUrl];

describe('SyncEngineLevel', () => {

  // describe('get agent', () => {
  //   it(`returns the 'agent' instance property`, async () => {
  //     // @ts-expect-error because we are only mocking a single property.
  //     const mockAgent: Web5ManagedAgent = {
  //       agentDid: 'did:method:abc123'
  //     };
  //     const mockSyncEngine: SyncEngine = {} as SyncEngine;
  //     const syncApi = new AgentSyncApi({ agent: mockAgent, syncEngine: mockSyncEngine });
  //     const agent = syncApi.agent;
  //     expect(agent).to.exist;
  //     expect(agent.agentDid).to.equal('did:method:abc123');
  //   });

  //   it(`throws an error if the 'agent' instance property is undefined`, () => {
  //     const mockSyncEngine: SyncEngine = {} as SyncEngine;
  //     const syncApi = new AgentSyncApi({ syncEngine: mockSyncEngine });
  //     expect(() =>
  //       syncApi.agent
  //     ).to.throw(Error, 'Unable to determine agent execution context');
  //   });
  // });

  describe('with Web5ManagedAgent', () => {
    let testHarness: ManagedAgentTestHarness;
    let syncEngine: SyncEngineLevel;
    let alice: BearerIdentity;
    let randomSchema: string;

    before(async () => {
      testHarness = await ManagedAgentTestHarness.setup({
        agentClass  : TestAgent,
        agentStores : 'dwn'
      });

      const syncStore = testHarness.syncStore;
      syncEngine = new SyncEngineLevel({ db: syncStore, agent: testHarness.agent });
      const syncApi = new AgentSyncApi({ syncEngine, agent: testHarness.agent });
      testHarness.agent.sync = syncApi;
    });

    beforeEach(async () => {
      await testHarness.clearStorage();
      await testHarness.createAgentDid();

      const testPortableIdentity: PortableIdentity = {
        portableDid: {
          uri      : 'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy',
          document : {
            id                 : 'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy',
            verificationMethod : [
              {
                id           : 'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy#0',
                type         : 'JsonWebKey',
                controller   : 'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy',
                publicKeyJwk : {
                  crv : 'Ed25519',
                  kty : 'OKP',
                  x   : 'mZXKvarfofrcrdTYzes2YneEsrbJFc1kE0O-d1cJPEw',
                  kid : 'EAlW6h08kqdLGEhR_o6hCnZpYpQ8QJavMp3g0BJ35IY',
                  alg : 'EdDSA',
                },
              },
              {
                id           : 'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy#sig',
                type         : 'JsonWebKey',
                controller   : 'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy',
                publicKeyJwk : {
                  crv : 'Ed25519',
                  kty : 'OKP',
                  x   : 'iIWijzQnfb_Jk4yRjISV6ci8EtyHn0fIxg0TVCh7wkE',
                  kid : '8QSlw4ct9taIgh23EUGLM0ELaukQ1VogIuBGrQ_UIsk',
                  alg : 'EdDSA',
                },
              },
              {
                id           : 'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy#enc',
                type         : 'JsonWebKey',
                controller   : 'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy',
                publicKeyJwk : {
                  kty : 'EC',
                  crv : 'secp256k1',
                  x   : 'P5FoqXk9W11i8FWyTpIvltAjV09FL9Q5o76wEHcxMtI',
                  y   : 'DgoLVlLKbjlaUja4RTjdxzqAy0ITOEFlCXGKSpu8XQs',
                  kid : 'hXXhIgfXRVIYqnKiX0DIL7ZGy0CBJrFQFIYxmRkAB-A',
                  alg : 'ES256K',
                },
              },
            ],
            authentication: [
              'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy#0',
              'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy#sig',
            ],
            assertionMethod: [
              'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy#0',
              'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy#sig',
            ],
            capabilityDelegation: [
              'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy#0',
            ],
            capabilityInvocation: [
              'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy#0',
            ],
            keyAgreement: [
              'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy#enc',
            ],
            service: [
              {
                id              : 'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy#dwn',
                type            : 'DecentralizedWebNode',
                serviceEndpoint : testDwnUrls,
                enc             : '#enc',
                sig             : '#sig',
              },
            ],
          },
          metadata: {
            published : true,
            versionId : '1708160454',
          },
          privateKeys: [
            {
              crv : 'Ed25519',
              d   : 'gXu7HmJgvZFWgNf_eqF-eDAFegd0OLe8elAIXXGMgoc',
              kty : 'OKP',
              x   : 'mZXKvarfofrcrdTYzes2YneEsrbJFc1kE0O-d1cJPEw',
              kid : 'EAlW6h08kqdLGEhR_o6hCnZpYpQ8QJavMp3g0BJ35IY',
              alg : 'EdDSA',
            },
            {
              crv : 'Ed25519',
              d   : 'SiUL1QDp6X2QnvJ1Q7hRlpo3ZhiVjRlvINocOzYPaBU',
              kty : 'OKP',
              x   : 'iIWijzQnfb_Jk4yRjISV6ci8EtyHn0fIxg0TVCh7wkE',
              kid : '8QSlw4ct9taIgh23EUGLM0ELaukQ1VogIuBGrQ_UIsk',
              alg : 'EdDSA',
            },
            {
              kty : 'EC',
              crv : 'secp256k1',
              d   : 'b2gb-OfB5X4G3xd16u19MXNkamDP5lsT6bVsDN4aeuY',
              x   : 'P5FoqXk9W11i8FWyTpIvltAjV09FL9Q5o76wEHcxMtI',
              y   : 'DgoLVlLKbjlaUja4RTjdxzqAy0ITOEFlCXGKSpu8XQs',
              kid : 'hXXhIgfXRVIYqnKiX0DIL7ZGy0CBJrFQFIYxmRkAB-A',
              alg : 'ES256K',
            },
          ],
        },
        metadata: {
          name   : 'Alice',
          tenant : 'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy',
          uri    : 'did:dht:ugkhixpk56o9izfp4ucc543scj5ajcis3rkh43yueq98qiaj8tgy'
        }
      };

      await testHarness.preloadResolverCache({
        didUri           : testPortableIdentity.portableDid.uri,
        resolutionResult : {
          didDocument           : testPortableIdentity.portableDid.document,
          didDocumentMetadata   : testPortableIdentity.portableDid.metadata,
          didResolutionMetadata : {}
        }
      });

      alice = await testHarness.agent.identity.import({
        portableIdentity: testPortableIdentity
      });

      randomSchema = randomUuid();
    });

    afterEach(async () => {
      await testHarness.clearStorage();
    });

    after(async () => {
      await testHarness.closeStorage();
    });

    it.skip('syncs multiple records in both directions', async () => {
      // create 3 local records.
      const localRecords: string[] = [];
      for (let i = 0; i < 3; i++) {
        const writeResponse = await testHarness.agent.dwn.processRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat : 'text/plain',
            schema     : randomSchema
          },
          dataStream: new Blob([`Hello, ${i}`])
        });

        localRecords.push((writeResponse.message!).recordId);
      }

      // create 3 remote records
      const remoteRecords: string[] = [];
      for (let i = 0; i < 3; i++) {
        let writeResponse = await testHarness.agent.dwn.sendRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat : 'text/plain',
            schema     : randomSchema
          },
          dataStream: new Blob([`Hello, ${i}`])
        });
        remoteRecords.push((writeResponse.message!).recordId);
      }

      // query local and check for only local records
      let localQueryResponse = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsQuery,
        messageParams : {
          filter: {
            dataFormat : 'text/plain',
            schema     : randomSchema
          }
        }
      });
      let localDwnQueryReply = localQueryResponse.reply;
      expect(localDwnQueryReply.status.code).to.equal(200);
      expect(localDwnQueryReply.entries).to.have.length(3);
      let localRecordsFromQuery = localDwnQueryReply.entries?.map(entry => entry.recordId);
      expect(localRecordsFromQuery).to.have.members(localRecords);

      // query remote and check for only remote records
      let remoteQueryResponse = await testHarness.agent.dwn.sendRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsQuery,
        messageParams : {
          filter: {
            dataFormat : 'text/plain',
            schema     : randomSchema
          }
        }
      });
      let remoteDwnQueryReply = remoteQueryResponse.reply;
      expect(remoteDwnQueryReply.status.code).to.equal(200);
      expect(remoteDwnQueryReply.entries).to.have.length(3);
      let remoteRecordsFromQuery = remoteDwnQueryReply.entries?.map(entry => entry.recordId);
      expect(remoteRecordsFromQuery).to.have.members(remoteRecords);

      // Register Alice's DID to be synchronized.
      await testHarness.agent.sync.registerIdentity({
        did: alice.did.uri
      });

      // Execute Sync to pull all records from Alice's remote DWN to Alice's local DWN.
      await syncEngine.push();
      await syncEngine.pull();

      // query local node to see all records
      localQueryResponse = await testHarness.agent.dwn.processRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsQuery,
        messageParams : {
          filter: {
            dataFormat : 'text/plain',
            schema     : randomSchema
          }
        }
      });
      localDwnQueryReply = localQueryResponse.reply;
      expect(localDwnQueryReply.status.code).to.equal(200);
      expect(localDwnQueryReply.entries).to.have.length(6);
      localRecordsFromQuery = localDwnQueryReply.entries?.map(entry => entry.recordId);
      expect(localRecordsFromQuery).to.have.members([...localRecords, ...remoteRecords]);

      // query remote node to see all results
      remoteQueryResponse = await testHarness.agent.dwn.sendRequest({
        author        : alice.did.uri,
        target        : alice.did.uri,
        messageType   : DwnInterface.RecordsQuery,
        messageParams : {
          filter: {
            dataFormat : 'text/plain',
            schema     : randomSchema
          }
        }
      });
      remoteDwnQueryReply = remoteQueryResponse.reply;
      expect(remoteDwnQueryReply.status.code).to.equal(200);
      expect(remoteDwnQueryReply.entries).to.have.length(6);
      remoteRecordsFromQuery = remoteDwnQueryReply.entries?.map(entry => entry.recordId);
      expect(remoteRecordsFromQuery).to.have.members([...localRecords, ...remoteRecords]);
    }).slow(600); // Yellow at 300ms, Red at 600ms.

    describe('pull()', () => {
      it('takes no action if no identities are registered', async () => {
        const didResolveSpy = sinon.spy(testHarness.agent.did, 'resolve');
        const sendDwnRequestSpy = sinon.spy(testHarness.agent.rpc, 'sendDwnRequest');

        await syncEngine.pull();

        // Verify DID resolution and DWN requests did not occur.
        expect(didResolveSpy.notCalled).to.be.true;
        expect(sendDwnRequestSpy.notCalled).to.be.true;

        didResolveSpy.restore();
        sendDwnRequestSpy.restore();
      });

      it.skip('synchronizes records for 1 identity from remove DWN to local DWN', async () => {
      // Write a test record to Alice's remote DWN.
        let writeResponse = await testHarness.agent.dwn.sendRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            dataFormat : 'text/plain',
            schema     : randomSchema
          },
          dataStream: new Blob(['Hello, world!'])
        });

        // Get the record ID of the test record.
        const testRecordId = writeResponse.message!.recordId;

        // Confirm the record does NOT exist on Alice's local DWN.
        let queryResponse = await testHarness.agent.dwn.processRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : {
            filter: {
              dataFormat : 'text/plain',
              schema     : randomSchema
            }
          }
        });
        let localDwnQueryReply = queryResponse.reply;
        expect(localDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
        expect(localDwnQueryReply.entries).to.have.length(0); // Record doesn't exist on local DWN.

        // Register Alice's DID to be synchronized.
        await testHarness.agent.sync.registerIdentity({
          did: alice.did.uri
        });

        // Execute Sync to pull all records from Alice's remote DWN to Alice's local DWN.
        await syncEngine.pull();

        // Confirm the record now DOES exist on Alice's local DWN.
        queryResponse = await testHarness.agent.dwn.processRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.RecordsQuery,
          messageParams : { filter: { recordId: testRecordId } }
        });
        localDwnQueryReply = queryResponse.reply;
        expect(localDwnQueryReply.status.code).to.equal(200); // Query was successfully executed.
        expect(localDwnQueryReply.entries).to.have.length(1); // Record does exist on local DWN.
      });
    });
  });
});