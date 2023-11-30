import type { Web5Agent } from '@web5/agent';
import type { Readable } from 'readable-stream';
import type {
  RecordsWriteMessage,
  RecordsWriteOptions,
  RecordsWriteDescriptor,
} from '@tbd54566975/dwn-sdk-js';

import { ReadableWebToNodeStream } from 'readable-web-to-node-stream';
import { DataStream, DwnInterfaceName, DwnMethodName, Encoder } from '@tbd54566975/dwn-sdk-js';

import type { ResponseStatus } from './dwn-api.js';

import { dataToBlob } from './utils.js';

/**
 * Options that are passed to Record constructor.
 *
 * @beta
 */
export type RecordOptions = RecordsWriteMessage & {
  author: string;
  target: string;
  encodedData?: string | Blob;
  data?: Readable | ReadableStream;
  remoteTarget?: string;
};

/**
 * Represents the record data model, without the auxiliary properties such as
 * the `descriptor` and the `authorization`
 *
 * @beta
 */
export type RecordModel = RecordsWriteDescriptor
  & Omit<RecordsWriteMessage, 'descriptor' | 'recordId' | 'authorization'>
  & {
    author: string;
    recordId?: string;
    target: string;
  }

/**
 * Options that are passed to update the record on the DWN
 *
 * @beta
 */
export type RecordUpdateOptions = {
  data?: unknown;
  dataCid?: RecordsWriteDescriptor['dataCid'];
  dataSize?: RecordsWriteDescriptor['dataSize'];
  dateModified?: RecordsWriteDescriptor['messageTimestamp'];
  datePublished?: RecordsWriteDescriptor['datePublished'];
  published?: RecordsWriteDescriptor['published'];
}

/**
 * Record wrapper class with convenience methods to send and update,
 * aside from manipulating and reading the record data.
 *
 * Note: The `messageTimestamp` of the most recent RecordsWrite message is
 *       logically equivalent to the date/time at which a Record was most
 *       recently modified.  Since this Record class implementation is
 *       intended to simplify the developer experience of working with
 *       logical records (and not individual DWN messages) the
 *       `messageTimestamp` is mapped to `dateModified`.
 *
 * @beta
 */
export class Record implements RecordModel {
  // mutable properties

  /** Record's author DID */
  author: string;

  /** Record's target DID */
  target: string;

  private _agent: Web5Agent;
  private _attestation?: RecordsWriteMessage['attestation'];
  private _contextId?: string;
  private _descriptor: RecordsWriteDescriptor;
  private _encodedData?: string | Blob | null;
  private _encryption?: RecordsWriteMessage['encryption'];
  private _readableStream?: ReadableStream | Promise<ReadableStream>;
  private _recordId: string;
  private _remoteTarget?: string;

  // Immutable DWN Record properties.

  /** Record's signatures attestation */
  get attestation(): RecordsWriteMessage['attestation'] { return this._attestation; }

  /** Record's context ID */
  get contextId() { return this._contextId; }

  /** Record's data format */
  get dataFormat() { return this._descriptor.dataFormat; }

  /** Record's creation date */
  get dateCreated() { return this._descriptor.dateCreated; }

  /** Record's encryption */
  get encryption(): RecordsWriteMessage['encryption'] { return this._encryption; }

  /** Record's ID */
  get id() { return this._recordId; }

  /** Interface is always `Records` */
  get interface() { return this._descriptor.interface; }

  /** Method is always `Write` */
  get method() { return this._descriptor.method; }

  /** Record's parent ID */
  get parentId() { return this._descriptor.parentId; }

  /** Record's protocol */
  get protocol() { return this._descriptor.protocol; }

  /** Record's protocol path */
  get protocolPath() { return this._descriptor.protocolPath; }

  /** Record's recipient */
  get recipient() { return this._descriptor.recipient; }

  /** Record's schema */
  get schema() { return this._descriptor.schema; }

  // Mutable DWN Record properties.

  /** Record's CID */
  get dataCid() { return this._descriptor.dataCid; }

  /** Record's data size */
  get dataSize() { return this._descriptor.dataSize; }

