import { AgentPermissionsApi, DwnDataEncodedRecordsWriteMessage, DwnPermissionConditions, DwnPermissionRequest, DwnPermissionScope, DwnResponseStatus, SendDwnRequest, Web5Agent } from '@web5/agent';
import { DwnInterface } from '@web5/agent';
import { Convert } from '@web5/common';
import { PermissionGrant } from './permission-grant.js';

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

export interface PermissionRequestOptions {
  connectedDid: string;
  message: DwnDataEncodedRecordsWriteMessage;
  agent: Web5Agent;
}

export class PermissionRequest implements PermissionRequestModel {
  private _permissions: AgentPermissionsApi;
  private _connectedDid: string;
  private _message: DwnDataEncodedRecordsWriteMessage;
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

  get id() {
    return this._request.id;
  }

  get requester() {
    return this._request.requester;
  }

  get description() {
    return this._request.description;
  }

  get delegated() {
    return this._request.delegated;
  }

  get scope() {
    return this._request.scope;
  }

  get conditions() {
    return this._request.conditions;
  }

  get agent(): Web5Agent {
    return this._permissions.agent;
  }

  get rawMessage(): DwnDataEncodedRecordsWriteMessage {
    return this._message;
  }

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

  toJSON(): PermissionRequestModel {
    return this._request;
  }
}