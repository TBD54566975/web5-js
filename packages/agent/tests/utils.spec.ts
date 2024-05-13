import { expect } from 'chai';

import { DateSort, Message, TestDataGenerator } from '@tbd54566975/dwn-sdk-js';
import { getPaginationCursor, getRecordAuthor, getRecordMessageCid } from '../src/utils.js';

describe('Utils', () => {
  describe('getPaginationCursor', () => {
    it('should return a PaginationCursor object', async () => {
      // create a RecordWriteMessage object which is published
      const { message } = await TestDataGenerator.generateRecordsWrite({
        published: true,
      });

      const messageCid = await Message.getCid(message);

      // Published Ascending DateSort will get the datePublished as the cursor value
      const datePublishedAscendingCursor = await getPaginationCursor(message, DateSort.PublishedAscending);
      expect(datePublishedAscendingCursor).to.deep.equal({
        value: message.descriptor.datePublished,
        messageCid,
      });

      // Published Descending DateSort will get the datePublished as the cursor value
      const datePublishedDescendingCursor = await getPaginationCursor(message, DateSort.PublishedDescending);
      expect(datePublishedDescendingCursor).to.deep.equal({
        value: message.descriptor.datePublished,
        messageCid,
      });

      // Created Ascending DateSort will get the dateCreated as the cursor value
      const dateCreatedAscendingCursor = await getPaginationCursor(message, DateSort.CreatedAscending);
      expect(dateCreatedAscendingCursor).to.deep.equal({
        value: message.descriptor.dateCreated,
        messageCid,
      });

      // Created Descending DateSort will get the dateCreated as the cursor value
      const dateCreatedDescendingCursor = await getPaginationCursor(message, DateSort.CreatedDescending);
      expect(dateCreatedDescendingCursor).to.deep.equal({
        value: message.descriptor.dateCreated,
        messageCid,
      });
    });

    it('should fail for DateSort with PublishedAscending or PublishedDescending if the record is not published', async () => {
      // create a RecordWriteMessage object which is not published
      const { message } = await TestDataGenerator.generateRecordsWrite();

      // Published Ascending DateSort will get the datePublished as the cursor value
      try {
        await getPaginationCursor(message, DateSort.PublishedAscending);
        expect.fail('Expected getPaginationCursor to throw an error');
      } catch(error: any) {
        expect(error.message).to.include('The dateCreated or datePublished property is missing from the record descriptor.');
      }
    });
  });

  describe('getRecordMessageCid', () => {
    it('should get the CID of a RecordsWriteMessage', async () => {
      // create a RecordWriteMessage object
      const { message } = await TestDataGenerator.generateRecordsWrite();
      const messageCid = await Message.getCid(message);

      const messageCidFromFunction = await getRecordMessageCid(message);
      expect(messageCidFromFunction).to.equal(messageCid);
    });
  });

  describe('getRecordAuthor', () => {
    it('should get the author of a RecordsWriteMessage', async () => {
      // create a RecordWriteMessage object
      const { message, author } = await TestDataGenerator.generateRecordsWrite();

      const authorFromFunction = getRecordAuthor(message);
      expect(authorFromFunction).to.not.be.undefined;
      expect(authorFromFunction!).to.equal(author.did);
    });
  });
});