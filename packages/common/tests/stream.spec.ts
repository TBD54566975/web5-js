import { expect } from 'chai';
import { Readable } from 'readable-stream';

import { Stream } from '../src/stream.js';

describe('Stream', () => {

  describe('consumeToArrayBuffer()', () => {
    it('consumes a ReadableStream and returns an ArrayBuffer', async () => {
      const inputBytes = new Uint8Array([1, 2, 3, 4, 5]);
      const readableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(inputBytes);
          controller.close();
        }
      });

      const result = await Stream.consumeToArrayBuffer({ readableStream });
      expect(result).to.be.an.instanceof(ArrayBuffer);
      expect(new Uint8Array(result)).to.deep.equal(inputBytes);
    });

    it('consumes a large ReadableStream and returns the expected bytes', async () => {
      const oneMegabyte = new Uint8Array(1024 * 1024).map((_, i) => i % 256);
      const readableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(oneMegabyte);
          controller.close();
        }
      });

      const result = await Stream.consumeToArrayBuffer({ readableStream });
      expect(new Uint8Array(result)).to.deep.equal(oneMegabyte);
    });

    it('handles an empty ReadableStream', async () => {
      const readableStream = new ReadableStream({
        start(controller) {
          controller.close();
        }
      });

      const result = await Stream.consumeToArrayBuffer({ readableStream });
      expect(result).to.be.an.instanceof(ArrayBuffer);
      expect(result.byteLength).to.equal(0);
    });

    it('throws an error for a stream that errors', async () => {
      const error = new Error('Stream error');
      const readableStream = new ReadableStream({
        start(controller) {
          controller.error(error);
        }
      });

      try {
        await Stream.consumeToArrayBuffer({ readableStream });
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('consumeToBlob()', () => {
    it('consumes a ReadableStream and returns a Blob', async () => {
      const inputBytes = new Uint8Array([1, 2, 3, 4, 5]);
      const readableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(inputBytes);
          controller.close();
        }
      });

      const result = await Stream.consumeToBlob({ readableStream });
      expect(result).to.be.an.instanceof(Blob);
      expect(result.size).to.equal(inputBytes.length);

      // Read the blob to verify its content
      const arrayBuffer = await result.arrayBuffer();
      expect(new Uint8Array(arrayBuffer)).to.deep.equal(inputBytes);
    });

    it('handles an empty ReadableStream', async () => {
      const readableStream = new ReadableStream({
        start(controller) {
          controller.close();
        }
      });

      const result = await Stream.consumeToBlob({ readableStream });
      expect(result).to.be.an.instanceof(Blob);
      expect(result.size).to.equal(0);
    });

    it('consumes a large ReadableStream and returns the expected blob size', async () => {
      const oneMegabyte = new Uint8Array(1024 * 1024).map((_, i) => i % 256);
      const readableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(oneMegabyte);
          controller.close();
        }
      });

      const result = await Stream.consumeToBlob({ readableStream });
      expect(result.size).to.equal(oneMegabyte.length);
    });

    it('consumes a ReadableStream containing a string and returns the correct Blob', async () => {
      const inputString = 'Hello, World!';
      const textEncoder = new TextEncoder();
      const inputBytes = textEncoder.encode(inputString);
      const readableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(inputBytes);
          controller.close();
        }
      });

      const blob = await Stream.consumeToBlob({ readableStream });
      expect(blob).to.be.an.instanceof(Blob);
      expect(blob.size).to.equal(inputBytes.length);

      // Read the blob and verify its content
      const blobText = await blob.text();
      expect(blobText).to.equal(inputString);
    });

    it('throws an error for a stream that errors', async () => {
      const error = new Error('Stream error');
      const readableStream = new ReadableStream({
        start(controller) {
          controller.error(error);
        }
      });

      try {
        await Stream.consumeToBlob({ readableStream });
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('consumeToBytes()', () => {
    it('consumes a ReadableStream and returns a Uint8Array', async () => {
      const inputBytes = new Uint8Array([1, 2, 3, 4, 5]);
      const readableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(inputBytes);
          controller.close();
        }
      });

      const result = await Stream.consumeToBytes({ readableStream });
      expect(result).to.be.an.instanceof(Uint8Array);
      expect(result).to.deep.equal(inputBytes);
    });

    it('consumes a 5-byte ReadableStream and returns the expected bytes', async () => {
      const inputBytes = new Uint8Array([1, 2, 3, 4, 5]);
      const readableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(inputBytes);
          controller.close();
        }
      });

      const result = await Stream.consumeToBytes({ readableStream });
      expect(result).to.deep.equal(inputBytes);
    });

    it('consumes a large ReadableStream and returns the expected bytes', async () => {
      // Create a 1MB byte stream that is filled with monotonically increasing values from 0 to 255, repeatedly.
      const oneMegabyte = new Uint8Array(1024 * 1024).map((_, i) => i % 256);
      const readableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(oneMegabyte);
          controller.close();
        }
      });

      const result = await Stream.consumeToBytes({ readableStream });
      expect(result).to.deep.equal(oneMegabyte);
    });

    it('handles an empty ReadableStream', async () => {
      const readableStream = new ReadableStream({
        start(controller) {
          controller.close();
        }
      });

      const result = await Stream.consumeToBytes({ readableStream });
      expect(result).to.be.an.instanceof(Uint8Array);
      expect(result.length).to.equal(0);
    });

    it('throws an error for a stream that errors', async () => {
      const error = new Error('Stream error');
      const readableStream = new ReadableStream({
        start(controller) {
          controller.error(error);
        }
      });

      try {
        await Stream.consumeToBytes({ readableStream });
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('consumeToJson()', () => {
    it('consumes a ReadableStream containing JSON and returns a JavaScript object', async () => {
      const inputObject = { message: 'Hello, World!' };
      const inputString = JSON.stringify(inputObject);
      const textEncoder = new TextEncoder();
      const inputBytes = textEncoder.encode(inputString);
      const readableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(inputBytes);
          controller.close();
        }
      });

      const result = await Stream.consumeToJson({ readableStream });
      expect(result).to.deep.equal(inputObject);
    });

    it('throws an error for a stream containing invalid JSON', async () => {
      const invalidJson = 'Invalid JSON';
      const readableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(invalidJson));
          controller.close();
        }
      });

      try {
        await Stream.consumeToJson({ readableStream });
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.instanceOf(SyntaxError);
      }
    });

    it('handles an empty ReadableStream', async () => {
      const readableStream = new ReadableStream({
        start(controller) {
          controller.close();
        }
      });

      try {
        await Stream.consumeToJson({ readableStream });
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.instanceOf(SyntaxError); // Empty string is not valid JSON
      }
    });

    it('throws an error for a stream that errors', async () => {
      const error = new Error('Stream error');
      const readableStream = new ReadableStream({
        start(controller) {
          controller.error(error);
        }
      });

      try {
        await Stream.consumeToJson({ readableStream });
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('consumeToText', () => {
    it('consumes a ReadableStream containing text and returns a string', async () => {
      const inputText = 'Hello, World!';
      const readableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(inputText));
          controller.close();
        }
      });

      const result = await Stream.consumeToText({ readableStream });
      expect(result).to.be.a('string');
      expect(result).to.equal(inputText);
    });

    it('handles an empty ReadableStream', async () => {
      const readableStream = new ReadableStream({
        start(controller) {
          controller.close();
        }
      });

      const result = await Stream.consumeToText({ readableStream });
      expect(result).to.be.a('string');
      expect(result).to.equal('');
    });

    it('consumes a large text stream and returns the expected text', async () => {
      const largeText = 'a'.repeat(1024 * 1024); // 1MB of 'a'
      const readableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(largeText));
          controller.close();
        }
      });

      const result = await Stream.consumeToText({ readableStream });
      expect(result).to.equal(largeText);
    });

    it('throws an error for a stream that errors', async () => {
      const error = new Error('Stream error');
      const readableStream = new ReadableStream({
        start(controller) {
          controller.error(error);
        }
      });

      try {
        await Stream.consumeToText({ readableStream });
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('generateByteStream()', function () {
    it('generates a stream with the specified length and fill value', async function () {
      const streamByteLength = 100;
      const fillValue = 43;
      const stream = Stream.generateByteStream({ streamLength: streamByteLength, fillValue });

      // Read data from the stream.
      const consumedBytes = await Stream.consumeToBytes({ readableStream: stream });

      // Check the length of the received bytes
      expect(consumedBytes.length).to.equal(streamByteLength);

      // Check if all bytes are set to 43
      consumedBytes.forEach(byte => {
        expect(byte).to.equal(fillValue);
      });
    });

    it('generates a stream with the specified chunk length', async function () {
      const streamByteLength = 100;
      const chunkLength = 10;
      const fillValue = 43;
      const stream = Stream.generateByteStream({ streamLength: streamByteLength, chunkLength,  fillValue });

      // Collecting data from the stream.
      const reader = stream.getReader();
      let receivedBytes = new Uint8Array(0);
      let chunkCount = 0;
      let firstChunkLength: number | undefined;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        receivedBytes = new Uint8Array([...receivedBytes, ...value]);
        firstChunkLength ??= value.length;
        chunkCount++;
      }

      // Check the length of the received bytes.
      expect(receivedBytes.length).to.equal(streamByteLength);

      // Check the number of chunks received.
      expect(chunkCount).to.equal(Math.ceil(streamByteLength / chunkLength));

      // Check if the first chunk is of the expected length.
      expect(firstChunkLength).to.equal(chunkLength);
    });

    it('handles stream lengths that are evenly divisible by chunk length', async function () {
      const streamByteLength = 100;
      const chunkLength = 10;
      const stream = Stream.generateByteStream({ streamLength: streamByteLength, chunkLength });

      // Read data from the stream.
      const consumedBytes = await Stream.consumeToBytes({ readableStream: stream });

      // Confirm that the stream contents are as expected.
      expect(consumedBytes.length).to.equal(streamByteLength);
    });

    it('handles stream lengths that are not evenly divisible by chunk length', async function () {
      const streamByteLength = 100;
      const chunkLength = 11;
      const stream = Stream.generateByteStream({ streamLength: streamByteLength, chunkLength });

      // Read data from the stream.
      const consumedBytes = await Stream.consumeToBytes({ readableStream: stream });

      // Confirm that the stream contents are as expected.
      expect(consumedBytes.length).to.equal(streamByteLength);
    });

    it('generates a stream with chunks having random bytes within a specified range', async () => {
      const streamLength = 100;
      const chunkLength = 10;
      const fillValueRange: [number, number] = [50, 60]; // Range for random values

      const readableStream = Stream.generateByteStream({ streamLength, chunkLength, fillValue: fillValueRange });
      const reader = readableStream.getReader();

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        expect(value).to.be.an.instanceof(Uint8Array);
        expect(value.length).to.be.at.most(chunkLength);

        // Check each byte in the chunk is within the specified range
        for (const byte of value) {
          expect(byte).to.be.at.least(fillValueRange[0]);
          expect(byte).to.be.at.most(fillValueRange[1]);
        }
      }
    });

    it('generates an indefinite stream when streamLength is not provided', async () => {
      const chunkLength = 1;
      const fillValue = 0;
      const maxIterations = 10_000; // Limit iterations to avoid an infinite loop in the test.

      const readableStream = Stream.generateByteStream({ chunkLength, fillValue });
      const reader = readableStream.getReader();

      let iterations = 0;
      let allChunksValid = true;
      while (iterations < maxIterations) {
        const { done, value } = await reader.read();
        if (done) break;

        allChunksValid = allChunksValid && value.length === chunkLength;
        iterations++;
      }

      expect(iterations).to.equal(maxIterations);
      expect(allChunksValid).to.be.true;
    });
  });

  describe('isReadable()', () => {
    it('returns true for a new ReadableStream', () => {
      const stream = new ReadableStream();
      expect(Stream.isReadable({ readableStream: stream })).to.be.true;
    });

    it('returns true for an errored ReadableStream', () => {
      /**
       * Detecting an errored ReadableStream without actually reading from it is a bit tricky,
       * as the stream's error state isn't directly exposed through its interface. The standard
       * methods (getReader(), locked, etc.) do not provide information about the errored state
       * unless you attempt to read from the stream.
       *
       * Since we don't want to actually read from (i.e., partly consume) the stream, the
       * `isReadable()` method is incapable of detecting an errored stream.
       */
      const erroredStream = new ReadableStream({
        start(controller) {
          controller.error(new Error('Stream intentionally errored'));
        }
      });
      expect(Stream.isReadable({ readableStream: erroredStream })).to.be.true;
    });

    it('returns false for a locked ReadableStream', () => {
      const stream = new ReadableStream();
      const reader = stream.getReader();
      expect(Stream.isReadable({ readableStream: stream })).to.be.false;
      reader.releaseLock();
    });

    it('returns false for a consumed ReadableStream', async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue('data');
          controller.close();
        },
      });
      const reader = stream.getReader();
      await reader.read();
      await reader.closed;
      expect(Stream.isReadable({ readableStream: stream })).to.be.false;
    });

    it('returns false for a closed ReadableStream', async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.close();
        }
      });
      stream.getReader();

      expect(Stream.isReadable({ readableStream: stream })).to.be.false;
    });

    it('returns false for non-stream objects', () => {
      // @ts-expect-error because we're testing non-stream input.
      expect(Stream.isReadable({ readableStream: {} })).to.be.false;
      // @ts-expect-error because we're testing non-stream input.
      expect(Stream.isReadable({ readableStream: null })).to.be.false;
      // @ts-expect-error because we're testing non-stream input.
      expect(Stream.isReadable({ readableStream: undefined })).to.be.false;
    });

    it('returns false for a ReadableStream where getReader() throws an error', () => {
      // Create a custom ReadableStream with an overridden getReader method that throws an error
      const erroredStream = new ReadableStream();
      erroredStream.getReader = () => { throw new Error('getReader intentionally throws an error'); };

      const result = Stream.isReadable({ readableStream: erroredStream });
      expect(result).to.be.false;
    });
  });

  describe('isReadableStream()', () => {
    it('returns true for a ReadableStream', () => {
      const readableStream = new ReadableStream();
      expect(Stream.isReadableStream(readableStream)).to.be.true;
    });

    it('returns false for a Node Readable stream', () => {
      expect(Stream.isReadableStream(new Readable())).to.be.false;
    });


    it('returns false for null', () => {
      expect(Stream.isReadableStream(null)).to.be.false;
    });

    it('returns false for undefined', () => {
      expect(Stream.isReadableStream(undefined)).to.be.false;
    });

    it('returns false for a number', () => {
      expect(Stream.isReadableStream(123)).to.be.false;
    });

    it('returns false for a string', () => {
      expect(Stream.isReadableStream('string')).to.be.false;
    });

    it('returns false for a boolean', () => {
      expect(Stream.isReadableStream(true)).to.be.false;
    });

    it('returns false for an array', () => {
      expect(Stream.isReadableStream([])).to.be.false;
    });

    it('returns false for an object without getReader method', () => {
      expect(Stream.isReadableStream({})).to.be.false;
    });

    it('returns false for a function', () => {
      expect(Stream.isReadableStream(() => {})).to.be.false;
    });

    it('returns false for an object with a non-function getReader property', () => {
      const objWithNonFunctionGetReader = { getReader: 'not a function' };
      expect(Stream.isReadableStream(objWithNonFunctionGetReader)).to.be.false;
    });
  });

  describe('isStream', () => {
    it('returns true for a ReadableStream', () => {
      const readableStream = new ReadableStream();
      expect(Stream.isStream(readableStream)).to.be.true;
    });

    it('returns true for a WritableStream', () => {
      const writableStream = new WritableStream();
      expect(Stream.isStream(writableStream)).to.be.true;
    });

    it('returns true for a TransformStream', () => {
      const transformStream = new TransformStream();
      expect(Stream.isStream(transformStream)).to.be.true;
    });

    it('returns false for non-stream objects', () => {
      expect(Stream.isStream({})).to.be.false;
      expect(Stream.isStream(null)).to.be.false;
      expect(Stream.isStream(undefined)).to.be.false;
      expect(Stream.isStream(123)).to.be.false;
    });
  });

  describe('isTransformStream', () => {
    it('returns true for a TransformStream', () => {
      const transformStream = new TransformStream();
      expect(Stream.isTransformStream(transformStream)).to.be.true;
    });

    it('returns false for ReadableStream and WritableStream', () => {
      const readableStream = new ReadableStream();
      const writableStream = new WritableStream();
      expect(Stream.isTransformStream(readableStream)).to.be.false;
      expect(Stream.isTransformStream(writableStream)).to.be.false;
    });

    it('returns false for non-stream objects', () => {
      expect(Stream.isTransformStream({})).to.be.false;
      expect(Stream.isTransformStream(null)).to.be.false;
      expect(Stream.isTransformStream(undefined)).to.be.false;
      expect(Stream.isTransformStream(123)).to.be.false;
    });
  });

  describe('isWritableStream', () => {
    it('returns true for a WritableStream', () => {
      const writableStream = new WritableStream();
      expect(Stream.isWritableStream(writableStream)).to.be.true;
    });

    it('returns false for ReadableStream and TransformStream', () => {
      const readableStream = new ReadableStream();
      const transformStream = new TransformStream();
      expect(Stream.isWritableStream(readableStream)).to.be.false;
      expect(Stream.isWritableStream(transformStream)).to.be.false;
    });

    it('returns false for non-stream objects', () => {
      expect(Stream.isWritableStream({})).to.be.false;
      expect(Stream.isWritableStream(null)).to.be.false;
      expect(Stream.isWritableStream(undefined)).to.be.false;
      expect(Stream.isWritableStream(123)).to.be.false;
    });
  });

});