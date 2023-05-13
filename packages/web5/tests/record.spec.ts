import { expect } from 'chai';
import { TestAgent } from './test-utils/test-user-agent.js';
import { DwnApi } from '../src/dwn-api.js';

let testAgent: TestAgent;
let did: string;
let dwn: DwnApi;

describe('Record', () => {
  before(async () => {
    testAgent = await TestAgent.create();
  });

  beforeEach(async () => {
    await testAgent.clearStorage();
    ({ did } = await testAgent.createProfile());
    dwn = new DwnApi(testAgent.agent, did);
  });

  after(async () => {
    await testAgent.clearStorage();
    await testAgent.closeStorage();
  });


  describe('record.update', () => {
    it(`updates a record`, async () => {
      const { status, record } = await dwn.records.write({
        data    : 'Hello, world!',
        message : {
          schema     : 'foo/bar',
          dataFormat : 'text/plain'
        }
      });

      expect(status.code).to.equal(202);
      expect(record).to.not.be.undefined;

      const updateResult = await record!.update({ data: 'bye' });
      expect(updateResult.status.code).to.equal(202);

      const queryResult = await dwn.records.query({
        message: {
          filter: {
            recordId: record!.id
          }
        }
      });

      expect(queryResult.status.code).to.equal(200);
      expect(queryResult.records.length).to.equal(1);

      // TODO: From Moe to Frank
      // expect(queryResult.records[0].dataCid).to.not.equal(record!.dataCid);

      const updatedData = await record!.data.text();
      expect(updatedData).to.equal('bye');
    });

    it('throws an exception when an immutable property is modified', async () => {
      const { status, record } = await dwn.records.write({
        data    : 'Hello, world!',
        message : {
          schema     : 'foo/bar',
          dataFormat : 'text/plain'
        }
      });

      expect(status.code).to.equal(202);
      expect(record).to.not.be.undefined;

      try {
        //@ts-ignore bc test
        await record!.update({ descriptor: 'hehe' });
        expect.fail();
      } catch(e) {
        expect(e.message).to.include('descriptor is an immutable property. Its value cannot be changed.');
      }
    });

  });

  describe('record.delete', () => {
    it('deletes the record', async () => {
      const { status, record } = await dwn.records.write({
        data    : 'Hello, world!',
        message : {
          schema     : 'foo/bar',
          dataFormat : 'text/plain'
        }
      });

      expect(status.code).to.equal(202);
      expect(record).to.not.be.undefined;

      const deleteResult = await record!.delete();
      expect(deleteResult.status.code).to.equal(202);

      const queryResult = await dwn.records.query({
        message: {
          filter: {
            recordId: record!.id
          }
        }
      });

      expect(queryResult.status.code).to.equal(200);
      expect(queryResult.records.length).to.equal(0);
    });

    it('throws an exception when delete is called twice', async () => {
      const { status, record } = await dwn.records.write({
        data    : 'Hello, world!',
        message : {
          schema     : 'foo/bar',
          dataFormat : 'text/plain'
        }
      });

      expect(status.code).to.equal(202);
      expect(record).to.not.be.undefined;

      let deleteResult = await record!.delete();
      expect(deleteResult.status.code).to.equal(202);

      try {
        deleteResult = await record!.delete();
        expect.fail();
      } catch(e) {
        expect(e.message).to.include('was previously deleted');
      }
    });
  });
});