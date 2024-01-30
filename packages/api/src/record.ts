import type { ProcessDwnRequest, Web5Agent } from '@web5/agent';
import type { Readable } from '@web5/common';
import type {
  RecordsWriteMessage,
  RecordsWriteOptions,
  RecordsWriteDescriptor,
} from '@tbd54566975/dwn-sdk-js';

import { Convert, NodeStream, Stream } from '@web5/common';
import { DwnInterfaceName, DwnMethodName } from '@tbd54566975/dwn-sdk-js';

import type { ResponseStatus } from './dwn-api.js';
import { dataToBlob } from './utils.js';

export type ProcessRecordRequest = {
  dataStream?: Blob | ReadableStream | Readable;
  rawMessage?: Partial<RecordsWriteMessage>;
  messageOptions?: unknown;
  store: boolean;
  import: boolean;
};

/**
 * Options that are passed to Record constructor.
 *
 * @beta
 */
export type RecordOptions = RecordsWriteMessage & {
  author: string;
  connectedDid: string;
  encodedData?: string | Blob;
  data?: Readable | ReadableStream;
  initialWrite?: RecordsWriteMessage;
  protocolRole?: string;
  remoteOrigin?: string;
};

/**
 * Represents the record data model, without the auxiliary properties such as
 * the `descriptor` and the `authorization`
 *
 * @beta
 */
