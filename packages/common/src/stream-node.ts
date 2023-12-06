import type { Duplex, ReadableStateOptions, Transform, Writable } from 'readable-stream';

import { Readable } from 'readable-stream';
import { Stream } from './stream.js';
import { Convert } from './convert.js';

export { Readable } from 'readable-stream';

export class NodeStream {
  /**
   * Consumes a `Readable` stream and returns its contents as an `ArrayBuffer`.
   *
   * This method reads all data from a Node.js `Readable` stream, collects it, and converts it into
   * an `ArrayBuffer`.
   *
   * @example
   * ```ts
   * const nodeReadable = getReadableStreamSomehow();
   * const arrayBuffer = await NodeStream.consumeToArrayBuffer({ readable: nodeReadable });
   * ```
   *
   * @param readable - The Node.js Readable stream whose data will be consumed.
   * @returns A Promise that resolves to an `ArrayBuffer` containing all the data from the stream.
   */
  public static async consumeToArrayBuffer({ readable }: { readable: Readable}): Promise<ArrayBuffer> {
    const arrayBuffer = await Convert.asyncIterable(readable).toArrayBufferAsync();

    return arrayBuffer;
  }

  /**
   * Consumes a `Readable` stream and returns its contents as a `Blob`.
   *
   * This method reads all data from a Node.js `Readable` stream, collects it, and converts it into
   * a `Blob`.
   *
   * @example
   * ```ts
   * const nodeReadable = getReadableStreamSomehow();
   * const blob = await NodeStream.consumeToBlob({ readable: nodeReadable });
   * ```
   *
   * @param readableStream - The Node.js `Readable` stream whose data will be consumed.
   * @returns A Promise that resolves to a `Blob` containing all the data from the stream.
   */
  public static async consumeToBlob({ readable }: { readable: Readable }): Promise<Blob> {
    const blob = await Convert.asyncIterable(readable).toBlobAsync();

    return blob;
  }

  /**
   * Consumes a `Readable` stream and returns its contents as a `Uint8Array`.
   *
   * This method reads all data from a Node.js `Readable`, collects it, and converts it into a
   * `Uint8Array`.
   *
   * @example
   * ```ts
   * const nodeReadable = getReadableStreamSomehow();
   * const bytes = await NodeStream.consumeToBytes({ readable: nodeReadable });
   * ```
   *
   * @param readableStream - The Node.js `Readable` stream whose data will be consumed.
   * @returns A Promise that resolves to a `Uint8Array` containing all the data from the stream.
   */
  public static async consumeToBytes({ readable }: { readable: Readable }): Promise<Uint8Array> {
    const bytes = await Convert.asyncIterable(readable).toUint8ArrayAsync();

    return bytes;
  }

  /**
   * Consumes a `Readable` stream and parses its contents as JSON.
   *
   * This method reads all the data from the stream, converts it to a text string, and then parses
   * it as JSON, returning the resulting object.
   *
   * @example
   * ```ts
   * const nodeReadable = getReadableStreamSomehow();
   * const jsonData = await NodeStream.consumeToJson({ readable: nodeReadable });
   * ```
   *
   * @param readableStream - The Node.js `Readable` stream whose JSON content will be consumed.
   * @returns A Promise that resolves to the parsed JSON object from the stream's data.
   */
  public static async consumeToJson({ readable }: { readable: Readable }): Promise<any> {
    const object = await Convert.asyncIterable(readable).toObjectAsync();

    return object;
  }

  /**
   * Consumes a `Readable` stream and returns its contents as a text string.
   *
   * This method reads all the data from the stream, converting it into a single string.
   *
   * @example
   * ```ts
   * const nodeReadable = getReadableStreamSomehow();
   * const text = await NodeStream.consumeToText({ readable: nodeReadable });
   * ```
   *
   * @param readableStream - The Node.js `Readable` stream whose text content will be consumed.
   * @returns A Promise that resolves to a string containing all the data from the stream.
   */
  public static async consumeToText({ readable }: { readable: Readable}): Promise<string> {
    const text = await Convert.asyncIterable(readable).toStringAsync();

    return text;
  }

