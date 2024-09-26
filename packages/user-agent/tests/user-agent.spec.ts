import type { BearerIdentity, PortableIdentity } from '@web5/agent';

import { expect } from 'chai';
import { DidDht } from '@web5/dids';
import { Convert } from '@web5/common';
import { DidInterface, DwnInterface, PlatformAgentTestHarness } from '@web5/agent';

import { testDwnUrl } from './utils/test-config.js';
import { Web5UserAgent } from '../src/user-agent.js';

// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;

let testDwnUrls: string[] = [testDwnUrl];

describe('Web5UserAgent', () => {

  describe('agentDid', () => {
    it('throws an error if accessed before the Agent is initialized', async () => {
      // @ts-expect-error - Initializing with empty object to test error.
      const userAgent = new Web5UserAgent({ didApi: {}, dwnApi: {}, identityApi: {}, keyManager: {}, permissionsApi: {}, syncApi: {} });
      try {
        userAgent.agentDid;
        throw new Error('Expected an error');
      } catch (error: any) {
        expect(error.message).to.include('"agentDid" property is not set');
      }
    });
  });

  describe('create()', () => {
    it('should create an instance with default parameters when none are provided', async () => {
      const userAgent = await Web5UserAgent.create({ dataPath: '__TESTDATA__/USERAGENT' });

      expect(userAgent).to.be.an.instanceof(Web5UserAgent);
      expect(userAgent.crypto).to.exist;
      expect(userAgent.did).to.exist;
      expect(userAgent.dwn).to.exist;
      expect(userAgent.identity).to.exist;
      expect(userAgent.keyManager).to.exist;
      expect(userAgent.rpc).to.exist;
      expect(userAgent.sync).to.exist;
      expect(userAgent.vault).to.exist;
    });
  });

  const agentStoreTypes = ['dwn', 'memory'] as const;
  agentStoreTypes.forEach((agentStoreType) => {

    describe(`with ${agentStoreType} data stores`, () => {
      let testHarness: PlatformAgentTestHarness;

      before(async () => {
        testHarness = await PlatformAgentTestHarness.setup({
          agentClass  : Web5UserAgent,
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

      describe('firstLaunch()', () => {
        it('returns true the first time the Identity Agent runs', async () => {
          const result = await testHarness.agent.firstLaunch();
          expect(result).to.be.true;
        });

        it('returns false after Identity Agent initialization', async () => {
          let result = await testHarness.agent.firstLaunch();
          expect(result).to.be.true;

          await testHarness.agent.initialize({ password: 'test' });

          result = await testHarness.agent.firstLaunch();
          expect(result).to.be.false;
        });
      });

      describe('initialize()', () => {
        it('generates and returns a 12-word mnenomic if one is not provided', async () => {
          // Initialize the vault.
          const generatedRecoveryPhrase = await testHarness.agent.initialize({
            password: 'dumbbell-krakatoa-ditty'
          });

          // Verify that the vault is initialized and is unlocked.
          expect(generatedRecoveryPhrase).to.be.a('string');
          if (typeof generatedRecoveryPhrase !== 'string') throw new Error('type guard');
          expect(generatedRecoveryPhrase.split(' ')).to.have.lengthOf(12);
        });

        it('accepts a recovery phrase', async () => {
          const predefinedRecoveryPhrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

          // Initialize the vault with a recovery phrase.
          const returnedRecoveryPhrase = await testHarness.agent.initialize({
            password       : 'dumbbell-krakatoa-ditty',
            recoveryPhrase : predefinedRecoveryPhrase
          });

          // Verify that the vault is initialized and is unlocked.
          expect(returnedRecoveryPhrase).to.equal(predefinedRecoveryPhrase);
        });
      });

      describe('processDidRequest()', () => {
        it('processes a DID Create request', async () => {
          const didCreateResponse = await testHarness.agent.processDidRequest({
            messageType   : DidInterface.Create,
            messageParams : { method: 'jwk' }
          });

          expect(didCreateResponse).to.exist;
          expect(didCreateResponse).to.have.property('ok', true);
          expect(didCreateResponse).to.have.property('status');
          expect(didCreateResponse.status).to.have.property('code', 201);
          expect(didCreateResponse.status).to.have.property('message', 'Created');
          expect(didCreateResponse).to.have.property('result');
          expect(didCreateResponse.result).to.have.property('uri');
          expect(didCreateResponse.result).to.have.property('document');
          expect(didCreateResponse.result).to.have.property('metadata');
        });

        it('processes a DID Resolve request', async () => {
          const didResolveResponse = await testHarness.agent.processDidRequest({
            messageType   : DidInterface.Resolve,
            messageParams : { didUri: testHarness.agent.agentDid.uri }
          });

          expect(didResolveResponse).to.exist;
          expect(didResolveResponse).to.have.property('ok', true);
          expect(didResolveResponse).to.have.property('status');
          expect(didResolveResponse.status).to.have.property('code', 200);
          expect(didResolveResponse.status).to.have.property('message', 'OK');
          expect(didResolveResponse).to.have.property('result');
          expect(didResolveResponse.result).to.have.property('didDocument');
          expect(didResolveResponse.result).to.have.property('didDocumentMetadata');
          expect(didResolveResponse.result).to.have.property('didResolutionMetadata');
        });
      });

      if (agentStoreType === 'dwn') {
        let alice: BearerIdentity;

        beforeEach(async () => {
          alice = await testHarness.agent.identity.create({
            metadata  : { name: 'Alice' },
            didMethod : 'jwk'
          });
        });

        describe('processDwnRequest()', () => {
          it('processes a Records Write request', async () => {
            // Create test data to write.
            const dataBytes = Convert.string('Hello, world!').toUint8Array();

            // Attempt to process the RecordsWrite
            let writeResponse = await testHarness.agent.processDwnRequest({
              author        : alice.did.uri,
              target        : alice.did.uri,
              messageType   : DwnInterface.RecordsWrite,
              messageParams : {
                dataFormat: 'text/plain'
              },
              dataStream: new Blob([dataBytes])
            });

            // Verify the response.
            expect(writeResponse).to.have.property('message');
            expect(writeResponse).to.have.property('messageCid');
            expect(writeResponse).to.have.property('reply');

            const writeMessage = writeResponse.message;
            expect(writeMessage).to.have.property('authorization');
            expect(writeMessage).to.have.property('descriptor');
            expect(writeMessage).to.have.property('recordId');

            const writeReply = writeResponse.reply;
            expect(writeReply).to.have.property('status');
            expect(writeReply.status.code).to.equal(202);
          });
        });

        describe('processVcRequest()', () => {
          it('throws an error', async () => {
            try {
              await testHarness.agent.processVcRequest({});
              throw new Error('Expected an error');
            } catch (error) {
              expect(error).to.have.property('message', 'Not implemented');
            }
          });
        });

        describe('sendDidRequest()', () => {
          it('throws an error', async () => {
            try {
              await testHarness.agent.sendDidRequest({
                messageType   : DidInterface.Create,
                messageParams : { method: 'jwk' }
              });
              throw new Error('Expected an error');
            } catch (error) {
              expect(error).to.have.property('message', 'Not implemented');
            }
          });
        });

        describe('sendDwnRequest()', () => {
          beforeEach(async () => {
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

            alice = await testHarness.agent.identity.import({
              portableIdentity: testPortableIdentity
            });

            // Ensure the DID is published to the DHT. This step is necessary while the DHT Gateways
            // operated by TBD are regularly restarted and DIDs are no longer persisted.
            await DidDht.publish({ did: alice.did });
          });

          it('processes a Records Write request', async () => {
            // Create test data to write.
            const dataBytes = Convert.string('Hello, world!').toUint8Array();

            // Attempt to process the RecordsWrite
            let writeResponse = await testHarness.agent.sendDwnRequest({
              author        : alice.did.uri,
              target        : alice.did.uri,
              messageType   : DwnInterface.RecordsWrite,
              messageParams : {
                dataFormat: 'text/plain'
              },
              dataStream: new Blob([dataBytes])
            });

            // Verify the response.
            expect(writeResponse).to.have.property('message');
            expect(writeResponse).to.have.property('messageCid');
            expect(writeResponse).to.have.property('reply');

            const writeMessage = writeResponse.message;
            expect(writeMessage).to.have.property('authorization');
            expect(writeMessage).to.have.property('descriptor');
            expect(writeMessage).to.have.property('recordId');

            const writeReply = writeResponse.reply;
            expect(writeReply).to.have.property('status');
            expect(writeReply.status.code).to.equal(202);
          });
        });

        describe('sendVcRequest()', () => {
          it('throws an error', async () => {
            try {
              await testHarness.agent.sendVcRequest({});
              throw new Error('Expected an error');
            } catch (error) {
              expect(error).to.have.property('message', 'Not implemented');
            }
          });
        });

        describe('subsequent launches', () => {
          it('can access stored identifiers after second launch', async () => {
            // First launch and initialization.
            await testHarness.agent.initialize({ password: 'test' });

            // Start the Agent, which will decrypt and load the Agent's DID from the vault.
            await testHarness.agent.start({ password: 'test' });

            // Create and persist a new Identity (with DID and Keys).
            const socialIdentity = await testHarness.agent.identity.create({
              metadata  : { name: 'Social' },
              didMethod : 'jwk'
            });

            // Simulate terminating and restarting an app.
            await testHarness.closeStorage();
            testHarness = await PlatformAgentTestHarness.setup({
              agentClass  : Web5UserAgent,
              agentStores : 'dwn'
            });
            await testHarness.agent.start({ password: 'test' });

            // Try to get the identity and verify it exists.
            const storedIdentity = await testHarness.agent.identity.get({
              didUri: socialIdentity.did.uri,
            });

            expect(storedIdentity).to.exist;
            expect(storedIdentity!.did).to.have.property('uri', socialIdentity.did.uri);
          });
        });
      }
    });
  });

});