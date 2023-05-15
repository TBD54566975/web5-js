import { expect } from 'chai';

import { DwnApi } from '../src/dwn-api.js';
import * as testProfile from './fixtures/test-profiles.js';
import { TestAgent, TestProfileOptions } from './test-utils/test-user-agent.js';

let didOnlyAuthz: string;
let dwn: DwnApi;
let testAgent: TestAgent;
let testProfileOptions: TestProfileOptions;

describe('web5.dwn', () => {
  before(async () => {
    testAgent = await TestAgent.create();
  });

  beforeEach(async () => {
    await testAgent.clearStorage();

    testProfileOptions = await testProfile.ion.with.dwn.service.and.authorization.keys();
    ({ did: didOnlyAuthz } = await testAgent.createProfile(testProfileOptions));
    dwn = new DwnApi(testAgent.agent, didOnlyAuthz);
  });

  after(async () => {
    await testAgent.clearStorage();
    await testAgent.closeStorage();
  });

  describe('protocols', () => {
    describe('configure', () => {
      xit('tests needed');
    });

    describe('query', () => {
      xit('tests needed');
    });
  });

  describe('records', () => {
    describe('write', () => {
      describe('agent', () => {
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

      describe('agent store: false', () => {
        xit('tests needed');
      });
    });

    describe('query', () => {
      describe('agent', () => {
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
          expect(result.records).to.exist;
          expect(result.records!.length).to.equal(1);
          expect(result.records![0].id).to.equal(writeResult.record!.id);
        });
      });

      describe('from: did', () => {
        it('returns empty records array when no records match the filter provided', async () => {
        // Write the record to the connected agent's DWN.
          const { record, status } = await dwn.records.write({ data: 'hi' });
          expect(status.code).to.equal(202);

          // Create a new DID to represent an external entity who has a remote DWN server defined in their DID document.
          const ionCreateOptions = await testProfile.ionCreateOptions.services.dwn.authorization.keys();
          const { id: bobDid } = await testAgent.didIon.create(ionCreateOptions);

          // Attempt to query Bob's DWN using the ID of a record that only exists in the connected agent's DWN.
          const result = await dwn.records.query({
            from    : bobDid,
            message : {
              filter: {
                recordId: record!.id
              }
            }
          });

          // Confirm that the record does not currently exist on Bob's DWN.
          expect(result.status.code).to.equal(200);
          expect(result.records).to.exist;
          expect(result.records!.length).to.equal(0);
        });
      });
    });

    describe('read', () => {
      describe('agent', () => {
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

      describe('from: did', () => {
        it('returns undefined record when requested record does not exit', async () => {
        // Generate a recordId that will not be present on the did endpoint being read from.
          const { record, status } = await dwn.records.write({ data: 'hi' });
          expect(status.code).to.equal(202);

          // Create a new DID to represent an external entity who has a remote DWN server defined in their DID document.
          const ionCreateOptions = await testProfile.ionCreateOptions.services.dwn.authorization.keys();
          const { id: bobDid } = await testAgent.didIon.create(ionCreateOptions);

          // Attempt to read a record from Bob's DWN using the ID of a record that only exists in the connected agent's DWN.
          const result = await dwn.records.read({
            from    : bobDid,
            message : {
              recordId: record!.id
            }
          });

          // Confirm that the record does not currently exist on Bob's DWN.
          expect(result.status.code).to.equal(404);
          expect(result.record).to.be.undefined;
        });
      });
    });

    describe('delete', () => {
      describe('agent', () => {
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

        it('returns a 202 if the recordId does not exist', async () => {
          let deleteResult = await dwn.records.delete({
            message: {
              recordId: 'abcd1234'
            }
          });
          expect(deleteResult.status.code).to.equal(202);
        });
      });

      describe('from: did', () => {
        xit('tests needed');
      });
    });
  });
});