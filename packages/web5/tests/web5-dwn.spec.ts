import { expect } from 'chai';
import { TestAgent } from './test-utils/test-user-agent.js';
import { DwnApi } from '../src/dwn-api.js';

let testAgent: TestAgent;
let did: string;
let dwn: DwnApi;

describe('web5.dwn', () => {
  before(async () => {
    testAgent = await TestAgent.create();
  });

  beforeEach(async () => {
    await testAgent.clearStorage();
    ({ did } = await testAgent.createProfile({
      profileDidOptions: {
        services: [{
          type            : 'dwn',
          id              : 'dwn',
          serviceEndpoint : {
            nodes: ['https://dwn.tbddev.org/dwn0']
          }
        }]
      }})
    );

    dwn = new DwnApi(testAgent.agent, did);
  });

  after(async () => {
    await testAgent.clearStorage();
    await testAgent.closeStorage();
  });

  describe('records', () => {
    describe('write', () => {
      it(`writes a record to alice's local dwn`, async () => {
        const result = await dwn.records.write({
          data    : 'Hello, world!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });

        expect(result.status.code).to.equal(202);
        expect(result.status.detail).to.equal('Accepted');
        expect(result.record).to.exist;
      });

    });

    describe('query', () => {
      it('returns an array of records that match the filter provided', async () => {
        const writeResult = await dwn.records.write({
          data    : 'Hello, world!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });

        expect(writeResult.status.code).to.equal(202);
        expect(writeResult.status.detail).to.equal('Accepted');
        expect(writeResult.record).to.exist;

        const result = await dwn.records.query({
          message: {
            filter: {
              schema: 'foo/bar'
            }
          }
        });

        expect(result.status.code).to.equal(200);
        expect(result.records.length).to.equal(1);
        expect(result.records[0].id).to.equal(writeResult.record!.id);
      });
    });

    describe('read', () => {
      it('returns a record', async () => {
        const writeResult = await dwn.records.write({
          data    : 'Hello, world!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });

        expect(writeResult.status.code).to.equal(202);
        expect(writeResult.status.detail).to.equal('Accepted');
        expect(writeResult.record).to.exist;

        const result = await dwn.records.read({
          message: {
            recordId: writeResult.record!.id
          }
        });

        expect(result.status.code).to.equal(200);
        expect(result.record.id).to.equal(writeResult.record!.id);
      });

      it('returns a 404 when a record cannot be found', async () => {
        const writeResult = await dwn.records.write({
          data    : 'Hello, world!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });

        expect(writeResult.status.code).to.equal(202);
        expect(writeResult.status.detail).to.equal('Accepted');
        expect(writeResult.record).to.exist;

        await writeResult.record!.delete();

        const result = await dwn.records.read({
          message: {
            recordId: writeResult.record!.id
          }
        });

        expect(result.status.code).to.equal(404);
        expect(result.record).to.not.exist;

      });
    });

    describe('delete', () => {
      it('deletes a record', async () => {
        const writeResult = await dwn.records.write({
          data    : 'Hello, world!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });

        expect(writeResult.status.code).to.equal(202);
        expect(writeResult.record).to.not.be.undefined;

        const deleteResult = await dwn.records.delete({
          message: {
            recordId: writeResult.record!.id
          }
        });

        expect(deleteResult.status.code).to.equal(202);
      });

      it('returns a 202 no matter what?', async () => {
        const writeResult = await dwn.records.write({
          data    : 'Hello, world!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });

        expect(writeResult.status.code).to.equal(202);
        expect(writeResult.record).to.not.be.undefined;

        let deleteResult = await dwn.records.delete({
          message: {
            recordId: writeResult.record!.id
          }
        });

        // TODO: (Moe -> Frank): this returns a 202. interesting
        deleteResult = await dwn.records.delete({
          message: {
            recordId: writeResult.record!.id
          }
        });

        expect(deleteResult.status.code).to.equal(202);
      });
    });


    describe('send', () => {
      it('TODO: figure out what we want to do when target did has no service endpoints', async () => {
        const { id: bobDid } = await testAgent.didIon.create();

        try {
          const response = await dwn.records.send({
            target  : bobDid,
            method  : 'query',
            message : {
              filter: {
                schema: 'butts'
              }
            }
          });

          expect.fail();
        } catch(e) {
          expect(e.message).to.include('no dwn service endpoints');
        }
      });

      describe('write', () => {
        it(`sends a RecordsWrite dwn message to the target's did-resolvable dwn`, async () => {
          const response = await dwn.records.send({
            target : did,
            method : 'write',
            data   : 'Hi!',
          });

          console.log(response);
        });
      });

      describe('query', () => {
        it(`sends a RecordsQuery dwn message to the target's did-resolvable dwn`, async () => {
          const response = await dwn.records.send({
            target  : did,
            method  : 'query',
            message : {
              filter: {
                schema: 'butts'
              }
            }
          });

          expect(response.status.code).to.equal(200);
          expect(response.records.length).to.equal(0);
        });
      });
    });
  });

  describe('protocols', () => {
    describe('configure', () => {
      xit('works');
    });

    describe('query', () => {
      xit('works');
    });
  });
});