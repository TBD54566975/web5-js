import { AgentPermissionsApi, DwnDataEncodedRecordsWriteMessage, DwnPermissionConditions, DwnPermissionRequest, DwnPermissionScope, DwnResponseStatus, SendDwnRequest, Web5Agent } from '@web5/agent';
import { DwnInterface } from '@web5/agent';
import { Convert } from '@web5/common';
import { PermissionGrant } from './permission-grant.js';

/**
 * Represents the structured data model of a PermissionsRequest record, encapsulating the essential fields that define
 * the request's data and payload within a Decentralized Web Node (DWN).
 */
export interface PermissionRequestModel {
  /**
   * The ID of the permission request, which is the record ID DWN message.
   */
  readonly id: string;

  /**
   * The requester for of the permission.
   */
  readonly requester: string;

  /**
   * Optional string that communicates what the requested grant would be used for.
   */
  readonly description?: string;

  /**
   * Whether the requested grant is delegated or not.
   * If `true`, the `requestor` will be able to act as the grantor of the permission within the scope of the requested grant.
   */
  readonly delegated?: boolean;

  /**
   * The scope of the allowed access.
   */
  readonly scope: DwnPermissionScope;

  /**
   * Optional conditions that must be met when the requested grant is used.
   */
  readonly conditions?: DwnPermissionConditions;
}

/**
 * The `PermissionRequest` class encapsulates a permissions protocol `request` record, providing a more
 * developer-friendly interface for working with Decentralized Web Node (DWN) records.
 *
 * Methods are provided to grant the request and manage the request's lifecycle, including writing to remote DWNs.
 *
 * @beta
 */
export class PermissionRequest implements PermissionRequestModel {
  /** The PermissionsAPI used to interact with the underlying permission request */
  private _permissions: AgentPermissionsApi;
  /** The DID to use as the author and default target for the underlying permission request */
  private _connectedDid: string;
  /** The underlying DWN `RecordsWrite` message along with encoded data that represent the request */
  private _message: DwnDataEncodedRecordsWriteMessage;
  /** The parsed permission request object */
  private _request: DwnPermissionRequest;

  private constructor({ api, connectedDid, message, request }: {
    api: AgentPermissionsApi;
    connectedDid: string;
    message: DwnDataEncodedRecordsWriteMessage;
    request: DwnPermissionRequest;
  }) {
    this._permissions = api;
    this._connectedDid = connectedDid;

    // Store the parsed request object.
    this._request = request;

    // Store the message that represents the grant.
    this._message = message;
  }

  /** parses the request given an agent, connectedDid and data encoded records write message  */
  static async parse({ connectedDid, agent, message }:{
    connectedDid: string;
    agent: Web5Agent;
    message: DwnDataEncodedRecordsWriteMessage;
  }): Promise<PermissionRequest> {
    //TODO: this does not have to be async https://github.com/TBD54566975/web5-js/pull/831/files
    const request = await DwnPermissionRequest.parse(message);
    const api = new AgentPermissionsApi({ agent });
    return new PermissionRequest({ api, connectedDid, message, request });
  }

  /** The agent to use for this instantiation of the request */
  private get agent(): Web5Agent {
    return this._permissions.agent;
  }

  /** The request's ID, which is also the underlying record's ID  */
  get id() {
    return this._request.id;
  }

  /** The DID that is requesting a permission */
  get requester() {
    return this._request.requester;
  }

  /** (optional) Description of the permission request */
  get description() {
    return this._request.description;
  }

  /** Whether or not the permission request can be used to impersonate the grantor */
  get delegated() {
    return this._request.delegated;
  }

  /** The permission scope under which the requested grant would be valid */
  get scope() {
    return this._request.scope;
  }

  /** The conditions under which the requested grant would be valid */
  get conditions() {
    return this._request.conditions;
  }

  /** The `RecordsWrite` DWN message with encoded data that was used to instantiate this request */
  get rawMessage(): DwnDataEncodedRecordsWriteMessage {
    return this._message;
  }

  /**
   * Send the current permission request to a remote DWN by specifying their DID
   * If no DID is specified, the target is assumed to be the owner (connectedDID).
   *
   * @param target - the optional DID to send the permission request to, if none is set it is sent to the connectedDid
   * @returns the status of the send permission request
   *
   * @beta
   */
  async send(target?: string): Promise<DwnResponseStatus> {
    target ??= this._connectedDid;

    const { encodedData, ...rawMessage } = this._message;
    const dataStream = new Blob([ Convert.base64Url(encodedData).toUint8Array() ]);

    const sendRequestOptions: SendDwnRequest<DwnInterface.RecordsWrite> = {
      messageType : DwnInterface.RecordsWrite,
      author      : this._connectedDid,
      target      : target,
      dataStream,
      rawMessage,
    };

    // Send the current/latest state to the target.
    const { reply } = await this.agent.sendDwnRequest(sendRequestOptions);
    return reply;
  }

  /**
   * Stores the current permission request to the owner's DWN.
   *
   * @param importGrant - if true, the permission request will signed by the owner before storing it to the owner's DWN. Defaults to false.
   * @returns the status of the store request
   *
   * @beta
   */
  async store(): Promise<DwnResponseStatus> {
    const { encodedData, ...rawMessage } = this.rawMessage;
    const dataStream = new Blob([ Convert.base64Url(encodedData).toUint8Array() ]);

    const { reply, message } = await this.agent.processDwnRequest({
      author      : this._connectedDid,
      target      : this._connectedDid,
      messageType : DwnInterface.RecordsWrite,
      rawMessage,
      dataStream,
    });

    this._message = { ...message, encodedData: encodedData };
    return { status: reply.status };
  }

  /**
   * Grants the permission request to the requester.
   *
   * @param dateExpires - the date when the permission grant will expire.
   * @param store - if true, the permission grant will be stored in the owner's DWN. Defaults to true.
   * @returns {PermissionGrant} the granted permission.
   *
   * @beta
   */
  async grant(dateExpires: string, store: boolean = true): Promise<PermissionGrant> {
    const { message } = await this._permissions.createGrant({
      requestId : this.id,
      grantedTo : this.requester,
      scope     : this.scope,
      delegated : this.delegated,
      author    : this._connectedDid,
      store,
      dateExpires,
    });

    return PermissionGrant.parse({
      connectedDid : this._connectedDid,
      agent        : this.agent,
      message
    });
  }

  /**
   * @returns the JSON representation of the permission request
   */
  toJSON(): PermissionRequestModel {
    return this._request;
  }
}