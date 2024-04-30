import { Convert } from './convert.js';

export class Stream {
  /**
   * Transforms a `ReadableStream` into an `AsyncIterable`. This allows for the asynchronous
   * iteration over the stream's data chunks.
   *
   * This method creates an async iterator from a `ReadableStream`, enabling the use of
   * `for await...of` loops to process stream data. It reads from the stream until it's closed or
   * errored, yielding each chunk as it becomes available.
   *
   * @example
   * ```ts
   * const readableStream = new ReadableStream({ ... });
   * for await (const chunk of Stream.asAsyncIterator(readableStream)) {
   *   // process each chunk
   * }
   * ```
   *
   * @remarks
   * - The method ensures proper cleanup by releasing the reader lock when iteration is completed or
   *   if an error occurs.
   *
   * @param readableStream - The Web `ReadableStream` to be transformed into an `AsyncIterable`.
   * @returns An `AsyncIterable` that yields data chunks from the `ReadableStream`.
   */
  public static async * asAsyncIterator<T>(readableStream: ReadableStream<T>): AsyncIterable<T> {
    const reader = readableStream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield value;
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Consumes a `ReadableStream` and returns its contents as an `ArrayBuffer`.
   *
   * This method reads all data from a `ReadableStream`, collects it, and converts it into an
   * `ArrayBuffer`.
   *
   * @example
   * ```ts
   * const readableStream = new ReadableStream({ ... });
   * const arrayBuffer = await Stream.consumeToArrayBuffer({ readableStream });
   * ```
   *
   * @param readableStream - The Web `ReadableStream` whose data will be consumed.
   * @returns A Promise that resolves to an `ArrayBuffer` containing all the data from the stream.
   */
  public static async consumeToArrayBuffer({ readableStream }: { readableStream: ReadableStream}): Promise<ArrayBuffer> {
    const iterableStream = Stream.asAsyncIterator(readableStream);
    const arrayBuffer = await Convert.asyncIterable(iterableStream).toArrayBufferAsync();

    return arrayBuffer;
  }

  /**
   * Consumes a `ReadableStream` and returns its contents as a `Blob`.
   *
   * This method reads all data from a `ReadableStream`, collects it, and converts it into a `Blob`.
   *
   * @example
   * ```ts
   * const readableStream = new ReadableStream({ ... });
   * const blob = await Stream.consumeToBlob({ readableStream });
   * ```
   *
   * @param readableStream - The Web `ReadableStream` whose data will be consumed.
   * @returns A Promise that resolves to a `Blob` containing all the data from the stream.
   */
  public static async consumeToBlob({ readableStream }: { readableStream: ReadableStream}): Promise<Blob> {
    const iterableStream = Stream.asAsyncIterator(readableStream);
    const blob = await Convert.asyncIterable(iterableStream).toBlobAsync();

    return blob;
  }

  /**
   * Consumes a `ReadableStream` and returns its contents as a `Uint8Array`.
   *
   * This method reads all data from a `ReadableStream`, collects it, and converts it into a
   * `Uint8Array`.
   *
   * @example
   * ```ts
   * const readableStream = new ReadableStream({ ... });
   * const bytes = await Stream.consumeToBytes({ readableStream });
   * ```
   *
   * @param readableStream - The Web `ReadableStream` whose data will be consumed.
   * @returns A Promise that resolves to a `Uint8Array` containing all the data from the stream.
   */
  public static async consumeToBytes({ readableStream }: { readableStream: ReadableStream }): Promise<Uint8Array> {
    const iterableStream = Stream.asAsyncIterator(readableStream);
    const bytes = await Convert.asyncIterable(iterableStream).toUint8ArrayAsync();

    return bytes;
  }

  /**
   * Consumes a `ReadableStream` and parses its contents as JSON.
   *
   * This method reads all the data from the stream, converts it to a text string, and then parses
   * it as JSON, returning the resulting object.
   *
   * @example
   * ```ts
   * const readableStream = new ReadableStream({ ... });
   * const jsonData = await Stream.consumeToJson({ readableStream });
   * ```
   *
   * @param readableStream - The Web `ReadableStream` whose JSON content will be consumed.
   * @returns A Promise that resolves to the parsed JSON object from the stream's data.
   */
  public static async consumeToJson({ readableStream }: { readableStream: ReadableStream}): Promise<any> {
    const iterableStream = Stream.asAsyncIterator(readableStream);
    const object = await Convert.asyncIterable(iterableStream).toObjectAsync();

    return object;
  }

  /**
   * Consumes a `ReadableStream` and returns its contents as a text string.
   *
   * This method reads all the data from the stream, converting it into a single string.
   *
   * @example
   * ```ts
   * const readableStream = new ReadableStream({ ... });
   * const text = await Stream.consumeToText({ readableStream });
   * ```
   *
   * @param readableStream - The Web `ReadableStream` whose text content will be consumed.
   * @returns A Promise that resolves to a string containing all the data from the stream.
   */
  public static async consumeToText({ readableStream }: { readableStream: ReadableStream}): Promise<string> {
    const iterableStream = Stream.asAsyncIterator(readableStream);
    const text = await Convert.asyncIterable(iterableStream).toStringAsync();

    return text;
  }

  /**
   * Generates a `ReadableStream` of `Uint8Array` chunks with customizable length and fill value.
   *
   * This method creates a `ReadableStream` that emits `Uint8Array` chunks. You can specify the
   * total length of the stream, the length of individual chunks, and a fill value or range for the
   * chunks. It's useful for testing or when specific binary data streams are required.
   *
   * @example
   * ```ts
   * // Create a stream of 1000 bytes with 100-byte chunks filled with 0xAA.
   * const byteStream = Stream.generateByteStream({
   *   streamLength: 1000,
   *   chunkLength: 100,
   *   fillValue: 0xAA
   * });
   *
   * // Create an unending stream of 100KB chunks filled with values that range from 1 to 99.
   * const byteStream = Stream.generateByteStream({
   *  chunkLength: 100 * 1024,
   *  fillValue: [1, 99]
   * });
   * ```
   *
   * @param streamLength - The total length of the stream in bytes. If omitted, the stream is infinite.
   * @param chunkLength - The length of each chunk. If omitted, each chunk is the size of `streamLength`.
   * @param fillValue - A value or range to fill the chunks with. Can be a single number or a tuple [min, max].
   * @returns A `ReadableStream` that emits `Uint8Array` chunks.
   */
  public static generateByteStream({ streamLength, chunkLength, fillValue }: {
    streamLength?: number,
    chunkLength?: number,
    fillValue?: number | [number, number]
  }): ReadableStream<Uint8Array> {
    let bytesRemaining = streamLength ?? Infinity;
    let controller: ReadableStreamDefaultController<Uint8Array>;

    function enqueueChunk() {
      const currentChunkLength = Math.min(bytesRemaining, chunkLength ?? Infinity);
      bytesRemaining -= currentChunkLength;

      let chunk: Uint8Array;

      if (typeof fillValue === 'number') {
        chunk = new Uint8Array(currentChunkLength).fill(fillValue);

      } else if (Array.isArray(fillValue)) {
        chunk = new Uint8Array(currentChunkLength);
        const [min, max] = fillValue;
        const range = max - min + 1;
        for (let i = 0; i < currentChunkLength; i++) {
          chunk[i] = Math.floor(Math.random() * range) + min;
        }

      } else {
        chunk = new Uint8Array(currentChunkLength);
      }

      controller.enqueue(chunk);

      // If there are no more bytes to send, close the stream
      if (bytesRemaining <= 0) {
        controller.close();
      }
    }

    return new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
        enqueueChunk();
      },
      pull() {
        enqueueChunk();
      },
    });
  }

  /**
   * Checks if the provided Web `ReadableStream` is in a readable state.
   *
   * After verifying that the stream is a Web {@link https://streams.spec.whatwg.org/#rs-model | ReadableStream},
   * this method checks the {@link https://streams.spec.whatwg.org/#readablestream-locked | locked}
   * property of the ReadableStream. The `locked` property is `true` if a reader is currently
   * active, meaning the stream is either being read or has already been read (and hence is not in a
   * readable state). If `locked` is `false`, it means the stream is still in a state where it can
   * be read.
   *
   * In the case where a `ReadableStream` has been unlocked but is no longer readable (for example,
   * if it has been fully read or cancelled), additional checks are needed beyond just examining the
   * locked property. The ReadableStream API does not provide a direct way to check if the stream
   * has data left or if it's in a readable state once it's been unlocked.
   *
   * Per {@link https://streams.spec.whatwg.org/#other-specs-rs-introspect | WHATWG Streams, Section 9.1.3. Introspection}:
   *
   * > ...note that apart from checking whether or not the stream is locked, this direct
   * > introspection is not possible via the public JavaScript API, and so specifications should
   * > instead use the algorithms in §9.1.2 Reading. (For example, instead of testing if the stream
   * > is readable, attempt to get a reader and handle any exception.)
   *
   * This implementation employs the technique suggested by the WHATWG Streams standard by
   * attempting to acquire a reader and checking the state of the reader. If acquiring a reader
   * succeeds, it immediately releases the lock and returns `true`, indicating the stream is
   * readable. If an error occurs while trying to get a reader (which can happen if the stream is
   * already closed or errored), it catches the error and returns `false`, indicating the stream is
   * not readable.
   *
   * @example
   * ```ts
   * const readableStream = new ReadableStream({ ... });
   * const isStreamReadable = Stream.isReadable({ readableStream });
   * console.log(isStreamReadable); // Output: true or false
   * ```
   *
   * @remarks
   * - This method does not check whether the stream has data left to read; it only checks if the
   *   stream is in a state that allows reading. It is possible for a stream to be unlocked but
   *   still have no data left if it has never been locked to a reader.
   *
   * @param readableStream - The Web `ReadableStream` to be checked for readability.
   *
   * @returns `true` if the stream is a `ReadableStream` and is in a readable state (not locked and
   *          no error on getting a reader); otherwise, `false`.
   */
  public static isReadable({ readableStream }: { readableStream: ReadableStream }): boolean {
    // Check if the stream is a WHATWG `ReadableStream`.
    if (!Stream.isReadableStream(readableStream)) {
      return false;
    }

    // Check if the stream is locked.
    if (readableStream.locked) {
      return false;
    }

    try {
      // Try to get a reader to check if the stream is readable.
      const reader = readableStream.getReader();
      // If successful, immediately release the lock.
      reader.releaseLock();
      return true;
    } catch (error) {
      // If an error occurs (e.g., the stream is not readable), return false.
      return false;
    }
  }

  /**
   * Checks if an object is a Web `ReadableStream`.
   *
   * This method verifies whether the given object is a `ReadableStream` by checking its type and
   * the presence of the `getReader` function.
   *
   * @example
   * ```ts
   * const obj = getSomeObject();
   * if (Stream.isReadableStream(obj)) {
   *   // obj is a ReadableStream
   * }
   * ```
   *
   * @param obj - The object to be checked.
   * @returns `true` if `obj` is a `ReadableStream`; otherwise, `false`.
   */
  public static isReadableStream(obj: unknown): obj is ReadableStream {
    return (
      typeof obj === 'object' && obj !== null &&
      'getReader' in obj && typeof obj.getReader === 'function'
    );
  }

  /**
   * Checks if an object is a Web `ReadableStream`, `WritableStream`, or `TransformStream`.
   *
   * This method verifies the type of a given object to determine if it is one of the standard
   * stream types in the Web Streams API: `ReadableStream`, `WritableStream`, or `TransformStream`.
   * It employs type-checking strategies that are specific to each stream type.
   *
   * The method checks for the specific functions and properties associated with each stream type:
   * - `ReadableStream`: Identified by the presence of a `getReader` method.
   * - `WritableStream`: Identified by the presence of a `getWriter` and `abort` methods.
   * - `TransformStream`: Identified by having both `readable` and `writable` properties.
   *
   * @example
   * ```ts
   * const readableStream = new ReadableStream();
   * console.log(Stream.isStream(readableStream)); // Output: true
   *
   * const writableStream = new WritableStream();
   * console.log(Stream.isStream(writableStream)); // Output: true
   *
   * const transformStream = new TransformStream();
   * console.log(Stream.isStream(transformStream)); // Output: true
   *
   * const nonStreamObject = {};
   * console.log(Stream.isStream(nonStreamObject)); // Output: false
   * ```
   *
   * @remarks
   * - This method does not differentiate between `ReadableStream`, `WritableStream`, and
   *   `TransformStream`. It checks if the object conforms to any of these types.
   * - This method is specific to the Web Streams API and may not recognize non-standard or custom
   *   stream-like objects that do not adhere to the Web Streams API specifications.
   *
   * @param obj - The object to be checked for being a Web `ReadableStream`, `WritableStream`, or `TransformStream`.
   * @returns `true` if the object is a `ReadableStream`, `WritableStream`, or `TransformStream`; otherwise, `false`.
   */
  public static isStream(obj: unknown): obj is ReadableStream | WritableStream | TransformStream {
    return Stream.isReadableStream(obj) || Stream.isWritableStream(obj) || Stream.isTransformStream(obj);
  }

  /**
   * Checks if an object is a `TransformStream`.
   *
   * This method verifies whether the given object is a `TransformStream` by checking its type and
   * the presence of `readable` and `writable` properties.
   *
   * @example
   * ```ts
   * const obj = getSomeObject();
   * if (Stream.isTransformStream(obj)) {
   *   // obj is a TransformStream
   * }
   * ```
   *
   * @param obj - The object to be checked.
   * @returns `true` if `obj` is a `TransformStream`; otherwise, `false`.
   */
  public static isTransformStream(obj: unknown): obj is TransformStream {
    return (
      typeof obj === 'object' && obj !== null &&
      'readable' in obj && typeof obj.readable === 'object' &&
      'writable' in obj && typeof obj.writable === 'object'
    );
  }

  /**
   * Checks if an object is a `WritableStream`.
   *
   * This method determines whether the given object is a `WritableStream` by verifying its type and
   * the presence of the `getWriter` and `abort` functions.
   *
   * @example
   * ```ts
   * const obj = getSomeObject();
   * if (Stream.isWritableStream(obj)) {
   *   // obj is a WritableStream
   * }
   * ```
   *
   * @param obj - The object to be checked.
     * @returns `true` if `obj` is a `TransformStream`; otherwise, `false`.
     */
  public static isWritableStream(obj: unknown): obj is WritableStream {
    return (
      typeof obj === 'object' && obj !== null &&
      'getWriter' in obj && typeof obj.getWriter === 'function' &&
      'abort' in obj && typeof obj.abort === 'function'
    );
  }
}