
import { expect } from 'chai';
import { Duplex, Readable, Transform, Writable } from 'readable-stream';

import { Stream } from '../src/stream.js';
import { NodeStream } from '../src/stream-node.js';

// Helper function to simulate a slow consumer.
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('NodeStream', () => {
  describe('consumeToArrayBuffer()', () => {
    it('consumes a Readable stream and returns an ArrayBuffer', async () => {
      const inputText = 'Hello, World!';
      const inputBytes = new TextEncoder().encode(inputText);
      const nodeReadable = new Readable();
      nodeReadable.push(inputBytes);
      nodeReadable.push(null); // Signifies the end of the stream

      const arrayBuffer = await NodeStream.consumeToArrayBuffer({ readable: nodeReadable });
      expect(arrayBuffer).to.be.an.instanceof(ArrayBuffer);
      expect(new Uint8Array(arrayBuffer)).to.deep.equal(inputBytes);
    });

    it('handles an empty Readable stream', async () => {
      const nodeReadable = new Readable();
      nodeReadable.push(null); // Empty stream

      const arrayBuffer = await NodeStream.consumeToArrayBuffer({ readable: nodeReadable });
      expect(arrayBuffer).to.be.an.instanceof(ArrayBuffer);
      expect(arrayBuffer.byteLength).to.equal(0);
    });

    it('consumes a large Readable stream and returns the expected ArrayBuffer', async () => {
      const largeData = new Uint8Array(1024 * 1024).fill('a'.charCodeAt(0)); // 1MB data
      const nodeReadable = new Readable();
      nodeReadable.push(largeData);
      nodeReadable.push(null);

      const arrayBuffer = await NodeStream.consumeToArrayBuffer({ readable: nodeReadable });
      expect(arrayBuffer).to.be.an.instanceof(ArrayBuffer);
      expect(arrayBuffer.byteLength).to.equal(largeData.byteLength);
    });

    it('throws an error for a stream that errors', async () => {
      const error = new Error('Stream error');
      const nodeReadable = new Readable({
        read() {
          this.emit('error', error);
        }
      });

      try {
        await NodeStream.consumeToArrayBuffer({ readable: nodeReadable });
        expect.fail('consumeToArrayBuffer() should have thrown an error');
      } catch (caughtError) {
        expect(caughtError).to.equal(error);
      }
    });
  });

  describe('consumeToBlob()', () => {
    it('consumes a Readable stream and returns a Blob', async () => {
      const inputText = 'Hello, World!';
      const inputBytes = new TextEncoder().encode(inputText);
      const nodeReadable = new Readable();
      nodeReadable.push(inputBytes);
      nodeReadable.push(null); // Signifies the end of the stream

      const blob = await NodeStream.consumeToBlob({ readable: nodeReadable });
      expect(blob).to.be.an.instanceof(Blob);
      expect(blob.size).to.equal(inputBytes.byteLength);

      const text = await blob.text();
      expect(text).to.equal(inputText);
    });

    it('handles an empty Readable stream', async () => {
      const nodeReadable = new Readable();
      nodeReadable.push(null); // Empty stream

      const blob = await NodeStream.consumeToBlob({ readable: nodeReadable });
      expect(blob).to.be.an.instanceof(Blob);
      expect(blob.size).to.equal(0);
    });

    it('consumes a large Readable stream and returns the expected blob size', async () => {
      const largeData = new Uint8Array(1024 * 1024).fill('a'.charCodeAt(0)); // 1MB data
      const nodeReadable = new Readable();
      nodeReadable.push(largeData);
      nodeReadable.push(null);

      const blob = await NodeStream.consumeToBlob({ readable: nodeReadable });
      expect(blob).to.be.an.instanceof(Blob);
      expect(blob.size).to.equal(largeData.byteLength);
    });

    it('consumes a Readable stream containing a string and returns the correct Blob', async () => {
      const inputString = 'Hello, World!';
      const textEncoder = new TextEncoder();
      const inputBytes = textEncoder.encode(inputString);
      const nodeReadable = new Readable();
      nodeReadable.push(inputBytes);
      nodeReadable.push(null);

      const blob = await NodeStream.consumeToBlob({ readable: nodeReadable });
      expect(blob.size).to.equal(inputBytes.length);

      // Read the blob and verify its content
      const blobText = await blob.text();
      expect(blobText).to.equal(inputString);
    });

    it('throws an error for a stream that errors', async () => {
      const error = new Error('Stream error');
      const nodeReadable = new Readable({
        read() {
          this.emit('error', error);
        }
      });

      try {
        await NodeStream.consumeToBlob({ readable: nodeReadable });
        expect.fail('consumeToBlob() should have thrown an error');
      } catch (caughtError) {
        expect(caughtError).to.equal(error);
      }
    });
  });

  describe('consumeToBytes()', () => {
    it('consumes a Readable stream and returns a Uint8Array', async () => {
      const inputBytes = new Uint8Array([1, 2, 3, 4, 5]);
      const nodeReadable = new Readable();
      nodeReadable.push(inputBytes);
      nodeReadable.push(null);

      const result = await NodeStream.consumeToBytes({ readable: nodeReadable });
      expect(result).to.be.an.instanceof(Uint8Array);
      expect(result).to.deep.equal(inputBytes);
    });

    it('consumes a 5-byte ReadableStream and returns the expected bytes', async () => {
      const inputBytes = new Uint8Array([1, 2, 3, 4, 5]);
      const nodeReadable = new Readable();
      nodeReadable.push(inputBytes);
      nodeReadable.push(null);

      const result = await NodeStream.consumeToBytes({ readable: nodeReadable });
      expect(result).to.deep.equal(inputBytes);
    });

    it('consumes a large ReadableStream and returns the expected bytes', async () => {
      // Create a 1MB byte stream that is filled with monotonically increasing values from 0 to 255, repeatedly.
      const oneMegabyte = new Uint8Array(1024 * 1024).map((_, i) => i % 256);
      const nodeReadable = new Readable();
      nodeReadable.push(oneMegabyte);
      nodeReadable.push(null);

      const result = await NodeStream.consumeToBytes({ readable: nodeReadable });
      expect(result).to.deep.equal(oneMegabyte);
    });

    it('handles an empty ReadableStream', async () => {
      const nodeReadable = new Readable();
      nodeReadable.push(null); // Empty stream

      const result = await NodeStream.consumeToBytes({ readable: nodeReadable });
      expect(result).to.be.an.instanceof(Uint8Array);
      expect(result.length).to.equal(0);
    });

    it('throws an error for a stream that errors', async () => {
      const error = new Error('Stream error');
      const nodeReadable = new Readable({
        read() {
          this.emit('error', error);
        }
      });

      try {
        await NodeStream.consumeToBytes({ readable: nodeReadable });
        expect.fail('consumeToBytes() should have thrown an error');
      } catch (caughtError) {
        expect(caughtError).to.equal(error);
      }
    });
  });

  describe('consumeToJson()', () => {
    it('consumes a Readable stream containing JSON and returns a JavaScript object', async () => {
      const inputObject = { message: 'Hello, World!' };
      const inputString = JSON.stringify(inputObject);
      const textEncoder = new TextEncoder();
      const inputBytes = textEncoder.encode(inputString);
      const nodeReadable = new Readable();
      nodeReadable.push(inputBytes);
      nodeReadable.push(null);

      const result = await NodeStream.consumeToJson({ readable: nodeReadable });
      expect(result).to.deep.equal(inputObject);
    });

    it('throws an error for a stream containing invalid JSON', async () => {
      const invalidJson = 'Invalid JSON';
      const nodeReadable = new Readable();
      nodeReadable.push(new TextEncoder().encode(invalidJson));
      nodeReadable.push(null);

      try {
        await NodeStream.consumeToJson({ readable: nodeReadable });
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.instanceOf(SyntaxError);
      }
    });

    it('throws an error for an empty Readable stream', async () => {
      const nodeReadable = new Readable();
      nodeReadable.push(null); // Empty stream

      try {
        await NodeStream.consumeToJson({ readable: nodeReadable });
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.instanceOf(SyntaxError); // Empty string is not valid JSON
      }
    });

    it('throws an error for a stream that errors', async () => {
      const error = new Error('Stream error');
      const nodeReadable = new Readable({
        read() {
          this.emit('error', error);
        }
      });

      try {
        await NodeStream.consumeToJson({ readable: nodeReadable });
        expect.fail('consumeToJson() should have thrown an error');
      } catch (caughtError) {
        expect(caughtError).to.equal(error);
      }
    });
  });

  describe('consumeToText()', () => {
    it('consumes a Readable stream containing text and returns a string', async () => {
      const inputText = 'Hello, World!';
      const nodeReadable = new Readable();
      nodeReadable.push(new TextEncoder().encode(inputText));
      nodeReadable.push(null);

      const result = await NodeStream.consumeToText({ readable: nodeReadable});
      expect(result).to.be.a('string');
      expect(result).to.equal(inputText);
    });

    it('handles an empty Readable stream', async () => {
      const nodeReadable = new Readable();
      nodeReadable.push(null); // Empty stream

      const result = await NodeStream.consumeToText({ readable: nodeReadable});
      expect(result).to.be.a('string');
      expect(result).to.equal('');
    });

    it('consumes a large text stream and returns the expected text', async () => {
      const largeText = 'a'.repeat(1024 * 1024); // 1MB of 'a'
      const nodeReadable = new Readable();
      nodeReadable.push(new TextEncoder().encode(largeText));
      nodeReadable.push(null);

      const result = await NodeStream.consumeToText({ readable: nodeReadable});
      expect(result).to.equal(largeText);
    });

    it('throws an error for a stream that errors', async () => {
      const error = new Error('Stream error');
      const nodeReadable = new Readable({
        read() {
          this.emit('error', error);
        }
      });

      try {
        await NodeStream.consumeToText({ readable: nodeReadable });
        expect.fail('consumeToText() should have thrown an error');
      } catch (caughtError) {
        expect(caughtError).to.equal(error);
      }
    });
  });

  describe('fromWebReadable()', () => {
    it('converts a Web ReadableStream to a Node Readable and reads the data correctly', (done) => {
    // Step 1: Create a Web ReadableStream
      const inputData = ['chunk1', 'chunk2', 'chunk3'];
      const webStream = new ReadableStream({
        start(controller) {
          inputData.forEach(chunk => controller.enqueue(chunk));
          controller.close();
        }
      });

      // Step 2: Convert to Node Readable
      const nodeReadable = NodeStream.fromWebReadable({ readableStream: webStream });

      // Step 3: Read from the Node Readable
      let concatenatedData = '';
      nodeReadable.on('data', (chunk) => {
        concatenatedData += chunk;
      });

      nodeReadable.on('end', () => {
      // Step 4: Compare the concatenated data with the original input
        const originalDataString = inputData.join('');
        expect(concatenatedData).to.equal(originalDataString);
        done();
      });

      nodeReadable.on('error', (error) => {
        done(error);
      });
    });

    it('handles backpressure properly', async () => {
      // Create a Web ReadableStream with 1MB of data in 100KB chunks.
      const streamLength = 1*1024*1024; // 1MB
      const chunkLength = 100*1024; // 100KB
      const webStream = Stream.generateByteStream({ streamLength, chunkLength });

      // Convert to Node Readable with a small highWaterMark to induce backpressure
      const nodeReadable = NodeStream.fromWebReadable({
        readableStream  : webStream,
        readableOptions : { highWaterMark: 1, readableHighWaterMark: 1 }
      });

      // 'end' will be triggered once when there is no more data available.
      let endReached = false;
      nodeReadable.on('end', () => {
        // Reached end of stream.
        endReached = true;
      });

      let receivedBytes = 0;

      // Read chunks one at a time with delay to simulate slow consumer.
      for await (const chunk of nodeReadable) {
        receivedBytes += chunk.length; // Keep track of total bytes received.
        await sleep(2); // Introduce delay between reads
      }

      expect(receivedBytes).to.equal(streamLength);
      expect(endReached).to.be.true;
    });

    it('throws an error when passed a Node Readable stream', () => {
      const nodeReadable = new Readable();

      try {
        // @ts-expect-error because a Node Readable is specified instead of a Web ReadableStream.
        NodeStream.fromWebReadable({ readableStream: nodeReadable });
        expect.fail('Expected method to throw an error with Node Readable input');
      } catch (error: any) {
        expect(error).to.be.an.instanceOf(TypeError);
        expect(error.message).to.include('not a Web ReadableStream');
      }
    });

    it('throws an error when passed a non-stream object', () => {
      const notAStream = {};

      try {
        // @ts-expect-error because notAStream is not a stream.
        NodeStream.fromWebReadable({ readableStream: notAStream });
        expect.fail('Expected method to throw an error with non-stream object');
      } catch (error: any) {
        expect(error).to.be.an.instanceOf(TypeError);
        expect(error.message).to.include('not a Web ReadableStream');
      }
    });

    it('throws an error if an error occurs during stream processing', async () => {
      // Create a Web ReadableStream that throws an error.
      let controller: ReadableStreamDefaultController;
      const webStream = new ReadableStream({
        start(c) {
          controller = c;
          // Simulate an error after a delay.
          setTimeout(() => controller.error(new Error('Test error1')), 10);
        }
      });

      // Convert to Node Readable
      const nodeReadable = NodeStream.fromWebReadable({ readableStream: webStream });

      nodeReadable.on('error', (error) => {
        // Expect the 'error' event to be emitted with the error 'Test error'.
        expect(error).to.be.an.instanceof(Error);
        expect(error.message).to.equal('Test error1');
      });

      try {
        // Start reading from the stream to trigger the error.
        for await (const _chunk of nodeReadable) { /* Do nothing */ }
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        // Expect the error to be thrown.
        expect(error).to.be.an.instanceof(Error);
        expect(error.message).to.equal('Test error1');
      }
    });

    it('calls reader.cancel() if the stream is destroyed before closing', function (done) {
      // Create a Web ReadableStream.
      const webStream = new ReadableStream({
        start(controller) {
          // Enqueue some data and then delay closing the stream.
          controller.enqueue('test data');
          setTimeout(() => {
            try {
              controller.close();
            } catch (error: any) {
              // Expect an error indicating that an already closed stream can't be closed again.
              expect(error).to.be.an.instanceof(Error);
              expect(error.message).to.include('close');
            }
          }, 25);
        }
      });

      // Convert to Node Readable.
      const nodeReadable = NodeStream.fromWebReadable({ readableStream: webStream });

      // Destroy the Node stream before the Web stream has closed.
      setTimeout(() => nodeReadable.destroy(new Error('Test error')), 5);

      nodeReadable.on('close', () => {
        // The test passes if this callback is invoked, indicating that destroy was called.
        done();
      });

      nodeReadable.on('error', (error) => {
        expect(error).to.be.an.instanceof(Error);
        expect(error.message).to.equal('Test error');
      });
    });
  });

  describe('isDestroyed', () => {
    it('returns true for a destroyed Duplex stream', () => {
      const duplex = new Duplex({
        read() {},
        write(chunk, encoding, callback) { callback(); }
      });
      duplex.destroy();
      expect(NodeStream.isDestroyed({ stream: duplex })).to.be.true;
    });

    it('returns true for a destroyed Readable stream', () => {
      const readable = new Readable({ read() {} });
      readable.destroy();
      expect(NodeStream.isDestroyed({ stream: readable })).to.be.true;
    });

    it('returns true for a destroyed Transform stream', () => {
      const transform = new Transform({
        transform(chunk, encoding, callback) { callback(); }
      });
      transform.destroy();
      expect(NodeStream.isDestroyed({ stream: transform })).to.be.true;
    });

    it('returns true for a destroyed Writable stream', () => {
      const writable = new Writable({
        write(chunk, encoding, callback) { callback(); }
      });
      writable.destroy();
      expect(NodeStream.isDestroyed({ stream: writable })).to.be.true;
    });

    it('returns false for a non-destroyed Duplex stream', () => {
      const duplex = new Duplex({ read() {}, write(chunk, encoding, callback) { callback(); } });
      expect(NodeStream.isDestroyed({ stream: duplex })).to.be.false;
    });

    it('returns false for a non-destroyed Readable stream', () => {
      const readable = new Readable({ read() {} });
      expect(NodeStream.isDestroyed({ stream: readable })).to.be.false;
    });

    it('returns false for a non-destroyed Transform stream', () => {
      const transform = new Transform({ transform(chunk, encoding, callback) { callback(); } });
      expect(NodeStream.isDestroyed({ stream: transform })).to.be.false;
    });

    it('returns false for a non-destroyed Writable stream', () => {
      const writable = new Writable({ write(chunk, encoding, callback) { callback(); } });
      expect(NodeStream.isDestroyed({ stream: writable })).to.be.false;
    });

    it('throws an error when input is not a Node stream', () => {
      const notAStream = {};

      try {
        // @ts-expect-error because notAStream is not a Node stream.
        NodeStream.isDestroyed({ stream: notAStream });
        expect.fail('Method did not throw');
      } catch (error: any) {
        expect(error).to.be.an.instanceOf(TypeError);
        expect(error.message).to.equal('NodeStream.isDestroyed: \'stream\' is not a Node stream.');
      }
    });
  });

  describe('isReadable()', () => {
    it('returns true for a readable stream', () => {
      const nodeReadable = new Readable({ read() {} });

      expect(NodeStream.isReadable({ readable: nodeReadable })).to.be.true;
    });

    it('returns false for a paused stream', () => {
      const nodeReadable = new Readable({ read() {} });
      nodeReadable.pause();
      expect(NodeStream.isReadable({ readable: nodeReadable })).to.be.false;
    });

    it('returns false for a stream that has ended', async () => {
      const nodeReadable = new Readable();
      nodeReadable.push(null); // End the stream

      expect(NodeStream.isReadable({ readable: nodeReadable })).to.be.false;
    });

    it(`returns false for a stream that has ended and the 'end' event has been emitted`, async () => {
      const nodeReadable = new Readable();
      nodeReadable.push(new Uint8Array([1]));
      nodeReadable.push(null); // End the stream

      nodeReadable.on('end', () => {
        expect(NodeStream.isReadable({ readable: nodeReadable })).to.be.false;
      });

      for await (const _chunk of nodeReadable) {
        // Only reading the chunks to trigger emitting the 'end' event.
      }
    });

    it('returns false for a destroyed stream', () => {
      const nodeReadable = new Readable({ read() {} });
      nodeReadable.destroy();
      expect(NodeStream.isReadable({ readable: nodeReadable })).to.be.false;
    });

    it('returns false for a non-stream object', () => {
      const nonStreamObject = {};
      // @ts-expect-error because nonStreamObject is not a stream.
      expect(NodeStream.isReadable({ readable: nonStreamObject })).to.be.false;
    });

    it('returns false for null', () => {
      // @ts-expect-error because null is not a stream.
      expect(NodeStream.isReadable({ readable: null })).to.be.false;
    });

    it('returns false for undefined', () => {
      // @ts-expect-error because undefined is not a stream.
      expect(NodeStream.isReadable({ readable: undefined })).to.be.false;
    });
  });

  describe('isReadableStream()', () => {
    it('returns true for a Node Readable stream', () => {
      const nodeReadable = new Readable();
      const result = NodeStream.isReadableStream(nodeReadable);
      expect(result).to.be.true;
    });

    it('returns false for a web ReadableStream', () => {
      const readableStream = new ReadableStream();
      expect(NodeStream.isReadableStream(readableStream)).to.be.false;
    });

    it('returns false for a non-stream object', () => {
      const nonStreamObject = { pipe: () => {}, on: () => {} };
      const result = NodeStream.isReadableStream(nonStreamObject);
      expect(result).to.be.false;
    });

    it('returns false for null', () => {
      const result = NodeStream.isReadableStream(null);
      expect(result).to.be.false;
    });

    it('returns false for undefined', () => {
      const result = NodeStream.isReadableStream(undefined);
      expect(result).to.be.false;
    });

    it('returns false for a string', () => {
      const result = NodeStream.isReadableStream('not a stream');
      expect(result).to.be.false;
    });

    it('returns false for a number', () => {
      const result = NodeStream.isReadableStream(42);
      expect(result).to.be.false;
    });

    it('returns false for an array', () => {
      const result = NodeStream.isReadableStream([]);
      expect(result).to.be.false;
    });

    it('returns false for a function', () => {
      const result = NodeStream.isReadableStream(() => {});
      expect(result).to.be.false;
    });

    it('returns false for an object without stream methods', () => {
      const nonStreamObject = { someProperty: 'some value' };
      const result = NodeStream.isReadableStream(nonStreamObject);
      expect(result).to.be.false;
    });
  });

  describe('isStream', () => {
    it('returns true for a Readable stream', () => {
      const readableStream = new Readable({ read() {} });
      expect(NodeStream.isStream(readableStream)).to.be.true;
    });

    it('returns true for a Writable stream', () => {
      const writableStream = new Writable();
      expect(NodeStream.isStream(writableStream)).to.be.true;
    });

    it('returns true for a Duplex stream', () => {
      const duplexStream = new Duplex();
      expect(NodeStream.isStream(duplexStream)).to.be.true;
    });

    it('returns true for a Transform stream', () => {
      const transformStream = new Transform();
      expect(NodeStream.isStream(transformStream)).to.be.true;
    });

    it('returns false for a non-stream object', () => {
      const nonStreamObject = { someProperty: 'value' };
      expect(NodeStream.isStream(nonStreamObject)).to.be.false;
    });

    it('returns false for null', () => {
      expect(NodeStream.isStream(null)).to.be.false;
    });

    it('returns false for undefined', () => {
      expect(NodeStream.isStream(undefined)).to.be.false;
    });

    it('returns false for a string', () => {
      expect(NodeStream.isStream('not a stream')).to.be.false;
    });

    it('returns false for a number', () => {
      expect(NodeStream.isStream(42)).to.be.false;
    });

    it('returns false for a function', () => {
      expect(NodeStream.isStream(() => {})).to.be.false;
    });

    it('returns false for an array', () => {
      expect(NodeStream.isStream([])).to.be.false;
    });
  });

  describe('toWebReadable()', () => {
    it('converts a Node Readable stream to a Web ReadableStream', async () => {
      const inputData = ['chunk1', 'chunk2', 'chunk3'];
      const nodeReadable = new Readable();
      inputData.forEach(chunk => nodeReadable.push(chunk));
      nodeReadable.push(null); // Signifies the end of the stream

      const webReadable = NodeStream.toWebReadable({ readable: nodeReadable });

      // Read data from the Web ReadableStream
      const reader = webReadable.getReader();
      let concatenatedData = '';
      let result;
      do {
        result = await reader.read();
        if (!result.done) {
          concatenatedData += result.value;
        }
      } while (!result.done);

      // Compare the concatenated data with the original input
      expect(concatenatedData).to.equal(inputData.join(''));
    });

    it('closes the Web ReadableStream when the Node stream ends', async () => {
      const nodeReadable = new Readable({
        read() {
          this.push('data');
          this.push(null); // End the stream
        }
      });

      const webReadable = NodeStream.toWebReadable({ readable: nodeReadable });
      const reader = webReadable.getReader();

      const { done } = await reader.read();
      expect(done).to.be.false;

      const result = await reader.read();
      expect(result.done).to.be.true;
    });

    it('handles errors in the Node stream', async () => {
      const error = new Error('Test error');
      const nodeReadable = new Readable({
        read() {
          this.emit('error', error);
        }
      });

      const webReadable = NodeStream.toWebReadable({ readable: nodeReadable });
      const reader = webReadable.getReader();

      try {
        await reader.read();
        expect.fail('Error was not thrown');
      } catch (caughtError) {
        expect(caughtError).to.equal(error);
      }
    });

    it('cancels the Node stream when the Web ReadableStream is canceled', async () => {
      let canceled = false;
      const nodeReadable = new Readable({
        read() {},
        destroy() {
          canceled = true;
        }
      });

      const webReadable = NodeStream.toWebReadable({ readable: nodeReadable });
      const reader = webReadable.getReader();

      await reader.cancel();
      expect(canceled).to.be.true;
    });

    it('throws an error when input is not a Node Readable stream', () => {
      const notAStream = {};

      try {
        // @ts-expect-error because notAStream is not a Node stream.
        NodeStream.toWebReadable({ readable: notAStream });
        expect.fail('Method did not throw');
      } catch (error: any) {
        expect(error).to.be.an.instanceOf(TypeError);
        expect(error.message).to.include('is not a Node Readable stream');
      }
    });

    it('returns a cancelled ReadableStream for a destroyed Node stream', async () => {
      const destroyedStream = new Readable({
        read() { this.destroy(); }
      });
      destroyedStream.destroy();

      const webReadable = NodeStream.toWebReadable({ readable: destroyedStream });

      try {
        const reader = webReadable.getReader();
        await reader.read();
        expect.fail('Stream was not cancelled');
      } catch (error) {
        // Check if the error is due to cancellation
        expect(error).to.be.an.instanceOf(Error); // Adjust according to the expected error type
      }
    });
  });

});