import { AgentPermissionsApi, DwnDataEncodedRecordsWriteMessage, DwnPermissionRequest, DwnResponseStatus, SendDwnRequest, Web5Agent } from '@web5/agent';
import { DwnInterface, getRecordAuthor } from '@web5/agent';
import { Convert } from '@web5/common';

export interface GrantRequestModel {
  message: DwnDataEncodedRecordsWriteMessage;
  request: DwnPermissionRequest;
}

export interface GrantRequestOptions {
  connectedDid: string;
  message: DwnDataEncodedRecordsWriteMessage;
  request: DwnPermissionRequest;
}

export class GrantRequest implements GrantRequestModel {
  private _permissions: AgentPermissionsApi;
  private _connectedDid: string;
  private _message: DwnDataEncodedRecordsWriteMessage;
  private _author: string;
  private _request: DwnPermissionRequest;

  private constructor(permissions: AgentPermissionsApi, options: GrantRequestOptions) {
    this._permissions = permissions;
    this._connectedDid = options.connectedDid;

    // Store the parsed request object.
    this._request = options.request;

    // Store the author DID that originally signed the message as a convenience for developers, so
    // that they don't have to decode the signer's DID from the JWS.
    this._author = getRecordAuthor(options.message);

    // Store the message that represents the grant.
    this._message = options.message;
  }

  static async parse({ connectedDid, permissions, message }:{
    connectedDid: string;
    permissions: AgentPermissionsApi;
    message: DwnDataEncodedRecordsWriteMessage;
  }): Promise<GrantRequest> {
    const request = await DwnPermissionRequest.parse(message);
    return new GrantRequest(permissions, { connectedDid, message, request });
  }

  get agent(): Web5Agent {
    return this._permissions.agent;
  }

  get request(): DwnPermissionRequest {
    return this._request;
  }

  get message(): DwnDataEncodedRecordsWriteMessage {
    return this._message;
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

  async store(importRequest?: boolean): Promise<DwnResponseStatus> {
    const { encodedData, ...rawMessage } = this.message;
    const dataStream = new Blob([ Convert.base64Url(encodedData).toUint8Array() ]);

    const { reply, message } = await this.agent.processDwnRequest({
      author      : this._connectedDid,
      target      : this._connectedDid,
      messageType : DwnInterface.RecordsWrite,
      signAsOwner : importRequest,
      rawMessage,
      dataStream,
    });

    this._message = { ...message, encodedData: encodedData };
    return { status: reply.status };
  }
}