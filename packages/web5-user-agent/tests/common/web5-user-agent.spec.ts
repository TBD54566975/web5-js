import { expect } from 'chai';
import { TestAgent } from './utils/test-user-agent.js';

let testAgent: TestAgent;
let did: string;

describe('Web5UserAgent', () => {
  before(async () => {
    testAgent = await TestAgent.create();
  });

  beforeEach(async () => {
    await testAgent.clearStorage();
    ({ did } = await testAgent.createProfile());
  });

  after(async () => {
    await testAgent.clearStorage();
    await testAgent.closeStorage();
  });

  describe('sendDwnRequest', () => {
    it('throws an exception if target did has no #dwn service endpoints', async () => {
      try {
        await testAgent.agent.sendDwnRequest({
          author         : did,
          target         : did,
          messageType    : 'RecordsQuery',
          messageOptions : {
            filter: {
              schema: 'https://schemas.xyz/example'
            }
          }
        });

        expect.fail();
      } catch(e) {
        expect(e.message).to.include(`${did} has no dwn service endpoints`);
      }
    });

    it('handles RecordsQuery Messages', async () => {
      const { did: aliceDid } = await testAgent.createProfile({
        profileDidOptions: {
          services: [{
            type            : 'dwn',
            id              : 'dwn',
            serviceEndpoint : {
              nodes: ['https://dwn.tbddev.org/dwn0']
            }
          }]
        }
      });

      const response = await testAgent.agent.sendDwnRequest({
        author         : aliceDid,
        target         : aliceDid,
        messageType    : 'RecordsQuery',
        messageOptions : {
          filter: {
            schema: 'https://schemas.xyz/example'
          }
        }
      });

      expect(response.reply).to.exist;
      expect(response.error).to.not.exist;
      expect(response.reply.status).to.exist;
      expect(response.reply.entries).to.exist;
      expect(response.reply.status.code).to.equal(200);
    });

    it('handles RecordsDelete Messages', async () => {
      const { did: aliceDid } = await testAgent.createProfile({
        profileDidOptions: {
          services: [{
            type            : 'dwn',
            id              : 'dwn',
            serviceEndpoint : {
              nodes: ['https://dwn.tbddev.org/dwn0']
            }
          }]
        }
      });

      const response = await testAgent.agent.sendDwnRequest({
        author         : aliceDid,
        target         : aliceDid,
        messageType    : 'RecordsDelete',
        messageOptions : {
          recordId: 'abcd123'
        }
      });

      // TODO: (Moe -> Frank): interesting that  202 is returned
      expect(response.reply).to.exist;
      expect(response.error).to.not.exist;
      expect(response.reply.status).to.exist;
      expect(response.reply.status.code).to.equal(202);
    });

    it('returns something when an jwark is smorked', async () => {
      const { did: aliceDid } = await testAgent.createProfile({
        profileDidOptions: {
          services: [{
            type            : 'dwn',
            id              : 'dwn',
            serviceEndpoint : {
              nodes: ['https://dwn.tbddev.org/dwn0']
            }
          }]
        }
      });

      try {
        // TODO: (Moe -> Frank): what should sendDwnRequest return and how does it propogate back up to the caller?
        await testAgent.agent.sendDwnRequest({
          author         : aliceDid,
          target         : aliceDid,
          messageType    : 'RecordsQuery',
          messageOptions : {
            filter: true
          }
        });
        expect.fail();
      } catch(e) {
        expect(e.message).to.include('/descriptor/filter');
      }
    });
  });
});