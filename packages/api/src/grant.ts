import type {
  DwnDataEncodedRecordsWriteMessage,
  DwnPermissionConditions,
  DwnPermissionScope,
  DwnResponseStatus,
  SendDwnRequest,
  Web5Agent
} from '@web5/agent';

import { Convert } from '@web5/common';
import {
  AgentPermissionsApi,
  DwnInterface,
  DwnPermissionGrant,
} from '@web5/agent';
import { GrantRevocation } from './grant-revocation.js';

export interface GrantModel {
  /**
   * The ID of the permission grant, which is the record ID DWN message.
   */
  readonly id: string;

  /**
   * The grantor of the permission.
   */
  readonly grantor: string;

  /**
   * The grantee of the permission.
   */
  readonly grantee: string;

  /**
   * The date at which the grant was given.
   */
  readonly dateGranted: string;

  /**
   * Optional string that communicates what the grant would be used for
   */
  readonly description?: string;

  /**
   * Optional CID of a permission request. This is optional because grants may be given without being officially requested
   */
  readonly requestId?: string;

  /**
   * Timestamp at which this grant will no longer be active.
   */
  readonly dateExpires: string;

  /**
   * Whether this grant is delegated or not. If `true`, the `grantedTo` will be able to act as the `grantedTo` within the scope of this grant.
   */
  readonly delegated?: boolean;

  /**
   * The scope of the allowed access.
   */
  readonly scope: DwnPermissionScope;

  /**
   * Optional conditions that must be met when the grant is used.
   */
  readonly conditions?: DwnPermissionConditions;
}

export interface GrantOptions {
  connectedDid: string;
  message: DwnDataEncodedRecordsWriteMessage;
  agent: Web5Agent;
}

export class Grant implements GrantModel {

  private _permissions: AgentPermissionsApi;
  private _connectedDid: string;
  private _message: DwnDataEncodedRecordsWriteMessage;
  private _grant: DwnPermissionGrant;

  private constructor({ api, connectedDid, message, grant }:{
    api: AgentPermissionsApi;
    connectedDid: string;
    message: DwnDataEncodedRecordsWriteMessage;
    grant: DwnPermissionGrant;
  }) {
    this._permissions = api;

    // Store the connected DID for convenience.
    this._connectedDid = connectedDid;

    // Store the message that represents the grant.
    this._message = message;

    // Store the parsed grant object.
    this._grant = grant;
  }

  static async parse(options: GrantOptions): Promise<Grant> {
    //TODO: this does not have to be async https://github.com/TBD54566975/web5-js/pull/831/files
    const grant = await DwnPermissionGrant.parse(options.message);
    const api = new AgentPermissionsApi({ agent: options.agent });
    return new Grant({ ...options, grant, api });
  }

  get id(): string {
    return this._grant.id;
  }

  get grantor(): string {
    return this._grant.grantor;
  }

  get grantee(): string {
    return this._grant.grantee;
  }

  get dateGranted(): string {
    return this._grant.dateGranted;
  }

  get description(): string | undefined {
    return this._grant.description;
  }

  get requestId(): string | undefined {
    return this._grant.requestId;
  }

  get dateExpires(): string {
    return this._grant.dateExpires;
  }

  get delegated(): boolean | undefined {
    return this._grant.delegated;
  }

  get scope(): DwnPermissionScope {
    return this._grant.scope;
  }

  get conditions(): DwnPermissionConditions {
    return this._grant.conditions;
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

  async store(importGrant: boolean = false): Promise<DwnResponseStatus> {
    const { encodedData, ...rawMessage } = this.rawMessage;
    const dataStream = new Blob([ Convert.base64Url(encodedData).toUint8Array() ]);

    const { reply, message } = await this.agent.processDwnRequest({
      store       : true,
      author      : this._connectedDid,
      target      : this._connectedDid,
      messageType : DwnInterface.RecordsWrite,
      signAsOwner : importGrant,
      rawMessage,
      dataStream,
    });

    this._message = { ...message, encodedData: encodedData };
    return { status: reply.status };
  }

  async import(store: boolean = false): Promise<DwnResponseStatus> {
    const { encodedData, ...rawMessage } = this.rawMessage;
    const dataStream = new Blob([ Convert.base64Url(encodedData).toUint8Array() ]);

    const { reply, message } = await this.agent.processDwnRequest({
      store,
      author      : this._connectedDid,
      target      : this._connectedDid,
      messageType : DwnInterface.RecordsWrite,
      signAsOwner : true,
      rawMessage,
      dataStream,
    });

    this._message = { ...message, encodedData: encodedData };
    return { status: reply.status };
  }

  async revoke(store: boolean = true): Promise<GrantRevocation> {
    const revocation = await this._permissions.createRevocation({
      store,
      author : this._connectedDid,
      grant  : this._grant,
    });

    return GrantRevocation.parse({
      connectedDid : this._connectedDid,
      permissions  : this._permissions,
      message      : revocation.message,
    });
  }

  isRevoked(remote: boolean = false): Promise<boolean> {
    return this._permissions.isGrantRevoked({
      author        : this._connectedDid,
      target        : this.grantor,
      grantRecordId : this.id,
      remote
    });
  }

  toJSON(): GrantModel {
    return this._grant;
  }
}