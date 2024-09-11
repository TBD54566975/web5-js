/**
 * NOTE: Added reference types here to avoid a `pnpm` bug during build.
 * https://github.com/TBD54566975/web5-js/pull/507
 */
/// <reference types="@tbd54566975/dwn-sdk-js" />

import type { Readable } from '@web5/common';
import {
  Web5Agent,
  DwnInterface,
  DwnMessage,
  DwnMessageParams,
  DwnResponseStatus,
  ProcessDwnRequest,
  DwnMessageDescriptor,
  getPaginationCursor,
  getRecordAuthor,
  DwnDateSort,
  DwnPaginationCursor,
  isDwnMessage,
  SendDwnRequest,
  PermissionsApi,
  AgentPermissionsApi,
} from '@web5/agent';

import { Convert, isEmptyObject, NodeStream, removeUndefinedProperties, Stream } from '@web5/common';

import { dataToBlob, SendCache } from './utils.js';
import { PermissionGrant } from './permission-grant.js';

/**
 * Represents Immutable Record properties that cannot be changed after the record is created.
 *
 * @beta
 * */
export type ImmutableRecordProperties =
  Pick<DwnMessageDescriptor[DwnInterface.RecordsWrite], 'dateCreated' | 'parentId' | 'protocol' | 'protocolPath' | 'recipient' | 'schema'>;

/**
 * Represents Optional Record properties that depend on the Record's current state.
 *
 * @beta
*/
export type OptionalRecordProperties =
  Pick<DwnMessage[DwnInterface.RecordsWrite], 'authorization' | 'attestation' | 'encryption' | 'contextId' > &
  Pick<DwnMessageDescriptor[DwnInterface.RecordsWrite], 'dataFormat' | 'dataCid' | 'dataSize' | 'datePublished' | 'published' | 'tags'>;

/**
 * Represents the structured data model of a record, encapsulating the essential fields that define
 * the record's metadata and payload within a Decentralized Web Node (DWN).
 *
 * @beta
 */
export type RecordModel = ImmutableRecordProperties & OptionalRecordProperties & {

  /** The logical author of the record. */
  author: string;

  /** The unique identifier of the record. */
  recordId?: string;

  /** The timestamp indicating when the record was last modified. */
  messageTimestamp?: string;

  /** The protocol role under which this record is written. */
  protocolRole?: RecordOptions['protocolRole'];
}

/**
 * Options for configuring a {@link Record} instance, extending the base `RecordsWriteMessage` with
 * additional properties.
 *
 * This type combines the standard fields required for writing DWN records with additional metadata
 * and configuration options used specifically in the {@link Record} class.
 *
 * @beta
 */
export type RecordOptions = DwnMessage[DwnInterface.RecordsWrite | DwnInterface.RecordsDelete] & {
  /** The DID that signed the record. */
  author: string;

  /** The attestation signature(s) for the record. */
  attestation?: DwnMessage[DwnInterface.RecordsWrite]['attestation'];

  /** The encryption information for the record. */
  encryption?: DwnMessage[DwnInterface.RecordsWrite]['encryption'];

  /** The contextId associated with the record. */
  contextId?: string;

  /** The unique identifier of the record */
  recordId?: string;

  /** The DID of the DWN tenant under which record operations are being performed. */
  connectedDid: string;

  /** The optional DID that will sign the records on behalf of the connectedDid  */
  delegateDid?: string;

  /** The data of the record, either as a Base64 URL encoded string or a Blob. */
  encodedData?: string | Blob;

  /**
   * A stream of data, conforming to the `Readable` or `ReadableStream` interface, providing a
   * mechanism to read the record's data sequentially. This is particularly useful for handling
   * large datasets that should not be loaded entirely in memory, allowing for efficient, chunked
   * processing of the record's data.
   */
  data?: Readable | ReadableStream;

  /** The initial `RecordsWriteMessage` that represents the initial state/version of the record. */
  initialWrite?: DwnMessage[DwnInterface.RecordsWrite];

  /** The protocol role under which this record is written. */
  protocolRole?: string;

  /** The remote tenant DID if the record was queried or read from a remote DWN. */
  remoteOrigin?: string;
};

/**
 * Parameters for updating a DWN record.
 *
 * This type specifies the set of properties that can be updated on an existing record. It is used
 * to convey the new state or changes to be applied to the record.
 *
 * @beta
 */
