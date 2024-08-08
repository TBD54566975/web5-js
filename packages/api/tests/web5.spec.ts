import { expect } from 'chai';
import sinon from 'sinon';

import { Web5UserAgent } from '@web5/user-agent';
import {
  AgentIdentityApi,
  BearerIdentity,
  DwnInterface,
  DwnProtocolDefinition,
  DwnRegistrar,
  PlatformAgentTestHarness,
  WalletConnect,
} from '@web5/agent';

import { Web5 } from '../src/web5.js';
import { DwnInterfaceName, DwnMethodName, Jws, Time } from '@tbd54566975/dwn-sdk-js';
import { testDwnUrl } from './utils/test-config.js';
import { DidJwk } from '@web5/dids';

describe('web5 api', () => {
  describe('using Test Harness', () => {
    let testHarness: PlatformAgentTestHarness;

    before(async () => {
      testHarness = await PlatformAgentTestHarness.setup({
        agentClass  : Web5UserAgent,
        agentStores : 'memory',
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

    describe('connect()', () => {
      it('accepts an externally created DID with an external agent', async () => {
        const testIdentity = await testHarness.createIdentity({
          name        : 'Test',
          testDwnUrls : ['https://dwn.example.com']
        });

        // Call connect() with the custom agent.
        const { web5, did } = await Web5.connect({
          agent        : testHarness.agent,
          connectedDid : testIdentity.did.uri
        });

        expect(did).to.exist;
        expect(web5).to.exist;
        expect(did).to.equal(testIdentity.did.uri);
      });

      it('uses walletConnectOptions to connect to a DID and import the grants', async () => {
        // Create a new Identity.
        const alice = await testHarness.createIdentity({
          name        : 'Alice',
          testDwnUrls : [testDwnUrl]
        });

        // alice installs a protocol definition
        const protocol: DwnProtocolDefinition = {
          protocol  : 'https://example.com/test-protocol',
          published : true,
          types     : {
            foo : {},
            bar : {}
          },
          structure: {
            foo: {
              bar: {}
            }
          }
        };

        const { reply: protocolConfigReply, message: protocolConfigureMessage } = await testHarness.agent.dwn.processRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.ProtocolsConfigure,
          messageParams : {
            definition: protocol,
          },
        });
        expect(protocolConfigReply.status.code).to.equal(202);
        // create an identity for the app to use
        const app = await testHarness.agent.did.create({
          store  : false,
          method : 'jwk',
        });

        // create grants for the app to use
        const writeGrant = await testHarness.agent.dwn.createGrant({
          delegated   : true,
          grantedFrom : alice.did.uri,
          grantedTo   : app.uri,
          dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
          scope       : {
            interface : DwnInterfaceName.Records,
            method    : DwnMethodName.Write,
            protocol  : protocol.protocol,
          }
        });

        const readGrant = await testHarness.agent.dwn.createGrant({
          delegated   : true,
          grantedFrom : alice.did.uri,
          grantedTo   : app.uri,
          dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
          scope       : {
            interface : DwnInterfaceName.Records,
            method    : DwnMethodName.Read,
            protocol  : protocol.protocol,
          }
        });

        // write the grants to wallet
        const { reply: writeGrantReply } = await testHarness.agent.dwn.processRequest({
          author      : alice.did.uri,
          target      : alice.did.uri,
          messageType : DwnInterface.RecordsWrite,
          rawMessage  : writeGrant.recordsWrite.message,
          dataStream  : new Blob([ writeGrant.permissionGrantBytes ])
        });
        expect(writeGrantReply.status.code).to.equal(202);

        const { reply: readGrantReply } = await testHarness.agent.dwn.processRequest({
          author      : alice.did.uri,
          target      : alice.did.uri,
          messageType : DwnInterface.RecordsWrite,
          rawMessage  : readGrant.recordsWrite.message,
          dataStream  : new Blob([ readGrant.permissionGrantBytes ])
        });
        expect(readGrantReply.status.code).to.equal(202);

        // stub the walletInit method of the Connect placeholder class
        sinon.stub(WalletConnect, 'initClient').resolves({
          delegateGrants : [ writeGrant.dataEncodedMessage, readGrant.dataEncodedMessage ],
          delegateDid    : await app.export(),
          connectedDid   : alice.did.uri
        });

        const appTestHarness = await PlatformAgentTestHarness.setup({
          agentClass       : Web5UserAgent,
          agentStores      : 'memory',
          testDataLocation : '__TESTDATA__/web5-connect-app'
        });
        await appTestHarness.clearStorage();
        await appTestHarness.createAgentDid();

        // stub the create method of the Web5UserAgent to use the test harness agent
        sinon.stub(Web5UserAgent, 'create').resolves(appTestHarness.agent as Web5UserAgent);

        // connect to the app, the options don't matter because we're stubbing the initClient method
        const { web5, did, delegateDid } = await Web5.connect({
          walletConnectOptions: {
            connectServerUrl   : 'https://connect.example.com',
            walletUri          : 'https://wallet.example.com',
            validatePin        : async () => { return '1234'; },
            onWalletUriReady   : (_walletUri: string) => {},
            permissionRequests : []
          }
        });
        expect(web5).to.exist;
        expect(did).to.exist;
        expect(delegateDid).to.exist;
        expect(did).to.equal(alice.did.uri);
        expect(delegateDid).to.equal(app.uri);

        // in lieu of sync, we will process the grants and protocol definition on the local connected agent
        const { reply: localProtocolReply } = await web5.agent.processDwnRequest({
          author      : alice.did.uri,
          target      : alice.did.uri,
          messageType : DwnInterface.ProtocolsConfigure,
          rawMessage  : protocolConfigureMessage,
        });
        expect(localProtocolReply.status.code).to.equal(202);

        const { reply: grantWriteLocalReply } = await web5.agent.processDwnRequest({
          author      : alice.did.uri,
          target      : alice.did.uri,
          messageType : DwnInterface.RecordsWrite,
          rawMessage  : writeGrant.recordsWrite.message,
          dataStream  : new Blob([ writeGrant.permissionGrantBytes ])
        });
        expect(grantWriteLocalReply.status.code).to.equal(202);

        const { reply: grantReadLocalReply } = await web5.agent.processDwnRequest({
          author      : alice.did.uri,
          target      : alice.did.uri,
          messageType : DwnInterface.RecordsWrite,
          rawMessage  : readGrant.recordsWrite.message,
          dataStream  : new Blob([ readGrant.permissionGrantBytes ])
        });
        expect(grantReadLocalReply.status.code).to.equal(202);

        // use the grant to write a record
        const writeResult = await web5.dwn.records.write({
          data    : 'Hello, world!',
          message : {
            protocol     : protocol.protocol,
            protocolPath : 'foo',
          }
        });
        expect(writeResult.status.code).to.equal(202);
        expect(writeResult.record).to.exist;
        // test that the logical author is the connected DID and the signer is the impersonator DID
        expect(writeResult.record.author).to.equal(did);
        const writeSigner = Jws.getSignerDid(writeResult.record.authorization.signature.signatures[0]);
        expect(writeSigner).to.equal(delegateDid);

        const readResult = await web5.dwn.records.read({
          protocol : protocol.protocol,
          message  : {
            filter: { recordId: writeResult.record.id }
          }
        });
        expect(readResult.status.code).to.equal(200);
        expect(readResult.record).to.exist;
        // test that the logical author is the connected DID and the signer is the impersonator DID
        expect(readResult.record.author).to.equal(did);
        const readSigner = Jws.getSignerDid(readResult.record.authorization.signature.signatures[0]);
        expect(readSigner).to.equal(delegateDid);

        // attempt to query or delete, should fail because we did not grant query permissions
        try {
          await web5.dwn.records.query({
            protocol : protocol.protocol,
            message  : {
              filter: { protocol: protocol.protocol }
            }
          });

          expect.fail('Should have thrown an error');
        } catch(error:any) {
          expect(error.message).to.include('AgentDwnApi: No permissions found for RecordsQuery');
        }

        try {
          await web5.dwn.records.delete({
            protocol : protocol.protocol,
            message  : {
              recordId: writeResult.record.id
            }
          });

          expect.fail('Should have thrown an error');
        } catch(error:any) {
          expect(error.message).to.include('AgentDwnApi: No permissions found for RecordsDelete');
        }

        // grant query and delete permissions
        const queryGrant = await testHarness.agent.dwn.createGrant({
          delegated   : true,
          grantedFrom : alice.did.uri,
          grantedTo   : app.uri,
          dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
          scope       : {
            interface : DwnInterfaceName.Records,
            method    : DwnMethodName.Query,
            protocol  : protocol.protocol,
          }
        });

        const deleteGrant = await testHarness.agent.dwn.createGrant({
          delegated   : true,
          grantedFrom : alice.did.uri,
          grantedTo   : app.uri,
          dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
          scope       : {
            interface : DwnInterfaceName.Records,
            method    : DwnMethodName.Delete,
            protocol  : protocol.protocol,
          }
        });

        // write the grants to app as owner
        // this also clears the grants cache
        await web5.dwn.grants.processConnectedGrantsAsOwner([ queryGrant.dataEncodedMessage, deleteGrant.dataEncodedMessage ]);

        // attempt to delete using the grant
        const deleteResult = await web5.dwn.records.delete({
          protocol : protocol.protocol,
          message  : {
            recordId: writeResult.record.id
          }
        });
        expect(deleteResult.status.code).to.equal(202);

        // attempt to query using the grant
        const queryResult = await web5.dwn.records.query({
          protocol : protocol.protocol,
          message  : {
            filter: { protocol: protocol.protocol }
          }
        });
        expect(queryResult.status.code).to.equal(200);
        expect(queryResult.records).to.have.lengthOf(0); // record has been deleted

        // connecting a 2nd time will return the same connectedDID and delegatedDID
        const { did: did2, delegateDid: delegateDid2 } = await Web5.connect();
        expect(did2).to.equal(did);
        expect(delegateDid2).to.equal(delegateDid);

        // Close the app test harness storage.
        await appTestHarness.clearStorage();
        await appTestHarness.closeStorage();
      });

      it('cleans up imported Identity from walletConnectOptions flow if grants cannot be processed', async () => {
        const alice = await testHarness.createIdentity({
          name        : 'Alice',
          testDwnUrls : [testDwnUrl]
        });

        // alice installs a protocol definition
        const protocol: DwnProtocolDefinition = {
          protocol  : 'https://example.com/test-protocol',
          published : true,
          types     : {
            foo : {},
            bar : {}
          },
          structure: {
            foo: {
              bar: {}
            }
          }
        };

        const { reply: protocolConfigReply } = await testHarness.agent.dwn.processRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.ProtocolsConfigure,
          messageParams : {
            definition: protocol,
          },
        });
        expect(protocolConfigReply.status.code).to.equal(202);
        // create an identity for the app to use
        const app = await testHarness.agent.did.create({
          store  : false,
          method : 'jwk',
        });

        // create grants for the app to use
        const writeGrant = await testHarness.agent.dwn.createGrant({
          delegated   : true,
          grantedFrom : alice.did.uri,
          grantedTo   : app.uri,
          dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
          scope       : {
            interface : DwnInterfaceName.Records,
            method    : DwnMethodName.Write,
            protocol  : protocol.protocol,
          }
        });

        const readGrant = await testHarness.agent.dwn.createGrant({
          delegated   : true,
          grantedFrom : alice.did.uri,
          grantedTo   : app.uri,
          dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
          scope       : {
            interface : DwnInterfaceName.Records,
            method    : DwnMethodName.Read,
            protocol  : protocol.protocol,
          }
        });

        // write the grants to wallet
        const { reply: writeGrantReply } = await testHarness.agent.dwn.processRequest({
          author      : alice.did.uri,
          target      : alice.did.uri,
          messageType : DwnInterface.RecordsWrite,
          rawMessage  : writeGrant.recordsWrite.message,
          dataStream  : new Blob([ writeGrant.permissionGrantBytes ])
        });
        expect(writeGrantReply.status.code).to.equal(202);

        const { reply: readGrantReply } = await testHarness.agent.dwn.processRequest({
          author      : alice.did.uri,
          target      : alice.did.uri,
          messageType : DwnInterface.RecordsWrite,
          rawMessage  : readGrant.recordsWrite.message,
          dataStream  : new Blob([ readGrant.permissionGrantBytes ])
        });
        expect(readGrantReply.status.code).to.equal(202);

        // stub the walletInit method of the Connect placeholder class
        sinon.stub(WalletConnect, 'initClient').resolves({
          delegateGrants : [ writeGrant.dataEncodedMessage, readGrant.dataEncodedMessage ],
          delegateDid    : await app.export(),
          connectedDid   : alice.did.uri
        });

        const appTestHarness = await PlatformAgentTestHarness.setup({
          agentClass       : Web5UserAgent,
          agentStores      : 'memory',
          testDataLocation : '__TESTDATA__/web5-connect-app'
        });
        await appTestHarness.clearStorage();
        await appTestHarness.createAgentDid();


        // stub processDwnRequest to return a non 202 error code
        sinon.stub(appTestHarness.agent, 'processDwnRequest').resolves({
          messageCid : '',
          reply      : { status: { code: 400, detail: 'Bad Request' } }
        });

        // stub the create method of the Web5UserAgent to use the test harness agent
        sinon.stub(Web5UserAgent, 'create').resolves(appTestHarness.agent as Web5UserAgent);

        // stub console.error so that it doesn't log in the test output and use it as a spy confirming the error messages were logged
        const consoleSpy = sinon.stub(console, 'error').returns();

        try {
          // connect to the app, the options don't matter because we're stubbing the initClient method
          await Web5.connect({
            walletConnectOptions: {
              connectServerUrl   : 'https://connect.example.com',
              walletUri          : 'https://wallet.example.com',
              validatePin        : async () => { return '1234'; },
              onWalletUriReady   : (_walletUri: string) => {},
              permissionRequests : []
            }
          });

          expect.fail('Should have thrown an error');
        } catch(error:any) {
          expect(error.message).to.equal('Failed to connect to wallet: Failed to process delegated grant: Bad Request');
        }

        // because `processDwnRequest` is stubbed to return a 400, deleting the grants will return the same
        // we spy on console.error to check if the error messages are logged for the 2 failed grant deletions
        expect(consoleSpy.calledTwice, 'console.error called twice').to.be.true;

        // check that the Identity was deleted
        const appDid = await appTestHarness.agent.identity.list();
        expect(appDid).to.have.lengthOf(0);

        // close the app test harness storage
        await appTestHarness.clearStorage();
        await appTestHarness.closeStorage();
      });

      it('logs an error if there is a failure during cleanup of Identity information, but does not throw', async () => {
        // create a DID that is not stored in the agent
        const did = await DidJwk.create();
        const identity = new BearerIdentity({
          did,
          metadata: {
            name   : 'Test',
            uri    : did.uri,
            tenant : did.uri
          }
        });

        // stub console.error to avoid logging errors into the test output, use as spy to check if the error message is logged
        const consoleSpy = sinon.stub(console, 'error').returns();

        // call identityCleanup on a did that does not exist
        await Web5['cleanUpIdentity']({ userAgent: testHarness.agent as Web5UserAgent, identity });

        expect(consoleSpy.calledTwice, 'console.error called twice').to.be.true;
      });

      it('uses walletConnectOptions to connect to a DID and import the grants', async () => {
        // Create a new Identity.
        const alice = await testHarness.createIdentity({
          name        : 'Alice',
          testDwnUrls : [testDwnUrl]
        });

        // alice installs a protocol definition
        const protocol: DwnProtocolDefinition = {
          protocol  : 'https://example.com/test-protocol',
          published : true,
          types     : {
            foo : {},
            bar : {}
          },
          structure: {
            foo: {
              bar: {}
            }
          }
        };

        const { reply: protocolConfigReply, message: protocolConfigureMessage } = await testHarness.agent.dwn.processRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.ProtocolsConfigure,
          messageParams : {
            definition: protocol,
          },
        });
        expect(protocolConfigReply.status.code).to.equal(202);

        // create an identity for the app to use
        const app = await testHarness.agent.did.create({
          store  : false,
          method : 'jwk',
        });

        // create grants for the app to use
        const writeGrant = await testHarness.agent.dwn.createGrant({
          delegated   : true,
          grantedFrom : alice.did.uri,
          grantedTo   : app.uri,
          dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
          scope       : {
            interface : DwnInterfaceName.Records,
            method    : DwnMethodName.Write,
            protocol  : protocol.protocol,
          }
        });

        const readGrant = await testHarness.agent.dwn.createGrant({
          delegated   : true,
          grantedFrom : alice.did.uri,
          grantedTo   : app.uri,
          dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
          scope       : {
            interface : DwnInterfaceName.Records,
            method    : DwnMethodName.Read,
            protocol  : protocol.protocol,
          }
        });

        // write the grants to wallet
        const { reply: writeGrantReply } = await testHarness.agent.dwn.processRequest({
          author      : alice.did.uri,
          target      : alice.did.uri,
          messageType : DwnInterface.RecordsWrite,
          rawMessage  : writeGrant.recordsWrite.message,
          dataStream  : new Blob([ writeGrant.permissionGrantBytes ])
        });
        expect(writeGrantReply.status.code).to.equal(202);

        const { reply: readGrantReply } = await testHarness.agent.dwn.processRequest({
          author      : alice.did.uri,
          target      : alice.did.uri,
          messageType : DwnInterface.RecordsWrite,
          rawMessage  : readGrant.recordsWrite.message,
          dataStream  : new Blob([ readGrant.permissionGrantBytes ])
        });
        expect(readGrantReply.status.code).to.equal(202);

        // stub the walletInit method
        sinon.stub(WalletConnect, 'initClient').resolves({
          delegateGrants : [ writeGrant.dataEncodedMessage, readGrant.dataEncodedMessage ],
          delegateDid: await app.export(),
          connectedDid    : alice.did.uri
        });

        const appTestHarness = await PlatformAgentTestHarness.setup({
          agentClass       : Web5UserAgent,
          agentStores      : 'memory',
          testDataLocation : '__TESTDATA__/web5-connect-app'
        });
        await appTestHarness.clearStorage();
        await appTestHarness.createAgentDid();

        // stub the create method of the Web5UserAgent to use the test harness agent
        sinon.stub(Web5UserAgent, 'create').resolves(appTestHarness.agent as Web5UserAgent);

        // connect to the app, the options don't matter because we're stubbing the initClient method
        const { web5, did, signerDid } = await Web5.connect({
          walletConnectOptions: {
            connectServerUrl            : 'https://connect.example.com',
            walletUri                   : 'https://wallet.example.com',
            validatePin                 : async () => { return '1234'; },
            onWalletUriReady            : (_walletUri: string) => {},
            permissionRequests          : [],
          }
        });
        expect(web5).to.exist;
        expect(did).to.exist;
        expect(signerDid).to.exist;
        expect(did).to.equal(alice.did.uri);
        expect(signerDid).to.equal(app.uri);

        // in lieu of sync, we will process the grants and protocol definition on the local connected agent
        const { reply: localProtocolReply } = await web5.agent.processDwnRequest({
          author      : alice.did.uri,
          target      : alice.did.uri,
          messageType : DwnInterface.ProtocolsConfigure,
          rawMessage  : protocolConfigureMessage,
        });
        expect(localProtocolReply.status.code).to.equal(202);

        const { reply: grantWriteLocalReply } = await web5.agent.processDwnRequest({
          author      : alice.did.uri,
          target      : alice.did.uri,
          messageType : DwnInterface.RecordsWrite,
          rawMessage  : writeGrant.recordsWrite.message,
          dataStream  : new Blob([ writeGrant.permissionGrantBytes ])
        });
        expect(grantWriteLocalReply.status.code).to.equal(202);

        const { reply: grantReadLocalReply } = await web5.agent.processDwnRequest({
          author      : alice.did.uri,
          target      : alice.did.uri,
          messageType : DwnInterface.RecordsWrite,
          rawMessage  : readGrant.recordsWrite.message,
          dataStream  : new Blob([ readGrant.permissionGrantBytes ])
        });
        expect(grantReadLocalReply.status.code).to.equal(202);

        // use the grant to write a record
        const writeResult = await web5.dwn.records.write({
          data    : 'Hello, world!',
          message : {
            protocol     : protocol.protocol,
            protocolPath : 'foo',
          }
        });
        expect(writeResult.status.code).to.equal(202);
        expect(writeResult.record).to.exist;
        // test that the logical author is the connected DID and the signer is the impersonator DID
        expect(writeResult.record.author).to.equal(did);
        const writeSigner = Jws.getSignerDid(writeResult.record.authorization.signature.signatures[0]);
        expect(writeSigner).to.equal(signerDid);

        const readResult = await web5.dwn.records.read({
          protocol : protocol.protocol,
          message  : {
            filter: { recordId: writeResult.record.id }
          }
        });
        expect(readResult.status.code).to.equal(200);
        expect(readResult.record).to.exist;
        // test that the logical author is the connected DID and the signer is the impersonator DID
        expect(readResult.record.author).to.equal(did);
        const readSigner = Jws.getSignerDid(readResult.record.authorization.signature.signatures[0]);
        expect(readSigner).to.equal(signerDid);

        // attempt to query or delete, should fail because we did not grant query permissions
        try {
          await web5.dwn.records.query({
            protocol : protocol.protocol,
            message  : {
              filter: { protocol: protocol.protocol }
            }
          });

          expect.fail('Should have thrown an error');
        } catch(error:any) {
          expect(error.message).to.include('AgentDwnApi: No permissions found for RecordsQuery');
        }

        try {
          await web5.dwn.records.delete({
            protocol : protocol.protocol,
            message  : {
              recordId: writeResult.record.id
            }
          });

          expect.fail('Should have thrown an error');
        } catch(error:any) {
          expect(error.message).to.include('AgentDwnApi: No permissions found for RecordsDelete');
        }

        // grant query and delete permissions
        const queryGrant = await testHarness.agent.dwn.createGrant({
          delegated   : true,
          grantedFrom : alice.did.uri,
          grantedTo   : app.uri,
          dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
          scope       : {
            interface : DwnInterfaceName.Records,
            method    : DwnMethodName.Query,
            protocol  : protocol.protocol,
          }
        });

        const deleteGrant = await testHarness.agent.dwn.createGrant({
          delegated   : true,
          grantedFrom : alice.did.uri,
          grantedTo   : app.uri,
          dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
          scope       : {
            interface : DwnInterfaceName.Records,
            method    : DwnMethodName.Delete,
            protocol  : protocol.protocol,
          }
        });

        // write the grants to app as owner
        // this also clears the grants cache
        await web5.dwn.grants.processConnectedGrantsAsOwner([ queryGrant.dataEncodedMessage, deleteGrant.dataEncodedMessage ]);

        // attempt to delete using the grant
        const deleteResult = await web5.dwn.records.delete({
          protocol : protocol.protocol,
          message  : {
            recordId: writeResult.record.id
          }
        });
        expect(deleteResult.status.code).to.equal(202);

        // attempt to query using the grant
        const queryResult = await web5.dwn.records.query({
          protocol : protocol.protocol,
          message  : {
            filter: { protocol: protocol.protocol }
          }
        });
        expect(queryResult.status.code).to.equal(200);
        expect(queryResult.records).to.have.lengthOf(0); // record has been deleted

        // Close the app test harness storage.
        await appTestHarness.clearStorage();
        await appTestHarness.closeStorage();
      });

      it('cleans up imported Identity from walletConnectOptions flow if grants cannot be processed', async () => {
        const alice = await testHarness.createIdentity({
          name        : 'Alice',
          testDwnUrls : [testDwnUrl]
        });

        // alice installs a protocol definition
        const protocol: DwnProtocolDefinition = {
          protocol  : 'https://example.com/test-protocol',
          published : true,
          types     : {
            foo : {},
            bar : {}
          },
          structure: {
            foo: {
              bar: {}
            }
          }
        };

        const { reply: protocolConfigReply } = await testHarness.agent.dwn.processRequest({
          author        : alice.did.uri,
          target        : alice.did.uri,
          messageType   : DwnInterface.ProtocolsConfigure,
          messageParams : {
            definition: protocol,
          },
        });
        expect(protocolConfigReply.status.code).to.equal(202);
        // create an identity for the app to use
        const app = await testHarness.agent.did.create({
          store  : false,
          method : 'jwk',
        });

        // create grants for the app to use
        const writeGrant = await testHarness.agent.dwn.createGrant({
          delegated   : true,
          grantedFrom : alice.did.uri,
          grantedTo   : app.uri,
          dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
          scope       : {
            interface : DwnInterfaceName.Records,
            method    : DwnMethodName.Write,
            protocol  : protocol.protocol,
          }
        });

        const readGrant = await testHarness.agent.dwn.createGrant({
          delegated   : true,
          grantedFrom : alice.did.uri,
          grantedTo   : app.uri,
          dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
          scope       : {
            interface : DwnInterfaceName.Records,
            method    : DwnMethodName.Read,
            protocol  : protocol.protocol,
          }
        });

        // write the grants to wallet
        const { reply: writeGrantReply } = await testHarness.agent.dwn.processRequest({
          author      : alice.did.uri,
          target      : alice.did.uri,
          messageType : DwnInterface.RecordsWrite,
          rawMessage  : writeGrant.recordsWrite.message,
          dataStream  : new Blob([ writeGrant.permissionGrantBytes ])
        });
        expect(writeGrantReply.status.code).to.equal(202);

        const { reply: readGrantReply } = await testHarness.agent.dwn.processRequest({
          author      : alice.did.uri,
          target      : alice.did.uri,
          messageType : DwnInterface.RecordsWrite,
          rawMessage  : readGrant.recordsWrite.message,
          dataStream  : new Blob([ readGrant.permissionGrantBytes ])
        });
        expect(readGrantReply.status.code).to.equal(202);

        // stub the walletInit method of the Connect placeholder class
        sinon.stub(WalletConnect, 'initClient').resolves({
          delegateGrants : [ writeGrant.dataEncodedMessage, readGrant.dataEncodedMessage ],
          delegateDid     : await app.export(),
          connectedDid    : alice.did.uri
        });

        const appTestHarness = await PlatformAgentTestHarness.setup({
          agentClass       : Web5UserAgent,
          agentStores      : 'memory',
          testDataLocation : '__TESTDATA__/web5-connect-app'
        });
        await appTestHarness.clearStorage();
        await appTestHarness.createAgentDid();


        // stub processDwnRequest to return a non 202 error code
        sinon.stub(appTestHarness.agent, 'processDwnRequest').resolves({
          messageCid : '',
          reply      : { status: { code: 400, detail: 'Bad Request' } }
        });

        // stub the create method of the Web5UserAgent to use the test harness agent
        sinon.stub(Web5UserAgent, 'create').resolves(appTestHarness.agent as Web5UserAgent);

        // stub console.error so that it doesn't log in the test output and use it as a spy confirming the error messages were logged
        const consoleSpy = sinon.stub(console, 'error').returns();

        try {
          // connect to the app, the options don't matter because we're stubbing the initClient method
          await Web5.connect({
            walletConnectOptions: {
              connectServerUrl            : 'https://connect.example.com',
              walletUri                   : 'https://wallet.example.com',
              validatePin                 : async () => { return '1234'; },
              onWalletUriReady            : (_walletUri: string) => {},
              permissionRequests          : []
            }
          });

          expect.fail('Should have thrown an error');
        } catch(error:any) {
          expect(error.message).to.equal('Failed to connect to wallet: Failed to process delegated grant: Bad Request');
        }

        // because `processDwnRequest` is stubbed to return a 400, deleting the grants will return the same
        // we spy on console.error to check if the error messages are logged for the 2 failed grant deletions
        expect(consoleSpy.calledTwice, 'console.error called twice').to.be.true;

        // check that the Identity was deleted
        const appDid = await appTestHarness.agent.identity.list();
        expect(appDid).to.have.lengthOf(0);

        // close the app test harness storage
        await appTestHarness.clearStorage();
        await appTestHarness.closeStorage();
      });

      it('logs an error if there is a failure during cleanup of Identity information, but does not throw', async () => {
        // create a DID that is not stored in the agent
        const did = await DidJwk.create();
        const identity = new BearerIdentity({
          did,
          metadata: {
            name   : 'Test',
            uri    : did.uri,
            tenant : did.uri
          }
        });

        // stub console.error to avoid logging errors into the test output, use as spy to check if the error message is logged
        const consoleSpy = sinon.stub(console, 'error').returns();

        // call identityCleanup on a did that does not exist
        await Web5['cleanUpIdentity']({ userAgent: testHarness.agent as Web5UserAgent, identity });

        expect(consoleSpy.calledTwice, 'console.error called twice').to.be.true;
      });
    });

    describe('constructor', () => {
      it('instantiates Web5 API with provided Web5Agent and connectedDid', async () => {
        // Create a new Identity.
        const socialIdentity = await testHarness.agent.identity.create({
          metadata  : { name: 'Social' },
          didMethod : 'jwk',
        });

        // Instantiates Web5 instance with test agent and new Identity's DID.
        const web5 = new Web5({
          agent        : testHarness.agent,
          connectedDid : socialIdentity.did.uri,
        });
        expect(web5).to.exist;
        expect(web5).to.have.property('did');
        expect(web5).to.have.property('dwn');
        expect(web5).to.have.property('vc');
      });

      it('supports a single agent with multiple Web5 instances and different DIDs', async () => {
        // Create two identities, each of which is stored in a new tenant.
        const careerIdentity = await testHarness.agent.identity.create({
          metadata  : { name: 'Social' },
          didMethod : 'jwk',
        });
        const socialIdentity = await testHarness.agent.identity.create({
          metadata  : { name: 'Social' },
          didMethod : 'jwk',
        });

        // Instantiate a Web5 instance with the "Career" Identity, write a record, and verify the result.
        const web5Career = new Web5({
          agent        : testHarness.agent,
          connectedDid : careerIdentity.did.uri,
        });
        expect(web5Career).to.exist;

        // Instantiate a Web5 instance with the "Social" Identity, write a record, and verify the result.
        const web5Social = new Web5({
          agent        : testHarness.agent,
          connectedDid : socialIdentity.did.uri,
        });
        expect(web5Social).to.exist;
      });
    });

    describe('scenarios', () => {
      it('writes records with multiple identities under management', async () => {
        // First launch and initialization.
        await testHarness.agent.initialize({ password: 'test' });

        // Start the Agent, which will decrypt and load the Agent's DID from the vault.
        await testHarness.agent.start({ password: 'test' });

        // Create two identities, each of which is stored in a new tenant.
        const careerIdentity = await testHarness.agent.identity.create({
          metadata  : { name: 'Social' },
          didMethod : 'jwk',
        });
        const socialIdentity = await testHarness.agent.identity.create({
          metadata  : { name: 'Social' },
          didMethod : 'jwk',
        });

        // Instantiate a Web5 instance with the "Career" Identity, write a record, and verify the result.
        const web5Career = new Web5({
          agent        : testHarness.agent,
          connectedDid : careerIdentity.did.uri,
        });
        const careerResult = await web5Career.dwn.records.write({
          data    : 'Hello, world!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain',
          },
        });
        expect(careerResult.status.code).to.equal(202);
        expect(careerResult.record).to.exist;
        expect(careerResult.record?.author).to.equal(careerIdentity.did.uri);
        expect(await careerResult.record?.data.text()).to.equal(
          'Hello, world!'
        );

        // Instantiate a Web5 instance with the "Social" Identity, write a record, and verify the result.
        const web5Social = new Web5({
          agent        : testHarness.agent,
          connectedDid : socialIdentity.did.uri,
        });
        const socialResult = await web5Social.dwn.records.write({
          data    : 'Hello, everyone!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain',
          },
        });
        expect(socialResult.status.code).to.equal(202);
        expect(socialResult.record).to.exist;
        expect(socialResult.record?.author).to.equal(socialIdentity.did.uri);
        expect(await socialResult.record?.data.text()).to.equal(
          'Hello, everyone!'
        );
      });
    });
  });

  describe('connect()', () => {
    let testHarness: PlatformAgentTestHarness;

    before(async () => {
      testHarness = await PlatformAgentTestHarness.setup({
        agentClass  : Web5UserAgent,
        agentStores : 'memory',
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

    it('uses Web5UserAgent, by default', async () => {
      // stub the create method of the Web5UserAgent to use the test harness agent
      // this avoids DB locks when the agent is created twice
      sinon.stub(Web5UserAgent, 'create').resolves(testHarness.agent as Web5UserAgent);

      const { web5, recoveryPhrase, did } = await Web5.connect();
      expect(web5).to.exist;
      expect(web5.agent).to.be.instanceOf(Web5UserAgent);
      // Verify recovery phrase is a 12-word string.
      expect(recoveryPhrase).to.be.a('string');
      expect(recoveryPhrase.split(' ')).to.have.lengthOf(12);

      // if called again, the same DID is returned, and the recovery phrase is not regenerated
      const { recoveryPhrase: recoveryPhraseConnect2, did: didConnect2 } = await Web5.connect();
      expect(recoveryPhraseConnect2).to.be.undefined;
      expect(didConnect2).to.equal(did);
    });

    it('accepts an externally created DID', async () => {
      const walletConnectSpy = sinon.spy(WalletConnect, 'initClient');

      const testIdentity = await testHarness.createIdentity({
        name        : 'Test',
        testDwnUrls : ['https://dwn.example.com'],
      });

      // Call connect() with the custom agent.
      const { web5, did } = await Web5.connect({
        agent        : testHarness.agent,
        connectedDid : testIdentity.did.uri,
      });

      expect(did).to.exist;
      expect(web5).to.exist;
      expect(walletConnectSpy.called).to.be.false;
    });

    it('creates an identity using the provided techPreview dwnEndpoints', async () => {
      sinon
        .stub(Web5UserAgent, 'create')
        .resolves(testHarness.agent as Web5UserAgent);
      const walletConnectSpy = sinon.spy(WalletConnect, 'initClient');
      const identityApiSpy = sinon.spy(AgentIdentityApi.prototype, 'create');
      const { web5, did } = await Web5.connect({
        techPreview: { dwnEndpoints: ['https://dwn.example.com/preview'] },
      });
      expect(web5).to.exist;
      expect(did).to.exist;

      expect(identityApiSpy.calledOnce, 'identityApiSpy called').to.be.true;
      const serviceEndpoints = (
        identityApiSpy.firstCall.args[0].didOptions as any
      ).services[0].serviceEndpoint;
      expect(serviceEndpoints).to.deep.equal([
        'https://dwn.example.com/preview',
      ]);
      expect(walletConnectSpy.called).to.be.false;
    });

    it('creates an identity using the provided didCreateOptions dwnEndpoints', async () => {
      sinon
        .stub(Web5UserAgent, 'create')
        .resolves(testHarness.agent as Web5UserAgent);
      const identityApiSpy = sinon.spy(AgentIdentityApi.prototype, 'create');
      const walletConnectSpy = sinon.spy(WalletConnect, 'initClient');
      const { web5, did } = await Web5.connect({
        didCreateOptions: { dwnEndpoints: ['https://dwn.example.com'] },
      });
      expect(web5).to.exist;
      expect(did).to.exist;

      expect(identityApiSpy.calledOnce, 'identityApiSpy called').to.be.true;
      const serviceEndpoints = (
        identityApiSpy.firstCall.args[0].didOptions as any
      ).services[0].serviceEndpoint;
      expect(serviceEndpoints).to.deep.equal(['https://dwn.example.com']);
      expect(walletConnectSpy.called).to.be.false;
    });

    it('defaults to the first identity if multiple identities exist', async () => {
      // scenario: For some reason more than one identity exists when attempting to re-connect to `Web5`
      // the first identity in the array should be the one selected
      // TODO: this has happened due to a race condition somewhere. Dig into this issue and implement a better way to select/manage DIDs when using `Web5.connect()`

      // create an identity by connecting
      sinon.stub(Web5UserAgent, 'create').resolves(testHarness.agent as Web5UserAgent);
      const { web5, did } = await Web5.connect({ techPreview: { dwnEndpoints: [ testDwnUrl ] }});
      expect(web5).to.exist;
      expect(did).to.exist;

      // create a second identity
      await testHarness.agent.identity.create({
        didMethod : 'jwk',
        metadata  : { name: 'Second' }
      });

      // connect again
      const { did: did2 } = await Web5.connect();
      expect(did2).to.equal(did);
    });

    it('defaults to `https://dwn.tbddev.org/beta` as the single DWN Service endpoint if non is provided', async () => {
      sinon
        .stub(Web5UserAgent, 'create')
        .resolves(testHarness.agent as Web5UserAgent);
      const identityApiSpy = sinon.spy(AgentIdentityApi.prototype, 'create');
      const { web5, did } = await Web5.connect();
      expect(web5).to.exist;
      expect(did).to.exist;

      expect(identityApiSpy.calledOnce, 'identityApiSpy called').to.be.true;
      const serviceEndpoints = (
        identityApiSpy.firstCall.args[0].didOptions as any
      ).services[0].serviceEndpoint;
      expect(serviceEndpoints).to.deep.equal(['https://dwn.tbddev.org/beta']);
    });

    describe('registration', () => {
      it('should call onSuccess if registration is successful', async () => {
        sinon
          .stub(Web5UserAgent, 'create')
          .resolves(testHarness.agent as Web5UserAgent);
        const serverInfoStub = sinon
          .stub(testHarness.agent.rpc, 'getServerInfo')
          .resolves({
            registrationRequirements : ['terms-of-service'],
            maxFileSize              : 10000,
            webSocketSupport         : true,
          });

        // stub a successful registration
        const registerStub = sinon
          .stub(DwnRegistrar, 'registerTenant')
          .resolves();

        const registration = {
          onSuccess : () => {},
          onFailure : () => {},
        };

        const registerSuccessSpy = sinon.spy(registration, 'onSuccess');
        const registerFailureSpy = sinon.spy(registration, 'onFailure');

        const { web5, did } = await Web5.connect({
          registration,
          didCreateOptions: {
            dwnEndpoints: [
              'https://dwn.example.com',
              'https://dwn.production.com/',
            ],
          },
        });
        expect(web5).to.exist;
        expect(did).to.exist;

        // Success should be called, and failure should not
        expect(registerFailureSpy.notCalled, 'onFailure not called').to.be.true;
        expect(registerSuccessSpy.calledOnce, 'onSuccess called').to.be.true;

        // Expect getServerInfo and registerTenant to be called.
        expect(serverInfoStub.calledTwice, 'getServerInfo called').to.be.true; // once per dwnEndpoint
        expect(registerStub.callCount, 'registerTenant called').to.equal(4); // called twice for each dwnEndpoint
      });

      it('should call onFailure if the registration attempts fail', async () => {
        sinon
          .stub(Web5UserAgent, 'create')
          .resolves(testHarness.agent as Web5UserAgent);
        const serverInfoStub = sinon
          .stub(testHarness.agent.rpc, 'getServerInfo')
          .resolves({
            registrationRequirements : ['terms-of-service'],
            maxFileSize              : 10000,
            webSocketSupport         : true,
          });

        // stub a successful registration
        const registerStub = sinon
          .stub(DwnRegistrar, 'registerTenant')
          .rejects();

        const registration = {
          onSuccess : () => {},
          onFailure : () => {},
        };

        const registerSuccessSpy = sinon.spy(registration, 'onSuccess');
        const registerFailureSpy = sinon.spy(registration, 'onFailure');

        const { web5, did } = await Web5.connect({
          registration,
          didCreateOptions: {
            dwnEndpoints: [
              'https://dwn.example.com',
              'https://dwn.production.com/',
            ],
          },
        });
        expect(web5).to.exist;
        expect(did).to.exist;

        // failure should be called, and success should not
        expect(registerSuccessSpy.notCalled, 'onSuccess not called').to.be.true;
        expect(registerFailureSpy.calledOnce, 'onFailure called').to.be.true;

        // Expect getServerInfo and registerTenant to be called.
        expect(serverInfoStub.calledOnce, 'getServerInfo called').to.be.true; // only called once before registration fails
        expect(registerStub.callCount, 'registerTenant called').to.equal(1); // called once and fails
      });

      it('should not attempt registration if the server does not require it', async () => {
        sinon
          .stub(Web5UserAgent, 'create')
          .resolves(testHarness.agent as Web5UserAgent);
        const serverInfoStub = sinon
          .stub(testHarness.agent.rpc, 'getServerInfo')
          .resolves({
            registrationRequirements : [], // no registration requirements
            maxFileSize              : 10000,
            webSocketSupport         : true,
          });

        // stub a successful registration
        const registerStub = sinon
          .stub(DwnRegistrar, 'registerTenant')
          .resolves();

        const registration = {
          onSuccess : () => {},
          onFailure : () => {},
        };

        const registerSuccessSpy = sinon.spy(registration, 'onSuccess');
        const registerFailureSpy = sinon.spy(registration, 'onFailure');

        const { web5, did } = await Web5.connect({
          registration,
          didCreateOptions: {
            dwnEndpoints: [
              'https://dwn.example.com',
              'https://dwn.production.com/',
            ],
          },
        });
        expect(web5).to.exist;
        expect(did).to.exist;

        // should call onSuccess and not onFailure
        expect(registerSuccessSpy.calledOnce, 'onSuccess called').to.be.true;
        expect(registerFailureSpy.notCalled, 'onFailure not called').to.be.true;

        // Expect getServerInfo to be called but not registerTenant
        expect(serverInfoStub.calledTwice, 'getServerInfo called').to.be.true; // once per dwnEndpoint
        expect(registerStub.notCalled, 'registerTenant not called').to.be.true; // not called
      });

      it('techPreview.dwnEndpoints should take precedence over didCreateOptions.dwnEndpoints', async () => {
        sinon
          .stub(Web5UserAgent, 'create')
          .resolves(testHarness.agent as Web5UserAgent);
        const serverInfoStub = sinon
          .stub(testHarness.agent.rpc, 'getServerInfo')
          .resolves({
            registrationRequirements : ['terms-of-service'],
            maxFileSize              : 10000,
            webSocketSupport         : true,
          });

        // stub a successful registration
        const registerStub = sinon
          .stub(DwnRegistrar, 'registerTenant')
          .resolves();

        const registration = {
          onSuccess : () => {},
          onFailure : () => {},
        };

        const registerSuccessSpy = sinon.spy(registration, 'onSuccess');
        const registerFailureSpy = sinon.spy(registration, 'onFailure');

        const { web5, did } = await Web5.connect({
          registration,
          didCreateOptions: {
            dwnEndpoints: [
              'https://dwn.example.com',
              'https://dwn.production.com/',
            ],
          }, // two endpoints,
          techPreview: { dwnEndpoints: ['https://dwn.production.com/'] }, // one endpoint
        });
        expect(web5).to.exist;
        expect(did).to.exist;

        // Success should be called, and failure should not
        expect(registerFailureSpy.notCalled, 'onFailure not called').to.be.true;
        expect(registerSuccessSpy.calledOnce, 'onSuccess called').to.be.true;

        // Expect getServerInfo and registerTenant to be called.
        expect(serverInfoStub.calledOnce, 'getServerInfo called').to.be.true; // Should only be called once for `techPreview` endpoint
        expect(registerStub.callCount, 'registerTenant called').to.equal(2); // called twice, once for Agent DID once for Identity DID
      });
    });
  });
});
