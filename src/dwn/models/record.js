import { DataStream, DwnConstant, Encoder } from '@tbd54566975/dwn-sdk-js';
import { ReadableWebToNodeStream } from 'readable-web-to-node-stream';

import { isReadableWebStream } from '../dwn-utils.js';

export class Record {
  #dwn;

  #author;
  #contextId;
  #descriptor;
  #recordId;
  #target;

  #encodedData = null;
  #isFrozen = false;
  #readableStream = null;

  constructor(dwn, options = { }) {
    this.#dwn = dwn;

    // RecordsWriteMessage properties.
    const { author, contextId = undefined, descriptor, recordId = null, target } = options;
    this.#contextId = contextId;
    if (descriptor?.data) delete descriptor.data;
    this.#descriptor = descriptor ?? { };
    this.#recordId = recordId;
    
    // Store the target and author DIDs that were used to create the message to use for subsequent reads, etc.
    this.#author = author;
    this.#target = target;
    
    // If the record `dataSize is less than the DwnConstant.maxDataSizeAllowedToBeEncoded value,
    // then an `encodedData` property will be present.
    this.#encodedData = options?.encodedData ?? null;

    // If the record was created from a RecordsRead reply then it will have a `data` property.
    if (options?.data) {
      // this.#readableStream = isReadableWebStream(options.data) ? toIsomorphicReadableStream(options.data) : options.data;
      this.#readableStream = isReadableWebStream(options.data) ? new ReadableWebToNodeStream(options.data) : options.data;
    }
  }