  /** Record's modified date */
  get dateModified() { return this._descriptor.messageTimestamp; }

  /** Record's published date */
  get datePublished() { return this._descriptor.datePublished; }

  /** Record's published status */
  get messageTimestamp() { return this._descriptor.messageTimestamp; }

  /** Record's published status (true/false) */
  get published() { return this._descriptor.published; }

  constructor(agent: Web5Agent, options: RecordOptions) {
    this._agent = agent;

    /** Store the target and author DIDs that were used to create the message to use for subsequent
     * updates, reads, etc. */
    this.author = options.author;
    this.target = options.target;

    /** If the record was queried from a remote DWN, the `remoteTarget` DID will be defined. This
     * value is used to send subsequent read requests to the same remote DWN in the event the
     * record's data payload was too large to be returned in query results. */
    this._remoteTarget = options.remoteTarget;

    // RecordsWriteMessage properties.
    this._attestation = options.attestation;
    this._contextId = options.contextId;
    this._descriptor = options.descriptor;
    this._encryption = options.encryption;
    this._recordId = options.recordId;

    /** options.encodedData will either be a base64url encoded string (in the case of RecordsQuery)
     * OR a Blob in the case of a RecordsWrite. */
    this._encodedData = options.encodedData ?? null;

    // If the record was created from a RecordsRead reply then it will have a `data` property.
    if (options.data) {
      this._readableStream = Record.isReadableWebStream(options.data) ?
        options.data as ReadableStream : nodeToWebReadable(options.data);
    }
  }

  /**
   * Returns the data of the current record.
   * If the record data is not available, it attempts to fetch the data from the DWN.
   * @returns a data stream with convenience methods such as `blob()`, `json()`, `text()`, and `stream()`, similar to the fetch API response
   * @throws `Error` if the record has already been deleted.
   *
   */
  get data() {
    if (!this._encodedData && !this._readableStream) {
      /** `encodedData` will be set if the Record was instantiated by dwn.records.create()/write().
       * `readableStream` will be set if Record was instantiated by dwn.records.read().
       * If neither of the above are true, then the record must be fetched from either: */
      this._readableStream = this._remoteTarget ?
        // 1. ...a remote DWN if the record was queried from a remote DWN.
        this.readRecordData({ target: this._remoteTarget, isRemote: true }) :
        // 2. ...a local DWN if the record was queried from the local DWN.
        this.readRecordData({ target: this.target, isRemote: false });
    }

    if (typeof this._encodedData === 'string') {
      // If `encodedData` is set, then it is expected that:
      // type is Blob if the Record object was instantiated by dwn.records.create()/write().
      // type is Base64 URL encoded string if the Record object was instantiated by dwn.records.query().
      // If it is a string, we need to Base64 URL decode to bytes and instantiate a Blob.
      const dataBytes = Encoder.base64UrlToBytes(this._encodedData);
      this._encodedData = new Blob([dataBytes], { type: this.dataFormat });
    }

    // Explicitly cast `encodedData` as a Blob since, if non-null, it has been converted from string to Blob.
    const dataBlob = this._encodedData as Blob;

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this; // Capture the context of the `Record` instance.
    const dataObj = {
      async blob(): Promise<Blob> {
        if (dataBlob) return dataBlob;
        if (self._readableStream) return new Blob([await this.stream().then(streamToBytes)], { type: self.dataFormat });
      },
      async json() {
        if (dataBlob) return this.text().then(JSON.parse);
        if (self._readableStream) return this.text().then(JSON.parse);
        return null;
      },
      async text() {
        if (dataBlob) return dataBlob.text();
        if (self._readableStream) return this.stream().then(streamToBytes).then(Encoder.bytesToString);
        return null;
      },
      async stream() {
        if (dataBlob) return dataBlob.stream();
        if (self._readableStream) return self._readableStream;
        return null;
      },
      then(...callbacks) {
        return this.stream().then(...callbacks);
      },
      catch(callback) {
        return dataObj.then().catch(callback);
      },
    };
    return dataObj;
  }

