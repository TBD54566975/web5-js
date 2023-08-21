import type { Web5Agent } from '@web5/agent';
import type { Readable } from 'readable-stream';
import type { RecordsReadReply, RecordsWriteDescriptor, RecordsWriteMessage, RecordsWriteOptions } from '@tbd54566975/dwn-sdk-js';

import { ReadableWebToNodeStream } from 'readable-web-to-node-stream';
import { DataStream, DwnInterfaceName, DwnMethodName, Encoder } from '@tbd54566975/dwn-sdk-js';

import { dataToBlob } from './utils.js';
import type { RecordsDeleteResponse } from './dwn-api.js';

export type RecordOptions = RecordsWriteMessage & {
  author: string;
  target: string;
  encodedData?: string | Blob;
  data?: Readable | ReadableStream;
};

export type RecordModel = RecordsWriteDescriptor
  & Omit<RecordsWriteMessage, 'descriptor' | 'recordId'>
  & {
    author: string;
    recordId?: string;
    target: string;
  }

export type RecordUpdateOptions = {
  data?: unknown;
  dataCid?: RecordsWriteDescriptor['dataCid'];
  dataSize?: RecordsWriteDescriptor['dataSize'];
  dateModified?: RecordsWriteDescriptor['messageTimestamp'];
  datePublished?: RecordsWriteDescriptor['datePublished'];
  published?: RecordsWriteDescriptor['published'];
}

/**
   * TODO: Document class.
   *
   * Note: The `messageTimestamp` of the most recent RecordsWrite message is
   *       logically equivalent to the date/time at which a Record was most
   *       recently modified.  Since this Record class implementation is
   *       intended to simplify the developer experience of working with
   *       logical records (and not individual DWN messages) the
   *       `messageTimestamp` is mapped to `dateModified`.
   */
export class Record implements RecordModel {
  // mutable properties
  author: string;
  target: string;
  isDeleted = false;

  private _agent: Web5Agent;
  private _attestation?: RecordsWriteMessage['attestation'];
  private _contextId?: string;
  private _descriptor: RecordsWriteDescriptor;
  private _encodedData?: string | Blob | null;
  private _encryption?: RecordsWriteMessage['encryption'];
  private _readableStream?: Readable | Promise<Readable>;
  private _recordId: string;

  // Immutable DWN Record properties.
  get attestation(): RecordsWriteMessage['attestation'] { return this._attestation; }
  get contextId() { return this._contextId; }
  get dataFormat() { return this._descriptor.dataFormat; }
  get dateCreated() { return this._descriptor.dateCreated; }
  get encryption(): RecordsWriteMessage['encryption'] { return this._encryption; }
  get id() { return this._recordId; }
  get interface() { return this._descriptor.interface; }
  get method() { return this._descriptor.method; }
  get parentId() { return this._descriptor.parentId; }
  get protocol() { return this._descriptor.protocol; }
  get protocolPath() { return this._descriptor.protocolPath; }
  get recipient() { return this._descriptor.recipient; }
  get schema() { return this._descriptor.schema; }

  // Mutable DWN Record properties.
  get dataCid() { return this._descriptor.dataCid; }
  get dataSize() { return this._descriptor.dataSize; }
  get dateModified() { return this._descriptor.messageTimestamp; }
  get datePublished() { return this._descriptor.datePublished; }
  get messageTimestamp() { return this._descriptor.messageTimestamp; }
  get published() { return this._descriptor.published; }

  constructor(agent: Web5Agent, options: RecordOptions) {
    this._agent = agent;

    // Store the target and author DIDs that were used to create the message to use for subsequent reads, etc.
    this.author = options.author;
    this.target = options.target;

    // RecordsWriteMessage properties.
    this._attestation = options.attestation;
    this._contextId = options.contextId;
    this._descriptor = options.descriptor;
    this._encryption = options.encryption;
    this._recordId = options.recordId;


    // options.encodedData will either be a base64url encoded string (in the case of RecordsQuery)
    // OR a Blob in the case of a RecordsWrite.
    this._encodedData = options.encodedData ?? null;

    // If the record was created from a RecordsRead reply then it will have a `data` property.
    if (options.data) {
      this._readableStream = Record.isReadableWebStream(options.data) ?
        new ReadableWebToNodeStream(<ReadableStream>options.data) as Readable : options.data as Readable;
    }
  }

  /**
   * TODO: Document method.
   */
  get data() {
    if (this.isDeleted) throw new Error('Operation failed: Attempted to access `data` of a record that has already been deleted.');

    if (!this._encodedData && !this._readableStream) {
      // `encodedData` will be set if the Record was instantiated by dwn.records.create()/write().
      // `readableStream` will be set if Record was instantiated by dwn.records.read().
      // If neither of the above are true, then the record must be fetched from the DWN.
      this._readableStream = this._agent.processDwnRequest({
        author         : this.author,
        messageOptions : { recordId: this.id },
        messageType    : DwnInterfaceName.Records + DwnMethodName.Read,
        target         : this.target,
      })
        .then(response => response.reply as RecordsReadReply)
        .then(reply => reply.record.data as Readable)
        .catch(error => { throw new Error(`Error encountered while attempting to read data: ${error.message}`); });
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
        if (self._readableStream) return new Blob([await this.stream().then(DataStream.toBytes)], { type: self.dataFormat });
      },
      async json() {
        if (dataBlob) return this.text().then(JSON.parse);
        if (self._readableStream) return this.text().then(JSON.parse);
        return null;
      },
      async text() {
        if (dataBlob) return dataBlob.text();
        if (self._readableStream) return this.stream().then(DataStream.toBytes).then(Encoder.bytesToString);
        return null;
      },
      async stream() {
        if (dataBlob) return new ReadableWebToNodeStream(dataBlob.stream());
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
   * TODO: Document method.
   */
  async delete(): Promise<RecordsDeleteResponse> {
    if (this.isDeleted) throw new Error('Operation failed: Attempted to call `delete()` on a record that has already been deleted.');

    // Attempt to delete the record from the DWN.
    const agentResponse = await this._agent.processDwnRequest({
      author         : this.author,
      messageOptions : { recordId: this.id },
      messageType    : DwnInterfaceName.Records + DwnMethodName.Delete,
      target         : this.target,
    });

    const { reply: { status } } = agentResponse;

    if (status.code === 202) {
      // If the record was successfully deleted, mark the instance as deleted to prevent further modifications.
      this.setDeletedStatus(true);
    }

    return { status };
  }

  /**
   * TODO: Document method.
   */
  async send(target: string): Promise<any> {
    if (this.isDeleted) throw new Error('Operation failed: Attempted to call `send()` on a record that has already been deleted.');

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
   * TODO: Document method.
   *
   * Called by `JSON.stringify(...)` automatically.
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
   * TODO: Document method.
   *
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
   * TODO: Document method.
   */
  async update(options: RecordUpdateOptions = {}) {
    if (this.isDeleted) throw new Error('Operation failed: Attempted to call `update()` on a record that has already been deleted.');

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
    const mutableDescriptorProperties = new Set(['data', 'dataCid', 'dataSize', 'dateModified', 'datePublished', 'published']);
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

  /**
   * TODO: Document method.
   */
  private setDeletedStatus(status: boolean): void {
    this.isDeleted = status;
  }

  /**
   * TODO: Document method.
   */
  private static isReadableWebStream(stream) {
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