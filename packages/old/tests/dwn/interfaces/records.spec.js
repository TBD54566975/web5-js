import chaiAsPromised from 'chai-as-promised';
import chai, { expect } from 'chai';
import { DataStream } from '@tbd54566975/dwn-sdk-js';

import { Web5 } from '../../../src/web5.js';

import { TestDataGenerator } from '../../test-utils/test-data-generator.js';
import { TestDwn } from '../../test-utils/test-dwn.js';

chai.use(chaiAsPromised);

describe('Records', async () => {
  let testDwn, web5;
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

  beforeEach(async () => {
    // Clean up before each test rather than after so that a test does not depend on other tests to do the clean up.
    await testDwn.clear();
  });

  after(async () => {
    // Close connections to the underlying stores.
    await testDwn.close();
  });

  describe('read()', () => {
    let readResponse, jsonWriteResponse;

    beforeEach(async () => {
      // write a record that can be read from for each test
      jsonWriteResponse = await web5.dwn.records.write(alice.id, {
        author: alice.id,
        data: { message: 'Hello, world!' },
        message: {
          dataFormat: 'application/json',
        },
      });
    });

    describe('unit tests', () => {
      it('should return message, record, and status', async () => {
        readResponse = await web5.dwn.records.read(alice.id, {
          author: alice.id,
          message: {
            recordId: jsonWriteResponse.record.id,
          },
        });

        expect(readResponse).to.have.property('message');
        expect(readResponse).to.have.property('record');
        expect(readResponse).to.have.property('status');
      });
    });
  });

  describe('write()', () => {
    describe('unit tests', () => {
      it('should return data, entries, message, record, and status', async () => {
        const response = await web5.dwn.records.write(alice.id, {
          author: alice.id,
          data: { message: 'Hello, world!' },
          message: {
            dataFormat: 'application/json',
          },
        });
        expect(response).to.have.property('data');
        expect(response).to.have.property('entries');
        expect(response).to.have.property('message');
        expect(response).to.have.property('record');
        expect(response).to.have.property('status');
      });

      it('should accept as input string data with no dataFormat', async () => {
        const response = await web5.dwn.records.write(alice.id, {
          author: alice.id,
          data: 'Hello, world!',
        });

        expect(response).to.have.nested.property('status.code', 202);
        expect(response).to.have.nested.property('record.dataFormat', 'text/plain');
        await expect(response.record.data.text()).to.eventually.equal('Hello, world!');
      });

      it('should accept as input string data with dataFormat specified', async () => {
        const response = await web5.dwn.records.write(alice.id, {
          author: alice.id,
          data: 'Hello, world!',
          message: {
            dataFormat: 'text/plain',
          },
        });

        expect(response).to.have.nested.property('status.code', 202);
        expect(response).to.have.nested.property('record.dataFormat', 'text/plain');
        await expect(response.record.data.text()).to.eventually.equal('Hello, world!');
      });

      it('should accept as input JSON data with no dataFormat', async () => {
        const response = await web5.dwn.records.write(alice.id, {
          author: alice.id,
          data: { message: 'Hello, world!' },
        });

        expect(response).to.have.nested.property('status.code', 202);
        expect(response).to.have.nested.property('record.dataFormat', 'application/json');
        await expect(response.record.data.json()).to.eventually.deep.equal({ message: 'Hello, world!' });
      });

      it('should accept as input JSON data with dataFormat specified', async () => {
        const response = await web5.dwn.records.write(alice.id, {
          author: alice.id,
          data: { message: 'Hello, world!' },
          message: {
            dataFormat: 'application/json',
          },
        });

        expect(response).to.have.nested.property('status.code', 202);
        expect(response).to.have.nested.property('record.dataFormat', 'application/json');
        await expect(response.record.data.json()).to.eventually.deep.equal({ message: 'Hello, world!' });
      });

      it('should accept as input JSON data with no dataFormat', async () => {
        const response = await web5.dwn.records.write(alice.id, {
          author: alice.id,
          data: { message: 'Hello, world!' },
        });

        expect(response).to.have.nested.property('status.code', 202);
        expect(response).to.have.nested.property('record.dataFormat', 'application/json');
        await expect(response.record.data.json()).to.eventually.deep.equal({ message: 'Hello, world!' });
      });

      it('should accept as input JSON data with dataFormat specified', async () => {
        const response = await web5.dwn.records.write(alice.id, {
          author: alice.id,
          data: { message: 'Hello, world!' },
          message: {
            dataFormat: 'application/json',
          },
        });

        expect(response).to.have.nested.property('status.code', 202);
        expect(response).to.have.nested.property('record.dataFormat', 'application/json');
        await expect(response.record.data.json()).to.eventually.deep.equal({ message: 'Hello, world!' });
      });

      it('should accept as input binary data with no dataFormat', async () => {
        const dataBytes = TestDataGenerator.randomBytes(32);
        const response = await web5.dwn.records.write(alice.id, {
          author: alice.id,
          data: dataBytes,
        });

        expect(response).to.have.nested.property('status.code', 202);
        expect(response).to.have.nested.property('record.dataFormat', 'application/octet-stream');
        const responseData = await DataStream.toBytes(await response.record.data.stream());
        expect(responseData).to.deep.equal(dataBytes);
      });

      it('should accept as input binary data with dataFormat specified', async () => {
        const dataBytes = TestDataGenerator.randomBytes(32);
        const response = await web5.dwn.records.write(alice.id, {
          author: alice.id,
          data: dataBytes,
          message: {
            dataFormat: 'image/png',
          },
        });

        expect(response).to.have.nested.property('status.code', 202);
        expect(response).to.have.nested.property('record.dataFormat', 'image/png');
        const responseData = await DataStream.toBytes(await response.record.data.stream());
        expect(responseData).to.deep.equal(dataBytes);
      });
    });
  });
});