  /**
   * Send the current record to a remote DWN by specifying their DID
   * (vs waiting for the regular DWN sync)
   * @param target - the DID to send the record to
   * @returns the status of the send record request
   * @throws `Error` if the record has already been deleted.
   */
  async send(target: string): Promise<ResponseStatus> {
    const { reply: { status } } = await this._agent.sendDwnRequest({
      messageType    : DwnInterfaceName.Records + DwnMethodName.Write,
      author         : this.author,
      dataStream     : await this.data.blob(),
      target         : target,
      messageOptions : this.toJSON(),
    });

    return { status };
  }

  /**
   * Returns a JSON representation of the Record instance.
   * It's called by `JSON.stringify(...)` automatically.
   */
  toJSON(): RecordModel {
    return {
      attestation      : this.attestation,
      author           : this.author,
      contextId        : this.contextId,
      dataCid          : this.dataCid,
      dataFormat       : this.dataFormat,
      dataSize         : this.dataSize,
      dateCreated      : this.dateCreated,
      messageTimestamp : this.dateModified,
      datePublished    : this.datePublished,
      encryption       : this.encryption,
      interface        : this.interface,
      method           : this.method,
      parentId         : this.parentId,
      protocol         : this.protocol,
      protocolPath     : this.protocolPath,
      published        : this.published,
      recipient        : this.recipient,
      recordId         : this.id,
      schema           : this.schema,
      target           : this.target,
    };
  }

  /**
   * Convenience method to return the string representation of the Record instance.
   * Called automatically in string concatenation, String() type conversion, and template literals.
   */
  toString() {
    let str = `Record: {\n`;
    str += `  ID: ${this.id}\n`;
    str += this.contextId ? `  Context ID: ${this.contextId}\n` : '';
    str += this.protocol ? `  Protocol: ${this.protocol}\n` : '';
    str += this.schema ? `  Schema: ${this.schema}\n` : '';
    str += `  Data CID: ${this.dataCid}\n`;
    str += `  Data Format: ${this.dataFormat}\n`;
    str += `  Data Size: ${this.dataSize}\n`;
    str += `  Created: ${this.dateCreated}\n`;
    str += `  Modified: ${this.dateModified}\n`;
    str += `}`;
    return str;
  }

  /**
   * Update the current record on the DWN.
   * @param options - options to update the record, including the new data
   * @returns the status of the update request
   * @throws `Error` if the record has already been deleted.
   */
  async update(options: RecordUpdateOptions = {}): Promise<ResponseStatus> {
    // Map Record class `dateModified`  property to DWN SDK `messageTimestamp`.
    const { dateModified, ...updateOptions } = options as Partial<RecordsWriteOptions> & RecordUpdateOptions;
    updateOptions.messageTimestamp = dateModified;

    // Begin assembling update message.
    let updateMessage = {...this._descriptor, ...updateOptions } as Partial<RecordsWriteOptions>;

    let dataBlob: Blob;
    if (options.data !== undefined) {
      // If `data` is being updated then `dataCid` and `dataSize` must be undefined and the `data` property is passed as
      // a top-level property to `agent.processDwnRequest()`.
      delete updateMessage.dataCid;
      delete updateMessage.dataSize;
      delete updateMessage.data;

      ({ dataBlob } = dataToBlob(options.data, updateMessage.dataFormat));
    }

    // Throw an error if an attempt is made to modify immutable properties. `data` has already been handled.
    const mutableDescriptorProperties = new Set(['data', 'dataCid', 'dataSize', 'datePublished', 'messageTimestamp', 'published']);
    Record.verifyPermittedMutation(Object.keys(options), mutableDescriptorProperties);

    // If a new `dateModified` was not provided, remove the equivalent `messageTimestamp` property from from the
    // updateMessage to let the DWN SDK auto-fill. This is necessary because otherwise DWN SDK throws an
    // Error 409 Conflict due to attempting to overwrite a record when the `messageTimestamp` values are identical.
    if (options.dateModified === undefined) {
      delete updateMessage.messageTimestamp;
    }

    // If `published` is set to false, ensure that `datePublished` is undefined. Otherwise, DWN SDK's schema validation
    // will throw an error if `published` is false but `datePublished` is set.
    if (options.published === false && updateMessage.datePublished !== undefined) {
      delete updateMessage.datePublished;
    }

    // Set the record ID and context ID, if any.
    updateMessage.recordId = this._recordId;
    updateMessage.contextId = this._contextId;

    const messageOptions: Partial<RecordsWriteOptions> = {
      ...updateMessage
    };

    const agentResponse = await this._agent.processDwnRequest({
      author      : this.author,
      dataStream  : dataBlob,
      messageOptions,
      messageType : DwnInterfaceName.Records + DwnMethodName.Write,
      target      : this.target,
    });

    const { message, reply: { status } } = agentResponse;
    const responseMessage = message as RecordsWriteMessage;

    if (200 <= status.code && status.code <= 299) {
      // Only update the local Record instance mutable properties if the record was successfully (over)written.
      mutableDescriptorProperties.forEach(property => {
        this._descriptor[property] = responseMessage.descriptor[property];
      });
      // Cache data.
      if (options.data !== undefined) {
        this._encodedData = dataBlob;
      }
    }

    return { status };
  }