export type RecordModel = RecordsWriteDescriptor
  & Omit<RecordsWriteMessage, 'descriptor' | 'recordId'>
  & {
    author: string;
    protocolRole?: RecordOptions['protocolRole'];
    recordId?: string;
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
  protocolRole?: RecordOptions['protocolRole'];
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

function removeUndefinedProperties(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return;
  Object.keys(obj).forEach(key => {
    const val = obj[key];
    if (val === undefined) {
      delete obj[key];
    } else if (typeof val === 'object') {
      removeUndefinedProperties(val);
    }
  });
  return obj;
}

export class Record implements RecordModel {
  // Record instance metadata.
  private _agent: Web5Agent;
  private _connectedDid: string;
  private _encodedData?: Blob;
  private _readableStream?: Readable;
  private _remoteOrigin?: string;

  // Private variables for DWN `RecordsWrite` message properties.
  private _author: string;
  private _attestation?: RecordsWriteMessage['attestation'];
  private _authorization?: RecordsWriteMessage['authorization'];
  private _contextId?: string;
  private _descriptor: RecordsWriteDescriptor;
  private _encryption?: RecordsWriteMessage['encryption'];
  private _initialWrite: RecordOptions['initialWrite'];
  private _initialWriteStored: boolean;
  private _recordId: string;
  private _protocolRole: RecordOptions['protocolRole'];
  // Getters for immutable DWN Record properties.

  static sendCache = new Map();
  static sendCacheLimit = 100;
  static setSendCache(recordId, target){
    const recordCache = Record.sendCache;
    let targetCache = recordCache.get(recordId) || new Set();
    recordCache.delete(recordId);
    recordCache.set(recordId, targetCache);
    if (recordCache.size > Record.sendCacheLimit) {
      const firstRecord = recordCache.keys().next().value;
      recordCache.delete(firstRecord);
    }
    targetCache.delete(target);
    targetCache.add(target);
    if (targetCache.size > Record.sendCacheLimit) {
      const firstTarget = targetCache.keys().next().value;
      targetCache.delete(firstTarget);
    }
  }
  static checkSendCache(recordId, target){
    let targetCache = Record.sendCache.get(recordId);
    return target && targetCache ? targetCache.has(target) : targetCache;
  }

  /** Record's signatures attestation */
  get attestation(): RecordsWriteMessage['attestation'] { return this._attestation; }

  /** Record's signatures attestation */
  get authorization(): RecordsWriteMessage['authorization'] { return this._authorization; }

  /** DID that signed the record. */
  get author(): string { return this._author; }

  /** Record's context ID */
  get contextId() { return this._contextId; }

  /** Record's data format */
  get dataFormat() { return this._descriptor.dataFormat; }

  /** Record's creation date */
  get dateCreated() { return this._descriptor.dateCreated; }

  /** Record's encryption */
  get encryption(): RecordsWriteMessage['encryption'] { return this._encryption; }

  get initialWrite(): RecordOptions['initialWrite'] { return this._initialWrite; }

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

  /** Role under which the author is writting the record */
  get protocolRole() { return this._protocolRole; }

  /** Record's recipient */
  get recipient() { return this._descriptor.recipient; }

  /** Record's schema */
  get schema() { return this._descriptor.schema; }

  // Getters for mutable DWN Record properties.

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

    /** Store the author DID that originally signed the message as a convenience for developers, so
     * that they don't have to decode the signer's DID from the JWS. */
    this._author = options.author;

    /** Store the currently `connectedDid` so that subsequent message signing is done with the
     * connected DID's keys and DWN requests target the connected DID's DWN. */
    this._connectedDid = options.connectedDid;

    /** If the record was queried or read from a remote DWN, the `remoteOrigin` DID will be
     * defined. This value is used to send subsequent read requests to the same remote DWN in the
     * event the record's data payload was too large to be returned in query results. or must be
     * read again (e.g., if the data stream is consumed). */
    this._remoteOrigin = options.remoteOrigin;

    // RecordsWriteMessage properties.
    this._attestation = options.attestation;
    this._authorization = options.authorization;
    this._contextId = options.contextId;
    this._descriptor = options.descriptor;
    this._encryption = options.encryption;
    this._initialWrite = options.initialWrite;
    this._recordId = options.recordId;
    this._protocolRole = options.protocolRole;

    if (options.encodedData) {
      // If `encodedData` is set, then it is expected that:
      // type is Blob if the Record object was instantiated by dwn.records.create()/write().
      // type is Base64 URL encoded string if the Record object was instantiated by dwn.records.query().
      // If it is a string, we need to Base64 URL decode to bytes and instantiate a Blob.
      this._encodedData = (typeof options.encodedData === 'string') ?
        new Blob([Convert.base64Url(options.encodedData).toUint8Array()], { type: this.dataFormat }) :
        options.encodedData;
    }

    if (options.data) {
      // If the record was created from a RecordsRead reply then it will have a `data` property.
      // If the `data` property is a web ReadableStream, convert it to a Node.js Readable.
      this._readableStream = Stream.isReadableStream(options.data) ?
        NodeStream.fromWebReadable({ readableStream: options.data }) :
        options.data;
    }
  }

  /**
   * Returns the data of the current record.
   * If the record data is not available, it attempts to fetch the data from the DWN.
   * @returns a data stream with convenience methods such as `blob()`, `json()`, `text()`, and `stream()`, similar to the fetch API response
   * @throws `Error` if the record has already been deleted.
   *
   * @beta
   */
  get data() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this; // Capture the context of the `Record` instance.
    const dataObj = {

      /**
       * Returns the data of the current record as a `Blob`.
       *
       * @returns A promise that resolves to a Blob containing the record's data.
       * @throws If the record data is not available or cannot be converted to a `Blob`.
       *
       * @beta
       */
      async blob(): Promise<Blob> {
        return new Blob([await NodeStream.consumeToBytes({ readable: await this.stream() })], { type: self.dataFormat });
      },

      /**
       * Returns the data of the current record as a `Uint8Array`.
       *
       * @returns A Promise that resolves to a `Uint8Array` containing the record's data bytes.
       * @throws If the record data is not available or cannot be converted to a byte array.
       *
       * @beta
       */
      async bytes(): Promise<Uint8Array> {
        return await NodeStream.consumeToBytes({ readable: await this.stream() });
      },

      /**
       * Parses the data of the current record as JSON and returns it as a JavaScript object.
       *
       * @returns A Promise that resolves to a JavaScript object parsed from the record's JSON data.
       * @throws If the record data is not available, not in JSON format, or cannot be parsed.
       *
       * @beta
       */
      async json(): Promise<any> {
        return await NodeStream.consumeToJson({ readable: await this.stream() });
      },

      /**
       * Returns the data of the current record as a `string`.
       *
       * @returns A promise that resolves to a `string` containing the record's text data.
       * @throws If the record data is not available or cannot be converted to text.
       *
       * @beta
       */
      async text(): Promise<string> {
        return await NodeStream.consumeToText({ readable: await this.stream() });
      },

      /**
       * Provides a `Readable` stream containing the record's data.
       *
       * @returns A promise that resolves to a Node.js `Readable` stream of the record's data.
       * @throws If the record data is not available in-memory and cannot be fetched.
       *
       * @beta
       */
      async stream(): Promise<Readable> {
        if (self._encodedData) {
          /** If `encodedData` is set, it indicates that the Record was instantiated by
           * `dwn.records.create()`/`dwn.records.write()` or the record's data payload was small
           * enough to be returned in `dwn.records.query()` results. In either case, the data is
           * already available in-memory and can be returned as a Node.js `Readable` stream. */
          self._readableStream = NodeStream.fromWebReadable({ readableStream: self._encodedData.stream() });

        } else if (!NodeStream.isReadable({ readable: self._readableStream })) {
          /** If the data stream for this `Record` instance has already been partially or fully
           * consumed, then the data must be fetched again from either: */
          self._readableStream = self._remoteOrigin ?
            // A. ...a remote DWN if the record was originally queried from a remote DWN.
            await self.readRecordData({ target: self._remoteOrigin, isRemote: true }) :
            // B. ...a local DWN if the record was originally queried from the local DWN.
            await self.readRecordData({ target: self._connectedDid, isRemote: false });
        }

        if (!self._readableStream) {
          throw new Error('Record data is not available.');
        }

        return self._readableStream;
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

  private _prepareMessage(options: ProcessRecordRequest): ProcessDwnRequest {
    const request: ProcessDwnRequest = {
      messageType : DwnInterfaceName.Records + DwnMethodName.Write,
      author      : this._connectedDid,
      target      : this._connectedDid,
      import      : options.import,
      store       : options.store,
    };

    if (options.rawMessage) {
      removeUndefinedProperties(options.rawMessage);
      request.rawMessage = options.rawMessage as Partial<RecordsWriteMessage>;
    }
    else {
      request.messageOptions = options.messageOptions;
    }

    if (options.dataStream) {
      request.dataStream = options.dataStream;
    }

    return request;
  }

  private async _processRecord(options: { store: boolean, import: boolean }): Promise<ResponseStatus> {

    const { store = true, import: _import = false } = options;
    const initialWrite = this._initialWrite;

    // Is there an initial write? Have we already stored this record?
    if (initialWrite && !this._initialWriteStored) {
      const requestOptions = this._prepareMessage({
        import     : _import,
        store      : store,
        rawMessage : {
          contextId: this._contextId,
          ...initialWrite
        }
      });

      const agentResponse = await this._agent.processDwnRequest(requestOptions);
      const { message, reply: { status } } = agentResponse;
      const responseMessage = message as RecordsWriteMessage;

      // If we are importing, make sure to update the initial write's authorization, because now it will have the owner's signature on it
      if (200 <= status.code && status.code <= 299) {
        this._initialWriteStored = true;
        if (_import) initialWrite.authorization = responseMessage.authorization;
      }
    }

    const requestOptions = this._prepareMessage({
      import     : !initialWrite && _import,
      store      : store,
      dataStream : await this.data.blob(),
      rawMessage : {
        contextId     : this._contextId,
        recordId      : this._recordId,
        descriptor    : this._descriptor,
        attestation   : this._attestation,
        authorization : this._authorization,
        encryption    : this._encryption,
      }
    });

    const agentResponse = await this._agent.processDwnRequest(requestOptions);
    const { message, reply: { status } } = agentResponse;
    const responseMessage = message as RecordsWriteMessage;

    if (200 <= status.code && status.code <= 299) {
      if (_import) this._authorization = responseMessage.authorization;
    }

    return { status };
  }

  async store(options?: { import: boolean }): Promise<ResponseStatus> {
    // process the record and always set store to true
    return this._processRecord({ ...options, store: true });
  }

  async import(options?: { store: boolean }): Promise<ResponseStatus> {
    // process the record and always set import to true, only skip storage if explicitly set to false
    return this._processRecord({ store: options?.store !== false, import: true });
  }


  /**
   * Send the current record to a remote DWN by specifying their DID
   * If no DID is specified, the target is assumed to be the owner (connectedDID).
   * (vs waiting for the regular DWN sync)
   * @param target - the optional DID to send the record to, if none is set it is sent to the connectedDid
   * @returns the status of the send record request
   * @throws `Error` if the record has already been deleted.
   *
   * @beta
   */
  async send(target?: string): Promise<ResponseStatus> {

    const initialWrite = this._initialWrite;
    if (!target) {
      target = this._connectedDid;
    }

    if (initialWrite && !Record.checkSendCache(this._recordId, target)){

      const initialState = {
        messageType : DwnInterfaceName.Records + DwnMethodName.Write,
        author      : this._connectedDid,
        target      : target,
        rawMessage  : removeUndefinedProperties({
          contextId: this._contextId,
          ...initialWrite
        })
      } as any;

      await this._agent.sendDwnRequest(initialState);

      Record.setSendCache(this._recordId, target);

    }

    const latestState = {
      messageType : DwnInterfaceName.Records + DwnMethodName.Write,
      author      : this._connectedDid,
      dataStream  : await this.data.blob(),
      target      : target
    } as any;

    if (this._authorization) {
      latestState.rawMessage = removeUndefinedProperties({
        contextId     : this._contextId,
        recordId      : this._recordId,
        descriptor    : this._descriptor,
        attestation   : this._attestation,
        authorization : this._authorization,
        encryption    : this._encryption,
      });
    }
    else {
      latestState.messageOptions = this.toJSON();
    }

    const { reply: { status } } = await this._agent.sendDwnRequest(latestState);

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
      authorization    : this.authorization,
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
      protocolRole     : this.protocolRole,
      published        : this.published,
      recipient        : this.recipient,
      recordId         : this.id,
      schema           : this.schema
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
   *
   * @beta
   */
  async update(options: RecordUpdateOptions = {}): Promise<ResponseStatus> {
    // Map Record class `dateModified`  property to DWN SDK `messageTimestamp`.
    const { dateModified, ...updateOptions } = options as Partial<RecordsWriteOptions> & RecordUpdateOptions;
    updateOptions.messageTimestamp = dateModified;

    // Begin assembling update message.
    let updateMessage = {...this._descriptor, ...updateOptions } as Partial<RecordsWriteOptions>;

    let dataBlob: Blob;
    if (options.data !== undefined) {
      // If `data` is being updated then `dataCid` and `dataSize` must be undefined and the `data`
      // property is passed as a top-level property to `agent.processDwnRequest()`.
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
      author      : this._connectedDid,
      dataStream  : dataBlob,
      messageOptions,
      messageType : DwnInterfaceName.Records + DwnMethodName.Write,
      target      : this._connectedDid,
    });

    const { message, reply: { status } } = agentResponse;
    const responseMessage = message as RecordsWriteMessage;

    if (200 <= status.code && status.code <= 299) {
      if (!this._initialWrite) {
        this._initialWrite = JSON.parse(JSON.stringify(removeUndefinedProperties({
          contextId     : this._contextId,
          recordId      : this._recordId,
          descriptor    : this._descriptor,
          attestation   : this._attestation,
          authorization : this._authorization,
          encryption    : this._encryption,
        })));
      }
      // Only update the local Record instance mutable properties if the record was successfully (over)written.
      this._authorization = responseMessage.authorization;
      this._protocolRole = messageOptions.protocolRole;
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
   * Fetches the record's data from the specified DWN.
   *
   * This private method is called when the record data is not available in-memory
   * and needs to be fetched from either a local or a remote DWN.
   * It makes a read request to the specified DWN and processes the response to provide
   * a Node.js `Readable` stream of the record's data.
   *
   * @param target - The DID of the DWN to fetch the data from.
   * @param isRemote - Indicates whether the target DWN is a remote node.
   * @returns A Promise that resolves to a Node.js `Readable` stream of the record's data.
   * @throws If there is an error while fetching or processing the data from the DWN.
   *
   * @beta
   */
  private async readRecordData({ target, isRemote }: { target: string, isRemote: boolean }) {
    const readRequest = {
      author         : this._connectedDid,
      messageOptions : { filter: { recordId: this.id } },
      messageType    : DwnInterfaceName.Records + DwnMethodName.Read,
      target,
    };

    const agentResponsePromise = isRemote ?
      this._agent.sendDwnRequest(readRequest) :
      this._agent.processDwnRequest(readRequest);

    try {
      const { reply: { record }} = await agentResponsePromise;
      const dataStream: ReadableStream | Readable = record.data;
      // If the data stream is a web ReadableStream, convert it to a Node.js Readable.
      const nodeReadable = Stream.isReadableStream(dataStream) ?
        NodeStream.fromWebReadable({ readableStream: dataStream }) :
        dataStream;
      return nodeReadable;

    } catch (error) {
      throw new Error(`Error encountered while attempting to read data: ${error.message}`);
    }
  }

  /**
   * Verifies if the properties to be mutated are mutable.
   *
   * This private method is used to ensure that only mutable properties of the `Record` instance
   * are being changed. It checks whether the properties specified for mutation are among the
   * set of properties that are allowed to be modified. If any of the properties to be mutated
   * are not in the set of mutable properties, the method throws an error.
   *
   * @param propertiesToMutate - An iterable of property names that are intended to be mutated.
   * @param mutableDescriptorProperties - A set of property names that are allowed to be mutated.
   *
   * @throws If any of the properties in `propertiesToMutate` are not in `mutableDescriptorProperties`.
   *
   * @beta
   */
  private static verifyPermittedMutation(propertiesToMutate: Iterable<string>, mutableDescriptorProperties: Set<string>) {
    for (const property of propertiesToMutate) {
      if (!mutableDescriptorProperties.has(property)) {
        throw new Error(`${property} is an immutable property. Its value cannot be changed.`);
      }
    }
  }
}