  /**
   * Converts a Web `ReadableStream` to a Node.js `Readable` stream.
   *
   * This method takes a Web `ReadableStream` and converts it to a Node.js `Readable` stream.
   * The conversion is done by reading chunks from the Web `ReadableStream` and pushing them
   * into the Node.js `Readable` stream.
   *
   * @example
   * ```ts
   * const webReadableStream = getWebReadableStreamSomehow();
   * const nodeReadableStream = NodeStream.fromWebReadable({ readableStream: webReadableStream });
   * ```
   *
   * @param readableStream - The Web `ReadableStream` to be converted.
   * @param readableOptions - Optional `Readable` stream options for the Node.js stream.
   * @returns The Node.js `Readable` stream.
   */
  public static fromWebReadable({ readableStream, readableOptions }: {
    readableStream: ReadableStream,
    readableOptions?: ReadableStateOptions
  }): Readable {
    if (!Stream.isReadableStream(readableStream)) {
      throw new TypeError(`NodeStream.fromWebReadable: 'readableStream' is not a Web ReadableStream.`);
    }

    const reader = readableStream.getReader();
    let closed = false;

    const nodeReadable = new Readable({
      ...readableOptions,

      read: function () {
        reader.read().then(({ done, value }) => {
          if (done) {
            this.push(null); // Push null to signify end of stream.
          } else {
            if (!this.push(value)) {
              // When push returns false, we should stop reading until _read is called again.
              return;
            }
          }
        }).catch((error) => {
          // If an error occurs while reading, destroy the stream.
          this.destroy(error);
        });
      },

      destroy: function (error, callback) {
        function done() {
          callback(error);
        }

        if (!closed) {
          reader.cancel(error)
            .then(done)
            .catch(done);
          return;
        }
        done();
      }
    });

    reader.closed
      .then(() => {
        closed = true; // Prevents reader.cancel() from being called in destroy()
      })
      .catch((error) => {
        closed = true; // Prevents reader.cancel() from being called in destroy()
        nodeReadable.destroy(error);
      });

    return nodeReadable;
  }

  /**
   * Checks if a Node.js stream (`Readable`, `Writable`, `Duplex`, or `Transform`) has been destroyed.
   *
   * This method determines whether the provided Node.js stream has been destroyed. A stream
   * is considered destroyed if its 'destroyed' property is set to true or if its internal state
   * indicates it has been destroyed.
   *
   * @example
   * ```ts
   * const stream = getStreamSomehow();
   * stream.destroy(); // Destroy the stream.
   * const isDestroyed = NodeStream.isDestroyed({ stream });
   * console.log(isDestroyed); // Output: true
   * ```
   *
   * @param stream - The Node.js stream to check.
   * @returns `true` if the stream has been destroyed; otherwise, `false`.
   */
  public static isDestroyed({ stream }: { stream: Readable | Writable | Duplex | Transform }): boolean {
    if (!NodeStream.isStream(stream)) {
      throw new TypeError(`NodeStream.isDestroyed: 'stream' is not a Node stream.`);
    }

    const writableState = '_writableState' in stream ? stream._writableState : undefined;
    const readableState = stream._readableState;
    const state = writableState || readableState;

    return !!(stream.destroyed || state.destroyed);
  }

  /**
   * Checks if a Node.js `Readable` stream is still readable.
   *
   * This method checks if a Node.js `Readable` stream is still in a state that allows reading from
   * it. A stream is considered readable if it has not ended, has not been destroyed, and is not
   * currently paused.
   *
   * @example
   * ```ts
   * const readableStream = new Readable();
   * const isReadable = NodeStream.isReadable({ readable: readableStream });
   * console.log(isReadable); // Output: true or false
   * ```
   *
   * @param readable - The Node.js `Readable` stream to be checked.
   * @returns `true` if the stream is still readable; otherwise, `false`.
   */
  public static isReadable({ readable }: { readable: Readable }): boolean {
    // Check if the object is a Node Readable stream.
    if (!NodeStream.isReadableStream(readable)) {
      return false;
    }

    // Check if the stream is still readable.
    return (
      readable.readable && // Is the stream readable?
        (typeof readable._readableState.ended === 'boolean' && !readable._readableState.ended) && // Has the 'end' method been called?
        (typeof readable._readableState.endEmitted === 'boolean' && !readable._readableState.endEmitted) && // Has the 'end' event been emitted?
        !readable.destroyed && // Has the 'destroy' method been called?
        !readable.isPaused() // Is the stream paused?
    );
  }