  private async readRecordData({ target, isRemote }: { target: string, isRemote: boolean }): Promise<ReadableStream> {
    const readRequest = {
      author         : this.author,
      messageOptions : { filter: { recordId: this.id } },
      messageType    : DwnInterfaceName.Records + DwnMethodName.Read,
      target,
    };

    const agentResponsePromise = isRemote ?
      this._agent.sendDwnRequest(readRequest) :
      this._agent.processDwnRequest(readRequest);

    try {
      const response = await agentResponsePromise;
      const reply = response.reply;

      const data: ReadableStream | Readable = reply.record.data;
      const webReadable = Record.isReadableWebStream(data) ?
        data as ReadableStream :
        nodeToWebReadable(data) ;
      return webReadable;

    } catch (error) {
      throw new Error(`Error encountered while attempting to read data: ${error.message}`);
    }
  }

  /**
   * TODO: Document method.
   */
  private static isReadableWebStream(stream): stream is ReadableStream {
    // TODO: Improve robustness of the check modeled after node:stream.
    return typeof stream._read !== 'function';
  }

  /**
   * TODO: Document method.
   */
  private static verifyPermittedMutation(propertiesToMutate: Iterable<string>, mutableDescriptorProperties: Set<string>) {
    for (const property of propertiesToMutate) {
      if (!mutableDescriptorProperties.has(property)) {
        throw new Error(`${property} is an immutable property. Its value cannot be changed.`);
      }
    }
  }
}

// function newReadableStreamFromStreamReadable(streamReadable: Readable, options = { strategy: null }): ReadableStream {
//   if (typeof streamReadable?._readableState !== 'object') {
//     throw new TypeError('Provided stream is not a Node.js Readable stream');
//   }

//   if (isDestroyed(streamReadable) || !isNodeStreamReadable(streamReadable)) {
//     const readable = new ReadableStream();
//     readable.cancel();
//     return readable;
//   }

//   const objectMode = streamReadable.readableObjectMode;
//   const highWaterMark = streamReadable.readableHighWaterMark;

//   const evaluateStrategyOrFallback = (strategy) => {
//     // If there is a strategy available, use it
//     if (strategy)
//       return strategy;

//     if (objectMode) {
//       // When running in objectMode explicitly but no strategy, we just fall
//       // back to CountQueuingStrategy
//       return new CountQueuingStrategy({ highWaterMark });
//     }

//     // When not running in objectMode explicitly, we just fall
//     // back to a minimal strategy that just specifies the highWaterMark
//     // and no size algorithm. Using a ByteLengthQueuingStrategy here
//     // is unnecessary.
//     return { highWaterMark };
//   };

//   const strategy = evaluateStrategyOrFallback(options?.strategy);

//   let controller;

//   function onData(chunk) {
//     // Copy the Buffer to detach it from the pool.
//     if (Buffer.isBuffer(chunk) && !objectMode)
//       chunk = new Uint8Array(chunk);
//     controller.enqueue(chunk);
//     if (controller.desiredSize <= 0)
//       streamReadable.pause();
//   }

