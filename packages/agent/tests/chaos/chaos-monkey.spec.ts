import type { PortableDid } from '@web5/dids';

import { expect } from 'chai';
import * as sinon from 'sinon';

import type { ManagedIdentity } from '../../src/identity-manager.js'

import { testDwnUrl } from '../test-config.js'
import { TestAgent } from '../utils/test-agent.js';
import { TestManagedAgent } from '../../src/test-managed-agent.js';

import { randomUuid } from '@web5/crypto/utils';
import { DwnRequest, DwnResponse, ProcessDwnRequest, SendDwnRequest } from '../../src/index.js';
import { DataStream, RecordsDeleteMessage, RecordsWrite, RecordsWriteMessage } from '@tbd54566975/dwn-sdk-js';
import _Readable from 'readable-stream';

const testDwnUrls = [ testDwnUrl ];

const checkChaos = (): boolean => {
  return process.env.CHAOS_ENV === 'true'
}

describe('Chaos Monkey', () => {
  describe('Sync Manager', function () {
    this.timeout(120_000);
    const records:DwnResponse[] = [];

    const lean: string|undefined = process.env.SYNC_LEAN === 'pull' ? 'pull' : 
      process.env.SYNC_LEAN === 'push' ? 'push' : undefined;

    const DEFAULT_SYNC_ROUNDS = 10;
    const DEFAULT_BATCH_ROUNDS = 10;
    const DEFAULT_BATCH_COUNT = 5;
    const rounds: number = !isNaN(parseInt(process.env.SYNC_ROUNDS || 'not-a-number')) ? parseInt(process.env.SYNC_ROUNDS!) : DEFAULT_SYNC_ROUNDS;
    const batchRounds: number = !isNaN(parseInt(process.env.BATCH_ROUNDS || 'not-a-number')) ? parseInt(process.env.BATCH_ROUNDS!) : DEFAULT_BATCH_ROUNDS;
    const batchCount: number = !isNaN(parseInt(process.env.BATCH_COUNT || 'not-a-number')) ? parseInt(process.env.BATCH_COUNT!) : DEFAULT_BATCH_COUNT;

    let alice: ManagedIdentity;
    let bob: ManagedIdentity;
    let carol: ManagedIdentity;
    let dave: ManagedIdentity;

    let aliceDid: PortableDid;
    let bobDid: PortableDid;
    let carolDid: PortableDid;
    let daveDid: PortableDid;
    let testAgent: TestManagedAgent;


    const testWriteMessage = (did:string, id: string): ProcessDwnRequest => {
      return {
        author         : did,
        target         : did,
        messageType    : 'RecordsWrite',
        messageOptions : {
          schema     : 'schema',
          dataFormat : 'application/json'
        },
        dataStream: new Blob([ `Hello, ${id}`])
      };
    }

    const testQueryMessage = (did:string): ProcessDwnRequest => {
      return {
        author         : did,
        target         : did,
        messageType    : 'RecordsQuery',
        messageOptions: { filter: { schema: 'schema', dataFormat: 'application/json' } },
      };
    }

    const testReadMessage = (did:string, recordId: string): SendDwnRequest => {
      return {
        author         : did,
        target         : did,
        messageType    : 'RecordsRead',
        messageOptions : { recordId }
      };
    }

    before(async () => {
      testAgent = await TestManagedAgent.create({
        agentClass  : TestAgent,
        agentStores : 'dwn'
      });
    });

    beforeEach(async () => {
      records.splice(0, records.length);
      await testAgent.clearStorage();
      await testAgent.createAgentDid();
      // Create a new Identity to author the DWN messages.
      ({ did: aliceDid } = await testAgent.createIdentity({ testDwnUrls }));
        alice = await testAgent.agent.identityManager.import({
        did      : aliceDid,
        identity : { name: 'Alice', did: aliceDid.did },
        kms      : 'local'
      });
      ({ did: bobDid } = await testAgent.createIdentity({ testDwnUrls }));
        bob = await testAgent.agent.identityManager.import({
        did      : bobDid,
        identity : { name: 'Bob', did: bobDid.did },
        kms      : 'local'
      });
      ({ did: carolDid } = await testAgent.createIdentity({ testDwnUrls }));
        carol = await testAgent.agent.identityManager.import({
        did      : carolDid,
        identity : { name: 'Carol', did: carolDid.did },
        kms      : 'local'
      });
      ({ did: daveDid} = await testAgent.createIdentity({ testDwnUrls }));
        dave = await testAgent.agent.identityManager.import({
        did      : daveDid,
        identity : { name: 'Dave', did: daveDid.did },
        kms      : 'local'
      });

      const { dwnManager } = testAgent.agent;
      const startLoadMessages = Date.now();

      const process = async (message: ProcessDwnRequest, random: number): Promise<DwnResponse> => {

        let randomMod = 2;
        if (lean !== undefined) {
          // create an uneven distribution
          randomMod = 3;
        }

          // throw in a record that both get every 11th record.
        if (random % 11 === 0) return processBoth(message);

        const left = (message: ProcessDwnRequest) => {
          return lean === undefined || lean === 'pull' ? dwnManager.processRequest(message as ProcessDwnRequest): dwnManager.sendRequest(message as SendDwnRequest);
        }

        const right = (message: ProcessDwnRequest) => {
          return lean === undefined || lean === 'pull' ? dwnManager.sendRequest(message as SendDwnRequest) : dwnManager.processRequest(message as ProcessDwnRequest);
        }

        return random % randomMod === 0 ? left(message) : right(message);
      };


      const processBoth = async (message: ProcessDwnRequest) => {
        const localResponse = await dwnManager.processRequest({...message} as ProcessDwnRequest);
        // copy the message, todo use createFrom??
        message = {
          ...message,
          messageOptions: {
            ...message.messageOptions || {},
            ...(localResponse.message as RecordsDeleteMessage).descriptor
          }
        }
        const remoteResponse = await dwnManager.sendRequest({...message} as SendDwnRequest)
        expect(localResponse.messageCid).to.equal(remoteResponse.messageCid, `invalid remote and local messages`);
        return remoteResponse;
      }

      const randomMessage = () => {
        const random = getRandomInt(0, 1234567890);
        const message = testWriteMessage(alice.did, randomUuid());
        return process(message, random);
      }

      const batch = (count: number) => Array(count).fill({}).map(randomMessage)

      for (const _ of Array(batchRounds).fill({})) {
        records.push(...(await Promise.all(batch(batchCount))))
      }

      const endLoadMessages = Date.now();
      console.log(`loaded ${records.length} messages in ${endLoadMessages - startLoadMessages}ms`);
      expect(records.every(r => r.reply.status.code === 202), `could not load messages successfully`).to.be.true;
    });

    afterEach(async () => {
      await testAgent.clearStorage();
    });

    after(async () => {
      await testAgent.clearStorage();
      await testAgent.closeStorage();
    });

    describe(`startSync() ${rounds} runs`, () => {
      if (checkChaos()) {
        for ( const _ of Array(rounds).fill({})) {
          it('sync a lot of records', async () => {
            await testAgent.agent.syncManager.registerIdentity({
              did: alice.did
            });

            // get remote and local before sync;
            const testQuery = testQueryMessage(alice.did);
            let { reply } = await testAgent.agent.dwnManager.processRequest(testQuery);
            let { reply: replyRemote } = await testAgent.agent.dwnManager.sendRequest(testQuery);

            const startSync = Date.now();
            await testAgent.agent.syncManager.push();
            await testAgent.agent.syncManager.pull();
            const endSync = Date.now();

            const remoteEntries = (replyRemote.entries || []).filter(e => (reply.entries || []).findIndex(le => (le as RecordsWriteMessage).recordId === (e as RecordsWriteMessage).recordId) < 0);
            const localEntries = (reply.entries || []).filter(e => (replyRemote.entries || []).findIndex(re => (re as RecordsWriteMessage).recordId === (e as RecordsWriteMessage).recordId) < 0)
            const commonItemsLength = (reply.entries!.length + replyRemote.entries!.length) - records.length;

            console.log(`sync time:\t\t${endSync-startSync} for ${records.length} records\nlocal records:\t\t${reply.entries!.length}/${localEntries.length} unique\nremote records:\t\t${replyRemote.entries!.length}/${remoteEntries.length} unique\ncommon records:\t\t${commonItemsLength}\n\n`)
            expect(endSync-startSync).to.be.lt(60_000);
            ({ reply } = await testAgent.agent.dwnManager.processRequest(testQuery));
            expect(reply.status.code).to.equal(200);
            expect(reply.entries!.length).to.equal(records.length);
          }).timeout(100_000);
        }
      }
    });
  });
});

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (Math.ceil(max - min)) + Math.ceil(min));
}