export type RecordUpdateParams = {
  /**
   * The new data for the record, which can be of any type. This data will replace the existing
   * data of the record. It's essential to ensure that this data is compatible with the record's
   * schema or data format expectations.
   */
  data?: unknown;

  /**
   * The Content Identifier (CID) of the data. Updating this value changes the reference to the data
   * associated with the record.
   */
  dataCid?: DwnMessageDescriptor[DwnInterface.RecordsWrite]['dataCid'];

  /** The data format/MIME type of the supplied data */
  dataFormat?: string;

  /** The size of the data in bytes. */
  dataSize?: DwnMessageDescriptor[DwnInterface.RecordsWrite]['dataSize'];

  /** The timestamp indicating when the record was last modified. */
  dateModified?: DwnMessageDescriptor[DwnInterface.RecordsWrite]['messageTimestamp'];

  /** The timestamp indicating when the record was published. */
  datePublished?: DwnMessageDescriptor[DwnInterface.RecordsWrite]['datePublished'];

  /** The protocol role under which this record is written. */
  protocolRole?: RecordOptions['protocolRole'];

  /** The published status of the record. */
  published?: DwnMessageDescriptor[DwnInterface.RecordsWrite]['published'];


  /** The tags associated with the updated record */
  tags?: DwnMessageDescriptor[DwnInterface.RecordsWrite]['tags'];
}

/**
 * Parameters for deleting a DWN record.
 *
 * This type specifies the set of properties that are used when deleting an existing record. It is used
 * to convey the new state or changes to be applied to the record.
 *
 * @beta
 */
export type RecordDeleteParams = {
  /** Whether or not to store the message. */
  store?: boolean;

  /** Whether or not to sign the delete as an owner in order to import it. */
  signAsOwner?: boolean;

  /** Whether or not to prune any children this record may have. */
  prune?: DwnMessageDescriptor[DwnInterface.RecordsDelete]['prune'];

  /** The timestamp indicating when the record was deleted. */
  dateModified?: DwnMessageDescriptor[DwnInterface.RecordsDelete]['messageTimestamp'];
};