  /**
   * Checks if an object is a Node.js `Readable` stream.
   *
   * This method verifies if the provided object is a Node.js `Readable` stream by checking for
   * specific properties and methods typical of a `Readable` stream in Node.js.
   *
   * @example
   * ```ts
   * const obj = getSomeObject();
   * if (NodeStream.isReadableStream(obj)) {
   *   // obj is a Node.js Readable stream
   * }
   * ```
   *
   * @param obj - The object to be checked.
   * @returns `true` if `obj` is a Node.js `Readable` stream; otherwise, `false`.
   */
  static isReadableStream(obj: unknown): obj is Readable {
    return (
      typeof obj === 'object' &&
        obj !== null &&
        ('pipe' in obj && typeof obj.pipe === 'function') &&
        ('on' in obj && typeof obj.on === 'function') &&
        (!('_writableState' in obj) && '_readableState' in obj)
    );
  }

  /**
   * Checks if the provided object is a Node.js stream (`Duplex`, `Readable`, `Writable`, or `Transform`).
   *
   * This method checks for the presence of internal properties specific to Node.js streams:
   * `_readableState` and `_writableState`. These properties are present in Node.js stream
   * instances, allowing identification of the stream type.
   *
   * The `_readableState` property is found in `Readable` and `Duplex` streams (including
   * `Transform` streams, which are a type of `Duplex` stream), indicating that the stream can be
   * read from. The `_writableState` property is found in `Writable` and `Duplex` streams,
   * indicating that the stream can be written to.
   *
   * @example
   * ```ts
   * const { Readable, Writable, Duplex, Transform } = require('stream');
   *
   * const readableStream = new Readable();
   * console.log(NodeStream.isStream(readableStream)); // Output: true
   *
   * const writableStream = new Writable();
   * console.log(NodeStream.isStream(writableStream)); // Output: true
   *
   * const duplexStream = new Duplex();
   * console.log(NodeStream.isStream(duplexStream)); // Output: true
   *
   * const transformStream = new Transform();
   * console.log(NodeStream.isStream(transformStream)); // Output: true
   *
   * const nonStreamObject = {};
   * console.log(NodeStream.isStream(nonStreamObject)); // Output: false
   * ```
   *
   * @remarks
   * - This method does not differentiate between the different types of streams (Readable,
   *   Writable, Duplex, Transform). It simply checks if the object is any kind of Node.js stream.
   * - While this method can identify standard Node.js streams, it may not recognize custom or
   *   third-party stream-like objects that do not inherit directly from Node.js's stream classes
   *   or do not have these internal state properties. This is intentional as many of the methods
   *   in this library are designed to work with standard Node.js streams.
   *
   * @param obj - The object to be checked for being a Node.js stream.
   * @returns `true` if the object is a Node.js stream (`Duplex`, `Readable`, `Writable`, or `Transform`); otherwise, `false`.
   */
  public static isStream(obj: unknown): obj is Duplex | Readable | Writable | Transform  {
    return (
      typeof obj === 'object' && obj !== null &&
      ('_readableState' in obj || '_writableState' in obj)
    );
  }

  /**
   * Converts a Node.js `Readable` stream to a Web `ReadableStream`.
   *
   * This method provides a bridge between Node.js streams and the Web Streams API by converting a
   * Node.js `Readable` stream into a Web `ReadableStream`. It listens for 'data', 'end', and 'error'
   * events on the Node.js stream and appropriately enqueues data, closes, or errors the Web
   * `ReadableStream`.
   *
   * If the Node.js stream is already destroyed, the method returns an immediately cancelled
   * Web `ReadableStream`.
   *
   * @example
   * ```ts
   * const nodeReadable = getNodeReadableStreamSomehow();
   * const webReadableStream = NodeStream.toWebReadable({ readable: nodeReadable });
   * ```
   *
   * @param readable - The Node.js `Readable` stream to be converted.
   * @returns A Web `ReadableStream` corresponding to the provided Node.js `Readable` stream.
   * @throws TypeError if `readable` is not a Node.js `Readable` stream.
   * @throws Error if the Node.js `Readable` stream is already destroyed.
   */
  static toWebReadable({ readable }: { readable: Readable }): ReadableStream {
    if (!NodeStream.isReadableStream(readable)) {
      throw new TypeError(`NodeStream.toWebReadable: 'readable' is not a Node Readable stream.`);
    }

    if (NodeStream.isDestroyed({ stream: readable })) {
      const readable = new ReadableStream();
      readable.cancel();
      return readable;
    }

    return new ReadableStream({
      start(controller) {
        readable.on('data', (chunk) => {
          controller.enqueue(chunk);
        });

        readable.on('end', () => {
          controller.close();
        });

        readable.on('error', (err) => {
          controller.error(err);
        });
      },

      cancel() {
        readable.destroy();
      }
    });
  }
}