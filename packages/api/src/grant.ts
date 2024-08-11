import type {
  AgentPermissionsApi,
  DwnDataEncodedRecordsWriteMessage,
  DwnResponseStatus,
  SendDwnRequest,
  Web5Agent
} from '@web5/agent';

import { Convert } from '@web5/common';
import {
  DwnInterface,
  DwnPermissionGrant,
  getRecordAuthor
} from '@web5/agent';
import { GrantRevocation } from './grant-revocation.js';

interface GrantModel {
  message: DwnDataEncodedRecordsWriteMessage;
  grant: DwnPermissionGrant;
}

export interface GrantOptions {
  connectedDid: string;
  message: DwnDataEncodedRecordsWriteMessage;
  grant: DwnPermissionGrant;
}

export class Grant implements GrantModel {

  private _permissions: AgentPermissionsApi;
  private _connectedDid: string;
  private _message: DwnDataEncodedRecordsWriteMessage;
  private _author: string;
  private _grant: DwnPermissionGrant;

  private constructor(permissions: AgentPermissionsApi, options: GrantOptions) {
    this._permissions = permissions;
    this._connectedDid = options.connectedDid;

    // Store the author DID that originally signed the message as a convenience for developers, so
    // that they don't have to decode the signer's DID from the JWS.
    this._author = getRecordAuthor(options.message);

    // Store the message that represents the grant.
    this._message = options.message;

    // Store the parsed grant object.
    this._grant = options.grant;
  }

  static async parse({ connectedDid, permissions, message }:{
    connectedDid: string;
    permissions: AgentPermissionsApi;
    message: DwnDataEncodedRecordsWriteMessage;
  }): Promise<Grant> {
    const grant = await DwnPermissionGrant.parse(message);
    return new Grant(permissions, { connectedDid, message, grant });
  }

  get agent(): Web5Agent {
    return this._permissions.agent;
  }

  get message(): DwnDataEncodedRecordsWriteMessage {
    return this._message;
  }

  get grant(): DwnPermissionGrant {
    return this._grant;
  }

  get author(): string {
    return this._author;
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

  async store(importGrant?: boolean): Promise<DwnResponseStatus> {
    const { encodedData, ...rawMessage } = this.message;
    const dataStream = new Blob([ Convert.base64Url(encodedData).toUint8Array() ]);

    const { reply, message } = await this.agent.processDwnRequest({
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

  isRevoked(remote: boolean = true): Promise<boolean> {
    return this._permissions.isGrantRevoked({
      author        : this._connectedDid,
      target        : this.author,
      grantRecordId : this.grant.id,
      remote
    });
  }
}