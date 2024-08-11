import type { AgentPermissionsApi, DwnDataEncodedRecordsWriteMessage, DwnResponseStatus, SendDwnRequest, Web5Agent } from '@web5/agent';
import { DwnInterface, getRecordAuthor } from '@web5/agent';
import { Convert } from '@web5/common';

export interface GrantRevocationModel {
  message: DwnDataEncodedRecordsWriteMessage;
}

export interface GrantRevocationOptions {
  connectedDid: string;
  message: DwnDataEncodedRecordsWriteMessage;
}

export class GrantRevocation implements GrantRevocationModel {
  private _permissions: AgentPermissionsApi;
  private _connectedDid: string;
  private _message: DwnDataEncodedRecordsWriteMessage;
  private _author: string;

  private constructor(permissions: AgentPermissionsApi, options: GrantRevocationOptions) {
    this._permissions = permissions;
    this._connectedDid = options.connectedDid;

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
  }): Promise<GrantRevocation> {
    return new GrantRevocation(permissions, { connectedDid, message });
  }

  get agent(): Web5Agent {
    return this._permissions.agent;
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

  async store(importRevocation?: boolean): Promise<DwnResponseStatus> {
    const { encodedData, ...rawMessage } = this.message;
    const dataStream = new Blob([ Convert.base64Url(encodedData).toUint8Array() ]);

    const { reply, message } = await this.agent.processDwnRequest({
      author      : this._connectedDid,
      target      : this._connectedDid,
      messageType : DwnInterface.RecordsWrite,
      signAsOwner : importRevocation,
      rawMessage,
      dataStream,
    });

    this._message = { ...message, encodedData: encodedData };
    return { status: reply.status };
  }
}