  // Mutable Web5 Record Class properties.
  get author() { return this.#author; }
  get isFrozen() { return this.#isFrozen; }
  get target() { return this.#target; }
  set author(author) { this.#author = author; }
  set target(target) { this.#target = target; }
  
  // Immutable DWN Record properties.
  get id() { return this.#recordId; }
  get contextId() { return this.#contextId; }
  get dataFormat() { return this.#descriptor?.dataFormat; }
  get dateCreated() { return this.#descriptor?.dateCreated; }
  get interface() { return this.#descriptor?.interface; }
  get method() { return this.#descriptor?.method; }
  get parentId() { return this.#descriptor?.parentId; }
  get protocol() { return this.#descriptor?.protocol; }
  get recipient() { return this.#descriptor?.recipient; }
  get schema() { return this.#descriptor?.schema; }

  // Mutable DWN Record properties.
  get dataCid() { return this.#descriptor?.dataCid; }
  get dataSize() { return this.#descriptor?.dataSize; }
  get dateModified() { return this.#descriptor?.dateModified; }
  get datePublished() { return this.#descriptor?.datePublished; }
  get published() { return this.#descriptor?.published; }

  /**
   * Data handling.
   */

  get data() {
    if (!this.#encodedData && !this.#readableStream) {
      // `encodedData` will be set if `dataSize` <= DwnConstant.maxDataSizeAllowedToBeEncoded. (10KB as of April 2023)
      // `readableStream` will be set if Record was instantiated from a RecordsRead reply.
      // If neither of the above are true, then the record must be fetched from the DWN.
      this.#readableStream = this.#dwn.records.read(this.#target, { author: this.#author, message: { recordId: this.#recordId } })
        .then((response) => response.record )
        .then((record) => { return record.data; });
    }

    if (typeof this.#encodedData === 'string') {
      // If `encodedData` is set, then it is expected that:
      // `dataSize` <= DwnConstant.maxDataSizeAllowedToBeEncoded (10KB as of April 2023)
      // type is Uint8Array bytes if the Record object was instantiated from a RecordsWrite response
      // type is Base64 URL encoded string if the Record object was instantiated from a RecordsQuery response
      // If it is a string, we need to Base64 URL decode to bytes
      this.#encodedData = Encoder.base64UrlToBytes(this.#encodedData);
    }

    const self = this; // Capture the context of the `Record` instance.
    const dataObj = {
      async json() {
        if (self.#encodedData) return this.text().then(JSON.parse);
        if (self.#readableStream) return this.text().then(JSON.parse);
        return null;
      },
      async text() {
        if (self.#encodedData) return Encoder.bytesToString(self.#encodedData);
        if (self.#readableStream) return self.#readableStream.then(DataStream.toBytes).then(Encoder.bytesToString);
        return null;
      },
      async stream() {
        if (self.#encodedData) return DataStream.fromBytes(self.#encodedData);
        if (self.#readableStream) return self.#readableStream;
        return null;
      },
      then (...callbacks) {
        return this.stream().then(...callbacks);
      },
      catch(callback) {
        return dataObj.then().catch(callback);
      },
    };
    return dataObj;
  }

  /**
   * Record mutation methods.
   */

  async delete() {
    if (this.isFrozen) throw new Error(`Error: Record with ID '${this.id}' was previously deleted.`);

    // Attempt to delete the record from the DWN.
    const response = await this.#dwn.records.delete(this.#target, { author: this.#author, message: { recordId: this.#recordId } });
    
    if (response.status.code === 202) {
      // If the record was successfully deleted, freeze the instance to prevent further modifications.
      this.#freezeRecord();
    }

    return response;
  }

  async update(options = { }) {
    if (this.isFrozen) throw new Error(`Error: Record with ID '${this.id}' was previously deleted.`);

    // Begin assembling update message.
    let updateMessage = { ...this.#descriptor, ...options };

    // If `data` is being updated then `dataCid` and `dataSize` must be undefined and the `data` property is passed as
    // a top-level property to `web5.dwn.records.write()`.
    let data;
    if (options?.data !== undefined) {
      delete updateMessage.dataCid;
      delete updateMessage.dataSize;
      data = options.data;
      delete options.data;
    }
    
    // Throw an error if an attempt is made to modify immutable properties. `data` has already been handled.
    const mutableDescriptorProperties = ['dataCid', 'dataSize', 'dateModified', 'datePublished', 'published'];
    Record.#verifyPermittedMutation(Object.keys(options), mutableDescriptorProperties);

    // If a new `dateModified` was not provided, remove it from the updateMessage to let the DWN SDK auto-fill.
    // This is necessary because otherwise DWN SDK throws an Error 409 Conflict due to attempting to overwrite a record
    // when the `dateModified` timestamps are identical.
    if (options?.dateModified === undefined) {
      delete updateMessage.dateModified;
    }

    // If `published` is set to false, ensure that `datePublished` is undefined. Otherwise, DWN SDK's schema validation
    // will throw an error if `published` is false but `datePublished` is set.
    if (options?.published === false && updateMessage?.datePublished !== undefined) {
      delete updateMessage.datePublished;
    }

    // Set the record ID and context ID, if any.
    updateMessage.recordId = this.#recordId;
    updateMessage.contextId = this.#contextId;

    // Attempt to write the changes to mutable properties to the DWN.
    const { message = null, record = null, status } = await this.#dwn.records.write(this.#target, {
      author: this.#author,
      data,
      message: {
        ...updateMessage,
      },
    });

    if (status.code === 202 && record) {
      // Only update the local Record instance mutable properties if the record was successfully (over)written.
      mutableDescriptorProperties.forEach(property => {
        this.#descriptor[property] = record[property];
      });
      // Only update data if `dataSize` is less than DWN 'max data size allowed to be encoded'.
      if (data !== undefined) {
        this.#readableStream = (record.dataSize <= DwnConstant.maxDataSizeAllowedToBeEncoded) ? record.data : null;
        this.#encodedData = null; // Clear `encodedData` in case it was previously set.
      }
    }

    return { message, status };
  }

  /**
   * Utility methods.
   */

  /**
   * Called by `JSON.stringify(...)` automatically.
   */
  toJSON() {
    return {
      author: this.author,
      target: this.target,
      recordId: this.id,
      contextId: this.contextId,
      dataFormat: this.dataFormat,
      dateCreated: this.dateCreated,
      interface: this.interface,
      method: this.method,
      parentId: this.parentId,
      protocol: this.protocol,
      recipient: this.recipient,
      schema: this.schema,
      dataCid: this.dataCid,
      dataSize: this.dataSize,
      dateModified: this.dateModified,
      datePublished: this.datePublished,
      published: this.published,
    };
  }

  #freezeRecord() {
    this.#isFrozen = true;
  }

  #unFreezeRecord() {
    this.#isFrozen = false;
  }

  static #verifyPermittedMutation(propertiesToMutate, mutableDescriptorProperties) {
    propertiesToMutate.forEach(propertyName => {
      if (!mutableDescriptorProperties.includes(propertyName)) {
        throw new Error(`${propertyName} is an immutable property. Its value cannot be changed.`);
      }
    });
    return true;
  }
}