//   function destroy(stream: Readable, err) {
//     if (isDestroyed(stream))
//       return;
//     streamReadable.removeListener('data', onData);
//     // streamReadable.removeListener('end', onEnd);
//     // streamReadable.removeListener('error', onError);
//     // streamReadable.removeListener('close', onClose);
//     // streamReadable.removeListener('readable', onReadable);
//     if (streamReadable.destroy) streamReadable.destroy(err);
//   }

//   streamReadable.pause();

//   streamReadable.on('data', onData);

//   return new ReadableStream({
//     start(c) { controller = c; },

//     pull() { streamReadable.resume(); },

//     cancel(reason) {
//       destroy(streamReadable, reason);
//     },
//   }, strategy);
// }

function nodeToWebReadable(nodeReadable: Readable): ReadableStream {
  if (!isNodeStreamReadable(nodeReadable)) {
    throw new TypeError('Provided stream is not a Node.js Readable stream');
  }

  if (isDestroyed(nodeReadable)) {
    const readable = new ReadableStream();
    readable.cancel();
    return readable;
  }

  return new ReadableStream({
    start(controller) {
      nodeReadable.on('data', (chunk) => {
        controller.enqueue(chunk);
      });

      nodeReadable.on('end', () => {
        controller.close();
      });

      nodeReadable.on('error', (err) => {
        controller.error(err);
      });
    },
    cancel() {
      nodeReadable.destroy();
    }
  });
}

function isNodeStreamReadable(obj) {
  return !!(
    obj &&
    typeof obj.pipe === 'function' &&
    typeof obj.on === 'function' &&
    (!obj._writableState || obj._readableState?.readable !== false) && // Duplex
    (!obj._writableState || obj._readableState) // Writable has .pipe.
  );
}


function isWebReadableStream(obj) {
  return !!(
    obj &&
    !isNodeStreamReadable(obj) &&
    typeof obj.pipeThrough === 'function' &&
    typeof obj.getReader === 'function' &&
    typeof obj.cancel === 'function'
  );
}

function isDestroyed(stream) {
  if (!isNodeStreamReadable(stream)) return null;
  const wState = stream._writableState;
  const rState = stream._readableState;
  const state = wState || rState;
  return !!(stream.destroyed || state?.destroyed);
}

async function streamToBytes(readableStream: ReadableStream): Promise<Uint8Array> {
  const reader = readableStream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
  }

  const uint8Array = concatenateArrayOfBytes(chunks);

  return uint8Array;
}

/**
 * Concatenates the array of bytes given into one Uint8Array.
 */
function concatenateArrayOfBytes(arrayOfBytes: Uint8Array[]): Uint8Array {
  // sum of individual array lengths
  const totalLength = arrayOfBytes.reduce((accumulatedValue, currentValue) => accumulatedValue + currentValue.length, 0);

  const result = new Uint8Array(totalLength);

  let length = 0;
  for (const bytes of arrayOfBytes) {
    result.set(bytes, length);
    length += bytes.length;
  }

  return result;
}

async function arrayBuffer(stream: ReadableStream) {
  const ret = await blob(stream);
  return ret.arrayBuffer();
}

async function uint8Array(stream: ReadableStream) {
  const dataBuffer = await arrayBuffer(stream);
  return new Uint8Array(dataBuffer);
}

async function blob(stream: ReadableStream) {
  const chunks = [];
  for await (const chunk of streamAsyncIterator(stream))
    chunks.push(chunk);
  return new Blob(chunks);
}

async function text(stream) {
  const dec = new TextDecoder();
  let str = '';
  for await (const chunk of stream) {
    if (typeof chunk === 'string')
      str += chunk;
    else
      str += dec.decode(chunk, { stream: true });
  }
  // Flush the streaming TextDecoder so that any pending
  // incomplete multibyte characters are handled.
  str += dec.decode(undefined, { stream: false });
  return str;
}

/**
 * @param {AsyncIterable|ReadableStream|Readable} stream
 * @returns {Promise<any>}
 */
async function json(stream) {
  const str = await text(stream);
  return JSON.parse(str);
}

async function* streamAsyncIterator<T>(readableStream: ReadableStream<T>): AsyncIterableIterator<T> {
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