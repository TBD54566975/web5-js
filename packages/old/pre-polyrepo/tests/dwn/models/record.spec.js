import chaiAsPromised from 'chai-as-promised';
import chai, { expect } from 'chai';
import { DataStream, DwnConstant } from '@tbd54566975/dwn-sdk-js';

import { Web5 } from '../../../src/web5.js';
import { Record } from '../../../src/dwn/models/record.js';
import { dataToBytes } from '../../../src/utils.js';

import { createTimeoutPromise } from '../../test-utils/promises.js';
import { TestDataGenerator } from '../../test-utils/test-data-generator.js';
import { TestDwn } from '../../test-utils/test-dwn.js';

chai.use(chaiAsPromised);

describe('Record', async () => {
  let dataBytes, dataFormat, testDwn, web5;
  let alice;

  before(async () => {
    testDwn = await TestDwn.create();
    web5 = new Web5({ dwn: { node: testDwn.node } });
    
    alice = await web5.did.create('ion');

    await web5.did.manager.set(alice.id, {
      connected: true,
      endpoint: 'app://dwn',
      keys: {
        ['#dwn']: {
          keyPair: alice.keys.find(key => key.id === 'dwn').keyPair,
        },
      },
    });
  });

  after(async () => {
    // Close connections to the underlying stores.
    await testDwn.close();
  });

  describe('created from RecordsRead response', () => {
    let jsonWriteResponse;

    describe('when dataSize <= DwnConstant.maxDataSizeAllowedToBeEncoded', () => {
      const dataSize = 10;

      describe('data.json()', async () => {
        let dataJson;

        before(async () => {
          dataJson = TestDataGenerator.generateJson(dataSize);
          ({ dataBytes, dataFormat } = dataToBytes(dataJson));
          jsonWriteResponse = await web5.dwn.records.write(alice.id, {
            author: alice.id,
            data: dataJson,
            message: {
              dataFormat: dataFormat,
            },
          });
        });

        it('should return JSON many times when instantiated with encoded data', async () => {
          const record = new Record(web5.dwn, {
            author: alice.id,
            descriptor: jsonWriteResponse.message.descriptor,
            encodedData: dataBytes,
            recordId: jsonWriteResponse.message.recordId,
            target: alice.id,
          });
          
          expect (record.dataSize) <= DwnConstant.maxDataSizeAllowedToBeEncoded;

          // The first invocation should succeed.
          await expect(record.data.json()).to.eventually.deep.equal(dataJson);
          // Assert that the second call to record.data.json() is fulfilled before the timeout.
          await chai.assert.isFulfilled(Promise.race([record.data.json(), createTimeoutPromise(5)]));
          // Assert that the third call to record.data.json() is fulfilled before the timeout.
          await chai.assert.isFulfilled(Promise.race([record.data.json(), createTimeoutPromise(5)]));
        });

        it('should return JSON once when instantiated without data', async () => {
          const record = new Record(web5.dwn, {
            author: alice.id,
            descriptor: jsonWriteResponse.message.descriptor,
            recordId: jsonWriteResponse.message.recordId,
            target: alice.id,
          });
          
          expect (record.dataSize) <= DwnConstant.maxDataSizeAllowedToBeEncoded;

          // The first invocation should succeed.
          await expect(record.data.json()).to.eventually.deep.equal(dataJson);
          // Assert that the second call to record.data.json() is rejected due to the timeout.
          await chai.assert.isRejected(Promise.race([record.data.json(), createTimeoutPromise(5)]));
        });
      });
    });

    describe('when dataSize > DwnConstant.maxDataSizeAllowedToBeEncoded', () => {
      const dataSize = DwnConstant.maxDataSizeAllowedToBeEncoded + 1000;
      
      describe('data.json()', async () => {
        let dataJson;

        before(async () => {
          dataJson = TestDataGenerator.generateJson(dataSize);
          ({ dataBytes, dataFormat } = dataToBytes(dataJson));
          jsonWriteResponse = await web5.dwn.records.write(alice.id, {
            author: alice.id,
            data: dataJson,
            message: {
              dataFormat: dataFormat,
            },
          });
        });

        it('should return JSON once when instantiated with a data stream', async () => {
          const record = new Record(web5.dwn, {
            author: alice.id,
            descriptor: jsonWriteResponse.message.descriptor,
            data: DataStream.fromBytes(dataBytes),
            recordId: jsonWriteResponse.message.recordId,
            target: alice.id,
          });
          
          expect (record.dataSize) > DwnConstant.maxDataSizeAllowedToBeEncoded;

          // The first invocation should succeed.
          await expect(record.data.json()).to.eventually.deep.equal(dataJson);
          // Assert that the second call to record.data.json() is rejected due to the timeout.
          await chai.assert.isRejected(Promise.race([record.data.json(), createTimeoutPromise(5)]));
        });

        it('should return JSON once when instantiated without data', async () => {
          const record = new Record(web5.dwn, {
            author: alice.id,
            descriptor: jsonWriteResponse.message.descriptor,
            recordId: jsonWriteResponse.message.recordId,
            target: alice.id,
          });
          
          expect (record.dataSize) > DwnConstant.maxDataSizeAllowedToBeEncoded;

          // The first invocation should succeed.
          await expect(record.data.json()).to.eventually.deep.equal(dataJson);
          // Assert that the second call to record.data.json() is rejected due to the timeout.
          await chai.assert.isRejected(Promise.race([record.data.json(), createTimeoutPromise(5)]));
        });
      });
    });
  });
});