/**
 * The `Record` class encapsulates a single record's data and metadata, providing a more
 * developer-friendly interface for working with Decentralized Web Node (DWN) records.
 *
 * Methods are provided to read, update, and manage the record's lifecycle, including writing to
 * remote DWNs.
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
  /**
   * Cache to minimize the amount of redundant two-phase commits we do in store() and send()
   * Retains awareness of the last 100 records stored/sent for up to 100 target DIDs each.
   */
  private static _sendCache = SendCache;

  // Record instance metadata.

  /** The {@link Web5Agent} instance that handles DWNs requests. */
  private _agent: Web5Agent;
  /** The DID of the DWN tenant under which operations are being performed. */
  private _connectedDid: string;
  /** The optional DID that is delegated to act on behalf of the connectedDid */
  private _delegateDid?: string;
  /** cache for fetching a permission {@link PermissionGrant}, keyed by a specific MessageType and protocol */
  private _permissionsApi: PermissionsApi;
  /** Encoded data of the record, if available. */
  private _encodedData?: Blob;
  /** Stream of the record's data. */
  private _readableStream?: Readable;
  /** The origin DID if the record was fetched from a remote DWN. */
  private _remoteOrigin?: string;

  // Private variables for DWN `RecordsWrite` message properties.

  /** The DID of the entity that most recently authored or deleted the record. */
  private _author: string;
  /** The DID of the entity that originally created the record. */
  private _creator: string;
  /** Attestation JWS signature. */
  private _attestation?: DwnMessage[DwnInterface.RecordsWrite]['attestation'];
  /** Authorization signature(s). */
  private _authorization?: DwnMessage[DwnInterface.RecordsWrite | DwnInterface.RecordsDelete]['authorization'];
  /** Context ID associated with the record. */
  private _contextId?: string;
  /** Descriptor detailing the record's schema, format, and other metadata. */
  private _descriptor: DwnMessageDescriptor[DwnInterface.RecordsWrite] | DwnMessageDescriptor[DwnInterface.RecordsDelete];
  /** Encryption details for the record, if the data is encrypted. */
  private _encryption?: DwnMessage[DwnInterface.RecordsWrite]['encryption'];
  /** Initial state of the record before any updates. */
  private _initialWrite: RecordOptions['initialWrite'];
  /** Flag indicating if the initial write has been stored, to prevent duplicates. */
  private _initialWriteStored: boolean;
  /** Flag indicating if the initial write has been signed by the owner. */
  private _initialWriteSigned: boolean;
  /** Unique identifier of the record. */
  private _recordId: string;
  /** Role under which the record is written. */
  private _protocolRole?: RecordOptions['protocolRole'];

  /** The `RecordsWriteMessage` descriptor unless the record is in a deleted state */
  private get _recordsWriteDescriptor() {
    if (isDwnMessage(DwnInterface.RecordsWrite, this.rawMessage)) {
      return this._descriptor as DwnMessageDescriptor[DwnInterface.RecordsWrite];
    }

    return undefined; // returns undefined if the descriptor does not represent a RecordsWrite message.
  }

  /** The `RecordsWrite` descriptor from the current record or the initial write if the record is in a delete state. */
  private get _immutableProperties(): ImmutableRecordProperties {
    return this._recordsWriteDescriptor || this._initialWrite.descriptor;
  }

  // Getters for immutable Record properties.
  /** Record's ID */
  get id() { return this._recordId; }

  /** Record's context ID. If the record is deleted, the context Id comes from the initial write */
  get contextId() { return this.deleted ? this._initialWrite.contextId : this._contextId; }

  /** Record's creation date */
  get dateCreated() { return this._immutableProperties.dateCreated; }

  /** Record's parent ID */
  get parentId() { return this._immutableProperties.parentId; }

  /** Record's protocol */
  get protocol() { return this._immutableProperties.protocol; }

  /** Record's protocol path */
  get protocolPath() { return this._immutableProperties.protocolPath; }

  /** Record's recipient */
  get recipient() { return this._immutableProperties.recipient; }

  /** Record's schema */
  get schema() { return this._immutableProperties.schema; }


  // Getters for mutable DWN RecordsWrite properties that may be undefined in a deleted state.
  /** Record's data format */
  get dataFormat() { return this._recordsWriteDescriptor?.dataFormat; }

  /** Record's CID */
  get dataCid() { return this._recordsWriteDescriptor?.dataCid; }

  /** Record's data size */
  get dataSize() { return this._recordsWriteDescriptor?.dataSize; }

  /** Record's published date */
  get datePublished() { return this._recordsWriteDescriptor?.datePublished; }

  /** Record's published status (true/false) */
  get published() { return this._recordsWriteDescriptor?.published; }

  /** Tags of the record */
  get tags() { return this._recordsWriteDescriptor?.tags; }


  // Getters for for properties that depend on the current state of the Record.
  /** DID that is the logical author of the Record. */
  get author(): string { return this._author; }

  /** DID that is the original creator of the Record. */
  get creator(): string { return this._creator; }

  /** Record's modified date */
  get dateModified() { return this._descriptor.messageTimestamp; }

  /** Record's encryption */
  get encryption(): DwnMessage[DwnInterface.RecordsWrite]['encryption'] { return this._encryption; }

  /** Record's signatures attestation */
  get authorization(): DwnMessage[DwnInterface.RecordsWrite | DwnInterface.RecordsDelete]['authorization'] { return this._authorization; }

  /** Record's signatures attestation */
  get attestation(): DwnMessage[DwnInterface.RecordsWrite]['attestation'] | undefined { return this._attestation; }

  /** Role under which the author is writing the record */
  get protocolRole() { return this._protocolRole; }

  /** Record's deleted state (true/false) */
  get deleted() { return isDwnMessage(DwnInterface.RecordsDelete, this.rawMessage); }

  /** Record's initial write if the record has been updated */
  get initialWrite(): RecordOptions['initialWrite'] { return this._initialWrite; }

  /**
   * Returns a copy of the raw `RecordsWriteMessage` that was used to create the current `Record` instance.
   */
  get rawMessage(): DwnMessage[DwnInterface.RecordsWrite] | DwnMessage[DwnInterface.RecordsDelete] {
    const messageType = this._descriptor.interface + this._descriptor.method;
    let message: DwnMessage[DwnInterface.RecordsWrite] | DwnMessage[DwnInterface.RecordsDelete];
    if (messageType === DwnInterface.RecordsWrite) {
      message = JSON.parse(JSON.stringify({
        contextId     : this._contextId,
        recordId      : this._recordId,
        descriptor    : this._descriptor,
        attestation   : this._attestation,
        authorization : this._authorization,
        encryption    : this._encryption,
      }));
    } else {
      message = JSON.parse(JSON.stringify({
        descriptor    : this._descriptor,
        authorization : this._authorization,
      }));
    }

    removeUndefinedProperties(message);
    return message;
  }

  constructor(agent: Web5Agent, options: RecordOptions, permissionsApi?: PermissionsApi) {

    this._agent = agent;

    // Store the author DID that originally signed the message as a convenience for developers, so
    // that they don't have to decode the signer's DID from the JWS.
    this._author = options.author;
    // The creator is the author of the initial write, or the author of the record if there is no initial write.
    this._creator = options.initialWrite ? getRecordAuthor(options.initialWrite) : options.author;

    // Store the `connectedDid`, and optionally the `delegateDid` and `permissionsApi` in order to be able
    // to perform operations on the record (update, delete, data) as a delegate of the connected DID.
    this._connectedDid = options.connectedDid;
    this._delegateDid = options.delegateDid;
    this._permissionsApi = permissionsApi ?? new AgentPermissionsApi({ agent });

    // If the record was queried or read from a remote DWN, the `remoteOrigin` DID will be
    // defined. This value is used to send subsequent read requests to the same remote DWN in the
    // event the record's data payload was too large to be returned in query results. or must be
    // read again (e.g., if the data stream is consumed).
    this._remoteOrigin = options.remoteOrigin;

    // RecordsWriteMessage properties.
    this._attestation = options.attestation;
    this._authorization = options.authorization;
    this._contextId = options.contextId;
    this._descriptor = options.descriptor;
    this._encryption = options.encryption;
    this._initialWrite = options.initialWrite;
    this._recordId = this.isRecordsDeleteDescriptor(options.descriptor) ? options.descriptor.recordId : options.recordId;
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

      /**
       * Attaches callbacks for the resolution and/or rejection of the `Promise` returned by
       * `stream()`.
       *
       * This method is a proxy to the `then` method of the `Promise` returned by `stream()`,
       * allowing for a seamless integration with promise-based workflows.
       * @param onFulfilled - A function to asynchronously execute when the `stream()` promise
       *                      becomes fulfilled.
       * @param onRejected - A function to asynchronously execute when the `stream()` promise
       *                     becomes rejected.
       * @returns A `Promise` for the completion of which ever callback is executed.
       */
      then(onFulfilled?: (value: Readable) => Readable | PromiseLike<Readable>, onRejected?: (reason: any) => PromiseLike<never>) {
        return this.stream().then(onFulfilled, onRejected);
      },

      /**
       * Attaches a rejection handler callback to the `Promise` returned by the `stream()` method.
       * This method is a shorthand for `.then(undefined, onRejected)`, specifically designed for handling
       * rejection cases in the promise chain initiated by accessing the record's data. It ensures that
       * errors during data retrieval or processing can be caught and handled appropriately.
       *
       * @param onRejected - A function to asynchronously execute when the `stream()` promise
       *                     becomes rejected.
       * @returns A `Promise` that resolves to the value of the callback if it is called, or to its
       *          original fulfillment value if the promise is instead fulfilled.
       */
      catch(onRejected?: (reason: any) => PromiseLike<never>) {
        return this.stream().catch(onRejected);
      }
    };

    return dataObj;
  }

  /**
   * Stores the current record state as well as any initial write to the owner's DWN.
   *
   * @param importRecord - if true, the record will signed by the owner before storing it to the owner's DWN. Defaults to false.
   * @returns the status of the store request
   *
   * @beta
   */
  async store(importRecord: boolean = false): Promise<DwnResponseStatus> {
    // if we are importing the record we sign it as the owner
    return this.processRecord({ signAsOwner: importRecord, store: true });
  }

  /**
   * Signs the current record state as well as any initial write and optionally stores it to the owner's DWN.
   * This is useful when importing a record that was signed by someone else into your own DWN.
   *
   * @param store - if true, the record will be stored to the owner's DWN after signing. Defaults to true.
   * @returns the status of the import request
   *
   * @beta
   */
  async import(store: boolean = true): Promise<DwnResponseStatus> {
    return this.processRecord({ store, signAsOwner: true });
  }

  /**
   * Send the current record to a remote DWN by specifying their DID
   * If no DID is specified, the target is assumed to be the owner (connectedDID).
   *
   * If an initial write is present and the Record class send cache has no awareness of it, the initial write is sent first
   * (vs waiting for the regular DWN sync)
   *
   * @param target - the optional DID to send the record to, if none is set it is sent to the connectedDid
   * @returns the status of the send record request
   * @throws `Error` if the record has already been deleted.
   *
   * @beta
   */
  async send(target?: string): Promise<DwnResponseStatus> {
    const initialWrite = this._initialWrite;
    target ??= this._connectedDid;

    // Is there an initial write? Do we know if we've already sent it to this target?
    if (initialWrite && !Record._sendCache.check(this._recordId, target)){
      // We do have an initial write, so prepare it for sending to the target.
      const rawMessage = {
        ...initialWrite
      };
      removeUndefinedProperties(rawMessage);

      // Send the initial write to the target.
      await this._agent.sendDwnRequest({
        messageType : DwnInterface.RecordsWrite,
        author      : this._connectedDid,
        target      : target,
        rawMessage
      });

      // Set the cache to maintain awareness that we don't need to send the initial write next time.
      Record._sendCache.set(this._recordId, target);
    }

    let sendRequestOptions: SendDwnRequest<DwnInterface.RecordsWrite | DwnInterface.RecordsDelete>;
    if (this.deleted) {
      sendRequestOptions = {
        messageType : DwnInterface.RecordsDelete,
        author      : this._connectedDid,
        target      : target,
        rawMessage  : { ...this.rawMessage }
      };
    } else {
      sendRequestOptions = {
        messageType : DwnInterface.RecordsWrite,
        author      : this._connectedDid,
        target      : target,
        dataStream  : await this.data.blob(),
        rawMessage  : { ...this.rawMessage }
      };
    }

    // Send the current/latest state to the target.
    const { reply } = await this._agent.sendDwnRequest(sendRequestOptions);
    return reply;
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
      parentId         : this.parentId,
      protocol         : this.protocol,
      protocolPath     : this.protocolPath,
      protocolRole     : this.protocolRole,
      published        : this.published,
      recipient        : this.recipient,
      recordId         : this.id,
      schema           : this.schema,
      tags             : this.tags,
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

    // Only display data properties if the record has not been deleted.
    if (!this.deleted) {
      str += `  Data CID: ${this.dataCid}\n`;
      str += `  Data Format: ${this.dataFormat}\n`;
      str += `  Data Size: ${this.dataSize}\n`;
    }

    str += `  Deleted: ${this.deleted}\n`;
    str += `  Created: ${this.dateCreated}\n`;
    str += `  Modified: ${this.dateModified}\n`;
    str += `}`;
    return str;
  }

  /**
   * Returns a pagination cursor for the current record given a sort order.
   *
   * @param sort the sort order to use for the pagination cursor.
   * @returns A promise that resolves to a pagination cursor for the current record.
   */
  async paginationCursor(sort: DwnDateSort): Promise<DwnPaginationCursor | undefined> {
    return isDwnMessage(DwnInterface.RecordsWrite, this.rawMessage) ? getPaginationCursor(this.rawMessage, sort) : undefined;
  }

  /**
   * Update the current record on the DWN.
   * @param params - Parameters to update the record.
   * @returns the status of the update request
   * @throws `Error` if the record has already been deleted.
   *
   * @beta
   */
  async update({ dateModified, data, ...params }: RecordUpdateParams): Promise<DwnResponseStatus> {

    if (this.deleted) {
      throw new Error('Record: Cannot revive a deleted record.');
    }

    // if there is a parentId, we remove it from the descriptor and set a parentContextId
    const { parentId, ...descriptor } = this._recordsWriteDescriptor;
    const parentContextId = parentId ? this._contextId.split('/').slice(0, -1).join('/') : undefined;

    // Begin assembling the update message.
    let updateMessage: DwnMessageParams[DwnInterface.RecordsWrite] = {
      ...descriptor,
      ...params,
      parentContextId,
      messageTimestamp : dateModified, // Map Record class `dateModified` property to DWN SDK `messageTimestamp`
      recordId         : this._recordId
    };

    // NOTE: The original Record's tags are copied to the update message, so that the tags are not lost.
    // However if a user passes new tags in the `RecordUpdateParams` object, they will overwrite the original tags.
    // If the updated tag object is empty or set to null, we remove the tags property to avoid schema validation errors in the DWN SDK.
    if (isEmptyObject(updateMessage.tags) || updateMessage.tags === null) {
      delete updateMessage.tags;
    }

    let dataBlob: Blob;
    if (data !== undefined) {
      // If `data` is being updated then `dataCid` and `dataSize` must be undefined and the `data`
      // value must be converted to a Blob and later passed as a top-level property to
      // `agent.processDwnRequest()`.
      delete updateMessage.dataCid;
      delete updateMessage.dataSize;
      ({ dataBlob } = dataToBlob(data, updateMessage.dataFormat));
    }

    // Throw an error if an attempt is made to modify immutable properties.
    // Note: `data` and `dateModified` have already been handled.
    const mutableDescriptorProperties = new Set(['data', 'dataCid', 'dataFormat', 'dataSize', 'datePublished', 'messageTimestamp', 'published', 'tags']);
    Record.verifyPermittedMutation(Object.keys(params), mutableDescriptorProperties);

    // If `published` is set to false, ensure that `datePublished` is undefined. Otherwise, DWN SDK's schema validation
    // will throw an error if `published` is false but `datePublished` is set.
    if (params.published === false && updateMessage.datePublished !== undefined) {
      delete updateMessage.datePublished;
    }

    const requestOptions: ProcessDwnRequest<DwnInterface.RecordsWrite> = {
      author        : this._connectedDid,
      dataStream    : dataBlob,
      messageParams : { ...updateMessage },
      messageType   : DwnInterface.RecordsWrite,
      target        : this._connectedDid,
    };

    if (this._delegateDid) {
      const { message: delegatedGrant } = await this._permissionsApi.getPermissionForRequest({
        connectedDid : this._connectedDid,
        delegateDid  : this._delegateDid,
        protocol     : this.protocol,
        delegate     : true,
        cached       : true,
        messageType  : requestOptions.messageType
      });
      requestOptions.messageParams.delegatedGrant = delegatedGrant;
      requestOptions.granteeDid = this._delegateDid;
    }

    const agentResponse = await this._agent.processDwnRequest(requestOptions);

    const { message, reply: { status } } = agentResponse;
    const responseMessage = message;

    if (200 <= status.code && status.code <= 299) {
      // copy the original raw message to the initial write before we update the values.
      if (!this._initialWrite) {
        // If there is no initial write, we need to create one from the current record state.
        // We checked in the beginning of the function that the rawMessage is a RecordsWrite message.
        this._initialWrite = { ...this.rawMessage as DwnMessage[DwnInterface.RecordsWrite] };
      }

      // Only update the local Record instance mutable properties if the record was successfully (over)written.
      this._authorization = responseMessage.authorization;
      this._protocolRole = params.protocolRole;
      mutableDescriptorProperties.forEach(property => {
        this._descriptor[property] = responseMessage.descriptor[property];
      });

      // Cache data.
      if (data !== undefined) {
        this._encodedData = dataBlob;
      }
    }

    return { status };
  }

  /**
   * Delete the current record on the DWN.
   * @param params - Parameters to delete the record.
   * @returns the status of the delete request
   */
  async delete(deleteParams?: RecordDeleteParams): Promise<DwnResponseStatus> {
    const { store = true, signAsOwner, dateModified, prune = false } = deleteParams || {};

    const signAsOwnerValue = signAsOwner && this._delegateDid === undefined;
    const signAsOwnerDelegate = signAsOwner && this._delegateDid !== undefined;

    if (this.deleted && !this._initialWrite) {
      throw new Error('Record: Record is in an invalid state, initial write is missing.');
    }

    if (!this._initialWrite) {
      // If there is no initial write, we need to create one from the current record state.
      // We checked in the beginning of the function that the initialWrite is not set if the rawMessage is a RecordsDelete message.
      // So we can safely assume that the rawMessage is a RecordsWrite message.
      this._initialWrite = { ...this.rawMessage as DwnMessage[DwnInterface.RecordsWrite] };
    }

    await this.processInitialWriteIfNeeded({ store, signAsOwner });

    // prepare delete options
    let deleteOptions: ProcessDwnRequest<DwnInterface.RecordsDelete> = {
      messageType : DwnInterface.RecordsDelete,
      author      : this._connectedDid,
      target      : this._connectedDid,
      signAsOwner : signAsOwnerValue,
      signAsOwnerDelegate,
      store
    };

    if (this.deleted) {
      // if we have a delete message we can just use it
      deleteOptions.rawMessage = this.rawMessage as DwnMessage[DwnInterface.RecordsDelete];
    } else {
      // otherwise we construct a delete message given the `RecordDeleteParams`
      deleteOptions.messageParams = {
        prune            : prune,
        recordId         : this._recordId,
        messageTimestamp : dateModified,
      };
    }

    if (this._delegateDid) {
      const { message: delegatedGrant } = await this._permissionsApi.getPermissionForRequest({
        connectedDid : this._connectedDid,
        delegateDid  : this._delegateDid,
        protocol     : this.protocol,
        delegate     : true,
        cached       : true,
        messageType  : deleteOptions.messageType
      });

      deleteOptions.messageParams = {
        ...deleteOptions.messageParams,
        delegatedGrant
      };

      deleteOptions.granteeDid = this._delegateDid;
    }

    const agentResponse = await this._agent.processDwnRequest(deleteOptions);
    const { message, reply: { status } } = agentResponse;

    if (status.code !== 202) {
      // If the delete was not successful, return the status.
      return { status };
    }

    // If the delete was successful, update the Record author to the author of the delete message.
    this._author = getRecordAuthor(message);
    this._descriptor = message.descriptor;
    this._authorization = message.authorization;

    // clear out properties that are not relevant for a deleted record
    this._encodedData = undefined;
    this._encryption = undefined;
    this._attestation = undefined;
    this._contextId = undefined;

    return { status };
  }

  /**
   * Process the initial write, if it hasn't already been processed, with the options set for storing and/or signing as the owner.
   */
  private async processInitialWriteIfNeeded({ store, signAsOwner }:{ store: boolean, signAsOwner: boolean }): Promise<void> {
    if (this.initialWrite && ((signAsOwner && !this._initialWriteSigned) || (store && !this._initialWriteStored))) {
      const signAsOwnerValue = signAsOwner && this._delegateDid === undefined;
      const signAsOwnerDelegate = signAsOwner && this._delegateDid !== undefined;

      const initialWriteRequest: ProcessDwnRequest<DwnInterface.RecordsWrite> = {
        messageType : DwnInterface.RecordsWrite,
        rawMessage  : this.initialWrite,
        author      : this._connectedDid,
        target      : this._connectedDid,
        signAsOwner : signAsOwnerValue,
        signAsOwnerDelegate,
        store,
      };

      if (this._delegateDid) {
        const { message: delegatedGrant } = await this._permissionsApi.getPermissionForRequest({
          connectedDid : this._connectedDid,
          delegateDid  : this._delegateDid,
          protocol     : this.protocol,
          delegate     : true,
          cached       : true,
          messageType  : initialWriteRequest.messageType
        });

        initialWriteRequest.messageParams = {
          ...initialWriteRequest.messageParams,
          delegatedGrant
        };

        initialWriteRequest.granteeDid = this._delegateDid;
      }

      // Process the prepared initial write, with the options set for storing and/or signing as the owner.
      const agentResponse = await this._agent.processDwnRequest(initialWriteRequest);

      const { message, reply: { status } } = agentResponse;
      const responseMessage = message;

      if (200 <= status.code && status.code <= 299) {
        if (store) this._initialWriteStored = true;
        if (signAsOwner) {
          this._initialWriteSigned = true;
          this.initialWrite.authorization = responseMessage.authorization;
        }
      }
    }
  }

  /**
   * Handles the various conditions around there being an initial write, whether to store initial/current state,
   * and whether to add an owner signature to the initial write to enable storage when protocol rules require it.
   */
  private async processRecord({ store, signAsOwner }:{ store: boolean, signAsOwner: boolean }): Promise<DwnResponseStatus> {
    const signAsOwnerValue = signAsOwner && this._delegateDid === undefined;
    const signAsOwnerDelegate = signAsOwner && this._delegateDid !== undefined;

    await this.processInitialWriteIfNeeded({ store, signAsOwner });

    let requestOptions: ProcessDwnRequest<DwnInterface.RecordsWrite | DwnInterface.RecordsDelete>;
    // Now that we've processed a potential initial write, we can process the current record state.
    // If the record has been deleted, we need to send a delete request. Otherwise, we send a write request.
    if (this.deleted) {
      requestOptions = {
        messageType : DwnInterface.RecordsDelete,
        rawMessage  : this.rawMessage,
        author      : this._connectedDid,
        target      : this._connectedDid,
        signAsOwner : signAsOwnerValue,
        signAsOwnerDelegate,
        store,
      };
    } else {
      requestOptions = {
        messageType : DwnInterface.RecordsWrite,
        rawMessage  : this.rawMessage,
        author      : this._connectedDid,
        target      : this._connectedDid,
        dataStream  : await this.data.blob(),
        signAsOwner : signAsOwnerValue,
        signAsOwnerDelegate,
        store,
      };
    }

    if (this._delegateDid) {
      const { message: delegatedGrant } = await this._permissionsApi.getPermissionForRequest({
        connectedDid : this._connectedDid,
        delegateDid  : this._delegateDid,
        protocol     : this.protocol,
        delegate     : true,
        cached       : true,
        messageType  : requestOptions.messageType
      });

      requestOptions.messageParams = {
        ...requestOptions.messageParams,
        delegatedGrant
      };

      requestOptions.granteeDid = this._delegateDid;
    }

    const agentResponse = await this._agent.processDwnRequest(requestOptions);
    const { message, reply: { status } } = agentResponse;
    const responseMessage = message;

    if (200 <= status.code && status.code <= 299) {
      // If we are signing as the owner, make sure to update the current record state's authorization, because now it will have the owner's signature on it.
      if (signAsOwner) this._authorization = responseMessage.authorization;
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
   * @param params - Parameters for fetching the record's data.
   * @param params.target - The DID of the DWN to fetch the data from.
   * @param params.isRemote - Indicates whether the target DWN is a remote node.
   * @returns A Promise that resolves to a Node.js `Readable` stream of the record's data.
   * @throws If there is an error while fetching or processing the data from the DWN.
   *
   * @beta
   */
  private async readRecordData({ target, isRemote }: { target: string, isRemote: boolean }) {
    const readRequest: ProcessDwnRequest<DwnInterface.RecordsRead> = {
      author        : this._connectedDid,
      messageParams : { filter: { recordId: this.id } },
      messageType   : DwnInterface.RecordsRead,
      target,
    };

    if (this._delegateDid) {
      // When reading the data as a delegate, if we don't find a grant we will attempt to read it with the delegate DID as the author.
      // This allows users to read publicly available data without needing explicit grants.
      //
      // NOTE: When a read-only Record class is implemented, callers would have that returned instead when they don't have an explicit permission.
      // This should fail if a permission is not found, although it should not happen in practice.
      // TODO: https://github.com/TBD54566975/web5-js/issues/898
      try {
        const { message: delegatedGrant } = await this._permissionsApi.getPermissionForRequest({
          connectedDid : this._connectedDid,
          delegateDid  : this._delegateDid,
          protocol     : this.protocol,
          delegate     : true,
          cached       : true,
          messageType  : readRequest.messageType
        });

        readRequest.messageParams = {
          ...readRequest.messageParams,
          delegatedGrant
        };

        readRequest.granteeDid = this._delegateDid;
      } catch(error) {
        // If there is an error fetching the grant, we will attempt to read the data as the delegate.
        readRequest.author = this._delegateDid;
      }
    }

    const agentResponsePromise = isRemote ?
      this._agent.sendDwnRequest(readRequest) :
      this._agent.processDwnRequest(readRequest);

    try {
      const { reply: { status, record }} = await agentResponsePromise;
      if (status.code !== 200) {
        throw new Error(`${status.code}: ${status.detail}`);
      }

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

  /**
   * Checks if the descriptor is a RecordsDelete descriptor.
   *
   * @param descriptor a RecordsWrite or RecordsDelete descriptor
   */
  private isRecordsDeleteDescriptor(descriptor: DwnMessageDescriptor[DwnInterface.RecordsWrite | DwnInterface.RecordsDelete]): descriptor is DwnMessageDescriptor[DwnInterface.RecordsDelete] {
    return descriptor.interface + descriptor.method === DwnInterface.RecordsDelete;
  }
}